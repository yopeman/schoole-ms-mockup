import type {
  AcademicYear,
  GradeScale,
  PeriodSlot,
  SchoolClass,
  Section,
  Staff,
  Subject,
  Teacher,
  GradeLevel,
  Term,
  TimetableSlot,
} from "@/types";
import type { Rng } from "../prng";
import {
  ACADEMIC_YEAR,
  daysFrom,
  makeAddress,
  makeEmail,
  teacherDepartments,
  teacherDesignations,
} from "./helpers";
import { pickNamePair } from "./names";
import type { ClassSeed } from "./shape";

const stamp = { createdAt: "2026-03-01T09:00:00.000Z", updatedAt: "2026-03-01T09:00:00.000Z" };

export const academicYears: AcademicYear[] = [
  { ...stamp, id: ACADEMIC_YEAR.id, name: ACADEMIC_YEAR.name, startDate: ACADEMIC_YEAR.startDate, endDate: ACADEMIC_YEAR.endDate, isCurrent: true, termIds: ["term-1", "term-2"] },
  { ...stamp, id: "ay-2025-26", name: "2025-26", startDate: "2025-04-01", endDate: "2026-03-31", isCurrent: false, termIds: ["term-3", "term-4"] },
];

export const terms: Term[] = [
  { ...stamp, id: "term-1", academicYearId: ACADEMIC_YEAR.id, name: "Term I", startDate: "2026-04-01", endDate: "2026-09-30", order: 1, isCurrent: false },
  { ...stamp, id: "term-2", academicYearId: ACADEMIC_YEAR.id, name: "Term II", startDate: "2026-10-01", endDate: "2027-01-16", order: 2, isCurrent: true },
  { ...stamp, id: "term-3", academicYearId: "ay-2025-26", name: "Term I", startDate: "2025-04-01", endDate: "2025-09-30", order: 1, isCurrent: false },
  { ...stamp, id: "term-4", academicYearId: "ay-2025-26", name: "Term II", startDate: "2025-10-01", endDate: "2026-01-20", order: 2, isCurrent: false },
];

export const periodSlots: PeriodSlot[] = [
  { ...stamp, id: "p1", name: "Assembly", startTime: "08:00", endTime: "08:40", order: 1, isBreak: false },
  { ...stamp, id: "p2", name: "Period 1", startTime: "08:45", endTime: "09:25", order: 2, isBreak: false },
  { ...stamp, id: "p3", name: "Period 2", startTime: "09:30", endTime: "10:10", order: 3, isBreak: false },
  { ...stamp, id: "p4", name: "Short Break", startTime: "10:10", endTime: "10:30", order: 4, isBreak: true },
  { ...stamp, id: "p5", name: "Period 3", startTime: "10:30", endTime: "11:10", order: 5, isBreak: false },
  { ...stamp, id: "p6", name: "Period 4", startTime: "11:15", endTime: "11:55", order: 6, isBreak: false },
  { ...stamp, id: "p7", name: "Lunch", startTime: "11:55", endTime: "12:35", order: 7, isBreak: true },
  { ...stamp, id: "p8", name: "Period 5", startTime: "12:35", endTime: "13:15", order: 8, isBreak: false },
  { ...stamp, id: "p9", name: "Period 6", startTime: "13:20", endTime: "14:00", order: 9, isBreak: false },
];

export const subjectSeed: Omit<Subject, keyof typeof stamp>[] = [
  { id: "sub-eng", name: "English Language", code: "ENG", category: "languages", gradeLevels: [1,2,3,4,5,6,7,8,9,10,11,12], maxMarks: 100, passMarks: 35, credits: 4, teacherIds: [] },
  { id: "sub-math", name: "Mathematics", code: "MATH", category: "core", gradeLevels: [1,2,3,4,5,6,7,8,9,10,11,12], maxMarks: 100, passMarks: 35, credits: 5, teacherIds: [] },
  { id: "sub-sci", name: "Science", code: "SCI", category: "science", gradeLevels: [1,2,3,4,5,6,7,8,9,10], maxMarks: 100, passMarks: 35, credits: 5, teacherIds: [] },
  { id: "sub-soc", name: "Social Studies", code: "SOC", category: "core", gradeLevels: [1,2,3,4,5,6,7,8,9,10], maxMarks: 100, passMarks: 35, credits: 4, teacherIds: [] },
  { id: "sub-phys", name: "Physics", code: "PHYS", category: "science", gradeLevels: [11,12], maxMarks: 100, passMarks: 35, credits: 5, teacherIds: [] },
  { id: "sub-chem", name: "Chemistry", code: "CHEM", category: "science", gradeLevels: [11,12], maxMarks: 100, passMarks: 35, credits: 5, teacherIds: [] },
  { id: "sub-bio", name: "Biology", code: "BIO", category: "science", gradeLevels: [11,12], maxMarks: 100, passMarks: 35, credits: 5, teacherIds: [] },
  { id: "sub-cs", name: "Computer Science", code: "CS", category: "elective", gradeLevels: [9,10,11,12], maxMarks: 100, passMarks: 35, credits: 4, teacherIds: [] },
  { id: "sub-econ", name: "Economics", code: "ECON", category: "commerce", gradeLevels: [11,12], maxMarks: 100, passMarks: 35, credits: 4, teacherIds: [] },
  { id: "sub-arts", name: "Fine Arts", code: "ART", category: "arts", gradeLevels: [1,2,3,4,5,6,7,8,9,10], maxMarks: 50, passMarks: 18, credits: 2, teacherIds: [] },
  { id: "sub-pe", name: "Physical Education", code: "PE", category: "physical_education", gradeLevels: [1,2,3,4,5,6,7,8,9,10,11,12], maxMarks: 50, passMarks: 18, credits: 2, teacherIds: [] },
];

export const subjects: Subject[] = subjectSeed.map((s) => ({ ...stamp, ...s }));

export const gradeScale: GradeScale[] = [
  { ...stamp, id: "gs-a-plus", academicYearId: ACADEMIC_YEAR.id, name: "Outstanding", minPercentage: 90, maxPercentage: 100, letterGrade: "A+", gradePoint: 10, remark: "Exceptional" },
  { ...stamp, id: "gs-a", academicYearId: ACADEMIC_YEAR.id, name: "Excellent", minPercentage: 80, maxPercentage: 89, letterGrade: "A", gradePoint: 9, remark: "Excellent" },
  { ...stamp, id: "gs-b-plus", academicYearId: ACADEMIC_YEAR.id, name: "Very Good", minPercentage: 70, maxPercentage: 79, letterGrade: "B+", gradePoint: 8, remark: "Very Good" },
  { ...stamp, id: "gs-b", academicYearId: ACADEMIC_YEAR.id, name: "Good", minPercentage: 60, maxPercentage: 69, letterGrade: "B", gradePoint: 7, remark: "Good" },
  { ...stamp, id: "gs-c", academicYearId: ACADEMIC_YEAR.id, name: "Average", minPercentage: 50, maxPercentage: 59, letterGrade: "C", gradePoint: 6, remark: "Average" },
  { ...stamp, id: "gs-d", academicYearId: ACADEMIC_YEAR.id, name: "Below Average", minPercentage: 40, maxPercentage: 49, letterGrade: "D", gradePoint: 5, remark: "Needs Improvement" },
  { ...stamp, id: "gs-e", academicYearId: ACADEMIC_YEAR.id, name: "Unsatisfactory", minPercentage: 0, maxPercentage: 39, letterGrade: "E", gradePoint: 0, remark: "Unsatisfactory" },
];

export const gradePointToLetter = (percentage: number) =>
  [...gradeScale]
    .sort((a, b) => b.minPercentage - a.minPercentage)
    .find((g) => percentage >= g.minPercentage) ?? gradeScale[gradeScale.length - 1];

/* ------------------------------------------------------------------ */
/* Teachers & Staff                                                    */
/* ------------------------------------------------------------------ */

export const buildTeachers = (rng: Rng, classSeed: ClassSeed[]): Teacher[] => {
  const teachers: Teacher[] = [];
  const subjectIds = subjects.map((s) => s.id);

  // One lead teacher per class/subject area guarantees coverage.
  for (const cls of classSeed) {
    const needed = cls.gradeLevel >= 11 ? 4 : 5;
    for (let i = 0; i < needed; i += 1) {
      const name = pickNamePair(rng);
      const index = teachers.length + 1;
      teachers.push({
        ...stamp,
        id: `tch-${String(index).padStart(3, "0")}`,
        firstName: name.firstName,
        lastName: name.lastName,
        gender: name.gender,
        email: makeEmail(name.firstName, name.lastName, "schoole.edu.in"),
        phone: `9${rng.int(100000000, 999999999)}`,
        dateOfBirth: `19${rng.int(75, 96)}-${String(rng.int(1, 12)).padStart(2, "0")}-${String(rng.int(1, 28)).padStart(2, "0")}`,
        address: makeAddress(rng),
        employeeCode: `EMP${String(1000 + index)}`,
        joinDate: `20${rng.int(12, 25)}-${String(rng.int(1, 12)).padStart(2, "0")}-0${rng.int(1, 9)}`,
        status: "active",
        designation: i === 0 ? "Head of Department" : rng.pick(teacherDesignations),
        department: rng.pick(teacherDepartments),
        qualifications: rng.pickMany(["M.Sc., B.Ed.", "M.A., B.Ed.", "M.Ed.", "Ph.D.", "B.Tech, B.Ed.", "M.Com., B.Ed."], rng.int(1, 2)),
        subjects: rng.pickMany(subjectIds, rng.int(1, 2)),
        classIds: [cls.classId],
        employmentType: rng.bool(0.85) ? "full_time" : "part_time",
        salary: rng.int(45, 95) * 1000,
        rating: Number(rng.float(3.4, 5).toFixed(1)),
      });
    }
  }

  return teachers;
};

export const staffSeed = (
  rng: Rng,
  leadership: { name: { firstName: string; lastName: string }; title: string }[],
): Staff[] =>
  leadership.map((person, i) => {
    const address = makeAddress(rng);
    return {
      ...stamp,
      id: `stf-${String(i + 1).padStart(3, "0")}`,
      firstName: person.name.firstName,
      lastName: person.name.lastName,
      gender: rng.bool(0.5) ? "male" : "female",
      email: makeEmail(person.name.firstName, person.name.lastName, "schoole.edu.in"),
      phone: `9${rng.int(100000000, 999999999)}`,
      dateOfBirth: `19${rng.int(70, 92)}-06-${String(rng.int(1, 28)).padStart(2, "0")}`,
      address,
      employeeCode: `EMP${String(900 + i)}`,
      joinDate: `20${rng.int(10, 24)}-0${rng.int(1, 9)}-15`,
      status: "active",
      designation: person.title,
      department: rng.pick(["administration", "accounts", "admissions", "it", "maintenance", "library", "security", "transport", "medical"]),
      employmentType: "full_time",
      salary: rng.int(30, 70) * 1000,
      reportsTo: i === 0 ? undefined : "stf-001",
    } satisfies Staff;
  });

/* ------------------------------------------------------------------ */
/* Classes & Sections                                                  */
/* ------------------------------------------------------------------ */

export const buildClasses = (
  classSeed: ClassSeed[],
  teachers: Teacher[],
): { classes: SchoolClass[]; sections: Section[] } => {
  const classes: SchoolClass[] = [];
  const sections: Section[] = [];

  let teacherCursor = 0;
  const nextTeacher = () => teachers[teacherCursor++ % teachers.length];

  for (const entry of classSeed) {
    const homeroomTeacherId = nextTeacher().id;
    classes.push({
      ...stamp,
      id: entry.classId,
      name: entry.name,
      gradeLevel: entry.gradeLevel,
      academicYearId: ACADEMIC_YEAR.id,
      homeroomTeacherId,
      room: `Room ${entry.gradeLevel}${String.fromCharCode(64 + entry.sectionCount)}`,
      capacity: entry.sectionCount * 32,
    });

    for (let s = 1; s <= entry.sectionCount; s += 1) {
      sections.push({
        ...stamp,
        id: `${entry.classId}-sec-${s}`,
        classId: entry.classId,
        name: `Section ${String.fromCharCode(64 + s)}`,
        teacherId: s === 1 ? homeroomTeacherId : nextTeacher().id,
        room: `${entry.name} - ${String.fromCharCode(64 + s)}`,
        capacity: 32,
      });
    }
  }

  return { classes, sections };
};

export const classSeed: ClassSeed[] = [
  { classId: "cls-1", name: "Grade 1", gradeLevel: 1, sectionCount: 2 },
  { classId: "cls-2", name: "Grade 2", gradeLevel: 2, sectionCount: 2 },
  { classId: "cls-3", name: "Grade 3", gradeLevel: 3, sectionCount: 2 },
  { classId: "cls-4", name: "Grade 4", gradeLevel: 4, sectionCount: 2 },
  { classId: "cls-5", name: "Grade 5", gradeLevel: 5, sectionCount: 2 },
  { classId: "cls-6", name: "Grade 6", gradeLevel: 6, sectionCount: 2 },
  { classId: "cls-7", name: "Grade 7", gradeLevel: 7, sectionCount: 2 },
  { classId: "cls-8", name: "Grade 8", gradeLevel: 8, sectionCount: 2 },
  { classId: "cls-9", name: "Grade 9", gradeLevel: 9, sectionCount: 2 },
  { classId: "cls-10", name: "Grade 10", gradeLevel: 10, sectionCount: 2 },
  { classId: "cls-11", name: "Grade 11", gradeLevel: 11, sectionCount: 2 },
  { classId: "cls-12", name: "Grade 12", gradeLevel: 12, sectionCount: 2 },
];

export const buildTimetable = (rng: Rng, sections: Section[]): TimetableSlot[] => {
  const slots: TimetableSlot[] = [];
  const teaching = periodSlots.filter((p) => !p.isBreak);

  for (const section of sections) {
    const classSubjects = subjects.filter((s) => s.gradeLevels.includes(gradeOfSection(section.classId) as GradeLevel));
    for (let day = 1; day <= 5; day += 1) {
      for (const period of teaching) {
        const subject = rng.pick(classSubjects);
        slots.push({
          ...stamp,
          id: `tt-${section.id}-${day}-${period.id}`,
          classId: section.classId,
          sectionId: section.id,
          periodId: period.id,
          dayOfWeek: day,
          subjectId: subject.id,
          teacherId: section.teacherId ?? "tch-001",
          room: section.room,
        });
      }
    }
  }

  return slots;
};

export const gradeOfSection = (classId: string) => Number(classId.replace("cls-", ""));

export const upcomingDate = (n: number) => daysFrom(n);