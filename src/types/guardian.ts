import type { Address, Gender } from "./common";

export type GuardianRelation =
  | "father"
  | "mother"
  | "brother"
  | "sister"
  | "grandparent"
  | "uncle"
  | "aunt"
  | "other";

export type Guardian = {
  id: string;
  firstName: string;
  lastName: string;
  relation: GuardianRelation;
  gender: Gender;
  phone: string;
  email?: string;
  occupation?: string;
  annualIncome?: number;
  isPrimary: boolean;
  address?: Address;
};