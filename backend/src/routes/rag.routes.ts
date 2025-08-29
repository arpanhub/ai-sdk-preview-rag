import { Router } from 'express';
import * as RagController from '../controllers/rag.controller.js';

export const router = Router();

/**
 * Ingest an array of documents
 * Body: { docs: Array<{ id?: string, text: string, metadata?: Record<string, any> }> }
 */
router.post('/ingest', RagController.ingest);

/**
 * Query RAG
 * Body: { query: string, topK?: number }
 */
router.post('/query', RagController.query);