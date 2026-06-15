// app/dashboard/members/components/MemberOnboardingForm.tsx
"use client";

import React, { useState, useActionState } from "react";
import { createIndividualInvitation, generateProjectJoinLink } from "../../../actions";
import { UserPlus, Link2, Mail, Shield, ShieldAlert, Loader2 } from "lucide-react";
import ShareLinkTerminal from "../../components/ShareLinkTerminal"; // 🤝 Verified and connected cleanly

interface ProjectEntry {
  id: string;
  name: string;
}

interface ActionState {
  error?: string | null;
  success?: boolean;
  inviteLink?: string;
  joinLinkUrl?: string;
}

const initialState: ActionState = {
  error: null,
};

export default function MemberOnboardingForm({ projectContextList }: { projectContextList: ProjectEntry[] }) {
  const [targetRole, setTargetRole] = useState<"ADMIN" | "EMPLOYEE" | "GUEST">("EMPLOYEE");
  const [inviteLinkOutput, setInviteLinkOutput] = useState<string | null>(null);

  // FORM CONTROLLER 1: Individual Email Provisioning Account Form
  const [inviteState, inviteAction, invitePending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      setInviteLinkOutput(null);
      const result = await createIndividualInvitation(formData);
      
      // 🔥 FIXED: Direct assignment to full, un-truncated link reference parameter
      if (result?.fullLink) {
        setInviteLinkOutput(result.fullLink);
      }
      
      return result || { error: null };
    },
    initialState
  );

  return (
    <div className="space-y-6 font-sans text-neutral text-left">
      
      {/* ==========================================================================
          CARD 1: INDIVIDUAL EMAIL INVITATION ENGINE CONTAINER
          ========================================================================== */}
      <div className="card bg-base-100 p-6 rounded-2xl border border-base-300 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <UserPlus className="h-4 w-4 stroke-[2.5]" />
            <h3 className="text-base font-black tracking-tight">Provision Individual Account</h3>
          </div>
          <p className="text-[10px] text-neutral/40 font-black uppercase tracking-wider mt-0.5">Binds targeted identities securely into the tenant registry.</p>
        </div>

        <form action={inviteAction} className="space-y-3">
          {inviteState?.error && (
            <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2]" />
              <span>{inviteState.error}</span>
            </div>
          )}

          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                <Mail className="h-3 w-3" /> Target Coworker Email
              </span>
            </label>
            <input 
              name="email" 
              type="email" 
              required 
              disabled={invitePending}
              className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
              placeholder="teammate@company.com" 
            />
          </div>

          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                <Shield className="h-3 w-3" /> Assigned Tenant Role
              </span>
            </label>
            <select 
              name="role" 
              value={targetRole}
              disabled={invitePending}
              onChange={(e) => setTargetRole(e.target.value as "ADMIN" | "EMPLOYEE" | "GUEST")}
              className="select select-sm select-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:select-primary rounded-xl text-xs font-bold transition-all"
            >
              <option value="EMPLOYEE">Teammate Employee</option>
              <option value="ADMIN">Workspace Administrator</option>
              <option value="GUEST">External Project Guest (Sandboxed)</option>
            </select>
          </div>

          {/* ABAC CONDITIONAL EXTENSION */}
          {targetRole === "GUEST" && (
            <div className="p-3 bg-base-200 border border-base-300 rounded-xl space-y-2 animate-fade-in">
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral/60">
                Bound Project Boundary
              </label>
              <select 
                name="projectId" 
                disabled={invitePending}
                className="select select-sm select-bordered w-full bg-base-100 text-neutral focus:select-primary text-xs font-bold rounded-xl"
              >
                {projectContextList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                {projectContextList.length === 0 && (
                  <option value="">No projects created yet</option>
                )}
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={invitePending} 
            className="btn btn-primary btn-sm w-full rounded-xl font-bold gap-2 text-primary-content transition-all cursor-pointer"
          >
            {invitePending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
            ) : (
              "Generate Direct Access Invite"
            )}
          </button>
        </form>

        {/* 🔗 FIXED: Feeds full absolute token safely into terminal clip data */}
        {inviteLinkOutput && (
          <div className="pt-2 animate-fade-in w-full">
            <ShareLinkTerminal url={inviteLinkOutput} label="Individual Single-User Invite" />
          </div>
        )}
      </div>

      {/* ==========================================================================
          CARD 2: BULK PROJECT ONBOARDING SHARE LINK ENGINE
          ========================================================================== */}
      <div className="card bg-base-100 p-6 rounded-2xl border border-base-300 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Link2 className="h-4 w-4 stroke-[2.5]" />
            <h3 className="text-base font-black tracking-tight">Bulk Project Invitation Link</h3>
          </div>
          <p className="text-[10px] text-neutral/40 font-black uppercase tracking-wider mt-0.5">Generate a single shared join link that auto-assigns multiple users directly to a specific project milestone space.</p>
        </div>

        {(() => {
          const [bulkLinkOutput, setBulkLinkOutput] = useState<string | null>(null);
          
          const [bulkState, bulkAction, bulkPending] = useActionState(
            async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
              setBulkLinkOutput(null);
              const result = await generateProjectJoinLink(formData);
              
              // 🔥 FIXED: Direct assignment to full, un-truncated URL reference parameter
              if (result?.joinLinkUrl) {
                setBulkLinkOutput(result.joinLinkUrl);
              }
              return result || { error: null };
            },
            initialState
          );

          return (
            <form action={bulkAction} className="space-y-3">
              {bulkState?.error && (
                <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2]" />
                  <span>{bulkState.error}</span>
                </div>
              )}

              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
                    Target Project Sandbox
                  </span>
                </label>
                <select 
                  name="projectId" 
                  disabled={bulkPending}
                  className="select select-sm select-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:select-primary rounded-xl text-xs font-bold transition-all"
                >
                  {projectContextList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  {projectContextList.length === 0 && (
                    <option value="">Create a project first</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
                      Max Use Capacity
                    </span>
                  </label>
                  <input 
                    name="maxUses" 
                    type="number" 
                    defaultValue={100} 
                    min={1} 
                    disabled={bulkPending}
                    className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
                      Days Until Expiry
                    </span>
                  </label>
                  <input 
                    name="daysToLive" 
                    type="number" 
                    defaultValue={7} 
                    min={1} 
                    disabled={bulkPending}
                    className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={bulkPending} 
                className="btn btn-primary btn-sm w-full rounded-xl font-bold gap-2 text-primary-content transition-all cursor-pointer"
              >
                {bulkPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
                ) : (
                  "Generate Shared Join Link"
                )}
              </button>

              {/* 🔗 FIXED: Feeds full absolute token safely into terminal clip data */}
              {bulkLinkOutput && (
                <div className="pt-2 animate-fade-in w-full">
                  <ShareLinkTerminal url={bulkLinkOutput} label="Bulk Cohort Shared Join Link" />
                </div>
              )}
            </form>
          );
        })()}
      </div>

    </div>
  );
}