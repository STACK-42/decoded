/* A small 8086 interpreter for lessons: real instruction semantics and flags
   over one flat 64 KB segment (the same layout as an `org 100h` .COM program). */

export type FlagName = "CF" | "PF" | "AF" | "ZF" | "SF" | "OF" | "DF" | "IF";
export type Reg16 = "AX" | "BX" | "CX" | "DX" | "SI" | "DI" | "BP" | "SP";
export const REG16: Reg16[] = ["AX", "BX", "CX", "DX", "SI", "DI", "BP", "SP"];
const REG8: Record<string, [Reg16, boolean]> = {
  AL: ["AX", false], AH: ["AX", true], BL: ["BX", false], BH: ["BX", true], CL: ["CX", false], CH: ["CX", true], DL: ["DX", false], DH: ["DX", true],
};

export type AsmFrameState = {
  regs: Record<Reg16, number>;
  flags: Record<FlagName, 0 | 1>;
  line: number;
  changed: string[];
  output: string;
  /** memory locations written on this step */
  wrote: number[];
  /** [address, byte] of everything the program declared or wrote */
  memory: [number, number][];
  stack: number[];
  labels: Record<string, number>;
  halted: boolean;
};
export type AsmFrame = { state: AsmFrameState; message: string; line: number; stats: Record<string, string | number> };
export type AsmResult = { frames: AsmFrame[]; error: string | null };

type Parsed = { op: string; args: string[]; line: number };
const DATA_START = 0x0200;
const STACK_TOP = 0xfffe;

const hex = (n: number, w = 4) => n.toString(16).toUpperCase().padStart(w, "0");

function parseNumber(t: string): number | null {
  const s = t.trim().toUpperCase();
  if (/^'.'$/i.test(t.trim())) return t.trim().charCodeAt(1);
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+D$/.test(s)) return parseInt(s, 10);
  if (/^-?[0-9][0-9A-F]*H$/.test(s)) return parseInt(s.slice(0, -1), 16) * (s.startsWith("-") ? 1 : 1);
  if (/^0X[0-9A-F]+$/.test(s)) return parseInt(s, 16);
  if (/^[01]+B$/.test(s)) return parseInt(s.slice(0, -1), 2);
  return null;
}

function splitArgs(s: string) {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const stripComment = (l: string) => {
  let q: string | null = null;
  for (let i = 0; i < l.length; i++) {
    if (q) {
      if (l[i] === q) q = null;
    } else if (l[i] === "'" || l[i] === '"') q = l[i];
    else if (l[i] === ";") return l.slice(0, i);
  }
  return l;
};

const parity = (v: number) => {
  let c = 0;
  for (let x = v & 0xff; x; x &= x - 1) c++;
  return c % 2 === 0 ? 1 : 0;
};

const JUMPS: Record<string, (f: Record<FlagName, 0 | 1>) => boolean> = {
  JE: (f) => !!f.ZF, JZ: (f) => !!f.ZF, JNE: (f) => !f.ZF, JNZ: (f) => !f.ZF,
  JC: (f) => !!f.CF, JB: (f) => !!f.CF, JNAE: (f) => !!f.CF, JNC: (f) => !f.CF, JAE: (f) => !f.CF, JNB: (f) => !f.CF,
  JA: (f) => !f.CF && !f.ZF, JNBE: (f) => !f.CF && !f.ZF, JBE: (f) => !!f.CF || !!f.ZF, JNA: (f) => !!f.CF || !!f.ZF,
  JG: (f) => !f.ZF && f.SF === f.OF, JNLE: (f) => !f.ZF && f.SF === f.OF, JGE: (f) => f.SF === f.OF, JNL: (f) => f.SF === f.OF,
  JL: (f) => f.SF !== f.OF, JNGE: (f) => f.SF !== f.OF, JLE: (f) => !!f.ZF || f.SF !== f.OF, JNG: (f) => !!f.ZF || f.SF !== f.OF,
  JS: (f) => !!f.SF, JNS: (f) => !f.SF, JO: (f) => !!f.OF, JNO: (f) => !f.OF, JP: (f) => !!f.PF, JPE: (f) => !!f.PF, JNP: (f) => !f.PF, JPO: (f) => !f.PF,
};

/** Assembles the source and records one frame per instruction. */
export function runAsm(source: string, maxSteps = 400): AsmResult {
  const lines = source.split("\n");
  const code: Parsed[] = [];
  const labels: Record<string, number> = {};
  const vars: Record<string, { addr: number; size: 1 | 2 }> = {};
  const mem = new Map<number, number>();
  let dataPtr = DATA_START;

  const fail = (line: number, msg: string): AsmResult => ({ frames: [], error: `Line ${line + 1}: ${msg}` });

  for (let i = 0; i < lines.length; i++) {
    let text = stripComment(lines[i]).trim();
    if (!text) continue;
    if (/^(org|\.model|\.stack|\.data|\.code|end|assume)\b/i.test(text) || /^\.[a-z]/i.test(text)) continue;
    const labelMatch = text.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    let pendingLabel: string | null = null;
    if (labelMatch) {
      pendingLabel = labelMatch[1].toUpperCase();
      text = labelMatch[2].trim();
    }
    const dataMatch = text.match(/^(?:([A-Za-z_]\w*)\s+)?(db|dw)\s+(.*)$/i);
    if (dataMatch) {
      const name = (dataMatch[1] ?? pendingLabel ?? "").toUpperCase();
      const size = dataMatch[2].toUpperCase() === "DB" ? 1 : 2;
      if (name) vars[name] = { addr: dataPtr, size };
      for (const item of splitArgs(dataMatch[3])) {
        const str = item.match(/^["'](.*)["']$/);
        if (str && str[1].length !== 1) {
          for (const ch of str[1]) mem.set(dataPtr++, ch.charCodeAt(0));
          continue;
        }
        const v = parseNumber(item);
        if (v === null) return fail(i, `can't read the value "${item}"`);
        mem.set(dataPtr++, v & 0xff);
        if (size === 2) mem.set(dataPtr++, (v >> 8) & 0xff);
      }
      continue;
    }
    if (pendingLabel) labels[pendingLabel] = code.length;
    if (!text) continue;
    const m = text.match(/^(\S+)\s*(.*)$/)!;
    code.push({ op: m[1].toUpperCase(), args: splitArgs(m[2]), line: i });
  }

  const regs: Record<Reg16, number> = { AX: 0, BX: 0, CX: 0, DX: 0, SI: 0, DI: 0, BP: 0, SP: STACK_TOP };
  const flags: Record<FlagName, 0 | 1> = { CF: 0, PF: 0, AF: 0, ZF: 0, SF: 0, OF: 0, DF: 0, IF: 1 };
  let output = "";
  let ip = 0;
  const frames: AsmFrame[] = [];
  const stack: number[] = [];
  let wrote: number[] = [];

  const size8 = (o: string) => o.toUpperCase() in REG8;
  const isReg = (o: string) => o.toUpperCase() in REG8 || (REG16 as string[]).includes(o.toUpperCase());

  const readReg = (o: string) => {
    const r = o.toUpperCase();
    if (r in REG8) {
      const [p, hi] = REG8[r];
      return hi ? (regs[p] >> 8) & 0xff : regs[p] & 0xff;
    }
    return regs[r as Reg16];
  };
  const writeReg = (o: string, v: number) => {
    const r = o.toUpperCase();
    if (r in REG8) {
      const [p, hi] = REG8[r];
      regs[p] = hi ? (regs[p] & 0x00ff) | ((v & 0xff) << 8) : (regs[p] & 0xff00) | (v & 0xff);
    } else regs[r as Reg16] = v & 0xffff;
  };

  /** The effective address of a memory operand: [base + index + displacement]. */
  const parseMem = (o: string): { addr: number; size: 1 | 2 | 0 } | string | null => {
    let t = o.trim();
    let size: 1 | 2 | 0 = 0;
    const ptr = t.match(/^(byte|word)\s+ptr\s+(.*)$/i);
    if (ptr) {
      size = ptr[1].toLowerCase() === "byte" ? 1 : 2;
      t = ptr[2].trim();
    }
    const direct = vars[t.toUpperCase()];
    if (direct) return { addr: direct.addr, size: size || direct.size };
    const named = t.match(/^([A-Za-z_]\w*)\s*\[(.*)\]$/);
    if (named && vars[named[1].toUpperCase()]) {
      t = `[${hex(vars[named[1].toUpperCase()].addr)}H+${named[2]}]`;
      size = size || vars[named[1].toUpperCase()].size;
    }
    // accept [BX]+4, 7[BX] and [BX][SI] as well as [BX+4]
    const norm = t.match(/\[/) ? t.replace(/\]\s*\[/g, "+").replace(/\]\s*\+\s*(\w+)/g, "+$1]") : "";
    const inner = norm.match(/^(\w+)?\s*\[(.*)\]$/);
    if (!inner) return null;
    const parts = [inner[1], ...inner[2].split("+")].filter(Boolean).map((p) => p.trim().toUpperCase());
    const used = parts.filter((p) => isReg(p));
    for (const p of used) if (!["BX", "BP", "SI", "DI"].includes(p)) return `${p} can't be used to address memory on the 8086. Use BX, BP, SI or DI.`;
    if (used.filter((p) => p === "BX" || p === "BP").length > 1) return "only one base register (BX or BP) is allowed.";
    if (used.filter((p) => p === "SI" || p === "DI").length > 1) return "only one index register (SI or DI) is allowed.";
    let addr = 0;
    for (const p of parts) {
      if (isReg(p)) addr += regs[p as Reg16];
      else {
        const n = parseNumber(p);
        if (n === null) return `can't read "${p}" in a memory address.`;
        addr += n;
      }
    }
    return { addr: addr & 0xffff, size };
  };

  const readMem = (a: number, s: 1 | 2) => (mem.get(a) ?? 0) | (s === 2 ? (mem.get((a + 1) & 0xffff) ?? 0) << 8 : 0);
  const writeMem = (a: number, s: 1 | 2, v: number) => {
    mem.set(a, v & 0xff);
    wrote.push(a);
    if (s === 2) {
      mem.set((a + 1) & 0xffff, (v >> 8) & 0xff);
      wrote.push((a + 1) & 0xffff);
    }
  };

  const push16 = (v: number) => {
    regs.SP = (regs.SP - 2) & 0xffff;
    writeMem(regs.SP, 2, v);
    stack.push(v & 0xffff);
  };
  const pop16 = () => {
    const v = readMem(regs.SP, 2);
    regs.SP = (regs.SP + 2) & 0xffff;
    stack.pop();
    return v;
  };

  /** Width of an instruction from whichever operand fixes it. */
  const widthOf = (args: string[]): 1 | 2 | string => {
    for (const a of args) if (isReg(a)) return size8(a) ? 1 : 2;
    for (const a of args) {
      const m = parseMem(a);
      if (typeof m === "string") return m;
      if (m && m.size) return m.size;
    }
    return "the size is ambiguous. Write byte ptr or word ptr.";
  };

  const value = (o: string, w: 1 | 2): number | string => {
    if (isReg(o)) return readReg(o);
    const off = o.match(/^offset\s+(\w+)$/i);
    if (off) {
      const v = vars[off[1].toUpperCase()];
      if (!v) return `unknown name "${off[1]}".`;
      return v.addr;
    }
    const n = parseNumber(o);
    if (n !== null) return n & (w === 1 ? 0xff : 0xffff);
    const m = parseMem(o);
    if (typeof m === "string") return m;
    if (m) return readMem(m.addr, w);
    return `can't read the operand "${o}".`;
  };
  const store = (o: string, w: 1 | 2, v: number): string | null => {
    if (isReg(o)) {
      writeReg(o, v);
      return null;
    }
    const m = parseMem(o);
    if (typeof m === "string") return m;
    if (m) {
      writeMem(m.addr, w, v);
      return null;
    }
    return `can't write to "${o}".`;
  };

  const setSZP = (r: number, w: 1 | 2) => {
    const mask = w === 1 ? 0xff : 0xffff;
    const v = r & mask;
    flags.ZF = v === 0 ? 1 : 0;
    flags.SF = v & (w === 1 ? 0x80 : 0x8000) ? 1 : 0;
    flags.PF = parity(v) as 0 | 1;
  };
  const add = (a: number, b: number, w: 1 | 2, c = 0) => {
    const mask = w === 1 ? 0xff : 0xffff;
    const sign = w === 1 ? 0x80 : 0x8000;
    const raw = a + b + c;
    const r = raw & mask;
    flags.CF = raw > mask ? 1 : 0;
    flags.AF = (a & 0xf) + (b & 0xf) + c > 0xf ? 1 : 0;
    flags.OF = ~(a ^ b) & (a ^ r) & sign ? 1 : 0;
    setSZP(r, w);
    return r;
  };
  const sub = (a: number, b: number, w: 1 | 2, c = 0) => {
    const mask = w === 1 ? 0xff : 0xffff;
    const sign = w === 1 ? 0x80 : 0x8000;
    const raw = a - b - c;
    const r = raw & mask;
    flags.CF = raw < 0 ? 1 : 0;
    flags.AF = (a & 0xf) - (b & 0xf) - c < 0 ? 1 : 0;
    flags.OF = (a ^ b) & (a ^ r) & sign ? 1 : 0;
    setSZP(r, w);
    return r;
  };

  const snapshot = (line: number, message: string, before: Record<string, number>, halted = false) => {
    const changed = [
      ...REG16.filter((r) => before[r] !== regs[r]),
      ...(Object.keys(flags) as FlagName[]).filter((f) => before[f] !== flags[f]),
    ];
    frames.push({
      state: {
        regs: { ...regs }, flags: { ...flags }, line, changed, output, wrote: [...wrote],
        memory: [...mem.entries()].sort((a, b) => a[0] - b[0]), stack: [...stack], labels, halted,
      },
      message, line, stats: { executed: Math.max(0, frames.length) },
    });
  };
  const beforeOf = (): Record<string, number> => ({ ...regs, ...flags });

  const firstLine = code[0]?.line ?? 0;
  snapshot(firstLine, code.length ? "Ready. Nothing has run yet, so every register starts at 0." : "The program is empty.", beforeOf());

  let steps = 0;
  while (ip < code.length) {
    if (steps++ >= maxSteps) return { frames, error: `Stopped after ${maxSteps} instructions. Is this an endless loop?` };
    const { op, args, line } = code[ip];
    const before = beforeOf();
    wrote = [];
    let next = ip + 1;
    let msg = "";
    const bad = (m: string) => fail(line, m);
    const [d, s] = args;
    const label = (t: string) => labels[t?.toUpperCase()];

    if (op === "MOV" || op === "LEA" || op === "XCHG") {
      if (op === "LEA") {
        const m = parseMem(s.replace(/^offset\s+/i, ""));
        if (typeof m === "string") return bad(m);
        if (!m) return bad(`LEA needs a memory operand.`);
        writeReg(d, m.addr);
        msg = `LEA loads the address itself, not what's stored there: ${d.toUpperCase()} = ${hex(m.addr)}h.`;
      } else if (op === "XCHG") {
        const w = widthOf(args);
        if (typeof w === "string") return bad(w);
        const a = value(d, w), b = value(s, w);
        if (typeof a === "string") return bad(a);
        if (typeof b === "string") return bad(b);
        store(d, w, b);
        store(s, w, a);
        msg = `${d.toUpperCase()} and ${s.toUpperCase()} swap values.`;
      } else {
        if (args.length !== 2) return bad("MOV takes a destination and a source.");
        if (parseNumber(d) !== null) return bad("the destination can't be a number.");
        if (!isReg(d) && !isReg(s) && parseNumber(s) === null && !/^offset/i.test(s)) return bad("MOV can't copy from memory to memory directly. Go through a register.");
        if (isReg(d) && isReg(s) && size8(d) !== size8(s)) return bad(`${d.toUpperCase()} and ${s.toUpperCase()} are different sizes.`);
        const w = widthOf(isReg(d) || isReg(s) ? args : /^offset/i.test(s) ? [d] : [d]);
        if (typeof w === "string") return bad(w);
        const v = value(s, w);
        if (typeof v === "string") return bad(v);
        const err = store(d, w, v);
        if (err) return bad(err);
        msg = isReg(d) ? `${d.toUpperCase()} now holds ${w === 1 ? hex(v, 2) : hex(v)}h (${v}). The source is unchanged, since MOV copies.` : `Stored ${hex(v, w * 2)}h (${v}) at memory address ${hex(wrote[0])}h.`;
      }
    } else if (["ADD", "ADC", "SUB", "SBB", "CMP", "AND", "OR", "XOR", "TEST"].includes(op)) {
      const w = widthOf(args);
      if (typeof w === "string") return bad(w);
      const a = value(d, w), b = value(s, w);
      if (typeof a === "string") return bad(a);
      if (typeof b === "string") return bad(b);
      let r = 0;
      if (op === "ADD") r = add(a, b, w);
      else if (op === "ADC") r = add(a, b, w, flags.CF);
      else if (op === "SUB" || op === "CMP") r = sub(a, b, w);
      else if (op === "SBB") r = sub(a, b, w, flags.CF);
      else {
        r = op === "AND" || op === "TEST" ? a & b : op === "OR" ? a | b : a ^ b;
        flags.CF = 0;
        flags.OF = 0;
        setSZP(r, w);
      }
      if (op !== "CMP" && op !== "TEST") {
        const err = store(d, w, r);
        if (err) return bad(err);
      }
      msg = op === "CMP" ? `CMP works out ${a} - ${b} = ${w === 1 ? ((r << 24) >> 24) : ((r << 16) >> 16)} but throws the answer away, keeping only the flags. ZF=${flags.ZF}, SF=${flags.SF}, CF=${flags.CF}.`
        : op === "TEST" ? `TEST ANDs the values and keeps only the flags. ZF=${flags.ZF}.`
        : `${a} ${op} ${b} = ${r}. Stored in ${d.toUpperCase()}. Flags: ZF=${flags.ZF}, SF=${flags.SF}, CF=${flags.CF}, OF=${flags.OF}.`;
    } else if (op === "INC" || op === "DEC" || op === "NEG" || op === "NOT") {
      const w = widthOf(args);
      if (typeof w === "string") return bad(w);
      const a = value(d, w);
      if (typeof a === "string") return bad(a);
      let r: number;
      if (op === "NOT") r = ~a & (w === 1 ? 0xff : 0xffff);
      else if (op === "NEG") {
        r = sub(0, a, w);
      } else {
        const cf = flags.CF; // INC and DEC leave the carry flag alone
        r = op === "INC" ? add(a, 1, w) : sub(a, 1, w);
        flags.CF = cf;
      }
      store(d, w, r);
      msg = `${d.toUpperCase()} goes from ${a} to ${r}.`;
    } else if (["SHL", "SAL", "SHR", "SAR", "ROL", "ROR"].includes(op)) {
      const w = widthOf([d]);
      if (typeof w === "string") return bad(w);
      const bits = w * 8;
      let a = value(d, w) as number;
      if (typeof a === "string") return bad(a);
      const countV = s.toUpperCase() === "CL" ? readReg("CL") : parseNumber(s);
      if (countV === null) return bad("the shift count must be a number or CL.");
      const start = a;
      const top = 1 << (bits - 1);
      const mask = 2 ** bits - 1;
      for (let i = 0; i < countV; i++) {
        if (op === "SHL" || op === "SAL") { flags.CF = a & top ? 1 : 0; a = (a << 1) & mask; }
        else if (op === "SHR") { flags.CF = (a & 1) as 0 | 1; a = a >>> 1; }
        else if (op === "SAR") { flags.CF = (a & 1) as 0 | 1; a = (a >>> 1) | (a & top); }
        else if (op === "ROL") { const c = a & top ? 1 : 0; a = ((a << 1) & mask) | c; flags.CF = c as 0 | 1; }
        else { const c = a & 1; a = (a >>> 1) | (c ? top : 0); flags.CF = c as 0 | 1; }
      }
      if (op.startsWith("S")) setSZP(a, w);
      store(d, w, a);
      msg = `${start.toString(2).padStart(bits, "0")} becomes ${a.toString(2).padStart(bits, "0")} (${a}). The last bit out is in CF = ${flags.CF}.`;
    } else if (op === "MUL" || op === "DIV") {
      const w = widthOf([d]);
      if (typeof w === "string") return bad(w);
      const a = value(d, w);
      if (typeof a === "string") return bad(a);
      if (op === "MUL") {
        if (w === 1) { const r = readReg("AL") * a; regs.AX = r & 0xffff; flags.CF = flags.OF = r > 0xff ? 1 : 0; msg = `AL × ${a} = ${r}. The answer goes in AX.`; }
        else { const r = regs.AX * a; regs.AX = r & 0xffff; regs.DX = Math.floor(r / 65536) & 0xffff; flags.CF = flags.OF = r > 0xffff ? 1 : 0; msg = `AX × ${a} = ${r}. The low half goes in AX and the high half in DX.`; }
      } else {
        if (a === 0) return bad("divide by zero. On a real 8086, this triggers interrupt 0.");
        if (w === 1) { const n = regs.AX; const q = Math.floor(n / a); if (q > 0xff) return bad("the quotient doesn't fit in AL."); writeReg("AL", q); writeReg("AH", n % a); msg = `AX ÷ ${a}: quotient ${q} in AL, remainder ${n % a} in AH.`; }
        else { const n = regs.DX * 65536 + regs.AX; const q = Math.floor(n / a); if (q > 0xffff) return bad("the quotient doesn't fit in AX."); regs.AX = q; regs.DX = n % a; msg = `DX:AX ÷ ${a}: quotient ${q} in AX, remainder ${n % a} in DX.`; }
      }
    } else if (op === "JMP") {
      if (label(d) === undefined) return bad(`there's no label called "${d}".`);
      next = label(d);
      msg = `Jump to ${d.toUpperCase()}. This only changes which instruction comes next.`;
    } else if (op in JUMPS) {
      if (label(d) === undefined) return bad(`there's no label called "${d}".`);
      const taken = JUMPS[op](flags);
      if (taken) next = label(d);
      msg = taken ? `${op}: the condition is true, so jump to ${d.toUpperCase()}.` : `${op}: the condition is false, so carry on to the next line.`;
    } else if (op === "JCXZ") {
      if (label(d) === undefined) return bad(`there's no label called "${d}".`);
      if (regs.CX === 0) next = label(d);
      msg = regs.CX === 0 ? `CX is 0, so jump.` : `CX isn't 0, so carry on.`;
    } else if (op === "LOOP") {
      if (label(d) === undefined) return bad(`there's no label called "${d}".`);
      regs.CX = (regs.CX - 1) & 0xffff;
      if (regs.CX !== 0) next = label(d);
      msg = regs.CX !== 0 ? `LOOP subtracts 1 from CX, leaving ${regs.CX}. That isn't 0, so jump back to ${d.toUpperCase()}.` : "LOOP subtracts 1 from CX, leaving 0. The loop is over.";
    } else if (op === "PUSH") {
      const v = value(d, 2);
      if (typeof v === "string") return bad(v);
      push16(v);
      msg = `SP drops by 2 to ${hex(regs.SP)}h, and ${v} goes on top of the stack.`;
    } else if (op === "POP") {
      if (!stack.length) return bad("the stack is empty, so there's nothing to pop.");
      const v = pop16();
      store(d, 2, v);
      msg = `The top of the stack (${v}) goes into ${d.toUpperCase()}, and SP rises by 2 to ${hex(regs.SP)}h.`;
    } else if (op === "CALL") {
      if (label(d) === undefined) return bad(`there's no procedure called "${d}".`);
      push16(ip + 1);
      next = label(d);
      msg = `CALL pushes the return point (instruction ${ip + 1}) on the stack, then jumps to ${d.toUpperCase()}.`;
    } else if (op === "RET") {
      if (!stack.length) {
        snapshot(line, "RET with an empty stack returns to the operating system. The program is finished.", before, true);
        return { frames, error: null };
      }
      next = pop16();
      msg = `RET pops the return point (instruction ${next}) and carries on from there.`;
    } else if (op === "INT") {
      const n = parseNumber(d);
      if (n === 0x21) {
        const ah = readReg("AH");
        if (ah === 2) { output += String.fromCharCode(readReg("DL")); msg = `DOS service 2 prints the character in DL: "${String.fromCharCode(readReg("DL"))}".`; }
        else if (ah === 9) { let a = regs.DX; let t = ""; while (mem.has(a) && mem.get(a) !== 36 && t.length < 200) { t += String.fromCharCode(mem.get(a)!); a++; } output += t; msg = `DOS service 9 prints from the address in DX up to the $: "${t}".`; }
        else if (ah === 1) { writeReg("AL", 65); msg = `DOS service 1 reads a key into AL. (This simulator pretends you pressed A.)`; }
        else if (ah === 0x4c) { snapshot(line, "DOS service 4Ch ends the program.", before, true); return { frames, error: null }; }
        else return bad(`this simulator doesn't know INT 21h service ${hex(ah, 2)}h.`);
      } else if (n === 0x16) msg = "BIOS waits for a key press. (This simulator doesn't wait.)";
      else return bad(`this simulator only supports INT 21h and INT 16h.`);
    } else if (op === "HLT") {
      snapshot(line, "HLT stops the processor.", before, true);
      return { frames, error: null };
    } else if (op === "NOP") msg = "NOP does nothing.";
    else if (["STC", "CLC", "CMC", "STD", "CLD", "STI", "CLI"].includes(op)) {
      if (op === "STC") flags.CF = 1; if (op === "CLC") flags.CF = 0; if (op === "CMC") flags.CF = flags.CF ? 0 : 1;
      if (op === "STD") flags.DF = 1; if (op === "CLD") flags.DF = 0; if (op === "STI") flags.IF = 1; if (op === "CLI") flags.IF = 0;
      msg = `${op} sets a flag directly.`;
    } else return bad(`this simulator doesn't know the instruction "${op}".`);

    ip = next;
    snapshot(line, msg, before);
  }
  frames.push({ ...frames[frames.length - 1], message: "The end of the program.", state: { ...frames[frames.length - 1].state, changed: [], wrote: [], halted: true } });
  return { frames, error: null };
}

/* ---------------------------- flags on their own ----------------------- */

/** All six status flags after an 8-bit add or subtract. */
export function flagsAfter(a: number, b: number, op: "ADD" | "SUB") {
  const r = runAsm(`MOV AL, ${a & 0xff}\n${op} AL, ${b & 0xff}`).frames.at(-1)!.state;
  return { result: r.regs.AX & 0xff, flags: r.flags };
}

/* --------------------------- segmented addressing ---------------------- */

/** Physical address = segment × 10h + offset. Wraps past 1 MB on a real 8086. */
export const physicalAddress = (segment: number, offset: number) => ((segment * 16) + offset) & 0xfffff;
export const segmentRange = (segment: number) => [physicalAddress(segment, 0), physicalAddress(segment, 0xffff)] as const;
export const toHex = hex;

export type AddressingExample = { mode: string; asm: string; ea: string; note: string; uses: string[] };

/** Which segment register an offset register pairs with by default. */
export const DEFAULT_SEGMENT: Record<string, string> = { IP: "CS", SP: "SS", BP: "SS", BX: "DS", SI: "DS", DI: "DS" };
