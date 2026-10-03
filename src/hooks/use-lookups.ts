"use client";

import { useMemo } from "react";
import type {
  AttendanceSummary,
  ExamResult,
  Family,
  GradeScale,
  Guardian,
  Invoice,
  SchoolClass,
  Section,
  Staff,
  Student,
  Subject,
  Teacher,
} from "@/types";
import { attendanceRange, examResultFor, summarize } from "@/lib/mock/generators";
import * as store from "@/lib/mock/store";

const asMap = <T extends { id: string }>(records: T[]) => new Map(records.map((r) => [r.id, r]));

/** Memoized lookup tables so lists and tables can join ids to display names. */
export function useLookups() {
  return useMemo(() => {
    const students = store.selectAll<Student>("students");
    const teachers = store.selectAll<Teacher>("teachers");
    const staff = store.selectAll<Staff>("staff");
    const families = store.selectAll<Family>("families");
    const classes = store.selectAll<SchoolClass>("classes");
    const sections = store.selectAll<Section>("sections");
    const subjects = store.selectAll<Subject>("subjects");
    const exams = store.selectAll<{ id: string; name: string; status: string }>("exams");
    const invoices = store.selectAll<Invoice>("invoices");

    const classMap = asMap(classes);
    const familyMap = asMap(families);
    const sectionMap = asMap(sections);
    const subjectMap = asMap(subjects);
    const teacherMap = asMap(teachers);
    const studentMap = asMap(students);

    const personName = (record?: { firstName: string; lastName: string }) =>
      record ? `${record.firstName} ${record.lastName}` : "—";

    return {
      students,
      teachers,
      staff,
      families,
      classes,
      sections,
      subjects,
      exams,
      invoices,
      studentMap,
      teacherMap,
      familyMap,
      classMap,
      sectionMap,
      subjectMap,
      examMap: asMap(exams),
      invoiceMap: asMap(invoices),

      className: (id?: string) => classMap.get(id ?? "")?.name ?? "—",
      sectionName: (id?: string) => sectionMap.get(id ?? "")?.name ?? "—",
      subjectName: (id?: string) => subjectMap.get(id ?? "")?.name ?? "—",
      teacherName: (id?: string) => personName(teacherMap.get(id ?? "")),
      studentName: (id?: string) => personName(studentMap.get(id ?? "")),
      staffName: (id?: string) => personName(staff.find((s) => s.id === id)),
      parentName: (studentId?: string) => {
        const student = studentMap.get(studentId ?? "");
        const guardian = student?.guardians.find((g: Guardian) => g.isPrimary) ?? student?.guardians[0];
        return guardian ? `${guardian.firstName} ${guardian.lastName}` : "—";
      },
    };
  }, []);
}

export const useClassSections = () => {
  const lookups = useLookups();
  return useMemo(() => {
    const map = new Map<string, Section[]>();
    for (const section of lookups.sections) {
      map.set(section.classId, [...(map.get(section.classId) ?? []), section]);
    }
    return map;
  }, [lookups]);
};

export const useStudentsBySection = () => {
  const lookups = useLookups();
  return useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const student of lookups.students) {
      map.set(student.sectionId, [...(map.get(student.sectionId) ?? []), student]);
    }
    for (const list of map.values()) list.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    return map;
  }, [lookups]);
};

/** Attendance summary for a set of students over a date range (derived, not stored). */
export const useAttendanceSummary = (studentIds: string[], start: string, end: string) => {
  const lookups = useLookups();

  return useMemo(() => {
    const students = studentIds.length ? lookups.students.filter((s) => studentIds.includes(s.id)) : lookups.students;
    return summarize(attendanceRange(students, start, end, "stf-002"));
  }, [lookups, studentIds, start, end]);
};

export type DerivedExamResult = ExamResult & { percentage: number; letterGrade: string; gradePoint: number };

/** Exam results derived from a stable per-student ability score. */
export const useExamResults = (examId: string, studentIds: string[]) => {
  const lookups = useLookups();

  return useMemo(() => {
    const schedules = store
      .selectAll<{ id: string; examId: string; subjectId: string; classId: string; maxMarks: number }>("examSchedule")
      .filter((s) => s.examId === examId);
    const gradeScale = store
      .selectAll<GradeScale>("gradeScale")
      .sort((a, b) => b.minPercentage - a.minPercentage);
    const exam = lookups.examMap.get(examId) as { name: string } | undefined;
    const students = studentIds.length ? lookups.students.filter((s) => studentIds.includes(s.id)) : lookups.students;

    const rows: DerivedExamResult[] = [];
    for (const schedule of schedules) {
      for (const student of students) {
        if (student.classId !== schedule.classId) continue;
        const base = examResultFor(schedule, student, exam?.name ?? "Exam", "tch-001");
        const match = gradeScale.find((g) => base.percentage >= g.minPercentage);
        rows.push({
          ...(base as unknown as DerivedExamResult),
          letterGrade: match?.letterGrade ?? "E",
          gradePoint: match?.gradePoint ?? 0,
        });
      }
    }
    return rows;
  }, [lookups, examId, studentIds]);
};

export type { AttendanceSummary, Guardian };