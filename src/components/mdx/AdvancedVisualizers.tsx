import { useMemo, useState } from "react";
import { ArrayCells, btn, inputCls, Legend, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { bitOp, cliqueGraph, cnfVars, findClique, litText, parseCNF, truthTable, DIJKSTRA_CODE, dijkstraFrames, type WEdge, ACTIVITY_CODE, activityFrames, CLRS_ACTIVITIES, countCoins, greedyChange, HUFFMAN_CODE, huffmanFrames, optimalChange, scheduleInOrder, scheduleOptimal, type Activity, type HuffNode, binomialFrames, coinRowFrames, DP_CODE, lcsFrames, robotFrames, type Cell, perfectHeights, SKIP_CODE, skipFrames, type SkipOp, INTERVAL_SEARCH_CODE, INTERVAL_TREE, intervalSearchFrames, layoutAug, OS_SELECT_CODE, OS_TREE, osSelectFrames, type AugNode, type PathState, CPP_RB, rbFrames, type RBOp, type RBSnapshot, CHAIN_PSEUDO, DELETED, doublingCosts, HASH_PSEUDO, hashDivision, hashFolding, hashFrames, hashMidSquare, hashMultiplication, type HashConfig, type HashMode, type HashOp, type Second, CPP_SELECT, medianOfMedians, selectFrames, countingSortFrames, CPP_COUNTING_SORT, CPP_RADIX, decisionPath, DECISION_TREE_3, radixSortFrames, type DNode, CPP_QUICKSORT, quicksortFrames, type QuickState, fibByMatrix, fracLabel, gaussFrames, strassen, unevenLevels, CPP_COUNT_ONES, CPP_GAUSS, type Frac, CPP_FAST_POWER, CPP_MIN_MAX, fastPowerFrames, minMaxFrames, fibCalls, firstViolation, isPowerOfTwo, popcountFrames, toBits, type BitOp, fText, fmtExp, masterMethod, powN, recursionLevels, termShares, type BoundKind } from "@/lib/advancedAlgorithms";
import { humanTime, formatOps } from "@/lib/algorithms";

/* ============================================================
   Visualizers for the Advanced Algorithms & Analysis course.
   They reuse the look (and, where it fits, the <Stepper>) of
   AlgoVisualizers.tsx; the logic lives in advancedAlgorithms.ts.
   ============================================================ */

function Panel({ title, legend, children }: { title: string; legend?: [string, string][]; children: React.ReactNode }) {
  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="eyebrow text-violet">{title}</div>
        {legend && <Legend items={legend} />}
      </div>
      <div className="p-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

/* ----------------------- term contribution ----------------------- */

/** The lecture's experiment: how much of T(n) = 3n² + 8n + 10 each term is responsible for. */
export function TermContribution({ initialN = 10 }: { initialN?: number }) {
  const [n, setN] = useState(initialN);
  const [coef, setCoef] = useState<"3" | "1">("3");
  const lead = Number(coef);
  const terms = [
    { label: `${coef === "3" ? "3" : ""}n²`, value: lead * n * n, bar: "bg-violet" },
    { label: "8n", value: 8 * n, bar: "bg-sky" },
    { label: "10", value: 10, bar: "bg-orange" },
  ];
  const shares = termShares(terms.map((t) => t.value));
  return (
    <Panel title={`Who does the work in T(n) = ${terms[0].label} + 8n + 10?`} legend={terms.map((t) => [t.bar, t.label] as [string, string])}>
      <label className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">n</span>
        <input type="range" min={1} max={100} value={n} onChange={(e) => setN(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="n" />
        <span className="font-display text-xl font-bold w-24">n = {n}</span>
      </label>
      <div className="flex h-8 w-full overflow-hidden rounded-sm border border-border">
        {terms.map((t, i) => (
          <div key={t.label} className={`${t.bar} transition-all duration-200`} style={{ width: `${shares[i] * 100}%` }} title={t.label} />
        ))}
      </div>
      <table className="w-full font-mono text-xs border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
            <th className="text-left py-1.5 font-normal">term</th>
            <th className="text-right py-1.5 font-normal">value</th>
            <th className="text-right py-1.5 font-normal">share of T(n)</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((t, i) => (
            <tr key={t.label} className="border-b border-border/50">
              <td className="py-1.5">{t.label}</td>
              <td className="py-1.5 text-right">{t.value.toLocaleString("en-US")}</td>
              <td className="py-1.5 text-right">{(shares[i] * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3">
        <Toggle<"3" | "1">
          value={coef}
          onChange={setCoef}
          options={[
            ["3", "Experiment 1: keep the 3"],
            ["1", "Experiment 2: drop the 3"],
          ]}
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        At n = 1 the constant 10 is the biggest part. Slide to the right: the n² term takes over whether or not you keep its coefficient.
      </p>
    </Panel>
  );
}

/* --------------------------- Big-O witness --------------------------- */

type WitnessPreset = { label: string; f: (n: number) => number; g: (n: number) => number; fText: string; gText: string; kind: BoundKind; c: number; n0: number };

const WITNESS_PRESETS: WitnessPreset[] = [
  { label: "3n + 2 ∈ O(n)", f: (n) => 3 * n + 2, g: (n) => n, fText: "3n + 2", gText: "n", kind: "O", c: 5, n0: 1 },
  { label: "3n² + 20 ∈ O(n²)", f: (n) => 3 * n * n + 20, g: (n) => n * n, fText: "3n² + 20", gText: "n²", kind: "O", c: 4, n0: 5 },
  { label: "n² ∈ Ω(n)", f: (n) => n * n, g: (n) => n, fText: "n²", gText: "n", kind: "Ω", c: 1, n0: 1 },
  { label: "5n² + 100n ∈ Ω(n²)", f: (n) => 5 * n * n + 100 * n, g: (n) => n * n, fText: "5n² + 100n", gText: "n²", kind: "Ω", c: 5, n0: 1 },
];

/** Plot f(n) against c·g(n) and check whether the chosen c and n₀ prove the bound. */
export function BigOWitness() {
  const [pi, setPi] = useState(0);
  const pr = WITNESS_PRESETS[pi];
  const [c, setC] = useState(pr.c);
  const [n0, setN0] = useState(pr.n0);
  const choose = (i: number) => {
    setPi(i);
    setC(WITNESS_PRESETS[i].c);
    setN0(WITNESS_PRESETS[i].n0);
  };

  const bad = firstViolation(pr.f, pr.g, c, n0, pr.kind);
  const maxN = Math.max(12, n0 * 2 + 4);
  const W = 460;
  const H = 200;
  const pts = Array.from({ length: maxN + 1 }, (_, n) => n);
  const yMax = Math.max(...pts.map((n) => Math.max(pr.f(n), c * pr.g(n)))) * 1.05 || 1;
  const X = (n: number) => 30 + (n / maxN) * (W - 40);
  const Y = (v: number) => H - 20 - (v / yMax) * (H - 30);
  const path = (fn: (n: number) => number) => pts.map((n, i) => `${i ? "L" : "M"}${X(n).toFixed(1)},${Y(fn(n)).toFixed(1)}`).join(" ");

  return (
    <Panel title="Find c and n₀" legend={[["bg-violet", "f(n)"], ["bg-sky", "c · g(n)"]]}>
      <div className="flex flex-wrap gap-1.5">
        {WITNESS_PRESETS.map((p, i) => (
          <button key={p.label} type="button" className={`${btn} !px-2 !py-1 !normal-case !tracking-normal ${i === pi ? "border-foreground" : ""}`} onClick={() => choose(i)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <label className="inline-flex items-center gap-2">
          <span className="uppercase tracking-widest text-muted-foreground">c</span>
          <input type="range" min={0.5} max={10} step={0.5} value={c} onChange={(e) => setC(Number(e.target.value))} aria-label="c" />
          <span className="w-8 text-foreground">{c}</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="uppercase tracking-widest text-muted-foreground">n₀</span>
          <input type="range" min={1} max={20} value={n0} onChange={(e) => setN0(Number(e.target.value))} aria-label="n0" />
          <span className="w-8 text-foreground">{n0}</span>
        </label>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-[560px]" role="img" aria-label="f(n) against c times g(n)">
        <rect x={X(n0)} y={10} width={X(maxN) - X(n0)} height={H - 30} className={bad === null ? "fill-mint/10" : "fill-orange/10"} />
        <line x1={X(n0)} x2={X(n0)} y1={10} y2={H - 20} className="stroke-muted-foreground" strokeDasharray="3 3" />
        <text x={X(n0) + 4} y={22} fontSize={10} className="fill-muted-foreground font-mono">n ≥ n₀</text>
        <line x1={30} x2={W - 10} y1={H - 20} y2={H - 20} className="stroke-border" />
        <path d={path((n) => c * pr.g(n))} className="stroke-sky fill-none" strokeWidth={2.5} />
        <path d={path(pr.f)} className="stroke-violet fill-none" strokeWidth={2.5} />
        {pts.filter((n) => n % Math.ceil(maxN / 6) === 0).map((n) => (
          <text key={n} x={X(n)} y={H - 6} fontSize={10} textAnchor="middle" className="fill-muted-foreground font-mono">{n}</text>
        ))}
      </svg>
      <div className="font-mono text-sm">
        need 0 ≤ {pr.kind === "O" ? `${pr.fText} ≤ ${c}·${pr.gText}` : `${c}·${pr.gText} ≤ ${pr.fText}`} for every n ≥ {n0}
      </div>
      <p className={`text-sm font-semibold ${bad === null ? "text-mint" : "text-orange"}`}>
        {bad === null
          ? `It holds. c = ${c} and n₀ = ${n0} prove ${pr.fText} ∈ ${pr.kind}(${pr.gText}).`
          : `Fails at n = ${bad}: f(${bad}) = ${pr.f(bad)} but c·g(${bad}) = ${c * pr.g(bad)}. Try a ${pr.kind === "O" ? "bigger c or a bigger n₀" : "smaller c or a bigger n₀"}.`}
      </p>
    </Panel>
  );
}

/* ---------------------------- Fibonacci ---------------------------- */

export function FibonacciCalls({ initialN = 30 }: { initialN?: number }) {
  const [n, setN] = useState(initialN);
  const rec = fibCalls(n);
  const iter = n + 1;
  return (
    <Panel title="fib(n): recursive vs. with an array">
      <label className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">n</span>
        <input type="range" min={0} max={100} value={n} onChange={(e) => setN(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="n" />
        <span className="font-display text-xl font-bold w-24">n = {n}</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border border-orange/60 bg-orange/10 rounded-sm p-4">
          <div className="eyebrow text-orange mb-1">fib (recursive)</div>
          <div className="font-display text-2xl font-bold">{formatOps(rec)} calls</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">≈ {humanTime(rec / 10)} at one call per nanosecond</div>
        </div>
        <div className="border border-mint/60 bg-mint/10 rounded-sm p-4">
          <div className="eyebrow text-mint mb-1">fib2 (array)</div>
          <div className="font-display text-2xl font-bold">{iter} terms</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">≈ {iter} ns: {humanTime(iter / 10)}</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        The recursive version recomputes the same terms again and again, so its work more than doubles every two steps of n. The array version computes each term once.
      </p>
    </Panel>
  );
}

/* ------------------------- recurrences ------------------------- */

const PRESETS: { label: string; a: number; b: number; k: number; p?: number }[] = [
  { label: "merge sort", a: 2, b: 2, k: 1 },
  { label: "binary search", a: 1, b: 2, k: 0 },
  { label: "2T(n/2) + n²", a: 2, b: 2, k: 2 },
  { label: "2T(n/2) + √n", a: 2, b: 2, k: 0.5 },
  { label: "3T(n/4) + n²", a: 3, b: 4, k: 2 },
  { label: "Gauss multiply", a: 3, b: 2, k: 1 },
  { label: "matrix D&C", a: 8, b: 2, k: 2 },
  { label: "Strassen", a: 7, b: 2, k: 2 },
  { label: "2T(n/2) + n log n", a: 2, b: 2, k: 1, p: 1 },
];

const CASE_TONE: Record<string, string> = { "1": "text-sky", "2": "text-violet", "3": "text-orange", gap: "text-muted-foreground" };

/** Recursion tree + master method for T(n) = a·T(n/b) + n^k (log n)^p. */
export function RecurrenceExplorer({ a: a0 = 2, b: b0 = 2, k: k0 = 1, p: p0 = 0 }: { a?: number; b?: number; k?: number; p?: number }) {
  const [v, setV] = useState({ a: a0, b: b0, k: k0, p: p0 });
  const [text, setText] = useState({ a: String(a0), b: String(b0), k: String(k0) });
  const res = useMemo(() => masterMethod(v.a, v.b, v.k, v.p), [v]);
  const levels = useMemo(() => recursionLevels(v.a, v.b, v.k, 4096), [v]);
  const shown = levels.slice(0, 5);
  const maxCost = Math.max(...levels.map((l) => l.cost));
  const ratio = v.a / Math.pow(v.b, v.k);

  const apply = () => {
    const a = Number(text.a);
    const b = Number(text.b);
    const k = Number(text.k);
    if (Number.isInteger(a) && a >= 1 && a <= 16 && b > 1 && b <= 16 && k >= 0 && k <= 4) setV({ a, b, k, p: 0 });
  };
  const pick = (pr: (typeof PRESETS)[number]) => {
    setV({ a: pr.a, b: pr.b, k: pr.k, p: pr.p ?? 0 });
    setText({ a: String(pr.a), b: String(pr.b), k: String(pr.k) });
  };

  const recText = `T(n) = ${v.a === 1 ? "" : v.a}T(n/${v.b}) + ${fText(v.k, v.p)}`;

  return (
    <Panel title="Recursion tree & master method" legend={[["bg-violet", "cost of each level"]]}>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((pr) => (
          <button key={pr.label} type="button" className={`${btn} !px-2 !py-1 !normal-case !tracking-normal`} onClick={() => pick(pr)}>
            {pr.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
        <span>T(n) =</span>
        <input aria-label="a" className={`${inputCls} w-14`} value={text.a} onChange={(e) => setText((t) => ({ ...t, a: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
        <span>T(n /</span>
        <input aria-label="b" className={`${inputCls} w-14`} value={text.b} onChange={(e) => setText((t) => ({ ...t, b: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
        <span>) + n^</span>
        <input aria-label="k" className={`${inputCls} w-16`} value={text.k} onChange={(e) => setText((t) => ({ ...t, k: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
        <button type="button" className={btn} onClick={apply}>
          Solve
        </button>
      </div>

      <div className="font-display text-xl md:text-2xl font-bold">{recText}</div>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs border-collapse min-w-[460px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-3 font-normal">level</th>
              <th className="text-left py-2 pr-3 font-normal">subproblems</th>
              <th className="text-left py-2 pr-3 font-normal">each of size</th>
              <th className="text-left py-2 font-normal">level cost (× root)</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.depth} className="border-b border-border/50">
                <td className="py-2 pr-3">{l.depth}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex flex-wrap gap-[3px] max-w-[160px] align-middle">
                    {Array.from({ length: Math.min(l.nodes, 27) }, (_, i) => (
                      <span key={i} className="inline-block h-2.5 w-2.5 rounded-full border border-violet bg-violet/20" />
                    ))}
                    {l.nodes > 27 && <span className="text-muted-foreground">…</span>}
                  </span>
                  <span className="ml-2">{formatOps(l.nodes)}</span>
                </td>
                <td className="py-2 pr-3">{l.depth === 0 ? "n" : `n/${formatOps(Math.pow(v.b, l.depth))}`}</td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-2 w-full">
                    <span className="h-2.5 bg-violet rounded-[2px] transition-all" style={{ width: `${Math.max(2, (l.cost / maxCost) * 100)}px` }} />
                    {fmtExp(l.cost)}
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="py-2 text-muted-foreground">
                … down to pieces of size 1, after about log<sub>{v.b}</sub> n levels. Each level costs <b className="text-foreground">{fmtExp(ratio)}×</b> the one above it.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-border pt-4 flex flex-col gap-1.5">
        <div className="font-mono text-xs text-muted-foreground">
          compare f(n) = <span className="text-foreground">{fText(v.k, v.p)}</span> with n<sup>log<sub>{v.b}</sub> {v.a}</sup> = <span className="text-foreground">{powN(res.critical)}</span>
        </div>
        <div className="font-display text-lg font-bold">
          <span className={CASE_TONE[String(res.case)]}>{res.case === "gap" ? "No case applies" : `Case ${res.case}`}</span>
          <span className="text-foreground"> → T(n) = {res.answer}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{res.why}</p>
      </div>
    </Panel>
  );
}

/* ------------------------ bit manipulation ------------------------ */

const BIT_OPS: { op: BitOp; label: string; symbol: string; unary?: boolean; shift?: boolean }[] = [
  { op: "and", label: "AND", symbol: "&" },
  { op: "or", label: "OR", symbol: "|" },
  { op: "xor", label: "XOR", symbol: "^" },
  { op: "not", label: "NOT", symbol: "~", unary: true },
  { op: "shl", label: "<<", symbol: "<<", shift: true },
  { op: "shr", label: ">>", symbol: ">>", shift: true },
  { op: "rotl", label: "rotate left", symbol: "rotl", shift: true },
  { op: "rotr", label: "rotate right", symbol: "rotr", shift: true },
];

function BitRow({ label, value, width, tone, changed }: { label: string; value: number; width: number; tone: string; changed?: Set<number> }) {
  const bits = toBits(value, width);
  return (
    <div className="flex items-center gap-3 font-mono">
      <span className="w-24 text-right text-[11px] text-muted-foreground">{label}</span>
      <span className="flex gap-1">
        {bits.split("").map((b, i) => {
          const pos = width - 1 - i;
          return (
            <span
              key={i}
              className={`w-7 h-8 flex items-center justify-center text-sm border rounded-sm transition-colors ${
                b === "1" ? tone : "border-border text-muted-foreground"
              } ${changed?.has(pos) ? "ring-2 ring-orange" : ""}`}
            >
              {b}
            </span>
          );
        })}
      </span>
      <span className="w-12 text-sm">= {value}</span>
    </div>
  );
}

/** Try every bitwise operator on two small numbers and see the bits line up. */
export function BitPlayground({ a: a0 = 5, b: b0 = 3, width = 8, op: op0 = "and" }: { a?: number; b?: number; width?: number; op?: BitOp }) {
  const [a, setA] = useState(a0);
  const [b, setB] = useState(b0);
  const [op, setOp] = useState<BitOp>(op0);
  const meta = BIT_OPS.find((o) => o.op === op)!;
  const max = (1 << width) - 1;
  const bVal = meta.shift ? Math.min(b, width - 1) : b;
  const result = bitOp(op, a, bVal, width);
  const clamp = (v: string, hi: number) => Math.max(0, Math.min(hi, Number(v) || 0));
  return (
    <Panel title={`Bitwise operators on ${width}-bit numbers`} legend={[["bg-sky", "A"], ["bg-violet", "B"], ["bg-mint", "result"]]}>
      <div className="flex flex-wrap gap-1.5">
        {BIT_OPS.map((o) => (
          <button key={o.op} type="button" className={`${btn} !px-2 !py-1 ${o.op === op ? "bg-foreground text-background" : ""}`} onClick={() => setOp(o.op)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
        <label className="inline-flex items-center gap-2">
          A <input aria-label="A" className={`${inputCls} w-20`} value={a} inputMode="numeric" onChange={(e) => setA(clamp(e.target.value, max))} />
        </label>
        {!meta.unary && (
          <label className="inline-flex items-center gap-2">
            {meta.shift ? "by k =" : "B"}
            <input aria-label={meta.shift ? "k" : "B"} className={`${inputCls} w-20`} value={b} inputMode="numeric" onChange={(e) => setB(clamp(e.target.value, meta.shift ? width - 1 : max))} />
          </label>
        )}
      </div>
      <div className="flex flex-col gap-1.5 overflow-x-auto">
        <BitRow label="A" value={a} width={width} tone="border-sky bg-sky/15" />
        {!meta.unary && !meta.shift && <BitRow label="B" value={b} width={width} tone="border-violet bg-violet/15" />}
        <div className="ml-[108px] h-px bg-border" style={{ width: width * 32 }} />
        <BitRow label={meta.unary ? "~A" : meta.shift ? `A ${meta.symbol} ${bVal}` : `A ${meta.symbol} B`} value={result} width={width} tone="border-mint bg-mint/20" />
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        A = {a} is {isPowerOfTwo(a) ? <span className="text-mint">a power of two</span> : "not a power of two"}, because A &amp; (A − 1) = {a} &amp; {Math.max(0, a - 1)} = {a > 0 ? a & (a - 1) : "—"}.
      </div>
    </Panel>
  );
}

export function CountOnes({ n = 13 }: { n?: number }) {
  const [value, setValue] = useState(n);
  const [text, setText] = useState(String(n));
  const frames = useMemo(() => popcountFrames(value), [value]);
  return (
    <Stepper
      title="Counting 1-bits with n & (n − 1)"
      frames={frames}
      code={CPP_COUNT_ONES}
      codeLabel="C++"
      legend={[["bg-mint", "1-bit"], ["bg-orange", "just cleared"]]}
      render={(s) => (
        <div className="flex flex-col gap-2">
          {s.prev !== undefined && <BitRow label="before" value={s.prev} width={8} tone="border-mint bg-mint/15" />}
          {s.prev !== undefined && <BitRow label="n − 1" value={s.prev - 1} width={8} tone="border-sky bg-sky/15" />}
          <BitRow label="n" value={s.n} width={8} tone="border-mint bg-mint/15" changed={s.cleared !== undefined ? new Set([s.cleared]) : undefined} />
          <div className="font-display text-2xl font-bold mt-2">count = {s.count}</div>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="n" className={`${inputCls} w-24`} value={text} inputMode="numeric" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setValue(Math.max(0, Math.min(255, Number(text) || 0)))} />
          <button type="button" className={btn} onClick={() => setValue(Math.max(0, Math.min(255, Number(text) || 0)))}>
            Count
          </button>
        </div>
      }
    />
  );
}

/* --------------------------- fast power --------------------------- */

export function FastPowerVisualizer({ a: a0 = 3, b: b0 = 13 }: { a?: number; b?: number }) {
  const [v, setV] = useState({ a: a0, b: b0 });
  const [text, setText] = useState({ a: String(a0), b: String(b0) });
  const frames = useMemo(() => fastPowerFrames(v.a, v.b), [v]);
  const apply = () => {
    const a = Number(text.a);
    const b = Number(text.b);
    if (Number.isInteger(a) && a >= 1 && a <= 99 && Number.isInteger(b) && b >= 1 && b <= 1000) setV({ a, b });
  };
  return (
    <Stepper
      title="FastPower: square the base, halve the exponent"
      frames={frames}
      code={CPP_FAST_POWER}
      codeLabel="C++"
      legend={[["bg-sky", "running now"], ["bg-mint", "returned"]]}
      render={(s) => (
        <div className="flex flex-col gap-1.5 font-mono text-sm">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">call stack (outermost first)</span>
          {s.calls.map((c, i) => (
            <div
              key={i}
              className={`flex flex-wrap items-baseline gap-x-3 px-3 py-1.5 border rounded-sm transition-colors ${
                i === s.active ? "border-sky bg-sky/15" : c.result !== undefined ? "border-mint/60 bg-mint/10" : "border-border"
              }`}
              style={{ marginLeft: Math.min(i, 8) * 14 }}
            >
              <span>
                fastPower({c.a.toString().length > 18 ? `${c.a.toString().slice(0, 8)}…` : c.a.toString()}, {c.b})
              </span>
              {c.result !== undefined && (
                <span className="text-mint break-all">→ {c.result.toString().length > 24 ? `${c.result.toString().slice(0, 12)}… (${c.result.toString().length} digits)` : c.result.toString()}</span>
              )}
            </div>
          ))}
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          a <input aria-label="a" className={`${inputCls} w-20`} value={text.a} inputMode="numeric" onChange={(e) => setText((t) => ({ ...t, a: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
          b <input aria-label="b" className={`${inputCls} w-20`} value={text.b} inputMode="numeric" onChange={(e) => setText((t) => ({ ...t, b: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
          <button type="button" className={btn} onClick={apply}>
            Compute aᵇ
          </button>
        </div>
      }
    />
  );
}

/* ------------------------- min and max ------------------------- */

export function MinMaxVisualizer({ input = [11, 3, 5, 7, 1, 9, 5, 2, 0, 8, 10, 13, 21, 5, 4, 1] }: { input?: number[] }) {
  const frames = useMemo(() => minMaxFrames(input), [input]);
  return (
    <Stepper
      title="Min and max in 1.5n − 2 comparisons"
      frames={frames}
      code={CPP_MIN_MAX}
      codeLabel="C++"
      legend={[["bg-neon", "comparing"], ["bg-orange", "swapped"], ["bg-mint", "min / max"]]}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <ArrayCells s={s} />
          {s.phase !== "pairs" && (
            <div className="flex flex-wrap gap-6 font-display text-xl font-bold">
              <span>
                min = <span className="text-mint">{s.min}</span>
              </span>
              <span>
                max = <span className="text-mint">{s.max}</span>
              </span>
            </div>
          )}
        </div>
      )}
    />
  );
}

/* ------------------------ uneven recursion tree ------------------------ */

/** Recursion tree for T(n) = Σ T(fᵢ·n) + n^k, with every node labelled by its cost. */
export function RecursionTreeDiagram({ fracs, k = 1, depth = 3, title }: { fracs: Frac[]; k?: number; depth?: number; title?: string }) {
  const levels = useMemo(() => unevenLevels(fracs, k, depth), [fracs, k, depth]);
  const cost = (f: Frac) => (k === 0 ? "c" : k === 1 ? `c·${fracLabel(f)}` : `c(${fracLabel(f)})${k === 2 ? "²" : `^${k}`}`);
  const rec = `T(n) = ${fracs.map((f) => `T(${fracLabel(f)})`).join(" + ")} + c${k === 0 ? "" : k === 1 ? "n" : k === 2 ? "n²" : `n^${k}`}`;
  return (
    <Panel title={title ?? `Recursion tree: ${rec}`} legend={[["bg-violet", "level total"]]}>
      <div className="overflow-x-auto">
        <div className="flex flex-col gap-3 min-w-fit">
          {levels.map((l, d) => (
            <div key={d} className="flex items-center gap-4">
              <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">level {d}</span>
              <div className="flex-1 flex justify-center gap-1.5 flex-wrap">
                {l.sizes.length <= 16 ? (
                  l.sizes.map((f, i) => (
                    <span key={i} className="px-1.5 py-1 border border-border rounded-sm font-mono text-[11px] whitespace-nowrap">
                      {cost(f)}
                    </span>
                  ))
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">{l.sizes.length} nodes …</span>
                )}
              </div>
              <span className="w-32 shrink-0 text-right font-mono text-xs">
                = <span className="text-violet font-bold">{fmtExp(l.cost)}</span> · c{k === 0 ? "" : k === 1 ? "n" : k === 2 ? "n²" : `n^${k}`}
              </span>
            </div>
          ))}
          <div className="text-center font-mono text-xs text-muted-foreground">⋮</div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------------- Gauss multiplication ---------------------- */

export function GaussMultiply({ a: a0 = 1234, b: b0 = 5678 }: { a?: number; b?: number }) {
  const [v, setV] = useState({ a: a0, b: b0 });
  const [text, setText] = useState({ a: String(a0), b: String(b0) });
  const frames = useMemo(() => gaussFrames(BigInt(v.a), BigInt(v.b)), [v]);
  const apply = () => {
    const a = Number(text.a);
    const b = Number(text.b);
    if (Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a < 1e8 && b < 1e8) setV({ a, b });
  };
  return (
    <Stepper
      title="Gauss's trick: 3 multiplications instead of 4"
      frames={frames}
      code={CPP_GAUSS}
      codeLabel="C++"
      legend={[["bg-sky", "running now"], ["bg-mint", "returned"]]}
      render={(s) => (
        <div className="flex flex-col gap-1 font-mono text-xs max-h-[340px] overflow-y-auto">
          {s.calls.map((c, i) => (
            <div
              key={i}
              className={`flex flex-wrap items-baseline gap-x-3 px-2.5 py-1 border rounded-sm transition-colors ${
                i === s.active ? "border-sky bg-sky/15" : c.result !== undefined ? "border-mint/50 bg-mint/5" : "border-border"
              }`}
              style={{ marginLeft: c.depth * 18 }}
            >
              <span className="font-semibold">
                {c.a.toString()} × {c.b.toString()}
              </span>
              {c.parts && (
                <span className="text-muted-foreground">
                  split {c.parts.aL.toString()}|{c.parts.aR.toString()} · {c.parts.bL.toString()}|{c.parts.bR.toString()}
                </span>
              )}
              {c.result !== undefined && <span className="text-mint">= {c.result.toString()}</span>}
            </div>
          ))}
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <input aria-label="a" className={`${inputCls} w-28`} value={text.a} inputMode="numeric" onChange={(e) => setText((t) => ({ ...t, a: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
          ×
          <input aria-label="b" className={`${inputCls} w-28`} value={text.b} inputMode="numeric" onChange={(e) => setText((t) => ({ ...t, b: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
          <button type="button" className={btn} onClick={apply}>
            Multiply
          </button>
        </div>
      }
    />
  );
}

/* ---------------------------- quicksort ---------------------------- */

function regionOf(i: number, s: QuickState) {
  if (s.pivot === i) return { label: "x", cls: "text-violet border-violet" };
  if (s.low && i >= s.low[0] && i <= s.low[1]) return { label: "≤x", cls: "text-sky border-sky" };
  if (s.high && i >= s.high[0] && i <= s.high[1]) return { label: "≥x", cls: "text-orange border-orange" };
  if (s.range && i >= s.range[0] && i <= s.range[1] && s.low) return { label: "?", cls: "text-muted-foreground border-border" };
  return null;
}

export function QuicksortVisualizer({ initial = [6, 10, 13, 5, 8, 3, 2, 11], randomized: r0 = false }: { initial?: number[]; randomized?: boolean }) {
  const [data, setData] = useState(initial);
  const [mode, setMode] = useState<"first" | "random">(r0 ? "random" : "first");
  const [seed, setSeed] = useState(7);
  const frames = useMemo(() => quicksortFrames(data, mode === "random", seed), [data, mode, seed]);
  const n = data.length;
  return (
    <Stepper
      title={mode === "random" ? "Randomized quicksort" : "Quicksort (pivot = first element)"}
      frames={frames}
      code={CPP_QUICKSORT}
      codeLabel="C++"
      legend={[["bg-violet", "pivot x"], ["bg-neon", "A[j]"], ["bg-orange", "swap"], ["bg-mint", "final place"]]}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] min-h-[24px]">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">call stack</span>
            {s.calls.length === 0 && <span className="text-muted-foreground">(empty)</span>}
            {s.calls.map(([p, r], d) => (
              <span key={d} className={`px-1.5 py-0.5 rounded-sm border ${d === s.calls.length - 1 ? "border-sky bg-sky/15" : "border-border text-muted-foreground"}`}>
                qs({p}, {r})
              </span>
            ))}
          </div>
          <ArrayCells s={s} />
          <div className="grid gap-1 font-mono text-[10px]" style={{ gridTemplateColumns: `repeat(${n}, minmax(34px, 1fr))` }}>
            {s.array.map((_, i) => {
              const reg = regionOf(i, s);
              return (
                <div key={i} className={`text-center border-t-2 pt-0.5 ${reg ? reg.cls : "border-transparent"}`}>
                  {reg?.label ?? ""}
                </div>
              );
            })}
          </div>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <Toggle<"first" | "random">
            value={mode}
            onChange={setMode}
            options={[
              ["first", "Pivot = A[p]"],
              ["random", "Random pivot"],
            ]}
          />
          <button type="button" className={btn} onClick={() => setData(Array.from({ length: n }, (_, i) => (i + 1) * 3))}>
            Sorted input
          </button>
          <button type="button" className={btn} onClick={() => setData(Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 40)))}>
            Shuffle
          </button>
          {mode === "random" && (
            <button type="button" className={btn} onClick={() => setSeed((x) => x + 1)}>
              New coin flips
            </button>
          )}
        </div>
      }
    />
  );
}

/* --------------------------- red-black trees --------------------------- */

const RB_DX = 46;
const RB_DY = 60;

/** Draw a red-black tree: in-order rank gives x, depth gives y. Nodes are keyed by id so rotations slide. */
export function RBTreeView({ snap, focus = [], showNil = false }: { snap: RBSnapshot; focus?: number[]; showNil?: boolean }) {
  const byId = new Map(snap.nodes.map((n) => [n.id, n]));
  const pos = new Map<number, { x: number; y: number }>();
  const nils: { x: number; y: number; px: number; py: number }[] = [];
  let rank = 0;
  let maxDepth = 0;
  const walk = (id: number | null, d: number) => {
    if (id === null) return;
    const n = byId.get(id)!;
    walk(n.left, d + 1);
    pos.set(id, { x: 28 + rank++ * RB_DX, y: 26 + d * RB_DY });
    maxDepth = Math.max(maxDepth, d);
    walk(n.right, d + 1);
  };
  walk(snap.root, 0);
  if (showNil)
    snap.nodes.forEach((n) => {
      const p = pos.get(n.id)!;
      if (n.left === null) nils.push({ x: p.x - 14, y: p.y + 36, px: p.x, py: p.y });
      if (n.right === null) nils.push({ x: p.x + 14, y: p.y + 36, px: p.x, py: p.y });
    });
  const w = Math.max(120, 28 * 2 + Math.max(0, rank - 1) * RB_DX);
  const h = 26 * 2 + maxDepth * RB_DY + (showNil ? 30 : 0);
  if (snap.root === null) return <div className="font-mono text-sm text-muted-foreground py-6">(empty tree)</div>;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block mx-auto max-w-full h-auto" role="img" aria-label="Red-black tree">
      {snap.nodes.map((n) =>
        [n.left, n.right].filter((c): c is number => c !== null).map((c) => {
          const a = pos.get(n.id)!;
          const b = pos.get(c)!;
          return <line key={`${n.id}-${c}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-border" strokeWidth={2} />;
        }),
      )}
      {nils.map((p, i) => (
        <g key={`nil-${i}`}>
          <line x1={p.px} y1={p.py} x2={p.x} y2={p.y} className="stroke-border" strokeWidth={1} />
          <rect x={p.x - 7} y={p.y - 5} width={14} height={10} className="fill-zinc-900 stroke-foreground/40" strokeWidth={1} />
        </g>
      ))}
      {snap.nodes.map((n) => {
        const p = pos.get(n.id)!;
        const on = focus.includes(n.id);
        return (
          <g key={n.id} style={{ transform: `translate(${p.x}px, ${p.y}px)` }} className="transition-transform duration-500 ease-out motion-reduce:transition-none">
            {on && <circle r={22} className="fill-none stroke-neon" strokeWidth={3} />}
            <circle r={17} strokeWidth={2} className={`transition-colors duration-300 ${n.color === "R" ? "fill-orange stroke-orange" : "fill-zinc-900 stroke-foreground/50"}`} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={12} className="font-mono font-bold fill-white">
              {n.key}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Insert and delete keys in a red-black tree, one recolor or rotation per step. */
const NO_KEYS: number[] = [];
const NO_OPS: RBOp[] = [];

export function RBTreeVisualizer({ start = NO_KEYS, ops: ops0 = NO_OPS }: { start?: number[]; ops?: RBOp[] }) {
  const [ops, setOps] = useState<RBOp[]>(ops0);
  const [text, setText] = useState("");
  const [showNil, setShowNil] = useState(false);
  const frames = useMemo(() => rbFrames(start, ops), [start, ops]);
  const [startAt, setStartAt] = useState(0);
  const add = (op: RBOp["op"]) => {
    const key = Number(text);
    if (!Number.isInteger(key) || text.trim() === "") return;
    setStartAt(frames.length);
    setOps((o) => [...o, { op, key }]);
    setText("");
  };
  return (
    <Stepper
      title="Red-black tree"
      frames={frames}
      startAt={startAt}
      code={CPP_RB}
      codeLabel="C++ (outline)"
      legend={[["bg-orange", "red node"], ["bg-zinc-900", "black node"], ["bg-neon", "involved in this step"]]}
      render={(s) => (
        <div className="flex flex-col gap-2">
          {s.caseLabel && <span className="self-start font-mono text-[11px] uppercase tracking-widest px-2 py-0.5 border border-violet text-violet rounded-sm">{s.caseLabel}</span>}
          <RBTreeView snap={s} focus={s.focus} showNil={showNil} />
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="key" className={`${inputCls} w-24`} value={text} inputMode="numeric" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add("insert")} placeholder="key" />
          <button type="button" className={btn} onClick={() => add("insert")}>
            Insert
          </button>
          <button type="button" className={btn} onClick={() => add("delete")}>
            Delete
          </button>
          <button type="button" className={btn} onClick={() => setShowNil((v) => !v)} aria-pressed={showNil}>
            {showNil ? "Hide" : "Show"} NIL leaves
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              setStartAt(0);
              setOps(ops0);
            }}
          >
            Reset
          </button>
        </div>
      }
    />
  );
}

/** Left and right rotation on the lecture's picture: A, B and the subtrees α, β, γ. */
export function RotationDemo() {
  const [right, setRight] = useState(true); // true: B is the root (before RIGHT-ROTATE(B))
  const P = right
    ? { B: [150, 30], A: [90, 100], a: [55, 170], b: [125, 170], c: [210, 100] }
    : { A: [150, 30], B: [210, 100], a: [90, 100], b: [175, 170], c: [245, 170] };
  const edges: [keyof typeof P, keyof typeof P][] = right
    ? [["B", "A"], ["B", "c"], ["A", "a"], ["A", "b"]]
    : [["A", "a"], ["A", "B"], ["B", "b"], ["B", "c"]];
  const label: Record<string, string> = { a: "α", b: "β", c: "γ" };
  const move = "transition-transform duration-500 ease-out motion-reduce:transition-none";
  return (
    <Panel title={right ? "RIGHT-ROTATE(B)" : "LEFT-ROTATE(A)"} legend={[["bg-violet", "the moving subtree β"]]}>
      <svg viewBox="0 0 300 200" className="w-full max-w-[420px] h-auto mx-auto" role="img" aria-label="Rotation">
        {edges.map(([u, v]) => (
          <line key={`${u}${v}`} x1={P[u][0]} y1={P[u][1]} x2={P[v][0]} y2={P[v][1]} className="stroke-border" strokeWidth={2} />
        ))}
        {(["A", "B"] as const).map((k) => (
          <g key={k} style={{ transform: `translate(${P[k][0]}px, ${P[k][1]}px)` }} className={move}>
            <circle r={18} className="fill-card stroke-current" strokeWidth={2} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={14} className="font-mono font-bold fill-current">
              {k}
            </text>
          </g>
        ))}
        {(["a", "b", "c"] as const).map((k) => (
          <g key={k} style={{ transform: `translate(${P[k][0]}px, ${P[k][1]}px)` }} className={move}>
            <path d="M0,-14 L18,16 L-18,16 Z" className={k === "b" ? "fill-violet/25 stroke-violet" : "fill-card stroke-muted-foreground"} strokeWidth={2} />
            <text y={6} textAnchor="middle" fontSize={13} className="font-mono fill-current">
              {label[k]}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btn} onClick={() => setRight((r) => !r)}>
          {right ? "RIGHT-ROTATE(B) →" : "← LEFT-ROTATE(A)"}
        </button>
        <span className="font-mono text-xs text-muted-foreground">in-order is always α, A, β, B, γ</span>
      </div>
    </Panel>
  );
}

/* -------------------------- dynamic programming -------------------------- */

const DEFAULT_COINS = [5, 1, 2, 10, 6, 2];
const DP_TITLES = { coins: "Coin-row problem", binomial: "Binomial coefficient C(n, k)", robot: "Robot coin collection", lcs: "Longest common subsequence" };

/** Fill a DP table step by step for one of the lecture's problems. */
export function DPVisualizer({
  problem,
  coins = DEFAULT_COINS,
  n = 6,
  k = 3,
  a = "president",
  b = "providence",
}: {
  problem: "coins" | "binomial" | "robot" | "lcs";
  coins?: number[];
  n?: number;
  k?: number;
  a?: string;
  b?: string;
}) {
  const [words, setWords] = useState({ a, b });
  const frames = useMemo(
    () => (problem === "coins" ? coinRowFrames(coins) : problem === "binomial" ? binomialFrames(n, k) : problem === "robot" ? robotFrames() : lcsFrames(words.a, words.b)),
    [problem, coins, n, k, words],
  );
  const has = (list: Cell[] | undefined, r: number, c: number) => !!list?.some(([x, y]) => x === r && y === c);
  return (
    <Stepper
      title={DP_TITLES[problem]}
      frames={frames}
      code={DP_CODE[problem]}
      codeLabel="C++"
      legend={[["bg-neon", "cell being filled"], ["bg-sky", "cells it reads"], ["bg-violet", "backtrace"], ["bg-mint", problem === "robot" ? "coin" : problem === "lcs" ? "matched letter" : "chosen"]]}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="font-mono text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-8" />
                  {s.colLabels.map((c, j) => (
                    <th key={j} className="w-9 h-6 text-center font-normal text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.table.map((row, r) => (
                  <tr key={r}>
                    <td className="pr-2 text-right text-muted-foreground">{s.rowLabels[r]}</td>
                    {row.map((v, c) => {
                      const cls = has([s.cell!].filter(Boolean), r, c)
                        ? "bg-neon/30 border-neon"
                        : has(s.deps, r, c)
                          ? "bg-sky/20 border-sky"
                          : has(s.trace, r, c)
                            ? "bg-violet/25 border-violet"
                            : "border-border";
                      const mark = has(s.marks, r, c);
                      return (
                        <td key={c} className={`relative w-9 h-9 text-center border transition-colors ${cls} ${mark && problem !== "robot" ? "!bg-mint/30 !border-mint font-bold" : ""}`}>
                          {v ?? ""}
                          {mark && problem === "robot" && <span className="absolute top-0.5 right-1 text-[9px] text-mint">●</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.answer !== undefined && (
            <div className="font-display text-lg font-bold">
              answer: <span className="text-mint">{s.answer}</span>
            </div>
          )}
        </div>
      )}
      inputs={
        problem === "lcs" ? (
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <input aria-label="first word" className={`${inputCls} w-32`} defaultValue={a} onBlur={(e) => setWords((w) => ({ ...w, a: e.target.value.slice(0, 12) || a }))} />
            <input aria-label="second word" className={`${inputCls} w-32`} defaultValue={b} onBlur={(e) => setWords((w) => ({ ...w, b: e.target.value.slice(0, 12) || b }))} />
            <span className="text-muted-foreground">edit, then click away</span>
          </div>
        ) : undefined
      }
    />
  );
}

/* ------------------------------ P and NP ------------------------------ */

const T = (b: boolean) => (b ? "T" : "F");

/** Type a CNF formula; see every assignment and which ones satisfy it. */
export function SatExplorer({ formula = "(a ∨ b) ∧ (a ∨ ¬b)" }: { formula?: string }) {
  const [text, setText] = useState(formula);
  const f = useMemo(() => parseCNF(text), [text]);
  const vars = f ? cnfVars(f) : [];
  const rows = useMemo(() => (f && cnfVars(f).length <= 6 ? truthTable(f) : null), [f]);
  const sat = rows?.filter((r) => r.sat).length ?? 0;
  return (
    <Panel title="Is this formula satisfiable?" legend={[["bg-mint", "satisfying assignment"]]}>
      <input aria-label="CNF formula" className={`${inputCls} w-full`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      <div className="flex flex-wrap gap-1.5">
        {["(a ∨ b) ∧ (a ∨ ¬b)", "(a ∨ b) ∧ (b ∨ ¬c)", "(a) ∧ (¬a)", "(a ∨ b) ∧ (¬a ∨ b) ∧ (a ∨ ¬b) ∧ (¬a ∨ ¬b)"].map((p) => (
          <button key={p} type="button" className={`${btn} !px-2 !py-1 !normal-case !tracking-normal`} onClick={() => setText(p)}>
            {p}
          </button>
        ))}
      </div>
      {!f && <p className="text-sm text-orange">Write clauses in brackets joined by ∧ (or ^), literals joined by ∨ (or |), and ¬ (or !) for "not".</p>}
      {f && !rows && <p className="text-sm text-muted-foreground">{vars.length} variables means {2 ** vars.length} rows: too many to show. That's the point!</p>}
      {f && rows && (
        <div className="overflow-x-auto">
          <table className="font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {vars.map((v) => (
                  <th key={v} className="px-2 py-1 font-normal">
                    {v}
                  </th>
                ))}
                {f.map((c, i) => (
                  <th key={i} className="px-2 py-1 font-normal whitespace-nowrap">
                    ({c.map(litText).join(" ∨ ")})
                  </th>
                ))}
                <th className="px-2 py-1">SAT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-b border-border/40 ${r.sat ? "bg-mint/15" : ""}`}>
                  {vars.map((v) => (
                    <td key={v} className="px-2 py-1 text-center">
                      {T(r.a[v])}
                    </td>
                  ))}
                  {r.clauses.map((c, j) => (
                    <td key={j} className={`px-2 py-1 text-center ${c ? "" : "text-orange"}`}>
                      {T(c)}
                    </td>
                  ))}
                  <td className={`px-2 py-1 text-center font-bold ${r.sat ? "text-mint" : "text-muted-foreground"}`}>{T(r.sat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {f && rows && (
        <p className={`text-sm font-semibold ${sat ? "text-mint" : "text-orange"}`}>
          {sat ? `Satisfiable: ${sat} of ${rows.length} assignments work.` : `Unsatisfiable: none of the ${rows.length} assignments work.`} Checking one row is fast. There are 2^{vars.length} rows.
        </p>
      )}
    </Panel>
  );
}

/** The reduction from 3-CNF SAT to CLIQUE: build the graph, find a k-clique, read off the assignment. */
export function SatToClique({ formula = "(x1 ∨ ¬x2 ∨ x3) ∧ (¬x1 ∨ x2) ∧ (¬x2 ∨ x3)" }: { formula?: string }) {
  const [text, setText] = useState(formula);
  const [show, setShow] = useState(false);
  const f = useMemo(() => parseCNF(text), [text]);
  const g = useMemo(() => (f ? cliqueGraph(f) : null), [f]);
  const clique = useMemo(() => (f && f.length <= 6 && f.flat().length <= 18 ? findClique(f) : null), [f]);
  if (!f || !g) {
    return (
      <Panel title="3-CNF SAT → CLIQUE">
        <input aria-label="CNF formula" className={`${inputCls} w-full`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        <p className="text-sm text-orange">Couldn't read that formula.</p>
      </Panel>
    );
  }
  // clauses side by side; each clause's literals in a column
  const colW = 150;
  const pos = g.vs.map((v) => {
    const inClause = g.vs.filter((u) => u.clause === v.clause);
    const k = inClause.indexOf(v);
    return { x: 70 + v.clause * colW, y: 40 + k * 70 + (3 - inClause.length) * 35 };
  });
  const W = 70 * 2 + (f.length - 1) * colW;
  const inC = new Set(show && clique ? clique : []);
  const assignment: Record<string, boolean> = {};
  if (show && clique) clique.forEach((id) => (assignment[g.vs[id].lit.v] = !g.vs[id].lit.neg));
  return (
    <Panel title="3-CNF SAT → CLIQUE" legend={[["bg-violet", "one vertex per literal"], ["bg-mint", "a clique of size k"]]}>
      <input aria-label="CNF formula" className={`${inputCls} w-full`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      <svg viewBox={`0 0 ${W} 260`} className="w-full max-w-[560px] h-auto mx-auto" role="img" aria-label="Clique graph">
        {g.edges.map(([a, b]) => {
          const on = inC.has(a) && inC.has(b);
          return <line key={`${a}-${b}`} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} className={on ? "stroke-mint" : "stroke-border"} strokeWidth={on ? 3.5 : 1} />;
        })}
        {f.map((_, ci) => (
          <text key={ci} x={70 + ci * colW} y={252} textAnchor="middle" fontSize={11} className="fill-muted-foreground font-mono">
            clause {ci + 1}
          </text>
        ))}
        {g.vs.map((v, i) => (
          <g key={v.id}>
            <circle cx={pos[i].x} cy={pos[i].y} r={20} strokeWidth={2} className={inC.has(v.id) ? "fill-mint/30 stroke-mint" : "fill-card stroke-violet"} />
            <text x={pos[i].x} y={pos[i].y} textAnchor="middle" dominantBaseline="central" fontSize={12} className="fill-current font-mono font-bold">
              {litText(v.lit)}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btn} onClick={() => setShow((s) => !s)}>
          {show ? "Hide" : "Find"} a {f.length}-clique
        </button>
        <span className="font-mono text-xs text-muted-foreground">
          {g.vs.length} vertices, {g.edges.length} edges, k = {f.length} clauses
        </span>
      </div>
      {show && (
        <p className={`text-sm font-semibold ${clique ? "text-mint" : "text-orange"}`}>
          {clique
            ? `Clique {${clique.map((id) => litText(g.vs[id].lit)).join(", ")}}: make each of those literals true (${Object.entries(assignment).map(([v, b]) => `${v} = ${T(b)}`).join(", ")}), and every clause is satisfied. Any variable not mentioned can be either.`
            : `No ${f.length}-clique, so the formula is unsatisfiable.`}
        </p>
      )}
    </Panel>
  );
}

/* ---------------------------- shortest paths ---------------------------- */

const DIJKSTRA_GRAPHS = {
  // the lecture's directed example
  lecture: {
    names: ["A", "B", "C", "D", "E"],
    pos: [[40, 110], [170, 40], [170, 180], [320, 40], [320, 180]] as [number, number][],
    directed: true,
    edges: [
      { from: 0, to: 1, w: 10 }, { from: 0, to: 2, w: 3 }, { from: 1, to: 2, w: 1 }, { from: 2, to: 1, w: 4 }, { from: 1, to: 3, w: 2 },
      { from: 2, to: 3, w: 8 }, { from: 2, to: 4, w: 2 }, { from: 3, to: 4, w: 7 }, { from: 4, to: 3, w: 9 },
    ] as WEdge[],
  },
  // the worked table from the lab sheet
  table: {
    names: ["A", "B", "C", "D", "E", "F", "G"],
    pos: [[40, 110], [150, 40], [150, 190], [400, 190], [290, 120], [400, 60], [290, 30]] as [number, number][],
    directed: false,
    edges: [
      { from: 0, to: 1, w: 5 }, { from: 0, to: 2, w: 3 }, { from: 2, to: 3, w: 7 }, { from: 2, to: 4, w: 7 }, { from: 1, to: 6, w: 1 },
      { from: 1, to: 4, w: 3 }, { from: 6, to: 4, w: 1 }, { from: 4, to: 3, w: 2 }, { from: 4, to: 5, w: 1 },
    ] as WEdge[],
  },
};

export function DijkstraVisualizer({ graph = "lecture" }: { graph?: keyof typeof DIJKSTRA_GRAPHS }) {
  const G = DIJKSTRA_GRAPHS[graph];
  const frames = useMemo(() => dijkstraFrames(G.names.length, G.edges, G.directed, 0, G.names), [G]);
  const W = Math.max(...G.pos.map((p) => p[0])) + 50;
  const H = Math.max(...G.pos.map((p) => p[1])) + 40;
  const hasReverse = (e: WEdge) => G.directed && G.edges.some((f) => f.from === e.to && f.to === e.from);
  return (
    <Stepper
      title={`Dijkstra's algorithm from ${G.names[0]}`}
      frames={frames}
      code={DIJKSTRA_CODE}
      codeLabel="Pseudocode"
      legend={[["bg-mint", "in S (final)"], ["bg-neon", "just extracted / relaxing"], ["bg-violet", "shortest-path tree (π)"]]}
      render={(s) => (
        <div className="flex flex-col gap-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[520px] h-auto mx-auto" role="img" aria-label="Weighted graph">
            <defs>
              <marker id={`arrow-${graph}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
              </marker>
            </defs>
            {G.edges.map((e, i) => {
              const [x1, y1] = G.pos[e.from];
              const [x2, y2] = G.pos[e.to];
              const len = Math.hypot(x2 - x1, y2 - y1);
              const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
              const bend = hasReverse(e) ? 16 : 0;
              const [mx, my] = [(x1 + x2) / 2 - uy * bend, (y1 + y2) / 2 + ux * bend];
              const [sx, sy] = [x1 + ux * 20, y1 + uy * 20];
              const [tx, ty] = [x2 - ux * 22, y2 - uy * 22];
              const relax = s.relaxing && ((s.relaxing[0] === e.from && s.relaxing[1] === e.to) || (!G.directed && s.relaxing[0] === e.to && s.relaxing[1] === e.from));
              const tree = s.pi[e.to] === e.from || (!G.directed && s.pi[e.from] === e.to);
              const cls = relax ? (s.improved ? "stroke-neon" : "stroke-orange") : tree ? "stroke-violet" : "stroke-border";
              return (
                <g key={i}>
                  <path d={`M${sx},${sy} Q${mx},${my} ${tx},${ty}`} fill="none" className={`${cls} transition-colors`} strokeWidth={relax || tree ? 3.5 : 1.8} markerEnd={G.directed ? `url(#arrow-${graph})` : undefined} />
                  <rect x={mx - 10 - uy * (bend ? 4 : 0)} y={my - 9 + ux * (bend ? 4 : 0)} width={20} height={18} rx={2} className="fill-card" />
                  <text x={mx - uy * (bend ? 4 : 0)} y={my + ux * (bend ? 4 : 0)} textAnchor="middle" dominantBaseline="central" fontSize={11} className="font-mono fill-current">
                    {e.w}
                  </text>
                </g>
              );
            })}
            {G.names.map((nm, v) => {
              const [x, y] = G.pos[v];
              const cls = v === s.u ? "fill-neon/40 stroke-neon" : s.S.includes(v) ? "fill-mint/25 stroke-mint" : "fill-card stroke-current";
              return (
                <g key={v}>
                  <circle cx={x} cy={y} r={19} strokeWidth={2} className={`${cls} transition-colors`} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={13} className="font-mono font-bold fill-current">
                    {nm}
                  </text>
                  <text x={x} y={y - 27} textAnchor="middle" fontSize={11} className={`font-mono ${s.S.includes(v) ? "fill-mint" : "fill-muted-foreground"}`}>
                    {isFinite(s.d[v]) ? s.d[v] : "∞"}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="overflow-x-auto">
            <table className="font-mono text-xs border-collapse">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-2 py-1 text-left font-normal">π</th>
                  {G.names.map((nm, v) => (
                    <th key={v} className="px-2 py-1 w-10 font-normal">
                      {s.pi[v] !== null ? G.names[s.pi[v]!] : v === 0 ? "–" : ""}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <th className="px-2 py-1 text-left">round</th>
                  {G.names.map((nm) => (
                    <th key={nm} className="px-2 py-1 w-10">
                      {nm}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                    {r.map((x, v) => (
                      <td key={v} className="px-2 py-1 text-center">
                        {x === null ? "" : isFinite(x) ? x : "–"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    />
  );
}

/* --------------------------- greedy algorithms --------------------------- */

const COIN_SYSTEMS = {
  us: { label: "US money (cents)", coins: [1, 5, 10, 25, 100, 500], amount: 639, fmt: (c: number) => (c >= 100 ? `$${c / 100}` : `${c}¢`) },
  kron: { label: "Krons (1, 7, 10)", coins: [1, 7, 10], amount: 15, fmt: (c: number) => `${c} kron` },
};

/** Greedy change-making against the true minimum, for a coin system that works and one that doesn't. */
export function CoinChangeGreedy({ system: sys0 = "us" }: { system?: keyof typeof COIN_SYSTEMS }) {
  const [sys, setSys] = useState<keyof typeof COIN_SYSTEMS>(sys0);
  const S = COIN_SYSTEMS[sys];
  const [amount, setAmount] = useState(S.amount);
  const g = greedyChange(amount, S.coins);
  const o = optimalChange(amount, S.coins);
  const show = (m: Map<number, number>) => [...m].map(([c, k]) => `${k} × ${S.fmt(c)}`).join(" + ") || "nothing";
  const ok = countCoins(g) === countCoins(o);
  return (
    <Panel title="Counting out money greedily" legend={[["bg-sky", "greedy"], ["bg-mint", "fewest possible"]]}>
      <div className="flex flex-wrap items-center gap-3">
        <Toggle<keyof typeof COIN_SYSTEMS>
          value={sys}
          onChange={(v) => {
            setSys(v);
            setAmount(COIN_SYSTEMS[v].amount);
          }}
          options={[
            ["us", "US money"],
            ["kron", "Krons"],
          ]}
        />
        <label className="inline-flex items-center gap-2 font-mono text-xs">
          amount
          <input aria-label="amount" className={`${inputCls} w-24`} value={amount} inputMode="numeric" onChange={(e) => setAmount(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))} />
          {sys === "us" && <span className="text-muted-foreground">= ${(amount / 100).toFixed(2)}</span>}
        </label>
      </div>
      <div className="grid gap-2 font-mono text-sm">
        <div className="border border-sky/60 bg-sky/10 rounded-sm px-3 py-2">
          <span className="text-[10px] uppercase tracking-widest text-sky mr-2">greedy</span>
          {show(g)} = <b>{countCoins(g)} pieces</b>
        </div>
        <div className="border border-mint/60 bg-mint/10 rounded-sm px-3 py-2">
          <span className="text-[10px] uppercase tracking-widest text-mint mr-2">best</span>
          {show(o)} = <b>{countCoins(o)} pieces</b>
        </div>
      </div>
      <p className={`text-sm font-semibold ${ok ? "text-mint" : "text-orange"}`}>
        {ok ? "Greedy found an optimal answer." : `Greedy found an answer, but not an optimal one: ${countCoins(g) - countCoins(o)} extra piece${countCoins(g) - countCoins(o) === 1 ? "" : "s"}.`}
      </p>
    </Panel>
  );
}

const JOBS = [3, 5, 6, 10, 11, 14, 15, 18, 20];

/** The lecture's nine jobs on three processors: longest first, shortest first, and the best possible. */
export function JobScheduling({ jobs = JOBS, processors = 3 }: { jobs?: number[]; processors?: number }) {
  const [rule, setRule] = useState<"longest" | "shortest" | "optimal">("longest");
  const lanes = useMemo(
    () =>
      rule === "longest" ? scheduleInOrder([...jobs].sort((a, b) => b - a), processors) : rule === "shortest" ? scheduleInOrder([...jobs].sort((a, b) => a - b), processors) : scheduleOptimal(jobs, processors),
    [rule, jobs, processors],
  );
  const loads = lanes.map((l) => l.reduce((s, j) => s + j, 0));
  const span = Math.max(...loads);
  const scale = Math.max(span, 40);
  const tones = ["bg-sky/60", "bg-violet/60", "bg-orange/60", "bg-mint/60", "bg-neon/60"];
  return (
    <Panel title={`${jobs.length} jobs on ${processors} processors`}>
      <Toggle<"longest" | "shortest" | "optimal">
        value={rule}
        onChange={setRule}
        options={[
          ["longest", "Longest job first"],
          ["shortest", "Shortest job first"],
          ["optimal", "Best possible"],
        ]}
      />
      <div className="flex flex-col gap-2">
        {lanes.map((l, p) => (
          <div key={p} className="flex items-center gap-2">
            <span className="w-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">P{p + 1}</span>
            <div className="relative flex-1 h-8 border border-border rounded-sm overflow-hidden flex">
              {l.map((j, k) => (
                <div key={k} className={`${tones[k % tones.length]} border-r border-background h-full flex items-center justify-center font-mono text-[11px]`} style={{ width: `${(j / scale) * 100}%` }}>
                  {j}
                </div>
              ))}
            </div>
            <span className={`w-10 text-right font-mono text-xs ${loads[p] === span ? "font-bold" : "text-muted-foreground"}`}>{loads[p]}</span>
          </div>
        ))}
      </div>
      <p className="font-mono text-sm">
        time to completion = <b className={rule === "optimal" ? "text-mint" : ""}>{span} minutes</b>
        {rule !== "optimal" && <span className="text-muted-foreground"> ({lanes.map((l) => l.join(" + ")).join(" | ")})</span>}
      </p>
    </Panel>
  );
}

function HuffTree({ root, highlight }: { root: HuffNode; highlight?: number[] }) {
  const pos = new Map<number, { x: number; y: number }>();
  let leaf = 0;
  let depth = 0;
  const place = (n: HuffNode, d: number): number => {
    depth = Math.max(depth, d);
    let x: number;
    if (!n.left) x = 24 + leaf++ * 46;
    else x = (place(n.left, d + 1) + place(n.right!, d + 1)) / 2;
    pos.set(n.id, { x, y: 22 + d * 50 });
    return x;
  };
  place(root, 0);
  const w = Math.max(48, leaf * 46);
  const h = 44 + depth * 50;
  const nodes: HuffNode[] = [];
  const collect = (n: HuffNode) => {
    nodes.push(n);
    if (n.left) {
      collect(n.left);
      collect(n.right!);
    }
  };
  collect(root);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="h-auto max-w-full">
      {nodes.filter((n) => n.left).flatMap((n) =>
        [n.left!, n.right!].map((c, k) => {
          const a = pos.get(n.id)!;
          const b = pos.get(c.id)!;
          return (
            <g key={`${n.id}-${c.id}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-border" strokeWidth={1.5} />
              <text x={(a.x + b.x) / 2 + (k ? 6 : -10)} y={(a.y + b.y) / 2} fontSize={10} className="fill-violet font-mono">
                {k}
              </text>
            </g>
          );
        }),
      )}
      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const on = highlight?.includes(n.id);
        return (
          <g key={n.id}>
            <circle cx={p.x} cy={p.y} r={15} strokeWidth={2} className={on ? "fill-neon/30 stroke-neon" : n.left ? "fill-card stroke-muted-foreground" : "fill-sky/15 stroke-sky"} />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={10} className="font-mono fill-current">
              {n.left ? n.freq : `${n.label}:${n.freq}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function HuffmanVisualizer({ chars = ["A", "B", "C", "D", "E", "F"], freqs = [22, 12, 24, 6, 27, 9] }: { chars?: string[]; freqs?: number[] }) {
  const frames = useMemo(() => huffmanFrames(chars, freqs), [chars, freqs]);
  return (
    <Stepper
      title="Building a Huffman code"
      frames={frames}
      code={HUFFMAN_CODE}
      codeLabel="Pseudocode"
      legend={[["bg-sky", "character"], ["bg-neon", "the two smallest / just merged"]]}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-4">
            {[...s.forest].sort((a, b) => a.freq - b.freq).map((t) => (
              <HuffTree key={t.id} root={t} highlight={[...(s.picked ?? []), ...(s.merged !== undefined ? [s.merged] : [])]} />
            ))}
          </div>
          {s.codes && (
            <table className="font-mono text-xs border-collapse self-start">
              <tbody>
                {chars.map((c, i) => (
                  <tr key={c} className="border-b border-border/50">
                    <td className="py-1 pr-4 font-bold">{c}</td>
                    <td className="py-1 pr-4 text-muted-foreground">{freqs[i]}</td>
                    <td className="py-1 text-mint">{s.codes![c]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    />
  );
}

export function ActivitySelector({ acts = CLRS_ACTIVITIES }: { acts?: Activity[] }) {
  const frames = useMemo(() => activityFrames(acts), [acts]);
  const end = Math.max(...acts.map((a) => a.f));
  return (
    <Stepper
      title="Greedy activity selection"
      frames={frames}
      code={ACTIVITY_CODE}
      codeLabel="Pseudocode"
      legend={[["bg-mint", "chosen"], ["bg-neon", "considering"], ["bg-orange", "clashes, skipped"]]}
      render={(s) => (
        <div className="flex flex-col gap-1 font-mono text-[11px] min-w-[420px]">
          {s.acts.map((a, i) => {
            const cls = s.chosen.includes(i) ? "bg-mint/50 border-mint" : i === s.rejected ? "bg-orange/30 border-orange" : i === s.at ? "bg-neon/30 border-neon" : "bg-foreground/10 border-border";
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 text-right text-muted-foreground">a{i + 1}</span>
                <div className="relative flex-1 h-5">
                  <div className={`absolute h-full border rounded-sm transition-colors ${cls}`} style={{ left: `${(a.s / end) * 100}%`, width: `${((a.f - a.s) / end) * 100}%` }}>
                    <span className="px-1">
                      [{a.s},{a.f})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <span className="w-8" />
            <div className="relative flex-1 h-4 text-muted-foreground">
              {Array.from({ length: end + 1 }, (_, t) => t).filter((t) => t % 2 === 0).map((t) => (
                <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / end) * 100}%` }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------ skip lists ------------------------------ */

const SKIP_KEYS = [2, 10, 15, 16, 31, 71, 86, 91, 96];
const SKIP_RANDOM_HEIGHTS = [1, 2, 3, 1, 4, 1, 2, 1, 3];
const SKIP_DEFAULT_OPS: SkipOp[] = [{ op: "search", key: 71 }, { op: "search", key: 96 }, { op: "insert", key: 87 }, { op: "delete", key: 87 }];

/** Search, insert (with coin flips) and delete in a skip list, level by level. */
export function SkipListVisualizer({ ops: ops0 = SKIP_DEFAULT_OPS, layout: layout0 = "random" }: { ops?: SkipOp[]; layout?: "perfect" | "random" }) {
  const [layout, setLayout] = useState(layout0);
  const [ops, setOps] = useState(ops0);
  const [text, setText] = useState("");
  const [seed, setSeed] = useState(11);
  const [startAt, setStartAt] = useState(0);
  const heights = useMemo(() => (layout === "perfect" ? perfectHeights(SKIP_KEYS.length) : SKIP_RANDOM_HEIGHTS), [layout]);
  const frames = useMemo(() => skipFrames(SKIP_KEYS, heights, ops, seed), [heights, ops, seed]);
  const add = (op: SkipOp["op"]) => {
    const key = Number(text);
    if (text.trim() === "" || !Number.isInteger(key)) return;
    setStartAt(frames.length);
    setOps((o) => [...o, { op, key }]);
    setText("");
  };
  return (
    <Stepper
      title={layout === "perfect" ? "Perfect skip list" : "Randomized skip list"}
      frames={frames}
      startAt={startAt}
      code={SKIP_CODE}
      codeLabel="Pseudocode"
      legend={[["bg-neon", "search path"], ["bg-sky", "current"], ["bg-mint", "found / inserted"]]}
      render={(s) => {
        const levels = Math.max(1, ...s.towers.map((t) => t.height));
        const cols = s.towers.length + 2; // header + keys + sentinel
        const onPath = (c: number, lv: number) => s.path.some(([pc, pl]) => pc === c && pl === lv);
        return (
          <div className="overflow-x-auto">
            <div className="inline-grid gap-x-1 gap-y-1.5 font-mono text-xs" style={{ gridTemplateColumns: `auto repeat(${cols}, 38px)` }}>
              {Array.from({ length: levels }, (_, r) => levels - 1 - r).map((lv) => (
                <div key={lv} className="contents">
                  <span className="pr-2 self-center text-right text-[10px] uppercase tracking-widest text-muted-foreground">L{lv}</span>
                  {Array.from({ length: cols }, (_, c) => {
                    const col = c - 1; // -1 header, towers.length sentinel
                    const isHeader = col === -1;
                    const isSentinel = col === s.towers.length;
                    const t = !isHeader && !isSentinel ? s.towers[col] : null;
                    const present = isHeader || isSentinel || (t && t.height > lv);
                    if (!present) return <span key={c} className="h-8 flex items-center justify-center text-border">─</span>;
                    const current = s.at === col && s.level === lv;
                    const cls =
                      s.found === col
                        ? "border-mint bg-mint/25 font-bold"
                        : current
                          ? "border-sky bg-sky/25 font-bold"
                          : onPath(col, lv)
                            ? "border-neon bg-neon/15"
                            : "border-border";
                    return (
                      <span key={c} className={`h-8 flex items-center justify-center border rounded-sm transition-colors ${cls} ${isHeader || isSentinel ? "text-muted-foreground" : ""}`}>
                        {isHeader ? "H" : isSentinel ? "∞" : t!.key}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            {s.flips && <div className="mt-3 font-mono text-xs">coin flips: <span className="text-violet font-bold tracking-widest">{s.flips}</span></div>}
          </div>
        );
      }}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <Toggle<"perfect" | "random">
            value={layout}
            onChange={(v) => {
              setStartAt(0);
              setLayout(v);
            }}
            options={[
              ["perfect", "Perfect"],
              ["random", "Randomized"],
            ]}
          />
          <input aria-label="key" className={`${inputCls} w-20`} value={text} inputMode="numeric" placeholder="key" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add("search")} />
          <button type="button" className={btn} onClick={() => add("search")}>
            Search
          </button>
          <button type="button" className={btn} onClick={() => add("insert")}>
            Insert
          </button>
          <button type="button" className={btn} onClick={() => add("delete")}>
            Delete
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              setStartAt(0);
              setSeed((x) => x + 1);
            }}
          >
            New coin flips
          </button>
        </div>
      }
    />
  );
}

/* ---------------------- augmented data structures ---------------------- */

function AugTreeView({ nodes, s }: { nodes: AugNode[]; s: PathState }) {
  const pos = new Map(nodes.map((n) => [n.id, n]));
  const w = Math.max(...nodes.map((n) => n.x)) + 48;
  const h = Math.max(...nodes.map((n) => n.y)) + 46;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block mx-auto max-w-full h-auto" role="img" aria-label="Augmented tree">
      {nodes.filter((n) => n.parent).map((n) => {
        const p = pos.get(n.parent!)!;
        const on = s.path.includes(n.id) && s.path.includes(p.id);
        return <line key={n.id} x1={p.x} y1={p.y} x2={n.x} y2={n.y} className={on ? "stroke-neon" : "stroke-border"} strokeWidth={on ? 3 : 1.5} />;
      })}
      {nodes.map((n) => {
        const cls = n.id === s.found ? "fill-mint/30 stroke-mint" : n.id === s.at ? "fill-neon/30 stroke-neon" : s.path.includes(n.id) ? "fill-sky/15 stroke-sky" : "fill-card stroke-current";
        const wide = n.label.length > 2;
        return (
          <g key={n.id}>
            {wide ? <rect x={n.x - 28} y={n.y - 14} width={56} height={28} rx={4} strokeWidth={2} className={cls} /> : <circle cx={n.x} cy={n.y} r={16} strokeWidth={2} className={cls} />}
            <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" fontSize={wide ? 11 : 13} className="font-mono font-bold fill-current">
              {n.label}
            </text>
            <text x={n.x} y={n.y + (wide ? 25 : 28)} textAnchor="middle" fontSize={10} className="font-mono fill-violet">
              {n.extra}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** OS-SELECT on a size-augmented tree, or INTERVAL-SEARCH on an interval tree. */
export function AugmentedTreeSearch({ kind = "select", i: i0 = 5, query = [14, 16] }: { kind?: "select" | "interval"; i?: number; query?: [number, number] }) {
  const tree = kind === "select" ? OS_TREE : INTERVAL_TREE;
  const nodes = useMemo(() => layoutAug(tree), [tree]);
  const [i, setI] = useState(i0);
  const [q, setQ] = useState<[number, number]>(query);
  const frames = useMemo(() => (kind === "select" ? osSelectFrames(tree, i) : intervalSearchFrames(tree, q[0], q[1])), [kind, tree, i, q]);
  return (
    <Stepper
      title={kind === "select" ? `OS-SELECT(root, ${i})` : `INTERVAL-SEARCH([${q[0]},${q[1]}])`}
      frames={frames}
      code={kind === "select" ? OS_SELECT_CODE : INTERVAL_SEARCH_CODE}
      codeLabel="Pseudocode"
      legend={[["bg-violet", kind === "select" ? "subtree size" : "m = max high in subtree"], ["bg-neon", "current node"], ["bg-mint", "answer"]]}
      render={(s) => (
        <div className="flex flex-col gap-2">
          <AugTreeView nodes={nodes} s={s} />
          {s.none && <p className="text-center font-mono text-sm text-orange">no overlapping interval</p>}
        </div>
      )}
      inputs={
        kind === "select" ? (
          <label className="inline-flex items-center gap-2 font-mono text-xs">
            i =
            <select value={i} onChange={(e) => setI(Number(e.target.value))} className="bg-transparent border border-border rounded-sm px-2 py-1.5 text-foreground">
              {Array.from({ length: nodes.length }, (_, k) => (
                <option key={k} value={k + 1}>
                  {k + 1}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            query [
            <input aria-label="low" className={`${inputCls} w-16`} value={q[0]} inputMode="numeric" onChange={(e) => setQ([Number(e.target.value) || 0, q[1]])} />,
            <input aria-label="high" className={`${inputCls} w-16`} value={q[1]} inputMode="numeric" onChange={(e) => setQ([q[0], Number(e.target.value) || 0])} />]
            <button type="button" className={btn} onClick={() => setQ([12, 14])}>
              Try [12,14]
            </button>
          </div>
        )
      }
    />
  );
}

/* ------------------------------ hashing ------------------------------ */

const HASH_TITLES: Record<HashMode, string> = {
  chaining: "Separate chaining",
  linear: "Linear probing",
  quadratic: "Quadratic probing",
  double: "Double hashing",
};

const DEFAULT_HASH_OPS: HashOp[] = [7, 36, 18, 62].map((key) => ({ op: "insert", key }));

/** Insert / search / delete keys in a hash table and see every probe. */
export function HashTableVisualizer({
  m = 11,
  mode = "linear",
  c1,
  c2,
  second,
  h1Mod,
  ops = DEFAULT_HASH_OPS,
  initial,
  title,
}: {
  m?: number;
  mode?: HashMode;
  c1?: number;
  c2?: number;
  second?: Second;
  h1Mod?: number;
  ops?: HashOp[];
  initial?: Record<number, number>;
  title?: string;
}) {
  const cfg = useMemo<HashConfig>(() => ({ m, mode, c1, c2, second, h1Mod }), [m, mode, c1, c2, second, h1Mod]);
  const frames = useMemo(() => hashFrames(cfg, ops, initial), [cfg, ops, initial]);
  const formula =
    mode === "chaining" || mode === "linear"
      ? `h(k, i) = (k + i) mod ${m}`
      : mode === "quadratic"
        ? `h(k, i) = (k${c1 ? ` + ${c1 === 1 ? "" : c1}i` : ""} + ${c2 && c2 !== 1 ? c2 : ""}i²) mod ${m}`
        : `h(k, i) = (k mod ${m} + i·h₂(k)) mod ${m}, h₂(k) = ${second?.kind === "prime" ? `${second.R} − (k mod ${second.R})` : `1 + (k mod ${second?.kind === "mod" ? second.mp : m - 1})`}`;
  return (
    <Stepper
      title={title ?? HASH_TITLES[mode]}
      frames={frames}
      code={mode === "chaining" ? CHAIN_PSEUDO : HASH_PSEUDO}
      codeLabel="Pseudocode"
      legend={[["bg-neon", "probe path"], ["bg-orange", "collision / miss"], ["bg-mint", "placed / found"]]}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-xs text-muted-foreground">{mode === "chaining" ? `h(k) = k mod ${m}` : formula}</div>
          {s.op && (
            <div className="font-display text-lg font-bold">
              {s.op.op} <span className="text-violet">{s.op.key}</span>
            </div>
          )}
          <div className="flex flex-col gap-1 font-mono text-sm">
            {s.slots.map((v, i) => {
              const on = i === s.hit ? "border-mint bg-mint/20" : i === s.bad ? "border-orange bg-orange/15" : s.path.includes(i) ? "border-neon bg-neon/10" : "border-border";
              const order = s.path.indexOf(i);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-right text-[11px] text-muted-foreground">{i}</span>
                  <span className={`w-16 h-8 flex items-center justify-center border rounded-sm transition-colors ${on}`}>
                    {mode === "chaining" ? (s.chains[i].length ? "•" : "") : v === DELETED ? <span className="text-[10px] text-orange">deleted</span> : v ?? ""}
                  </span>
                  {mode === "chaining" && s.chains[i].map((k, c) => (
                    <span key={c} className="inline-flex items-center gap-1">
                      <span className="text-muted-foreground">→</span>
                      <span className="px-2 py-0.5 border border-sky/60 bg-sky/10 rounded-sm">{k}</span>
                    </span>
                  ))}
                  {order >= 0 && mode !== "chaining" && <span className="text-[10px] text-neon">probe {order}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    />
  );
}

/** One key through every hash function from the lecture. */
export function HashFunctions({ initial = 12345678 }: { initial?: number }) {
  const [k, setK] = useState(initial);
  const mid = hashMidSquare(k, 2);
  const fold = hashFolding(k, 2);
  const row = (name: string, how: React.ReactNode, value: React.ReactNode) => (
    <tr className="border-b border-border/50 align-top">
      <td className="py-2 pr-4 font-semibold whitespace-nowrap">{name}</td>
      <td className="py-2 pr-4 text-muted-foreground">{how}</td>
      <td className="py-2 text-right font-bold text-mint">{value}</td>
    </tr>
  );
  return (
    <Panel title="Hash functions side by side">
      <label className="flex flex-wrap items-center gap-3 font-mono text-xs">
        key k =
        <input aria-label="key" className={`${inputCls} w-36`} value={k} inputMode="numeric" onChange={(e) => setK(Math.max(0, Math.min(99_999_999, Number(e.target.value) || 0)))} />
        <span className="text-muted-foreground">table size n = 100</span>
      </label>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs border-collapse min-w-[480px]">
          <tbody>
            {row("Division", `${k} mod 97 (a prime near 100)`, hashDivision(k, 97))}
            {row("Multiplication", `⌊100 · (${k} × 0.618033 mod 1)⌋`, hashMultiplication(k, 100))}
            {row("Mid-square", <>{k}² = {mid.square.slice(0, mid.start)}<b className="text-foreground">{mid.digits}</b>{mid.square.slice(mid.start + 2)} → middle 2 digits</>, mid.digits)}
            {row("Fold-shifting", `${fold.parts.join(" + ")} = ${fold.shift}, mod 100`, fold.shiftHash)}
            {row("Fold-boundary", `${fold.boundaryParts.join(" + ")} = ${fold.boundary}, mod 100 (outer parts reversed)`, fold.boundaryHash)}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** Cost of n appends to a doubling array, with the 3-per-append budget from the accounting method. */
export function DoublingCostChart({ initialN = 17 }: { initialN?: number }) {
  const [n, setN] = useState(initialN);
  const costs = useMemo(() => doublingCosts(n), [n]);
  const total = costs.reduce((t, c) => t + c.cost, 0);
  const max = Math.max(...costs.map((c) => c.cost));
  let bank = 0;
  const balances = costs.map((c) => (bank += 3 - c.cost));
  return (
    <Panel title="Appending to a table that doubles when full" legend={[["bg-sky", "write the new item"], ["bg-orange", "copy everything over"], ["bg-mint", "bank balance at $3 per append"]]}>
      <label className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">appends</span>
        <input type="range" min={1} max={64} value={n} onChange={(e) => setN(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="number of appends" />
        <span className="font-display text-xl font-bold w-24">n = {n}</span>
      </label>
      <div className="flex items-end gap-[2px] h-36 overflow-x-auto">
        {costs.map((c, i) => (
          <div key={i} className="flex flex-col justify-end h-full min-w-[6px] flex-1" title={`append ${i + 1}: cost ${c.cost}`}>
            {c.copied > 0 && <div className="bg-orange rounded-t-[1px]" style={{ height: `${(c.copied / max) * 100}%` }} />}
            <div className="bg-sky" style={{ height: `${(1 / max) * 100}%`, minHeight: 2 }} />
          </div>
        ))}
      </div>
      <div className="flex items-end gap-[2px] h-10">
        {balances.map((b, i) => (
          <div key={i} className="flex-1 min-w-[6px] bg-mint/70" style={{ height: `${(b / Math.max(...balances)) * 100}%` }} title={`balance after append ${i + 1}: $${b}`} />
        ))}
      </div>
      <p className="font-mono text-xs">
        total cost = <b>{total}</b> ≤ 3n = <b>{3 * n}</b>, so the amortized cost is <b className="text-mint">{(total / n).toFixed(2)}</b> per append. The bank never goes below 0 (lowest: ${Math.min(...balances)}).
      </p>
    </Panel>
  );
}

/* ------------------------- order statistics ------------------------- */

export function SelectVisualizer({ initial = [6, 10, 13, 5, 8, 3, 2, 11], want = 7 }: { initial?: number[]; want?: number }) {
  const [i, setI] = useState(want);
  const [mode, setMode] = useState<"first" | "random">("first");
  const frames = useMemo(() => selectFrames(initial, i, mode === "random"), [initial, i, mode]);
  return (
    <Stepper
      title={`Select the ${i}${i === 1 ? "st" : i === 2 ? "nd" : i === 3 ? "rd" : "th"} smallest`}
      frames={frames}
      code={CPP_SELECT}
      codeLabel="C++"
      legend={[["bg-violet", "pivot"], ["bg-mint", "answer"]]}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <ArrayCells s={s} />
          <div className="grid gap-1 font-mono text-[10px]" style={{ gridTemplateColumns: `repeat(${s.array.length}, minmax(34px, 1fr))` }}>
            {s.array.map((_, j) => {
              const lo = s.low && j >= s.low[0] && j <= s.low[1];
              const hi = s.high && j >= s.high[0] && j <= s.high[1];
              return (
                <div key={j} className={`text-center border-t-2 pt-0.5 ${s.pivot === j ? "border-violet text-violet" : lo ? "border-sky text-sky" : hi ? "border-orange text-orange" : "border-transparent"}`}>
                  {s.pivot === j ? "pivot" : lo ? "≤" : hi ? "≥" : ""}
                </div>
              );
            })}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            looking for rank <span className="text-foreground font-bold">{s.want}</span> inside the bright part
          </div>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <label className="inline-flex items-center gap-2">
            i =
            <select value={i} onChange={(e) => setI(Number(e.target.value))} className="bg-transparent border border-border rounded-sm px-2 py-1.5 text-foreground">
              {initial.map((_, k) => (
                <option key={k} value={k + 1}>
                  {k + 1}
                </option>
              ))}
            </select>
          </label>
          <Toggle<"first" | "random">
            value={mode}
            onChange={setMode}
            options={[
              ["first", "Pivot = A[p]"],
              ["random", "Random pivot"],
            ]}
          />
        </div>
      }
    />
  );
}

/** The groups-of-5 picture: columns are sorted groups, ordered by their medians; x is the median of medians. */
export function MedianOfMediansGrid({ input }: { input?: number[] }) {
  const nums = useMemo(
    () => input ?? [12, 47, 3, 88, 25, 61, 9, 34, 70, 18, 53, 1, 95, 40, 27, 66, 14, 81, 5, 58, 30, 76, 22, 49, 91, 37, 7, 63, 84, 16, 44, 99, 28, 72, 11],
    [input],
  );
  const { groups, x, pivotCol, guaranteedEach } = useMemo(() => medianOfMedians(nums), [nums]);
  const cls = (c: number, r: number) => {
    if (c === pivotCol && r === 2) return "border-violet bg-violet/30 font-bold";
    if (c <= pivotCol && r <= 2) return "border-sky bg-sky/15";
    if (c >= pivotCol && r >= 2) return "border-orange bg-orange/15";
    return "border-border text-muted-foreground";
  };
  return (
    <Panel title="Choosing the pivot: the median of medians" legend={[["bg-violet", "x"], ["bg-sky", "surely ≤ x"], ["bg-orange", "surely ≥ x"]]}>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${groups.length}, 40px)` }}>
          {[0, 1, 2, 3, 4].map((r) => (
            <div key={r} className="contents">
              <span className="pr-2 self-center text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{r === 0 ? "lesser" : r === 2 ? "median" : r === 4 ? "greater" : ""}</span>
              {groups.map((g, c) => (
                <span key={c} className={`h-9 flex items-center justify-center font-mono text-sm border rounded-sm ${cls(c, r)}`}>
                  {g[r]}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Each column is a group of 5, sorted from top to bottom. The columns are arranged by their medians. x = <b className="text-violet">{x}</b> is the median of the {groups.length} medians. Everything in the sky corner is ≤ x, because it's ≤ a median that is ≤ x. That's at least 3⌊n/10⌋ = {guaranteedEach} elements, and the same number are surely ≥ x.
      </p>
    </Panel>
  );
}

/* --------------------------- decision tree --------------------------- */

type Placed = { node: DNode; x: number; y: number; parent?: Placed; side?: "≤" | "≥" };

function placeTree(root: DNode): Placed[] {
  const out: Placed[] = [];
  let slot = 0;
  const walk = (n: DNode, depth: number, parent?: Placed, side?: "≤" | "≥"): Placed => {
    const me: Placed = { node: n, x: 0, y: 30 + depth * 72, parent, side };
    if (n.leaf) me.x = 50 + slot++ * 92;
    else {
      const l = walk(n.left!, depth + 1, me, "≤");
      const r = walk(n.right!, depth + 1, me, "≥");
      me.x = (l.x + r.x) / 2;
    }
    out.push(me);
    return me;
  };
  walk(root, 0);
  return out;
}

/** The lecture's decision tree for sorting three numbers; type three values and watch their path light up. */
export function DecisionTree({ initial = [9, 4, 6] }: { initial?: [number, number, number] }) {
  const [a, setA] = useState<[number, number, number]>(initial);
  const placed = useMemo(() => placeTree(DECISION_TREE_3), []);
  const path = new Set(decisionPath(a));
  const leaf = placed.find((p) => p.node.leaf && path.has(p.node.id))!.node.leaf!;
  return (
    <Panel title="Decision tree for sorting ⟨a₁, a₂, a₃⟩" legend={[["bg-neon", "path taken"], ["bg-mint", "result"]]}>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        {[0, 1, 2].map((i) => (
          <label key={i} className="inline-flex items-center gap-1.5">
            a{i + 1}
            <input
              aria-label={`a${i + 1}`}
              className={`${inputCls} w-16`}
              value={a[i]}
              inputMode="numeric"
              onChange={(e) => setA((o) => o.map((v, j) => (j === i ? Number(e.target.value) || 0 : v)) as [number, number, number])}
            />
          </label>
        ))}
      </div>
      <svg viewBox="0 0 560 270" className="w-full h-auto max-w-[620px] mx-auto" role="img" aria-label="Decision tree">
        {placed.filter((p) => p.parent).map((p) => {
          const on = path.has(p.node.id) && path.has(p.parent!.node.id);
          return (
            <g key={`e-${p.node.id}`}>
              <line x1={p.parent!.x} y1={p.parent!.y} x2={p.x} y2={p.y} className={on ? "stroke-neon" : "stroke-border"} strokeWidth={on ? 3.5 : 1.5} />
              <text x={(p.parent!.x + p.x) / 2 + (p.side === "≤" ? -10 : 10)} y={(p.parent!.y + p.y) / 2} fontSize={11} textAnchor="middle" className="fill-muted-foreground font-mono">
                {p.side}
              </text>
            </g>
          );
        })}
        {placed.map((p) => {
          const on = path.has(p.node.id);
          if (p.node.leaf)
            return (
              <g key={p.node.id}>
                <rect x={p.x - 38} y={p.y - 14} width={76} height={28} rx={3} strokeWidth={2} className={on ? "fill-mint/25 stroke-mint" : "fill-card stroke-border"} />
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={12} className="fill-current font-mono">
                  ⟨{p.node.leaf.join(",")}⟩
                </text>
              </g>
            );
          const [i, j] = p.node.cmp!;
          return (
            <g key={p.node.id}>
              <circle cx={p.x} cy={p.y} r={20} strokeWidth={2} className={on ? "fill-neon/30 stroke-neon" : "fill-card stroke-current"} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={13} className="fill-current font-mono font-bold">
                {i}:{j}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="font-mono text-sm">
        Leaf ⟨{leaf.join(", ")}⟩ means a{leaf[0]} ≤ a{leaf[1]} ≤ a{leaf[2]}, which is{" "}
        <span className="text-mint font-bold">{leaf.map((i) => a[i - 1]).join(" ≤ ")}</span>. That took {path.size - 1} comparisons.
      </p>
    </Panel>
  );
}

/* --------------------------- counting sort --------------------------- */

function Row({ label, values, hi, tone, base = 1 }: { label: string; values: (number | null)[]; hi?: number; tone: string; base?: number }) {
  return (
    <div className="flex items-start gap-3 font-mono">
      <span className="w-6 pt-2 text-sm font-bold">{label}</span>
      <div className="flex flex-col">
        <div className="flex gap-1">
          {values.map((v, i) => (
            <span key={i} className={`w-10 h-10 flex items-center justify-center text-sm border rounded-sm transition-colors ${i === hi ? tone : v === null ? "border-dashed border-border text-muted-foreground" : "border-border"}`}>
              {v ?? "·"}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {values.map((_, i) => (
            <span key={i} className="w-10 text-center text-[10px] text-muted-foreground">
              {i + base}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CountingSortVisualizer({ A = [4, 1, 3, 4, 3], k = 4 }: { A?: number[]; k?: number }) {
  const frames = useMemo(() => countingSortFrames(A, k), [A, k]);
  return (
    <Stepper
      title="Counting sort"
      frames={frames}
      code={CPP_COUNTING_SORT}
      codeLabel="C++"
      legend={[["bg-sky", "reading A"], ["bg-violet", "counter C"], ["bg-mint", "writing B"]]}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.loop >= 1 && s.loop <= 4 ? `loop ${s.loop}` : s.loop === 5 ? "done" : ""}</div>
          <Row label="A" values={s.A} hi={s.aAt} tone="border-sky bg-sky/20" />
          <Row label="C" values={s.C} hi={s.cAt} tone="border-violet bg-violet/20" />
          <Row label="B" values={s.B} hi={s.bAt} tone="border-mint bg-mint/25" />
        </div>
      )}
    />
  );
}

/* ----------------------------- radix sort ----------------------------- */

export function RadixSortVisualizer({ input = [329, 457, 657, 839, 436, 720, 355] }: { input?: number[] }) {
  const frames = useMemo(() => radixSortFrames(input), [input]);
  return (
    <Stepper
      title="Radix sort, least significant digit first"
      frames={frames}
      code={CPP_RADIX}
      codeLabel="C++"
      legend={[["bg-neon", "digit sorted on"], ["bg-mint", "digits already in order"]]}
      render={(s) => (
        <div className="flex flex-wrap items-start gap-8">
          {s.digit >= 0 && s.digit < s.width && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">before</span>
              {s.prev.map((x, i) => (
                <span key={i} className="font-mono text-base tracking-[0.3em] text-muted-foreground">
                  {String(x).padStart(s.width, "0")}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.digit < 0 ? "input" : s.digit >= s.width ? "sorted" : "after"}</span>
            {s.rows.map((x, i) => {
              const digits = String(x).padStart(s.width, "0").split("");
              return (
                <span key={i} className="font-mono text-base tracking-[0.3em]">
                  {digits.map((c, p) => {
                    const fromRight = s.width - 1 - p;
                    const cls = fromRight === s.digit ? "text-neon font-bold bg-neon/15" : fromRight < s.digit || s.digit >= s.width ? "text-mint" : "";
                    return (
                      <span key={p} className={cls}>
                        {c}
                      </span>
                    );
                  })}
                </span>
              );
            })}
          </div>
        </div>
      )}
    />
  );
}

/* ---------------------------- Strassen ---------------------------- */

function MatrixBox({ m, label, tone = "border-border" }: { m: (number | string)[][]; label: string; tone?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className={`grid grid-cols-2 gap-1 p-1.5 border-x-2 rounded-sm ${tone}`}>
        {m.flat().map((v, i) => (
          <span key={i} className="min-w-[44px] text-center font-mono text-sm px-1">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

const STRASSEN_P = ["a·(f − h)", "(a + b)·h", "(c + d)·e", "d·(g − e)", "(a + d)·(e + h)", "(b − d)·(g + h)", "(a − c)·(e + f)"];

/** Edit two 2×2 matrices and check that Strassen's 7 products give the same answer as the usual 8. */
export function StrassenCalculator() {
  const [v, setV] = useState({ a: 1, b: 3, c: 7, d: 5, e: 6, f: 8, g: 4, h: 2 });
  const res = strassen(v.a, v.b, v.c, v.d, v.e, v.f, v.g, v.h);
  const same = res.r === res.standard.r && res.s === res.standard.s && res.t === res.standard.t && res.u === res.standard.u;
  const cell = (k: keyof typeof v) => (
    <input
      key={k}
      aria-label={k}
      className={`${inputCls} !px-1 !py-1 w-12 text-center`}
      value={v[k]}
      inputMode="numeric"
      onChange={(e) => setV((o) => ({ ...o, [k]: Math.max(-99, Math.min(99, Number(e.target.value) || 0)) }))}
    />
  );
  return (
    <Panel title="Strassen: 7 multiplications instead of 8" legend={[["bg-violet", "the 7 products"], ["bg-mint", "matches the usual way"]]}>
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <div className="flex flex-col items-center gap-1">
          <span className="uppercase tracking-widest text-muted-foreground text-[10px]">A = [a b; c d]</span>
          <div className="grid grid-cols-2 gap-1">{(["a", "b", "c", "d"] as const).map(cell)}</div>
        </div>
        <span className="text-lg">·</span>
        <div className="flex flex-col items-center gap-1">
          <span className="uppercase tracking-widest text-muted-foreground text-[10px]">B = [e f; g h]</span>
          <div className="grid grid-cols-2 gap-1">{(["e", "f", "g", "h"] as const).map(cell)}</div>
        </div>
        <span className="text-lg">=</span>
        <MatrixBox label="C (Strassen)" m={[[res.r, res.s], [res.t, res.u]]} tone={same ? "border-mint" : "border-orange"} />
        <MatrixBox label="C (usual, 8 mults)" m={[[res.standard.r, res.standard.s], [res.standard.t, res.standard.u]]} />
      </div>
      <div className="grid gap-1 sm:grid-cols-2 font-mono text-xs">
        {res.P.map((p, i) => (
          <div key={i} className="flex justify-between gap-3 border border-violet/40 bg-violet/10 rounded-sm px-2.5 py-1.5">
            <span>
              P{i + 1} = {STRASSEN_P[i]}
            </span>
            <span className="font-bold">{p}</span>
          </div>
        ))}
      </div>
      <div className="font-mono text-xs leading-relaxed text-muted-foreground">
        r = P5 + P4 − P2 + P6 = <b className="text-foreground">{res.r}</b> · s = P1 + P2 = <b className="text-foreground">{res.s}</b> · t = P3 + P4 ={" "}
        <b className="text-foreground">{res.t}</b> · u = P5 + P1 − P3 − P7 = <b className="text-foreground">{res.u}</b>
      </div>
      <p className={`text-sm font-semibold ${same ? "text-mint" : "text-orange"}`}>{same ? "Same answer, one multiplication fewer." : "These should always match."}</p>
    </Panel>
  );
}

/** F(n) from powers of [[1 1] [1 0]], using only about 2 lg n matrix multiplications. */
export function FibonacciMatrix({ initialN = 13 }: { initialN?: number }) {
  const [n, setN] = useState(initialN);
  const { steps, result, multiplications } = useMemo(() => fibByMatrix(n), [n]);
  const short = (x: bigint) => {
    const t = x.toString();
    return t.length > 10 ? `${t.slice(0, 4)}…(${t.length} digits)` : t;
  };
  return (
    <Panel title="Fibonacci by repeated squaring" legend={[["bg-mint", "used for n"], ["bg-violet", "computed"]]}>
      <label className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">n</span>
        <input type="range" min={1} max={200} value={n} onChange={(e) => setN(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="n" />
        <span className="font-display text-xl font-bold w-24">n = {n}</span>
      </label>
      <div className="font-mono text-xs text-muted-foreground">
        n = {n} = ({n.toString(2)})₂ = {steps.filter((s) => s.used).map((s) => s.power).join(" + ")}, so multiply together the mint matrices.
      </div>
      <div className="flex flex-wrap gap-3">
        {steps.map((s) => (
          <MatrixBox key={s.power} label={`M^${s.power}`} m={s.matrix.map((r) => r.map(short))} tone={s.used ? "border-mint" : "border-violet/50"} />
        ))}
      </div>
      <div className="font-display text-lg font-bold break-all">
        F({n}) = <span className="text-mint">{result[0][1].toString()}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {multiplications} matrix multiplications. Each 2×2 multiplication is a fixed 8 number multiplications, so this is Θ(lg n), against Θ(n) for the bottom-up loop.
      </p>
    </Panel>
  );
}
