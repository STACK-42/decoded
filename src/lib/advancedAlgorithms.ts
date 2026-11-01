/* ============================================================
   Logic behind the Advanced Algorithms & Analysis visualizers.

   Same idea as src/lib/algorithms.ts: everything that can be
   computed lives here as plain functions and frame generators,
   and the components in AdvancedVisualizers.tsx only draw it.
   ============================================================ */

import type { ArrayState, Frame } from "@/lib/algorithms";

/* ------------------------ bit manipulation ------------------------ */

export type BitOp = "and" | "or" | "xor" | "not" | "shl" | "shr" | "rotr" | "rotl";

/** n as a string of `width` binary digits, most significant first. */
export function toBits(n: number, width = 8): string {
  const mask = width >= 32 ? 0xffffffff : (1 << width) - 1;
  return ((n & mask) >>> 0).toString(2).padStart(width, "0");
}

/** Apply a bitwise operation, keeping only the low `width` bits (like a fixed-size register). */
export function bitOp(op: BitOp, a: number, b: number, width = 8): number {
  const mask = (1 << width) - 1;
  const x = a & mask;
  switch (op) {
    case "and": return x & b & mask;
    case "or": return (x | b) & mask;
    case "xor": return (x ^ b) & mask;
    case "not": return ~x & mask;
    case "shl": return (x << b) & mask;
    case "shr": return x >>> b;
    case "rotr": {
      const d = ((b % width) + width) % width;
      return ((x >>> d) | (x << (width - d))) & mask;
    }
    case "rotl": {
      const d = ((b % width) + width) % width;
      return ((x << d) | (x >>> (width - d))) & mask;
    }
  }
}

export const isPowerOfTwo = (x: number) => x > 0 && (x & (x - 1)) === 0;

export type PopState = { n: number; prev?: number; count: number; cleared?: number };

export const CPP_COUNT_ONES = [
  "int count_one(int n) {",
  "    int count = 0;",
  "    while (n) {",
  "        n = n & (n - 1);   // clears the rightmost 1",
  "        count++;",
  "    }",
  "    return count;",
  "}",
];

/** Brian Kernighan's trick: each n & (n-1) removes exactly one 1-bit. */
export function popcountFrames(start: number): Frame<PopState>[] {
  const frames: Frame<PopState>[] = [];
  let n = start;
  let count = 0;
  frames.push({ state: { n, count }, line: 1, message: `Start with n = ${n}. Count how many 1-bits it has.`, stats: { count } });
  while (n) {
    frames.push({ state: { n, count }, line: 2, message: `n = ${n} is not 0, so there is at least one 1-bit left.`, stats: { count } });
    const prev = n;
    n = n & (n - 1);
    const cleared = Math.log2(prev ^ n);
    frames.push({
      state: { n, prev, count, cleared },
      line: 3,
      message: `n − 1 = ${prev - 1} flips the rightmost 1 (bit ${cleared}) and every 0 to its right. ANDing with n clears that bit: n is now ${n}.`,
      stats: { count },
    });
    count++;
    frames.push({ state: { n, count }, line: 4, message: `One bit removed, so count = ${count}.`, stats: { count } });
  }
  frames.push({ state: { n, count }, line: 6, message: `n is 0. ${start} has ${count} one-bit${count === 1 ? "" : "s"}. The loop ran once per 1-bit, not once per bit.`, stats: { count } });
  return frames;
}

/* --------------------------- fast power --------------------------- */

export type PowerCall = { a: bigint; b: number; result?: bigint };
export type PowerState = { calls: PowerCall[]; active: number };

export const CPP_FAST_POWER = [
  "long long fastPower(long long a, int b) {",
  "    if (b == 1)",
  "        return a;",
  "    long long c = a * a;",
  "    long long ans = fastPower(c, b / 2);",
  "    if (b % 2 == 1)",
  "        return a * ans;           // odd b: one extra a",
  "    return ans;",
  "}",
];

/** FastPower(a, b) from the lab: square the base, halve the exponent. */
export function fastPowerFrames(a0: number, b0: number): Frame<PowerState>[] {
  const frames: Frame<PowerState>[] = [];
  const calls: PowerCall[] = [];
  let mults = 0;
  const snap = (active: number, line: number, message: string) =>
    frames.push({ state: { calls: calls.map((c) => ({ ...c })), active }, line, message, stats: { calls: calls.length, multiplications: mults } });

  const go = (a: bigint, b: number): bigint => {
    calls.push({ a, b });
    const me = calls.length - 1;
    snap(me, 0, `fastPower(${a}, ${b}) is called.`);
    if (b === 1) {
      calls[me].result = a;
      snap(me, 2, `b = 1, so the answer is just a = ${a}. This is the base case.`);
      return a;
    }
    const c = a * a;
    mults++;
    snap(me, 3, `Square the base: c = ${a} × ${a} = ${c}. Now the exponent can be halved.`);
    const ans = go(c, Math.floor(b / 2));
    let r = ans;
    if (b % 2 === 1) {
      r = a * ans;
      mults++;
      calls[me].result = r;
      snap(me, 6, `b = ${b} is odd, so halving lost one factor of a. Multiply it back: ${a} × ${ans} = ${r}.`);
    } else {
      calls[me].result = r;
      snap(me, 7, `b = ${b} is even, so (a²)^(b/2) is already the answer: ${r}.`);
    }
    return r;
  };

  const r = go(BigInt(a0), b0);
  frames.push({
    state: { calls: calls.map((c) => ({ ...c })), active: -1 },
    line: 8,
    message: `${a0}^${b0} = ${r}. That took ${mults} multiplications; the simple a · power(a, b − 1) needs ${b0 - 1}.`,
    stats: { calls: calls.length, multiplications: mults },
  });
  return frames;
}

/* ------------------------- min and max ------------------------- */

export type MinMaxState = ArrayState & { min?: number; max?: number; phase: string };

export const CPP_MIN_MAX = [
  "void minMax(int x[], int n, int& lo, int& hi) {",
  "    for (int i = 0; i + 1 < n; i += 2)   // n/2 comparisons",
  "        if (x[i] > x[i + 1]) swap(x[i], x[i + 1]);",
  "    lo = x[0]; hi = x[1];",
  "    for (int i = 2; i < n; i += 2) {",
  "        if (x[i] < lo) lo = x[i];          // smaller of each pair",
  "        if (x[i + 1] > hi) hi = x[i + 1];  // larger of each pair",
  "    }",
  "}",
];

/** The lab's 1.5n − 2 min-and-max: order each pair, then race the small ones and the big ones separately. n must be even. */
export function minMaxFrames(input: number[]): Frame<MinMaxState>[] {
  const x = input.length % 2 === 0 ? [...input] : [...input, input[input.length - 1]];
  const n = x.length;
  const frames: Frame<MinMaxState>[] = [];
  let comparisons = 0;
  const push = (s: Partial<MinMaxState>, line: number, message: string) =>
    frames.push({ state: { array: [...x], phase: "pairs", ...s }, line, message, stats: { comparisons, "naive 2n": 2 * n } });

  push({}, 0, `Find the smallest and the largest of ${n} numbers. Comparing each number with both the current min and max would take about 2n = ${2 * n} comparisons.`);
  for (let i = 0; i + 1 < n; i += 2) {
    comparisons++;
    const swap = x[i] > x[i + 1];
    push({ compare: [i, i + 1] }, 2, `Pair (${x[i]}, ${x[i + 1]}): ${swap ? "out of order, swap them" : "already small-then-big"}.`);
    if (swap) {
      [x[i], x[i + 1]] = [x[i + 1], x[i]];
      push({ write: [i, i + 1] }, 2, `Now ${x[i]} is the small one and ${x[i + 1]} the big one.`);
    }
  }
  let lo = x[0];
  let hi = x[1];
  let loAt = 0;
  let hiAt = 1;
  const marks = () => ({ pointers: { min: loAt, max: hiAt } });
  push({ phase: "race", min: lo, max: hi, ...marks() }, 3, `After ${n / 2} comparisons every pair is ordered. The min must be a small (even) slot and the max a big (odd) slot. Start with the first pair.`);
  for (let i = 2; i < n; i += 2) {
    comparisons++;
    const newLo = x[i] < lo;
    if (newLo) {
      lo = x[i];
      loAt = i;
    }
    push({ phase: "race", compare: [i], min: lo, max: hi, ...marks() }, 5, `Small side: ${x[i]} vs min. ${newLo ? `New min ${lo}.` : `Min stays ${lo}.`}`);
    comparisons++;
    const newHi = x[i + 1] > hi;
    if (newHi) {
      hi = x[i + 1];
      hiAt = i + 1;
    }
    push({ phase: "race", compare: [i + 1], min: lo, max: hi, ...marks() }, 6, `Big side: ${x[i + 1]} vs max. ${newHi ? `New max ${hi}.` : `Max stays ${hi}.`}`);
  }
  push({ phase: "done", found: loAt, sorted: [hiAt], min: lo, max: hi, ...marks() }, 8, `min = ${lo}, max = ${hi} after ${comparisons} comparisons. That's 1.5n − 2 = ${1.5 * n - 2}, instead of about 2n = ${2 * n}.`);
  return frames;
}

/* ---------------------------- quicksort ---------------------------- */

/** Small seeded RNG (mulberry32), so a "random" run replays the same way every time. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type QuickState = ArrayState & { calls: [number, number][]; low?: [number, number]; high?: [number, number] };

export const CPP_QUICKSORT = [
  "int partition(int A[], int p, int q) {   // A[p..q]",
  "    int x = A[p];                         // pivot = first element",
  "    int i = p;",
  "    for (int j = p + 1; j <= q; j++)",
  "        if (A[j] <= x) {",
  "            i++;",
  "            swap(A[i], A[j]);",
  "        }",
  "    swap(A[p], A[i]);                     // pivot between the two parts",
  "    return i;",
  "}",
  "",
  "void quicksort(int A[], int p, int r) {",
  "    if (p < r) {",
  "        // randomized: swap(A[p], A[random(p, r)]);",
  "        int q = partition(A, p, r);",
  "        quicksort(A, p, q - 1);",
  "        quicksort(A, q + 1, r);",
  "    }",
  "}",
];

/** The lecture's quicksort: PARTITION around A[p], optionally after swapping a random element into A[p]. */
export function quicksortFrames(input: number[], randomized = false, seed = 7): Frame<QuickState>[] {
  const A = [...input];
  const frames: Frame<QuickState>[] = [];
  const done = new Set<number>();
  const calls: [number, number][] = [];
  const rand = rng(seed);
  let comparisons = 0;
  let swaps = 0;
  let maxDepth = 0;
  const push = (s: Partial<QuickState>, line: number, message: string) =>
    frames.push({
      state: { array: [...A], sorted: [...done], calls: calls.map((c) => [...c] as [number, number]), ...s },
      line,
      message,
      stats: { comparisons, swaps, "max depth": maxDepth },
    });

  const partition = (p: number, q: number) => {
    const x = A[p];
    let i = p;
    const regions = (j: number) => ({ low: [p + 1, i] as [number, number], high: [i + 1, j - 1] as [number, number] });
    push({ range: [p, q], pivot: p, pointers: { i, j: p + 1 }, ...regions(p + 1) }, 1, `PARTITION(A, ${p}, ${q}): the pivot is x = A[${p}] = ${x}. Grow a "≤ x" part and a "≥ x" part to its right.`);
    for (let j = p + 1; j <= q; j++) {
      comparisons++;
      const small = A[j] <= x;
      push({ range: [p, q], pivot: p, compare: [j], pointers: { i, j }, ...regions(j) }, 4, `Is A[${j}] = ${A[j]} ≤ ${x}? ${small ? "Yes, so it belongs in the ≤ x part." : "No, so it stays in the ≥ x part."}`);
      if (small) {
        i++;
        if (i !== j) swaps++;
        [A[i], A[j]] = [A[j], A[i]];
        push({ range: [p, q], pivot: p, write: [i, j], pointers: { i, j }, ...regions(j + 1) }, 6, `i moves to ${i}, and A[${i}] ↔ A[${j}]. The ≤ x part grows by one.`);
      }
    }
    if (i !== p) swaps++;
    [A[p], A[i]] = [A[i], A[p]];
    done.add(i);
    push({ range: [p, q], write: [p, i], pointers: { i }, low: [p, i - 1], high: [i + 1, q] }, 8, `Swap the pivot into A[${i}]. Everything left of it is ≤ ${x} and everything right is ≥ ${x}: ${x} is now in its final place.`);
    return i;
  };

  const sort = (p: number, r: number) => {
    calls.push([p, r]);
    maxDepth = Math.max(maxDepth, calls.length);
    if (p < r) {
      if (randomized) {
        const k = p + Math.floor(rand() * (r - p + 1));
        if (k !== p) {
          [A[p], A[k]] = [A[k], A[p]];
          swaps++;
        }
        push({ range: [p, r], pivot: p, write: k !== p ? [p, k] : undefined }, 14, `Randomized: picked A[${k}] at random and swapped it to the front, so ${A[p]} is the pivot.`);
      }
      const q = partition(p, r);
      sort(p, q - 1);
      sort(q + 1, r);
    } else if (p === r) {
      done.add(p);
      push({ range: [p, r] }, 13, `quicksort(A, ${p}, ${r}): one element, already sorted.`);
    }
    calls.pop();
  };

  push({}, 12, `Quicksort ${A.length} numbers${randomized ? ", picking each pivot at random" : ", always using the first element as the pivot"}.`);
  sort(0, A.length - 1);
  push({ sorted: A.map((_, i) => i) }, 19, `Sorted. ${comparisons} comparisons, recursion ${maxDepth} calls deep.`);
  return frames;
}

/* --------------------------- red-black trees --------------------------- */

export type Color = "R" | "B";
export type RBNode = { id: number; key: number; color: Color; left: number | null; right: number | null; parent: number | null };
export type RBSnapshot = { nodes: RBNode[]; root: number | null };
export type RBState = RBSnapshot & { focus?: number[]; note?: string; caseLabel?: string };

export const CPP_RB = [
  "void rbInsert(T, x) {",
  "    treeInsert(T, x);  x->color = RED;   // only property 3 can break",
  "    while (x != root && x->p->color == RED) {",
  "        y = uncle(x);",
  "        if (y->color == RED) {            // Case 1: recolor, move up",
  "            x->p->color = y->color = BLACK; x->p->p->color = RED;",
  "            x = x->p->p;",
  "        } else {",
  "            if (x is an inner child) {    // Case 2: rotate into Case 3",
  "                x = x->p;  rotate(x);",
  "            }",
  "            x->p->color = BLACK; x->p->p->color = RED;   // Case 3",
  "            rotate(x->p->p);              // done",
  "        }",
  "    }",
  "    root->color = BLACK;",
  "}",
  "",
  "void rbDelete(T, z) {",
  "    y = (z has 2 children) ? predecessor(z) : z;  // copy y's key into z",
  "    x = y's only child (maybe NIL);  splice y out;",
  "    if (y->color == BLACK) rbTreeFix(T, x);      // x carries an extra black",
  "}",
  "void rbTreeFix(T, x) {",
  "    while (x != root && x->color == BLACK) {",
  "        w = sibling(x);",
  "        if (w->color == RED)                      // sibling red: rotate",
  "        else if (both of w's children are BLACK)  // pass the token up",
  "        else                                      // a red nephew: rotate, done",
  "    }",
  "    x->color = BLACK;                             // x red: just color it black",
  "}",
];

/** A red-black tree that records a frame at every recolor and rotation (insertion as in CLRS, deletion with the predecessor). */
export class RBTree {
  nodes = new Map<number, RBNode>();
  root: number | null = null;
  private next = 1;
  frames: Frame<RBState>[] = [];
  rotations = 0;

  constructor(keys: number[] = []) {
    for (const k of keys) this.insert(k, false);
    this.frames = [];
  }

  snap(): RBSnapshot {
    return { nodes: [...this.nodes.values()].map((n) => ({ ...n })), root: this.root };
  }

  private push(line: number, message: string, focus: number[] = [], caseLabel?: string) {
    this.frames.push({ state: { ...this.snap(), focus, caseLabel }, line, message, stats: { nodes: this.nodes.size, rotations: this.rotations, height: this.height() } });
  }

  height(id = this.root): number {
    if (id === null) return 0;
    const n = this.nodes.get(id)!;
    return 1 + Math.max(this.height(n.left), this.height(n.right));
  }

  private n(id: number | null) {
    return id === null ? null : this.nodes.get(id)!;
  }
  private color(id: number | null): Color {
    return id === null ? "B" : this.nodes.get(id)!.color;
  }
  private key(id: number | null) {
    return id === null ? "NIL" : String(this.nodes.get(id)!.key);
  }

  private rotate(xId: number, dir: "left" | "right", record: boolean) {
    const x = this.nodes.get(xId)!;
    const yId = dir === "left" ? x.right! : x.left!;
    const y = this.nodes.get(yId)!;
    const inner = dir === "left" ? y.left : y.right;
    if (dir === "left") x.right = inner;
    else x.left = inner;
    if (inner !== null) this.nodes.get(inner)!.parent = xId;
    y.parent = x.parent;
    if (x.parent === null) this.root = yId;
    else {
      const p = this.nodes.get(x.parent)!;
      if (p.left === xId) p.left = yId;
      else p.right = yId;
    }
    if (dir === "left") y.left = xId;
    else y.right = xId;
    x.parent = yId;
    this.rotations++;
    if (record) this.push(dir === "left" ? 9 : 12, `${dir === "left" ? "Left" : "Right"}-rotate at ${x.key}: ${y.key} moves up and ${x.key} becomes its ${dir} child. The in-order order of the keys doesn't change.`, [xId, yId]);
  }

  insert(key: number, record = true) {
    let p: number | null = null;
    let cur = this.root;
    while (cur !== null) {
      p = cur;
      cur = key < this.nodes.get(cur)!.key ? this.nodes.get(cur)!.left : this.nodes.get(cur)!.right;
    }
    const id = this.next++;
    this.nodes.set(id, { id, key, color: "R", left: null, right: null, parent: p });
    if (p === null) this.root = id;
    else if (key < this.nodes.get(p)!.key) this.nodes.get(p)!.left = id;
    else this.nodes.get(p)!.right = id;
    if (record) this.push(1, `Insert ${key} as in an ordinary BST and color it red. That keeps every black-height the same, so only property 3 (no red node with a red parent) can break.`, [id]);

    let x = id;
    while (x !== this.root && this.color(this.n(x)!.parent) === "R") {
      const pId = this.n(x)!.parent!;
      const gId = this.n(pId)!.parent!;
      const g = this.n(gId)!;
      const parentIsLeft = g.left === pId;
      const yId = parentIsLeft ? g.right : g.left;
      if (record) this.push(2, `${this.key(x)} and its parent ${this.key(pId)} are both red. Look at the uncle ${this.key(yId)}: it is ${this.color(yId) === "R" ? "red" : "black"}.`, [x, pId, ...(yId ? [yId] : [])]);
      if (this.color(yId) === "R") {
        this.n(pId)!.color = "B";
        this.n(yId)!.color = "B";
        g.color = "R";
        x = gId;
        if (record) this.push(5, `Case 1 (red uncle): recolor. Parent and uncle become black and the grandparent ${g.key} becomes red. ${g.key} might now clash with its own parent, so continue from there.`, [pId, yId!, gId], "Case 1");
      } else {
        const xIsRight = this.n(pId)!.right === x;
        if (xIsRight === parentIsLeft) {
          if (record) this.push(8, `Case 2 (black uncle, and ${this.key(x)} is an inner child, bent towards the middle): rotate at the parent ${this.key(pId)} to straighten it into Case 3.`, [x, pId], "Case 2");
          x = pId;
          this.rotate(x, parentIsLeft ? "left" : "right", record);
        }
        const p2 = this.n(x)!.parent!;
        const g2 = this.n(p2)!.parent!;
        this.n(p2)!.color = "B";
        this.n(g2)!.color = "R";
        if (record) this.push(11, `Case 3 (black uncle, on the outside): color the parent ${this.key(p2)} black and the grandparent ${this.key(g2)} red …`, [p2, g2], "Case 3");
        this.rotate(g2, parentIsLeft ? "right" : "left", record);
        if (record) this.push(12, `… and rotate at the grandparent. Done: no more property 3 violations are possible.`, [p2], "Case 3");
      }
    }
    if (this.color(this.root) === "R") {
      this.n(this.root)!.color = "B";
      if (record) this.push(15, `Color the root black (property 2).`, [this.root!]);
    } else if (record) this.push(15, `The tree satisfies all red-black properties again.`, []);
  }

  private find(key: number) {
    let cur = this.root;
    while (cur !== null && this.nodes.get(cur)!.key !== key) cur = key < this.nodes.get(cur)!.key ? this.nodes.get(cur)!.left : this.nodes.get(cur)!.right;
    return cur;
  }

  delete(key: number, record = true) {
    const zId = this.find(key);
    if (zId === null) {
      if (record) this.push(18, `${key} is not in the tree.`, []);
      return;
    }
    const z = this.n(zId)!;
    let yId = zId;
    if (z.left !== null && z.right !== null) {
      yId = z.left;
      while (this.n(yId)!.right !== null) yId = this.n(yId)!.right!;
      if (record) this.push(19, `${key} has two children. Replace its key with its predecessor ${this.n(yId)!.key} (the largest key in its left subtree), then remove the predecessor's node instead.`, [zId, yId]);
      z.key = this.n(yId)!.key;
    }
    const y = this.n(yId)!;
    const xId = y.left ?? y.right;
    const xParent = y.parent;
    if (xId !== null) this.n(xId)!.parent = xParent;
    if (xParent === null) this.root = xId;
    else if (this.n(xParent)!.left === yId) this.n(xParent)!.left = xId;
    else this.n(xParent)!.right = xId;
    this.nodes.delete(yId);
    const removedBlack = y.color === "B";
    if (record)
      this.push(20, `Remove the node that held ${y.key}; ${xId === null ? "a NIL leaf" : `its child ${this.key(xId)}`} takes its place. ${removedBlack ? "It was black, so paths through here lost a black node: give x an extra black token." : "It was red, so no property can break."}`, xId ? [xId] : xParent ? [xParent] : []);
    if (removedBlack) this.fix(xId, xParent, record);
  }

  private fix(xId0: number | null, parent0: number | null, record: boolean) {
    let xId = xId0;
    let pId = parent0;
    while (xId !== this.root && this.color(xId) === "B" && pId !== null) {
      const p = this.n(pId)!;
      const isLeft = p.left === xId;
      let wId = isLeft ? p.right : p.left;
      if (this.color(wId) === "R") {
        this.n(wId)!.color = "B";
        p.color = "R";
        if (record) this.push(26, `x = ${this.key(xId)} is doubly black and its sibling ${this.key(wId)} is red: swap the colors of the sibling and the parent …`, [wId!, pId], "Sibling red");
        this.rotate(pId, isLeft ? "left" : "right", record);
        wId = isLeft ? p.right : p.left;
      }
      const w = this.n(wId);
      const near = w ? (isLeft ? w.left : w.right) : null;
      const far = w ? (isLeft ? w.right : w.left) : null;
      if (this.color(near) === "B" && this.color(far) === "B") {
        if (w) w.color = "R";
        if (record) this.push(27, `The sibling ${this.key(wId)} is black and both nephews are black: color the sibling red and pass the black token up to the parent ${p.key}.`, [...(wId ? [wId] : []), pId], "Both nephews black");
        xId = pId;
        pId = p.parent;
      } else {
        if (this.color(far) === "B") {
          this.n(near)!.color = "B";
          w!.color = "R";
          if (record) this.push(28, `Only the near nephew ${this.key(near)} is red: recolor and rotate at the sibling so the red nephew is on the far side …`, [near!, wId!], "Red nephew");
          this.rotate(wId!, isLeft ? "right" : "left", record);
          wId = isLeft ? p.right : p.left;
        }
        const w2 = this.n(wId)!;
        w2.color = p.color;
        p.color = "B";
        const far2 = isLeft ? w2.right : w2.left;
        if (far2 !== null) this.n(far2)!.color = "B";
        if (record) this.push(28, `The far nephew is red: the sibling takes the parent's color, the parent and the far nephew become black …`, [wId!, pId], "Red nephew");
        this.rotate(pId, isLeft ? "left" : "right", record);
        if (record) this.push(28, `… and rotate at the parent. The extra black is absorbed: done.`, [wId!], "Red nephew");
        xId = this.root;
        pId = null;
      }
    }
    if (xId !== null && this.color(xId) === "R") {
      this.n(xId)!.color = "B";
      if (record) this.push(30, `x = ${this.key(xId)} is red: just color it black. That restores the lost black.`, [xId], "x red");
    } else if (record) this.push(30, `All red-black properties hold again.`, []);
  }

  /** Checks properties 2–4; returns the black-height, or throws on a violation. */
  check(): number {
    if (this.color(this.root) !== "B") throw new Error("root is red");
    const walk = (id: number | null): number => {
      if (id === null) return 1;
      const n = this.n(id)!;
      if (n.color === "R" && (this.color(n.left) === "R" || this.color(n.right) === "R")) throw new Error(`red ${n.key} has a red child`);
      const l = walk(n.left);
      const r = walk(n.right);
      if (l !== r) throw new Error(`black-heights differ under ${n.key}`);
      return l + (n.color === "B" ? 1 : 0);
    };
    return walk(this.root);
  }

  inorder(): number[] {
    const out: number[] = [];
    const walk = (id: number | null) => {
      if (id === null) return;
      walk(this.n(id)!.left);
      out.push(this.n(id)!.key);
      walk(this.n(id)!.right);
    };
    walk(this.root);
    return out;
  }
}

export type RBOp = { op: "insert" | "delete"; key: number };

/** Frames for a list of operations, starting from a tree built silently from `start`. */
export function rbFrames(start: number[], ops: RBOp[]): Frame<RBState>[] {
  const t = new RBTree(start);
  t.frames.push({ state: { ...t.snap(), focus: [] }, line: 0, message: start.length ? `A red-black tree with ${start.length} keys.` : "An empty red-black tree.", stats: { nodes: t.nodes.size, rotations: 0, height: t.height() } });
  for (const o of ops) {
    if (o.op === "insert") t.insert(o.key);
    else t.delete(o.key);
  }
  return t.frames;
}

/* -------------------------- dynamic programming -------------------------- */

export type Cell = [number, number];
export type DPState = {
  table: (number | null)[][];
  rowLabels: string[];
  colLabels: string[];
  cell?: Cell;
  deps?: Cell[];
  trace?: Cell[];
  marks?: Cell[]; // e.g. coins on the robot board
  answer?: string;
};

const blank = (r: number, c: number) => Array.from({ length: r }, () => Array<number | null>(c).fill(null));
const copyT = (t: (number | null)[][]) => t.map((r) => [...r]);

export const DP_CODE: Record<"coins" | "binomial" | "robot" | "lcs", string[]> = {
  coins: [
    "F[0] = 0;  F[1] = c[1];",
    "for (i = 2; i <= n; i++)",
    "    F[i] = max(c[i] + F[i-2], F[i-1]);   // take coin i, or leave it",
    "return F[n];",
  ],
  binomial: [
    "for (i = 0; i <= n; i++)",
    "    for (j = 0; j <= min(i, k); j++)",
    "        if (j == 0 || j == i) C[i][j] = 1;",
    "        else C[i][j] = C[i-1][j-1] + C[i-1][j];",
    "return C[n][k];",
  ],
  robot: [
    "F[1][1] = c[1][1];",
    "for (j = 2; j <= m; j++) F[1][j] = F[1][j-1] + c[1][j];",
    "for (i = 2; i <= n; i++) {",
    "    F[i][1] = F[i-1][1] + c[i][1];",
    "    for (j = 2; j <= m; j++)",
    "        F[i][j] = max(F[i-1][j], F[i][j-1]) + c[i][j];",
    "}",
    "return F[n][m];",
  ],
  lcs: [
    "for (i = 0..m) len[i][0] = 0;  for (j = 0..n) len[0][j] = 0;",
    "for (i = 1; i <= m; i++)",
    "    for (j = 1; j <= n; j++)",
    "        if (A[i] == B[j]) len[i][j] = len[i-1][j-1] + 1;",
    "        else len[i][j] = max(len[i-1][j], len[i][j-1]);",
    "// backtrace from len[m][n] to recover the subsequence",
  ],
};

/** Coin-row: F(i) = max(c_i + F(i-2), F(i-1)). One row of the table, then a backtrace. */
export function coinRowFrames(c: number[]): Frame<DPState>[] {
  const n = c.length;
  const F: (number | null)[][] = blank(2, n + 1);
  c.forEach((v, i) => (F[0][i + 1] = v));
  const frames: Frame<DPState>[] = [];
  const labels = { rowLabels: ["c", "F"], colLabels: Array.from({ length: n + 1 }, (_, i) => String(i)) };
  const push = (s: Partial<DPState>, line: number, message: string) => frames.push({ state: { table: copyT(F), ...labels, ...s }, line, message, stats: { filled: F[1].filter((x) => x !== null).length } });
  F[1][0] = 0;
  push({ cell: [1, 0] }, 0, `F(0) = 0: no coins, no money.`);
  F[1][1] = c[0];
  push({ cell: [1, 1] }, 0, `F(1) = c₁ = ${c[0]}: with one coin, take it.`);
  for (let i = 2; i <= n; i++) {
    const take = c[i - 1] + (F[1][i - 2] as number);
    const leave = F[1][i - 1] as number;
    F[1][i] = Math.max(take, leave);
    push({ cell: [1, i], deps: [[1, i - 2], [1, i - 1], [0, i]] }, 2, `F(${i}) = max(c${i} + F(${i - 2}), F(${i - 1})) = max(${c[i - 1]} + ${F[1][i - 2]}, ${leave}) = ${F[1][i]}. ${take >= leave ? `Taking coin ${i} is better.` : `Leaving coin ${i} is better.`}`);
  }
  const picked: number[] = [];
  const trace: Cell[] = [];
  for (let i = n; i >= 1; ) {
    trace.push([1, i]);
    if (i === 1 || c[i - 1] + (F[1][i - 2] as number) >= (F[1][i - 1] as number)) {
      picked.unshift(i);
      i -= 2;
    } else i -= 1;
  }
  push({ trace, marks: picked.map((i) => [0, i] as Cell), answer: `${F[1][n]}` }, 3, `Max amount F(${n}) = ${F[1][n]}. Walking back: take coins ${picked.map((i) => `c${i} = ${c[i - 1]}`).join(", ")}. Θ(n) time and space.`);
  return frames;
}

/** C(n, k) by Pascal's rule, filling the triangle row by row. */
export function binomialFrames(n: number, k: number): Frame<DPState>[] {
  const C = blank(n + 1, k + 1);
  const frames: Frame<DPState>[] = [];
  const labels = { rowLabels: Array.from({ length: n + 1 }, (_, i) => String(i)), colLabels: Array.from({ length: k + 1 }, (_, j) => String(j)) };
  let adds = 0;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= Math.min(i, k); j++) {
      if (j === 0 || j === i) {
        C[i][j] = 1;
        frames.push({ state: { table: copyT(C), ...labels, cell: [i, j] }, line: 2, message: `C(${i}, ${j}) = 1 (${j === 0 ? "choose nothing" : "choose everything"}).`, stats: { additions: adds } });
      } else {
        C[i][j] = (C[i - 1][j - 1] as number) + (C[i - 1][j] as number);
        adds++;
        frames.push({ state: { table: copyT(C), ...labels, cell: [i, j], deps: [[i - 1, j - 1], [i - 1, j]] }, line: 3, message: `C(${i}, ${j}) = C(${i - 1}, ${j - 1}) + C(${i - 1}, ${j}) = ${C[i - 1][j - 1]} + ${C[i - 1][j]} = ${C[i][j]}: sets with element ${i}, plus sets without it.`, stats: { additions: adds } });
      }
    }
  frames.push({ state: { table: copyT(C), ...labels, trace: [[n, k]], answer: `${C[n][k]}` }, line: 4, message: `C(${n}, ${k}) = ${C[n][k]}. Θ(nk) time and space.`, stats: { additions: adds } });
  return frames;
}

/** The lecture's robot board (coins marked 1), 5 rows × 6 columns. */
export const ROBOT_BOARD = [
  [0, 0, 0, 0, 1, 0],
  [0, 1, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 1],
  [0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0],
];

export function robotFrames(board: number[][] = ROBOT_BOARD): Frame<DPState>[] {
  const n = board.length;
  const m = board[0].length;
  const F = blank(n, m);
  const frames: Frame<DPState>[] = [];
  const marks: Cell[] = [];
  board.forEach((r, i) => r.forEach((v, j) => v && marks.push([i, j])));
  const labels = { rowLabels: Array.from({ length: n }, (_, i) => String(i + 1)), colLabels: Array.from({ length: m }, (_, j) => String(j + 1)) };
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const up = i > 0 ? (F[i - 1][j] as number) : null;
      const left = j > 0 ? (F[i][j - 1] as number) : null;
      F[i][j] = Math.max(up ?? 0, left ?? 0) + board[i][j];
      const deps: Cell[] = [...(up !== null ? [[i - 1, j] as Cell] : []), ...(left !== null ? [[i, j - 1] as Cell] : [])];
      const coin = board[i][j] ? " + 1 coin here" : "";
      frames.push({
        state: { table: copyT(F), ...labels, cell: [i, j], deps, marks },
        line: i === 0 ? (j === 0 ? 0 : 1) : j === 0 ? 3 : 5,
        message: up === null && left === null ? `Start cell: F(1,1) = ${F[i][j]}.` : `F(${i + 1},${j + 1}) = ${deps.length === 2 ? `max(from above ${up}, from the left ${left})` : up !== null ? `from above ${up}` : `from the left ${left}`}${coin} = ${F[i][j]}.`,
        stats: {},
      });
    }
  const trace: Cell[] = [];
  let i = n - 1;
  let j = m - 1;
  trace.push([i, j]);
  while (i > 0 || j > 0) {
    if (i > 0 && (j === 0 || (F[i - 1][j] as number) >= (F[i][j - 1] as number))) i--;
    else j--;
    trace.unshift([i, j]);
  }
  frames.push({ state: { table: copyT(F), ...labels, trace, marks, answer: `${F[n - 1][m - 1]}` }, line: 7, message: `The robot can collect F(${n},${m}) = ${F[n - 1][m - 1]} coins. Tracing back from the corner gives one best path. Θ(nm) time.`, stats: {} });
  return frames;
}

export function lcsFrames(A: string, B: string): Frame<DPState>[] {
  const m = A.length;
  const n = B.length;
  const L = blank(m + 1, n + 1);
  for (let i = 0; i <= m; i++) L[i][0] = 0;
  for (let j = 0; j <= n; j++) L[0][j] = 0;
  const frames: Frame<DPState>[] = [];
  const labels = { rowLabels: ["", ...A.split("")], colLabels: ["", ...B.split("")] };
  frames.push({ state: { table: copyT(L), ...labels }, line: 0, message: `len(i, j) = length of an LCS of the first i letters of "${A}" and the first j letters of "${B}". Row 0 and column 0 are 0.`, stats: {} });
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      if (A[i - 1] === B[j - 1]) {
        L[i][j] = (L[i - 1][j - 1] as number) + 1;
        frames.push({ state: { table: copyT(L), ...labels, cell: [i, j], deps: [[i - 1, j - 1]] }, line: 3, message: `'${A[i - 1]}' = '${B[j - 1]}': extend the diagonal. len(${i},${j}) = ${L[i - 1][j - 1]} + 1 = ${L[i][j]}.`, stats: {} });
      } else {
        L[i][j] = Math.max(L[i - 1][j] as number, L[i][j - 1] as number);
        frames.push({ state: { table: copyT(L), ...labels, cell: [i, j], deps: [[i - 1, j], [i, j - 1]] }, line: 4, message: `'${A[i - 1]}' ≠ '${B[j - 1]}': take the better of dropping a letter from either word. len(${i},${j}) = max(${L[i - 1][j]}, ${L[i][j - 1]}) = ${L[i][j]}.`, stats: {} });
      }
    }
  const trace: Cell[] = [];
  const marks: Cell[] = [];
  let out = "";
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    trace.push([i, j]);
    if (A[i - 1] === B[j - 1]) {
      out = A[i - 1] + out;
      marks.push([i, j]);
      i--;
      j--;
    } else if ((L[i - 1][j] as number) >= (L[i][j - 1] as number)) i--;
    else j--;
  }
  frames.push({ state: { table: copyT(L), ...labels, trace, marks, answer: out }, line: 5, message: `LCS length ${L[m][n]}. Backtracing from the corner (diagonal on a match, otherwise towards the larger neighbour) spells "${out}". O(mn) time and memory.`, stats: {} });
  return frames;
}

/* ------------------------------ P and NP ------------------------------ */

export type Literal = { v: string; neg: boolean };
export type CNF = Literal[][];

/** Parse "(a ∨ ¬b) ∧ (b ∨ c)". AND: ∧ ^ &; OR: ∨ | or a spaced "v"; NOT: ¬ ! ~. */
export function parseCNF(text: string): CNF | null {
  const clauses = text.split(/[∧^&]/).map((c) => c.replace(/[()]/g, "").trim());
  if (!clauses.length || clauses.some((c) => !c)) return null; // a dangling ∧
  const out: CNF = [];
  for (const c of clauses) {
    const lits = c.split(/\s*(?:∨|\||\s+v\s+)\s*/);
    const clause: Literal[] = [];
    for (const l of lits) {
      if (!l.trim()) return null; // a dangling ∨
      const m = l.trim().match(/^([¬!~]*)\s*([A-Za-z][A-Za-z0-9_]*)$/);
      if (!m) return null;
      clause.push({ v: m[2], neg: m[1].length % 2 === 1 });
    }
    if (!clause.length) return null;
    out.push(clause);
  }
  return out;
}

export const cnfVars = (f: CNF) => [...new Set(f.flat().map((l) => l.v))].sort();
export const litText = (l: Literal) => `${l.neg ? "¬" : ""}${l.v}`;
export const clauseValue = (c: Literal[], a: Record<string, boolean>) => c.some((l) => a[l.v] !== l.neg);

/** Every assignment, with each clause's value: the brute-force search through 2^n possibilities. */
export function truthTable(f: CNF) {
  const vars = cnfVars(f);
  return Array.from({ length: 1 << vars.length }, (_, r) => {
    const a: Record<string, boolean> = {};
    vars.forEach((v, i) => (a[v] = !((r >> (vars.length - 1 - i)) & 1))); // T before F, like the slides
    const clauses = f.map((c) => clauseValue(c, a));
    return { a, clauses, sat: clauses.every(Boolean) };
  });
}

export type CliqueVertex = { id: number; clause: number; lit: Literal };

/** The 3-CNF → CLIQUE reduction: a vertex per literal, edges between compatible literals of different clauses. */
export function cliqueGraph(f: CNF) {
  const vs: CliqueVertex[] = [];
  f.forEach((c, ci) => c.forEach((lit) => vs.push({ id: vs.length, clause: ci, lit })));
  const edges: [number, number][] = [];
  for (const a of vs) for (const b of vs) if (a.id < b.id && a.clause !== b.clause && !(a.lit.v === b.lit.v && a.lit.neg !== b.lit.neg)) edges.push([a.id, b.id]);
  return { vs, edges };
}

/** Pick one vertex per clause so that all of them are pairwise connected (a k-clique), if there is one. */
export function findClique(f: CNF): number[] | null {
  const { vs, edges } = cliqueGraph(f);
  const adj = new Set(edges.map(([a, b]) => `${a}-${b}`));
  const ok = (a: number, b: number) => adj.has(`${Math.min(a, b)}-${Math.max(a, b)}`);
  const byClause = f.map((_, ci) => vs.filter((v) => v.clause === ci).map((v) => v.id));
  const pick: number[] = [];
  const go = (ci: number): boolean => {
    if (ci === f.length) return true;
    for (const v of byClause[ci])
      if (pick.every((p) => ok(p, v))) {
        pick.push(v);
        if (go(ci + 1)) return true;
        pick.pop();
      }
    return false;
  };
  return go(0) ? pick : null;
}

/* ---------------------------- shortest paths ---------------------------- */

export type WEdge = { from: number; to: number; w: number };
export type DijkstraState = {
  d: number[];
  pi: (number | null)[];
  S: number[];
  u?: number;
  relaxing?: [number, number];
  improved?: boolean;
  rows: (number | null)[][]; // d after each extraction, for the table (null = already in S)
};

export const DIJKSTRA_CODE = [
  "d[s] ← 0",
  "for each v ∈ V − {s} do d[v] ← ∞",
  "S ← ∅",
  "Q ← V                      ⊳ Q is a priority queue maintaining V − S",
  "while Q ≠ ∅",
  "    do u ← EXTRACT-MIN(Q)",
  "       S ← S ∪ {u}",
  "       for each v ∈ Adj[u]",
  "           do if d[v] > d[u] + w(u, v)",
  "               then d[v] ← d[u] + w(u, v)      ⊳ relaxation step (implicit DECREASE-KEY)",
  "                    π[v] ← u",
];

export function dijkstraFrames(n: number, edges: WEdge[], directed: boolean, s: number, names: string[]): Frame<DijkstraState>[] {
  const adj: [number, number][][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    adj[e.from].push([e.to, e.w]);
    if (!directed) adj[e.to].push([e.from, e.w]);
  }
  const d = Array<number>(n).fill(Infinity);
  const pi: (number | null)[] = Array(n).fill(null);
  const S: number[] = [];
  const rows: (number | null)[][] = [];
  const frames: Frame<DijkstraState>[] = [];
  let relaxations = 0;
  const push = (s2: Partial<DijkstraState>, line: number, message: string) =>
    frames.push({ state: { d: [...d], pi: [...pi], S: [...S], rows: rows.map((r) => [...r]), ...s2 }, line, message, stats: { "in S": S.length, relaxations } });
  d[s] = 0;
  push({}, 1, `Initialize: d[${names[s]}] = 0 and every other d = ∞. S is empty and Q holds every vertex.`);
  const nm = (v: number) => names[v];
  while (S.length < n) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!S.includes(v) && (u < 0 || d[v] < d[u])) u = v;
    if (!isFinite(d[u])) break;
    S.push(u);
    push({ u }, 6, `"${nm(u)}" ← EXTRACT-MIN(Q): it has the smallest estimate, d = ${d[u]}, so that is its true distance. S = {${S.map(nm).join(", ")}}.`);
    for (const [v, w] of adj[u]) {
      if (S.includes(v)) continue;
      relaxations++;
      const better = d[u] + w < d[v];
      const old = d[v];
      if (better) {
        d[v] = d[u] + w;
        pi[v] = u;
      }
      push({ u, relaxing: [u, v], improved: better }, better ? 9 : 8, `Relax (${nm(u)}, ${nm(v)}): d[${nm(u)}] + ${w} = ${d[u] + w} ${better ? `< ${old === Infinity ? "∞" : old}, so d[${nm(v)}] becomes ${d[v]} and π[${nm(v)}] = ${nm(u)}` : `≥ ${old}, so nothing changes`}.`);
    }
    rows.push(d.map((x, v) => (S.includes(v) && v !== u ? null : x)));
  }
  push({}, 4, `Q is empty. Shortest distances from ${nm(s)}: ${names.map((x, v) => `${x} = ${d[v]}`).join(", ")}. Following π backwards gives each shortest path.`);
  return frames;
}

/* --------------------------- greedy algorithms --------------------------- */

/** Largest coin that doesn't overshoot, again and again. Returns how many of each coin (largest first). */
export function greedyChange(amount: number, coins: number[]): Map<number, number> {
  const out = new Map<number, number>();
  let left = amount;
  for (const c of [...coins].sort((a, b) => b - a)) {
    const k = Math.floor(left / c);
    if (k) out.set(c, k);
    left -= k * c;
  }
  return out;
}

/** Fewest coins by dynamic programming, to show when greedy isn't optimal. */
export function optimalChange(amount: number, coins: number[]): Map<number, number> {
  const best = Array<number>(amount + 1).fill(Infinity);
  const last = Array<number>(amount + 1).fill(0);
  best[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const c of coins)
      if (c <= a && best[a - c] + 1 < best[a]) {
        best[a] = best[a - c] + 1;
        last[a] = c;
      }
  const out = new Map<number, number>();
  for (let a = amount; a > 0 && isFinite(best[a]); a -= last[a]) out.set(last[a], (out.get(last[a]) ?? 0) + 1);
  return new Map([...out].sort((x, y) => y[0] - x[0]));
}

export const countCoins = (m: Map<number, number>) => [...m.values()].reduce((s, k) => s + k, 0);

/** Assign each job, in the given order, to whichever processor is free first. */
export function scheduleInOrder(jobs: number[], p: number): number[][] {
  const lanes: number[][] = Array.from({ length: p }, () => []);
  const load = Array<number>(p).fill(0);
  for (const j of jobs) {
    const i = load.indexOf(Math.min(...load));
    lanes[i].push(j);
    load[i] += j;
  }
  return lanes;
}

/** Best possible finishing time by trying every assignment (fine for the lecture's 9 jobs on 3 processors). */
export function scheduleOptimal(jobs: number[], p: number): number[][] {
  const sorted = [...jobs].sort((a, b) => b - a);
  let best = Infinity;
  let bestLanes: number[][] = [];
  const lanes: number[][] = Array.from({ length: p }, () => []);
  const load = Array<number>(p).fill(0);
  const go = (i: number) => {
    if (Math.max(...load) >= best) return;
    if (i === sorted.length) {
      best = Math.max(...load);
      bestLanes = lanes.map((l) => [...l]);
      return;
    }
    const seen = new Set<number>();
    for (let k = 0; k < p; k++) {
      if (seen.has(load[k])) continue; // processors with equal load are interchangeable
      seen.add(load[k]);
      lanes[k].push(sorted[i]);
      load[k] += sorted[i];
      go(i + 1);
      load[k] -= sorted[i];
      lanes[k].pop();
    }
  };
  go(0);
  return bestLanes;
}

export type HuffNode = { id: number; label: string; freq: number; left?: HuffNode; right?: HuffNode };
export type HuffState = { forest: HuffNode[]; merged?: number; picked?: number[]; codes?: Record<string, string> };

export const HUFFMAN_CODE = [
  "HUFFMAN(C)",
  "  n = |C|;  Q = C            ⊳ a min-priority queue keyed on frequency",
  "  for i = 1 to n − 1",
  "      allocate a new node z",
  "      z.left = x = EXTRACT-MIN(Q)",
  "      z.right = y = EXTRACT-MIN(Q)",
  "      z.f = x.f + y.f",
  "      INSERT(Q, z)",
  "  return EXTRACT-MIN(Q)       ⊳ the root of the tree",
];

export function huffmanCodes(root: HuffNode): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (n: HuffNode, code: string) => {
    if (!n.left) out[n.label] = code || "0";
    else {
      walk(n.left, code + "0");
      walk(n.right!, code + "1");
    }
  };
  walk(root, "");
  return out;
}

/** Repeatedly merge the two least frequent trees. Ties go to the tree that was merged first. */
export function huffmanFrames(chars: string[], freqs: number[]): Frame<HuffState>[] {
  let forest: HuffNode[] = chars.map((c, i) => ({ id: i, label: c, freq: freqs[i] }));
  let next = chars.length;
  const frames: Frame<HuffState>[] = [];
  const order = (a: HuffNode, b: HuffNode) => a.freq - b.freq || (b.left ? 1 : 0) - (a.left ? 1 : 0) || a.id - b.id;
  frames.push({ state: { forest: [...forest] }, line: 1, message: `Start with one single-node tree per character, keyed on its frequency.`, stats: { trees: forest.length } });
  while (forest.length > 1) {
    const [x, y] = [...forest].sort(order);
    frames.push({ state: { forest: [...forest], picked: [x.id, y.id] }, line: 4, message: `The two smallest are ${x.label} (${x.freq}) and ${y.label} (${y.freq}).`, stats: { trees: forest.length } });
    const z: HuffNode = { id: next++, label: x.label + y.label, freq: x.freq + y.freq, left: x, right: y };
    forest = [...forest.filter((t) => t !== x && t !== y), z];
    frames.push({ state: { forest: [...forest], merged: z.id }, line: 7, message: `Merge them under a new node with frequency ${x.freq} + ${y.freq} = ${z.freq}. ${x.label} is on the 0 side and ${y.label} on the 1 side.`, stats: { trees: forest.length } });
  }
  const codes = huffmanCodes(forest[0]);
  const total = freqs.reduce((s, f) => s + f, 0);
  const avg = chars.reduce((s, c, i) => s + freqs[i] * codes[c].length, 0) / total;
  frames.push({ state: { forest, codes }, line: 8, message: `One tree left. Reading 0 for left and 1 for right gives the codes: ${chars.map((c) => `${c}=${codes[c]}`).join(", ")}. Average ${avg.toFixed(2)} bits per character.`, stats: { trees: 1 } });
  return frames;
}

export type Activity = { s: number; f: number };
export type ActivityState = { acts: Activity[]; chosen: number[]; at?: number; last?: number; rejected?: number };

export const ACTIVITY_CODE = [
  "GREEDY-ACTIVITY-SELECTOR(s, f)   ⊳ activities sorted by finish time",
  "  n = length[s]",
  "  A = {a1};  i = 1",
  "  for m = 2 to n",
  "      if s[m] ≥ f[i]             ⊳ starts after the last chosen one ends",
  "          A = A ∪ {am};  i = m",
  "  return A",
];

export const CLRS_ACTIVITIES: Activity[] = [
  { s: 1, f: 4 }, { s: 3, f: 5 }, { s: 0, f: 6 }, { s: 5, f: 7 }, { s: 3, f: 9 }, { s: 5, f: 9 },
  { s: 6, f: 10 }, { s: 8, f: 11 }, { s: 8, f: 12 }, { s: 2, f: 14 }, { s: 12, f: 16 },
];

export function activityFrames(acts: Activity[]): Frame<ActivityState>[] {
  const a = [...acts].sort((x, y) => x.f - y.f);
  const frames: Frame<ActivityState>[] = [];
  const chosen = [0];
  let i = 0;
  frames.push({ state: { acts: a, chosen: [...chosen], last: 0 }, line: 2, message: `Sort by finish time. Greedy choice: take a1 = [${a[0].s}, ${a[0].f}), the activity that finishes first. It leaves the most room for the rest.`, stats: { chosen: 1 } });
  for (let m = 1; m < a.length; m++) {
    if (a[m].s >= a[i].f) {
      chosen.push(m);
      i = m;
      frames.push({ state: { acts: a, chosen: [...chosen], at: m, last: i }, line: 5, message: `a${m + 1} = [${a[m].s}, ${a[m].f}) starts at ${a[m].s} ≥ ${a[chosen[chosen.length - 2]].f}, when the last chosen activity ends. Take it.`, stats: { chosen: chosen.length } });
    } else
      frames.push({ state: { acts: a, chosen: [...chosen], at: m, last: i, rejected: m }, line: 4, message: `a${m + 1} = [${a[m].s}, ${a[m].f}) starts at ${a[m].s} < ${a[i].f}: it clashes with a${i + 1}. Skip it.`, stats: { chosen: chosen.length } });
  }
  frames.push({ state: { acts: a, chosen, last: i }, line: 6, message: `Done: {${chosen.map((c) => `a${c + 1}`).join(", ")}}, ${chosen.length} compatible activities. One pass, so Θ(n) after sorting.`, stats: { chosen: chosen.length } });
  return frames;
}

/* ------------------------------ skip lists ------------------------------ */

export type Tower = { key: number; height: number };
/** `at` is the column being looked at (-1 = header), on `level`; `path` is every [column, level] visited. */
export type SkipState = { towers: Tower[]; level?: number; at?: number; path: [number, number][]; found?: number; flips?: string };
export type SkipOp = { op: "search" | "insert" | "delete"; key: number };

export const SKIP_CODE = [
  "find(k):",
  "  start at the header, on the top level",
  "  if k = key: done!",
  "  if k < next key (or next is the sentinel ∞): go down a level",
  "  if k ≥ next key: go right",
  "",
  "insert(k):",
  "  find k; insert the node into level 0",
  "  i = 1",
  "  while FLIP() == \"heads\": insert the node into level i; i++",
  "",
  "delete(k):",
  "  find k; unlink it from every level it is on",
];

/** Heights of a perfect skip list: the i-th key (1-based) reaches 1 + (trailing zeros of i) levels. */
export function perfectHeights(n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    let h = 1;
    let v = i + 1;
    while (v % 2 === 0) {
      h++;
      v /= 2;
    }
    return h;
  });
}

export function skipFrames(keys: number[], heights: number[], ops: SkipOp[], seed = 11): Frame<SkipState>[] {
  let towers: Tower[] = keys.map((key, i) => ({ key, height: heights[i] ?? 1 })).sort((a, b) => a.key - b.key);
  const frames: Frame<SkipState>[] = [];
  const flip = rng(seed);
  let comparisons = 0;
  const top = () => Math.max(1, ...towers.map((t) => t.height));
  const push = (s: Partial<SkipState>, line: number, message: string) =>
    frames.push({ state: { towers: towers.map((t) => ({ ...t })), path: [], ...s }, line, message, stats: { comparisons, levels: top() } });

  push({}, 1, `${towers.length} keys on ${top()} levels. The header and the ∞ sentinel are on every level.`);

  /** Walk down to level 0, returning the last column (< k) on each level; records frames when `msg`. */
  const walk = (k: number, label: string, path: [number, number][]) => {
    const preds: number[] = [];
    let col = -1;
    for (let lv = top() - 1; lv >= 0; lv--) {
      for (;;) {
        let nxt = col + 1;
        while (nxt < towers.length && towers[nxt].height <= lv) nxt++;
        comparisons++;
        const nk = nxt < towers.length ? towers[nxt].key : Infinity;
        path.push([col, lv]);
        if (nk === k && label === "search") {
          path.push([nxt, lv]);
          push({ level: lv, at: nxt, path: [...path], found: nxt }, 2, `Level ${lv}: ${k} = ${nk}. Found it!`);
          return { preds, foundAt: nxt };
        }
        if (k < nk || (label !== "search" && k === nk)) {
          const why = k === nk ? `the next key is ${k} itself; stop just before it, since we need its predecessor on every level` : `${k} < next key ${nk === Infinity ? "∞" : nk}`;
          push({ level: lv, at: col, path: [...path] }, 3, `Level ${lv}: ${why}, so go down a level.`);
          break;
        }
        col = nxt;
        push({ level: lv, at: col, path: [...path] }, 4, `Level ${lv}: ${k} ≥ next key ${nk}, so go right to ${nk}.`);
      }
      preds[lv] = col;
    }
    return { preds, foundAt: -1 };
  };

  for (const o of ops) {
    const path: [number, number][] = [];
    if (o.op === "search") {
      const r = walk(o.key, "search", path);
      if (r.foundAt < 0) push({ path }, 3, `Fell off the bottom level: ${o.key} is not in the skip list.`);
    } else if (o.op === "insert") {
      if (towers.some((t) => t.key === o.key)) continue;
      walk(o.key, "insert", path);
      let h = 1;
      let flips = "";
      while (h < 8) {
        const heads = flip() < 0.5;
        flips += heads ? "H" : "T";
        if (!heads) break;
        h++;
      }
      towers = [...towers, { key: o.key, height: h }].sort((a, b) => a.key - b.key);
      const at = towers.findIndex((t) => t.key === o.key);
      push({ at, path, found: at, flips }, 9, `Insert ${o.key} into level 0 after the last node we visited. Coin flips: ${flips.split("").join(", ")}, so it is promoted ${h - 1} time${h === 2 ? "" : "s"} and stands on ${h} level${h === 1 ? "" : "s"}.`);
    } else {
      const idx = towers.findIndex((t) => t.key === o.key);
      walk(o.key, "delete", path);
      if (idx < 0) {
        push({ path }, 12, `${o.key} is not in the skip list.`);
        continue;
      }
      push({ at: idx, path, found: idx }, 12, `Found ${o.key}. Unlink it from all ${towers[idx].height} of its levels, like deleting from ${towers[idx].height} linked lists.`);
      towers = towers.filter((_, i) => i !== idx);
      push({ path: [] }, 12, `${o.key} is gone. Nothing else moves.`);
    }
  }
  return frames;
}

/* ---------------------- augmented data structures ---------------------- */

/** A small fixed tree for the augmentation examples. `lo`/`hi` make it an interval tree. */
export type ATree = { key: string; lo?: number; hi?: number; left?: ATree; right?: ATree };
export type AugNode = { id: string; label: string; extra: string; x: number; y: number; parent?: string };
export type PathState = { path: string[]; at?: string; found?: string; none?: boolean };

/** The lecture's OS-tree: subtree sizes in every node. */
export const OS_TREE: ATree = {
  key: "M",
  left: { key: "C", left: { key: "A" }, right: { key: "F", left: { key: "D" }, right: { key: "H" } } },
  right: { key: "P", left: { key: "N" }, right: { key: "Q" } },
};

/** The lecture's interval tree, keyed on low endpoints. */
export const INTERVAL_TREE: ATree = {
  key: "17,19", lo: 17, hi: 19,
  left: { key: "5,11", lo: 5, hi: 11, left: { key: "4,8", lo: 4, hi: 8 }, right: { key: "15,18", lo: 15, hi: 18, left: { key: "7,10", lo: 7, hi: 10 } } },
  right: { key: "22,23", lo: 22, hi: 23 },
};

export const size = (t?: ATree): number => (t ? 1 + size(t.left) + size(t.right) : 0);
export const maxHigh = (t?: ATree): number => (t ? Math.max(t.hi ?? -Infinity, maxHigh(t.left), maxHigh(t.right)) : -Infinity);

/** Lay the tree out (in-order rank → x) with each node's augmented field: size, or m for interval trees. */
export function layoutAug(t: ATree): AugNode[] {
  const out: AugNode[] = [];
  let rank = 0;
  const walk = (n: ATree | undefined, d: number, parent?: string) => {
    if (!n) return;
    walk(n.left, d + 1, n.key);
    out.push({ id: n.key, label: n.lo !== undefined ? `[${n.lo},${n.hi}]` : n.key, extra: n.lo !== undefined ? `m=${maxHigh(n)}` : `${size(n)}`, x: 40 + rank++ * 62, y: 30 + d * 68, parent });
    walk(n.right, d + 1, n.key);
  };
  walk(t, 0);
  return out;
}

export const OS_SELECT_CODE = [
  "OS-SELECT(x, i)        ⊳ i-th smallest element in the subtree rooted at x",
  "  k ← size[left[x]] + 1      ⊳ k = rank(x)",
  "  if i = k then return x",
  "  if i < k",
  "    then return OS-SELECT(left[x], i)",
  "    else return OS-SELECT(right[x], i − k)",
];

export function osSelectFrames(t: ATree, i0: number): Frame<PathState>[] {
  const frames: Frame<PathState>[] = [];
  const path: string[] = [];
  let x: ATree | undefined = t;
  let i = i0;
  frames.push({ state: { path: [] }, line: 0, message: `OS-SELECT(root, ${i0}): find the ${i0}${ord(i0)} smallest key using only the subtree sizes.`, stats: { i } });
  while (x) {
    path.push(x.key);
    const k = size(x.left) + 1;
    if (i === k) {
      frames.push({ state: { path: [...path], at: x.key, found: x.key }, line: 2, message: `At ${x.key}: k = size(left) + 1 = ${k} = i. Return ${x.key}.`, stats: { i, k } });
      break;
    }
    if (i < k) {
      frames.push({ state: { path: [...path], at: x.key }, line: 4, message: `At ${x.key}: k = size(left) + 1 = ${k}. i = ${i} < ${k}, so the answer is in the left subtree. Keep i = ${i}.`, stats: { i, k } });
      x = x.left;
    } else {
      frames.push({ state: { path: [...path], at: x.key }, line: 5, message: `At ${x.key}: k = ${k}. i = ${i} > ${k}, so go right and skip the ${k} smaller keys: i = ${i} − ${k} = ${i - k}.`, stats: { i, k } });
      i -= k;
      x = x.right;
    }
  }
  return frames;
}

export const INTERVAL_SEARCH_CODE = [
  "INTERVAL-SEARCH(i)",
  "  x ← root",
  "  while x ≠ NIL and (low[i] > high[int[x]] or low[int[x]] > high[i])",
  "    do ⊳ i and int[x] don't overlap",
  "      if left[x] ≠ NIL and low[i] ≤ m[left[x]]",
  "        then x ← left[x]",
  "        else x ← right[x]",
  "  return x",
];

export function intervalSearchFrames(t: ATree, lo: number, hi: number): Frame<PathState>[] {
  const frames: Frame<PathState>[] = [];
  const path: string[] = [];
  let x: ATree | undefined = t;
  frames.push({ state: { path: [] }, line: 1, message: `INTERVAL-SEARCH([${lo},${hi}]): find any stored interval that overlaps it.`, stats: {} });
  while (x) {
    path.push(x.key);
    const overlap = !(lo > x.hi! || x.lo! > hi);
    if (overlap) {
      frames.push({ state: { path: [...path], at: x.key, found: x.key }, line: 7, message: `[${lo},${hi}] and [${x.lo},${x.hi}] overlap. Return [${x.lo},${x.hi}].`, stats: {} });
      return frames;
    }
    const goLeft = !!x.left && lo <= maxHigh(x.left);
    frames.push({
      state: { path: [...path], at: x.key },
      line: goLeft ? 5 : 6,
      message: `[${lo},${hi}] and [${x.lo},${x.hi}] don't overlap. ${x.left ? `${lo} ${goLeft ? "≤" : ">"} m[left] = ${maxHigh(x.left)}` : "There is no left child"}, so go ${goLeft ? "left" : "right"}.`,
      stats: {},
    });
    x = goLeft ? x.left : x.right;
  }
  frames.push({ state: { path: [...path], none: true }, line: 7, message: `x = NIL, so no interval that overlaps [${lo},${hi}] exists.`, stats: {} });
  return frames;
}

/* ------------------------------ hashing ------------------------------ */

export type HashMode = "chaining" | "linear" | "quadratic" | "double";
export type Second = { kind: "prime"; R: number } | { kind: "mod"; mp: number };
export type HashConfig = { m: number; mode: HashMode; c1?: number; c2?: number; second?: Second; h1Mod?: number };
export type HashOp = { op: "insert" | "search" | "delete"; key: number };
export const DELETED = "DEL" as const;
export type Slot = number | null | typeof DELETED;
export type HashState = { slots: Slot[]; chains: number[][]; probe?: number; path: number[]; hit?: number; bad?: number; op?: HashOp };

export const HASH_PSEUDO = [
  "HASH-INSERT(T, k)",
  "  i = 0",
  "  repeat j = h(k, i)",
  "    if T[j] == NIL or T[j] == DELETED",
  "      T[j] = k; return j",
  "    else i = i + 1",
  "  until i == m",
  "  error \"hash table overflow\"",
  "",
  "HASH-SEARCH(T, k)          ⊳ delete = search, then mark DELETED",
  "  i = 0",
  "  repeat j = h(k, i)",
  "    if T[j] == k return j",
  "    i = i + 1",
  "  until T[j] == NIL or i == m",
  "  return NIL",
];

export const CHAIN_PSEUDO = [
  "CHAINED-INSERT(T, x)",
  "  insert x at the head of list T[h(x.key)]",
  "",
  "CHAINED-SEARCH(T, k)",
  "  search for k in list T[h(k)]",
  "",
  "CHAINED-DELETE(T, x)",
  "  delete x from list T[h(x.key)]",
];

export function h1(k: number, cfg: HashConfig) {
  return k % (cfg.h1Mod ?? cfg.m);
}

export function h2(k: number, s: Second) {
  return s.kind === "prime" ? s.R - (k % s.R) : 1 + (k % s.mp);
}

/** The i-th slot in k's probe sequence. */
export function probeAt(k: number, i: number, cfg: HashConfig): number {
  const base = h1(k, cfg);
  switch (cfg.mode) {
    case "chaining":
    case "linear":
      return (base + i) % cfg.m;
    case "quadratic":
      return (base + (cfg.c1 ?? 0) * i + (cfg.c2 ?? 1) * i * i) % cfg.m;
    case "double":
      return (base + i * h2(k, cfg.second ?? { kind: "mod", mp: cfg.m - 1 })) % cfg.m;
  }
}

/** Human-readable formula for one probe, e.g. "(62 + 2·2) mod 11 = 0". */
export function probeText(k: number, i: number, cfg: HashConfig): string {
  const base = h1(k, cfg);
  const pre = cfg.h1Mod && cfg.h1Mod !== cfg.m ? `${base}` : `${k}`;
  const v = probeAt(k, i, cfg);
  switch (cfg.mode) {
    case "chaining":
      return `${k} mod ${cfg.m} = ${v}`;
    case "linear":
      return `(${pre} + ${i}) mod ${cfg.m} = ${v}`;
    case "quadratic": {
      const c1 = cfg.c1 ?? 0;
      const c2 = cfg.c2 ?? 1;
      const lin = c1 ? ` + ${c1 === 1 ? "" : `${c1}·`}${i}` : "";
      return `(${pre}${lin} + ${c2 === 1 ? "" : `${c2}·`}${i}²) mod ${cfg.m} = ${v}`;
    }
    case "double": {
      const d = h2(k, cfg.second ?? { kind: "mod", mp: cfg.m - 1 });
      return `(${pre} + ${i}·${d}) mod ${cfg.m} = ${v}`;
    }
  }
}

/** Run a list of insert / search / delete operations on a hash table and record every probe. */
export function hashFrames(cfg: HashConfig, ops: HashOp[], initial: Record<number, number> = {}): Frame<HashState>[] {
  const slots: Slot[] = Array(cfg.m).fill(null);
  const chains: number[][] = Array.from({ length: cfg.m }, () => []);
  Object.entries(initial).forEach(([i, k]) => (slots[Number(i)] = k));
  const frames: Frame<HashState>[] = [];
  let probes = 0;
  let collisions = 0;
  const push = (s: Partial<HashState>, message: string, line = 0) =>
    frames.push({ state: { slots: [...slots], chains: chains.map((c) => [...c]), path: [], ...s }, line, message, stats: { probes, collisions } });

  const kind = cfg.mode === "chaining" ? "separate chaining" : cfg.mode === "double" ? "double hashing" : `${cfg.mode} probing`;
  push({}, `Table of size m = ${cfg.m}, using ${kind}.`);

  for (const op of ops) {
    const { key } = op;
    if (cfg.mode === "chaining") {
      const j = h1(key, cfg);
      probes++;
      const chain = chains[j];
      if (op.op === "insert") {
        if (chain.length) collisions++;
        chain.unshift(key);
        push({ probe: j, path: [j], hit: j, op }, `Insert ${key}: h(${key}) = ${probeText(key, 0, cfg)}. ${chain.length > 1 ? `Collision, so add it to the front of the chain at slot ${j}.` : `Slot ${j} starts a chain.`}`, 1);
      } else {
        const at = chain.indexOf(key);
        if (op.op === "delete" && at >= 0) chain.splice(at, 1);
        push({ probe: j, path: [j], hit: at >= 0 ? j : undefined, bad: at < 0 ? j : undefined, op }, `${op.op === "search" ? "Search" : "Delete"} ${key}: walk the chain at slot ${j}. ${at >= 0 ? (op.op === "search" ? `Found it after ${at + 1} comparison${at ? "s" : ""}.` : "Found it and unlinked it.") : "It's not there."}`, op.op === "search" ? 4 : 7);
      }
      continue;
    }

    const path: number[] = [];
    let done = false;
    for (let i = 0; i < cfg.m && !done; i++) {
      const j = probeAt(key, i, cfg);
      path.push(j);
      probes++;
      const s = slots[j];
      const f = `h(${key}, ${i}) = ${probeText(key, i, cfg)}`;
      if (op.op === "insert") {
        if (s === null || s === DELETED) {
          slots[j] = key;
          push({ probe: j, path: [...path], hit: j, op }, `Insert ${key}: ${f}. ${s === DELETED ? "A \"deleted\" slot counts as free" : "Empty"}, so put ${key} here.`, 4);
          done = true;
        } else {
          collisions++;
          push({ probe: j, path: [...path], bad: j, op }, `Insert ${key}: ${f}. Occupied by ${s}: collision, so try the next probe.`, 5);
        }
      } else if (s === key) {
        if (op.op === "delete") slots[j] = DELETED;
        push({ probe: j, path: [...path], hit: j, op }, `${op.op === "search" ? "Search" : "Delete"} ${key}: ${f}. Found it${op.op === "delete" ? `, and marked the slot "deleted" instead of emptying it, so later searches don't stop here` : ""}.`, 12);
        done = true;
      } else if (s === null) {
        push({ probe: j, path: [...path], bad: j, op }, `${op.op === "search" ? "Search" : "Delete"} ${key}: ${f}. An empty slot ends the search: ${key} is not in the table.`, 15);
        done = true;
      } else {
        push({ probe: j, path: [...path], bad: j, op }, `${op.op === "search" ? "Search" : "Delete"} ${key}: ${f}. ${s === DELETED ? `A "deleted" marker: keep going, ${key} might be further along.` : `Holds ${s}, not ${key}: keep probing.`}`, 13);
      }
    }
    if (!done) push({ path, op }, `${op.op === "insert" ? `Unable to insert ${key}` : `${key} not found`}: all ${cfg.m} probes tried${op.op === "insert" ? " and none hit a free slot. Hash table overflow." : "."}`, op.op === "insert" ? 7 : 15);
  }
  push({}, `Done. ${probes} probes in total, ${collisions} collisions.`);
  return frames;
}

/* --------------------------- hash functions --------------------------- */

export const hashDivision = (k: number, m: number) => k % m;
export const hashMultiplication = (k: number, m: number, A = 0.618033) => Math.floor(m * ((k * A) % 1));

/** Square the key and take the middle r digits. */
export function hashMidSquare(k: number, r: number) {
  const sq = String(k * k);
  const start = Math.max(0, Math.floor((sq.length - r) / 2));
  return { square: sq, digits: sq.slice(start, start + r), start };
}

/** Fold-shifting and fold-boundary into parts of `size` digits, then mod 10^size. */
export function hashFolding(k: number, size: number) {
  const s = String(k);
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += size) parts.push(s.slice(i, i + size));
  const mod = Math.pow(10, size);
  const shift = parts.reduce((t, p) => t + Number(p), 0);
  const boundaryParts = parts.map((p, i) => (i === 0 || i === parts.length - 1 ? p.split("").reverse().join("") : p));
  const boundary = boundaryParts.reduce((t, p) => t + Number(p), 0);
  return { parts, shift, shiftHash: shift % mod, boundaryParts, boundary, boundaryHash: boundary % mod };
}

/* ------------------------- amortized analysis ------------------------- */

/** Cost of each append to a doubling dynamic array that starts with capacity 1: 1 for the write, plus the copy when full. */
export function doublingCosts(n: number): { cost: number; size: number; copied: number }[] {
  const out: { cost: number; size: number; copied: number }[] = [];
  let cap = 1;
  for (let i = 1; i <= n; i++) {
    let copied = 0;
    if (i - 1 === cap) {
      copied = cap;
      cap *= 2;
    }
    out.push({ cost: 1 + copied, size: cap, copied });
  }
  return out;
}

/* ------------------------- order statistics ------------------------- */

export type SelectState = ArrayState & { want: number; low?: [number, number]; high?: [number, number] };

export const CPP_SELECT = [
  "int randSelect(int A[], int p, int q, int i) {  // i-th smallest of A[p..q]",
  "    if (p == q) return A[p];",
  "    int r = randPartition(A, p, q);",
  "    int k = r - p + 1;                         // k = rank of A[r]",
  "    if (i == k) return A[r];",
  "    if (i < k)",
  "        return randSelect(A, p, r - 1, i);",
  "    else",
  "        return randSelect(A, r + 1, q, i - k);",
  "}",
];

/** RAND-SELECT from the lecture: partition, then recurse into the one side that holds the answer. */
export function selectFrames(input: number[], want: number, randomized = false, seed = 3): Frame<SelectState>[] {
  const A = [...input];
  const frames: Frame<SelectState>[] = [];
  const rand = rng(seed);
  let comparisons = 0;
  const push = (s: Partial<SelectState>, line: number, message: string, i: number) =>
    frames.push({ state: { array: [...A], want: i, ...s }, line, message, stats: { comparisons } });

  let p = 0;
  let q = A.length - 1;
  let i = want;
  push({ range: [p, q] }, 0, `Find the ${want}${ord(want)} smallest of ${A.length} numbers, without sorting all of them.`, i);
  for (;;) {
    if (p === q) {
      push({ range: [p, q], found: p }, 1, `Only one element left, so it's the answer: ${A[p]}.`, i);
      break;
    }
    if (randomized) {
      const k = p + Math.floor(rand() * (q - p + 1));
      [A[p], A[k]] = [A[k], A[p]];
    }
    const x = A[p];
    let m = p;
    for (let j = p + 1; j <= q; j++) {
      comparisons++;
      if (A[j] <= x) {
        m++;
        [A[m], A[j]] = [A[j], A[m]];
      }
    }
    [A[p], A[m]] = [A[m], A[p]];
    const r = m;
    const k = r - p + 1;
    push({ range: [p, q], pivot: r, low: [p, r - 1], high: [r + 1, q] }, 3, `Partition A[${p}..${q}] around ${x}. It lands at index ${r}, so it is the ${k}${ord(k)} smallest of this piece.`, i);
    if (i === k) {
      push({ range: [p, q], found: r }, 4, `We wanted rank ${i}, and the pivot has rank ${k}. Found it: ${A[r]}.`, i);
      break;
    }
    if (i < k) {
      push({ range: [p, r - 1], low: [p, r - 1] }, 6, `${i} < ${k}: the answer is in the lower part. Keep looking for the ${i}${ord(i)} smallest there, and throw the rest away.`, i);
      q = r - 1;
    } else {
      push({ range: [r + 1, q], high: [r + 1, q] }, 8, `${i} > ${k}: the answer is in the upper part. The ${k} elements up to the pivot are all smaller, so look for the ${i} − ${k} = ${i - k}${ord(i - k)} smallest there.`, i);
      p = r + 1;
      i -= k;
    }
  }
  return frames;
}

function ord(n: number) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

/** Groups of 5, each sorted, with the groups ordered by their medians: the picture from the lecture. */
export function medianOfMedians(nums: number[]) {
  const groups: number[][] = [];
  for (let g = 0; g + 5 <= nums.length; g += 5) groups.push(nums.slice(g, g + 5).sort((a, b) => a - b));
  groups.sort((a, b) => a[2] - b[2]);
  const x = groups[Math.floor((groups.length - 1) / 2)][2];
  const pivotCol = Math.floor((groups.length - 1) / 2);
  return { groups, x, pivotCol, guaranteedEach: 3 * Math.floor(nums.length / 10) };
}

/* --------------------------- decision tree --------------------------- */

/** Node of the lecture's decision tree for sorting ⟨a1, a2, a3⟩: an i:j comparison, or a leaf permutation. */
export type DNode = { id: string; cmp?: [number, number]; leaf?: [number, number, number]; left?: DNode; right?: DNode };

export const DECISION_TREE_3: DNode = {
  id: "r", cmp: [1, 2],
  left: { id: "l", cmp: [2, 3], left: { id: "ll", leaf: [1, 2, 3] }, right: { id: "lr", cmp: [1, 3], left: { id: "lrl", leaf: [1, 3, 2] }, right: { id: "lrr", leaf: [3, 1, 2] } } },
  right: { id: "R", cmp: [1, 3], left: { id: "Rl", leaf: [2, 1, 3] }, right: { id: "Rr", cmp: [2, 3], left: { id: "Rrl", leaf: [2, 3, 1] }, right: { id: "Rrr", leaf: [3, 2, 1] } } },
};

/** The ids on the path the input takes: left when a_i ≤ a_j, right otherwise. */
export function decisionPath(a: [number, number, number], node: DNode = DECISION_TREE_3): string[] {
  const path = [node.id];
  let cur = node;
  while (cur.cmp) {
    const [i, j] = cur.cmp;
    cur = a[i - 1] <= a[j - 1] ? cur.left! : cur.right!;
    path.push(cur.id);
  }
  return path;
}

/** ⌈lg(n!)⌉: the fewest comparisons any comparison sort needs in the worst case. */
export function minComparisons(n: number): number {
  let lg = 0;
  for (let i = 2; i <= n; i++) lg += Math.log2(i);
  return Math.ceil(lg - 1e-9);
}

/* --------------------------- counting sort --------------------------- */

export type CountState = { A: number[]; C: number[]; B: (number | null)[]; loop: number; aAt?: number; cAt?: number; bAt?: number };

export const CPP_COUNTING_SORT = [
  "void countingSort(int A[], int B[], int n, int k) {  // keys 1..k",
  "    int C[k + 1];",
  "    for (int i = 1; i <= k; i++) C[i] = 0;              // loop 1",
  "    for (int j = 1; j <= n; j++) C[A[j]]++;             // loop 2: C[i] = |{key = i}|",
  "    for (int i = 2; i <= k; i++) C[i] += C[i - 1];      // loop 3: C[i] = |{key ≤ i}|",
  "    for (int j = n; j >= 1; j--) {                      // loop 4",
  "        B[C[A[j]]] = A[j];",
  "        C[A[j]]--;",
  "    }",
  "}",
];

/** Counting sort exactly as in the lecture, with 1-based A, B and C shown as 0-based arrays. */
export function countingSortFrames(A: number[], k: number): Frame<CountState>[] {
  const n = A.length;
  const C = Array<number>(k).fill(0); // C[v - 1] holds the lecture's C[v]
  const B: (number | null)[] = Array(n).fill(null);
  const frames: Frame<CountState>[] = [];
  const push = (s: Partial<CountState>, line: number, message: string) =>
    frames.push({ state: { A: [...A], C: [...C], B: [...B], loop: 0, ...s }, line, message, stats: { comparisons: 0 } });

  push({ loop: 1 }, 2, `Loop 1: clear the k = ${k} counters. That's Θ(k).`);
  for (let j = 0; j < n; j++) {
    C[A[j] - 1]++;
    push({ loop: 2, aAt: j, cAt: A[j] - 1 }, 3, `Loop 2: A[${j + 1}] = ${A[j]}, so C[${A[j]}] becomes ${C[A[j] - 1]}. C[i] counts the keys equal to i.`);
  }
  for (let i = 1; i < k; i++) {
    C[i] += C[i - 1];
    push({ loop: 3, cAt: i }, 4, `Loop 3: C[${i + 1}] += C[${i}], giving ${C[i]}. Now C[i] counts the keys ≤ i, which is the last slot an i can go in.`);
  }
  for (let j = n - 1; j >= 0; j--) {
    const v = A[j];
    const pos = C[v - 1];
    B[pos - 1] = v;
    push({ loop: 4, aAt: j, cAt: v - 1, bAt: pos - 1 }, 6, `Loop 4: A[${j + 1}] = ${v} goes to B[C[${v}]] = B[${pos}].`);
    C[v - 1]--;
    push({ loop: 4, aAt: j, cAt: v - 1, bAt: pos - 1 }, 7, `Decrement C[${v}] to ${C[v - 1]}, so the next ${v} lands one slot to the left. Going right to left keeps equal keys in order: the sort is stable.`);
  }
  push({ loop: 5 }, 9, `Sorted, and not a single comparison between elements. Θ(n + k) time.`);
  return frames;
}

/* ----------------------------- radix sort ----------------------------- */

export type RadixState = { rows: number[]; digit: number; width: number; prev: number[] };

export const CPP_RADIX = [
  "void radixSort(int A[], int n, int digits) {",
  "    for (int d = 0, exp = 1; d < digits; d++, exp *= 10)",
  "        countingSortByDigit(A, n, exp);   // stable sort on (A[i] / exp) % 10",
  "}",
];

/** LSD radix sort: one stable pass per digit, least significant first. */
export function radixSortFrames(input: number[], base = 10): Frame<RadixState>[] {
  const width = Math.max(1, ...input.map((x) => String(x).length));
  let rows = [...input];
  const frames: Frame<RadixState>[] = [];
  frames.push({ state: { rows, digit: -1, width, prev: rows }, line: 0, message: `${input.length} numbers with ${width} digits each. Sort on the last digit first, using a stable sort for each digit.`, stats: { passes: 0 } });
  for (let d = 0; d < width; d++) {
    const prev = rows;
    const key = (x: number) => Math.floor(x / Math.pow(base, d)) % base;
    rows = [...rows].sort((x, y) => key(x) - key(y)); // Array.prototype.sort is stable
    const place = d === 0 ? "ones" : d === 1 ? "tens" : d === 2 ? "hundreds" : `10^${d}`;
    frames.push({
      state: { rows, digit: d, width, prev },
      line: 2,
      message: `Pass ${d + 1}: stable sort on the ${place} digit. Numbers with the same ${place} digit keep the order the last pass gave them.`,
      stats: { passes: d + 1 },
    });
  }
  frames.push({ state: { rows, digit: width, width, prev: rows }, line: 3, message: `Sorted after ${width} passes. Each pass is a counting sort, Θ(n + 10).`, stats: { passes: width } });
  return frames;
}

/* --------------------------- Fibonacci --------------------------- */

/** Calls the naive recursive fib(n) makes: T(n) = T(n-1) + T(n-2) + 1, T(0) = T(1) = 1. */
export function fibCalls(n: number): number {
  let a = 1; // T(0)
  let b = 1; // T(1)
  if (n <= 1) return 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b + 1];
  return b;
}

/* ---------------------- asymptotic notation ---------------------- */

/** Share of each term in a sum of terms, as fractions that add up to 1. */
export function termShares(values: number[]): number[] {
  const total = values.reduce((s, v) => s + v, 0);
  return values.map((v) => (total === 0 ? 0 : v / total));
}

export type BoundKind = "O" | "Ω";

/**
 * Does c·g(n) bound f(n) from above (O) or below (Ω) for every integer n from n0 up to `upTo`?
 * Returns the first n that breaks it, or null when the bound holds on the whole range.
 */
export function firstViolation(f: (n: number) => number, g: (n: number) => number, c: number, n0: number, kind: BoundKind, upTo = 10_000): number | null {
  for (let n = Math.max(1, Math.ceil(n0)); n <= upTo; n++) {
    const ok = kind === "O" ? f(n) <= c * g(n) + 1e-9 : f(n) >= c * g(n) - 1e-9;
    if (!ok) return n;
  }
  return null;
}

/* ---------------------- matrices and Strassen ---------------------- */

export type M2 = [[bigint, bigint], [bigint, bigint]];

export function mul2(x: M2, y: M2): M2 {
  return [
    [x[0][0] * y[0][0] + x[0][1] * y[1][0], x[0][0] * y[0][1] + x[0][1] * y[1][1]],
    [x[1][0] * y[0][0] + x[1][1] * y[1][0], x[1][0] * y[0][1] + x[1][1] * y[1][1]],
  ];
}

/** Strassen's seven products for [[a b] [c d]] · [[e f] [g h]], named as in the lecture. */
export function strassen(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) {
  const P = [a * (f - h), (a + b) * h, (c + d) * e, d * (g - e), (a + d) * (e + h), (b - d) * (g + h), (a - c) * (e + f)];
  const [p1, p2, p3, p4, p5, p6, p7] = P;
  return {
    P,
    r: p5 + p4 - p2 + p6,
    s: p1 + p2,
    t: p3 + p4,
    u: p5 + p1 - p3 - p7,
    standard: { r: a * e + b * g, s: a * f + b * h, t: c * e + d * g, u: c * f + d * h },
  };
}

export type FibSquareStep = { power: number; matrix: M2; used: boolean };

/** [[1 1] [1 0]]^n by repeated squaring: the matrices for powers 1, 2, 4, 8, … and which ones n uses. */
export function fibByMatrix(n: number): { steps: FibSquareStep[]; result: M2; multiplications: number } {
  let base: M2 = [[1n, 1n], [1n, 0n]];
  let result: M2 = [[1n, 0n], [0n, 1n]];
  let k = n;
  let power = 1;
  let mults = 0;
  const steps: FibSquareStep[] = [];
  while (k > 0) {
    const used = (k & 1) === 1;
    steps.push({ power, matrix: base, used });
    if (used) {
      result = mul2(result, base);
      mults++;
    }
    k >>= 1;
    if (k > 0) {
      base = mul2(base, base);
      mults++;
      power *= 2;
    }
  }
  return { steps, result, multiplications: mults };
}

/* --------------------- Gauss (Karatsuba) multiply --------------------- */

export type GaussCall = { a: bigint; b: bigint; depth: number; parts?: { aL: bigint; aR: bigint; bL: bigint; bR: bigint; half: number }; result?: bigint };
export type GaussState = { calls: GaussCall[]; active: number };

export const CPP_GAUSS = [
  "long long gauss(long long a, long long b) {",
  "    if (a < 10 || b < 10) return a * b;          // one digit: multiply directly",
  "    int half = digits(max(a, b)) / 2;",
  "    long long p = powerOf10(half);",
  "    long long aL = a / p, aR = a % p;           // split each number in two",
  "    long long bL = b / p, bR = b % p;",
  "    long long x1 = gauss(aL, bL);",
  "    long long x2 = gauss(aR, bR);",
  "    long long x3 = gauss(aL + aR, bL + bR);",
  "    return x1 * p * p + (x3 - x1 - x2) * p + x2;",
  "}",
];

const digitCount = (x: bigint) => (x < 0n ? -x : x).toString().length;

/** Gauss's three-multiplication trick, recursing until one of the numbers has a single digit. */
export function gaussFrames(a0: bigint, b0: bigint): Frame<GaussState>[] {
  const frames: Frame<GaussState>[] = [];
  const calls: GaussCall[] = [];
  let base = 0;
  const snap = (active: number, line: number, message: string) =>
    frames.push({ state: { calls: calls.map((c) => ({ ...c, parts: c.parts && { ...c.parts } })), active }, line, message, stats: { calls: calls.length, "1-digit mults": base } });

  const go = (a: bigint, b: bigint, depth: number): bigint => {
    calls.push({ a, b, depth });
    const me = calls.length - 1;
    if (a < 10n || b < 10n) {
      base++;
      calls[me].result = a * b;
      snap(me, 1, `${a} × ${b}: a one-digit number, so multiply directly. = ${a * b}.`);
      return a * b;
    }
    const half = Math.floor(Math.max(digitCount(a), digitCount(b)) / 2);
    const p = 10n ** BigInt(half);
    const parts = { aL: a / p, aR: a % p, bL: b / p, bR: b % p, half };
    calls[me].parts = parts;
    snap(me, 4, `Split at ${half} digit${half === 1 ? "" : "s"}: ${a} → ${parts.aL} | ${parts.aR}, and ${b} → ${parts.bL} | ${parts.bR}.`);
    const x1 = go(parts.aL, parts.bL, depth + 1);
    snap(me, 6, `x1 = aL·bL = ${x1}.`);
    const x2 = go(parts.aR, parts.bR, depth + 1);
    snap(me, 7, `x2 = aR·bR = ${x2}.`);
    const x3 = go(parts.aL + parts.aR, parts.bL + parts.bR, depth + 1);
    snap(me, 8, `x3 = (aL + aR)(bL + bR) = ${parts.aL + parts.aR} × ${parts.bL + parts.bR} = ${x3}. That's the only other multiplication we need.`);
    const r = x1 * p * p + (x3 - x1 - x2) * p + x2;
    calls[me].result = r;
    snap(me, 9, `Combine: x1·10^${2 * half} + (x3 − x1 − x2)·10^${half} + x2 = ${x1}·10^${2 * half} + ${x3 - x1 - x2}·10^${half} + ${x2} = ${r}.`);
    return r;
  };

  const r = go(a0, b0, 0);
  const n = Math.max(digitCount(a0), digitCount(b0));
  frames.push({
    state: { calls: calls.map((c) => ({ ...c })), active: -1 },
    line: 10,
    message: `${a0} × ${b0} = ${r}, using ${base} one-digit multiplications. Grade-school multiplication of two ${n}-digit numbers needs ${n * n}.`,
    stats: { calls: calls.length, "1-digit mults": base },
  });
  return frames;
}

export type Frac = [number, number]; // numerator, denominator

const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));

/** "n", "n/3", "2n/9" */
export function fracLabel([p, q]: Frac): string {
  const g = gcd(p, q);
  const [a, b] = [p / g, q / g];
  return `${a === 1 ? "" : a}n${b === 1 ? "" : `/${b}`}`;
}

/**
 * Recursion tree for T(n) = Σ T(fᵢ·n) + n^k: the subproblem sizes on each level, and each level's
 * total cost as a multiple of n^k.
 */
export function unevenLevels(fracs: Frac[], k: number, depth: number): { sizes: Frac[]; cost: number }[] {
  let level: Frac[] = [[1, 1]];
  const out: { sizes: Frac[]; cost: number }[] = [];
  for (let d = 0; d <= depth; d++) {
    out.push({ sizes: level, cost: level.reduce((s, [p, q]) => s + Math.pow(p / q, k), 0) });
    level = level.flatMap(([p, q]) => fracs.map(([fp, fq]) => [p * fp, q * fq] as Frac));
  }
  return out;
}

/* ------------------------- Master method ------------------------- */

export type MasterCase = 1 | 2 | 3 | "gap";

export type MasterResult = {
  /** log_b(a), the exponent of the "leaves" term n^(log_b a) */
  critical: number;
  case: MasterCase;
  /** the answer as text, e.g. "Θ(n² log n)" */
  answer: string;
  /** one plain-English sentence explaining which side won */
  why: string;
};

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", ".": "·" };

/** Round to 2 decimals and drop trailing zeros: 1.5849 → "1.58", 2 → "2". */
export function fmtExp(x: number): string {
  return String(Math.round(x * 100) / 100);
}

/** n raised to an exponent, written the way the slides write it: 1, n, n², n^1.58. */
export function powN(k: number): string {
  if (Math.abs(k) < 1e-9) return "1";
  if (Math.abs(k - 1) < 1e-9) return "n";
  const s = fmtExp(k);
  return Number.isInteger(Number(s)) ? `n${s.split("").map((c) => SUP[c] ?? c).join("")}` : `n^${s}`;
}

/** n^k · (log n)^p as text. */
export function fText(k: number, p: number): string {
  const poly = powN(k);
  const log = p === 0 ? "" : p === 1 ? "log n" : `log${SUP[String(p)] ?? `^${p}`} n`;
  if (!log) return poly;
  return poly === "1" ? log : `${poly} ${log}`;
}

/**
 * Solve T(n) = a·T(n/b) + f(n) with f(n) = n^k (log n)^p, using the basic master
 * method from the lecture. Its case 2 needs f(n) = Θ(n^(log_b a)) exactly, so a
 * log factor on the critical exponent falls into the "gap" between the cases.
 */
export function masterMethod(a: number, b: number, k: number, p = 0): MasterResult {
  const critical = Math.log(a) / Math.log(b);
  const eq = Math.abs(k - critical) < 1e-9;
  const leaves = powN(critical);
  if (!eq && k < critical) {
    return {
      critical,
      case: 1,
      answer: `Θ(${leaves})`,
      why: `f(n) = ${fText(k, p)} grows polynomially slower than n^(log_b a) = ${leaves}, so the leaves of the tree do most of the work.`,
    };
  }
  if (eq && p === 0) {
    return {
      critical,
      case: 2,
      answer: `Θ(${fText(k, 1)})`,
      why: `f(n) = ${fText(k, p)} grows at the same rate as n^(log_b a) = ${leaves}: every level costs the same, and there are log n levels.`,
    };
  }
  if (eq) {
    return {
      critical,
      case: "gap",
      answer: `not covered (extended rule gives Θ(${fText(k, p + 1)}))`,
      why: `f(n) = ${fText(k, p)} is bigger than ${leaves}, but only by a log factor, not by a polynomial factor n^ε. The basic master method can't decide it.`,
    };
  }
  return {
    critical,
    case: 3,
    answer: `Θ(${fText(k, p)})`,
    why: `f(n) = ${fText(k, p)} grows polynomially faster than n^(log_b a) = ${leaves}, so the root does most of the work. (The regularity check a·f(n/b) ≤ c·f(n) holds with c = ${fmtExp(a / Math.pow(b, k))}.)`,
  };
}

export type TreeLevel = {
  depth: number;
  /** subproblems on this level: a^depth */
  nodes: number;
  /** size of each subproblem, as a fraction of n: 1 / b^depth */
  size: number;
  /** total cost of the level relative to the root's cost: (a / b^k)^depth */
  cost: number;
};

/** Levels of the recursion tree for T(n) = a·T(n/b) + n^k, from the root down to size-1 pieces. */
export function recursionLevels(a: number, b: number, k: number, n: number): TreeLevel[] {
  const depth = Math.max(1, Math.round(Math.log(n) / Math.log(b)));
  const ratio = a / Math.pow(b, k);
  return Array.from({ length: depth + 1 }, (_, d) => ({
    depth: d,
    nodes: Math.pow(a, d),
    size: 1 / Math.pow(b, d),
    cost: Math.pow(ratio, d),
  }));
}
