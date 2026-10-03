"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AuthGuard } from "@/components/layout/auth-guard";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <div className="flex min-h-svh">
        <aside
          className={cn(
            "bg-sidebar sticky top-0 hidden h-svh shrink-0 border-r transition-[width] lg:block",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <AppSidebar className={cn(collapsed && "[&_p]:hidden [&_span]:hidden")} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <div className="bg-muted/30 flex-1">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
              <div className="mb-4 flex items-center gap-3">
                <Breadcrumbs />
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto hidden lg:inline-flex"
                  onClick={() => setCollapsed((value) => !value)}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
                </Button>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}