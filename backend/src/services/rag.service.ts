import { embedMany, generateText } from 'ai';
import { getEmbeddingModel, getChatModel } from '../lib/ai.js';
import { vectorStore } from '../lib/vector-store.js';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { chunk } from 'llm-chunk';

// Define the chunk shape for clarity
type IngestDoc = {
  id?: string;
  text: string;
  metadata?: Record<string, any>;
};

type TextChunk = {
  text: string;
  chunkIndex: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
};

function chunkText(text: string, maxTokens = 7000, overlap = 200): TextChunk[] {
  const avgCharsPerToken = 4;
  const maxChars = maxTokens * avgCharsPerToken;
  const overlapChars = overlap * avgCharsPerToken;
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  const chunks = chunk(text, {
    minLength: 0,
    maxLength: maxChars,
    splitter: 'paragraph',
    overlap: overlapChars,
    delimiters: '\n\n'
  });

  return chunks.map((chunkText, index) => {
    let startChar = 0;
    for (let i = 0; i < index; i++) {
      startChar += chunks[i].length - overlapChars;
    }
    startChar = Math.max(0, startChar);
    const endChar = Math.min(startChar + chunkText.length, text.length);

    return {
      text: chunkText,
      chunkIndex: index,
      totalChunks: chunks.length,
      startChar,
      endChar
    };
  });
}

export async function ingestFromFile(filePath = 'public/input.txt') {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const filename = path.basename(fullPath);
  console.log(`Loaded ${filename} (${content.length} characters)`);

  const chunks = chunkText(content);
  console.log(`Split into ${chunks.length} chunks`);

  const allChunks = chunks.map(chunkItem => ({
    id: uuid(),
    text: chunkItem.text,
    metadata: {
      filename,
      ...chunkItem,
      type: 'file_chunk',
      originalSize: content.length,
      processedAt: new Date().toISOString()
    }
  }));

  const batchSize = 100;
  let results: Array<any> = [];

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const values = batch.map(c => c.text);
    for (const c of values) {
      if (c.length / 4 > 8192) {
        throw new Error(`Chunk too large for embedding: ~${Math.floor(c.length / 4)} tokens`);
      }
    }
    console.log(`Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allChunks.length / batchSize)}`);
    const { embeddings } = await embedMany({
      model: getEmbeddingModel(),
      values
    });

    const stored = batch.map((chunkEntry, idx) => ({
      id: chunkEntry.id,
      text: chunkEntry.text,
      metadata: chunkEntry.metadata,
      embedding: embeddings[idx]
    }));

    vectorStore.addDocuments(stored);
    results = results.concat(stored);

    // pause if more batches remain
    if (i + batchSize < allChunks.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return {
    success: true,
    ingested: results.length,
    totalDocuments: vectorStore.count(),
    filename,
    chunks: allChunks.length,
    originalSize: content.length
  };
}

export async function answerQuery(query: string, topK = 5) {
  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values: [query]
  });
  const queryEmbedding = embeddings[0];

  const results = vectorStore.similaritySearch(queryEmbedding, topK);
  const context = results.map((r, idx) => {
    const meta = r.doc.metadata || {};
    const info = meta.chunkIndex !== undefined
      ? ` (chunk ${meta.chunkIndex + 1}/${meta.totalChunks})`
      : '';
    return `[${idx + 1}] source: ${meta.filename || r.doc.id}${info}\n${r.doc.text}`;
  });

  const systemPrompt = `
You are Sonic, a brand-specific AI agent. Use the following context to answer questions accurately. If information is not in context, say so clearly.

CONTEXT:
${context.join('\n\n')}`;

  const { text } = await generateText({
    model: getChatModel(),
    system: systemPrompt.trim(),
    prompt: query.trim()
  });

  const retrievedChunks = results.map((r, idx) => ({
    index: idx + 1,
    id: r.doc.id,
    score: r.score,
    metadata: r.doc.metadata,
    text: r.doc.text
  }));

  return {
    answer: text,
    retrievedChunks,
    sources: retrievedChunks.map(({ index, id, score, metadata }) => ({ index, id, score, metadata }))
  };
}
