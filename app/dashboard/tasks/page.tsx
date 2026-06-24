// app/dashboard/tasks/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import MyTasksViewContainer from "./components/MyTaskViewContainer";
import { CheckSquare } from "lucide-react";

export default async function MyTasksPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  // Query tasks where the user is EITHER the assignee OR the original creator
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: session.userId },
        { creatorId: session.userId } 
      ]
    },
    include: {
      project: {
        select: {
          name: true,
        },
      },
      assignee: {
        select: {
          name: true,
          avatarUrl: true, // 🚀 FIXED: Added to fetch live user photo pointers for your tasks summary view dashboards
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedTasks = JSON.parse(JSON.stringify(tasks));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in font-sans text-neutral">
      
      {/* HEADER SUMMARY SECTION */}
      <div className="flex items-center justify-between border-b border-base-300 pb-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-primary">
            <CheckSquare className="h-5 w-5 stroke-[2.5]" />
            <h2 className="text-2xl font-black tracking-tight text-neutral">My Tasks</h2>
          </div>
          <p className="text-xs text-neutral/50 font-semibold">
            {serializedTasks.filter((t: any) => t.assigneeId === session.userId).length} tasks assigned to you
          </p>
        </div>
      </div>

      {/* INTERACTIVE DATA GRID TABLE VIEW CONTAINER */}
      <MyTasksViewContainer initialTasks={serializedTasks} currentUserId={session.userId} />

    </div>
  );
}