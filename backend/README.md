# Backend-only RAG with Vercel AI SDK (TypeScript)

This is a backend-only, Node.js + TypeScript implementation of a minimal RAG system using the Vercel AI SDK. It excludes all frontend concerns and does not use streaming.

## Features

- Node.js + TypeScript (Express)
- Vercel AI SDK:
  - `generateText` for non-streaming responses
  - `embedMany` for embeddings
- In-memory vector store with cosine similarity
- Clean backend structure: routes, controllers, services, lib, config, middleware
- Simple endpoints for document ingestion and querying

## Requirements

- Node.js 18.17+ (or 20+)
- An OpenAI API key

## Setup

1. Install dependencies:

```bash
pnpm install
# or
npm install
# or
yarn install
```

2. Copy `.env.example` to `.env` and set your keys:

```bash
cp .env.example .env
```

Required:
- `OPENAI_API_KEY`

Optional:
- `PORT` (default: 3000)
- `CHAT_MODEL` (default: `gpt-4o-mini`)
- `EMBEDDING_MODEL` (default: `text-embedding-3-small`)

3. Run in development:

```bash
npm run dev
```

Server will start at `http://localhost:3000`.

## API

### Health

- GET `/health` → `{ ok: true }`

### Ingest

- POST `/api/rag/ingest`

Body:
```json
{
  "docs": [
    { "id": "doc-1", "text": "Armadillos are mammals.", "metadata": { "source": "wiki-armadillo" } },
    { "text": "They can roll into a ball.", "metadata": { "source": "facts" } }
  ]
}
```

Response:
```json
{
  "ingested": 2,
  "totalDocuments": 2,
  "ids": ["doc-1", "generated-uuid"]
}
```

### Query

- POST `/api/rag/query`

Body:
```json
{ "query": "Can armadillos roll into a ball?", "topK": 3 }
```

Response:
```json
{
  "answer": "Yes, ... [1]",
  "sources": [
    { "index": 1, "id": "doc-1", "score": 0.92, "metadata": { "source": "wiki-armadillo" } }
  ]
}
```

Notes:
- Answers are generated using `generateText` (non-streaming).
- Embeddings are computed with `embedMany`.
- This implementation uses an in-memory store—restart clears the index. Persist if needed.

## Project Structure

```
src/
  app.ts                # Express app composition
  server.ts             # Entrypoint
  routes/
    index.ts
    rag.routes.ts
  controllers/
    rag.controller.ts
  services/
    rag.service.ts
  lib/
    ai.ts               # ai-sdk model wiring
    vector-store.ts     # in-memory store
    cosine.ts
  config/
    env.ts              # dotenv + zod validation
  middleware/
    error.ts
```

## Extending

- Persistence: add a file or DB-backed vector store (e.g., SQLite + pgvector-compatible, Chroma, etc.)
- Auth: add auth middleware before `/api` routes
- Observability: add request logging, tracing
- Rate limiting: apply per-key or per-route limits