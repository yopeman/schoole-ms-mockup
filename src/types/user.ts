import type { Address, EntityMeta } from "./common";

export type Role =
  | "admin"
  | "director"
  | "teacher"
  | "student"
  | "family"
  | "staff"
  | "accountant";

export type AppUser = EntityMeta & {
  id: string;
  role: Role;
  email: string;
  password: string;
  isActive: boolean;
  avatarUrl?: string;
  locale: string;
  timezone: string;
  address?: Address;
  /** Link from the user to its domain record (student/staff/teacher). */
  profileId?: string;
  lastLoginAt?: string;
};

export type Session = {
  userId: string;
  role: Role;
  profileId?: string;
  loginAt: string;
  expiresAt: string;
};