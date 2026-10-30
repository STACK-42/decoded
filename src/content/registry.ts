import type { ComponentType } from "react";

// Lesson MDX modules (eagerly loaded so we can render synchronously)
import TocIntro from "@/content/theory-of-computation/m0-01-intro.mdx";
import TocLanguageOfLanguages from "@/content/theory-of-computation/m0-02-language-of-languages.mdx";
import TocHowToReadAMachine from "@/content/theory-of-computation/m0-03-how-to-read-a-machine.mdx";
import TocGrammars from "@/content/theory-of-computation/m0-04-grammars.mdx";
import TocStatesSymbols from "@/content/theory-of-computation/m1-01-states-symbols.mdx";
import TocNfa from "@/content/theory-of-computation/m1-02-nfa.mdx";
import TocRegularExpressions from "@/content/theory-of-computation/m1-03-regular-expressions.mdx";
import TocTransitionGraphs from "@/content/theory-of-computation/m1-04-transition-graphs.mdx";
import TocKleenesTheorem from "@/content/theory-of-computation/m1-05-kleenes-theorem.mdx";
import TocRegexPlayground from "@/content/theory-of-computation/m1-06-regex-playground.mdx";
import TocFiniteAutomataQuiz from "@/content/theory-of-computation/m1-07-finite-automata-quiz.mdx";
import TocLimitsOfFiniteMemory from "@/content/theory-of-computation/m2-01-limits-of-finite-memory.mdx";
import TocContextFreeGrammars from "@/content/theory-of-computation/m2-02-context-free-grammars.mdx";
import TocNormalForms from "@/content/theory-of-computation/m2-03-normal-forms.mdx";
import TocPushdownAutomata from "@/content/theory-of-computation/m2-04-pushdown-automata.mdx";
import TocCfgEqualsPda from "@/content/theory-of-computation/m2-05-cfg-equals-pda.mdx";
import TocContextFreeQuiz from "@/content/theory-of-computation/m2-06-context-free-quiz.mdx";
import LitTyping from "@/content/computer-literacy/01-physical-layer.mdx";
import LitLanguage from "@/content/computer-literacy/02-language-layer.mdx";
import LitSystems from "@/content/computer-literacy/03-systems-layer.mdx";
import AdaWhatIsAnAlgorithm from "@/content/algorithm-design-and-analysis/m0-01-what-is-an-algorithm.mdx";
import AdaCountingSteps from "@/content/algorithm-design-and-analysis/m0-02-counting-steps.mdx";
import AdaJavaLabToolkit from "@/content/algorithm-design-and-analysis/m0-03-java-lab-toolkit.mdx";
import AdaSelectionBubble from "@/content/algorithm-design-and-analysis/m1-01-selection-and-bubble-sort.mdx";
import AdaInsertionSort from "@/content/algorithm-design-and-analysis/m1-02-insertion-sort.mdx";
import AdaMergeSort from "@/content/algorithm-design-and-analysis/m1-03-merge-sort.mdx";
import AdaQuickSort from "@/content/algorithm-design-and-analysis/m1-04-quick-sort.mdx";
import AdaSortingQuiz from "@/content/algorithm-design-and-analysis/m1-05-sorting-quiz.mdx";
import AdaSearch from "@/content/algorithm-design-and-analysis/m2-01-linear-and-binary-search.mdx";
import AdaEuclid from "@/content/algorithm-design-and-analysis/m2-02-euclid-gcd.mdx";
import AdaBfsDfs from "@/content/algorithm-design-and-analysis/m3-01-bfs-and-dfs.mdx";
import AdaGreedy from "@/content/algorithm-design-and-analysis/m4-01-greedy-and-mst.mdx";
import AdaDynamic from "@/content/algorithm-design-and-analysis/m4-02-dynamic-programming.mdx";
import AdaFinalQuiz from "@/content/algorithm-design-and-analysis/m4-03-final-quiz.mdx";
import AaAnalysis from "@/content/advanced-algorithms/m0-01-analysis-of-algorithms.mdx";
import AaCountingOperations from "@/content/advanced-algorithms/m0-02-every-worst-average-best.mdx";
import AaAsymptotic from "@/content/advanced-algorithms/m0-03-asymptotic-notation.mdx";
import AaRecurrences from "@/content/advanced-algorithms/m0-04-solving-recurrences.mdx";
import AaLabBits from "@/content/advanced-algorithms/m0-05-lab-bit-manipulation.mdx";
import AaLabAnalysis from "@/content/advanced-algorithms/m0-06-lab-algorithm-analysis.mdx";
import AaDivideConquer from "@/content/advanced-algorithms/m1-01-divide-and-conquer.mdx";
import AaLabDivideConquer from "@/content/advanced-algorithms/m1-02-lab-divide-and-conquer.mdx";
import AaQuicksort from "@/content/advanced-algorithms/m1-03-quicksort.mdx";
import AaLowerBounds from "@/content/advanced-algorithms/m1-04-sorting-lower-bounds.mdx";
import AaOrderStatistics from "@/content/advanced-algorithms/m1-05-order-statistics.mdx";
import AaHashing from "@/content/advanced-algorithms/m2-01-hashing.mdx";
import AaCollisions from "@/content/advanced-algorithms/m2-02-collision-resolution.mdx";
import AaLabHashing from "@/content/advanced-algorithms/m2-03-lab-hashing.mdx";
import AaBalancedTrees from "@/content/advanced-algorithms/m2-04-balanced-search-trees.mdx";
import AaRedBlackOps from "@/content/advanced-algorithms/m2-05-red-black-insert-delete.mdx";
import AaAugmenting from "@/content/advanced-algorithms/m2-06-augmenting-data-structures.mdx";
import AaSkipLists from "@/content/advanced-algorithms/m2-07-skip-lists.mdx";
import AaDynamic from "@/content/advanced-algorithms/m3-01-dynamic-programming.mdx";
import AaGreedy from "@/content/advanced-algorithms/m3-02-greedy-algorithms.mdx";
import AaMst from "@/content/advanced-algorithms/m3-03-minimum-spanning-trees.mdx";
import AaHuffman from "@/content/advanced-algorithms/m3-04-huffman-and-activity-selection.mdx";
import AaShortestPaths from "@/content/advanced-algorithms/m3-05-shortest-paths.mdx";
import AaPNP from "@/content/advanced-algorithms/m4-01-p-and-np.mdx";
import CmMatrices from "@/content/computational-mathematics/m0-01-matrices-and-matlab.mdx";
import CmTranspose from "@/content/computational-mathematics/m0-02-transpose-and-products.mdx";
import CmMultiply from "@/content/computational-mathematics/m0-03-multiplying-matrices.mdx";
import CmKronecker from "@/content/computational-mathematics/m0-04-kronecker-product.mdx";
import CmNorms from "@/content/computational-mathematics/m0-05-norms-and-trace.mdx";
import CmSpecial from "@/content/computational-mathematics/m0-06-special-matrices.mdx";
import CmDeterminants from "@/content/computational-mathematics/m0-07-determinants-and-inverses.mdx";
import CmMatricesQuiz from "@/content/computational-mathematics/m0-08-matrices-quiz.mdx";
import CmPolyRoots from "@/content/computational-mathematics/m1-01-polynomials-and-roots.mdx";
import CmPolyConv from "@/content/computational-mathematics/m1-02-multiplying-and-dividing.mdx";
import CmPolyFit from "@/content/computational-mathematics/m1-03-derivatives-and-curve-fitting.mdx";
import CmPolyResidue from "@/content/computational-mathematics/m1-04-partial-fractions.mdx";
import CmPolyQuiz from "@/content/computational-mathematics/m1-05-polynomials-quiz.mdx";
import CmEuclid from "@/content/computational-mathematics/m2-01-divisibility-and-euclid.mdx";
import CmModular from "@/content/computational-mathematics/m2-02-modular-arithmetic.mdx";
import CmPrimes from "@/content/computational-mathematics/m2-03-primes-and-the-sieve.mdx";
import CmTotient from "@/content/computational-mathematics/m2-04-primality-and-the-totient.mdx";
import CmOrder from "@/content/computational-mathematics/m2-05-order-and-primitive-roots.mdx";
import CmInverses from "@/content/computational-mathematics/m2-06-modular-inverses.mdx";
import CmFastPow from "@/content/computational-mathematics/m2-07-fast-exponentiation.mdx";
import CmDiscreteLog from "@/content/computational-mathematics/m2-08-discrete-logarithms.mdx";
import CmNtQuiz from "@/content/computational-mathematics/m2-09-number-theory-quiz.mdx";
import ExamMindLesson01 from "@/content/the-exam-mind/01-the-problem-with-how-you-study.mdx";
import ExamMindLesson02 from "@/content/the-exam-mind/02-the-one-week-plan.mdx";
import ExamMindLesson03 from "@/content/the-exam-mind/03-stress-and-anxiety.mdx";
import ExamMindLesson04 from "@/content/the-exam-mind/04-exam-day.mdx";


export type LessonKind = "theory" | "practical" | "quiz";

export type Lesson = {
  slug: string;
  title: string;
  duration: string; // e.g. "8 min"
  kind?: LessonKind; // omitted = "theory" (default)
  Component: ComponentType<Record<string, unknown>>;
};

export function lessonKind(lesson: Lesson): LessonKind {
  return lesson.kind ?? "theory";
}

export type Module = {
  title: string;
  blurb?: string;
  lessons: Lesson[];
};

export type Course = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  accent: "neon" | "orange" | "sky" | "violet" | "mint";
  status: "available" | "coming-soon";
  number: string; // "01"
  modules: Module[];
};

export const courses: Course[] = [
  {
    slug: "theory-of-computation",
    title: "Theory of Computation",
    tagline: "What machines can fundamentally compute, still matters to understand",
    description:
      "Back in the 1930s mathematicians who put the first principles of this field weren't writing and shipping apps. They were asking much simpler questions, like 'what is computable?' That question produced regex, parsers, CPUs, cryptography, and the famous world of antivirus software. This small course decodes each topic in the theory of computation into the tools you are going to use or already in use.",
    accent: "neon",
    status: "available",
    number: "01",
    modules: [
      {
        title: "Foundations",
        blurb: "Why this course exists and how to read it.",
        lessons: [
          { slug: "intro", title: "The Abstraction Gap", duration: "5 min", Component: TocIntro },
          { slug: "language-of-languages", title: "The Language of Languages", duration: "12 min", Component: TocLanguageOfLanguages },
          { slug: "grammars", title: "Grammars: Rules That Generate a Language", duration: "14 min", Component: TocGrammars },
          { slug: "how-to-read-a-machine", title: "How to Read a Machine", duration: "9 min", Component: TocHowToReadAMachine },
        ],
      },
      {
        title: "Finite Automata",
        blurb: "The first formal computing model — and the engine behind every regex.",
        lessons: [
          { slug: "states-symbols-and-transitions", title: "States, Symbols, and Transitions", duration: "10 min", Component: TocStatesSymbols },
          { slug: "nfa", title: "NFA — The Machine That Guesses Right", duration: "12 min", Component: TocNfa },
          { slug: "regular-expressions", title: "Reading and Writing Regular Expressions", duration: "15 min", kind: "practical", Component: TocRegularExpressions },
          { slug: "transition-graphs", title: "Transition Graphs", duration: "14 min", Component: TocTransitionGraphs },
          { slug: "kleenes-theorem", title: "Kleene's Theorem", duration: "15 min", Component: TocKleenesTheorem },
          { slug: "regex-playground", title: "Practical: Building Regex from Automata", duration: "10 min", kind: "practical", Component: TocRegexPlayground },
          { slug: "finite-automata-quiz", title: "Quiz: Finite Automata & Regex", duration: "10 min", kind: "quiz", Component: TocFiniteAutomataQuiz },
        ],
      },
      {
        title: "Context-Free Languages",
        blurb: "Where finite memory runs out: grammars that nest, and the stack that recognizes them.",
        lessons: [
          { slug: "limits-of-finite-memory", title: "The Limits of Finite Memory", duration: "12 min", Component: TocLimitsOfFiniteMemory },
          { slug: "context-free-grammars", title: "Context-Free Grammars", duration: "16 min", Component: TocContextFreeGrammars },
          { slug: "normal-forms", title: "Simplifying Grammars and Normal Forms", duration: "16 min", Component: TocNormalForms },
          { slug: "pushdown-automata", title: "Pushdown Automata", duration: "15 min", Component: TocPushdownAutomata },
          { slug: "cfg-equals-pda", title: "CFG = PDA", duration: "12 min", Component: TocCfgEqualsPda },
          { slug: "context-free-quiz", title: "Quiz: Context-Free Languages", duration: "10 min", kind: "quiz", Component: TocContextFreeQuiz },
        ],
      },
    ],
  },
  {
    slug: "computer-literacy",
    title: "Computer Literacy",
    tagline: "The fluency needed to be one with the machine",
    description:
      "Everything about computing is interaction. The more precisely you speak to the machine, the more effective you become. That fluency has three layers: physical, language and systems. It comes from years of watching what separates fluent users from frustrated ones.",
    accent: "orange",
    status: "available",
    number: "02",
    modules: [
      {
        title: "The Three Layers of Fluency",
        blurb: "Each layer removes friction between intention and execution.",
        lessons: [
          { slug: "physical-layer", title: "The Physical Layer", duration: "6 min", Component: LitTyping },
          { slug: "language-layer", title: "The Language Layer", duration: "7 min", Component: LitLanguage },
          { slug: "systems-layer",  title: "The Systems Layer",  duration: "7 min", Component: LitSystems },
        ],
      },
    ],
  },
  {
    slug: "algorithm-design-and-analysis",
    title: "Algorithm Design & Analysis",
    tagline: "Why two programs that give the same answer can be a million times apart.",
    description:
      "Sorting, searching, graphs, greedy choices and dynamic programming. The classic university algorithms course, decoded: every algorithm is animated step by step next to its Java code, every lesson explains why it works and what it costs, and each one ends with easy LeetCode problems to lock it in.",
    accent: "sky",
    status: "available",
    number: "03",
    modules: [
      {
        title: "Foundations",
        blurb: "What an algorithm is, how we measure one, and the Java toolkit every lab uses.",
        lessons: [
          { slug: "what-is-an-algorithm", title: "Recipes, Programs, and Proof", duration: "9 min", Component: AdaWhatIsAnAlgorithm },
          { slug: "counting-steps", title: "Counting Steps: Big-O, Omega and Theta", duration: "13 min", Component: AdaCountingSteps },
          { slug: "java-lab-toolkit", title: "Practical: Arrays, Swaps and a Stopwatch", duration: "10 min", kind: "practical", Component: AdaJavaLabToolkit },
        ],
      },
      {
        title: "Sorting",
        blurb: "Five ways to put things in order, and why the fastest on paper isn't always the one you want.",
        lessons: [
          { slug: "selection-and-bubble-sort", title: "Selection Sort and Bubble Sort", duration: "12 min", Component: AdaSelectionBubble },
          { slug: "insertion-sort", title: "Insertion Sort: Sorting Like a Card Player", duration: "9 min", Component: AdaInsertionSort },
          { slug: "merge-sort", title: "Divide and Conquer: Merge Sort", duration: "13 min", Component: AdaMergeSort },
          { slug: "quick-sort", title: "Quick Sort: Pick a Pivot", duration: "12 min", Component: AdaQuickSort },
          { slug: "sorting-quiz", title: "Quiz: Analysis & Sorting", duration: "7 min", kind: "quiz", Component: AdaSortingQuiz },
        ],
      },
      {
        title: "Searching & Numbers",
        blurb: "Finding things fast, and the oldest algorithm still running in your phone.",
        lessons: [
          { slug: "linear-and-binary-search", title: "Linear vs Binary Search", duration: "11 min", Component: AdaSearch },
          { slug: "euclid-gcd", title: "Euclid's GCD: A 2,300-Year-Old Algorithm", duration: "8 min", Component: AdaEuclid },
        ],
      },
      {
        title: "Graphs",
        blurb: "Maps, networks and friendships — and the two ways to walk through all of them.",
        lessons: [
          { slug: "bfs-and-dfs", title: "Graphs: BFS and DFS", duration: "14 min", Component: AdaBfsDfs },
        ],
      },
      {
        title: "Design Strategies",
        blurb: "Two big ideas for designing your own algorithms: grab the best thing now, or remember everything.",
        lessons: [
          { slug: "greedy-and-mst", title: "Greedy Algorithms: Prim and Kruskal", duration: "13 min", Component: AdaGreedy },
          { slug: "dynamic-programming", title: "Dynamic Programming: The 0/1 Knapsack", duration: "14 min", Component: AdaDynamic },
          { slug: "final-quiz", title: "Quiz: Searching, Graphs, Greedy & DP", duration: "8 min", kind: "quiz", Component: AdaFinalQuiz },
        ],
      },
    ],
  },
  {
    slug: "advanced-algorithms",
    title: "Advanced Algorithms & Analysis",
    tagline: "Proving how fast an algorithm is, then building ones that are faster.",
    description:
      "The second algorithms course, decoded. Asymptotic notation and recurrences, divide and conquer, randomized quicksort and linear-time sorting, hashing, balanced and red-black trees, skip lists, dynamic programming, greedy algorithms, shortest paths, and the P vs NP question. Every lesson follows the lectures and labs, in plain language, with step-through animations.",
    accent: "violet",
    status: "available",
    number: "04",
    modules: [
      {
        title: "Foundations of Analysis",
        blurb: "How to measure an algorithm without a stopwatch, and how to prove what you measured.",
        lessons: [
          { slug: "analysis-of-algorithms", title: "What Is Analysis of Algorithms?", duration: "14 min", Component: AaAnalysis },
          { slug: "counting-the-basic-operation", title: "Counting the Basic Operation", duration: "14 min", Component: AaCountingOperations },
          { slug: "asymptotic-notation", title: "Complexity and Asymptotic Notation", duration: "18 min", Component: AaAsymptotic },
          { slug: "solving-recurrences", title: "Solving Recurrences", duration: "18 min", Component: AaRecurrences },
          { slug: "lab-bit-manipulation", title: "Lab: Bit Manipulation and Binary Files", duration: "16 min", kind: "practical", Component: AaLabBits },
          { slug: "lab-algorithm-analysis", title: "Lab: Analyzing Algorithms with Recurrences", duration: "18 min", kind: "practical", Component: AaLabAnalysis },
        ],
      },
      {
        title: "Divide and Conquer",
        blurb: "Split, solve, combine: from binary search to Strassen, and the sorting algorithms built on it.",
        lessons: [
          { slug: "divide-and-conquer", title: "Divide and Conquer", duration: "20 min", Component: AaDivideConquer },
          { slug: "lab-divide-and-conquer", title: "Lab: Recursion Trees and Gauss Multiplication", duration: "18 min", kind: "practical", Component: AaLabDivideConquer },
          { slug: "quicksort", title: "Quicksort and Randomized Quicksort", duration: "20 min", Component: AaQuicksort },
          { slug: "sorting-lower-bounds", title: "Sorting Lower Bounds and Linear-Time Sorting", duration: "20 min", Component: AaLowerBounds },
          { slug: "order-statistics", title: "Order Statistics: Finding the i-th Smallest", duration: "18 min", Component: AaOrderStatistics },
        ],
      },
      {
        title: "Hashing and Search Trees",
        blurb: "Constant-time lookups with hashing, then trees that stay balanced no matter what you insert.",
        lessons: [
          { slug: "hashing", title: "Hashing and Amortized Analysis", duration: "18 min", Component: AaHashing },
          { slug: "collision-resolution", title: "Collisions: Chaining and Open Addressing", duration: "22 min", Component: AaCollisions },
          { slug: "lab-hashing", title: "Lab: Hash Tables in Practice", duration: "18 min", kind: "practical", Component: AaLabHashing },
          { slug: "balanced-search-trees", title: "Balanced Search Trees and Red-Black Trees", duration: "16 min", Component: AaBalancedTrees },
          { slug: "red-black-insert-delete", title: "Red-Black Trees: Insertion and Deletion", duration: "20 min", Component: AaRedBlackOps },
          { slug: "augmenting-data-structures", title: "Augmenting Data Structures", duration: "18 min", Component: AaAugmenting },
          { slug: "skip-lists", title: "Skip Lists", duration: "16 min", Component: AaSkipLists },
        ],
      },
      {
        title: "Design Strategies",
        blurb: "Remember every answer, or grab the best option now: dynamic programming, greedy algorithms and shortest paths.",
        lessons: [
          { slug: "dynamic-programming", title: "Dynamic Programming", duration: "22 min", Component: AaDynamic },
          { slug: "greedy-algorithms", title: "Greedy Algorithms", duration: "16 min", Component: AaGreedy },
          { slug: "minimum-spanning-trees", title: "Minimum Spanning Trees: Prim and Kruskal", duration: "20 min", Component: AaMst },
          { slug: "huffman-and-activity-selection", title: "Greedy Choice: Huffman Codes and Activity Selection", duration: "22 min", Component: AaHuffman },
          { slug: "shortest-paths", title: "Shortest Paths: Dijkstra's Algorithm", duration: "22 min", Component: AaShortestPaths },
        ],
      },
      {
        title: "Hard Problems",
        blurb: "Problems that are easy to check but seem impossible to solve quickly, and the million-dollar question behind them.",
        lessons: [
          { slug: "p-and-np", title: "P, NP, NP-Hard and NP-Complete", duration: "20 min", Component: AaPNP },
        ],
      },
    ],
  },
  {
    slug: "computational-mathematics",
    title: "Computational Mathematics",
    tagline: "The maths your computer does for you, animated until it makes sense.",
    description:
      "Matrices, polynomials, number theory and the first ciphers, worked in MATLAB. Watch matrix entries slide into place, space bend under a linear map and a cipher wheel turn, then see where each idea runs in today's tools.",
    accent: "mint",
    status: "available",
    number: "05",
    modules: [
      {
        title: "Matrices",
        blurb: "Creating and combining matrices, what they do to space, and how to undo them.",
        lessons: [
          { slug: "matrices-and-matlab", title: "Matrices and MATLAB", duration: "10 min", Component: CmMatrices },
          { slug: "transpose-and-products", title: "Transpose and Vector Products", duration: "10 min", Component: CmTranspose },
          { slug: "multiplying-matrices", title: "Multiplying Matrices", duration: "14 min", Component: CmMultiply },
          { slug: "kronecker-product", title: "The Kronecker Product", duration: "8 min", Component: CmKronecker },
          { slug: "norms-and-trace", title: "Matrix Norms and the Trace", duration: "11 min", Component: CmNorms },
          { slug: "special-matrices", title: "Some Special Matrices", duration: "8 min", Component: CmSpecial },
          { slug: "determinants-and-inverses", title: "Determinants and Inverses", duration: "15 min", Component: CmDeterminants },
          { slug: "matrices-quiz", title: "Quiz: Matrices", duration: "10 min", kind: "quiz", Component: CmMatricesQuiz },
        ],
      },
      {
        title: "Polynomials",
        blurb: "Storing polynomials as vectors, finding roots, and fitting curves to data.",
        lessons: [
          { slug: "polynomials-and-roots", title: "Polynomials and Their Roots", duration: "12 min", Component: CmPolyRoots },
          { slug: "multiplying-and-dividing", title: "Multiplying and Dividing Polynomials", duration: "9 min", Component: CmPolyConv },
          { slug: "derivatives-and-curve-fitting", title: "Derivatives and Curve Fitting", duration: "12 min", Component: CmPolyFit },
          { slug: "partial-fractions", title: "Partial Fractions", duration: "9 min", Component: CmPolyResidue },
          { slug: "polynomials-quiz", title: "Quiz: Polynomials", duration: "8 min", kind: "quiz", Component: CmPolyQuiz },
        ],
      },
      {
        title: "Number Theory",
        blurb: "The whole-number arithmetic behind modern cryptography, from remainders to discrete logarithms.",
        lessons: [
          { slug: "divisibility-and-euclid", title: "Divisibility and the Euclidean Algorithm", duration: "12 min", Component: CmEuclid },
          { slug: "modular-arithmetic", title: "Modular Arithmetic", duration: "12 min", Component: CmModular },
          { slug: "primes-and-the-sieve", title: "Primes and the Sieve", duration: "10 min", Component: CmPrimes },
          { slug: "primality-and-the-totient", title: "Primality Tests and Euler's Totient", duration: "15 min", Component: CmTotient },
          { slug: "order-and-primitive-roots", title: "Order and Primitive Roots", duration: "12 min", Component: CmOrder },
          { slug: "modular-inverses", title: "Modular Inverses", duration: "11 min", Component: CmInverses },
          { slug: "fast-exponentiation", title: "Fast Exponentiation", duration: "11 min", Component: CmFastPow },
          { slug: "discrete-logarithms", title: "Discrete Logarithms", duration: "12 min", Component: CmDiscreteLog },
          { slug: "number-theory-quiz", title: "Quiz: Number Theory", duration: "10 min", kind: "quiz", Component: CmNtQuiz },
        ],
      },
    ],
  },
  {
    slug: "operating-systems",
    title: "Operating Systems",
    tagline: "The invisible layer that makes everything work.",
    description:
      "Processes, memory, file systems, schedulers — and where each shows up the moment something goes wrong. Coming soon.",
    accent: "violet",
    status: "coming-soon",
    number: "06",
    modules: [],
  },
  {
    slug: "distributed-systems",
    title: "Distributed Systems",
    tagline: "Building reliable software out of unreliable parts.",
    description:
      "Consistency, availability, and the CAP theorem. This course decodes how massive systems stay synchronized across the globe, from Paxos to Raft and the tradeoffs of microservices.",
    accent: "mint",
    status: "coming-soon",
    number: "07",
    modules: [],
  },
  {
    slug: "the-exam-mind",
    title: "The Exam Mind",
    tagline: "How to think clearly when the pressure is on.",
    description:
      "Exams test mental endurance and strategy as much as knowledge. This course covers how memory works, how to plan the week before, and how to handle stress in the exam room and on the day itself.",
    accent: "sky",
    status: "available",
    number: "08",
    modules: [
      {
        title: "The Strategy",
        blurb: "Why the usual way of studying fails, and a week-long plan built on how memory works.",
        lessons: [
          { slug: "the-problem-with-how-you-study", title: "The Problem with How You Study", duration: "10 min", Component: ExamMindLesson01 },
          { slug: "the-one-week-plan", title: "The One-Week Plan", duration: "12 min", Component: ExamMindLesson02 },
        ],
      },
      {
        title: "The Execution",
        blurb: "What stress does to recall, and how to get through exam day.",
        lessons: [
          { slug: "stress-and-anxiety", title: "Stress & Anxiety", duration: "8 min", Component: ExamMindLesson03 },
          { slug: "exam-day", title: "Exam Day", duration: "7 min", Component: ExamMindLesson04 },
        ],
      },
    ],
  },
];

export function getCourse(slug: string) {
  return courses.find((c) => c.slug === slug);
}

export function getLesson(courseSlug: string, lessonSlug: string) {
  const course = getCourse(courseSlug);
  if (!course) return null;
  for (const m of course.modules) {
    const lesson = m.lessons.find((l) => l.slug === lessonSlug);
    if (lesson) return { course, module: m, lesson };
  }
  return null;
}

export function flattenLessons(course: Course): Lesson[] {
  return course.modules.flatMap((m) => m.lessons);
}

export function lessonNeighbors(courseSlug: string, lessonSlug: string) {
  const course = getCourse(courseSlug);
  if (!course) return { prev: null, next: null };
  const flat = flattenLessons(course);
  const idx = flat.findIndex((l) => l.slug === lessonSlug);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
