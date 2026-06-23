// app/dashboard/settings/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import SettingsDashboardPageClient from "./components/SettingsDashboardPageClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  // Fetch membership block along with the full parent User record fields
  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
    include: { user: true }
  });
  
  if (!membership) redirect("/signup/organization");

  return (
    <SettingsDashboardPageClient 
      currentUserId={session.userId} // 🚀 FIXED: Added to stop 'undefined' filename errors in client uploads
      initialUserName={membership.user.name}
      initialUserEmail={membership.user.email}
      initialAvatarUrl={membership.user.avatarUrl} // 🚀 FIXED: Passes down the database image string link state
      initialDepartmentName={membership.department} 
    />
  );
}