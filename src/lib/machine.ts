/* A tiny accumulator machine for showing the fetch-decode-execute cycle.
   Memory holds instructions and data side by side, as in a stored-program computer. */

export type TinyOp = "LOAD" | "ADD" | "SUB" | "STORE" | "JMP" | "HALT";
export type TinyCell = { op: TinyOp; addr: number } | number;

export type TinyPhase = "start" | "fetch" | "decode" | "execute" | "store" | "halt";
export type TinyState = {
  pc: number;
  mar: number | null;
  dr: string | null;
  ir: string | null;
  ac: number;
  memory: TinyCell[];
  phase: TinyPhase;
  /** which parts light up in the picture */
  active: string[];
  /** which memory cell the bus is touching */
  touch: number | null;
  output: string | null;
};
export type TinyFrame = { state: TinyState; message: string; line: number; stats: Record<string, string | number> };

export const cellText = (c: TinyCell) => (typeof c === "number" ? String(c) : c.op === "HALT" ? "HALT" : `${c.op} ${c.addr}`);

export const TINY_PROGRAM: TinyCell[] = [
  { op: "LOAD", addr: 4 },
  { op: "ADD", addr: 5 },
  { op: "STORE", addr: 6 },
  { op: "HALT", addr: 0 },
  2,
  3,
  0,
];

export const CYCLE_STEPS = ["fetch: copy the instruction at PC into IR", "        PC = PC + 1", "decode: what does IR ask for?", "execute: ALU works on AC and data", "store: write the result", "go back to fetch"];

/** Replays a program step by step, recording what each register holds at each moment. */
export function tinyFrames(program: TinyCell[] = TINY_PROGRAM, maxInstructions = 20): TinyFrame[] {
  const memory = [...program];
  let pc = 0;
  let ac = 0;
  let ir: string | null = null;
  let done = 0;
  const frames: TinyFrame[] = [];
  const push = (phase: TinyPhase, active: string[], message: string, line: number, extra: Partial<TinyState> = {}) =>
    frames.push({
      state: { pc, mar: null, dr: null, ir, ac, memory: [...memory], phase, active, touch: null, output: null, ...extra },
      message,
      line,
      stats: { instructions: done },
    });

  push("start", [], "The program and its data are already in memory. PC starts at 0, so the first instruction is at address 0.", 0);
  while (done < maxInstructions) {
    const addr = pc;
    const cell = memory[addr];
    push("fetch", ["pc", "mar", "addr"], `Fetch. The PC holds ${addr}, so the CPU copies that into the MAR and puts it on the address bus.`, 0, { mar: addr, touch: addr });
    const text = cellText(cell);
    push("fetch", ["dr", "data", "mem"], `Memory answers with what's in cell ${addr}: "${text}". It travels back on the data bus.`, 0, { mar: addr, dr: text, touch: addr });
    ir = text;
    push("fetch", ["ir"], `The instruction goes into the IR, ready to be read.`, 0, { mar: addr, dr: text });
    pc = addr + 1;
    push("fetch", ["pc"], `The PC adds 1 now, before the instruction runs, so it already points to the next one (${pc}).`, 1);
    if (typeof cell === "number") {
      push("halt", ["cu"], `Cell ${addr} holds plain data, but the CPU tried to run it. Memory doesn't label which is which.`, 2);
      break;
    }
    push("decode", ["cu", "ir"], decodeText(cell), 2);
    if (cell.op === "HALT") {
      push("halt", ["cu"], "HALT: the control unit stops the cycle. The program has finished.", 5);
      break;
    }
    if (cell.op === "JMP") {
      pc = cell.addr;
      push("execute", ["pc", "cu"], `Execute. A jump only overwrites the PC with ${cell.addr}. The next fetch happens there.`, 3);
    } else if (cell.op === "STORE") {
      memory[cell.addr] = ac;
      push("store", ["ac", "mar", "addr", "data", "mem"], `Execute and store. The address ${cell.addr} goes out on the address bus and AC's value ${ac} on the data bus. Memory cell ${cell.addr} now holds ${ac}.`, 4, { mar: cell.addr, dr: String(ac), touch: cell.addr });
    } else {
      const value = memory[cell.addr];
      const n = typeof value === "number" ? value : 0;
      push("execute", ["mar", "addr", "dr", "data", "mem"], `Execute. This instruction needs data, so the CPU fetches cell ${cell.addr}: the value ${n}.`, 3, { mar: cell.addr, dr: String(n), touch: cell.addr });
      const before = ac;
      ac = cell.op === "LOAD" ? n : cell.op === "ADD" ? ac + n : ac - n;
      push("execute", cell.op === "LOAD" ? ["ac", "dr"] : ["alu", "ac", "dr"], cell.op === "LOAD" ? `The value ${n} is copied into the accumulator. AC = ${ac}.` : `The ALU computes ${before} ${cell.op === "ADD" ? "+" : "-"} ${n} = ${ac}, and the result goes in AC.`, cell.op === "LOAD" ? 3 : 4, { dr: String(n) });
    }
    done++;
  }
  return frames;
}

function decodeText(c: { op: TinyOp; addr: number }) {
  switch (c.op) {
    case "LOAD": return `Decode. The control unit reads "LOAD ${c.addr}": copy memory cell ${c.addr} into AC.`;
    case "ADD": return `Decode. "ADD ${c.addr}": add memory cell ${c.addr} to AC.`;
    case "SUB": return `Decode. "SUB ${c.addr}": subtract memory cell ${c.addr} from AC.`;
    case "STORE": return `Decode. "STORE ${c.addr}": write AC into memory cell ${c.addr}.`;
    case "JMP": return `Decode. "JMP ${c.addr}": continue from address ${c.addr}.`;
    case "HALT": return `Decode. "HALT": stop.`;
  }
}

/* --------------------------------- disks ------------------------------- */

/** Capacity from a drive's geometry: cylinders × heads × sectors × bytes per sector. */
export const diskCapacity = (cylinders: number, heads: number, sectors: number, bytes = 512) => cylinders * heads * sectors * bytes;

/** Average rotational wait is half a turn. */
export const rotationalLatencyMs = (rpm: number) => (60_000 / rpm) / 2;

/** Bytes as the largest whole-ish binary unit. */
export function formatBytes(n: number) {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${Number(v.toFixed(2))} ${units[i]}`;
}
