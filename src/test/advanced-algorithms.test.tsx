import { renderLesson } from "./renderLesson";
import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import { getCourse, flattenLessons } from "@/content/registry";
import { fibCalls, masterMethod, recursionLevels, powN, firstViolation, termShares, bitOp, isPowerOfTwo, popcountFrames, toBits, fastPowerFrames, minMaxFrames, strassen, fibByMatrix, gaussFrames, unevenLevels, fracLabel, quicksortFrames, decisionPath, minComparisons, countingSortFrames, radixSortFrames, selectFrames, medianOfMedians, hashFrames, hashMultiplication, hashFolding, hashMidSquare, doublingCosts, DELETED, type HashConfig, osSelectFrames, intervalSearchFrames, OS_TREE, INTERVAL_TREE, layoutAug, skipFrames, perfectHeights, coinRowFrames, binomialFrames, robotFrames, lcsFrames, greedyChange, optimalChange, countCoins, scheduleInOrder, scheduleOptimal, huffmanFrames, activityFrames, CLRS_ACTIVITIES, dijkstraFrames, parseCNF, truthTable, findClique, cliqueGraph } from "@/lib/advancedAlgorithms";
import { FibonacciCalls, RecurrenceExplorer, TermContribution, BigOWitness } from "@/components/mdx/AdvancedVisualizers";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("Advanced Algorithms & Analysis course", () => {
  const course = getCourse("advanced-algorithms")!;

  it("is registered and available", () => {
    expect(course).toBeDefined();
    expect(course.status).toBe("available");
  });

  for (const lesson of flattenLessons(getCourse("advanced-algorithms")!)) {
    it(`renders lesson "${lesson.slug}" without throwing`, async () => {
      const { container, unmount } = await renderLesson(lesson);
      expect(container.querySelector("h1")?.textContent).toBe(lesson.title);
      const bad = [...container.querySelectorAll(".katex-error")].map((e) => e.getAttribute("title") ?? e.textContent);
      expect(bad, "math that KaTeX could not render").toEqual([]);
      unmount();
    });
  }

  it("keeps people, institutions and slide footers out of the lessons", () => {
    const dir = path.resolve(__dirname, "../content/advanced-algorithms");
    const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
    const all = files.map((f) => readFileSync(path.join(dir, f), "utf8")).join("\n").toLowerCase();
    expect(files.length).toBe(flattenLessons(course).length);
    for (const banned of [
      "cairo", "university", "faculty", "lecturer", "instructor", "basheer", "youssef", "kamal", "ramly",
      "leiserson", "demaine", "luebke", "cmsc", "chongstitvatana", "jaruloj", "copyright", "©", "cs214", "fall 2026", "dr.", "prof.", "phd",
    ]) {
      expect(all, `found "${banned}"`).not.toContain(banned);
    }
  });
});

describe("analysis helpers", () => {
  it("counts naive Fibonacci calls like the lecture table", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(fibCalls)).toEqual([1, 1, 3, 5, 9, 15, 25]);
  });

  it("solves the lecture's master-method examples", () => {
    expect(masterMethod(2, 2, 1)).toMatchObject({ case: 2, answer: "Θ(n log n)" });
    expect(masterMethod(2, 2, 2)).toMatchObject({ case: 3, answer: "Θ(n²)" });
    expect(masterMethod(2, 2, 0.5)).toMatchObject({ case: 1, answer: "Θ(n)" });
    expect(masterMethod(3, 4, 1, 1)).toMatchObject({ case: 3, answer: "Θ(n log n)" });
    expect(masterMethod(2, 2, 1, 1).case).toBe("gap");
    expect(masterMethod(1, 2, 0)).toMatchObject({ case: 2, answer: "Θ(log n)" });
    expect(masterMethod(3, 2, 1)).toMatchObject({ case: 1, answer: "Θ(n^1.58)" });
  });

  it("builds recursion-tree levels whose cost ratio is a / b^k", () => {
    const lv = recursionLevels(3, 4, 2, 256);
    expect(lv).toHaveLength(5);
    expect(lv[1].nodes).toBe(3);
    expect(lv[2].cost).toBeCloseTo((3 / 16) ** 2);
    expect(powN(3)).toBe("n³");
  });

  it("checks Big-O witnesses the way the slides prove them", () => {
    const f = (n: number) => 3 * n * n + 20;
    const g = (n: number) => n * n;
    expect(firstViolation(f, g, 4, 5, "O")).toBeNull();
    expect(firstViolation(f, g, 4, 1, "O")).toBe(1);
    expect(firstViolation((n) => n * n, (n) => n, 1, 1, "Ω")).toBeNull();
    expect(termShares([300, 80, 10]).map((x) => +(x * 100).toFixed(2))).toEqual([76.92, 20.51, 2.56]);
  });

  it("does the lab's bit tricks", () => {
    expect([bitOp("and", 5, 3), bitOp("or", 5, 3), bitOp("xor", 5, 3)]).toEqual([1, 7, 6]);
    expect(toBits(bitOp("rotr", 0b101001, 2, 6), 6)).toBe("011010");
    expect(toBits(bitOp("rotl", 0b101001, 2, 6), 6)).toBe("100110");
    expect(bitOp("not", 5, 0, 3)).toBe(2);
    expect([1, 2, 4, 64].every(isPowerOfTwo)).toBe(true);
    expect([0, 6, 12].some(isPowerOfTwo)).toBe(false);
    expect(popcountFrames(13).at(-1)!.state.count).toBe(3);
    expect(popcountFrames(0).at(-1)!.state.count).toBe(0);
  });

  it("fast power gets the right answer in about log b multiplications", () => {
    const last = fastPowerFrames(3, 13).at(-1)!;
    expect(last.state.calls[0].result).toBe(1594323n);
    expect(last.stats.multiplications).toBe(5); // 13 → 6 → 3 → 1: three squarings, two odd steps
    expect(fastPowerFrames(2, 1).at(-1)!.state.calls[0].result).toBe(2n);
  });

  it("finds min and max in 1.5n - 2 comparisons", () => {
    const last = minMaxFrames([11, 3, 5, 7, 1, 9, 5, 2, 0, 8, 10, 13, 21, 5, 4, 1]).at(-1)!;
    expect([last.state.min, last.state.max]).toEqual([0, 21]);
    expect(last.stats.comparisons).toBe(22);
  });

  it("Strassen's 7 products match the usual 8", () => {
    for (const m of [[1, 3, 7, 5, 6, 8, 4, 2], [2, -1, 0, 4, -3, 5, 7, 1]]) {
      const r = strassen(...(m as [number, number, number, number, number, number, number, number]));
      expect({ r: r.r, s: r.s, t: r.t, u: r.u }).toEqual(r.standard);
    }
  });

  it("computes Fibonacci exactly by matrix squaring", () => {
    expect(fibByMatrix(13).result[0][1]).toBe(233n);
    expect(fibByMatrix(100).result[0][1]).toBe(354224848179261915075n);
    expect(fibByMatrix(1).result[0][1]).toBe(1n);
  });

  it("multiplies with Gauss's trick and builds uneven recursion trees", () => {
    const last = gaussFrames(1234n, 5678n).at(-1)!;
    expect(last.state.calls[0].result).toBe(7006652n);
    expect(gaussFrames(99999999n, 99999999n).at(-1)!.state.calls[0].result).toBe(99999999n * 99999999n);
    const lv = unevenLevels([[1, 3], [2, 3]], 1, 2);
    expect(lv.map((l) => l.cost)).toEqual([1, 1, 1]);
    expect(lv[2].sizes.map(fracLabel)).toEqual(["n/9", "2n/9", "2n/9", "4n/9"]);
    expect(unevenLevels([[1, 4], [1, 2]], 2, 1)[1].cost).toBeCloseTo(5 / 16);
  });

  it("quicksort partitions like the lecture and randomization flattens the worst case", () => {
    const ex = quicksortFrames([6, 10, 13, 5, 8, 3, 2, 11]);
    expect(ex.at(-1)!.state.array).toEqual([2, 3, 5, 6, 8, 10, 11, 13]);
    // the first PARTITION around 6 leaves 2 5 3 | 6 | 8 13 10 11, as on the slide
    const firstDone = ex.find((f) => f.line === 8)!;
    expect(firstDone.state.array).toEqual([2, 5, 3, 6, 8, 13, 10, 11]);
    const sorted = Array.from({ length: 30 }, (_, i) => i);
    const worst = quicksortFrames(sorted).at(-1)!;
    const rand = quicksortFrames(sorted, true).at(-1)!;
    expect(worst.stats.comparisons).toBe((30 * 29) / 2);
    expect(rand.state.array).toEqual(sorted);
    expect(rand.stats["max depth"]).toBeLessThan(worst.stats["max depth"]);
  });

  it("decision tree, counting sort and radix sort follow the lecture", () => {
    expect(decisionPath([9, 4, 6])).toEqual(["r", "R", "Rr", "Rrl"]); // leaf ⟨2,3,1⟩
    for (const p of [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]] as [number, number, number][]) {
      expect(decisionPath(p).length).toBeLessThanOrEqual(4);
    }
    expect([minComparisons(3), minComparisons(10)]).toEqual([3, 22]);
    const cs = countingSortFrames([4, 1, 3, 4, 3], 4);
    expect(cs.at(-1)!.state.B).toEqual([1, 3, 3, 4, 4]);
    expect(cs.find((f) => f.state.loop === 3 && f.state.cAt === 3)!.state.C).toEqual([1, 1, 3, 5]);
    const rs = radixSortFrames([329, 457, 657, 839, 436, 720, 355]);
    expect(rs[1].state.rows).toEqual([720, 355, 436, 457, 657, 329, 839]);
    expect(rs.at(-1)!.state.rows).toEqual([329, 355, 436, 457, 657, 720, 839]);
  });

  it("selects every rank correctly, and the median of medians splits well", () => {
    const a = [6, 10, 13, 5, 8, 3, 2, 11];
    const sorted = [...a].sort((x, y) => x - y);
    for (let i = 1; i <= a.length; i++) {
      for (const r of [false, true]) {
        const last = selectFrames(a, i, r).at(-1)!;
        expect(last.state.array[last.state.found!]).toBe(sorted[i - 1]);
      }
    }
    const nums = Array.from({ length: 35 }, (_, i) => (i * 17) % 101);
    const { x, guaranteedEach } = medianOfMedians(nums);
    expect(nums.filter((v) => v <= x).length).toBeGreaterThanOrEqual(guaranteedEach);
    expect(nums.filter((v) => v >= x).length).toBeGreaterThanOrEqual(guaranteedEach);
  });

  it("hash tables reproduce the lecture and lab examples", () => {
    const keys = [10, 22, 31, 4, 15, 28, 17, 88, 59].map((key) => ({ op: "insert" as const, key }));
    const final = (cfg: HashConfig, ops = keys, init?: Record<number, number>) => hashFrames(cfg, ops, init).at(-1)!.state.slots;
    expect(final({ m: 11, mode: "linear" })).toEqual([22, 88, null, null, 4, 15, 28, 17, 59, 31, 10]);
    expect(final({ m: 11, mode: "quadratic", c1: 1, c2: 3 })).toEqual([22, null, 88, 17, 4, null, 28, 59, 15, 31, 10]);
    expect(final({ m: 11, mode: "double", second: { kind: "mod", mp: 10 } })).toEqual([22, null, 59, 17, 4, 15, 28, 88, null, 31, 10]);
    // lab 5.1 example 2 and its task
    const t = final({ m: 13, mode: "double", second: { kind: "mod", mp: 11 } }, [14, 22, 27].map((key) => ({ op: "insert", key })), { 1: 79, 4: 69, 5: 98, 7: 72, 11: 50 });
    expect([t[9], t[10], t[0]]).toEqual([14, 22, 27]);
    // lecture: deleting 18 leaves a marker, so 62 is still found and 51 reuses the slot
    const lin = hashFrames({ m: 11, mode: "linear" }, [
      ...[7, 36, 18, 62].map((key) => ({ op: "insert" as const, key })),
      { op: "delete", key: 18 }, { op: "search", key: 62 },
    ]);
    expect(lin.at(-2)!.state.hit).toBe(9);
    expect(lin.at(-1)!.state.slots[8]).toBe(DELETED);
    // quadratic with mod 10 gets stuck on 62
    const stuck = hashFrames({ m: 10, mode: "quadratic" }, [2, 12, 22, 32, 42, 52, 62].map((key) => ({ op: "insert", key })));
    expect(stuck.some((f) => /Unable to insert 62/.test(f.message))).toBe(true);
    const dbl = final({ m: 10, mode: "double", second: { kind: "prime", R: 7 } }, [37, 90, 45, 22, 17, 49, 55].map((key) => ({ op: "insert", key })));
    expect([dbl[1], dbl[6]]).toEqual([17, 55]);
  });

  it("hash functions and doubling costs match the slides", () => {
    expect([hashMultiplication(123, 100), hashMultiplication(150, 100)]).toEqual([1, 70]);
    const f = hashFolding(12345678, 2);
    expect([f.shiftHash, f.boundaryHash]).toEqual([80, 98]);
    expect(hashMidSquare(1234, 2).digits).toBe("22"); // 1522756
    const c = doublingCosts(10).map((x) => x.cost);
    expect(c).toEqual([1, 2, 3, 1, 5, 1, 1, 1, 9, 1]);
    for (const n of [1, 5, 17, 64, 1000]) expect(doublingCosts(n).reduce((t, x) => t + x.cost, 0)).toBeLessThanOrEqual(3 * n);
  });

  it("OS-SELECT and INTERVAL-SEARCH follow the lecture's paths", () => {
    const sel = osSelectFrames(OS_TREE, 5).at(-1)!.state;
    expect(sel.path).toEqual(["M", "C", "F", "H"]);
    expect(sel.found).toBe("H");
    const keys = layoutAug(OS_TREE).map((n) => n.id); // in-order
    keys.forEach((k, i) => expect(osSelectFrames(OS_TREE, i + 1).at(-1)!.state.found).toBe(k));
    expect(intervalSearchFrames(INTERVAL_TREE, 14, 16).at(-1)!.state.found).toBe("15,18");
    const none = intervalSearchFrames(INTERVAL_TREE, 12, 14).at(-1)!.state;
    expect(none.none).toBe(true);
    expect(none.path).toEqual(["17,19", "5,11", "15,18"]);
    expect(layoutAug(INTERVAL_TREE).find((n) => n.id === "5,11")!.extra).toBe("m=18");
  });

  it("skip lists search, insert and delete", () => {
    const keys = [2, 10, 15, 16, 31, 71, 86, 91, 96];
    expect(perfectHeights(8)).toEqual([1, 2, 1, 3, 1, 2, 1, 4]);
    const f = skipFrames(keys, perfectHeights(keys.length), [
      { op: "search", key: 71 }, { op: "search", key: 50 }, { op: "insert", key: 87 }, { op: "search", key: 87 }, { op: "delete", key: 87 },
    ]);
    expect(f.some((x) => /Found it!/.test(x.message) && x.state.towers[x.state.found!].key === 71)).toBe(true);
    expect(f.some((x) => /50 is not in the skip list/.test(x.message))).toBe(true);
    expect(f.some((x) => /Level \d: 87 = 87\. Found it!/.test(x.message))).toBe(true);
    expect(f.at(-1)!.state.towers.map((t) => t.key)).toEqual(keys);
  });

  it("dynamic programming tables give the lecture's answers", () => {
    const cr = coinRowFrames([5, 1, 2, 10, 6, 2]).at(-1)!.state;
    expect(cr.answer).toBe("17");
    expect(cr.table[1]).toEqual([0, 5, 5, 7, 15, 15, 17]);
    expect(binomialFrames(6, 3).at(-1)!.state.answer).toBe("20");
    expect(robotFrames().at(-1)!.state.answer).toBe("5");
    const lcs = lcsFrames("president", "providence").at(-1)!.state;
    expect(lcs.answer).toBe("priden");
    expect(lcsFrames("algorithm", "alignment").at(-1)!.state.answer).toBe("algt"); // same length as the slide's "algm"
  });

  it("greedy examples match the lecture", () => {
    expect([...greedyChange(639, [1, 5, 10, 25, 100, 500])]).toEqual([[500, 1], [100, 1], [25, 1], [10, 1], [1, 4]]);
    expect(countCoins(greedyChange(15, [1, 7, 10]))).toBe(6);
    expect(countCoins(optimalChange(15, [1, 7, 10]))).toBe(3);
    const jobs = [3, 5, 6, 10, 11, 14, 15, 18, 20];
    const span = (l: number[][]) => Math.max(...l.map((x) => x.reduce((a, b) => a + b, 0)));
    expect(span(scheduleInOrder([...jobs].sort((a, b) => b - a), 3))).toBe(35);
    expect(span(scheduleInOrder([...jobs].sort((a, b) => a - b), 3))).toBe(40);
    expect(span(scheduleOptimal(jobs, 3))).toBe(34);
    const codes = huffmanFrames(["A", "B", "C", "D", "E", "F"], [22, 12, 24, 6, 27, 9]).at(-1)!.state.codes;
    expect(codes).toEqual({ A: "00", B: "100", C: "01", D: "1010", E: "11", F: "1011" });
    const act = activityFrames(CLRS_ACTIVITIES).at(-1)!.state.chosen.map((i) => i + 1);
    expect(act).toEqual([1, 4, 8, 11]);
  });

  it("Dijkstra reproduces the lecture example and the worked table", () => {
    const lec = dijkstraFrames(5, [
      { from: 0, to: 1, w: 10 }, { from: 0, to: 2, w: 3 }, { from: 1, to: 2, w: 1 }, { from: 2, to: 1, w: 4 }, { from: 1, to: 3, w: 2 },
      { from: 2, to: 3, w: 8 }, { from: 2, to: 4, w: 2 }, { from: 3, to: 4, w: 7 }, { from: 4, to: 3, w: 9 },
    ], true, 0, ["A", "B", "C", "D", "E"]).at(-1)!.state;
    expect(lec.d).toEqual([0, 7, 3, 9, 5]);
    expect(lec.S).toEqual([0, 2, 4, 1, 3]); // A, C, E, B, D
    const tab = dijkstraFrames(7, [
      { from: 0, to: 1, w: 5 }, { from: 0, to: 2, w: 3 }, { from: 2, to: 3, w: 7 }, { from: 2, to: 4, w: 7 }, { from: 1, to: 6, w: 1 },
      { from: 1, to: 4, w: 3 }, { from: 6, to: 4, w: 1 }, { from: 4, to: 3, w: 2 }, { from: 4, to: 5, w: 1 },
    ], false, 0, ["A", "B", "C", "D", "E", "F", "G"]).at(-1)!.state;
    expect(tab.d).toEqual([0, 5, 3, 9, 7, 8, 6]);
    expect(tab.pi).toEqual([null, 0, 0, 4, 6, 4, 1]); // parents A A E G E B, as in the table
  });

  it("SAT tables and the CLIQUE reduction agree", () => {
    const f = parseCNF("(a ∨ b) ∧ (a ∨ ¬b)")!;
    expect(truthTable(f).map((r) => r.sat)).toEqual([true, true, false, false]); // the slide's table
    expect(parseCNF("(a | !b) ^ (b)")).toEqual([[{ v: "a", neg: false }, { v: "b", neg: true }], [{ v: "b", neg: false }]]);
    expect(parseCNF("(a ∨ )) ∧")).toBeNull();
    const lec = parseCNF("(x1 ∨ ¬x2 ∨ x3) ∧ (¬x1 ∨ x2) ∧ (¬x2 ∨ x3)")!;
    expect(cliqueGraph(lec).vs).toHaveLength(7);
    expect(findClique(lec)).toHaveLength(3);
    for (const text of ["(a) ∧ (¬a)", "(a ∨ b) ∧ (¬a ∨ b) ∧ (a ∨ ¬b) ∧ (¬a ∨ ¬b)", "(a ∨ b) ∧ (b ∨ ¬c)", "(x1 ∨ x2) ∧ (¬x1) ∧ (¬x2 ∨ x3)"]) {
      const g = parseCNF(text)!;
      expect(findClique(g) !== null).toBe(truthTable(g).some((r) => r.sat));
    }
  });

  it("renders the analysis widgets", () => {
    render(<TermContribution initialN={100} />);
    expect(screen.getByText("97.37%")).toBeDefined();
    render(<BigOWitness />);
    expect(screen.getByText(/It holds/)).toBeDefined();
    render(<FibonacciCalls initialN={6} />);
    expect(screen.getByText("25 calls")).toBeDefined();
    render(<RecurrenceExplorer />);
    expect(screen.getByText(/Case 2/)).toBeDefined();
  });
});
