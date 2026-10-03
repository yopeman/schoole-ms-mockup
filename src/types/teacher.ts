import type { Person } from "./common";
import type { PersonStatus } from "./student";

export type Teacher = Person & {
  employeeCode: string;
  joinDate: string;
  status: PersonStatus;
  designation: string;
  department: string;
  qualifications: string[];
  subjects: string[];
  classIds: string[];
  employmentType: "full_time" | "part_time" | "contract" | "visiting";
  salary: number;
  rating?: number;
};

export type StaffDepartment =
  | "accounts"
  | "admissions"
  | "library"
  | "transport"
  | "maintenance"
  | "security"
  | "administration"
  | "it"
  | "medical";

export type Staff = Person & {
  employeeCode: string;
  joinDate: string;
  status: PersonStatus;
  designation: string;
  department: StaffDepartment;
  employmentType: "full_time" | "part_time" | "contract";
  salary: number;
  reportsTo?: string;
};