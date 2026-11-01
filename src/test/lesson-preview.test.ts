import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { extractPreview, headingId, lessonKeyFromPath, parseSections } from "@/lib/lessonPreview";

const CONTENT = path.resolve(__dirname, "../content");
const sources = new Map<string, string>();
for (const course of readdirSync(CONTENT, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(path.join(CONTENT, course.name)).filter((f) => f.endsWith(".mdx"))) {
    const full = path.join(CONTENT, course.name, file);
    sources.set(lessonKeyFromPath(full)!, readFileSync(full, "utf8"));
  }
}
const source = (key: string) => sources.get(key)!;

describe("lesson link previews", () => {
  it("names lesson files the way the routes do", () => {
    expect(lessonKeyFromPath("src/content/computational-mathematics/m1-02-multiplying-and-dividing.mdx")).toBe(
      "computational-mathematics/multiplying-and-dividing",
    );
    expect(lessonKeyFromPath("src/content/the-exam-mind/02-the-one-week-plan.mdx")).toBe("the-exam-mind/the-one-week-plan");
  });

  it("makes heading ids like rehype-slug", () => {
    expect(headingId("Euler's totient function")).toBe("eulers-totient-function");
    expect(headingId("`diag` does two jobs")).toBe("diag-does-two-jobs");
    expect(headingId("The Euler-Fermat theorem")).toBe("the-euler-fermat-theorem");
  });

  it("skips code, JSX and imports, and keeps formulas", () => {
    const s = parseSections("import x from 'y';\n\n# T\n\nHello **there**:\n\n$$\na = b\n$$\n\n```python\n# not a heading\n```\n\n<Foo />\n\n## Next\n\n- one item\n- two");
    expect(s.map((x) => x.id)).toEqual(["", "t", "next"]);
    expect(s[1].blocks).toEqual([{ text: "Hello **there**:" }, { text: "a = b", display: true }]);
    expect(s[2].blocks.map((b) => b.text)).toEqual(["one item", "two"]);
  });

  it("shows the definition and its formula for the dot product", () => {
    const p = extractPreview(source("computational-mathematics/transpose-and-products"), "the-dot-product", "dot product")!;
    expect(p.headword).toBe("dot product");
    expect(p.text).toMatch(/^For two vectors of the same length, the \*\*dot product\*\*/);
    expect(p.text).toContain("$$a \\cdot b");
  });

  it("picks the paragraph that defines the linked word, not the section's first one", () => {
    const p = extractPreview(source("computational-mathematics/divisibility-and-euclid"), "greatest-common-divisor", "coprime")!;
    expect(p.headword).toBe("coprime");
    expect(p.text).toMatch(/^Two numbers are \*\*coprime\*\*/);
  });

  it("uses a lesson's opening when the link has no section", () => {
    const p = extractPreview(source("computational-mathematics/modular-inverses"), undefined, "modular inverses")!;
    expect(p.text).toMatch(/^Modular arithmetic has no fractions/);
  });

  it("returns nothing for a section that doesn't exist", () => {
    expect(extractPreview(source("computational-mathematics/transpose-and-products"), "no-such-section", "x")).toBeNull();
  });

  // every lesson link on the site gets a preview with real text in it
  const links = [...sources.entries()].flatMap(([from, text]) =>
    [...text.matchAll(/\[([^\]]+)\]\((\/courses\/[^)\s]+)\)/g)].map(([, words, href]) => ({ from, words, href })),
  );
  it.each(links.filter((l) => l.href.split("/").length > 3))("$from: [$words]($href)", ({ words, href }) => {
    const [pathname, hash] = href.split("#");
    const [, , course, lesson] = pathname.split("/");
    const p = extractPreview(source(`${course}/${lesson}`), hash, words);
    expect(p, `no preview for ${href}`).not.toBeNull();
    expect(p!.text.replace(/\$[^$]*\$/g, "").trim().length).toBeGreaterThan(30);
  });
});
