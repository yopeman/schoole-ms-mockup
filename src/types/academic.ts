import type { EntityMeta } from "./common";
import type { GradeLevel } from "./student";

export type SchoolClass = EntityMeta & {
  id: string;
  name: string;
  gradeLevel: GradeLevel;
  academicYearId: string;
  homeroomTeacherId?: string;
  room?: string;
  capacity: number;
};

export type Section = EntityMeta & {
  id: string;
  classId: string;
  name: string;
  teacherId?: string;
  room?: string;
  capacity: number;
};

export type SubjectCategory =
  | "core"
  | "elective"
  | "languages"
  | "science"
  | "commerce"
  | "arts"
  | "physical_education";

export type Subject = EntityMeta & {
  id: string;
  name: string;
  code: string;
  category: SubjectCategory;
  gradeLevels: GradeLevel[];
  maxMarks: number;
  passMarks: number;
  credits: number;
  teacherIds: string[];
};

export type PeriodSlot = EntityMeta & {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  order: number;
  isBreak: boolean;
};

export type AcademicYear = EntityMeta & {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  termIds: string[];
};

export type Term = EntityMeta & {
  id: string;
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  order: number;
  isCurrent: boolean;
};

export type TimetableSlot = EntityMeta & {
  id: string;
  classId: string;
  sectionId: string;
  periodId: string;
  dayOfWeek: number;
  subjectId: string;
  teacherId: string;
  room?: string;
};