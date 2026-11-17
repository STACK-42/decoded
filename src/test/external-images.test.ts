import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getLesson } from "@/content/registry";

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, ext) : ext.test(path) ? [path] : [];
  });
}

/* The hosts index.html's Content-Security-Policy lets images load from. */
const csp = readFileSync("index.html", "utf8").match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)![1];
const imgSrc = csp.match(/img-src ([^;]+)/)![1].split(/\s+/).filter((s) => s.startsWith("https://"));
const allowed = (url: string) => {
  const host = new URL(url).host;
  return imgSrc.some((src) => {
    const h = new URL(src.replace("*.", "wildcard.")).host;
    return src.includes("*.") ? host.endsWith(h.replace(/^wildcard/, "")) : host === h;
  });
};

const quotesSource = readFileSync("src/components/ProfoundQuotes.tsx", "utf8");

describe("external images and the CSP", () => {
  it("allows every image the site loads from another host", () => {
    const urls = [
      ...[...quotesSource.matchAll(/imageUrl:\s*"([^"]+)"/g)].map((m) => m[1]),
      ...files("src/content", /\.(mdx|ts)$/).flatMap((f) =>
        [...readFileSync(f, "utf8").matchAll(/(?:src=|image:\s*)"(https:\/\/[^"]+)"/g)].map((m) => m[1]),
      ),
    ];
    expect(urls.length).toBeGreaterThan(10);
    expect(urls.filter((u) => !allowed(u))).toEqual([]);
  });
});

describe("lesson quotes on the home page", () => {
  it("point at real lessons whose epigraph is the same quote", () => {
    const entries = quotesSource
      .split("\n  {\n")
      .map((block) => block.match(/quote:\s*("(?:[^"\\]|\\.)*"),[\s\S]*lesson: "([^"]+)"/))
      .filter(Boolean);
    expect(entries.length).toBe(13);
    for (const [, quoted, path] of entries) {
      const quote: string = JSON.parse(quoted);
      const [course, slug] = path.split("/");
      expect(getLesson(course, slug), path).toBeTruthy();
      const source = files(`src/content/${course}`, /\.mdx$/).map((f) => readFileSync(f, "utf8")).join("\n");
      expect(source.includes(`<Epigraph quote="${quote}"`), `${path}: ${quote.slice(0, 40)}`).toBe(true);
    }
  });
});
