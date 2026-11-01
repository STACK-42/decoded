/* Editorial guidance on where to start and what to read first. Slugs are checked by src/test/paths-and-tools.test.ts. */

export type LearningPath = { slug: string; title: string; description: string; courses: string[] };

export const learningPaths: LearningPath[] = [
  {
    slug: "start-here",
    title: "New to computer science",
    description: "Get comfortable with the machine, learn to think in algorithms, and learn how to study for all of it.",
    courses: ["computer-literacy", "the-exam-mind", "algorithm-design-and-analysis"],
  },
  {
    slug: "the-machine",
    title: "How a computer really works",
    description: "From a single logic gate up to pipelines and caches.",
    courses: ["logic-design", "computer-organization", "microprocessors", "computer-architecture"],
  },
  {
    slug: "algorithms",
    title: "Algorithms in depth",
    description: "From your first sort to hashing, balanced trees, dynamic programming and P vs NP.",
    courses: ["algorithm-design-and-analysis", "computational-mathematics", "advanced-algorithms"],
  },
  {
    slug: "languages",
    title: "How languages are read",
    description: "The theory behind regex engines, parsers and compilers.",
    courses: ["theory-of-computation", "microprocessors"],
  },
];

/** Courses that make a course easier. Nothing is locked; these are only suggestions. */
export const prerequisites: Record<string, string[]> = {
  "advanced-algorithms": ["algorithm-design-and-analysis"],
  "computer-organization": ["computer-literacy"],
  microprocessors: ["logic-design", "computer-organization"],
  "computer-architecture": ["computer-organization", "microprocessors"],
};
