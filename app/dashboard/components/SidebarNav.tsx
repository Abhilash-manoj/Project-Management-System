// app/dashboard/components/SidebarNav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, Folder, MessageSquare, Users, Settings, Bell } from "lucide-react";

export default function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "My Tasks", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Projects", href: "/dashboard/projects", icon: Folder },
    { name: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: 6 }, // 👈 Routes cleanly to Phase 2 placeholder page
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: 3 }, // 👈 Routes cleanly to Phase 2 placeholder page
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

        return (
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

              {item.badge && (
                <span className={`badge badge-sm font-bold border-none ${
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