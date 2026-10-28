import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  sortFrames,
  searchFrames,
  gcdFrames,
  traversalFrames,
  mstFrames,
  knapsackFrames,
  JAVA_SORT,
  JAVA_SEARCH,
  JAVA_GCD,
  JAVA_TRAVERSAL,
  JAVA_MST,
  JAVA_KNAPSACK,
  GROWTH,
  humanTime,
  formatOps,
  type Frame,
  type ArrayState,
  type SortAlgorithm,
  type SearchAlgorithm,
  type GraphNode,
  type GraphEdge,
  type KnapsackItem,
} from "@/lib/algorithms";

/* ============================================================
   Algorithm visualizers. Every one of them replays frames from
   src/lib/algorithms.ts through the same <Stepper>: picture on
   top, a plain-English caption, controls, and the Java source
   with the line that is running right now highlighted.

   Colour language (shared with AutomatonDiagram):
     neon   = looking at / comparing right now
     orange = writing / swapping / rejecting
     mint   = done / final / accepted
     violet = pivot or special element
     sky    = the active window the algorithm is working on
   ============================================================ */

const btn =
  "font-mono text-[11px] uppercase tracking-widest px-3 py-2 border border-border hover:border-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm";
const inputCls =
  "font-mono text-sm px-3 py-2 border border-border bg-transparent text-foreground focus:outline-none focus:border-foreground rounded-sm";

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {items.map(([cls, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-[2px] ${cls}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function CodePanel({ code, line, label }: { code: string[]; line: number; label: string }) {
  return (
    <div className="border-t border-border bg-background/40">
      <div className="px-5 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      {/* a div, not a <pre>: .prose-reading styles every pre as a dark code block */}
      <div className="overflow-x-auto py-3 text-[12px] leading-[1.6] font-mono" role="region" aria-label={label}>
        {code.map((l, i) => (
          <div
            key={i}
            className={`px-5 whitespace-pre border-l-2 transition-colors ${
              i === line ? "bg-neon/20 border-neon text-foreground font-semibold" : "border-transparent text-muted-foreground"
            }`}
          >
            <span className="inline-block w-6 select-none text-right mr-3 opacity-40">{i + 1}</span>
            {l || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stepper<S>({
  title,
  frames,
  code,
  codeLabel = "Java",
  render,
  legend,
  inputs,
}: {
  title: string;
  frames: Frame<S>[];
  code: string[];
  /** heading for the source panel; the highlighted row is frame.line */
  codeLabel?: string;
  render: (state: S) => ReactNode;
  legend?: [string, string][];
  inputs?: ReactNode;
}) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const last = frames.length - 1;

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    if (idx >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, last)), speed);
    return () => clearTimeout(t);
  }, [playing, idx, last, speed]);

  const frame = frames[Math.min(idx, last)];
  if (!frame) return null;

  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="eyebrow text-sky">{title}</div>
        {legend && <Legend items={legend} />}
      </div>

      <div className="p-5 overflow-x-auto">{render(frame.state)}</div>

      <div className="px-5 pb-4 flex flex-col gap-3">
        <p aria-live="polite" className="min-h-[3em] text-sm leading-relaxed">
          {frame.message}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>
            step <span className="text-foreground">{idx + 1}</span>/{frames.length}
          </span>
          {Object.entries(frame.stats).map(([k, v]) => (
            <span key={k}>
              {k} <span className="text-foreground">{v}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btn} onClick={() => { setPlaying(false); setIdx(0); }} disabled={idx === 0}>
            ⟲ Reset
          </button>
          <button type="button" className={btn} onClick={() => { setPlaying(false); setIdx((i) => Math.max(0, i - 1)); }} disabled={idx === 0}>
            ← Back
          </button>
          <button type="button" className={btn} onClick={() => { setPlaying(false); setIdx((i) => Math.min(last, i + 1)); }} disabled={idx >= last}>
            Step →
          </button>
          <button
            type="button"
            className={`${btn} ${playing ? "border-foreground" : ""}`}
            onClick={() => {
              if (idx >= last) setIdx(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            speed
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="bg-transparent border border-border rounded-sm px-2 py-1.5 text-foreground">
              <option value={1200}>slow</option>
              <option value={700}>normal</option>
              <option value={250}>fast</option>
            </select>
          </label>
        </div>
        {inputs}
      </div>

      <CodePanel code={code} line={frame.line} label={codeLabel} />
    </div>
  );
}

/* ---------------------------- array views ---------------------------- */

function cellTone(i: number, s: ArrayState) {
  if (s.found === i) return "mint";
  if (s.write?.includes(i)) return "orange";
  if (s.compare?.includes(i)) return "neon";
  if (s.pivot === i) return "violet";
  if (s.sorted?.includes(i)) return "mint";
  return null;
}

const barBg: Record<string, string> = { mint: "bg-mint", orange: "bg-orange", neon: "bg-neon", violet: "bg-violet" };
const cellBorder: Record<string, string> = {
  mint: "border-mint bg-mint/15",
  orange: "border-orange bg-orange/15",
  neon: "border-neon bg-neon/20",
  violet: "border-violet bg-violet/15",
};

function inRange(i: number, s: ArrayState) {
  return !s.range || (i >= s.range[0] && i <= s.range[1]);
}

function PointerRow({ s, count }: { s: ArrayState; count: number }) {
  const labels: string[][] = Array.from({ length: count }, () => []);
  Object.entries(s.pointers ?? {}).forEach(([k, v]) => {
    if (v >= 0 && v < count) labels[v].push(k);
  });
  return (
    <>
      {labels.map((l, i) => (
        <div key={i} className="text-center font-mono text-[10px] text-sky leading-tight min-h-[14px]">
          {l.join(",")}
        </div>
      ))}
    </>
  );
}

function ArrayBars({ s }: { s: ArrayState }) {
  const max = Math.max(1, ...s.array);
  const n = s.array.length;
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(26px, 1fr))` };
  return (
    <div className="min-w-fit">
      {s.held && (
        <div className="mb-3 inline-flex items-center gap-2 font-mono text-xs border border-violet bg-violet/15 px-2.5 py-1 rounded-sm">
          <span className="text-muted-foreground uppercase tracking-widest text-[10px]">{s.held.label}</span>
          <span className="font-bold">{s.held.value}</span>
        </div>
      )}
      <div className="grid gap-1 items-end h-40" style={cols}>
        {s.array.map((v, i) => {
          const tone = cellTone(i, s);
          return (
            <div key={i} className={`flex flex-col justify-end h-full transition-opacity ${inRange(i, s) ? "" : "opacity-25"}`}>
              <div
                className={`w-full rounded-t-[2px] transition-all duration-200 ${tone ? barBg[tone] : "bg-foreground/25"}`}
                style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="grid gap-1 mt-1" style={cols}>
        {s.array.map((v, i) => (
          <div key={i} className={`text-center font-mono text-[11px] ${inRange(i, s) ? "text-foreground" : "text-muted-foreground/50"}`}>
            {v}
          </div>
        ))}
        <PointerRow s={s} count={n} />
      </div>
      {s.aux && (
        <div className="mt-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">tmp (merge buffer)</div>
          <div className="flex gap-1">
            {s.aux.map((v, i) => (
              <div key={i} className={`w-8 h-8 flex items-center justify-center font-mono text-[11px] border rounded-sm ${v === null ? "border-dashed border-border text-muted-foreground" : "border-orange bg-orange/15"}`}>
                {v ?? "·"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArrayCells({ s }: { s: ArrayState }) {
  const n = s.array.length;
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(34px, 1fr))` };
  return (
    <div className="min-w-fit">
      <div className="grid gap-1" style={cols}>
        {s.array.map((v, i) => {
          const tone = cellTone(i, s);
          return (
            <div
              key={i}
              className={`h-11 flex items-center justify-center font-mono text-sm border rounded-sm transition-all ${tone ? cellBorder[tone] : "border-border"} ${inRange(i, s) ? "" : "opacity-25"}`}
            >
              {v}
            </div>
          );
        })}
      </div>
      <div className="grid gap-1 mt-1" style={cols}>
        {s.array.map((_, i) => (
          <div key={i} className="text-center font-mono text-[10px] text-muted-foreground">
            {i}
          </div>
        ))}
        <PointerRow s={s} count={n} />
      </div>
    </div>
  );
}

/* Insertion sort gets its own picture: the key lifts out of the row,
   bigger bars slide right underneath it, and it drops into the hole.
   Elements are keyed by s.ids so React moves them instead of repainting. */
const INS_BAR = 96; // tallest bar, px
const INS_LABEL = 18; // value label above each bar, px
const INS_ROW = INS_BAR + INS_LABEL;
const INS_LANE = INS_ROW + 22; // room above the row for the lifted key and its tag

function InsertionBars({ s }: { s: ArrayState }) {
  const n = Math.max(1, s.array.length);
  const max = Math.max(1, ...s.array, s.held?.value ?? 0);
  const split = s.split ?? 0;
  const h = (v: number) => Math.max(4, (v / max) * INS_BAR);
  const slotX = (i: number) => `${(i / n) * 100}%`;
  const width = `${100 / n}%`;
  const move = "transition-[left,bottom] duration-300 ease-out motion-reduce:transition-none";

  type Item = { id: number; slot: number; value: number; lifted: boolean };
  const items: Item[] = s.array.flatMap((v, i) => (i === s.gap ? [] : [{ id: s.ids?.[i] ?? i, slot: i, value: v, lifted: false }]));
  if (s.held && s.gap !== undefined) items.push({ id: s.held.id ?? -1, slot: s.gap, value: s.held.value, lifted: true });
  // Fixed DOM order: if React re-inserted the lifted key at the end, the browser would treat it
  // as a new element and skip the lift transition.
  items.sort((x, y) => x.id - y.id);

  const tone = (it: Item) => {
    if (it.lifted) return "bg-violet";
    if (s.write?.includes(it.slot)) return "bg-orange";
    if (s.compare?.includes(it.slot)) return "bg-neon";
    if (s.sorted?.includes(it.slot)) return "bg-mint";
    return it.slot < split ? "bg-foreground/45" : "bg-foreground/15";
  };

  const cols = { gridTemplateColumns: `repeat(${n}, minmax(36px, 1fr))` };
  const sortedAll = (s.sorted?.length ?? 0) >= s.array.length;

  return (
    <div className="min-w-fit">
      <div className="relative" style={{ height: INS_LANE + INS_ROW, minWidth: n * 36 }}>
        {/* the sorted "hand" */}
        {split > 0 && (
          <div
            className={`absolute bottom-0 left-0 rounded-sm bg-sky/10 border-r-2 border-dashed border-sky transition-[width] duration-300 ease-out motion-reduce:transition-none`}
            style={{ width: slotX(split), height: INS_ROW + 6 }}
          />
        )}

        {/* the hole the key will drop into */}
        {s.gap !== undefined && s.held && (
          <div className={`absolute bottom-0 px-[3px] ${move}`} style={{ left: slotX(s.gap), width }}>
            <div className="w-full rounded-t-[2px] border-2 border-b-0 border-dashed border-violet/70" style={{ height: h(s.held.value) }} />
          </div>
        )}

        {items.map((it) => (
          <div
            key={it.id}
            className={`absolute flex flex-col items-center justify-end px-[3px] ${move}`}
            style={{ left: slotX(it.slot), width, bottom: it.lifted ? INS_ROW + 14 : 0 }}
          >
            {it.lifted && (
              <span className="mb-0.5 font-mono text-[9px] uppercase tracking-widest text-violet">{s.held?.label}</span>
            )}
            <span className={`font-mono text-[11px] leading-[18px] ${it.lifted || it.slot < split || sortedAll ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              {it.value}
            </span>
            <div className={`w-full rounded-t-[2px] transition-colors duration-200 ${tone(it)}`} style={{ height: h(it.value) }} />
          </div>
        ))}
      </div>

      <div className="grid mt-1" style={cols}>
        {s.array.map((_, i) => (
          <div key={i} className="text-center font-mono text-[10px] text-muted-foreground">
            {i}
          </div>
        ))}
        <PointerRow s={s} count={s.array.length} />
      </div>

      {!sortedAll && split > 0 && (
        <div className="grid mt-2 font-mono text-[10px] uppercase tracking-widest" style={cols}>
          <div className="text-sky border-t border-sky pt-1 text-center" style={{ gridColumn: `span ${Math.min(split, n)}` }}>
            sorted
          </div>
          {split < s.array.length && (
            <div className="text-muted-foreground border-t border-border pt-1 text-center" style={{ gridColumn: `span ${s.array.length - split}` }}>
              not yet looked at
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseNumbers(text: string, maxLen = 14) {
  const nums = text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => Number(t))
    .filter((x) => Number.isInteger(x) && x >= 0 && x <= 999);
  return nums.slice(0, maxLen);
}

function randomNumbers(len: number) {
  return Array.from({ length: len }, () => 1 + Math.floor(Math.random() * 98));
}

const SORT_TITLES: Record<SortAlgorithm, string> = {
  selection: "Selection sort",
  bubble: "Bubble sort",
  insertion: "Insertion sort",
  merge: "Merge sort",
  quick: "Quick sort",
};

export function SortVisualizer({ algorithm, initial = [38, 27, 43, 3, 9, 82, 10] }: { algorithm: SortAlgorithm; initial?: number[] }) {
  const [data, setData] = useState(initial);
  const [text, setText] = useState(initial.join(", "));
  const frames = useMemo(() => sortFrames(algorithm, data), [algorithm, data]);

  const apply = () => {
    const nums = parseNumbers(text);
    if (nums.length >= 2) setData(nums);
  };

  const legend: [string, string][] = algorithm === "insertion" ? [
    ["bg-violet", "key (in hand)"],
    ["bg-neon", "comparing with key"],
    ["bg-orange", "shifted right"],
    ["bg-mint", "final position"],
  ] : [
    ["bg-neon", "comparing"],
    ["bg-orange", algorithm === "merge" ? "writing" : "swapping"],
    ...(algorithm === "quick" ? ([["bg-violet", "pivot"]] as [string, string][]) : []),
    ["bg-mint", "final position"],
  ];

  return (
    <Stepper
      title={SORT_TITLES[algorithm]}
      frames={frames}
      code={JAVA_SORT[algorithm]}
      legend={legend}
      render={(s) => (algorithm === "insertion" ? <InsertionBars s={s} /> : <ArrayBars s={s} />)}
      inputs={
        <div className="flex flex-wrap items-stretch gap-2">
          <input
            aria-label="Numbers to sort"
            className={`${inputCls} flex-1 min-w-[180px]`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            spellCheck={false}
          />
          <button type="button" className={btn} onClick={apply}>
            Use these
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              const r = randomNumbers(data.length);
              setData(r);
              setText(r.join(", "));
            }}
          >
            Shuffle
          </button>
        </div>
      }
    />
  );
}

export function SearchVisualizer({
  algorithm,
  array = [3, 8, 12, 17, 21, 29, 34, 40, 46, 51, 58, 63, 70, 77, 85],
  target = 58,
}: {
  algorithm: SearchAlgorithm;
  array?: number[];
  target?: number;
}) {
  const [t, setT] = useState(target);
  const [text, setText] = useState(String(target));
  const frames = useMemo(() => searchFrames(algorithm, array, t), [algorithm, array, t]);
  return (
    <Stepper
      title={algorithm === "binary" ? "Binary search" : "Linear search"}
      frames={frames}
      code={JAVA_SEARCH[algorithm]}
      legend={[
        ["bg-neon", "checking"],
        ["bg-sky", "still possible"],
        ["bg-mint", "found"],
      ]}
      render={(s) => <ArrayCells s={s} />}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground" htmlFor={`target-${algorithm}`}>
            target
          </label>
          <input
            id={`target-${algorithm}`}
            className={`${inputCls} w-24`}
            value={text}
            inputMode="numeric"
            onChange={(e) => {
              setText(e.target.value);
              const v = Number(e.target.value);
              if (e.target.value !== "" && Number.isInteger(v)) setT(v);
            }}
          />
          <span className="text-xs text-muted-foreground">Try a number that isn't in the array, too.</span>
        </div>
      }
    />
  );
}

/* ------------------------------- GCD ------------------------------- */

export function EuclidVisualizer({ m = 210, n = 45 }: { m?: number; n?: number }) {
  const [vals, setVals] = useState({ m, n });
  const [text, setText] = useState({ m: String(m), n: String(n) });
  const frames = useMemo(() => gcdFrames(vals.m, vals.n), [vals]);
  const apply = () => {
    const a = Number(text.m);
    const b = Number(text.n);
    if (Number.isInteger(a) && Number.isInteger(b) && a > 0 && b >= 0 && a < 1e9 && b < 1e9) setVals({ m: a, n: b });
  };
  return (
    <Stepper
      title="Euclid's algorithm"
      frames={frames}
      code={JAVA_GCD}
      render={(s) => (
        <div className="flex flex-col gap-4">
          <div className="font-display text-2xl md:text-3xl font-bold">
            gcd(<span className="text-sky">{s.m}</span>, <span className="text-orange">{s.n}</span>)
            {s.result !== undefined && <span className="text-mint"> = {s.result}</span>}
          </div>
          <table className="font-mono text-sm border-collapse w-full max-w-md">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="text-left py-1.5 pr-4">m</th>
                <th className="text-left py-1.5 pr-4">n</th>
                <th className="text-left py-1.5">r = m mod n</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r, i) => {
                const latest = i === s.rows.length - 1;
                return (
                  <tr key={i} className={`border-b border-border/50 ${latest ? "bg-neon/10" : ""}`}>
                    <td className="py-1.5 pr-4">{r.m}</td>
                    <td className="py-1.5 pr-4">{r.n}</td>
                    <td className="py-1.5">{r.r === null ? <span className="text-mint">stop — n is 0</span> : r.r}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="m" className={`${inputCls} w-28`} value={text.m} inputMode="numeric" onChange={(e) => setText((t) => ({ ...t, m: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
          <input aria-label="n" className={`${inputCls} w-28`} value={text.n} inputMode="numeric" onChange={(e) => setText((t) => ({ ...t, n: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
          <button type="button" className={btn} onClick={apply}>
            Run gcd
          </button>
        </div>
      }
    />
  );
}

/* ------------------------------ graphs ------------------------------ */

const DEFAULT_NODES: GraphNode[] = [
  { id: 0, x: 60, y: 120 },
  { id: 1, x: 170, y: 50 },
  { id: 2, x: 170, y: 190 },
  { id: 3, x: 290, y: 30 },
  { id: 4, x: 290, y: 130 },
  { id: 5, x: 290, y: 220 },
  { id: 6, x: 400, y: 90 },
];
const DEFAULT_EDGES: GraphEdge[] = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 1, to: 3 },
  { from: 1, to: 4 },
  { from: 2, to: 4 },
  { from: 2, to: 5 },
  { from: 3, to: 6 },
  { from: 4, to: 6 },
];

const sameEdge = (e: GraphEdge, pair?: [number, number]) =>
  !!pair && ((e.from === pair[0] && e.to === pair[1]) || (e.from === pair[1] && e.to === pair[0]));

function GraphSvg({
  nodes,
  edges,
  edgeClass,
  nodeClass,
  showWeights,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  edgeClass: (e: GraphEdge, i: number) => { stroke: string; width: number; dash?: string };
  nodeClass: (id: number) => string;
  showWeights?: boolean;
}) {
  const w = Math.max(...nodes.map((n) => n.x)) + 50;
  const h = Math.max(...nodes.map((n) => n.y)) + 40;
  const pos = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block mx-auto max-w-full h-auto text-foreground" role="img" aria-label="Graph">
      {edges.map((e, i) => {
        const a = pos.get(e.from)!;
        const b = pos.get(e.to)!;
        const st = edgeClass(e, i);
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`${st.stroke} transition-all`} strokeWidth={st.width} strokeDasharray={st.dash} />
            {showWeights && e.weight !== undefined && (
              <g>
                <rect x={(a.x + b.x) / 2 - 10} y={(a.y + b.y) / 2 - 9} width={20} height={18} rx={2} className="fill-card" />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} className="font-mono fill-current">
                  {e.weight}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={18} strokeWidth={2} className={`transition-colors ${nodeClass(n.id)}`} />
          <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" fontSize={13} className="font-mono fill-current font-bold">
            {n.id}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Chips({ label, items, tone, hint }: { label: string; items: number[]; tone: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
      <span className="w-14 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {items.length === 0 ? (
        <span className="text-muted-foreground italic">empty</span>
      ) : (
        items.map((v, i) => (
          <span key={`${v}-${i}`} className={`px-2 py-0.5 border rounded-sm ${tone}`}>
            {v}
          </span>
        ))
      )}
      {hint && items.length > 0 && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Toggle<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex border border-border rounded-sm overflow-hidden">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`font-mono text-[11px] uppercase tracking-widest px-3 py-2 transition-colors ${value === v ? "bg-foreground text-background" : "hover:bg-foreground/10"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function GraphTraversal({
  algorithm = "bfs",
  nodes = DEFAULT_NODES,
  edges = DEFAULT_EDGES,
  start = 0,
}: {
  algorithm?: "bfs" | "dfs";
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  start?: number;
}) {
  const [kind, setKind] = useState(algorithm);
  const frames = useMemo(() => traversalFrames(kind, nodes.length, edges, start), [kind, nodes, edges, start]);
  return (
    <Stepper
      title={kind === "bfs" ? "Breadth-first search" : "Depth-first search"}
      frames={frames}
      code={JAVA_TRAVERSAL[kind]}
      legend={[
        ["bg-neon", "current / checking"],
        ["bg-sky", "seen, waiting"],
        ["bg-mint", "visited / tree edge"],
      ]}
      render={(s) => (
        <div className="flex flex-col gap-4">
          <GraphSvg
            nodes={nodes}
            edges={edges}
            edgeClass={(e) =>
              sameEdge(e, s.checking)
                ? { stroke: "stroke-neon", width: 4 }
                : s.treeEdges.some((t) => sameEdge(e, t))
                  ? { stroke: "stroke-mint", width: 3.5 }
                  : { stroke: "stroke-border", width: 2 }
            }
            nodeClass={(id) =>
              id === s.current
                ? "fill-neon/40 stroke-neon"
                : s.order.includes(id)
                  ? "fill-mint/25 stroke-mint"
                  : s.visited.includes(id)
                    ? "fill-sky/15 stroke-sky"
                    : "fill-card stroke-current"
            }
          />
          <div className="flex flex-col gap-2">
            <Chips label={kind === "bfs" ? "queue" : "stack"} items={s.frontier} tone="border-sky bg-sky/10" hint={kind === "bfs" ? "← front … back" : "bottom … top →"} />
            <Chips label="order" items={s.order} tone="border-mint bg-mint/10" />
          </div>
        </div>
      )}
      inputs={
        <Toggle<"bfs" | "dfs">
          value={kind}
          onChange={setKind}
          options={[
            ["bfs", "BFS (queue)"],
            ["dfs", "DFS (stack)"],
          ]}
        />
      }
    />
  );
}

/* ------------------------------- MST ------------------------------- */

const MST_NODES: GraphNode[] = [
  { id: 0, x: 50, y: 120 },
  { id: 1, x: 170, y: 40 },
  { id: 2, x: 170, y: 200 },
  { id: 3, x: 300, y: 120 },
  { id: 4, x: 420, y: 40 },
  { id: 5, x: 420, y: 200 },
];
const MST_EDGES: GraphEdge[] = [
  { from: 0, to: 1, weight: 4 },
  { from: 0, to: 2, weight: 3 },
  { from: 1, to: 2, weight: 1 },
  { from: 1, to: 3, weight: 2 },
  { from: 2, to: 3, weight: 4 },
  { from: 3, to: 4, weight: 2 },
  { from: 4, to: 5, weight: 6 },
  { from: 3, to: 5, weight: 5 },
  { from: 2, to: 5, weight: 7 },
];

export function MstVisualizer({
  algorithm = "prim",
  nodes = MST_NODES,
  edges = MST_EDGES,
}: {
  algorithm?: "prim" | "kruskal";
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}) {
  const [kind, setKind] = useState(algorithm);
  const frames = useMemo(() => mstFrames(kind, nodes.length, edges), [kind, nodes, edges]);
  return (
    <Stepper
      title={kind === "prim" ? "Prim's algorithm" : "Kruskal's algorithm"}
      frames={frames}
      code={JAVA_MST[kind]}
      legend={[
        ["bg-neon", "candidate / considering"],
        ["bg-mint", "in the tree"],
        ["bg-orange", "rejected (cycle)"],
      ]}
      render={(s) => (
        <GraphSvg
          nodes={nodes}
          edges={edges}
          showWeights
          edgeClass={(_, i) =>
            i === s.considering && !s.accepted.includes(i) && !s.rejected.includes(i)
              ? { stroke: "stroke-neon", width: 5 }
              : s.accepted.includes(i)
                ? { stroke: "stroke-mint", width: 4.5 }
                : s.rejected.includes(i)
                  ? { stroke: "stroke-orange", width: 2, dash: "5 4" }
                  : s.candidates.includes(i)
                    ? { stroke: "stroke-neon", width: 2.5, dash: "2 3" }
                    : { stroke: "stroke-border", width: 2 }
          }
          nodeClass={(id) => (s.inTree.includes(id) ? "fill-mint/25 stroke-mint" : "fill-card stroke-current")}
        />
      )}
      inputs={
        <Toggle<"prim" | "kruskal">
          value={kind}
          onChange={setKind}
          options={[
            ["prim", "Prim"],
            ["kruskal", "Kruskal"],
          ]}
        />
      }
    />
  );
}

/* ----------------------------- knapsack ----------------------------- */

const DEFAULT_ITEMS: KnapsackItem[] = [
  { name: "item 1", weight: 2, value: 12 },
  { name: "item 2", weight: 1, value: 10 },
  { name: "item 3", weight: 3, value: 20 },
  { name: "item 4", weight: 2, value: 15 },
];

export function KnapsackTable({ items = DEFAULT_ITEMS, capacity = 5 }: { items?: KnapsackItem[]; capacity?: number }) {
  const frames = useMemo(() => knapsackFrames(items, capacity), [items, capacity]);
  const eq = (a?: [number, number], i?: number, w?: number) => !!a && a[0] === i && a[1] === w;
  return (
    <Stepper
      title="0/1 knapsack: filling the table"
      frames={frames}
      code={JAVA_KNAPSACK}
      legend={[
        ["bg-neon", "cell being filled"],
        ["bg-sky", "cells it reads"],
        ["bg-violet", "walking back"],
        ["bg-mint", "item taken"],
      ]}
      render={(s) => (
        <table className="font-mono text-xs border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-normal">item (w, v) \ capacity</th>
              {Array.from({ length: capacity + 1 }, (_, w) => (
                <th key={w} className="px-2 py-1.5 w-10 text-center text-muted-foreground font-normal">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.table.map((row, i) => (
              <tr key={i}>
                <td className={`px-2 py-1.5 whitespace-nowrap ${i > 0 && s.chosen.includes(i - 1) ? "text-mint font-bold" : "text-muted-foreground"}`}>
                  {i === 0 ? "none" : `${items[i - 1].name} (${items[i - 1].weight}, ${items[i - 1].value})`}
                </td>
                {row.map((v, w) => {
                  const cls = eq(s.cell, i, w)
                    ? "bg-neon/30 border-neon"
                    : s.deps?.some((d) => d[0] === i && d[1] === w)
                      ? "bg-sky/20 border-sky"
                      : eq(s.trace, i, w)
                        ? "bg-violet/25 border-violet"
                        : "border-border";
                  return (
                    <td key={w} className={`w-10 h-8 text-center border transition-colors ${cls}`}>
                      {v ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    />
  );
}

/* ------------------------------ growth ------------------------------ */

const GROWTH_NS = [10, 20, 30, 50, 100, 1_000, 10_000, 100_000, 1_000_000];

export function GrowthTable({ initialN = 100 }: { initialN?: number }) {
  const [i, setI] = useState(Math.max(0, GROWTH_NS.indexOf(initialN)));
  const n = GROWTH_NS[i];
  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div className="px-5 pt-4 eyebrow text-sky">How the work grows with n</div>
      <div className="p-5 flex flex-col gap-4">
        <label className="flex flex-wrap items-center gap-4 font-mono text-xs">
          <span className="uppercase tracking-widest text-muted-foreground">input size</span>
          <input type="range" min={0} max={GROWTH_NS.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} className="flex-1 min-w-[160px] accent-current" aria-label="Input size n" />
          <span className="font-display text-xl font-bold w-28">n = {n.toLocaleString("en-US")}</span>
        </label>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-4 font-normal">growth</th>
                <th className="text-right py-2 pr-4 font-normal">basic operations</th>
                <th className="text-right py-2 font-normal">time at ~10⁸ ops/sec</th>
              </tr>
            </thead>
            <tbody>
              {GROWTH.map((g) => {
                const ops = g.f(n);
                const bad = ops / 1e8 > 1;
                return (
                  <tr key={g.label} className="border-b border-border/50">
                    <td className="py-2 pr-4">
                      <span className="font-bold">{g.label}</span> <span className="text-muted-foreground">{g.name}</span>
                    </td>
                    <td className="py-2 pr-4 text-right">{formatOps(ops)}</td>
                    <td className={`py-2 text-right ${bad ? "text-orange" : "text-mint"}`}>{humanTime(ops)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Drag the slider. Up to n = 30 every row looks harmless. At a million, the slow rows take hours or longer, and avoiding them is what this course is about.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- practice ----------------------------- */

export type LeetCodeProblem = {
  id: number;
  title: string;
  slug: string;
  why: string;
  difficulty?: "Easy" | "Medium" | "Hard";
};

export function LeetCodeProblems({ problems, note = "solve them in Java" }: { problems: LeetCodeProblem[]; note?: string }) {
  return (
    <section className="not-prose my-10 border border-border bg-card rounded-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-baseline justify-between gap-3 flex-wrap">
        <div className="eyebrow text-orange">Practice on LeetCode</div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{note}</span>
      </div>
      <ul className="divide-y divide-border">
        {problems.map((p) => {
          const diff = p.difficulty ?? "Easy";
          return (
            <li key={p.id}>
              <a
                href={`https://leetcode.com/problems/${p.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 px-5 py-3.5 hover:bg-foreground/5 transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground w-12 shrink-0 pt-0.5">#{p.id}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display font-semibold group-hover:underline underline-offset-4">{p.title}</span>
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${diff === "Easy" ? "text-mint" : "text-orange"}`}>
                      {diff === "Easy" ? "easy" : `stretch · ${diff.toLowerCase()}`}
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground leading-relaxed mt-0.5">{p.why}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors pt-0.5">↗</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* -------------------------- merge sort tree -------------------------- */

type Piece = { lo: number; hi: number; carried: boolean };

/** Pieces at every depth of the recursion, using the same mid as the Java code. */
function splitLevels(n: number) {
  const levels: Piece[][] = [[{ lo: 0, hi: n - 1, carried: false }]];
  while (levels[levels.length - 1].some((p) => p.hi > p.lo)) {
    const next: Piece[] = [];
    for (const p of levels[levels.length - 1]) {
      if (p.hi === p.lo) {
        next.push({ ...p, carried: true });
      } else {
        const mid = Math.floor((p.lo + p.hi) / 2);
        next.push({ lo: p.lo, hi: mid, carried: false }, { lo: mid + 1, hi: p.hi, carried: false });
      }
    }
    levels.push(next);
  }
  return levels;
}

export function MergeSortTree({ input = [38, 27, 43, 3, 9, 82, 10] }: { input?: number[] }) {
  const n = input.length;
  const levels = useMemo(() => splitLevels(n), [n]);
  const depth = levels.length - 1;

  // Split rows go down to single elements; merge rows replay the same ranges back up, sorted.
  const rows = [
    ...levels.map((pieces, d) => ({
      pieces,
      sorted: d === depth,
      label: d === 0 ? "input" : d === depth ? "size 1" : "split",
      kind: d === 0 ? "input" : d === depth ? "base" : "split",
    })),
    ...levels
      .slice(0, depth)
      .reverse()
      .map((pieces, i) => ({
        pieces: pieces.map((p) => ({ ...p, carried: p.carried || p.hi === p.lo })),
        sorted: true,
        label: i === depth - 1 ? "sorted" : "merge",
        kind: i === depth - 1 ? "output" : "merge",
      })),
  ];

  const boxTone: Record<string, string> = {
    input: "border-neon bg-neon/10",
    split: "border-foreground/30",
    base: "border-sky/70 bg-sky/10",
    merge: "border-orange/70 bg-orange/10",
    output: "border-mint bg-mint/15",
  };

  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="eyebrow text-sky">Merge sort, level by level</div>
        <Legend items={[["bg-sky", "base case"], ["bg-orange", "merged"], ["bg-mint", "done"]]} />
      </div>
      <div className="p-5 overflow-x-auto">
        <div className="grid gap-y-2 gap-x-3 min-w-fit" style={{ gridTemplateColumns: "auto 1fr" }}>
          {rows.map((row, r) => (
            <div key={r} className="contents">
              <div
                className={`font-mono text-[10px] uppercase tracking-widest self-center text-right ${
                  r === depth ? "text-sky" : r > depth ? "text-orange" : "text-muted-foreground"
                } ${row.kind === "output" ? "!text-mint" : ""}`}
              >
                {row.label}
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(34px, 1fr))` }}>
                {row.pieces.map((p) => {
                  const vals = input.slice(p.lo, p.hi + 1);
                  if (row.sorted) vals.sort((a, b) => a - b);
                  const dim = p.carried && row.kind !== "base";
                  return (
                    <div
                      key={`${p.lo}-${p.hi}`}
                      style={{ gridColumn: `${p.lo + 1} / ${p.hi + 2}` }}
                      className={`h-9 flex items-center justify-around px-1 font-mono text-[13px] border rounded-sm transition-opacity ${
                        dim ? "border-dashed border-border text-muted-foreground opacity-60" : boxTone[row.kind]
                      }`}
                    >
                      {vals.map((v, i) => (
                        <span key={i}>{v}</span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          Each box sits under the slice of the array it came from. Dashed boxes are pieces that were already size 1 and are just waiting for the others.
        </p>
      </div>
    </div>
  );
}
