import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CoursePrerequisites } from "@/components/CourseRegistration";
import { LearningPaths } from "@/components/LearningPaths";
import { learningPaths, prerequisites } from "@/content/paths";
import { courses, getCourse, getLesson } from "@/content/registry";
import { tools } from "@/content/tools";

const registry = readFileSync(path.resolve(__dirname, "../content/registry.ts"), "utf8");

/** A lesson's source, found through the registry so slugs that differ from filenames still resolve. */
function lessonSource(course: string, lesson: string) {
  const dir = path.resolve(__dirname, `../content/${course}`);
  const variable = [...registry.matchAll(/slug: "([a-z0-9-]+)"[^{}]*?Component: (\w+)/g)]
    .filter((m) => m[1] === lesson)
    .map((m) => m[2]);
  for (const name of variable) {
    const file = registry.match(new RegExp(`const ${name} = lesson\\(\\(\\) => import\\("@/content/${course}/([^"]+)"`))?.[1];
    if (file) return readFileSync(path.join(dir, file), "utf8");
  }
  throw new Error(`${course}/${lesson} not found in ${readdirSync(dir).length} files`);
}

describe("learning paths", () => {
  it("only use courses that are available", () => {
    for (const p of learningPaths) {
      for (const slug of p.courses) expect(getCourse(slug)?.status, `${p.slug}: ${slug}`).toBe("available");
    }
  });

  it("list prerequisites that exist and are available, with no cycles", () => {
    const visit = (slug: string, seen: string[]): void => {
      expect(seen, `cycle at ${slug}`).not.toContain(slug);
      for (const next of prerequisites[slug] ?? []) {
        expect(getCourse(next)?.status).toBe("available");
        visit(next, [...seen, slug]);
      }
    };
    for (const slug of Object.keys(prerequisites)) {
      expect(getCourse(slug)).toBeTruthy();
      visit(slug, []);
    }
  });

  it("keep each course after its prerequisites", () => {
    for (const p of learningPaths) {
      p.courses.forEach((slug, i) => {
        for (const pre of prerequisites[slug] ?? []) {
          if (p.courses.includes(pre)) expect(p.courses.indexOf(pre), `${p.slug}: ${pre} before ${slug}`).toBeLessThan(i);
        }
      });
    }
  });

  it("render with links to their courses", () => {
    render(
      <MemoryRouter>
        <LearningPaths />
      </MemoryRouter>,
    );
    expect(screen.getByRole("region", { name: "Suggested paths" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Logic Design/ })[0].getAttribute("href")).toBe("/courses/logic-design");
  });
});

describe("course prerequisites", () => {
  it("link to what helps to read first, and show nothing without any", () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <CoursePrerequisites courseSlug="advanced-algorithms" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: courses.find((c) => c.slug === "algorithm-design-and-analysis")!.title })).toBeTruthy();
    rerender(
      <MemoryRouter>
        <CoursePrerequisites courseSlug="logic-design" />
      </MemoryRouter>,
    );
    expect(container.textContent).toBe("");
  });
});

describe("tools", () => {
  for (const tool of tools) {
    for (const link of tool.lessons) {
      it(`${tool.name} → ${link.course}/${link.lesson} exists and mentions "${link.mentions}"`, () => {
        expect(getLesson(link.course, link.lesson)).toBeTruthy();
        expect(lessonSource(link.course, link.lesson).toLowerCase()).toContain(link.mentions.toLowerCase());
      });
    }
  }
});
