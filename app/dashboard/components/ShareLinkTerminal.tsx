// app/dashboard/components/ShareLinkTerminal.tsx
"use client";

import React, { useState } from "react";
import { Clipboard, Check, ExternalLink } from "lucide-react";

interface ShareLinkProps {
  url: string; // The complete absolute URL (e.g., http://localhost:3000/join/...)
  label?: string; // Optional subtitle badge (e.g., "Bulk Link" or "Single Invite")
}

export default function ShareLinkTerminal({ url, label }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;

    try {
      // 🔥 FIXED: Copies the complete, un-truncated raw URL prop directly
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy system link: ", err);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 rounded-2xl p-4 shadow-2xs space-y-2 text-left w-full">
      {label && (
        <span className="badge badge-sm font-black bg-primary/10 border-primary/20 text-primary uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-md w-fit">
          {label}
        </span>
      )}

      <div className="flex gap-2 items-center bg-base-200 p-2 rounded-xl border border-base-300/60 max-w-full overflow-hidden">
        
        {/* Clickable absolute link anchor text layout */}
        {/* 👇 FIXED: Ensure the raw url is passed directly to the href attribute */}
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-primary font-mono font-bold hover:text-primary-focus flex-1 pr-2 flex items-center gap-1 min-w-0 overflow-hidden group"
          title="Open connection invite path in new tab"
        >
          {/* Visual text truncation layer won't break clipboard payload data values */}
          <span className="truncate block underline select-all">{url}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
        </a>

        {/* Action Copy to Clipboard Trigger utility button */}
        <button
          type="button"
          onClick={handleCopyToClipboard}
          className={`btn btn-sm rounded-lg font-bold shadow-3xs cursor-pointer min-w-[75px] gap-1 shrink-0 transition-all ${
            copied ? "btn-success text-success-content" : "btn-neutral btn-outline hover:bg-neutral"
          }`}
        >
          {copied ? (
            <><Check className="h-3.5 w-3.5 stroke-[2.5]" /> Copied</>
          ) : (
            <><Clipboard className="h-3.5 w-3.5" /> Copy</>
          )}
        </button>
      </div>
    </div>
  );
}