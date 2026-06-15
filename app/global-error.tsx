// app/global-error.tsx
"use client";

import React, { useEffect } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CatastrophicRootGlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("CRITICAL ROOT SYSTEM BREAK DOWN ENGINE TRIGGERED:", error);
  }, [error]);

  return (
    <html lang="en" data-theme="corporate">
      <body className="min-h-screen bg-base-200 text-neutral font-sans flex items-center justify-center p-4">
        
        <div className="card bg-base-100 border border-base-300 max-w-md w-full p-8 shadow-2xl rounded-2xl text-center space-y-5 animate-scale-up">
          
          {/* Alert Identity Icon Matrix Marker */}
          <div className="avatar placeholder mx-auto">
            <div className="bg-error/10 text-error border border-error/20 rounded-2xl h-14 w-12 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 stroke-[2.2] animate-pulse" />
            </div>
          </div>

          {/* Error Headers Description Content Typography block */}
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-base-content tracking-tight">Root Environment Crash</h2>
            <span className="badge badge-sm badge-error font-black uppercase text-[9px] rounded px-2 tracking-wider">
              System Gateway Interrupted
            </span>
          </div>

          <p className="text-xs text-base-content/50 font-semibold leading-relaxed px-2">
            Nexus encountered a terminal interruption inside the primary shared layout HTML structure shell nodes context loop. 
          </p>

          <div className="p-3 rounded-xl bg-base-200 border border-base-300/40 text-[10px] font-mono text-error/80 font-bold break-all text-left">
            Error: {error.message || "Katana memory allocation core heap constraint trace collision."}
          </div>

          {/* Action Restart Button to trigger hot retry resets layout variables pass */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="btn btn-neutral btn-sm rounded-xl font-black gap-2 text-xs w-full shadow-xs tracking-tight transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Re-Initialize Engine Core Layout
            </button>
          </div>

        </div>

      </body>
    </html>
  );
}