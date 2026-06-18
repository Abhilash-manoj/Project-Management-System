// app/dashboard/components/SidebarNav.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, Folder, MessageSquare, Users, Settings, Bell } from "lucide-react";
import { getUnreadMessageCount } from "@/app/actions/communication";
import { getUnreadNotificationCount } from "@/app/actions/notifications"; 
import PusherClient from 'pusher-js';

interface SidebarNavProps {
  currentUserId: string;
  organizationId: string;
}

export default function SidebarNav({ currentUserId, organizationId }: SidebarNavProps) {
  const pathname = usePathname();
  const [dynamicMessageCount, setDynamicMessageCount] = useState<number>(0);
  const [dynamicNotificationCount, setDynamicNotificationCount] = useState<number>(0); 

  // Centralized baseline data fetcher
  const syncBadges = async () => {
    if (!currentUserId || !organizationId) return;
    try {
      const [msgCount, notifCount] = await Promise.all([
        getUnreadMessageCount(currentUserId, organizationId),
        getUnreadNotificationCount(currentUserId, organizationId) 
      ]);
      setDynamicMessageCount(msgCount);
      setDynamicNotificationCount(notifCount);
    } catch (err) {
      console.error("Failed to synchronize sidebar metric counts:", err);
    }
  };

  useEffect(() => {
    syncBadges();
  }, [currentUserId, organizationId, pathname]);

  // Real-time Event Subscription Layer
  useEffect(() => {
    if (!currentUserId || !organizationId) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    });

    // 1. Listen for dynamic message counters
    const chatUpdatesChannel = pusher.subscribe(`user-chats-${currentUserId}`);
    chatUpdatesChannel.bind("badge-update", () => {
      syncBadges();
    });

    // 2. Listen to personal alert stream to increment notifications instantly
    const alertUpdatesChannel = pusher.subscribe(`user-alerts-${currentUserId}`);
    alertUpdatesChannel.bind("new-alert", () => {
      setDynamicNotificationCount(prev => prev + 1);
    });

    pusher.connection.bind('connected', () => {
      syncBadges();
    });

    return () => {
      pusher.unsubscribe(`user-chats-${currentUserId}`);
      pusher.unsubscribe(`user-alerts-${currentUserId}`);
      pusher.disconnect();
    };
  }, [currentUserId, organizationId]);

  // WhatsApp-style instant view clearing logic
  const isCurrentlyOnMessagesPage = pathname === "/dashboard/messages";
  const activeMessageDisplayCount = isCurrentlyOnMessagesPage ? 0 : dynamicMessageCount;

  // Clear notice badge completely while looking directly at the notifications page
  const isCurrentlyOnNotificationsPage = pathname === "/dashboard/notifications";
  const activeNotificationDisplayCount = isCurrentlyOnNotificationsPage ? 0 : dynamicNotificationCount;

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "My Tasks", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Projects", href: "/dashboard/projects", icon: Folder },
    { name: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: activeMessageDisplayCount }, 
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: activeNotificationDisplayCount }, 
    { name: "Members", href: "/dashboard/members", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <ul className="menu menu-md w-full p-0 space-y-1 font-sans">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        const IconComponent = item.icon;
        const hasBadge = item.badge !== undefined && item.badge > 0;

        return (
          // 🚀 FIXED: Changed stray closing tag syntax cleanly back into list item tags
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-content font-semibold shadow-md"
                  : "text-neutral/70 hover:bg-base-200 hover:text-neutral"
              }`}
            >
              <div className="flex items-center gap-3">
                <IconComponent 
                  className={`h-4 w-4 stroke-[2.2] ${
                    isActive ? "text-primary-content" : "text-neutral/40"
                  }`} 
                />
                <span>{item.name}</span>
              </div>

              {hasBadge && (
                <span className={`badge badge-sm font-bold border-none transition-all duration-150 scale-100 opacity-100 ${
                  isActive ? "bg-base-100 text-primary" : "bg-base-300 text-neutral"
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}