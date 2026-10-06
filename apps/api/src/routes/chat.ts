import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { generateEmbedding, generateGroundedAnswer } from '../services/gemini';
import { searchSimilarChunks } from '../services/vector';

const router = Router();

// POST /api/chat
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { question, documentIds, conversationId } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    const userId = req.user!.id;
    const cleanQuestion = question.trim();

    // 1. Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: cleanQuestion.slice(0, 60),
        },
      });
    }

    // 2. Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: cleanQuestion,
      },
    });

    // 3. Generate question embedding
    const queryEmbedding = await generateEmbedding(cleanQuestion);

    // 4. Retrieve top relevant chunks from user's ready documents
    const retrievedChunks = await searchSimilarChunks(
      userId,
      queryEmbedding,
      Array.isArray(documentIds) && documentIds.length > 0 ? documentIds : undefined,
      5
    );

    // 5. Generate grounded answer via Gemini
    const { answer, citations } = await generateGroundedAnswer(cleanQuestion, retrievedChunks);

    // 6. Save assistant message with citations
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: answer,
        citations: citations as any,
      },
    });

    res.json({
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer,
      citations,
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({
      error: 'An unexpected error occurred while processing your request.',
      answer: "I couldn't find enough information to answer this question from your uploaded documents.",
      citations: [],
    });
  }
});

// GET /api/conversations
router.get('/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    res.json({ conversations });
  } catch (err: any) {
    console.error('Fetch conversations error:', err);
    res.status(500).json({ error: 'Failed to retrieve conversations.' });
  }
});

export default router;
