"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Upload, Loader2, BookOpen } from "lucide-react";
import type { Document } from "../lib/types";
import { uploadDocument, deleteDocument } from "../lib/api";

interface Props {
  documents: Document[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onUploaded: (doc: Document) => void;
  onDeleted: (id: string) => void;
}

export default function DocumentSidebar({
  documents,
  selectedIds,
  onToggle,
  onUploaded,
  onDeleted,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await uploadDocument(file);
        onUploaded({
          doc_id: result.doc_id,
          title: result.title,
          uploaded_at: new Date().toISOString(),
          chunk_count: result.chunk_count,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    try {
      await deleteDocument(docId);
      onDeleted(docId);
    } catch {
      setError("Failed to delete document");
    }
  };

  return (
    <aside className="w-72 shrink-0 flex flex-col border-r border-slate-200 bg-white h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={18} className="text-brand-500" />
          <span className="font-semibold text-slate-800 text-sm">Documents</span>
          {documents.length > 0 && (
            <span className="ml-auto text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
              {documents.length}
            </span>
          )}
        </div>

        {/* Upload button */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? "Uploading…" : "Upload PDF / TXT"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone hint */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mx-3 mt-3 rounded-lg border-2 border-dashed text-xs text-center py-2 transition-colors ${
          dragOver
            ? "border-brand-500 bg-brand-50 text-brand-500"
            : "border-slate-200 text-slate-400"
        }`}
      >
        or drop files here
      </div>

      {error && (
        <p className="mx-3 mt-2 text-xs text-red-500 bg-red-50 rounded p-2">{error}</p>
      )}

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {documents.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p>No documents yet.</p>
            <p className="text-xs mt-1">Upload a PDF to get started.</p>
          </div>
        )}
        {documents.map((doc) => {
          const selected = selectedIds.has(doc.doc_id);
          return (
            <div
              key={doc.doc_id}
              onClick={() => onToggle(doc.doc_id)}
              className={`flex items-start gap-2 p-2.5 rounded-lg cursor-pointer group transition-colors ${
                selected
                  ? "bg-brand-50 border border-brand-200"
                  : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              <FileText
                size={15}
                className={`mt-0.5 shrink-0 ${selected ? "text-brand-500" : "text-slate-400"}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{doc.title}</p>
                <p className="text-xs text-slate-400">{doc.chunk_count} chunks</p>
              </div>
              <button
                onClick={(e) => handleDelete(e, doc.doc_id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 shrink-0 mt-0.5"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <div className="p-3 border-t border-slate-100 text-xs text-slate-500">
          Searching {selectedIds.size} of {documents.length} document
          {documents.length !== 1 ? "s" : ""}
        </div>
      )}
    </aside>
  );
}
