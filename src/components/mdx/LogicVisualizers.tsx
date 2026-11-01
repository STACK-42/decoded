import { useEffect, useMemo, useState } from "react";
import { btn, inputCls, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import type { Frame } from "@/lib/algorithms";
import {
  bitString, bitsOf, bitsToNumber, counterStep, divisionSteps, evalExpr, floatParts, fractionBits, jkNext, kmapLayout, latchVersusFlipFlop,
  lookaheadCarries, minimizeSop, onesComplement, placeValues, posFromMinterms, rippleAdd, sameFunction, shiftFrames, signedValue, sopFromMinterms, toBase, toBcd, toExcess3, toGray, truthRows, twosComplement, type Bit,
} from "@/lib/logic";

const BIT_ON: Record<string, string> = { mint: "border-mint bg-mint/20", neon: "border-neon bg-neon/20", sky: "border-sky bg-sky/20" };

const Bits = ({ value, tone = "mint" }: { value: string; tone?: string }) => (
  <span className="inline-flex gap-0.5 font-mono">
    {[...value].map((b, i) => (
      <span key={i} className={`w-6 h-7 flex items-center justify-center rounded-[2px] border text-[13px] ${b === "1" ? `${BIT_ON[tone]} font-bold` : "border-border text-muted-foreground"}`}>{b}</span>
    ))}
  </span>
);

/* ------------------------------- signals ------------------------------- */

/** A wobbling real voltage and what a digital input decides it means. */
export function VoltageBands() {
  const [noise, setNoise] = useState(0.25);
  const clean = [0, 0, 3.3, 3.3, 0, 3.3, 0, 0, 3.3, 3.3];
  // deterministic wobble, so the picture is stable from one render to the next
  const wobble = [0.3, -0.5, -0.7, 0.4, 0.8, -0.9, 0.5, 0.1, 0.6, -0.4];
  const v = clean.map((c, i) => Math.min(3.3, Math.max(0, c + wobble[i] * noise * 3.3)));
  const read = (x: number) => (x >= 2 ? "1" : x <= 0.8 ? "0" : "?");
  const W = 480, H = 170;
  const sy = (x: number) => H - (x / 3.3) * H;
  return (
    <Panel title="Why two levels survive noise">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-sm border border-border bg-background/60">
        <rect x={0} y={0} width={W} height={sy(2)} className="fill-mint/10" />
        <rect x={0} y={sy(2)} width={W} height={sy(0.8) - sy(2)} className="fill-orange/15" />
        <rect x={0} y={sy(0.8)} width={W} height={H - sy(0.8)} className="fill-sky/10" />
        <text x={6} y={16} className="fill-mint font-mono text-[11px]">HIGH: 2 V to 3.3 V reads as 1</text>
        <text x={6} y={sy(1.4) + 4} className="fill-orange font-mono text-[11px]">0.8 V to 2 V: not allowed</text>
        <text x={6} y={H - 6} className="fill-sky font-mono text-[11px]">LOW: 0 V to 0.8 V reads as 0</text>
        <polyline fill="none" strokeWidth={2.2} className="stroke-foreground" points={v.map((x, i) => `${24 + i * 48},${sy(x)}`).join(" ")} />
        {v.map((x, i) => <circle key={i} cx={24 + i * 48} cy={sy(x)} r={4} className="fill-foreground" />)}
      </svg>
      <div className="flex flex-wrap gap-1 font-mono text-[13px]">
        <span className="text-muted-foreground mr-2">sent {clean.map((c) => (c ? 1 : 0)).join(" ")}</span>
        <span className="text-muted-foreground">read</span>
        {v.map((x, i) => <span key={i} className={read(x) === "?" ? "text-orange font-bold" : read(x) === String(clean[i] ? 1 : 0) ? "text-mint" : "text-orange font-bold"}>{read(x)}</span>)}
      </div>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">
        noise
        <input type="range" min={0} max={0.7} step={0.05} value={noise} onChange={(e) => setNoise(Number(e.target.value))} aria-label="Noise level" className="flex-1 accent-[hsl(var(--orange))]" />
        <span className="w-12 text-right text-foreground">±{(noise * 3.3).toFixed(1)} V</span>
      </label>
    </Panel>
  );
}

/** A clock's period, frequency and duty cycle, dragged live. */
export function ClockExplorer() {
  const [period, setPeriod] = useState(10);
  const [width, setWidth] = useState(50);
  const W = 480, H = 90;
  const px = 480 / 48;
  const high = (period * width) / 100;
  const pts: string[] = [];
  for (let t = 0; t < 48; t += period) pts.push(`${t * px},${H - 15} ${t * px},18 ${(t + high) * px},18 ${(t + high) * px},${H - 15} ${(t + period) * px},${H - 15}`);
  return (
    <Panel title="Period, frequency, duty cycle">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-sm border border-border bg-background/60">
        <polyline fill="none" strokeWidth={2.4} className="stroke-mint" points={pts.join(" ")} />
        <path d={`M0,8H${period * px}`} strokeWidth={1.5} className="stroke-sky" />
        <text x={4} y={7} className="fill-sky font-mono text-[9px]">T</text>
      </svg>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">period
        <input type="range" min={4} max={24} value={period} onChange={(e) => setPeriod(Number(e.target.value))} aria-label="Period in nanoseconds" className="flex-1 accent-[hsl(var(--sky))]" />
      </label>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">HIGH time
        <input type="range" min={10} max={90} step={5} value={width} onChange={(e) => setWidth(Number(e.target.value))} aria-label="Duty cycle percent" className="flex-1 accent-[hsl(var(--mint))]" />
      </label>
      <div className="font-mono text-[13px] flex flex-wrap gap-x-6">
        <span>T = {period} ns</span><span>f = 1/T = {(1000 / period).toFixed(0)} MHz</span><span>duty cycle = {width}%</span>
      </div>
    </Panel>
  );
}

/** Serial sends one bit per tick on one wire; parallel sends them all at once on eight. */
export function SerialParallel() {
  const byte = "01000111";
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 1) % 10), 800);
    return () => clearInterval(id);
  }, []);
  return (
    <Panel title="The same byte, two ways">
      <div className="grid md:grid-cols-2 gap-6 font-mono text-[12px]">
        <div>
          <div className="text-muted-foreground mb-2">Serial: one wire, 8 ticks</div>
          <div className="flex gap-1">{[...byte].map((b, i) => <span key={i} className={`w-7 h-7 flex items-center justify-center border rounded-[2px] ${i < t ? "border-mint bg-mint/20" : i === t ? "border-neon bg-neon/20" : "border-border text-muted-foreground"}`}>{b}</span>)}</div>
          <div className="mt-2 text-muted-foreground">tick {Math.min(t + 1, 8)} of 8 {t >= 8 && "· done"}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-2">Parallel: eight wires, 1 tick</div>
          <div className="flex flex-col gap-0.5">{[...byte].map((b, i) => <div key={i} className="flex items-center gap-2"><span className="w-3">{b}</span><span className={`h-1 flex-1 ${b === "1" ? "bg-mint" : "bg-border"}`} /></div>)}</div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------------------- number systems --------------------------- */

const BASES: [string, string][] = [["2", "binary"], ["8", "octal"], ["16", "hex"]];

/** Repeated division: remainders drop out and read bottom-up. */
export function BaseConverter({ start = 58 }: { start?: number }) {
  const [n, setN] = useState(start);
  const [base, setBase] = useState("2");
  const b = Number(base);
  const steps = useMemo(() => divisionSteps(n, b), [n, b]);
  const frames = useMemo<Frame<{ upTo: number }>[]>(
    () => [
      ...steps.map((s, i) => ({
        state: { upTo: i },
        message: `${s.value} ÷ ${b} = ${s.quotient} remainder ${s.remainder}${s.remainder > 9 ? ` (written ${s.digit})` : ""}. That remainder is the next digit, working from the right.`,
        line: 1,
        stats: {},
      })),
      { state: { upTo: steps.length }, message: `The quotient reached 0. Read the remainders from the last to the first: ${n} in decimal is ${toBase(n, b)} in base ${b}.`, line: 3, stats: {} },
    ],
    [steps, n, b],
  );
  return (
    <Stepper
      title="Decimal to another base"
      frames={frames}
      codeLabel="The method"
      code={["while the number is above 0:", "    divide by the base and keep the remainder", "    carry on with the quotient", "read the remainders bottom to top"]}
      inputs={
        <div className="flex flex-wrap gap-3 items-center">
          <input type="number" min={0} max={65535} value={n} aria-label="Decimal number" onChange={(e) => setN(Math.min(65535, Math.max(0, Number(e.target.value) || 0)))} className={`${inputCls} w-28`} />
          <Toggle value={base} options={BASES} onChange={setBase} />
        </div>
      }
      render={({ upTo }) => (
        <div className="font-mono text-[14px] flex flex-col gap-1">
          {steps.slice(0, upTo + 1).map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-14 text-right">{s.value}</span>
              <span className="text-muted-foreground">÷ {b} =</span>
              <span className="w-12">{s.quotient}</span>
              <span className="text-muted-foreground">rem</span>
              <span className={`w-7 h-7 flex items-center justify-center rounded-[2px] border ${i === upTo ? "border-neon bg-neon/20" : "border-mint bg-mint/15"}`}>{s.digit}</span>
            </div>
          ))}
          {upTo === steps.length && <div className="mt-2 text-lg">{[...steps].reverse().map((s, i) => <span key={i} className="text-mint font-bold">{s.digit}</span>)}<sub className="text-muted-foreground ml-1">{b}</sub></div>}
        </div>
      )}
    />
  );
}

/** Toggle each bit and see its weight join the total. */
export function PlaceValueBits({ width = 8 }: { width?: number }) {
  const [v, setV] = useState(109);
  const bits = bitsOf(v, width);
  const hex = toBase(v, 16).padStart(Math.ceil(width / 4), "0");
  const oct = toBase(v, 8);
  return (
    <Panel title="Each switch is worth a power of two">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {bits.map((b, i) => {
          const w = 2 ** (width - 1 - i);
          return (
            <button key={i} type="button" aria-pressed={!!b} aria-label={`Bit worth ${w}`} onClick={() => setV(v ^ w)} className={`w-11 flex flex-col items-center rounded-sm border py-1.5 font-mono transition-colors ${b ? "border-mint bg-mint/20" : "border-border"}`}>
              <span className="text-[10px] text-muted-foreground">{w}</span>
              <span className="text-lg font-bold">{b}</span>
            </button>
          );
        })}
      </div>
      <div className="font-mono text-[13px] text-center break-words">
        {placeValues(bits.join(""), 2).filter((p) => p.digit).map((p) => p.weight).join(" + ") || "0"} = <span className="text-mint font-bold">{v}</span>
      </div>
      <div className="font-mono text-[12px] text-muted-foreground flex flex-wrap justify-center gap-x-6">
        <span>hex <span className="text-foreground">{hex}</span> (group 4 bits)</span>
        <span>octal <span className="text-foreground">{oct}</span> (group 3 bits)</span>
      </div>
    </Panel>
  );
}

/** Fractions: keep doubling, and the whole-number part that pops out is the next bit. */
export function FractionConverter() {
  const [f, setF] = useState(0.3125);
  const rows = fractionBits(f);
  return (
    <Panel title="A decimal fraction to binary">
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">fraction
        <input type="number" step={0.0625} min={0} max={0.9999} value={f} onChange={(e) => setF(Math.min(0.9999, Math.max(0, Number(e.target.value) || 0)))} aria-label="Fraction" className={`${inputCls} w-28`} />
      </label>
      <div className="font-mono text-[13px] flex flex-col gap-1">
        {rows.map((r, i) => <div key={i}>{r.value} × 2 = {r.product} <span className="text-muted-foreground">→ bit</span> <span className="text-mint font-bold">{r.bit}</span></div>)}
      </div>
      <div className="font-mono text-[14px]">0.<span className="text-mint font-bold">{rows.map((r) => r.bit).join("")}</span><sub>2</sub>{rows.length === 8 && <span className="text-orange text-[12px] ml-2">cut at 8 bits: this one never ends</span>}</div>
    </Panel>
  );
}

/** Column addition with carries lifted above the numbers. */
export function BinaryAddition() {
  const [a, setA] = useState(6);
  const [b, setB] = useState(7);
  const w = 5;
  const cols = rippleAdd(a, b, w);
  const order = [...cols].reverse();
  return (
    <Panel title="Binary addition, column by column">
      <div className="flex gap-6 flex-wrap font-mono text-[12px] text-muted-foreground">
        <label className="flex items-center gap-2">A <input type="range" min={0} max={15} value={a} onChange={(e) => setA(Number(e.target.value))} aria-label="A" className="accent-[hsl(var(--mint))]" /> <span className="text-foreground w-5">{a}</span></label>
        <label className="flex items-center gap-2">B <input type="range" min={0} max={15} value={b} onChange={(e) => setB(Number(e.target.value))} aria-label="B" className="accent-[hsl(var(--mint))]" /> <span className="text-foreground w-5">{b}</span></label>
      </div>
      <div className="font-mono text-[18px] inline-grid gap-y-1 w-fit" style={{ gridTemplateColumns: `4rem repeat(${w}, 2rem)` }}>
        <span className="text-[11px] text-orange self-center">carry</span>{order.map((c) => <span key={c.index} className="text-center text-orange text-[13px]">{c.carryIn || ""}</span>)}
        <span className="text-[11px] text-muted-foreground self-center">A = {a}</span>{order.map((c) => <span key={c.index} className="text-center">{c.a}</span>)}
        <span className="text-[11px] text-muted-foreground self-center">B = {b}</span>{order.map((c) => <span key={c.index} className="text-center border-b border-foreground">{c.b}</span>)}
        <span className="text-[11px] text-mint self-center">sum = {a + b}</span>{order.map((c) => <span key={c.index} className="text-center text-mint font-bold">{c.sum}</span>)}
      </div>
    </Panel>
  );
}

/** The 4-bit two's complement clock: adding wraps, and overflow is visible as crossing the seam. */
export function TwosComplementWheel() {
  const [v, setV] = useState(5);
  const [add, setAdd] = useState(4);
  const W = 300, C = 150, R = 112;
  const pos = (n: number) => {
    const a = ((n * 360) / 16 - 90) * (Math.PI / 180);
    return [C + R * Math.cos(a), C + R * Math.sin(a)];
  };
  const sum = (v + add) & 15;
  const sa = signedValue(v, 4), sb = signedValue(add, 4), ss = signedValue(sum, 4);
  const overflow = sa + sb !== ss;
  const neg = twosComplement(v, 4);
  return (
    <Panel title="Four bits bent into a circle">
      <div className="grid md:grid-cols-[300px_1fr] gap-5 items-center">
        <svg viewBox={`0 0 ${W} ${W}`} className="w-full max-w-[300px] mx-auto">
          <circle cx={C} cy={C} r={R} fill="none" className="stroke-border" strokeWidth={2} />
          {Array.from({ length: 16 }, (_, n) => {
            const [x, y] = pos(n);
            const tone = n === v ? "fill-neon/40 stroke-neon" : n === sum ? "fill-mint/40 stroke-mint" : "fill-card stroke-border";
            return (
              <g key={n} onClick={() => setV(n)} className="cursor-pointer" role="button" aria-label={`Pick ${bitString(n, 4)}`}>
                <circle cx={x} cy={y} r={19} strokeWidth={2} className={tone} />
                <text x={x} y={y - 2} textAnchor="middle" className="fill-foreground font-mono text-[10px]">{bitString(n, 4)}</text>
                <text x={x} y={y + 10} textAnchor="middle" className={`font-mono text-[11px] font-bold ${n >= 8 ? "fill-orange" : "fill-sky"}`}>{signedValue(n, 4)}</text>
              </g>
            );
          })}
          <text x={C} y={C - 4} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">click a number</text>
          <text x={C} y={C + 12} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">top half of bits = negative</text>
        </svg>
        <div className="flex flex-col gap-3 font-mono text-[13px]">
          <div>value <Bits value={bitString(v, 4)} tone="neon" /> = {sa}</div>
          <div className="text-muted-foreground">flip every bit (1's complement) <span className="text-foreground">{bitString(onesComplement(v, 4), 4)}</span></div>
          <div className="text-muted-foreground">add 1 (2's complement) <span className="text-foreground">{bitString(neg, 4)}</span> = {signedValue(neg, 4)}</div>
          <label className="flex items-center gap-2 text-muted-foreground">add <input type="range" min={0} max={7} value={add} onChange={(e) => setAdd(Number(e.target.value))} aria-label="Amount to add" className="flex-1 accent-[hsl(var(--mint))]" /><span className="text-foreground w-3">{add}</span></label>
          <div>{sa} + {sb} → <Bits value={bitString(sum, 4)} /> = {ss}</div>
          <div className={overflow ? "text-orange" : "text-mint"}>{overflow ? `Overflow: the true answer ${sa + sb} doesn't fit in 4 bits, so it wrapped past the seam between 7 and -8.` : "Fits. The answer is correct."}</div>
        </div>
      </div>
    </Panel>
  );
}

/** Why Gray code exists: on a position sensor, several bits never change at exactly the same instant. */
export function GrayEncoder() {
  const [pos, setPos] = useState(3);
  const [gray, setGray] = useState(false);
  const code = (n: number) => (gray ? toGray(n) : n);
  const cur = bitString(code(pos), 3);
  const next = bitString(code((pos + 1) % 8), 3);
  const flips = [...cur].filter((b, i) => b !== next[i]).length;
  const C = 120;
  return (
    <Panel title="A rotating shaft reading its own position">
      <div className="grid md:grid-cols-[240px_1fr] gap-5 items-center">
        <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
          {Array.from({ length: 8 }, (_, n) => {
            const a0 = ((n * 45 - 90) * Math.PI) / 180, a1 = (((n + 1) * 45 - 90) * Math.PI) / 180;
            const bits = bitString(code(n), 3);
            return [...bits].map((b, ring) => {
              const r1 = 110 - ring * 28, r0 = r1 - 26;
              const p = (r: number, a: number) => `${C + r * Math.cos(a)},${C + r * Math.sin(a)}`;
              return <path key={`${n}${ring}`} d={`M${p(r0, a0)} L${p(r1, a0)} A${r1},${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 0 0 ${p(r0, a0)}Z`} onClick={() => setPos(n)} className={`cursor-pointer stroke-card ${b === "1" ? (n === pos ? "fill-mint" : "fill-foreground/60") : n === pos ? "fill-mint/25" : "fill-background"}`} strokeWidth={1.5} />;
            });
          })}
        </svg>
        <div className="flex flex-col gap-3 font-mono text-[13px]">
          <Toggle value={gray ? "gray" : "bin"} options={[["bin", "binary"], ["gray", "gray"]]} onChange={(x) => setGray(x === "gray")} />
          <div>position {pos} <Bits value={cur} /></div>
          <div className="text-muted-foreground">next {(pos + 1) % 8} <Bits value={next} tone="sky" /></div>
          <div className={flips > 1 ? "text-orange" : "text-mint"}>{flips} bit{flips > 1 ? "s" : ""} must change. {flips > 1 ? "If they change a moment apart, the sensor reads a wrong position in between." : "With one bit changing, there is no in-between reading."}</div>
          <button type="button" className={`${btn} w-fit`} onClick={() => setPos((pos + 1) % 8)}>Rotate →</button>
        </div>
      </div>
    </Panel>
  );
}

/** One decimal number in every code from the lesson. */
export function CodeTable() {
  const [d, setD] = useState(7);
  return (
    <Panel title="One digit, many codes">
      <input type="range" min={0} max={9} value={d} onChange={(e) => setD(Number(e.target.value))} aria-label="Decimal digit" className="accent-[hsl(var(--mint))] max-w-xs" />
      <table className="font-mono text-[13px] w-fit">
        <tbody>
          {[["Decimal", String(d)], ["Binary / BCD 8421", toBcd(d)[0]], ["Excess-3 (digit + 3)", toExcess3(d)], ["Gray", bitString(toGray(d), 4)], ["ASCII for the character", bitString(48 + d, 8)]].map(([k, v]) => (
            <tr key={k}><td className="pr-6 py-1 text-muted-foreground">{k}</td><td className="font-bold">{v}</td></tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** Live IEEE 754 single precision breakdown. */
export function FloatExplorer() {
  const [text, setText] = useState("0.15625");
  const value = Number(text) || 0;
  const p = floatParts(value);
  const exp = p.exponent - 127;
  const seg = (s: string, cls: string, label: string) => (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-px">{[...s].map((b, i) => <span key={i} className={`w-[14px] h-6 flex items-center justify-center font-mono text-[10px] rounded-[1px] ${b === "1" ? `${cls} font-bold` : "bg-background border border-border text-muted-foreground"}`}>{b}</span>)}</div>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
  return (
    <Panel title="32 bits: sign, exponent, fraction" legend={[["bg-orange", "sign"], ["bg-sky", "exponent"], ["bg-mint", "fraction"]]}>
      <input value={text} onChange={(e) => setText(e.target.value)} aria-label="A decimal number" className={`${inputCls} w-48`} />
      <div className="flex flex-wrap gap-3">
        {seg(p.bits[0], "bg-orange/40", "sign")}
        {seg(p.bits.slice(1, 9), "bg-sky/40", "exponent")}
        {seg(p.bits.slice(9), "bg-mint/40", "fraction")}
      </div>
      <div className="font-mono text-[13px] flex flex-col gap-1">
        <div>sign {p.sign} means {p.sign ? "negative" : "positive"}</div>
        {p.kind === "normal" && <div>stored exponent {p.exponent}, minus the bias of 127, is {exp}: the point moves {Math.abs(exp)} place{Math.abs(exp) === 1 ? "" : "s"} {exp >= 0 ? "right" : "left"}</div>}
        {p.kind === "normal" && <div>value = 1.<span className="text-mint">{p.bits.slice(9).replace(/0+$/, "") || "0"}</span> × 2^{exp}</div>}
        {p.kind !== "normal" && <div className="text-muted-foreground">special case: {p.kind}</div>}
        <div>what actually got stored: <span className="font-bold">{p.value}</span>{p.value !== value && <span className="text-orange"> (rounded; {value} has no exact binary form in 32 bits)</span>}</div>
      </div>
    </Panel>
  );
}

/* ---------------------------- Boolean algebra -------------------------- */

const LAWS: [string, string, string, string[]][] = [
  ["Rule 2", "A + 1", "1", ["A"]],
  ["Rule 3", "A · 0", "0", ["A"]],
  ["Rule 6", "A + A'", "1", ["A"]],
  ["Rule 8", "A · A'", "0", ["A"]],
  ["Rule 10", "A + AB", "A", ["A", "B"]],
  ["Rule 11", "A + A'B", "A + B", ["A", "B"]],
  ["Rule 12", "(A + B)(A + C)", "A + BC", ["A", "B", "C"]],
  ["De Morgan 1", "(AB)'", "A' + B'", ["A", "B"]],
  ["De Morgan 2", "(A + B)'", "A'B'", ["A", "B"]],
];

/** A law is only true if the two sides agree on every row, so check every row. */
export function LawChecker() {
  const [i, setI] = useState(5);
  const [l, left, right, vars] = LAWS[i];
  const rows = truthRows(vars);
  return (
    <Panel title="Prove a rule by checking every row">
      <div className="flex flex-wrap gap-1.5">{LAWS.map((x, k) => <button key={x[0]} type="button" onClick={() => setI(k)} aria-pressed={k === i} className={`${btn} !px-2 ${k === i ? "bg-foreground text-background" : ""}`}>{x[0]}</button>)}</div>
      <div className="font-mono text-lg">{left} = {right}</div>
      <table className="font-mono text-[13px] w-fit border-collapse">
        <thead><tr>{vars.map((v) => <th key={v} className="px-3 border-b border-border">{v}</th>)}<th className="px-3 border-b border-border text-sky">{left}</th><th className="px-3 border-b border-border text-sky">{right}</th><th className="px-3 border-b border-border" /></tr></thead>
        <tbody>
          {rows.map(({ m, env }) => {
            const a = evalExpr(left.replace(/·/g, "."), env), b = evalExpr(right.replace(/·/g, "."), env);
            return <tr key={m}>{vars.map((v) => <td key={v} className="px-3 text-center">{env[v]}</td>)}<td className="px-3 text-center font-bold">{a}</td><td className="px-3 text-center font-bold">{b}</td><td className="px-3 text-mint">{a === b ? "✓" : "✗"}</td></tr>;
          })}
        </tbody>
      </table>
      <div className="font-mono text-[12px] text-mint">{sameFunction(left.replace(/·/g, "."), right.replace(/·/g, "."), vars) ? `${rows.length} of ${rows.length} rows agree, so the two sides are the same function (${l}).` : "The sides differ."}</div>
    </Panel>
  );
}

/** Click output cells; the SOP and POS rewrite themselves. */
export function TruthTableBuilder({ start = [3, 4] }: { start?: number[] }) {
  const vars = ["A", "B", "C"];
  const [on, setOn] = useState<number[]>(start);
  const rows = truthRows(vars);
  return (
    <Panel title="From a truth table to an expression">
      <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <table className="font-mono text-[13px] border-collapse">
          <thead><tr>{[...vars, "X"].map((v) => <th key={v} className="px-3 border-b border-border">{v}</th>)}</tr></thead>
          <tbody>
            {rows.map(({ m, env }) => (
              <tr key={m} className={on.includes(m) ? "bg-mint/15" : ""}>
                {vars.map((v) => <td key={v} className="px-3 text-center">{env[v]}</td>)}
                <td className="px-1 text-center"><button type="button" aria-label={`Output for row ${m}`} onClick={() => setOn(on.includes(m) ? on.filter((x) => x !== m) : [...on, m])} className={`w-7 h-6 border rounded-[2px] font-bold ${on.includes(m) ? "border-mint" : "border-border"}`}>{on.includes(m) ? 1 : 0}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col gap-4 font-mono text-[13px]">
          <div><div className="eyebrow text-mint mb-1">Sum of products</div><div className="break-words">X = {sopFromMinterms(on, vars)}</div><div className="text-muted-foreground text-[11px] font-body mt-1">One AND term for each row that gives 1. X is 1 if this row or that row happened.</div></div>
          <div><div className="eyebrow text-sky mb-1">Product of sums</div><div className="break-words">X = {posFromMinterms(on, vars)}</div><div className="text-muted-foreground text-[11px] font-body mt-1">One OR term for each row that gives 0. Each term rules out one bad row.</div></div>
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------- K-map -------------------------------- */

const GROUP_TONES = ["border-mint bg-mint/25", "border-sky bg-sky/25", "border-orange bg-orange/25", "border-violet bg-violet/25", "border-neon bg-neon/25"];
const TERM_TONES = ["text-mint", "text-sky", "text-orange", "text-violet", "text-neon"];

/** Click cells on or off. The groups, and the simplified expression, follow. */
export function KMapExplorer({ vars = ["A", "B", "C"], start = [5, 3, 1, 0, 4] }: { vars?: string[]; start?: number[] }) {
  const n = vars.length as 2 | 3 | 4;
  const [on, setOn] = useState<number[]>(start);
  const layout = kmapLayout(n);
  const groups = useMemo(() => minimizeSop(on, vars), [on, vars]);
  const label = (bits: number, count: number) => bitString(bits, count);
  const before = sopFromMinterms(on, vars);
  const after = groups.map((g) => g.term).join(" + ") || "0";
  const litBefore = on.length === 2 ** n ? 0 : on.length * n;
  const litAfter = groups.reduce((s, g) => s + (g.term === "1" ? 0 : g.term.replace(/'/g, "").length), 0);
  return (
    <Panel title="Karnaugh map" legend={[["bg-mint/40", "each colour is one group"]]}>
      <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="font-mono text-[12px]">
          <div className="flex">
            <div className="w-14 h-7 flex items-end justify-end pr-1 text-[10px] text-muted-foreground">{vars.slice(0, layout.rowBits).join("")}\{vars.slice(layout.rowBits).join("")}</div>
            {layout.cols.map((c) => <div key={c} className="w-14 h-7 flex items-center justify-center text-muted-foreground">{label(c, layout.colBits)}</div>)}
          </div>
          {layout.rows.map((rv, r) => (
            <div key={rv} className="flex">
              <div className="w-14 h-14 flex items-center justify-end pr-2 text-muted-foreground">{label(rv, layout.rowBits)}</div>
              {layout.cols.map((_, c) => {
                const m = layout.cell(r, c);
                const isOn = on.includes(m);
                const owners = groups.map((g, i) => (g.cells.includes(m) ? i : -1)).filter((i) => i >= 0);
                return (
                  <button key={m} type="button" aria-pressed={isOn} aria-label={`Cell ${bitString(m, n)}`} onClick={() => setOn(isOn ? on.filter((x) => x !== m) : [...on, m])} className={`relative w-14 h-14 border text-lg font-bold transition-colors ${isOn && owners.length ? GROUP_TONES[owners[0] % 5] : "border-border"}`}>
                    {isOn ? 1 : <span className="text-muted-foreground/40 font-normal">0</span>}
                    {owners.length > 1 && <span className={`absolute inset-1.5 border-2 rounded-sm pointer-events-none ${GROUP_TONES[owners[1] % 5].split(" ")[0]}`} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 text-[13px]">
          <div className="font-mono text-muted-foreground break-words"><span className="eyebrow block mb-1">Before</span>{before}</div>
          <div className="font-mono text-lg break-words"><span className="eyebrow block mb-1 text-mint">After</span>{groups.length ? groups.map((g, i) => <span key={i}>{i > 0 && " + "}<span className={TERM_TONES[i % 5]}>{g.term}</span></span>) : after}</div>
          <div className="font-mono text-[12px] text-muted-foreground">{litBefore} variables wired up before, {litAfter} after.</div>
          <ul className="text-sm space-y-1">
            {groups.map((g, i) => <li key={i}><span className={`font-mono font-bold ${TERM_TONES[i % 5]}`}>{g.term}</span>: a group of {g.cells.length}. The variables that change inside it cancel out.</li>)}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

/* --------------------------------- adders ------------------------------ */

/** Ripple carry: each stage waits for the one before it. Look-ahead: all at once. */
export function CarryRace() {
  const [a, setA] = useState(15);
  const [b, setB] = useState(1);
  const [t, setT] = useState(0);
  const [run, setRun] = useState(false);
  const w = 8;
  const cols = rippleAdd(a, b, w);
  const look = lookaheadCarries(a, b, w);
  // each ripple stage is ready two gate delays after the carry reaches it
  const readyAt = (i: number) => {
    let reach = 0;
    for (let k = 0; k < i; k++) if (cols[k].carryOut) reach = (k + 1) * 2;
    return reach + 2;
  };
  const rippleDone = Math.max(...cols.map((_, i) => readyAt(i)));
  const lookDone = 4;
  const end = Math.max(rippleDone, lookDone) + 1;
  useEffect(() => {
    if (!run) return;
    if (t >= end) { setRun(false); return; }
    const id = setTimeout(() => setT((x) => x + 1), 450);
    return () => clearTimeout(id);
  }, [run, t, end]);
  const lane = (label: string, ready: (i: number) => boolean, carry: (i: number) => Bit) => (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="flex gap-1 flex-row-reverse justify-end">
        {cols.map((c, i) => (
          <div key={i} className={`w-11 h-14 rounded-[2px] border flex flex-col items-center justify-center font-mono transition-colors ${ready(i) ? "border-mint bg-mint/20" : "border-border"}`}>
            <span className="text-[9px] text-orange">{ready(i) && carry(i) ? "c→" : " "}</span>
            <span className="font-bold">{ready(i) ? c.sum : "?"}</span>
            <span className="text-[9px] text-muted-foreground">bit {i}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Panel title="Ripple carry vs look-ahead">
      <div className="flex gap-5 flex-wrap font-mono text-[12px] text-muted-foreground items-center">
        <label className="flex items-center gap-2">A<input type="number" min={0} max={255} value={a} onChange={(e) => { setA(Math.min(255, Math.max(0, Number(e.target.value) || 0))); setT(0); }} aria-label="A" className={`${inputCls} w-20`} /></label>
        <label className="flex items-center gap-2">B<input type="number" min={0} max={255} value={b} onChange={(e) => { setB(Math.min(255, Math.max(0, Number(e.target.value) || 0))); setT(0); }} aria-label="B" className={`${inputCls} w-20`} /></label>
        <button type="button" className={btn} onClick={() => { setT(0); setRun(true); }}>▶ Race</button>
        <span>time <span className="text-foreground">{t}</span> gate delays</span>
      </div>
      {lane(`Ripple: valid after ${rippleDone} delays`, (i) => t >= readyAt(i), (i) => cols[i].carryOut)}
      {lane(`Look-ahead: valid after ${lookDone} delays, whatever the numbers`, () => t >= lookDone, (i) => look.c[i + 1])}
      <div className="font-mono text-[13px]">{a} + {b} = {a + b}. Try 255 + 1 for the worst case, and 1 + 2 for no carries at all.</div>
    </Panel>
  );
}

/** Press a key. A priority encoder reports the highest key held. */
export function PriorityEncoder() {
  const [held, setHeld] = useState<number[]>([3]);
  const top = held.length ? Math.max(...held) : -1;
  return (
    <Panel title="Keypad to BCD: a priority encoder">
      <div className="grid grid-cols-5 gap-1.5 w-fit">
        {Array.from({ length: 10 }, (_, d) => (
          <button key={d} type="button" aria-pressed={held.includes(d)} onClick={() => setHeld(held.includes(d) ? held.filter((x) => x !== d) : [...held, d])} className={`w-11 h-11 border rounded-sm font-mono font-bold ${d === top ? "border-mint bg-mint/25" : held.includes(d) ? "border-orange bg-orange/15" : "border-border"}`}>{d}</button>
        ))}
      </div>
      <div className="font-mono text-[14px]">{top >= 0 ? <>Output <Bits value={bitString(top, 4)} /> = {top}</> : <span className="text-muted-foreground">No key pressed.</span>}</div>
      {held.length > 1 && <div className="text-sm text-orange">Several keys are down. The highest wins and the others are ignored.</div>}
    </Panel>
  );
}

/* ------------------------------- timing -------------------------------- */

export function TimingDiagram({ signals, marks = [], cellW = 34 }: { signals: { name: string; bits: Bit[]; tone?: string }[]; marks?: number[]; cellW?: number }) {
  const n = signals[0]?.bits.length ?? 0;
  const rowH = 38;
  const left = 44;
  return (
    <svg viewBox={`0 0 ${left + n * cellW + 4} ${signals.length * rowH + 4}`} className="w-full max-w-[640px] block" role="img" aria-label="Timing diagram">
      {marks.map((m) => <path key={m} d={`M${left + m * cellW},0V${signals.length * rowH}`} strokeDasharray="3 3" className="stroke-neon" />)}
      {signals.map((s, r) => {
        const y = (b: Bit) => r * rowH + (b ? 6 : rowH - 8);
        const d = s.bits.map((b, i) => `${i ? "V" : "M" + left + "," }${i ? y(b) : y(b)}H${left + (i + 1) * cellW}`).join("");
        return (
          <g key={s.name}>
            <text x={left - 8} y={r * rowH + rowH / 2 + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[12px]">{s.name}</text>
            <path d={d} fill="none" strokeWidth={2.2} className={s.tone ?? "stroke-foreground"} />
          </g>
        );
      })}
    </svg>
  );
}

const DEFAULT_CLK: Bit[] = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0];

/** Same clock, same data: draw on D and compare what a latch and a flip-flop do. */
export function EdgeLab() {
  const [d, setD] = useState<Bit[]>([0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1]);
  const { latch, flop } = latchVersusFlipFlop(DEFAULT_CLK, d);
  const edges = DEFAULT_CLK.map((c, i) => (c && !DEFAULT_CLK[i - 1] ? i : -1)).filter((i) => i >= 0);
  return (
    <Panel title="Level-triggered vs edge-triggered" legend={[["bg-neon", "rising edge"], ["bg-sky", "latch Q"], ["bg-mint", "flip-flop Q"]]}>
      <TimingDiagram marks={edges} signals={[
        { name: "CLK", bits: DEFAULT_CLK },
        { name: "D", bits: d, tone: "stroke-orange" },
        { name: "latch", bits: latch, tone: "stroke-sky" },
        { name: "flop", bits: flop, tone: "stroke-mint" },
      ]} />
      <div>
        <div className="font-mono text-[11px] text-muted-foreground mb-1">Click to change D at each moment:</div>
        <div className="flex gap-px flex-wrap">{d.map((b, i) => <button key={i} type="button" aria-label={`D at time ${i}`} aria-pressed={!!b} onClick={() => setD(d.map((x, k) => (k === i ? ((x ? 0 : 1) as Bit) : x)))} className={`w-7 h-7 font-mono text-[12px] border rounded-[2px] ${b ? "border-orange bg-orange/25" : "border-border"}`}>{b}</button>)}</div>
      </div>
      <p className="text-sm leading-relaxed">The latch follows every wiggle in D while the clock is high. The flip-flop takes a single photo of D at each rising edge and ignores everything in between.</p>
    </Panel>
  );
}

/** JK flip-flop: choose J and K, then press the clock. */
export function JkLab() {
  const [j, setJ] = useState<Bit>(1);
  const [k, setK] = useState<Bit>(1);
  const [hist, setHist] = useState<Bit[]>([0]);
  const q = hist[hist.length - 1];
  const name = j && k ? "toggle" : j ? "set" : k ? "reset" : "hold";
  const row = (jj: Bit, kk: Bit, label: string) => <tr key={label} className={jj === j && kk === k ? "bg-mint/20" : ""}><td className="px-3 text-center">{jj}</td><td className="px-3 text-center">{kk}</td><td className="px-3">{label}</td></tr>;
  return (
    <Panel title="JK flip-flop">
      <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button type="button" className={`${btn} ${j ? "border-mint bg-mint/20" : ""}`} aria-pressed={!!j} onClick={() => setJ(j ? 0 : 1)}>J = {j}</button>
            <button type="button" className={`${btn} ${k ? "border-mint bg-mint/20" : ""}`} aria-pressed={!!k} onClick={() => setK(k ? 0 : 1)}>K = {k}</button>
          </div>
          <button type="button" className={`${btn} border-neon`} onClick={() => setHist([...hist.slice(-23), jkNext(q, { j, k })])}>⇧ Clock edge</button>
          <button type="button" className={btn} onClick={() => setHist([0])}>⟲ Reset</button>
          <table className="font-mono text-[13px]"><thead><tr><th className="px-3">J</th><th className="px-3">K</th><th className="px-3 text-left">at the edge</th></tr></thead><tbody>{row(0, 0, "hold")}{row(0, 1, "reset to 0")}{row(1, 0, "set to 1")}{row(1, 1, "toggle")}</tbody></table>
        </div>
        <div className="flex flex-col gap-3">
          <div className="font-mono">Q = <span className={`text-2xl font-bold ${q ? "text-mint" : ""}`}>{q}</span> <span className="text-muted-foreground text-[12px]">next edge will {name}</span></div>
          <div className="flex gap-px flex-wrap items-end h-10">{hist.map((b, i) => <span key={i} className={`w-3 ${b ? "h-9 bg-mint" : "h-1.5 bg-border"}`} />)}</div>
          <div className="text-sm text-muted-foreground">Q's history, one bar per clock edge. J=K=1 is the one input an SR latch forbids; here it means "flip".</div>
        </div>
      </div>
    </Panel>
  );
}

/** Master-slave: two latches take turns, so there's never a clear path from D to Q. */
export function MasterSlave() {
  const [d, setD] = useState<Bit>(1);
  const [clk, setClk] = useState<Bit>(0);
  const [m, setM] = useState<Bit>(0);
  const [q, setQ] = useState<Bit>(0);
  const master = clk === 0 ? d : m;
  const box = (name: string, open: boolean, val: Bit) => (
    <div className={`w-28 h-24 rounded-sm border-2 flex flex-col items-center justify-center gap-1 transition-colors ${open ? "border-mint bg-mint/10" : "border-border"}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{name}</span>
      <span className="text-2xl font-mono font-bold">{val}</span>
      <span className={`font-mono text-[10px] ${open ? "text-mint" : "text-muted-foreground"}`}>{open ? "door open" : "door shut"}</span>
    </div>
  );
  const flip = () => {
    if (clk === 0) { setM(d); setQ(d); setClk(1); } // rising edge: master freezes, slave copies
    else { setClk(0); }
  };
  return (
    <Panel title="Two latches, one airlock">
      <div className="flex items-center gap-2 flex-wrap font-mono">
        <button type="button" onClick={() => setD(d ? 0 : 1)} aria-pressed={!!d} className={`${btn} ${d ? "border-orange bg-orange/20" : ""}`}>D = {d}</button>
        <span className="text-muted-foreground">→</span>
        {box("master", clk === 0, master)}
        <span className="text-muted-foreground">→</span>
        {box("slave", clk === 1, q)}
        <span className="text-muted-foreground">→ Q = <span className="text-mint font-bold">{q}</span></span>
      </div>
      <div className="flex gap-3 items-center flex-wrap">
        <button type="button" className={`${btn} border-neon`} onClick={flip}>{clk === 0 ? "⇧ Clock rises" : "⇩ Clock falls"}</button>
        <span className="font-mono text-[12px] text-muted-foreground">CLK = {clk}</span>
      </div>
      <p className="text-sm leading-relaxed">{clk === 0 ? "Clock low: the master listens to D while the slave holds Q steady. Change D now and only the master moves." : "Clock high: the master froze the value it had at the instant of the edge and the slave copied it to Q. Change D now and nothing moves."}</p>
    </Panel>
  );
}

/* -------------------------- registers & counters ----------------------- */

/** Parallel-load register: write-enable decides whether the clock edge copies D in. */
export function RegisterLab() {
  const [input, setInput] = useState(0b1011);
  const [stored, setStored] = useState(0b0101);
  const [load, setLoad] = useState(true);
  const [flash, setFlash] = useState(false);
  const clock = () => {
    if (load) setStored(input);
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
  };
  const ibits = bitsOf(input, 4), sbits = bitsOf(stored, 4);
  return (
    <Panel title="A 4-bit register: four flip-flops sharing one clock">
      <div className="flex flex-col gap-2 font-mono items-start">
        <div className="flex gap-2 items-center"><span className="w-12 text-[11px] text-muted-foreground">D</span>{ibits.map((b, i) => <button key={i} type="button" aria-label={`Data bit ${3 - i}`} aria-pressed={!!b} onClick={() => setInput(input ^ (1 << (3 - i)))} className={`w-12 h-9 border rounded-[2px] font-bold ${b ? "border-orange bg-orange/20" : "border-border"}`}>{b}</button>)}</div>
        <div className="flex gap-2 items-center"><span className="w-12" />{ibits.map((_, i) => <span key={i} className={`w-12 text-center transition-colors ${flash && load ? "text-neon" : "text-border"}`}>↓</span>)}</div>
        <div className="flex gap-2 items-center"><span className="w-12 text-[11px] text-muted-foreground">Q</span>{sbits.map((b, i) => <span key={i} className={`w-12 h-12 border-2 rounded-[2px] flex items-center justify-center text-lg font-bold transition-colors ${flash && load ? "border-neon bg-neon/20" : b ? "border-mint bg-mint/20" : "border-border"}`}>{b}</span>)}<span className="text-[12px] text-muted-foreground ml-2">= {stored}</span></div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" className={`${btn} ${load ? "border-mint bg-mint/20" : ""}`} aria-pressed={load} onClick={() => setLoad(!load)}>Load = {load ? 1 : 0}</button>
        <button type="button" className={`${btn} border-neon`} onClick={clock}>⇧ Clock edge</button>
      </div>
      <p className="text-sm">{load ? "With Load on, the next edge copies D into all four flip-flops at once." : "With Load off, each flip-flop feeds its own Q back to its D, so the clock edge changes nothing."}</p>
    </Panel>
  );
}

/** Bits march through a chain of flip-flops on each clock edge. */
export function ShiftRegisterLab() {
  const [incoming, setIncoming] = useState<Bit>(1);
  const [state, setState] = useState<Bit[]>([0, 0, 0, 0]);
  const [count, setCount] = useState(0);
  const value = bitsToNumber([...state].reverse());
  return (
    <Panel title="Shift register">
      <div className="flex items-center gap-2 font-mono flex-wrap">
        <button type="button" className={`${btn} ${incoming ? "border-orange bg-orange/20" : ""}`} aria-pressed={!!incoming} onClick={() => setIncoming(incoming ? 0 : 1)}>in = {incoming}</button>
        <span className="text-muted-foreground">→</span>
        {state.map((b, i) => <span key={`${i}-${count}`} className={`w-12 h-12 border-2 rounded-[2px] flex items-center justify-center text-lg font-bold animate-in fade-in slide-in-from-left-3 duration-300 motion-reduce:animate-none ${b ? "border-mint bg-mint/20" : "border-border"}`}>{b}</span>)}
        <span className="text-muted-foreground">→ out</span>
      </div>
      <div className="flex gap-2">
        <button type="button" className={`${btn} border-neon`} onClick={() => { setState(shiftFrames(4, [incoming], state)[1]); setCount(count + 1); }}>⇧ Clock edge</button>
        <button type="button" className={btn} onClick={() => { setState([0, 0, 0, 0]); setCount(0); }}>⟲ Clear</button>
      </div>
      <p className="text-sm">{count} edge{count === 1 ? "" : "s"} so far. It takes 4 edges to pull a 4-bit word in from a single wire: serial in, parallel out, which is how a serial port turns a stream of bits back into a byte. Read as a number with the first cell lowest, the register holds {value}.</p>
    </Panel>
  );
}

/** A 4-bit counter, with the waveform each stage produces. */
export function CounterLab() {
  const width = 4;
  const [bits, setBits] = useState<Bit[]>([0, 0, 0, 0]);
  const [hist, setHist] = useState<Bit[][]>([[0, 0, 0, 0]]);
  const [toggled, setToggled] = useState<number[]>([]);
  const [auto, setAuto] = useState(false);
  const tick = () => {
    setBits((b) => {
      const { next, toggled: t } = counterStep(b);
      setToggled(t);
      setHist((h) => [...h.slice(-16), next]);
      return next;
    });
  };
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [auto]);
  return (
    <Panel title="Binary counter">
      <div className="flex items-center gap-2 font-mono flex-wrap">
        {bits.map((b, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground">{2 ** (width - 1 - i)}</span>
            <span className={`w-12 h-12 border-2 rounded-[2px] flex items-center justify-center text-lg font-bold transition-colors ${toggled.includes(i) ? "border-neon" : "border-border"} ${b ? "bg-mint/25" : ""}`}>{b}</span>
          </div>
        ))}
        <span className="text-2xl font-bold ml-3">= {bitsToNumber(bits)}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" className={`${btn} border-neon`} onClick={tick}>⇧ Clock edge</button>
        <button type="button" className={btn} onClick={() => setAuto(!auto)}>{auto ? "❚❚ Pause" : "▶ Run"}</button>
        <button type="button" className={btn} onClick={() => { setAuto(false); setBits([0, 0, 0, 0]); setHist([[0, 0, 0, 0]]); setToggled([]); }}>⟲ Reset</button>
      </div>
      {hist.length > 1 && (
        <TimingDiagram cellW={26} signals={[3, 2, 1, 0].map((i) => ({ name: `2^${3 - i}`, bits: hist.map((h) => h[i]), tone: "stroke-mint" }))} />
      )}
      <p className="text-sm">Neon cells toggled on the last edge. The lowest bit flips every edge; each higher bit flips at half the rate of the one below it. Used this way, each stage divides the clock frequency by 2.</p>
    </Panel>
  );
}

/** A tiny RAM: the address decoder picks a row, and read or write acts on that row only. */
export function MemoryUnit() {
  const [words, setWords] = useState<number[]>([0b1010, 0b0111, 0b0000, 0b1100, 0b0011, 0b1001, 0b0101, 0b1110]);
  const [addr, setAddr] = useState(3);
  const [input, setInput] = useState(0b0110);
  const [flash, setFlash] = useState<string | null>(null);
  const bits = bitsOf(addr, 3);
  const pulse = (s: string) => { setFlash(s); setTimeout(() => setFlash(null), 500); };
  return (
    <Panel title="An 8 × 4 memory built from what you already know" legend={[["bg-neon", "decoder's chosen row"], ["bg-mint", "stored 1"]]}>
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[11px] text-muted-foreground">address lines</div>
          <div className="flex gap-1">{bits.map((b, i) => <button key={i} type="button" aria-label={`Address bit ${2 - i}`} aria-pressed={!!b} onClick={() => setAddr(addr ^ (1 << (2 - i)))} className={`w-9 h-9 border rounded-[2px] font-mono font-bold ${b ? "border-sky bg-sky/25" : "border-border"}`}>{b}</button>)}</div>
          <div className="font-mono text-[11px] text-muted-foreground mt-2">data in</div>
          <div className="flex gap-1">{bitsOf(input, 4).map((b, i) => <button key={i} type="button" aria-label={`Data bit ${3 - i}`} aria-pressed={!!b} onClick={() => setInput(input ^ (1 << (3 - i)))} className={`w-9 h-9 border rounded-[2px] font-mono font-bold ${b ? "border-orange bg-orange/25" : "border-border"}`}>{b}</button>)}</div>
          <div className="flex gap-1.5 mt-2">
            <button type="button" className={btn} onClick={() => { setWords(words.map((w, i) => (i === addr ? input : w))); pulse("write"); }}>Write</button>
            <button type="button" className={btn} onClick={() => pulse("read")}>Read</button>
          </div>
          <div className="font-mono text-[12px] h-5">{flash === "read" && <>data out <span className="text-mint font-bold">{bitString(words[addr], 4)}</span></>}{flash === "write" && <span className="text-orange">stored in word {addr}</span>}</div>
        </div>
        <div className="flex flex-col gap-1 font-mono text-[12px]">
          {words.map((w, i) => (
            <div key={i} className={`flex items-center gap-2 px-1.5 py-0.5 rounded-[2px] transition-colors ${i === addr ? "bg-neon/20 ring-1 ring-neon" : ""}`}>
              <span className="w-10 text-muted-foreground">{bitString(i, 3)}</span>
              <span className={`w-2 h-2 rounded-full ${i === addr ? "bg-neon" : "bg-border"}`} />
              {bitsOf(w, 4).map((b, j) => <span key={j} className={`w-6 h-6 flex items-center justify-center border rounded-[2px] ${b ? "border-mint bg-mint/20" : "border-border text-muted-foreground"}`}>{b}</span>)}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
