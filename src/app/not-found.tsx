import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="bg-muted text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
          <Compass className="size-8" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The page you are looking for does not exist, or your role may not have access to it.
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <Button render={<Link href="/dashboard" />}>
            <Home className="size-4" />
            Go to dashboard
          </Button>
          <Button variant="outline" render={<Link href="/students" />}>
            <Search className="size-4" />
            Browse students
          </Button>
        </div>
      </div>
    </div>
  );
}