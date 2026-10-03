import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg font-bold",
        className,
      )}
    >
      S
    </div>
  );
}