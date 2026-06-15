// app/dashboard/error.tsx
"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, Layers } from "lucide-react";
import Link from "next/link";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the diagnostic tracer payload securely to your logging backend
    console.error("DASHBOARD OPERATIONAL FAULT RUNTIME EMISSION:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 font-sans text-neutral text-left">
      <div className="card bg-base-100 border border-base-300 shadow-xl max-w-lg w-full rounded-2xl overflow-hidden p-8 space-y-6 animate-scale-up">
        
        {/* UPPER STATUS ERROR SIGNPOST */}
        <div className="flex items-start gap-4 border-b border-base-300 pb-4">
          <div className="p-3 bg-error/10 text-error rounded-xl border border-error/20 shrink-0">
            <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black tracking-tight text-base-content">Pipeline Execution Interrupted</h2>
            <p className="text-[10px] font-bold text-error uppercase tracking-wider flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Context Isolation Boundary State
            </p>
          </div>
        </div>

        {/* CUSTOM EXPLAINER DISPLAY CONTAINER */}
        <div className="space-y-2">
          <p className="text-xs text-base-content/60 font-semibold leading-relaxed">
            Nexus encountered an unexpected database query mismatch, a type mismatch configuration, or a broken active transaction pool stream sequence.
          </p>
          
          {/* Managed System Trace message overview bubble wrapper box */}
          <div className="p-3.5 rounded-xl bg-base-200 border border-base-300/60 font-mono text-[11px] text-neutral/80 space-y-1 select-text break-all">
            <p className="font-bold text-neutral/40 uppercase text-[9px] tracking-wide">Diagnostic Fault Exception Message:</p>
            <p className="font-semibold text-error/90">
              {error.message || "An unclassified transaction payload processing exception occurred."}
            </p>
            {error.digest && (
              <p className="text-neutral/40 font-medium text-[10px] pt-1">
                System Reference Tracking Token Digest: <span className="text-base-content/70 font-bold">{error.digest}</span>
              </p>
            )}
          </div>
        </div>

        {/* BOTTOM RECOVERY ACTIONS BUTTON FOOTER CONTROLS ROW */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-base-300">
          <Link
            href="/dashboard"
            className="btn btn-ghost btn-sm rounded-xl font-bold gap-1.5 text-xs text-neutral/50 hover:bg-base-200 order-2 sm:order-1"
          >
            <Home className="h-3.5 w-3.5" /> Dashboard Home
          </Link>
          
          <button
            type="button"
            onClick={() => reset()} // 👈 Instructs React to attempt to hot-recompile/re-fetch component streams dynamically
            className="btn btn-primary btn-sm rounded-xl font-bold gap-1.5 text-xs text-primary-content order-1 sm:order-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-Evaluate Pipeline Connection
          </button>
        </div>

      </div>
    </div>
  );
}