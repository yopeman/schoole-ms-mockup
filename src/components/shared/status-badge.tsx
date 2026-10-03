import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  purple: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
} as const;

export type StatusTone = keyof typeof TONES;

type StatusBadgeProps = {
  value: string | number | boolean | null | undefined;
  map?: Record<string, { label: string; tone: StatusTone }>;
  className?: string;
};

export const STATUS_MAPS = {
  student: {
    active: { label: "Active", tone: "success" as StatusTone },
    inactive: { label: "Inactive", tone: "warning" as StatusTone },
    graduated: { label: "Graduated", tone: "info" as StatusTone },
    transferred: { label: "Transferred", tone: "neutral" as StatusTone },
  },
  attendance: {
    present: { label: "Present", tone: "success" as StatusTone },
    absent: { label: "Absent", tone: "danger" as StatusTone },
    late: { label: "Late", tone: "warning" as StatusTone },
    half_day: { label: "Half Day", tone: "warning" as StatusTone },
    on_leave: { label: "On Leave", tone: "info" as StatusTone },
    holiday: { label: "Holiday", tone: "neutral" as StatusTone },
  },
  invoice: {
    draft: { label: "Draft", tone: "neutral" as StatusTone },
    issued: { label: "Issued", tone: "info" as StatusTone },
    partial: { label: "Partially Paid", tone: "warning" as StatusTone },
    paid: { label: "Paid", tone: "success" as StatusTone },
    overdue: { label: "Overdue", tone: "danger" as StatusTone },
    cancelled: { label: "Cancelled", tone: "neutral" as StatusTone },
  },
  admission: {
    inquiry: { label: "Inquiry", tone: "neutral" as StatusTone },
    application: { label: "Application", tone: "info" as StatusTone },
    under_review: { label: "Under Review", tone: "purple" as StatusTone },
    interview: { label: "Interview", tone: "warning" as StatusTone },
    offered: { label: "Offered", tone: "info" as StatusTone },
    enrolled: { label: "Enrolled", tone: "success" as StatusTone },
    rejected: { label: "Rejected", tone: "danger" as StatusTone },
  },
  exam: {
    scheduled: { label: "Scheduled", tone: "info" as StatusTone },
    ongoing: { label: "Ongoing", tone: "warning" as StatusTone },
    completed: { label: "Completed", tone: "neutral" as StatusTone },
    published: { label: "Published", tone: "success" as StatusTone },
    draft: { label: "Draft", tone: "neutral" as StatusTone },
    submitted: { label: "Submitted", tone: "warning" as StatusTone },
  },
  priority: {
    low: { label: "Low", tone: "neutral" as StatusTone },
    normal: { label: "Normal", tone: "info" as StatusTone },
    high: { label: "High", tone: "warning" as StatusTone },
    urgent: { label: "Urgent", tone: "danger" as StatusTone },
  },
  asset: {
    new: { label: "New", tone: "success" as StatusTone },
    good: { label: "Good", tone: "info" as StatusTone },
    needs_repair: { label: "Needs Repair", tone: "warning" as StatusTone },
    damaged: { label: "Damaged", tone: "danger" as StatusTone },
  },
  employment: {
    full_time: { label: "Full Time", tone: "success" as StatusTone },
    part_time: { label: "Part Time", tone: "info" as StatusTone },
    contract: { label: "Contract", tone: "warning" as StatusTone },
    visiting: { label: "Visiting", tone: "purple" as StatusTone },
    pending: { label: "Pending", tone: "warning" as StatusTone },
  },
} as const;

export function StatusBadge({ value, map, className }: StatusBadgeProps) {
  const key = String(value ?? "");
  const entry = map?.[key as keyof typeof map] ?? { label: key || "—", tone: "neutral" as StatusTone };

  return (
    <Badge variant="secondary" className={cn("font-medium", TONES[entry.tone], className)}>
      {entry.label}
    </Badge>
  );
}

/** Attendance percentage with a colour band, reused across dashboards. */
export function RateBadge({ rate }: { rate: number }) {
  const tone: StatusTone = rate >= 90 ? "success" : rate >= 75 ? "warning" : "danger";
  return <StatusBadge value={`${rate}%`} map={{ [`${rate}%`]: { label: `${rate}%`, tone } }} />;
}