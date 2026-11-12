import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// In JSX text and JSX attribute strings, "→" is not an escape: React shows the six
// characters as typed. Components write the character itself (→), which works everywhere.
function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

describe("unicode escapes in components", () => {
  it("uses real characters instead of \\u escapes", () => {
    const offenders = tsxFiles("src/components").flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => /(?<!\\)\\u[0-9a-fA-F]{4}/.test(line))
        .map(({ i }) => `${file}:${i + 1}`),
    );
    expect(offenders).toEqual([]);
  });
});
