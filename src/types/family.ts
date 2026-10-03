import type { Address, EntityMeta } from "./common";

export type Family = EntityMeta & {
  id: string;
  name: string;
  guardians: {
    id: string;
    firstName: string;
    lastName: string;
    relation: "father" | "mother" | "other";
    phone: string;
    email?: string;
    occupation?: string;
    isPrimary: boolean;
  }[];
  studentIds: string[];
  address?: Address;
  monthlyIncomeBand: "low" | "middle" | "upper_middle" | "high";
  discountPercent: number;
  scholarship: boolean;
  portalEnabled: boolean;
};