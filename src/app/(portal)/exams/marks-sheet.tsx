"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Save, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { Exam, ExamScheduleEntry } from "@/types";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/components/shared/data-table";
import { useExamResults, useLookups } from "@/hooks/use-lookups";
import { db } from "@/lib/mock/server";
import { examResultFor } from "@/lib/mock/generators";

type Override = { id: string; examId: string; subjectId: string; studentId: string; marks: number };

type Row = {
  studentId: string;
  name: string;
  classId: string;
  sectionId: string;
  rollNumber: string;
};

export function ExamMarksSheet({
  exam,
  studentIds,
  canEdit,
  version: externalVersion,
}: {
  exam: Exam;
  studentIds: string[];
  canEdit: boolean;
  version: number;
}) {
  const lookups = useLookups();

  const schedules = useMemo(
    () => db.all<ExamScheduleEntry>("examSchedule").filter((s) => s.examId === exam.id),
    [exam.id],
  );

  const [subjectId, setSubjectId] = useState(schedules[0]?.subjectId ?? "");
  const [classId, setClassId] = useState(schedules[0]?.classId ?? "");
  const [localVersion, setLocalVersion] = useState(0);
  const version = externalVersion + localVersion;

  const [marks, setMarks] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const derived = useExamResults(exam.id, []);
  const overrides = db.all<Override>("resultOverrides");
  const subjectSchedules = schedules.filter((s) => s.subjectId === subjectId);
  const maxMarks = subjectSchedules[0]?.maxMarks ?? 100;

  const rows = useMemo<Row[]>(() => {
    const allowed = new Set(studentIds);
    return lookups.students
      .filter((s) => s.classId === classId && (!studentIds.length || allowed.has(s.id)))
      .map((s) => ({
        studentId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        classId: s.classId,
        sectionId: s.sectionId,
        rollNumber: s.rollNumber,
      }))
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
  }, [lookups.students, classId, studentIds]);

  // Seed the entry grid from derived results, then layer saved overrides on top.
  useEffect(() => {
    const seeded: Record<string, string> = {};
    for (const row of rows) {
      const schedule = subjectSchedules.find((s) => s.classId === row.classId);
      const student = lookups.students.find((s) => s.id === row.studentId);
      if (!schedule || !student) continue;
      const result = examResultFor(schedule, student, exam.name, "tch-001");
      const override = overrides.find(
        (o) => o.examId === exam.id && o.subjectId === schedule.subjectId && o.studentId === row.studentId,
      );
      seeded[row.studentId] = String(override?.marks ?? result.theoryMarks);
    }
    setMarks(seeded);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, classId, rows.length, version]);

  const getMark = (studentId: string) => {
    if (marks[studentId] !== undefined) return Number(marks[studentId]);
    const row = rows.find((r) => r.studentId === studentId);
    const schedule = subjectSchedules.find((s) => s.classId === row?.classId);
    const student = lookups.students.find((s) => s.id === studentId);
    return schedule && student ? examResultFor(schedule, student, exam.name, "tch-001").theoryMarks : 0;
  };

  const setMark = (studentId: string, value: string) => {
    setMarks((prev) => ({ ...prev, [studentId]: value }));
    setDirty(true);
  };

  const save = async () => {
    for (const row of rows) {
      const value = Math.max(0, Math.min(maxMarks, Number(marks[row.studentId] ?? 0)));
      if (Number.isNaN(value)) continue;
      await db.create<Override>("resultOverrides", {
        examId: exam.id,
        subjectId,
        studentId: row.studentId,
        marks: value,
      } as never);
    }
    setDirty(false);
    setLocalVersion((v) => v + 1);
    toast.success("Marks saved", { description: `${rows.length} entries · ${lookups.subjectName(subjectId)}` });
  };

  const computed = rows.map((row) => {
    const mark = getMark(row.studentId);
    const percentage = Math.round((mark / Math.max(1, maxMarks)) * 100);
    return { ...row, mark, percentage, passed: percentage >= 35 };
  });

  const classAverage =
    computed.length === 0 ? 0 : Math.round(computed.reduce((sum, r) => sum + r.percentage, 0) / computed.length);
  const passRate =
    computed.length === 0 ? 0 : Math.round((computed.filter((r) => r.passed).length / computed.length) * 100);
  const highest = [...computed].sort((a, b) => b.percentage - a.percentage)[0];
  const overallAverage =
    derived.length === 0 ? 0 : Math.round(derived.reduce((sum, r) => sum + r.percentage, 0) / derived.length);

  const exportSheet = () => {
    const csv = [
      "Roll,Student,Class,Section,Marks,Percentage,Result",
      ...computed.map((r) =>
        [
          r.rollNumber,
          `"${r.name}"`,
          lookups.className(r.classId),
          lookups.sectionName(r.sectionId),
          r.mark,
          `${r.percentage}%`,
          r.passed ? "Pass" : "Fail",
        ].join(","),
      ),
    ].join("\n");
    downloadCsv(`${exam.name.replace(/\s+/g, "-")}-${lookups.subjectName(subjectId)}.csv`, csv);
  };

  return (
    <>
      <PageHeader
        title={exam.name}
        description={`${exam.type.replace("_", " ")} · marks entry and results`}
        badge={<Badge variant={exam.status === "published" ? "default" : "secondary"}>{exam.status}</Badge>}
        actions={
          <>
            <Button variant="outline" onClick={exportSheet} disabled={computed.length === 0}>
              <Download className="size-4" />
              Export sheet
            </Button>
            {canEdit && (
              <Button onClick={save} disabled={!dirty}>
                <Save className="size-4" />
                Save marks
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={computed.length} />
        <StatCard
          label="Class Average"
          value={`${classAverage}%`}
          icon={TrendingUp}
          tone={classAverage >= 60 ? "positive" : "warning"}
        />
        <StatCard label="Pass Rate" value={`${passRate}%`} tone={passRate >= 80 ? "positive" : "danger"} />
        <StatCard label="School Average" value={`${overallAverage}%`} hint="All subjects" />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={classId} onValueChange={(v) => setClassId(String(v))}>
          <SelectTrigger className="w-48" aria-label="Class">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            {[...new Set(schedules.map((s) => s.classId))].map((id) => (
              <SelectItem key={id} value={id}>
                {lookups.className(id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={subjectId} onValueChange={(v) => setSubjectId(String(v))}>
          <SelectTrigger className="w-56" aria-label="Subject">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {[...new Set(schedules.map((s) => s.subjectId))].map((id) => (
              <SelectItem key={id} value={id}>
                {lookups.subjectName(id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SectionCard
        title={`Marks Entry — ${lookups.subjectName(subjectId)}`}
        description={`Maximum ${maxMarks} marks · pass mark 35`}
      >
        {rows.length === 0 ? (
          <EmptyState title="No students in this class" description="Marks appear once a class is selected." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="w-14 py-2 text-left font-medium">Roll</th>
                  <th className="py-2 text-left font-medium">Student</th>
                  <th className="py-2 text-left font-medium">Section</th>
                  <th className="w-28 py-2 text-right font-medium">Marks</th>
                  <th className="w-28 py-2 text-right font-medium">Percentage</th>
                  <th className="w-24 py-2 text-right font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {computed.map((row) => (
                  <tr key={row.studentId}>
                    <td className="text-muted-foreground py-1.5">{row.rollNumber}</td>
                    <td className="py-1.5">
                      <Link href={`/students/${row.studentId}`} className="hover:text-primary flex items-center gap-2 font-medium">
                        <Avatar className="size-6">
                          <AvatarFallback className="text-[10px]">
                            {row.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        {row.name}
                      </Link>
                    </td>
                    <td className="text-muted-foreground py-1.5">{lookups.sectionName(row.sectionId)}</td>
                    <td className="py-1.5 text-right">
                      {canEdit ? (
                        <Input
                          type="number"
                          min={0}
                          max={maxMarks}
                          value={marks[row.studentId] ?? String(row.mark)}
                          onChange={(event) => setMark(row.studentId, event.target.value)}
                          className="h-8 w-24 text-right"
                          aria-label={`Marks for ${row.name}`}
                        />
                      ) : (
                        row.mark
                      )}
                    </td>
                    <td className="px-4 py-1.5 text-right">{row.percentage}%</td>
                    <td className="py-1.5 text-right">
                      <Badge variant={row.passed ? "secondary" : "destructive"}>{row.passed ? "Pass" : "Fail"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {highest && (
        <p className="text-muted-foreground mt-4 text-xs">
          Topper in this subject: <span className="text-foreground font-medium">{highest.name}</span> ({highest.percentage}%)
        </p>
      )}
    </>
  );
}