import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        {Icon && (
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            <Icon className="size-6" />
          </div>
        )}
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description && <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <div
              key={colIndex}
              className="bg-muted h-9 flex-1 animate-pulse rounded-md"
              style={{ animationDelay: `${(rowIndex * cols + colIndex) * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-muted/60 h-64 animate-pulse rounded-lg", className)} aria-busy="true" aria-label="Loading chart" />
  );
}

export function PermissionNotice({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="border-border bg-muted/40 text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="text-sm">{message}</p>
      {action ?? (
        <Button variant="outline" size="sm" disabled>
          Restricted
        </Button>
      )}
    </div>
  );
}