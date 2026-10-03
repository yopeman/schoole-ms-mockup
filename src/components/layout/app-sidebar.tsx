"use client";

import { useSession } from "@/lib/auth/session";
import { NAV_GROUPS } from "./nav-config";
import { SidebarHeader, SidebarNav } from "./sidebar-nav";
import { cn } from "@/lib/utils";

export function AppSidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { can, user } = useSession();

  return (
    <div className={cn("bg-sidebar text-sidebar-foreground flex h-full flex-col", className)}>
      <div className="border-sidebar-border flex h-16 shrink-0 items-center border-b px-4">
        <SidebarHeader />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav groups={NAV_GROUPS} can={can} onNavigate={onNavigate} />
      </div>

      <div className="border-sidebar-border shrink-0 border-t px-4 py-3">
        <p className="text-muted-foreground text-xs">
          {user?.email ?? "Guest"}
          <br />
          Academic Year 2026-27
        </p>
      </div>
    </div>
  );
}