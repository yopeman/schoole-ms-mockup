import type {
  Announcement,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  Student,
} from "@/types";
import { createRng } from "./prng";
import { isWeekend } from "./seed/helpers";

/**
 * Attendance is derived deterministically from (studentId, date) instead of
 * being stored, so it stays cheap to generate for any range while remaining
 * stable across reloads.
 */
const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const statusFor = (student: Student, date: string): AttendanceStatus => {
  const h = hash(`${student.id}|${date}`);
  const roll = h % 1000 / 1000;

  // Chronic absentees stay absent more often, which gives realistic variance.
  const chronic = student.status === "inactive" ? 0.35 : 0.04;
  if (roll < chronic) return "absent";
  if (roll < chronic + 0.07) return "late";
  if (roll < chronic + 0.1) return "on_leave";
  return "present";
};

export const attendanceOn = (student: Student, date: string, markedById: string): AttendanceRecord => ({
  id: `att-${student.id}-${date}`,
  studentId: student.id,
  classId: student.classId,
  sectionId: student.sectionId,
  date,
  status: statusFor(student, date),
  markedById,
  createdAt: `${date}T09:00:00.000Z`,
  updatedAt: `${date}T09:00:00.000Z`,
});

export const attendanceRange = (students: Student[], start: string, end: string, markedById: string) => {
  const records: AttendanceRecord[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  while (cursor <= stop) {
    const date = cursor.toISOString().slice(0, 10);
    if (!isWeekend(date)) {
      for (const student of students) records.push(attendanceOn(student, date, markedById));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return records;
};

export const summarize = (records: AttendanceRecord[]): Map<string, AttendanceSummary> => {
  const map = new Map<string, AttendanceSummary>();
  for (const record of records) {
    const current =
      map.get(record.studentId) ??
      ({
        studentId: record.studentId,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        percentage: 0,
      } satisfies AttendanceSummary);

    current.total += 1;
    if (record.status === "present") current.present += 1;
    if (record.status === "absent") current.absent += 1;
    if (record.status === "late") current.late += 1;
    if (record.status === "on_leave") current.onLeave += 1;
    map.set(record.studentId, current);
  }
  for (const summary of map.values()) {
    summary.percentage = summary.total === 0 ? 0 : Number(((summary.present / summary.total) * 100).toFixed(1));
  }
  return map;
};

/** Simulated per-student academic ability, stable for a whole academic year. */
export const studentAbility = (studentId: string) => {
  const rng = createRng(hash(studentId) + 7);
  return rng.gaussian(72, 14);
};

export const randomAnnouncementPin = (index: number): Pick<Announcement, "pinned"> => ({ pinned: index === 0 });
export const examResultFor = (
  examSchedule: { id: string; maxMarks: number; classId?: string; examId?: string; subjectId?: string },
  student: Student,
  examName: string,
  enteredById: string,
) => {
  const ability = studentAbility(student.id);
  const rng = createRng(hash(`${student.id}|${examSchedule.id}`) + 3);
  const theoryMarks = Math.max(
    0,
    Math.min(examSchedule.maxMarks, Math.round((examSchedule.maxMarks * ability) / 100 + rng.int(-6, 6))),
  );
  const totalMarks = theoryMarks;
  const percentage = Math.round((totalMarks / examSchedule.maxMarks) * 100);

  return {
    id: `res-${examSchedule.id}-${student.id}`,
    examId: examSchedule.examId ?? "exam",
    examScheduleId: examSchedule.id,
    studentId: student.id,
    subjectId: examSchedule.subjectId ?? "sub-eng",
    classId: examSchedule.classId ?? student.classId,
    theoryMarks,
    totalMarks,
    gradePoint: 0,
    letterGrade: "",
    status: "published" as const,
    enteredById,
    examName,
    percentage,
  };
};
