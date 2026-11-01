import { useMemo, useRef, useState } from "react";
import { btn, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { MatrixStage, matCells, Op, Panel, useTween, type CellTone, type StageCell } from "@/components/mdx/MatrixVisualizers";
import { convFrames, coverUpFrames, fitQuality, MATLAB_CONV, MATLAB_RESIDUE, polyder, polyfit, polyText, polyval, roots, sumSquaredError, type Poly } from "@/lib/polynomial";

/* ------------------------------- plotting ------------------------------ */

const W = 420;
const H = 280;

function PlotFrame({ xr, yr, children, svgRef, onPointer }: { xr: [number, number]; yr: [number, number]; children: React.ReactNode; svgRef?: React.Ref<SVGSVGElement>; onPointer?: React.PointerEventHandler<SVGSVGElement> }) {
  const sx = (x: number) => ((x - xr[0]) / (xr[1] - xr[0])) * W;
  const sy = (y: number) => H - ((y - yr[0]) / (yr[1] - yr[0])) * H;
  const ticks = (lo: number, hi: number) => {
    const step = Math.max(1, Math.ceil((hi - lo) / 8));
    const out: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
    return out;
  };
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[460px] rounded-sm border border-border bg-background/60 touch-none" onPointerMove={onPointer}>
      {ticks(xr[0], xr[1]).map((v) => <path key={`x${v}`} d={`M${sx(v)},0V${H}`} className="stroke-border/60" />)}
      {ticks(yr[0], yr[1]).map((v) => <path key={`y${v}`} d={`M0,${sy(v)}H${W}`} className="stroke-border/60" />)}
      {xr[0] < 0 && xr[1] > 0 && <path d={`M${sx(0)},0V${H}`} className="stroke-foreground/40" />}
      {yr[0] < 0 && yr[1] > 0 && <path d={`M0,${sy(0)}H${W}`} className="stroke-foreground/40" />}
      {children}
    </svg>
  );
}

const pathOf = (ys: number[], xr: [number, number], yr: [number, number]) =>
  ys
    .map((y, i) => {
      const x = (i / (ys.length - 1)) * W;
      const v = H - ((y - yr[0]) / (yr[1] - yr[0])) * H;
      return `${i ? "L" : "M"}${x.toFixed(1)},${Math.max(-400, Math.min(H + 400, v)).toFixed(1)}`;
    })
    .join("");

const sample = (p: Poly, xr: [number, number], n = 90) => Array.from({ length: n }, (_, i) => polyval(p, xr[0] + (i / (n - 1)) * (xr[1] - xr[0])));

const num = (x: number) => Number(x.toFixed(3)).toString();

/* -------------------------- polynomial explorer ------------------------- */

const SLIDERS: [string, number, number][] = [["x³", -1, 1], ["x²", -4, 4], ["x", -6, 6], ["1", -6, 6]];

/** Roots slide along the axis as the coefficients change. */
export function PolynomialExplorer({ start = [1, -2, -1, 2] }: { start?: Poly }) {
  const [p, setP] = useState<Poly>(start);
  const [x, setX] = useState(3);
  const [showDer, setShowDer] = useState(false);
  const xr: [number, number] = [-4, 4];
  const yr: [number, number] = [-12, 12];
  const [ys] = useTween(useMemo(() => sample(p, xr), [p]), 350); // eslint-disable-line react-hooks/exhaustive-deps
  const d = polyder(p);
  const rs = useMemo(() => roots(p), [p]);
  const sx = (v: number) => ((v - xr[0]) / (xr[1] - xr[0])) * W;
  const sy = (v: number) => H - ((v - yr[0]) / (yr[1] - yr[0])) * H;
  const y = polyval(p, x);
  const real = rs.filter(([, b]) => b === 0).map(([a]) => a);
  return (
    <Panel title="Coefficients and roots" legend={[["bg-mint", "p(x)"], ["bg-violet", "p'(x)"], ["bg-orange", "real root"], ["bg-neon", "polyval"]]}>
      <div className="flex flex-wrap gap-5 items-start">
        <PlotFrame xr={xr} yr={yr}>
          {showDer && <path d={pathOf(sample(d, xr), xr, yr)} fill="none" strokeWidth={1.6} strokeDasharray="5 4" className="stroke-violet" />}
          <path d={pathOf(ys, xr, yr)} fill="none" strokeWidth={2.4} className="stroke-mint" />
          {real.filter((r) => r >= xr[0] && r <= xr[1]).map((r, i) => (
            <circle key={i} cx={0} cy={0} r={5.5} className="fill-orange stroke-background transition-transform duration-300 motion-reduce:transition-none" style={{ transform: `translate(${sx(r)}px, ${sy(0)}px)` }} />
          ))}
          {y >= yr[0] && y <= yr[1] && <circle cx={sx(x)} cy={sy(y)} r={5} className="fill-neon stroke-background" />}
        </PlotFrame>
        <div className="flex flex-col gap-2.5 flex-1 min-w-[220px] font-mono text-[12px]">
          <div className="text-sm text-foreground break-words">p(x) = {polyText(p)}</div>
          <div className="text-muted-foreground">p = [{p.map(num).join(" ")}]</div>
          {SLIDERS.map(([label, lo, hi], i) => (
            <label key={label} className="flex items-center gap-2 text-muted-foreground">
              <span className="w-8">{label}</span>
              <input
                type="range"
                aria-label={`Coefficient of ${label}`}
                min={lo}
                max={hi}
                step={i === 0 ? 0.1 : 0.5}
                value={p[i]}
                onChange={(e) => setP(p.map((c, k) => (k === i ? Number(e.target.value) : c)))}
                className="flex-1 accent-[hsl(var(--mint))]"
              />
              <span className="w-8 text-right text-foreground">{num(p[i])}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-muted-foreground">
            <span className="w-8">x</span>
            <input type="range" aria-label="Value of x" min={-4} max={4} step={0.5} value={x} onChange={(e) => setX(Number(e.target.value))} className="flex-1 accent-[hsl(var(--neon))]" />
            <span className="w-8 text-right text-foreground">{num(x)}</span>
          </label>
          <div>polyval(p, {num(x)}) = <span className="text-neon">{num(y)}</span></div>
          <div className="text-muted-foreground">
            roots: {rs.length ? rs.map(([a, b]) => (b === 0 ? num(a) : `${num(a)}${b < 0 ? "-" : "+"}${num(Math.abs(b))}i`)).join(",  ") : "none"}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setP([1, -2, -1, 2])}>Three real roots</button>
        <button type="button" className={btn} onClick={() => setP([0, 1, 0, 1])}>No real roots</button>
        <button type="button" className={btn} onClick={() => setP([0, 1, -2, 1])}>Double root</button>
        <button type="button" className={`${btn} ${showDer ? "border-foreground" : ""}`} aria-pressed={showDer} onClick={() => setShowDer((v) => !v)}>
          {showDer ? "Hide" : "Show"} derivative
        </button>
      </div>
    </Panel>
  );
}

/* ------------------------------ convolution ----------------------------- */

export function ConvolutionVisualizer({ a = [1, 2, 3], b = [4, 5, 6] }: { a?: Poly; b?: Poly }) {
  const frames = useMemo(() => convFrames(a, b), [a, b]);
  const off = b.length - 1;
  const cols = a.length + 2 * off;
  return (
    <Stepper
      title="Slide, multiply, add"
      frames={frames}
      code={MATLAB_CONV}
      codeLabel="MATLAB"
      legend={[["bg-neon", "overlap"], ["bg-mint", "output"]]}
      render={(s) => {
        const hotA = new Set(s.pairs.map(([i]) => i));
        const hotB = new Set(s.pairs.map(([, j]) => j));
        const shift = s.n ?? -1;
        const cells: StageCell[] = [
          ...a.map((v, i) => ({ id: `a${i}`, row: 0, col: off + i, text: String(v), tone: (hotA.has(i) ? "neon" : "sky") as CellTone })),
          ...b.map((v, j) => ({ id: `b${j}`, row: 1, col: off + shift - j, text: String(v), tone: (hotB.has(j) ? "neon" : "violet") as CellTone, hidden: s.n === null })),
        ];
        return (
          <div className="flex flex-col gap-3 items-start">
            <MatrixStage rows={2} cols={cols} cells={cells} label="a on top, b reversed below" />
            <MatrixStage rows={1} cols={s.c.length} cells={matCells([s.c], "c", (_, j) => (j === s.n ? "orange" : s.c[j] !== null ? "mint" : undefined))} label="c = conv(a, b)" />
          </div>
        );
      }}
    />
  );
}

/* ------------------------------ curve fitting --------------------------- */

const FIT_X = [1, 2, 3, 4, 5];
const FIT_Y = [5.5, 43.1, 128, 290.7, 498.4];

/** Drag a point and the least-squares curve follows. Higher degrees chase the points. */
export function CurveFitExplorer() {
  const [ys, setYs] = useState(FIT_Y);
  const [deg, setDeg] = useState(3);
  const drag = useRef<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const xr: [number, number] = [0.5, 5.5];
  const yr: [number, number] = [-100, 650];
  const p = useMemo(() => polyfit(FIT_X, ys, deg), [ys, deg]);
  const [curve] = useTween(useMemo(() => sample(p, xr), [p]), 400); // eslint-disable-line react-hooks/exhaustive-deps
  const sx = (v: number) => ((v - xr[0]) / (xr[1] - xr[0])) * W;
  const sy = (v: number) => H - ((v - yr[0]) / (yr[1] - yr[0])) * H;
  const err = sumSquaredError(p, FIT_X, ys);
  const quality = fitQuality(p, FIT_X, ys);
  const onMove: React.PointerEventHandler<SVGSVGElement> = (e) => {
    if (drag.current === null || !svg.current) return;
    const box = svg.current.getBoundingClientRect();
    const v = yr[1] - ((e.clientY - box.top) / box.height) * (yr[1] - yr[0]);
    const clamped = Math.max(yr[0], Math.min(yr[1], v));
    setYs((old) => old.map((o, i) => (i === drag.current ? Math.round(clamped * 10) / 10 : o)));
  };
  return (
    <Panel title="Least-squares fit" legend={[["bg-mint", "fitted curve"], ["bg-orange", "error at each point"], ["bg-neon", "data: drag me"]]}>
      <div className="flex flex-wrap gap-5 items-start" onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
        <PlotFrame xr={xr} yr={yr} svgRef={svg} onPointer={onMove}>
          {FIT_X.map((x, i) => <path key={`e${i}`} d={`M${sx(x)},${sy(ys[i])}V${sy(polyval(p, x))}`} className="stroke-orange" strokeWidth={1.5} />)}
          <path d={pathOf(curve, xr, yr)} fill="none" strokeWidth={2.4} className="stroke-mint" />
          {FIT_X.map((x, i) => (
            <circle
              key={x}
              cx={sx(x)}
              cy={sy(ys[i])}
              r={8}
              className="fill-neon stroke-background cursor-grab"
              onPointerDown={(e) => {
                e.preventDefault();
                drag.current = i;
              }}
            />
          ))}
        </PlotFrame>
        <div className="flex flex-col gap-3 flex-1 min-w-[220px] font-mono text-[12px]">
          <div className="text-muted-foreground">p = polyfit(x, y, {deg})</div>
          <div className="text-sm break-words">{polyText(p.map((c) => Number(c.toFixed(3))))}</div>
          <div>sum of squared errors: <span className="text-orange">{err < 1e-6 ? "0" : num(err)}</span></div>
          <p className="font-body text-sm leading-relaxed text-foreground min-h-[5em]">
            {quality === "exact"
              ? "The curve goes through every point, so the error is zero. Drag one point and watch the whole curve swing. That's overfitting."
              : quality === "close"
                ? `A close fit. The curve runs almost through all five points, and the leftover error is tiny next to the size of the data. It can't be exact, because a degree ${deg} curve has only ${deg + 1} coefficients to match five points.`
                : `A poor fit. This is the best a degree ${deg} curve can do with these points, and the orange errors are still large.`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Toggle<string> value={String(deg)} onChange={(d) => setDeg(Number(d))} options={[["1", "Degree 1"], ["2", "Degree 2"], ["3", "Degree 3"], ["4", "Degree 4"]]} />
        <button type="button" className={btn} onClick={() => setYs(FIT_Y)}>Reset points</button>
      </div>
    </Panel>
  );
}

/* --------------------------- partial fractions -------------------------- */

const factor = (p: number) => `(s ${p < 0 ? "+" : "-"} ${Math.abs(p)})`;

export function CoverUpVisualizer({ b = [-4, 8], a = [1, 6, 8] }: { b?: Poly; a?: Poly }) {
  const frames = useMemo(() => coverUpFrames(b, a), [b, a]);
  return (
    <Stepper
      title="The cover-up method"
      frames={frames}
      code={MATLAB_RESIDUE}
      codeLabel="MATLAB"
      legend={[["bg-orange", "covered up"], ["bg-mint", "found"]]}
      render={(s) => (
        <div className="flex flex-wrap items-center gap-4 font-mono text-base">
          <div className="flex flex-col items-center">
            <div className="px-3 pb-1">{polyText(s.b, "s")}</div>
            <div className="border-t border-foreground/60 px-3 pt-1 flex gap-1">
              {s.poles.map((p) => (
                <span key={p} className={`rounded-sm px-1 transition-colors duration-300 ${s.active === p ? "bg-orange text-background" : ""}`}>{factor(p)}</span>
              ))}
            </div>
          </div>
          <Op>=</Op>
          {s.poles.map((p, i) => {
            const got = s.done.find((d) => d.p === p);
            return (
              <div key={p} className="flex items-center gap-3">
                {i > 0 && <span className="text-muted-foreground">+</span>}
                <div className="flex flex-col items-center min-w-[70px]">
                  <div className={`px-3 pb-1 transition-all duration-500 motion-reduce:transition-none ${got ? "text-mint scale-110" : "text-muted-foreground"}`}>{got ? got.r : "?"}</div>
                  <div className="border-t border-foreground/60 px-2 pt-1">{factor(p)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    />
  );
}
