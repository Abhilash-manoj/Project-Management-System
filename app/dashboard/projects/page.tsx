// app/dashboard/projects/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
// 🚀 FIXED: Pointed path string precisely to the plural filename directory to resolve import errors
import ProjectsDirectoryClient from "./components/ProjectDirectoryClient";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}

export default async function ProjectsDirectoryPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/signin");

  // Load organizational boundary context
  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });
  if (!membership) redirect("/signup/organization");

  const orgId = membership.organizationId;
  const { status, search } = await searchParams;

  const isGlobalOwner = membership.role === "OWNER";
  const isGlobalAdmin = membership.role === "ADMIN";
  const isOwnerOrAdmin = isGlobalOwner || isGlobalAdmin; // 🚀 COMPUTED FOR ROLE-GATING THE CREATION BUTTON

  // ==========================================================================
  // CONSTRUCT DYNAMIC PRISMA SEARCH FILTERS WITH ATTRIBUTE VISIBILITY SECURITY
  // ==========================================================================
  const whereClause: any = {
    organizationId: orgId,
    AND: [
      // Gated Private Project visibility matching rules securely on the server
      isGlobalOwner
        ? {} // Owners automatically bypass visibility gates
        : isGlobalAdmin
        ? {
            OR: [
              { visibility: "PUBLIC" },
              { visibility: "PRIVATE" } // Admins see Private repositories as Read-Only
            ]
          }
        : {
            // Employees & Guests can ONLY see Public, or Private if assigned to them
            OR: [
              { visibility: "PUBLIC" },
              {
                visibility: "PRIVATE",
                assignments: {
                  some: {
                    userId: session.userId
                  }
                }
              }
            ]
          }
    ]
  };

  // 1. Status Tab filter query logic mapping
  if (status && status.toUpperCase() !== "ALL") {
    whereClause.status = status.toUpperCase();
  }

  // 2. Inline input text search filter condition matching
  if (search && search.trim() !== "") {
    whereClause.name = {
      contains: search.trim(),
      mode: "insensitive",
    };
  }

  // Fetch filtered projects in parallel with all organizational tasks
  const [filteredProjects, allOrgTasks] = await prisma.$transaction([
    prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        assignments: { select: { userId: true } },
        // 🚀 FIXED: Removed the invalid 'department' include block to clear Prisma schema validation failures
      },
    }),
    prisma.task.findMany({
      where: { project: { organizationId: orgId } },
    }),
  ]);

  // Total absolute count tracked in organization (reflecting roles visibility)
  const totalCountTracked = filteredProjects.length;

  // ==========================================================================
  // CALCULATE ACCURATE ROLLING ARCHITECTURAL PROGRESS RATIOS
  // ==========================================================================
  const serializedProjects = filteredProjects.map((project: any) => {
    const projectTasks = allOrgTasks.filter((t) => t.projectId === project.id);

    // Standalone tasks (No subtasks beneath them and are not children themselves)
    const standalone = projectTasks.filter(
      (t) => t.parentId === null && !projectTasks.some((sub) => sub.parentId === t.id)
    );
    // Real leaf executable sub-tasks
    const subTasks = projectTasks.filter((t) => t.parentId !== null);

    const totalWorkUnits = standalone.length + subTasks.length;
    const completedWorkUnits =
      standalone.filter((t) => t.status === "DONE").length +
      subTasks.filter((t) => t.status === "DONE").length;

    const computedProgress =
      totalWorkUnits > 0 ? Math.round((completedWorkUnits / totalWorkUnits) * 100) : 0;

    return {
      id: project.id,
      name: project.name,
      description: project.description || "No description provided for this workspace project scope.",
      status: project.status,
      visibility: project.visibility,
      progress: computedProgress,
      memberCount: project.assignments.length,
      // 🚀 FIXED: Stripped the nonexistent project department relation tracker reference to keep mapping clean
    };
  });

  return (
    <ProjectsDirectoryClient
      initialProjects={serializedProjects}
      totalTrackedLabel={totalCountTracked}
      currentActiveFilter={status?.toUpperCase() || "ALL"}
      currentSearchValue={search || ""}
      isOwnerOrAdmin={isOwnerOrAdmin} 
    />
  );
}