/* Real tools mapped to the lessons that explain them. Each `mentions` is checked against the lesson's text
   by src/test/paths-and-tools.test.ts, so a link can't claim something the lesson doesn't cover. */

export type ToolLesson = { course: string; lesson: string; mentions: string };
export type Tool = { name: string; what: string; lessons: ToolLesson[] };

export const tools: Tool[] = [
  {
    name: "Regex engines",
    what: "grep, your editor's find box and form validators all run the machines from this theory.",
    lessons: [
      { course: "theory-of-computation", lesson: "nfa", mentions: "regex" },
      { course: "theory-of-computation", lesson: "regular-expressions", mentions: "grep" },
      { course: "theory-of-computation", lesson: "regex-playground", mentions: "regex" },
    ],
  },
  {
    name: "Compilers and parsers",
    what: "How a program turns source code or JSON into a structure it can work with.",
    lessons: [
      { course: "theory-of-computation", lesson: "context-free-grammars", mentions: "parser" },
      { course: "theory-of-computation", lesson: "pushdown-automata", mentions: "JSON" },
      { course: "microprocessors", lesson: "stack-and-procedures", mentions: "compiler" },
    ],
  },
  {
    name: "Hash maps",
    what: "Python dicts, JavaScript objects and Java HashMaps, and why they're usually so fast.",
    lessons: [
      { course: "advanced-algorithms", lesson: "hashing", mentions: "hash" },
      { course: "advanced-algorithms", lesson: "collision-resolution", mentions: "hash" },
      { course: "advanced-algorithms", lesson: "lab-hashing", mentions: "hash" },
    ],
  },
  {
    name: "Database indexes",
    what: "Why looking up one row among millions doesn't mean reading them all.",
    lessons: [
      { course: "algorithm-design-and-analysis", lesson: "linear-and-binary-search", mentions: "index" },
      { course: "advanced-algorithms", lesson: "balanced-search-trees", mentions: "B-tree" },
    ],
  },
  {
    name: "Redis",
    what: "The data structure behind its sorted sets.",
    lessons: [{ course: "advanced-algorithms", lesson: "skip-lists", mentions: "Redis" }],
  },
  {
    name: "File compression",
    what: "How zip-style formats make common data take fewer bits.",
    lessons: [{ course: "advanced-algorithms", lesson: "huffman-and-activity-selection", mentions: "Huffman" }],
  },
  {
    name: "Encryption",
    what: "The number theory that secures HTTPS and RSA.",
    lessons: [
      { course: "computational-mathematics", lesson: "primality-and-the-totient", mentions: "RSA" },
      { course: "computational-mathematics", lesson: "order-and-primitive-roots", mentions: "Diffie" },
      { course: "computational-mathematics", lesson: "modular-inverses", mentions: "RSA" },
    ],
  },
  {
    name: "Machine learning and GPUs",
    what: "The matrix maths and parallel hardware that training a model comes down to.",
    lessons: [
      { course: "computational-mathematics", lesson: "multiplying-matrices", mentions: "GPU" },
      { course: "computational-mathematics", lesson: "derivatives-and-curve-fitting", mentions: "neural" },
      { course: "computer-architecture", lesson: "parallel-processing", mentions: "GPU" },
    ],
  },
  {
    name: "CPU caches",
    what: "Why the same code can run far faster depending on how it touches memory.",
    lessons: [
      { course: "computer-organization", lesson: "memory-hierarchy", mentions: "cache" },
      { course: "computer-architecture", lesson: "cache-mapping", mentions: "cache" },
      { course: "computer-architecture", lesson: "cache-policies", mentions: "cache" },
    ],
  },
  {
    name: "Assembly and debuggers",
    what: "What's left of your program by the time the processor runs it.",
    lessons: [
      { course: "microprocessors", lesson: "first-program", mentions: "assembl" },
      { course: "microprocessors", lesson: "registers", mentions: "register" },
      { course: "microprocessors", lesson: "stack-and-procedures", mentions: "stack" },
    ],
  },
];
