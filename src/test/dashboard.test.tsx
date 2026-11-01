import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courses, flattenLessons } from "@/content/registry";
import { summarize } from "@/lib/dashboard";
import { readQuizScores, writeProgress, writeQuizScores } from "@/lib/progressStore";
import { recordQuizScore, resetProgressSyncForTests, signOut, syncProgress } from "@/lib/progressSync";
import Dashboard from "@/pages/Dashboard";

const course = courses.find((c) => c.status === "available" && flattenLessons(c).length > 2)!;
const [one, two] = flattenLessons(course);
const key = (slug: string) => `${course.slug}/${slug}`;

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
  });
  resetProgressSyncForTests();
});

afterEach(() => vi.unstubAllGlobals());

describe("summarize", () => {
  it("counts lessons, finished courses and active courses, ignoring removed lessons", () => {
    const all = flattenLessons(course).map((l) => l.slug);
    const result = summarize(courses, { [course.slug]: [...all, "removed-lesson"] }, {}, {});
    expect(result.lessonsDone).toBe(all.length);
    expect(result.finishedCourses).toBe(1);
    expect(result.activeCourses).toEqual([course]);
  });

  it("includes a registered course with no progress", () => {
    expect(summarize(courses, {}, { [course.slug]: 1 }, {}).activeCourses).toEqual([course]);
  });

  it("puts the weakest quiz first and marks passes at 80%", () => {
    const { quizzes } = summarize(courses, {}, {}, {
      [key(one.slug)]: { best: 8, total: 10 },
      [key(two.slug)]: { best: 3, total: 10 },
      "removed/quiz": { best: 1, total: 10 },
    });
    expect(quizzes.map((q) => [q.lessonSlug, q.passed])).toEqual([[two.slug, false], [one.slug, true]]);
  });
});

describe("quiz score storage", () => {
  it("keeps the best attempt, comparing by fraction", () => {
    recordQuizScore(course.slug, one.slug, { best: 5, total: 10 });
    recordQuizScore(course.slug, one.slug, { best: 2, total: 10 });
    expect(readQuizScores()[key(one.slug)]).toEqual({ best: 5, total: 10 });
    recordQuizScore(course.slug, one.slug, { best: 4, total: 5 });
    expect(readQuizScores()[key(one.slug)]).toEqual({ best: 4, total: 5 });
  });

  it("merges with the account on load, taking the better of each and sending local wins up", async () => {
    writeQuizScores({ "c/mine": { best: 9, total: 10 }, "c/both": { best: 2, total: 10 } });
    const posts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/quiz-scores")) {
        posts.push(JSON.parse(String(init?.body)));
        return Response.json({});
      }
      return Response.json({
        signedIn: true,
        progress: {},
        enrollments: {},
        quizScores: { "c/theirs": { best: 1, total: 2 }, "c/both": { best: 7, total: 10 } },
      });
    }));
    await syncProgress();
    expect(readQuizScores()).toEqual({
      "c/mine": { best: 9, total: 10 },
      "c/both": { best: 7, total: 10 },
      "c/theirs": { best: 1, total: 2 },
    });
    expect(posts).toEqual([{ course: "c", lesson: "mine", best: 9, total: 10 }]);
  });

  it("is cleared by signing out", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.endsWith("/sign-out") ? new Response(null, { status: 204 }) : Response.json({ signedIn: true, progress: {}, enrollments: {} }),
    ));
    await syncProgress();
    writeQuizScores({ "c/q": { best: 1, total: 2 } });
    await signOut();
    expect(readQuizScores()).toEqual({});
  });
});

describe("Dashboard", () => {
  const show = () =>
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

  it("points new visitors to the courses", () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ signedIn: false })));
    show();
    expect(screen.getByText("Nothing here yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse courses" }).getAttribute("href")).toBe("/courses");
  });

  it("greets a signed-in user and shows courses, stats and scores", async () => {
    writeProgress({ [course.slug]: [one.slug] });
    writeQuizScores({ [key(two.slug)]: { best: 3, total: 10 } });
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.endsWith("/quiz-scores") ? Response.json({}) : Response.json({
        signedIn: true,
        user: { name: "octocat", avatarUrl: null },
        progress: { [course.slug]: [one.slug] },
        enrollments: { [course.slug]: 1 },
      }),
    ));
    show();
    await act(() => syncProgress());
    expect(screen.getByRole("heading", { name: "Hi, octocat" })).toBeTruthy();
    expect(screen.getByText("Lessons done")).toBeTruthy();
    expect(screen.getByText("0/1")).toBeTruthy();
    expect(screen.getByText("3/10")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Your courses" })).toBeTruthy();
  });
});
