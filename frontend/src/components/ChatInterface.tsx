"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, AlertCircle } from "lucide-react";
import type { Message, Source } from "../lib/types";
import { streamChat } from "../lib/api";
import SourcePanel from "./SourcePanel";

interface Props {
  selectedDocIds: Set<string>;
  hasDocuments: boolean;
}

export default function ChatInterface({ selectedDocIds, hasDocuments }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    try {
      const docIds =
        selectedDocIds.size > 0 ? Array.from(selectedDocIds) : undefined;

      let fullContent = "";
      let finalSources: Source[] = [];

      for await (const event of streamChat(question, docIds)) {
        if (event.type === "token") {
          fullContent += event.content as string;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullContent, isStreaming: true }
                : m
            )
          );
        } else if (event.type === "sources") {
          finalSources = event.content as Source[];
        } else if (event.type === "error") {
          throw new Error(event.content as string);
        }
      }

      // Finalise message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: fullContent, sources: finalSources, isStreaming: false }
            : m
        )
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-16">
            <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mb-4">
              <Bot size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Ask anything about your documents
            </h2>
            <p className="text-slate-500 text-sm max-w-sm">
              {hasDocuments
                ? "Your documents are ready. Ask a question and get a cited answer."
                : "Upload a PDF or text file in the sidebar to get started."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                msg.role === "user"
                  ? "bg-slate-200"
                  : "bg-brand-500"
              }`}
            >
              {msg.role === "user" ? (
                <User size={15} className="text-slate-600" />
              ) : (
                <Bot size={15} className="text-white" />
              )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-brand-500 text-white rounded-tr-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                } ${msg.isStreaming ? "cursor-blink" : ""}`}
              >
                {msg.content || (msg.isStreaming ? "" : "…")}
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="w-full mt-1">
                  <SourcePanel sources={msg.sources} />
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle size={15} />
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              hasDocuments
                ? "Ask a question about your documents…"
                : "Upload a document first…"
            }
            disabled={!hasDocuments || loading}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 transition-shadow"
            style={{ maxHeight: "120px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || !hasDocuments || loading}
            className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={16} className="text-white" />
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
