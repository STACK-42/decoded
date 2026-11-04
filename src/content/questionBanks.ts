/* Loads a course's question bank (src/content/<course>/questions.ts) on demand, so a
   page only downloads the bank it needs. */

import type { Question } from "@/lib/questions";

const banks = import.meta.glob<{ questions: Question[] }>("./*/questions.ts");

const slugOf = (path: string) => path.split("/")[1];

/** Courses that have a question bank. */
export const coursesWithBanks = new Set(Object.keys(banks).map(slugOf));

export async function loadBank(courseSlug: string): Promise<Question[]> {
  const load = banks[`./${courseSlug}/questions.ts`];
  return load ? (await load()).questions : [];
}
