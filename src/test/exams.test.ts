import { beforeEach, describe, expect, it } from "vitest";
import { courses, getCourse, flattenLessons } from "@/content/registry";
import type { Question } from "@/lib/questions";
import { allocate, buildExam, EXAM_SIZE, moduleOf, readAttempts, recordAttempt, scoreExam, seededRandom, shuffle } from "@/lib/exams";

const banks = import.meta.glob<{ questions: Question[] }>("@/content/*/questions.ts", { eager: true });
const byCourse = Object.fromEntries(Object.entries(banks).map(([file, m]) => [file.split("/").at(-2)!, m.questions]));

describe("allocate", () => {
  it("adds up to the exam size, never takes more than a module has, and gives every module at least one", () => {
    const cases: [number[], number[], number][] = [
      [[3, 3, 3], [6, 6, 6], 20],
      [[5, 1, 1], [10, 10, 10], 20],
      [[4, 4, 5, 3], [6, 7, 8, 7], 20],
      [[10, 1], [2, 30], 20],
      [[1, 1, 1], [1, 1, 1], 20],
      [[2, 9, 4, 4, 6, 1], [7, 7, 7, 7, 7, 7], 20],
      [[3, 0, 2], [5, 0, 5], 20],
    ];
    for (const [weights, available, size] of cases) {
      const counts = allocate(weights, available, size);
      const total = Math.min(size, available.reduce((s, x) => s + x, 0));
      expect(counts.reduce((s, x) => s + x, 0), JSON.stringify([weights, available])).toBe(total);
      counts.forEach((c, i) => {
        expect(c).toBeLessThanOrEqual(available[i]);
        if (available[i] > 0) expect(c).toBeGreaterThanOrEqual(1);
        else expect(c).toBe(0);
      });
    }
  });

  it("gives bigger modules more questions when there are enough", () => {
    const [big, small] = allocate([9, 1], [20, 20], 20);
    expect(big).toBeGreaterThan(small);
    expect(big + small).toBe(20);
  });

  it("covers the biggest modules first when there are more modules than questions", () => {
    expect(allocate([1, 5, 3], [1, 1, 1], 2)).toEqual([0, 1, 1]);
  });
});

describe("buildExam on every real question bank", () => {
  for (const [slug, bank] of Object.entries(byCourse)) {
    const course = getCourse(slug)!;

    it(`${slug}: places every question in a module`, () => {
      for (const q of bank) expect(moduleOf(course, q), q.id).toBeGreaterThanOrEqual(0);
    });

    it(`${slug}: draws a full, mixed exam without repeats`, () => {
      const exam = buildExam(course, bank, 42);
      expect(exam.length).toBe(Math.min(EXAM_SIZE, bank.length));
      expect(new Set(exam.map((q) => q.id)).size).toBe(exam.length);
      const modulesWithQuestions = new Set(bank.map((q) => moduleOf(course, q)));
      expect(new Set(exam.map((q) => q.module))).toEqual(modulesWithQuestions);
      for (const q of exam) {
        const original = bank.find((b) => b.id === q.id)!;
        expect(q.options.map((o) => o.id).sort()).toEqual(original.options.map((o) => o.id).sort());
        expect(q.correctOptionId).toBe(original.correctOptionId);
        expect(q.options.find((o) => o.id === q.correctOptionId)!.text).toBe(original.options.find((o) => o.id === original.correctOptionId)!.text);
      }
    });
  }

  it("draws the same exam for the same seed, and a different one for another seed", () => {
    const course = getCourse("discrete-mathematics")!;
    const bank = byCourse["discrete-mathematics"];
    const ids = (seed: number) => buildExam(course, bank, seed).map((q) => q.id).join();
    expect(ids(7)).toBe(ids(7));
    expect(ids(7)).not.toBe(ids(8));
  });
});

describe("scoreExam", () => {
  const course = getCourse("computer-networks")!;
  const exam = buildExam(course, byCourse["computer-networks"], 1);

  it("scores all right, all wrong and unanswered", () => {
    const right = Object.fromEntries(exam.map((q) => [q.id, q.correctOptionId]));
    const wrong = Object.fromEntries(exam.map((q) => [q.id, q.options.find((o) => o.id !== q.correctOptionId)!.id]));
    expect(scoreExam(course, exam, right)).toMatchObject({ right: exam.length, total: exam.length, missed: [] });
    expect(scoreExam(course, exam, wrong).right).toBe(0);
    expect(scoreExam(course, exam, {}).missed.length).toBe(exam.length);
  });

  it("splits the score by module, with a lesson to review in each", () => {
    const half = Object.fromEntries(exam.filter((_, i) => i % 2 === 0).map((q) => [q.id, q.correctOptionId]));
    const result = scoreExam(course, exam, half);
    expect(result.perModule.reduce((s, m) => s + m.total, 0)).toBe(exam.length);
    expect(result.perModule.reduce((s, m) => s + m.right, 0)).toBe(result.right);
    const lessons = flattenLessons(course).map((l) => l.slug);
    for (const m of result.perModule) expect(lessons).toContain(m.firstLesson);
  });
});

describe("helpers", () => {
  it("shuffles without losing or adding anything", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(xs, seededRandom(3)).sort()).toEqual(xs);
  });

  it("never lets 'exam' be a lesson slug, since /courses/<course>/exam is the exam page", () => {
    for (const c of courses) expect(flattenLessons(c).map((l) => l.slug), c.slug).not.toContain("exam");
  });
});

describe("attempts", () => {
  beforeEach(() => localStorage.clear());

  it("remembers attempts per course and keeps the last 20", () => {
    for (let i = 0; i < 25; i++) recordAttempt("logic-design", { date: `d${i}`, right: i, total: 25, seconds: 60, conditions: false });
    recordAttempt("microprocessors", { date: "x", right: 1, total: 2, seconds: 5, conditions: true });
    const a = readAttempts("logic-design");
    expect(a).toHaveLength(20);
    expect(a.at(-1)!.right).toBe(24);
    expect(readAttempts("microprocessors")).toHaveLength(1);
    expect(readAttempts("computer-networks")).toEqual([]);
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("decoded:exams:v1", "{not json");
    expect(readAttempts("logic-design")).toEqual([]);
  });
});
