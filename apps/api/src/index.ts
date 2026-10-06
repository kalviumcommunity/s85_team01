import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRouter from './routes/auth';
import documentsRouter from './routes/documents';
import chatRouter from './routes/chat';
import prisma from './prisma';

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// CORS configuration supporting credentials from frontend
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      const allowed = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
      ];
      if (allowed.includes(origin) || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'healthy';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'degraded';
  }

  res.json({
    status: 'ok',
    service: 'pharma-ai-api',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Mount modular routes
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/conversations', chatRouter);

// Global friendly error handler (never leaks raw traces to user)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred. Please try again.';
  res.status(status).json({ error: message });
});

// Start listening
app.listen(port, '0.0.0.0', () => {
  console.log(`[Pharma AI] API Server running cleanly on http://localhost:${port}`);
});

export default app;
