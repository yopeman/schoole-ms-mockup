import type { Rng } from "../prng";
import { cities, departments, designations, streets } from "./names";

export const TODAY = "2026-10-03";
export const ACADEMIC_YEAR = {
  id: "ay-2026-27",
  name: "2026-27",
  startDate: "2026-04-01",
  endDate: "2027-03-31",
};

export const iso = (date: Date) => date.toISOString().slice(0, 10);

export const daysAgo = (n: number, from = TODAY) => {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return iso(d);
};

export const daysFrom = (n: number, from = TODAY) => daysAgo(-n, from);

export const isWeekend = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

/** Last N weekdays (Mon-Fri) ending at TODAY. */
export const recentSchoolDays = (count: number) => {
  const out: string[] = [];
  let offset = 0;
  while (out.length < count) {
    const date = daysAgo(offset);
    if (!isWeekend(date)) out.unshift(date);
    offset += 1;
  }
  return out;
};

export const makeAddress = (rng: Rng) => {
  const place = rng.pick(cities);
  return {
    line1: `${rng.int(1, 240)} ${rng.pick(streets)}`,
    city: place.city,
    state: place.state,
    postalCode: place.postalCode,
    country: "India",
  };
};

export const makeEmail = (first: string, last: string, domain: string) =>
  `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + `@${domain}`;

export const teacherDesignations = designations;

export const teacherDepartments = departments;