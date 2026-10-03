"use client";

import { useMemo } from "react";
import type { Role } from "@/types";
import * as store from "@/lib/mock/store";
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
  studentStats,
  subjectPerformance,
  teacherStats,
  topPerformers,
} from "@/lib/mock/analytics";
import { TODAY } from "@/lib/mock/constants";
import { useSession } from "@/lib/auth/session";

const MONTH = 10; // mock dataset is pinned to October 2026

/**
 * Single derived dataset for the dashboard. Scoped by role so a family or
 * teacher never computes school-wide aggregates they cannot see.
 */
export function useDashboardData() {
  const { role, profileId } = useSession();

  return useMemo(() => {
    const students = store.selectAll<{ id: string; classId: string; sectionId: string; status: string }>("students");
    const teachers = store.selectAll<import("@/types").Teacher>("teachers");
    const staff = store.selectAll<{ id: string; salary: number; status: string }>("staff");
    const classes = store.selectAll<{ id: string; name: string; gradeLevel: number }>("classes");
    const sections = store.selectAll<import("@/types").Section>("sections");
    const subjects = store.selectAll<{ id: string; name: string }>("subjects");
    const invoices = store.selectAll<import("@/types").Invoice>("invoices");
    const payments = store.selectAll<import("@/types").Payment>("payments");
    const payroll = store.selectAll<import("@/types").PayrollRecord>("payroll");
    const applicants = store.selectAll<import("@/types").AdmissionApplicant>("applicants");
    const announcements = store.selectAll<import("@/types").Announcement>("announcements");
    const events = store.selectAll<import("@/types").SchoolEvent>("events");
    const activity = store.selectAll<import("@/types").ActivityLog>("activityLogs").slice(0, 8);
    const examSchedule = store.selectAll<{ id: string; examId: string; classId: string; subjectId: string; maxMarks: number }>("examSchedule");
    const gradeScale = store.selectAll<import("@/types").GradeScale>("gradeScale");
    const assets = store.selectAll<{ id: string; condition: string }>("assets");
    const families = store.selectAll<import("@/types").Family>("families");
    const timetable = store.selectAll<import("@/types").TimetableSlot>("timetable");

    const className = (id?: string) => classes.find((c) => c.id === id)?.name ?? "—";
    const subjectName = (id?: string) => subjects.find((s) => s.id === id)?.name ?? "—";

    /* ------------------------- scoping ------------------------- */

    const scopedStudents = (() => {
      switch (role) {
        case "student":
          return students.filter((s) => s.id === profileId);
        case "family": {
          const family = families.find((f) => f.id === profileId);
          return family ? students.filter((s) => family.studentIds.includes(s.id)) : [];
        }
        case "teacher": {
          const mySections = sections.filter((s) => s.teacherId === profileId).map((s) => s.id);
          const myClasses = teachers.find((t) => t.id === profileId)?.classIds ?? [];
          return students.filter((s) => mySections.includes(s.sectionId) || myClasses.includes(s.classId));
        }
        default:
          return students;
      }
    })();

    const attendanceWindow = lastNWeekdays(TODAY, 30);

    /* --------------------- published exam --------------------- */

    const publishedExamId =
      examSchedule.length > 0 ? [...new Set(examSchedule.map((s) => s.examId))].find((id) => id === "exam-unit-1") ?? examSchedule[0].examId : "";

    const scopedSchedule = examSchedule.filter((s) => new Set(scopedStudents.map((student) => student.classId)).has(s.classId));

    /* -------------------------- data -------------------------- */

    const isLeadership = role === "admin" || role === "director";
    const isFinance = role === "accountant";

    return {
      role: role as Role | null,
      scope: {
        isLeadership,
        isFinance,
        isTeacher: role === "teacher",
        isStudent: role === "student",
        isFamily: role === "family",
        isStaff: role === "staff",
      },
      people: {
        students: studentStats(scopedStudents as never),
        teachers: teacherStats(teachers),
        staff: staff.length,
        families: families.length,
      },
      attendance: attendanceStats(scopedStudents as never, attendanceWindow[0], attendanceWindow[attendanceWindow.length - 1]),
      atRisk: atRiskStudents(scopedStudents as never, attendanceWindow[0], attendanceWindow[attendanceWindow.length - 1]),
      enrollment: {
        byGrade: enrollmentByGrade(students as never, classes as never),
        trend: enrollmentTrend(students as never, TODAY, 6),
      },
      results: {
        examId: publishedExamId,
        gradeDistribution: gradeDistribution(scopedStudents as never, scopedSchedule, gradeScale),
        topPerformers: topPerformers(scopedStudents as never, scopedSchedule, 8),
        bySubject: subjectPerformance(scopedStudents as never, scopedSchedule, subjectName),
      },
      finance: {
        ...financeStats(invoices),
        collectionTrend: collectionByMonth(payments, 6, TODAY),
        pendingPayroll: payroll.filter((p) => p.status === "pending").length,
        payrollTotal: payroll.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.netSalary, 0),
      },
      admissions: {
        total: applicants.length,
        byStatus: Object.entries(
          applicants.reduce<Record<string, number>>((acc, applicant) => {
            acc[applicant.status] = (acc[applicant.status] ?? 0) + 1;
            return acc;
          }, {}),
        ).map(([status, count]) => ({ status, count })),
        recent: [...applicants].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)).slice(0, 5),
      },
      operations: {
        assetsNeedingRepair: assets.filter((a) => a.condition === "needs_repair" || a.condition === "damaged").length,
        assetsTotal: assets.length,
        birthdays: birthdaysThisMonth(scopedStudents as never, MONTH, 8),
      },
      content: {
        announcements: [...announcements].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5),
        upcomingEvents: events.filter((e) => e.startDate >= TODAY).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 6),
        activity,
      },
      classes: {
        list: classes.map((c) => ({
          ...c,
          studentCount: students.filter((s) => s.classId === c.id && s.status === "active").length,
          sections: sections.filter((s) => s.classId === c.id).length,
        })),
      },
      todaySlots: role === "teacher"
        ? timetable.filter((slot) => slot.teacherId === profileId && slot.dayOfWeek === new Date(`${TODAY}T00:00:00Z`).getUTCDay()).slice(0, 8)
        : [],
      className,
      subjectName,
    };
  }, [role, profileId]);
}