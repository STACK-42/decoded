import type { Frame } from "@/lib/algorithms";

/* ============================================================
   Number theory for the Computational Mathematics course. Moduli
   stay small enough that products fit safely in a double.
   ============================================================ */

/** Always in 0..n-1, like MATLAB's mod and unlike JavaScript's %. */
export const mod = (a: number, n: number) => ((a % n) + n) % n;

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export type EuclidStep = { a: number; b: number; q: number; r: number };

export function euclidSteps(a: number, b: number): EuclidStep[] {
  const steps: EuclidStep[] = [];
  while (b !== 0) {
    const q = Math.floor(a / b);
    steps.push({ a, b, q, r: a - q * b });
    [a, b] = [b, a - q * b];
  }
  return steps;
}

export type Tile = { x: number; y: number; size: number; step: number };

/** Cut a rectangle into squares: each Euclid step lays down q squares of side b. */
export function euclidTiles(a: number, b: number): Tile[] {
  const tiles: Tile[] = [];
  let [x, y, w, h] = [0, 0, a, b];
  let step = 0;
  while (w > 0 && h > 0) {
    const s = Math.min(w, h);
    const count = Math.floor(Math.max(w, h) / s);
    for (let i = 0; i < count; i++) {
      tiles.push({ x: w >= h ? x + i * s : x, y: w >= h ? y : y + i * s, size: s, step });
    }
    if (w >= h) {
      x += count * s;
      w -= count * s;
    } else {
      y += count * s;
      h -= count * s;
    }
    step++;
  }
  return tiles;
}

export type TileState = { a: number; b: number; steps: EuclidStep[]; upto: number };

export const MATLAB_EUCLID = ["r = a - b * floor(a / b);", "while r ~= 0", "  a = b;", "  b = r;", "  r = a - b * floor(a / b);", "end", "GCD = b"];

export function tileFrames(a: number, b: number): Frame<TileState>[] {
  const steps = euclidSteps(a, b);
  const g = steps[steps.length - 1].b;
  const frames: Frame<TileState>[] = [{ state: { a, b, steps, upto: -1 }, line: 0, message: `A ${a}-by-${b} rectangle. Any square that tiles it exactly has a side dividing both ${a} and ${b}, so we want the largest such square.`, stats: {} }];
  steps.forEach((s, i) => {
    const last = i === steps.length - 1;
    frames.push({
      state: { a, b, steps, upto: i },
      line: last ? 6 : i === 0 ? 0 : 4,
      message: last
        ? `${s.a} = ${s.q} × ${s.b}. Nothing is left over, so the side ${s.b} fills the last piece exactly: gcd(${a}, ${b}) = ${g}.`
        : `${s.a} = ${s.q} × ${s.b} + ${s.r}. Lay down ${s.q} ${s.q === 1 ? "square" : "squares"} of side ${s.b}. A ${s.b}-by-${s.r} piece remains, and it has the same gcd.`,
      stats: { gcd: last ? g : 0 },
    });
  });
  return frames;
}

/* ------------------------------- primes ------------------------------- */

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** Prime factors with their powers, smallest first. */
export function factorize(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let d = 2; d * d <= n; d++) {
    let e = 0;
    while (n % d === 0) {
      n /= d;
      e++;
    }
    if (e) out.push([d, e]);
  }
  if (n > 1) out.push([n, 1]);
  return out;
}

export const phi = (n: number) => factorize(n).reduce((acc, [p]) => (acc / p) * (p - 1), n);

export type SieveState = { n: number; crossed: Record<number, number>; prime: number | null; done: boolean };

export const MATLAB_SIEVE = ["isP = true(1, n);  isP(1) = false;", "for p = 2:floor(sqrt(n))", "  if isP(p)", "    isP(p*p:p:n) = false;", "  end", "end", "primes = find(isP)"];

export function sieveFrames(n: number): Frame<SieveState>[] {
  const crossed: Record<number, number> = {};
  const limit = Math.floor(Math.sqrt(n));
  const frames: Frame<SieveState>[] = [{ state: { n, crossed: {}, prime: null, done: false }, line: 0, message: `List the integers from 2 to ${n}. Since √${n} is about ${Number(Math.sqrt(n).toFixed(2))}, only primes up to ${limit} need to strike anything.`, stats: { struck: 0 } }];
  let struck = 0;
  for (let p = 2; p <= limit; p++) {
    if (crossed[p]) continue;
    const before = struck;
    for (let m = p * p; m <= n; m += p) {
      if (!crossed[m]) {
        crossed[m] = p;
        struck++;
      }
    }
    frames.push({ state: { n, crossed: { ...crossed }, prime: p, done: false }, line: 3, message: `${p} survived, so it's prime. Strike its multiples from ${p * p} on, since smaller ones are already gone: ${struck - before} new numbers struck.`, stats: { struck } });
  }
  const count = n - 1 - struck;
  frames.push({ state: { n, crossed: { ...crossed }, prime: null, done: true }, line: 6, message: `The next survivor is larger than √${n}, so we can stop. Everything left is prime: ${count} primes up to ${n}.`, stats: { struck, primes: count } });
  return frames;
}

/* ------------------------------- Wilson -------------------------------- */

export function inverseMod(a: number, n: number): number | null {
  for (let x = 1; x < n; x++) if ((a * x) % n === 1) return x;
  return null;
}

export type WilsonState = { p: number; pairs: [number, number][]; active: [number, number] | null; product: number };

export const MATLAB_WILSON = ["p = 13;", "mod(factorial(p - 1), p) - p    % returns -1 when p is prime"];

export function wilsonFrames(p: number): Frame<WilsonState>[] {
  const pairs: [number, number][] = [];
  const seen = new Set([1, p - 1]);
  const frames: Frame<WilsonState>[] = [{ state: { p, pairs: [], active: null, product: 1 }, line: 1, message: `Write out (${p} - 1)! = 1 × 2 × … × ${p - 1}. Every number here has an inverse modulo ${p}, and we can pair them up.`, stats: {} }];
  for (let a = 2; a < p - 1; a++) {
    if (seen.has(a)) continue;
    const b = inverseMod(a, p)!;
    seen.add(a);
    seen.add(b);
    pairs.push([a, b]);
    frames.push({ state: { p, pairs: [...pairs], active: [a, b], product: 1 }, line: 1, message: `${a} × ${b} = ${a * b} ≡ 1 (mod ${p}). This pair cancels to 1.`, stats: {} });
  }
  frames.push({ state: { p, pairs: [...pairs], active: null, product: p - 1 }, line: 1, message: `Only 1 and ${p - 1} are their own inverses, so they stay single. The product is 1 × ${p - 1} ≡ -1 (mod ${p}).`, stats: {} });
  return frames;
}

/* ------------------------- order and primitive roots ------------------------ */

/** Smallest k > 0 with a^k ≡ 1 (mod n), or null when a and n share a factor. */
export function order(a: number, n: number): number | null {
  if (gcd(a, n) !== 1) return null;
  let v = mod(a, n);
  for (let k = 1; k <= n; k++) {
    if (v === 1 % n) return k;
    v = (v * a) % n;
  }
  return null;
}

export const isPrimitiveRoot = (a: number, n: number) => order(a, n) === phi(n);
export const primitiveRoots = (n: number) => Array.from({ length: n - 1 }, (_, i) => i + 1).filter((a) => isPrimitiveRoot(a, n));

/** a^1, a^2, ... a^count, all reduced modulo n. */
export function powers(a: number, n: number, count: number): number[] {
  const out: number[] = [];
  let v = 1;
  for (let k = 0; k < count; k++) {
    v = (v * a) % n;
    out.push(v);
  }
  return out;
}

export type CycleState = { a: number; n: number; seq: number[]; target: number | null };

export const MATLAB_ORDER = ["v = mod(a, n);  k = 1;", "while v ~= 1", "  v = mod(v * a, n);", "  k = k + 1;", "end", "k    % the order of a modulo n"];

export function cycleFrames(a: number, n: number): Frame<CycleState>[] {
  const k = order(a, n)!;
  const all = powers(a, n, k);
  const frames: Frame<CycleState>[] = [{ state: { a, n, seq: [1], target: null }, line: 0, message: `Start at 1 and keep multiplying by ${a} modulo ${n}.`, stats: { k: 0 } }];
  all.forEach((v, i) => {
    const prev = i === 0 ? 1 : all[i - 1];
    frames.push({ state: { a, n, seq: [1, ...all.slice(0, i + 1)], target: null }, line: i === k - 1 ? 5 : 2, message: `${a}^${i + 1} = ${prev} × ${a} = ${prev * a} ≡ ${v} (mod ${n}).`, stats: { k: i + 1 } });
  });
  const f = phi(n);
  frames.push({
    state: { a, n, seq: [1, ...all], target: null },
    line: 5,
    message: k === f ? `Back at 1 after ${k} steps. That's the maximum, φ(${n}) = ${f}, so ${a} is a primitive root of ${n}.` : `Back at 1 after only ${k} steps, and φ(${n}) = ${f}. So the order of ${a} is ${k}, ${a} isn't a primitive root, and ${k} divides ${f}.`,
    stats: { k },
  });
  return frames;
}

/* --------------------------- extended Euclidean --------------------------- */

export type ExtRow = EuclidStep & { x: number | null; y: number | null };

/** Back-substitution from the bottom row: g = x·a + y·b holds on every row. */
export function extendedRows(a: number, b: number): ExtRow[] {
  const steps = euclidSteps(a, b);
  const rows: ExtRow[] = steps.map((s) => ({ ...s, x: null, y: null }));
  let [x, y] = [0, 1];
  for (let i = rows.length - 1; i >= 0; i--) {
    if (i < rows.length - 1) [x, y] = [y, x - rows[i].q * y];
    rows[i].x = x;
    rows[i].y = y;
  }
  return rows;
}

export type ExtState = { a: number; b: number; rows: ExtRow[]; down: number; up: number | null };

export const MATLAB_EXT = ["[g, x, y] = gcd(a, b)    % g = a*x + b*y", "inverse = mod(x, b)      % when g is 1"];

export function extendedFrames(a: number, b: number): Frame<ExtState>[] {
  const rows = extendedRows(a, b);
  const g = rows[rows.length - 1].b;
  const frames: Frame<ExtState>[] = [{ state: { a, b, rows, down: -1, up: null }, line: 0, message: `We want x and y with ${a}x + ${b}y = gcd(${a}, ${b}). First, run Euclid's algorithm downwards.`, stats: {} }];
  rows.forEach((r, i) => frames.push({ state: { a, b, rows, down: i, up: null }, line: 0, message: `${r.a} = ${r.q} × ${r.b} + ${r.r}.`, stats: {} }));
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    frames.push({
      state: { a, b, rows, down: rows.length - 1, up: i },
      line: 0,
      message: i === rows.length - 1 ? `The gcd is ${g}, and it's trivially ${g} = 0 × ${r.a} + 1 × ${r.b}. Now climb back up, rewriting it one row at a time.` : `Replace ${rows[i + 1].b} using this row: ${g} = (${r.x}) × ${r.a} + (${r.y}) × ${r.b}.`,
      stats: {},
    });
  }
  const top = rows[0];
  const inv = mod(top.y!, a);
  frames.push({ state: { a, b, rows, down: rows.length - 1, up: 0 }, line: 1, message: g === 1 ? `Done: ${a} × (${top.x}) + ${b} × (${top.y}) = 1. Modulo ${a}, the first term vanishes, so the inverse of ${b} is ${inv}.` : `Done: ${a} × (${top.x}) + ${b} × (${top.y}) = ${g}. The gcd isn't 1, so there's no inverse.`, stats: {} });
  return frames;
}

/* ---------------------------- fast exponentiation --------------------------- */

export function modPow(a: number, m: number, n: number): number {
  let r = 1 % n;
  let b = mod(a, n);
  for (let e = m; e > 0; e = Math.floor(e / 2)) {
    if (e % 2) r = (r * b) % n;
    b = (b * b) % n;
  }
  return r;
}

export type FastPowState = { a: number; m: number; n: number; bits: string; i: number; value: number; history: { bit: string; text: string; value: number }[]; mults: number };

export const MATLAB_FASTPOW = ["bits = dec2bin(m);", "r = mod(a, n);", "for i = 2:length(bits)", "  r = mod(r * r, n);", "  if bits(i) == '1'", "    r = mod(r * a, n);", "  end", "end", "r"];

/** Left-to-right square and multiply: read m in binary, always square, multiply on a 1. */
export function fastPowFrames(a: number, m: number, n: number): Frame<FastPowState>[] {
  const bits = m.toString(2);
  let value = mod(a, n);
  let mults = 0;
  const history = [{ bit: bits[0], text: `${a} mod ${n}`, value }];
  const frames: Frame<FastPowState>[] = [{ state: { a, m, n, bits, i: 0, value, history: [...history], mults }, line: 1, message: `${m} in binary is ${bits}. The first bit just sets up the starting value, ${a}.`, stats: { multiplications: 0, naive: m - 1 } }];
  for (let i = 1; i < bits.length; i++) {
    const before = value;
    const sq = before * before;
    value = sq % n;
    mults++;
    if (bits[i] === "1") {
      const big = value * a;
      const text = `(${before}² mod ${n}) × ${a} mod ${n}`;
      value = big % n;
      mults++;
      history.push({ bit: "1", text, value });
      frames.push({ state: { a, m, n, bits, i, value, history: [...history], mults }, line: 5, message: `Bit 1: square and multiply. ${before}² ≡ ${sq % n}, and ${sq % n} × ${a} ≡ ${value} (mod ${n}).`, stats: { multiplications: mults, naive: m - 1 } });
    } else {
      history.push({ bit: "0", text: `${before}² mod ${n}`, value });
      frames.push({ state: { a, m, n, bits, i, value, history: [...history], mults }, line: 3, message: `Bit 0: just square. ${before}² = ${sq} ≡ ${value} (mod ${n}).`, stats: { multiplications: mults, naive: m - 1 } });
    }
  }
  frames.push({ state: { a, m, n, bits, i: bits.length, value, history: [...history], mults }, line: 8, message: `${a}^${m} mod ${n} = ${value}, using ${mults} multiplications where the naive way needs ${m - 1}.`, stats: { multiplications: mults, naive: m - 1 } });
  return frames;
}

/* ---------------------------- discrete logarithms --------------------------- */

export function discreteLog(b: number, a: number, n: number): number | null {
  let v = 1 % n;
  for (let k = 0; k < n; k++) {
    if (v === mod(b, n)) return k;
    v = (v * a) % n;
  }
  return null;
}

/** The inverse lookup for a primitive root: number → its discrete log. */
export function logTable(a: number, n: number): Record<number, number> {
  const out: Record<number, number> = {};
  for (let v = 1, k = 0; k < phi(n); k++, v = (v * a) % n) out[v] = k;
  return out;
}

export type DlogState = { a: number; n: number; target: number; seq: number[]; found: boolean };

export const MATLAB_DLOG = ["v = 1;  k = 0;", "while v ~= b", "  v = mod(v * a, n);", "  k = k + 1;", "end", "k    % the discrete log of b"];

export function dlogFrames(a: number, b: number, n: number): Frame<DlogState>[] {
  const seq = [1];
  const frames: Frame<DlogState>[] = [{ state: { a, n, target: b, seq: [...seq], found: b === 1 }, line: 0, message: `Find k with ${a}^k ≡ ${b} (mod ${n}). The powers look random, so the plain method is to try them one by one.`, stats: { tries: 0 } }];
  let v = 1;
  let k = 0;
  while (v !== b && k < n) {
    v = (v * a) % n;
    k++;
    seq.push(v);
    const hit = v === b;
    frames.push({ state: { a, n, target: b, seq: [...seq], found: hit }, line: hit ? 5 : 2, message: hit ? `${a}^${k} ≡ ${b}. Found it: the discrete log of ${b} to the base ${a} is ${k}.` : `${a}^${k} ≡ ${v}. Not ${b} yet.`, stats: { tries: k } });
  }
  return frames;
}
