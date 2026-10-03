"use client";

import { useMemo, useState } from "react";
import type { TimetableSlot } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLookups } from "@/hooks/use-lookups";
import { useSession } from "@/lib/auth/session";
import { db } from "@/lib/mock/server";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

type Scope = { type: "class" | "teacher"; id: string };

export default function TimetablePage() {
  const lookups = useLookups();
  const { can, profileId } = useSession();

  const defaultScope = useMemo<Scope>(() => {
    if (profileId && lookups.sections.some((s) => s.teacherId === profileId)) {
      const section = lookups.sections.find((s) => s.teacherId === profileId);
      if (section) return { type: "class", id: section.classId };
    }
    if (profileId) return { type: "teacher", id: profileId };
    return { type: "class", id: lookups.classes[0]?.id ?? "" };
  }, [lookups, profileId]);

  const [scope, setScope] = useState<Scope>(defaultScope);
  const [editing, setEditing] = useState<{ periodId: string; dayOfWeek: number } | null>(null);
  const [version, setVersion] = useState(0);

  const periodSlots = useMemo(
    () =>
      db
        .all<{ id: string; name: string; order: number; isBreak: boolean; startTime: string; endTime: string }>("periodSlots")
        .sort((a, b) => a.order - b.order),
    [],
  );

  const allSlots = useMemo(() => db.all<TimetableSlot>("timetable"), [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(
    () => lookups.sections.filter((s) => s.classId === scope.id),
    [lookups.sections, scope.id],
  );

  const slots = useMemo(() => {
    if (scope.type === "class") {
      const sectionIds = new Set(sections.map((s) => s.id));
      return allSlots.filter((slot) => sectionIds.has(slot.sectionId));
    }
    return allSlots.filter((slot) => slot.teacherId === scope.id);
  }, [allSlots, scope, sections]);

  const grid = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    for (const slot of slots) {
      const key = `${slot.dayOfWeek}|${slot.periodId}`;
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return map;
  }, [slots]);

  const findConflicts = useMemo(() => {
    const conflicts = new Set<string>();
    if (scope.type !== "teacher") return conflicts;
    const byTeacherAndTime = new Map<string, number>();
    for (const slot of slots) {
      const key = `${slot.teacherId}|${slot.dayOfWeek}|${slot.periodId}`;
      byTeacherAndTime.set(key, (byTeacherAndTime.get(key) ?? 0) + 1);
    }
    for (const slot of slots) {
      const key = `${slot.teacherId}|${slot.dayOfWeek}|${slot.periodId}`;
      if ((byTeacherAndTime.get(key) ?? 0) > 1) conflicts.add(slot.teacherId);
    }
    return conflicts;
  }, [slots, scope.type]);

  const weeklyPeriods = slots.length;
  const distinctSubjects = new Set(slots.map((s) => s.subjectId)).size;
  const scopeLabel = scope.type === "class" ? lookups.className(scope.id) : lookups.teacherName(scope.id);
  const canManage = can("timetable.manage");

  return (
    <>
      <PageHeader
        title="Timetable"
        description={`Weekly schedule for ${scopeLabel}`}
        actions={
          <Select
            value={`${scope.type}:${scope.id}`}
            onValueChange={(value) => {
              const [type, id] = String(value).split(":");
              setScope({ type: type as Scope["type"], id });
            }}
          >
            <SelectTrigger className="w-64" aria-label="Timetable scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lookups.classes.map((c) => (
                <SelectItem key={c.id} value={`class:${c.id}`}>
                  Class · {c.name}
                </SelectItem>
              ))}
              {lookups.teachers.slice(0, 40).map((t) => (
                <SelectItem key={t.id} value={`teacher:${t.id}`}>
                  Teacher · {t.firstName} {t.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Periods Per Week" value={weeklyPeriods} />
        <StatCard label="Subjects" value={distinctSubjects} tone="info" />
        <StatCard
          label="Teacher Conflicts"
          value={findConflicts.size}
          tone={findConflicts.size > 0 ? "danger" : "positive"}
          hint={findConflicts.size > 0 ? "Double-booked periods detected" : "No clashes in this view"}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="w-40 border-b px-4 py-3 text-left font-medium">Period</th>
              {DAYS.map((day) => (
                <th key={day.value} className="border-b px-4 py-3 text-left font-medium">
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodSlots.map((period) => (
              <tr key={period.id} className={period.isBreak ? "bg-muted/30" : undefined}>
                <th className="border-b px-4 py-3 text-left align-top">
                  <span className="block font-medium">{period.name}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {period.startTime}–{period.endTime}
                  </span>
                </th>
                {!period.isBreak &&
                  DAYS.map((day) => {
                    const entries = grid.get(`${day.value}|${period.id}`) ?? [];
                    const cell = editing?.periodId === period.id && editing.dayOfWeek === day.value;
                    const conflicted = entries.some((e) => findConflicts.has(e.teacherId));

                    return (
                      <td key={day.value} className="border-b p-2 align-top">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => setEditing(cell ? null : { periodId: period.id, dayOfWeek: day.value })}
                          className={cn(
                            "w-full rounded-lg border p-2 text-left transition-colors",
                            cell ? "border-primary bg-primary/5" : "border-transparent hover:border-border hover:bg-muted/50",
                            period.isBreak && "cursor-default",
                            !canManage && "cursor-default",
                          )}
                        >
                          {entries.length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <span className="space-y-1.5">
                              {entries.map((slot) => (
                                <span key={slot.id} className="block">
                                  <span className="block font-medium">{lookups.subjectName(slot.subjectId)}</span>
                                  <span className="text-muted-foreground block truncate text-xs">
                                    {scope.type === "class"
                                      ? lookups.sectionName(slot.sectionId)
                                      : lookups.className(slot.classId)}
                                  </span>
                                  {conflicted && (
                                    <Badge variant="destructive" className="mt-1 text-[10px]">
                                      Clash
                                    </Badge>
                                  )}
                                </span>
                              ))}
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                {period.isBreak && (
                  <td colSpan={DAYS.length} className="border-b px-4 py-3">
                    <span className="text-muted-foreground text-xs">Break</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <PeriodEditor
          periodId={editing.periodId}
          dayOfWeek={editing.dayOfWeek}
          sections={sections}
          current={grid.get(`${editing.dayOfWeek}|${editing.periodId}`) ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setVersion((v) => v + 1);
          }}
        />
      ) : canManage ? (
        <p className="text-muted-foreground mt-4 text-xs">Select any cell to assign or change a period.</p>
      ) : (
        <p className="text-muted-foreground mt-4 text-xs">Timetable editing requires the manage permission.</p>
      )}
    </>
  );
}

const PeriodEditor = ({
  periodId,
  dayOfWeek,
  sections,
  current,
  onClose,
  onSaved,
}: {
  periodId: string;
  dayOfWeek: number;
  sections: { id: string; classId: string; name: string }[];
  current: TimetableSlot[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const lookups = useLookups();
  const [sectionId, setSectionId] = useState(current[0]?.sectionId ?? sections[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(current[0]?.subjectId ?? lookups.subjects[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(current[0]?.teacherId ?? lookups.teachers[0]?.id ?? "");
  const [pending, setPending] = useState(false);

  const day = DAYS.find((d) => d.value === dayOfWeek)?.label;

  const save = async () => {
    if (!sectionId || !subjectId || !teacherId) return;
    setPending(true);

    for (const slot of current) {
      if (slot.sectionId === sectionId) {
        await db.update<TimetableSlot>("timetable", slot.id, { subjectId, teacherId, periodId, dayOfWeek });
      } else {
        await db.remove("timetable", slot.id);
      }
    }

    const exists = current.some((slot) => slot.sectionId === sectionId);
    if (!exists) {
      await db.create<TimetableSlot>("timetable", {
        classId: lookups.sections.find((s) => s.id === sectionId)?.classId ?? "",
        sectionId,
        periodId,
        dayOfWeek,
        subjectId,
        teacherId,
      } as never);
    }

    setPending(false);
    onSaved();
  };

  return (
    <div className="mt-4 rounded-xl border p-4">
      <p className="mb-4 text-sm font-medium">Edit {day} period</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={sectionId} onValueChange={(v) => setSectionId(String(v))}>
          <SelectTrigger className="w-full" aria-label="Section">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {lookups.className(section.classId)} · {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={subjectId} onValueChange={(v) => setSubjectId(String(v))}>
          <SelectTrigger className="w-full" aria-label="Subject">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {lookups.subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teacherId} onValueChange={(v) => setTeacherId(String(v))}>
          <SelectTrigger className="w-full" aria-label="Teacher">
            <SelectValue placeholder="Teacher" />
          </SelectTrigger>
          <SelectContent>
            {lookups.teachers.slice(0, 60).map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save period"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
