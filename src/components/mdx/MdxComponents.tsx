import { ReactNode, useId, useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Handle,
  MarkerType,
  Position,
  type Edge as RFEdge,
  type Node as RFNode,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { useProgress } from "@/hooks/useProgress";
import { recordQuizScore } from "@/lib/progressSync";

type Tone = "neon" | "orange" | "sky" | "violet" | "mint";

const toneMap: Record<Tone, { bar: string; text: string; bg: string }> = {
  neon:   { bar: "bg-neon",   text: "text-neon",   bg: "bg-neon/10" },
  orange: { bar: "bg-orange", text: "text-orange", bg: "bg-orange/10" },
  sky:    { bar: "bg-sky",    text: "text-sky",    bg: "bg-sky/10" },
  violet: { bar: "bg-violet", text: "text-violet", bg: "bg-violet/10" },
  mint:   { bar: "bg-mint",   text: "text-mint",   bg: "bg-mint/10" },
};

/* ============================================================
   CodeBlock — replaces every fenced <pre> in lessons (wired via
   MDXProvider in LessonPage). Adds a copy button; colouring is
   done at build time by rehype-pretty-code.
   ============================================================ */

export function CodeBlock(props: React.ComponentPropsWithoutRef<"pre">) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text.replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (insecure context); nothing useful to do */
    }
  };

  return (
    <div className="code-block group">
      <pre ref={ref} {...props} />
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute top-2.5 right-2.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border border-white/15 text-white/60 bg-white/5 hover:text-white hover:border-white/40 transition opacity-70 group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function Callout({
  tone = "orange",
  label,
  children,
}: {
  tone?: Tone;
  label?: string;
  children: ReactNode;
}) {
  const t = toneMap[tone];
  return (
    <aside className={`my-8 border-l-2 pl-5 py-4 ${t.bg}`} style={{ borderColor: `hsl(var(--${tone === "neon" ? "neon" : tone}))` }}>
      {label && (
        <div className={`eyebrow mb-2 ${t.text}`}>{label}</div>
      )}
      <div className="text-base leading-relaxed text-foreground/90 [&>p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}

export function PracticalApplication({
  title,
  tool,
  children,
}: {
  title: string;
  tool?: string;
  children: ReactNode;
}) {
  return (
    <div className="my-4 rounded-sm border border-border bg-card p-5 transition hover:border-foreground/30">
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <h4 className="font-display text-lg font-bold leading-tight">{title}</h4>
        {tool && <span className="eyebrow text-orange">{tool}</span>}
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed [&>p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}

export function Pillar({
  number,
  title,
  origin,
  children,
}: {
  number: string;
  title: string;
  origin?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="my-12 not-prose">
      <div className="mb-4 flex items-baseline gap-4">
        <span className="font-mono text-xs text-muted-foreground tracking-widest">{number}</span>
        <h2 className="font-display text-2xl md:text-3xl font-bold">{title}</h2>
      </div>
      {origin && (
        <div className="mb-4 border-l-2 border-orange/60 pl-4 italic text-sm text-muted-foreground">
          <span className="not-italic font-semibold text-foreground">Origin: </span>{origin}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function ApplicationsGrid({ children }: { children: ReactNode }) {
  return <div className="my-6 grid gap-3 md:grid-cols-2">{children}</div>;
}

/* ============================================================
   AutomatonDiagram — interactive finite-automaton visualizer.
   Pure SVG, no graph libs. Renders states + transitions and lets
   the reader step through an input string symbol by symbol.
   ============================================================ */

type AutomatonTransition = { from: string; to: string; label: string };

type AutomatonDiagramProps = {
  states: string[];
  alphabet: string[];
  transitions: AutomatonTransition[];
  initial: string;
  accepting: string[];
};type RunStatus = "idle" | "accepted" | "rejected" | "rejected-no-transition";

function getEpsilonClosure(
  current: string[],
  transitions: AutomatonTransition[]
): string[] {
  const result = new Set<string>(current);
  const queue = [...current];
  while (queue.length > 0) {
    const s = queue.shift()!;
    for (const t of transitions) {
      if (
        t.from === s &&
        (t.label === "ε" || t.label === "eps" || t.label === "epsilon" || t.label === "")
      ) {
        if (!result.has(t.to)) {
          result.add(t.to);
          queue.push(t.to);
        }
      }
    }
  }
  return Array.from(result);
}

export function AutomatonDiagram({
  states,
  alphabet,
  transitions,
  initial,
  accepting,
}: AutomatonDiagramProps) {
  const reactId = useId();
  const markerId = `automaton-arrow-${reactId.replace(/:/g, "")}`;

  const getInitialActiveStates = () => getEpsilonClosure([initial], transitions);

  const [input, setInput] = useState("");
  const [position, setPosition] = useState(0);
  const [activeStates, setActiveStates] = useState<string[]>(() => getInitialActiveStates());
  const [status, setStatus] = useState<RunStatus>("idle");

  /* ---------- layout ---------- */
  const r = 28;
  const stateGapX = 140;
  const sidePadding = 50;

  // Longest |fromIdx - toIdx| across non-self edges. Drives extra vertical
  // room so "skip" edges (e.g. q2 → q0 jumping over q1) can curve clear of
  // intermediate state circles instead of slicing through them.
  const maxSkipSpan = useMemo(() => {
    const idx = new Map<string, number>();
    states.forEach((s, i) => idx.set(s, i));
    let max = 1;
    for (const t of transitions) {
      if (t.from === t.to) continue;
      const f = idx.get(t.from);
      const to = idx.get(t.to);
      if (f === undefined || to === undefined) continue;
      max = Math.max(max, Math.abs(f - to));
    }
    return max;
  }, [states, transitions]);

  // Set of states that have a self-loop. Skip edges passing over such a
  // state route below the state row instead of fighting for the airspace
  // above (where the self-loop and its label already live).
  const selfLoopStates = useMemo(() => {
    const s = new Set<string>();
    for (const t of transitions) if (t.from === t.to) s.add(t.from);
    return s;
  }, [transitions]);

  const skipCurveOffsetFor = (span: number) => 120 + Math.max(0, span - 2) * 40;
  const skipPad = maxSkipSpan > 1 ? skipCurveOffsetFor(maxSkipSpan) - r + 10 : 0;
  const topPadding = Math.max(80, skipPad);
  const bottomPadding = Math.max(60, skipPad);
  const stateY = topPadding + r;
  const svgWidth = sidePadding * 2 + Math.max(0, (states.length - 1) * stateGapX) + r * 2;
  const svgHeight = topPadding + r * 2 + bottomPadding;
  const stateX = (i: number) => sidePadding + r + i * stateGapX;

  const stateIndex = useMemo(() => {
    const m = new Map<string, number>();
    states.forEach((s, i) => m.set(s, i));
    return m;
  }, [states]);

  /* ---------- group transitions by (from, to), combining labels ---------- */
  const groupedTransitions = useMemo(() => {
    const map = new Map<string, { from: string; to: string; labels: string[] }>();
    for (const t of transitions) {
      const key = `${t.from} ${t.to}`;
      if (!map.has(key)) map.set(key, { from: t.from, to: t.to, labels: [] });
      map.get(key)!.labels.push(t.label);
    }
    return Array.from(map.values());
  }, [transitions]);

  const pairKeys = useMemo(
    () => new Set(groupedTransitions.map((g) => `${g.from} ${g.to}`)),
    [groupedTransitions]
  );
  const hasReverse = (from: string, to: string) =>
    from !== to && pairKeys.has(`${to} ${from}`);

  /* ---------- tokenize input via greedy longest-match against the alphabet,
       so multi-character symbols (e.g. "$5", "$10") work alongside single-
       character ones. Whitespace is permitted but ignored — the reader can
       type "$5 $10 $5" or "$5$10$5" and get the same parse. Returns null
       if a substring matches no alphabet symbol. ---------- */
  const tokens = useMemo(() => {
    if (input.length === 0) return [] as string[];
    const sorted = [...alphabet].sort((a, b) => b.length - a.length);
    const clean = input.replace(/\s+/g, "");
    const result: string[] = [];
    let i = 0;
    while (i < clean.length) {
      const m = sorted.find((sym) => sym.length > 0 && clean.slice(i, i + sym.length) === sym);
      if (!m) return null;
      result.push(m);
      i += m.length;
    }
    return result;
  }, [input, alphabet]);

  const useTokenSeparator = useMemo(
    () => alphabet.some((s) => s.length > 1),
    [alphabet]
  );

  /* ---------- simulator ---------- */
  const handleStep = () => {
    if (status !== "idle") return;
    if (tokens === null) {
      setStatus("rejected-no-transition");
      return;
    }
    if (position >= tokens.length) {
      const isAccepted = activeStates.some((s) => accepting.includes(s));
      setStatus(isAccepted ? "accepted" : "rejected");
      return;
    }
    const symbol = tokens[position];
    const nextDirectStates = new Set<string>();
    for (const s of activeStates) {
      for (const tr of transitions) {
        if (tr.from === s && tr.label === symbol) {
          nextDirectStates.add(tr.to);
        }
      }
    }
    if (nextDirectStates.size === 0) {
      setActiveStates([]);
      setStatus("rejected-no-transition");
      return;
    }
    const nextActive = getEpsilonClosure(Array.from(nextDirectStates), transitions);
    const nextPos = position + 1;
    setActiveStates(nextActive);
    setPosition(nextPos);
    if (nextPos >= tokens.length) {
      const isAccepted = nextActive.some((s) => accepting.includes(s));
      setStatus(isAccepted ? "accepted" : "rejected");
    }
  };

  const handleReset = () => {
    setPosition(0);
    setActiveStates(getInitialActiveStates());
    setStatus("idle");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setPosition(0);
    setActiveStates(getInitialActiveStates());
    setStatus("idle");
  };

  const isError = status === "rejected" || status === "rejected-no-transition";
  const isActive = (s: string) => activeStates.includes(s);

  const stateFillClass = (s: string) => {
    if (!isActive(s)) return "fill-transparent";
    if (status === "accepted") {
      return accepting.includes(s) ? "fill-mint/30" : "fill-neon/25";
    }
    if (isError) return "fill-orange/30";
    return "fill-neon/25";
  };
  const stateStrokeClass = (s: string) => {
    if (!isActive(s)) return "stroke-current";
    if (status === "accepted") {
      return accepting.includes(s) ? "stroke-mint" : "stroke-neon";
    }
    if (isError) return "stroke-orange";
    return "stroke-neon";
  };

  /* ---------- edge geometry helpers ---------- */
  const renderEdge = (g: { from: string; to: string; labels: string[] }) => {
    const fromIdx = stateIndex.get(g.from);
    const toIdx = stateIndex.get(g.to);
    if (fromIdx === undefined || toIdx === undefined) return null;
    const x1 = stateX(fromIdx);
    const y1 = stateY;
    const x2 = stateX(toIdx);
    const y2 = stateY;
    const labels = g.labels.join(", ");
    const key = `${g.from}->${g.to}`;

    // Self-loop: arc above the state
    if (g.from === g.to) {
      const startX = x1 - r * 0.6;
      const startY = y1 - r * 0.8;
      const endX = x1 + r * 0.6;
      const endY = y1 - r * 0.8;
      const c1X = x1 - 30;
      const c1Y = y1 - r - 55;
      const c2X = x1 + 30;
      const c2Y = y1 - r - 55;
      return (
        <g key={key}>
          <path
            d={`M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            markerEnd={`url(#${markerId})`}
          />
          <text
            x={x1}
            y={y1 - r - 42}
            textAnchor="middle"
            className="font-mono fill-current"
            fontSize={11}
          >
            {labels}
          </text>
        </g>
      );
    }

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;

    const span = Math.abs(fromIdx - toIdx);
    const isSkip = span > 1;
    const isBidir = hasReverse(g.from, g.to);

    // Straight line: adjacent states, one-way.
    if (!isBidir && !isSkip) {
      const sx = x1 + r * ux;
      const sy = y1 + r * uy;
      const ex = x2 - r * ux;
      const ey = y2 - r * uy;
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2 - 8;
      return (
        <g key={key}>
          <line
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke="currentColor"
            strokeWidth={1.5}
            markerEnd={`url(#${markerId})`}
          />
          <text
            x={mx}
            y={my}
            textAnchor="middle"
            className="font-mono fill-current"
            fontSize={11}
          >
            {labels}
          </text>
        </g>
      );
    }

    // Curved edge. Two reasons to curve:
    //  - bidir pair → arrows must land on opposite sides of the AB line
    //  - skip edge (|span| > 1) → must arc clear of intermediate state circles
    let perpX: number;
    let perpY: number;
    let curveOffset: number;
    if (isSkip && isBidir) {
      // Bidir skip: keep the "opposite sides" separation, but with enough
      // clearance to clear intermediates on whichever side each curves to.
      perpX = -uy;
      perpY = ux;
      curveOffset = skipCurveOffsetFor(span);
    } else if (isSkip) {
      // One-way skip. Route below when any intermediate state has a self-loop —
      // its loop and label already occupy the airspace above, so flying over
      // would crash into them. Otherwise arc above.
      const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      let intermediateHasLoop = false;
      for (let i = lo + 1; i < hi; i++) {
        if (selfLoopStates.has(states[i])) { intermediateHasLoop = true; break; }
      }
      perpX = 0;
      perpY = intermediateHasLoop ? 1 : -1;
      curveOffset = skipCurveOffsetFor(span);
    } else {
      // Adjacent bidir: gentle curve right of direction.
      perpX = -uy;
      perpY = ux;
      curveOffset = 38;
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const ctrlX = midX + curveOffset * perpX;
    const ctrlY = midY + curveOffset * perpY;

    // Start/end at circle edges, tangent to the Bezier — vector from each
    // center toward the control point gives a clean visual handoff.
    const sdx = ctrlX - x1;
    const sdy = ctrlY - y1;
    const slen = Math.hypot(sdx, sdy) || 1;
    const sx = x1 + (r * sdx) / slen;
    const sy = y1 + (r * sdy) / slen;

    const edx = ctrlX - x2;
    const edy = ctrlY - y2;
    const elen = Math.hypot(edx, edy) || 1;
    const ex = x2 + (r * edx) / elen;
    const ey = y2 + (r * edy) / elen;

    // Quadratic Bezier apex sits at midpoint(segment-midpoint, control).
    const apexX = 0.5 * midX + 0.5 * ctrlX;
    const apexY = 0.5 * midY + 0.5 * ctrlY;
    const labelX = apexX + 16 * perpX;
    const labelY = apexY + 16 * perpY;

    return (
      <g key={key}>
        <path
          d={`M ${sx} ${sy} Q ${ctrlX} ${ctrlY}, ${ex} ${ey}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          markerEnd={`url(#${markerId})`}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-mono fill-current"
          fontSize={11}
        >
          {labels}
        </text>
      </g>
    );
  };

  /* ---------- render ---------- */
  const initialIdx = stateIndex.get(initial);

  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm">
      <div className="overflow-x-auto p-5">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width={svgWidth}
          height={svgHeight}
          className="block mx-auto text-foreground"
          role="img"
          aria-label="Finite automaton diagram"
        >
          <defs>
            <marker
              id={markerId}
              markerWidth={10}
              markerHeight={10}
              refX={9}
              refY={5}
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>

          {groupedTransitions.map(renderEdge)}

          {initialIdx !== undefined && (
            <line
              x1={stateX(initialIdx) - r - 24}
              y1={stateY}
              x2={stateX(initialIdx) - r - 2}
              y2={stateY}
              stroke="currentColor"
              strokeWidth={1.5}
              markerEnd={`url(#${markerId})`}
            />
          )}

          {states.map((s, i) => {
            const x = stateX(i);
            const y = stateY;
            const isAccept = accepting.includes(s);
            return (
              <g key={s}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  className={`${stateStrokeClass(s)} ${stateFillClass(s)} transition-colors`}
                  strokeWidth={2}
                />
                {isAccept && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r - 5}
                    fill="none"
                    className={`${stateStrokeClass(s)} transition-colors`}
                    strokeWidth={1.5}
                  />
                )}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="font-mono fill-current"
                  fontSize={13}
                >
                  {s}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="border-t border-border p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-stretch gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={`Type a string over {${alphabet.join(", ")}}`}
            className="flex-1 min-w-[200px] font-mono text-sm px-3 py-2 border border-border bg-transparent text-foreground focus:outline-none focus:border-foreground rounded-sm"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button
            type="button"
            onClick={handleStep}
            disabled={status !== "idle"}
            className="font-mono text-[11px] uppercase tracking-widest px-4 py-2 border border-border hover:border-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm"
          >
            Step →
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="font-mono text-[11px] uppercase tracking-widest px-4 py-2 border border-border hover:border-foreground transition-colors rounded-sm"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono text-xs">
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground tracking-widest">INPUT</span>
            <span>
              {tokens === null ? (
                <span className="text-orange italic">invalid input</span>
              ) : tokens.length === 0 ? (
                <span className="text-muted-foreground italic">empty</span>
              ) : (
                tokens.map((tok, i) => {
                  let cls = "text-foreground";
                  if (i < position) cls = "text-muted-foreground line-through";
                  else if (i === position && status === "idle") cls = "text-neon font-bold";
                  return (
                    <span key={i}>
                      <span className={cls}>{tok}</span>
                      {useTokenSeparator && i < tokens.length - 1 ? " " : ""}
                    </span>
                  );
                })
              )}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground tracking-widest">STATE</span>
            <span className="font-bold">
              {activeStates.length === 0
                ? "∅"
                : activeStates.length === 1
                  ? activeStates[0]
                  : `{${activeStates.join(", ")}}`}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground tracking-widest">STATUS</span>
            {status === "idle" && position === 0 && (
              <span className="text-muted-foreground">READY</span>
            )}
            {status === "idle" && position > 0 && (
              <span className="text-neon">READING</span>
            )}
            {status === "accepted" && <span className="text-mint">ACCEPTED</span>}
            {status === "rejected" && <span className="text-orange">REJECTED</span>}
            {status === "rejected-no-transition" && (
              <span className="text-orange">REJECTED — NO TRANSITION</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Diagram — static educational diagrams (pipelines, flowcharts).
   Wraps ReactFlow with dagre auto-layout, brand-tokened nodes
   and edges, and all interactivity stripped. Use this for any
   non-stateful conceptual graph; use AutomatonDiagram for actual
   state machines the reader needs to step through.
   ============================================================ */

type DiagramNodeKind = "source" | "sink" | "default";

type DiagramNode = {
  id: string;
  label: string;
  type?: "source" | "sink";
};

type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  back?: boolean;
};

type DiagramProps = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  direction?: "LR" | "TB";
};

const DIAGRAM_NODE_W = 220;
const DIAGRAM_NODE_H = 52;

function DiagramBaseNode({
  data,
}: {
  data: { label: string; kind: DiagramNodeKind; direction: "LR" | "TB" };
}) {
  const target = data.direction === "TB" ? Position.Top : Position.Left;
  const source = data.direction === "TB" ? Position.Bottom : Position.Right;

  const tintClass =
    data.kind === "source"
      ? "border-neon"
      : data.kind === "sink"
        ? "border-mint"
        : "border-border";

  return (
    <div
      style={{ width: DIAGRAM_NODE_W, height: DIAGRAM_NODE_H }}
      className={`flex items-center justify-center border ${tintClass} bg-card rounded-sm px-4 py-2 font-mono text-sm text-foreground tracking-wide whitespace-nowrap`}
    >
      <Handle type="target" position={target} />
      {data.label}
      <Handle type="source" position={source} />
      {data.direction === "TB" && (
        <>
          <Handle id="loop-out" type="source" position={Position.Right} />
          <Handle id="loop-in" type="target" position={Position.Right} />
        </>
      )}
    </div>
  );
}

const diagramNodeTypes = { base: DiagramBaseNode };

function layoutDiagram(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: "LR" | "TB"
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

  nodes.forEach((n) =>
    g.setNode(n.id, { width: DIAGRAM_NODE_W, height: DIAGRAM_NODE_H })
  );
  // Back edges loop around the side, so they don't affect the layout.
  edges.filter((e) => !e.back).forEach((e) => g.setEdge(e.from, e.to));
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - DIAGRAM_NODE_W / 2,
        y: pos.y - DIAGRAM_NODE_H / 2,
      },
    };
  });
}

export function Diagram({ nodes, edges, direction = "LR" }: DiagramProps) {
  const layouted = useMemo(
    () => layoutDiagram(nodes, edges, direction),
    [nodes, edges, direction]
  );

  const rfNodes: RFNode[] = layouted.map((n) => ({
    id: n.id,
    position: n.position,
    type: "base",
    data: { label: n.label, kind: n.type ?? "default", direction },
    draggable: false,
    selectable: false,
  }));

  const rfEdges: RFEdge[] = edges.map((e) => ({
    id: `${e.from}->${e.to}`,
    source: e.from,
    target: e.to,
    label: e.label,
    type: e.back ? "smoothstep" : "default",
    sourceHandle: e.back ? "loop-out" : undefined,
    targetHandle: e.back ? "loop-in" : undefined,
    ...(e.back ? { pathOptions: { offset: 60 } } : {}),
    markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--foreground))" },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 2,
  }));

  // Auto-fit container height from the laid-out bounding box.
  const padding = 40;
  const containerHeight = layouted.reduce(
    (max, n) => Math.max(max, n.position.y + DIAGRAM_NODE_H),
    0
  ) + padding;

  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div style={{ height: containerHeight, width: "100%" }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={diagramNodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.4}
          maxZoom={1}
        />
      </div>
    </div>
  );
}

// ============================================================
// Regex Playground — interactive regex testing with live feedback
// ============================================================

export type RegexTestCase = {
  string: string;
  shouldMatch: boolean;
  note?: string;
};

export type RegexPlaygroundProps = {
  prompt: string;
  testCases: RegexTestCase[];
  flags?: string;
  placeholder?: string;
  solutionHint?: string;
};

export function runRegexTestCases(
  pattern: string,
  flags: string,
  strings: string[]
): boolean[] | "error" {
  try {
    const re = new RegExp(pattern, flags);
    return strings.map((s) => re.test(s));
  } catch (err) {
    return "error";
  }
}

export function RegexPlayground(props: RegexPlaygroundProps) {
  const { prompt, testCases, flags = "", placeholder, solutionHint } = props;
  const [pattern, setPattern] = useState("");
  const [compileError, setCompileError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{ str: string; matched: boolean | null; expected: boolean }>
  >(testCases.map((tc) => ({ str: tc.string, matched: null, expected: tc.shouldMatch })));
  const [showHint, setShowHint] = useState(false);

  const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPattern = e.currentTarget.value;
    setPattern(newPattern);
    setCompileError(null);

    if (!newPattern.trim()) {
      setResults(testCases.map((tc) => ({ str: tc.string, matched: null, expected: tc.shouldMatch })));
      return;
    }

    try {
      new RegExp(newPattern, flags);
    } catch (err) {
      setCompileError((err as Error).message);
      setResults(testCases.map((tc) => ({ str: tc.string, matched: null, expected: tc.shouldMatch })));
      return;
    }

    const testResult = runRegexTestCases(newPattern, flags, testCases.map((tc) => tc.string));
    if (testResult === "error") {
      setCompileError("Failed to test pattern");
      setResults(testCases.map((tc) => ({ str: tc.string, matched: null, expected: tc.shouldMatch })));
    } else {
      setResults(
        testResult.map((matched: boolean, idx: number) => ({
          str: testCases[idx].string,
          matched,
          expected: testCases[idx].shouldMatch,
        }))
      );
    }
  };

  const passCount = results.filter((r) => r.matched === r.expected && r.matched !== null).length;
  const totalCount = testCases.length;

  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden">
      <div className="p-5 border-b border-border">
        <p className="text-sm leading-relaxed">{prompt}</p>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <input
            type="text"
            value={pattern}
            onChange={handlePatternChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 font-mono text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>

        {compileError && (
          <div className="text-orange font-mono text-xs leading-relaxed">{compileError}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse font-mono text-xs">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-2 py-2 font-semibold">String</th>
                <th className="text-center px-2 py-2 font-semibold">Expected</th>
                <th className="text-center px-2 py-2 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="px-2 py-2">{r.str === "" ? "<empty>" : r.str}</td>
                  <td className="text-center px-2 py-2">
                    <span className={r.expected ? "text-mint" : "text-muted-foreground"}>
                      {r.expected ? "✓" : "✗"}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2">
                    {r.matched === null ? (
                      <span className="text-neon">—</span>
                    ) : r.matched === r.expected ? (
                      <span className="text-mint">✓</span>
                    ) : (
                      <span className="text-orange">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Score: {passCount}/{totalCount}
        </div>

        {solutionHint && (
          <button
            onClick={() => setShowHint((v) => !v)}
            className="text-xs font-mono uppercase tracking-widest border border-border px-3 py-1 hover:border-foreground transition"
          >
            {showHint ? "Hide hint" : "Reveal hint"}
          </button>
        )}

        {showHint && solutionHint && (
          <div className="px-3 py-2 bg-background border border-border text-xs font-mono text-muted-foreground">
            {solutionHint}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Quiz — scored multiple-choice questions
// ============================================================

export type QuizOption = { id: string; text: string };

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
};

export type QuizProps = {
  courseSlug: string;
  lessonSlug: string;
  questions: QuizQuestion[];
  passThreshold?: number;
};

export function Quiz(props: QuizProps) {
  const { courseSlug, lessonSlug, questions, passThreshold = 0.8 } = props;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const { setComplete, isComplete } = useProgress(courseSlug);

  const selectAnswer = useCallback(
    (questionId: string, optionId: string) => {
      if (submitted[questionId]) return; // Lock after first answer
      setAnswers((a) => ({ ...a, [questionId]: optionId }));
      setSubmitted((s) => ({ ...s, [questionId]: true }));
    },
    [submitted]
  );

  const answeredCount = Object.keys(submitted).length;
  const correctCount = questions.filter((q) => answers[q.id] === q.correctOptionId).length;
  const allAnswered = answeredCount === questions.length;
  const scoreFraction = questions.length ? correctCount / questions.length : 0;
  const passed = allAnswered && scoreFraction >= passThreshold;

  // Saved once per attempt; the store keeps only the best one.
  useEffect(() => {
    if (allAnswered && questions.length > 0) {
      recordQuizScore(courseSlug, lessonSlug, { best: correctCount, total: questions.length });
    }
  }, [allAnswered, correctCount, courseSlug, lessonSlug, questions.length]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setSubmitted({});
  }, []);

  // Auto-mark complete when passing
  useEffect(() => {
    if (passed && !isComplete(lessonSlug)) {
      setComplete(lessonSlug, true);
    }
  }, [passed, lessonSlug, isComplete, setComplete]);

  const lessonSlugLocal = lessonSlug;
  const done = isComplete(lessonSlugLocal);

  return (
    <div className="not-prose my-8 space-y-6">
      {questions.map((question) => {
        const isAnswered = submitted[question.id];
        const selectedOptionId = answers[question.id];
        const isCorrect = selectedOptionId === question.correctOptionId;

        return (
          <div key={question.id} className="border border-border bg-card rounded-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <p className="font-semibold">{question.prompt}</p>
            </div>
            <div className="p-5 space-y-3">
              {question.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                let borderClass = "border-border";
                let bgClass = "";
                if (isAnswered) {
                  if (isSelected && isCorrect) {
                    borderClass = "border-mint";
                    bgClass = "bg-mint/10";
                  } else if (isSelected && !isCorrect) {
                    borderClass = "border-orange";
                    bgClass = "bg-orange/10";
                  } else if (option.id === question.correctOptionId) {
                    borderClass = "border-mint";
                    bgClass = "bg-mint/10";
                  }
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => selectAnswer(question.id, option.id)}
                    disabled={isAnswered}
                    className={`w-full text-left px-4 py-3 border transition ${borderClass} ${bgClass} ${
                      isAnswered ? "cursor-default" : "hover:border-foreground/40 cursor-pointer"
                    } font-mono text-sm`}
                  >
                    {option.text}
                  </button>
                );
              })}

              {isAnswered && question.explanation && (
                <div className="mt-3 px-3 py-2 bg-background border border-border text-xs text-muted-foreground font-mono">
                  {question.explanation}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {allAnswered && (
        <div className={`mt-6 font-mono text-xs uppercase tracking-widest ${
          passed ? "text-mint" : "text-orange"
        }`}>
          {correctCount}/{questions.length} correct — {passed ? "PASSED" : `NEED ${Math.ceil(questions.length * passThreshold)}/${questions.length}`}
        </div>
      )}

      {!passed && allAnswered && (
        <button
          onClick={handleRetry}
          className="inline-block px-4 py-2 border border-border font-mono text-xs uppercase tracking-widest hover:border-foreground transition"
        >
          Retry quiz
        </button>
      )}

      {passed && done && (
        <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 border border-mint text-mint font-mono text-xs uppercase tracking-widest">
          <span className="inline-flex h-4 w-4 items-center justify-center">✓</span>
          Quiz complete
        </div>
      )}
    </div>
  );
}
