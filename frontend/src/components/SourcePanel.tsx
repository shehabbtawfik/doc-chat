"use client";

import { ChevronDown, ChevronUp, Quote } from "lucide-react";
import { useState } from "react";
import type { Source } from "@/lib/types";

interface Props {
  sources: Source[];
}

export default function SourcePanel({ sources }: Props) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <Quote size={13} className="text-slate-400 shrink-0" />
        <span className="text-slate-600 font-medium flex-1">
          {sources.length} source{sources.length > 1 ? "s" : ""} retrieved
        </span>
        {open ? (
          <ChevronUp size={13} className="text-slate-400" />
        ) : (
          <ChevronDown size={13} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-slate-100">
          {sources.map((s, i) => (
            <div key={i} className="p-3 bg-white">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {s.title}
                </span>
                <span className="text-xs text-slate-400">
                  {Math.round(s.score * 100)}% match
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                {s.chunk}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
