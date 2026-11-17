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

/* -------------------- instruction formats & practice ------------------- */

/** Computes maximum zero-operand instructions supported with expanding opcodes. */
export function calculateMaxZeroOpInstructions(
  instructionBits: number,
  regBits: number,
  threeRegCount: number,
  twoRegCount: number
): number {
  const opcodeBits3Reg = instructionBits - 3 * regBits;
  const totalPatterns3Reg = 1 << opcodeBits3Reg;
  const remainingPrefixes3Reg = totalPatterns3Reg - threeRegCount;
  if (remainingPrefixes3Reg <= 0) return 0;

  const opcodeBits2Reg = instructionBits - 2 * regBits;
  const expansionBitsStep1 = opcodeBits2Reg - opcodeBits3Reg;
  const totalPatterns2Reg = remainingPrefixes3Reg * (1 << expansionBitsStep1);
  const remainingPrefixes2Reg = totalPatterns2Reg - twoRegCount;
  if (remainingPrefixes2Reg <= 0) return 0;

  const remainingBitsForZeroOp = 2 * regBits;
  return remainingPrefixes2Reg * (1 << remainingBitsForZeroOp);
}

/** Computes number of register windows and max nesting depth before trap. */
export function calculateRegisterWindows(
  totalPhysicalRegs: number,
  globalRegs: number,
  windowSize: number,
  overlapRegs: number
): { windows: number; maxNestingDepth: number } {
  const available = totalPhysicalRegs - globalRegs;
  const stepSize = windowSize - overlapRegs;
  const windows = Math.floor(available / stepSize);
  return {
    windows,
    maxNestingDepth: windows - 1,
  };
}

/** Sizing comparison between horizontal and vertical control stores. */
export function calculateControlStoreSize(
  microinstructions: number,
  independentSignals: number,
  signalGroups: number[],
  nextAddressBits: number
): { horizontalBits: number; verticalBits: number; reductionPercent: number } {
  const totalDirect = independentSignals + signalGroups.reduce((a, b) => a + b, 0);
  const horizontalWord = totalDirect + nextAddressBits;
  const horizontalBits = microinstructions * horizontalWord;

  const encodedBits = signalGroups.reduce((sum, g) => sum + Math.ceil(Math.log2(g)), 0);
  const verticalWord = independentSignals + encodedBits + nextAddressBits;
  const verticalBits = microinstructions * verticalWord;

  const reductionPercent = ((horizontalBits - verticalBits) / horizontalBits) * 100;
  return { horizontalBits, verticalBits, reductionPercent };
}

/** Computes component speedup required for target overall speedup under Amdahl's Law. */
export function calculateAmdahlRequiredSpeedup(
  fractionEnhanced: number,
  targetSpeedup: number
): number | null {
  const maxSpeedup = 1 / (1 - fractionEnhanced);
  if (targetSpeedup >= maxSpeedup) return null;
  const denom = 1 / targetSpeedup - (1 - fractionEnhanced);
  return fractionEnhanced / denom;
}

/* ---------------------- memory & cache practice ----------------------- */

/** Computes DRAM refresh overhead percentage and time spent refreshing. */
export function calculateDramRefreshOverhead(
  totalRows: number,
  refreshPeriodMs: number,
  cycleTimeNs: number
): { refreshTimeMs: number; overheadPercent: number; refreshIntervalUs: number } {
  const refreshTimeMs = (totalRows * cycleTimeNs) / 1e6;
  const overheadPercent = (refreshTimeMs / refreshPeriodMs) * 100;
  const refreshIntervalUs = (refreshPeriodMs * 1e3) / totalRows;
  return { refreshTimeMs, overheadPercent, refreshIntervalUs };
}

/** Computes tag bits, index bits, and metadata storage overhead for a cache. */
export function calculateCacheOverhead(
  addressBits: number,
  cacheSizeKB: number,
  blockSizeBytes: number,
  ways: number,
  replacementBitsPerLine = 0
): {
  tagBits: number;
  indexBits: number;
  offsetBits: number;
  totalSets: number;
  totalLines: number;
  metadataBitsPerLine: number;
  totalMetadataBytes: number;
} {
  const totalBytes = cacheSizeKB * 1024;
  const totalLines = totalBytes / blockSizeBytes;
  const totalSets = totalLines / ways;
  const offsetBits = Math.round(Math.log2(blockSizeBytes));
  const indexBits = totalSets > 1 ? Math.round(Math.log2(totalSets)) : 0;
  const tagBits = addressBits - indexBits - offsetBits;
  const metadataBitsPerLine = tagBits + 1 + 1 + replacementBitsPerLine; // tag + valid + dirty + replacement
  const totalMetadataBytes = Math.ceil((totalLines * metadataBitsPerLine) / 8);
  return {
    tagBits,
    indexBits,
    offsetBits,
    totalSets,
    totalLines,
    metadataBitsPerLine,
    totalMetadataBytes,
  };
}

/** Computes multi-level cache Average Memory Access Time (AMAT). */
export function calculateMultiLevelAmat(
  l1HitTime: number,
  l1MissRate: number,
  l2HitTime: number,
  l2LocalMissRate: number,
  memLatency: number
): number {
  const l1MissPenalty = l2HitTime + l2LocalMissRate * memLatency;
  return l1HitTime + l1MissRate * l1MissPenalty;
}

/** Computes hierarchical page table parameters and flat table memory footprint. */
export function calculatePageTableOverhead(
  addressBits: number,
  pageSizeKB: number,
  pteBytes: number
): {
  offsetBits: number;
  vpnBits: number;
  entriesPerPage: number;
  bitsPerLevel: number;
  flatTableBytes: number;
} {
  const pageSizeBytes = pageSizeKB * 1024;
  const offsetBits = Math.round(Math.log2(pageSizeBytes));
  const vpnBits = addressBits - offsetBits;
  const entriesPerPage = pageSizeBytes / pteBytes;
  const bitsPerLevel = Math.round(Math.log2(entriesPerPage));
  const totalVirtualPages = Math.pow(2, vpnBits);
  const flatTableBytes = totalVirtualPages * pteBytes;
  return {
    offsetBits,
    vpnBits,
    entriesPerPage,
    bitsPerLevel,
    flatTableBytes,
  };
}

/** Simulates 4-way Tree-PLRU replacement over a sequence of block references. */
export function simulateTreePlru4Way(refs: number[]): {
  hits: number;
  misses: number;
  finalWays: (number | null)[];
} {
  const ways: (number | null)[] = [null, null, null, null];
  let b0 = 0; // 0: left (ways 0,1), 1: right (ways 2,3)
  let b1 = 0; // 0: way 0, 1: way 1
  let b2 = 0; // 0: way 2, 1: way 3

  const getVictim = (): number => {
    if (b0 === 0) return b1 === 0 ? 0 : 1;
    return b2 === 0 ? 2 : 3;
  };

  const update = (way: number): void => {
    if (way === 0) {
      b0 = 1;
      b1 = 1;
    } else if (way === 1) {
      b0 = 1;
      b1 = 0;
    } else if (way === 2) {
      b0 = 0;
      b2 = 1;
    } else if (way === 3) {
      b0 = 0;
      b2 = 0;
    }
  };

  let hits = 0;
  let misses = 0;

  for (const r of refs) {
    const existing = ways.indexOf(r);
    if (existing !== -1) {
      hits++;
      update(existing);
    } else {
      misses++;
      const empty = ways.indexOf(null);
      const victim = empty !== -1 ? empty : getVictim();
      ways[victim] = r;
      update(victim);
    }
  }

  return { hits, misses, finalWays: ways };
}

/** Decodes a 48-bit canonical virtual address into x86-64 4-level page table indices. */
export function decodeCanonicalAddress48(address: bigint): {
  pml4: number;
  pdpt: number;
  pd: number;
  pt: number;
  offset: number;
} {
  const offset = Number(address & 0xfffn);
  const pt = Number((address >> 12n) & 0x1ffn);
  const pd = Number((address >> 21n) & 0x1ffn);
  const pdpt = Number((address >> 30n) & 0x1ffn);
  const pml4 = Number((address >> 39n) & 0x1ffn);
  return { pml4, pdpt, pd, pt, offset };
}

/* ------------------------------- module 4: I/O & buses ------------------------------- */

/** Calculates CPU polling overhead and utilization percentage. */
export function calculatePollingOverhead(
  clockHz: number,
  pollFreqHz: number,
  cyclesNoPacket: number,
  cyclesWithPacket: number,
  packetRateHz: number
): {
  idlePollCycles: number;
  activePacketCycles: number;
  totalCyclesPerSec: number;
  cpuUtilizationPercent: number;
} {
  const idlePolls = Math.max(0, pollFreqHz - packetRateHz);
  const idlePollCycles = idlePolls * cyclesNoPacket;
  const activePacketCycles = packetRateHz * cyclesWithPacket;
  const totalCyclesPerSec = idlePollCycles + activePacketCycles;
  const cpuUtilizationPercent = (totalCyclesPerSec / clockHz) * 100;
  return {
    idlePollCycles,
    activePacketCycles,
    totalCyclesPerSec,
    cpuUtilizationPercent,
  };
}

/** Calculates DMA block transfer timings, bus time, and effective throughput. */
export function calculateDmaTransfer(
  bytesToTransfer: number,
  busWidthBytes: number,
  busClockHz: number,
  busCyclesPerWord: number,
  setupCycles: number,
  completionCycles: number,
  cpuClockHz: number
): {
  words: number;
  busCycles: number;
  busTimeSec: number;
  cpuTimeSec: number;
  totalTimeSec: number;
  effectiveThroughputMBps: number;
} {
  const words = Math.ceil(bytesToTransfer / busWidthBytes);
  const busCycles = words * busCyclesPerWord;
  const busTimeSec = busCycles / busClockHz;
  const cpuTimeSec = (setupCycles + completionCycles) / cpuClockHz;
  const totalTimeSec = busTimeSec + cpuTimeSec;
  const effectiveThroughputMBps = (bytesToTransfer / (1024 * 1024)) / totalTimeSec;
  return {
    words,
    busCycles,
    busTimeSec,
    cpuTimeSec,
    totalTimeSec,
    effectiveThroughputMBps,
  };
}

/** Calculates peak vs effective bus bandwidth in megabytes per second (decimal MB/s). */
export function calculateBusBandwidth(
  busWidthBytes: number,
  busClockHz: number,
  cyclesPerTransfer: number
): {
  peakBandwidthMBps: number;
  effectiveBandwidthMBps: number;
  efficiencyPercent: number;
} {
  const peakBandwidthMBps = (busWidthBytes * busClockHz) / 1e6;
  const effectiveBandwidthMBps = (busWidthBytes * (busClockHz / cyclesPerTransfer)) / 1e6;
  const efficiencyPercent = (1 / cyclesPerTransfer) * 100;
  return {
    peakBandwidthMBps,
    effectiveBandwidthMBps,
    efficiencyPercent,
  };
}

/** Calculates maximum bus clock frequency constrained by propagation delay, setup time, clock-to-output, and clock skew. */
export function calculateBusClockSkewLimit(
  tPropNs: number,
  tSetupNs: number,
  tCoNs: number,
  tSkewNs: number
): {
  minClockPeriodNs: number;
  maxClockFrequencyMHz: number;
} {
  const minClockPeriodNs = tPropNs + tSetupNs + tCoNs + tSkewNs;
  const maxClockFrequencyMHz = 1000 / minClockPeriodNs;
  return {
    minClockPeriodNs,
    maxClockFrequencyMHz,
  };
}

/** Calculates throughput and speedup for split-transaction (pipelined) bus vs conventional circuit-switched bus. */
export function calculateSplitTransactionThroughput(
  busWidthBytes: number,
  busClockHz: number,
  requestCycles: number,
  responseCycles: number,
  memoryLatencyCycles: number
): {
  circuitSwitchedCycles: number;
  circuitSwitchedThroughputMBps: number;
  circuitSwitchedEfficiencyPercent: number;
  splitCycles: number;
  splitThroughputMBps: number;
  splitEfficiencyPercent: number;
  speedup: number;
} {
  const dataBytes = busWidthBytes * responseCycles;
  const circuitSwitchedCycles = requestCycles + memoryLatencyCycles + responseCycles;
  const circuitSwitchedSec = circuitSwitchedCycles / busClockHz;
  const circuitSwitchedThroughputMBps = dataBytes / 1e6 / circuitSwitchedSec;
  const circuitSwitchedEfficiencyPercent = (responseCycles / circuitSwitchedCycles) * 100;

  const splitCycles = requestCycles + responseCycles;
  const splitSec = splitCycles / busClockHz;
  const splitThroughputMBps = dataBytes / 1e6 / splitSec;
  const splitEfficiencyPercent = (responseCycles / splitCycles) * 100;

  const speedup = splitThroughputMBps / circuitSwitchedThroughputMBps;
  return {
    circuitSwitchedCycles,
    circuitSwitchedThroughputMBps,
    circuitSwitchedEfficiencyPercent,
    splitCycles,
    splitThroughputMBps,
    splitEfficiencyPercent,
    speedup,
  };
}

/** Evaluates UART / I/O FIFO buffer overrun margin under maximum interrupt service latency. */
export function calculateFifoOverrunMargin(
  baudRate: number,
  bitsPerByte: number,
  maxLatencySec: number,
  fifoCapacity: number,
  triggerThreshold: number
): {
  byteArrivalIntervalSec: number;
  bytesArrivedDuringLatency: number;
  headroomBytes: number;
  isOverrun: boolean;
  remainingMarginBytes: number;
} {
  const byteRate = baudRate / bitsPerByte;
  const byteArrivalIntervalSec = 1 / byteRate;
  const bytesArrivedDuringLatency = Math.ceil(maxLatencySec * byteRate);
  const headroomBytes = fifoCapacity - triggerThreshold;
  const isOverrun = bytesArrivedDuringLatency > headroomBytes;
  const remainingMarginBytes = headroomBytes - bytesArrivedDuringLatency;
  return {
    byteArrivalIntervalSec,
    bytesArrivedDuringLatency,
    headroomBytes,
    isOverrun,
    remainingMarginBytes,
  };
}

/** Calculates daisy-chain interrupt dispatch latency for a device at index i. */
export function calculateDaisyChainLatency(
  deviceIndex: number,
  instructionCompleteNs: number,
  intaAssertNs: number,
  perDevicePropNs: number,
  vectorDriveNs: number,
  cpuLatchSetupNs: number
): {
  totalDispatchLatencyNs: number;
  daisyChainPropagationNs: number;
} {
  const daisyChainPropagationNs = deviceIndex * perDevicePropNs;
  const totalDispatchLatencyNs =
    instructionCompleteNs +
    intaAssertNs +
    daisyChainPropagationNs +
    vectorDriveNs +
    cpuLatchSetupNs;
  return {
    totalDispatchLatencyNs,
    daisyChainPropagationNs,
  };
}

/** Calculates maximum devices supported on a daisy chain within an acquisition timing budget. */
export function calculateMaxDaisyChainDevices(
  budgetNs: number,
  intaAssertNs: number,
  perDevicePropNs: number,
  vectorDriveNs: number,
  cpuLatchSetupNs: number
): number {
  const fixedOverheadNs = intaAssertNs + vectorDriveNs + cpuLatchSetupNs;
  if (budgetNs < fixedOverheadNs) return 0;
  const maxHops = Math.floor((budgetNs - fixedOverheadNs) / perDevicePropNs);
  return maxHops + 1;
}

/** Simulates distributed self-selection arbitration with active-high wired-OR logic. */
export function simulateDistributedArbitration(
  priorities: number[],
  bitWidth: number
): {
  winnerIndex: number;
  winnerPriority: number;
  steps: Array<{
    bitIndex: number;
    busValue: number;
    activeDeviceIndices: number[];
    withdrawnDeviceIndices: number[];
  }>;
} {
  let active = priorities.map((_, i) => i);
  const steps: Array<{
    bitIndex: number;
    busValue: number;
    activeDeviceIndices: number[];
    withdrawnDeviceIndices: number[];
  }> = [];

  for (let b = bitWidth - 1; b >= 0; b--) {
    const bitMask = 1 << b;
    const busValue = active.some((idx) => (priorities[idx] & bitMask) !== 0) ? 1 : 0;
    const stillActive: number[] = [];
    const withdrawn: number[] = [];

    for (const idx of active) {
      const devBit = (priorities[idx] & bitMask) !== 0 ? 1 : 0;
      if (devBit === busValue) {
        stillActive.push(idx);
      } else {
        withdrawn.push(idx);
      }
    }

    steps.push({
      bitIndex: b,
      busValue,
      activeDeviceIndices: [...stillActive],
      withdrawnDeviceIndices: withdrawn,
    });

    active = stillActive;
  }

  const winnerIndex = active[0] ?? -1;
  const winnerPriority = winnerIndex >= 0 ? priorities[winnerIndex] : -1;

  return {
    winnerIndex,
    winnerPriority,
    steps,
  };
}

/** Calculates effective CPI under DMA cycle stealing memory bus contention. */
export function calculateDmaCycleStealImpact(
  cpuFreqHz: number,
  baseCpi: number,
  busFreqHz: number,
  busWidthBytes: number,
  dmaThroughputBytesPerSec: number,
  instructionsPerMemoryAccess: number,
  collisionProbability: number
): {
  maxBusThroughputBytesPerSec: number;
  dmaBusUtilizationPercent: number;
  cpuBusUtilizationPercent: number;
  combinedBusDemandPercent: number;
  stallCyclesPerCollision: number;
  averageStallCyclesPerInstruction: number;
  effectiveCpi: number;
  slowdownPercent: number;
} {
  const maxBusThroughputBytesPerSec = busFreqHz * busWidthBytes;
  const dmaBusUtilizationPercent = (dmaThroughputBytesPerSec / maxBusThroughputBytesPerSec) * 100;

  const baselineInstructionRate = cpuFreqHz / baseCpi;
  const cpuMemoryRequestsPerSec = baselineInstructionRate / instructionsPerMemoryAccess;
  const cpuBusUtilizationPercent = (cpuMemoryRequestsPerSec / busFreqHz) * 100;
  const combinedBusDemandPercent = dmaBusUtilizationPercent + cpuBusUtilizationPercent;

  const busCycleTimeSec = 1 / busFreqHz;
  const cpuCycleTimeSec = 1 / cpuFreqHz;
  const stallCyclesPerCollision = busCycleTimeSec / cpuCycleTimeSec;

  const probMemoryAccess = 1 / instructionsPerMemoryAccess;
  const averageStallCyclesPerInstruction =
    probMemoryAccess * collisionProbability * stallCyclesPerCollision;
  const effectiveCpi = baseCpi + averageStallCyclesPerInstruction;
  const slowdownPercent = ((effectiveCpi - baseCpi) / baseCpi) * 100;

  return {
    maxBusThroughputBytesPerSec,
    dmaBusUtilizationPercent,
    cpuBusUtilizationPercent,
    combinedBusDemandPercent,
    stallCyclesPerCollision,
    averageStallCyclesPerInstruction,
    effectiveCpi,
    slowdownPercent,
  };
}

/* -------------------------------- parallelism -------------------------- */

/** Calculates speedup, execution times, and efficiency for pipelined vs unpipelined execution. */
export function calculatePipelineSpeedup(
  stageDelaysPs: number[],
  registerDelayPs: number,
  numInstructions: number
): {
  numStages: number;
  unpipelinedCycleTimePs: number;
  pipelinedCycleTimePs: number;
  unpipelinedTotalTimePs: number;
  pipelinedTotalTimePs: number;
  speedup: number;
  asymptoticSpeedup: number;
  efficiencyPercent: number;
  throughputMips: number;
} {
  const numStages = stageDelaysPs.length;
  const unpipelinedCycleTimePs = stageDelaysPs.reduce((sum, d) => sum + d, 0);
  const maxStageDelayPs = Math.max(...stageDelaysPs);
  const pipelinedCycleTimePs = maxStageDelayPs + registerDelayPs;

  const unpipelinedTotalTimePs = numInstructions * unpipelinedCycleTimePs;
  const pipelinedTotalTimePs = (numStages + numInstructions - 1) * pipelinedCycleTimePs;

  const speedup = unpipelinedTotalTimePs / pipelinedTotalTimePs;
  const asymptoticSpeedup = unpipelinedCycleTimePs / pipelinedCycleTimePs;
  const efficiencyPercent = (speedup / numStages) * 100;
  const throughputMips = numInstructions / (pipelinedTotalTimePs * 1e-12 * 1e6);

  return {
    numStages,
    unpipelinedCycleTimePs,
    pipelinedCycleTimePs,
    unpipelinedTotalTimePs,
    pipelinedTotalTimePs,
    speedup,
    asymptoticSpeedup,
    efficiencyPercent,
    throughputMips,
  };
}

/** Evaluates effective CPI factoring in data hazard stalls, branch misprediction flushes, and structural stalls. */
export function calculatePipelineCpiWithHazards(params: {
  loadFrequency: number;
  loadUseHazardFraction: number;
  branchFrequency: number;
  mispredictRate: number;
  branchPenaltyCycles: number;
  structuralStallPerInstruction?: number;
}): {
  idealCpi: number;
  dataStallCyclesPerInstruction: number;
  controlStallCyclesPerInstruction: number;
  structuralStallCyclesPerInstruction: number;
  effectiveCpi: number;
  pipelineEfficiencyPercent: number;
} {
  const idealCpi = 1.0;
  const dataStallCyclesPerInstruction =
    params.loadFrequency * params.loadUseHazardFraction * 1.0;
  const controlStallCyclesPerInstruction =
    params.branchFrequency * params.mispredictRate * params.branchPenaltyCycles;
  const structuralStallCyclesPerInstruction = params.structuralStallPerInstruction ?? 0;

  const effectiveCpi =
    idealCpi +
    dataStallCyclesPerInstruction +
    controlStallCyclesPerInstruction +
    structuralStallCyclesPerInstruction;

  const pipelineEfficiencyPercent = (idealCpi / effectiveCpi) * 100;

  return {
    idealCpi,
    dataStallCyclesPerInstruction,
    controlStallCyclesPerInstruction,
    structuralStallCyclesPerInstruction,
    effectiveCpi,
    pipelineEfficiencyPercent,
  };
}

/** Computes Amdahl's Law speedup and parallel efficiency across processor configurations. */
export function calculateAmdahlScaling(
  parallelFraction: number,
  processorCounts: number[]
): {
  asymptoticSpeedup: number;
  scaling: {
    processors: number;
    speedup: number;
    efficiencyPercent: number;
  }[];
} {
  const serialFraction = 1 - parallelFraction;
  const asymptoticSpeedup = 1 / serialFraction;

  const scaling = processorCounts.map((p) => {
    const speedup = 1 / (serialFraction + parallelFraction / p);
    const efficiencyPercent = (speedup / p) * 100;
    return {
      processors: p,
      speedup,
      efficiencyPercent,
    };
  });

  return {
    asymptoticSpeedup,
    scaling,
  };
}

/** Computes Gustafson's Law scaled speedup under weak scaling (problem size scales with processors). */
export function calculateGustafsonSpeedup(
  serialFraction: number,
  processors: number
): {
  scaledSpeedup: number;
  efficiencyPercent: number;
} {
  const scaledSpeedup = processors - serialFraction * (processors - 1);
  const efficiencyPercent = (scaledSpeedup / processors) * 100;

  return {
    scaledSpeedup,
    efficiencyPercent,
  };
}

export type MesiState = "M" | "E" | "S" | "I";
export type MesiBusAction = "BusRd" | "BusRdX" | "Invalidate" | "None" | "Flush";

export interface MesiStep {
  step: number;
  coreId: number;
  op: "read" | "write";
  priorStates: MesiState[];
  nextStates: MesiState[];
  busAction: MesiBusAction;
  dataSuppliedBy: "Memory" | `Core ${number}` | "Local Cache";
}

/** Simulates the MESI cache coherence protocol across multiple cores for a single cache line. */
export function simulateMesiCoherence(
  numCores: number,
  operations: { coreId: number; op: "read" | "write" }[]
): MesiStep[] {
  let states: MesiState[] = Array(numCores).fill("I");
  const steps: MesiStep[] = [];

  operations.forEach((opRecord, idx) => {
    const { coreId, op } = opRecord;
    const priorStates = [...states];
    const nextStates = [...states];
    let busAction: MesiBusAction = "None";
    let dataSuppliedBy: "Memory" | `Core ${number}` | "Local Cache" = "Memory";

    const currentState = priorStates[coreId];

    if (op === "read") {
      if (currentState === "M" || currentState === "E" || currentState === "S") {
        // Hit
        busAction = "None";
        dataSuppliedBy = "Local Cache";
      } else {
        // Miss: issue BusRd
        busAction = "BusRd";
        const modifiedOwner = priorStates.findIndex((s) => s === "M");
        if (modifiedOwner !== -1) {
          // Flush dirty block to memory/bus; modified owner transitions to S
          nextStates[modifiedOwner] = "S";
          dataSuppliedBy = `Core ${modifiedOwner}`;
          nextStates[coreId] = "S";
        } else {
          const hasShared = priorStates.some((s) => s === "S" || s === "E");
          if (hasShared) {
            // Downgrade any E to S
            for (let c = 0; c < numCores; c++) {
              if (priorStates[c] === "E") nextStates[c] = "S";
            }
            nextStates[coreId] = "S";
            dataSuppliedBy = "Memory";
          } else {
            // No other core has it: transitions to Exclusive
            nextStates[coreId] = "E";
            dataSuppliedBy = "Memory";
          }
        }
      }
    } else {
      // op === "write"
      if (currentState === "M") {
        // Hit: already modified
        busAction = "None";
        dataSuppliedBy = "Local Cache";
      } else if (currentState === "E") {
        // Hit: silent upgrade to M
        nextStates[coreId] = "M";
        busAction = "None";
        dataSuppliedBy = "Local Cache";
      } else if (currentState === "S") {
        // Write miss / upgrade: issue Invalidate
        busAction = "Invalidate";
        for (let c = 0; c < numCores; c++) {
          if (c !== coreId && priorStates[c] === "S") {
            nextStates[c] = "I";
          }
        }
        nextStates[coreId] = "M";
        dataSuppliedBy = "Local Cache";
      } else {
        // currentState === "I": write miss, issue BusRdX
        busAction = "BusRdX";
        const modifiedOwner = priorStates.findIndex((s) => s === "M");
        if (modifiedOwner !== -1) {
          dataSuppliedBy = `Core ${modifiedOwner}`;
        } else {
          dataSuppliedBy = "Memory";
        }
        for (let c = 0; c < numCores; c++) {
          if (c !== coreId) {
            nextStates[c] = "I";
          }
        }
        nextStates[coreId] = "M";
      }
    }

    states = nextStates;
    steps.push({
      step: idx + 1,
      coreId,
      op,
      priorStates,
      nextStates,
      busAction,
      dataSuppliedBy,
    });
  });

  return steps;
}

/* ------------------- bernstein dependencies & branch prediction ----------- */

export type BernsteinResult = {
  raw: string[]; // Read-After-Write (true dependencies): i1 writes, i2 reads
  war: string[]; // Write-After-Read (anti-dependencies): i1 reads, i2 writes
  waw: string[]; // Write-After-Write (output dependencies): i1 writes, i2 writes
  canParallelize: boolean;
};

/** Checks Bernstein's conditions for parallel/reordered execution between two instructions. */
export function checkBernsteinConditions(
  i1Reads: string[],
  i1Writes: string[],
  i2Reads: string[],
  i2Writes: string[]
): BernsteinResult {
  const raw = i1Writes.filter((w) => i2Reads.includes(w));
  const war = i1Reads.filter((r) => i2Writes.includes(r));
  const waw = i1Writes.filter((w) => i2Writes.includes(w));
  const canParallelize = raw.length === 0 && war.length === 0 && waw.length === 0;
  return { raw, war, waw, canParallelize };
}

export type BranchPredictorTrace = {
  step: number;
  outcome: boolean; // true = taken, false = not taken
  pred1Bit: boolean;
  pred2Bit: boolean;
  state1Bit: boolean; // true = taken, false = not taken
  state2Bit: 0 | 1 | 2 | 3; // 00: Strongly Not Taken, 01: Weakly Not Taken, 10: Weakly Taken, 11: Strongly Taken
  correct1Bit: boolean;
  correct2Bit: boolean;
};

export type BranchPredictorResult = {
  steps: BranchPredictorTrace[];
  accuracy1BitPercent: number;
  accuracy2BitPercent: number;
};

/** Simulates 1-bit and 2-bit saturating counter branch predictors on a sequence of branch outcomes. */
export function simulateBranchPredictors(
  outcomes: boolean[],
  initial2BitState: 0 | 1 | 2 | 3 = 3 // 3 = Strongly Taken (11)
): BranchPredictorResult {
  let state1Bit = true; // initially Taken
  let state2Bit = initial2BitState;

  const steps: BranchPredictorTrace[] = [];
  let correct1Bit = 0;
  let correct2Bit = 0;

  outcomes.forEach((outcome, idx) => {
    const pred1 = state1Bit;
    const pred2 = state2Bit >= 2; // 2 or 3 = Taken; 0 or 1 = Not Taken

    const is1Correct = pred1 === outcome;
    const is2Correct = pred2 === outcome;

    if (is1Correct) correct1Bit++;
    if (is2Correct) correct2Bit++;

    // update 1-bit predictor
    const priorState1 = state1Bit;
    state1Bit = outcome;

    // update 2-bit saturating counter
    const priorState2 = state2Bit;
    if (outcome) {
      // taken: saturate toward 3
      if (state2Bit < 3) (state2Bit as number)++;
    } else {
      // not taken: saturate toward 0
      if (state2Bit > 0) (state2Bit as number)--;
    }

    steps.push({
      step: idx + 1,
      outcome,
      pred1Bit: pred1,
      pred2Bit: pred2,
      state1Bit: priorState1,
      state2Bit: priorState2,
      correct1Bit: is1Correct,
      correct2Bit: is2Correct,
    });
  });

  const accuracy1BitPercent = (correct1Bit / outcomes.length) * 100;
  const accuracy2BitPercent = (correct2Bit / outcomes.length) * 100;

  return { steps, accuracy1BitPercent, accuracy2BitPercent };
}

/* ---------------- module 5 practice: advanced pipeline & parallel helpers -- */

export type PipelineRegisterSizing = {
  ifIdBits: number;
  idExBits: number;
  exMemBits: number;
  memWbBits: number;
  totalBits: number;
};

/** Calculates bit width of interstage pipeline registers in a standard RISC datapath. */
export function calculatePipelineRegisterBits(params?: {
  addressBits?: number;
  dataBits?: number;
  regIndexBits?: number;
  includePcInIdEx?: boolean;
  exControlBits?: number;
  memControlBits?: number;
  wbControlBits?: number;
}): PipelineRegisterSizing {
  const addressBits = params?.addressBits ?? 32;
  const dataBits = params?.dataBits ?? 32;
  const regIndexBits = params?.regIndexBits ?? 5; // 32 general purpose registers
  const includePcInIdEx = params?.includePcInIdEx ?? true;
  const exControlBits = params?.exControlBits ?? 4; // ALUOp(2), ALUSrc(1), RegDst(1)
  const memControlBits = params?.memControlBits ?? 3; // Branch(1), MemRead(1), MemWrite(1)
  const wbControlBits = params?.wbControlBits ?? 2; // RegWrite(1), MemtoReg(1)

  // IF/ID: PC+4 (addressBits) + Instruction Word (dataBits)
  const ifIdBits = addressBits + dataBits;

  // ID/EX: PC+4 (if included) + ReadData1 + ReadData2 + SignExtendedImmediate + Rs + Rt + Rd + Control
  const idExBits =
    (includePcInIdEx ? addressBits : 0) +
    dataBits + // ReadData1
    dataBits + // ReadData2
    dataBits + // SignExtImm
    regIndexBits + // Rs
    regIndexBits + // Rt
    regIndexBits + // Rd
    (exControlBits + memControlBits + wbControlBits);

  // EX/MEM: Branch Target + Zero/Condition Flag(1) + ALU Result + WriteData + Rd + MemControl + WbControl
  const exMemBits =
    addressBits + // Branch target address
    1 + // Zero flag
    dataBits + // ALU result
    dataBits + // Write data (Rt value for store)
    regIndexBits + // Destination register Rd
    (memControlBits + wbControlBits);

  // MEM/WB: Memory Read Data + ALU Result + Rd + WbControl
  const memWbBits =
    dataBits + // Mem read data
    dataBits + // ALU result
    regIndexBits + // Destination register Rd
    wbControlBits;

  const totalBits = ifIdBits + idExBits + exMemBits + memWbBits;

  return { ifIdBits, idExBits, exMemBits, memWbBits, totalBits };
}

/** Determines optimal pipeline depth balancing clock frequency scaling against branch hazard penalties. */
export function calculateOptimalPipelineStages(params: {
  combinationalDelayPs: number;
  registerDelayPs: number;
  branchFrequency: number;
  branchMispredictRate: number;
  branchPenaltyRatio?: number; // stage penalty fraction (e.g. 0.4 means penalty = Math.round(0.4 * k))
  penaltyFn?: (k: number) => number;
  maxStagesToTest?: number;
}): {
  optimalStages: number;
  optimalClockPeriodPs: number;
  optimalCpi: number;
  optimalTimePerInstructionPs: number;
  stageEvaluations: {
    stages: number;
    clockPeriodPs: number;
    cpi: number;
    timePerInstructionPs: number;
  }[];
} {
  const penaltyRatio = params.branchPenaltyRatio ?? 0.4;
  const maxStages = params.maxStagesToTest ?? 40;
  const stageEvaluations: {
    stages: number;
    clockPeriodPs: number;
    cpi: number;
    timePerInstructionPs: number;
  }[] = [];

  let bestStages = 1;
  let bestTime = Infinity;
  let bestClockPeriod = 0;
  let bestCpi = 1;

  for (let k = 1; k <= maxStages; k++) {
    const clockPeriodPs = params.combinationalDelayPs / k + params.registerDelayPs;
    // Base CPI is 1.0. Branch penalty cycles scale roughly with pipeline depth to branch resolution stage
    const penaltyCycles = params.penaltyFn
      ? params.penaltyFn(k)
      : Math.max(1, Math.round(penaltyRatio * (k - 1)));
    const branchStall = params.branchFrequency * params.branchMispredictRate * penaltyCycles;
    const cpi = 1.0 + branchStall;
    const timePerInstructionPs = cpi * clockPeriodPs;

    stageEvaluations.push({
      stages: k,
      clockPeriodPs,
      cpi,
      timePerInstructionPs,
    });

    if (timePerInstructionPs < bestTime) {
      bestTime = timePerInstructionPs;
      bestStages = k;
      bestClockPeriod = clockPeriodPs;
      bestCpi = cpi;
    }
  }

  return {
    optimalStages: bestStages,
    optimalClockPeriodPs: bestClockPeriod,
    optimalCpi: bestCpi,
    optimalTimePerInstructionPs: bestTime,
    stageEvaluations,
  };
}

export type ForwardSource = "00" | "10" | "01"; // 00: ID/EX (no forward), 10: EX/MEM forward, 01: MEM/WB forward

/** Calculates forwarding unit multiplexer control lines and resolves double hazards. */
export function calculateForwardingControl(params: {
  idExRs1: number;
  idExRs2: number;
  exMemRd: number;
  exMemRegWrite: boolean;
  memWbRd: number;
  memWbRegWrite: boolean;
}): {
  forwardA: ForwardSource;
  forwardB: ForwardSource;
  explanationA: string;
  explanationB: string;
} {
  let forwardA: ForwardSource = "00";
  let explanationA = "No forwarding: operand read from ID/EX register";

  // Check ForwardA
  // Priority 1: EX/MEM hazard (most recent result)
  if (params.exMemRegWrite && params.exMemRd !== 0 && params.exMemRd === params.idExRs1) {
    forwardA = "10";
    explanationA = `Forwarded from EX/MEM stage (R${params.exMemRd})`;
  } else if (params.memWbRegWrite && params.memWbRd !== 0 && params.memWbRd === params.idExRs1) {
    forwardA = "01";
    explanationA = `Forwarded from MEM/WB stage (R${params.memWbRd})`;
  }

  let forwardB: ForwardSource = "00";
  let explanationB = "No forwarding: operand read from ID/EX register";

  // Check ForwardB
  if (params.exMemRegWrite && params.exMemRd !== 0 && params.exMemRd === params.idExRs2) {
    forwardB = "10";
    explanationB = `Forwarded from EX/MEM stage (R${params.exMemRd})`;
  } else if (params.memWbRegWrite && params.memWbRd !== 0 && params.memWbRd === params.idExRs2) {
    forwardB = "01";
    explanationB = `Forwarded from MEM/WB stage (R${params.memWbRd})`;
  }

  return { forwardA, forwardB, explanationA, explanationB };
}

/** Calculates SIMD warp execution cycles under branch divergence where lanes take opposing paths. */
export function calculateSimdBranchDivergence(params: {
  vectorWidth: number;
  takenProbability: number;
  takenCycles: number;
  notTakenCycles: number;
}): {
  probAllTaken: number;
  probAllNotTaken: number;
  probDivergent: number;
  averageSimdCycles: number;
  idealScalarEquivalentCycles: number;
  simdEfficiencyPercent: number;
} {
  const p = params.takenProbability;
  const w = params.vectorWidth;

  const probAllTaken = Math.pow(p, w);
  const probAllNotTaken = Math.pow(1 - p, w);
  const probDivergent = Math.max(0, 1 - probAllTaken - probAllNotTaken);

  // Divergent warps execute both taken and not taken blocks under mask
  const divergentCycles = params.takenCycles + params.notTakenCycles;
  const averageSimdCycles =
    probAllTaken * params.takenCycles +
    probAllNotTaken * params.notTakenCycles +
    probDivergent * divergentCycles;

  const idealScalarEquivalentCycles = p * params.takenCycles + (1 - p) * params.notTakenCycles;
  const simdEfficiencyPercent = (idealScalarEquivalentCycles / averageSimdCycles) * 100;

  return {
    probAllTaken,
    probAllNotTaken,
    probDivergent,
    averageSimdCycles,
    idealScalarEquivalentCycles,
    simdEfficiencyPercent,
  };
}

/** Evaluates the performance penalty of false sharing and cache ping-ponging vs cache line padding. */
export function calculateFalseSharingOverhead(params: {
  writesPerThread: number;
  threads: number;
  cacheMissPenaltyCycles: number;
  hitCycles: number;
}): {
  cyclesWithoutPadding: number;
  cyclesWithPadding: number;
  speedup: number;
} {
  // Without padding, almost every concurrent write causes an invalidation miss across threads
  // Average miss probability ~ (threads - 1) / threads under heavy concurrent writing
  const missProb = (params.threads - 1) / params.threads;
  const avgCyclesPerWriteUnpadded =
    missProb * params.cacheMissPenaltyCycles + (1 - missProb) * params.hitCycles;
  const cyclesWithoutPadding = params.writesPerThread * avgCyclesPerWriteUnpadded;

  // With padding, each thread exclusively accesses its own private cache line: 100% L1 cache hits after initial fetch
  const cyclesWithPadding = params.writesPerThread * params.hitCycles;
  const speedup = cyclesWithoutPadding / cyclesWithPadding;

  return {
    cyclesWithoutPadding,
    cyclesWithPadding,
    speedup,
  };
}







