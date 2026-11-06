/* Course exams: draw a mixed set of questions from a course's bank, score an attempt,
   and remember past attempts. Pure functions except the storage helpers at the end.
   Design: docs/exams.md. */

import type { Course } from "@/content/registry";
import type { Question, QuestionOption } from "@/lib/questions";

export const EXAM_SIZE = 20;
export const SECONDS_PER_QUESTION = 90;

/** A small seeded random number generator (mulberry32), so a given seed always draws the same exam. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Index of the module a question belongs to: the module holding its lesson, or else its quiz. -1 if neither is found. */
export function moduleOf(course: Course, q: Question): number {
  const slug = q.lesson ?? q.quiz;
  return course.modules.findIndex((m) => m.lessons.some((l) => l.slug === slug));
}

/**
 * How many questions to take from each module: proportional to the module's number of
 * lessons, at least one from every module that has questions, never more than it has.
 * Uses the largest-remainder method so the counts add up exactly.
 */
export function allocate(weights: number[], available: number[], size: number): number[] {
  const total = Math.min(size, available.reduce((s, x) => s + x, 0));
  const counts = available.map(() => 0);
  const eligible = available.map((a, i) => (a > 0 ? i : -1)).filter((i) => i >= 0);
  // At least one per module, biggest modules first if there are more modules than questions.
  for (const i of [...eligible].sort((x, y) => weights[y] - weights[x]).slice(0, total)) counts[i] = 1;
  let left = total - counts.reduce((s, x) => s + x, 0);
  while (left > 0) {
    const open = eligible.filter((i) => counts[i] < available[i]);
    const w = open.reduce((s, i) => s + Math.max(weights[i], 1), 0);
    const share = open.map((i) => ({ i, want: (left * Math.max(weights[i], 1)) / w }));
    let given = 0;
    for (const { i, want } of share) {
      const add = Math.min(Math.floor(want), available[i] - counts[i]);
      counts[i] += add;
      given += add;
    }
    left -= given;
    if (given === 0) {
      // Hand out the remainder one by one, largest fractional share first.
      const order = share.sort((a, b) => (b.want % 1) - (a.want % 1) || weights[b.i] - weights[a.i]);
      for (const { i } of order) {
        if (left === 0) break;
        if (counts[i] < available[i]) {
          counts[i]++;
          left--;
        }
      }
    }
  }
  return counts;
}

export type ExamQuestion = Question & { module: number };

/** Draw an exam: questions mixed across modules, in random order, each with its options shuffled. */
export function buildExam(course: Course, bank: Question[], seed: number, size = EXAM_SIZE): ExamQuestion[] {
  const random = seededRandom(seed);
  const byModule = course.modules.map((_, mi) => bank.filter((q) => moduleOf(course, q) === mi));
  const counts = allocate(
    course.modules.map((m) => m.lessons.filter((l) => l.kind !== "quiz").length),
    byModule.map((qs) => qs.length),
    size,
  );
  const picked = byModule.flatMap((qs, mi) => shuffle(qs, random).slice(0, counts[mi]).map((q) => ({ ...q, module: mi })));
  return shuffle(picked, random).map((q) => ({ ...q, options: shuffle<QuestionOption>(q.options, random) }));
}

export type ModuleScore = { module: number; title: string; right: number; total: number; firstLesson: string };
export type ExamResult = { right: number; total: number; perModule: ModuleScore[]; missed: ExamQuestion[] };

/** Score an attempt. Unanswered questions count as wrong. */
export function scoreExam(course: Course, exam: ExamQuestion[], answers: Record<string, string>): ExamResult {
  const perModule = new Map<number, ModuleScore>();
  const missed: ExamQuestion[] = [];
  let right = 0;
  for (const q of exam) {
    const ok = answers[q.id] === q.correctOptionId;
    if (ok) right++;
    else missed.push(q);
    const m = course.modules[q.module];
    const s = perModule.get(q.module) ?? { module: q.module, title: m?.title ?? "", right: 0, total: 0, firstLesson: m?.lessons.find((l) => l.kind !== "quiz")?.slug ?? m?.lessons[0]?.slug ?? "" };
    s.total++;
    if (ok) s.right++;
    perModule.set(q.module, s);
  }
  return { right, total: exam.length, perModule: [...perModule.values()].sort((a, b) => a.module - b.module), missed };
}

/* ---------------------------------- attempts ---------------------------------- */

export type ExamAttempt = { date: string; right: number; total: number; seconds: number; conditions: boolean };

const ATTEMPTS_KEY = "decoded:exams:v1";
const KEEP = 20;

export function readAttempts(courseSlug: string): ExamAttempt[] {
  try {
    const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "{}");
    return Array.isArray(all[courseSlug]) ? all[courseSlug] : [];
  } catch {
    return [];
  }
}

export function recordAttempt(courseSlug: string, attempt: ExamAttempt) {
  try {
    const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "{}");
    all[courseSlug] = [...(Array.isArray(all[courseSlug]) ? all[courseSlug] : []), attempt].slice(-KEEP);
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("decoded:progress"));
  } catch {
    // Storage can be unavailable (private mode, full quota); the exam still works, it just isn't remembered.
  }
}
