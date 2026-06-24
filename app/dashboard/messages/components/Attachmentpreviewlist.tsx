// components/AttachmentPreviewList.tsx
"use client";

import React from "react";
import { FileText, X } from "lucide-react";

interface FileAsset {
  url: string;
  name: string;
}

interface PreviewProps {
  files: FileAsset[];
  onRemove: (idx: number) => void;
}

export default function AttachmentPreviewList({ files, onRemove }: PreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-base-200 border-b border-base-300 rounded-t-xl select-none animate-fade-in">
      {files.map((file, idx) => (
        <div key={idx} className="flex items-center gap-1.5 bg-base-100 border border-base-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral">
          <FileText className="h-3.5 w-3.5 text-primary stroke-[2]" />
          <span className="truncate max-w-[140px] text-base-content/80">{file.name}</span>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="text-neutral/40 hover:text-error ml-1 transition-colors font-bold text-2xs p-0.5 rounded"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}