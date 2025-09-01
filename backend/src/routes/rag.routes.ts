import { Router } from 'express';
import * as RagController from '../controllers/rag.controller.js';

export const router = Router();

router.post('/ingest', RagController.ingest);


router.post('/query', RagController.query);