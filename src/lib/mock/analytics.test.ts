import { describe, expect, it } from "vitest";
import { seed } from "./seed";
import {
  atRiskStudents,
  attendanceStats,
  birthdaysThisMonth,
  collectionByMonth,
  enrollmentByGrade,
  enrollmentTrend,
  financeStats,
  gradeDistribution,
  lastNWeekdays,
  resultsForStudent,
  studentStats,
  subjectPerformance,
  teacherStats,
  topPerformers,
} from "./analytics";
import { TODAY } from "./constants";

const window30 = lastNWeekdays(TODAY, 30);

describe("analytics", () => {
  it("counts weekday attendance windows only", () => {
    expect(window30.length).toBe(30);
    expect(window30.every((date) => new Date(`${date}T00:00:00Z`).getUTCDay() > 0 && new Date(`${date}T00:00:00Z`).getUTCDay() < 6)).toBe(true);
    // TODAY is pinned to a Saturday, so the window ends on the last weekday.
    expect(window30[window30.length - 1]).toBe(lastNWeekdays(TODAY, 1)[0]);
  });

  it("summarises student and teacher rosters", () => {
    const stats = studentStats(seed.students);
    expect(stats.total).toBe(seed.students.filter((s) => s.status === "active").length);
    expect(stats.male + stats.female).toBe(stats.total);
    expect(stats.genderRatio).toBeGreaterThanOrEqual(0);

    const teachers = teacherStats(seed.teachers);
    expect(teachers.total).toBe(seed.teachers.filter((t) => t.status === "active").length);
    expect(teachers.averageRating).toBeGreaterThan(0);
  });

  it("produces enrollment trend and grade breakdown", () => {
    const trend = enrollmentTrend(seed.students, TODAY, 6);
    expect(trend).toHaveLength(6);
    for (let i = 1; i < trend.length; i += 1) {
      expect(trend[i].total).toBeGreaterThanOrEqual(trend[i - 1].total);
    }

    const byGrade = enrollmentByGrade(seed.students, seed.classes);
    const summed = byGrade.reduce((sum, row) => sum + row.previous + row.current, 0);
    expect(summed).toBe(studentStats(seed.students).total);
  });

  it("computes attendance rate within sane bounds", () => {
    const stats = attendanceStats(seed.students, window30[0], window30[29]);
    expect(stats.total).toBe(seed.students.length * 30);
    expect(stats.present + stats.absent + stats.late + stats.onLeave).toBe(stats.total);
    expect(stats.rate).toBeGreaterThan(60);
    expect(stats.rate).toBeLessThanOrEqual(100);
    expect(stats.dailyRate).toHaveLength(30);
    expect(stats.studentSummary.size).toBe(seed.students.length);
  });

  it("flags at-risk students sorted worst first", () => {
    const risky = atRiskStudents(seed.students, window30[0], window30[29], 10);
    expect(risky.length).toBeGreaterThan(0);
    for (let i = 1; i < risky.length; i += 1) {
      expect(risky[i - 1].attendance).toBeLessThanOrEqual(risky[i].attendance);
    }
    expect(risky[0].attendance).toBeLessThan(85);
  });

  it("grades students against the grade scale", () => {
    const distribution = gradeDistribution(seed.students, seed.examSchedule, seed.gradeScale);
    const total = distribution.reduce((sum, row) => sum + row.count, 0);
    expect(total).toBe(seed.students.length);

    const known = new Set(seed.gradeScale.map((g) => g.letterGrade));
    expect(distribution.every((row) => known.has(row.grade))).toBe(true);
  });

  it("ranks top performers and subject averages", () => {
    const top = topPerformers(seed.students, seed.examSchedule, 8);
    expect(top).toHaveLength(8);
    for (let i = 1; i < top.length; i += 1) expect(top[i - 1].average).toBeGreaterThanOrEqual(top[i].average);

    const subjects = subjectPerformance(seed.students, seed.examSchedule, (id) => id);
    expect(subjects.length).toBeGreaterThan(0);
    expect(subjects.every((row) => row.average >= 0 && row.average <= 100)).toBe(true);
  });

  it("returns per-subject results for a single student", () => {
    const student = seed.students[0];
    const scheduleCount = seed.examSchedule.filter((s) => s.classId === student.classId).length;
    const letterFor = (percentage: number) =>
      seed.gradeScale.find((g) => percentage >= g.minPercentage)?.letterGrade ?? "E";

    const results = resultsForStudent(student, seed.examSchedule, (id) => id, letterFor);
    expect(results).toHaveLength(scheduleCount);
    expect(results.every((r) => r.studentId === student.id)).toBe(true);
  });

  it("reconciles finance totals", () => {
    const finance = financeStats(seed.invoices);
    expect(finance.billed).toBe(seed.invoices.reduce((sum, i) => sum + i.total, 0));
    expect(finance.collected + finance.outstanding).toBe(finance.billed);
    expect(finance.collectionRate).toBeGreaterThan(0);

    const trend = collectionByMonth(seed.payments, 6, TODAY);
    expect(trend).toHaveLength(6);
    const collectedInWindow = trend.reduce((sum, row) => sum + row.amount, 0);
    expect(collectedInWindow).toBeLessThanOrEqual(finance.collected);
  });

  it("lists birthdays for the pinned month", () => {
    const birthdays = birthdaysThisMonth(seed.students, 10, 5);
    expect(birthdays).toHaveLength(5);
    for (const birthday of birthdays) {
      expect(birthday.name).toContain(" ");
    }
  });
});