/**
 * Pure analytics helpers over the mock dataset. Kept free of React so they can
 * be unit tested and reused by dashboards, reports and detail pages.
 */
import type { ExamResult, Guardian, Invoice, SchoolClass, Student, Subject } from "@/types";
import { attendanceRange, examResultFor, summarize } from "./generators";
import { daysAgo } from "./seed/helpers";

export const SCHOOL_YEAR_START = "2026-04-01";

export const isWeekday = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
};

export const lastNWeekdays = (end: string, count: number) => {
  const out: string[] = [];
  let offset = 0;
  while (out.length < count) {
    const date = daysAgo(offset, end);
    if (isWeekday(date)) out.unshift(date);
    offset += 1;
  }
  return out;
};

/* ----------------------------- People ----------------------------- */

export const studentStats = (students: Student[]) => {
  const active = students.filter((s) => s.status === "active");
  const byGender = {
    male: active.filter((s) => s.gender === "male").length,
    female: active.filter((s) => s.gender === "female").length,
  };
  const scholarship = active.filter((s) => s.scholarship).length;
  const newAdmissions = active.filter((s) => s.admissionDate >= SCHOOL_YEAR_START).length;

  return {
    total: active.length,
    male: byGender.male,
    female: byGender.female,
    genderRatio: active.length === 0 ? 0 : Math.round((byGender.female / active.length) * 100),
    scholarship,
    newAdmissions,
    inactive: students.length - active.length,
  };
};

export const teacherStats = (teachers: { salary: number; rating?: number; status: string }[]) => {
  const active = teachers.filter((t) => t.status === "active");
  const rated = active.filter((t) => typeof t.rating === "number");
  return {
    total: active.length,
    averageSalary: active.length === 0 ? 0 : Math.round(active.reduce((sum, t) => sum + t.salary, 0) / active.length),
    averageRating: rated.length === 0 ? 0 : Number((rated.reduce((sum, t) => sum + (t.rating ?? 0), 0) / rated.length).toFixed(1)),
    fullTime: active.filter((t) => (t as { employmentType?: string }).employmentType === "full_time").length,
  };
};

/* --------------------------- Enrollment --------------------------- */

/** Enrollment count per grade for the current and previous intake. */
export const enrollmentByGrade = (students: Student[], classes: SchoolClass[]) => {
  const gradeOf = (classId: string) => classes.find((c) => c.id === classId)?.gradeLevel ?? 0;
  const map = new Map<number, { previous: number; current: number }>();

  for (const student of students.filter((s) => s.status === "active")) {
    const grade = gradeOf(student.classId);
    const entry = map.get(grade) ?? { previous: 0, current: 0 };
    if (student.admissionDate >= SCHOOL_YEAR_START) entry.current += 1;
    else entry.previous += 1;
    map.set(grade, entry);
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([grade, counts]) => ({ grade: `G${grade}`, ...counts }));
};

/** Head-count on the last day of each month since the academic year started. */
export const enrollmentTrend = (students: Student[], end: string, months = 6) => {
  const series: { month: string; label: string; total: number }[] = [];
  const endDate = new Date(`${end}T00:00:00Z`);

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - i, 1));
    const month = monthDate.toISOString().slice(0, 7);
    const boundary = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);
    const capped = boundary > end ? end : boundary;

    series.push({
      month,
      label: monthDate.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
      total: students.filter((s) => s.admissionDate <= capped).length,
    });
  }

  return series;
};

/* --------------------------- Attendance --------------------------- */

export const attendanceStats = (students: Student[], start: string, end: string) => {
  const summary = summarize(attendanceRange(students, start, end, "stf-001"));
  const entries = [...summary.values()];

  const totals = entries.reduce(
    (acc, entry) => ({
      total: acc.total + entry.total,
      present: acc.present + entry.present,
      absent: acc.absent + entry.absent,
      late: acc.late + entry.late,
      onLeave: acc.onLeave + entry.onLeave,
    }),
    { total: 0, present: 0, absent: 0, late: 0, onLeave: 0 },
  );

  return {
    ...totals,
    rate: totals.total === 0 ? 0 : Number(((totals.present / totals.total) * 100).toFixed(1)),
    studentSummary: summary,
    dailyRate: (() => {
      const byDate = new Map<string, { total: number; present: number }>();
      for (const record of attendanceRange(students, start, end, "stf-001")) {
        const entry = byDate.get(record.date) ?? { total: 0, present: 0 };
        entry.total += 1;
        if (record.status === "present" || record.status === "late") entry.present += 1;
        byDate.set(record.date, entry);
      }
      return [...byDate.entries()].map(([date, value]) => ({
        date,
        label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" }),
        rate: Number(((value.present / value.total) * 100).toFixed(1)),
      }));
    })(),
  };
};

export const atRiskStudents = (students: Student[], start: string, end: string, limit = 6) => {
  const summary = summarize(attendanceRange(students, start, end, "stf-001"));
  return students
    .map((student) => ({ student, summary: summary.get(student.id) }))
    .filter((entry) => entry.summary && (entry.summary.percentage < 85 || entry.summary.absent >= 3))
    .sort((a, b) => (a.summary?.percentage ?? 0) - (b.summary?.percentage ?? 0))
    .slice(0, limit)
    .map(({ student, summary }) => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      classId: student.classId,
      attendance: summary?.percentage ?? 0,
      absent: summary?.absent ?? 0,
    }));
};

/* ---------------------------- Results ---------------------------- */

export const gradeDistribution = (
  students: Student[],
  schedules: { id: string; classId: string; subjectId: string; maxMarks: number }[],
  gradeScale: { letterGrade: string; minPercentage: number }[],
) => {
  const buckets = new Map<string, number>();

  for (const student of students) {
    const relevant = schedules.filter((s) => s.classId === student.classId);
    if (relevant.length === 0) continue;

    const marks = relevant.map((schedule) => {
      const result = examResultFor(schedule, student, "Exam", "tch-001");
      return (result.percentage / 100) * schedule.maxMarks;
    });
    const total = marks.reduce((sum, m) => sum + m, 0);
    const maxTotal = relevant.reduce((sum, s) => sum + s.maxMarks, 0);
    const percentage = maxTotal === 0 ? 0 : (total / maxTotal) * 100;

    const band =
      [...gradeScale].sort((a, b) => b.minPercentage - a.minPercentage).find((g) => percentage >= g.minPercentage)?.letterGrade ?? "E";
    buckets.set(band, (buckets.get(band) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([grade, count]) => ({ grade, count }));
};

export const subjectPerformance = (
  students: Student[],
  schedules: { id: string; classId: string; subjectId: string; maxMarks: number }[],
  subjectName: (id: string) => string,
) => {
  const map = new Map<string, { total: number; count: number; pass: number }>();

  for (const schedule of schedules) {
    for (const student of students) {
      if (student.classId !== schedule.classId) continue;
      const result = examResultFor(schedule, student, "Exam", "tch-001");
      const entry = map.get(schedule.subjectId) ?? { total: 0, count: 0, pass: 0 };
      entry.total += result.percentage;
      entry.count += 1;
      if (result.percentage >= 35) entry.pass += 1;
      map.set(schedule.subjectId, entry);
    }
  }

  return [...map.entries()]
    .map(([subjectId, value]) => ({
      subject: subjectName(subjectId),
      average: value.count === 0 ? 0 : Math.round(value.total / value.count),
      passRate: value.count === 0 ? 0 : Math.round((value.pass / value.count) * 100),
    }))
    .sort((a, b) => b.average - a.average);
};

export const topPerformers = (
  students: Student[],
  schedules: { id: string; classId: string; maxMarks: number }[],
  limit = 8,
) =>
  students
    .map((student) => {
      const relevant = schedules.filter((s) => s.classId === student.classId);
      if (relevant.length === 0) return null;
      const marks = relevant.map((s) => examResultFor(s, student, "Exam", "tch-001").percentage);
      const average = Math.round(marks.reduce((sum, m) => sum + m, 0) / marks.length);
      return { id: student.id, name: `${student.firstName} ${student.lastName}`, classId: student.classId, average };
    })
    .filter((row): row is { id: string; name: string; classId: string; average: number } => row !== null)
    .sort((a, b) => b.average - a.average)
    .slice(0, limit);

/** Subject-wise result rows for one student in one exam. */
export const resultsForStudent = (
  student: Student,
  schedules: { id: string; classId: string; subjectId: string; maxMarks: number }[],
  subjectName: (id: string) => string,
  letterFor: (percentage: number) => string,
): ExamResult[] =>
  schedules
    .filter((s) => s.classId === student.classId)
    .map((schedule) => {
      const result = examResultFor(schedule, student, "Exam", "tch-001");
      return {
        ...(result as unknown as ExamResult),
        letterGrade: letterFor(result.percentage),
      };
    })
    .map((result) => ({ ...result, subjectId: result.subjectId }))
    .sort((a, b) => subjectName(a.subjectId).localeCompare(subjectName(b.subjectId)));

/* ---------------------------- Finance ---------------------------- */

export const financeStats = (invoices: Invoice[]) => {
  const billed = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const collected = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const outstanding = billed - collected;
  const overdue = invoices.filter((i) => i.status === "overdue");

  return {
    billed,
    collected,
    outstanding,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((sum, invoice) => sum + invoice.balance, 0),
    collectionRate: billed === 0 ? 0 : Number(((collected / billed) * 100).toFixed(1)),
    statusCounts: {
      paid: invoices.filter((i) => i.status === "paid").length,
      partial: invoices.filter((i) => i.status === "partial").length,
      issued: invoices.filter((i) => i.status === "issued").length,
      overdue: overdue.length,
    },
  };
};

export const collectionByMonth = (payments: { paidAt: string; amount: number }[], months = 6, end = daysAgo(0)) => {
  const endDate = new Date(`${end}T00:00:00Z`);
  const buckets = new Map<string, number>();

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - i, 1));
    buckets.set(date.toISOString().slice(0, 7), 0);
  }

  for (const payment of payments) {
    const month = payment.paidAt.slice(0, 7);
    if (buckets.has(month)) buckets.set(month, (buckets.get(month) ?? 0) + payment.amount);
  }

  return [...buckets.entries()].map(([month, amount]) => ({
    month,
    label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
    amount,
  }));
};

/* --------------------------- Directory --------------------------- */

export const birthdaysThisMonth = (students: Student[], month: number, limit = 8) =>
  students
    .filter((s) => s.status === "active" && Number(s.dateOfBirth.slice(5, 7)) === month)
    .sort((a, b) => a.dateOfBirth.slice(8).localeCompare(b.dateOfBirth.slice(8)))
    .slice(0, limit)
    .map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      day: Number(s.dateOfBirth.slice(8, 10)),
      classId: s.classId,
    }));

export const primaryGuardian = (student: Student): Guardian | undefined =>
  student.guardians.find((g) => g.isPrimary) ?? student.guardians[0];

export const subjectTitle = (subject?: Subject) => subject?.name ?? "—";