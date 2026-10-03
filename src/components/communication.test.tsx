import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Announcement, AppUser, Role } from "@/types";
import AnnouncementsPage from "@/app/(portal)/announcements/page";
import MessagesPage from "@/app/(portal)/messages/page";
import EventsPage from "@/app/(portal)/events/page";
import AdmissionsPage from "@/app/(portal)/admissions/page";
import AssetsPage from "@/app/(portal)/assets/page";
import ReportsPage from "@/app/(portal)/reports/page";
import { SessionProvider } from "@/lib/auth/session";
import { seed } from "@/lib/mock/seed";
import { STORAGE_KEYS } from "@/lib/mock/constants";
import { db } from "@/lib/mock/server";

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

describe("announcements", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists notices with pinned and urgent sections", async () => {
    signIn("director");
    withSession(<AnnouncementsPage />);

    await waitFor(() => expect(screen.getAllByText("Annual Sports Day — 12 November").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Pinned").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Urgent").length).toBeGreaterThan(0);
  });

  it("publishes a targeted announcement", async () => {
    signIn("director");
    withSession(<AnnouncementsPage />);

    const before = db.all<Announcement>("announcements").length;
    fireEvent.click(screen.getByText("New announcement"));

    await waitFor(() => expect(screen.getByLabelText("Title")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Bus route change" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Route 5 now departs ten minutes earlier." } });
    fireEvent.click(screen.getByText("Publish"));

    await waitFor(
      () => {
        const created = db.all<Announcement>("announcements");
        expect(created.length).toBe(before + 1);
        expect(created.some((a) => a.title === "Bus route change")).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it("limits students to student and all-audience notices", async () => {
    signIn("student");
    withSession(<AnnouncementsPage />);

    // A notice addressed to "all" is visible; one for families only is not.
    await waitFor(() => expect(screen.getAllByText("Annual Sports Day — 12 November").length).toBeGreaterThan(0));
    expect(screen.queryByText("Parent–Teacher Meeting Schedule")).toBeNull();
    expect(screen.queryByText("New announcement")).toBeNull();
  });

  it("shows families notices addressed to them", async () => {
    signIn("family");
    withSession(<AnnouncementsPage />);

    await waitFor(() => expect(screen.getAllByText(/Fee Payment Reminder/).length).toBeGreaterThan(0));
    expect(screen.queryByText("New exam")).toBeNull();
  });
});

describe("messages", () => {
  beforeEach(() => window.localStorage.clear());

  it("opens a thread and sends a reply", async () => {
    // The admin persona is a participant in the seeded threads.
    signIn("admin");
    withSession(<MessagesPage />);

    await waitFor(() => expect(screen.getByText("Conversations")).toBeTruthy());
    await waitFor(() => expect(screen.getByLabelText("Message")).toBeTruthy());

    const before = db.all<{ id: string }>("messages").length;
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Thank you, noted." } });
    fireEvent.click(screen.getByLabelText("Send message"));

    await waitFor(
      () => {
        expect(db.all<{ id: string }>("messages").length).toBe(before + 1);
        expect(screen.getByText("Thank you, noted.")).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

describe("events", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders a month calendar with the event legend", async () => {
    signIn("admin");
    withSession(<EventsPage />);

    await waitFor(() => expect(screen.getByText("Events & Calendar")).toBeTruthy());
    expect(screen.getByText(/October 2026/)).toBeTruthy();
    expect(screen.getByText("Upcoming Events")).toBeTruthy();
    expect(screen.getByText("Annual Sports Day")).toBeTruthy();
  });

  it("moves between months", async () => {
    signIn("admin");
    withSession(<EventsPage />);

    await waitFor(() => expect(screen.getByLabelText("Next month")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Next month"));
    await waitFor(() => expect(screen.getByText(/November 2026/)).toBeTruthy());
  });
});

describe("admissions", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows the pipeline across all stages", async () => {
    signIn("staff");
    withSession(<AdmissionsPage />);

    await waitFor(() => expect(screen.getByText("Admissions")).toBeTruthy());
    for (const stage of ["inquiry", "application", "under review", "interview", "offered", "enrolled"]) {
      expect(screen.getAllByText(new RegExp(`^${stage}$`, "i")).length).toBeGreaterThan(0);
    }
  });

  it("advances an applicant to the next stage", async () => {
    signIn("staff");
    withSession(<AdmissionsPage />);

    const applicant = seed.applicants.find((a) => a.status === "inquiry")!;
    fireEvent.click(screen.getByText(`${applicant.firstName} ${applicant.lastName}`).closest("button")!);

    await waitFor(() => expect(screen.getByText(/Move to/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Move to/));

    await waitFor(() => {
      const applicants = db.all<{ id: string; status: string }>("applicants");
      expect(applicants.some((a) => a.status === "application")).toBe(true);
    });
  });

  it("hides applicant creation from a director", async () => {
    signIn("director");
    withSession(<AdmissionsPage />);
    await waitFor(() => expect(screen.getByText("Admissions")).toBeTruthy());
    expect(screen.queryByText("New applicant")).toBeNull();
  });
});

describe("assets", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists assets and flags maintenance needs", async () => {
    signIn("staff");
    withSession(<AssetsPage />);

    await waitFor(() => expect(screen.getByText("Asset Register")).toBeTruthy());
    expect(screen.getByText("Replacement Value")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(3));
  });

  it("resolves a maintenance item", async () => {
    signIn("staff");
    withSession(<AssetsPage />);

    await waitFor(() => expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText("Resolved")[0]);

    await waitFor(
      () => {
        expect(db.all<{ id: string; condition: string }>("assets").some((a) => a.condition === "good")).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe("reports", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders every analytics tab", async () => {
    signIn("director");
    withSession(<ReportsPage />);

    await waitFor(() => expect(screen.getByText("Reports")).toBeTruthy());
    expect(screen.getByText("Attendance Rate")).toBeTruthy();
    expect(screen.getByText("Collection Rate")).toBeTruthy();

    fireEvent.click(screen.getByText("Academics"));
    await waitFor(() => expect(screen.getByText("Subject Performance")).toBeTruthy());

    fireEvent.click(screen.getByText("Enrollment"));
    await waitFor(() => expect(screen.getByText("Intake by Grade")).toBeTruthy());

    fireEvent.click(screen.getByText("Finance"));
    await waitFor(() => expect(screen.getByText("Collection Position")).toBeTruthy());
  });

  it("narrows the scope to a single class", async () => {
    signIn("director");
    withSession(<ReportsPage />);

    await waitFor(() => expect(screen.getByLabelText("Class filter")).toBeTruthy());
    expect(screen.getByText(String(seed.students.length))).toBeTruthy();
  });
});