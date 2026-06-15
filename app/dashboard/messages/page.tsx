// app/dashboard/messages/page.tsx
import React from "react";
import { MessageSquare, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MessagesPlaceholderPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center font-sans p-4 animate-fade-in">
      <div className="card bg-base-100 border border-base-300 shadow-sm max-w-md w-full p-8 text-center space-y-5 rounded-2xl">
        
        {/* Visual Layer Representation */}
        <div className="avatar placeholder mx-auto">
          <div className="bg-primary/10 text-primary border border-primary/20 rounded-2xl h-14 w-12 flex items-center justify-center relative">
            <MessageSquare className="h-6 w-6 stroke-[2.2]" />
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>
        </div>

        {/* Informative Content Copy */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-base-content tracking-tight">Unified Team Messages</h2>
          <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Pipeline Module: Phase 2 Scope
          </p>
        </div>

        <p className="text-xs text-base-content/50 font-semibold leading-relaxed px-4">
          Real-time threaded context chat systems, secure document exchanges, and distinct direct channels allocation frameworks are slated for the infrastructure deployment pass.
        </p>

        {/* Back-To-Safety Navigation Button Action Anchor link */}
        <div className="pt-2">
          <Link 
            href="/dashboard" 
            className="btn btn-neutral btn-sm rounded-xl font-bold gap-1.5 text-xs shadow-xs tracking-tight transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" /> Return to Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}