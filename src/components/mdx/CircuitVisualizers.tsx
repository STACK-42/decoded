import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { btn, Legend } from "@/components/mdx/AlgoVisualizers";
import { evalGate, settle, truthRows, type Bit, type GateType, type NetGate, type Signals } from "@/lib/logic";

/* ============================================================
   Live circuits. A circuit is a list of gates with positions.
   Flip an input and the signal moves one gate delay at a time:
     mint  = wire is HIGH (1)
     muted = wire is LOW (0)
     neon  = this gate's output changed on this step
   ============================================================ */

export type CircuitInput = { id: string; label: string; x: number; y: number };
export type CircuitGate = NetGate & {
  x: number;
  y: number;
  /** used when narrating the propagation, e.g. "the top NOR" */
  name?: string;
  /** hand-routed wires: input index → points between the source and the pin */
  route?: Record<number, [number, number][]>;
  /** x of the vertical run for an input's default route */
  mid?: Record<number, number>;
};
export type CircuitOutput = { id: string; label: string; x: number; y: number; from: string };
export type CircuitLayout = { w: number; h: number; inputs: CircuitInput[]; gates: CircuitGate[]; outputs: CircuitOutput[] };

const GATE_W = 58;
const gateHeight = (n: number) => Math.max(40, n * 16 + 8);
const pinY = (g: CircuitGate, i: number) => {
  const h = gateHeight(g.in.length);
  return g.y + (h * (i + 1)) / (g.in.length + 1);
};
const outY = (g: CircuitGate) => g.y + gateHeight(g.in.length) / 2;
const outX = (g: CircuitGate) => g.x + GATE_W;

function GateShape({ type, x, y, h, on, changed }: { type: GateType; x: number; y: number; h: number; on: boolean; changed: boolean }) {
  const inverting = type === "NOT" || type === "NAND" || type === "NOR" || type === "XNOR";
  const orLike = type === "OR" || type === "NOR" || type === "XOR" || type === "XNOR";
  const triangle = type === "NOT" || type === "BUF";
  const m = h / 2;
  const body = triangle
    ? `M0,${m - 18} L44,${m} L0,${m + 18} Z`
    : orLike
      ? `M0,0 Q16,${m} 0,${h} Q30,${h} 50,${m} Q30,0 0,0 Z`
      : `M0,0 H26 A24,${m} 0 0 1 26,${h} H0 Z`;
  const stroke = changed ? "stroke-neon" : on ? "stroke-mint" : "stroke-foreground/60";
  return (
    <g transform={`translate(${x},${y})`} className="transition-colors">
      <path d={`M${triangle ? 44 : 50},${m}H${GATE_W}`} className={on ? "stroke-mint" : "stroke-muted-foreground/45"} strokeWidth={2.2} />
      <path d={body} className={`fill-card ${stroke}`} strokeWidth={2} strokeLinejoin="round" />
      {(type === "XOR" || type === "XNOR") && <path d={`M-7,0 Q9,${m} -7,${h}`} fill="none" className={stroke} strokeWidth={2} />}
      {inverting && <circle cx={triangle ? 48 : 54} cy={m} r={4.2} className={`fill-card ${stroke}`} strokeWidth={2} />}
    </g>
  );
}

export const wireClass = (on: boolean, changed: boolean) => (changed ? "stroke-neon" : on ? "stroke-mint" : "stroke-muted-foreground/45");

/** Draws a laid-out circuit at a given set of signal values. */
export function CircuitDrawing({ layout, values, changed, onToggle }: { layout: CircuitLayout; values: Signals; changed?: Set<string>; onToggle?: (id: string) => void }) {
  const sources = useMemo(() => {
    const m = new Map<string, [number, number]>();
    layout.inputs.forEach((i) => m.set(i.id, [i.x + 18, i.y]));
    layout.gates.forEach((g) => m.set(g.id, [outX(g), outY(g)]));
    return m;
  }, [layout]);
  const fanout = useMemo(() => {
    const m = new Map<string, number>();
    const bump = (id: string) => m.set(id, (m.get(id) ?? 0) + 1);
    layout.gates.forEach((g) => g.in.forEach(bump));
    layout.outputs.forEach((o) => bump(o.from));
    return m;
  }, [layout]);

  const wires = layout.gates.flatMap((g) =>
    g.in.map((src, i) => {
      const [sx, sy] = sources.get(src) ?? [0, 0];
      const tx = g.x + 8;
      const ty = pinY(g, i);
      const custom = g.route?.[i];
      const mid = g.mid?.[i] ?? (sx + tx) / 2;
      const pts: [number, number][] = custom ?? [[mid, sy], [mid, ty]];
      const d = `M${sx},${sy} ${pts.map(([x, y]) => `L${x},${y}`).join(" ")} L${tx},${ty}`;
      const dot = (fanout.get(src) ?? 0) > 1 ? pts[0] : null;
      return { key: `${g.id}:${i}`, src, d, dot };
    }),
  );
  const outWires = layout.outputs.map((o) => {
    const [sx, sy] = sources.get(o.from) ?? [0, 0];
    return { key: `out:${o.id}`, src: o.from, d: `M${sx},${sy} H${(sx + o.x) / 2} V${o.y} H${o.x}` };
  });

  return (
    <svg viewBox={`-20 0 ${layout.w + 20} ${layout.h}`} className="w-full max-w-[640px] mx-auto block" role="img" aria-label="Logic circuit">
      {/* LOW wires first, so a HIGH wire is never painted over at a crossing */}
      {[...wires, ...outWires]
        .slice()
        .sort((a, b) => (values[a.src] ?? 0) - (values[b.src] ?? 0))
        .map((w) => (
          <path key={w.key} d={w.d} fill="none" strokeWidth={values[w.src] ? 2.6 : 2} strokeLinejoin="round" className={`transition-colors duration-150 motion-reduce:transition-none ${wireClass(!!values[w.src], !!changed?.has(w.src))}`} />
        ))}
      {wires.map((w) => w.dot && <circle key={`dot-${w.key}`} cx={w.dot[0]} cy={w.dot[1]} r={3} className={values[w.src] ? "fill-mint" : "fill-muted-foreground/45"} />)}
      {layout.gates.map((g) => (
        <GateShape key={g.id} type={g.type} x={g.x} y={g.y} h={gateHeight(g.in.length)} on={!!values[g.id]} changed={!!changed?.has(g.id)} />
      ))}
      {layout.inputs.map((i) => {
        const on = !!values[i.id];
        return (
          <g
            key={i.id}
            role={onToggle ? "button" : undefined}
            tabIndex={onToggle ? 0 : undefined}
            aria-label={onToggle ? `Input ${i.label}, currently ${on ? 1 : 0}. Activate to flip.` : undefined}
            aria-pressed={onToggle ? on : undefined}
            onClick={onToggle ? () => onToggle(i.id) : undefined}
            onKeyDown={onToggle ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(i.id); } } : undefined}
            className={onToggle ? "cursor-pointer focus:outline-none [&:focus-visible>rect]:stroke-foreground" : undefined}
          >
            <rect x={i.x - 18} y={i.y - 15} width={36} height={30} rx={3} strokeWidth={2} className={on ? "fill-mint/25 stroke-mint" : "fill-background stroke-border"} />
            <text x={i.x} y={i.y + 5} textAnchor="middle" className="fill-foreground font-mono text-[14px] font-bold select-none">{on ? 1 : 0}</text>
            <text x={i.x - 24} y={i.y + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[12px] select-none">{i.label}</text>
          </g>
        );
      })}
      {layout.outputs.map((o) => {
        const on = !!values[o.from];
        return (
          <g key={o.id}>
            <circle cx={o.x + 14} cy={o.y} r={14} strokeWidth={2} className={on ? "fill-mint/30 stroke-mint" : "fill-background stroke-border"} />
            <text x={o.x + 14} y={o.y + 5} textAnchor="middle" className="fill-foreground font-mono text-[13px] font-bold">{on ? 1 : 0}</text>
            <text x={o.x + 34} y={o.y + 4} className="fill-muted-foreground font-mono text-[12px]">{o.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export type CircuitAction = { label: string; steps: Record<string, Bit>[] };

const LEGEND: [string, string][] = [["bg-mint", "HIGH (1)"], ["bg-muted-foreground/45", "LOW (0)"], ["bg-neon", "just changed"]];

function nameOf(layout: CircuitLayout, id: string) {
  const g = layout.gates.find((x) => x.id === id);
  return g?.name ?? g?.type ?? id;
}

/** Flip an input and watch the change move through the gates at a pace you can follow. */
export function LiveCircuit({
  title,
  layout,
  seed = {},
  actions,
  explain,
  rows,
}: {
  title: string;
  layout: CircuitLayout;
  /** initial values for inputs and for gates in a feedback loop */
  seed?: Signals;
  /** one-click input sequences, e.g. pressing and releasing Set */
  actions?: CircuitAction[];
  /** plain-English reading of the settled state */
  explain?: (v: Signals) => string;
  /** a function table: the row matching the current signals lights up */
  rows?: { cols: string[]; data: { match: Signals; cells: (string | number)[]; note?: string }[] };
}) {
  const start = useMemo(() => {
    const base: Signals = { ...seed };
    layout.inputs.forEach((i) => (base[i.id] ??= 0));
    return settle(layout.gates, {}, base, 30).frames.at(-1) as Signals;
  }, [layout, seed]);
  const [values, setValues] = useState<Signals>(start);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("Click an input to flip it.");
  const [delay, setDelay] = useState(600);
  const [running, setRunning] = useState(false);
  const live = useRef(start);
  const token = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => {
    token.current++;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const run = useCallback(
    (steps: Record<string, Bit>[]) => {
      const mine = ++token.current;
      if (timer.current) clearTimeout(timer.current);
      const instant = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const wait = (ms: number, then: () => void) => {
        if (instant) then();
        else timer.current = setTimeout(() => mine === token.current && then(), ms);
      };
      setRunning(true);
      const doStep = (s: number) => {
        if (s >= steps.length) {
          setRunning(false);
          setChanged(new Set());
          setNote(explain ? explain(live.current) : "Settled.");
          return;
        }
        const inputsChanged = Object.keys(steps[s]).filter((k) => live.current[k] !== steps[s][k]);
        const { frames, stable } = settle(layout.gates, steps[s], live.current);
        const flips = inputsChanged.map((k) => `${layout.inputs.find((i) => i.id === k)?.label ?? k} → ${steps[s][k]}`).join(", ");
        const show = (f: number) => {
          const cur = frames[f];
          const prev = f === 0 ? live.current : frames[f - 1];
          const diff = layout.gates.filter((g) => cur[g.id] !== prev[g.id]).map((g) => g.id);
          live.current = cur;
          setValues(cur);
          setChanged(new Set(f === 0 ? inputsChanged : diff));
          setNote(
            f === 0
              ? `${flips || "No input changed"}. The gates haven't reacted yet.`
              : `One gate delay later: ${diff.map((id) => `${nameOf(layout, id)} output → ${cur[id]}`).join(", ")}.`,
          );
          if (f + 1 < frames.length) wait(delay, () => show(f + 1));
          else if (!stable) {
            setRunning(false);
            setNote("It never settles: the outputs keep chasing each other around the loop. Real hardware falls to 0 or 1 at random.");
          } else wait(s + 1 < steps.length ? delay * 1.5 : delay, () => doStep(s + 1));
        };
        show(0);
      };
      doStep(0);
    },
    [delay, explain, layout],
  );

  const toggle = (id: string) => run([{ [id]: live.current[id] ? 0 : 1 }]);
  const reset = () => {
    token.current++;
    if (timer.current) clearTimeout(timer.current);
    live.current = start;
    setValues(start);
    setChanged(new Set());
    setRunning(false);
    setNote("Click an input to flip it.");
  };

  const activeRow = rows?.data.findIndex((r) => Object.entries(r.match).every(([k, v]) => values[k] === v));

  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="eyebrow text-neon">{title}</div>
        <Legend items={LEGEND} />
      </div>
      <div className="p-5 flex flex-col gap-4">
        <CircuitDrawing layout={layout} values={values} changed={changed} onToggle={toggle} />
        <p aria-live="polite" className="min-h-[3em] text-sm leading-relaxed">{note}</p>
        <div className="flex flex-wrap items-center gap-2">
          {actions?.map((a) => (
            <button key={a.label} type="button" className={btn} onClick={() => run(a.steps)}>{a.label}</button>
          ))}
          <button type="button" className={btn} onClick={reset}>⟲ Reset</button>
          <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            pace
            <select value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="bg-transparent border border-border rounded-sm px-2 py-1.5 text-foreground">
              <option value={1300}>slow motion</option>
              <option value={600}>normal</option>
              <option value={150}>fast</option>
            </select>
          </label>
          {running && <span className="font-mono text-[10px] uppercase tracking-widest text-neon">signal moving…</span>}
        </div>
        {rows && (
          <div className="overflow-x-auto">
            <table className="font-mono text-[12px] border-collapse">
              <thead>
                <tr>{rows.cols.map((c) => <th key={c} className="px-3 py-1 text-left font-semibold text-muted-foreground border-b border-border">{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.data.map((r, i) => (
                  <tr key={i} className={i === activeRow && !running ? "bg-mint/15" : ""}>
                    {r.cells.map((c, j) => <td key={j} className="px-3 py-1 border-b border-border/50">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- gate playground --------------------------- */

const TWO_INPUT: GateType[] = ["AND", "OR", "NAND", "NOR", "XOR", "XNOR", "NOT", "BUF"];
const GATE_STORY: Record<GateType, string> = {
  AND: "Two switches in a row. Current gets through only if both are closed.",
  OR: "Two switches side by side. Either one is enough.",
  NOT: "Whatever comes in, the opposite goes out.",
  BUF: "Output copies input. It does no logic; it boosts a weak signal so it can travel further.",
  NAND: "An AND with its answer flipped: the output drops to 0 only when every input is 1.",
  NOR: "An OR with its answer flipped: the output is 1 only when every input is 0.",
  XOR: "The two-way light switch on a staircase: 1 when the inputs differ.",
  XNOR: "An equality tester: 1 when the inputs match.",
};
const GATE_EXPR: Record<GateType, string> = { AND: "X = A·B", OR: "X = A + B", NOT: "X = A'", BUF: "X = A", NAND: "X = (A·B)'", NOR: "X = (A + B)'", XOR: "X = A ⊕ B", XNOR: "X = (A ⊕ B)'" };

export function GatePlayground({ start = "AND" }: { start?: GateType }) {
  const [type, setType] = useState<GateType>(start);
  const [a, setA] = useState<Bit>(0);
  const [b, setB] = useState<Bit>(0);
  const single = type === "NOT" || type === "BUF";
  const layout: CircuitLayout = useMemo(() => ({
    w: 330,
    h: 130,
    inputs: single ? [{ id: "A", label: "A", x: 40, y: 65 }] : [{ id: "A", label: "A", x: 40, y: 40 }, { id: "B", label: "B", x: 40, y: 90 }],
    gates: [{ id: "X", type, x: 130, y: 45, in: single ? ["A"] : ["A", "B"] }],
    outputs: [{ id: "out", label: "X", x: 245, y: 65, from: "X" }],
  }), [type, single]);
  const inputs = single ? [a] : [a, b];
  const x = evalGate(type, inputs);
  const rows = truthRows(single ? ["A"] : ["A", "B"]);
  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="eyebrow text-neon">Gate playground</div>
        <Legend items={LEGEND.slice(0, 2)} />
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a gate">
          {TWO_INPUT.map((t) => (
            <button key={t} type="button" aria-pressed={t === type} onClick={() => setType(t)} className={`${btn} ${t === type ? "bg-foreground text-background" : ""}`}>{t}</button>
          ))}
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center">
          <CircuitDrawing layout={layout} values={{ A: a, B: b, X: x }} onToggle={(id) => (id === "A" ? setA(a ? 0 : 1) : setB(b ? 0 : 1))} />
          <table className="font-mono text-[13px] border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-1 border-b border-border">A</th>
                {!single && <th className="px-3 py-1 border-b border-border">B</th>}
                <th className="px-3 py-1 border-b border-border text-mint">X</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ env, m }) => {
                const active = env.A === a && (single || env.B === b);
                return (
                  <tr key={m} className={active ? "bg-mint/20" : ""}>
                    <td className="px-3 py-0.5 text-center">{env.A}</td>
                    {!single && <td className="px-3 py-0.5 text-center">{env.B}</td>}
                    <td className="px-3 py-0.5 text-center font-bold">{evalGate(type, single ? [env.A] : [env.A, env.B])}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-relaxed"><span className="font-mono text-mint mr-2">{GATE_EXPR[type]}</span>{GATE_STORY[type]}</p>
      </div>
    </div>
  );
}

/* -------------------------------- latches ------------------------------ */

const SR_NOR: CircuitLayout = {
  w: 400,
  h: 250,
  inputs: [{ id: "R", label: "R", x: 50, y: 55 }, { id: "S", label: "S", x: 50, y: 195 }],
  gates: [
    { id: "Q", type: "NOR", x: 180, y: 35, in: ["R", "Qn"], name: "top NOR", mid: { 0: 150 }, route: { 1: [[272, 175], [272, 150], [135, 100], [135, 67]] } },
    { id: "Qn", type: "NOR", x: 180, y: 155, in: ["Q", "S"], name: "bottom NOR", mid: { 1: 150 }, route: { 0: [[272, 55], [272, 80], [135, 130], [135, 168]] } },
  ],
  outputs: [{ id: "oQ", label: "Q", x: 310, y: 55, from: "Q" }, { id: "oQn", label: "Q'", x: 310, y: 175, from: "Qn" }],
};

const srRead = (v: Signals) => {
  if (v.S && v.R) return "S and R are both 1, so both gates are forced to 0 and Q no longer equals the opposite of Q'. Nothing useful is being stored. Don't do this.";
  if (v.S) return "S is held at 1: the latch stores 1 (Q = 1). Now let go of S and watch what happens: nothing.";
  if (v.R) return "R is held at 1: the latch stores 0 (Q = 0).";
  return v.Q
    ? "Both inputs are 0 and yet Q stays 1. Q' = 0 keeps the top gate's output at 1, and that 1 keeps the bottom gate's output at 0. The loop is holding the bit. This is memory."
    : "Both inputs are 0 and Q stays 0. Q = 0 keeps the bottom gate's output at 1, and that 1 keeps the top gate's output at 0. The loop is holding the bit.";
};

export function SrLatchNor() {
  return (
    <LiveCircuit
      title="SR latch from two NOR gates"
      layout={SR_NOR}
      seed={{ Q: 0, Qn: 1 }}
      explain={srRead}
      actions={[
        { label: "Press Set", steps: [{ S: 1, R: 0 }, { S: 0, R: 0 }] },
        { label: "Press Reset", steps: [{ S: 0, R: 1 }, { S: 0, R: 0 }] },
        { label: "Both, then release", steps: [{ S: 1, R: 1 }, { S: 0, R: 0 }] },
      ]}
      rows={{
        cols: ["S", "R", "Q", "Q'", "meaning"],
        data: [
          { match: { S: 1, R: 0 }, cells: [1, 0, 1, 0, "set: store 1"] },
          { match: { S: 0, R: 0, Q: 1, Qn: 0 }, cells: [0, 0, 1, 0, "hold the 1"] },
          { match: { S: 0, R: 1 }, cells: [0, 1, 0, 1, "reset: store 0"] },
          { match: { S: 0, R: 0, Q: 0, Qn: 1 }, cells: [0, 0, 0, 1, "hold the 0"] },
          { match: { S: 1, R: 1 }, cells: [1, 1, 0, 0, "forbidden"] },
        ],
      }}
    />
  );
}

const SR_NAND: CircuitLayout = {
  w: 400,
  h: 250,
  inputs: [{ id: "S", label: "S", x: 50, y: 55 }, { id: "R", label: "R", x: 50, y: 195 }],
  gates: [
    { id: "Q", type: "NAND", x: 180, y: 35, in: ["S", "Qn"], name: "top NAND", mid: { 0: 150 }, route: { 1: [[272, 175], [272, 150], [135, 100], [135, 67]] } },
    { id: "Qn", type: "NAND", x: 180, y: 155, in: ["Q", "R"], name: "bottom NAND", mid: { 1: 150 }, route: { 0: [[272, 55], [272, 80], [135, 130], [135, 168]] } },
  ],
  outputs: [{ id: "oQ", label: "Q", x: 310, y: 55, from: "Q" }, { id: "oQn", label: "Q'", x: 310, y: 175, from: "Qn" }],
};

export function SrLatchNand() {
  return (
    <LiveCircuit
      title="SR latch from two NAND gates (inputs active low)"
      layout={SR_NAND}
      seed={{ S: 1, R: 1, Q: 0, Qn: 1 }}
      explain={(v) => {
        if (!v.S && !v.R) return "Both inputs are 0, so both outputs are forced to 1. This is the forbidden state for the NAND version.";
        if (!v.S) return "S is held at 0: that is the active level here, so the latch stores 1.";
        if (!v.R) return "R is held at 0: the latch stores 0.";
        return `Both inputs rest at 1 and the loop holds Q = ${v.Q}.`;
      }}
      actions={[
        { label: "Press Set (pull S low)", steps: [{ S: 0, R: 1 }, { S: 1, R: 1 }] },
        { label: "Press Reset (pull R low)", steps: [{ S: 1, R: 0 }, { S: 1, R: 1 }] },
      ]}
      rows={{
        cols: ["S", "R", "Q", "Q'", "meaning"],
        data: [
          { match: { S: 0, R: 1 }, cells: [0, 1, 1, 0, "set: store 1"] },
          { match: { S: 1, R: 1, Q: 1, Qn: 0 }, cells: [1, 1, 1, 0, "hold the 1"] },
          { match: { S: 1, R: 0 }, cells: [1, 0, 0, 1, "reset: store 0"] },
          { match: { S: 1, R: 1, Q: 0, Qn: 1 }, cells: [1, 1, 0, 1, "hold the 0"] },
          { match: { S: 0, R: 0 }, cells: [0, 0, 1, 1, "forbidden"] },
        ],
      }}
    />
  );
}

const crossNand = (s: string, r: string, y0 = 30, x = 260): CircuitGate[] => [
  { id: "Q", type: "NAND", x, y: y0, in: [s, "Qn"], name: "output NAND (top)", mid: { 0: x - 25 }, route: { 1: [[x + 90, y0 + 130], [x + 90, y0 + 100], [x - 40, y0 + 65], [x - 40, y0 + 30]] } },
  { id: "Qn", type: "NAND", x, y: y0 + 110, in: ["Q", r], name: "output NAND (bottom)", mid: { 1: x - 25 }, route: { 0: [[x + 90, y0 + 20], [x + 90, y0 + 50], [x - 40, y0 + 85], [x - 40, y0 + 123]] } },
];

const GATED_SR: CircuitLayout = {
  w: 480,
  h: 220,
  inputs: [{ id: "S", label: "S", x: 40, y: 45 }, { id: "C", label: "C", x: 40, y: 110 }, { id: "R", label: "R", x: 40, y: 175 }],
  gates: [
    { id: "ns", type: "NAND", x: 120, y: 30, in: ["S", "C"], name: "input NAND (top)" },
    { id: "nr", type: "NAND", x: 120, y: 150, in: ["C", "R"], name: "input NAND (bottom)" },
    ...crossNand("ns", "nr", 30, 270),
  ],
  outputs: [{ id: "oQ", label: "Q", x: 385, y: 50, from: "Q" }, { id: "oQn", label: "Q'", x: 385, y: 160, from: "Qn" }],
};

export function GatedSrLatch() {
  return (
    <LiveCircuit
      title="SR latch with a control input"
      layout={GATED_SR}
      seed={{ C: 0, S: 0, R: 0, ns: 1, nr: 1, Q: 0, Qn: 1 }}
      explain={(v) => (v.C ? `C is 1: the door is open and S, R reach the latch. Q = ${v.Q}.` : `C is 0: both input gates sit at 1 whatever S and R do. The latch can't hear them and holds Q = ${v.Q}.`)}
      actions={[
        { label: "S=1 while C=0", steps: [{ C: 0, S: 1, R: 0 }] },
        { label: "Now open C", steps: [{ C: 1 }] },
        { label: "Close C, change to R", steps: [{ C: 0 }, { S: 0, R: 1 }] },
      ]}
      rows={{
        cols: ["C", "S", "R", "next Q"],
        data: [
          { match: { C: 0 }, cells: [0, "x", "x", "no change"] },
          { match: { C: 1, S: 0, R: 0 }, cells: [1, 0, 0, "no change"] },
          { match: { C: 1, S: 0, R: 1 }, cells: [1, 0, 1, "0"] },
          { match: { C: 1, S: 1, R: 0 }, cells: [1, 1, 0, "1"] },
          { match: { C: 1, S: 1, R: 1 }, cells: [1, 1, 1, "forbidden"] },
        ],
      }}
    />
  );
}

const D_LATCH: CircuitLayout = {
  w: 480,
  h: 230,
  inputs: [{ id: "D", label: "D", x: 40, y: 50 }, { id: "C", label: "C", x: 40, y: 120 }],
  gates: [
    { id: "ndn", type: "NOT", x: 80, y: 165, in: ["D"], name: "inverter", route: { 0: [[62, 50], [62, 185]] } },
    { id: "ns", type: "NAND", x: 170, y: 40, in: ["D", "C"], name: "input NAND (top)", mid: { 1: 110 } },
    { id: "nr", type: "NAND", x: 170, y: 150, in: ["C", "ndn"], name: "input NAND (bottom)", mid: { 0: 110, 1: 150 } },
    ...crossNand("ns", "nr", 40, 280),
  ],
  outputs: [{ id: "oQ", label: "Q", x: 395, y: 60, from: "Q" }, { id: "oQn", label: "Q'", x: 395, y: 170, from: "Qn" }],
};

export function DLatch() {
  return (
    <LiveCircuit
      title="D latch"
      layout={D_LATCH}
      seed={{ D: 0, C: 0, ndn: 1, ns: 1, nr: 1, Q: 0, Qn: 1 }}
      explain={(v) => (v.C ? `C is 1: the latch is see-through, so Q simply follows D. Q = ${v.Q}.` : `C is 0: the latch is closed. Change D all you like; Q stays at ${v.Q}.`)}
      actions={[
        { label: "Store a 1", steps: [{ D: 1 }, { C: 1 }, { C: 0 }, { D: 0 }] },
        { label: "Store a 0", steps: [{ D: 0 }, { C: 1 }, { C: 0 }, { D: 1 }] },
      ]}
      rows={{
        cols: ["C", "D", "Q"],
        data: [
          { match: { C: 0 }, cells: [0, "x", "no change"] },
          { match: { C: 1, D: 0 }, cells: [1, 0, "0"] },
          { match: { C: 1, D: 1 }, cells: [1, 1, "1"] },
        ],
      }}
    />
  );
}

/* ---------------------------- combinational ---------------------------- */

const HALF_ADDER: CircuitLayout = {
  w: 380,
  h: 190,
  inputs: [{ id: "A", label: "A", x: 40, y: 50 }, { id: "B", label: "B", x: 40, y: 130 }],
  gates: [
    { id: "sum", type: "XOR", x: 170, y: 30, in: ["A", "B"], name: "XOR", mid: { 0: 110, 1: 90 } },
    { id: "carry", type: "AND", x: 170, y: 120, in: ["A", "B"], name: "AND", mid: { 0: 110, 1: 90 } },
  ],
  outputs: [{ id: "oS", label: "Sum", x: 280, y: 50, from: "sum" }, { id: "oC", label: "Carry", x: 280, y: 140, from: "carry" }],
};

export function HalfAdderCircuit() {
  return <LiveCircuit title="Half adder" layout={HALF_ADDER} explain={(v) => `${v.A} + ${v.B} = ${v.carry}${v.sum} in binary (carry ${v.carry}, sum ${v.sum}).`}
    rows={{ cols: ["A", "B", "Carry", "Sum"], data: [0, 1, 2, 3].map((n) => { const a = (n >> 1) as Bit; const b = (n & 1) as Bit; return { match: { A: a, B: b }, cells: [a, b, a & b, a ^ b] }; }) }} />;
}

const FULL_ADDER: CircuitLayout = {
  w: 560,
  h: 240,
  inputs: [{ id: "A", label: "A", x: 40, y: 45 }, { id: "B", label: "B", x: 40, y: 95 }, { id: "Cin", label: "Cin", x: 40, y: 200 }],
  gates: [
    { id: "x1", type: "XOR", x: 130, y: 35, in: ["A", "B"], name: "first XOR", mid: { 0: 100, 1: 85 } },
    { id: "a1", type: "AND", x: 130, y: 110, in: ["A", "B"], name: "first AND", mid: { 0: 100, 1: 85 } },
    { id: "s", type: "XOR", x: 270, y: 50, in: ["x1", "Cin"], name: "second XOR", mid: { 0: 225, 1: 240 } },
    { id: "a2", type: "AND", x: 270, y: 165, in: ["x1", "Cin"], name: "second AND", mid: { 0: 225, 1: 240 } },
    { id: "c", type: "OR", x: 390, y: 130, in: ["a1", "a2"], name: "OR", mid: { 0: 365, 1: 350 } },
  ],
  outputs: [{ id: "oS", label: "Sum", x: 480, y: 70, from: "s" }, { id: "oC", label: "Cout", x: 480, y: 150, from: "c" }],
};

export function FullAdderCircuit() {
  return <LiveCircuit title="Full adder: two half adders and an OR" layout={FULL_ADDER} explain={(v) => `${v.A} + ${v.B} + ${v.Cin} = ${v.A + v.B + v.Cin}, written ${v.c}${v.s} in binary: Sum ${v.s}, Cout ${v.c}.`} />;
}

const DECODER: CircuitLayout = {
  w: 490,
  h: 300,
  inputs: [{ id: "A1", label: "A1", x: 40, y: 40 }, { id: "A0", label: "A0", x: 40, y: 100 }],
  gates: [
    { id: "n1", type: "NOT", x: 80, y: 175, in: ["A1"], name: "A1 inverter", route: { 0: [[62, 40], [62, 195]] } },
    { id: "n0", type: "NOT", x: 80, y: 235, in: ["A0"], name: "A0 inverter", route: { 0: [[70, 100], [70, 255]] } },
    ...[
      ["y0", "n1", "n0", 15],
      ["y1", "n1", "A0", 85],
      ["y2", "A1", "n0", 155],
      ["y3", "A1", "A0", 225],
    ].map(([id, a, b, y], i) => ({ id: id as string, type: "AND" as GateType, x: 290, y: y as number, in: [a as string, b as string], name: `output ${i} AND`, mid: { 0: 190 + i * 14, 1: 250 - i * 10 } })),
  ],
  outputs: [0, 1, 2, 3].map((i) => ({ id: `o${i}`, label: `line ${i}`, x: 385, y: 35 + 70 * i, from: `y${i}` })),
};

export function DecoderCircuit() {
  return <LiveCircuit title="2-to-4 decoder" layout={DECODER} seed={{ n1: 1, n0: 1 }} explain={(v) => `Binary ${v.A1}${v.A0} = ${v.A1 * 2 + v.A0}, so exactly one output is on: line ${v.A1 * 2 + v.A0}.`} />;
}

const MUX2: CircuitLayout = {
  w: 480,
  h: 240,
  inputs: [{ id: "D0", label: "D0", x: 40, y: 40 }, { id: "D1", label: "D1", x: 40, y: 110 }, { id: "S", label: "S", x: 40, y: 190 }],
  gates: [
    { id: "ns", type: "NOT", x: 90, y: 170, in: ["S"], name: "inverter", mid: { 0: 70 } },
    { id: "a0", type: "AND", x: 230, y: 30, in: ["D0", "ns"], name: "D0 AND", mid: { 1: 170 } },
    { id: "a1", type: "AND", x: 230, y: 130, in: ["D1", "S"], name: "D1 AND", mid: { 0: 120, 1: 205 } },
    { id: "y", type: "OR", x: 330, y: 80, in: ["a0", "a1"], name: "OR" },
  ],
  outputs: [{ id: "oY", label: "Y", x: 415, y: 100, from: "y" }],
};

export function MuxCircuit() {
  return <LiveCircuit title="2-input multiplexer" layout={MUX2} seed={{ ns: 1 }} explain={(v) => `S = ${v.S} picks D${v.S}. Y copies it: Y = ${v.y}. The other input is shut out by its AND gate.`} />;
}

const DEMUX: CircuitLayout = {
  w: 460,
  h: 240,
  inputs: [{ id: "D", label: "D", x: 40, y: 50 }, { id: "S", label: "S", x: 40, y: 180 }],
  gates: [
    { id: "ns", type: "NOT", x: 90, y: 160, in: ["S"], name: "inverter", mid: { 0: 70 } },
    { id: "y0", type: "AND", x: 260, y: 40, in: ["D", "ns"], name: "Y0 AND", mid: { 0: 180, 1: 200 } },
    { id: "y1", type: "AND", x: 260, y: 150, in: ["D", "S"], name: "Y1 AND", mid: { 0: 180, 1: 160 } },
  ],
  outputs: [{ id: "o0", label: "Y0", x: 370, y: 60, from: "y0" }, { id: "o1", label: "Y1", x: 370, y: 170, from: "y1" }],
};

export function DemuxCircuit() {
  return <LiveCircuit title="1-to-2 demultiplexer" layout={DEMUX} seed={{ ns: 1 }} explain={(v) => `S = ${v.S} sends D to Y${v.S}. The other output stays 0.`} />;
}

const EQ2: CircuitLayout = {
  w: 480,
  h: 240,
  inputs: [
    { id: "A1", label: "A1", x: 40, y: 35 }, { id: "B1", label: "B1", x: 40, y: 85 },
    { id: "A0", label: "A0", x: 40, y: 155 }, { id: "B0", label: "B0", x: 40, y: 205 },
  ],
  gates: [
    { id: "e1", type: "XNOR", x: 150, y: 40, in: ["A1", "B1"], name: "top XNOR" },
    { id: "e0", type: "XNOR", x: 150, y: 160, in: ["A0", "B0"], name: "bottom XNOR" },
    { id: "eq", type: "AND", x: 290, y: 100, in: ["e1", "e0"], name: "AND" },
  ],
  outputs: [{ id: "oE", label: "A = B", x: 385, y: 120, from: "eq" }],
};

export function EqualityCircuit() {
  return <LiveCircuit title="2-bit equality comparator" layout={EQ2} seed={{ e1: 1, e0: 1 }} explain={(v) => `A = ${v.A1}${v.A0}, B = ${v.B1}${v.B0}. Bit 1 ${v.e1 ? "matches" : "differs"}, bit 0 ${v.e0 ? "matches" : "differs"}, so A ${v.eq ? "=" : "≠"} B.`} />;
}

/* --------------------------- universal gates --------------------------- */

const NAND_BUILDS: Record<string, { layout: CircuitLayout; note: string }> = {
  NOT: {
    note: "Tie both inputs together. NAND(A, A) = A'.",
    layout: { w: 330, h: 100, inputs: [{ id: "A", label: "A", x: 40, y: 50 }], gates: [{ id: "x", type: "NAND", x: 140, y: 30, in: ["A", "A"], mid: { 0: 100, 1: 100 } }], outputs: [{ id: "o", label: "NOT A", x: 240, y: 50, from: "x" }] },
  },
  AND: {
    note: "A NAND is an AND with the answer flipped. Flip it back with a second NAND.",
    layout: { w: 420, h: 110, inputs: [{ id: "A", label: "A", x: 40, y: 30 }, { id: "B", label: "B", x: 40, y: 80 }], gates: [{ id: "n", type: "NAND", x: 110, y: 35, in: ["A", "B"] }, { id: "x", type: "NAND", x: 220, y: 35, in: ["n", "n"], mid: { 0: 195, 1: 195 } }], outputs: [{ id: "o", label: "A AND B", x: 320, y: 55, from: "x" }] },
  },
  OR: {
    note: "De Morgan: A + B = (A'·B')'. Invert each input, then NAND them.",
    layout: { w: 440, h: 160, inputs: [{ id: "A", label: "A", x: 40, y: 35 }, { id: "B", label: "B", x: 40, y: 125 }], gates: [{ id: "na", type: "NAND", x: 110, y: 15, in: ["A", "A"], mid: { 0: 85, 1: 85 } }, { id: "nb", type: "NAND", x: 110, y: 105, in: ["B", "B"], mid: { 0: 85, 1: 85 } }, { id: "x", type: "NAND", x: 230, y: 60, in: ["na", "nb"] }], outputs: [{ id: "o", label: "A OR B", x: 335, y: 80, from: "x" }] },
  },
};

export function NandBuilds() {
  const [which, setWhich] = useState("NOT");
  const build = NAND_BUILDS[which];
  return (
    <div>
      <div className="not-prose flex flex-wrap gap-1.5 mt-6" role="group" aria-label="Choose what to build from NAND">
        {Object.keys(NAND_BUILDS).map((k) => (
          <button key={k} type="button" aria-pressed={k === which} onClick={() => setWhich(k)} className={`${btn} ${k === which ? "bg-foreground text-background" : ""}`}>{k} from NAND</button>
        ))}
      </div>
      <LiveCircuit key={which} title={`${which} built only from NAND`} layout={build.layout} explain={() => build.note} />
    </div>
  );
}
