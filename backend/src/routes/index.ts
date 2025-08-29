import { Router } from 'express';
import { router as ragRouter } from './rag.routes.js';

export const router = Router();

router.use('/rag', ragRouter);