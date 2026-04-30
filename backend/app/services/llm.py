from openai import OpenAI
from app.config import settings
from typing import Generator

_openai = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly based on the provided document context.

Rules:
- Answer using ONLY the information in the context below.
- If the answer is not in the context, say: "I couldn't find that in the uploaded documents."
- Be concise and direct. Avoid unnecessary padding.
- When referencing specific information, mention which document it came from."""


def _build_context(sources: list[dict]) -> str:
    parts = []
    for i, s in enumerate(sources, 1):
        parts.append(f"[Source {i} — {s['title']}]\n{s['chunk']}")
    return "\n\n---\n\n".join(parts)


def chat_stream(question: str, sources: list[dict]) -> Generator[str, None, None]:
    """Yield tokens from the LLM response."""
    context = _build_context(sources)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}",
        },
    ]

    stream = _openai.chat.completions.create(
        model=settings.chat_model,
        messages=messages,
        stream=True,
        temperature=0.1,
        max_tokens=1200,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
