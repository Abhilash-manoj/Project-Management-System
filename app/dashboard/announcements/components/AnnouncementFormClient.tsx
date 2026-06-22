// app/dashboard/announcements/components/AnnouncementFormClient.tsx
"use client";

import React, { useActionState, useEffect, useRef } from "react";
import { ShieldAlert, CheckCircle2, Megaphone } from "lucide-react";
import { createBroadcastAnnouncement } from "@/app/actions/announcements";

// 🚀 FIXED: Enforce a strict, non-optional interface structure for both paths
interface FormState {
  error: string | null;
  success: boolean;
}

export default function AnnouncementFormClient() {
  const formRef = useRef<HTMLFormElement>(null);
  
  // 🚀 FIXED: Typed the useActionState function signatures cleanly to satisfy overload parameters
  const [state, action, isPending] = useActionState(
    async (prevState: FormState, formData: FormData): Promise<FormState> => {
      const res = await createBroadcastAnnouncement(formData);
      if (res && "error" in res) {
        return { error: res.error || "An unknown error occurred.", success: false };
      }
      return { error: null, success: true };
    },
    { error: null, success: false }
  );

  useEffect(() => {
    if (state?.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state?.success]);

  return (
    <form ref={formRef} action={action} className="form-control w-full space-y-3 text-left font-sans">
      {state?.error && (
        <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2 px-3 flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="alert alert-success bg-success/10 border-success/20 text-success text-xs rounded-xl py-2 px-3 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> <span>Broadcast notice dispatched successfully.</span>
        </div>
      )}

      <div>
        <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">Bulletin Title</span></label>
        <input name="title" type="text" required disabled={isPending} placeholder="e.g., Scheduled Core Infrastructure Maintenance Window" className="input input-sm input-bordered w-full bg-base-200 text-xs font-semibold rounded-xl transition-all focus:bg-base-100 focus:input-primary" />
      </div>

      <div>
        <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">Message Content</span></label>
        <textarea name="content" required rows={4} disabled={isPending} placeholder="Draft summary specifications, target timelines, or operational directives details..." className="textarea textarea-bordered w-full bg-base-200 text-xs font-semibold rounded-xl resize-none leading-relaxed transition-all focus:bg-base-100 focus:textarea-primary" />
      </div>

      <div className="flex items-center gap-2 p-2 bg-base-200/50 rounded-xl border border-base-300/40 select-none">
        <input type="checkbox" name="isPriority" id="isPriority" value="true" disabled={isPending} className="checkbox checkbox-sm checkbox-error rounded-md" />
        <label htmlFor="isPriority" className="text-[10px] font-black uppercase tracking-wider text-error cursor-pointer">Elevate to High Priority Urgent Bulletin</label>
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary btn-sm font-bold rounded-xl text-primary-content shadow-xs w-full mt-1 cursor-pointer gap-1">
        {isPending ? <span className="loading loading-spinner loading-xs"></span> : <><Megaphone className="h-4 w-4" /> Broadcast Bulletin</>}
      </button>
    </form>
  );
}