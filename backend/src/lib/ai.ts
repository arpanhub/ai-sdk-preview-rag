import { createOpenAI } from '@ai-sdk/openai';
import { env } from '../config/env.js';

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY
});

export function getChatModel() {
  // Non-streaming usage will be handled by generateText caller.
  const modelName = env.CHAT_MODEL || 'gpt-4o-mini';
  return openai(modelName);
}

export function getEmbeddingModel() {
  const embeddingModelName = env.EMBEDDING_MODEL || 'text-embedding-3-small';
  return openai.embedding(embeddingModelName);
}