import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { courses, flattenLessons } from "@/content/registry";
import { questionsForQuiz, type Question } from "@/lib/questions";
import { parseSections } from "@/lib/lessonPreview";

const banks = import.meta.glob<{ questions: Question[] }>("@/content/*/questions.ts", { eager: true });
const byCourse = Object.fromEntries(Object.entries(banks).map(([file, m]) => [file.split("/").at(-2)!, m.questions]));
const all = Object.values(byCourse).flat();

describe("question bank", () => {
  it("keeps every question that existed when the bank was created", () => {
    expect(all.length).toBeGreaterThanOrEqual(259);
  });

  it("gives every question a unique, well-formed id that names its course", () => {
    const seen = new Set<string>();
    for (const [course, qs] of Object.entries(byCourse)) {
      for (const q of qs) {
        expect(q.id, q.id).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/);
        expect(q.id.split("/")[0], q.id).toBe(course);
        expect(seen.has(q.id), `duplicate ${q.id}`).toBe(false);
        seen.add(q.id);
      }
    }
  });

  it("has exactly one right answer among distinct options, and an explanation", () => {
    for (const q of all) {
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size, q.id).toBe(ids.length);
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
      expect(ids, q.id).toContain(q.correctOptionId);
      expect(q.prompt.trim(), q.id).not.toBe("");
      expect(q.explanation.trim(), q.id).not.toBe("");
      for (const o of q.options) expect(o.text.trim(), q.id).not.toBe("");
    }
  });

  it("only points at quizzes and lessons that exist in its own course", () => {
    for (const [slug, qs] of Object.entries(byCourse)) {
      const course = courses.find((c) => c.slug === slug);
      expect(course, slug).toBeTruthy();
      const lessons = flattenLessons(course!);
      const quizzes = lessons.filter((l) => l.kind === "quiz").map((l) => l.slug);
      for (const q of qs) {
        if (q.quiz) expect(quizzes, q.id).toContain(q.quiz);
        if (q.lesson) expect(lessons.map((l) => l.slug), q.id).toContain(q.lesson);
      }
    }
  });

  it("points every section at a real heading in its lesson", () => {
    const sources = Object.fromEntries(
      Object.keys(import.meta.glob("@/content/*/*.mdx")).map((f) => {
        const file = path.resolve(__dirname, "..", f.replace(/^\/src\//, ""));
        const [course, name] = file.split("/").slice(-2);
        return [`${course}/${name}`, readFileSync(file, "utf8")];
      }),
    );
    for (const [slug, qs] of Object.entries(byCourse)) {
      const course = courses.find((c) => c.slug === slug)!;
      for (const q of qs.filter((x) => x.section)) {
        expect(q.lesson, `${q.id} has a section but no lesson`).toBeTruthy();
        const file = Object.keys(sources).find((k) => k.startsWith(`${slug}/`) && k.endsWith(".mdx") && k.replace(/^.*\/(m\d+-\d+-|\d+-)/, "").replace(/\.mdx$/, "") === q.lesson);
        expect(file, `${q.id}: no file for lesson ${q.lesson}`).toBeTruthy();
        const ids = parseSections(sources[file!]).map((s) => s.id);
        expect(ids, `${q.id}: no heading #${q.section} in ${q.lesson}`).toContain(q.section);
      }
      expect(course).toBeTruthy();
    }
  });

  it("feeds every quiz lesson from the bank, with at least one question", () => {
    for (const course of courses) {
      for (const lesson of flattenLessons(course).filter((l) => l.kind === "quiz")) {
        expect(questionsForQuiz(byCourse[course.slug] ?? [], lesson.slug).length, `${course.slug}/${lesson.slug}`).toBeGreaterThan(0);
      }
    }
  });

  it("leaves no questions written inline in a quiz file", () => {
    const quizFiles = Object.keys(import.meta.glob("@/content/*/*.mdx"))
      .map((f) => path.resolve(__dirname, "..", f.replace(/^\/src\//, "")))
      .map((f) => readFileSync(f, "utf8"))
      .filter((src) => src.includes("<Quiz"));
    expect(quizFiles.length).toBeGreaterThan(0);
    for (const src of quizFiles) {
      const slug = src.match(/lessonSlug="([^"]+)"/)![1];
      expect(src, slug).toContain(`questions={questionsForQuiz(questions, "${slug}")}`);
    }
  });
});
