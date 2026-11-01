import { useEffect, useMemo, useRef, useState } from "react";
import { btn, Legend, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { inverseFrames, MATLAB_INVERSE, apply2, det2, diagOf, diagOnly, kron, kronFrames, MAGIC4, MATLAB_KRON, MATLAB_NORM, normFrames, tril, triu, type NormKind, elementwiseFrames, MAGIC3, MATLAB_ELEMENTWISE, MATLAB_MATMUL, matMulFrames, type Map2, MATLAB_VECTOR_PRODUCT, pascal, transpose, vectorProductFrames, type ElementwiseOp, type Mat, type VectorProductKind } from "@/lib/matrix";

/* ============================================================
   Visualizers for the Computational Mathematics course. Matrix
   entries are absolutely positioned and keyed by identity, so a
   row swap or a transpose makes the numbers travel. Colours follow
   AlgoVisualizers: neon = looking at, orange = writing, mint = done,
   violet = special, sky = active window.
   ============================================================ */

export function Panel({ title, legend, children }: { title: string; legend?: [string, string][]; children: React.ReactNode }) {
  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="eyebrow text-mint">{title}</div>
        {legend && <Legend items={legend} />}
      </div>
      <div className="p-5 flex flex-col gap-4 overflow-x-auto">{children}</div>
    </div>
  );
}

/** Eases `target` in on every change. Reduced-motion users get the end state straight away. */
export function useTween(target: number[], ms = 650): [number[], (from: number[]) => void] {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const key = target.join(",");
  const [restart, setRestart] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame === "undefined") {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const next = target.map((x, i) => (from[i] ?? x) + (x - (from[i] ?? x)) * e);
      current.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // the serialized key stands in for the array; restart replays from a new start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, restart, ms]);
  const replayFrom = (from: number[]) => {
    current.current = from;
    setValue(from);
    setRestart((r) => r + 1);
  };
  return [value, replayFrom];
}

export type CellTone = "neon" | "orange" | "sky" | "violet" | "mint" | "muted";

const TONE: Record<CellTone, string> = {
  neon: "border-neon bg-neon/20",
  orange: "border-orange bg-orange/15",
  sky: "border-sky bg-sky/15",
  violet: "border-violet bg-violet/15",
  mint: "border-mint bg-mint/15",
  muted: "border-border/50 text-muted-foreground/50",
};

export type StageCell = { id: string; row: number; col: number; text: string; tone?: CellTone; hidden?: boolean };

/** A bracketed matrix whose cells slide, recolour and fade between states. */
export function MatrixStage({ rows, cols, cells, label, size = 42 }: { rows: number; cols: number; cells: StageCell[]; label?: React.ReactNode; size?: number }) {
  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div
        className="relative border-x-2 border-foreground/50 rounded-[5px] transition-[width,height] duration-500 ease-out motion-reduce:transition-none box-content px-1 py-1"
        style={{ width: cols * size, height: rows * size }}
      >
        {cells.map((c) => (
          <div
            key={c.id}
            className={`absolute left-1 top-1 flex items-center justify-center rounded-sm border font-mono text-[13px] transition-[transform,opacity,background-color,border-color] duration-500 ease-out motion-reduce:transition-none ${c.tone ? TONE[c.tone] : "border-border bg-background/50"}`}
            style={{
              width: size - 4,
              height: size - 4,
              transform: `translate(${c.col * size + 2}px, ${c.row * size + 2}px) scale(${c.hidden ? 0.5 : 1})`,
              opacity: c.hidden ? 0 : 1,
            }}
          >
            {c.text}
          </div>
        ))}
      </div>
      {label && <div className="font-mono text-[11px] text-muted-foreground">{label}</div>}
    </div>
  );
}

/** Stage cells for a plain matrix. `tone` and `fmt` decide each entry's look. */
export function matCells(a: (number | string | null)[][], prefix: string, tone?: (i: number, j: number) => CellTone | undefined): StageCell[] {
  return a.flatMap((r, i) =>
    r.map((v, j) => ({ id: `${prefix}${i}-${j}`, row: i, col: j, text: v === null ? "" : String(v), hidden: v === null, tone: tone?.(i, j) })),
  );
}

export const Op = ({ children }: { children: React.ReactNode }) => <div className="font-mono text-xl text-muted-foreground px-1 self-center pb-5">{children}</div>;

/* ----------------------- add, subtract, scale ----------------------- */

export function ElementwiseVisualizer({ op: op0 = "add" }: { op?: ElementwiseOp }) {
  const [op, setOp] = useState(op0);
  const frames = useMemo(() => elementwiseFrames(op, pascal(3), MAGIC3, -2), [op]);
  return (
    <Stepper
      title="Element by element"
      frames={frames}
      code={MATLAB_ELEMENTWISE[op]}
      codeLabel="MATLAB"
      legend={[["bg-neon", "reading"], ["bg-mint", "written"]]}
      inputs={<Toggle<ElementwiseOp> value={op} onChange={setOp} options={[["add", "A + B"], ["subtract", "B − A"], ["scalar", "k × A"]]} />}
      render={(s) => {
        const hot = (i: number, j: number): CellTone | undefined => (s.at && s.at[0] === i && s.at[1] === j ? "neon" : undefined);
        const first = s.op === "subtract" ? s.b! : s.a;
        const second = s.op === "subtract" ? s.a : s.b;
        return (
          <div className="flex flex-wrap items-center gap-3">
            {s.op === "scalar" && (
              <>
                <div className={`font-mono text-lg px-3 py-2 border rounded-sm self-center mb-5 ${s.at ? TONE.neon : "border-border"}`}>{s.k}</div>
                <Op>×</Op>
              </>
            )}
            <MatrixStage rows={3} cols={3} cells={matCells(first, "x", hot)} label={s.op === "subtract" ? "B" : "A"} />
            {second && (
              <>
                <Op>{s.op === "add" ? "+" : "−"}</Op>
                <MatrixStage rows={3} cols={3} cells={matCells(second, "y", hot)} label={s.op === "subtract" ? "A" : "B"} />
              </>
            )}
            <Op>=</Op>
            <MatrixStage rows={3} cols={3} cells={matCells(s.c, "c", (i, j) => (hot(i, j) ? "orange" : s.c[i][j] !== null ? "mint" : undefined))} label="C" />
          </div>
        );
      }}
    />
  );
}

/* ----------------------------- transpose ---------------------------- */

const TRANSPOSE_PRESETS: Record<string, Mat> = {
  magic: MAGIC3,
  wide: [[1, 2, 3], [4, 5, 6]],
  row: [[2, 0, -1]],
};

/** Every entry keeps its identity, so flipping makes it travel across the main diagonal. */
export function TransposeVisualizer() {
  const [preset, setPreset] = useState("wide");
  const [flipped, setFlipped] = useState(false);
  const a = TRANSPOSE_PRESETS[preset];
  const b = flipped ? transpose(a) : a;
  const cells: StageCell[] = a.flatMap((r, i) =>
    r.map((v, j) => ({
      id: `${preset}-${i}-${j}`,
      row: flipped ? j : i,
      col: flipped ? i : j,
      text: String(v),
      tone: (i === j ? "violet" : j > i ? "sky" : "orange") as CellTone,
    })),
  );
  return (
    <Panel title="Transpose" legend={[["bg-violet", "main diagonal stays put"], ["bg-sky", "above"], ["bg-orange", "below"]]}>
      <div className="min-h-[170px] flex items-center justify-center">
        <MatrixStage rows={b.length} cols={b[0].length} cells={cells} size={46} label={`${flipped ? "A'" : "A"} is ${b.length}-by-${b[0].length}`} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => setFlipped((f) => !f)}>
          {flipped ? "Flip back" : "Transpose it"}
        </button>
        <Toggle<string>
          value={preset}
          onChange={(p) => {
            setPreset(p);
            setFlipped(false);
          }}
          options={[["wide", "2-by-3"], ["magic", "magic(3)"], ["row", "row vector"]]}
        />
      </div>
    </Panel>
  );
}

/* ---------------------- inner and outer products --------------------- */

export function VectorProductVisualizer({ kind: k0 = "inner" }: { kind?: VectorProductKind }) {
  const [kind, setKind] = useState(k0);
  const frames = useMemo(() => vectorProductFrames(kind, [3, 1, 4], [2, 0, -1]), [kind]);
  return (
    <Stepper
      title="Same vectors, two products"
      frames={frames}
      code={MATLAB_VECTOR_PRODUCT[kind]}
      codeLabel="MATLAB"
      legend={[["bg-neon", "multiplying"], ["bg-mint", "result"]]}
      inputs={<Toggle<VectorProductKind> value={kind} onChange={setKind} options={[["inner", "v * u (inner)"], ["outer", "u * v (outer)"]]} />}
      render={(s) => {
        const u = s.u.map((x) => [x]);
        const v = [s.v];
        const uCells = matCells(u, "u", (i) => (s.at && s.at[0] === i ? "neon" : undefined));
        const vCells = matCells(v, "v", (_, j) => (s.at && s.at[1] === j ? "neon" : undefined));
        return s.kind === "inner" ? (
          <div className="flex flex-wrap items-center gap-3">
            <MatrixStage rows={1} cols={3} cells={vCells} label="v" />
            <Op>×</Op>
            <MatrixStage rows={3} cols={1} cells={uCells} label="u" />
            <Op>=</Op>
            <div className="flex flex-col items-center gap-1.5 pb-5 font-mono text-sm min-w-[150px]">
              <div className="min-h-[24px]">{s.terms.map(signed).join(" + ") || "…"}</div>
              <div className="text-2xl text-mint transition-all">{s.terms.reduce((a, b) => a + b, 0)}</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <MatrixStage rows={3} cols={1} cells={uCells} label="u" />
            <Op>×</Op>
            <MatrixStage rows={1} cols={3} cells={vCells} label="v" />
            <Op>=</Op>
            <MatrixStage rows={3} cols={3} cells={matCells(s.outer, "o", (i, j) => (s.at && s.at[0] === i && s.at[1] === j ? "orange" : s.outer[i][j] !== null ? "mint" : undefined))} label="X" />
          </div>
        );
      }}
    />
  );
}

const signed = (x: number) => (x < 0 ? `(${x})` : String(x));

/* ----------------------- matrix multiplication ----------------------- */

const MUL_PRESETS: Record<string, [Mat, Mat]> = {
  ab: [pascal(3), MAGIC3],
  ba: [MAGIC3, pascal(3)],
  rect: [[[2, -1, 3], [0, 4, 1]], [[1, 2], [3, -1], [0, 5]]],
};

export function MatMulVisualizer() {
  const [preset, setPreset] = useState("rect");
  const frames = useMemo(() => matMulFrames(...MUL_PRESETS[preset]), [preset]);
  return (
    <Stepper
      title="Row meets column"
      frames={frames}
      code={MATLAB_MATMUL}
      codeLabel="MATLAB"
      legend={[["bg-sky", "row and column"], ["bg-neon", "this term"], ["bg-orange", "writing"], ["bg-mint", "done"]]}
      inputs={<Toggle<string> value={preset} onChange={setPreset} options={[["rect", "2-by-3 × 3-by-2"], ["ab", "pascal × magic"], ["ba", "magic × pascal"]]} />}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <MatrixStage rows={s.a.length} cols={s.a[0].length} label="A" cells={matCells(s.a, "a", (i, j) => (i === s.i ? (j === s.k ? "neon" : "sky") : undefined))} />
            <Op>×</Op>
            <MatrixStage rows={s.b.length} cols={s.b[0].length} label="B" cells={matCells(s.b, "b", (i, j) => (j === s.j ? (i === s.k ? "neon" : "sky") : undefined))} />
            <Op>=</Op>
            <MatrixStage rows={s.c.length} cols={s.c[0].length} label="C" cells={matCells(s.c, "c", (i, j) => (i === s.i && j === s.j ? "orange" : s.c[i][j] !== null ? "mint" : undefined))} />
          </div>
          <div className="font-mono text-sm min-h-[24px] overflow-x-auto whitespace-nowrap">
            {s.i !== null && s.j !== null && (
              <>
                <span className="text-muted-foreground">C({s.i + 1}, {s.j + 1}) = </span>
                {s.terms.join(" + ")} <span className="text-muted-foreground">=</span> <span className="text-mint">{s.running}</span>
              </>
            )}
          </div>
        </div>
      )}
    />
  );
}

/* ---------------------------- linear maps ---------------------------- */

const MAP_PRESETS: { id: string; label: string; m: Map2; note: string }[] = [
  { id: "rotate", label: "Rotate 90°", m: [0, -1, 1, 0], note: "Lengths and area stay the same. The area factor is 1." },
  { id: "shear", label: "Shear", m: [1, 1, 0, 1], note: "Squares lean over, but the base and height don't change, so area doesn't either." },
  { id: "stretch", label: "Stretch", m: [2, 0, 0, 1.5], note: "A diagonal matrix scales each axis on its own. Area grows by 2 × 1.5." },
  { id: "reflect", label: "Reflect", m: [-1, 0, 0, 1], note: "The determinant is negative: space has been flipped over, like a page seen from behind." },
  { id: "squash", label: "Squash", m: [1, 2, 0.5, 1], note: "The determinant is 0. All of space lands on one line, so no inverse can ever undo this." },
];

const fmt2 = (x: number) => (Math.abs(x) < 0.005 ? "0" : Number(x.toFixed(2)).toString());

/** A grid carried through (1 - t)I + tM, so lines move straight to where the matrix sends them. */
export function LinearMapGrid({ start = "shear" }: { start?: string }) {
  const [m, setM] = useState<Map2>(MAP_PRESETS.find((p) => p.id === start)?.m ?? [1, 0, 0, 1]);
  const [now, replay] = useTween(m);
  const cur = now as Map2;
  const preset = MAP_PRESETS.find((p) => p.m.every((x, i) => x === m[i]));
  const R = 6;
  const px = (x: number, y: number) => {
    const [u, v] = apply2(cur, x, y);
    return `${(u * 34).toFixed(2)},${(-v * 34).toFixed(2)}`;
  };
  const lines = [];
  for (let k = -R; k <= R; k++) {
    lines.push(<path key={`v${k}`} d={`M${px(k, -R)}L${px(k, R)}`} className={k === 0 ? "stroke-foreground/50" : "stroke-sky/35"} strokeWidth={k === 0 ? 1.4 : 1} />);
    lines.push(<path key={`h${k}`} d={`M${px(-R, k)}L${px(R, k)}`} className={k === 0 ? "stroke-foreground/50" : "stroke-sky/35"} strokeWidth={k === 0 ? 1.4 : 1} />);
  }
  const d = det2(m);
  const liveDet = det2(cur);
  return (
    <Panel title="What a matrix does to space" legend={[["bg-neon", "where (1, 0) lands"], ["bg-orange", "where (0, 1) lands"], ["bg-violet", "unit square"]]}>
      <div className="flex flex-wrap gap-5 items-start">
        <svg viewBox="-170 -170 340 340" className="w-full max-w-[380px] rounded-sm border border-border bg-background/60" role="img" aria-label={`Grid transformed by the matrix with rows ${m[0]}, ${m[1]} and ${m[2]}, ${m[3]}`}>
          <defs>
            <marker id="cm-arrow-n" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0,0L6,3L0,6z" className="fill-neon" /></marker>
            <marker id="cm-arrow-o" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0,0L6,3L0,6z" className="fill-orange" /></marker>
          </defs>
          {lines}
          <polygon points={`${px(0, 0)} ${px(1, 0)} ${px(1, 1)} ${px(0, 1)}`} className="fill-violet/35 stroke-violet" strokeWidth={1.2} />
          <path d={`M${px(0, 0)}L${px(1, 0)}`} className="stroke-neon" strokeWidth={3} markerEnd="url(#cm-arrow-n)" />
          <path d={`M${px(0, 0)}L${px(0, 1)}`} className="stroke-orange" strokeWidth={3} markerEnd="url(#cm-arrow-o)" />
        </svg>
        <div className="flex flex-col gap-3 min-w-[220px] flex-1">
          <div className="flex items-center gap-3 font-mono">
            <div className="inline-grid grid-cols-2 gap-x-4 gap-y-1 border-x-2 border-foreground/50 rounded-[5px] px-3 py-1.5 text-base">
              <span className="text-neon text-right">{fmt2(cur[0])}</span>
              <span className="text-orange text-right">{fmt2(cur[1])}</span>
              <span className="text-neon text-right">{fmt2(cur[2])}</span>
              <span className="text-orange text-right">{fmt2(cur[3])}</span>
            </div>
            <div className="text-sm">
              det = <span className={liveDet < -0.005 ? "text-orange" : Math.abs(liveDet) < 0.005 ? "text-violet" : "text-mint"}>{fmt2(liveDet)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["a", "b", "c", "d"] as const).map((name, i) => (
              <label key={name} className="flex flex-col gap-0.5 font-mono text-[11px] text-muted-foreground">
                {name} = {fmt2(m[i])}
                <input
                  type="range"
                  aria-label={`Matrix entry ${name}`}
                  min={-2}
                  max={2}
                  step={0.1}
                  value={m[i]}
                  onChange={(e) => {
                    const next = [...m] as Map2;
                    next[i] = Number(e.target.value);
                    setM(next);
                  }}
                  className="accent-[hsl(var(--mint))]"
                />
              </label>
            ))}
          </div>
          <p className="text-sm leading-relaxed min-h-[4.5em]">
            {preset?.note ?? (d < 0 ? "A negative determinant: this map flips space over." : d === 0 ? "A zero determinant: space collapses, so this map can't be undone." : `Every area gets multiplied by ${fmt2(d)}.`)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {MAP_PRESETS.map((p) => (
          <button key={p.id} type="button" className={`${btn} ${preset?.id === p.id ? "border-foreground" : ""}`} onClick={() => setM(p.m)}>
            {p.label}
          </button>
        ))}
        <button type="button" className={btn} onClick={() => replay([1, 0, 0, 1])}>
          ▶ Replay from identity
        </button>
      </div>
    </Panel>
  );
}

/* ------------------------- Kronecker product ------------------------- */

export function KroneckerVisualizer({ a = [[1, -2], [-1, 0]], b = [[4, -3], [2, 3]] }: { a?: Mat; b?: Mat }) {
  const frames = useMemo(() => kronFrames(a, b), [a, b]);
  const big = useMemo(() => kron(a, b), [a, b]);
  const [p, q] = [b.length, b[0].length];
  return (
    <Stepper
      title="Copies of B, scaled by A"
      frames={frames}
      code={MATLAB_KRON}
      codeLabel="MATLAB"
      legend={[["bg-orange", "this block"], ["bg-mint", "finished"]]}
      render={(s) => {
        const blockIndex = (i: number, j: number) => Math.floor(i / p) * a[0].length + Math.floor(j / q) + 1;
        return (
          <div className="flex flex-wrap items-center gap-4">
            <MatrixStage rows={a.length} cols={a[0].length} size={38} label="A" cells={matCells(a, "a", (i, j) => (s.block?.[0] === i && s.block?.[1] === j ? "orange" : undefined))} />
            <Op>⊗</Op>
            <MatrixStage rows={p} cols={q} size={38} label="B" cells={matCells(b, "b", () => (s.block ? "sky" : undefined))} />
            <Op>=</Op>
            <MatrixStage
              rows={big.length}
              cols={big[0].length}
              size={38}
              label={`${big.length}-by-${big[0].length}`}
              cells={big.flatMap((r, i) =>
                r.map((v, j) => {
                  const n = blockIndex(i, j);
                  const live = s.block && Math.floor(i / p) === s.block[0] && Math.floor(j / q) === s.block[1];
                  return { id: `k${i}-${j}`, row: i, col: j, text: String(v), hidden: n > s.done, tone: (live ? "orange" : "mint") as CellTone };
                }),
              )}
            />
          </div>
        );
      }}
    />
  );
}

/* ------------------------------- norms ------------------------------- */

export function NormVisualizer({ a = [[5, -4, 2], [-1, 2, 3], [-2, 1, 0]] }: { a?: Mat }) {
  const [kind, setKind] = useState<NormKind>("one");
  const frames = useMemo(() => normFrames(kind, a), [kind, a]);
  return (
    <Stepper
      title="Three ways to measure a matrix"
      frames={frames}
      code={MATLAB_NORM[kind]}
      codeLabel="MATLAB"
      legend={[["bg-neon", "adding"], ["bg-mint", "the winner"]]}
      inputs={<Toggle<NormKind> value={kind} onChange={setKind} options={[["one", "1-norm"], ["inf", "infinity-norm"], ["fro", "Euclidean"]]} />}
      render={(s) => {
        const n = a[0].length;
        const tone = (i: number, j: number): CellTone | undefined => {
          if (s.kind === "fro") return s.line === i * n + j ? "neon" : undefined;
          const on = s.kind === "one" ? j : i;
          if (s.best === on) return "mint";
          return s.line === on ? "neon" : undefined;
        };
        const max = Math.max(1, ...s.sums.map((x) => x ?? 0));
        return (
          <div className="flex flex-wrap items-center gap-6">
            <MatrixStage rows={a.length} cols={n} cells={matCells(a, "n", tone)} label="B" size={46} />
            {s.kind === "fro" ? (
              <div className="font-mono text-sm flex flex-col gap-1 min-w-[180px]">
                <div className="text-muted-foreground">sum of squares</div>
                <div className="text-2xl text-sky">{s.total}</div>
                <div className="text-muted-foreground">√ = <span className="text-mint">{Number(Math.sqrt(s.total ?? 0).toFixed(3))}</span></div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 min-w-[200px] flex-1 max-w-[320px]">
                {s.sums.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono text-xs">
                    <span className="w-14 text-muted-foreground">{s.kind === "one" ? "col" : "row"} {i + 1}</span>
                    <div className="h-4 flex-1 bg-background/60 rounded-[2px] overflow-hidden">
                      <div className={`h-full transition-all duration-500 ease-out motion-reduce:transition-none ${s.best === i ? "bg-mint" : "bg-sky"}`} style={{ width: `${((v ?? 0) / max) * 100}%` }} />
                    </div>
                    <span className={`w-6 text-right ${s.best === i ? "text-mint" : ""}`}>{v ?? ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

/* -------------------------- special matrices ------------------------- */

type SpecialKind = "triu" | "tril" | "diag";

/** Entries that a command drops fade to zero in place, so the kept shape stands out. */
export function SpecialMatrixExplorer() {
  const [kind, setKind] = useState<SpecialKind>("triu");
  const [k, setK] = useState(0);
  const out = kind === "triu" ? triu(MAGIC4, k) : kind === "tril" ? tril(MAGIC4, k) : diagOnly(MAGIC4, k);
  const cmd = kind === "diag" ? `diag(diag(A, ${k}), ${k})` : `${kind}(A, ${k})`;
  return (
    <Panel title="Keep part of a matrix" legend={[["bg-mint", "kept"], ["bg-neon", "the k-th diagonal"]]}>
      <div className="flex flex-wrap items-center gap-6">
        <MatrixStage
          rows={4}
          cols={4}
          size={46}
          label="A = magic(4)"
          cells={MAGIC4.flatMap((r, i) =>
            r.map((v, j) => {
              const kept = kind === "triu" ? j - i >= k : kind === "tril" ? j - i <= k : j - i === k;
              return { id: `s${i}-${j}`, row: i, col: j, text: kept ? String(v) : "0", tone: (!kept ? "muted" : j - i === k ? "neon" : "mint") as CellTone };
            }),
          )}
        />
        <div className="flex flex-col gap-3 font-mono text-sm min-w-[220px]">
          <div className="text-base">{cmd}</div>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            diagonal offset k = {k}
            <input type="range" aria-label="Diagonal offset" min={-3} max={3} value={k} onChange={(e) => setK(Number(e.target.value))} className="accent-[hsl(var(--mint))]" />
          </label>
          <div className="text-[12px] text-muted-foreground">diag(A, {k}) = [{diagOf(MAGIC4, k).join(" ")}]</div>
          <div className="text-[12px] text-muted-foreground">non-zero entries: {out.flat().filter((x) => x !== 0).length}</div>
        </div>
      </div>
      <Toggle<SpecialKind> value={kind} onChange={setKind} options={[["triu", "Upper triangular"], ["tril", "Lower triangular"], ["diag", "Diagonal"]]} />
    </Panel>
  );
}

/* ------------------------- inverse by cofactors ------------------------ */

const INVERSE_PRESETS: Record<string, Mat> = {
  neat: [[1, 2, 3], [0, 1, 4], [5, 6, 0]],
  fractions: [[2, 0, 1], [1, 3, 0], [0, 1, 2]],
  singular: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
};

const STAGE_LABEL: Record<string, string> = { start: "", minors: "minors", cofactors: "cofactors", adjoint: "adjoint (cofactors transposed)", inverse: "A⁻¹", singular: "no inverse" };

export function InverseVisualizer() {
  const [preset, setPreset] = useState("neat");
  const a = INVERSE_PRESETS[preset];
  const frames = useMemo(() => inverseFrames(a), [a]);
  return (
    <Stepper
      title="Building an inverse"
      frames={frames}
      code={MATLAB_INVERSE}
      codeLabel="MATLAB"
      legend={[["bg-orange", "crossed out"], ["bg-neon", "this entry"], ["bg-violet", "sign flipped"], ["bg-mint", "result"]]}
      inputs={<Toggle<string> value={preset} onChange={setPreset} options={[["neat", "Whole-number answer"], ["fractions", "Fractions"], ["singular", "Singular"]]} />}
      render={(s) => {
        const n = s.a.length;
        const left = matCells(s.a, "l", (i, j) => {
          if (!s.at) return undefined;
          if (i === s.at[0] && j === s.at[1]) return "neon";
          return i === s.at[0] || j === s.at[1] ? "orange" : "sky";
        });
        const right: StageCell[] = s.shown.flatMap((r, i) =>
          r.map((v, j) => ({
            id: `r${i}-${j}`,
            row: s.flipped ? j : i,
            col: s.flipped ? i : j,
            text: v === null ? "" : String(v),
            hidden: v === null,
            tone: (s.at?.[0] === i && s.at?.[1] === j ? "orange" : s.stage === "cofactors" && (i + j) % 2 ? "violet" : s.stage === "inverse" ? "mint" : undefined) as CellTone | undefined,
          })),
        );
        return (
          <div className="flex flex-wrap items-center gap-5">
            <MatrixStage rows={n} cols={n} cells={left} size={46} label="A" />
            <Op>→</Op>
            <MatrixStage rows={n} cols={n} cells={right} size={52} label={STAGE_LABEL[s.stage] || " "} />
            <div className="font-mono text-sm pb-5">det(A) = <span className={s.det === 0 ? "text-orange" : "text-mint"}>{s.det}</span></div>
          </div>
        );
      }}
    />
  );
}
