import { describe, expect, it } from "vitest";
import { seed } from "./index";
import { createRng } from "../prng";
import { attendanceRange, examResultFor, summarize } from "../generators";
import { db } from "../server";
import type { Announcement, Student, Subject } from "@/types";

const ids = (records: { id: string }[]) => new Set(records.map((r) => r.id));

describe("mock seed", () => {
  it("produces unique ids per entity", () => {
    for (const [key, value] of Object.entries(seed)) {
      if (!Array.isArray(value)) continue;
      const list = value as { id: string }[];
      expect(new Set(list.map((r) => r.id)).size, `${key} has duplicate ids`).toBe(list.length);
    }
  });

  it("links every student to an existing class, section and family", () => {
    const classIds = ids(seed.classes);
    const sectionIds = ids(seed.sections);
    const familyIds = ids(seed.families);

    for (const student of seed.students) {
      expect(classIds.has(student.classId), `${student.id} class`).toBe(true);
      expect(sectionIds.has(student.sectionId), `${student.id} section`).toBe(true);
      expect(familyIds.has(student.familyId ?? ""), `${student.id} family`).toBe(true);
      expect(seed.sections.find((s) => s.id === student.sectionId)?.classId).toBe(student.classId);
    }
  });

  it("gives every section a homeroom teacher from the teacher pool", () => {
    const teacherIds = ids(seed.teachers);
    for (const section of seed.sections) {
      expect(teacherIds.has(section.teacherId ?? ""), `${section.id} teacher`).toBe(true);
    }
    for (const cls of seed.classes) {
      expect(teacherIds.has(cls.homeroomTeacherId ?? ""), `${cls.id} homeroom`).toBe(true);
    }
  });

  it("builds a timetable slot for every section, day and teaching period", () => {
    const teachingPeriods = seed.periodSlots.filter((p) => !p.isBreak);
    const sectionCount = seed.sections.length;
    expect(seed.timetable.length).toBe(sectionCount * 5 * teachingPeriods.length);
    expect(new Set(seed.timetable.map((s) => `${s.sectionId}-${s.dayOfWeek}-${s.periodId}`)).size).toBe(seed.timetable.length);
  });

  it("keeps invoice arithmetic consistent", () => {
    for (const invoice of seed.invoices) {
      const itemsTotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
      expect(Math.abs(itemsTotal - invoice.total)).toBeLessThanOrEqual(1);
      expect(invoice.paidAmount + invoice.balance).toBe(invoice.total);
      if (invoice.paidAmount === 0 && invoice.dueDate > new Date().toISOString().slice(0, 10)) {
        expect(invoice.status).toBe("issued");
      }
    }
  });

  it("links invoices and payments to real students", () => {
    const studentIds = ids(seed.students);
    for (const invoice of seed.invoices) expect(studentIds.has(invoice.studentId)).toBe(true);
    for (const payment of seed.payments) expect(studentIds.has(payment.studentId)).toBe(true);
  });

  it("creates login personas for every role", () => {
    const roles = new Set(seed.users.map((u) => u.role));
    for (const role of ["admin", "director", "teacher", "student", "family", "staff", "accountant"]) {
      expect(roles.has(role as never), `missing persona for ${role}`).toBe(true);
    }
  });

  it("is deterministic across rebuilds", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.int(1, 100), a.pick(["x", "y"])]).toEqual([b.int(1, 100), b.pick(["x", "y"])]);
  });
});

describe("derived records", () => {
  it("generates attendance only on weekdays and summarizes it", () => {
    const students = seed.students.slice(0, 12);
    const records = attendanceRange(students, "2026-09-01", "2026-09-30", "stf-001");

    expect(records.length).toBeGreaterThan(0);
    expect(records.every((r) => new Date(`${r.date}T00:00:00Z`).getUTCDay() !== 0)).toBe(true);
    expect(new Set(records.map((r) => `${r.studentId}|${r.date}`)).size).toBe(records.length);

    const summary = summarize(records);
    expect(summary.size).toBe(students.length);
    for (const entry of summary.values()) {
      expect(entry.total).toBe(entry.present + entry.absent + entry.late + entry.onLeave);
    }
  });

  it("produces stable marks within the subject maximum", () => {
    const student = seed.students[0];
    const schedule = seed.examSchedule.find((s) => s.classId === student.classId)!;
    const first = examResultFor(schedule, student, "Unit Test I", "tch-001");
    const second = examResultFor(schedule, student, "Unit Test I", "tch-001");

    expect(first.totalMarks).toBe(second.totalMarks);
    expect(first.totalMarks).toBeLessThanOrEqual(schedule.maxMarks);
    expect(first.totalMarks).toBeGreaterThanOrEqual(0);
  });
});

describe("mock gateway", () => {
  it("paginates, searches and filters", async () => {
    const firstPage = await db.list<Student>("students", { pageSize: 5 });
    expect(firstPage.rows).toHaveLength(5);
    expect(firstPage.total).toBe(seed.students.length);

    const girls = await db.list<Student>("students", { pageSize: 1000, filters: { gender: "female" } });
    expect(girls.rows.every((r) => r.gender === "female")).toBe(true);

    const code = seed.students[0].studentCode;
    const searched = await db.list<Student>("students", { pageSize: 5, search: code, searchFields: ["studentCode"] });
    expect(searched.total).toBeGreaterThan(0);
  });

  it("creates, updates and removes records", async () => {
    const created = await db.create<Announcement>("announcements", {
      title: "Test notice",
      body: "Body",
      audience: "all",
      priority: "normal",
      authorId: "stf-001",
      publishedAt: "2026-10-01T00:00:00.000Z",
      pinned: false,
      readBy: [],
    } as never);

    expect(created.id).toBeTruthy();
    expect((await db.get<Announcement>("announcements", created.id))?.title).toBe("Test notice");

    const updated = await db.update<Announcement>("announcements", created.id, { title: "Updated" });
    expect(updated?.title).toBe("Updated");

    await db.remove("announcements", created.id);
    expect(await db.get("announcements", created.id)).toBeNull();
  });

  it("sorts numerically and alphabetically", async () => {
    const byName = await db.list<Subject>("subjects", { sort: "name" as never });
    expect(byName.rows.map((r) => r.name)).toEqual([...byName.rows.map((r) => r.name)].sort());

    const desc = await db.list<Student>("students", { sort: "rollNumber" as never, sortDir: "desc", pageSize: 1000 });
    const asc = await db.list<Student>("students", { sort: "rollNumber" as never, sortDir: "asc", pageSize: 1000 });
    expect(desc.rows[0].rollNumber.localeCompare(asc.rows[0].rollNumber)).toBeGreaterThanOrEqual(0);
  });
});