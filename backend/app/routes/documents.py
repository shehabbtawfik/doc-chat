from __future__ import annotations
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services import pdf_parser, vector_store
from app.models import DocumentInfo, UploadResponse
from app.config import settings

router = APIRouter(prefix="/api/documents", tags=["documents"])

CONTENT_TYPE_MAP = {
    "application/pdf": pdf_parser.extract_text_from_pdf,
    "text/plain": pdf_parser.extract_text_from_txt,
    # browsers sometimes send these for .txt
    "text/markdown": pdf_parser.extract_text_from_txt,
    "application/octet-stream": pdf_parser.extract_text_from_txt,
}


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if not settings.openai_api_key:
        raise HTTPException(503, "OPENAI_API_KEY is not configured on the server.")

    content_type = file.content_type or ""
    extractor = CONTENT_TYPE_MAP.get(content_type)

    # Fall back to extension sniffing
    if extractor is None:
        name = (file.filename or "").lower()
        if name.endswith(".pdf"):
            extractor = pdf_parser.extract_text_from_pdf
        elif name.endswith((".txt", ".md")):
            extractor = pdf_parser.extract_text_from_txt
        else:
            raise HTTPException(
                400,
                f"Unsupported file type '{content_type}'. Please upload a PDF or plain text file.",
            )

    content = await file.read()
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(400, f"File too large. Maximum size is {settings.max_file_size_mb} MB.")

    text = extractor(content)
    if not text.strip():
        raise HTTPException(400, "Could not extract any text from the file.")

    chunks = pdf_parser.chunk_text(text)
    if not chunks:
        raise HTTPException(400, "Document is too short to index.")

    doc_id = str(uuid.uuid4())
    # Strip extension for display title
    title = (file.filename or "document").rsplit(".", 1)[0]

    chunk_count = vector_store.add_document(doc_id, title, chunks)

    return UploadResponse(
        doc_id=doc_id,
        title=title,
        chunk_count=chunk_count,
        message=f"'{title}' indexed successfully ({chunk_count} chunks).",
    )


@router.get("/", response_model=list[DocumentInfo])
async def list_documents():
    return vector_store.list_documents()


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    deleted = vector_store.delete_document(doc_id)
    if deleted == 0:
        raise HTTPException(404, "Document not found.")
    return {"message": f"Deleted document ({deleted} chunks removed)."}
