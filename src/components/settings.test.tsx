import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AcademicYear, AppUser, Role, SchoolProfile } from "@/types";
import SettingsPage from "@/app/(portal)/settings/page";
import { SessionProvider } from "@/lib/auth/session";
import { seed } from "@/lib/mock/seed";
import { STORAGE_KEYS } from "@/lib/mock/constants";
import { db } from "@/lib/mock/server";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/auth/permissions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "x" }),
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

describe("settings", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows every settings tab to an administrator", async () => {
    signIn("admin");
    withSession(<SettingsPage />);

    await waitFor(() => expect(screen.getAllByText("School Profile").length).toBeGreaterThan(0));
    for (const tab of ["Academic Calendar", "Roles & Permissions", "Data & Demo"]) {
      expect(screen.getByText(tab)).toBeTruthy();
    }
  });

  it("edits and persists the school profile", async () => {
    signIn("admin");
    withSession(<SettingsPage />);

    const input = (await screen.findAllByDisplayValue(seed.schoolProfile.name))[0];
    fireEvent.change(input, { target: { value: "Schoole International Academy" } });
    fireEvent.click(screen.getByText("Save changes"));

    // Toasts are not mounted here, and waitFor callbacks must be sync,
    // so poll the gateway directly until the singleton reflects the save.
    let saved: SchoolProfile | null = null;
    for (let attempt = 0; attempt < 20 && saved?.name !== "Schoole International Academy"; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      saved = await db.getSingleton<SchoolProfile>("schoolProfile");
    }
    expect(saved?.name).toBe("Schoole International Academy");
  });

  it("switches the current academic year", async () => {
    signIn("admin");
    withSession(<SettingsPage />);

    fireEvent.click(screen.getByText("Academic Calendar"));
    await waitFor(() => expect(screen.getByText("Set current")).toBeTruthy());
    fireEvent.click(screen.getByText("Set current"));

    await waitFor(
      () => {
        const years = db.all<AcademicYear>("academicYears");
        expect(years.filter((y) => y.isCurrent)).toHaveLength(1);
      },
      { timeout: 5000 },
    );
  });

  it("renders the permission matrix", async () => {
    signIn("admin");
    withSession(<SettingsPage />);

    fireEvent.click(screen.getByText("Roles & Permissions"));
    await waitFor(() => expect(screen.getByText("dashboard.view")).toBeTruthy());
    expect(screen.getByText(/not a security boundary/)).toBeTruthy();
  });

  it("resets mock data on request", async () => {
    signIn("admin");
    withSession(<SettingsPage />);

    fireEvent.click(screen.getByText("Data & Demo"));
    await waitFor(() => expect(screen.getByText("Reset mock data")).toBeTruthy());

    await db.create("announcements", { id: "temp-1", title: "Temp" } as never);
    expect(db.all("announcements").some((a) => (a as { id: string }).id === "temp-1")).toBe(true);

    fireEvent.click(screen.getByText("Reset data"));
    await waitFor(() => {
      expect(db.all("announcements").some((a) => (a as { id: string }).id === "temp-1")).toBe(false);
    });
  });

  it("shows the profile read-only for a director", async () => {
    signIn("director");
    withSession(<SettingsPage />);

    await waitFor(() => expect(screen.getByText(/can view the school profile but not modify/)).toBeTruthy());
    expect(screen.queryByText("Save changes")).toBeNull();
  });

  it("keeps the permission map internally consistent", () => {
    for (const [role, granted] of Object.entries(ROLE_PERMISSIONS)) {
      expect(granted.length, role).toBeGreaterThan(0);
      for (const permission of granted) {
        expect(PERMISSIONS).toContain(permission);
      }
    }
    // Only administrators hold every capability.
    expect(ROLE_PERMISSIONS.admin).toEqual([...PERMISSIONS]);
    expect(ROLE_PERMISSIONS.student).not.toEqual([...PERMISSIONS]);
    expect(ROLE_PERMISSIONS.accountant).toContain("finance.manage");
    expect(ROLE_PERMISSIONS.director).toContain("finance.view");
    expect(ROLE_PERMISSIONS.director).not.toContain("finance.manage");
    expect(ROLE_PERMISSIONS.teacher).not.toContain("finance.manage");
  });
});