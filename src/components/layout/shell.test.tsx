import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AppUser } from "@/types";
import { AppHeader } from "@/components/layout/app-header";
import { UserMenu } from "@/components/layout/user-menu";
import { SessionProvider } from "@/lib/auth/session";
import { seed } from "@/lib/mock/seed";
import { STORAGE_KEYS } from "@/lib/mock/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

const signIn = (email: string) => {
  const user = seed.users.find((u) => u.email === email) as AppUser;
  window.localStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({ userId: user.id, role: user.role, profileId: user.profileId, loginAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600_000).toISOString() }),
  );
};

/**
 * Regression coverage: in the Base UI build of shadcn, `DropdownMenuLabel`
 * renders `Menu.GroupLabel`, which throws "MenuGroupContext is missing"
 * unless it sits inside a `DropdownMenuGroup`. That crash used to blank the
 * whole portal shell.
 */
describe("app shell", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders the header without a Base UI menu context error", async () => {
    signIn("admin@schoole.edu.in");

    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    });

    render(
      <SessionProvider>
        <AppHeader />
      </SessionProvider>,
    );

    const trigger = await screen.findByLabelText("Notifications");
    await waitFor(() => expect(screen.getByLabelText("Notifications")).toBeTruthy());

    // The popup only mounts when opened, and the crash happens inside it.
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByText("Mark all read")).toBeTruthy());

    expect(errors.filter((e) => e.includes("MenuGroupContext"))).toHaveLength(0);
    spy.mockRestore();
  });

  it("renders the user menu with persona switcher and reset", async () => {
    signIn("admin@schoole.edu.in");

    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    });

    render(
      <SessionProvider>
        <UserMenu />
      </SessionProvider>,
    );

    const trigger = await screen.findByText("admin@schoole.edu.in");
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByText("Switch persona (demo)")).toBeTruthy());

    expect(errors.filter((e) => e.includes("MenuGroupContext"))).toHaveLength(0);
    expect(screen.getByText("Reset mock data")).toBeTruthy();
    spy.mockRestore();
  });
});