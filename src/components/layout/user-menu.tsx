"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PERSONA_ROLES: Role[] = ["admin", "director", "teacher", "student", "family", "staff", "accountant"];

export function UserMenu() {
  const router = useRouter();
  const { user, role, logout, switchRole } = useSession();
  const [switching, setSwitching] = useState<Role | null>(null);
  const [resetting, setResetting] = useState(false);

  const label = user ? ROLE_LABELS[role ?? "admin"] : "Guest";
  const initials = user ? user.role.slice(0, 2).toUpperCase() : "GU";

  // Base UI menu items fire onClick (Radix used onSelect).
  const switchPersona = async (persona: Role) => {
    setSwitching(persona);
    await switchRole(persona);
    toast.success(`Now viewing as ${ROLE_LABELS[persona]}`);
    setSwitching(null);
    router.push("/dashboard");
    router.refresh();
  };

  const resetData = async () => {
    setResetting(true);
    await db.reset();
    toast.success("Mock data reset", { description: "All local edits were discarded." });
    setResetting(false);
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-left sm:block">
              <span className="block text-sm leading-tight font-medium">{label}</span>
              <span className="text-muted-foreground block max-w-36 truncate text-xs leading-tight">
                {user?.email}
              </span>
            </span>
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" />
                {user?.email}
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                {role ? ROLE_DESCRIPTIONS[role] : null}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5" />
            Switch persona (demo)
          </DropdownMenuLabel>
          {PERSONA_ROLES.map((persona) => (
            <DropdownMenuItem
              key={persona}
              disabled={switching !== null}
              onClick={() => void switchPersona(persona)}
              className="flex-col items-start"
            >
              <span className="text-sm">
                {ROLE_LABELS[persona]}
                {switching === persona && " · switching…"}
              </span>
              <span className="text-muted-foreground text-xs">{ROLE_DESCRIPTIONS[persona]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={resetting} onClick={() => void resetData()}>
          <RotateCcw className="size-4" />
          {resetting ? "Resetting…" : "Reset mock data"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            logout();
            toast.success("Signed out");
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}