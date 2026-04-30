# DocuMind — Chat with your documents

**Upload a PDF. Ask questions. Get cited answers.**

DocuMind is a full-stack RAG (Retrieval Augmented Generation) application: drop in any PDF or text file, and a chat interface lets you ask natural-language questions over it. Every answer includes the exact source chunks it was drawn from, with relevance scores.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Now-4f6ef7)](https://documind.vercel.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

![DocuMind Demo](https://raw.githubusercontent.com/shehabbtawfik/doc-chat/main/walkthrough.gif)

---

## How it works

```
PDF upload → text extraction → chunking → embeddings (local or cloud) → Chroma vector store
                                                                        ↓
User question → embed question → cosine similarity search → top-5 chunks
                                                                        ↓
                               GPT-4o-mini + retrieved context → streamed answer + sources
```

1. **Upload** — PDFs and text files are parsed, split into 500-token chunks with 50-token overlap, and embedded using `text-embedding-3-small`.
2. **Search** — Each question is embedded and compared against all stored chunks via cosine similarity in Chroma.
3. **Answer** — The top-5 most relevant chunks are injected into a GPT-4o-mini prompt. The response streams token-by-token to the browser.
4. **Cite** — Source chunks and their match scores are returned alongside the answer so you can verify every claim.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| Embeddings | Ollama `nomic-embed-text` (local) or OpenAI `text-embedding-3-small` |
| LLM | Any Ollama model (local, no API key) or OpenAI `gpt-4o-mini` |
| Vector store | ChromaDB (persistent, cosine similarity) |
| PDF parsing | pypdf + LangChain text splitter |
| Streaming | Server-Sent Events (SSE) |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Privacy & Security

> **Your documents never leave your network.**

DocuMind is designed for environments where data confidentiality matters. When configured with a local Ollama instance:

| Stage | What happens | Where it runs |
|---|---|---|
| PDF parsing | Text extracted from your file | Local process |
| Embedding | Text chunks converted to vectors | Local Ollama () |
| Vector storage | Embeddings stored in Chroma | Local disk |
| LLM inference | Answer generated from context | Local Ollama ( / any model) |
| **External calls** | **None** | — |

This is the opposite of sending documents to OpenAI, Azure, or any cloud API. The network never sees your content. Useful for legal documents, internal reports, healthcare data, or any situation where cloud LLM data processing is restricted.

You can still plug in OpenAI or Azure if you want cloud quality — the provider abstraction makes it a one-line config change.

---

## Quick start

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) running locally — **no API key needed**
  ```bash
  ollama pull nomic-embed-text   # embeddings
  ollama pull qwen2.5:14b        # chat (or any model you prefer)
  ```
  > Using OpenAI instead? Add `OPENAI_API_KEY=sk-...` to `.env` and set
  > `EMBEDDING_MODEL=text-embedding-3-small` and `CHAT_MODEL=gpt-4o-mini`.

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Ollama is used by default (no API key needed). Optionally add OPENAI_API_KEY to switch providers.

uvicorn app.main:app --reload
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:3000
```

### Docker (one command)

```bash
cp backend/.env.example backend/.env
# Ollama is used by default. Optionally add OPENAI_API_KEY to backend/.env to use OpenAI instead.

docker-compose up -d
# App at http://localhost:3000
```

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload a PDF or TXT file |
| `GET` | `/api/documents/` | List all indexed documents |
| `DELETE` | `/api/documents/{doc_id}` | Remove a document and its vectors |
| `POST` | `/api/chat` | Ask a question, returns SSE stream |
| `GET` | `/api/health` | Service health + config status |

Full interactive docs available at `/docs` (Swagger UI) and `/redoc`.

### Chat endpoint

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the key findings?"}' \
  --no-buffer
```

SSE response format:
```
data: {"type": "token", "content": "The "}
data: {"type": "token", "content": "key "}
...
data: {"type": "sources", "content": [{...}, {...}]}
data: [DONE]
```

---

## Project structure

```
doc-chat/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, routes
│   │   ├── config.py            # Pydantic settings (env vars)
│   │   ├── models.py            # Request/response schemas
│   │   ├── routes/
│   │   │   ├── documents.py     # Upload, list, delete endpoints
│   │   │   └── chat.py          # Streaming chat endpoint
│   │   └── services/
│   │       ├── pdf_parser.py    # Text extraction + chunking
│   │       ├── vector_store.py  # Chroma operations (embed, search, delete)
│   │       └── llm.py           # Streaming chat (Ollama or OpenAI)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   ├── components/
│   │   │   ├── DocumentSidebar.tsx  # Upload + document list
│   │   │   ├── ChatInterface.tsx    # Streaming chat UI
│   │   │   └── SourcePanel.tsx      # Collapsible source citations
│   │   └── lib/
│   │       ├── api.ts           # Typed API client + SSE stream reader
│   │       └── types.ts         # Shared TypeScript interfaces
│   └── next.config.js           # API proxy to backend
├── docker-compose.yml
└── README.md
```

---

## Deployment

### Backend → Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect this repo, set the root to `backend/`
3. Add environment variable: `OLLAMA_BASE_URL=http://your-ollama-host:11434` (or `OPENAI_API_KEY` if using OpenAI)
4. Railway auto-detects the Dockerfile and deploys

### Frontend → Vercel

1. Import the repo on [Vercel](https://vercel.com)
2. Set root directory to `frontend/`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
4. Deploy

---

## License

MIT License — Copyright 2026 Shehab Tawfik
