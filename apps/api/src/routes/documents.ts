import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { extractPdfPages, chunkPages } from '../services/pdf';
import { generateEmbedding } from '../services/gemini';
import { saveChunkEmbedding } from '../services/vector';

const router = Router();

// Ensure storage upload directory exists relative to project root
const projectRootDir = path.resolve(__dirname, '../../../');
const configuredPath = process.env.STORAGE_PATH || './storage/uploads';
const uploadDir = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(projectRootDir, configuredPath);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF documents (.pdf) are supported.'));
    }
    cb(null, true);
  },
});

/**
 * Background document processing pipeline
 */
async function processDocument(documentId: string, filePath: string) {
  try {
    // 1. Extract text page by page
    const { pages, totalPages } = await extractPdfPages(filePath);

    // 2. Page-aware chunking
    const chunks = chunkPages(pages);

    if (chunks.length === 0) {
      throw new Error('Text could not be extracted from this PDF.');
    }

    // 3. Save chunks and generate embeddings
    for (const draft of chunks) {
      const createdChunk = await prisma.documentChunk.create({
        data: {
          documentId,
          pageNumber: draft.pageNumber,
          chunkIndex: draft.chunkIndex,
          content: draft.content,
        },
      });

      // 4. Generate and save embedding
      const emb = await generateEmbedding(draft.content);
      await saveChunkEmbedding(createdChunk.id, emb);
    }

    // 5. Mark document as READY
    await prisma.document.update({
      where: { id: documentId },
      data: {
        pageCount: totalPages,
        status: 'READY',
      },
    });
  } catch (err: any) {
    console.error(`Document processing failed for ${documentId}:`, err);
    const friendlyError =
      err.message === 'Text could not be extracted from this PDF.'
        ? 'Text could not be extracted from this PDF.'
        : 'An error occurred while processing the document.';

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: friendlyError,
      },
    });
  }
}

// POST /api/documents/upload
router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Please select a PDF file to upload.' });
        return;
      }

      const originalName = req.file.originalname.replace(/[^\w\s.-]/g, '_');
      const storedName = req.file.filename;

      const document = await prisma.document.create({
        data: {
          userId: req.user!.id,
          originalName,
          storedName,
          status: 'PROCESSING',
          pageCount: 0,
        },
      });

      // Start processing asynchronously in background
      processDocument(document.id, req.file.path).catch((err) => {
        console.error('Async processing error:', err);
      });

      res.status(201).json({
        message: 'Document uploaded and processing started.',
        document,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload document.' });
    }
  }
);

// GET /api/documents
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        pageCount: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        _count: {
          select: { chunks: true },
        },
      },
    });

    res.json({ documents });
  } catch (err: any) {
    console.error('Fetch documents error:', err);
    res.status(500).json({ error: 'Failed to load documents.' });
  }
});

// GET /api/documents/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    res.json({ document });
  } catch (err: any) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Failed to load document details.' });
  }
});

// GET /api/documents/:id/file - Stream raw PDF
router.get('/:id/file', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    let filePath = path.join(uploadDir, document.storedName);
    if (!fs.existsSync(filePath)) {
      // Check alternate upload paths
      const altPaths = [
        path.resolve(process.cwd(), 'storage/uploads', document.storedName),
        path.resolve(projectRootDir, 'apps/api/storage/uploads', document.storedName),
      ];
      const found = altPaths.find((p) => fs.existsSync(p));
      if (found) {
        filePath = found;
      } else {
        res.status(404).json({ error: 'File on disk not found.' });
        return;
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    console.error('Stream file error:', err);
    res.status(500).json({ error: 'Failed to stream document file.' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    // Delete file from disk if exists
    const filePath = path.join(uploadDir, document.storedName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not delete file from disk:', e);
      }
    }

    // Delete record (cascades to chunks)
    await prisma.document.delete({
      where: { id: document.id },
    });

    res.json({ message: 'Document deleted successfully.' });
  } catch (err: any) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

export default router;
