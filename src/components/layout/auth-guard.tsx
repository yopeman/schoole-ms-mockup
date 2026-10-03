"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/session";

/**
 * Client-side route guard. Role gating here is UX-level only — the mock data
 * lives in the browser, so this is not a security boundary.
 */
export function AuthGuard({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission?: Permission;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, can } = useSession();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  useEffect(() => {
    if (status === "authenticated" && permission && !can(permission)) {
      router.replace("/dashboard");
    }
  }, [status, permission, can, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (permission && !can(permission)) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-lg font-semibold">Access restricted</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your role does not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}