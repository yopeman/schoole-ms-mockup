import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { AppUser, Role } from "@/types";
import DashboardPage from "@/app/(portal)/dashboard/page";
import { SessionProvider } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { seed } from "@/lib/mock/seed";
import { STORAGE_KEYS } from "@/lib/mock/constants";

const userFor = (role: Role) => seed.users.find((u) => u.role === role) as AppUser;

const signIn = (role: Role) => {
  const user = userFor(role);
  window.localStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({ userId: user.id, role: user.role, profileId: user.profileId, loginAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600_000).toISOString() }),
  );
};

// next/navigation is not available outside the Next runtime.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

const renderDashboard = async (role: Role) => {
  render(
    <SessionProvider>
      <DashboardPage />
    </SessionProvider>,
  );
  // Match the greeting heading exactly; role labels also appear inside cards.
  await waitFor(() => {
    const heading = document.querySelector("h1");
    expect(heading?.textContent ?? "").toContain(ROLE_LABELS[role]);
  });
};

describe("dashboard per role", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const roles: Role[] = ["admin", "director", "teacher", "student", "family", "staff", "accountant"];

  for (const role of roles) {
    it(`renders the ${role} dashboard`, async () => {
      signIn(role);
      await renderDashboard(role);
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(200);
    });
  }

  it("shows school-wide KPIs to an administrator", async () => {
    signIn("admin");
    await renderDashboard("admin");

    expect(screen.getByText("Active Students")).toBeTruthy();
    expect(screen.getByText("Teaching Staff")).toBeTruthy();
    expect(screen.getByText("Attendance Rate")).toBeTruthy();
    expect(screen.getByText("Fee Collected")).toBeTruthy();
  });

  it("shows teacher-specific widgets", async () => {
    signIn("teacher");
    await renderDashboard("teacher");
    expect(screen.getByText("My Students")).toBeTruthy();
    expect(screen.getByText("Mark attendance")).toBeTruthy();
  });

  it("shows fee actions to a family", async () => {
    signIn("family");
    await renderDashboard("family");
    expect(screen.getByText("Fee Outstanding")).toBeTruthy();
    expect(screen.getByText("Pay fees")).toBeTruthy();
  });

  it("shows finance widgets to an accountant", async () => {
    signIn("accountant");
    await renderDashboard("accountant");
    expect(screen.getByText("Total Billed")).toBeTruthy();
    expect(screen.getByText("Run payroll")).toBeTruthy();
  });

  it("scopes a family dashboard to its children only", async () => {
    signIn("family");
    await renderDashboard("family");

    // The family persona's children, not the whole school roll.
    const enrolled = Number(screen.getByText("Children Enrolled").parentElement?.querySelector("p:nth-child(2)")?.textContent);
    expect(enrolled).toBeGreaterThan(0);
    expect(enrolled).toBeLessThan(seed.students.length);
  });
});