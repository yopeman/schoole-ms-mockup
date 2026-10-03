"use client";

import { useRouter } from "next/navigation";
import { LogOut, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
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

  const label = user ? `${ROLE_LABELS[role ?? "admin"]}` : "Guest";
  const initials = user ? `${user.role.slice(0, 2).toUpperCase()}` : "GU";

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
              onSelect={async () => {
                await switchRole(persona);
                router.push("/dashboard");
              }}
              className="flex-col items-start"
            >
              <span className="text-sm">{ROLE_LABELS[persona]}</span>
              <span className="text-muted-foreground text-xs">{ROLE_DESCRIPTIONS[persona]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => db.reset()}>
          <RotateCcw className="size-4" />
          Reset mock data
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            logout();
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