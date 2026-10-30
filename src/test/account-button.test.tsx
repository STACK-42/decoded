import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountButton } from "@/components/AccountButton";
import { resetProgressSyncForTests, syncProgress } from "@/lib/progressSync";

function stubApi(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
}

async function renderAfterSync(body: unknown) {
  stubApi(body);
  render(
    <MemoryRouter>
      <AccountButton />
    </MemoryRouter>,
  );
  await act(() => syncProgress());
}

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  });
  resetProgressSyncForTests();
});

afterEach(() => vi.unstubAllGlobals());

describe("AccountButton", () => {
  it("offers GitHub and Google sign-in in a dialog to signed-out visitors", async () => {
    await renderAfterSync({ signedIn: false });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy");
  });

  it("shows an account menu to signed-in users, with their initial until the picture loads", async () => {
    await renderAfterSync({ signedIn: true, user: { name: "octocat", avatarUrl: null }, progress: {} });
    expect(screen.getByRole("button", { name: "Account menu" }).textContent).toBe("O");
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
  });

  it("still works for an account with no saved profile", async () => {
    await renderAfterSync({ signedIn: true, progress: {} });
    expect(screen.getByRole("button", { name: "Account menu" }).textContent).toBe("Y");
  });

  it("shows nothing when the API can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    const { container } = render(
      <MemoryRouter>
        <AccountButton />
      </MemoryRouter>,
    );
    await act(() => syncProgress());
    expect(container.textContent).toBe("");
  });
});
