"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCheck, ClipboardCheck, Percent } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceRecord, AttendanceStatus, Student } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { RateBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLookups, useStudentsBySection } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { attendanceStats, lastNWeekdays } from "@/lib/mock/analytics";
import { TODAY, dayLabel } from "@/lib/mock/constants";
import { cn } from "@/lib/utils";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "on_leave"];

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  absent: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  late: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  on_leave: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  half_day: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  holiday: "bg-muted text-muted-foreground",
};

export default function AttendancePage() {
  const lookups = useLookups();
  const studentsBySection = useStudentsBySection();
  const { can, profileId, role } = useSession();

  const [classId, setClassId] = useState(lookups.classes[0]?.id ?? "");
  const [sectionId, setSectionId] = useState<string>("all");
  const [date, setDate] = useState(TODAY);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const sections = useMemo(
    () => lookups.sections.filter((s) => s.classId === classId),
    [lookups.sections, classId],
  );

  const students = useMemo<Student[]>(() => {
    if (role === "student") return lookups.students.filter((s) => s.id === profileId);
    if (role === "family") {
      const family = lookups.families.find((f) => f.id === profileId);
      const ids = new Set(family?.studentIds ?? []);
      return lookups.students.filter((s) => ids.has(s.id));
    }
    if (role === "teacher") {
      const mine = new Set(lookups.sections.filter((s) => s.teacherId === profileId).map((s) => s.id));
      return lookups.students.filter((s) => mine.has(s.sectionId));
    }
    if (sectionId === "all") {
      return lookups.students.filter((s) => s.classId === classId && s.status === "active");
    }
    return studentsBySection.get(sectionId) ?? [];
  }, [role, profileId, sectionId, classId, lookups, studentsBySection]);

  const load = async () => {
    setLoading(true);
    setDirty({});
    const result = await db.attendance.list({ start: date, end: date, studentIds: students.map((s) => s.id) });
    setRecords(result);
    setLoading(false);
  };

  useEffect(() => {
    if (students.length > 0) void load();
    else setRecords([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, classId, sectionId, students.length, role]);

  const statusFor = (studentId: string): AttendanceStatus =>
    dirty[studentId] ?? records.find((r) => r.studentId === studentId)?.status ?? "present";

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setDirty((prev) => ({ ...prev, [studentId]: status }));

  const markAll = (status: AttendanceStatus) =>
    setDirty((prev) => ({ ...Object.fromEntries(students.map((s) => [s.id, prev[s.id] ?? "present"])), ...Object.fromEntries(students.map((s) => [s.id, status])) }));

  const save = async () => {
    setSaving(true);
    for (const student of students) {
      const status = dirty[student.id];
      if (!status) continue;
      await db.attendance.setStatus(student.id, date, status, profileId ?? "stf-002");
    }
    setSaving(false);
    setDirty({});
    toast.success("Attendance saved", { description: `${students.length} students · ${dayLabel(date)}` });
    void load();
  };

  const counts = STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: students.filter((s) => statusFor(s.id) === status).length }),
    { present: 0, absent: 0, late: 0, on_leave: 0 } as Record<AttendanceStatus, number>,
  );
  const rate = students.length === 0 ? 0 : Math.round((counts.present / students.length) * 100);

  const monthStart = `${TODAY.slice(0, 7)}-01`;
  const monthDays = lastNWeekdays(monthStart, 30);
  const monthly = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const record of records) map.set(record.studentId, record.status);
    return map;
  }, [records]);

  return (
    <>
      <PageHeader
        title="Attendance"
        description={role === "teacher" || role === "student" || role === "family" ? "View your attendance record" : "Mark and review daily attendance"}
      />

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Daily Register</TabsTrigger>
          <TabsTrigger value="month">Monthly View</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              {(can("attendance.view") || can("attendance.viewOwn")) && !["student", "family"].includes(role ?? "") && (
                <>
                  <div className="w-44 space-y-2">
                    <label htmlFor="class" className="text-muted-foreground text-xs font-medium">Class</label>
                    <Select value={classId} onValueChange={(v) => { setClassId(String(v)); setSectionId("all"); }}>
                      <SelectTrigger id="class" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {lookups.classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-44 space-y-2">
                    <label htmlFor="section" className="text-muted-foreground text-xs font-medium">Section</label>
                    <Select value={sectionId} onValueChange={(v) => setSectionId(String(v))}>
                      <SelectTrigger id="section" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sections</SelectItem>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="w-44 space-y-2">
                <label htmlFor="date" className="text-muted-foreground text-xs font-medium">Date</label>
                <Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
            </div>

            {can("attendance.mark") && students.length > 0 && (
              <Button variant="outline" onClick={() => markAll("present")}>
                <CheckCheck className="size-4" />
                Mark all present
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Present" value={counts.present} icon={ClipboardCheck} tone="positive" />
            <StatCard label="Absent" value={counts.absent} tone={counts.absent > 0 ? "danger" : "default"} />
            <StatCard label="Late" value={counts.late} tone={counts.late > 0 ? "warning" : "default"} />
            <StatCard label="Present Rate" value={`${rate}%`} icon={Percent} tone={rate >= 90 ? "positive" : "warning"} />
          </div>

          {can("attendance.mark") && Object.keys(dirty).length > 0 && (
            <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className="text-sm font-medium">{Object.keys(dirty).length} unsaved change(s)</span>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save attendance"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDirty({})}>
                Discard
              </Button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-muted h-10 animate-pulse rounded-md" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No students in this selection" description="Pick a different class or section." />
            ) : (
              <ul className="divide-border divide-y">
                {students.map((student) => {
                  const status = statusFor(student.id);
                  return (
                    <li key={student.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link href={`/students/${student.id}`} className="hover:text-primary block truncate text-sm font-medium">
                          {student.firstName} {student.lastName}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {lookups.className(student.classId)} · {lookups.sectionName(student.sectionId)} · Roll {student.rollNumber}
                        </p>
                      </div>

                      {can("attendance.mark") ? (
                        <div className="flex flex-wrap gap-1" role="group" aria-label={`Mark ${student.firstName}`}>
                          {STATUSES.map((option) => (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={status === option}
                              onClick={() => setStatus(student.id, option)}
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                                status === option ? STATUS_STYLES[option] : "text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {option === "on_leave" ? "Leave" : option.charAt(0).toUpperCase() + option.slice(1)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <StatusBadge value={status} map={STATUS_MAPS.attendance} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="month" className="mt-4 space-y-4">
          <SectionWithStats students={students} lookups={lookups} />
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 border-b px-4 py-2 text-left font-medium">Student</th>
                  {monthDays.map((day) => (
                    <th key={day} className="border-b px-2 py-2 text-center text-xs font-medium">
                      {Number(day.slice(8))}
                    </th>
                  ))}
                  <th className="border-b px-4 py-2 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {students.slice(0, 60).map((student) => {
                  const summary = attendanceStats([student], monthStart, TODAY).studentSummary.get(student.id);
                  return (
                    <tr key={student.id}>
                      <td className="sticky left-0 bg-background border-r px-4 py-1.5 font-medium whitespace-nowrap">
                        {student.firstName} {student.lastName}
                      </td>
                      {monthDays.map((day) => {
                        const status = monthly.get(`${student.id}-${day}`) ?? monthly.get(student.id);
                        return (
                          <td key={day} className="border-r px-1 py-1 text-center">
                            <span
                              title={day}
                              className={cn(
                                "inline-block size-2.5 rounded-full",
                                status ? STATUS_STYLES[status] : "bg-muted",
                              )}
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-1.5 text-right">
                        <RateBadge rate={summary?.percentage ?? 0} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {STATUSES.map((status) => (
              <span key={status} className="text-muted-foreground flex items-center gap-1.5 capitalize">
                <span className={cn("size-2.5 rounded-full", STATUS_STYLES[status])} />
                {status.replace("_", " ")}
              </span>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

const SectionWithStats = ({ students, lookups }: { students: Student[]; lookups: ReturnType<typeof useLookups> }) => {
  const stats = useMemo(
    () => attendanceStats(students, `${TODAY.slice(0, 7)}-01`, TODAY),
    [students],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">Students</p>
        <p className="text-xl font-semibold">{students.length}</p>
        <p className="text-muted-foreground mt-1 truncate text-xs">
          {lookups.className(students[0]?.classId)}
        </p>
      </div>
      <div className="bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">Month Present Rate</p>
        <p className="text-xl font-semibold">{stats.rate}%</p>
        <Progress value={stats.rate} className="mt-2" />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">Total Absences</p>
        <p className="text-xl font-semibold text-destructive">{stats.absent}</p>
      </div>
      <div className="bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">Late Arrivals</p>
        <p className="text-xl font-semibold text-amber-600">{stats.late}</p>
      </div>
    </div>
  );
};