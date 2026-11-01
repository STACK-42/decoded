import { describe, expect, it } from "vitest";
import { reportMistakeUrl } from "@/lib/reportMistake";

describe("reportMistakeUrl", () => {
  it("opens a new issue naming the lesson, with its title safely encoded", () => {
    const url = new URL(reportMistakeUrl("Logic & Design", "A + B?", "https://decoded.stack42.tech/courses/l/a"));
    expect(url.origin + url.pathname).toBe("https://github.com/STACK-42/decoded/issues/new");
    expect(url.searchParams.get("title")).toBe("Mistake in Logic & Design: A + B?");
    expect(url.searchParams.get("body")).toContain("Lesson: https://decoded.stack42.tech/courses/l/a");
  });
});
