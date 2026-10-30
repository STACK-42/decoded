import { describe, it, expect } from "vitest";
import { amat, amdahl, cpi, cpuTime, FORMAT_PROGRAMS, fieldBits, formatFrames, interleaveTimes, mips, pipelineCycles, schedulePipeline, simulateCache, translate, unpipelinedCycles, writePolicyCost, type FormatKind } from "@/lib/architecture";

describe("instruction formats", () => {
  it.each([3, 2, 1, 0] as FormatKind[])("%i-address program computes 25", (k) => {
    expect(formatFrames(k).at(-1)!.state.mem.X).toBe(25);
    expect(formatFrames(k).length).toBe(FORMAT_PROGRAMS[k].length + 1);
  });
});

describe("performance, from the worked examples", () => {
  const A = [{ name: "a", percent: 38, cycles: 1 }, { name: "b", percent: 15, cycles: 3 }, { name: "c", percent: 42, cycles: 4 }, { name: "d", percent: 5, cycles: 5 }];
  const B = [{ name: "a", percent: 35, cycles: 1 }, { name: "b", percent: 30, cycles: 2 }, { name: "c", percent: 15, cycles: 3 }, { name: "d", percent: 20, cycles: 5 }];
  it("computes CPI and MIPS", () => {
    expect(cpi(A)).toBeCloseTo(2.76);
    expect(cpi(B)).toBeCloseTo(2.4);
    expect(mips(200e6, 2.76)).toBeCloseTo(72.46, 2);
    expect(mips(200e6, 2.4)).toBeCloseTo(83.33, 2);
  });
  it("time and Amdahl", () => {
    expect(cpuTime(1e9, 2, 2e9)).toBe(1);
    expect(amdahl(1, 8)).toBeCloseTo(8);
    expect(amdahl(0.9, 1e9)).toBeCloseTo(10, 3);
    expect(amat(1, 0.05, 100)).toBe(6);
  });
});

describe("cache", () => {
  const dm = { blocks: 4, ways: 1, blockSize: 4 };
  it("splits addresses", () => {
    expect(fieldBits(8, dm)).toEqual({ offset: 2, index: 2, tag: 4 });
    expect(fieldBits(8, { blocks: 4, ways: 4, blockSize: 4 }).index).toBe(0);
  });
  it("direct mapping thrashes where 2-way does not", () => {
    const list = [0, 32, 0, 32, 0, 32];
    expect(simulateCache(list, dm).at(-1)!.hits).toBe(0);
    expect(simulateCache(list, { ...dm, ways: 2 }).at(-1)!.hits).toBe(4);
  });
  it("spatial locality gives hits in the same block", () => {
    expect(simulateCache([0, 1, 2, 3], dm).map((e) => e.hit)).toEqual([false, true, true, true]);
  });
  it("LRU and FIFO evict differently", () => {
    const list = [1, 2, 3, 1, 4, 1];
    const c = { blocks: 3, ways: 3, blockSize: 1 };
    expect(simulateCache(list, c, "LRU")[4].evicted).toBe(2);
    expect(simulateCache(list, c, "FIFO")[4].evicted).toBe(1);
    expect(simulateCache(list, c, "LRU").at(-1)!.hit).toBe(true);
    expect(simulateCache(list, c, "FIFO").at(-1)!.hit).toBe(false);
  });
  it("write-back saves memory writes", () => {
    const list = Array.from({ length: 50 }, (_, i) => (i % 2) * 4);
    const w = new Set(list.map((_, i) => i));
    expect(writePolicyCost(simulateCache(list, { blocks: 4, ways: 4, blockSize: 4 }, "LRU", w), w)).toEqual({ through: 50, back: 2 });
  });
});

describe("virtual memory", () => {
  const t = [{ frame: 5 }, { frame: null }];
  it("translates and faults", () => {
    expect(translate(100, 1024, t)).toMatchObject({ page: 0, offset: 100, physical: 5 * 1024 + 100, fault: false });
    expect(translate(1030, 1024, t)).toMatchObject({ page: 1, offset: 6, physical: null, fault: true });
  });
});

describe("pipeline", () => {
  it("counts cycles", () => {
    expect(pipelineCycles(5, 5)).toBe(9);
    expect(unpipelinedCycles(5, 5)).toBe(25);
    expect(schedulePipeline([{ text: "a" }, { text: "b" }, { text: "c" }], "stall").cycles).toBe(7);
  });
  const dep = [{ text: "ADD", writes: "R1" }, { text: "SUB", reads: ["R1"], writes: "R2" }];
  it("stalls two cycles on a use right after a write, and none with forwarding", () => {
    const s = schedulePipeline(dep, "stall");
    expect(s.stalls).toBe(2);
    expect(s.cycles).toBe(8);
    const f = schedulePipeline(dep, "forward");
    expect(f.stalls).toBe(0);
    expect(f.cycles).toBe(6);
  });
  it("keeps one stall for a load even with forwarding", () => {
    const f = schedulePipeline([{ text: "LW", writes: "R1", load: true }, { text: "ADD", reads: ["R1"] }], "forward");
    expect(f.stalls).toBe(1);
    expect(f.cycles).toBe(7);
  });
  it("loses two cycles to a taken branch", () => {
    const r = schedulePipeline([{ text: "BEQ", branch: true }, { text: "target" }], "stall");
    expect(r.cycles).toBe(8);
  });
});

describe("interleaving", () => {
  it("overlaps accesses across banks", () => {
    expect(interleaveTimes(8, 1, 4).total).toBe(32);
    expect(interleaveTimes(8, 4, 4).total).toBe(11);
  });
});
