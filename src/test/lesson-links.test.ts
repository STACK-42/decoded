import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import GithubSlugger from "github-slugger";
import { courses, getLesson } from "@/content/registry";

/* Lessons link to the lesson that teaches a concept instead of re-teaching it
   (see "Linking between lessons" in docs/building-a-course.md). This checks
   every such link on the site points at a real lesson and, when it names a
   #section, at a real heading in it. */

const CONTENT = path.resolve(__dirname, "../content");

// Files are named <order>-<slug>.mdx, e.g. m1-02-multiplying-and-dividing.mdx or 02-the-one-week-plan.mdx
const lessonFiles = new Map<string, string>();
for (const course of readdirSync(CONTENT, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(path.join(CONTENT, course.name)).filter((f) => f.endsWith(".mdx"))) {
    const slug = file.replace(/\.mdx$/, "").replace(/^(m\d+-)?\d+-/, "");
    lessonFiles.set(`${course.name}/${slug}`, path.join(CONTENT, course.name, file));
  }
}

/** Heading ids as rehype-slug makes them: github-slugger over the heading's text. */
function headingIds(file: string) {
  const slugger = new GithubSlugger();
  const prose = readFileSync(file, "utf8").replace(/^```[\s\S]*?^```/gm, "");
  return new Set(
    [...prose.matchAll(/^#{1,6}\s+(.+)$/gm)].map(([, text]) =>
      slugger.slug(text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_]/g, "").trim()),
    ),
  );
}

const links = [...lessonFiles.values()].flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/(?:\]\(|href=["'])(\/courses\/[^)"'\s]+)/g)].map(([, href]) => ({
    from: path.relative(CONTENT, file),
    href,
  }));
});

describe("links between lessons", () => {
  it("finds the links (sanity check on the pattern)", () => {
    expect(links.length).toBeGreaterThan(50);
  });

  it.each(links)("$from → $href", ({ href }) => {
    const [pathname, hash] = href.split("#");
    const [, , courseSlug, lessonSlug] = pathname.split("/");
    if (!lessonSlug) {
      expect(courses.some((c) => c.slug === courseSlug), `no course "${courseSlug}"`).toBe(true);
      return;
    }
    expect(getLesson(courseSlug, lessonSlug), `no lesson ${courseSlug}/${lessonSlug}`).toBeTruthy();
    if (hash) {
      const file = lessonFiles.get(`${courseSlug}/${lessonSlug}`);
      expect(file, `can't find the file for ${courseSlug}/${lessonSlug}`).toBeTruthy();
      expect([...headingIds(file!)], `no heading #${hash} in ${courseSlug}/${lessonSlug}`).toContain(decodeURIComponent(hash));
    }
  });
});
