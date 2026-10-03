/**
 * In-memory database seeded from static mock data, with a localStorage overlay
 * so user edits survive reloads. This module is the single source of truth
 * that the mock gateway (`server.ts`) reads from.
 *
 * Pattern for every entity: merge seeded records, then user-created records,
 * then apply user updates (unless deleted).
 */
import { seed, type EntityName } from "./seed";

export type StoredEntity = {
  created: Record<string, Record<string, unknown>[]>;
  updated: Record<string, Record<string, Record<string, unknown>>>;
  deleted: Record<string, string[]>;
};

const STORAGE_KEY = "schoole-ms:mock-db:v1";

const emptyOverlay = (): StoredEntity => ({ created: {}, updated: {}, deleted: {} });

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

export const readOverlay = (): StoredEntity => {
  if (!canUseStorage()) return emptyOverlay();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyOverlay();
    const parsed = JSON.parse(raw) as Partial<StoredEntity>;
    return {
      created: parsed.created ?? {},
      updated: parsed.updated ?? {},
      deleted: parsed.deleted ?? {},
    };
  } catch {
    return emptyOverlay();
  }
};

export const writeOverlay = (overlay: StoredEntity) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // Quota exceeded — silently keep the in-memory version.
  }
};

let overlay: StoredEntity = emptyOverlay();
let hydrated = false;

export const hydrate = () => {
  if (!hydrated && canUseStorage()) {
    overlay = readOverlay();
    hydrated = true;
  }
  return overlay;
};

export const getOverlay = () => {
  if (!hydrated) hydrate();
  return overlay;
};

export const resetOverlay = () => {
  overlay = emptyOverlay();
  hydrated = true;
  if (canUseStorage()) window.localStorage.removeItem(STORAGE_KEY);
};

const seeded = (entity: EntityName): Record<string, unknown>[] => {
  const value = seed[entity];
  return Array.isArray(value) ? (value as unknown as Record<string, unknown>[]) : [];
};

export const selectAll = <T extends { id: string }>(entity: EntityName): T[] => {
  const state = getOverlay();
  const removed = new Set(state.deleted[entity] ?? []);
  const merged = new Map<string, Record<string, unknown>>();

  for (const record of seeded(entity)) {
    if (removed.has(record.id as string)) continue;
    const patch = state.updated[entity]?.[record.id as string];
    merged.set(record.id as string, patch ? { ...record, ...patch } : record);
  }

  for (const record of state.created[entity] ?? []) merged.set(record.id as string, record);

  return [...merged.values()] as T[];
};

export const insert = <T extends { id: string }>(entity: EntityName, record: T): T => {
  const state = getOverlay();
  state.created[entity] = [...(state.created[entity] ?? []), record as unknown as Record<string, unknown>];
  writeOverlay(state);
  return record;
};

export const patch = <T extends { id: string }>(entity: EntityName, id: string, changes: Partial<T>): T | null => {
  const state = getOverlay();
  const current = selectAll<T>(entity).find((r) => r.id === id);
  if (!current) return null;

  const next = { ...current, ...changes, updatedAt: new Date().toISOString() } as T;
  const isCustom = (state.created[entity] ?? []).some((r) => r.id === id);

  if (isCustom) {
    state.created[entity] = state.created[entity].map((r) => (r.id === id ? (next as unknown as Record<string, unknown>) : r));
  } else {
    state.updated[entity] = {
      ...state.updated[entity],
      [id]: { ...(state.updated[entity]?.[id] ?? {}), ...(changes as Record<string, unknown>) },
    };
  }

  writeOverlay(state);
  return next;
};

export const remove = (entity: EntityName, id: string) => {
  const state = getOverlay();
  state.created[entity] = (state.created[entity] ?? []).filter((r) => r.id !== id);
  state.deleted[entity] = [...new Set([...(state.deleted[entity] ?? []), id])];
  writeOverlay(state);
};

/** Escape hatch used by server.ts for derived (non-persisted) entities. */
export const derived = <T>(records: T[]) => records;

export const stats = () => {
  const counts = {} as Record<string, number>;
  for (const key of Object.keys(seed) as EntityName[]) {
    const value = seed[key];
    if (Array.isArray(value)) counts[key] = selectAll(key as EntityName).length;
  }
  return counts;
};