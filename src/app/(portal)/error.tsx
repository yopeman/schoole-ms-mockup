"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Catches render-time failures inside the portal and offers a reset. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Portal error:", error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="bg-destructive/10 text-destructive mx-auto mb-4 flex size-14 items-center justify-center rounded-full">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The page failed to render. This build runs on mock data only, so reloading usually restores it.
        </p>
        {error.digest && <p className="text-muted-foreground mt-2 font-mono text-xs">Reference: {error.digest}</p>}

        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button
            onClick={() => {
              window.localStorage.removeItem("schoole-ms:mock-db:v1");
              window.location.href = "/dashboard";
            }}
          >
            Reset mock data
          </Button>
        </div>
      </div>
    </div>
  );
}