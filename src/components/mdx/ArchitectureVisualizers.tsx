import { useEffect, useMemo, useState } from "react";
import { btn, inputCls, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import type { Frame } from "@/lib/algorithms";
import {
  addressFields, amat, amdahl, cpi, cpuTime, fieldBits, FORMAT_MEMORY, FORMAT_PROGRAMS, formatFrames, interleaveTimes, mips, pipelineCycles, schedulePipeline, simulateCache, translate, unpipelinedCycles, writePolicyCost,
  type CacheConfig, type FormatKind, type FormatState, type HazardMode, type InstructionClass, type PageEntry, type PipeCell, type PipeInstr, type ReplacePolicy,
} from "@/lib/architecture";

const pressed = (on: boolean) => (on ? "bg-foreground text-background" : "");

/* ------------------------- instruction formats ------------------------- */

export function InstructionFormats() {
  const [k, setK] = useState<FormatKind>(3);
  const frames = useMemo(() => formatFrames(k) as Frame<FormatState>[], [k]);
  const counts: Record<FormatKind, number> = { 3: 3, 2: 6, 1: 7, 0: 8 };
  return (
    <Stepper
      title="The same sum on four kinds of machine"
      frames={frames}
      code={FORMAT_PROGRAMS[k]}
      codeLabel={`${k}-address program, ${counts[k]} instructions`}
      inputs={<Toggle value={String(k)} options={[["3", "3-address"], ["2", "2-address"], ["1", "1-address"], ["0", "0-address"]]} onChange={(v) => setK(Number(v) as FormatKind)} />}
      render={(s) => (
        <div className="flex flex-wrap gap-5 font-mono text-[13px]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">memory</div>
            <div className="flex gap-1 flex-wrap">{Object.entries(s.mem).map(([n, v]) => <span key={n} className={`border rounded-[2px] px-2 py-1 text-center transition-colors ${n === "X" && v === 25 ? "border-mint bg-mint/20 font-bold" : !(n in FORMAT_MEMORY) ? "border-sky bg-sky/15" : "border-border"}`}><div className="text-[9px] text-muted-foreground">{n}</div>{v}</span>)}</div>
          </div>
          {k >= 2 && <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">registers</div><div className="flex gap-1">{["R1", "R2"].map((r) => <span key={r} className="border border-border rounded-[2px] px-2 py-1 text-center min-w-[3rem]"><div className="text-[9px] text-muted-foreground">{r}</div>{s.regs[r] ?? "—"}</span>)}</div></div>}
          {k === 1 && <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">accumulator</div><span className="block border-2 border-orange rounded-[2px] px-3 py-1 min-w-[3rem] text-center">{s.ac}</span></div>}
          {k === 0 && <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">stack (top first)</div><div className="flex flex-col gap-0.5 min-w-[3rem]">{[...s.stack].reverse().map((v, i) => <span key={i} className={`border rounded-[2px] px-3 text-center ${i === 0 ? "border-violet bg-violet/20" : "border-border"}`}>{v}</span>)}{!s.stack.length && <span className="border border-dashed border-border rounded-[2px] px-3 text-muted-foreground">empty</span>}</div></div>}
        </div>
      )}
    />
  );
}

/* --------------------------- RISC versus CISC -------------------------- */

const RC = {
  CISC: { code: ["MULT [A], [B]"], cyc: [12], note: "One rich instruction does everything: load both values, multiply, and store. The code is tiny, but the hardware to decode and run it is complicated." },
  RISC: { code: ["LOAD R1, [A]", "LOAD R2, [B]", "MUL R3, R1, R2", "STORE [A], R3"], cyc: [1, 1, 1, 1], note: "Four simple instructions, each doing one step, each the same length. There's more code, but each one is simple enough to overlap in a pipeline, so the machine finishes close to one per clock." },
};

export function RiscCiscCompare() {
  const [m, setM] = useState<"CISC" | "RISC">("RISC");
  const d = RC[m];
  return (
    <Panel title="A = A × B, two ways">
      <Toggle value={m} options={[["RISC", "RISC"], ["CISC", "CISC"]]} onChange={(x) => setM(x as "CISC" | "RISC")} />
      <div className="flex flex-col gap-1 font-mono text-[13px]">
        {d.code.map((c, i) => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-36 shrink-0">{c}</span>
            <span className="flex gap-0.5">{Array.from({ length: d.cyc[i] }, (_, k) => <span key={k} className={`w-4 h-4 rounded-[1px] ${m === "RISC" ? "bg-mint/60" : "bg-orange/60"}`} />)}</span>
          </div>
        ))}
      </div>
      <div className="font-mono text-[12px] text-muted-foreground">{d.code.length} instruction{d.code.length > 1 ? "s" : ""}, about {d.cyc.reduce((a, b) => a + b, 0)} clock cycles (illustrative)</div>
      <p className="text-sm leading-relaxed">{d.note}</p>
    </Panel>
  );
}

/* ----------------------------- performance ----------------------------- */

const MACHINE_A: InstructionClass[] = [{ name: "ALU", percent: 38, cycles: 1 }, { name: "Load & store", percent: 15, cycles: 3 }, { name: "Branch", percent: 42, cycles: 4 }, { name: "Others", percent: 5, cycles: 5 }];
const MACHINE_B: InstructionClass[] = [{ name: "ALU", percent: 35, cycles: 1 }, { name: "Load & store", percent: 30, cycles: 2 }, { name: "Branch", percent: 15, cycles: 3 }, { name: "Others", percent: 20, cycles: 5 }];

function MixEditor({ title, mix, set, tone }: { title: string; mix: InstructionClass[]; set: (m: InstructionClass[]) => void; tone: string }) {
  const c = cpi(mix);
  return (
    <div className="flex-1 min-w-[250px]">
      <div className="font-mono text-[12px] font-bold mb-1">{title}</div>
      <table className="font-mono text-[12px]">
        <thead><tr className="text-muted-foreground text-[10px]"><th className="text-left pr-2">class</th><th className="pr-2">%</th><th>cycles</th></tr></thead>
        <tbody>{mix.map((r, i) => (
          <tr key={r.name}>
            <td className="pr-2">{r.name}</td>
            <td className="pr-2"><input type="number" aria-label={`${title} ${r.name} percent`} min={0} max={100} value={r.percent} onChange={(e) => set(mix.map((x, k) => (k === i ? { ...x, percent: Math.max(0, Number(e.target.value) || 0) } : x)))} className={`${inputCls} !py-0.5 !px-1 w-14`} /></td>
            <td><input type="number" aria-label={`${title} ${r.name} cycles`} min={1} max={30} value={r.cycles} onChange={(e) => set(mix.map((x, k) => (k === i ? { ...x, cycles: Math.max(1, Number(e.target.value) || 1) } : x)))} className={`${inputCls} !py-0.5 !px-1 w-14`} /></td>
          </tr>
        ))}</tbody>
      </table>
      <div className="flex h-5 mt-2 rounded-[2px] overflow-hidden">{mix.map((r, i) => <span key={r.name} title={r.name} style={{ flexGrow: r.percent * r.cycles, opacity: 1 - i * 0.2 }} className={tone} />)}</div>
      <div className="text-[10px] text-muted-foreground font-mono">share of the time each class takes</div>
      <div className="font-mono text-[13px] mt-1">CPI = {c.toFixed(2)}</div>
    </div>
  );
}

export function CpiCalculator() {
  const [a, setA] = useState(MACHINE_A);
  const [b, setB] = useState(MACHINE_B);
  const [mhz, setMhz] = useState(200);
  const ca = cpi(a), cb = cpi(b);
  const ma = mips(mhz * 1e6, ca), mb = mips(mhz * 1e6, cb);
  return (
    <Panel title="Compare two machines">
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">clock
        <input type="range" min={100} max={1000} step={50} value={mhz} onChange={(e) => setMhz(Number(e.target.value))} aria-label="Clock rate in MHz" className="flex-1 accent-[hsl(var(--violet))]" /><span className="w-16 text-foreground">{mhz} MHz</span>
      </label>
      <div className="flex flex-wrap gap-6">
        <MixEditor title="Machine A" mix={a} set={setA} tone="bg-sky" />
        <MixEditor title="Machine B" mix={b} set={setB} tone="bg-violet" />
      </div>
      <div className="font-mono text-[13px] flex flex-col gap-1">
        <div className={ma >= mb ? "text-mint font-bold" : ""}>MIPS A = {mhz} ÷ {ca.toFixed(2)} = {ma.toFixed(2)}</div>
        <div className={mb >= ma ? "text-mint font-bold" : ""}>MIPS B = {mhz} ÷ {cb.toFixed(2)} = {mb.toFixed(2)}</div>
      </div>
    </Panel>
  );
}

/** Why a faster clock doesn't always win. */
export function ClockTrap() {
  const [ic, setIc] = useState(1);
  const a = { ghz: 4, c: 4 }, b = { ghz: 3, c: 2 };
  const ta = cpuTime(ic * 1e9, a.c, a.ghz * 1e9), tb = cpuTime(ic * 1e9, b.c, b.ghz * 1e9);
  const max = Math.max(ta, tb);
  return (
    <Panel title="Does the higher clock speed win?">
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">program size
        <input type="range" min={1} max={10} value={ic} onChange={(e) => setIc(Number(e.target.value))} aria-label="Billions of instructions" className="flex-1 accent-[hsl(var(--violet))]" /><span className="w-32 text-foreground">{ic} billion instr.</span>
      </label>
      {[["A: 4 GHz, CPI 4", ta, "bg-orange/70"], ["B: 3 GHz, CPI 2", tb, "bg-mint/70"]].map(([l, t, cls]) => (
        <div key={l as string} className="font-mono text-[12px]"><div className="flex justify-between"><span>{l as string}</span><span>{(t as number).toFixed(2)} s</span></div><div className={`h-4 rounded-[1px] ${cls as string}`} style={{ width: `${((t as number) / max) * 100}%` }} /></div>
      ))}
      <p className="text-sm">The slower-clocked chip finishes first, because it does more per tick.</p>
    </Panel>
  );
}

/* ----------------------------- control unit ---------------------------- */

const SIGNALS = ["PC→MAR", "Mem read", "MDR→IR", "PC+1", "R→ALU", "ALU add", "ALU→R"];
const MICRO: { name: string; on: string[]; note: string; word: string }[] = [
  { name: "T1", on: ["PC→MAR"], note: "Send the PC's address to memory.", word: "1000000" },
  { name: "T2", on: ["Mem read", "PC+1"], note: "Read the instruction and step the PC.", word: "0101000" },
  { name: "T3", on: ["MDR→IR"], note: "Load the instruction into IR.", word: "0010000" },
  { name: "T4", on: ["R→ALU", "ALU add"], note: "Decoded as ADD: feed the registers to the ALU and tell it to add.", word: "0000110" },
  { name: "T5", on: ["ALU→R"], note: "Write the ALU's answer into the destination register.", word: "0000001" },
];

export function ControlUnitCompare() {
  const [mode, setMode] = useState("hard");
  const frames = useMemo<Frame<number>[]>(() => MICRO.map((m, i) => ({ state: i, message: `${m.name}: ${m.note}`, line: i, stats: {} })), []);
  return (
    <Stepper
      title="Running ADD: the control signals, tick by tick"
      frames={frames}
      codeLabel={mode === "hard" ? "Hardwired: gates work out each signal" : "Microprogrammed: a row of control memory per tick"}
      code={mode === "hard" ? ["PC→MAR         = T1", "Mem read, PC+1 = T2", "MDR→IR         = T3", "R→ALU, ALU add = T4 AND (opcode is ADD)", "ALU→R          = T5 AND (opcode is ADD)"] : MICRO.map((m) => `${m.name}:  ${m.word}`)}
      inputs={<Toggle value={mode} options={[["hard", "Hardwired"], ["micro", "Microprogrammed"]]} onChange={setMode} />}
      render={(i) => (
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {SIGNALS.map((s) => <span key={s} className={`px-2 py-2 rounded-[2px] border transition-colors ${MICRO[i].on.includes(s) ? "border-neon bg-neon/25 font-bold" : "border-border text-muted-foreground"}`}>{s}</span>)}
        </div>
      )}
    />
  );
}

/* -------------------------------- memory ------------------------------- */

export function InterleaveLab() {
  const [banks, setBanks] = useState(4);
  const cycle = 4;
  const words = 8;
  const { rows, total, single } = interleaveTimes(words, banks, cycle);
  const tones = ["bg-sky/70", "bg-mint/70", "bg-orange/70", "bg-violet/70"];
  const unit = 100 / Math.max(single, total);
  return (
    <Panel title="Reading 8 words in a row">
      <Toggle value={String(banks)} options={[["1", "1 bank"], ["2", "2 banks"], ["4", "4 banks"]]} onChange={(v) => setBanks(Number(v))} />
      <div className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <div key={r.word} className="relative h-5 bg-background/60 rounded-[1px]">
            <div className={`absolute inset-y-0 rounded-[1px] flex items-center pl-1 font-mono text-[9px] ${tones[r.bank]}`} style={{ left: `${r.start * unit}%`, width: `${cycle * unit}%` }}>word {r.word}</div>
          </div>
        ))}
      </div>
      <div className="font-mono text-[13px]">Colour shows the bank. Total: <b className="text-mint">{total} ticks</b>, against {single} with a single bank. Each bank still takes {cycle} ticks per access.</div>
    </Panel>
  );
}

/* --------------------------------- cache ------------------------------- */

const PATTERNS: Record<string, { label: string; list: number[] }> = {
  loop: { label: "A small loop", list: [0, 4, 8, 12, 0, 4, 8, 12, 0, 4, 8, 12] },
  conflict: { label: "Two blocks fighting", list: [0, 32, 0, 32, 0, 32, 0, 32] },
  array: { label: "Walking an array", list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
};

export function CacheLab() {
  const [mapping, setMapping] = useState("direct");
  const [pattern, setPattern] = useState("conflict");
  const [i, setI] = useState(-1);
  const blocks = 4;
  const cfg: CacheConfig = { blocks, blockSize: 4, ways: mapping === "direct" ? 1 : mapping === "set" ? 2 : blocks };
  const list = PATTERNS[pattern].list;
  const events = useMemo(() => simulateCache(list, cfg, "LRU"), [list, cfg.ways]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setI(-1), [mapping, pattern]);
  const e = i >= 0 ? events[i] : null;
  const bits = fieldBits(8, cfg);
  const shown = e ?? { ...addressFields(list[0], cfg), address: list[0], hit: false, way: -1, evicted: null, lines: Array.from({ length: blocks / cfg.ways }, () => Array.from({ length: cfg.ways }, () => ({ tag: null, block: null }))) };
  const addr8 = shown.address.toString(2).padStart(8, "0");
  const seg = [
    { b: addr8.slice(0, bits.tag), cls: "bg-violet/30", name: "tag", why: "which block this is" },
    { b: bits.index ? addr8.slice(bits.tag, bits.tag + bits.index) : "", cls: "bg-sky/30", name: bits.index ? "index" : "", why: "which set it must go in" },
    { b: addr8.slice(bits.tag + bits.index), cls: "bg-orange/30", name: "offset", why: "which byte in the block" },
  ].filter((s) => s.b);
  return (
    <Panel title="Cache mapping simulator" legend={[["bg-mint", "hit"], ["bg-orange", "miss"]]}>
      <div className="flex flex-wrap gap-3">
        <Toggle value={mapping} options={[["direct", "Direct-mapped"], ["set", "2-way set"], ["full", "Fully associative"]]} onChange={setMapping} />
        <Toggle value={pattern} options={Object.entries(PATTERNS).map(([k, v]) => [k, v.label])} onChange={setPattern} />
      </div>
      <div className="flex flex-wrap gap-1 font-mono text-[11px]">
        {list.map((a, k) => <button key={k} type="button" aria-label={`Run up to access ${k + 1}, address ${a}`} onClick={() => setI(k)} className={`w-7 h-7 rounded-[2px] border transition-colors ${k > i ? "border-border" : events[k].hit ? "border-mint bg-mint/30" : "border-orange bg-orange/30"} ${k === i ? "ring-1 ring-foreground" : ""}`}>{a}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setI(Math.min(i + 1, list.length - 1))} disabled={i >= list.length - 1}>Next access →</button>
        <button type="button" className={btn} onClick={() => setI(list.length - 1)}>Run all</button>
        <button type="button" className={btn} onClick={() => setI(-1)}>⟲ Reset</button>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="font-mono">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">address {shown.address} is split into</div>
          <div className="flex gap-1">{seg.map((s) => <div key={s.name} className={`rounded-[2px] px-2 py-1 text-center ${s.cls}`}><div className="text-[14px] tracking-widest">{s.b}</div><div className="text-[9px] font-bold uppercase">{s.name}</div><div className="text-[8px] text-muted-foreground">{s.why}</div></div>)}</div>
        </div>
        <div className="font-mono text-[12px]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">cache ({blocks} blocks of 4 bytes)</div>
          {shown.lines.map((row, s) => (
            <div key={s} className="flex items-center gap-1 mb-0.5">
              {cfg.ways < blocks && <span className="w-10 text-[10px] text-muted-foreground">set {s}</span>}
              {row.map((l, w) => {
                const active = e && e.set === s && e.way === w;
                return <span key={w} className={`w-20 h-8 rounded-[2px] border flex items-center justify-center text-[11px] transition-colors ${active ? (e.hit ? "border-mint bg-mint/25 font-bold" : "border-orange bg-orange/25 font-bold") : l.block === null ? "border-dashed border-border text-muted-foreground" : "border-border"}`}>{l.block === null ? "empty" : `block ${l.block}`}</span>;
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm min-h-[3em] leading-relaxed">{e ? `Address ${e.address} is in memory block ${e.block}${cfg.ways < blocks ? `, which belongs in set ${e.set}` : ", which may go anywhere"}. ${e.hit ? "It's already there: a hit." : e.evicted !== null ? `It isn't there and the place is full, so block ${e.evicted} is thrown out: a miss.` : "It isn't there, so it's loaded from memory: a miss."}` : "Press Next access. Try \"Two blocks fighting\" with direct mapping, then with 2-way."}</p>
      {e && <div className="font-mono text-[13px]">hits {e.hits}, misses {e.misses}, hit rate <b className="text-mint">{Math.round((e.hits / (e.hits + e.misses)) * 100)}%</b></div>}
    </Panel>
  );
}

const REPL_LIST = [1, 2, 3, 1, 4, 1, 2, 5, 1, 3];

export function ReplacementLab() {
  const [policy, setPolicy] = useState<ReplacePolicy>("LRU");
  const [i, setI] = useState(REPL_LIST.length - 1);
  const events = useMemo(() => simulateCache(REPL_LIST, { blocks: 3, ways: 3, blockSize: 1 }, policy), [policy]);
  const e = events[i];
  const row = e.lines[0];
  return (
    <Panel title="When the cache is full, who goes?">
      <Toggle value={policy} options={[["LRU", "LRU"], ["FIFO", "FIFO"]]} onChange={(p) => setPolicy(p as ReplacePolicy)} />
      <div className="flex gap-1 flex-wrap font-mono text-[12px]">{REPL_LIST.map((b, k) => <button key={k} type="button" aria-label={`Show after access ${k + 1}`} onClick={() => setI(k)} className={`w-8 h-8 rounded-[2px] border ${events[k].hit ? "border-mint bg-mint/25" : "border-orange bg-orange/25"} ${k === i ? "ring-2 ring-foreground" : ""}`}>{b}</button>)}</div>
      <div className="flex gap-1 font-mono">{row.map((l, w) => <span key={w} className={`w-16 h-14 rounded-[2px] border-2 flex flex-col items-center justify-center ${e.way === w ? (e.hit ? "border-mint" : "border-orange") : "border-border"}`}><b>{l.block ?? "—"}</b><span className="text-[9px] text-muted-foreground">{policy === "LRU" ? `used t${l.usedAt + 1}` : `in t${l.loadedAt + 1}`}</span></span>)}</div>
      <div className="font-mono text-[13px]">Full run: <b className="text-mint">{events.at(-1)!.hits} hits</b>, {events.at(-1)!.misses} misses</div>
      <p className="text-sm">{e.evicted !== null ? `Asked for ${REPL_LIST[i]}: full, so ${policy === "LRU" ? "the least recently used" : "the oldest arrival"} (block ${e.evicted}) goes.` : e.hit ? `Asked for ${REPL_LIST[i]}: a hit.` : `Asked for ${REPL_LIST[i]}: there's a free slot.`} {policy === "FIFO" ? "FIFO doesn't care that a block is popular; it can throw out the one you keep using." : "LRU bets that what you used recently, you'll use again."}</p>
    </Panel>
  );
}

export function WritePolicyLab() {
  const [writes, setWrites] = useState(50);
  const [blocks, setBlocks] = useState(2);
  const addresses = useMemo(() => Array.from({ length: writes }, (_, i) => (i % blocks) * 4), [writes, blocks]);
  const w = useMemo(() => new Set(addresses.map((_, i) => i)), [addresses]);
  const ev = useMemo(() => simulateCache(addresses, { blocks: 4, ways: 4, blockSize: 4 }, "LRU", w), [addresses, w]);
  const { through, back } = writePolicyCost(ev, w);
  const bar = (label: string, n: number, cls: string) => <div className="font-mono text-[12px]"><div className="flex justify-between"><span>{label}</span><span>{n} memory writes</span></div><div className={`h-4 rounded-[1px] ${cls}`} style={{ width: `${Math.max(1, (n / through) * 100)}%` }} /></div>;
  return (
    <Panel title="A loop updating a few variables">
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">writes<input type="range" min={5} max={200} value={writes} onChange={(e) => setWrites(Number(e.target.value))} aria-label="Number of writes" className="flex-1 accent-[hsl(var(--violet))]" /><span className="w-8 text-foreground">{writes}</span></label>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">variables<input type="range" min={1} max={4} value={blocks} onChange={(e) => setBlocks(Number(e.target.value))} aria-label="Number of variables" className="flex-1 accent-[hsl(var(--violet))]" /><span className="w-8 text-foreground">{blocks}</span></label>
      {bar("Write-through", through, "bg-orange/70")}
      {bar("Write-back", back, "bg-mint/70")}
    </Panel>
  );
}

export function AmatCalculator() {
  const [hit, setHit] = useState(1);
  const [rate, setRate] = useState(5);
  const [penalty, setPenalty] = useState(100);
  const t = amat(hit, rate / 100, penalty);
  return (
    <Panel title="Average memory access time">
      {[["hit time (ns)", hit, setHit, 1, 10], ["miss rate (%)", rate, setRate, 0, 50], ["miss penalty (ns)", penalty, setPenalty, 10, 300]].map(([l, v, s, lo, hi]) => (
        <label key={l as string} className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground"><span className="w-32">{l as string}</span><input type="range" min={lo as number} max={hi as number} value={v as number} onChange={(e) => (s as (n: number) => void)(Number(e.target.value))} aria-label={l as string} className="flex-1 accent-[hsl(var(--violet))]" /><span className="w-8 text-foreground">{v as number}</span></label>
      ))}
      <div className="font-mono text-[14px]">AMAT = {hit} + {(rate / 100).toFixed(2)} × {penalty} = <b className="text-mint">{t.toFixed(1)} ns</b></div>
      <p className="text-sm text-muted-foreground">Go from a 5% miss rate to 10% and the average nearly doubles. Small changes in miss rate matter a great deal.</p>
    </Panel>
  );
}

/* ---------------------------- virtual memory --------------------------- */

const PAGE_SIZE = 1024;

export function PageTableLab() {
  const [table, setTable] = useState<PageEntry[]>([{ frame: 5 }, { frame: null }, { frame: 2 }, { frame: 0 }, { frame: null }, { frame: 7 }, { frame: null }, { frame: 1 }]);
  const [addr, setAddr] = useState(2100);
  const [msg, setMsg] = useState<string | null>(null);
  const t = translate(addr, PAGE_SIZE, table);
  const usedFrames = table.map((p) => p.frame).filter((f) => f !== null) as number[];
  const freeFrame = Array.from({ length: 8 }, (_, i) => i).find((f) => !usedFrames.includes(f));
  const loadPage = () => {
    if (freeFrame !== undefined) {
      setTable(table.map((p, i) => (i === t.page ? { frame: freeFrame } : p)));
      setMsg(`The OS read page ${t.page} from disk into free frame ${freeFrame}, updated the table, and restarted the instruction.`);
    } else {
      const victim = table.findIndex((p) => p.frame !== null);
      const frame = table[victim].frame;
      setTable(table.map((p, i) => (i === t.page ? { frame } : i === victim ? { frame: null } : p)));
      setMsg(`RAM was full, so the OS moved page ${victim} out to disk and put page ${t.page} in frame ${frame}.`);
    }
  };
  return (
    <Panel title="From a program's address to a real one" legend={[["bg-sky", "page number"], ["bg-orange", "offset"], ["bg-mint", "in RAM"]]}>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">virtual address<input type="range" min={0} max={8191} value={addr} onChange={(e) => { setAddr(Number(e.target.value)); setMsg(null); }} aria-label="Virtual address" className="flex-1 accent-[hsl(var(--sky))]" /><span className="w-10 text-foreground">{addr}</span></label>
      <div className="font-mono text-[13px]">{addr} ÷ {PAGE_SIZE} = <span className="text-sky font-bold">page {t.page}</span>, remainder <span className="text-orange font-bold">offset {t.offset}</span></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">page table</div>
          <div className="grid grid-cols-2 gap-0.5 font-mono text-[12px]">
            {table.map((p, i) => <div key={i} className={`flex justify-between rounded-[2px] border px-2 py-1 transition-colors ${i === t.page ? (t.fault ? "border-orange bg-orange/20" : "border-sky bg-sky/20") : "border-border"}`}><span>page {i}</span><span className={p.frame === null ? "text-muted-foreground" : "text-mint"}>{p.frame === null ? "on disk" : `frame ${p.frame}`}</span></div>)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">physical memory (RAM)</div>
          <div className="grid grid-cols-4 gap-0.5 font-mono text-[11px]">
            {Array.from({ length: 8 }, (_, f) => { const owner = table.findIndex((p) => p.frame === f); return <div key={f} className={`rounded-[2px] border h-12 flex flex-col items-center justify-center transition-colors ${f === t.frame ? "border-mint bg-mint/30 font-bold" : owner >= 0 ? "border-border" : "border-dashed border-border text-muted-foreground"}`}><span className="text-[8px] text-muted-foreground">frame {f}</span>{owner >= 0 ? `p${owner}` : "free"}</div>; })}
          </div>
        </div>
      </div>
      {t.fault ? (
        <div className="flex flex-wrap items-center gap-3"><span className="font-mono text-[13px] text-orange font-bold">Page fault! Page {t.page} isn't in RAM.</span><button type="button" className={`${btn} border-orange`} onClick={loadPage}>Let the OS handle it</button></div>
      ) : (
        <div className="font-mono text-[13px]">Physical = frame {t.frame} × {PAGE_SIZE} + {t.offset} = <b className="text-mint">{t.physical}</b></div>
      )}
      {msg && <p className="text-sm">{msg}</p>}
    </Panel>
  );
}

/* ------------------------------- I/O ------------------------------------ */

const IO_TIMELINES: Record<string, { label: string; cells: string[]; note: string }> = {
  polling: { label: "Programmed I/O (polling)", cells: "PPPPPPTPPPPPPTPPPPPPTW".split(""), note: "The CPU keeps asking \"ready yet?\" and moves every byte itself, doing no other work." },
  interrupt: { label: "Interrupt-driven", cells: "WWWWWWIWWWWWWIWWWWWWIW".split(""), note: "The CPU does useful work and only stops when the device rings. It still moves each byte itself, so a fast device means constant interruptions." },
  dma: { label: "Direct Memory Access", cells: "SWWWWWWWWWWWWWWWWWWWDW".split(""), note: "The CPU tells the DMA controller where and how much, then gets on with work. The controller moves the whole block and interrupts once when it's done." },
};
const IO_CELL: Record<string, { cls: string; name: string }> = {
  P: { cls: "bg-orange/70", name: "asking" }, T: { cls: "bg-sky/70", name: "moving a byte" }, I: { cls: "bg-sky/70", name: "handling a byte" }, W: { cls: "bg-mint/70", name: "useful work" }, S: { cls: "bg-violet/70", name: "setting up" }, D: { cls: "bg-violet/70", name: "done interrupt" },
};

export function IoMethods() {
  return (
    <Panel title="What is the CPU doing while 3 bytes arrive?" legend={[["bg-mint/70", "useful work"], ["bg-orange/70", "polling"], ["bg-sky/70", "moving data"], ["bg-violet/70", "setup / finish"]]}>
      {Object.values(IO_TIMELINES).map((t) => {
        const useful = t.cells.filter((c) => c === "W").length;
        return (
          <div key={t.label}>
            <div className="flex justify-between font-mono text-[12px] flex-wrap gap-2"><b>{t.label}</b><span className="text-mint">{Math.round((useful / t.cells.length) * 100)}% free for your program</span></div>
            <div className="flex gap-px my-1">{t.cells.map((c, i) => <span key={i} title={IO_CELL[c].name} className={`flex-1 h-5 ${IO_CELL[c].cls}`} />)}</div>
            <p className="text-sm text-muted-foreground">{t.note}</p>
          </div>
        );
      })}
    </Panel>
  );
}

const HANDSHAKE = [
  { d: 0, r: 0, a: 0, msg: "Everything's idle. The sender and receiver may run at quite different speeds." },
  { d: 1, r: 0, a: 0, msg: "The sender places data on the lines." },
  { d: 1, r: 1, a: 0, msg: "The sender raises READY: \"the data is valid\"." },
  { d: 1, r: 1, a: 1, msg: "The receiver takes the data and raises ACK: \"got it\"." },
  { d: 0, r: 0, a: 1, msg: "Seeing ACK, the sender removes the data and lowers READY." },
  { d: 0, r: 0, a: 0, msg: "The receiver lowers ACK. Ready for the next transfer. Neither side had to guess the other's speed." },
];

export function Handshake() {
  const frames = useMemo<Frame<(typeof HANDSHAKE)[number]>[]>(() => HANDSHAKE.map((h, i) => ({ state: h, message: h.msg, line: i, stats: {} })), []);
  return (
    <Stepper
      title="A handshake" frames={frames} codeLabel="The rule" code={["data valid", "READY up", "ACK up", "READY down", "ACK down", "repeat"]}
      render={(s) => (
        <div className="flex items-center gap-2 font-mono text-[12px]">
          <div className="w-20 h-24 border-2 border-sky rounded-sm flex items-center justify-center">Sender</div>
          <div className="flex-1 flex flex-col gap-2">
            {[["DATA", s.d, "bg-mint", "→"], ["READY", s.r, "bg-orange", "→"], ["ACK", s.a, "bg-violet", "←"]].map(([n, v, c, arrow]) => (
              <div key={n as string}><div className="text-[9px] text-muted-foreground">{n as string} {arrow as string}</div><div className={`h-2 rounded-full transition-colors ${v ? (c as string) : "bg-border"}`} /></div>
            ))}
          </div>
          <div className="w-20 h-24 border-2 border-sky rounded-sm flex items-center justify-center">Receiver</div>
        </div>
      )}
    />
  );
}

const DEVICES = ["Disk", "Network", "Keyboard"];

export function BusArbiter() {
  const [scheme, setScheme] = useState("daisy");
  const [req, setReq] = useState([false, true, true]);
  const [last, setLast] = useState(-1);
  const pick = () => {
    if (scheme === "daisy") return req.findIndex(Boolean);
    for (let k = 1; k <= 3; k++) {
      const i = (last + k) % 3;
      if (req[i]) return i;
    }
    return -1;
  };
  const g = pick();
  return (
    <Panel title="Who gets the bus?">
      <Toggle value={scheme} options={[["daisy", "Daisy chain (fixed priority)"], ["round", "Round robin"]]} onChange={setScheme} />
      <div className="flex flex-wrap gap-2 items-center font-mono text-[12px]">
        <span className="border-2 border-violet rounded-sm px-2 py-3">Arbiter</span>
        {DEVICES.map((d, i) => {
          const blocked = scheme === "daisy" && g >= 0 && i > g;
          return (
            <span key={d} className="flex items-center gap-2">
              <span className={g >= 0 && i <= g && scheme === "daisy" ? "text-neon" : "text-muted-foreground"}>→</span>
              <button type="button" aria-pressed={req[i]} onClick={() => setReq(req.map((r, k) => (k === i ? !r : r)))} className={`rounded-sm border-2 px-3 py-2 text-left transition-colors ${g === i ? "border-mint bg-mint/25 font-bold" : req[i] ? "border-orange bg-orange/15" : "border-border"} ${blocked ? "opacity-60" : ""}`}>{d}<div className="text-[9px] font-normal">{g === i ? "granted" : req[i] ? "waiting" : "idle"}</div></button>
            </span>
          );
        })}
      </div>
      <button type="button" className={`${btn} w-fit`} disabled={g < 0} onClick={() => { setLast(g); if (scheme === "daisy") setReq(req.map((r, k) => (k === g ? false : r))); }}>{scheme === "daisy" ? "Finish transfer" : "Next turn"}</button>
      <p className="text-sm">{scheme === "daisy" ? "The grant passes along the chain, and the first device that wants it keeps it. The nearest device always wins, so one busy device can starve the others." : "Each requester takes a turn. It's fair, but urgent traffic has to wait in line like everyone else."}</p>
    </Panel>
  );
}

/* ------------------------------- pipeline ------------------------------ */

const STAGE_CLS: Record<string, string> = { IF: "bg-sky/50", ID: "bg-violet/50", EX: "bg-orange/50", MEM: "bg-mint/40", WB: "bg-neon/30", stall: "bg-transparent border border-dashed border-orange text-orange", flush: "bg-muted", "": "" };

function PipeGrid({ names, rows, at }: { names: string[]; rows: PipeCell[][]; at?: number }) {
  const cycles = rows[0]?.length ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="font-mono text-[11px] border-collapse">
        <thead><tr><th />{Array.from({ length: cycles }, (_, c) => <th key={c} className={`w-9 font-normal ${at === c ? "text-foreground font-bold" : "text-muted-foreground"}`}>{c + 1}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="pr-3 whitespace-nowrap">{names[i]}</td>
              {r.map((c, k) => <td key={k} className="p-px"><div className={`h-7 flex items-center justify-center rounded-[2px] ${at !== undefined && k > at ? "opacity-0" : ""} ${at === k && c ? "ring-1 ring-foreground" : ""} ${STAGE_CLS[c]}`}>{c === "stall" ? "·" : c}</div></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LAUNDRY = ["wash", "dry", "fold", "put away"];

export function LaundryPipeline() {
  const [piped, setPiped] = useState(true);
  const loads = 4;
  const k = LAUNDRY.length;
  const tones = ["bg-sky/60", "bg-violet/60", "bg-orange/60", "bg-mint/60"];
  const total = piped ? pipelineCycles(loads, k) : unpipelinedCycles(loads, k);
  return (
    <Panel title="Four loads of laundry">
      <Toggle value={piped ? "p" : "s"} options={[["s", "One load at a time"], ["p", "Start the next when the washer is free"]]} onChange={(v) => setPiped(v === "p")} />
      <div className="flex flex-col gap-0.5 overflow-x-auto">
        {Array.from({ length: loads }, (_, l) => {
          const start = piped ? l : l * k;
          return <div key={l} className="flex gap-px items-center"><span className="w-12 shrink-0 font-mono text-[10px] text-muted-foreground">load {l + 1}</span>{Array.from({ length: start }, (_, i) => <span key={i} className="w-7 h-6 shrink-0" />)}{LAUNDRY.map((s, i) => <span key={s} title={s} className={`w-7 h-6 shrink-0 rounded-[1px] ${tones[i]}`} />)}</div>;
        })}
      </div>
      <div className="font-mono text-[13px]">Done in <b className="text-mint">{total} time slots</b>. A single load still takes {k}, but a load now finishes every slot.</div>
      <div className="flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">{LAUNDRY.map((s, i) => <span key={s} className="flex gap-1 items-center"><span className={`w-3 h-3 ${tones[i]}`} />{s}</span>)}</div>
    </Panel>
  );
}

const CLEAN: PipeInstr[] = [{ text: "ADD R1, R2, R3" }, { text: "SUB R4, R5, R6" }, { text: "AND R7, R8, R9" }, { text: "OR  R2, R3, R5" }, { text: "XOR R6, R8, R9" }];

export function PipelineStepper() {
  const { rows, cycles } = useMemo(() => schedulePipeline(CLEAN, "forward"), []);
  const stageNames: Record<string, string> = { IF: "fetch", ID: "decode", EX: "execute", MEM: "memory", WB: "write back" };
  const frames = useMemo<Frame<number>[]>(() => Array.from({ length: cycles }, (_, c) => {
    const inflight = rows.map((r, i) => (r[c] ? `${CLEAN[i].text.split(" ")[0]} in ${stageNames[r[c] as string]}` : null)).filter(Boolean);
    return { state: c, message: `Cycle ${c + 1}: ${inflight.join(", ")}.${rows.some((r) => r[c] === "WB") ? " One instruction finishes." : ""}`, line: -1, stats: { cycle: c + 1 } };
  }), [rows, cycles]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Stepper title="Five instructions through five stages" frames={frames} code={CLEAN.map((c) => c.text)} codeLabel="The program (no dependencies)" render={(c) => <PipeGrid names={CLEAN.map((x) => x.text)} rows={rows} at={c} />} />;
}

const HAZARDS: Record<string, { label: string; prog: PipeInstr[]; note: string }> = {
  data: { label: "Data hazard", prog: [{ text: "ADD R1, R2, R3", writes: "R1", reads: ["R2", "R3"] }, { text: "SUB R4, R1, R5", writes: "R4", reads: ["R1", "R5"] }, { text: "AND R6, R4, R1", writes: "R6", reads: ["R4", "R1"] }], note: "SUB needs R1 before ADD has written it." },
  load: { label: "Load-use hazard", prog: [{ text: "LW  R1, 0(R2)", writes: "R1", reads: ["R2"], load: true }, { text: "ADD R3, R1, R4", writes: "R3", reads: ["R1", "R4"] }, { text: "SUB R5, R6, R7", writes: "R5", reads: ["R6", "R7"] }], note: "A load has its value only after the memory stage, so one stall stays even with forwarding." },
  branch: { label: "Control hazard", prog: [{ text: "BEQ R1, R2, far", branch: true, reads: ["R1", "R2"] }, { text: "(target) ADD R3, R4, R5", writes: "R3", reads: ["R4", "R5"] }, { text: "SUB R6, R7, R8", writes: "R6", reads: ["R7", "R8"] }], note: "The CPU doesn't know where the branch goes until it's executed. If it's taken, the two instructions fetched in the meantime are thrown away, which costs two cycles." },
};

export function HazardLab() {
  const [h, setH] = useState("data");
  const [mode, setMode] = useState<HazardMode>("stall");
  const prog = HAZARDS[h].prog;
  const res = useMemo(() => schedulePipeline(prog, mode), [prog, mode]);
  const ideal = pipelineCycles(prog.length, 5);
  return (
    <Panel title="Hazard lab" legend={[["border border-dashed border-orange", "stall (bubble)"]]}>
      <div className="flex flex-wrap gap-3">
        <Toggle value={h} options={Object.entries(HAZARDS).map(([k, v]) => [k, v.label])} onChange={setH} />
        {h !== "branch" && <Toggle value={mode} options={[["stall", "Just stall"], ["forward", "With forwarding"]]} onChange={(m) => setMode(m as HazardMode)} />}
      </div>
      <PipeGrid names={prog.map((p) => p.text)} rows={res.rows} />
      <div className="font-mono text-[13px]">{res.cycles} cycles, against {ideal} with no hazard. {res.cycles - ideal} cycle{res.cycles - ideal === 1 ? "" : "s"} lost.</div>
      <p className="text-sm">{HAZARDS[h].note}</p>
      {res.notes.length > 0 && <ul className="text-sm text-muted-foreground list-disc pl-4">{res.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      {mode === "forward" && h === "data" && <p className="text-sm text-mint">Forwarding adds a shortcut wire from the end of EX straight back to the ALU's input, so the result doesn't have to wait until write-back.</p>}
    </Panel>
  );
}

/* ------------------------------ parallelism ---------------------------- */

const FLYNN: Record<string, { name: string; i: number; d: number; note: string; ex: string }> = {
  SISD: { name: "Single instruction, single data", i: 1, d: 1, note: "One instruction works on one piece of data at a time. The classic sequential computer.", ex: "A simple single-core CPU" },
  SIMD: { name: "Single instruction, multiple data", i: 1, d: 4, note: "One instruction works on many values at once, like \"add 1 to all of these pixels\".", ex: "GPUs, array and vector processors" },
  MISD: { name: "Multiple instruction, single data", i: 4, d: 1, note: "Different operations on the same data. Rare, and mostly used for fault tolerance.", ex: "Flight control systems that cross-check results" },
  MIMD: { name: "Multiple instruction, multiple data", i: 4, d: 4, note: "Each processor runs its own program on its own data. The most flexible kind.", ex: "Multicore CPUs and clusters" },
};

export function FlynnTaxonomy() {
  const [k, setK] = useState("SIMD");
  const f = FLYNN[k];
  const pairs = Math.max(f.i, f.d);
  return (
    <Panel title="Flynn's taxonomy">
      <div className="grid grid-cols-2 gap-1 w-fit">{Object.keys(FLYNN).map((x) => <button key={x} type="button" aria-pressed={x === k} onClick={() => setK(x)} className={`${btn} ${pressed(x === k)}`}>{x}</button>)}</div>
      <svg viewBox="0 0 400 150" className="w-full max-w-[500px]">
        {Array.from({ length: pairs }, (_, n) => {
          const y = 15 + n * (120 / Math.max(1, pairs - 1 || 1));
          const cy = pairs === 1 ? 75 : y;
          const iy = f.i === 1 ? 75 : cy;
          const dy = f.d === 1 ? 75 : cy;
          return (
            <g key={n}>
              <path d={`M60,${iy} L170,${cy}`} className="stroke-violet" strokeWidth={2} />
              <path d={`M340,${dy} L230,${cy}`} className="stroke-mint" strokeWidth={2} />
              <rect x={170} y={cy - 13} width={60} height={26} rx={3} className="fill-card stroke-foreground/60" strokeWidth={1.5} />
              <text x={200} y={cy + 4} textAnchor="middle" className="fill-foreground font-mono text-[11px]">CPU</text>
            </g>
          );
        })}
        {Array.from({ length: f.i }, (_, n) => { const y = f.i === 1 ? 75 : 15 + n * 40; return <g key={n}><rect x={10} y={y - 11} width={50} height={22} rx={2} className="fill-violet/30 stroke-violet" /><text x={35} y={y + 4} textAnchor="middle" className="fill-foreground font-mono text-[10px]">instr</text></g>; })}
        {Array.from({ length: f.d }, (_, n) => { const y = f.d === 1 ? 75 : 15 + n * 40; return <g key={n}><rect x={340} y={y - 11} width={50} height={22} rx={2} className="fill-mint/30 stroke-mint" /><text x={365} y={y + 4} textAnchor="middle" className="fill-foreground font-mono text-[10px]">data</text></g>; })}
      </svg>
      <div className="text-sm"><b>{f.name}.</b> {f.note}</div>
      <div className="text-[12px] font-mono text-muted-foreground">Example: {f.ex}</div>
    </Panel>
  );
}

export function SimdDemo() {
  const a = [1, 2, 3, 4, 5, 6, 7, 8], b = [8, 7, 6, 5, 4, 3, 2, 1];
  const [width, setWidth] = useState(4);
  const [t, setT] = useState(0);
  const steps = Math.ceil(8 / width);
  useEffect(() => setT(0), [width]);
  const done = Math.min(8, t * width);
  return (
    <Panel title="Adding two arrays">
      <Toggle value={String(width)} options={[["1", "Scalar (1 at a time)"], ["4", "SIMD (4 at a time)"], ["8", "SIMD (8 at a time)"]]} onChange={(v) => setWidth(Number(v))} />
      <div className="font-mono text-[13px] flex flex-col gap-1">
        {[["a", a], ["b", b]].map(([n, arr]) => <div key={n as string} className="flex gap-1 items-center"><span className="w-4 text-muted-foreground">{n as string}</span>{(arr as number[]).map((v, i) => <span key={i} className={`w-8 h-7 flex items-center justify-center border rounded-[2px] ${i >= done && i < done + width && t < steps ? "border-neon bg-neon/20" : "border-border"}`}>{v}</span>)}</div>)}
        <div className="flex gap-1 items-center"><span className="w-4 text-muted-foreground">=</span>{a.map((v, i) => <span key={i} className={`w-8 h-7 flex items-center justify-center border rounded-[2px] ${i < done ? "border-mint bg-mint/25 font-bold" : "border-dashed border-border"}`}>{i < done ? v + b[i] : ""}</span>)}</div>
      </div>
      <div className="flex gap-2 items-center">
        <button type="button" className={btn} onClick={() => setT(Math.min(steps, t + 1))} disabled={t >= steps}>Run one instruction →</button>
        <button type="button" className={btn} onClick={() => setT(0)}>⟲ Reset</button>
        <span className="font-mono text-[12px] text-muted-foreground">{t} of {steps} instructions</span>
      </div>
    </Panel>
  );
}

export function AmdahlLab() {
  const [p, setP] = useState(90);
  const [n, setN] = useState(8);
  const s = amdahl(p / 100, n);
  const limit = 1 / (1 - p / 100 || 0.0001);
  const serial = 100 - p;
  const par = p / n;
  const total = serial + par;
  return (
    <Panel title="More cores: how much faster?" legend={[["bg-orange/70", "can't be split"], ["bg-mint/70", "shared between cores"]]}>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground"><span className="w-28">parallel part</span><input type="range" min={0} max={99} value={p} onChange={(e) => setP(Number(e.target.value))} aria-label="Parallel percentage" className="flex-1 accent-[hsl(var(--mint))]" /><span className="w-10 text-foreground">{p}%</span></label>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground"><span className="w-28">cores</span><input type="range" min={1} max={128} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Number of cores" className="flex-1 accent-[hsl(var(--mint))]" /><span className="w-10 text-foreground">{n}</span></label>
      <div className="font-mono text-[11px]">
        <div>1 core</div>
        <div className="flex h-5"><span className="bg-orange/70" style={{ width: `${serial}%` }} /><span className="bg-mint/70" style={{ width: `${p}%` }} /></div>
        <div className="mt-2">{n} cores</div>
        <div className="flex h-5"><span className="bg-orange/70" style={{ width: `${serial}%` }} /><span className="bg-mint/70" style={{ width: `${par}%` }} /></div>
        <div className="text-muted-foreground mt-1">Bars show running time. {total.toFixed(0)}% of the original.</div>
      </div>
      <div className="font-mono text-[14px]">Speedup = <b className="text-mint">{s.toFixed(2)}×</b>. With unlimited cores, it could never pass <b>{limit.toFixed(0)}×</b>.</div>
    </Panel>
  );
}
