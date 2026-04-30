from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import documents, chat
from app.config import settings
from app.models import HealthResponse

app = FastAPI(
    title="DocuMind API",
    description="RAG-powered document Q&A — upload PDFs and chat with them.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health():
    return HealthResponse(
        status="healthy",
        service="documind-api",
        openai_configured=bool(settings.openai_api_key),
        chat_model=settings.chat_model,
        embedding_model=settings.embedding_model,
    )
