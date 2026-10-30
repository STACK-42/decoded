import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/components/ui/theme-provider";

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("ThemeToggle", () => {
  it("switches between themes and remembers the choice", async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Switch to light theme" }));
    expect(await screen.findByRole("button", { name: "Switch to dark theme" })).toBeTruthy();
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
