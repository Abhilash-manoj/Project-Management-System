// app/dashboard/projects/[projectId]/components/ProjectTabsContainer.tsx
"use client";

import React, { useState, useMemo, useActionState, useTransition } from "react";
import { LayoutDashboard, Users, Activity, Settings, BarChart3, CheckCircle2, Clock, ShieldAlert, AlertTriangle, Trash2, UserMinus, Sliders, ArrowRight, Kanban } from "lucide-react";
import { updateProjectGeneralDetails, completePurgeProjectWorkspace } from "@/app/actions/projects"; 
import { removeMemberFromProjectAction } from "@/app/actions/projects";
import AssignMemberModal from "./AssignMemberModal"; 
import KanbanBoardContainer from "./KanbanBoardContainer"; // 🚀 NEW: Import your client board engine here
import Link from "next/link"; 
import { useParams } from "next/navigation"; 

interface TabProps {
  isAuthorized: boolean;
  canMutate: boolean; 
  overview: { progress: number; totalTasks: number; completedTasks: number; memberCount: number; recentTasks: any[] };
  members: any[];
  activity: any[];
  settings: { id: string; name: string; description: string; visibility: string; organizationId?: string; creatorId?: string };
  currentUserId: string; 
  currentUserOrgRole: "OWNER" | "ADMIN" | "EMPLOYEE" | "GUEST"; 
  // 🚀 NEW props: Injected from parent page database queries to drive the board view natively
  kanbanTasks: any[];
  boardColumns: string[];
  serializedMembers: { id: string; name: string }[];
}

export default function ProjectTabsContainer({ 
  isAuthorized, 
  canMutate, 
  overview, 
  members, 
  activity, 
  settings, 
  currentUserId,
  currentUserOrgRole,
  kanbanTasks,
  boardColumns,
  serializedMembers
}: TabProps) {
  // 🚀 UPDATED: Appended KANBAN state mapping option down into your main component hook array
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "KANBAN" | "MEMBERS" | "ACTIVITY" | "SETTINGS">("OVERVIEW");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEvicting, startEvictionTransition] = useTransition();

  const params = useParams();
  const currentProjectId = (params?.projectId || settings.id) as string;

  // Permission evaluator loop
  const hasAdministrativeClearance = useMemo(() => {
    if (currentUserOrgRole === "OWNER") return true;

    const isProjectCreator = settings.creatorId === currentUserId;
    const isProjectMember = members.some(m => (m.userId || m.id) === currentUserId);

    if (currentUserOrgRole === "ADMIN") {
      return isProjectCreator || isProjectMember;
    }
    return false;
  }, [members, currentUserId, settings.creatorId, currentUserOrgRole]);

  const handleRemoveMemberClick = (targetId: string, targetName: string) => {
    const confirmation = confirm(`PROJECT MANAGEMENT ACTION:\n\nAre you sure you want to permanently remove ${targetName} from this project roster?`);
    if (!confirmation) return;

    startEvictionTransition(async () => {
      const res = await removeMemberFromProjectAction({
        projectId: currentProjectId,
        targetUserId: targetId,
      });

      if (res?.error) {
        alert(`Eviction Blocked: ${res.error}`);
      } else {
        window.location.reload();
      }
    });
  };

  const [genState, genAction, genPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await updateProjectGeneralDetails(currentProjectId, formData);
      return res || { error: null, success: true };
    },
    { error: null, success: false }
  );

  const [delState, delAction, delPending] = useActionState(
    async () => {
      if (confirm("CRITICAL WARNING: Are you completely sure you want to permanently delete this project? This data cannot be recovered.")) {
        return await completePurgeProjectWorkspace(currentProjectId);
      }
      return { error: null };
    },
    { error: null }
  );

  const distributionMetrics = useMemo(() => {
    let todo = 0, progress = 0, done = 0;
    overview.recentTasks.forEach((t: any) => {
      if (t.status === "DONE") done++;
      else if (t.status === "IN_PROGRESS" || t.status === "REVIEW") progress++;
      else todo++;
    });

    const total = todo + progress + done || 1;
    return {
      todo: Math.round((todo / total) * 100),
      progress: Math.round((progress / total) * 100),
      done: Math.round((done / total) * 100),
    };
  }, [overview.recentTasks]);

  return (
    <div className="space-y-6 text-base-content font-sans">
      
      {/* SELECTION NAVIGATION TABS PANEL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300 pb-4">
        <div className="tabs tabs-boxed bg-base-100 border border-base-300 p-1 w-fit rounded-xl select-none flex flex-wrap gap-0.5">
          <button type="button" onClick={() => setActiveTab("OVERVIEW")} className={`tab tab-sm font-bold rounded-lg gap-1.5 transition-all cursor-pointer ${activeTab === "OVERVIEW" ? "tab-active bg-primary text-primary-content shadow-xs" : "text-base-content/60"}`}>
            <LayoutDashboard className="h-4 w-4" /> Overview
          </button>
          
          {/* 🚀 NEW: THE EMBEDDED NESTED KANBAN TAB TRIGGER BUTTON */}
          <button type="button" onClick={() => setActiveTab("KANBAN")} className={`tab tab-sm font-bold rounded-lg gap-1.5 transition-all cursor-pointer ${activeTab === "KANBAN" ? "tab-active bg-primary text-primary-content shadow-xs" : "text-base-content/60"}`}>
            <Kanban className="h-4 w-4" /> Kanban Board
          </button>

          <button type="button" onClick={() => setActiveTab("MEMBERS")} className={`tab tab-sm font-bold rounded-lg gap-1.5 transition-all cursor-pointer ${activeTab === "MEMBERS" ? "tab-active bg-primary text-primary-content shadow-xs" : "text-base-content/60"}`}>
            <Users className="h-4 w-4" /> Members
          </button>
          <button type="button" onClick={() => setActiveTab("ACTIVITY")} className={`tab tab-sm font-bold rounded-lg gap-1.5 transition-all cursor-pointer ${activeTab === "ACTIVITY" ? "tab-active bg-primary text-primary-content shadow-xs" : "text-base-content/60"}`}>
            <Activity className="h-4 w-4" /> Activity
          </button>
          <button type="button" onClick={() => setActiveTab("SETTINGS")} className={`tab tab-sm font-bold rounded-lg gap-1.5 transition-all cursor-pointer ${activeTab === "SETTINGS" ? "tab-active bg-primary text-primary-content shadow-xs" : "text-base-content/60"}`}>
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs flex flex-row items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary"><BarChart3 className="h-5 w-5" /></div>
              <div><p className="text-2xl font-black tracking-tight">{overview.progress}%</p><p className="text-[11px] font-bold uppercase tracking-wide text-base-content/40">Progress</p></div>
            </div>
            <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs flex flex-row items-center gap-4">
              <div className="p-3 bg-success/10 rounded-xl text-success"><CheckCircle2 className="h-5 w-5 stroke-[2.2]" /></div>
              <div><p className="text-2xl font-black tracking-tight">{overview.totalTasks}</p><p className="text-[11px] font-bold uppercase tracking-wide text-base-content/40">Total Tasks</p></div>
            </div>
            <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs flex flex-row items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-xl text-secondary"><Users className="h-5 w-5 stroke-[2.2]" /></div>
              <div><p className="text-2xl font-black tracking-tight">{overview.memberCount}</p><p className="text-[11px] font-bold uppercase tracking-wide text-base-content/40">Members</p></div>
            </div>
            <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs flex flex-row items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-xl text-warning"><Clock className="h-5 w-5 stroke-[2.2]" /></div>
              <div><p className="text-2xl font-black tracking-tight capitalize">Active</p><p className="text-[11px] font-bold uppercase tracking-wide text-base-content/40">Project Status</p></div>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-end text-xs font-black uppercase tracking-wider text-base-content/40">
              <span className="text-base-content font-bold text-sm">Project Progress</span>
              <span className="text-primary font-black text-sm">{overview.progress}%</span>
            </div>
            <progress className="progress progress-primary w-full h-3 bg-base-200 rounded-full" value={overview.progress} max="100" />
            <div className="flex justify-between text-2xs text-base-content/40 font-bold uppercase tracking-wider">
              <span>{overview.completedTasks} tasks completed</span>
              <span>{overview.totalTasks - overview.completedTasks} remaining</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="card bg-base-100 border border-base-300 p-6 rounded-2xl lg:col-span-5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-base-content/80">Task Distribution Ratio</h3>
              <div className="h-44 flex items-end justify-around px-2 border-b border-base-300 pb-2 relative select-none">
                <div className="flex flex-col items-center gap-2 w-12 h-full justify-end">
                  <div className="w-full bg-neutral rounded-t-lg transition-all min-h-[6px]" style={{ height: `${distributionMetrics.todo}%` }} />
                  <span className="text-[10px] font-bold text-base-content/40">TODO</span>
                </div>
                <div className="flex flex-col items-center gap-2 w-12 h-full justify-end">
                  <div className="w-full bg-primary rounded-t-lg transition-all min-h-[6px]" style={{ height: `${distributionMetrics.progress}%` }} />
                  <span className="text-[10px] font-bold text-base-content/40">ACTIVE</span>
                </div>
                <div className="flex flex-col items-center gap-2 w-12 h-full justify-end">
                  <div className="w-full bg-success rounded-t-lg transition-all min-h-[6px]" style={{ height: `${distributionMetrics.done}%` }} />
                  <span className="text-[10px] font-bold text-base-content/40">DONE</span>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 border border-base-300 p-6 rounded-2xl lg:col-span-7 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-base-content/80">Recent Standalone Milestones</h3>
              <div className="space-y-2.5">
                {overview.recentTasks.length === 0 ? (
                  <p className="text-xs text-base-content/40 font-medium italic p-4 text-center">No structural tasks populated inside this repository yet.</p>
                ) : (
                  overview.recentTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-base-200/50 border border-base-300/60 rounded-xl hover:bg-base-200 transition-colors text-xs font-semibold">
                      <div className="flex items-center gap-2.5">
                        <span className={`badge badge-xs p-1.5 font-bold tracking-wide uppercase text-[9px] ${task.status === "DONE" ? "badge-success" : "badge-primary"}`}>
                          {task.status === "DONE" ? "Done" : "Active"}
                        </span>
                        <p className="text-base-content font-bold tracking-tight truncate max-w-[200px] sm:max-w-md">{task.title}</p>
                      </div>
                      <span className="badge badge-warning bg-warning/10 border-warning/20 text-warning-content font-bold text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5">
                        {task.priority || "MEDIUM"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 NEW: KANBAN TAB INTERACTION COMPONENT INJECTION */}
      {activeTab === "KANBAN" && (
        <div className="animate-fade-in w-full">
          <KanbanBoardContainer 
            initialTasks={kanbanTasks}
            projectId={currentProjectId}
            teamMembers={serializedMembers}
            canMutate={canMutate && currentUserOrgRole !== "GUEST"}
            currentUserId={currentUserId}
            currentUserRole={currentUserOrgRole}
            boardColumns={boardColumns}
          />
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === "MEMBERS" && (
        <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-wider text-base-content/40">{members.length} Members</h3>
            {canMutate && hasAdministrativeClearance && (
              <button type="button" onClick={() => setIsAssignModalOpen(true)} className="btn btn-primary btn-sm rounded-xl font-bold text-primary-content shadow-xs cursor-pointer">+ Invite</button>
            )}
          </div>
          <div className="overflow-x-auto border border-base-300 rounded-xl bg-base-200/20">
            <table className="table table-md table-zebra w-full text-left">
              <thead>
                <tr className="bg-base-200 text-base-content/40 text-[10px] font-black uppercase tracking-wider border-b border-base-300">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  {hasAdministrativeClearance && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/60 text-xs font-medium">
                {members.map((m, idx) => {
                  const mName = m.name || m.user?.name || "User";
                  const mEmail = m.email || m.user?.email || "";
                  const mId = m.userId || m.id; 
                  const isSelf = mId === currentUserId;

                  return (
                    <tr key={idx} className="hover:bg-base-200/40 transition-colors">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div className="avatar placeholder"><div className="h-8 w-8 bg-primary/10 border border-primary/20 text-primary font-black text-2xs rounded-full flex items-center justify-center"><span>{mName.charAt(0)}</span></div></div>
                        <div><p className="font-bold">{mName}</p><p className="text-[11px] text-base-content/40 font-normal">{mEmail}</p></div>
                      </td>
                      <td className="py-3 px-4"><span className="badge badge-primary badge-sm font-bold uppercase px-1.5 rounded">{m.role}</span></td>
                      <td className="py-3 px-4 font-bold text-base-content/70 font-sans">
                        {m.department && m.department.trim() !== "" ? m.department : <span className="italic text-base-content/30 font-medium opacity-40">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4"><span className="badge badge-success bg-success/10 border-success/20 text-success-content badge-xs font-bold rounded px-1 flex items-center gap-1">● {m.status || "Active"}</span></td>
                      {hasAdministrativeClearance && (
                        <td className="py-3 px-4 text-right">
                          {!isSelf && (
                            <button type="button" disabled={isEvicting} onClick={() => handleRemoveMemberClick(mId, mName)} className="btn btn-ghost btn-xs btn-circle text-neutral/40 hover:text-error hover:bg-error/5 rounded-lg cursor-pointer transition-colors" title={`Remove ${mName} from Project`}><UserMinus className="h-4 w-4" /></button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTIVITY TAB */}
      {activeTab === "ACTIVITY" && (
        <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4 animate-fade-in">
          <h3 className="font-black text-sm uppercase tracking-wider text-base-content/40">Activity Log Timeline Feed</h3>
          <div className="relative border-l border-base-300 ml-4 pl-6 space-y-6 py-2">
            {activity.length === 0 ? (
              <p className="text-xs text-base-content/40 font-medium italic py-2">No auditable system activity entries recorded inside this project zone yet.</p>
            ) : (
              activity.map((item, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-0.5 bg-base-100 border border-base-300 rounded-full p-1 shadow-2xs group-hover:border-primary transition-colors"><span className="h-2.5 w-2.5 bg-primary rounded-full block" /></div>
                  <div className="text-xs space-y-0.5 font-medium text-left">
                    <p className="text-base-content"><span className="font-bold tracking-tight pr-1">{item.user}</span>{item.action}</p>
                    <p className="text-[10px] text-base-content/40 font-bold uppercase tracking-wide">{item.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "SETTINGS" && (
        <div className="space-y-6 animate-fade-in">
          {isAuthorized ? (
            <>
              {/* INTERACTIVE BLUEPRINT WORKFLOW REDIRECT BANNER */}
              {canMutate && (
                <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-base-100 to-base-200/40 text-left">
                  <div className="flex gap-3 items-center">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                      <Sliders className="h-4 w-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-neutral tracking-tight">Custom Kanban Columns Blueprint</h4>
                      <p className="text-[11px] font-medium text-neutral/50 leading-relaxed">Modify pipeline lanes, set sequence ordering, or select pre-configured task frameworks locally for this board.</p>
                    </div>
                  </div>
                  <Link 
                    href={`/dashboard/projects/${currentProjectId}/workflows`}
                    className="btn btn-primary btn-sm rounded-xl font-bold gap-1.5 text-white shrink-0 shadow-sm cursor-pointer w-full sm:w-auto text-center"
                  >
                    Configure Pipeline <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

              {/* GENERAL PROPERTIES CARD */}
              <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-base-content/40">General Properties</h3>
                
                <form action={genAction} className="form-control w-full space-y-3 text-left">
                  {genState?.error && (
                    <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4 shrink-0" /><span>{genState.error}</span></div>
                  )}
                  {genState?.success && (
                    <div className="alert alert-success bg-success/10 border-success/20 text-success text-xs rounded-xl py-2.5 px-3 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Workspace parameters updated successfully.</span></div>
                  )}

                  <div>
                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-base-content/50 uppercase tracking-wider">Project Name</span></label>
                    <input name="projectName" type="text" disabled={genPending || !canMutate} defaultValue={settings.name} required className="input input-sm input-bordered w-full bg-base-200 text-base-content focus:bg-base-100 focus:input-primary text-xs font-semibold rounded-xl transition-all" />
                  </div>
                  <div>
                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-base-content/50 uppercase tracking-wider">Description</span></label>
                    <textarea name="description" disabled={genPending || !canMutate} defaultValue={settings.description} rows={3} className="textarea textarea-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:textarea-primary text-xs font-semibold rounded-xl resize-none leading-relaxed transition-all" />
                  </div>
                  <div>
                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-base-content/50 uppercase tracking-wider">Visibility</span></label>
                    <select name="visibility" disabled={genPending || !canMutate} defaultValue={settings.visibility} className="select select-sm select-bordered w-full bg-base-200 text-base-content focus:select-primary text-xs font-bold rounded-xl transition-all">
                      <option value="PRIVATE">Private</option>
                      <option value="PUBLIC">Public</option>
                    </select>
                  </div>

                  {canMutate && (
                    <button type="submit" disabled={genPending} className="btn btn-primary btn-sm font-bold rounded-xl text-primary-content shadow-xs w-fit mt-1 min-w-[120px] cursor-pointer">
                      {genPending ? <span className="loading loading-spinner loading-xs"></span> : "Save Changes"}
                    </button>
                  )}
                </form>
              </div>

              {/* DANGER ZONE CARD */}
              {canMutate ? (
                <div className="card bg-base-100 border border-error/30 shadow-xs p-6 space-y-4">
                  <div className="flex items-center gap-2 text-error">
                    <AlertTriangle className="h-4 w-4 stroke-[2.2]" />
                    <h3 className="font-black text-sm uppercase tracking-wider">Danger Zone</h3>
                  </div>

                  <div className="border border-error/20 bg-error/5 rounded-xl divide-y divide-error/10 overflow-hidden text-xs font-medium">
                    <form action={delAction} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-left">
                        <p className="font-bold text-error">Permanently Purge Project Branch</p>
                        <p className="text-[11px] text-base-content/50 font-normal">Irreversibly purges this entire project scope framework, including all historical tasks parameters.</p>
                        {delState?.error && <p className="text-2xs text-error font-bold mt-1">⚠️ {delState.error}</p>}
                      </div>
                      <button type="submit" disabled={delPending} className="btn btn-error btn-sm rounded-xl font-bold text-error-content gap-1.5 min-w-[130px] cursor-pointer">
                        {delPending ? <span className="loading loading-spinner loading-xs"></span> : <><Trash2 className="h-3.5 w-3.5" />Delete Project</>}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="alert alert-warning text-xs font-bold rounded-xl bg-warning/10 border-warning/20 text-warning-content flex items-center gap-2 text-left">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>Read-Only Mode: You are viewing this workspace directory as an unassigned Administrator. Modification controls and mutation channels are locked down.</span>
                </div>
              )}
            </>
          ) : (
            <div className="card bg-base-100 border border-base-300 shadow-xs p-8 text-center max-w-xl mx-auto my-6 space-y-3">
              <div className="avatar placeholder mx-auto">
                <div className="bg-warning/10 text-warning border border-warning/20 rounded-full h-12 w-12 flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5 stroke-[2.5]" />
                </div>
              </div>
              <h3 className="text-base font-black text-base-content">Administrative Clearance Blocked</h3>
              <p className="text-xs text-base-content/50 font-semibold leading-relaxed px-4">
                Modification arrays are restricted under your current profile footprint. Settings updates are strictly gated to designated organization **Owners** or project **Admins**. Contact system clearance operators to upgrade account authorizations.
              </p>
            </div>
          )}
        </div>
      )}

      {isAssignModalOpen && (
        <AssignMemberModal projectId={currentProjectId} onClose={() => setIsAssignModalOpen(false)} />
      )}

    </div>
  );
}