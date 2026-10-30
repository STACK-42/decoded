import { useMemo, useState } from "react";
import { btn, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import { dlogFrames, fastPowFrames, logTable, MATLAB_DLOG, MATLAB_FASTPOW, cycleFrames, extendedFrames, isPrimitiveRoot, MATLAB_EXT, MATLAB_ORDER, order, powers, factorize, gcd, MATLAB_SIEVE, MATLAB_WILSON, phi, sieveFrames, wilsonFrames, euclidTiles, MATLAB_EUCLID, mod, tileFrames } from "@/lib/numberTheory";

/* ------------------------------- Euclid tiles ------------------------------ */

const TILE_FILL = ["fill-sky/70", "fill-violet/70", "fill-orange/70", "fill-neon/70", "fill-mint/70"];

const EUCLID_PRESETS: Record<string, [number, number]> = { small: [60, 24], mid: [247, 143], big: [1281, 243] };

export function EuclidTilesVisualizer() {
  const [preset, setPreset] = useState("small");
  const [a, b] = EUCLID_PRESETS[preset];
  const frames = useMemo(() => tileFrames(a, b), [a, b]);
  const tiles = useMemo(() => euclidTiles(a, b), [a, b]);
  return (
    <Stepper
      title="Euclid's algorithm as tiling"
      frames={frames}
      code={MATLAB_EUCLID}
      codeLabel="MATLAB"
      inputs={<Toggle<string> value={preset} onChange={setPreset} options={[["small", "gcd(60, 24)"], ["mid", "gcd(247, 143)"], ["big", "gcd(1281, 243)"]]} />}
      render={(s) => (
        <div className="flex flex-col gap-3">
          <svg viewBox={`-1 -1 ${a + 2} ${b + 2}`} className="w-full max-w-[560px] rounded-sm" role="img" aria-label={`A ${a} by ${b} rectangle tiled with squares`}>
            <rect x={0} y={0} width={a} height={b} className="fill-background/60 stroke-foreground/40" strokeWidth={a / 400} />
            {tiles.map((t, i) => (
              <rect
                key={i}
                x={t.x}
                y={t.y}
                width={t.size}
                height={t.size}
                strokeWidth={a / 500}
                className={`stroke-background transition-opacity duration-500 motion-reduce:transition-none ${TILE_FILL[t.step % TILE_FILL.length]}`}
                style={{ opacity: t.step <= s.upto ? 1 : 0, transitionDelay: t.step === s.upto ? `${(i - tiles.findIndex((x) => x.step === t.step)) * 70}ms` : "0ms" }}
              />
            ))}
          </svg>
          <div className="font-mono text-[12px] flex flex-col gap-0.5 min-h-[6.5em]">
            {s.steps.slice(0, s.upto + 1).map((st, i) => (
              <div key={i} className={i === s.upto ? "text-foreground" : "text-muted-foreground"}>
                {st.a} = {st.q} × {st.b} + {st.r}
              </div>
            ))}
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------ modular clock ----------------------------- */

/** Rings of residues share one layout, so a modulus reads as a place you walk around. */
export const ringPoint = (i: number, n: number, r: number, cx = 150, cy = 150): [number, number] => {
  const t = (2 * Math.PI * i) / n - Math.PI / 2;
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
};

export function ModClock({ a: a0 = 11, n: n0 = 7 }: { a?: number; n?: number }) {
  const [a, setA] = useState(a0);
  const [n, setN] = useState(n0);
  const r = mod(a, n);
  const q = Math.floor(a / n);
  return (
    <Panel title="Arithmetic on a clock" legend={[["bg-mint", "a mod n"]]}>
      <div className="flex flex-wrap gap-6 items-center">
        <svg viewBox="0 0 300 300" className="w-full max-w-[280px]" role="img" aria-label={`Clock with ${n} positions, pointer at ${r}`}>
          <circle cx={150} cy={150} r={118} className="fill-background/60 stroke-border" />
          {Array.from({ length: n }, (_, i) => {
            const [x, y] = ringPoint(i, n, 118);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={n > 16 ? 10 : 15} className={`transition-colors duration-500 ${i === r ? "fill-mint" : "fill-card stroke-border"}`} />
                <text x={x} y={y} dy=".35em" textAnchor="middle" fontSize={n > 16 ? 10 : 13} className={`font-mono ${i === r ? "fill-background font-bold" : "fill-foreground"}`}>{i}</text>
              </g>
            );
          })}
          <line
            x1={150}
            y1={150}
            x2={150}
            y2={62}
            strokeWidth={3}
            strokeLinecap="round"
            className="stroke-mint transition-transform duration-700 ease-in-out motion-reduce:transition-none"
            style={{ transformOrigin: "150px 150px", transform: `rotate(${(a * 360) / n}deg)` }}
          />
          <circle cx={150} cy={150} r={5} className="fill-mint" />
        </svg>
        <div className="flex flex-col gap-3 font-mono text-sm min-w-[220px] flex-1">
          <div className="text-lg">{a} mod {n} = <span className="text-mint">{r}</span></div>
          <div className="text-muted-foreground text-[12px]">{a} = ({q}) × {n} + {r}</div>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            a = {a}
            <input type="range" aria-label="Value of a" min={-30} max={60} value={a} onChange={(e) => setA(Number(e.target.value))} className="accent-[hsl(var(--mint))]" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            n = {n}
            <input type="range" aria-label="Modulus n" min={2} max={24} value={n} onChange={(e) => setN(Number(e.target.value))} className="accent-[hsl(var(--mint))]" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setA(a - 1)}>a − 1</button>
            <button type="button" className={btn} onClick={() => setA(a + 1)}>a + 1</button>
            <button type="button" className={btn} onClick={() => setA(a + n)}>a + n</button>
            <button type="button" className={btn} onClick={() => setA(-11)}>a = −11</button>
          </div>
          <div className="text-[12px] text-muted-foreground">Also here: {[r - 2 * n, r - n, r, r + n, r + 2 * n].join(", ")}</div>
        </div>
      </div>
    </Panel>
  );
}


/* ------------------------------- the sieve ------------------------------- */

export function SieveVisualizer({ n = 100 }: { n?: number }) {
  const frames = useMemo(() => sieveFrames(n), [n]);
  const nums = useMemo(() => Array.from({ length: n - 1 }, (_, i) => i + 2), [n]);
  return (
    <Stepper
      title="Sieve of Eratosthenes"
      frames={frames}
      code={MATLAB_SIEVE}
      codeLabel="MATLAB"
      legend={[["bg-violet", "current prime"], ["bg-orange", "just struck"], ["bg-mint", "prime"]]}
      render={(s) => {
        const newlyIn = s.prime;
        return (
          <div className="grid gap-1 max-w-[440px]" style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}>
            <div />
            {nums.map((v) => {
              const by = s.crossed[v];
              const fresh = by !== undefined && by === newlyIn;
              const isCur = v === s.prime;
              const survivor = !by && (s.done || (s.prime !== null && v <= s.prime));
              return (
                <div
                  key={v}
                  className={`relative aspect-square flex items-center justify-center rounded-sm border font-mono text-[11px] transition-[background-color,border-color,color,opacity] duration-300 motion-reduce:transition-none ${
                    isCur ? "bg-violet/40 border-violet" : fresh ? "bg-orange/30 border-orange" : by ? "border-border/30 text-muted-foreground/40" : survivor ? "bg-mint/20 border-mint" : "border-border bg-background/50"
                  }`}
                  style={{ transitionDelay: fresh ? `${Math.floor(v / by) * 18}ms` : "0ms" }}
                >
                  {v}
                </div>
              );
            })}
          </div>
        );
      }}
    />
  );
}

/* ------------------------------- the totient ------------------------------ */

export function TotientGrid({ n: n0 = 35 }: { n?: number }) {
  const [n, setN] = useState(n0);
  const f = factorize(n);
  const value = phi(n);
  const formula = f.map(([p]) => `(1 − 1/${p})`).join(" ");
  return (
    <Panel title="Euler's totient" legend={[["bg-mint", "coprime to n"], ["bg-orange", "shares a factor"]]}>
      <div className="flex flex-col gap-1 font-mono text-sm">
        <div className="text-lg">φ({n}) = <span className="text-mint">{value}</span></div>
        <div className="text-[12px] text-muted-foreground">
          {n} = {f.map(([p, e]) => (e > 1 ? `${p}^${e}` : p)).join(" × ")}, so φ({n}) = {n} {formula} = {value}
        </div>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(32px, 1fr))" }}>
        {Array.from({ length: 100 }, (_, i) => i + 1).map((v) => {
          const inRange = v < n;
          const co = inRange && gcd(v, n) === 1;
          return (
            <div
              key={v}
              className={`aspect-square flex items-center justify-center rounded-sm border font-mono text-[11px] transition-[transform,opacity,background-color,border-color] duration-300 motion-reduce:transition-none ${co ? "bg-mint/25 border-mint" : "bg-orange/10 border-orange/40 text-muted-foreground"}`}
              style={{ opacity: inRange ? 1 : 0.05, transform: `scale(${inRange ? 1 : 0.7})` }}
            >
              {v}
            </div>
          );
        })}
      </div>
      <label className="flex flex-col gap-1 font-mono text-[11px] text-muted-foreground max-w-[420px]">
        n = {n}
        <input type="range" aria-label="Value of n" min={2} max={100} value={n} onChange={(e) => setN(Number(e.target.value))} className="accent-[hsl(var(--mint))]" />
      </label>
      <div className="flex flex-wrap gap-2">
        {[23, 35, 37, 81, 100].map((v) => (
          <button key={v} type="button" className={`${btn} ${v === n ? "border-foreground" : ""}`} onClick={() => setN(v)}>φ({v})</button>
        ))}
      </div>
    </Panel>
  );
}

/* --------------------------------- Wilson -------------------------------- */

export function WilsonVisualizer({ p = 13 }: { p?: number }) {
  const frames = useMemo(() => wilsonFrames(p), [p]);
  return (
    <Stepper
      title="Why Wilson's theorem works"
      frames={frames}
      code={MATLAB_WILSON}
      codeLabel="MATLAB"
      legend={[["bg-neon", "this pair"], ["bg-sky", "paired, equals 1"], ["bg-orange", "its own inverse"]]}
      render={(s) => {
        const pos = (v: number) => ringPoint(v - 1, s.p - 1, 118);
        const paired = new Set(s.pairs.flat());
        return (
          <svg viewBox="0 0 300 300" className="w-full max-w-[320px] mx-auto" role="img" aria-label={`Numbers 1 to ${s.p - 1} around a ring, joined to their inverses`}>
            {s.pairs.map(([a, b]) => {
              const [x1, y1] = pos(a);
              const [x2, y2] = pos(b);
              const live = s.active?.[0] === a;
              return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} strokeDasharray={1} strokeWidth={live ? 3 : 1.6} className={`${live ? "stroke-neon" : "stroke-sky"} cm-draw`} />;
            })}
            {Array.from({ length: s.p - 1 }, (_, i) => i + 1).map((v) => {
              const [x, y] = pos(v);
              const live = s.active?.includes(v);
              const self = v === 1 || v === s.p - 1;
              return (
                <g key={v}>
                  <circle cx={x} cy={y} r={15} className={`transition-colors duration-300 ${live ? "fill-neon" : self ? "fill-orange" : paired.has(v) ? "fill-sky" : "fill-card stroke-border"}`} />
                  <text x={x} y={y} dy=".35em" textAnchor="middle" fontSize={12} className={`font-mono ${live || self || paired.has(v) ? "fill-background font-bold" : "fill-foreground"}`}>{v}</text>
                </g>
              );
            })}
          </svg>
        );
      }}
    />
  );
}

/* ------------------------------ power cycles ----------------------------- */

/** Draws each power of a as a chord, so its order is the number of hops back to 1. */
export function CycleRing({ n, seq, target }: { n: number; seq: number[]; target?: number | null }) {
  const pos = (v: number) => ringPoint(v, n, 122);
  const visited = new Set(seq);
  const cur = seq[seq.length - 1];
  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[320px]" role="img" aria-label={`Powers modulo ${n}: ${seq.join(", ")}`}>
      {seq.slice(1).map((v, i) => {
        const [x1, y1] = pos(seq[i]);
        const [x2, y2] = pos(v);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} strokeDasharray={1} strokeWidth={i === seq.length - 2 ? 2.6 : 1.5} className={`cm-draw ${i === seq.length - 2 ? "stroke-neon" : "stroke-sky/70"}`} />;
      })}
      {Array.from({ length: n }, (_, v) => {
        const [x, y] = pos(v);
        const isCur = v === cur;
        const isT = v === target;
        return (
          <g key={v}>
            <circle cx={x} cy={y} r={n > 16 ? 11 : 14} className={`transition-colors duration-300 ${isCur ? "fill-neon" : isT ? "fill-orange" : visited.has(v) ? "fill-mint" : "fill-card stroke-border"}`} />
            <text x={x} y={y} dy=".35em" textAnchor="middle" fontSize={n > 16 ? 10 : 12} className={`font-mono ${isCur || isT || visited.has(v) ? "fill-background font-bold" : "fill-muted-foreground"}`}>{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

const CYCLE_PRESETS: Record<string, [number, number]> = { a: [3, 7], b: [2, 7], c: [3, 16], d: [2, 19], e: [7, 19] };

export function PowerCycleVisualizer() {
  const [preset, setPreset] = useState("a");
  const [a, n] = CYCLE_PRESETS[preset];
  const frames = useMemo(() => cycleFrames(a, n), [a, n]);
  return (
    <Stepper
      title="Powers walk in a cycle"
      frames={frames}
      code={MATLAB_ORDER}
      codeLabel="MATLAB"
      legend={[["bg-neon", "current power"], ["bg-mint", "visited"]]}
      inputs={<Toggle<string> value={preset} onChange={setPreset} options={Object.entries(CYCLE_PRESETS).map(([k, [x, y]]) => [k, `${x} mod ${y}`] as [string, string])} />}
      render={(s) => (
        <div className="flex flex-wrap items-center gap-5">
          <CycleRing n={s.n} seq={s.seq} />
          <div className="font-mono text-sm flex flex-col gap-1 min-w-[150px]">
            <div className="text-muted-foreground text-[11px] uppercase tracking-widest">powers of {s.a}</div>
            <div className="break-words max-w-[240px]">{s.seq.slice(1).join(", ") || "…"}</div>
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------ powers table ----------------------------- */

export function PowersTable() {
  const [m, setM] = useState("19");
  const n = Number(m);
  const f = n - 1;
  return (
    <Panel title={`Powers of every a, modulo ${n}`} legend={[["bg-sky", "first period"], ["bg-mint", "primitive root row"]]}>
      <div className="overflow-x-auto">
        <table className="font-mono text-[11px] border-separate border-spacing-[2px]">
          <thead>
            <tr>
              <th className="px-1 text-muted-foreground font-normal">a</th>
              {Array.from({ length: f }, (_, k) => <th key={k} className="w-6 text-muted-foreground font-normal">a<sup>{k + 1}</sup></th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: f }, (_, i) => i + 1).map((a) => {
              const k = order(a, n)!;
              const root = isPrimitiveRoot(a, n);
              return (
                <tr key={a}>
                  <td className={`px-1 text-right ${root ? "text-mint font-bold" : ""}`}>{a}</td>
                  {powers(a, n, f).map((v, j) => (
                    <td key={j} className={`w-6 h-6 text-center rounded-[2px] transition-colors duration-300 ${j < k ? (root ? "bg-mint/30" : "bg-sky/25") : "text-muted-foreground/50"}`}>{v}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Toggle<string> value={m} onChange={setM} options={[["7", "mod 7"], ["11", "mod 11"], ["19", "mod 19"]]} />
    </Panel>
  );
}

/* --------------------------- extended Euclidean -------------------------- */

const EXT_PRESETS: Record<string, [number, number]> = { a: [130, 61], b: [61, 17], c: [240, 46] };

export function ExtendedEuclidVisualizer() {
  const [preset, setPreset] = useState("b");
  const [a, b] = EXT_PRESETS[preset];
  const frames = useMemo(() => extendedFrames(a, b), [a, b]);
  return (
    <Stepper
      title="Extended Euclidean algorithm"
      frames={frames}
      code={MATLAB_EXT}
      codeLabel="MATLAB"
      legend={[["bg-sky", "going down"], ["bg-neon", "climbing back"], ["bg-mint", "x and y known"]]}
      inputs={<Toggle<string> value={preset} onChange={setPreset} options={[["b", "61 and 17"], ["a", "130 and 61"], ["c", "240 and 46"]]} />}
      render={(s) => (
        <table className="font-mono text-[13px] border-separate border-spacing-y-1 min-w-[340px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground text-left">
              <th className="pr-5 font-normal">division</th>
              <th className="pr-3 font-normal text-right">x</th>
              <th className="font-normal text-right">y</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r, i) => {
              const shown = i <= s.down;
              const known = s.up !== null && i >= s.up;
              const live = s.up === i;
              return (
                <tr key={i} className="transition-opacity duration-300 motion-reduce:transition-none" style={{ opacity: shown ? 1 : 0.12 }}>
                  <td className={`pr-5 rounded-l-sm px-2 py-1 transition-colors duration-300 ${live ? "bg-neon/25" : i === s.down && s.up === null ? "bg-sky/25" : ""}`}>{r.a} = {r.q} × {r.b} + {r.r}</td>
                  <td className={`pr-3 text-right transition-opacity duration-500 ${live ? "bg-neon/25" : ""} ${known ? "text-mint opacity-100" : "opacity-0"}`}>{r.x}</td>
                  <td className={`pl-3 pr-2 text-right rounded-r-sm transition-opacity duration-500 ${live ? "bg-neon/25" : ""} ${known ? "text-mint opacity-100" : "opacity-0"}`}>{r.y}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    />
  );
}

/* --------------------------- fast exponentiation -------------------------- */

const FAST_PRESETS: Record<string, [number, number, number]> = { a: [25, 193, 469], b: [3, 100, 7], c: [7, 18, 19] };

export function FastModPowVisualizer() {
  const [preset, setPreset] = useState("a");
  const [a, m, n] = FAST_PRESETS[preset];
  const frames = useMemo(() => fastPowFrames(a, m, n), [a, m, n]);
  return (
    <Stepper
      title="Square and multiply"
      frames={frames}
      code={MATLAB_FASTPOW}
      codeLabel="MATLAB"
      legend={[["bg-neon", "current bit"], ["bg-orange", "bit 1: extra multiply"], ["bg-mint", "result"]]}
      inputs={<Toggle<string> value={preset} onChange={setPreset} options={Object.entries(FAST_PRESETS).map(([k, [x, y, z]]) => [k, `${x}^${y} mod ${z}`] as [string, string])} />}
      render={(s) => (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1 font-mono">
            <span className="text-[11px] text-muted-foreground mr-2">{s.m} =</span>
            {s.bits.split("").map((b, i) => (
              <div
                key={i}
                className={`w-8 h-9 flex items-center justify-center rounded-sm border transition-[transform,background-color,border-color] duration-300 motion-reduce:transition-none ${i === s.i ? `-translate-y-1 ${b === "1" ? "bg-orange/30 border-orange" : "bg-neon/25 border-neon"}` : i < s.i ? "border-mint bg-mint/10" : "border-border"}`}
              >
                {b}
              </div>
            ))}
            <span className="text-[11px] text-muted-foreground ml-1">₂</span>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-0.5 font-mono text-[12px] min-w-[230px] min-h-[12em]">
              {s.history.map((h, i) => (
                <div key={i} className={`flex justify-between gap-4 ${i === s.history.length - 1 ? "text-foreground" : "text-muted-foreground"}`}>
                  <span>{h.text}</span>
                  <span className={i === s.history.length - 1 ? "text-mint" : ""}>{h.value}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-[200px] flex flex-col gap-2 font-mono text-[11px]">
              <div className="text-muted-foreground uppercase tracking-widest">multiplications</div>
              <div className="flex items-center gap-2">
                <span className="w-14">fast</span>
                <div className="flex-1 h-3 bg-background/60 rounded-[2px] overflow-hidden"><div className="h-full bg-mint transition-all duration-300 motion-reduce:transition-none" style={{ width: `${Math.max(1, (s.mults / (s.m - 1)) * 100)}%` }} /></div>
                <span className="w-8 text-right">{s.mults}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-14">naive</span>
                <div className="flex-1 h-3 bg-orange rounded-[2px]" />
                <span className="w-8 text-right">{s.m - 1}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );
}

/* --------------------------- discrete logarithm -------------------------- */

const DLOG_BASES = [2, 3, 10, 13, 14, 15];

export function DiscreteLogSearch() {
  const [a, setA] = useState("2");
  const [b, setB] = useState(11);
  const base = Number(a);
  const frames = useMemo(() => dlogFrames(base, b, 19), [base, b]);
  const table = useMemo(() => logTable(base, 19), [base]);
  return (
    <Stepper
      title="Searching for a discrete log"
      frames={frames}
      code={MATLAB_DLOG}
      codeLabel="MATLAB"
      legend={[["bg-orange", "target"], ["bg-neon", "current power"], ["bg-mint", "tried"]]}
      inputs={
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            base <Toggle<string> value={a} onChange={setA} options={DLOG_BASES.map((v) => [String(v), String(v)] as [string, string])} />
          </div>
          <div className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <span className="mr-1">target b</span>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((v) => (
              <button key={v} type="button" className={`w-7 h-7 border rounded-sm ${v === b ? "border-orange text-orange" : "border-border text-foreground"}`} onClick={() => setB(v)}>{v}</button>
            ))}
          </div>
        </div>
      }
      render={(s) => (
        <div className="flex flex-wrap items-center gap-5">
          <CycleRing n={s.n} seq={s.seq} target={s.target} />
          <table className="font-mono text-[11px] border-separate border-spacing-[2px]">
            <tbody>
              {[0, 1].map((half) => {
                const nums = Array.from({ length: 9 }, (_, i) => i + 1 + half * 9);
                return (
                  <tr key={half} className="align-top">
                    <td className="p-0">
                      <table className="border-separate border-spacing-[2px]">
                        <tbody>
                          <tr><td className="pr-1 text-muted-foreground">b</td>{nums.map((v) => <td key={v} className={`w-6 text-center ${v === s.target ? "text-orange font-bold" : ""}`}>{v}</td>)}</tr>
                          <tr><td className="pr-1 text-muted-foreground">log</td>{nums.map((v) => <td key={v} className={`w-6 h-6 text-center rounded-[2px] transition-colors duration-300 ${s.seq.includes(v) ? "bg-mint/25" : "bg-background/60 text-transparent"}`}>{table[v]}</td>)}</tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    />
  );
}
