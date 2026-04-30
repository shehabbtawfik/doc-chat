export interface Document {
  doc_id: string;
  title: string;
  uploaded_at: string;
  chunk_count: number;
}

export interface Source {
  doc_id: string;
  title: string;
  chunk: string;
  score: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}
