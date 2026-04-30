from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import documents, chat
from app.config import settings

app = FastAPI(
    title="DocuMind API",
    description="RAG-powered document Q&A — upload PDFs and chat with them.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/api/health", tags=["health"])
def health():
    provider = "ollama" if settings.use_ollama else "openai"
    return {
        "status": "healthy",
        "service": "documind-api",
        "provider": provider,
        "chat_model": settings.chat_model,
        "embedding_model": settings.embedding_model,
        **({"ollama_url": settings.ollama_base_url} if settings.use_ollama else {}),
    }
