import { Loader2 } from "lucide-react";

/** Route-level suspense fallback for the portal shell. */
export default function PortalLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading page" />
    </div>
  );
}