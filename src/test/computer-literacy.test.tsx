import { renderLesson } from "./renderLesson";
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { flattenLessons, getCourse } from "@/content/registry";

const SLUG = "computer-literacy";
const dir = path.resolve(__dirname, "../content", SLUG);
const sources = readdirSync(dir)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => ({ file: f, text: readFileSync(path.join(dir, f), "utf8") }));

describe("computer literacy course", () => {
  const course = getCourse(SLUG)!;

  it("is available and registers every lesson file", () => {
    expect(course.status).toBe("available");
    expect(sources.length).toBe(flattenLessons(course).length);
  });

  for (const lesson of flattenLessons(course)) {
    it(`renders "${lesson.slug}" with its title`, async () => {
      const { container, unmount } = await renderLesson(lesson);
      expect(container.querySelector("h1")?.textContent).toBe(lesson.title);
      if (lesson.kind === "quiz") {
        expect(container.querySelectorAll("button").length).toBeGreaterThanOrEqual(60);
      }
      unmount();
    });
  }
});
