import { useEffect, useMemo, useState } from "react";
import { btn, inputCls, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import { TimingDiagram } from "@/components/mdx/LogicVisualizers";
import type { Frame } from "@/lib/algorithms";
import { bitString, type Bit } from "@/lib/logic";
import { flagsAfter, physicalAddress, REG16, runAsm, segmentRange, toHex, type AsmFrameState, type FlagName } from "@/lib/asm8086";

/* ------------------------------ BIU and EU ----------------------------- */

const QUEUE_PROGRAM = ["MOV AX, 5", "ADD AX, BX", "INC CX", "MOV DX, AX", "SUB AX, 1", "PUSH AX", "POP BX", "NOP"];

type QueueState = { queue: string[]; running: string | null; fetched: number; busy: "fetch" | "idle"; done: number };

function queueFrames(): Frame<QueueState>[] {
  const frames: Frame<QueueState>[] = [];
  const queue: string[] = [];
  let next = 0;
  let running: string | null = null;
  let left = 0;
  let done = 0;
  const lengths = [2, 1, 1, 1, 2, 1, 1, 1];
  frames.push({ state: { queue: [], running: null, fetched: 0, busy: "idle", done: 0 }, message: "The queue is empty, and both units are waiting to start.", line: 0, stats: { tick: 0 } });
  for (let t = 1; t < 16; t++) {
    let fetchedNow: string | null = null;
    if (queue.length < 6 && next < QUEUE_PROGRAM.length) {
      fetchedNow = QUEUE_PROGRAM[next++];
      queue.push(fetchedNow);
    }
    let startedNow: string | null = null;
    let finished: string | null = null;
    if (left === 0 && running) {
      finished = running;
      running = null;
      done++;
    }
    if (!running && queue.length) {
      startedNow = queue.shift()!;
      running = startedNow;
      left = lengths[QUEUE_PROGRAM.indexOf(startedNow)];
    }
    if (running) left--;
    const bits = [
      fetchedNow && `BIU fetches "${fetchedNow}" into the queue.`,
      startedNow ? `EU takes "${startedNow}" from the front, with no trip to memory.` : running ? `EU is still busy with "${running}", but the BIU kept working anyway.` : !fetchedNow && finished ? "Everything has been executed." : null,
    ].filter(Boolean);
    frames.push({ state: { queue: [...queue], running, fetched: next, busy: fetchedNow ? "fetch" : "idle", done }, message: bits.join(" "), line: fetchedNow ? 0 : 1, stats: { tick: t } });
    if (!running && !queue.length && next >= QUEUE_PROGRAM.length) break;
  }
  return frames;
}

export function BiuEuQueue() {
  const frames = useMemo(queueFrames, []);
  return (
    <Stepper
      title="Two units, one queue"
      frames={frames}
      codeLabel="Two jobs at the same time"
      code={["BIU: while the queue has room, fetch the next instruction", "EU:  take the next instruction from the queue and run it"]}
      legend={[["bg-sky", "BIU"], ["bg-orange", "EU"]]}
      render={(s) => (
        <div className="flex flex-wrap gap-4 items-stretch font-mono text-[12px]">
          <div className={`rounded-sm border-2 p-3 w-32 transition-colors ${s.busy === "fetch" ? "border-sky bg-sky/15" : "border-border"}`}>
            <div className="font-bold text-sky">BIU</div>
            <div className="text-[10px] text-muted-foreground mb-2">talks to memory</div>
            <div className="text-[10px]">fetched {s.fetched}/8</div>
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">instruction queue ({s.queue.length}/6)</div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className={`h-14 rounded-[2px] border flex items-center justify-center text-center text-[9px] p-0.5 transition-colors ${s.queue[i] ? "border-sky bg-sky/15" : "border-border border-dashed"}`}>{s.queue[i] ?? ""}</div>)}
            </div>
          </div>
          <div className={`rounded-sm border-2 p-3 w-36 transition-colors ${s.running ? "border-orange bg-orange/15" : "border-border"}`}>
            <div className="font-bold text-orange">EU</div>
            <div className="text-[10px] text-muted-foreground mb-2">runs instructions</div>
            <div className="text-[12px] min-h-[1.2em]">{s.running ?? "idle"}</div>
            <div className="text-[10px] text-muted-foreground mt-1">done {s.done}</div>
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------- registers ----------------------------- */

const REG_ROLES: Record<string, { name: string; job: string }> = {
  AX: { name: "Accumulator", job: "Main register for arithmetic and for input and output." },
  BX: { name: "Base", job: "Often holds the address of data in memory." },
  CX: { name: "Count", job: "The counter for LOOP, shifts and string instructions." },
  DX: { name: "Data", job: "Holds the high half of multiply and divide results, and I/O port numbers." },
};

/** One 16-bit register is two 8-bit registers you can use separately. */
export function RegisterSplit() {
  const [reg, setReg] = useState("AX");
  const [v, setV] = useState(0x1234);
  const hi = (v >> 8) & 0xff, lo = v & 0xff;
  const base = reg[0];
  const bits = bitString(v, 16);
  return (
    <Panel title="One register, three names">
      <Toggle value={reg} options={Object.keys(REG_ROLES).map((k) => [k, k])} onChange={setReg} />
      <div className="font-mono">
        <div className="flex gap-px flex-wrap">
          {[...bits].map((b, i) => (
            <button key={i} type="button" aria-label={`Bit ${15 - i}`} aria-pressed={b === "1"} onClick={() => setV(v ^ (1 << (15 - i)))} className={`w-[26px] h-9 text-[12px] rounded-[2px] border transition-colors ${i < 8 ? (b === "1" ? "border-orange bg-orange/30" : "border-orange/30") : b === "1" ? "border-sky bg-sky/30" : "border-sky/30"} ${i === 8 ? "ml-1" : ""}`}>{b}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-5 mt-3 text-[13px]">
          <span><b>{reg}</b> = {toHex(v)}h = {v}</span>
          <span className="text-orange"><b>{base}H</b> (high byte) = {toHex(hi, 2)}h</span>
          <span className="text-sky"><b>{base}L</b> (low byte) = {toHex(lo, 2)}h</span>
        </div>
      </div>
      <p className="text-sm"><b>{REG_ROLES[reg].name}.</b> {REG_ROLES[reg].job} Click bits to change them. A change to {base}L is a change to {reg}, since they're the same flip-flops.</p>
    </Panel>
  );
}

/* --------------------------------- flags ------------------------------- */

const FLAG_INFO: [FlagName, string, string][] = [
  ["CF", "Carry", "The result didn't fit if the numbers are unsigned: a carry out of, or a borrow into, the top bit."],
  ["ZF", "Zero", "The result is exactly 0."],
  ["SF", "Sign", "The top bit of the result is 1. As a signed number, it's negative."],
  ["OF", "Overflow", "The result is wrong if the numbers are signed, like positive + positive = negative."],
  ["PF", "Parity", "The low 8 bits of the result contain an even number of 1s."],
  ["AF", "Auxiliary", "A carry out of the low 4 bits. Used for BCD arithmetic."],
];

export function FlagsLab() {
  const [a, setA] = useState(100);
  const [b, setB] = useState(50);
  const [op, setOp] = useState<"ADD" | "SUB">("ADD");
  const { result, flags } = useMemo(() => flagsAfter(a, b, op), [a, b, op]);
  const signed = (x: number) => (x > 127 ? x - 256 : x);
  return (
    <Panel title="Do a sum, read the flags">
      <div className="flex flex-wrap gap-4 items-center font-mono text-[12px] text-muted-foreground">
        <label className="flex items-center gap-2">AL<input type="number" min={0} max={255} value={a} onChange={(e) => setA(Math.min(255, Math.max(0, Number(e.target.value) || 0)))} className={`${inputCls} w-20`} /></label>
        <Toggle value={op} options={[["ADD", "ADD"], ["SUB", "SUB"]]} onChange={(x) => setOp(x as "ADD" | "SUB")} />
        <label className="flex items-center gap-2">value<input type="number" min={0} max={255} value={b} onChange={(e) => setB(Math.min(255, Math.max(0, Number(e.target.value) || 0)))} className={`${inputCls} w-20`} /></label>
      </div>
      <div className="font-mono text-[13px]">
        <div>{bitString(a, 8)} <span className="text-muted-foreground">({a}, or signed {signed(a)})</span></div>
        <div>{bitString(b, 8)} <span className="text-muted-foreground">({b}, or signed {signed(b)})</span></div>
        <div className="border-t border-foreground/50 mt-1 pt-1 font-bold">{bitString(result, 8)} <span className="font-normal text-muted-foreground">({result}, or signed {signed(result)})</span></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-1.5">
        {FLAG_INFO.map(([f, name, why]) => (
          <div key={f} className={`rounded-sm border p-2 transition-colors ${flags[f] ? "border-mint bg-mint/15" : "border-border"}`}>
            <div className="font-mono text-[12px]"><b>{f}</b> = {flags[f]} <span className="text-muted-foreground">{name}</span></div>
            <div className={`text-[11px] leading-snug ${flags[f] ? "" : "text-muted-foreground"}`}>{why}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Try 100 + 50 (overflow), 200 + 100 (carry) and 5 - 5 (zero). The CPU sets both carry and overflow without knowing which kind of number you meant, and your program reads the flag that applies.</p>
    </Panel>
  );
}

/* --------------------------- segments and addresses -------------------- */

const SEG_EXAMPLES: { name: string; seg: string; off: string; segName: string; offName: string }[] = [
  { name: "Next instruction", seg: "0100", off: "9F2C", segName: "CS", offName: "IP" },
  { name: "Data", seg: "24F6", off: "634A", segName: "DS", offName: "SI" },
  { name: "Top of stack", seg: "7FA2", off: "438E", segName: "SS", offName: "SP" },
];

export function SegmentCalculator() {
  const [i, setI] = useState(1);
  const [seg, setSeg] = useState(SEG_EXAMPLES[1].seg);
  const [off, setOff] = useState(SEG_EXAMPLES[1].off);
  const sn = parseInt(seg, 16) || 0, on = parseInt(off, 16) || 0;
  const pa = physicalAddress(sn, on);
  const [lo, hi] = segmentRange(sn);
  const pct = (x: number) => `${(x / 0xfffff) * 100}%`;
  const clean = (t: string) => t.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 4);
  return (
    <Panel title="Two 16-bit numbers make one 20-bit address">
      <div className="flex flex-wrap gap-1.5">{SEG_EXAMPLES.map((e, k) => <button key={e.name} type="button" aria-pressed={i === k} onClick={() => { setI(k); setSeg(e.seg); setOff(e.off); }} className={`${btn} ${i === k ? "bg-foreground text-background" : ""}`}>{e.segName}:{e.offName}</button>)}</div>
      <div className="flex gap-4 flex-wrap font-mono text-[12px] text-muted-foreground">
        <label className="flex items-center gap-2">{SEG_EXAMPLES[i].segName}<input value={seg} onChange={(e) => setSeg(clean(e.target.value))} className={`${inputCls} w-24`} /></label>
        <label className="flex items-center gap-2">{SEG_EXAMPLES[i].offName}<input value={off} onChange={(e) => setOff(clean(e.target.value))} className={`${inputCls} w-24`} /></label>
      </div>
      <div className="font-mono text-[17px] w-fit">
        <div className="flex justify-end"><span className="text-violet">{toHex(sn)}</span><span className="text-orange font-bold">0</span><span className="text-[11px] text-muted-foreground self-center ml-3 w-44">segment, shifted left one hex digit</span></div>
        <div className="flex justify-end border-b border-foreground pb-0.5"><span className="text-muted-foreground mr-2">+</span><span className="text-sky">{toHex(on)}</span><span className="text-[11px] text-muted-foreground self-center ml-3 w-44">offset</span></div>
        <div className="flex justify-end font-bold pt-0.5"><span className="text-mint">{toHex(pa, 5)}</span><span className="text-[11px] font-normal text-muted-foreground self-center ml-3 w-44">physical address (h)</span></div>
      </div>
      <div>
        <div className="relative h-8 rounded-[2px] border border-border bg-background">
          <div className="absolute inset-y-0 bg-violet/30 border-x border-violet" style={{ left: pct(lo), width: `max(3px, ${pct(Math.min(hi, 0xfffff) - lo)})` }} />
          <div className="absolute inset-y-0 w-1 bg-mint" style={{ left: pct(pa) }} />
        </div>
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1"><span>00000h</span><span>1 MB of memory</span><span>FFFFFh</span></div>
      </div>
      <div className="font-mono text-[12px] flex flex-wrap gap-x-6">
        <span>logical address <b>{toHex(sn)}:{toHex(on)}</b></span>
        <span className="text-violet">segment runs {toHex(lo, 5)}h to {toHex(hi, 5)}h, which is 64 KB</span>
      </div>
    </Panel>
  );
}

/* --------------------------- addressing modes -------------------------- */

const MODES: { id: string; label: string; asm: string; ea: (r: { BX: number; SI: number; d: number }) => number | null; formula: string; story: string; regs: string[] }[] = [
  { id: "imm", label: "Immediate", asm: "MOV AL, 25h", ea: () => null, formula: "no memory access", story: "The value is written inside the instruction itself, like a phone number you've memorised.", regs: [] },
  { id: "reg", label: "Register", asm: "MOV AL, BL", ea: () => null, formula: "no memory access", story: "The value is already in another register. This is the fastest mode.", regs: [] },
  { id: "dir", label: "Direct", asm: "MOV AL, [0004h]", ea: () => 4, formula: "EA = 0004h", story: "The address is written in the instruction: \"go to house number 4\".", regs: [] },
  { id: "ind", label: "Register indirect", asm: "MOV AL, [BX]", ea: (r) => r.BX, formula: "EA = BX", story: "A register holds the address: \"go to the house number on this note\". Change the note and you visit a different house.", regs: ["BX"] },
  { id: "bas", label: "Based", asm: "MOV AL, [BX+d]", ea: (r) => r.BX + r.d, formula: "EA = BX + d", story: "Start at a base and add a fixed distance, like field 2 of a record.", regs: ["BX", "d"] },
  { id: "idx", label: "Indexed", asm: "MOV AL, [SI+d]", ea: (r) => r.SI + r.d, formula: "EA = SI + d", story: "The same sum using an index register, like element SI of an array starting at d.", regs: ["SI", "d"] },
  { id: "bi", label: "Based-indexed", asm: "MOV AL, [BX+SI]", ea: (r) => r.BX + r.SI, formula: "EA = BX + SI", story: "Base says where the array starts, and index says which element.", regs: ["BX", "SI"] },
  { id: "bid", label: "Based-indexed + disp", asm: "MOV AL, [BX+SI+d]", ea: (r) => r.BX + r.SI + r.d, formula: "EA = BX + SI + d", story: "Three parts, which suits a 2D table: base is the table, index picks the row, and displacement picks the column.", regs: ["BX", "SI", "d"] },
];

export function AddressingModes() {
  const [mode, setMode] = useState("ind");
  const [BX, setBX] = useState(2);
  const [SI, setSI] = useState(3);
  const [d, setD] = useState(4);
  const m = MODES.find((x) => x.id === mode)!;
  const ea = m.ea({ BX, SI, d });
  const memory = [0x41, 0x7f, 0x10, 0xc3, 0x25, 0x08, 0x99, 0xe0, 0x3a, 0x55, 0x01, 0xbe, 0x6d, 0x2f, 0x90, 0x12];
  const value = m.id === "imm" ? 0x25 : m.id === "reg" ? 0x0f : ea !== null && ea < 16 ? memory[ea] : 0;
  const slider = (name: string, v: number, set: (n: number) => void, on: boolean) => (
    <label className={`flex items-center gap-2 font-mono text-[12px] ${on ? "" : "opacity-30"}`}><span className="w-5">{name}</span><input type="range" min={0} max={7} value={v} disabled={!on} onChange={(e) => set(Number(e.target.value))} aria-label={name} className="accent-[hsl(var(--sky))] w-24" /><span className="w-3">{v}</span></label>
  );
  return (
    <Panel title="Eight ways to say where the data is" legend={[["bg-mint", "the cell it reads"]]}>
      <div className="flex flex-wrap gap-1">{MODES.map((x) => <button key={x.id} type="button" aria-pressed={x.id === mode} onClick={() => setMode(x.id)} className={`${btn} !px-2 !tracking-normal ${x.id === mode ? "bg-foreground text-background" : ""}`}>{x.label}</button>)}</div>
      <div className="font-mono text-lg">{m.asm.replace("+d", `+${d}`)}</div>
      <div className="flex flex-wrap gap-4">
        {slider("BX", BX, setBX, m.regs.includes("BX"))}
        {slider("SI", SI, setSI, m.regs.includes("SI"))}
        {slider("d", d, setD, m.regs.includes("d"))}
      </div>
      <div className="grid grid-cols-8 gap-1 font-mono text-[11px] max-w-[440px]">
        {memory.map((v, i) => <div key={i} className={`rounded-[2px] border p-1 text-center transition-colors ${ea === i ? "border-mint bg-mint/30 font-bold" : "border-border"}`}><div className="text-[9px] text-muted-foreground">{toHex(i, 4).slice(2)}h</div>{toHex(v, 2)}</div>)}
      </div>
      <div className="font-mono text-[13px] flex flex-wrap gap-x-6">
        <span className="text-sky">{m.formula}{ea !== null && m.regs.length ? ` = ${ea}` : ""}</span>
        {ea !== null && ea >= 16 ? <span className="text-orange">off this small map</span> : <span>AL = <b className="text-mint">{toHex(value, 2)}h</b></span>}
      </div>
      <p className="text-sm">{m.story}</p>
    </Panel>
  );
}

/* --------------------------------- runner ------------------------------ */

function AsmView({ s, watch, showStack }: { s: AsmFrameState; watch?: boolean; showStack?: boolean }) {
  const FLAGS: FlagName[] = ["CF", "ZF", "SF", "OF", "PF", "AF"];
  const dataMem = s.memory.filter(([a]) => a < 0xf000);
  return (
    <div className="flex flex-col gap-3 font-mono">
      <div className="grid grid-cols-4 gap-1.5">
        {REG16.map((r) => (
          <div key={r} className={`rounded-sm border px-2 py-1 transition-colors ${s.changed.includes(r) ? "border-neon bg-neon/15" : "border-border"}`}>
            <div className="text-[10px] text-muted-foreground">{r}</div>
            <div className="text-[14px]">{toHex(s.regs[r])}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {FLAGS.map((f) => <span key={f} className={`px-1.5 py-0.5 text-[11px] rounded-[2px] border transition-colors ${s.changed.includes(f) ? "border-neon bg-neon/20" : s.flags[f] ? "border-mint bg-mint/15" : "border-border text-muted-foreground"}`}>{f}={s.flags[f]}</span>)}
      </div>
      {watch && dataMem.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">memory</div>
          <div className="flex flex-wrap gap-1">{dataMem.slice(0, 24).map(([a, v]) => <span key={a} className={`rounded-[2px] border px-1 text-center text-[11px] transition-colors ${s.wrote.includes(a) ? "border-neon bg-neon/20" : "border-border"}`}><div className="text-[8px] text-muted-foreground">{toHex(a)}</div>{toHex(v, 2)}</span>)}</div>
        </div>
      )}
      {showStack && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">stack (top first), SP = {toHex(s.regs.SP)}h</div>
          <div className="flex flex-col gap-0.5 w-40 min-h-[2rem]">
            {s.stack.length === 0 && <span className="text-[11px] text-muted-foreground border border-dashed border-border rounded-[2px] px-2 py-1">empty</span>}
            {[...s.stack].reverse().map((v, i) => <span key={i} className={`text-[12px] rounded-[2px] border px-2 py-0.5 transition-colors ${i === 0 ? "border-violet bg-violet/15" : "border-border"}`}>{toHex(v)}h = {v}</span>)}
          </div>
        </div>
      )}
      {s.output && <div className="rounded-[2px] bg-black text-mint px-3 py-2 text-[13px] whitespace-pre-wrap"><span className="text-white/40">C:\&gt; </span>{s.output}</div>}
    </div>
  );
}

/** Step through real 8086 assembly. The source can be edited. */
export function AsmRunner({ source, title = "8086 simulator", watch = false, stack = false }: { source: string; title?: string; watch?: boolean; stack?: boolean }) {
  const [text, setText] = useState(source.trim());
  const [editing, setEditing] = useState(false);
  const { frames, error } = useMemo(() => runAsm(text), [text]);
  const lines = text.split("\n");
  return (
    <div>
      {error && <div className="not-prose my-2 border-l-2 border-orange bg-orange/10 px-3 py-2 font-mono text-[12px] text-foreground">{error}</div>}
      {frames.length > 0 ? (
        <Stepper
          title={title}
          frames={frames as Frame<AsmFrameState>[]}
          code={lines}
          codeLabel="8086 assembly"
          legend={[["bg-neon", "changed by this line"]]}
          render={(s) => <AsmView s={s} watch={watch} showStack={stack} />}
          inputs={
            <div>
              <button type="button" className={btn} aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? "Hide editor" : "✎ Edit this program"}</button>
              {editing && <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="Assembly source" rows={Math.min(16, lines.length + 2)} className={`${inputCls} block w-full mt-2`} />}
            </div>
          }
        />
      ) : (
        <div className="not-prose my-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="Assembly source" rows={Math.min(16, lines.length + 2)} className={`${inputCls} block w-full`} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------- interrupts ---------------------------- */

const INT_STEPS = (kind: "INTR" | "NMI", masked: boolean) => {
  const main = "Running the main program, line after line.";
  if (kind === "INTR" && masked) return [
    { at: "main", msg: main, stack: [] as string[] },
    { at: "irq", msg: "A device raises INTR, asking for attention.", stack: [] },
    { at: "main", msg: "The interrupt flag is 0 (after a CLI), so the CPU ignores the request for now and carries on. That's what maskable means.", stack: [] },
  ];
  return [
    { at: "main", msg: main, stack: [] as string[] },
    { at: "irq", msg: kind === "NMI" ? "A serious hardware fault raises NMI. No instruction can switch this one off." : "A device raises INTR, asking for attention. The interrupt flag is 1, so the CPU accepts it.", stack: [] },
    { at: "finish", msg: "The CPU finishes the instruction it's on. It never stops halfway through one.", stack: [] },
    { at: "save", msg: "It saves its place by pushing FLAGS, CS and IP on the stack, like a bookmark.", stack: ["FLAGS", "CS", "IP"] },
    { at: "table", msg: `It looks up the handler's address in the interrupt vector table, an array of 256 entries at the bottom of memory. ${kind === "NMI" ? "NMI is always entry 2." : "The device supplies the entry number."}`, stack: ["FLAGS", "CS", "IP"] },
    { at: "isr", msg: "The Interrupt Service Routine (ISR) runs. The time from the request until now is the interrupt latency.", stack: ["FLAGS", "CS", "IP"] },
    { at: "iret", msg: "IRET pops IP, CS and FLAGS, restoring everything exactly as it was.", stack: [] },
    { at: "main", msg: "The main program continues from the next instruction, and it never knew anything happened.", stack: [] },
  ];
};

export function InterruptFlow() {
  const [kind, setKind] = useState<"INTR" | "NMI">("INTR");
  const [masked, setMasked] = useState(false);
  const frames = useMemo<Frame<{ at: string; stack: string[] }>[]>(
    () => INT_STEPS(kind, masked).map((s, i) => ({ state: { at: s.at, stack: s.stack }, message: s.msg, line: i, stats: {} })),
    [kind, masked],
  );
  const code = INT_STEPS(kind, masked).map((s) => s.at);
  const box = (id: string, label: string, s: string) => (
    <div className={`rounded-sm border-2 px-2 py-3 text-center font-mono text-[11px] transition-colors ${id === s ? "border-neon bg-neon/20 font-bold" : "border-border"}`}>{label}</div>
  );
  return (
    <Stepper
      title="What happens during an interrupt"
      frames={frames}
      code={code}
      codeLabel="Stages"
      inputs={
        <div className="flex flex-wrap gap-2 items-center">
          <Toggle value={kind} options={[["INTR", "INTR (maskable)"], ["NMI", "NMI (non-maskable)"]]} onChange={(x) => setKind(x as "INTR" | "NMI")} />
          {kind === "INTR" && <button type="button" className={`${btn} ${masked ? "border-orange bg-orange/20" : ""}`} aria-pressed={masked} onClick={() => setMasked(!masked)}>{masked ? "IF = 0 (after CLI)" : "IF = 1 (after STI)"}</button>}
        </div>
      }
      render={(s) => (
        <div className="grid sm:grid-cols-[1fr_auto] gap-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {box("main", "Main program", s.at)}{box("irq", "Request", s.at)}{box("finish", "Finish instruction", s.at)}{box("save", "Save state", s.at)}
            {box("table", "Vector table", s.at)}{box("isr", "ISR runs", s.at)}{box("iret", "IRET", s.at)}
          </div>
          <div className="font-mono text-[11px] w-24">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">stack</div>
            <div className="flex flex-col-reverse gap-0.5 min-h-[4.5rem] justify-end">{s.stack.map((x) => <span key={x} className="border border-violet bg-violet/15 rounded-[2px] px-2 py-0.5">{x}</span>)}</div>
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------- bus cycle ----------------------------- */

const READ_STAGES: { clk: number; note: string }[] = [
  { clk: 1, note: "Cycle 1. The CPU puts the operand's address on the address bus." },
  { clk: 2, note: "Cycle 2. The read line (RD) goes low (0), telling memory a value is wanted." },
  { clk: 3, note: "Cycle 3. The CPU waits one cycle to give memory time to respond. The memory controller puts the value on the data bus." },
  { clk: 4, note: "Cycle 4. RD goes back high (1), and the CPU takes the value from the data bus." },
];

export function MemoryReadCycle() {
  const [waits, setWaits] = useState(0);
  const total = 4 + waits;
  const frames = useMemo(() => {
    const out: Frame<{ upTo: number }>[] = [];
    for (let i = 0; i < total; i++) {
      const isWait = i >= 2 && i < 2 + waits;
      const stage = i < 2 ? READ_STAGES[i] : isWait ? null : READ_STAGES[i - waits];
      out.push({ state: { upTo: i }, message: stage ? stage.note.replace(/^Cycle \d/, `Cycle ${i + 1}`) : `Cycle ${i + 1}. A wait state: memory isn't ready, so the CPU does nothing for a whole tick.`, line: Math.min(i, 3), stats: { "wasted cycles": Math.max(0, Math.min(i - 1, waits)) } });
    }
    return out;
  }, [total, waits]);
  const series = (upTo: number) => {
    const cells = (upTo + 1) * 2;
    const clk: Bit[] = Array.from({ length: cells }, (_, i) => (i % 2 ? 0 : 1) as Bit);
    const addr: Bit[] = Array.from({ length: cells }, () => 1 as Bit);
    const rd: Bit[] = Array.from({ length: cells }, (_, i) => (i >= 2 && i < (total - 1) * 2 + 1 ? 0 : 1) as Bit);
    const data: Bit[] = Array.from({ length: cells }, (_, i) => (i >= (total - 2) * 2 ? 1 : 0) as Bit);
    return [{ name: "CLK", bits: clk }, { name: "ADDR", bits: addr, tone: "stroke-sky" }, { name: "RD", bits: rd, tone: "stroke-orange" }, { name: "DATA", bits: data, tone: "stroke-mint" }];
  };
  return (
    <Stepper
      title="The CPU reads one value from memory"
      frames={frames}
      codeLabel="The steps"
      code={["put the address on the bus", "lower RD", "wait for memory, which places the value on the data bus", "raise RD and take the value"]}
      inputs={<label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">wait states<input type="range" min={0} max={3} value={waits} onChange={(e) => setWaits(Number(e.target.value))} aria-label="Wait states" className="accent-[hsl(var(--orange))]" /><span className="text-foreground">{waits}</span></label>}
      render={({ upTo }) => <TimingDiagram cellW={26} signals={series(upTo)} />}
    />
  );
}

/** Non-pipelined vs the 8086's fetch-while-executing. */
export function FetchExecuteCompare() {
  const [n, setN] = useState(4);
  const plain = n * 2;
  const piped = n + 1;
  const row = (label: string, cells: string[][]) => (
    <div>
      <div className="font-mono text-[11px] text-muted-foreground mb-1">{label}</div>
      <div className="flex flex-col gap-0.5">
        {cells.map((r, i) => <div key={i} className="flex gap-0.5">{r.map((c, j) => <span key={j} className={`w-7 h-6 flex items-center justify-center font-mono text-[10px] rounded-[1px] ${c === "F" ? "bg-sky/50" : c === "E" ? "bg-orange/50" : "bg-transparent"}`}>{c}</span>)}</div>)}
      </div>
    </div>
  );
  return (
    <Panel title="Fetching while executing" legend={[["bg-sky", "fetch"], ["bg-orange", "execute"]]}>
      <label className="flex items-center gap-3 font-mono text-[12px] text-muted-foreground">instructions<input type="range" min={2} max={8} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Number of instructions" className="accent-[hsl(var(--sky))]" /><span className="text-foreground">{n}</span></label>
      <div className="overflow-x-auto flex flex-col gap-4">
        {row(`One at a time (like the 8085): ${plain} ticks`, Array.from({ length: n }, (_, i) => [...Array(i * 2).fill(""), "F", "E"]))}
        {row(`Overlapped (the 8086): ${piped} ticks`, Array.from({ length: n }, (_, i) => [...Array(i).fill(""), "F", "E"]))}
      </div>
    </Panel>
  );
}
