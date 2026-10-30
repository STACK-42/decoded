import { renderLesson } from "./renderLesson";
import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { render } from "@testing-library/react";
import { courses, flattenLessons, getCourse, getLesson } from "@/content/registry";

const SLUGS = ["computer-organization", "logic-design", "microprocessors", "computer-architecture"];
const dirOf = (slug: string) => path.resolve(__dirname, "../content", slug);
const sourceOf = (slug: string) => readdirSync(dirOf(slug)).filter((f) => f.endsWith(".mdx")).map((f) => ({ file: f, text: readFileSync(path.join(dirOf(slug), f), "utf8") }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe.each(SLUGS)("%s course", (slug) => {
  const course = getCourse(slug)!;

  it("is available and registers every lesson file", () => {
    expect(course.status).toBe("available");
    expect(sourceOf(slug).length).toBe(flattenLessons(course).length);
  });

  for (const lesson of flattenLessons(course)) {
    it(`renders "${lesson.slug}" with its title`, async () => {
      const { container, unmount } = await renderLesson(lesson);
      expect(container.querySelector("h1")?.textContent).toBe(lesson.title);
      unmount();
    });
  }

  it("links only to lessons that exist", () => {
    for (const { file, text } of sourceOf(slug)) {
      for (const m of text.matchAll(/\/courses\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/g)) {
        const [, c, l] = m;
        if (l) expect(getLesson(c, l), `${file} links to ${m[0]}`).toBeTruthy();
        else expect(courses.some((x) => x.slug === c), `${file} links to ${m[0]}`).toBe(true);
      }
    }
  });

  it("names no source institution or teacher, and drops the history", () => {
    const all = sourceOf(slug).map((s) => s.text).join("\n").toLowerCase();
    for (const banned of ["lecturer", "instructor", "professor", "faculty of", "university of", "department of", "kufa", "al-augby", "rabee", "hasooni", "abacus", "pascaline", "eniac", "vacuum tube"]) {
      expect(all).not.toContain(banned);
    }
  });
});

describe("how the four courses connect", () => {
  it("every course points to at least one other", () => {
    for (const slug of SLUGS) {
      const others = SLUGS.filter((s) => s !== slug);
      const all = sourceOf(slug).map((s) => s.text).join("\n");
      expect(others.some((o) => all.includes(`/courses/${o}/`))).toBe(true);
    }
  });
  it("architecture sends readers back for latches rather than re-teaching them", () => {
    const all = sourceOf("computer-architecture").map((s) => s.text).join("\n");
    expect(all).toContain("/courses/logic-design/sr-latch");
    expect(all).not.toContain("SrLatchNor");
  });
});
