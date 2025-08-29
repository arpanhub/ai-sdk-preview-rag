import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  PORT: z.coerce.number().int().positive().default(3000),
  CHAT_MODEL: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional()
});

export const env = envSchema.parse(process.env);