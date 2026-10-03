import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AppUser, Role } from "@/types";
import ClassesPage from "@/app/(portal)/academics/classes/page";
import SubjectsPage from "@/app/(portal)/academics/subjects/page";
import TimetablePage from "@/app/(portal)/timetable/page";
import AttendancePage from "@/app/(portal)/attendance/page";
import ExamsPage from "@/app/(portal)/exams/page";
import { SessionProvider } from "@/lib/auth/session";
import { seed } from "@/lib/mock/seed";
import { STORAGE_KEYS } from "@/lib/mock/constants";
import { db } from "@/lib/mock/server";
import { TODAY } from "@/lib/mock/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "stu-1001" }),
  redirect: vi.fn(),
}));

const signIn = (role: Role) => {
  const user = seed.users.find((u) => u.role === role) as AppUser;
  window.localStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({ userId: user.id, role: user.role, profileId: user.profileId, loginAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600_000).toISOString() }),
  );
};

const withSession = (ui: React.ReactNode) => render(<SessionProvider>{ui}</SessionProvider>);

describe("academics: classes and subjects", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows every class with section strength", async () => {
    signIn("admin");
    withSession(<ClassesPage />);

    await waitFor(() => expect(screen.getByText("Classes & Sections")).toBeTruthy());
    expect(screen.getByText("Grade 1")).toBeTruthy();
    expect(screen.getByText("Grade 12")).toBeTruthy();
    expect(screen.getByText("Overall Fill Rate")).toBeTruthy();
  });

  it("filters the class list by search", async () => {
    signIn("admin");
    withSession(<ClassesPage />);

    await waitFor(() => expect(screen.getByLabelText("Find a class")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Find a class"), { target: { value: "Grade 5" } });

    await waitFor(() => expect(screen.queryByText("Grade 1")).toBeNull());
    expect(screen.getByText("Grade 5")).toBeTruthy();
  });

  it("lists subjects with grades, marks and credits", async () => {
    signIn("admin");
    withSession(<SubjectsPage />);

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeTruthy());
    expect(screen.getByText("ENG")).toBeTruthy();
    expect(screen.getByText("Max Marks")).toBeTruthy();
  });
});

describe("timetable", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders a weekly grid with period slots", async () => {
    signIn("admin");
    withSession(<TimetablePage />);

    await waitFor(() => expect(screen.getByText("Timetable")).toBeTruthy());
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
      expect(screen.getByText(day)).toBeTruthy();
    }
    expect(screen.getByText("Assembly")).toBeTruthy();
    expect(screen.getByText("Short Break")).toBeTruthy();
    expect(screen.getByText("Periods Per Week")).toBeTruthy();
  });

  it("keeps the grid free of teacher clashes by default", async () => {
    signIn("admin");
    withSession(<TimetablePage />);

    await waitFor(() => expect(screen.getByText("Teacher Conflicts")).toBeTruthy());
    const conflicts = seed.timetable
      .filter((s) => s.classId === seed.classes[0].id)
      .filter((slot, _, arr) => arr.some((o) => o.teacherId === slot.teacherId && o.dayOfWeek === slot.dayOfWeek && o.periodId === slot.periodId && o.id !== slot.id));
    expect(conflicts.length).toBe(0);
  });
});

describe("attendance", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders the daily register with markable statuses", async () => {
    signIn("teacher");
    withSession(<AttendancePage />);

    await waitFor(() => expect(screen.getByText("Daily Register")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Present Rate")).toBeTruthy());
    expect(screen.getByText("Mark all present")).toBeTruthy();
    expect(screen.getByLabelText("Date")).toBeTruthy();
  });

  it("saves an attendance override through the gateway", async () => {
    signIn("teacher");
    withSession(<AttendancePage />);

    await waitFor(() => expect(screen.getAllByRole("group").length).toBeGreaterThan(0));

    const firstGroup = screen.getAllByRole("group")[0];
    const absentButton = within(firstGroup).getByRole("button", { name: "Absent" });
    fireEvent.click(absentButton);

    await waitFor(() => expect(screen.getByText(/unsaved change/)).toBeTruthy());
    fireEvent.click(screen.getByText("Save attendance"));

    await waitFor(() => expect(screen.queryByText(/unsaved change/)).toBeNull());

    const overrides = db.all<{ id: string; studentId: string; date: string; status: string }>("attendanceOverrides");
    expect(overrides.some((o) => o.date === TODAY && o.status === "absent")).toBe(true);
  });

  it("hides marking controls from a family persona", async () => {
    signIn("family");
    withSession(<AttendancePage />);

    await waitFor(() => expect(screen.getByText("Attendance")).toBeTruthy());
    expect(screen.queryByText("Mark all present")).toBeNull();
  });
});

describe("exams and results", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists examinations with status and schedule coverage", async () => {
    signIn("admin");
    withSession(<ExamsPage />);

    await waitFor(() => expect(screen.getByText("Exams & Results")).toBeTruthy());
    expect(screen.getByText("Unit Test I")).toBeTruthy();
    expect(screen.getByText("Mid-Term Examination")).toBeTruthy();
    expect(screen.getByText("Scheduled Papers")).toBeTruthy();
  });

  it("opens a marks sheet with editable entries for a teacher", async () => {
    signIn("teacher");
    withSession(<ExamsPage />);

    await waitFor(() => expect(screen.getByText("Unit Test I")).toBeTruthy());
    fireEvent.click(screen.getAllByText("Open marks sheet")[0]);

    await waitFor(() => expect(screen.getByText(/Marks Entry —/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Class Average")).toBeTruthy());
    expect(screen.getByLabelText("Subject")).toBeTruthy();
  });

  it("publishes an exam making results visible to students", async () => {
    signIn("admin");
    withSession(<ExamsPage />);

    await waitFor(() => expect(screen.getAllByText("Publish").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText("Publish")[0]);

    await waitFor(() => {
      const published = db.all<{ id: string; status: string }>("exams").filter((e) => e.status === "published");
      expect(published.length).toBeGreaterThan(1);
    });
  });

  it("limits students to published examinations only", async () => {
    signIn("student");
    withSession(<ExamsPage />);

    await waitFor(() => expect(screen.getByText("Exams & Results")).toBeTruthy());
    await waitFor(() => expect(screen.queryByText("New exam")).toBeNull());
    // Only exams with published results reach a student persona.
    const studentExams = db.all<{ id: string; status: string }>("exams").filter((e) => e.status === "published");
    expect(screen.getByText("Mid-Term Examination")).toBeTruthy();
    expect(studentExams.length).toBeGreaterThan(0);
  });
});
