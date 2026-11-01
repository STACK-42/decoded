import { useEffect, useMemo, useRef, useState } from "react";
import { btn, inputCls, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import type { Frame } from "@/lib/algorithms";
import { bitString } from "@/lib/logic";
import { CYCLE_STEPS, cellText, diskCapacity, formatBytes, rotationalLatencyMs, tinyFrames, type TinyState } from "@/lib/machine";

const reduceMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------- the whole machine ------------------------ */

type Part = "input" | "cpu" | "memory" | "storage" | "output";
const PARTS: Record<Part, { label: string; x: number; y: number; w: number; h: number; note: string }> = {
  input: { label: "Input", x: 10, y: 60, w: 90, h: 60, note: "Turns the outside world into bits: keyboard, mouse, microphone." },
  cpu: { label: "CPU", x: 180, y: 10, w: 120, h: 60, note: "Follows instructions and does the arithmetic. It holds almost nothing itself." },
  memory: { label: "Main memory", x: 340, y: 10, w: 120, h: 60, note: "The desk: holds the running program and its data. Fast, but wiped at power-off." },
  storage: { label: "Storage", x: 340, y: 120, w: 120, h: 60, note: "The filing cabinet: slow, large, and keeps everything with the power off." },
  output: { label: "Output", x: 180, y: 120, w: 120, h: 60, note: "Turns bits back into something a person can use: screen, printer, speaker." },
};

const JOURNEY: { at: Part[]; msg: string }[] = [
  { at: ["input"], msg: "You press the G key. The keyboard turns it into the code 01000111." },
  { at: ["input", "cpu"], msg: "That code travels along a bus, and the CPU is told a key was pressed." },
  { at: ["cpu", "memory"], msg: "The CPU follows the word processor's instructions, which are in main memory, and stores the G there." },
  { at: ["cpu", "output"], msg: "More instructions work out how the letter should look and send the picture to the screen. You see G." },
  { at: ["memory", "storage"], msg: "You press Save. The bytes are copied to storage, so they'll survive when the power goes off." },
];

export function ComputerMap() {
  const frames = useMemo<Frame<{ at: Part[] }>[]>(() => JOURNEY.map((j, i) => ({ state: { at: j.at }, message: j.msg, line: Math.min(i, 3), stats: {} })), []);
  return (
    <Stepper
      title="One keypress through the whole machine"
      frames={frames}
      codeLabel="The four jobs every computer does"
      code={["input", "process", "output", "store"]}
      render={({ at }) => (
        <svg viewBox="0 0 470 190" className="w-full max-w-[600px] mx-auto block">
          <path d="M100,90 H140 V40 H180 M300,40 H340 M140,90 V150 H180 M300,150 H340 M320,40 V150" fill="none" strokeWidth={6} className="stroke-border" />
          <text x={320} y={100} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]" transform="rotate(-90 316 100)">bus</text>
          {(Object.entries(PARTS) as [Part, (typeof PARTS)[Part]][]).map(([k, p]) => {
            const on = at.includes(k);
            return (
              <g key={k} className="transition-colors">
                <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={4} strokeWidth={2} className={on ? "fill-neon/20 stroke-neon" : "fill-card stroke-border"} />
                <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 4} textAnchor="middle" className="fill-foreground font-mono text-[12px] font-bold">{p.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    />
  );
}

/* --------------------------------- bytes ------------------------------- */

/** Type text; each character is shown as the switches that store it. */
export function TextToBytes({ start = "Go!" }: { start?: string }) {
  const [text, setText] = useState(start);
  const chars = [...text.slice(0, 12)];
  return (
    <Panel title="Text is only numbers">
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={12} aria-label="Text to encode" className={`${inputCls} max-w-xs`} />
      <div className="flex flex-col gap-1.5 font-mono text-[12px]">
        {chars.map((c, i) => {
          const code = c.charCodeAt(0);
          return (
            <div key={i} className="flex items-center gap-3 flex-wrap">
              <span className="w-6 text-lg font-bold">{c === " " ? "␣" : c}</span>
              <span className="w-10 text-muted-foreground">{code}</span>
              <span className="flex gap-0.5">{[...bitString(Math.min(code, 255), 8)].map((b, j) => <span key={j} className={`w-5 h-6 flex items-center justify-center rounded-[2px] border ${b === "1" ? "border-mint bg-mint/25 font-bold" : "border-border text-muted-foreground"}`}>{b}</span>)}</span>
              {code > 255 && <span className="text-orange">needs more than 1 byte</span>}
            </div>
          );
        })}
      </div>
      <div className="font-mono text-[12px] text-muted-foreground">{chars.length} character{chars.length === 1 ? "" : "s"} = {chars.length} bytes = {chars.length * 8} bits. Lit cells are transistors holding a 1.</div>
    </Panel>
  );
}

const UNITS: [string, number, string][] = [
  ["Byte", 1, "one letter"],
  ["KB", 2 ** 10, "a short email"],
  ["MB", 2 ** 20, "a photo or a song"],
  ["GB", 2 ** 30, "a film"],
  ["TB", 2 ** 40, "a large hard disk"],
  ["PB", 2 ** 50, "a big data centre's rack"],
];

export function UnitLadder() {
  return (
    <Panel title="Each step up is 1024 times bigger">
      <div className="flex flex-col gap-1.5 font-mono text-[13px]">
        {UNITS.map(([u, n, ex], i) => (
          <div key={u} className="flex items-center gap-3">
            <span className="w-10 font-bold">{u}</span>
            <span className="h-4 bg-sky/60 rounded-[1px]" style={{ width: `${8 + i * 15}%` }} />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">2^{i * 10} = {n.toLocaleString("en-US")} bytes · {ex}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* --------------------------------- CPU --------------------------------- */

function Reg({ name, full, value, on }: { name: string; full: string; value: string | number | null; on: boolean }) {
  return (
    <div className={`rounded-sm border-2 px-2 py-1 transition-colors ${on ? "border-neon bg-neon/15" : "border-border"}`}>
      <div className="flex items-baseline justify-between gap-2"><span className="font-mono text-[11px] font-bold">{name}</span><span className="text-[9px] text-muted-foreground">{full}</span></div>
      <div className="font-mono text-[15px] min-h-[1.4em]">{value ?? "—"}</div>
    </div>
  );
}

function BusLine({ label, value, on, tone }: { label: string; value?: string | number | null; on: boolean; tone: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px]">
      <span className="w-14 text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className={`relative flex-1 h-2 rounded-full transition-colors ${on ? tone : "bg-border"}`} />
      <span className="w-20 truncate">{on ? value : ""}</span>
    </div>
  );
}

function MachineView({ s }: { s: TinyState }) {
  const on = (x: string) => s.active.includes(x);
  return (
    <div className="grid md:grid-cols-[1.25fr_auto] gap-4 items-start">
      <div className="flex flex-col gap-3">
        <div className="rounded-sm border border-border p-3">
          <div className="eyebrow text-sky mb-2">CPU</div>
          <div className="grid grid-cols-2 gap-2">
            <Reg name="PC" full="next instruction's address" value={s.pc} on={on("pc")} />
            <Reg name="IR" full="instruction being run" value={s.ir} on={on("ir")} />
            <Reg name="MAR" full="address to use" value={s.mar} on={on("mar")} />
            <Reg name="DR" full="data going to or from memory" value={s.dr} on={on("dr")} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className={`rounded-sm border-2 p-2 text-center transition-colors ${on("cu") ? "border-neon bg-neon/15" : "border-border"}`}><div className="font-mono text-[11px] font-bold">Control unit</div><div className="text-[9px] text-muted-foreground">reads IR, directs everything</div></div>
            <div className={`rounded-sm border-2 p-2 text-center transition-colors ${on("alu") ? "border-orange bg-orange/15" : "border-border"}`}><div className="font-mono text-[11px] font-bold">ALU</div><div className="text-[9px] text-muted-foreground">does the maths</div></div>
            <Reg name="AC" full="working total" value={s.ac} on={on("ac")} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <BusLine label="address" value={s.mar} on={on("addr")} tone="bg-sky" />
          <BusLine label="data" value={s.dr} on={on("data")} tone="bg-mint" />
        </div>
      </div>
      <div className="rounded-sm border border-border p-3 min-w-[150px]">
        <div className="eyebrow text-sky mb-2">Memory</div>
        <div className="flex flex-col gap-0.5 font-mono text-[12px]">
          {s.memory.map((c, i) => (
            <div key={i} className={`flex gap-3 px-1.5 py-0.5 rounded-[2px] transition-colors ${s.touch === i ? "bg-neon/25 ring-1 ring-neon" : i === s.pc && s.phase !== "halt" ? "bg-sky/10" : ""}`}>
              <span className="w-3 text-muted-foreground">{i}</span>
              <span className={typeof c === "number" ? "text-mint" : ""}>{cellText(c)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TinyCpu() {
  const frames = useMemo(() => tinyFrames() as Frame<TinyState>[], []);
  return <Stepper title="A complete CPU running 2 + 3" frames={frames} code={CYCLE_STEPS} codeLabel="The machine cycle" legend={[["bg-neon", "in use now"], ["bg-mint", "data"]]} render={(s) => <MachineView s={s} />} />;
}

/** Explorer for what each part of the CPU is. */
export function CpuParts() {
  const items: Record<string, { name: string; text: string; like: string }> = {
    cu: { name: "Control unit", text: "Reads each instruction and sends signals telling the other parts what to do and when. It does no calculating itself.", like: "A conductor: plays no instrument, but everyone follows the beat." },
    alu: { name: "Arithmetic logic unit", text: "Does arithmetic (add, subtract, multiply, divide) and logic (AND, OR, comparing two numbers).", like: "The calculator on the desk." },
    regs: { name: "Registers", text: "A handful of tiny, extremely fast storage slots inside the CPU, each holding the value being worked on right now.", like: "The numbers you hold in your head during a sum." },
    bus: { name: "Internal bus", text: "The wires connecting all the parts inside the CPU. External buses carry on from there to memory and devices.", like: "The corridors of a building." },
  };
  const [k, setK] = useState("cu");
  return (
    <Panel title="Click a part of the CPU">
      <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-center">
        <div className="grid grid-cols-2 gap-1.5 w-56">
          {Object.entries(items).map(([id, it]) => <button key={id} type="button" aria-pressed={k === id} onClick={() => setK(id)} className={`h-20 rounded-sm border-2 font-mono text-[11px] p-1 transition-colors ${k === id ? "border-neon bg-neon/15" : "border-border"}`}>{it.name}</button>)}
        </div>
        <div>
          <div className="font-display font-bold text-lg mb-1">{items[k].name}</div>
          <p className="text-sm leading-relaxed mb-2">{items[k].text}</p>
          <p className="text-sm text-muted-foreground italic">{items[k].like}</p>
        </div>
      </div>
    </Panel>
  );
}

/* --------------------------------- buses ------------------------------- */

/** A read and a write, split across the three buses. */
export function BusTrip() {
  const [kind, setKind] = useState("read");
  const frames = useMemo<Frame<{ addr: boolean; data: boolean; ctrl: string | null; dataDir: "in" | "out" | null }>[]>(() => {
    const addr = "0x2A";
    return kind === "read"
      ? [
          { state: { addr: true, data: false, ctrl: null, dataDir: null }, message: `The CPU puts the address ${addr} on the address bus: "I want this location."`, line: 0, stats: {} },
          { state: { addr: true, data: false, ctrl: "READ", dataDir: null }, message: "It raises the READ line on the control bus: \"Send it to me.\"", line: 1, stats: {} },
          { state: { addr: true, data: true, ctrl: "READ", dataDir: "in" }, message: "Memory finds the location and puts its value (47) on the data bus. The CPU copies it in.", line: 2, stats: {} },
        ]
      : [
          { state: { addr: true, data: false, ctrl: null, dataDir: null }, message: `The CPU puts the address ${addr} on the address bus.`, line: 0, stats: {} },
          { state: { addr: true, data: true, ctrl: null, dataDir: "out" }, message: "It puts the value (47) on the data bus.", line: 2, stats: {} },
          { state: { addr: true, data: true, ctrl: "WRITE", dataDir: "out" }, message: "It raises the WRITE line: \"Store this.\" Memory saves 47 at that location.", line: 1, stats: {} },
        ];
  }, [kind]);
  return (
    <Stepper
      title="The three buses at work"
      frames={frames}
      codeLabel="Each bus answers one question"
      code={["address bus:  where?       (one way: CPU to memory)", "control bus:  what to do?  (read, write, clock, reset)", "data bus:     what value?  (both ways)"]}
      inputs={<Toggle value={kind} options={[["read", "read"], ["write", "write"]]} onChange={setKind} />}
      render={(s) => (
        <svg viewBox="0 0 460 170" className="w-full max-w-[600px] mx-auto block">
          <rect x={5} y={10} width={90} height={150} rx={4} strokeWidth={2} className="fill-card stroke-sky" />
          <text x={50} y={90} textAnchor="middle" className="fill-foreground font-mono text-[14px] font-bold">CPU</text>
          <rect x={365} y={10} width={90} height={150} rx={4} strokeWidth={2} className="fill-card stroke-sky" />
          <text x={410} y={90} textAnchor="middle" className="fill-foreground font-mono text-[13px] font-bold">Memory</text>
          {[
            { y: 40, on: s.addr, cls: "stroke-sky", label: "ADDRESS", val: s.addr ? "0x2A →" : "" },
            { y: 85, on: !!s.ctrl, cls: "stroke-orange", label: "CONTROL", val: s.ctrl ? `${s.ctrl} →` : "" },
            { y: 130, on: s.data, cls: "stroke-mint", label: "DATA", val: s.dataDir === "in" ? "← 47" : s.dataDir === "out" ? "47 →" : "" },
          ].map((b) => (
            <g key={b.label}>
              <path d={`M95,${b.y} H365`} strokeWidth={b.on ? 6 : 3} className={`transition-all ${b.on ? b.cls : "stroke-border"}`} />
              <text x={103} y={b.y - 8} className="fill-muted-foreground font-mono text-[9px]">{b.label}</text>
              <text x={230} y={b.y - 8} textAnchor="middle" className="fill-foreground font-mono text-[12px] font-bold">{b.val}</text>
            </g>
          ))}
        </svg>
      )}
    />
  );
}

/** What each bus's width buys. */
export function BusWidths() {
  const [addr, setAddr] = useState(16);
  const [data, setData] = useState(8);
  const moves = Math.ceil(8 / (data / 8));
  return (
    <Panel title="Wider buses: more reach, more per trip">
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">address lines
        <input type="range" min={8} max={40} step={2} value={addr} onChange={(e) => setAddr(Number(e.target.value))} aria-label="Address lines" className="flex-1 accent-[hsl(var(--sky))]" /><span className="w-6 text-foreground">{addr}</span>
      </label>
      <div className="font-mono text-[13px]">Can name 2^{addr} locations = <span className="text-sky font-bold">{formatBytes(2 ** addr)}</span> of byte-addressed memory</div>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">data lines
        <input type="range" min={8} max={64} step={8} value={data} onChange={(e) => setData(Number(e.target.value))} aria-label="Data lines" className="flex-1 accent-[hsl(var(--mint))]" /><span className="w-6 text-foreground">{data}</span>
      </label>
      <div className="flex gap-px h-8 items-stretch">{Array.from({ length: 64 }, (_, i) => <span key={i} className={`flex-1 rounded-[1px] transition-colors ${i < data ? "bg-mint/70" : "bg-border/50"}`} />)}</div>
      <div className="font-mono text-[13px]">Carries {data / 8} byte{data > 8 ? "s" : ""} per transfer. An 8-byte value takes <span className="text-mint font-bold">{moves} transfer{moves > 1 ? "s" : ""}</span>.</div>
    </Panel>
  );
}

/* --------------------------------- memory ------------------------------ */

/** Cut the power and see which contents survive. */
export function PowerCut() {
  const [power, setPower] = useState(true);
  const [wiped, setWiped] = useState(false);
  const rows = [
    { name: "RAM", holds: "Running programs and open files", keeps: false, write: "Constantly" },
    { name: "ROM", holds: "Fixed start-up instructions", keeps: true, write: "Set at the factory" },
    { name: "CMOS", holds: "Clock and start-up settings", keeps: true, write: "Yes, on its own small battery" },
    { name: "Flash", holds: "Firmware, phone storage, USB sticks", keeps: true, write: "Yes, block by block" },
  ];
  return (
    <Panel title="Pull the plug">
      <div className="flex gap-2 items-center flex-wrap">
        <button type="button" className={`${btn} ${power ? "border-mint" : "border-orange bg-orange/20"}`} aria-pressed={power} onClick={() => { if (power) setWiped(true); setPower(!power); }}>{power ? "⏻ Cut the power" : "⏻ Power on again"}</button>
        {!power && <span className="font-mono text-[12px] text-orange">No power.</span>}
        {power && wiped && <span className="font-mono text-[12px] text-orange">RAM came back empty. The computer has to reload everything from storage.</span>}
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {rows.map((r) => {
          const lost = !r.keeps && wiped;
          return (
            <div key={r.name} className={`rounded-sm border-2 p-3 transition-colors ${!power && !r.keeps ? "border-orange/60 opacity-60" : "border-border"}`}>
              <div className="flex justify-between items-baseline"><span className="font-mono font-bold">{r.name}</span><span className={`font-mono text-[10px] uppercase tracking-widest ${r.keeps ? "text-mint" : "text-orange"}`}>{r.keeps ? "non-volatile" : "volatile"}</span></div>
              <div className="text-sm mt-1">{lost ? <span className="text-orange font-mono">empty</span> : r.holds}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Writable: {r.write}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** A DRAM cell is a leaking bucket; SRAM is a latch. */
export function DramLeak() {
  const [level, setLevel] = useState(100);
  const [auto, setAuto] = useState(true);
  const [refreshes, setRefreshes] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    const id = setInterval(() => {
      setLevel((l) => {
        const next = Math.max(0, l - 6);
        if (auto && next < 55) {
          setRefreshes((r) => r + 1);
          return 100;
        }
        return next;
      });
    }, 350);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, [auto]);
  const reads = level >= 50 ? 1 : 0;
  return (
    <Panel title="DRAM: a bit stored in a leaky bucket">
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="flex gap-4 items-end">
          <div className="relative w-16 h-32 border-2 border-t-0 border-foreground/50 rounded-b-sm overflow-hidden">
            <div className={`absolute bottom-0 inset-x-0 transition-all duration-300 motion-reduce:transition-none ${reads ? "bg-mint/60" : "bg-orange/60"}`} style={{ height: `${level}%` }} />
            <div className="absolute inset-x-0 bottom-1/2 border-t border-dashed border-foreground/50" />
          </div>
          <div className="font-mono text-[12px] flex flex-col gap-2">
            <div>charge {level}%</div>
            <div>reads as <span className={`font-bold ${reads ? "text-mint" : "text-orange"}`}>{reads}</span></div>
            <div className="text-muted-foreground">refreshes {refreshes}</div>
            <button type="button" className={btn} aria-pressed={auto} onClick={() => setAuto(!auto)}>{auto ? "Stop refreshing" : "Resume refreshing"}</button>
            {!auto && level < 50 && <div className="text-orange">The stored 1 has decayed to 0. The data is lost.</div>}
          </div>
        </div>
        <div className="text-sm leading-relaxed space-y-2">
          <p><span className="font-mono font-bold">DRAM</span> stores each bit as charge on a tiny capacitor, using one transistor. It's cheap and dense, but the charge leaks, so it must be read and rewritten thousands of times a second.</p>
          <p><span className="font-mono font-bold">SRAM</span> stores each bit in a <a className="underline" href="/courses/logic-design/sr-latch">latch</a>, using about six transistors. It's faster and needs no refresh, but it takes more space and costs more, so it's used for cache.</p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------- hierarchy ----------------------------- */

const LEVELS = [
  { name: "Registers", size: "under 1 KB", ns: 0.3, human: "1 second", w: 16, tone: "bg-neon/70" },
  { name: "L1 cache", size: "tens of KB", ns: 1, human: "3 seconds", w: 28, tone: "bg-mint/70" },
  { name: "L2 cache", size: "up to some MB", ns: 4, human: "13 seconds", w: 42, tone: "bg-mint/50" },
  { name: "RAM", size: "GBs", ns: 100, human: "5.5 minutes", w: 60, tone: "bg-sky/60" },
  { name: "SSD", size: "up to TBs", ns: 100_000, human: "4 days", w: 80, tone: "bg-violet/60" },
  { name: "Hard disk", size: "TBs", ns: 7_000_000, human: "9 months", w: 100, tone: "bg-orange/60" },
];

export function MemoryPyramid() {
  const [i, setI] = useState(3);
  const l = LEVELS[i];
  return (
    <Panel title="Fast and small on top, slow and huge at the bottom">
      <div className="flex flex-col items-center gap-1">
        {LEVELS.map((x, k) => (
          <button key={x.name} type="button" aria-pressed={k === i} onClick={() => setI(k)} style={{ width: `${x.w}%` }} className={`min-w-[120px] h-9 rounded-[2px] font-mono text-[11px] transition-all ${x.tone} ${k === i ? "ring-2 ring-foreground" : ""}`}>{x.name}</button>
        ))}
      </div>
      <div className="font-mono text-[13px] flex flex-col gap-1">
        <div><b>{l.name}</b>: typical size {l.size}, about {l.ns.toLocaleString("en-US")} ns per access</div>
        <div className="text-sky">If a register access took 1 second, this would take <b>{l.human}</b>.</div>
      </div>
    </Panel>
  );
}

/** The CPU looks in each level in turn; a hit stops the search and copies data upward. */
export function CacheSearch() {
  const LAYERS = ["L1", "L2", "RAM", "Disk"];
  const COST = [1, 4, 100, 7_000_000];
  const [held, setHeld] = useState<string[][]>([["A"], ["A", "B"], ["A", "B", "C", "D"], ["A", "B", "C", "D", "E", "F"]]);
  const [last, setLast] = useState<{ item: string; found: number; time: number } | null>(null);
  const ask = (item: string) => {
    const found = held.findIndex((h) => h.includes(item));
    const time = COST.slice(0, found + 1).reduce((a, b) => a + b, 0);
    setLast({ item, found, time });
    const cap = [2, 3, 5, 6];
    setHeld(held.map((h, i) => (i < found ? [item, ...h.filter((x) => x !== item)].slice(0, cap[i]) : h)));
  };
  return (
    <Panel title="Where's my data? Search from the top" legend={[["bg-mint", "hit"], ["bg-orange", "miss"]]}>
      <div className="flex gap-1.5 flex-wrap items-center"><span className="font-mono text-[11px] text-muted-foreground mr-1">CPU asks for</span>{["A", "B", "C", "D", "E", "F"].map((x) => <button key={x} type="button" className={btn} onClick={() => ask(x)}>{x}</button>)}</div>
      <div className="flex flex-col gap-1 font-mono text-[12px]">
        {LAYERS.map((name, i) => {
          const st = last ? (i < last.found ? "miss" : i === last.found ? "hit" : "idle") : "idle";
          return (
            <div key={name} className={`flex items-center gap-3 rounded-[2px] border px-2 py-1.5 transition-colors ${st === "hit" ? "border-mint bg-mint/15" : st === "miss" ? "border-orange bg-orange/10" : "border-border"}`}>
              <span className="w-10 font-bold">{name}</span>
              <span className="flex gap-1 flex-1">{held[i].map((x) => <span key={x} className="w-6 h-6 flex items-center justify-center border border-border rounded-[2px]">{x}</span>)}</span>
              <span className="text-[10px] text-muted-foreground">{st === "hit" ? "HIT" : st === "miss" ? "miss" : ""}</span>
            </div>
          );
        })}
      </div>
      <div className="text-sm min-h-[2.5em]">{last ? `${last.item} was found in ${LAYERS[last.found]} after about ${last.time.toLocaleString("en-US")} ns, and copied up to every faster level. Ask for it again and it's a hit in L1.` : "Ask for E: it's only on the disk. Then ask again."}</div>
    </Panel>
  );
}

/* -------------------------------- storage ------------------------------ */

/** A live platter: pick a sector and see the arm move, then the sector come round. */
export function HardDisk() {
  const TRACKS = 5, SECTORS = 12;
  const [target, setTarget] = useState({ t: 3, s: 7 });
  const [arm, setArm] = useState(0);
  const [angle, setAngle] = useState(0);
  const [status, setStatus] = useState("Click any sector.");
  const [phase, setPhase] = useState<"idle" | "seek" | "wait" | "read">("idle");
  const angleRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    if (reduceMotion()) return;
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = now - prev;
      prev = now;
      angleRef.current = (angleRef.current + dt * 0.05) % 360;
      setAngle(angleRef.current);
      if (phaseRef.current === "wait") {
        // the head sits at the top of the platter (angle 0)
        const sectorStart = (targetRef.current.s * 360) / SECTORS;
        const pos = (sectorStart + angleRef.current + 15) % 360;
        if (pos < 6) {
          setPhase("read");
          setStatus("The sector passes under the head and the data is read.");
          setTimeout(() => setPhase("idle"), 900);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const go = (t: number, s: number) => {
    setTarget({ t, s });
    setPhase("seek");
    setStatus(`Seek: the arm swings to track ${t}. This is the slowest step, because something physical has to move.`);
    setArm(t);
    setTimeout(() => {
      setPhase("wait");
      setStatus("Rotational wait: the arm is in place. Now it waits for sector " + s + " to come round.");
    }, reduceMotion() ? 0 : 800);
  };
  const C = 130;
  const rOf = (t: number) => 118 - t * 18;
  const pt = (r: number, a: number) => [C + r * Math.cos(((a - 90) * Math.PI) / 180), C + r * Math.sin(((a - 90) * Math.PI) / 180)];
  return (
    <Panel title="Inside a hard disk" legend={[["bg-neon", "target sector"], ["bg-orange", "read head"]]}>
      <div className="grid md:grid-cols-[320px_1fr] gap-5 items-center">
        <svg viewBox="0 0 320 260" className="w-full max-w-[320px] mx-auto">
          <g transform={`rotate(${angle} ${C} ${C})`}>
            {Array.from({ length: TRACKS }, (_, t) => Array.from({ length: SECTORS }, (_, s) => {
              const r1 = rOf(t), r0 = r1 - 16;
              const a0 = (s * 360) / SECTORS, a1 = ((s + 1) * 360) / SECTORS;
              const [x0, y0] = pt(r0, a0), [x1, y1] = pt(r1, a0), [x2, y2] = pt(r1, a1), [x3, y3] = pt(r0, a1);
              const isT = target.t === t && target.s === s;
              return <path key={`${t}-${s}`} role="button" aria-label={`Track ${t}, sector ${s}`} onClick={() => go(t, s)} d={`M${x0},${y0} L${x1},${y1} A${r1},${r1} 0 0 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 0 0 ${x0},${y0}Z`} className={`cursor-pointer stroke-card transition-colors ${isT ? (phase === "read" ? "fill-mint" : "fill-neon") : "fill-foreground/20 hover:fill-foreground/40"}`} strokeWidth={1} />;
            }))}
          </g>
          <circle cx={C} cy={C} r={20} className="fill-card stroke-border" strokeWidth={2} />
          <g className="transition-all duration-700 motion-reduce:transition-none">
            <path d={`M305,30 L${C + 3},${C - rOf(arm) + 8}`} strokeWidth={5} strokeLinecap="round" className="stroke-orange transition-all duration-700 motion-reduce:transition-none" style={{ d: `path("M305,30 L${C + 3},${C - rOf(arm) + 8}")` } as React.CSSProperties} />
            <circle cx={305} cy={30} r={8} className="fill-orange" />
          </g>
        </svg>
        <div className="flex flex-col gap-3 text-sm">
          <div className="min-h-[4.5em] leading-relaxed">{status}</div>
          <div className="font-mono text-[11px] text-muted-foreground flex flex-col gap-1">
            <span><b className="text-foreground">Track</b>: one ring on the platter</span>
            <span><b className="text-foreground">Sector</b>: one slice of a track, often 512 bytes</span>
            <span><b className="text-foreground">Cylinder</b>: the same track on every platter</span>
            <span><b className="text-foreground">Cluster</b>: a group of sectors the OS treats as one unit</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function DiskCalculator() {
  const [c, setC] = useState(16383);
  const [h, setH] = useState(16);
  const [s, setS] = useState(63);
  const [rpm, setRpm] = useState(7200);
  const field = (label: string, v: number, set: (n: number) => void) => (
    <label className="flex flex-col gap-1 font-mono text-[11px] text-muted-foreground">{label}<input type="number" min={1} value={v} onChange={(e) => set(Math.max(1, Number(e.target.value) || 1))} className={`${inputCls} w-28`} /></label>
  );
  return (
    <Panel title="Work out a drive's capacity">
      <div className="flex flex-wrap gap-3">{field("cylinders", c, setC)}{field("heads", h, setH)}{field("sectors/track", s, setS)}{field("rpm", rpm, setRpm)}</div>
      <div className="font-mono text-[13px] flex flex-col gap-1">
        <div>{c.toLocaleString("en-US")} × {h} × {s} × 512 = {diskCapacity(c, h, s).toLocaleString("en-US")} bytes = <b className="text-mint">{formatBytes(diskCapacity(c, h, s))}</b></div>
        <div>Average rotational wait: half a turn = (60,000 ÷ {rpm.toLocaleString("en-US")}) ÷ 2 = <b className="text-sky">{rotationalLatencyMs(rpm).toFixed(2)} ms</b></div>
      </div>
    </Panel>
  );
}

/** Reading scattered blocks: every jump costs an HDD a seek, and costs an SSD almost nothing. */
export function HddVsSsd() {
  const [reads, setReads] = useState(20);
  const hdd = reads * 8;
  const ssd = reads * 0.1;
  return (
    <Panel title="Reading scattered files">
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">random reads
        <input type="range" min={1} max={200} value={reads} onChange={(e) => setReads(Number(e.target.value))} aria-label="Number of random reads" className="flex-1 accent-[hsl(var(--sky))]" /><span className="w-8 text-foreground">{reads}</span>
      </label>
      <div className="flex flex-col gap-2 font-mono text-[12px]">
        <div><div className="flex justify-between"><span>HDD (about 8 ms each)</span><span>{hdd.toFixed(0)} ms</span></div><div className="h-4 bg-orange/70 rounded-[1px]" style={{ width: "100%" }} /></div>
        <div><div className="flex justify-between"><span>SSD (about 0.1 ms each)</span><span>{ssd.toFixed(1)} ms</span></div><div className="h-4 bg-mint/70 rounded-[1px]" style={{ width: `${Math.max(0.6, (ssd / hdd) * 100)}%` }} /></div>
      </div>
      <p className="text-sm">The bars are to scale. An SSD has no arm to move, so jumping around costs it nothing extra.</p>
    </Panel>
  );
}

/** A laser reading pits and lands: the change between them is what carries the bit. */
export function OpticalDisc() {
  const [disc, setDisc] = useState("CD");
  const specs: Record<string, { nm: number; spot: number; gb: string; colour: string; pit: number }> = {
    CD: { nm: 780, spot: 34, gb: "700 MB", colour: "fill-orange/70", pit: 34 },
    DVD: { nm: 650, spot: 22, gb: "4.7 GB", colour: "fill-orange/90", pit: 22 },
    "Blu-ray": { nm: 405, spot: 10, gb: "25 GB", colour: "fill-sky", pit: 10 },
  };
  const d = specs[disc];
  const pattern = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1];
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (reduceMotion()) return;
    const id = setInterval(() => setPos((p) => (p + 1) % pattern.length), 500);
    return () => clearInterval(id);
  }, [pattern.length]);
  const count = Math.floor(440 / d.pit);
  const here = pattern[pos % pattern.length];
  return (
    <Panel title="Reading bumps with light">
      <Toggle value={disc} options={Object.keys(specs).map((k) => [k, k])} onChange={setDisc} />
      <svg viewBox="0 0 460 130" className="w-full">
        <rect x={10} y={80} width={440} height={36} className="fill-foreground/20" />
        {Array.from({ length: count }, (_, i) => (pattern[(i + pos) % pattern.length] ? <rect key={i} x={10 + i * d.pit} y={80} width={d.pit - 1} height={10} className="fill-background" /> : null))}
        <path d={`M230,8 L${230 - d.spot / 2},80 L${230 + d.spot / 2},80 Z`} className={d.colour} opacity={0.55} />
        <text x={230} y={6} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">laser, {d.nm} nm</text>
        <text x={18} y={126} className="fill-muted-foreground font-mono text-[9px]">lands reflect the beam straight back, and pits scatter it</text>
      </svg>
      <div className="font-mono text-[13px] flex flex-wrap gap-x-6"><span>Now under the beam: {here ? "pit (dim)" : "land (bright)"}</span><span>Capacity: <b className="text-mint">{d.gb}</b></span></div>
      <p className="text-sm">A shorter wavelength focuses to a smaller spot, so the pits can be smaller and packed closer. That's the whole difference between these discs.</p>
    </Panel>
  );
}
