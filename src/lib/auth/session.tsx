"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser, Role, Session } from "@/types";
import { all } from "@/lib/mock/server";
import { can as canWithRole, canAny as canAnyWithRole, type Permission } from "./permissions";

const STORAGE_KEY = "schoole-ms:session:v1";

type SessionState = {
  status: "loading" | "authenticated" | "anonymous";
  session: Session | null;
  user: AppUser | null;
  role: Role | null;
  /** profileId of the persona's domain record (student/staff/teacher/family). */
  profileId: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: Role) => Promise<void>;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
};

const SessionContext = createContext<SessionState | null>(null);

const buildSession = (user: AppUser): Session => ({
  userId: user.id,
  role: user.role,
  profileId: user.profileId,
  loginAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw) as Session);
        setStatus("authenticated");
        return;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setStatus("anonymous");
  }, []);

  const persist = useCallback((next: Session | null) => {
    setSession(next);
    setStatus(next ? "authenticated" : "anonymous");
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback<SessionState["login"]>(
    async (email, password) => {
      const users = all<AppUser>("users");
      const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) return { ok: false, error: "No account found for this email." };
      if (user.password !== password) return { ok: false, error: "Incorrect password." };
      if (!user.isActive) return { ok: false, error: "This account has been deactivated." };
      persist(buildSession(user));
      return { ok: true };
    },
    [persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const switchRole = useCallback<SessionState["switchRole"]>(
    async (role) => {
      const user = all<AppUser>("users").find((u) => u.role === role && u.isActive);
      if (user) persist(buildSession(user));
    },
    [persist],
  );

  const user = useMemo(() => {
    if (!session) return null;
    return all<AppUser>("users").find((u) => u.id === session.userId) ?? null;
  }, [session]);

  const value = useMemo<SessionState>(
    () => ({
      status,
      session,
      user,
      role: session?.role ?? null,
      profileId: session?.profileId ?? null,
      login,
      logout,
      switchRole,
      can: (permission) => canWithRole(session?.role, permission),
      canAny: (permissions) => canAnyWithRole(session?.role, permissions),
    }),
    [status, session, user, login, logout, switchRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
};

export const usePermission = (permission: Permission) => useSession().can(permission);