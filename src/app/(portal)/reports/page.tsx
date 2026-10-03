"use client";

import { useMemo, useState } from "react";
import { Download, PieChart, TrendingUp } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { downloadCsv } from "@/components/shared/data-table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLookups } from "@/hooks/use-lookups";
import {
  atRiskStudents,
  attendanceStats,
  collectionByMonth,
  enrollmentByGrade,
  enrollmentTrend,
  financeStats,
  gradeDistribution,
  lastNWeekdays,
  subjectPerformance,
} from "@/lib/mock/analytics";
import { TODAY, money } from "@/lib/mock/constants";
import { db } from "@/lib/mock/server";

const RANGES = {
  "30": "Last 30 school days",
  "60": "Last 60 school days",
  "90": "Full term (90 days)",
};

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 12,
  background: "var(--popover)",
  color: "var(--popover-foreground)",
};

export default function ReportsPage() {
  const lookups = useLookups();
  const [days, setDays] = useState<keyof typeof RANGES>("30");
  const [classId, setClassId] = useState("all");

  const window = useMemo(() => lastNWeekdays(TODAY, Number(days)), [days]);
  const start = window[0];
  const end = window[window.length - 1];

  const students = useMemo(
    () => (classId === "all" ? lookups.students : lookups.students.filter((s) => s.classId === classId)),
    [lookups.students, classId],
  );

  const attendance = useMemo(() => attendanceStats(students, start, end), [students, start, end]);
  const risky = useMemo(() => atRiskStudents(students, start, end, 10), [students, start, end]);

  const schedules = useMemo(() => {
    const all = db.all<{ id: string; examId: string; classId: string; subjectId: string; maxMarks: number }>("examSchedule");
    return classId === "all" ? all : all.filter((s) => s.classId === classId);
  }, [classId]);

  const gradeScale = db.all<import("@/types").GradeScale>("gradeScale");
  const distribution = useMemo(() => gradeDistribution(students, schedules, gradeScale), [students, schedules, gradeScale]);
  const subjects = useMemo(() => subjectPerformance(students, schedules, lookups.subjectName), [students, schedules, lookups]);

  const invoices = useMemo(() => {
    const all = db.all<import("@/types").Invoice>("invoices");
    if (classId === "all") return all;
    const ids = new Set(students.map((s) => s.id));
    return all.filter((i) => ids.has(i.studentId));
  }, [classId, students]);

  const finance = useMemo(() => financeStats(invoices), [invoices]);
  const collection = useMemo(
    () => collectionByMonth(db.all<import("@/types").Payment>("payments"), 6, TODAY),
    [],
  );

  const riskColumns: Column<(typeof risky)[number]>[] = [
    { key: "name", header: "Student", sortable: true },
    {
      key: "classId",
      header: "Class",
      sortable: true,
      sortValue: (row) => lookups.className(row.classId),
      cell: (row) => lookups.className(row.classId),
    },
    { key: "attendance", header: "Attendance", align: "right", sortable: true, cell: (row) => `${row.attendance}%` },
    { key: "absent", header: "Absences", align: "right", sortable: true },
  ];

  const exportRisk = () => {
    const csv = [
      "Student,Class,Attendance %,Absences",
      ...risky.map((r) => `"${r.name}",${lookups.className(r.classId)},${r.attendance},${r.absent}`),
    ].join("\n");
    downloadCsv(`attendance-risk-${end}.csv`, csv);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Filter-driven analytics across academics, attendance and finance"
        actions={
          <>
            <Select value={classId} onValueChange={(v) => setClassId(String(v))}>
              <SelectTrigger className="w-48" aria-label="Class filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {lookups.classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={(v) => setDays(v as keyof typeof RANGES)}>
              <SelectTrigger className="w-52" aria-label="Date range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RANGES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students In Scope" value={students.length} />
        <StatCard label="Attendance Rate" value={`${attendance.rate}%`} tone={attendance.rate >= 90 ? "positive" : "warning"} hint={`${start} → ${end}`} />
        <StatCard label="Collection Rate" value={`${finance.collectionRate}%`} tone="positive" hint={money(finance.collected)} />
        <StatCard label="At-Risk Students" value={risky.length} tone={risky.length ? "danger" : "positive"} />
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4 space-y-6">
          <SectionCard title="Daily Attendance Rate" description={`${attendance.dailyRate.length} school days`}>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={attendance.dailyRate} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[50, 100]} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value)}%`, "Present"]} />
                  <Line type="monotone" dataKey="rate" stroke={COLORS[2]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Present Records", value: attendance.present, tone: "text-emerald-600" },
              { label: "Absent Records", value: attendance.absent, tone: "text-destructive" },
              { label: "Late Arrivals", value: attendance.late, tone: "text-amber-600" },
              { label: "Approved Leaves", value: attendance.onLeave, tone: "text-blue-600" },
            ].map((stat) => (
              <SectionCard key={stat.label} title={stat.label}>
                <p className={`text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
              </SectionCard>
            ))}
          </div>

          <SectionCard
            title="Students Below Threshold"
            description="Under 85% attendance or 3+ absences in the selected window"
            action={
              <Button variant="outline" size="sm" onClick={exportRisk} disabled={risky.length === 0}>
                <Download className="size-3.5" />
                Export
              </Button>
            }
          >
            <DataTable
              rows={risky}
              columns={riskColumns}
              rowKey={(row) => row.id}
              empty={{ title: "No students below threshold", description: "Attendance is healthy across this selection." }}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="academics" className="mt-4 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Grade Distribution" description="Latest published examination">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="grade" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                    {distribution.map((entry, index) => (
                      <Cell key={entry.grade} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Subject Performance" description="Class average and pass rate">
            <ul className="space-y-3">
              {subjects.map((row) => (
                <li key={row.subject}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{row.subject}</span>
                    <span className="text-muted-foreground text-xs">
                      {row.average}% avg · {row.passRate}% pass
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${Math.min(100, row.average)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="enrollment" className="mt-4 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Roll Strength" description="Cumulative head count since April">
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={enrollmentTrend(lookups.students, TODAY, 6)} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="total" stroke={COLORS[0]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Intake by Grade" description="New admissions versus continuing students">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={enrollmentByGrade(lookups.students, lookups.classes)} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="grade" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="previous" name="Continuing" fill={COLORS[0]} radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="current" name="New intake" fill={COLORS[1]} radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="finance" className="mt-4 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Fee Collection" description="Amount received per month">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={collection} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [money(Number(value)), "Collected"]} />
                  <Bar dataKey="amount" fill={COLORS[1]} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Collection Position">
              <dl className="space-y-3 text-sm">
                {[
                  { label: "Billed", value: money(finance.billed) },
                  { label: "Collected", value: money(finance.collected) },
                  { label: "Outstanding", value: money(finance.outstanding) },
                  { label: "Overdue", value: money(finance.overdueAmount) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>

            <SectionCard title="Invoice Status">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(finance.statusCounts).map(([status, count]) => (
                  <div key={status} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs capitalize">{status}</p>
                    <p className="text-xl font-semibold">{count}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-muted-foreground mt-6 flex items-center gap-2 text-xs">
        <PieChart className="size-3.5" />
        <TrendingUp className="size-3.5" />
        Figures are computed live from mock data for {start} → {end}.
      </p>
    </>
  );
}