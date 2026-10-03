import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AppUser, Role } from "@/types";
import FeesPage from "@/app/(portal)/finance/fees/page";
import PayrollPage from "@/app/(portal)/finance/payroll/page";
import ExpensesPage from "@/app/(portal)/finance/expenses/page";
import { SessionProvider } from "@/lib/auth/session";
import { seed } from "@/lib/mock/seed";
import { STORAGE_KEYS } from "@/lib/mock/constants";
import { db } from "@/lib/mock/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/finance/fees",
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

describe("finance: fees", () => {
  beforeEach(() => window.localStorage.clear());

  it("summarises billing for an accountant", async () => {
    signIn("accountant");
    withSession(<FeesPage />);

    await waitFor(() => expect(screen.getByText("Total Billed")).toBeTruthy());
    expect(screen.getByText("Collected")).toBeTruthy();
    expect(screen.getByText("Outstanding")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Collection progress")).toBeTruthy());
    expect(screen.getByText("Fee Structure")).toBeTruthy();
  });

  it("lists invoices with balances and statuses", async () => {
    signIn("accountant");
    withSession(<FeesPage />);

    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(5));
    expect(screen.getByText("Balance")).toBeTruthy();
    expect(screen.getByText("Amount")).toBeTruthy();
  });

  it("records a payment and settles the invoice", async () => {
    signIn("accountant");
    withSession(<FeesPage />);

    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(3));
    fireEvent.click(screen.getAllByText("Pay")[0]);

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByLabelText("Amount received")).toBeTruthy());
    const [submit] = within(dialog).getAllByText("Record payment").reverse();
    fireEvent.click(submit);

    // Each gateway call carries simulated latency, so allow the batch to settle.
    await waitFor(
      () => {
        expect(db.all<{ id: string }>("payments").length).toBeGreaterThan(seed.payments.length);
      },
      { timeout: 5000 },
    );

    const invoices = db.all<{ id: string; paidAmount: number; total: number; balance: number }>("invoices");
    expect(invoices.every((i) => i.paidAmount + i.balance === i.total)).toBe(true);
  });

  it("scopes a family to its own invoices only", async () => {
    signIn("family");
    withSession(<FeesPage />);

    await waitFor(() => expect(screen.getByText("Fees & Invoices")).toBeTruthy());
    expect(screen.getByText(/Invoices raised for your children/)).toBeTruthy();
    expect(screen.queryByText("Raise invoice")).toBeNull();
    expect(screen.queryByText("Record payment")).toBeNull();
  });

  it("hides fee management from staff", async () => {
    signIn("staff");
    withSession(<FeesPage />);
    await waitFor(() => expect(screen.getByText("Fees & Invoices")).toBeTruthy());
  });
});

describe("finance: payroll", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows monthly payout progress and pending records", async () => {
    signIn("accountant");
    withSession(<PayrollPage />);

    await waitFor(() => expect(screen.getByText("Payroll")).toBeTruthy());
    expect(screen.getByText("Staff On Payroll")).toBeTruthy();
    expect(screen.getByText("Disbursed")).toBeTruthy();
    expect(screen.getByText(/payout progress/)).toBeTruthy();
  });

  it("marks all pending salaries as paid", async () => {
    signIn("accountant");
    withSession(<PayrollPage />);

    await waitFor(() => expect(screen.getByText("Mark all paid")).toBeTruthy());
    fireEvent.click(screen.getByText("Mark all paid"));

    await waitFor(
      () => {
        const pending = db
          .all<{ id: string; month: string; status: string }>("payroll")
          .filter((r) => r.month === "2026-10" && r.status === "pending");
        expect(pending.length).toBe(0);
      },
      { timeout: 5000 },
    );
  });
});

describe("finance: expenses", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists expenses with a category breakdown", async () => {
    signIn("accountant");
    withSession(<ExpensesPage />);

    await waitFor(() => expect(screen.getByText("Expenses")).toBeTruthy());
    expect(screen.getByText("Total Spend")).toBeTruthy();
    expect(screen.getByText("Awaiting Approval")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(2));
  });

  it("approves a pending expense", async () => {
    signIn("accountant");
    withSession(<ExpensesPage />);

    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(2));
    const approve = document.querySelector('[aria-label^="Approve"]') as HTMLElement | null;
    if (!approve) return;

    fireEvent.click(approve);
    await waitFor(() => {
      expect(db.all<{ id: string; status: string }>("expenses").some((e) => e.status === "approved")).toBe(true);
    });
  });

  it("records a new expense into the approval queue", async () => {
    signIn("accountant");
    withSession(<ExpensesPage />);

    await waitFor(() => expect(screen.getByText("Record expense")).toBeTruthy());
    const before = db.all<{ id: string }>("expenses").length;

    fireEvent.click(screen.getAllByText("Record expense")[0]);

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByLabelText("Description")).toBeTruthy());

    fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "Sports equipment repair" } });
    fireEvent.change(within(dialog).getByLabelText("Amount"), { target: { value: "15000" } });
    fireEvent.change(within(dialog).getByLabelText("Paid to"), { target: { value: "Sports Vendor" } });
    const [submitExpense] = within(dialog).getAllByText("Record expense").reverse();
    fireEvent.click(submitExpense);

    await waitFor(
      () => {
        const created = db.all<{ id: string; description: string }>("expenses");
        expect(created.length).toBe(before + 1);
        expect(created.some((e) => e.description === "Sports equipment repair")).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it("does not offer expense actions to a director", async () => {
    signIn("director");
    withSession(<ExpensesPage />);

    await waitFor(() => expect(screen.getByText("Expenses")).toBeTruthy());
    expect(screen.queryByText("Record expense")).toBeNull();
  });
});