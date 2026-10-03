export const MOCK_PASSWORD = "demo1234";
export const STORAGE_KEYS = {
  session: "schoole-ms:session:v1",
  mockDb: "schoole-ms:mock-db:v1",
} as const;

/** Today is fixed so mock data (fees due, events, attendance) stays coherent. */
export const TODAY = "2026-10-03";
export const ACADEMIC_YEAR = "2026-27";

export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export const number = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export const dateLabel = (value?: string) =>
  value
    ? new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    : "—";

export const dayLabel = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });

export const monthLabel = (value: string) =>
  new Date(`${value}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });