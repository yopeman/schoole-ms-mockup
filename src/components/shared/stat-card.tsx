import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  delta?: number;
  tone?: "default" | "positive" | "warning" | "danger" | "info";
  className?: string;
  onClick?: () => void;
};

const TONES = {
  default: "text-foreground",
  positive: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
  info: "text-primary",
} as const;

export function StatCard({ label, value, icon: Icon, hint, delta, tone = "default", className, onClick }: StatCardProps) {
  const Trend = delta !== undefined && delta < 0 ? TrendingDown : TrendingUp;

  return (
    <Card
      className={cn("gap-0 py-5", onClick && "cursor-pointer transition-colors hover:border-primary/40", className)}
      onClick={onClick}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground truncate text-sm font-medium">{label}</p>
          <p className={cn("text-2xl font-semibold tracking-tight", TONES[tone])}>{value}</p>
          {(hint || delta !== undefined) && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              {delta !== undefined && (
                <span className={cn("flex items-center gap-0.5 font-medium", delta < 0 ? "text-destructive" : "text-emerald-600")}>
                  <Trend className="size-3" />
                  {Math.abs(delta)}%
                </span>
              )}
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}