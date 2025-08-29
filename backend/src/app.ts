import express from 'express';
import cors from 'cors';
import { json } from 'express';
import { router as apiRouter } from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export const app = express();

app.use(cors());
app.use(json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-sdk-preview-rag-backend' });
});

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);