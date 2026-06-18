// app/dashboard/messages/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decryptSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
// 🔒 FIXED: Pointing explicitly to your updated search-enabled component
import ChatWorkspaceCanvas from "./components/ChatWorkSpaceCanvas";

/**
 * PAGE COMPONENT: Secure Server-Side Shell for Messaging Workspace
 * Resolves context-aware session credentials and enforces core multi-tenant 
 * isolation limits before serving the client interaction layer.
 */
export default async function MessagesDashboardPage() {
  // 1. Resolve active user session context safely
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nexus_session")?.value;

  if (!sessionToken) {
    redirect("/signin");
  }

  const session = await decryptSession(sessionToken);
  if (!session || !session.userId) {
    redirect("/signin");
  }

  // 2. Fetch the caller's active multi-tenant workspace membership matrix allocation
  const currentMembership = await prisma.membership.findFirst({
    where: { userId: session.userId },
    select: { organizationId: true },
  });

  // Redirect to workspace generator if no company context is established yet
  if (!currentMembership) {
    redirect("/signup/organization");
  }

  return (
    <div className="w-full h-full p-4 bg-base-200/30">
      {/* Mounted client context provider passing secure session parameters */}
      <ChatWorkspaceCanvas 
        currentUserId={session.userId} 
        organizationId={currentMembership.organizationId} 
      />
    </div>
  );
}