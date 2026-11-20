/* The question bank: every quiz, exam and review question on the site, as data.
   Each course keeps its questions in src/content/<course>/questions.ts. Design and
   plan: docs/exams.md. */

export type QuestionOption = { id: string; text: string };

export type Question = {
  /** Unique site-wide and permanent: review history is keyed by it. Never rename or reuse one. */
  id: string;
  /** Slug of the module quiz this question appears in, if any. */
  quiz?: string;
  /** Slug of the lesson that teaches the idea, for "re-read this". */
  lesson?: string;
  /** Heading id in that lesson, when one section teaches it. */
  section?: string;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  /** Why the right answer is right (and, ideally, why the tempting wrong one is wrong). */
  explanation: string;
  difficulty?: 1 | 2 | 3;
};

/** The questions of one module quiz, in bank order. */
export function questionsForQuiz(bank: Question[], quizSlug: string): Question[] {
  return bank.filter((q) => q.quiz === quizSlug);
}

/* ------------------------------ generated questions ------------------------------ */

/** What a generator produces for one seed: a question without its id, lesson and section, which come from the generator. */
export type GeneratedBody = Pick<Question, "prompt" | "options" | "correctOptionId" | "explanation" | "difficulty">;

/**
 * A question with fresh numbers every time. The id stays the same across seeds, so the
 * review queue tracks the skill, not one set of numbers. Each course keeps its generators
 * in src/content/<course>/generators.ts. Design: docs/exams.md.
 */
export type QuestionGenerator = {
  id: string;
  lesson: string;
  section?: string;
  generate: (random: () => number) => GeneratedBody;
};

/** A small seeded random number generator (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so generators given the same seed still draw different numbers. */
function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Turn a generator into an ordinary question for one seed. */
export function instantiate(gen: QuestionGenerator, seed: number): Question {
  const body = gen.generate(mulberry32((seed ^ hashId(gen.id)) >>> 0));
  return { id: gen.id, lesson: gen.lesson, ...(gen.section ? { section: gen.section } : {}), ...body };
}

/** A whole number from lo to hi, both included. */
export const randomInt = (random: () => number, lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));

/**
 * Options a to d from the right answer and candidate wrong ones: drops repeats and any wrong
 * option equal to the right one, keeps the first three left, and puts the right answer at a
 * random position.
 */
export function buildOptions(right: string, wrong: string[], random: () => number): Pick<Question, "options" | "correctOptionId"> {
  const picked = [...new Set(wrong.filter((w) => w !== right))].slice(0, 3);
  const at = Math.floor(random() * (picked.length + 1));
  const texts = [...picked.slice(0, at), right, ...picked.slice(at)];
  const ids = ["a", "b", "c", "d"];
  return { options: texts.map((text, i) => ({ id: ids[i], text })), correctOptionId: ids[at] };
}
