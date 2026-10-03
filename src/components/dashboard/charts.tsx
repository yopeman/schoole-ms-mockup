"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 12,
  background: "var(--popover)",
  color: "var(--popover-foreground)",
};

export function EnrollmentTrend({ data }: { data: { label: string; total: number }[] }) {
  return (
    <SectionCard title="Enrollment Trend" description="Cumulative student roll strength since April">
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="total" stroke={CHART_COLORS[0]} strokeWidth={2} fill="url(#enrollFill)" name="Students" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function GradeDistributionChart({ data }: { data: { grade: string; count: number }[] }) {
  if (data.length === 0) return <SectionCard title="Grade Distribution"><EmptyState title="No published results yet" /></SectionCard>;

  return (
    <SectionCard title="Grade Distribution" description="Latest published examination">
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="grade" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.grade} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function GenderSplit({ male, female, total }: { male: number; female: number; total: number }) {
  const data = [
    { name: "Male", value: male },
    { name: "Female", value: female },
  ];

  return (
    <SectionCard title="Gender Split" description={`${total} active students`}>
      <div className="flex items-center gap-6">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-3">
          {data.map((entry, index) => (
            <li key={entry.name}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: CHART_COLORS[index] }} />
                  {entry.name}
                </span>
                <span className="font-medium">
                  {entry.value} · {total === 0 ? 0 : Math.round((entry.value / total) * 100)}%
                </span>
              </div>
              <Progress value={total === 0 ? 0 : (entry.value / total) * 100} />
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

export function AttendanceTrend({ data }: { data: { label: string; rate: number }[] }) {
  return (
    <SectionCard title="Attendance Trend" description="Daily present rate over the last 30 school days">
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[60, 100]} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value)}%`, "Present"]} />
            <Line type="monotone" dataKey="rate" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function CollectionTrend({ data }: { data: { label: string; amount: number }[] }) {
  return (
    <SectionCard title="Fee Collection" description="Amount received per month (INR)">
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={40} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Collected"]} />
            <Bar dataKey="amount" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} name="Collected" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function AdmissionFunnel({ data }: { data: { status: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const order = ["inquiry", "application", "under_review", "interview", "offered", "enrolled"];

  return (
    <SectionCard title="Admissions Pipeline" description="Current intake by stage">
      <ul className="space-y-3">
        {order.map((status) => {
          const entry = data.find((d) => d.status === status);
          const count = entry?.count ?? 0;
          return (
            <li key={status}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="capitalize">{status.replace("_", " ")}</span>
                <span className="font-medium">{count}</span>
              </div>
              <Progress value={(count / max) * 100} className={cn(count === 0 && "opacity-40")} />
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

export function TopPerformers({ data, className }: { data: { id: string; name: string; classId: string; average: number }[]; className: (id?: string) => string }) {
  if (data.length === 0) return <SectionCard title="Top Performers"><EmptyState title="No results published" /></SectionCard>;

  return (
    <SectionCard title="Top Performers" description="Best aggregate averages" action={<Badge variant="secondary">{data.length}</Badge>}>
      <ul className="divide-border divide-y">
        {data.map((row, index) => (
          <li key={row.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <span className="text-muted-foreground w-5 text-xs font-medium">{index + 1}</span>
            <Link href={`/students/${row.id}`} className="hover:text-primary min-w-0 flex-1 truncate text-sm font-medium">
              {row.name}
            </Link>
            <span className="text-muted-foreground text-xs">{className(row.classId)}</span>
            <span className="w-10 text-right text-sm font-semibold">{row.average}%</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function ActivityFeed({ data }: { data: { id: string; actorName: string; description: string; createdAt: string }[] }) {
  if (data.length === 0) return <SectionCard title="Recent Activity"><EmptyState title="Nothing yet" /></SectionCard>;

  return (
    <SectionCard title="Recent Activity" description="Latest actions across the school">
      <ol className="relative space-y-4 border-l pl-6">
        {data.map((entry) => (
          <li key={entry.id} className="relative">
            <span className="bg-primary absolute top-1.5 -left-[27px] size-2.5 rounded-full" aria-hidden />
            <p className="text-sm">{entry.description}</p>
            <p className="text-muted-foreground text-xs">
              {entry.actorName} · {new Date(entry.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

export function UpcomingEvents({ data }: { data: { id: string; title: string; startDate: string; location?: string; category: string }[] }) {
  if (data.length === 0) return <SectionCard title="Upcoming Events"><EmptyState title="No upcoming events" /></SectionCard>;

  return (
    <SectionCard title="Upcoming Events" description="Next on the academic calendar">
      <ul className="divide-border divide-y">
        {data.map((event) => (
          <li key={event.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="bg-primary/10 text-primary flex size-11 shrink-0 flex-col items-center justify-center rounded-md">
              <span className="text-[10px] leading-none font-medium uppercase">
                {new Date(`${event.startDate}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}
              </span>
              <span className="text-sm leading-tight font-semibold">
                {new Date(`${event.startDate}T00:00:00Z`).getUTCDate()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="text-muted-foreground truncate text-xs">{event.location ?? "School campus"}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {event.category}
            </Badge>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function AnnouncementList({ data }: { data: { id: string; title: string; body: string; priority: string; publishedAt: string }[] }) {
  if (data.length === 0) return <SectionCard title="Announcements"><EmptyState title="No announcements" /></SectionCard>;

  return (
    <SectionCard title="Announcements" action={<Link href="/announcements" className="text-primary text-sm hover:underline">View all</Link>}>
      <ul className="space-y-3">
        {data.map((item) => (
          <li key={item.id} className="border-border rounded-lg border p-3">
            <div className="mb-1 flex items-center gap-2">
              <p className="flex-1 text-sm font-medium">{item.title}</p>
              {item.priority === "urgent" && <Badge variant="destructive">Urgent</Badge>}
            </div>
            <p className="text-muted-foreground line-clamp-2 text-xs">{item.body}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function SubjectPerformanceBars({ data }: { data: { subject: string; average: number; passRate: number }[] }) {
  if (data.length === 0) return <SectionCard title="Subject Performance"><EmptyState title="No results published" /></SectionCard>;

  return (
    <SectionCard title="Subject Performance" description="Class average and pass rate">
      <ul className="space-y-3">
        {data.map((row) => (
          <li key={row.subject}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate">{row.subject}</span>
              <span className="text-muted-foreground text-xs">
                {row.average}% avg · {row.passRate}% pass
              </span>
            </div>
            <Progress value={row.average} />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}