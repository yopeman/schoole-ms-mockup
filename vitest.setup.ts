import "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Recharts and Base UI measure elements; jsdom provides neither.
// jsdom implements neither of these; components rely on both.
Element.prototype.scrollIntoView ??= () => {};

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;


afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});
