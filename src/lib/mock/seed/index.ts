import { createRng } from "../prng";
import type {
  ActivityLog,
  AdmissionApplicant,
  Announcement,
  AppUser,
  Asset,
  Exam,
  ExamScheduleEntry,
  Expense,
  Family,
  FeeComponent,
  Guardian,
  Invoice,
  Message,
  MessageThread,
  Notification,
  Payment,
  PayrollRecord,
  PeriodSlot,
  SchoolClass,
  SchoolEvent,
  SchoolProfile,
  Scholarship,
  Section,
  Staff,
  Student,
  Subject,
  Teacher,
  TimetableSlot,
} from "@/types";
import {
  buildClasses,
  buildTimetable,
  buildTeachers,
  academicYears,
  classSeed,
  gradeScale,
  periodSlots,
  staffSeed,
  subjects,
  terms,
} from "./academics";
import {
  buildFamilies,
  buildStudents,
  buildUsers,
  schoolProfile,
  LEADERSHIP,
} from "./people";
import {
  buildActivityLogs,
  buildAnnouncements,
  buildApplicants,
  buildAssets,
  buildDocuments,
  buildEvents,
  buildExamSchedule,
  buildExpenses,
  buildInvoices,
  buildPayments,
  buildPayroll,
  buildThreads,
  exams,
  feeComponents,
  scholarships,
} from "./records";
import { firstNames, lastNames } from "./names";

export const SCHOOL_YEAR_ID = "ay-2026-27";
export const CURRENT_TERM_ID = "term-2";
export const TODAY = "2026-10-03";

const rng = createRng(20261003);

const teachers = buildTeachers(rng, classSeed);
const staff = staffSeed(rng, LEADERSHIP);
const { classes, sections } = buildClasses(classSeed, teachers);
const students = buildStudents(rng, sections);
const families = buildFamilies(rng, students);
const timetable = buildTimetable(rng, sections);
const examSchedule = buildExamSchedule(rng, classes, subjects);
const invoices = buildInvoices(rng, students);
const payments = buildPayments(rng, invoices);
const expenses = buildExpenses(rng);
const payroll = buildPayroll(staff);
const announcements = buildAnnouncements(rng, ["stf-001", "stf-002", "stf-003"]);
const events = buildEvents(rng, ["stf-001", "stf-002"]);
const parentIds = families.map((f) => f.guardians[0].id);
const { threads, messages } = buildThreads(rng, parentIds, ["stf-001", "stf-002", "stf-003", "stf-004"]);
const applicants = buildApplicants(rng, firstNames, lastNames);
const assets = buildAssets(rng, [...new Set([...classes.map((c) => c.name), ...sections.map((s) => s.room ?? "")])]);
const documents = buildDocuments(rng, students, teachers);
const activityLogs = buildActivityLogs(
  rng,
  staff.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` })),
);
const users = buildUsers(rng, students, families, teachers, staff);
const notifications = users.flatMap((u) => [
  {
    id: `ntf-${u.id}-1`,
    userId: u.id,
    title: "Welcome back",
    body: "You are signed in to the Schoole MS portal.",
    type: "system" as const,
    link: "/dashboard",
    read: false,
    createdAt: "2026-09-30T06:00:00.000Z",
    updatedAt: "2026-09-30T06:00:00.000Z",
  },
]);

export const seed = {
  schoolProfile,
  academicYears,
  terms,
  periodSlots,
  subjects,
  gradeScale,
  classes,
  sections,
  timetable,
  teachers,
  staff,
  students,
  families,
  exams,
  examSchedule,
  invoices,
  payments,
  expenses,
  payroll,
  feeComponents,
  scholarships,
  announcements,
  events,
  threads,
  messages,
  applicants,
  assets,
  documents,
  activityLogs,
  users,
  notifications,
};

export type Seed = typeof seed;
export type EntityName = keyof Seed;

export type GuardianRecord = Guardian;
export type SeedEntity = {
  [K in EntityName]: Seed[K] extends readonly (infer U)[] ? U : never;
};

export const DEFAULT_LIST_LIMIT = 20;

export type {
  ActivityLog,
  AdmissionApplicant,
  Announcement,
  AppUser,
  Asset,
  Exam,
  ExamScheduleEntry,
  Expense,
  Family,
  FeeComponent,
  Invoice,
  Message,
  MessageThread,
  Notification,
  Payment,
  PayrollRecord,
  PeriodSlot,
  Scholarship,
  SchoolClass,
  SchoolEvent,
  SchoolProfile,
  Section,
  Staff,
  Student,
  Subject,
  Teacher,
  TimetableSlot,
};