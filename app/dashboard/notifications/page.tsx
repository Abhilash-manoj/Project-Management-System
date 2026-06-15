// app/dashboard/notifications/page.tsx
import React from "react";
import { Bell, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotificationsPlaceholderPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center font-sans p-4 animate-fade-in">
      <div className="card bg-base-100 border border-base-300 shadow-sm max-w-md w-full p-8 text-center space-y-5 rounded-2xl">
        
        {/* Visual Layer Representation */}
        <div className="avatar placeholder mx-auto">
          <div className="bg-warning/10 text-warning border border-warning/20 rounded-2xl h-14 w-12 flex items-center justify-center">
            <Bell className="h-6 w-6 stroke-[2.2] animate-bounce" />
          </div>
        </div>

        {/* Informative Content Copy */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-base-content tracking-tight">Audit Notifications System</h2>
          <p className="text-xs font-bold text-warning-content uppercase tracking-wider flex items-center justify-center gap-1.5 bg-warning/10 border border-warning/20 w-fit mx-auto px-2.5 py-0.5 rounded-md">
            <Layers className="h-3.5 w-3.5" /> Pipeline Module: Phase 2 Scope
          </p>
        </div>

        <p className="text-xs text-base-content/50 font-semibold leading-relaxed px-4">
          Automated database webhook event dispatch loops, milestone delay warnings, and assigned task modifications updates stream configurations will go live on the upcoming platform update.
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