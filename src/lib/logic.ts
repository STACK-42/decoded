/* Digital logic: a unit-delay gate simulator plus the number and Boolean
   helpers the Logic Design course animates. Pure functions, no React. */

export type Bit = 0 | 1;
export type GateType = "AND" | "OR" | "NOT" | "BUF" | "NAND" | "NOR" | "XOR" | "XNOR";
export type NetGate = { id: string; type: GateType; in: string[] };
export type Signals = Record<string, Bit>;

export function evalGate(type: GateType, bits: Bit[]): Bit {
  const ones = bits.filter(Boolean).length;
  const all = ones === bits.length;
  const any = ones > 0;
  const odd = ones % 2 === 1;
  switch (type) {
    case "AND": return all ? 1 : 0;
    case "OR": return any ? 1 : 0;
    case "NOT": return bits[0] ? 0 : 1;
    case "BUF": return bits[0];
    case "NAND": return all ? 0 : 1;
    case "NOR": return any ? 0 : 1;
    case "XOR": return odd ? 1 : 0;
    case "XNOR": return odd ? 0 : 1;
  }
}

/** Every gate looks at its inputs as they are now and updates together: one gate delay. */
export function stepNet(gates: NetGate[], values: Signals): Signals {
  const next = { ...values };
  for (const g of gates) next[g.id] = evalGate(g.type, g.in.map((i) => values[i] ?? 0));
  return next;
}

export type Settle = { frames: Signals[]; stable: boolean };

/** Applies inputs and records each gate delay until nothing changes, or `limit` is hit (an oscillation). */
export function settle(gates: NetGate[], inputs: Signals, start: Signals, limit = 10): Settle {
  let cur: Signals = { ...start, ...inputs };
  const frames: Signals[] = [cur];
  for (let i = 0; i < limit; i++) {
    const next = stepNet(gates, cur);
    if (gates.every((g) => next[g.id] === cur[g.id])) return { frames, stable: true };
    frames.push(next);
    cur = next;
  }
  return { frames, stable: false };
}

/* ---------------------------- number systems --------------------------- */

const DIGITS = "0123456789ABCDEF";

export type DivisionStep = { value: number; quotient: number; remainder: number; digit: string };

/** Repeated division: the remainders, read bottom-up, are the digits. */
export function divisionSteps(n: number, base: number): DivisionStep[] {
  const out: DivisionStep[] = [];
  let v = Math.max(0, Math.floor(n));
  do {
    const remainder = v % base;
    const quotient = Math.floor(v / base);
    out.push({ value: v, quotient, remainder, digit: DIGITS[remainder] });
    v = quotient;
  } while (v > 0);
  return out;
}

export const toBase = (n: number, base: number) => n.toString(base).toUpperCase();
export const fromBase = (s: string, base: number) => parseInt(s, base);

/** Place-value breakdown of an integer written in `base`, most significant digit first. */
export function placeValues(s: string, base: number) {
  const clean = s.toUpperCase();
  return [...clean].map((ch, i) => {
    const power = clean.length - 1 - i;
    const digit = DIGITS.indexOf(ch);
    return { ch, digit, power, weight: base ** power, value: digit * base ** power };
  });
}

/** Repeated multiplication by 2 for a fraction between 0 and 1. */
export function fractionBits(f: number, max = 8) {
  const out: { value: number; product: number; bit: Bit }[] = [];
  let v = f;
  for (let i = 0; i < max && v > 0; i++) {
    const product = v * 2;
    const bit: Bit = product >= 1 ? 1 : 0;
    out.push({ value: v, product, bit });
    v = product - bit;
  }
  return out;
}

export const bitsOf = (n: number, width: number): Bit[] =>
  Array.from({ length: width }, (_, i) => (((n >>> (width - 1 - i)) & 1) as Bit));
export const bitsToNumber = (bits: Bit[]) => bits.reduce<number>((a, b) => a * 2 + b, 0);
export const bitString = (n: number, width: number) => bitsOf(n, width).join("");

export const onesComplement = (n: number, width: number) => ~n & (2 ** width - 1);
export const twosComplement = (n: number, width: number) => (onesComplement(n, width) + 1) & (2 ** width - 1);
/** The value a bit pattern stands for when read as two's complement. */
export const signedValue = (n: number, width: number) => (n >= 2 ** (width - 1) ? n - 2 ** width : n);
export const signMagnitude = (v: number, width: number) => (v < 0 ? 2 ** (width - 1) : 0) | Math.abs(v);

export const toGray = (n: number) => n ^ (n >> 1);
export function fromGray(g: number) {
  let n = g;
  for (let s = g >> 1; s > 0; s >>= 1) n ^= s;
  return n;
}
export const toBcd = (n: number) => [...String(n)].map((d) => bitString(Number(d), 4));
export const toExcess3 = (d: number) => bitString(d + 3, 4);

export type FloatParts = { sign: Bit; exponent: number; fraction: number; bits: string; value: number; kind: "zero" | "normal" | "subnormal" | "infinity" | "nan" };

/** Reads a number the way IEEE 754 single precision stores it. */
export function floatParts(value: number): FloatParts {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value);
  const u = view.getUint32(0);
  const exponent = (u >>> 23) & 0xff;
  const fraction = u & 0x7fffff;
  const kind = exponent === 255 ? (fraction ? "nan" : "infinity") : exponent === 0 ? (fraction ? "subnormal" : "zero") : "normal";
  return { sign: (u >>> 31) as Bit, exponent, fraction, bits: u.toString(2).padStart(32, "0"), value: view.getFloat32(0), kind };
}

/* ------------------------------ arithmetic ----------------------------- */

export type AddColumn = { index: number; a: Bit; b: Bit; carryIn: Bit; sum: Bit; carryOut: Bit };

export function fullAdd(a: Bit, b: Bit, c: Bit) {
  return { sum: (a ^ b ^ c) as Bit, carry: (((a & b) | ((a ^ b) & c)) as Bit) };
}

/** Column by column from the least significant bit, the way a ripple-carry adder works. */
export function rippleAdd(a: number, b: number, width: number, carryIn: Bit = 0): AddColumn[] {
  const out: AddColumn[] = [];
  let c = carryIn;
  for (let i = 0; i < width; i++) {
    const x = ((a >> i) & 1) as Bit;
    const y = ((b >> i) & 1) as Bit;
    const { sum, carry } = fullAdd(x, y, c);
    out.push({ index: i, a: x, b: y, carryIn: c, sum, carryOut: carry });
    c = carry;
  }
  return out;
}

/** Number of stages a carry has to travel through before the answer is valid. */
export const rippleDelay = (cols: AddColumn[]) => {
  let longest = 0;
  let run = 0;
  for (const c of cols) {
    run = c.carryOut && c.a !== c.b ? run + 1 : c.carryOut ? 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
};

/** Each stage's carry from its generate and propagate signals, without waiting on the stage below. */
export function lookaheadCarries(a: number, b: number, width: number, c0: Bit = 0) {
  const g = Array.from({ length: width }, (_, i) => (((a >> i) & (b >> i) & 1) as Bit));
  const p = Array.from({ length: width }, (_, i) => ((((a >> i) | (b >> i)) & 1) as Bit));
  const c: Bit[] = [c0];
  for (let i = 0; i < width; i++) {
    let v: number = g[i];
    for (let j = 0; j < i; j++) {
      let t: number = g[j];
      for (let k = j + 1; k <= i; k++) t &= p[k];
      v |= t;
    }
    let t0: number = c0;
    for (let k = 0; k <= i; k++) t0 &= p[k];
    c.push(((v | t0) as Bit));
  }
  return { g, p, c };
}

/* ---------------------------- Boolean algebra -------------------------- */

/** Evaluates a Boolean expression written with ' + · and juxtaposition, e.g. "A'B + (B+C)'". */
export function evalExpr(expr: string, env: Record<string, Bit>): Bit {
  const s = expr.replace(/\s+/g, "");
  let i = 0;
  const parseOr = (): Bit => {
    let v = parseAnd();
    while (s[i] === "+") {
      i++;
      const r = parseAnd();
      v = (v | r) as Bit;
    }
    return v;
  };
  const parseAnd = (): Bit => {
    let v = parseUnary();
    while (i < s.length && (s[i] === "." || s[i] === "(" || /[A-Z01]/.test(s[i]))) {
      if (s[i] === ".") i++;
      const r = parseUnary();
      v = (v & r) as Bit;
    }
    return v;
  };
  const parseUnary = (): Bit => {
    let v: Bit;
    if (s[i] === "(") {
      i++;
      v = parseOr();
      i++;
    } else if (s[i] === "0" || s[i] === "1") {
      v = Number(s[i++]) as Bit;
    } else {
      v = env[s[i++]] ?? 0;
    }
    while (s[i] === "'") {
      i++;
      v = (v ? 0 : 1) as Bit;
    }
    return v;
  };
  return parseOr();
}

export function truthRows(vars: string[]) {
  const n = vars.length;
  return Array.from({ length: 2 ** n }, (_, m) => {
    const env: Record<string, Bit> = {};
    vars.forEach((v, i) => (env[v] = ((m >> (n - 1 - i)) & 1) as Bit));
    return { m, env };
  });
}

export const sameFunction = (a: string, b: string, vars: string[]) =>
  truthRows(vars).every(({ env }) => evalExpr(a, env) === evalExpr(b, env));

/** Sum of products: one AND term for every row where the output is 1. */
export function sopFromMinterms(minterms: number[], vars: string[]) {
  const n = vars.length;
  if (!minterms.length) return "0";
  if (minterms.length === 2 ** n) return "1";
  return [...minterms]
    .sort((a, b) => a - b)
    .map((m) => vars.map((v, i) => (((m >> (n - 1 - i)) & 1) ? v : `${v}'`)).join(""))
    .join(" + ");
}

/** Product of sums: one OR term for every row where the output is 0. */
export function posFromMinterms(minterms: number[], vars: string[]) {
  const n = vars.length;
  const zeros = Array.from({ length: 2 ** n }, (_, m) => m).filter((m) => !minterms.includes(m));
  if (!zeros.length) return "1";
  if (zeros.length === 2 ** n) return "0";
  return zeros.map((m) => `(${vars.map((v, i) => (((m >> (n - 1 - i)) & 1) ? `${v}'` : v)).join(" + ")})`).join("");
}

/* -------------------------------- K-maps ------------------------------- */

export type Implicant = { cells: number[]; term: string };

const GRAY2 = [0, 1, 3, 2];

/** Where minterm m sits on the map: row bits are the first variables, column bits the rest. */
export function kmapLayout(n: 2 | 3 | 4) {
  const rowBits = n === 4 ? 2 : 1;
  const colBits = n - rowBits;
  const rows = rowBits === 2 ? GRAY2 : [0, 1];
  const cols = colBits === 2 ? GRAY2 : [0, 1];
  return { rowBits, colBits, rows, cols, cell: (r: number, c: number) => (rows[r] << colBits) | cols[c] };
}

function termOf(mask: number, value: number, vars: string[]) {
  const n = vars.length;
  const parts: string[] = [];
  vars.forEach((v, i) => {
    const bit = 1 << (n - 1 - i);
    if (!(mask & bit)) parts.push(value & bit ? v : `${v}'`);
  });
  return parts.join("") || "1";
}

/** All maximal rectangles of 1s (Quine–McCluskey), then a smallest set that covers every 1. */
export function minimizeSop(minterms: number[], vars: string[]): Implicant[] {
  const n = vars.length;
  const on = [...new Set(minterms)];
  if (!on.length) return [];
  type Cube = { value: number; mask: number };
  let current: Cube[] = on.map((m) => ({ value: m, mask: 0 }));
  const primes: Cube[] = [];
  while (current.length) {
    const used = new Set<number>();
    const next = new Map<string, Cube>();
    current.forEach((a, i) =>
      current.forEach((b, j) => {
        if (j <= i || a.mask !== b.mask) return;
        const diff = a.value ^ b.value;
        if (diff && !(diff & (diff - 1))) {
          used.add(i);
          used.add(j);
          const cube = { value: a.value & ~diff, mask: a.mask | diff };
          next.set(`${cube.value}/${cube.mask}`, cube);
        }
      }),
    );
    current.forEach((c, i) => !used.has(i) && primes.push(c));
    current = [...next.values()];
  }
  const covers = (c: Cube) => on.filter((m) => (m & ~c.mask) === c.value);
  // the smallest cover by brute force; maps here have at most 16 cells and few primes
  const k = primes.length;
  let best: Cube[] | null = null;
  const cost = (set: Cube[]) => set.length * 100 + set.reduce((s, c) => s + (n - popcount(c.mask)), 0);
  for (let pick = 1; pick < 2 ** k; pick++) {
    const set = primes.filter((_, i) => (pick >> i) & 1);
    if (best && cost(set) >= cost(best)) continue;
    const covered = new Set(set.flatMap(covers));
    if (on.every((m) => covered.has(m))) best = set;
  }
  return (best ?? primes).map((c) => ({
    cells: Array.from({ length: 2 ** n }, (_, m) => m).filter((m) => (m & ~c.mask) === c.value),
    term: termOf(c.mask, c.value, vars),
  }));
}

function popcount(x: number) {
  let c = 0;
  for (let v = x; v; v &= v - 1) c++;
  return c;
}

/* ----------------------------- storage logic --------------------------- */

export type JkInput = { j: Bit; k: Bit };

export function jkNext(q: Bit, { j, k }: JkInput): Bit {
  if (j && k) return (q ? 0 : 1) as Bit;
  if (j) return 1;
  if (k) return 0;
  return q;
}

/** Output of a level-sensitive D latch and an edge-triggered D flip-flop over the same waveforms. */
export function latchVersusFlipFlop(clk: Bit[], d: Bit[], start: Bit = 0) {
  let l = start;
  let f = start;
  const latch: Bit[] = [];
  const flop: Bit[] = [];
  clk.forEach((c, i) => {
    if (c) l = d[i];
    if (c && !(clk[i - 1] ?? 0)) f = d[i];
    latch.push(l);
    flop.push(f);
  });
  return { latch, flop };
}

/** The state of an n-bit shift register after each clock edge. */
export function shiftFrames(width: number, input: Bit[], start?: Bit[]) {
  const frames: Bit[][] = [start ?? (Array(width).fill(0) as Bit[])];
  for (const b of input) frames.push([b, ...frames[frames.length - 1].slice(0, width - 1)]);
  return frames;
}

/** A ripple up-counter: each stage toggles when the stage before it falls from 1 to 0. */
export function counterStep(bits: Bit[]) {
  const next = [...bits];
  const toggled: number[] = [];
  for (let i = next.length - 1; i >= 0; i--) {
    next[i] = (next[i] ? 0 : 1) as Bit;
    toggled.push(i);
    if (next[i] === 1) break;
  }
  return { next, toggled };
}
