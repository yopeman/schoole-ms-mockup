import type { EntityMeta } from "./common";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "on_leave"
  | "holiday";

export type AttendanceRecord = EntityMeta & {
  id: string;
  studentId: string;
  classId: string;
  sectionId: string;
  date: string;
  status: AttendanceStatus;
  periodId?: string;
  markedById: string;
  remarks?: string;
};

export type AttendanceSummary = {
  studentId: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  percentage: number;
};

export type ExamType = "unit_test" | "midterm" | "final" | "practical" | "assignment";

export type Exam = EntityMeta & {
  id: string;
  name: string;
  academicYearId: string;
  termId: string;
  type: ExamType;
  startDate: string;
  endDate: string;
  status: "scheduled" | "ongoing" | "completed" | "published";
  classIds: string[];
  subjectIds: string[];
};

export type ExamScheduleEntry = EntityMeta & {
  id: string;
  examId: string;
  subjectId: string;
  classId: string;
  examDate: string;
  startTime: string;
  durationMinutes: number;
  room?: string;
  maxMarks: number;
};

export type ExamResultStatus = "draft" | "submitted" | "published";

export type ExamResult = EntityMeta & {
  id: string;
  examId: string;
  examScheduleId: string;
  studentId: string;
  subjectId: string;
  classId: string;
  theoryMarks: number;
  practicalMarks?: number;
  totalMarks: number;
  gradePoint: number;
  letterGrade: string;
  remarks?: string;
  status: ExamResultStatus;
  enteredById: string;
};

export type GradeScale = EntityMeta & {
  id: string;
  academicYearId: string;
  name: string;
  minPercentage: number;
  maxPercentage: number;
  letterGrade: string;
  gradePoint: number;
  remark: string;
};