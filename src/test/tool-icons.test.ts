import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siGit, siLeetcode, siLinux, siOpenjdk } from "simple-icons";
import { HardDrive, Shield } from "lucide-react";
import { resolveToolIcon } from "@/components/tools/resolveToolIcon";

function mdxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? mdxFiles(path) : path.endsWith(".mdx") ? [path] : [];
  });
}

describe("resolveToolIcon", () => {
  it("finds an icon for every application card in the lessons", () => {
    const missing: string[] = [];
    for (const file of mdxFiles("src/content")) {
      const source = readFileSync(file, "utf8");
      for (const m of source.matchAll(/<PracticalApplication\s+title="([^"]*)"(?:\s+tool="([^"]*)")?/g)) {
        if (!resolveToolIcon(m[2], m[1])) missing.push(`${file}: ${m[2]} | ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("matches whole words, not pieces of other words", () => {
    // "programming" contains "ram", "traversals" contains "rsa", "digit" ends in "git".
    expect(resolveToolIcon("Competitive programming")?.lucideIcon).not.toBe(HardDrive);
    expect(resolveToolIcon("Merge sort, tree traversals")?.lucideIcon).not.toBe(Shield);
    expect(resolveToolIcon("Check digit schemes")?.simpleIcon).not.toBe(siGit);
  });

  it("reads the tool tag before the title", () => {
    expect(resolveToolIcon("JDK", "Linux tuning")?.simpleIcon).toBe(siOpenjdk);
    expect(resolveToolIcon("INTERVIEWS", "Binary search on the answer")?.simpleIcon).toBe(siLeetcode);
    expect(resolveToolIcon(undefined, "Linux tuning")?.simpleIcon).toBe(siLinux);
  });
});
