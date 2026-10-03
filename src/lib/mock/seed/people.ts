import type { AppUser, Family, Guardian, Role, SchoolProfile, Student } from "@/types";
import type { Rng } from "../prng";
import { ACADEMIC_YEAR, daysAgo, makeAddress, makeEmail } from "./helpers";
import { bloodGroups, occupations, pickNamePair } from "./names";
import { classSeed } from "./academics";

const stamp = { createdAt: "2026-03-01T09:00:00.000Z", updatedAt: "2026-03-01T09:00:00.000Z" };

export const schoolProfile: SchoolProfile = {
  ...stamp,
  name: "Schoole International School",
  shortName: "SIS",
  tagline: "Empowering Minds, Building Futures",
  address: "14 Lake View Road, Bengaluru, Karnataka 560001",
  email: "office@schoole.edu.in",
  phone: "+91 80 4123 8890",
  website: "https://schoole.edu.in",
  principalName: "Dr. Ananya Krishnan",
  establishedYear: 1998,
  registrationNumber: "KRN/EDU/1998/4412",
};

export const LEADERSHIP: { name: { firstName: string; lastName: string }; title: string }[] = [
  { name: { firstName: "Meera", lastName: "Krishnan" }, title: "Principal" },
  { name: { firstName: "Sanjay", lastName: "Iyer" }, title: "Vice Principal" },
  { name: { firstName: "Farah", lastName: "Rahman" }, title: "Academic Coordinator" },
  { name: { firstName: "Nikhil", lastName: "Bose" }, title: "Registrar" },
];

export const SECTORS = [
  { name: "Primary", grades: [1, 2, 3, 4, 5] },
  { name: "Middle", grades: [6, 7, 8] },
  { name: "Secondary", grades: [9, 10] },
  { name: "Senior Secondary", grades: [11, 12] },
];

export const buildStudents = (
  rng: Rng,
  sections: { id: string; classId: string; name: string; capacity: number }[],
): Student[] => {
  const students: Student[] = [];
  let counter = 1001;

  for (const section of sections) {
    const count = rng.int(22, 30);
    for (let i = 1; i <= count; i += 1) {
      const name = pickNamePair(rng);
      const id = `stu-${counter}`;
      const familyId = `fam-${counter}`;
      const guardians: Guardian[] = buildGuardians(rng, name.lastName, familyId);
      const scholarship = rng.bool(0.06);
      const discountPercent = scholarship ? rng.pick([50, 75, 100]) : rng.bool(0.15) ? rng.pick([10, 20]) : 0;
      const grade = Number(section.classId.replace("cls-", ""));

      students.push({
        ...stamp,
        id,
        firstName: name.firstName,
        lastName: name.lastName,
        gender: name.gender,
        email: makeEmail(name.firstName, name.lastName, "student.schoole.edu.in"),
        phone: `9${rng.int(100000000, 999999999)}`,
        dateOfBirth: `${2016 - grade}-${String(rng.int(1, 12)).padStart(2, "0")}-${String(rng.int(1, 28)).padStart(2, "0")}`,
        bloodGroup: rng.pick(bloodGroups),
        address: makeAddress(rng),
        studentCode: `SIS${counter}`,
        admissionDate: grade === 1 ? `20${rng.int(22, 26)}-0${rng.int(4, 6)}-1${rng.int(0, 9)}` : "2026-04-06",
        status: rng.bool(0.97) ? "active" : "inactive",
        admissionStatus: "enrolled",
        classId: section.classId,
        sectionId: section.id,
        rollNumber: String(i).padStart(2, "0"),
        previousSchool: rng.bool(0.6) ? `${rng.pick(["Sunrise", "Green Valley", "Modern", "St. Xavier", "National", "Orchid"])} Public School` : undefined,
        category: rng.pick(["general", "general", "general", "sc", "st", "obc", "ews"]),
        familyId,
        guardians,
        medicalNotes: rng.bool(0.15) ? rng.pick(["Mild peanut allergy", "Asthma — inhaler in nurse room", "Lactose intolerant", "Requires glasses"]) : undefined,
        discountPercent,
        scholarship: scholarship || discountPercent === 100,
      });

      counter += 1;
    }
  }

  return students;
};

const buildGuardians = (rng: Rng, lastName: string, id: string): Guardian[] => {
  const fatherName = pickNamePair(rng);
  fatherName.lastName = lastName;
  const father: Guardian = {
    id: `${id}-g1`,
    firstName: fatherName.firstName,
    lastName: lastName,
    relation: "father",
    gender: "male",
    phone: `9${rng.int(100000000, 999999999)}`,
    email: makeEmail(fatherName.firstName, lastName, "mail.com"),
    occupation: rng.pick(occupations),
    annualIncome: rng.int(4, 40) * 100000,
    isPrimary: true,
    address: makeAddress(rng),
  };

  const guardians: Guardian[] = [father];

  if (rng.bool(0.85)) {
    const motherName = pickNamePair(rng);
    motherName.lastName = lastName;
    guardians.push({
      id: `${id}-g2`,
      firstName: motherName.firstName,
      lastName: lastName,
      relation: "mother",
      gender: "female",
      phone: `9${rng.int(100000000, 999999999)}`,
      email: makeEmail(motherName.firstName, lastName, "mail.com"),
      occupation: rng.pick([...occupations, "Homemaker"]),
      annualIncome: rng.int(2, 20) * 100000,
      isPrimary: false,
    });
  }

  return guardians;
};

export const buildFamilies = (rng: Rng, students: Student[]): Family[] => {
  const byFamily = new Map<string, Student[]>();
  for (const s of students) {
    if (!s.familyId) continue;
    byFamily.set(s.familyId, [...(byFamily.get(s.familyId) ?? []), s]);
  }

  return [...byFamily.entries()].map(([id, children]) => {
    const primary = children[0].guardians.find((g) => g.isPrimary) ?? children[0].guardians[0];
    const scholarship = children.some((c) => c.scholarship);
    const discountPercent = Math.max(...children.map((c) => c.discountPercent ?? 0));
    const income = primary.annualIncome ?? 500000;

    return {
      ...stamp,
      id,
      name: `${primary.lastName} Family`,
      guardians: children.flatMap((c) =>
        c.guardians.map((g: Guardian) => ({
          id: g.id,
          firstName: g.firstName,
          lastName: g.lastName,
          relation: g.relation as "father" | "mother" | "other",
          phone: g.phone,
          email: g.email,
          occupation: g.occupation,
          isPrimary: g.isPrimary,
        })),
      ),
      studentIds: children.map((c) => c.id),
      address: primary.address,
      monthlyIncomeBand: income < 400000 ? "low" : income < 900000 ? "middle" : income < 2000000 ? "upper_middle" : "high",
      discountPercent,
      scholarship,
      portalEnabled: rng.bool(0.8),
    } satisfies Family;
  });
};

/* ------------------------------------------------------------------ */
/* Users (login personas)                                              */
/* ------------------------------------------------------------------ */

export const buildUsers = (
  rng: Rng,
  students: Student[],
  families: Family[],
  teachers: { id: string; email: string; firstName: string; lastName: string }[],
  staff: { id: string; email: string; firstName: string; lastName: string }[],
): AppUser[] => {
  const users: AppUser[] = [];
  const add = (role: Role, email: string, profileId?: string) =>
    users.push({
      ...stamp,
      id: `usr-${users.length + 1}`,
      role,
      email,
      password: "demo1234",
      isActive: true,
      profileId,
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      address: makeAddress(rng),
      lastLoginAt: daysAgo(rng.int(0, 6)) + "T09:15:00.000Z",
    });

  add("admin", "admin@schoole.edu.in");
  add("director", "director@schoole.edu.in");
  add("accountant", "accounts@schoole.edu.in", "stf-001");

  for (const teacher of teachers.slice(0, 6)) {
    add("teacher", teacher.email, teacher.id);
  }

  for (const student of students.slice(0, 6)) {
    add("student", student.email, student.id);
  }

  for (const family of families.slice(0, 5)) {
    const guardian = family.guardians[0];
    add("family", guardian.email ?? `family.${family.id}@mail.com`, family.id);
  }

  for (const member of staff.slice(2, 4)) {
    add("staff", member.email, member.id);
  }

  return users;
};

export const ACADEMIC_YEAR_ID = ACADEMIC_YEAR.id;
export const TOTAL_CLASSES = classSeed.length;