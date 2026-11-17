import { ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { FocusPanel } from "@/components/mdx/vizKit";
import { glossary } from "@/content/advanced-software-engineering/glossary";
import {
  accumulate,
  float32Spacing,
  featureCost,
  FRONT_CAMERA_METHODS,
  runInvoicePipeline,
  INVOICE_FILES,
  queueFrames,
  streamifyEstimate,
  type QueueEvent,
} from "@/lib/softwareEngineering";

/* ============================================================
   Advanced Software Engineering visualizations.
   Term / KeyTerms: highlighted words with a definition popup.
   BoxDiagram: small SVG system, UML and architecture diagrams,
   also used inside quiz questions. The rest are one-off demos.
   Logic lives in src/lib/softwareEngineering.ts.
   ============================================================ */

type Tone = "neon" | "orange" | "sky" | "violet" | "mint";

/* ------------------------------ Term popup ------------------------------ */

/** A difficult term, highlighted. Hover (or tap) it to see its glossary definition. */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const entry = glossary[id];
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!entry) return <>{children}</>;
  const later = (v: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(v), ms);
  };
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          data-term={id}
          onMouseEnter={() => later(true, 250)}
          onMouseLeave={() => later(false, 150)}
          className="inline cursor-help rounded-[3px] bg-sky/[0.09] px-[2px] font-[inherit] text-[inherit] leading-[inherit] underline decoration-sky/60 decoration-dotted decoration-[1.5px] underline-offset-[3px] hover:bg-sky/[0.16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky/60"
        >
          {children ?? entry.term}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={() => later(false, 150)}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="not-prose z-50 w-[min(20rem,calc(100vw-24px))] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          <div className="flex">
            <div className="w-1 shrink-0 bg-sky" aria-hidden />
            <div className="min-w-0 px-4 py-3">
              <div className="font-display text-base leading-tight text-foreground">{entry.term}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Lecture {entry.lecture}</div>
              <p className="mt-2 font-body text-[13.5px] leading-relaxed text-muted-foreground">{entry.definition}</p>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** A lesson's key terms with their glossary definitions, as a recap. */
export function KeyTerms({ ids }: { ids: string[] }) {
  return (
    <dl className="not-prose my-6 grid gap-3 sm:grid-cols-2">
      {ids.map((id) => {
        const e = glossary[id];
        if (!e) return null;
        return (
          <div key={id} className="rounded-xl border border-border/70 bg-card px-4 py-3">
            <dt className="font-display text-[15px] font-semibold text-sky">{e.term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.definition}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/* ------------------------------ ScrollFrame ------------------------------ */

/** The diagram frame. On a narrow screen a wide diagram scrolls sideways inside it
    (text stays readable), and a hint says so. */
function ScrollFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 4);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div ref={ref} className="overflow-x-auto rounded-sm border border-border bg-card p-2 text-foreground">
        {children}
      </div>
      {overflow && <div className="mt-1 text-right font-mono text-[11px] text-muted-foreground" aria-hidden>swipe to see the whole diagram →</div>}
    </>
  );
}

/* ------------------------------ BoxDiagram ------------------------------ */

export type BoxNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** box (default), component, interface (lollipop circle), store (cylinder), package, node (3-D device), missing ("?"), note, plain (text only) */
  kind?: "box" | "component" | "interface" | "store" | "package" | "node" | "missing" | "note" | "plain";
  stereo?: string;
  tone?: Tone;
};

export type BoxEdge = {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** arrow head at `to` (default "arrow"); "triangle" is UML inheritance/realization */
  head?: "arrow" | "triangle" | "none";
  /** head at `from` too, for two-way links */
  both?: boolean;
  /** bend the line sideways by this many units */
  bend?: number;
};

const stroke = "hsl(var(--foreground) / 0.72)";
const toneVar = (t: Tone) => `hsl(var(--${t}))`;

function nodeSize(n: BoxNode) {
  if (n.kind === "interface") return { w: n.w ?? 18, h: n.h ?? 18 };
  return { w: n.w ?? 120, h: n.h ?? 44 };
}

function clip(cx: number, cy: number, w: number, h: number, tx: number, ty: number, round: boolean) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  if (round) {
    const r = w / 2;
    const d = Math.hypot(dx, dy);
    return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
  }
  const t = Math.min(dx !== 0 ? w / 2 / Math.abs(dx) : Infinity, dy !== 0 ? h / 2 / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
}

/** A small system / UML / architecture diagram drawn in SVG. Coordinates are node centres. */
export function BoxDiagram({
  nodes,
  edges = [],
  width = 560,
  height = 260,
  highlight = [],
  caption,
  title,
}: {
  nodes: BoxNode[];
  edges?: BoxEdge[];
  width?: number;
  height?: number;
  highlight?: string[];
  caption?: ReactNode;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const hl = new Set(highlight);

  return (
    <figure className="not-prose my-6">
      <ScrollFrame>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title ?? caption?.toString() ?? "diagram"}
          className="mx-auto block h-auto w-full"
          style={{ minWidth: Math.min(width, 420), maxWidth: width }}
        >
          <defs>
            <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={stroke} />
            </marker>
            <marker id={`${uid}-tri`} viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
              <path d="M0,0 L12,6 L0,12 z" fill="hsl(var(--card))" stroke={stroke} strokeWidth="1.2" />
            </marker>
          </defs>

          {edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const sa = nodeSize(a);
            const sb = nodeSize(b);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const cx = mx + (e.bend ?? 0) * (-(b.y - a.y) / len);
            const cy = my + (e.bend ?? 0) * ((b.x - a.x) / len);
            const p1 = clip(a.x, a.y, sa.w + 6, sa.h + 6, e.bend ? cx : b.x, e.bend ? cy : b.y, a.kind === "interface");
            const p2 = clip(b.x, b.y, sb.w + 6, sb.h + 6, e.bend ? cx : a.x, e.bend ? cy : a.y, b.kind === "interface");
            const d = e.bend ? `M${p1.x},${p1.y} Q${cx},${cy} ${p2.x},${p2.y}` : `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
            const head = e.head ?? "arrow";
            const marker = head === "none" ? undefined : `url(#${uid}-${head === "triangle" ? "tri" : "arrow"})`;
            const lx = e.bend ? (p1.x + 2 * cx + p2.x) / 4 : mx;
            const ly = e.bend ? (p1.y + 2 * cy + p2.y) / 4 : my;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={stroke} strokeWidth="1.4" strokeDasharray={e.dashed ? "5 4" : undefined} markerEnd={marker} markerStart={e.both ? marker : undefined} />
                {e.label && (
                  <text x={lx} y={ly - 5} textAnchor="middle" fontSize="11.5" className="font-mono" fill="hsl(var(--muted-foreground))" paintOrder="stroke" stroke="hsl(var(--card))" strokeWidth="4">
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {nodes.map((n) => (
            <DiagramNode key={n.id} n={n} lit={hl.has(n.id)} />
          ))}
        </svg>
      </ScrollFrame>
      {caption && <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

function DiagramNode({ n, lit }: { n: BoxNode; lit: boolean }) {
  const { w, h } = nodeSize(n);
  const x = n.x - w / 2;
  const y = n.y - h / 2;
  const tone = lit ? "orange" : n.tone;
  const fill = tone ? `hsl(var(--${tone}) / 0.13)` : "hsl(var(--card))";
  const line = tone ? toneVar(tone) : stroke;
  const lines = n.label.split("\n");
  const text = (
    <text x={n.x} y={n.y + (n.stereo ? 7 : 0) - ((lines.length - 1) * 15) / 2 + 4} textAnchor="middle" fontSize="13" className="font-mono" fill="hsl(var(--foreground))">
      {n.stereo && (
        <tspan x={n.x} dy={-15} fontSize="10.5" fill="hsl(var(--muted-foreground))">
          «{n.stereo}»
        </tspan>
      )}
      {lines.map((l, i) => (
        <tspan key={i} x={n.x} dy={i === 0 ? (n.stereo ? 15 : 0) : 15}>
          {l}
        </tspan>
      ))}
    </text>
  );

  switch (n.kind) {
    case "plain":
      return text;
    case "interface":
      return (
        <g>
          <circle cx={n.x} cy={n.y} r={w / 2} fill={fill} stroke={line} strokeWidth="1.5" />
          <text x={n.x} y={n.y + w / 2 + 14} textAnchor="middle" fontSize="11.5" className="font-mono" fill="hsl(var(--foreground))">
            {n.label}
          </text>
        </g>
      );
    case "store": {
      const ry = 7;
      return (
        <g>
          <path d={`M${x},${y + ry} A${w / 2},${ry} 0 0 1 ${x + w},${y + ry} V${y + h - ry} A${w / 2},${ry} 0 0 1 ${x},${y + h - ry} Z`} fill={fill} stroke={line} strokeWidth="1.5" />
          <path d={`M${x},${y + ry} A${w / 2},${ry} 0 0 0 ${x + w},${y + ry}`} fill="none" stroke={line} strokeWidth="1.5" />
          {text}
        </g>
      );
    }
    case "package":
      return (
        <g>
          <rect x={x} y={y - 8} width={Math.min(46, w / 2)} height={9} fill={fill} stroke={line} strokeWidth="1.5" />
          <rect x={x} y={y} width={w} height={h} fill={fill} stroke={line} strokeWidth="1.5" />
          {text}
        </g>
      );
    case "node":
      return (
        <g>
          <path d={`M${x},${y} l8,-8 h${w} v${h} l-8,8`} fill={fill} stroke={line} strokeWidth="1.5" />
          <path d={`M${x + w},${y} l8,-8`} stroke={line} strokeWidth="1.5" />
          <rect x={x} y={y} width={w} height={h} fill={fill} stroke={line} strokeWidth="1.5" />
          {text}
        </g>
      );
    case "component":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={3} fill={fill} stroke={line} strokeWidth="1.5" />
          <rect x={x + w - 18} y={y + 6} width={11} height={13} fill="none" stroke={line} strokeWidth="1" />
          <rect x={x + w - 21} y={y + 8.5} width={6} height={3} fill="hsl(var(--card))" stroke={line} strokeWidth="1" />
          <rect x={x + w - 21} y={y + 13.5} width={6} height={3} fill="hsl(var(--card))" stroke={line} strokeWidth="1" />
          {text}
        </g>
      );
    case "missing":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={6} fill="hsl(var(--orange) / 0.08)" stroke={toneVar("orange")} strokeWidth="1.6" strokeDasharray="6 4" />
          <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize="18" fontWeight="700" className="font-mono" fill={toneVar("orange")}>
            {n.label || "?"}
          </text>
        </g>
      );
    case "note":
      return (
        <g>
          <path d={`M${x},${y} h${w - 10} l10,10 v${h - 10} h-${w} z`} fill="hsl(var(--muted) / 0.6)" stroke={line} strokeWidth="1" />
          {text}
        </g>
      );
    default:
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={line} strokeWidth="1.5" />
          {text}
        </g>
      );
  }
}

/** Several diagrams of the same idea behind tabs: before/after, or one system seen through many views. */
export function DiagramTabs({
  title,
  tabs,
}: {
  title: string;
  tabs: { label: string; nodes: BoxNode[]; edges?: BoxEdge[]; width?: number; height?: number; highlight?: string[]; caption: ReactNode }[];
}) {
  const [i, setI] = useState(0);
  const t = tabs[i];
  return (
    <FocusPanel title={title} eyebrowTone="text-sky">
      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map((tab, k) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={k === i}
            onClick={() => setI(k)}
            className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${k === i ? "border-sky bg-sky/10 text-sky" : "border-border text-muted-foreground hover:border-sky/50"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <BoxDiagram nodes={t.nodes} edges={t.edges} width={t.width} height={t.height} highlight={t.highlight} title={`${title}: ${t.label}`} />
        <p className="text-sm leading-relaxed text-muted-foreground">{t.caption}</p>
      </div>
    </FocusPanel>
  );
}

/* ---------------------------- Change impact ---------------------------- */

type Impact = { changed: string[]; added: string[] };

/** Pick a change request and see which classes each design forces you to edit (orange) or add (green). */
export function ChangeImpact({
  title,
  before,
  after,
  scenarios,
}: {
  title: string;
  before: { label: string; classes: string[] };
  after: { label: string; classes: string[] };
  scenarios: { label: string; before: Impact; after: Impact; note: string }[];
}) {
  const [s, setS] = useState(0);
  const sc = scenarios[s];
  const col = (design: { label: string; classes: string[] }, impact: Impact) => {
    const all = [...design.classes, ...impact.added.filter((c) => !design.classes.includes(c))];
    return (
      <div className="min-w-0 flex-1 rounded-xl border border-border/70 p-3">
        <div className="eyebrow mb-2 text-muted-foreground">{design.label}</div>
        <ul className="flex flex-wrap gap-2">
          {all.map((c) => {
            const added = impact.added.includes(c);
            const changed = impact.changed.includes(c);
            return (
              <li
                key={c}
                className={`rounded-md border px-2 py-1 font-mono text-xs ${added ? "border-mint/60 bg-mint/10 text-mint" : changed ? "border-orange/60 bg-orange/10 text-orange" : "border-border text-muted-foreground"}`}
              >
                {added ? "+ " : changed ? "✎ " : ""}
                {c}
              </li>
            );
          })}
        </ul>
        <div className="mt-2 font-mono text-[11px] text-muted-foreground">
          edited: {impact.changed.length} · added: {impact.added.length}
        </div>
      </div>
    );
  };
  return (
    <FocusPanel title={title} eyebrowTone="text-sky" legend={[["bg-orange", "edited (re-test)"], ["bg-mint", "new code"]]}>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((x, k) => (
          <button
            key={x.label}
            onClick={() => setS(k)}
            aria-pressed={k === s}
            className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${k === s ? "border-sky bg-sky/10 text-sky" : "border-border text-muted-foreground hover:border-sky/50"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {col(before, sc.before)}
        {col(after, sc.after)}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{sc.note}</p>
    </FocusPanel>
  );
}

/* --------------------- Lecture 1: float32 accumulator --------------------- */

const fmt = (x: number) => (Math.abs(x) >= 1e4 ? x.toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0") : x.toPrecision(8));

/** The PID integral term, added up in 32-bit and 64-bit floats side by side. */
export function FloatAccumulator() {
  const [start, setStart] = useState(100000);
  const delta = 0.0000001;
  const rows = useMemo(() => accumulate(start, delta, 5), [start]);
  const spacing = float32Spacing(start);
  const last = rows[rows.length - 1];
  return (
    <FocusPanel title="The integral term, in 32-bit vs 64-bit floats" eyebrowTone="text-sky">
      <label className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono text-xs text-muted-foreground">sum so far</span>
        <select value={start} onChange={(e) => setStart(Number(e.target.value))} className="rounded-md border border-border bg-background px-2 py-1 font-mono text-sm">
          {[1, 100, 1000, 100000].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <span className="font-mono text-xs text-muted-foreground">each step adds 0.0000001</span>
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-4">step</th>
              <th className="py-1 pr-4">float32 sum</th>
              <th className="py-1 pr-4">float64 sum</th>
              <th className="py-1">float32 actually added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.step} className="border-t border-border/60">
                <td className="py-1 pr-4">{r.step}</td>
                <td className={`py-1 pr-4 ${r.added32 === 0 ? "text-orange" : ""}`}>{fmt(r.sum32)}</td>
                <td className="py-1 pr-4">{fmt(r.sum64)}</td>
                <td className={`py-1 ${r.added32 === 0 ? "text-orange" : "text-mint"}`}>{r.added32 === 0 ? "0 (lost)" : r.added32.toExponential(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Near {start}, the gap between one float32 value and the next is {spacing.toExponential(2)}. A correction smaller than half that gap is rounded away.
        {last.added32 === 0 ? " Here every correction disappears, and the controller sees no error at all." : " Here the corrections still register (with some rounding)."}
      </p>
    </FocusPanel>
  );
}

/* -------------------- Lecture 2: cost per feature chart -------------------- */

/** Illustrative curves: the cost of the n-th feature under good and bad design. */
export function FeatureCostChart() {
  const W = 520;
  const H = 220;
  const N = 100;
  const max = featureCost(N, "bad");
  const px = (n: number) => 40 + ((n - 1) / (N - 1)) * (W - 60);
  const py = (c: number) => H - 30 - (c / max) * (H - 50);
  const path = (d: "good" | "bad") => Array.from({ length: N }, (_, i) => `${i ? "L" : "M"}${px(i + 1).toFixed(1)},${py(featureCost(i + 1, d)).toFixed(1)}`).join(" ");
  return (
    <figure className="not-prose my-6">
      <div className="rounded-sm border border-border bg-card p-2">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cost of each new feature: flat for good design, rising steeply for bad design" className="mx-auto block h-auto w-full" style={{ maxWidth: W }}>
          <line x1={40} y1={H - 30} x2={W - 16} y2={H - 30} stroke={stroke} />
          <line x1={40} y1={H - 30} x2={40} y2={14} stroke={stroke} />
          <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="12" className="font-mono" fill="hsl(var(--muted-foreground))">
            feature number (1 → 100)
          </text>
          <text x={14} y={H / 2} textAnchor="middle" fontSize="12" className="font-mono" fill="hsl(var(--muted-foreground))" transform={`rotate(-90 14 ${H / 2})`}>
            cost of that feature
          </text>
          <path d={path("bad")} fill="none" stroke={toneVar("orange")} strokeWidth="2.5" />
          <path d={path("good")} fill="none" stroke={toneVar("mint")} strokeWidth="2.5" />
          <text x={W - 20} y={py(max) + 14} textAnchor="end" fontSize="12" className="font-mono" fill={toneVar("orange")}>
            bad design
          </text>
          <text x={W - 20} y={py(1) - 8} textAnchor="end" fontSize="12" className="font-mono" fill={toneVar("mint")}>
            good design
          </text>
        </svg>
      </div>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">The shape of the idea, not measured data: with good design the 100th feature costs what the 1st did.</figcaption>
    </figure>
  );
}

/* ---------------------- Lecture 2: Eisenhower matrix ---------------------- */

export function EisenhowerMatrix() {
  const cell = (q: string, title: string, body: string, tone: string) => (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{q}</div>
      <div className="mt-1 font-display text-[15px] font-semibold">{title}</div>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">{body}</p>
    </div>
  );
  return (
    <figure className="not-prose my-6">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-sm">
        <div />
        <div className="text-center font-mono text-xs text-muted-foreground">Urgent</div>
        <div className="text-center font-mono text-xs text-muted-foreground">Not urgent</div>
        <div className="flex items-center font-mono text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">Important</div>
        {cell("Quadrant 1", "Critical production bugs", "Fix now.", "border-orange/50 bg-orange/[0.06]")}
        {cell("Quadrant 2", "Architecture & structural integrity", "Where long-term value lives. Easy to postpone, deadly to skip.", "border-mint/50 bg-mint/[0.08]")}
        <div className="flex items-center font-mono text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">Not important</div>
        {cell("Quadrant 3", "Urgent but trivial features", "Loud requests that feel pressing.", "border-border")}
        {cell("Quadrant 4", "Nice-to-have stuff", "Everything else.", "border-border")}
      </div>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">The failure mode: letting Quadrant 3 features push Quadrant 2 architecture aside.</figcaption>
    </figure>
  );
}

/* ------------------------ Lecture 3: the itself test ------------------------ */

/** Read each sentence aloud, decide whether the method belongs in FrontCamera, then reveal. */
export function ItselfTest() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const done = Object.keys(answers).length;
  const right = FRONT_CAMERA_METHODS.filter((m) => answers[m.method] === m.belongs).length;
  return (
    <FocusPanel title='SRP: the "itself" test on FrontCamera' eyebrowTone="text-sky">
      <ul className="flex flex-col gap-3">
        {FRONT_CAMERA_METHODS.map((m) => {
          const a = answers[m.method];
          const answered = a !== undefined;
          return (
            <li key={m.method} className="rounded-xl border border-border/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <code className="font-mono text-sm text-sky">{m.method}</code>
                  <div className="text-sm italic text-muted-foreground">"{m.sentence}"</div>
                </div>
                {!answered ? (
                  <div className="flex gap-2">
                    <button onClick={() => setAnswers((s) => ({ ...s, [m.method]: true }))} className="rounded-full border border-border px-3 py-1 font-mono text-xs hover:border-mint/60">
                      makes sense: keep
                    </button>
                    <button onClick={() => setAnswers((s) => ({ ...s, [m.method]: false }))} className="rounded-full border border-border px-3 py-1 font-mono text-xs hover:border-orange/60">
                      sounds wrong: move
                    </button>
                  </div>
                ) : (
                  <span className={`font-mono text-xs ${a === m.belongs ? "text-mint" : "text-orange"}`}>
                    {a === m.belongs ? "✓" : "✗"} {m.belongs ? "keep in FrontCamera" : `move to ${m.movedTo}`}
                  </span>
                )}
              </div>
              {answered && <p className="mt-2 text-sm text-muted-foreground">{m.why}</p>}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
        {done}/{FRONT_CAMERA_METHODS.length} decided{done === FRONT_CAMERA_METHODS.length && ` · ${right} right`}
        {done > 0 && (
          <button onClick={() => setAnswers({})} className="rounded-full border border-border px-3 py-1 hover:border-sky/60">
            reset
          </button>
        )}
      </div>
    </FocusPanel>
  );
}

/* ------------------- Lecture 3: what does isFree(x, y) mean? ------------------- */

const LSP_CHOICES = [
  { id: "ground", label: "checks the ground layer only", outcome: "The barrier at roof height is on a higher layer, so the corridor is reported free. The car drives into it: a missed collision (false negative).", bad: true },
  { id: "all", label: "checks every height layer", outcome: "The bridge far above the car fills a high layer, so the lane is reported blocked. The car brakes for nothing: phantom braking (false positive).", bad: true },
  { id: "throw", label: "throws an exception", outcome: "The base type never threw. The path planner wasn't written to expect it, so the motion planner crashes at runtime.", bad: true },
  { id: "fix", label: "(fixed design) isDrivable(x, y, vehicleHeight)", outcome: "The contract now asks the exact question: is the cell free up to the car's height plus clearance? The barrier blocks, the bridge doesn't.", bad: false },
] as const;

export function OccupancyGridLsp() {
  const [c, setC] = useState<string>("ground");
  const choice = LSP_CHOICES.find((x) => x.id === c)!;
  const barrierHit = c === "all" || c === "fix" ? true : c === "ground" ? false : null;
  const bridgeHit = c === "all" ? true : c === "throw" ? null : false;
  const mark = (hit: boolean | null) => (hit === null ? "?" : hit ? "blocked" : "free");
  return (
    <FocusPanel title="LSP: what should OccupancyGrid3D.isFree(x, y) mean?" eyebrowTone="text-sky">
      <div className="flex flex-wrap gap-2">
        {LSP_CHOICES.map((x) => (
          <button
            key={x.id}
            onClick={() => setC(x.id)}
            aria-pressed={x.id === c}
            className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${x.id === c ? "border-sky bg-sky/10 text-sky" : "border-border text-muted-foreground hover:border-sky/50"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 360 200" role="img" aria-label="A car approaching a barrier at roof height, with a bridge high above the road" className="mx-auto block h-auto w-full" style={{ maxWidth: 520 }}>
        <line x1="6" y1="160" x2="354" y2="160" stroke={stroke} strokeWidth="2" />
        {[0, 1, 2, 3].map((z) => (
          <text key={z} x="8" y={154 - z * 34} fontSize="11" className="font-mono" fill="hsl(var(--muted-foreground))">
            z={z}
          </text>
        ))}
        <rect x="40" y="122" width="62" height="32" rx="6" fill="hsl(var(--sky) / 0.2)" stroke={toneVar("sky")} />
        <text x="71" y="143" textAnchor="middle" fontSize="14" className="font-mono" fill="hsl(var(--foreground))">car</text>
        <rect x="150" y="110" width="60" height="10" fill="hsl(var(--orange) / 0.3)" stroke={toneVar("orange")} />
        <text x="180" y="102" textAnchor="middle" fontSize="13" className="font-mono" fill="hsl(var(--foreground))">barrier</text>
        <text x="180" y="88" textAnchor="middle" fontSize="11" className="font-mono" fill="hsl(var(--muted-foreground))">(roof height)</text>
        <text x="180" y="184" textAnchor="middle" fontSize="15" fontWeight="600" className="font-mono" fill={barrierHit ? toneVar("orange") : barrierHit === false ? toneVar("mint") : "hsl(var(--muted-foreground))"}>
          {mark(barrierHit)}
        </text>
        <rect x="250" y="34" width="100" height="10" fill="hsl(var(--violet) / 0.3)" stroke={toneVar("violet")} />
        <text x="300" y="26" textAnchor="middle" fontSize="13" className="font-mono" fill="hsl(var(--foreground))">bridge (high)</text>
        <text x="300" y="184" textAnchor="middle" fontSize="15" fontWeight="600" className="font-mono" fill={bridgeHit ? toneVar("orange") : bridgeHit === false ? toneVar("mint") : "hsl(var(--muted-foreground))"}>
          {mark(bridgeHit)}
        </text>
      </svg>
      <p className={`text-sm leading-relaxed ${choice.bad ? "text-orange" : "text-mint"}`}>{choice.outcome}</p>
    </FocusPanel>
  );
}

/* ------------------------ Lecture 5: pipe-and-filter ------------------------ */

export function PipelineRunner() {
  const stages = useMemo(() => runInvoicePipeline(INVOICE_FILES), []);
  const [k, setK] = useState(0);
  return (
    <FocusPanel title="ls invoices | grep -e August | sort" eyebrowTone="text-sky">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        {stages.map((s, i) => (
          <span key={s.label} className="flex items-center gap-2">
            <button
              onClick={() => setK(i)}
              aria-pressed={i === k}
              className={`rounded-md border px-2 py-1 ${i === k ? "border-sky bg-sky/10 text-sky" : i < k ? "border-mint/50 text-mint" : "border-border text-muted-foreground"}`}
            >
              {s.label}
            </button>
            {i < stages.length - 1 && <span className="text-muted-foreground">│ pipe →</span>}
          </span>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="eyebrow mb-1 text-muted-foreground">into this filter</div>
          <ul className="min-h-[7rem] rounded-md border border-border p-2 font-mono text-xs leading-6">
            {k === 0 ? <li className="text-muted-foreground">(the directory's file names)</li> : stages[k - 1].output.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-1 text-muted-foreground">out of this filter</div>
          <ul className="min-h-[7rem] rounded-md border border-sky/50 p-2 font-mono text-xs leading-6">
            {stages[k].output.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={k === 0} onClick={() => setK(k - 1)} className="rounded-full border border-border px-3 py-1 font-mono text-xs disabled:opacity-40">
          ← back
        </button>
        <button disabled={k === stages.length - 1} onClick={() => setK(k + 1)} className="rounded-full border border-border px-3 py-1 font-mono text-xs disabled:opacity-40">
          next filter →
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Each filter only reads a stream and writes a stream. None of them knows the others exist, and they share no state.</p>
    </FocusPanel>
  );
}

/* --------------------------- Lecture 5: messaging --------------------------- */

const QUEUE_SCRIPT: QueueEvent[] = [
  { kind: "send", msg: "order #1" },
  { kind: "send", msg: "order #2" },
  { kind: "take" },
  { kind: "send", msg: "order #3" },
  { kind: "take" },
  { kind: "take" },
  { kind: "take" },
];

export function MessageQueueStepper() {
  const frames = useMemo(() => queueFrames(QUEUE_SCRIPT), []);
  const [k, setK] = useState(0);
  const f = frames[k];
  return (
    <FocusPanel title="Messaging: a client, a queue and a server" eyebrowTone="text-sky">
      <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
        <div className="rounded-md border border-border bg-sky/10 px-3 py-2">Client</div>
        <span className="text-muted-foreground">→</span>
        <div className="flex min-h-[2.5rem] min-w-[12rem] flex-1 items-center gap-1 rounded-full border border-border px-3 py-1" aria-label="queue contents">
          {f.queue.length === 0 ? <span className="text-muted-foreground">queue empty</span> : f.queue.map((m, i) => <span key={m} className={`rounded px-2 py-0.5 ${i === 0 ? "bg-orange/15 text-orange" : "bg-muted"}`}>{m}</span>)}
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="rounded-md border border-border bg-mint/10 px-3 py-2">Server{f.serverHas ? `: ${f.serverHas}` : ""}</div>
      </div>
      <p className="text-sm text-muted-foreground">
        Step {k}/{frames.length - 1}: {f.note}
      </p>
      <div className="flex gap-2">
        <button disabled={k === 0} onClick={() => setK(k - 1)} className="rounded-full border border-border px-3 py-1 font-mono text-xs disabled:opacity-40">
          ← back
        </button>
        <button disabled={k === frames.length - 1} onClick={() => setK(k + 1)} className="rounded-full border border-border px-3 py-1 font-mono text-xs disabled:opacity-40">
          next →
        </button>
      </div>
    </FocusPanel>
  );
}

/* --------------------------- SequenceDiagram --------------------------- */

export type SequenceStep =
  | { from: number; to: number; label: string; dashed?: boolean; hidden?: boolean }
  | { note: string; at: number };

/** A UML sequence diagram: participants across the top, messages in time order going down.
    A step with `hidden` shows "?" instead of its label, for "what happens next?" questions. */
export function SequenceDiagram({
  participants,
  steps,
  title,
  caption,
  width,
}: {
  participants: string[];
  steps: SequenceStep[];
  title?: string;
  caption?: ReactNode;
  width?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const W = width ?? Math.max(440, participants.length * 150);
  const colW = W / participants.length;
  const cx = (i: number) => colW * i + colW / 2;
  const top = 48;
  const rowH = 40;
  const H = top + 22 + steps.length * rowH + 10;
  return (
    <figure className="not-prose my-6">
      <ScrollFrame>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title ?? "sequence diagram"} className="mx-auto block h-auto w-full" style={{ minWidth: Math.min(W, 460), maxWidth: W }}>
          <defs>
            <marker id={`${uid}-a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={stroke} />
            </marker>
          </defs>
          {participants.map((p, i) => (
            <g key={p}>
              <rect x={cx(i) - Math.min(colW - 12, 132) / 2} y={8} width={Math.min(colW - 12, 132)} height={30} rx={4} fill="hsl(var(--sky) / 0.12)" stroke={toneVar("sky")} strokeWidth="1.4" />
              <text x={cx(i)} y={28} textAnchor="middle" fontSize="12.5" className="font-mono" fill="hsl(var(--foreground))">
                {p}
              </text>
              <line x1={cx(i)} y1={38} x2={cx(i)} y2={H - 6} stroke={stroke} strokeDasharray="4 4" strokeWidth="1" />
            </g>
          ))}
          {steps.map((s, k) => {
            const y = top + 22 + k * rowH;
            if ("note" in s) {
              const nw = Math.min(colW * 1.6, 9 + s.note.length * 7.2);
              return (
                <g key={k}>
                  <rect x={cx(s.at) - nw / 2} y={y - 14} width={nw} height={24} rx={2} fill="hsl(var(--muted))" stroke={stroke} strokeWidth="1" />
                  <text x={cx(s.at)} y={y + 2} textAnchor="middle" fontSize="11.5" className="font-mono" fill="hsl(var(--foreground))">
                    {s.note}
                  </text>
                </g>
              );
            }
            const x1 = cx(s.from);
            const x2 = cx(s.to);
            const self = s.from === s.to;
            const label = s.hidden ? "?" : s.label;
            return (
              <g key={k}>
                {self ? (
                  <path d={`M${x1},${y - 6} h28 v14 h-26`} fill="none" stroke={stroke} strokeWidth="1.4" strokeDasharray={s.dashed ? "5 4" : undefined} markerEnd={`url(#${uid}-a)`} />
                ) : (
                  <line x1={x1} y1={y} x2={x2 + (x2 > x1 ? -2 : 2)} y2={y} stroke={s.hidden ? toneVar("orange") : stroke} strokeWidth="1.4" strokeDasharray={s.dashed || s.hidden ? "5 4" : undefined} markerEnd={`url(#${uid}-a)`} />
                )}
                <text
                  x={self ? x1 + 34 : (x1 + x2) / 2}
                  y={self ? y + 4 : y - 6}
                  textAnchor={self ? "start" : "middle"}
                  fontSize={s.hidden ? 15 : 11.5}
                  fontWeight={s.hidden ? 700 : 400}
                  className="font-mono"
                  fill={s.hidden ? toneVar("orange") : "hsl(var(--foreground))"}
                  paintOrder="stroke"
                  stroke="hsl(var(--card))"
                  strokeWidth="4"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </ScrollFrame>
      {caption && <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------ Topologies ------------------------------ */

const TOPOLOGIES: { name: string; pts: [number, number][]; links: [number, number][] }[] = [
  { name: "Ring", pts: [[40, 10], [68, 26], [68, 58], [40, 74], [12, 58], [12, 26]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
  { name: "Mesh", pts: [[14, 16], [66, 12], [40, 42], [16, 70], [66, 68]], links: [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [1, 4]] },
  { name: "Star", pts: [[40, 42], [40, 8], [74, 42], [40, 76], [6, 42]], links: [[0, 1], [0, 2], [0, 3], [0, 4]] },
  { name: "Fully connected", pts: [[14, 14], [66, 14], [66, 70], [14, 70]], links: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] },
  { name: "Line", pts: [[6, 42], [28, 42], [52, 42], [74, 42]], links: [[0, 1], [1, 2], [2, 3]] },
  { name: "Tree", pts: [[40, 10], [18, 40], [62, 40], [8, 72], [28, 72], [62, 72]], links: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5]] },
  { name: "Bus", pts: [[12, 20], [40, 20], [68, 20], [12, 60], [40, 60], [68, 60]], links: [] },
];

/** The seven topologies from Lecture 5, as small pictures that wrap on narrow screens. */
export function Topologies() {
  return (
    <figure className="not-prose my-6">
      <div className="grid grid-cols-3 gap-2 rounded-sm border border-border bg-card p-3 sm:grid-cols-4">
        {TOPOLOGIES.map((t) => (
          <div key={t.name} className="flex flex-col items-center">
            <svg viewBox="0 0 80 84" className="h-20 w-20" role="img" aria-label={`${t.name} topology`}>
              {t.name === "Bus" && <line x1="4" y1="40" x2="76" y2="40" stroke={stroke} strokeWidth="2" />}
              {t.name === "Bus" && t.pts.map(([x, y], i) => <line key={i} x1={x} y1={y} x2={x} y2={40} stroke={stroke} strokeWidth="1.4" />)}
              {t.links.map(([a, b], i) => (
                <line key={i} x1={t.pts[a][0]} y1={t.pts[a][1]} x2={t.pts[b][0]} y2={t.pts[b][1]} stroke={stroke} strokeWidth="1.4" />
              ))}
              {t.pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="5" fill="hsl(var(--mint) / 0.25)" stroke={toneVar("mint")} strokeWidth="1.5" />
              ))}
            </svg>
            <div className="mt-1 text-center font-mono text-[11px] text-muted-foreground">{t.name}</div>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        The seven topologies the lecture shows. A style's configuration rules often fix the topology: pipe-and-filter is a line or tree of filters; client-server is a star around the server.
      </figcaption>
    </figure>
  );
}

/* ------------------------ UML component notation ------------------------ */

/** A UML component with a port, a provided interface (lollipop) and a required interface (socket). */
export function UmlComponentNotation() {
  const label = (x: number, y: number, t: string, anchor: "start" | "middle" | "end" = "middle") => (
    <text x={x} y={y} textAnchor={anchor} fontSize="13" className="font-mono" fill="hsl(var(--foreground))">{t}</text>
  );
  return (
    <figure className="not-prose my-6">
      <div className="rounded-sm border border-border bg-card p-2">
        <svg viewBox="0 0 360 150" role="img" aria-label="A UML component with a provided interface drawn as a lollipop on the left and a required interface drawn as a socket on the right, both attached at ports" className="mx-auto block h-auto w-full" style={{ maxWidth: 520 }}>
          <rect x="120" y="45" width="120" height="60" rx="3" fill="hsl(var(--sky) / 0.13)" stroke={toneVar("sky")} strokeWidth="1.5" />
          {label(180, 80, "Component")}
          <rect x="113" y="68" width="14" height="14" fill="hsl(var(--card))" stroke={stroke} strokeWidth="1.5" />
          <rect x="233" y="68" width="14" height="14" fill="hsl(var(--card))" stroke={stroke} strokeWidth="1.5" />
          <line x1="113" y1="75" x2="58" y2="75" stroke={stroke} strokeWidth="1.5" />
          <circle cx="50" cy="75" r="8" fill="hsl(var(--card))" stroke={stroke} strokeWidth="1.5" />
          <line x1="247" y1="75" x2="300" y2="75" stroke={stroke} strokeWidth="1.5" />
          <path d="M312,64 A11,11 0 0 0 312,86" fill="none" stroke={stroke} strokeWidth="1.5" />
          {label(50, 108, "provided")}
          {label(50, 123, "(lollipop)")}
          {label(312, 108, "required")}
          {label(312, 123, "(socket)")}
          {label(120, 30, "port", "middle")}
          <line x1="120" y1="34" x2="120" y2="66" stroke={stroke} strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      </div>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">A provided interface is a lollipop (line + circle). A required interface is a socket (line + half-circle). Both attach at ports, the small squares on the component's edge.</figcaption>
    </figure>
  );
}

/* -------------------- Lecture 6: estimation calculator -------------------- */

const big = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e3 ? `${Math.round(n / 1e3)} K` : `${Math.round(n)}`);

/** Change Streamify's assumptions and watch which number becomes the problem. */
export function EstimationCalculator() {
  const [dau, setDau] = useState(100);
  const [conc, setConc] = useState(15);
  const [kbps, setKbps] = useState(160);
  const [events, setEvents] = useState(200);
  const e = streamifyEstimate({ dau: dau * 1e6, concurrency: conc / 100, bitrateKbps: kbps, eventsPerUser: events });
  const slider = (label: string, v: number, set: (n: number) => void, min: number, max: number, step: number, unit: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-mono text-xs text-muted-foreground">
        {label}: <span className="text-foreground">{v}{unit}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(ev) => set(Number(ev.target.value))} aria-label={label} />
    </label>
  );
  const row = (q: string, calc: string, r: string, hot = false) => (
    <tr className="border-t border-border/60">
      <td className="py-1 pr-3">{q}</td>
      <td className="py-1 pr-3 text-muted-foreground">{calc}</td>
      <td className={`py-1 font-semibold ${hot ? "text-orange" : ""}`}>{r}</td>
    </tr>
  );
  return (
    <FocusPanel title="Streamify by the numbers" eyebrowTone="text-sky">
      <div className="grid gap-3 sm:grid-cols-2">
        {slider("Daily active users", dau, setDau, 10, 500, 10, " M")}
        {slider("Share streaming at peak", conc, setConc, 5, 30, 1, " %")}
        {slider("Average bitrate", kbps, setKbps, 96, 320, 32, " kbps")}
        {slider("Events per user per day", events, setEvents, 50, 500, 50, "")}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <tbody>
            {row("Peak concurrent streams", `${dau} M × ${conc} %`, big(e.peakStreams))}
            {row("Peak egress bandwidth", `streams × ${kbps} kbps`, `${e.egressTbps.toFixed(1)} Tbps`, true)}
            {row("Catalog storage", "100 M tracks × 4 encodings × 5 MB", `${e.storagePB.toFixed(0)} PB`)}
            {row("Events, average", `${dau} M × ${events} ÷ 86 400 s`, `${big(e.eventsPerSecAvg)}/s`)}
            {row("Events, peak (≈ 3× avg)", "", `${big(e.eventsPerSecPeak)}/s`, true)}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        The two orange numbers are the unusual ones. Terabits per second is a bandwidth problem (answered by caching, a CDN and, in 2008, peers); hundreds of thousands of events a second is a throughput problem (answered by an asynchronous message bus). Neither is solved by "add more servers".
      </p>
    </FocusPanel>
  );
}
