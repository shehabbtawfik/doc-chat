import type { Document, Source } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "/api";

export async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch(`${BASE}/documents/`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadDocument(file: File): Promise<{
  doc_id: string;
  title: string;
  chunk_count: number;
  message: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${BASE}/documents/${docId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}

export async function* streamChat(
  question: string,
  docIds?: string[]
): AsyncGenerator<{ type: "token" | "sources" | "error"; content: string | Source[] }> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, doc_ids: docIds ?? null }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Chat failed" }));
    throw new Error(err.detail || "Chat request failed");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        yield JSON.parse(data);
      } catch {
        // skip malformed
      }
    }
  }
}
