// app/dashboard/projects/[projectId]/kanban/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import KanbanBoardContainer from "../components/KanbanBoardContainer";

export const dynamic = "force-dynamic"; // Ensure runtime fresh data evaluations on page flips

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectKanbanPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const { projectId } = await params;

  // Validate organizational membership boundary access permissions
  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });
  if (!membership) redirect("/signup/organization");

  // Fetch project basic details to confirm existence and gather metadata details
  const projectData = await prisma.project.findUnique({
    where: { id: projectId },
    select: { creatorId: true }
  });
  if (!projectData) notFound();

  // Fetch top-level columns tasks, including their nested child sub-task checklist leaf arrays
  const tasks = await prisma.task.findMany({
    where: { 
      projectId,
      parentId: null // Only pull primary master cards directly into the core columns view
    },
    orderBy: { createdAt: "asc" },
    include: {
      assignee: {
        select: { name: true }
      },
      // 👍 FIXED: creatorId removed from the include object block. 
      // It is a scalar field column and will be returned automatically!
      subTasks: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: { select: { name: true } }
          // 👍 FIXED: creatorId removed from subTask includes as well
        }
      }
    }
  });

  // Fetch project team membership profiles to populate the sub-task dropdown selector
  const assignments = await prisma.assignment.findMany({
    where: { projectId },
    include: { 
      user: { 
        select: { id: true, name: true } 
      } 
    }
  });

  // Explicit string conversion and default fallbacks to satisfy strict prop signature rules
  const serializedMembers = assignments.map(a => ({
    id: String(a.user.id || ""),
    name: String(a.user.name || "Unknown Teammate")
  }));

  // ==========================================================================
  // 🔒 LIVE ABAC FRONTEND GATEWAY LINKAGE
  // ==========================================================================
  const isCreator = projectData.creatorId === session.userId;
  const isAssigned = assignments.some(a => a.userId === session.userId);

  // Owners maintain full permissions. Admins/Employees must be creators or assigned.
  const canMutate = membership.role === "OWNER" || isCreator || isAssigned;
  // ==========================================================================

  return (
    <div className="pt-2">
      <KanbanBoardContainer 
        initialTasks={JSON.parse(JSON.stringify(tasks))} 
        projectId={projectId} 
        teamMembers={serializedMembers}
        canMutate={canMutate}
        currentUserId={session.userId} 
        currentUserRole={membership.role as any} 
      />
    </div>
  );
}