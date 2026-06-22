// app/dashboard/projects/[projectId]/components/ProjectHeaderActionToolbar.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AddTaskModalDialog from "./AddTaskModalDialog";

interface MemberOption {
  id: string;
  name: string;
}

interface ToolbarProps {
  projectId: string;
  teamMembers: MemberOption[];
  boardColumns: string[]; // 🚀 FIXED: Appended required prop to match newly updated model constraints
}

export default function ProjectHeaderActionToolbar({ projectId, teamMembers, boardColumns }: ToolbarProps) {
  const router = useRouter();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 self-end md:self-auto select-none">

      {/* ADD TASK POPUP STATE TRIGGER FUNCTIONALITY */}
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
          boardColumns={boardColumns} // 🚀 FIXED: Passed custom workflow columns down smoothly
          onClose={() => setIsTaskModalOpen(false)} 
        />
      )}

    </div>
  );
}