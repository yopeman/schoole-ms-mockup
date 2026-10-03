import type { Person } from "./common";
import type { Guardian } from "./guardian";

export type PersonStatus = "active" | "inactive" | "archived";

export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type AdmissionStatus =
  | "inquiry"
  | "application"
  | "under_review"
  | "interview"
  | "offered"
  | "enrolled"
  | "rejected";

export type StudentStatus = "active" | "inactive" | "graduated" | "transferred";

export type Student = Person & {
  studentCode: string;
  admissionDate: string;
  status: StudentStatus;
  admissionStatus: AdmissionStatus;
  classId: string;
  sectionId: string;
  rollNumber: string;
  previousSchool?: string;
  category: "general" | "sc" | "st" | "obc" | "ews";
  familyId?: string;
  guardians: Guardian[];
  medicalNotes?: string;
  discountPercent?: number;
  scholarship?: boolean;
};