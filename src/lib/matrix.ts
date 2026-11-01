import type { Frame } from "@/lib/algorithms";

/* ============================================================
   Matrix maths for the Computational Mathematics course. Every
   visualizer replays frames built here, so the numbers on screen
   are computed, and tests can check them.
   ============================================================ */

export type Mat = number[][];

export const shape = (a: Mat): [number, number] => [a.length, a[0]?.length ?? 0];
export const zeros = (m: number, n: number): Mat => Array.from({ length: m }, () => Array(n).fill(0));
export const identity = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

/** MATLAB's pascal(n): symmetric, built from binomial coefficients. */
export function pascal(n: number): Mat {
  const a = Array.from({ length: n }, () => Array(n).fill(1));
  for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) a[i][j] = a[i - 1][j] + a[i][j - 1];
  return a;
}

/** MATLAB's magic(3) and magic(4), the two sizes the lessons use. */
export const MAGIC3: Mat = [[8, 1, 6], [3, 5, 7], [4, 9, 2]];
export const MAGIC4: Mat = [[16, 2, 3, 13], [5, 11, 10, 8], [9, 7, 6, 12], [4, 14, 15, 1]];

export const add = (a: Mat, b: Mat): Mat => a.map((r, i) => r.map((v, j) => v + b[i][j]));
export const sub = (a: Mat, b: Mat): Mat => a.map((r, i) => r.map((v, j) => v - b[i][j]));
export const scale = (k: number, a: Mat): Mat => a.map((r) => r.map((v) => k * v));
export const transpose = (a: Mat): Mat => (a[0] ?? []).map((_, j) => a.map((r) => r[j]));
export const dot = (u: number[], v: number[]) => u.reduce((s, x, i) => s + x * v[i], 0);

export function mul(a: Mat, b: Mat): Mat {
  const [m, p] = shape(a);
  const [q, n] = shape(b);
  if (p !== q) throw new Error(`Inner dimensions must agree: ${m}x${p} times ${q}x${n}`);
  return a.map((r) => Array.from({ length: n }, (_, j) => r.reduce((s, x, k) => s + x * b[k][j], 0)));
}

const signed = (x: number) => (x < 0 ? `(${x})` : String(x));

/* ------------------------- element by element ------------------------- */

export type ElementwiseOp = "add" | "subtract" | "scalar";

export type ElementwiseState = {
  op: ElementwiseOp;
  a: Mat;
  b: Mat | null;
  k: number;
  c: (number | null)[][];
  at: [number, number] | null;
};

export const MATLAB_ELEMENTWISE: Record<ElementwiseOp, string[]> = {
  add: ["A = pascal(3);", "B = magic(3);", "C = A + B"],
  subtract: ["A = pascal(3);", "B = magic(3);", "C = B - A"],
  scalar: ["A = pascal(3);", "k = -2;", "C = k * A"],
};

export function elementwiseFrames(op: ElementwiseOp, a: Mat, b: Mat, k: number): Frame<ElementwiseState>[] {
  const [m, n] = shape(a);
  const c: (number | null)[][] = zeros(m, n).map((r) => r.map(() => null));
  const frames: Frame<ElementwiseState>[] = [];
  const push = (at: [number, number] | null, message: string, line: number) =>
    frames.push({ state: { op, a, b: op === "scalar" ? null : b, k, c: c.map((r) => [...r]), at }, line, message, stats: {} });
  push(null, op === "scalar" ? `Multiply every entry of A by ${k}.` : "Both matrices are 3-by-3, so each entry has exactly one partner.", 2);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const v = op === "add" ? a[i][j] + b[i][j] : op === "subtract" ? b[i][j] - a[i][j] : k * a[i][j];
      c[i][j] = v;
      const sum =
        op === "add" ? `${a[i][j]} + ${signed(b[i][j])}` : op === "subtract" ? `${b[i][j]} - ${signed(a[i][j])}` : `${signed(k)} × ${signed(a[i][j])}`;
      push([i, j], `Row ${i + 1}, column ${j + 1}: ${sum} = ${v}.`, 2);
    }
  }
  push(null, "Done. No entry ever needed to look at its neighbours.", 2);
  return frames;
}

/* ------------------------ inner and outer products ----------------------- */

export type VectorProductKind = "inner" | "outer";

export type VectorProductState = {
  kind: VectorProductKind;
  u: number[];
  v: number[];
  at: [number, number] | null;
  outer: (number | null)[][];
  terms: number[];
};

export const MATLAB_VECTOR_PRODUCT: Record<VectorProductKind, string[]> = {
  inner: ["u = [3; 1; 4];", "v = [2 0 -1];", "x = v * u    % 1-by-3 times 3-by-1"],
  outer: ["u = [3; 1; 4];", "v = [2 0 -1];", "X = u * v    % 3-by-1 times 1-by-3"],
};

export function vectorProductFrames(kind: VectorProductKind, u: number[], v: number[]): Frame<VectorProductState>[] {
  const frames: Frame<VectorProductState>[] = [];
  const outer: (number | null)[][] = u.map(() => v.map(() => null));
  const terms: number[] = [];
  const push = (at: [number, number] | null, message: string) =>
    frames.push({ state: { kind, u, v, at, outer: outer.map((r) => [...r]), terms: [...terms] }, line: 2, message, stats: kind === "inner" ? { total: terms.reduce((s, x) => s + x, 0) } : {} });
  if (kind === "inner") {
    push(null, "1-by-3 times 3-by-1: the inner dimensions match, and the answer is 1-by-1, a single number.");
    u.forEach((x, i) => {
      terms.push(v[i] * x);
      push([i, i], `Pair number ${i + 1}: ${signed(v[i])} × ${signed(x)} = ${v[i] * x}.`);
    });
    push(null, `Add the products and you get ${dot(u, v)}. Three numbers went in, one came out.`);
  } else {
    push(null, "3-by-1 times 1-by-3: the outer dimensions set the size, so the answer is a 3-by-3 matrix.");
    u.forEach((x, i) =>
      v.forEach((y, j) => {
        outer[i][j] = x * y;
        push([i, j], `Entry (${i + 1}, ${j + 1}) is u(${i + 1}) × v(${j + 1}) = ${signed(x)} × ${signed(y)} = ${x * y}.`);
      }),
    );
    push(null, "Every row is a multiple of v, and every column is a multiple of u. All nine numbers come from just six.");
  }
  return frames;
}

/* ------------------------ matrix multiplication ------------------------ */

export type MatMulState = {
  a: Mat;
  b: Mat;
  c: (number | null)[][];
  i: number | null;
  j: number | null;
  k: number | null;
  terms: string[];
  running: number;
};

export const MATLAB_MATMUL = [
  "[m, p] = size(A);",
  "[~, n] = size(B);",
  "C = zeros(m, n);",
  "for i = 1:m",
  "  for j = 1:n",
  "    C(i, j) = A(i, :) * B(:, j);",
  "  end",
  "end",
];

export function matMulFrames(a: Mat, b: Mat): Frame<MatMulState>[] {
  const [m, p] = shape(a);
  const [, n] = shape(b);
  const c: (number | null)[][] = zeros(m, n).map((r) => r.map(() => null));
  const frames: Frame<MatMulState>[] = [];
  let mults = 0;
  const push = (i: number | null, j: number | null, k: number | null, terms: string[], running: number, line: number, message: string) =>
    frames.push({ state: { a, b, c: c.map((r) => [...r]), i, j, k, terms, running }, line, message, stats: { multiplications: mults } });
  push(null, null, null, [], 0, 2, `A is ${m}-by-${p} and B is ${p}-by-${n}. The inner sizes match, so C is ${m}-by-${n}.`);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const terms: string[] = [];
      let running = 0;
      for (let k = 0; k < p; k++) {
        running += a[i][k] * b[k][j];
        mults++;
        terms.push(`${signed(a[i][k])}×${signed(b[k][j])}`);
        push(i, j, k, [...terms], running, 5, `Row ${i + 1} of A meets column ${j + 1} of B. Term ${k + 1}: ${signed(a[i][k])} × ${signed(b[k][j])} = ${a[i][k] * b[k][j]}.`);
      }
      c[i][j] = running;
      push(i, j, null, terms, running, 5, `Write ${running} into C(${i + 1}, ${j + 1}).`);
    }
  }
  push(null, null, null, [], 0, 7, `Finished with ${mults} multiplications. For n-by-n matrices that count is n³, which is why matrix size matters so much.`);
  return frames;
}

/* ---------------------------- linear maps ----------------------------- */

export type Map2 = [number, number, number, number];

export const det2 = ([a, b, c, d]: Map2) => a * d - b * c;
export const apply2 = ([a, b, c, d]: Map2, x: number, y: number): [number, number] => [a * x + b * y, c * x + d * y];

/* -------------------------- Kronecker product -------------------------- */

export function kron(a: Mat, b: Mat): Mat {
  const [m, n] = shape(a);
  const [p, q] = shape(b);
  const out = zeros(m * p, n * q);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) for (let k = 0; k < p; k++) for (let l = 0; l < q; l++) out[i * p + k][j * q + l] = a[i][j] * b[k][l] + 0;
  return out;
}

export type KronState = { a: Mat; b: Mat; block: [number, number] | null; done: number };

export const MATLAB_KRON = ["A = [1 -2; -1 0];", "B = [4 -3; 2 3];", "X = kron(A, B)"];

export function kronFrames(a: Mat, b: Mat): Frame<KronState>[] {
  const [m, n] = shape(a);
  const [p, q] = shape(b);
  const frames: Frame<KronState>[] = [
    { state: { a, b, block: null, done: 0 }, line: 2, message: `A is ${m}-by-${n} and B is ${p}-by-${q}, so the result is ${m * p}-by-${n * q}: one copy of B for every entry of A.`, stats: {} },
  ];
  let done = 0;
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      done++;
      frames.push({ state: { a, b, block: [i, j], done }, line: 2, message: `Entry A(${i + 1}, ${j + 1}) is ${a[i][j]}, so this block is ${a[i][j]} × B.`, stats: {} });
    }
  frames.push({ state: { a, b, block: null, done }, line: 2, message: "Done. The result is a grid of scaled copies of B." , stats: {} });
  return frames;
}

/* -------------------------------- norms -------------------------------- */

export type NormKind = "one" | "inf" | "fro";

export const norm1 = (a: Mat) => Math.max(...transpose(a).map((c) => c.reduce((s, x) => s + Math.abs(x), 0)));
export const normInf = (a: Mat) => Math.max(...a.map((r) => r.reduce((s, x) => s + Math.abs(x), 0)));
export const normFro = (a: Mat) => Math.sqrt(a.flat().reduce((s, x) => s + x * x, 0));
export const trace = (a: Mat) => a.reduce((s, r, i) => s + r[i], 0);

export type NormState = { kind: NormKind; a: Mat; line: number | null; sums: (number | null)[]; best: number | null; total: number | null };

export const MATLAB_NORM: Record<NormKind, string[]> = {
  one: ["B = [5 -4 2; -1 2 3; -2 1 0];", "norm(B, 1)      % largest column sum"],
  inf: ["B = [5 -4 2; -1 2 3; -2 1 0];", "norm(B, inf)    % largest row sum"],
  fro: ["B = [5 -4 2; -1 2 3; -2 1 0];", "norm(B, 'fro')  % root of all the squares"],
};

export function normFrames(kind: NormKind, a: Mat): Frame<NormState>[] {
  const frames: Frame<NormState>[] = [];
  if (kind === "fro") {
    let total = 0;
    frames.push({ state: { kind, a, line: null, sums: [], best: null, total: 0 }, line: 1, message: "Square every entry, add them all up, then take the square root.", stats: {} });
    a.flat().forEach((x, idx) => {
      total += x * x;
      frames.push({ state: { kind, a, line: idx, sums: [], best: null, total }, line: 1, message: `(${x})² = ${x * x}, so the running total is ${total}.`, stats: { total } });
    });
    frames.push({ state: { kind, a, line: null, sums: [], best: null, total }, line: 1, message: `The square root of ${total} is ${Number(Math.sqrt(total).toFixed(3))}.`, stats: { total } });
    return frames;
  }
  const groups = kind === "one" ? transpose(a) : a;
  const word = kind === "one" ? "column" : "row";
  const sums: (number | null)[] = groups.map(() => null);
  frames.push({ state: { kind, a, line: null, sums: [...sums], best: null, total: null }, line: 1, message: `Add up the absolute values along each ${word}.`, stats: {} });
  groups.forEach((g, i) => {
    const sum = g.reduce((s, x) => s + Math.abs(x), 0);
    sums[i] = sum;
    frames.push({ state: { kind, a, line: i, sums: [...sums], best: null, total: null }, line: 1, message: `${word[0].toUpperCase()}${word.slice(1)} ${i + 1}: ${g.map((x) => `|${x}|`).join(" + ")} = ${sum}.`, stats: {} });
  });
  const max = Math.max(...(sums as number[]));
  frames.push({ state: { kind, a, line: sums.indexOf(max), sums: [...sums], best: sums.indexOf(max), total: null }, line: 1, message: `The largest sum wins, so the norm is ${max}.`, stats: {} });
  return frames;
}

/* --------------------------- special matrices --------------------------- */

export const triu = (a: Mat, k = 0): Mat => a.map((r, i) => r.map((v, j) => (j - i >= k ? v : 0)));
export const tril = (a: Mat, k = 0): Mat => a.map((r, i) => r.map((v, j) => (j - i <= k ? v : 0)));
export const diagOnly = (a: Mat, k = 0): Mat => a.map((r, i) => r.map((v, j) => (j - i === k ? v : 0)));
export const diagOf = (a: Mat, k = 0): number[] => a.flatMap((r, i) => r.filter((_, j) => j - i === k));

/* ------------------------ determinants and inverses ------------------------ */

export const minorMatrix = (a: Mat, r: number, c: number): Mat => a.filter((_, i) => i !== r).map((row) => row.filter((_, j) => j !== c));

/** Determinant by cofactor expansion along the first row. Fine for the small matrices here. */
export function det(a: Mat): number {
  if (a.length === 1) return a[0][0];
  return a[0].reduce((s, v, j) => s + (j % 2 ? -1 : 1) * v * det(minorMatrix(a, 0, j)), 0) + 0;
}

export const minors = (a: Mat): Mat => a.map((r, i) => r.map((_, j) => det(minorMatrix(a, i, j))));
export const cofactors = (a: Mat): Mat => minors(a).map((r, i) => r.map((v, j) => ((i + j) % 2 ? -v : v) + 0));
export const adjoint = (a: Mat): Mat => transpose(cofactors(a));

const gcdInt = (x: number, y: number): number => (y === 0 ? Math.abs(x) : gcdInt(y, x % y));

/** An exact fraction as text: 6 over -4 reads -3/2. */
export function fraction(n: number, d: number): string {
  if (n === 0) return "0";
  const g = gcdInt(n, d) * (d < 0 ? -1 : 1);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
}

export const inverseText = (a: Mat): string[][] => {
  const D = det(a);
  return adjoint(a).map((r) => r.map((v) => fraction(v, D)));
};

export type InverseStage = "start" | "minors" | "cofactors" | "adjoint" | "inverse" | "singular";

export type InverseState = { a: Mat; stage: InverseStage; at: [number, number] | null; shown: (number | string | null)[][]; flipped: boolean; det: number };

export const MATLAB_INVERSE = ["A = [1 2 3; 0 1 4; 5 6 0];", "D = det(A);", "% C = the cofactor matrix: minors with signs", "% adjA = C'", "B = inv(A)    % equals adjA / D"];

export function inverseFrames(a: Mat): Frame<InverseState>[] {
  const n = a.length;
  const D = det(a);
  const frames: Frame<InverseState>[] = [];
  const push = (stage: InverseStage, at: [number, number] | null, shown: (number | string | null)[][], flipped: boolean, line: number, message: string) =>
    frames.push({ state: { a, stage, at, shown: shown.map((r) => [...r]), flipped, det: D }, line, message, stats: { det: D } });
  const empty = (): (number | string | null)[][] => a.map((r) => r.map(() => null));
  const m = minors(a);
  const c = cofactors(a);
  const adj = adjoint(a);
  const expansion = a[0].map((v, j) => `${j % 2 ? "−" : j ? "+" : ""} ${v < 0 ? `(${v})` : v}×${m[0][j] < 0 ? `(${m[0][j]})` : m[0][j]}`).join(" ");
  push("start", null, empty(), false, 1, `Expand along the first row: det(A) = ${expansion} = ${D}.`);
  if (D === 0) {
    push("singular", null, empty(), false, 1, "The determinant is 0, so A is singular and has no inverse. MATLAB warns you, and the result can't be trusted.");
    return frames;
  }
  const shown = empty();
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      shown[i][j] = m[i][j];
      const sub = minorMatrix(a, i, j).flat();
      push("minors", [i, j], shown, false, 2, `Minor M(${i + 1},${j + 1}): cross out row ${i + 1} and column ${j + 1}. The rest gives ${sub[0]}×${sub[3]} − ${sub[1]}×${sub[2]} = ${m[i][j]}.`);
    }
  push("cofactors", null, c, false, 2, "Cofactors: flip the sign wherever i + j is odd, which makes a checkerboard.");
  push("adjoint", null, c, true, 3, "Adjoint: transpose the cofactor matrix. Watch each entry cross the diagonal.");
  const txt = inverseText(a);
  push("inverse", null, c.map((r, i) => r.map((_, j) => txt[j][i])), true, 4, `Divide every entry by det(A) = ${D}. That is the inverse, and A times it gives the identity.`);
  return frames;
}
