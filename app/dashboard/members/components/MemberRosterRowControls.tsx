// app/dashboard/members/components/MemberRosterRowControls.tsx
"use client";

import React, { useTransition } from "react";
import { toggleUserActiveStatusAction, changeUserTenantRoleAction } from "@/app/actions/organizationMembers";
import { UserX, UserCheck, ShieldCheck, ShieldAlert } from "lucide-react";

interface MemberRosterRowControlsProps {
  targetUser: {
    id: string;
    name: string;
    role: string;
    status: string;
  };
  currentUserId: string;
  currentUserOrgRole: string;
}

export default function MemberRosterRowControls({ 
  targetUser, 
  currentUserId, 
  currentUserOrgRole 
}: MemberRosterRowControlsProps) {
  const [isPending, startTransition] = useTransition();

  const isOwner = currentUserOrgRole === "OWNER";
  const isSelf = targetUser.id === currentUserId;
  const isTargetOwner = targetUser.role === "OWNER";

  // If the active dashboard operator isn't the root OWNER, mask row operational panels completely
  if (!isOwner || isSelf || isTargetOwner) return null;

  return (
    <div className="flex items-center gap-1.5 border-l border-base-300 pl-3 animate-fade-in">
      
      {/* 🛠️ COMPILER TRIGGER A: PROMOTION & DEMOTION FLOW LINKS */}
      {targetUser.role === "EMPLOYEE" ? (
        <button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await changeUserTenantRoleAction(targetUser.id, "ADMIN");
              if (res?.error) alert(res.error);
            });
          }}
          className="btn btn-ghost btn-xs text-primary bg-primary/5 hover:bg-primary/15 font-bold rounded-lg h-7 px-2 border-none cursor-pointer transition-colors"
          title={`Promote ${targetUser.name} to Organization Admin`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Promote
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await changeUserTenantRoleAction(targetUser.id, "EMPLOYEE");
              if (res?.error) alert(res.error);
            });
          }}
          className="btn btn-ghost btn-xs text-neutral/50 bg-base-200 hover:bg-base-300 font-bold rounded-lg h-7 px-2 border-none cursor-pointer transition-colors"
          title={`Demote ${targetUser.name} to Regular Employee`}
        >
          <ShieldAlert className="h-3.5 w-3.5" /> Demote
        </button>
      )}

      {/* 🛠️ COMPILER TRIGGER B: LIVE ACCOUNT STATUS ACTIVATION CONTROL FLIPS */}
      {targetUser.status === "ACTIVE" ? (
        <button
          disabled={isPending}
          onClick={() => {
            const conf = confirm(`CRITICAL WORKSPACE SECURITY ACTION:\n\nAre you sure you want to deactivate ${targetUser.name}?\n\nThey will be booted instantly from all active sessions and completely locked out of the system workspace.`);
            if (!conf) return;

            startTransition(async () => {
              const res = await toggleUserActiveStatusAction(targetUser.id, "ACTIVE");
              if (res?.error) alert(res.error);
            });
          }}
          className="btn btn-ghost btn-xs btn-circle h-7 w-7 text-error hover:bg-error/10 border-none cursor-pointer transition-colors"
          title="Deactivate Member Infrastructure Access"
        >
          <UserX className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await toggleUserActiveStatusAction(targetUser.id, "INACTIVE");
              if (res?.error) alert(res.error);
            });
          }}
          className="btn btn-ghost btn-xs btn-circle h-7 w-7 text-success hover:bg-success/10 border-none cursor-pointer transition-colors"
          title="Re-activate Member Infrastructure Access"
        >
          <UserCheck className="h-3.5 w-3.5" />
        </button>
      )}

    </div>
  );
}