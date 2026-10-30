import { describe, it, expect } from "vitest";
import { flagsAfter, physicalAddress, runAsm, segmentRange } from "@/lib/asm8086";
import { diskCapacity, rotationalLatencyMs, tinyFrames } from "@/lib/machine";

const end = (src: string) => {
  const r = runAsm(src);
  expect(r.error).toBeNull();
  return r.frames.at(-1)!.state;
};

describe("8086 interpreter", () => {
  it("moves and splits registers", () => {
    const s = end("MOV AX, 1234h\nMOV BL, AH\nMOV BH, AL");
    expect(s.regs.AX).toBe(0x1234);
    expect(s.regs.BX).toBe(0x3412);
  });
  it("sets flags as the 8086 does", () => {
    expect(flagsAfter(100, 50, "ADD").flags).toMatchObject({ OF: 1, CF: 0, SF: 1 });
    expect(flagsAfter(200, 100, "ADD").flags).toMatchObject({ CF: 1, OF: 0 });
    expect(flagsAfter(5, 5, "SUB").flags).toMatchObject({ ZF: 1, CF: 0, PF: 1 });
    expect(flagsAfter(3, 5, "SUB").flags).toMatchObject({ CF: 1, SF: 1 });
    expect(flagsAfter(0x0f, 1, "ADD").flags.AF).toBe(1);
  });
  it("INC leaves CF alone", () => {
    expect(end("STC\nMOV AL, 1\nINC AL").flags.CF).toBe(1);
  });
  it("loops with CX", () => {
    const s = end("MOV AX, 0\nMOV CX, 5\nagain: ADD AX, CX\nLOOP again");
    expect(s.regs.AX).toBe(15);
    expect(s.regs.CX).toBe(0);
  });
  it("branches on CMP, signed and unsigned", () => {
    expect(end("MOV AL, 200\nCMP AL, 100\nJA big\nMOV BL, 1\nHLT\nbig: MOV BL, 2").regs.BX & 0xff).toBe(2);
    expect(end("MOV AL, 200\nCMP AL, 100\nJG big\nMOV BL, 1\nHLT\nbig: MOV BL, 2").regs.BX & 0xff).toBe(1);
  });
  it("pushes, pops, calls and returns", () => {
    const s = end("MOV AX, 7\nPUSH AX\nMOV AX, 0\nPOP BX\nCALL f\nHLT\nf: INC BX\nRET");
    expect(s.regs.BX).toBe(8);
    expect(s.regs.SP).toBe(0xfffe);
    expect(s.stack).toEqual([]);
  });
  it("addresses memory all the ways the lesson shows", () => {
    const src = `arr db 10, 20, 30, 40
LEA BX, arr
MOV SI, 2
MOV AL, [BX]
MOV AH, [BX+1]
MOV CL, [BX+SI]
MOV CH, [BX+SI+1]
MOV DL, [BX]+1
MOV DH, [BX][SI]`;
    const s = end(src);
    expect(s.regs.AX).toBe((20 << 8) | 10);
    expect(s.regs.CX).toBe((40 << 8) | 30);
    expect(s.regs.DX).toBe((30 << 8) | 20);
  });
  it("rejects what real 8086 assemblers reject", () => {
    expect(runAsm("MOV AH, [DX]").error).toContain("DX can't be used");
    expect(runAsm("x db 1\ny db 2\nMOV x, y").error).toContain("memory to memory");
    expect(runAsm("MOV AX, [BX+BP]").error).toContain("one base");
    expect(runAsm("MOV AX, [SI+DI]").error).toContain("one index");
    expect(runAsm("MOV AX, BL").error).toContain("different sizes");
    expect(runAsm("MOV [1000h], 5").error).toContain("ambiguous");
    expect(runAsm("again: JMP again").error).toContain("endless");
  });
  it("runs hello world through INT 21h", () => {
    const s = end(`msg db "Hi there$"\nLEA DX, msg\nMOV AH, 9\nINT 21h\nMOV AH, 4Ch\nINT 21h`);
    expect(s.output).toBe("Hi there");
    expect(s.halted).toBe(true);
  });
  it("shifts, multiplies and divides", () => {
    expect(end("MOV AL, 3\nSHL AL, 2").regs.AX & 0xff).toBe(12);
    expect(end("MOV AL, 10000000b\nSAR AL, 1").regs.AX & 0xff).toBe(0xc0);
    expect(end("MOV AL, 20\nMOV BL, 30\nMUL BL").regs.AX).toBe(600);
    const d = end("MOV AX, 17\nMOV BL, 5\nDIV BL").regs.AX;
    expect(d & 0xff).toBe(3);
    expect(d >> 8).toBe(2);
  });
});

describe("segmented addressing, from the worked examples", () => {
  it("computes physical addresses and ranges", () => {
    expect(physicalAddress(0x0100, 0x9f2c)).toBe(0x0af2c);
    expect(physicalAddress(0x24f6, 0x634a)).toBe(0x2b2aa);
    expect(segmentRange(0x24f6)).toEqual([0x24f60, 0x34f5f]);
    expect(physicalAddress(0x7fa2, 0x438e)).toBe(0x83dae);
    expect(segmentRange(0x7fa2)).toEqual([0x7fa20, 0x8fa1f]);
  });
});

describe("tiny CPU", () => {
  it("adds 2 and 3 and stores the result", () => {
    const last = tinyFrames().at(-1)!.state;
    expect(last.ac).toBe(5);
    expect(last.memory[6]).toBe(5);
    expect(last.phase).toBe("halt");
  });
  it("stops rather than running data", () => {
    expect(tinyFrames([2]).at(-1)!.state.phase).toBe("halt");
  });
  it("disk formulas", () => {
    expect(diskCapacity(1000, 4, 100)).toBe(204_800_000);
    expect(rotationalLatencyMs(7200)).toBeCloseTo(4.17, 2);
  });
});
