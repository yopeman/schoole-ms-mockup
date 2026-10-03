import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "./page";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { Role } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

const hrefs = () =>
  [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).filter(Boolean) as string[];

describe("landing page", () => {
  it("renders the hero and primary calls to action", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("school operations");
    expect(screen.getAllByText("Get started").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
  });

  it("links Get started to the dashboard", () => {
    render(<LandingPage />);

    const ctas = screen.getAllByText("Get started").map((node) => node.closest("a"));
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta?.getAttribute("href")).toBe("/dashboard");
    }
  });

  it("links Sign in to the persona picker", () => {
    render(<LandingPage />);

    const ctas = screen.getAllByText("Sign in").map((node) => node.closest("a"));
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta?.getAttribute("href")).toBe("/login");
    }
  });

  it("lists every persona and module", () => {
    render(<LandingPage />);

    for (const role of Object.keys(ROLE_LABELS) as Role[]) {
      expect(screen.getAllByText(ROLE_LABELS[role]).length).toBeGreaterThan(0);
    }

    const modules = screen.getByText("19 modules, all connected");
    expect(modules).toBeTruthy();

    const links = hrefs();
    for (const href of ["/students", "/attendance", "/exams", "/finance/fees", "/reports", "/settings"]) {
      expect(links).toContain(href);
    }
  });

  it("has an accessible section structure", () => {
    render(<LandingPage />);

    for (const section of ["features", "roles", "modules"]) {
      expect(document.getElementById(section)).toBeTruthy();
    }
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });
});