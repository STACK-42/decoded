import { describe, it, expect } from "vitest";
import {
  amat,
  amdahl,
  calculateAmdahlRequiredSpeedup,
  calculateAmdahlScaling,
  calculateBusBandwidth,
  calculateBusClockSkewLimit,
  calculateCacheOverhead,
  calculateControlStoreSize,
  calculateDaisyChainLatency,
  calculateDmaCycleStealImpact,
  calculateDmaTransfer,
  calculateDramRefreshOverhead,
  calculateFifoOverrunMargin,
  calculateGustafsonSpeedup,
  calculateMaxDaisyChainDevices,
  calculateMaxZeroOpInstructions,
  calculateMultiLevelAmat,
  calculatePageTableOverhead,
  calculatePipelineCpiWithHazards,
  calculatePipelineSpeedup,
  calculatePollingOverhead,
  calculateRegisterWindows,
  calculateSplitTransactionThroughput,
  checkBernsteinConditions,
  decodeCanonicalAddress48,
  simulateBranchPredictors,
  simulateDistributedArbitration,
  simulateMesiCoherence,
  simulateTreePlru4Way,
  cpi,
  cpuTime,
  FORMAT_PROGRAMS,
  fieldBits,
  formatFrames,
  interleaveTimes,
  mips,
  pipelineCycles,
  schedulePipeline,
  simulateCache,
  translate,
  unpipelinedCycles,
  writePolicyCost,
  type FormatKind,
} from "@/lib/architecture";

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

describe("module 2 calculations", () => {
  it("calculates expanding opcode zero-operand capacity", () => {
    expect(calculateMaxZeroOpInstructions(16, 4, 15, 8)).toBe(2048);
    expect(calculateMaxZeroOpInstructions(16, 4, 16, 0)).toBe(0);
  });

  it("calculates register windows and nesting depth", () => {
    const res = calculateRegisterWindows(136, 8, 24, 8);
    expect(res.windows).toBe(8);
    expect(res.maxNestingDepth).toBe(7);
  });

  it("calculates horizontal vs vertical control store sizing", () => {
    const res = calculateControlStoreSize(512, 12, [18, 12, 8, 6], 9);
    expect(res.horizontalBits).toBe(33280);
    expect(res.verticalBits).toBe(18432);
    expect(res.reductionPercent).toBeCloseTo(44.62, 1);
  });

  it("calculates required Amdahl speedup", () => {
    expect(calculateAmdahlRequiredSpeedup(0.6, 2.0)).toBeCloseTo(6.0);
    expect(calculateAmdahlRequiredSpeedup(0.6, 2.5)).toBeNull();
    expect(calculateAmdahlRequiredSpeedup(0.6, 3.0)).toBeNull();
  });
});

describe("module 3 calculations", () => {
  it("calculates DRAM refresh overhead", () => {
    const res = calculateDramRefreshOverhead(8192, 64, 50);
    expect(res.refreshTimeMs).toBeCloseTo(0.4096, 4);
    expect(res.overheadPercent).toBeCloseTo(0.64, 2);
    expect(res.refreshIntervalUs).toBeCloseTo(7.8125, 4);
  });

  it("calculates cache overhead across architectures", () => {
    // 32-bit address, 64 KB cache, 32-byte blocks, 4-way set-associative
    const res = calculateCacheOverhead(32, 64, 32, 4, 2); // 2 LRU bits, 1 valid, 1 dirty
    expect(res.offsetBits).toBe(5);
    expect(res.indexBits).toBe(9);
    expect(res.tagBits).toBe(18);
    expect(res.totalSets).toBe(512);
    expect(res.totalLines).toBe(2048);
    expect(res.metadataBitsPerLine).toBe(22); // 18 + 1 + 1 + 2
    expect(res.totalMetadataBytes).toBe(5632); // 2048 * 22 / 8 = 5632 bytes
  });

  it("calculates multi-level cache AMAT", () => {
    // L1 hit 1 cycle, L1 MR 4%, L2 hit 10 cycles, L2 MR 20%, Memory 100 cycles
    const amatCycles = calculateMultiLevelAmat(1, 0.04, 10, 0.20, 100);
    expect(amatCycles).toBeCloseTo(2.2, 1);
  });

  it("calculates page table overhead", () => {
    // 32-bit address, 4 KB pages, 4-byte PTE
    const res = calculatePageTableOverhead(32, 4, 4);
    expect(res.offsetBits).toBe(12);
    expect(res.vpnBits).toBe(20);
    expect(res.entriesPerPage).toBe(1024);
    expect(res.bitsPerLevel).toBe(10);
    expect(res.flatTableBytes).toBe(4 * 1024 * 1024); // 4 MB flat page table
  });

  it("simulates 4-way Tree-PLRU replacement trace", () => {
    const refs = [0, 1, 2, 3, 0, 1, 4, 0, 1, 2, 3, 4];
    const res = simulateTreePlru4Way(refs);
    expect(res.hits).toBe(5);
    expect(res.misses).toBe(7);
    expect(res.finalWays).toEqual([3, 1, 4, 2]);
  });

  it("decodes 48-bit canonical virtual address into x86-64 4-level indices", () => {
    const res = decodeCanonicalAddress48(0x00007fff01234567n);
    expect(res.pml4).toBe(255);
    expect(res.pdpt).toBe(508);
    expect(res.pd).toBe(9);
    expect(res.pt).toBe(52);
    expect(res.offset).toBe(0x567);
  });
});

describe("module 4 calculations", () => {
  it("calculates CPU polling overhead and utilization", () => {
    // 1 GHz CPU (1e9 Hz), 100 kHz polling (100,000 polls/sec)
    // 50,000 packets/sec, 30 cycles idle, 250 cycles active
    const res = calculatePollingOverhead(1e9, 100000, 30, 250, 50000);
    expect(res.idlePollCycles).toBe(50000 * 30); // 1,500,000
    expect(res.activePacketCycles).toBe(50000 * 250); // 12,500,000
    expect(res.totalCyclesPerSec).toBe(14000000); // 14 million cycles
    expect(res.cpuUtilizationPercent).toBeCloseTo(1.4, 2); // 1.4%
  });

  it("calculates DMA transfer timing and throughput", () => {
    // 64 KB = 65536 bytes, 32-bit bus (4 bytes), 100 MHz bus (1e8 Hz)
    // 1 cycle per 4-byte word in burst mode
    // 600 cycles setup, 450 cycles completion on 1 GHz CPU (1e9 Hz)
    const res = calculateDmaTransfer(65536, 4, 100e6, 1, 600, 450, 1e9);
    expect(res.words).toBe(16384);
    expect(res.busCycles).toBe(16384);
    expect(res.busTimeSec).toBeCloseTo(0.00016384, 8); // 163.84 microseconds
    expect(res.cpuTimeSec).toBeCloseTo(0.00000105, 8); // 1.05 microseconds
    expect(res.effectiveThroughputMBps).toBeCloseTo(379.03, 1);
  });

  it("calculates synchronous bus bandwidth and efficiency", () => {
    // 32-bit (4-byte) bus at 66 MHz
    // Single word read with 1 wait state: 1 address + 2 latency + 1 data = 4 cycles
    const res = calculateBusBandwidth(4, 66e6, 4);
    expect(res.peakBandwidthMBps).toBeCloseTo(264, 0); // 4 * 66 = 264 MB/s
    expect(res.effectiveBandwidthMBps).toBeCloseTo(66, 0); // 264 / 4 = 66 MB/s
    expect(res.efficiencyPercent).toBeCloseTo(25, 0); // 25% efficiency
  });

  it("calculates bus clock skew limits and maximum frequency", () => {
    // tProp = 5.85 ns, tSetup = 3.5 ns, tCo = 4.0 ns, tSkew = 1.8 ns
    const res = calculateBusClockSkewLimit(5.85, 3.5, 4.0, 1.8);
    expect(res.minClockPeriodNs).toBeCloseTo(15.15, 2);
    expect(res.maxClockFrequencyMHz).toBeCloseTo(66.0, 1);
  });

  it("calculates split-transaction bus throughput and speedup", () => {
    // 64-bit (8-byte) bus at 200 MHz
    // Request 2 cycles, response 4 cycles (32 bytes data)
    // Memory latency 80 cycles
    const res = calculateSplitTransactionThroughput(8, 200e6, 2, 4, 80);
    expect(res.circuitSwitchedCycles).toBe(86);
    expect(res.circuitSwitchedThroughputMBps).toBeCloseTo(74.42, 2);
    expect(res.circuitSwitchedEfficiencyPercent).toBeCloseTo(4.65, 2);
    expect(res.splitCycles).toBe(6);
    expect(res.splitThroughputMBps).toBeCloseTo(1066.67, 2);
    expect(res.splitEfficiencyPercent).toBeCloseTo(66.67, 2);
    expect(res.speedup).toBeCloseTo(14.33, 2);
  });

  it("calculates FIFO overrun margin under interrupt latency jitter", () => {
    // 115200 baud, 10 bits/byte (11520 bytes/sec)
    // worst case latency 450 microseconds (0.00045 sec)
    // 16-byte FIFO, half-full trigger (8 bytes threshold => 8 bytes headroom)
    const res = calculateFifoOverrunMargin(115200, 10, 0.00045, 16, 8);
    expect(res.byteArrivalIntervalSec).toBeCloseTo(0.0000868, 6);
    expect(res.bytesArrivedDuringLatency).toBe(6);
    expect(res.headroomBytes).toBe(8);
    expect(res.isOverrun).toBe(false);
    expect(res.remainingMarginBytes).toBe(2);

    // Worse latency of 800 microseconds => 10 bytes arrive > 8 bytes headroom => overrun
    const overrunRes = calculateFifoOverrunMargin(115200, 10, 0.0008, 16, 8);
    expect(overrunRes.bytesArrivedDuringLatency).toBe(10);
    expect(overrunRes.isOverrun).toBe(true);
    expect(overrunRes.remainingMarginBytes).toBe(-2);
  });

  it("calculates daisy chain dispatch latency and maximum device scaling", () => {
    // Problem 3 parameters:
    // Device 3 (4th device, index 3)
    // 12 ns instruction complete, 15 ns INTA assert, 6 ns prop delay per hop, 10 ns vector drive, 8 ns latch setup
    const res = calculateDaisyChainLatency(3, 12, 15, 6, 10, 8);
    expect(res.daisyChainPropagationNs).toBe(18);
    expect(res.totalDispatchLatencyNs).toBe(63);

    // Maximum devices within 75 ns acquisition budget (15 ns INTA + 10 ns drive + 8 ns setup = 33 ns overhead)
    // 75 - 33 = 42 ns => 42 / 6 = 7 hops => 8 devices max
    const maxDevs = calculateMaxDaisyChainDevices(75, 15, 6, 10, 8);
    expect(maxDevs).toBe(8);
  });

  it("simulates distributed self-selection arbitration", () => {
    // Problem 4 parameters:
    // Device A = 10 (1010_2), Device B = 12 (1100_2), Device C = 9 (1001_2)
    // 4-bit bus
    const res = simulateDistributedArbitration([10, 12, 9], 4);
    expect(res.winnerIndex).toBe(1); // Device B
    expect(res.winnerPriority).toBe(12);

    // Bit 3 (MSB): all devices have bit 3 = 1 => busValue = 1, all 3 remain active
    expect(res.steps[0].bitIndex).toBe(3);
    expect(res.steps[0].busValue).toBe(1);
    expect(res.steps[0].activeDeviceIndices).toEqual([0, 1, 2]);

    // Bit 2: A has 0, B has 1, C has 0 => busValue = 1 (B drives). A and C withdraw!
    expect(res.steps[1].bitIndex).toBe(2);
    expect(res.steps[1].busValue).toBe(1);
    expect(res.steps[1].activeDeviceIndices).toEqual([1]);
    expect(res.steps[1].withdrawnDeviceIndices).toEqual([0, 2]);
  });

  it("calculates DMA cycle stealing memory contention impact on effective CPI", () => {
    // Problem 4 parameters:
    // CPU 2.5 GHz, base CPI 1.4, Bus 200 MHz, 8 bytes wide
    // DMA 400 MB/s, 1 memory request per 25 instructions, 20% collision probability
    const res = calculateDmaCycleStealImpact(2.5e9, 1.4, 200e6, 8, 400e6, 25, 0.2);
    expect(res.maxBusThroughputBytesPerSec).toBe(1600e6);
    expect(res.dmaBusUtilizationPercent).toBe(25);
    expect(res.cpuBusUtilizationPercent).toBeCloseTo(35.71, 2);
    expect(res.combinedBusDemandPercent).toBeCloseTo(60.71, 2);
    expect(res.stallCyclesPerCollision).toBe(12.5);
    expect(res.averageStallCyclesPerInstruction).toBeCloseTo(0.1, 4);
    expect(res.effectiveCpi).toBeCloseTo(1.5, 2);
    expect(res.slowdownPercent).toBeCloseTo(7.14, 2);
  });
});

describe("module 5: pipelining and parallelism", () => {
  it("calculates pipeline speedup, imbalance and latch overhead", () => {
    // 5 stages: IF = 200 ps, ID = 150 ps, EX = 250 ps, MEM = 220 ps, WB = 160 ps
    // register delay = 20 ps, 1000 instructions
    const res = calculatePipelineSpeedup([200, 150, 250, 220, 160], 20, 1000);
    expect(res.numStages).toBe(5);
    expect(res.unpipelinedCycleTimePs).toBe(980);
    expect(res.pipelinedCycleTimePs).toBe(270);
    expect(res.unpipelinedTotalTimePs).toBe(980000);
    expect(res.pipelinedTotalTimePs).toBe(271080);
    expect(res.speedup).toBeCloseTo(3.615, 3);
    expect(res.asymptoticSpeedup).toBeCloseTo(3.63, 2);
    expect(res.efficiencyPercent).toBeCloseTo(72.3, 1);
    expect(res.throughputMips).toBeCloseTo(3688.95, 2);
  });

  it("calculates effective CPI with data hazards and branch mispredictions", () => {
    // 25% loads with 50% load-use stall (1 cycle penalty)
    // 20% branches with 15% mispredicted (2 cycle penalty)
    const res = calculatePipelineCpiWithHazards({
      loadFrequency: 0.25,
      loadUseHazardFraction: 0.5,
      branchFrequency: 0.2,
      mispredictRate: 0.15,
      branchPenaltyCycles: 2,
    });
    expect(res.idealCpi).toBe(1.0);
    expect(res.dataStallCyclesPerInstruction).toBe(0.125);
    expect(res.controlStallCyclesPerInstruction).toBe(0.06);
    expect(res.effectiveCpi).toBe(1.185);
    expect(res.pipelineEfficiencyPercent).toBeCloseTo(84.39, 2);
  });

  it("calculates Amdahl's Law scaling and asymptotic limits", () => {
    // 85% parallel code (serial = 15%)
    const res = calculateAmdahlScaling(0.85, [1, 2, 4, 8, 16, 64]);
    expect(res.asymptoticSpeedup).toBeCloseTo(6.6667, 4);
    expect(res.scaling[0].speedup).toBe(1.0);
    expect(res.scaling[3].processors).toBe(8);
    expect(res.scaling[3].speedup).toBeCloseTo(3.9024, 4);
    expect(res.scaling[3].efficiencyPercent).toBeCloseTo(48.78, 2);
    expect(res.scaling[5].processors).toBe(64);
    expect(res.scaling[5].speedup).toBeCloseTo(6.1244, 4);
    expect(res.scaling[5].efficiencyPercent).toBeCloseTo(9.57, 2);
  });

  it("calculates Gustafson's Law scaled speedup under weak scaling", () => {
    // serial = 15%, 64 processors
    const res = calculateGustafsonSpeedup(0.15, 64);
    expect(res.scaledSpeedup).toBeCloseTo(54.55, 2);
    expect(res.efficiencyPercent).toBeCloseTo(85.23, 2);
  });

  it("simulates MESI cache coherence protocol transitions", () => {
    // 3 cores: Core 0, 1, 2
    // Trace: Core 0 reads, Core 1 reads, Core 0 writes, Core 2 reads
    const steps = simulateMesiCoherence(3, [
      { coreId: 0, op: "read" },
      { coreId: 1, op: "read" },
      { coreId: 0, op: "write" },
      { coreId: 2, op: "read" },
    ]);

    // Step 1: Core 0 reads from I => transitions to E (no other core has it), BusRd
    expect(steps[0].priorStates).toEqual(["I", "I", "I"]);
    expect(steps[0].nextStates).toEqual(["E", "I", "I"]);
    expect(steps[0].busAction).toBe("BusRd");
    expect(steps[0].dataSuppliedBy).toBe("Memory");

    // Step 2: Core 1 reads from I => Core 0 downgrades E->S, Core 1 becomes S, BusRd
    expect(steps[1].priorStates).toEqual(["E", "I", "I"]);
    expect(steps[1].nextStates).toEqual(["S", "S", "I"]);
    expect(steps[1].busAction).toBe("BusRd");

    // Step 3: Core 0 writes while S => issues Invalidate, Core 1 S->I, Core 0 S->M
    expect(steps[2].priorStates).toEqual(["S", "S", "I"]);
    expect(steps[2].nextStates).toEqual(["M", "I", "I"]);
    expect(steps[2].busAction).toBe("Invalidate");

    // Step 4: Core 2 reads while Core 0 is M => Core 0 flushes to bus, transitions M->S, Core 2 becomes S
    expect(steps[3].priorStates).toEqual(["M", "I", "I"]);
    expect(steps[3].nextStates).toEqual(["S", "I", "S"]);
    expect(steps[3].busAction).toBe("BusRd");
    expect(steps[3].dataSuppliedBy).toBe("Core 0");
  });

  it("checks Bernstein conditions for data dependencies", () => {
    // Case 1: RAW dependency (ADD R1, R2, R3 -> SUB R4, R1, R5)
    const rawCheck = checkBernsteinConditions(["R2", "R3"], ["R1"], ["R1", "R5"], ["R4"]);
    expect(rawCheck.raw).toEqual(["R1"]);
    expect(rawCheck.war).toEqual([]);
    expect(rawCheck.waw).toEqual([]);
    expect(rawCheck.canParallelize).toBe(false);

    // Case 2: Independent instructions (ADD R1, R2, R3 and SUB R4, R5, R6)
    const indepCheck = checkBernsteinConditions(["R2", "R3"], ["R1"], ["R5", "R6"], ["R4"]);
    expect(indepCheck.raw).toEqual([]);
    expect(indepCheck.war).toEqual([]);
    expect(indepCheck.waw).toEqual([]);
    expect(indepCheck.canParallelize).toBe(true);

    // Case 3: WAR and WAW dependencies
    const warCheck = checkBernsteinConditions(["R1", "R2"], ["R3"], ["R4", "R5"], ["R1"]);
    expect(warCheck.war).toEqual(["R1"]);
    expect(warCheck.canParallelize).toBe(false);

    const wawCheck = checkBernsteinConditions(["R2", "R3"], ["R1"], ["R4", "R5"], ["R1"]);
    expect(wawCheck.waw).toEqual(["R1"]);
    expect(wawCheck.canParallelize).toBe(false);
  });

  it("simulates 1-bit and 2-bit branch predictor loop behavior", () => {
    // 5 iterations taken, 1 exit (not taken), then another 5 iterations taken
    const loopOutcomes = [
      true, true, true, true, false, // loop 1: 4 taken, 1 exit
      true, true, true, true, false, // loop 2: 4 taken, 1 exit
    ];

    const res = simulateBranchPredictors(loopOutcomes, 3); // starts strongly taken (11)

    // 2-bit counter avoids flipping on the single loop exit, outperforming 1-bit predictor
    expect(res.accuracy2BitPercent).toBeGreaterThanOrEqual(res.accuracy1BitPercent);
    expect(res.steps).toHaveLength(10);
  });
});




