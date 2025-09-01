import { Request, Response, NextFunction } from 'express';
import * as RagService from '../services/rag.service.js';
import { z } from 'zod';

const ingestBodySchema = z.object({
  docs: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string().min(1),
      metadata: z.record(z.any()).optional()
    })
  ).min(1)
});

const queryBodySchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(50).optional()
});

export async function ingest(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await RagService.ingestFromFile();
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function query(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = queryBodySchema.parse(req.body);
    const result = await RagService.answerQuery(parsed.query, parsed.topK ?? 5);
    res.json(result);
  } catch (err) {
    next(err);
  }
}