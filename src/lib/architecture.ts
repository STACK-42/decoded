/* Models behind the Computer Architecture course: instruction formats,
   performance, caches, virtual memory and pipelines. */

/* ------------------------- instruction formats ------------------------- */

export type FormatKind = 3 | 2 | 1 | 0;
export type FormatState = { regs: Record<string, number>; stack: number[]; mem: Record<string, number>; ac: number; instr: string };
export type FormatFrame = { state: FormatState; message: string; line: number; stats: Record<string, string | number> };

export const FORMAT_MEMORY = { A: 2, B: 3, C: 4, D: 1, X: 0 };

/** X = (A + B) × (C + D), written for machines with 3, 2, 1 and 0 address fields. */
export const FORMAT_PROGRAMS: Record<FormatKind, string[]> = {
  3: ["ADD R1, A, B", "ADD R2, C, D", "MUL X, R1, R2"],
  2: ["MOV R1, A", "ADD R1, B", "MOV R2, C", "ADD R2, D", "MUL R1, R2", "MOV X, R1"],
  1: ["LOAD A", "ADD B", "STORE T", "LOAD C", "ADD D", "MUL T", "STORE X"],
  0: ["PUSH A", "PUSH B", "ADD", "PUSH C", "PUSH D", "ADD", "MUL", "POP X"],
};

export function formatFrames(kind: FormatKind): FormatFrame[] {
  const mem: Record<string, number> = { ...FORMAT_MEMORY };
  const regs: Record<string, number> = {};
  const stack: number[] = [];
  let ac = 0;
  const read = (n: string) => regs[n] ?? mem[n] ?? 0;
  const write = (n: string, v: number) => {
    if (n.startsWith("R")) regs[n] = v;
    else mem[n] = v;
  };
  const apply = (op: string, a: number, b: number) => (op === "ADD" ? a + b : a * b);
  const frames: FormatFrame[] = [{ state: { regs: {}, stack: [], mem: { ...mem }, ac: 0, instr: "" }, message: "Goal: X = (A + B) × (C + D). A=2, B=3, C=4, D=1, so the answer is 25.", line: -1, stats: { instructions: 0 } }];
  FORMAT_PROGRAMS[kind].forEach((text, i) => {
    const [op, ...rest] = text.replace(/,/g, "").split(" ");
    let msg = "";
    if (kind === 3) {
      const [d, a, b] = rest;
      write(d, apply(op, read(a), read(b)));
      msg = `${d} = ${a} ${op === "ADD" ? "+" : "×"} ${b} = ${read(d)}. All three addresses are spelled out, so the instruction is long but the sources survive.`;
    } else if (kind === 2) {
      const [d, s] = rest;
      if (op === "MOV") write(d, read(s));
      else write(d, apply(op, read(d), read(s)));
      msg = op === "MOV" ? `Copy ${s} into ${d}, because the next instruction will overwrite its first operand.` : `${d} = ${d} ${op === "ADD" ? "+" : "×"} ${s} = ${read(d)}. The first operand is also the destination, so its old value is gone.`;
    } else if (kind === 1) {
      const [a] = rest;
      if (op === "LOAD") ac = read(a);
      else if (op === "STORE") write(a, ac);
      else ac = apply(op, ac, read(a));
      msg = op === "LOAD" ? `The accumulator gets ${a}. AC = ${ac}.` : op === "STORE" ? `Memory location ${a} gets AC (${ac}).` : `AC = AC ${op === "ADD" ? "+" : "×"} ${a} = ${ac}. The accumulator is the implied second operand.`;
    } else if (op === "PUSH") {
      stack.push(read(rest[0]));
      msg = `Put ${rest[0]} (${read(rest[0])}) on top of the stack.`;
    } else if (op === "POP") {
      write(rest[0], stack.pop() as number);
      msg = `Store the top of the stack in ${rest[0]}.`;
    } else {
      const b = stack.pop() as number;
      const a = stack.pop() as number;
      stack.push(apply(op, a, b));
      msg = `${op} names no operands at all. It takes the top two values (${a} and ${b}) and pushes the result (${apply(op, a, b)}).`;
    }
    frames.push({ state: { regs: { ...regs }, stack: [...stack], mem: { ...mem }, ac, instr: text }, message: msg, line: i, stats: { instructions: i + 1 } });
  });
  return frames;
}

/* ----------------------------- performance ----------------------------- */

export type InstructionClass = { name: string; percent: number; cycles: number };

/** Average clock cycles per instruction, weighted by how often each class occurs. */
export function cpi(mix: InstructionClass[]) {
  const total = mix.reduce((s, c) => s + c.percent, 0);
  return total ? mix.reduce((s, c) => s + c.percent * c.cycles, 0) / total : 0;
}
export const mips = (clockHz: number, cpiValue: number) => clockHz / (cpiValue * 1e6);
/** CPU time = instruction count × CPI ÷ clock rate. */
export const cpuTime = (instructions: number, cpiValue: number, clockHz: number) => (instructions * cpiValue) / clockHz;
/** Speedup when a fraction p of the work runs on n processors. */
export const amdahl = (p: number, n: number) => 1 / (1 - p + p / n);

/* --------------------------------- cache ------------------------------- */

export type CacheConfig = { blocks: number; ways: number; blockSize: number };
export type ReplacePolicy = "LRU" | "FIFO";
export type CacheLine = { tag: number | null; block: number | null; loadedAt: number; usedAt: number; dirty: boolean };
export type CacheEvent = {
  address: number;
  tag: number;
  set: number;
  offset: number;
  block: number;
  hit: boolean;
  way: number;
  evicted: number | null;
  writeBack: boolean;
  lines: CacheLine[][];
  hits: number;
  misses: number;
};

export const addressFields = (address: number, c: CacheConfig) => {
  const sets = c.blocks / c.ways;
  const block = Math.floor(address / c.blockSize);
  return { block, set: block % sets, tag: Math.floor(block / sets), offset: address % c.blockSize, sets };
};

const log2 = (n: number) => Math.round(Math.log2(n));
/** How many address bits go to each field. */
export const fieldBits = (addressBits: number, c: CacheConfig) => {
  const offset = log2(c.blockSize);
  const index = log2(c.blocks / c.ways);
  return { offset, index, tag: addressBits - offset - index };
};

/** Runs a list of memory accesses through a cache. `writes` marks which indexes are writes. */
export function simulateCache(addresses: number[], c: CacheConfig, policy: ReplacePolicy = "LRU", writes: Set<number> = new Set()): CacheEvent[] {
  const sets = c.blocks / c.ways;
  const lines: CacheLine[][] = Array.from({ length: sets }, () => Array.from({ length: c.ways }, () => ({ tag: null, block: null, loadedAt: -1, usedAt: -1, dirty: false })));
  let hits = 0;
  let misses = 0;
  return addresses.map((address, t) => {
    const { block, set, tag, offset } = addressFields(address, c);
    const row = lines[set];
    let way = row.findIndex((l) => l.tag === tag);
    const hit = way >= 0;
    let evicted: number | null = null;
    let writeBack = false;
    if (hit) hits++;
    else {
      misses++;
      way = row.findIndex((l) => l.tag === null);
      if (way < 0) {
        const key = (l: CacheLine) => (policy === "LRU" ? l.usedAt : l.loadedAt);
        way = row.reduce((best, l, i) => (key(l) < key(row[best]) ? i : best), 0);
        evicted = row[way].block;
        writeBack = row[way].dirty;
      }
      row[way] = { tag, block, loadedAt: t, usedAt: t, dirty: false };
    }
    row[way].usedAt = t;
    if (writes.has(t)) row[way].dirty = true;
    return { address, tag, set, offset, block, hit, way, evicted, writeBack, lines: lines.map((r) => r.map((l) => ({ ...l }))), hits, misses };
  });
}

/** Average memory access time. */
export const amat = (hitTime: number, missRate: number, missPenalty: number) => hitTime + missRate * missPenalty;

/** Writes that reach main memory under each policy, for one access pattern. */
export function writePolicyCost(events: CacheEvent[], writes: Set<number>) {
  const through = writes.size;
  let back = events.filter((e) => e.writeBack).length;
  // anything still dirty at the end has to be written eventually
  const last = events[events.length - 1];
  if (last) back += last.lines.flat().filter((l) => l.dirty).length;
  return { through, back };
}

/* ---------------------------- virtual memory --------------------------- */

export type PageEntry = { frame: number | null };
export type Translation = { virtual: number; page: number; offset: number; frame: number | null; physical: number | null; fault: boolean };

export function translate(virtual: number, pageSize: number, table: PageEntry[]): Translation {
  const page = Math.floor(virtual / pageSize);
  const offset = virtual % pageSize;
  const frame = table[page]?.frame ?? null;
  return { virtual, page, offset, frame, physical: frame === null ? null : frame * pageSize + offset, fault: frame === null };
}

/* -------------------------------- pipeline ----------------------------- */

export const STAGES = ["IF", "ID", "EX", "MEM", "WB"] as const;
export type PipeInstr = { text: string; writes?: string; reads?: string[]; load?: boolean; branch?: boolean };
export type HazardMode = "stall" | "forward";
export type PipeCell = (typeof STAGES)[number] | "stall" | "flush" | "";
export type PipeResult = { rows: PipeCell[][]; cycles: number; stalls: number; notes: string[]; forwards: { from: number; to: number }[] };

/** The classic 5-stage schedule. Data hazards stall or forward; a taken branch flushes what follows. */
export function schedulePipeline(prog: PipeInstr[], mode: HazardMode): PipeResult {
  const rows: PipeCell[][] = [];
  const notes: string[] = [];
  const forwards: { from: number; to: number }[] = [];
  let stalls = 0;
  /** cycle in which each instruction does IF */
  const ifAt: number[] = [];
  /** cycle in which each instruction does ID, EX, ... after any stall */
  let nextIf = 0;
  const idAt: number[] = [];
  prog.forEach((ins, i) => {
    const fetch = nextIf;
    ifAt[i] = fetch;
    let id = Math.max(fetch + 1, i ? idAt[i - 1] + 1 : 0);
    for (let j = Math.max(0, i - 3); j < i; j++) {
      const dep = prog[j];
      if (!dep.writes || !ins.reads?.includes(dep.writes)) continue;
      if (mode === "forward") {
        // a value is ready at the end of EX, or the end of MEM for a load
        const readyAfterEx = idAt[j] + 1;
        const needEx = id + 1;
        const earliest = dep.load ? readyAfterEx + 2 : readyAfterEx + 1;
        if (needEx < earliest) {
          const extra = earliest - needEx;
          if (extra > 0) {
            stalls += extra;
            notes.push(`"${ins.text}" needs ${dep.writes} from a load. Even forwarding can't go back in time, so it waits ${extra} cycle.`);
            id += extra;
          }
        }
        forwards.push({ from: j, to: i });
      } else {
        // without forwarding, ID must happen no earlier than the writer's WB
        const wb = idAt[j] + 3;
        if (id < wb) {
          const extra = wb - id;
          stalls += extra;
          notes.push(`"${ins.text}" reads ${dep.writes}, which "${dep.text}" hasn't written back yet: ${extra} stall${extra > 1 ? "s" : ""}.`);
          id = wb;
        }
      }
    }
    idAt[i] = id;
    nextIf = id;
    const row: PipeCell[] = [];
    row[fetch] = "IF";
    for (let c = fetch + 1; c < id; c++) row[c] = "stall";
    row[id] = "ID";
    row[id + 1] = "EX";
    row[id + 2] = "MEM";
    row[id + 3] = "WB";
    rows.push(row);
    if (ins.branch) nextIf = id + 2; // a taken branch is known after EX, so two fetches are wasted
  });
  const cycles = Math.max(...rows.map((r) => r.length));
  return { rows: rows.map((r) => Array.from({ length: cycles }, (_, c) => r[c] ?? "")), cycles, stalls, notes, forwards };
}

/** Time for n instructions: k stages one after another, or overlapped. */
export const pipelineCycles = (n: number, k: number) => k + n - 1;
export const unpipelinedCycles = (n: number, k: number) => n * k;

/* -------------------------------- memory ------------------------------- */

/** Reading n consecutive words: one bank waits a full cycle per word; interleaved banks overlap. */
export function interleaveTimes(words: number, banks: number, cycle: number, transfer = 1) {
  const startOf = (w: number) => w * transfer;
  // a bank can start again only after its last access has finished
  const lastEnd: number[] = Array(banks).fill(0);
  const rows = Array.from({ length: words }, (_, w) => {
    const bank = w % banks;
    const start = Math.max(startOf(w), lastEnd[bank]);
    lastEnd[bank] = start + cycle;
    return { word: w, bank, start, end: start + cycle };
  });
  return { rows, total: Math.max(...rows.map((r) => r.end), 0), single: words * cycle };
}
