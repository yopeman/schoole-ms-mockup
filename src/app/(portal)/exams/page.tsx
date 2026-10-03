"use client";

import { useMemo, useState } from "react";
import { CalendarDays, FileSpreadsheet, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import type { Exam } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, STATUS_MAPS } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { dateLabel } from "@/lib/mock/constants";
import { ExamMarksSheet } from "./marks-sheet";

export default function ExamsPage() {
  const lookups = useLookups();
  const { can, role, profileId } = useSession();
  const [selected, setSelected] = useState<Exam | null>(null);
  const [version, setVersion] = useState(0);

  // `version` re-reads the mock store after a mutation; the linter cannot see that dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allExams = useMemo(() => db.all<Exam>("exams"), [version]);

  // Students and families only see exams whose results have been published.
  const exams = useMemo(
    () => (role === "student" || role === "family" ? allExams.filter((e) => e.status === "published") : allExams),
    [allExams, role],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schedules = useMemo(() => db.all<import("@/types").ExamScheduleEntry>("examSchedule"), [version]);

  const scopeStudentIds = useMemo(() => {
    if (role === "student") return [profileId ?? ""];
    if (role === "family") return lookups.families.find((f) => f.id === profileId)?.studentIds ?? [];
    return [];
  }, [role, profileId, lookups.families]);

  const canManage = can("exams.manage");

  return (
    <>
      <PageHeader
        title="Exams & Results"
        description="Examinations, schedules, marks entry and published results"
        actions={
          canManage ? (
            <Button
              onClick={async () => {
                await db.create<Exam>("exams", {
                  name: `New Examination ${allExams.length + 1}`,
                  academicYearId: "ay-2026-27",
                  termId: "term-2",
                  type: "unit_test",
                  startDate: "2026-12-01",
                  endDate: "2026-12-10",
                  status: "scheduled",
                  classIds: [],
                  subjectIds: [],
                } as never);
                toast.success("Examination created");
                setVersion((v) => v + 1);
              }}
            >
              <Plus className="size-4" />
              New exam
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Examinations" value={exams.length} icon={FileSpreadsheet} tone="info" />
        <StatCard
          label="Upcoming / Ongoing"
          value={exams.filter((e) => e.status === "scheduled" || e.status === "ongoing").length}
          icon={CalendarDays}
        />
        <StatCard label="Published" value={exams.filter((e) => e.status === "published").length} tone="positive" />
        <StatCard label="Scheduled Papers" value={schedules.length} />
      </div>

      {selected ? (
        <>
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelected(null)}>
            ← All examinations
          </Button>
          <ExamMarksSheet
            exam={selected}
            studentIds={scopeStudentIds}
            canEdit={can("exams.manage") || can("grades.enter")}
            version={version}
          />
        </>
      ) : exams.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No examinations available"
          description="Results appear once exams are published."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => {
            const examSchedules = schedules.filter((s) => s.examId === exam.id);
            return (
              <Card key={exam.id} className="transition-colors hover:border-primary/40">
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{exam.name}</h3>
                      <p className="text-muted-foreground text-xs capitalize">{exam.type.replace("_", " ")}</p>
                    </div>
                    <StatusBadge value={exam.status} map={STATUS_MAPS.exam} />
                  </div>

                  <div className="text-muted-foreground space-y-1 text-sm">
                    <p>
                      {dateLabel(exam.startDate)} — {dateLabel(exam.endDate)}
                    </p>
                    <p>
                      {examSchedules.length} papers · {new Set(examSchedules.map((s) => s.subjectId)).size} subjects
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Schedule coverage</span>
                      <span className="font-medium">{examSchedules.length > 0 ? "Complete" : "Not created"}</span>
                    </div>
                    <Progress value={examSchedules.length > 0 ? 100 : 0} />
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelected(exam)}>
                      {can("exams.manage") || can("grades.enter") ? "Open marks sheet" : "View results"}
                    </Button>
                    {canManage && exam.status !== "published" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await db.update<Exam>("exams", exam.id, { status: "published" });
                          toast.success(`${exam.name} published`, {
                            description: "Results are now visible to students and families.",
                          });
                          setVersion((v) => v + 1);
                        }}
                      >
                        <Send className="size-3.5" />
                        Publish
                      </Button>
                    )}
                  </div>

                  {scopeStudentIds.length > 0 && (
                    <Badge variant="outline" className="w-fit">
                      Scoped to {scopeStudentIds.length} student(s)
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}