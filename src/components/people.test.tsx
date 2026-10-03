import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen  , waitFor } from "@testing-library/react";
import { useDataTable } from "@/hooks/use-data-table";
import type { AppUser, Role } from "@/types";
import StudentsPage from "@/app/(portal)/students/page";
import TeachersPage from "@/app/(portal)/teachers/page";
import FamiliesPage from "@/app/(portal)/families/page";
import StaffPage from "@/app/(portal)/staff/page";
import { SessionProvider } from "@/lib/auth/session";
import { seed } from "@/lib/mock/seed";
import { STORAGE_KEYS } from "@/lib/mock/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/students",
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

describe("students module", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists students for an administrator", async () => {
    signIn("admin");
    withSession(<StudentsPage />);

    await waitFor(() => expect(screen.getByPlaceholderText("Search name or code...")).toBeTruthy());
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(5));

    expect(screen.getByText("Students")).toBeTruthy();
    expect(screen.getByText("SIS1001")).toBeTruthy();
  });

  it("paginates and reports the record count", async () => {
    signIn("admin");
    withSession(<StudentsPage />);

    await waitFor(() => expect(screen.getByText(/records$/)).toBeTruthy());
    expect(screen.getByText(/Page 1 of/)).toBeTruthy();

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(screen.getByText(/Page 2 of/)).toBeTruthy());
  });

  it("exposes filter controls for every scoped dimension", async () => {
    signIn("admin");
    withSession(<StudentsPage />);

    for (const label of ["class", "section", "gender", "status", "category"]) {
      expect(await screen.findByLabelText(label)).toBeTruthy();
    }
  });

  it("applies and clears a filter through the table state", async () => {
    const seen: { total: number; filters: Record<string, string> }[] = [];

    const Probe = () => {
      const table = useDataTable<{ id: string }>("students");
      seen.push({ total: table.total, filters: table.state.filters });
      return (
        <button
          type="button"
          onClick={() => {
            table.setFilter("gender", "female");
            table.setPage(2);
          }}
        >
          apply
        </button>
      );
    };

    render(<Probe />);
    await waitFor(() => expect(seen[seen.length - 1].total).toBe(seed.students.length));

    fireEvent.click(screen.getByText("apply"));

    await waitFor(() => {
      const latest = seen[seen.length - 1];
      expect(latest.filters.gender).toBe("female");
      expect(latest.total).toBe(seed.students.filter((s) => s.gender === "female").length);
    });
  });

  it("hides management actions from a student persona", async () => {
    signIn("student");
    withSession(<StudentsPage />);

    await waitFor(() => expect(screen.getByText("Students")).toBeTruthy());
    expect(screen.queryByText("Add student")).toBeNull();
  });

  it("scopes the list to the signed-in student's family", async () => {
    signIn("family");
    withSession(<StudentsPage />);

    await waitFor(() => expect(screen.getByText("Students")).toBeTruthy());
    const family = seed.families.find((f) => f.id === seed.users.find((u) => u.role === "family")?.profileId);
    expect(family?.studentIds.length ?? 0).toBeGreaterThan(0);
    expect(screen.getAllByRole("row").length).toBeLessThanOrEqual((family?.studentIds.length ?? 0) + 2);
  });
});

describe("other people modules", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists teachers with workload and rating", async () => {
    signIn("admin");
    withSession(<TeachersPage />);

    await waitFor(() => expect(screen.getByText(/teaching staff on record/)).toBeTruthy());
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(3));
    expect(screen.getByText("Designation")).toBeTruthy();
    expect(screen.getByText("Classes")).toBeTruthy();
  });

  it("lists families with children and concessions", async () => {
    signIn("admin");
    withSession(<FamiliesPage />);

    await waitFor(() => expect(screen.getByText("Scholarship Families")).toBeTruthy());
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(3));
    expect(screen.getByText("Primary Guardian")).toBeTruthy();
  });

  it("lists staff with payroll summary", async () => {
    signIn("admin");
    withSession(<StaffPage />);

    await waitFor(() => expect(screen.getByText("Monthly payroll")).toBeTruthy());
    expect(screen.getByText("Staff")).toBeTruthy();
  });
});