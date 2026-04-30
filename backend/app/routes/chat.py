from __future__ import annotations
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services import vector_store, llm
from app.models import ChatRequest
from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
async def chat(request: ChatRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(400, "Question cannot be empty.")

    if vector_store.document_count() == 0:
        raise HTTPException(
            404, "No documents indexed yet. Please upload a document first."
        )

    sources = vector_store.search(
        query=question,
        k=settings.retrieval_k,
        doc_ids=request.doc_ids,
    )

    if not sources:
        raise HTTPException(404, "No relevant content found in the selected documents.")

    def generate():
        try:
            for token in llm.chat_stream(question, sources):
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
            # Send sources after the full answer
            yield f"data: {json.dumps({'type': 'sources', 'content': sources})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
