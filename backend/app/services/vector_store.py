from __future__ import annotations
import chromadb
from openai import OpenAI
from app.config import settings
from datetime import datetime, timezone

_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
_collection = _client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"},
)

_openai = OpenAI(base_url=settings.api_base_url, api_key=settings.api_key)


def _embed(texts: list[str]) -> list[list[float]]:
    response = _openai.embeddings.create(
        input=texts,
        model=settings.embedding_model,
    )
    return [e.embedding for e in response.data]


def add_document(doc_id: str, title: str, chunks: list[str]) -> int:
    """Embed and store all chunks for a document."""
    batch_size = 20  # smaller batches for Ollama
    all_embeddings = []
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        all_embeddings.extend(_embed(batch))

    now = datetime.now(timezone.utc).isoformat()
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {"doc_id": doc_id, "title": title, "chunk_index": i, "uploaded_at": now}
        for i in range(len(chunks))
    ]

    _collection.add(
        ids=ids,
        embeddings=all_embeddings,
        documents=chunks,
        metadatas=metadatas,
    )
    return len(chunks)


def search(query: str, k: int = 5, doc_ids: list[str] | None = None) -> list[dict]:
    """Return top-k chunks most relevant to query."""
    query_embedding = _embed([query])[0]

    where = {"doc_id": {"$in": doc_ids}} if doc_ids else None
    total = _collection.count()
    if total == 0:
        return []

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=min(k, total),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    sources = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        sources.append(
            {
                "doc_id": meta["doc_id"],
                "title": meta["title"],
                "chunk": doc,
                "score": round(1 - dist, 4),
            }
        )
    return sources


def list_documents() -> list[dict]:
    all_results = _collection.get(include=["metadatas"])
    docs: dict[str, dict] = {}
    for meta in all_results["metadatas"]:
        doc_id = meta["doc_id"]
        if doc_id not in docs:
            docs[doc_id] = {
                "doc_id": doc_id,
                "title": meta["title"],
                "uploaded_at": meta.get("uploaded_at", ""),
                "chunk_count": 0,
            }
        docs[doc_id]["chunk_count"] += 1
    return sorted(docs.values(), key=lambda d: d["uploaded_at"], reverse=True)


def delete_document(doc_id: str) -> int:
    results = _collection.get(where={"doc_id": doc_id})
    if not results["ids"]:
        return 0
    _collection.delete(ids=results["ids"])
    return len(results["ids"])


def document_count() -> int:
    return _collection.count()
