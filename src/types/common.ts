export type Gender = "male" | "female" | "other";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export type Address = {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type EntityMeta = {
  createdAt: string;
  updatedAt: string;
};

export type Person = EntityMeta & {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  bloodGroup?: BloodGroup;
  address?: Address;
  photoUrl?: string;
};

export const fullName = (p: { firstName: string; lastName: string }) =>
  `${p.firstName} ${p.lastName}`.trim();

export const initials = (p: { firstName: string; lastName: string }) =>
  `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();