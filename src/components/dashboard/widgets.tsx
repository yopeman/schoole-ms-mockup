"use client";

import Link from "next/link";
import { Cake, CircleAlert, Clock, FileSpreadsheet, UserCheck, Wallet } from "lucide-react";
import { SectionCard } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RateBadge, StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { money, TODAY, dateLabel } from "@/lib/mock/constants";
import { cn } from "@/lib/utils";

export function AtRiskList({
  data,
  className,
}: {
  data: { id: string; name: string; classId: string; attendance: number; absent: number }[];
  className: (id?: string) => string;
}) {
  if (data.length === 0) return <SectionCard title="Attention Needed"><EmptyState icon={CircleAlert} title="No students at risk" description="Everyone is above the attendance threshold." /></SectionCard>;

  return (
    <SectionCard
      title="Attendance Risk"
      description="Below 85% attendance or 3+ absences"
      action={<Badge variant="destructive">{data.length}</Badge>}
    >
      <ul className="divide-border divide-y">
        {data.map((row) => (
          <li key={row.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <Link href={`/students/${row.id}`} className="hover:text-primary block truncate text-sm font-medium">
                {row.name}
              </Link>
              <p className="text-muted-foreground text-xs">
                {className(row.classId)} · {row.absent} absent
              </p>
            </div>
            <RateBadge rate={row.attendance} />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function BirthdayList({
  data,
  className,
}: {
  data: { id: string; name: string; day: number; classId: string }[];
  className: (id?: string) => string;
}) {
  if (data.length === 0) return <SectionCard title="Birthdays"><EmptyState icon={Cake} title="No birthdays this month" /></SectionCard>;

  return (
    <SectionCard title="Birthdays This Month" description="October">
      <ul className="grid gap-2 sm:grid-cols-2">
        {data.map((row) => (
          <li key={row.id} className="border-border flex items-center gap-3 rounded-lg border p-2">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {row.day}
            </div>
            <div className="min-w-0">
              <Link href={`/students/${row.id}`} className="hover:text-primary block truncate text-sm font-medium">
                {row.name}
              </Link>
              <p className="text-muted-foreground text-xs">{className(row.classId)}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function TodaySchedule({
  slots,
  subjectName,
}: {
  slots: { id: string; periodId: string; dayOfWeek: number; subjectId: string; sectionId: string }[];
  subjectName: (id?: string) => string;
}) {
  if (slots.length === 0) {
    return <SectionCard title="Today's Schedule"><EmptyState icon={Clock} title="No classes scheduled today" /></SectionCard>;
  }

  return (
    <SectionCard title="Today's Schedule" description={new Date(`${TODAY}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" })}>
      <ol className="space-y-2">
        {slots.map((slot, index) => (
          <li key={slot.id} className="flex items-center gap-3 rounded-lg border p-3">
            <span className="text-muted-foreground w-6 text-xs font-medium">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{subjectName(slot.subjectId)}</p>
              <p className="text-muted-foreground text-xs">{slot.sectionId.replace("cls-", "Grade ").replace("-sec-", " · Section ")}</p>
            </div>
            <Button size="sm" variant="outline" render={<Link href="/timetable">View</Link>} />
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

export function AttendanceSummaryPanel({
  attendance,
  action,
}: {
  attendance: { rate: number; present: number; absent: number; late: number; onLeave: number; total: number };
  action?: React.ReactNode;
}) {
  const stats = [
    { label: "Present", value: attendance.present, tone: "text-emerald-600" },
    { label: "Absent", value: attendance.absent, tone: "text-red-600" },
    { label: "Late", value: attendance.late, tone: "text-amber-600" },
    { label: "On Leave", value: attendance.onLeave, tone: "text-blue-600" },
  ];

  return (
    <SectionCard
      title="Attendance"
      description={`${attendance.total} records over the last 30 school days`}
      action={action ?? <Link href="/attendance" className="text-primary text-sm hover:underline">Open register</Link>}
    >
      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-semibold tracking-tight">{attendance.rate}%</span>
          <span className="text-muted-foreground pb-1 text-sm">average present rate</span>
        </div>
        <Progress value={attendance.rate} />
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-muted/50 rounded-lg p-3">
              <dt className="text-muted-foreground text-xs">{stat.label}</dt>
              <dd className={cn("text-lg font-semibold", stat.tone)}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionCard>
  );
}

export function FinanceOverview({
  finance,
  showPayroll,
}: {
  finance: { billed: number; collected: number; outstanding: number; collectionRate: number; overdueCount: number; overdueAmount: number; pendingPayroll: number; payrollTotal: number };
  showPayroll: boolean;
}) {
  return (
    <SectionCard title="Fee Collection" description="Term I billing position">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Billed</p>
            <p className="text-lg font-semibold">{money(finance.billed)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Collected</p>
            <p className="text-emerald-600 text-lg font-semibold">{money(finance.collected)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Outstanding</p>
            <p className="text-lg font-semibold text-amber-600">{money(finance.outstanding)}</p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Collection progress</span>
            <span className="font-medium">{finance.collectionRate}%</span>
          </div>
          <Progress value={finance.collectionRate} />
        </div>
        <div className="border-border flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <CircleAlert className="size-4 text-destructive" />
            <div>
              <p className="text-sm font-medium">{finance.overdueCount} overdue invoices</p>
              <p className="text-muted-foreground text-xs">{money(finance.overdueAmount)} outstanding past due date</p>
            </div>
          </div>
          <Link href="/finance/fees" className="text-primary text-sm hover:underline">
            Review
          </Link>
        </div>
        {showPayroll && (
          <div className="border-border flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{finance.pendingPayroll} staff pending payout</p>
                <p className="text-muted-foreground text-xs">{money(finance.payrollTotal)} due this month</p>
              </div>
            </div>
            <Link href="/finance/payroll" className="text-primary text-sm hover:underline">
              Open
            </Link>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function PendingTasks({
  tasks,
}: {
  tasks: { id: string; label: string; description: string; href: string; icon: typeof UserCheck }[];
}) {
  return (
    <SectionCard title="Pending Tasks" description="Actions waiting on you">
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={task.href}
              className="hover:border-primary/40 flex items-center gap-3 rounded-lg border p-3 transition-colors"
            >
              <task.icon className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.label}</p>
                <p className="text-muted-foreground truncate text-xs">{task.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function ClassStrengthTable({
  classes,
}: {
  classes: { id: string; name: string; studentCount: number; sections: number; capacity: number }[];
}) {
  return (
    <SectionCard title="Class Strength" description="Students against capacity by grade">
      <ul className="space-y-3">
        {classes.map((row) => {
          const fill = Math.min(100, Math.round((row.studentCount / Math.max(1, row.capacity)) * 100));
          return (
            <li key={row.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{row.name}</span>
                <span className="text-muted-foreground text-xs">
                  {row.studentCount} students · {row.sections} sections
                </span>
              </div>
              <Progress value={fill} />
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

export function RecentApplicants({
  applicants,
}: {
  applicants: { id: string; firstName: string; lastName: string; gradeLevel: number; status: string; appliedAt: string }[];
}) {
  return (
    <SectionCard title="Recent Applications" action={<Link href="/admissions" className="text-primary text-sm hover:underline">View all</Link>}>
      <ul className="divide-border divide-y">
        {applicants.map((applicant) => (
          <li key={applicant.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {applicant.firstName} {applicant.lastName}
              </p>
              <p className="text-muted-foreground text-xs">
                Grade {applicant.gradeLevel} · {dateLabel(applicant.appliedAt.slice(0, 10))}
              </p>
            </div>
            <StatusBadge value={applicant.status} map={STATUS_MAPS.admission} />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export const QuickActions = ({ actions }: { actions: { href: string; label: string; icon: typeof FileSpreadsheet }[] }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {actions.map((action) => (
      <Link
        key={action.href}
        href={action.href}
        className="hover:border-primary/40 flex items-center gap-3 rounded-xl border p-3 transition-colors"
      >
        <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
          <action.icon className="size-4" />
        </div>
        <span className="text-sm font-medium">{action.label}</span>
      </Link>
    ))}
  </div>
);