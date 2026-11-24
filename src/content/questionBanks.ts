/* Loads a course's question bank (src/content/<course>/questions.ts) on demand, so a
   page only downloads the bank it needs. A course can also have generated questions
   (src/content/<course>/generators.ts), which get fresh numbers from each seed. */

import { instantiate, type Question, type QuestionGenerator } from "@/lib/questions";

const banks = import.meta.glob<{ questions: Question[] }>("./*/questions.ts");
const generatorFiles = import.meta.glob<{ generators: QuestionGenerator[] }>("./*/generators.ts");

const slugOf = (path: string) => path.split("/")[1];

/** Courses that have a question bank or generated questions. */
export const coursesWithBanks = new Set([...Object.keys(banks), ...Object.keys(generatorFiles)].map(slugOf));

/** A course's generated questions, still as generators: call instantiate() with a seed for numbers. */
export async function loadGenerators(courseSlug: string): Promise<QuestionGenerator[]> {
  const load = generatorFiles[`./${courseSlug}/generators.ts`];
  return load ? (await load()).generators : [];
}

/** A course's questions: its fixed bank plus one copy of each generated question, numbered from `seed`. */
export async function loadBank(courseSlug: string, seed = Math.floor(Math.random() * 2 ** 31)): Promise<Question[]> {
  const loadFixed = banks[`./${courseSlug}/questions.ts`];
  const loadGen = generatorFiles[`./${courseSlug}/generators.ts`];
  const [fixed, gens] = await Promise.all([loadFixed ? loadFixed().then((m) => m.questions) : [], loadGen ? loadGen().then((m) => m.generators) : []]);
  return [...fixed, ...gens.map((g) => instantiate(g, seed))];
}
