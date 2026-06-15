// app/dashboard/projects/[projectId]/components/ProjectHeaderActionToolbar.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Kanban, Plus } from "lucide-react";
import AddTaskModalDialog from "./AddTaskModalDialog";

interface MemberOption {
  id: string;
  name: string;
}

interface ToolbarProps {
  projectId: string;
  teamMembers: MemberOption[];
}

export default function ProjectHeaderActionToolbar({ projectId, teamMembers }: ToolbarProps) {
  const router = useRouter();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 self-end md:self-auto select-none">
      
      {/* 1. KANBAN ROUTE TRIGGERS FUNCTIONALITY */}
      <button 
        onClick={() => router.push(`/dashboard/projects/${projectId}/kanban`)}
        className="btn btn-ghost border-base-300 btn-sm font-bold rounded-xl gap-1.5 text-neutral/70 hover:bg-base-200/80 active:scale-[0.98] transition-all cursor-pointer"
      >
        <Kanban className="h-4 w-4 stroke-[2.2]" />
        Kanban
      </button>

      {/* 2. ADD TASK POPUP STATE TRIGGER FUNCTIONALITY */}
      <button 
        onClick={() => setIsTaskModalOpen(true)}
        className="btn btn-primary btn-sm font-bold rounded-xl gap-1 text-primary-content shadow-xs active:scale-[0.98] transition-all cursor-pointer"
      >
        <Plus className="h-4 w-4 stroke-[2.5]" />
        Add Task
      </button>

      {/* SEED INLINE CONDITIONAL MODAL OVERLAY */}
      {isTaskModalOpen && (
        <AddTaskModalDialog 
          projectId={projectId} 
          teamMembers={teamMembers} 
          onClose={() => setIsTaskModalOpen(false)} 
        />
      )}

    </div>
  );
}