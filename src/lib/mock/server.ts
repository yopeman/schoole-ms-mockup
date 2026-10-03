/**
 * Mock data gateway. Mirrors the shape of a REST client (async list/get/create/
 * update/remove with pagination, search, filters, sorting) so page code can be
 * written exactly as it would be against a real backend. Swapping this for
 * `fetch('/api/...')` later is a single-file change.
 */
import { attendanceRange, examResultFor, summarize } from "./generators";
import * as store from "./store";
import { DEFAULT_LIST_LIMIT, TODAY, type EntityName } from "./seed";
import type { AttendanceRecord, AttendanceStatus, ExamResult, Student } from "@/types";

export type SortDir = "asc" | "desc";

export type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  searchFields?: string[];
  sort?: string;
  sortDir?: SortDir;
  filters?: Record<string, unknown>;
  where?: (record: never) => boolean;
};

export type ListResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const LATENCY = [120, 380] as const;

const delay = () => {
  if (typeof window === "undefined") return Promise.resolve();
  const ms = LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0]);
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const uniqueId = (entity: EntityName) => {
  const prefix = entity.replace(/s$/, "").slice(0, 3);
  const existing = store.selectAll(entity).length;
  return `${prefix}-${Date.now().toString(36)}${(existing % 1000).toString().padStart(3, "0")}`;
};

const matches = (record: Record<string, unknown>, key: string, expected: unknown): boolean => {
  if (expected === undefined || expected === null || expected === "") return true;
  const values = Array.isArray(expected) ? expected : [expected];
  const actual = record[key];
  if (actual === undefined) return values.includes(undefined);
  return values.map(String).includes(String(actual));
};

const searchIn = (record: Record<string, unknown>, term: string, fields?: string[]): boolean => {
  const keys = fields?.length ? fields : Object.keys(record);
  return keys.some((key) => {
    const value = record[key];
    if (value === null || value === undefined || typeof value === "object") return false;
    return String(value).toLowerCase().includes(term);
  });
};

export const list = async <T extends { id: string }>(
  entity: EntityName,
  params: ListParams = {},
): Promise<ListResult<T>> => {
  await delay();

  const { page = 1, pageSize = DEFAULT_LIST_LIMIT, search, searchFields, sort, sortDir = "asc", filters = {}, where } = params;
  let rows = store.selectAll<T>(entity) as unknown as Record<string, unknown>[];

  if (where) rows = rows.filter((record) => (where as (r: unknown) => boolean)(record));

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((record) => searchIn(record, term, searchFields));
  }

  for (const [key, expected] of Object.entries(filters)) {
    rows = rows.filter((record) => matches(record, key, expected));
  }

  if (sort) {
    const key = sort as keyof Record<string, unknown>;
    rows = [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize) as unknown as T[],
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
};

export const all = <T extends { id: string }>(entity: EntityName): T[] => store.selectAll<T>(entity);

export const get = async <T extends { id: string }>(entity: EntityName, id: string): Promise<T | null> => {
  await delay();
  return (store.selectAll<T>(entity).find((r) => r.id === id) as T) ?? null;
};

export const create = async <T extends { id: string }>(entity: EntityName, input: Omit<T, "id"> & { id?: string }): Promise<T> => {
  await delay();
  const now = new Date().toISOString();
  const record = {
    ...input,
    id: input.id ?? uniqueId(entity),
    createdAt: (input as { createdAt?: string }).createdAt ?? now,
    updatedAt: now,
  } as unknown as T;
  return store.insert(entity, record);
};

export const update = async <T extends { id: string }>(entity: EntityName, id: string, changes: Partial<T>): Promise<T | null> => {
  await delay();
  return store.patch<T>(entity, id, changes);
};

export const remove = async (entity: EntityName, id: string): Promise<{ id: string }> => {
  await delay();
  store.remove(entity, id);
  return { id };
};

export const getSingleton = async <T extends { id: string }>(entity: EntityName): Promise<T | null> => {
  await delay();
  return store.getSingleton<T>(entity);
};

export const updateSingleton = async <T extends { id: string }>(entity: EntityName, changes: Partial<T>): Promise<T | null> => {
  await delay();
  return store.patchSingleton<T>(entity, changes);
};

export const reset = async () => {
  store.resetOverlay();
  return { ok: true as const };
};

/* ------------------------------------------------------------------ */
/* Derived collections (computed, not persisted)                       */
/* ------------------------------------------------------------------ */

export const attendance = {
  list: async (params: {
    start: string;
    end: string;
    studentIds?: string[];
    classId?: string;
    sectionId?: string;
  }): Promise<AttendanceRecord[]> => {
    await delay();

    let students = store.selectAll<Student>("students");
    if (params.studentIds?.length) students = students.filter((s) => params.studentIds!.includes(s.id));
    if (params.classId) students = students.filter((s) => s.classId === params.classId);
    if (params.sectionId) students = students.filter((s) => s.sectionId === params.sectionId);

    const generated = attendanceRange(students, params.start, params.end, "stf-002");

    // Manual edits win over the deterministic values.
    const overrides = new Map(
      store.selectAll<AttendanceRecord>("attendanceOverrides").map((record) => [`${record.studentId}|${record.date}`, record]),
    );

    return generated.map((record) => overrides.get(`${record.studentId}|${record.date}`) ?? record);
  },

  /** Records or updates one student's status for one date. */
  setStatus: async (
    studentId: string,
    date: string,
    status: AttendanceStatus,
    markedById: string,
    remarks?: string,
  ): Promise<AttendanceRecord> => {
    await delay();
    const student = store.selectAll<Student>("students").find((s) => s.id === studentId);
    if (!student) throw new Error(`Unknown student ${studentId}`);

    const key = `${studentId}|${date}`;
    const existing = store.selectAll<AttendanceRecord>("attendanceOverrides").find((r) => `${r.studentId}|${r.date}` === key);

    const payload = {
      id: existing?.id ?? `att-override-${studentId}-${date}`,
      studentId,
      classId: student.classId,
      sectionId: student.sectionId,
      date,
      status,
      markedById,
      remarks,
    } satisfies Omit<AttendanceRecord, "createdAt" | "updatedAt">;

    const record = existing
      ? store.patch<AttendanceRecord>("attendanceOverrides", existing.id, payload)!
      : store.insert<AttendanceRecord>("attendanceOverrides", payload as AttendanceRecord);

    return record;
  },

  summary: async (params: { start: string; end: string; studentIds?: string[] }) => {
    const records = await attendance.list(params);
    return summarize(records);
  },
};

export const results = {
  list: async (params: { examId: string; classId?: string; studentIds?: string[] }): Promise<(ExamResult & { percentage: number })[]> => {
    await delay();
    const schedules = store.selectAll<{ id: string; examId: string; subjectId: string; classId: string; maxMarks: number }>("examSchedule").filter(
      (s) => s.examId === params.examId && (!params.classId || s.classId === params.classId),
    );
    const exam = store.selectAll<{ id: string; name: string }>("exams").find((e) => e.id === params.examId);
    let students = store.selectAll<Student>("students");
    if (params.studentIds?.length) students = students.filter((s) => params.studentIds!.includes(s.id));
    if (params.classId) students = students.filter((s) => s.classId === params.classId);

    const rows: (ExamResult & { percentage: number })[] = [];
    for (const schedule of schedules) {
      for (const student of students) {
        if (student.classId !== schedule.classId) continue;
        rows.push(examResultFor(schedule, student, exam?.name ?? "Exam", "tch-001") as unknown as ExamResult & { percentage: number });
      }
    }
    return rows;
  },
};

export const now = () => TODAY;

export const db = { list, all, get, create, update, remove, getSingleton, updateSingleton, attendance, results, reset };