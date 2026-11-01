import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CourseRegistration } from "@/components/CourseRegistration";
import { courses, flattenLessons } from "@/content/registry";
import { readProgress, writeProgress } from "@/lib/progressStore";
import { resetProgressSyncForTests, syncProgress } from "@/lib/progressSync";

const course = courses.find((c) => c.status === "available" && flattenLessons(c).length > 1)!;
const first = flattenLessons(course)[0];

function stubApi(body: unknown, enrolledAt = 1_800_000_000_000) {
  const stub = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/enrollments/remove")) return Response.json({ enrollments: {} });
    if (url.endsWith("/enrollments")) return Response.json({ enrollments: { [course.slug]: enrolledAt } });
    if (init?.method === "POST") return Response.json({ progress: (body as { progress?: unknown }).progress ?? {} });
    return Response.json(body);
  });
  vi.stubGlobal("fetch", stub);
  return stub;
}

async function show() {
  render(
    <MemoryRouter>
      <CourseRegistration course={course} />
    </MemoryRouter>,
  );
  await act(() => syncProgress());
}

const registerButton = () => screen.queryByRole("button", { name: "Register for this course" });

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  });
  resetProgressSyncForTests();
  window.history.replaceState(null, "", "/");
});

afterEach(() => vi.unstubAllGlobals());

describe("CourseRegistration", () => {
  it("asks signed-out visitors to sign in, and hides progress", async () => {
    stubApi({ signedIn: false });
    await show();
    expect(screen.queryByText("Your progress")).toBeNull();
    fireEvent.click(registerButton()!);
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeTruthy();
  });

  it("registers a signed-in user and then shows progress and details", async () => {
    const api = stubApi({ signedIn: true, progress: {}, enrollments: {} });
    await show();
    expect(screen.queryByText("Your progress")).toBeNull();
    fireEvent.click(registerButton()!);
    await screen.findByText("Your progress");
    expect(api.mock.calls.some(([url]) => String(url).endsWith("/enrollments"))).toBe(true);
    expect(screen.getByText("Registered")).toBeTruthy();
    expect(screen.getByText("Lessons left")).toBeTruthy();
    expect(screen.getByText(`${first.title} →`)).toBeTruthy();
    expect(registerButton()).toBeNull();
  });

  it("finishes registering after coming back from sign-in", async () => {
    window.history.replaceState(null, "", `/courses/${course.slug}?register=1`);
    stubApi({ signedIn: true, progress: {}, enrollments: {} });
    await show();
    await screen.findByText("Your progress");
    expect(window.location.search).toBe("");
  });

  it("counts existing progress as registered, even signed out", async () => {
    writeProgress({ [course.slug]: [first.slug] });
    stubApi({ signedIn: false });
    await show();
    expect(screen.getByText("Your progress")).toBeTruthy();
    expect(registerButton()).toBeNull();
  });

  it("falls back to device progress when the API can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    await show();
    await waitFor(() => expect(screen.getByText("Your progress")).toBeTruthy());
  });

  it("stays unregistered when registering fails", async () => {
    stubApi({ signedIn: true, progress: {}, enrollments: {} });
    await show();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    fireEvent.click(registerButton()!);
    await waitFor(() => expect(registerButton()).toBeTruthy());
    expect(screen.queryByText("Your progress")).toBeNull();
  });

  it("leaving clears the course's progress and goes back to the prompt", async () => {
    writeProgress({ [course.slug]: [first.slug], other: ["kept"] });
    stubApi({ signedIn: true, progress: { [course.slug]: [first.slug], other: ["kept"] }, enrollments: { [course.slug]: 1_800_000_000_000 } });
    await show();
    fireEvent.click(screen.getByRole("button", { name: "Leave course" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Leave course" }).at(-1)!);
    await waitFor(() => expect(registerButton()).toBeTruthy());
    expect(readProgress()).toEqual({ other: ["kept"] });
  });
});
