import { Fragment, useId, useMemo, useState } from "react";
import { btn, inputCls, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import {
  adjacency,
  assignments,
  binom,
  birthdayCollision,
  birthdayHalf,
  CHARSETS,
  classify,
  completeTree,
  degrees,
  disagreements,
  equivalenceClasses,
  evalProp,
  exists,
  forAll,
  functionKind,
  humanDuration,
  inductionFrames,
  invariantFrames,
  isEquivalence,
  isPartialOrder,
  isPrimeSmall,
  lcg,
  parseProp,
  parseSetExpr,
  pascalRows,
  pigeonFrames,
  PY_BINARY_SEARCH,
  PY_INDUCTION,
  PY_KAHN,
  PY_PIGEON,
  relationFrom,
  relationProps,
  showProp,
  subformulas,
  subsetsOfSize,
  topoFrames,
  transitiveClosure,
  treeHeight,
  TWO_DICE,
  varsOf,
  type GEdge,
  type GNode,
  type Matrix,
  type Prop,
} from "@/lib/discrete";

/* ============================================================
   Visualizers for the Discrete Mathematics course. Colours follow
   AlgoVisualizers: neon = looking at, orange = breaks the rule,
   mint = true / holds, violet = special, sky = the active set.
   ============================================================ */

const T = "text-mint";
const F = "text-orange";
const tf = (b: boolean) => (b ? "T" : "F");

function useFormula(initial: string): [string, (s: string) => void, Prop | null, string | null] {
  const [text, setText] = useState(initial);
  const parsed = useMemo(() => {
    try {
      return { e: parseProp(text), err: null };
    } catch (x) {
      return { e: null, err: (x as Error).message };
    }
  }, [text]);
  return [text, setText, parsed.e, parsed.err];
}

const SYNTAX_HINT = "Use one-letter variables and ! & | -> <-> (or ¬ ∧ ∨ → ↔, or the words not, and, or).";

function Badge({ tone, children }: { tone: "mint" | "orange" | "sky" | "violet" | "neon" | "muted"; children: React.ReactNode }) {
  const cls = {
    mint: "border-mint text-mint bg-mint/10",
    orange: "border-orange text-orange bg-orange/10",
    sky: "border-sky text-sky bg-sky/10",
    violet: "border-violet text-violet bg-violet/10",
    neon: "border-neon text-foreground bg-neon/20",
    muted: "border-border text-muted-foreground",
  }[tone];
  return <span className={`inline-flex items-center px-2 py-0.5 border rounded-sm font-mono text-[11px] uppercase tracking-widest ${cls}`}>{children}</span>;
}

/** Like Toggle, but wraps onto several lines and keeps the labels' case, for longer options. */
function Chips({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)} className={`${btn} normal-case tracking-normal ${v === value ? "bg-foreground text-background border-foreground" : ""}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- truth tables ------------------------------- */

const TT_PRESETS = ["p -> q", "!(p & q)", "p | !p", "(p -> q) & p -> q", "p & q -> r"];

export function TruthTableLab({ start = "p -> q", presets = TT_PRESETS }: { start?: string; presets?: string[] }) {
  const [text, setText, e, err] = useFormula(start);
  const vars = e ? varsOf(e) : [];
  const cols = e ? subformulas(e) : [];
  const rows = e ? assignments(vars) : [];
  const verdict = e ? classify(e) : null;
  return (
    <Panel title="Truth table" legend={[["bg-mint", "true"], ["bg-orange", "false"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Formula" className={`${inputCls} w-full sm:w-72`} value={text} onChange={(ev) => setText(ev.target.value)} spellCheck={false} />
        {presets.map((p) => (
          <button key={p} type="button" className={`${btn} normal-case tracking-normal`} onClick={() => setText(p)}>{showProp(parseProp(p))}</button>
        ))}
      </div>
      {err ? (
        <p className="font-mono text-xs text-orange">{err}. {SYNTAX_HINT}</p>
      ) : (
        e && (
          <>
            <div className="overflow-x-auto">
              <table className="font-mono text-sm border-collapse">
                <thead>
                  <tr>
                    {vars.map((v) => <th key={v} className="px-3 py-1.5 border-b border-border text-left text-muted-foreground">{v}</th>)}
                    {cols.map((c, i) => (
                      <th key={i} className={`px-3 py-1.5 border-b border-border text-left whitespace-nowrap ${i === cols.length - 1 ? "text-foreground border-l-2 border-l-neon" : "text-muted-foreground"}`}>{showProp(c)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((env, r) => (
                    <tr key={r}>
                      {vars.map((v) => <td key={v} className="px-3 py-1 text-muted-foreground">{tf(env[v])}</td>)}
                      {cols.map((c, i) => {
                        const val = evalProp(c, env);
                        return <td key={i} className={`px-3 py-1 ${val ? T : F} ${i === cols.length - 1 ? "font-bold border-l-2 border-l-neon" : ""}`}>{tf(val)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
              <span>{rows.length} rows = 2<sup>{vars.length}</sup></span>
              {verdict === "tautology" && <Badge tone="mint">tautology: true on every row</Badge>}
              {verdict === "contradiction" && <Badge tone="orange">contradiction: false on every row</Badge>}
              {verdict === "contingency" && <Badge tone="sky">contingency: depends on the inputs</Badge>}
            </div>
          </>
        )
      )}
    </Panel>
  );
}

/* --------------------------- equivalence checker --------------------------- */

const EQ_PRESETS: [string, string, string][] = [
  ["De Morgan", "!(p & q)", "!p | !q"],
  ["Contrapositive", "p -> q", "!q -> !p"],
  ["Converse", "p -> q", "q -> p"],
  ["Implication as or", "p -> q", "!p | q"],
  ["Distributive", "p & (q | r)", "p & q | p & r"],
];

export function EquivalenceChecker({ left = "!(p & q)", right = "!p | !q" }: { left?: string; right?: string }) {
  const [lt, setL, le, lerr] = useFormula(left);
  const [rt, setR, re, rerr] = useFormula(right);
  const ok = le && re;
  const vars = ok ? [...new Set([...varsOf(le), ...varsOf(re)])].sort() : [];
  const bad = ok ? disagreements(le, re) : [];
  const isBad = (env: Record<string, boolean>) => bad.some((b) => vars.every((v) => b[v] === env[v]));
  return (
    <Panel title="Are these the same statement?" legend={[["bg-mint", "agree"], ["bg-orange", "disagree"]]}>
      <div className="flex flex-wrap gap-2">
        {EQ_PRESETS.map(([name, a, b]) => (
          <button key={name} type="button" className={btn} onClick={() => { setL(a); setR(b); }}>{name}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Left formula" className={`${inputCls} w-full sm:w-56`} value={lt} onChange={(ev) => setL(ev.target.value)} spellCheck={false} />
        <span className="font-mono text-lg text-muted-foreground">≡?</span>
        <input aria-label="Right formula" className={`${inputCls} w-full sm:w-56`} value={rt} onChange={(ev) => setR(ev.target.value)} spellCheck={false} />
      </div>
      {lerr || rerr ? (
        <p className="font-mono text-xs text-orange">{lerr ?? rerr}. {SYNTAX_HINT}</p>
      ) : (
        ok && (
          <>
            <div className="overflow-x-auto">
              <table className="font-mono text-sm border-collapse">
                <thead>
                  <tr>
                    {vars.map((v) => <th key={v} className="px-3 py-1.5 border-b border-border text-left text-muted-foreground">{v}</th>)}
                    <th className="px-3 py-1.5 border-b border-border text-left whitespace-nowrap">{showProp(le)}</th>
                    <th className="px-3 py-1.5 border-b border-border text-left whitespace-nowrap">{showProp(re)}</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments(vars).map((env, r) => {
                    const x = isBad(env);
                    return (
                      <tr key={r} className={x ? "bg-orange/15" : ""}>
                        {vars.map((v) => <td key={v} className="px-3 py-1 text-muted-foreground">{tf(env[v])}</td>)}
                        <td className={`px-3 py-1 ${x ? F : T}`}>{tf(evalProp(le, env))}</td>
                        <td className={`px-3 py-1 ${x ? F : T}`}>{tf(evalProp(re, env))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="font-mono text-xs">
              {bad.length === 0 ? (
                <Badge tone="mint">equivalent: they agree on all {2 ** vars.length} rows</Badge>
              ) : (
                <Badge tone="orange">not equivalent: {bad.length} row{bad.length > 1 ? "s" : ""} disagree</Badge>
              )}
            </div>
          </>
        )
      )}
    </Panel>
  );
}

/* ------------------------------- quantifiers ------------------------------- */

const DOMAIN = Array.from({ length: 12 }, (_, i) => i + 1);
const PREDICATES: { id: string; label: string; test: (x: number) => boolean }[] = [
  { id: "pos", label: "x > 0", test: (x) => x > 0 },
  { id: "even", label: "x is even", test: (x) => x % 2 === 0 },
  { id: "prime", label: "x is prime", test: isPrimeSmall },
  { id: "lt10", label: "x < 10", test: (x) => x < 10 },
  { id: "gt12", label: "x > 12", test: (x) => x > 12 },
];

export function QuantifierLab() {
  const [q, setQ] = useState<"all" | "some">("all");
  const [pid, setPid] = useState("even");
  const [neg, setNeg] = useState(false);
  const pred = PREDICATES.find((p) => p.id === pid)!;
  const res = q === "all" ? forAll(DOMAIN, pred.test) : exists(DOMAIN, pred.test);
  const value = neg ? !res.holds : res.holds;
  const sym = q === "all" ? "∀" : "∃";
  const dual = q === "all" ? "∃" : "∀";
  return (
    <Panel title="For all, there exists" legend={[["bg-mint", "P(x) true"], ["bg-orange", "P(x) false"], ["bg-neon", "deciding element"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle<"all" | "some"> value={q} onChange={setQ} options={[["all", "∀ for all"], ["some", "∃ there exists"]]} />
        <Chips value={pid} onChange={setPid} options={PREDICATES.map((p) => [p.id, p.label] as [string, string])} />
        <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest cursor-pointer">
          <input type="checkbox" checked={neg} onChange={(e) => setNeg(e.target.checked)} /> negate
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Domain 1 to 12">
        {DOMAIN.map((x) => {
          const t = pred.test(x);
          const key = x === res.witness;
          return (
            <div key={x} className={`w-10 h-10 flex items-center justify-center font-mono text-sm border rounded-sm transition-colors ${t ? "border-mint bg-mint/15" : "border-orange bg-orange/15"} ${key ? "ring-2 ring-neon ring-offset-2 ring-offset-card font-bold" : ""}`}>
              {x}
            </div>
          );
        })}
      </div>
      <div className="font-mono text-sm leading-relaxed">
        <div>
          {neg && "¬"}{sym}x ∈ {"{1…12}"}: {pred.label}
          {"  "}<span className={value ? T : F}>is {value ? "true" : "false"}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {q === "all"
            ? res.holds ? "Every element passes, so there's no counterexample." : `${res.witness} fails, and one counterexample is enough to make ∀ false.`
            : res.holds ? `${res.witness} passes, and one example is enough to make ∃ true.` : "No element passes, so ∃ is false."}
          {neg && ` Pushing the ¬ inside flips ${sym} to ${dual}: ${dual}x ¬(${pred.label}).`}
        </div>
      </div>
    </Panel>
  );
}

/* ---------------------------------- Venn ---------------------------------- */

const VENN_PRESETS = ["A ∪ B", "A ∩ B", "A − B", "A Δ B", "(A ∪ B)'", "A' ∩ B'", "A ∩ (B ∪ C)", "(A ∩ B) ∪ (A ∩ C)"];
const CIRCLES = [
  { name: "A", cx: 130, cy: 110 },
  { name: "B", cx: 210, cy: 110 },
  { name: "C", cx: 170, cy: 178 },
];

export function VennLab({ start = "A ∪ B" }: { start?: string }) {
  const [text, setText] = useState(start);
  const parsed = useMemo(() => {
    try {
      return { e: parseSetExpr(text), err: null };
    } catch (x) {
      return { e: null, err: (x as Error).message };
    }
  }, [text]);
  const usesC = parsed.e ? varsOf(parsed.e).includes("c") : false;
  const unknown = parsed.e ? varsOf(parsed.e).filter((v) => !["a", "b", "c"].includes(v)) : [];
  const circles = usesC ? CIRCLES : CIRCLES.slice(0, 2).map((c) => ({ ...c, cy: 130 }));
  // each region is the universe clipped to the circles it lies inside and masked by the ones it lies outside
  const uid = useId().replace(/:/g, "");
  const names = circles.map((c) => c.name.toLowerCase());
  const regions = parsed.e && !unknown.length ? assignments(names).filter((env) => evalProp(parsed.e!, env)) : [];
  const labelAt = (c: (typeof circles)[number]): [number, number] => (c.name === "A" ? [c.cx - 78, c.cy - 58] : c.name === "B" ? [c.cx + 78, c.cy - 58] : [c.cx + 80, c.cy + 52]);
  return (
    <Panel title="Venn diagram" legend={[["bg-sky", "in the result"]]}>
      <div className="flex flex-wrap gap-2">
        {VENN_PRESETS.map((p) => <button key={p} type="button" className={`${btn} normal-case tracking-normal`} onClick={() => setText(p)}>{p}</button>)}
      </div>
      <input aria-label="Set expression" className={`${inputCls} w-full sm:w-72`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      {parsed.err || unknown.length ? (
        <p className="font-mono text-xs text-orange">{unknown.length ? `Only sets A, B and C are drawn` : parsed.err}. Use ∪ (or +), ∩, − (or \), Δ and ' for complement.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <svg viewBox="0 0 340 268" className="w-full max-w-[340px]" role="img" aria-label={`Venn diagram of ${text}`}>
            <rect x={1} y={1} width={338} height={266} className="fill-none stroke-border" />
            <text x={10} y={20} fontSize={12} className="fill-muted-foreground font-mono">U</text>
            <defs>
              {circles.map((c, i) => (
                <clipPath key={c.name} id={`${uid}c${i}`}>
                  <circle cx={c.cx} cy={c.cy} r={72} />
                </clipPath>
              ))}
              {regions.map((env, k) => (
                <mask key={k} id={`${uid}m${k}`}>
                  <rect x={0} y={0} width={340} height={268} fill="white" />
                  {circles.map((c, i) => !env[names[i]] && <circle key={c.name} cx={c.cx} cy={c.cy} r={72} fill="black" />)}
                </mask>
              ))}
            </defs>
            {regions.map((env, k) =>
              circles.reduce<React.ReactNode>(
                (node, c, i) => (env[names[i]] ? <g clipPath={`url(#${uid}c${i})`}>{node}</g> : node),
                <rect x={1} y={1} width={338} height={266} mask={`url(#${uid}m${k})`} className="fill-sky/50" />,
              ),
            ).map((node, k) => <g key={k}>{node}</g>)}
            {circles.map((c) => {
              const [lx, ly] = labelAt(c);
              return (
                <g key={c.name}>
                  <circle cx={c.cx} cy={c.cy} r={72} className="fill-none stroke-foreground" strokeWidth={1.5} />
                  <text x={lx} y={ly} dy=".35em" textAnchor="middle" fontSize={15} className="fill-foreground font-display font-bold">{c.name}</text>
                </g>
              );
            })}
          </svg>
          <div className="font-mono text-xs text-muted-foreground space-y-1 max-w-xs">
            <div>As logic, about one element x:</div>
            <div className="text-foreground text-sm">{showProp(parsed.e!).replace(/\b([abc])\b/g, (m) => `x∈${m.toUpperCase()}`)}</div>
            <div className="pt-2">∪ is ∨, ∩ is ∧, complement is ¬, and A − B is A ∧ ¬B.</div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------- functions -------------------------------- */

const FN_DOMAIN = ["ana", "ben", "cy", "dee"];
const FN_CODOMAIN = ["0", "1", "2", "3", "4"];
const FN_PRESETS: [string, number[], number][] = [
  ["Injective", [0, 2, 3, 4], 5],
  ["Surjective", [0, 1, 2, 2], 3],
  ["Bijective", [1, 3, 0, 2], 4],
  ["Neither", [1, 1, 3, 3], 4],
];

export function FunctionMapper() {
  const [m, setM] = useState(4);
  const [f, setF] = useState<number[]>([1, 3, 0, 2]);
  const k = functionKind(f, m);
  const yOf = (i: number, n: number) => 30 + (i * 200) / Math.max(1, n - 1);
  const clashSet = new Set(k.collisions.flat());
  return (
    <Panel title="A function, arrow by arrow" legend={[["bg-mint", "one-to-one arrow"], ["bg-orange", "shares a target"], ["bg-violet", "never hit"]]}>
      <div className="flex flex-wrap items-center gap-2">
        {FN_PRESETS.map(([name, map, size]) => (
          <button key={name} type="button" className={btn} onClick={() => { setM(size); setF(map); }}>{name}</button>
        ))}
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground ml-2">codomain size</span>
        <Toggle<string> value={String(m)} onChange={(v) => { const n = Number(v); setM(n); setF((old) => old.map((y) => y % n)); }} options={[["3", "3"], ["4", "4"], ["5", "5"]]} />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <svg viewBox="0 0 320 260" className="w-full max-w-[320px]" role="img" aria-label="Arrows from domain to codomain">
          <text x={50} y={14} textAnchor="middle" fontSize={11} className="fill-muted-foreground font-mono">domain</text>
          <text x={270} y={14} textAnchor="middle" fontSize={11} className="fill-muted-foreground font-mono">codomain</text>
          {f.map((y, x) => (
            <line key={x} x1={86} y1={yOf(x, FN_DOMAIN.length)} x2={248} y2={yOf(y, m)} strokeWidth={2} className={`transition-all duration-300 ${clashSet.has(x) ? "stroke-orange" : "stroke-mint"}`} markerEnd="url(#fn-arrow)" />
          ))}
          <defs>
            <marker id="fn-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
              <path d="M0,0L10,5L0,10z" className="fill-muted-foreground" />
            </marker>
          </defs>
          {FN_DOMAIN.map((name, x) => (
            <g key={name} className="cursor-pointer" onClick={() => setF((old) => old.map((y, i) => (i === x ? (y + 1) % m : y)))}>
              <rect x={14} y={yOf(x, FN_DOMAIN.length) - 14} width={72} height={28} rx={3} className="fill-card stroke-foreground hover:fill-neon/20" />
              <text x={50} y={yOf(x, FN_DOMAIN.length)} dy=".35em" textAnchor="middle" fontSize={13} className="fill-foreground font-mono">{name}</text>
            </g>
          ))}
          {FN_CODOMAIN.slice(0, m).map((name, y) => (
            <g key={name}>
              <circle cx={270} cy={yOf(y, m)} r={15} className={k.missed.includes(y) ? "fill-violet/20 stroke-violet" : "fill-card stroke-foreground"} strokeWidth={1.5} />
              <text x={270} y={yOf(y, m)} dy=".35em" textAnchor="middle" fontSize={13} className="fill-foreground font-mono">{name}</text>
            </g>
          ))}
        </svg>
        <div className="font-mono text-xs space-y-2 max-w-xs">
          <p className="text-muted-foreground">Click a name to move its arrow.</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone={k.injective ? "mint" : "orange"}>{k.injective ? "injective" : "not injective"}</Badge>
            <Badge tone={k.surjective ? "mint" : "violet"}>{k.surjective ? "surjective" : "not surjective"}</Badge>
            {k.bijective && <Badge tone="neon">bijective</Badge>}
          </div>
          <p className="text-muted-foreground">
            {k.collisions.length > 0 && <>{k.collisions.map((c) => c.map((i) => FN_DOMAIN[i]).join(" and ")).join("; ")} share a target. </>}
            {k.missed.length > 0 && <>Nothing maps to {k.missed.join(", ")}. </>}
            {4 > m && "Four names, fewer than four targets: some must share."}
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------- relations -------------------------------- */

const REL_N = 6;
const REL_PRESETS: [string, (a: number, b: number) => boolean][] = [
  ["a = b", (a, b) => a === b],
  ["a ≤ b", (a, b) => a <= b],
  ["a < b", (a, b) => a < b],
  ["a divides b", (a, b) => b % a === 0],
  ["a ≡ b (mod 3)", (a, b) => (a - b) % 3 === 0],
  ["b = a + 1", (a, b) => b === a + 1],
];

export function RelationGrid({ start = 4 }: { start?: number }) {
  const [r, setR] = useState<Matrix>(() => relationFrom(REL_N, REL_PRESETS[start][1]));
  const [name, setName] = useState(REL_PRESETS[start][0]);
  const p = relationProps(r);
  const eq = isEquivalence(p);
  const po = isPartialOrder(p);
  const flag = (i: number, j: number) =>
    (p.why.reflexive && p.why.reflexive[0] === i && i === j) ||
    (p.why.symmetric && ((p.why.symmetric[0] === i && p.why.symmetric[1] === j) || (p.why.symmetric[0] === j && p.why.symmetric[1] === i))) ||
    (p.why.transitive && ((p.why.transitive[0] === i && p.why.transitive[1] === j) || (p.why.transitive[1] === i && p.why.transitive[2] === j) || (p.why.transitive[0] === i && p.why.transitive[2] === j)));
  const props: [keyof typeof p.why, boolean, string][] = [
    ["reflexive", p.reflexive, p.why.reflexive ? `${p.why.reflexive[0] + 1} is not related to itself` : "every a relates to itself"],
    ["symmetric", p.symmetric, p.why.symmetric ? `${p.why.symmetric[0] + 1}→${p.why.symmetric[1] + 1} but not ${p.why.symmetric[1] + 1}→${p.why.symmetric[0] + 1}` : "every arrow has its reverse"],
    ["antisymmetric", p.antisymmetric, p.why.antisymmetric ? `${p.why.antisymmetric[0] + 1}→${p.why.antisymmetric[1] + 1} and back, yet they differ` : "no two different elements point both ways"],
    ["transitive", p.transitive, p.why.transitive ? `${p.why.transitive[0] + 1}→${p.why.transitive[1] + 1}→${p.why.transitive[2] + 1} but not ${p.why.transitive[0] + 1}→${p.why.transitive[2] + 1}` : "every two-step path has a shortcut"],
  ];
  return (
    <Panel title="A relation on {1, …, 6}" legend={[["bg-sky", "a is related to b"], ["bg-orange", "breaks a property"]]}>
      <div className="flex flex-wrap gap-2">
        {REL_PRESETS.map(([n, rule]) => (
          <button key={n} type="button" className={`${btn} normal-case tracking-normal`} onClick={() => { setR(relationFrom(REL_N, rule)); setName(n); }}>{n}</button>
        ))}
        <button type="button" className={btn} disabled={p.transitive} onClick={() => { setR(transitiveClosure(r)); setName("closure"); }}>Transitive closure</button>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">row a, column b · {name}</div>
          <table className="font-mono text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-7" />
                {r.map((_, j) => <th key={j} className="w-8 h-6 text-muted-foreground">{j + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {r.map((row, i) => (
                <tr key={i}>
                  <th className="text-muted-foreground pr-1">{i + 1}</th>
                  {row.map((v, j) => (
                    <td key={j} className="p-0.5">
                      <button
                        type="button"
                        aria-label={`${i + 1} related to ${j + 1}: ${v ? "yes" : "no"}`}
                        onClick={() => { setR(r.map((rr, a) => rr.map((x, b) => (a === i && b === j ? !x : x)))); setName("custom"); }}
                        className={`w-7 h-7 border rounded-[2px] transition-colors ${flag(i, j) ? "border-orange" : "border-border"} ${v ? "bg-sky/60" : "bg-background/50 hover:bg-foreground/10"} ${flag(i, j) ? "ring-1 ring-orange" : ""}`}
                      >
                        {v ? "1" : ""}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="font-mono text-xs space-y-2 flex-1 min-w-[220px]">
          {props.map(([k, ok, why]) => (
            <div key={k} className="flex items-start gap-2">
              <span className={`w-4 shrink-0 ${ok ? T : F}`}>{ok ? "✓" : "✗"}</span>
              <span><span className="text-foreground">{k}</span> <span className="text-muted-foreground">· {why}</span></span>
            </div>
          ))}
          <div className="pt-2 flex flex-wrap gap-2">
            {eq && <Badge tone="mint">equivalence relation</Badge>}
            {po && <Badge tone="violet">partial order</Badge>}
            {!eq && !po && <Badge tone="muted">neither</Badge>}
          </div>
          {eq && (
            <div className="text-muted-foreground">
              classes: {equivalenceClasses(r).map((c) => `{${c.map((x) => x + 1).join(", ")}}`).join(" ")}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------- induction -------------------------------- */

export function InductionStairs({ n = 6 }: { n?: number }) {
  const frames = useMemo(() => inductionFrames(n), [n]);
  const size = 26;
  return (
    <Stepper
      title="Induction, one step at a time"
      frames={frames}
      code={PY_INDUCTION}
      codeLabel="Python"
      legend={[["bg-mint", "proved so far"], ["bg-neon", "the new column"]]}
      render={(s) => (
        <div className="flex flex-wrap items-end gap-6">
          <svg viewBox={`0 0 ${n * size + 4} ${n * size + 4}`} width={n * size + 4} className="max-w-full h-auto" role="img" aria-label={`Staircase of ${s.k} columns`}>
            {Array.from({ length: n }, (_, c) =>
              Array.from({ length: c + 1 }, (_, h) => {
                const col = c + 1;
                const on = col <= s.k;
                const fresh = s.phase === "add" && col === s.k;
                return (
                  <rect
                    key={`${c}-${h}`}
                    x={2 + c * size}
                    y={2 + (n - 1 - h) * size}
                    width={size - 3}
                    height={size - 3}
                    rx={2}
                    className={`transition-colors duration-300 ${fresh ? "fill-neon" : on ? "fill-mint/60" : "fill-none stroke-border"}`}
                  />
                );
              }),
            )}
          </svg>
          <div className="font-mono text-sm space-y-1">
            <div className="text-muted-foreground text-xs">P({s.k}):</div>
            <div>1 + … + {s.k} = <span className={T}>{s.lhs}</span></div>
            <div>{s.k}·{s.k + 1}/2 = <span className={T}>{s.rhs}</span></div>
          </div>
        </div>
      )}
    />
  );
}

/* --------------------------- loop invariant search --------------------------- */

const SEARCH_ARR = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];

export function InvariantSearch({ target: t0 = 23 }: { target?: number }) {
  const [target, setTarget] = useState(t0);
  const frames = useMemo(() => invariantFrames(SEARCH_ARR, target), [target]);
  return (
    <Stepper
      title="Binary search, with its invariant"
      frames={frames}
      code={PY_BINARY_SEARCH}
      codeLabel="Python"
      legend={[["bg-sky", "a[lo..hi]"], ["bg-neon", "mid"], ["bg-mint", "found"]]}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">target</span>
          {[23, 2, 91, 50].map((v) => (
            <button key={v} type="button" className={`${btn} ${v === target ? "border-foreground" : ""}`} onClick={() => setTarget(v)}>{v}</button>
          ))}
        </div>
      }
      render={(s) => (
        <div className="space-y-3">
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto pb-1">
            {s.arr.map((v, i) => {
              const inWin = i >= s.lo && i <= s.hi;
              const cls = s.found === i ? "border-mint bg-mint/40" : s.mid === i ? "border-neon bg-neon/30" : inWin ? "border-sky bg-sky/20" : "border-border opacity-40";
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  {/* 22px wide on phones (40px from sm up), so the 15-cell array fits a 390px screen */}
                  <div className={`w-[22px] sm:w-10 h-10 shrink-0 flex items-center justify-center font-mono text-[11px] sm:text-sm border rounded-sm transition-all duration-300 ${cls}`}>{v}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{i}</div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="text-muted-foreground">lo = {s.lo}, hi = {s.hi}</span>
            <Badge tone={s.invariant ? "mint" : "orange"}>invariant {s.invariant ? "holds" : "broken"}</Badge>
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------ password space ------------------------------ */

const RATES: [string, number, string][] = [
  ["1e3", 1e3, "online, rate-limited"],
  ["1e10", 1e10, "one GPU, fast hash"],
  ["1e12", 1e12, "a GPU cluster"],
];

export function PasswordSpace() {
  const [sets, setSets] = useState<string[]>(["lower"]);
  const [len, setLen] = useState(8);
  const [rate, setRate] = useState("1e10");
  const size = CHARSETS.filter((c) => sets.includes(c.id)).reduce((a, c) => a + c.size, 0);
  const count = size ** len;
  const perSec = RATES.find((r) => r[0] === rate)![1];
  return (
    <Panel title="How many passwords?" legend={[["bg-sky", "sum rule"], ["bg-violet", "product rule"]]}>
      <div className="flex flex-wrap items-center gap-3">
        {CHARSETS.map((c) => (
          <label key={c.id} className="inline-flex items-center gap-1.5 font-mono text-xs cursor-pointer">
            <input type="checkbox" checked={sets.includes(c.id)} onChange={(e) => setSets((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id).length ? s.filter((x) => x !== c.id) : s))} />
            {c.label} <span className="text-muted-foreground">({c.size})</span>
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 font-mono text-xs">
        <span className="text-muted-foreground uppercase tracking-widest text-[11px]">length {len}</span>
        <input type="range" min={1} max={20} value={len} onChange={(e) => setLen(Number(e.target.value))} className="w-48 accent-[hsl(var(--sky))]" aria-label="Password length" />
      </label>
      <div className="font-mono text-sm space-y-1.5">
        <div><span className="text-sky">{CHARSETS.filter((c) => sets.includes(c.id)).map((c) => c.size).join(" + ")} = {size}</span> <span className="text-muted-foreground">choices per character</span></div>
        <div><span className="text-violet">{size}<sup>{len}</sup></span> = <span className="text-foreground font-bold">{count.toLocaleString("en-US", { maximumSignificantDigits: 4 })}</span> <span className="text-muted-foreground">passwords of length {len}</span></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">guesses per second</span>
        <Toggle<string> value={rate} onChange={setRate} options={RATES.map(([k, v]) => [k, v.toExponential(0).replace("e+", "×10^")] as [string, string])} />
      </div>
      <div className="font-mono text-sm">
        Trying them all takes <span className="text-orange font-bold">{humanDuration(count / perSec)}</span>{" "}
        <span className="text-muted-foreground text-xs">({RATES.find((r) => r[0] === rate)![2]}; on average an attacker finds it in half that)</span>
      </div>
    </Panel>
  );
}

/* ------------------------------ Pascal's triangle ------------------------------ */

export function PascalExplorer({ rows = 7 }: { rows?: number }) {
  const tri = useMemo(() => pascalRows(rows), [rows]);
  const [pick, setPick] = useState<[number, number]>([4, 2]);
  const [n, k] = pick;
  const letters = "abcdefg".slice(0, n).split("");
  const subsets = n <= 5 ? subsetsOfSize(letters, k) : [];
  const parent = (r: number, c: number) => r === n - 1 && (c === k - 1 || c === k);
  return (
    <Panel title="Pascal's triangle" legend={[["bg-neon", "C(n, k)"], ["bg-sky", "the two above it"]]}>
      <div className="overflow-x-auto">
        <div className="flex flex-col items-center gap-1 min-w-max mx-auto">
        {tri.map((row, r) => (
          <div key={r} className="flex gap-0.5 sm:gap-1">
            {row.map((v, c) => {
              const on = r === n && c === k;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPick([r, c])}
                  aria-label={`C(${r}, ${c}) = ${v}`}
                  className={`w-8 sm:w-10 h-8 font-mono text-xs border rounded-sm transition-colors ${on ? "border-neon bg-neon/40 font-bold" : parent(r, c) ? "border-sky bg-sky/25" : "border-border hover:border-foreground"}`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        ))}
        </div>
      </div>
      <div className="font-mono text-sm space-y-1">
        <div>
          C({n}, {k}) = <span className="font-bold">{binom(n, k)}</span>
          {n > 0 && k > 0 && k < n && <span className="text-muted-foreground"> = C({n - 1}, {k - 1}) + C({n - 1}, {k}) = {binom(n - 1, k - 1)} + {binom(n - 1, k)}</span>}
        </div>
        {n <= 5 && n > 0 && (
          <div className="text-xs text-muted-foreground">
            the {binom(n, k)} ways to choose {k} of {"{"}{letters.join(", ")}{"}"}:{" "}
            <span className="text-foreground">{subsets.map((s) => `{${s.join("")}}`).join(" ") || "{}"}</span>
            {k > 0 && k < n && <> · those with <span className="text-sky">{letters[n - 1]}</span> come from C({n - 1}, {k - 1}), the rest from C({n - 1}, {k})</>}
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------- pigeonhole ------------------------------- */

export function PigeonholeLab() {
  const [m, setM] = useState(7);
  const [count, setCount] = useState(8);
  const keys = useMemo(() => {
    const r = lcg(2024);
    return Array.from({ length: count }, () => Math.floor(r() * 900) + 100);
  }, [count]);
  const frames = useMemo(() => pigeonFrames(keys, m), [keys, m]);
  return (
    <Stepper
      title="Keys into buckets"
      frames={frames}
      code={PY_PIGEON}
      codeLabel="Python"
      legend={[["bg-mint", "alone"], ["bg-orange", "collision"]]}
      inputs={
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
          <label className="flex items-center gap-2">
            <span className="uppercase tracking-widest text-[11px] text-muted-foreground">buckets {m}</span>
            <input type="range" min={3} max={10} value={m} onChange={(e) => setM(Number(e.target.value))} aria-label="Buckets" />
          </label>
          <label className="flex items-center gap-2">
            <span className="uppercase tracking-widest text-[11px] text-muted-foreground">keys {count}</span>
            <input type="range" min={2} max={14} value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="Keys" />
          </label>
        </div>
      }
      render={(s) => (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1 font-mono text-xs">
            {s.keys.map((k, i) => (
              <span key={i} className={`px-1.5 py-0.5 border rounded-sm ${i < s.placed ? "opacity-30 border-border" : i === s.placed ? "border-neon" : "border-border"}`}>{k}</span>
            ))}
          </div>
          <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1">
            {s.buckets.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                <div className={`w-9 sm:w-12 min-h-[92px] border rounded-sm flex flex-col-reverse items-center gap-1 p-1 transition-colors ${s.clash === i ? "border-orange bg-orange/10" : b.length > 1 ? "border-orange/60" : "border-border"}`}>
                  {b.map((k, j) => (
                    <span key={j} className={`w-full text-center font-mono text-[10px] sm:text-[11px] rounded-[2px] ${b.length > 1 ? "bg-orange/30" : "bg-mint/30"}`}>{k}</span>
                  ))}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{i}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    />
  );
}

/* ----------------------------- graph representations ----------------------------- */

const G_NODES: GNode[] = [
  { id: "A", x: 50, y: 50 },
  { id: "B", x: 190, y: 40 },
  { id: "C", x: 120, y: 140 },
  { id: "D", x: 270, y: 130 },
  { id: "E", x: 40, y: 200 },
];
const G_EDGES: GEdge[] = [["A", "B"], ["A", "C"], ["B", "C"], ["B", "D"], ["C", "D"], ["C", "E"]];

function arrowEnd(a: GNode, b: GNode, r = 18) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: b.x - (dx / d) * r, y: b.y - (dy / d) * r };
}

export function GraphRepresentations() {
  const [directed, setDirected] = useState(false);
  const [sel, setSel] = useState("C");
  const adj = adjacency(G_NODES, G_EDGES, directed);
  const deg = degrees(G_NODES, G_EDGES);
  const ids = G_NODES.map((n) => n.id);
  const pos = Object.fromEntries(G_NODES.map((n) => [n.id, n]));
  const touches = (a: string, b: string) => a === sel || (!directed && b === sel);
  return (
    <Panel title="One graph, two ways to store it" legend={[["bg-neon", "selected"], ["bg-sky", "its neighbours"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle<string> value={directed ? "d" : "u"} onChange={(v) => setDirected(v === "d")} options={[["u", "Undirected"], ["d", "Directed"]]} />
        <span className="font-mono text-[11px] text-muted-foreground">click a node</span>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <svg viewBox="0 0 310 230" className="w-full max-w-[310px]" role="img" aria-label="Graph with five nodes">
          <defs>
            <marker id="g-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M0,0L10,5L0,10z" className="fill-foreground" />
            </marker>
          </defs>
          {G_EDGES.map(([a, b]) => {
            const end = directed ? arrowEnd(pos[a], pos[b]) : pos[b];
            const hot = touches(a, b);
            return <line key={a + b} x1={pos[a].x} y1={pos[a].y} x2={end.x} y2={end.y} strokeWidth={hot ? 2.5 : 1.5} className={hot ? "stroke-sky" : "stroke-foreground/50"} markerEnd={directed ? "url(#g-arrow)" : undefined} />;
          })}
          {G_NODES.map((n) => (
            <g key={n.id} className="cursor-pointer" onClick={() => setSel(n.id)}>
              <circle cx={n.x} cy={n.y} r={18} strokeWidth={2} className={n.id === sel ? "fill-neon stroke-foreground" : adj[sel].includes(n.id) ? "fill-sky/40 stroke-sky" : "fill-card stroke-foreground"} />
              <text x={n.x} y={n.y} dy=".35em" textAnchor="middle" fontSize={13} className="fill-foreground font-mono font-bold pointer-events-none">{n.id}</text>
            </g>
          ))}
        </svg>
        <div className="space-y-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">adjacency matrix</div>
            <table className="font-mono text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-6" />
                  {ids.map((id) => <th key={id} className="w-7 text-muted-foreground">{id}</th>)}
                </tr>
              </thead>
              <tbody>
                {ids.map((r) => (
                  <tr key={r} className={r === sel ? "bg-neon/25" : ""}>
                    <th className="text-muted-foreground">{r}</th>
                    {ids.map((c) => <td key={c} className={`w-7 h-6 text-center ${adj[r].includes(c) ? "text-foreground font-bold" : "text-muted-foreground/50"}`}>{adj[r].includes(c) ? 1 : 0}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">adjacency list</div>
            <div className="font-mono text-xs space-y-0.5">
              {ids.map((id) => (
                <div key={id} className={id === sel ? "bg-neon/25 px-1" : "px-1"}>{id}: [{adj[id].join(", ")}]</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        {directed
          ? `${sel} has out-degree ${adj[sel].length} and in-degree ${G_EDGES.filter(([, b]) => b === sel).length}. Out-degrees add up to ${G_EDGES.length}, the number of edges.`
          : `deg(${sel}) = ${deg[sel]}. Degrees: ${ids.map((i) => deg[i]).join(" + ")} = ${Object.values(deg).reduce((a, b) => a + b, 0)} = 2 × ${G_EDGES.length} edges.`}
      </div>
    </Panel>
  );
}

/* -------------------------------- topological sort -------------------------------- */

const BUILD_NODES = ["utils", "parser", "net", "db", "api", "app"];
const BUILD_POS: Record<string, [number, number]> = { utils: [48, 150], parser: [160, 60], net: [160, 240], db: [290, 240], api: [300, 130], app: [380, 40] };
const BUILD_EDGES: GEdge[] = [["utils", "parser"], ["utils", "net"], ["net", "db"], ["parser", "api"], ["db", "api"], ["api", "app"]];

/** Where the line from box (x, y) towards (tx, ty) leaves the 64×30 box, plus a gap. */
function boxEdge(x: number, y: number, tx: number, ty: number, gap = 0) {
  const dx = tx - x;
  const dy = ty - y;
  const t = Math.min(dx ? 32 / Math.abs(dx) : Infinity, dy ? 15 / Math.abs(dy) : Infinity);
  const d = Math.hypot(dx, dy) || 1;
  return { x: x + dx * t + (dx / d) * gap, y: y + dy * t + (dy / d) * gap };
}

export function TopoSortLab() {
  const [cycle, setCycle] = useState(false);
  const edges = useMemo<GEdge[]>(() => (cycle ? [...BUILD_EDGES, ["api", "net"]] : BUILD_EDGES), [cycle]);
  const frames = useMemo(() => topoFrames(BUILD_NODES, edges), [edges]);
  return (
    <Stepper
      title="Build order: a topological sort"
      frames={frames}
      code={PY_KAHN}
      codeLabel="Python"
      legend={[["bg-mint", "built"], ["bg-neon", "building now"], ["bg-sky", "ready"], ["bg-orange", "stuck"]]}
      inputs={<Toggle<string> value={cycle ? "c" : "d"} onChange={(v) => setCycle(v === "c")} options={[["d", "A DAG"], ["c", "Add api → net"]]} />}
      render={(s) => (
        <div className="space-y-3">
          <svg viewBox="0 0 424 280" className="w-full max-w-[460px] mx-auto block" role="img" aria-label="Dependency graph">
            <defs>
              <marker id="topo-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
                <path d="M0,0L10,5L0,10z" className="fill-foreground" />
              </marker>
            </defs>
            {edges.map(([a, b]) => {
              const [x1, y1] = BUILD_POS[a];
              const [x2, y2] = BUILD_POS[b];
              const start = boxEdge(x1, y1, x2, y2);
              const end = boxEdge(x2, y2, x1, y1, 3);
              const gone = s.removed.includes(a);
              const extra = a === "api" && b === "net";
              return <path key={a + b} d={`M${start.x},${start.y}L${end.x},${end.y}`} fill="none" strokeWidth={1.6} className={`transition-opacity ${gone ? "opacity-15" : ""} ${extra ? "stroke-orange" : "stroke-foreground"}`} markerEnd="url(#topo-arrow)" />;
            })}
            {BUILD_NODES.map((id) => {
              const [x, y] = BUILD_POS[id];
              const cls = s.current === id ? "fill-neon" : s.removed.includes(id) ? "fill-mint/50" : s.cycle.includes(id) ? "fill-orange/40" : s.queue.includes(id) ? "fill-sky/40" : "fill-card";
              return (
                <g key={id}>
                  <rect x={x - 32} y={y - 15} width={64} height={30} rx={3} className="fill-card" />
                  <rect x={x - 32} y={y - 15} width={64} height={30} rx={3} className={`stroke-foreground transition-colors ${cls}`} />
                  <text x={x} y={y} dy=".35em" textAnchor="middle" fontSize={13} className="fill-foreground font-mono">{id}</text>
                  <text x={x + 28} y={y - 21} textAnchor="middle" fontSize={11} className="fill-muted-foreground font-mono">{s.removed.includes(id) ? "" : s.indegree[id]}</text>
                </g>
              );
            })}
          </svg>
          <div className="font-mono text-xs">
            <span className="text-muted-foreground">order: </span>
            {s.order.length ? s.order.join(" → ") : <span className="text-muted-foreground italic">empty</span>}
          </div>
        </div>
      )}
    />
  );
}

/* ---------------------------------- trees ---------------------------------- */

export function TreeHeightLab() {
  const [n, setN] = useState(10);
  const nodes = useMemo(() => completeTree(n), [n]);
  const h = treeHeight(n);
  const leaves = n - Math.floor(n / 2);
  return (
    <Panel title="Edges and height of a binary tree" legend={[["bg-mint", "leaf"], ["bg-sky", "internal node"]]}>
      <label className="flex items-center gap-3 font-mono text-xs">
        <span className="uppercase tracking-widest text-[11px] text-muted-foreground">nodes {n}</span>
        <input type="range" min={1} max={31} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-56" aria-label="Number of nodes" />
      </label>
      <svg viewBox="-20 0 560 270" className="w-full" role="img" aria-label={`Complete binary tree with ${n} nodes`}>
        {nodes.map((d, i) => d.parent !== null && <line key={`e${i}`} x1={nodes[d.parent].x} y1={nodes[d.parent].y} x2={d.x} y2={d.y} className="stroke-foreground/50" strokeWidth={1.4} />)}
        {nodes.map((d, i) => {
          const leaf = 2 * i + 1 >= n;
          return <circle key={i} cx={d.x} cy={d.y} r={9} className={leaf ? "fill-mint/60 stroke-mint" : "fill-sky/40 stroke-sky"} strokeWidth={1.5} />;
        })}
        {Array.from({ length: h + 1 }, (_, d) => (
          <text key={d} x={-14} y={24 + d * 56} dy=".35em" fontSize={10} className="fill-muted-foreground font-mono">{d}</text>
        ))}
      </svg>
      <div className="font-mono text-xs flex flex-wrap gap-x-6 gap-y-1">
        <span>edges = n − 1 = <span className="font-bold">{n - 1}</span></span>
        <span>height = ⌊log₂ {n}⌋ = <span className="font-bold">{h}</span></span>
        <span>leaves = <span className="font-bold">{leaves}</span></span>
        <span className="text-muted-foreground">a full level d holds 2^d nodes, so h levels hold at most 2^(h+1) − 1 = {2 ** (h + 1) - 1}</span>
      </div>
    </Panel>
  );
}

/* ---------------------------------- dice ---------------------------------- */

const EVENTS: { id: string; label: string; test: (a: number, b: number) => boolean }[] = [
  { id: "7", label: "sum is 7", test: (a, b) => a + b === 7 },
  { id: "2", label: "sum is 2", test: (a, b) => a + b === 2 },
  { id: "dbl", label: "doubles", test: (a, b) => a === b },
  { id: "six", label: "at least one 6", test: (a, b) => a === 6 || b === 6 },
  { id: "ge10", label: "sum ≥ 10", test: (a, b) => a + b >= 10 },
];

export function DiceGrid() {
  const [ev, setEv] = useState("7");
  const e = EVENTS.find((x) => x.id === ev)!;
  const hits = TWO_DICE.filter(([a, b]) => e.test(a, b)).length;
  return (
    <Panel title="Two dice, 36 outcomes" legend={[["bg-sky", "in the event"]]}>
      <Chips value={ev} onChange={setEv} options={EVENTS.map((x) => [x.id, x.label] as [string, string])} />
      <div className="flex flex-wrap items-start gap-6">
        <div className="grid grid-cols-[auto_repeat(6,2.25rem)] gap-1 font-mono text-xs">
          <div />
          {[1, 2, 3, 4, 5, 6].map((b) => <div key={b} className="text-center text-muted-foreground">{b}</div>)}
          {[1, 2, 3, 4, 5, 6].map((a) => (
            <Fragment key={a}>
              <div className="pr-1 text-muted-foreground self-center">{a}</div>
              {[1, 2, 3, 4, 5, 6].map((b) => (
                <div key={`${a}${b}`} className={`h-9 flex items-center justify-center border rounded-sm transition-colors ${e.test(a, b) ? "border-sky bg-sky/40" : "border-border"}`}>{a + b}</div>
              ))}
            </Fragment>
          ))}
        </div>
        <div className="font-mono text-sm space-y-1">
          <div>P({e.label}) = {hits}/36{hits > 0 && 36 % hits === 0 ? ` = 1/${36 / hits}` : ""} ≈ {(hits / 36).toFixed(3)}</div>
          <div className="text-xs text-muted-foreground">rows: first die · columns: second die · cells: the sum</div>
          <div className="text-xs text-muted-foreground pt-2">E[sum] = (sum of all 36 cells) / 36 = 252 / 36 = 7</div>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------- birthday curve ------------------------------- */

const SPACES: [string, number, string][] = [
  ["365", 365, "365 days"],
  ["1000", 1000, "1,000 slots"],
  ["65536", 65536, "16-bit hash"],
];

export function BirthdayCurve() {
  const [space, setSpace] = useState("365");
  const m = SPACES.find((s) => s[0] === space)![1];
  const maxK = Math.ceil(Math.sqrt(m) * 3.5);
  const [k, setK] = useState(23);
  const kk = Math.min(k, maxK);
  const half = birthdayHalf(m);
  const p = birthdayCollision(kk, m);
  const [trials, setTrials] = useState<{ k: number; m: number; hits: number; runs: number } | null>(null);
  const W = 520;
  const H = 180;
  const pts = Array.from({ length: 101 }, (_, i) => {
    const x = (i / 100) * maxK;
    return `${(i / 100) * W},${H - birthdayCollision(Math.round(x), m) * H}`;
  }).join(" ");
  const simulate = () => {
    const r = lcg(Date.now() % 100000);
    let hits = 0;
    const runs = 1000;
    for (let t = 0; t < runs; t++) {
      const seen = new Set<number>();
      for (let i = 0; i < kk; i++) {
        const v = Math.floor(r() * m);
        if (seen.has(v)) { hits++; break; }
        seen.add(v);
      }
    }
    setTrials({ k: kk, m, hits, runs });
  };
  return (
    <Panel title="The birthday problem" legend={[["bg-sky", "P(some pair shares)"], ["bg-neon", "your group"], ["bg-orange", "50% line"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">values</span>
        <Toggle<string> value={space} onChange={(v) => { setSpace(v); setK(birthdayHalf(SPACES.find((s) => s[0] === v)![1])); setTrials(null); }} options={SPACES.map(([id, , label]) => [id, label] as [string, string])} />
      </div>
      <label className="flex items-center gap-3 font-mono text-xs">
        <span className="uppercase tracking-widest text-[11px] text-muted-foreground">group size {kk}</span>
        <input type="range" min={2} max={maxK} value={kk} onChange={(e) => { setK(Number(e.target.value)); setTrials(null); }} className="w-56" aria-label="Group size" />
      </label>
      <svg viewBox={`-30 -10 ${W + 40} ${H + 30}`} className="w-full min-w-[420px]" role="img" aria-label={`Probability curve; ${kk} items give ${(p * 100).toFixed(1)} percent`}>
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} className="stroke-orange" strokeDasharray="4 4" />
        <line x1={0} y1={H} x2={W} y2={H} className="stroke-border" />
        <line x1={0} y1={0} x2={0} y2={H} className="stroke-border" />
        <text x={-6} y={4} textAnchor="end" fontSize={10} className="fill-muted-foreground font-mono">1</text>
        <text x={-6} y={H / 2 + 3} textAnchor="end" fontSize={10} className="fill-muted-foreground font-mono">.5</text>
        <text x={-6} y={H + 3} textAnchor="end" fontSize={10} className="fill-muted-foreground font-mono">0</text>
        <polyline points={pts} fill="none" className="stroke-sky" strokeWidth={2.2} />
        <line x1={(kk / maxK) * W} y1={0} x2={(kk / maxK) * W} y2={H} className="stroke-neon" strokeWidth={2} />
        <circle cx={(kk / maxK) * W} cy={H - p * H} r={5} className="fill-neon stroke-foreground" />
        <text x={(half / maxK) * W} y={H + 16} textAnchor="middle" fontSize={10} className="fill-orange font-mono">{half}</text>
        <text x={W} y={H + 16} textAnchor="end" fontSize={10} className="fill-muted-foreground font-mono">{maxK}</text>
      </svg>
      <div className="font-mono text-sm space-y-1">
        <div>
          {kk} items, {m.toLocaleString("en-US")} values: P(collision) = <span className="font-bold">{(p * 100).toFixed(1)}%</span>
        </div>
        <div className="text-xs text-muted-foreground">50% is passed at {half} items, close to 1.18·√{m.toLocaleString("en-US")} ≈ {(1.1774 * Math.sqrt(m)).toFixed(1)}</div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" className={btn} onClick={simulate}>Run 1,000 random trials</button>
          {trials && trials.k === kk && trials.m === m && (
            <span className="text-xs">{trials.hits} of {trials.runs} had a collision ({((trials.hits / trials.runs) * 100).toFixed(1)}%)</span>
          )}
        </div>
      </div>
    </Panel>
  );
}

