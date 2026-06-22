// app/dashboard/notifications/components/NotificationsWorkspace.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { getUserNotifications, markAsReadAction, markAllNotificationsAsRead } from '@/app/actions/notifications';
import { Bell, CheckSquare, MessageSquare, Folder, ArrowUpRight } from 'lucide-react';
import PusherClient from 'pusher-js';

interface NotificationsWorkspaceProps {
  currentUserId: string;
  organizationId: string;
}

export default function NotificationsWorkspace({ currentUserId, organizationId }: NotificationsWorkspaceProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [isPending, startTransition] = useTransition();

  const reloadAlertLogs = async () => {
    const logs = await getUserNotifications(currentUserId, organizationId);
    setNotifications(logs);
  };

  useEffect(() => {
    reloadAlertLogs();
  }, [currentUserId, organizationId]);

  // 🚀 FIXED: Leak-Proof personal notification channel stream listener connection
  useEffect(() => {
    if (!currentUserId) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    });

    const targetChannel = `user-alerts-${currentUserId}`;
    const personalAlertChannel = pusher.subscribe(targetChannel);

    personalAlertChannel.bind("new-alert", (incomingAlert: any) => {
      setNotifications(prev => [incomingAlert, ...prev]);
    });

    // 🚀 CRITICAL CLEANUP: Explicitly breaks connection links on unmount parameters
    return () => {
      personalAlertChannel.unbind_all();
      pusher.unsubscribe(targetChannel);
      pusher.disconnect(); // Force terminates the socket handshake immediately
    };
  }, [currentUserId]);

  const handleSingleRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await markAsReadAction(id);
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await markAllNotificationsAsRead(currentUserId, organizationId);
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED": return <CheckSquare className="h-4 w-4 text-primary" />;
      case "MENTION": return <MessageSquare className="h-4 w-4 text-info" />;
      case "CHAT_MENTION": return <MessageSquare className="h-4 w-4 text-info" />; // Dynamic chat support handling
      case "TASK_COMPLETED": return <CheckSquare className="h-4 w-4 text-success" />;
      case "PROJECT_UPDATED": return <Folder className="h-4 w-4 text-warning" />;
      default: return <Bell className="h-4 w-4 text-neutral" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const displayedNotifications = filter === "ALL" 
    ? notifications 
    : notifications.filter(n => !n.isRead);

  const formatDistanceToNow = (dateInput: any) => {
    const date = new Date(dateInput);
    const diffInMs = Date.now() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return "Today";
    return `${diffInDays}d ago`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6 text-base-content font-sans">
      
      {/* Header Panel Viewports */}
      <div className="flex justify-between items-center bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-xs opacity-50 mt-0.5">{unreadCount} unread actionable event alerts</p>
        </div>
        <button 
          onClick={handleMarkAllRead}
          disabled={isPending || unreadCount === 0}
          className="btn btn-outline btn-sm rounded-xl text-xs font-semibold normal-case border-base-300 hover:bg-base-200"
        >
          ✓ Mark all read
        </button>
      </div>

      {/* Interactive Tabs Menu Control */}
      <div className="flex gap-2">
        <button 
          onClick={() => setFilter("ALL")} 
          className={`btn btn-sm text-xs px-4 rounded-xl font-bold ${filter === "ALL" ? "btn-primary shadow-sm" : "btn-ghost bg-base-200/50"}`}
        >
          All
        </button>
        <button 
          onClick={() => setFilter("UNREAD")} 
          className={`btn btn-sm text-xs px-4 rounded-xl font-bold ${filter === "UNREAD" ? "btn-primary shadow-sm" : "btn-ghost bg-base-200/50"}`}
        >
          Unread
        </button>
      </div>

      {/* Main Alert Log Scroller Feed */}
      <div className="space-y-2.5">
        {displayedNotifications.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-base-300 rounded-3xl bg-base-200/20 text-sm opacity-40">
            No system notifications present matching selection criteria parameters.
          </div>
        ) : (
          displayedNotifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => !notif.isRead && handleSingleRead(notif.id)}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-150 relative cursor-pointer group bg-base-100 text-left ${
                notif.isRead 
                  ? "border-base-200 opacity-70 hover:opacity-100" 
                  : "border-primary/20 bg-primary/5 hover:bg-primary/10 shadow-xs"
              }`}
            >
              {/* Notification Indicator Dot */}
              {!notif.isRead && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}

              {/* Dynamic Action Category Icon wrapper badge */}
              <div className="p-2.5 rounded-xl bg-base-200/80 border border-base-300 flex items-center justify-center shrink-0">
                {getIcon(notif.type)}
              </div>

              {/* Text Area layout elements */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex justify-between items-baseline gap-4">
                  <h3 className={`text-sm font-bold truncate ${!notif.isRead ? "text-base-content" : "text-base-content/80"}`}>
                    {notif.title}
                  </h3>
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-wider shrink-0">
                    {formatDistanceToNow(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-base-content/70 leading-relaxed font-normal">
                  {notif.description}
                </p>
              </div>

              {/* Optional Navigation Redirect Link Arrow */}
              <div className="opacity-0 group-hover:opacity-40 transition-opacity self-center pr-1">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}