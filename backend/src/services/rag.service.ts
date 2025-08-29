import { embedMany, generateText } from 'ai';
import { getEmbeddingModel, getChatModel } from '../lib/ai.js';
import { vectorStore } from '../lib/vector-store.js';
import { v4 as uuid } from 'uuid';

type IngestDoc = {
  id?: string;
  text: string;
  metadata?: Record<string, any>;
};

export async function ingestDocuments(docs: IngestDoc[]) {
  // Prepare values for embeddings
  const values = docs.map(d => d.text);
  const embeddingModel = getEmbeddingModel();

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values
  });

  const stored = docs.map((doc, i) => ({
    id: doc.id ?? uuid(),
    text: doc.text,
    metadata: doc.metadata ?? {},
    embedding: embeddings[i]!
  }));

  vectorStore.addDocuments(stored);

  return {
    ingested: stored.length,
    totalDocuments: vectorStore.count(),
    ids: stored.map(d => d.id)
  };
}

export async function answerQuery(query: string, topK: number) {
  // Embed the user query
  const embeddingModel = getEmbeddingModel();
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: [query]
  });
  const queryEmbedding = embeddings[0]!;

  // Retrieve topK similar docs
  const results = vectorStore.similaritySearch(queryEmbedding, topK);
  const contextBlocks = results.map((r, idx) => {
    const sourceTag = r.doc.metadata?.source ?? r.doc.id;
    return `[${idx + 1}] (source: ${sourceTag})\n${r.doc.text}`;
  });

  const systemPrompt = `
You are a retrieval-augmented assistant. Use ONLY the provided context blocks to answer the user's question.
- If the answer isn't in the context, say you don't have enough information.
- Cite sources inline using [n] where n matches the context block number.
- Keep answers concise and factual.
`;

  const userPrompt = `Question: ${query}

Context:
${contextBlocks.join('\n\n')}

Answer with citations like [1], [2], etc.`;

  // Generate a non-streaming answer
  const { text } = await generateText({
    model: getChatModel(),
    system: systemPrompt.trim(),
    prompt: userPrompt
  });

  return {
    answer: text,
    sources: results.map((r, idx) => ({
      index: idx + 1,
      id: r.doc.id,
      score: r.score,
      metadata: r.doc.metadata ?? {}
    }))
  };
}