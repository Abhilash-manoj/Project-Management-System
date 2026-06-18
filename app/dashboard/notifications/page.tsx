// app/dashboard/notifications/page.tsx
import React from 'react';
import NotificationsWorkspace from './components/NotificationWorkspace';
import { verifySessionOrRedirect } from '@/app/actions/auth'; // Replace with your exact auth session checker helper method
import { resolveCurrentOrganizationMembership } from '@/app/actions/org'; // Replace with your exact active org checker helper method

export default async function DashboardNotificationsPage() {
  const session = await verifySessionOrRedirect();
  const membership = await resolveCurrentOrganizationMembership(session.userId);

  return (
    <NotificationsWorkspace 
      currentUserId={session.userId} 
      organizationId={membership.organizationId} 
    />
  );
}