// app/dashboard/settings/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import SettingsDashboardPageClient from "./components/SettingsDashboardPageClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
    include: { user: true }
  });
  if (!membership) redirect("/signup/organization");

  return (
    <SettingsDashboardPageClient 
      initialDepartmentName={membership.department} // Assuming it's a string column in your Membership or User model
      initialUserName={membership.user.name}
      initialUserEmail={membership.user.email}
    />
  );
}