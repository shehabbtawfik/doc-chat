"use client";

import { useEffect, useState } from "react";
import DocumentSidebar from "../components/DocumentSidebar";
import ChatInterface from "../components/ChatInterface";
import type { Document } from "../lib/types";
import { fetchDocuments } from "../lib/api";
import { Sparkles } from "lucide-react";

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(() => {}); // backend might not be running yet
  }, []);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUploaded = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDeleted = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.doc_id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top nav */}
      <header className="h-12 flex items-center px-5 border-b border-slate-200 bg-white shrink-0 gap-2">
        <div className="w-6 h-6 rounded-lg bg-brand-500 flex items-center justify-center">
          <Sparkles size={13} className="text-white" />
        </div>
        <span className="font-bold text-slate-800 tracking-tight">DocuMind</span>
        <span className="text-slate-400 text-sm ml-1">— chat with your documents</span>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar
          documents={documents}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onUploaded={handleUploaded}
          onDeleted={handleDeleted}
        />
        <main className="flex-1 overflow-hidden bg-slate-50">
          <ChatInterface
            selectedDocIds={selectedIds}
            hasDocuments={documents.length > 0}
          />
        </main>
      </div>
    </div>
  );
}
