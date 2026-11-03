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
