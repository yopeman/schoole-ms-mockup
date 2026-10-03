import type { EntityMeta } from "./common";
import type { GradeLevel } from "./student";

export type AdmissionApplicant = EntityMeta & {
  id: string;
  applicationNumber: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string;
  gradeLevel: GradeLevel;
  previousSchool?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  status:
    | "inquiry"
    | "application"
    | "under_review"
    | "interview"
    | "offered"
    | "enrolled"
    | "rejected";
  appliedAt: string;
  interviewDate?: string;
  score?: number;
  documents: { name: string; submitted: boolean }[];
  notes?: string;
};

export type TransportRoute = EntityMeta & {
  id: string;
  name: string;
  vehicleNumber: string;
  driverId: string;
  attendantId?: string;
  stops: { name: string; pickupTime: string }[];
  capacity: number;
  active: boolean;
};

export type Asset = EntityMeta & {
  id: string;
  name: string;
  category: "furniture" | "electronics" | "sports" | "lab" | "vehicle" | "other";
  code: string;
  location: string;
  purchaseDate: string;
  purchaseValue: number;
  condition: "new" | "good" | "needs_repair" | "damaged";
  assignedTo?: string;
};

export type MaintenanceTicket = EntityMeta & {
  id: string;
  assetId?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved";
  reportedById: string;
  assignedToId?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type SchoolProfile = EntityMeta & {
  name: string;
  shortName: string;
  tagline: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  logoUrl?: string;
  principalName: string;
  establishedYear: number;
  registrationNumber: string;
};

export type NoticeBoard = EntityMeta & {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorId: string;
};