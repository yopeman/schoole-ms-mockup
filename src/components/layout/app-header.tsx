"use client";

import { useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "./app-sidebar";
import { GlobalSearch } from "./global-search";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="bg-background/95 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Search"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="size-5" />
      </Button>

      <NotificationsMenu />
      <Separator orientation="vertical" className="hidden h-6 sm:block" />
      <UserMenu />
    </header>
  );
}

const NotificationsMenu = () => {
  const { user } = useSession();
  const [items, setItems] = useState<{ id: string; title: string; body: string; read: boolean; link?: string }[]>([]);
  const unread = items.filter((item) => !item.read).length;

  // Lazy-load notifications for the signed-in persona.
  const load = async () => {
    if (!user) return;
    const all = db.all<{ id: string; userId: string; title: string; body: string; read: boolean; link?: string }>("notifications");
    setItems(all.filter((n) => n.userId === user.id));
  };

  const markAllRead = async () => {
    if (!user) return;
    for (const item of items.filter((n) => !n.read)) {
      await db.update("notifications", item.id, { read: true } as never);
    }
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" aria-hidden />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
            Mark all read
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">No notifications</p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} className="flex-col items-start gap-0.5">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-muted-foreground line-clamp-2 text-xs">{item.body}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};