from pydantic import BaseModel
from typing import Optional, List


class DocumentInfo(BaseModel):
    doc_id: str
    title: str
    uploaded_at: str
    chunk_count: int


class UploadResponse(BaseModel):
    doc_id: str
    title: str
    chunk_count: int
    message: str


class ChatRequest(BaseModel):
    question: str
    doc_ids: Optional[List[str]] = None  # None = search across all documents


class Source(BaseModel):
    doc_id: str
    title: str
    chunk: str
    score: float


class HealthResponse(BaseModel):
    status: str
    service: str
    openai_configured: bool
    chat_model: str
    embedding_model: str
