import prisma from '../prisma';
import { RetrievedChunk } from './gemini';

/**
 * Saves a vector embedding (768-dim) into PostgreSQL pgvector for a specific chunk.
 */
export async function saveChunkEmbedding(chunkId: string, embedding: number[]): Promise<void> {
  const vectorString = `[${embedding.join(',')}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
    vectorString,
    chunkId
  );
}

/**
 * Performs cosine similarity search using pgvector across the user's ready documents.
 */
export async function searchSimilarChunks(
  userId: string,
  queryEmbedding: number[],
  documentIds?: string[],
  limit = 5
): Promise<RetrievedChunk[]> {
  const vectorString = `[${queryEmbedding.join(',')}]`;

  try {
    let rows: any[] = [];

    if (documentIds && documentIds.length > 0) {
      rows = await prisma.$queryRawUnsafe(
        `SELECT 
          c.id, 
          c."documentId", 
          d."originalName" as "documentName", 
          c."pageNumber", 
          c."chunkIndex", 
          c.content,
          (1 - (c.embedding <=> $1::vector)) as similarity
        FROM "DocumentChunk" c
        JOIN "Document" d ON c."documentId" = d.id
        WHERE d."userId" = $2
          AND d.status = 'READY'
          AND c."documentId" = ANY($3::text[])
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT $4`,
        vectorString,
        userId,
        documentIds,
        limit
      );
    } else {
      rows = await prisma.$queryRawUnsafe(
        `SELECT 
          c.id, 
          c."documentId", 
          d."originalName" as "documentName", 
          c."pageNumber", 
          c."chunkIndex", 
          c.content,
          (1 - (c.embedding <=> $1::vector)) as similarity
        FROM "DocumentChunk" c
        JOIN "Document" d ON c."documentId" = d.id
        WHERE d."userId" = $2
          AND d.status = 'READY'
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT $3`,
        vectorString,
        userId,
        limit
      );
    }

    return rows.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      documentName: r.documentName,
      pageNumber: Number(r.pageNumber),
      chunkIndex: Number(r.chunkIndex),
      content: r.content,
      similarity: Number(r.similarity),
    }));
  } catch (err) {
    console.error('pgvector search error, falling back to database query:', err);

    // Fallback: simple text retrieval from database if vector extension fails
    const whereClause: any = {
      document: {
        userId,
        status: 'READY',
      },
    };
    if (documentIds && documentIds.length > 0) {
      whereClause.documentId = { in: documentIds };
    }

    const fallbackChunks = await prisma.documentChunk.findMany({
      where: whereClause,
      include: {
        document: {
          select: { originalName: true },
        },
      },
      take: limit,
      orderBy: { chunkIndex: 'asc' },
    });

    return fallbackChunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      documentName: c.document.originalName,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      content: c.content,
    }));
  }
}
