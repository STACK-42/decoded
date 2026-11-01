import type { Frame } from "@/lib/algorithms";

/* ============================================================
   Polynomials, stored the MATLAB way: a row of coefficients in
   descending powers, so [1 -2 -1 2] means x³ - 2x² - x + 2.
   ============================================================ */

export type Poly = number[];
export type Complex = [number, number];

export const polyval = (p: Poly, x: number) => p.reduce((s, c) => s * x + c, 0);

export function polyder(p: Poly): Poly {
  const n = p.length - 1;
  if (n < 1) return [0];
  return p.slice(0, -1).map((c, i) => c * (n - i));
}

export function conv(a: Poly, b: Poly): Poly {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
}

/** Long division. The remainder keeps the length of u, as MATLAB's deconv does. */
export function deconv(u: Poly, v: Poly): { q: Poly; r: Poly } {
  const r = [...u];
  const q: number[] = [];
  for (let i = 0; i <= u.length - v.length; i++) {
    const f = r[i] / v[0];
    q.push(f);
    v.forEach((c, j) => (r[i + j] -= f * c));
  }
  return { q, r: r.map((x) => (Math.abs(x) < 1e-12 ? 0 : x)) };
}

const cmul = ([a, b]: Complex, [c, d]: Complex): Complex => [a * c - b * d, a * d + b * c];
const cdiv = ([a, b]: Complex, [c, d]: Complex): Complex => {
  const m = c * c + d * d;
  return [(a * c + b * d) / m, (b * c - a * d) / m];
};

/** All roots at once by Durand-Kerner iteration. Accurate enough for the small polynomials here. */
export function roots(p0: Poly): Complex[] {
  const first = p0.findIndex((c) => Math.abs(c) > 1e-12);
  if (first < 0) return [];
  const p = p0.slice(first).map((c) => c / p0[first]);
  const n = p.length - 1;
  if (n < 1) return [];
  let zs: Complex[] = Array.from({ length: n }, (_, k) => {
    const r = 1 + Math.max(...p.map(Math.abs));
    const t = (2 * Math.PI * k) / n + 0.4;
    return [0.5 * r * Math.cos(t), 0.5 * r * Math.sin(t)] as Complex;
  });
  for (let it = 0; it < 500; it++) {
    zs = zs.map((z, i) => {
      const v = p.reduce<Complex>((s, c) => { const m = cmul(s, z); return [m[0] + c, m[1]]; }, [0, 0]);
      let d: Complex = [1, 0];
      zs.forEach((w, j) => { if (j !== i) d = cmul(d, [z[0] - w[0], z[1] - w[1]]); });
      const f = cdiv(v, d);
      return [z[0] - f[0], z[1] - f[1]] as Complex;
    });
  }
  return zs.map(([a, b]) => [Math.abs(a) < 1e-7 ? 0 : a, Math.abs(b) < 1e-7 ? 0 : b] as Complex);
}

export const realRoots = (p: Poly) => roots(p).filter(([, b]) => b === 0).map(([a]) => a).sort((x, y) => x - y);

/** Rebuild coefficients from roots, as MATLAB's poly does. */
export const polyFromRoots = (rs: number[]): Poly => rs.reduce<Poly>((p, r) => conv(p, [1, -r]), [1]);

/** Evaluate in the matrix sense, Horner style, as polyvalm does. */
export function polyvalm(p: Poly, x: number[][]): number[][] {
  const n = x.length;
  const eye = x.map((_, i) => x.map((_, j) => (i === j ? 1 : 0)));
  let out = x.map((r) => r.map(() => 0));
  for (const c of p) {
    out = out.map((r) => x[0].map((_, j) => r.reduce((s, v, k) => s + v * x[k][j], 0)));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[i][j] += c * eye[i][j];
  }
  return out;
}

function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
    x[r] = s / m[r][r];
  }
  return x;
}

/** Least squares via normal equations on a centred, scaled x, which keeps higher degrees stable. */
export function polyfit(xs: number[], ys: number[], deg: number): Poly {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const span = Math.max(...xs.map((x) => Math.abs(x - mean))) || 1;
  const ts = xs.map((x) => (x - mean) / span);
  const k = deg + 1;
  const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => ts.reduce((s, t) => s + t ** (2 * deg - i - j), 0)));
  const b = Array.from({ length: k }, (_, i) => ts.reduce((s, t, n) => s + ys[n] * t ** (deg - i), 0));
  const inT = solve(A, b);
  // substitute t = (x - mean) / span to get coefficients in x
  return inT.reduce<Poly>((p, c) => {
    const next = conv(p, [1 / span, -mean / span]);
    next[next.length - 1] += c;
    return next;
  }, [0]).slice(1);
}

export const sumSquaredError = (p: Poly, xs: number[], ys: number[]) => xs.reduce((s, x, i) => s + (polyval(p, x) - ys[i]) ** 2, 0);

export type FitQuality = "exact" | "close" | "poor";

/** Judge a fit by the share of the data's spread it explains (R²), so the wording matches the picture. */
export function fitQuality(p: Poly, xs: number[], ys: number[]): FitQuality {
  const err = sumSquaredError(p, xs, ys);
  if (err < 1e-6) return "exact";
  const mean = ys.reduce((s, y) => s + y, 0) / ys.length;
  const spread = ys.reduce((s, y) => s + (y - mean) ** 2, 0);
  return spread > 0 && 1 - err / spread >= 0.99 ? "close" : "poor";
}

/** Show a polynomial as readable text, such as x³ - 2x² - x + 2. */
export function polyText(p: Poly, v = "x"): string {
  const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const n = p.length - 1;
  const parts: string[] = [];
  p.forEach((c0, i) => {
    const c = Number(c0.toFixed(4));
    if (c === 0) return;
    const e = n - i;
    const mag = Math.abs(c);
    const body = `${mag === 1 && e > 0 ? "" : mag}${e > 0 ? v : ""}${e > 1 ? String(e).split("").map((d) => sup[+d]).join("") : ""}`;
    parts.push(parts.length === 0 ? (c < 0 ? `-${body}` : body) : `${c < 0 ? "-" : "+"} ${body}`);
  });
  return parts.join(" ") || "0";
}

/* --------------------------- convolution frames --------------------------- */

export type ConvState = { a: Poly; b: Poly; n: number | null; pairs: [number, number][]; c: (number | null)[] };

export const MATLAB_CONV = ["a = [1 2 3];     % s² + 2s + 3", "b = [4 5 6];     % 4s² + 5s + 6", "c = conv(a, b)"];

/** b slides past a in reverse. Overlapping coefficients multiply and add up to one output coefficient. */
export function convFrames(a: Poly, b: Poly): Frame<ConvState>[] {
  const len = a.length + b.length - 1;
  const c: (number | null)[] = Array(len).fill(null);
  const frames: Frame<ConvState>[] = [{ state: { a, b, n: null, pairs: [], c: [...c] }, line: 2, message: `Degree ${a.length - 1} times degree ${b.length - 1} gives degree ${len - 1}, so the result has ${len} coefficients. Flip b, then slide it across a.`, stats: {} }];
  for (let n = 0; n < len; n++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < a.length; i++) if (n - i >= 0 && n - i < b.length) pairs.push([i, n - i]);
    const v = pairs.reduce((s, [i, j]) => s + a[i] * b[j], 0);
    c[n] = v;
    frames.push({ state: { a, b, n, pairs, c: [...c] }, line: 2, message: `${pairs.map(([i, j]) => `${a[i]}×${b[j]}`).join(" + ")} = ${v}.`, stats: {} });
  }
  frames.push({ state: { a, b, n: null, pairs: [], c: [...c] }, line: 2, message: `Done: ${polyText(c as number[], "s")}.`, stats: {} });
  return frames;
}

/* ------------------------- partial fraction frames ------------------------- */

export type Residue = { r: number; p: number };

/** Residues of b/a when a has distinct real roots and b has a lower degree. */
export function residue(b: Poly, a: Poly): Residue[] {
  const d = polyder(a);
  return realRoots(a)
    .map((p) => Number(p.toFixed(8)))
    .map((p) => ({ p, r: Number((polyval(b, p) / polyval(d, p)).toFixed(8)) }));
}

export type CoverState = { b: Poly; a: Poly; poles: number[]; done: Residue[]; active: number | null };

export const MATLAB_RESIDUE = ["b = [-4 8];", "a = [1 6 8];", "[r, p, k] = residue(b, a)"];

export function coverUpFrames(b: Poly, a: Poly): Frame<CoverState>[] {
  const all = residue(b, a);
  const poles = all.map((x) => x.p);
  const frames: Frame<CoverState>[] = [{ state: { b, a, poles, done: [], active: null }, line: 2, message: `The denominator ${polyText(a, "s")} has roots ${poles.join(" and ")}. Each root becomes one simple fraction.`, stats: {} }];
  const done: Residue[] = [];
  const others = (p: number) => poles.filter((q) => q !== p);
  for (const { p, r } of all) {
    frames.push({ state: { b, a, poles, done: [...done], active: p }, line: 2, message: `Cover up the factor (s ${p < 0 ? "+" : "-"} ${Math.abs(p)}) and put s = ${p} into what's left: ${polyval(b, p)} ÷ ${others(p).map((q) => `(${p} ${q < 0 ? "+" : "-"} ${Math.abs(q)})`).join("")} = ${r}.`, stats: {} });
    done.push({ p, r });
    frames.push({ state: { b, a, poles, done: [...done], active: null }, line: 2, message: `So the residue at s = ${p} is ${r}.`, stats: {} });
  }
  return frames;
}
