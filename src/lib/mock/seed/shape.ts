import type { GradeLevel } from "@/types";

export type ClassSeed = {
  classId: string;
  name: string;
  gradeLevel: GradeLevel;
  sectionCount: number;
};