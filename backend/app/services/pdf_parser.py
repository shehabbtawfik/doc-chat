from __future__ import annotations
import pypdf
import io
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.config import settings


def extract_text_from_pdf(content: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def extract_text_from_txt(content: bytes) -> str:
    return content.decode("utf-8", errors="ignore")


def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    # Filter out very short chunks (< 50 chars)
    return [c.strip() for c in chunks if len(c.strip()) >= 50]
