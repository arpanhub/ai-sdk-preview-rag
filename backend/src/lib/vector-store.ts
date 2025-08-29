import { cosineSimilarity } from './cosine.js';

export type Vector = number[];

export type StoredDocument = {
  id: string;
  text: string;
  metadata?: Record<string, any>;
  embedding: Vector;
};

type SearchResult = {
  doc: StoredDocument;
  score: number; // cosine similarity
};

class InMemoryVectorStore {
  private docs: StoredDocument[] = [];

  addDocuments(docs: StoredDocument[]) {
    this.docs.push(...docs);
  }

  count() {
    return this.docs.length;
  }

  clear() {
    this.docs = [];
  }

  similaritySearch(queryEmbedding: Vector, topK: number): SearchResult[] {
    const scored = this.docs.map((doc) => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.min(topK, scored.length));
  }
}

export const vectorStore = new InMemoryVectorStore();