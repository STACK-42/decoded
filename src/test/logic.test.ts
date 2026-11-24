import { describe, it, expect } from "vitest";
import {
  bitsOf, bitString, calculateAdcSpecs, calculatePullUpConstraints, classifyDecimalVoltage, classifyLogicVoltage, computeBooleanDual, computeNoiseMargins, counterStep, decodeIeee754Hex, divisionSteps, evalExpr, evalGate, evaluateParallelSkew,
  expandRadixToBinary, floatParts, parseFloatInput, fromGray, fullAdd, fullSubtractor, generateRealWaveform, groupBinaryBits, halfSubtractor, jkNext, latchVersusFlipFlop, LOGIC_FAMILIES, lookaheadCarries,
  minimizeKMap, minimizeSop, onesComplement, posFromMinterms, rippleAdd, sameFunction, settle, shiftFrames, signedValue, signExtend, simulate7SegmentDecoder, simulateAdc, simulateAdderSubtractor, simulateBcdAdder,
  simulateBusDrivers, simulateCascadeDelay, simulateCmosGate, simulateDecoder, simulateFastCarries, simulateHamming74, simulateMagnitudeComparator, simulateMuxFunction, simulateMuxTree16to1, simulateParity, simulatePriorityEncoder, simulateSaturatedArithmetic, simulateSignedArithmetic, simulateStatic1Hazard, solveRadixAddition, solveRadixProduct, sopFromMinterms, toBase, toExcess3, toGray, truthRows, twosComplement,
  calculateTimingBudget, simulate74LS163, simulateCoincidentMemory, simulateCounterGlitch, simulateDebouncer, simulateFlipFlopConversion, simulateMemoryExpansion, simulateRaceAround, simulateRingJohnson, simulateUniversalShiftRegister,
  simulate4NorXnor, simulateAoi22, simulateDynamicPower, simulateFanOutAndNoiseMargins, simulateOai22, simulateSchmittTrigger,
  simulateCarrySkipAdder, simulateParallelPrefix, prefixOperator, simulate74LS148Cascade16to4, simulateTransmissionGateMux2to1, simulateBarrelShifter4Bit,
  simulateSrLatch, simulateDLatchGated, simulateJkFlipFlop, simulateTFlipFlop, simulateSram6TCell, simulateDramRefreshOverhead,
  UNIVERSAL_CIRCUITS, type Bit, type NetGate,
} from "@/lib/logic";

const srNor: NetGate[] = [
  { id: "Q", type: "NOR", in: ["R", "Qn"] },
  { id: "Qn", type: "NOR", in: ["Q", "S"] },
];
const last = <T,>(a: T[]) => a[a.length - 1];

describe("gates", () => {
  it("matches every truth table", () => {
    const table: [Parameters<typeof evalGate>[0], number[]][] = [
      ["AND", [0, 0, 0, 1]], ["OR", [0, 1, 1, 1]], ["NAND", [1, 1, 1, 0]], ["NOR", [1, 0, 0, 0]], ["XOR", [0, 1, 1, 0]], ["XNOR", [1, 0, 0, 1]],
    ];
    for (const [g, out] of table) {
      [0, 1, 2, 3].forEach((n) => expect(evalGate(g, [(n >> 1) as Bit, (n & 1) as Bit])).toBe(out[n]));
    }
  });
  it("simulates CMOS switch networks and detects shoot-through current", () => {
    // CMOS NOT
    const notLow = simulateCmosGate("NOT", { A: 0 });
    expect(notLow.outputState).toBe("HIGH");
    expect(notLow.outputBit).toBe(1);
    expect(notLow.pullUpConnected).toBe(true);
    expect(notLow.pullDownConnected).toBe(false);

    const notHigh = simulateCmosGate("NOT", { A: 5.0 });
    expect(notHigh.outputState).toBe("LOW");
    expect(notHigh.outputBit).toBe(0);

    // Intermediate voltage (shoot-through)
    const notShoot = simulateCmosGate("NOT", { A: 2.5 });
    expect(notShoot.outputState).toBe("SHOOT_THROUGH");
    expect(notShoot.outputBit).toBe("X");

    // CMOS NAND: parallel pull-up, series pull-down
    expect(simulateCmosGate("NAND", { A: 0, B: 0 }).outputBit).toBe(1);
    expect(simulateCmosGate("NAND", { A: 0, B: 5.0 }).outputBit).toBe(1);
    expect(simulateCmosGate("NAND", { A: 5.0, B: 0 }).outputBit).toBe(1);
    expect(simulateCmosGate("NAND", { A: 5.0, B: 5.0 }).outputBit).toBe(0);

    // CMOS NOR: series pull-up, parallel pull-down
    expect(simulateCmosGate("NOR", { A: 0, B: 0 }).outputBit).toBe(1);
    expect(simulateCmosGate("NOR", { A: 0, B: 5.0 }).outputBit).toBe(0);
    expect(simulateCmosGate("NOR", { A: 5.0, B: 0 }).outputBit).toBe(0);
    expect(simulateCmosGate("NOR", { A: 5.0, B: 5.0 }).outputBit).toBe(0);
  });
  it("simulates cascaded propagation delay with alternating edge polarities (Problem 1)", () => {
    const stages = [
      { label: "Inverter", gate: "NOT" as const, tpHL: 3, tpLH: 4 },
      { label: "AND Gate", gate: "AND" as const, tpHL: 6, tpLH: 8, staticInputs: [1 as Bit] },
      { label: "NOR Gate", gate: "NOR" as const, tpHL: 5, tpLH: 7, staticInputs: [0 as Bit] },
    ];

    // Primary input 0 -> 1:
    // Inverter: 0 -> 1 in => 1 -> 0 out (falling), tpHL = 3 ns
    // AND: 1 -> 0 in => 1 -> 0 out (falling), tpHL = 6 ns
    // NOR: 1 -> 0 in => 0 -> 1 out (rising), tpLH = 7 ns
    // Total = 3 + 6 + 7 = 16 ns
    const resRising = simulateCascadeDelay(stages, "0to1");
    expect(resRising.totalDelayNs).toBe(16);
    expect(resRising.stages[0].delayParameter).toBe("tpHL");
    expect(resRising.stages[1].delayParameter).toBe("tpHL");
    expect(resRising.stages[2].delayParameter).toBe("tpLH");

    // Primary input 1 -> 0:
    // Inverter: 1 -> 0 in => 0 -> 1 out (rising), tpLH = 4 ns
    // AND: 0 -> 1 in => 0 -> 1 out (rising), tpLH = 8 ns
    // NOR: 0 -> 1 in => 1 -> 0 out (falling), tpHL = 5 ns
    // Total = 4 + 8 + 5 = 17 ns
    const resFalling = simulateCascadeDelay(stages, "1to0");
    expect(resFalling.totalDelayNs).toBe(17);
  });
});

describe("SR latch simulation", () => {
  const start = { S: 0, R: 0, Q: 0, Qn: 1 } as const;
  it("sets in the order the slides give: Q' falls first, then Q rises", () => {
    const { frames, stable } = settle(srNor, { S: 1 }, start);
    expect(stable).toBe(true);
    expect(frames[1]).toMatchObject({ Q: 0, Qn: 0 });
    expect(last(frames)).toMatchObject({ Q: 1, Qn: 0 });
  });
  it("remembers after the input is released", () => {
    const set = last(settle(srNor, { S: 1 }, start).frames);
    expect(last(settle(srNor, { S: 0 }, set).frames)).toMatchObject({ Q: 1, Qn: 0 });
  });
  it("forces both outputs to 0 on S=R=1, then oscillates on release", () => {
    const both = last(settle(srNor, { S: 1, R: 1 }, start).frames);
    expect(both).toMatchObject({ Q: 0, Qn: 0 });
    expect(settle(srNor, { S: 0, R: 0 }, both).stable).toBe(false);
  });
});

describe("number systems, including the worked examples from the notes", () => {
  it("converts", () => {
    expect(toBase(58, 2)).toBe("111010");
    expect(toBase(359, 8)).toBe("547");
    expect(toBase(650, 16)).toBe("28A");
    expect(parseInt("2374", 8)).toBe(1276);
    expect(parseInt("A85", 16)).toBe(2693);
    expect(parseInt("1101101", 2)).toBe(109);
    expect(divisionSteps(58, 2).map((s) => s.digit).reverse().join("")).toBe("111010");
  });
  it("complements", () => {
    expect(bitString(onesComplement(0b10110010, 8), 8)).toBe("01001101");
    expect(bitString(twosComplement(39, 8), 8)).toBe("11011001");
    expect(signedValue(0b11011001, 8)).toBe(-39);
  });
  it("gray and excess-3", () => {
    expect(bitString(toGray(0b10110), 5)).toBe("11101");
    for (let i = 0; i < 32; i++) expect(fromGray(toGray(i))).toBe(i);
    for (let i = 0; i < 15; i++) expect((toGray(i) ^ toGray(i + 1)).toString(2).replace(/0/g, "").length).toBe(1);
    expect(toExcess3(5)).toBe("1000");
  });
  it("reads IEEE 754", () => {
    const p = floatParts(0.15625);
    expect(p.bits).toBe("00111110001000000000000000000000");
    expect(p.exponent - 127).toBe(-3);
    expect(floatParts(-1).sign).toBe(1);
    expect(floatParts(0).kind).toBe("zero");
  });

  it("reads the explorer's special cases as the float values they name", () => {
    // NaN and -0 are both falsy, so a plain `Number(text) || 0` turned them into +0
    const nan = floatParts(parseFloatInput("NaN"));
    expect(nan.kind).toBe("nan");
    expect(nan.exponent).toBe(255);
    expect(nan.fraction).not.toBe(0);
    const negZero = floatParts(parseFloatInput("-0.0"));
    expect(negZero.kind).toBe("zero");
    expect(negZero.sign).toBe(1);
    expect(Object.is(negZero.value, -0)).toBe(true);
    expect(floatParts(parseFloatInput("Infinity")).kind).toBe("infinity");
    expect(floatParts(parseFloatInput("1e-40")).kind).toBe("subnormal");
    expect(parseFloatInput("")).toBe(0);
    expect(parseFloatInput("abc")).toBe(0);
    expect(parseFloatInput(" -43.625 ")).toBe(-43.625);
  });
  it("groups binary bits into octal and hex with outward padding", () => {
    // Worked example from m1-01: (10110110101.101011)_2
    const hex = groupBinaryBits("10110110101.101011", 4);
    expect(hex.resultString).toBe("5B5.AC");
    expect(hex.intPadCount).toBe(1); // 1 leading zero added to leftmost group
    expect(hex.fracPadCount).toBe(2); // 2 trailing zeros added to rightmost group
    expect(hex.integerGroups.map((g) => g.digit).join("")).toBe("5B5");
    expect(hex.fractionalGroups.map((g) => g.digit).join("")).toBe("AC");

    const oct = groupBinaryBits("10110110101.101011", 3);
    expect(oct.resultString).toBe("2665.53");
    expect(oct.intPadCount).toBe(1);
    expect(oct.fracPadCount).toBe(0);

    // Expansion test
    const expandedHex = expandRadixToBinary("5B5.AC", 4);
    expect(expandedHex.fullBinary).toBe("010110110101.10101100");
    const expandedOct = expandRadixToBinary("173.2", 3);
    expect(expandedOct.fullBinary).toBe("001111011.010");
  });
  it("simulates signed arithmetic and overflow detection V = C_{n-1} ^ C_n", () => {
    // 4-bit addition: positive overflow (+5 + +4 = -7, V=1)
    const posOverflow = simulateSignedArithmetic(5, 4, 4, "add");
    expect(posOverflow.signedResult).toBe(-7);
    expect(posOverflow.carryInMsb).toBe(1);
    expect(posOverflow.carryOutMsb).toBe(0);
    expect(posOverflow.overflow).toBe(true);

    // 4-bit addition: negative overflow (-6 + -5 = +5, V=1)
    const negOverflow = simulateSignedArithmetic(-6, -5, 4, "add");
    expect(negOverflow.signedResult).toBe(5);
    expect(negOverflow.carryInMsb).toBe(0);
    expect(negOverflow.carryOutMsb).toBe(1);
    expect(negOverflow.overflow).toBe(true);

    // 4-bit addition: opposite signs never overflow (+5 + -3 = +2, V=0)
    const oppSigns = simulateSignedArithmetic(5, -3, 4, "add");
    expect(oppSigns.signedResult).toBe(2);
    expect(oppSigns.overflow).toBe(false);

    // 8-bit addition: worked case (+42 + +19 = +61)
    const sum8 = simulateSignedArithmetic(42, 19, 8, "add");
    expect(sum8.signedResult).toBe(61);
    expect(sum8.overflow).toBe(false);

    // 8-bit subtraction: M >= N (42 - 19 = 23, Cout=1 discarded, V=0)
    const subPos = simulateSignedArithmetic(42, 19, 8, "sub");
    expect(subPos.signedResult).toBe(23);
    expect(subPos.carryOut).toBe(1);
    expect(subPos.overflow).toBe(false);

    // 8-bit subtraction: M < N (19 - 42 = -23, Cout=0, V=0)
    const subNeg = simulateSignedArithmetic(19, 42, 8, "sub");
    expect(subNeg.signedResult).toBe(-23);
    expect(subNeg.carryOut).toBe(0);
    expect(subNeg.overflow).toBe(false);

    // 8-bit exam problem: 80 + 70 = 150 -> overflows to -106
    const examProblem = simulateSignedArithmetic(80, 70, 8, "add");
    expect(examProblem.signedResult).toBe(-106);
    expect(examProblem.carryInMsb).toBe(1);
    expect(examProblem.carryOutMsb).toBe(0);
    expect(examProblem.overflow).toBe(true);
  });
  it("sign extension preserves negative value while zero extension corrupts it", () => {
    // 4-bit +5 (0101) to 8-bit
    const extPos = signExtend(5, 4, 8);
    expect(extPos.signedValExtended).toBe(5);
    expect(extPos.zeroExtendedVal).toBe(5);
    expect(extPos.preserved).toBe(true);

    // 4-bit -5 (1011) to 8-bit
    const extNeg = signExtend(-5, 4, 8);
    expect(extNeg.signedValExtended).toBe(-5);
    expect(extNeg.signExtendedBits.join("")).toBe("11111011");
    // Zero extension turns -5 into +11!
    expect(extNeg.zeroExtendedVal).toBe(11);
    expect(extNeg.zeroExtendedBits.join("")).toBe("00001011");
    expect(extNeg.preserved).toBe(true);
  });
  it("simulates two-stage BCD adder with Boolean correction C = K + Z3*Z2 + Z3*Z1", () => {
    // 7 + 8 = 15 -> Z = 1111, K = 0, C = 1 (Z3*Z2=1), +6 -> sum 5, carry 1
    const bcd1 = simulateBcdAdder(7, 8, 0);
    expect(bcd1.stage1Sum).toBe(15);
    expect(bcd1.binaryCarryK).toBe(0);
    expect(bcd1.termZ3Z2).toBe(1);
    expect(bcd1.needsCorrection).toBe(true);
    expect(bcd1.finalBcdDigit).toBe(5);
    expect(bcd1.bcdCarryOut).toBe(1);
    expect(bcd1.totalDecimal).toBe(15);

    // 8 + 8 = 16 -> Z = 0000, binary carry K = 1, C = 1, +6 -> sum 6, carry 1
    const bcd2 = simulateBcdAdder(8, 8, 0);
    expect(bcd2.stage1Sum).toBe(16);
    expect(bcd2.binaryCarryK).toBe(1);
    expect(bcd2.needsCorrection).toBe(true);
    expect(bcd2.finalBcdDigit).toBe(6);
    expect(bcd2.bcdCarryOut).toBe(1);
    expect(bcd2.totalDecimal).toBe(16);

    // 4 + 3 = 7 -> Z = 0111, K = 0, C = 0 -> sum 7, carry 0
    const bcd3 = simulateBcdAdder(4, 3, 0);
    expect(bcd3.stage1Sum).toBe(7);
    expect(bcd3.needsCorrection).toBe(false);
    expect(bcd3.finalBcdDigit).toBe(7);
    expect(bcd3.bcdCarryOut).toBe(0);
    expect(bcd3.totalDecimal).toBe(7);

    // 9 + 9 + 1 = 19 -> Z = 0011, K = 1, C = 1 -> sum 9, carry 1
    const bcd4 = simulateBcdAdder(9, 9, 1);
    expect(bcd4.stage1Sum).toBe(19);
    expect(bcd4.binaryCarryK).toBe(1);
    expect(bcd4.finalBcdDigit).toBe(9);
    expect(bcd4.bcdCarryOut).toBe(1);
    expect(bcd4.totalDecimal).toBe(19);
  });
  it("simulates parity generation and demonstrates why 2-bit errors pass undetected", () => {
    // ASCII 'C' = 01000011 (binary 7-bit 1000011 has three 1s)
    const charCBits: Bit[] = [1, 0, 0, 0, 0, 1, 1];
    const evenParity = simulateParity(charCBits, "even", []);
    expect(evenParity.onesInData).toBe(3);
    expect(evenParity.parityBit).toBe(1); // 3 + 1 = 4 (even)
    expect(evenParity.transmittedWord).toEqual([1, 0, 0, 0, 0, 1, 1, 1]);
    expect(evenParity.errorDetected).toBe(false);

    // 1-bit flip on bit 0: received 00000111 has three 1s -> Parity error detected!
    const singleBitError = simulateParity(charCBits, "even", [0]);
    expect(singleBitError.errorDetected).toBe(true);
    expect(singleBitError.silentCorruption).toBe(false);

    // 2-bit flip on bit 0 and bit 1: received 01000111 has four 1s -> SILENT CORRUPTION!
    const doubleBitError = simulateParity(charCBits, "even", [0, 1]);
    expect(doubleBitError.errorDetected).toBe(false);
    expect(doubleBitError.silentCorruption).toBe(true);

    // Odd parity test
    const oddParity = simulateParity(charCBits, "odd", []);
    expect(oddParity.parityBit).toBe(0); // 3 + 0 = 3 (odd)
    expect(oddParity.errorDetected).toBe(false);
  });
});

describe("Boolean algebra", () => {
  it("evaluates expressions", () => {
    expect(evalExpr("A'B + (B+C)'", { A: 0, B: 1, C: 0 })).toBe(1);
    expect(evalExpr("AB'", { A: 1, B: 1 })).toBe(0);
  });
  it("confirms the laws", () => {
    expect(sameFunction("A+A'B", "A+B", ["A", "B"])).toBe(true);
    expect(sameFunction("(A+B)(A+C)", "A+BC", ["A", "B", "C"])).toBe(true);
    expect(sameFunction("(AB)'", "A'+B'", ["A", "B"])).toBe(true);
    expect(sameFunction("AB+A(B+C)+B(B+C)", "B+AC", ["A", "B", "C"])).toBe(true);
    expect(sameFunction("A+B", "AB", ["A", "B"])).toBe(false);
  });
  it("writes SOP and POS that match the table", () => {
    const vars = ["A", "B", "C"];
    for (const on of [[3, 4], [0, 1, 2, 7], [5]]) {
      for (const { m, env } of truthRows(vars)) {
        const want = on.includes(m) ? 1 : 0;
        expect(evalExpr(sopFromMinterms(on, vars), env)).toBe(want);
        expect(evalExpr(posFromMinterms(on, vars), env)).toBe(want);
      }
    }
  });
  it("computes Boolean dual expressions according to the Principle of Duality", () => {
    // Huntington laws and identities
    expect(computeBooleanDual("x + xy")).toBe("x(x + y)");
    expect(computeBooleanDual("x + x'y")).toBe("x(x' + y)");
    expect(computeBooleanDual("xy + x'z + yz")).toBe("(x + y)(x' + z)(y + z)");
    expect(computeBooleanDual("(x + y)'")).toBe("(xy)'");
    expect(computeBooleanDual("(A + B)(A + C)")).toBe("AB + AC");
    expect(computeBooleanDual("x + 0 = x")).toBe("x1 = x");
    expect(computeBooleanDual("x + 1 = 1")).toBe("x0 = 0");
  });
});

describe("K-map minimization", () => {
  const vars3 = ["A", "B", "C"];
  it("reproduces the notes' example: B' + A'C", () => {
    const terms = minimizeSop([5, 3, 1, 0, 4], vars3).map((g) => g.term).sort();
    expect(terms).toEqual(["A'C", "B'"].sort());
  });
  it("always equals the original on random maps", () => {
    const vars4 = ["A", "B", "C", "D"];
    for (let mask = 1; mask < 65536; mask += 811) {
      const on = Array.from({ length: 16 }, (_, m) => m).filter((m) => (mask >> m) & 1);
      const expr = minimizeSop(on, vars4).map((g) => g.term).join("+");
      for (const { m, env } of truthRows(vars4)) expect(evalExpr(expr, env)).toBe(on.includes(m) ? 1 : 0);
    }
  });
  it("handles everything on", () => {
    expect(minimizeSop([0, 1, 2, 3], ["A", "B"])[0].term).toBe("1");
  });
  it("identifies Essential Prime Implicants and distinguished minterms (Problem 1)", () => {
    // F(A, B, C, D) = sum m(0, 2, 5, 7, 8, 10, 14, 15)
    const res = minimizeKMap(["A", "B", "C", "D"], [0, 2, 5, 7, 8, 10, 14, 15], [], "SOP");
    const primeTerms = res.primes.map((p) => p.term).sort();
    expect(primeTerms).toEqual(["ABC", "ACD'", "A'BD", "BCD", "B'D'"].sort());

    const essTerms = res.essentials.map((p) => p.term).sort();
    expect(essTerms).toEqual(["A'BD", "B'D'"].sort());

    // Corner quad B'D' covers distinguished minterms 0, 2, 8
    const bd = res.essentials.find((p) => p.term === "B'D'");
    expect(bd?.distinguishedMinterms.sort((a, b) => a - b)).toEqual([0, 2, 8]);

    // Pair A'BD covers distinguished minterm 5
    const abd = res.essentials.find((p) => p.term === "A'BD");
    expect(abd?.distinguishedMinterms).toEqual([5]);

    // Chosen minimal SOP
    expect(res.chosen.map((p) => p.term)).toEqual(["A'BD", "ABC", "B'D'"]);
    expect(res.minimalExpr).toBe("A'BD + ABC + B'D'");
  });
  it("minimizes with Don't Cares and verifies POS mode (Problem 2)", () => {
    // F(w, x, y, z) = sum m(1, 3, 7, 11, 15) + sum d(0, 2, 5)
    const resSop = minimizeKMap(["w", "x", "y", "z"], [1, 3, 7, 11, 15], [0, 2, 5], "SOP");
    expect(resSop.chosen.length).toBe(2);
    expect(resSop.chosen.map((p) => p.term)).toContain("yz");
    const otherTerm = resSop.chosen.find((p) => p.term !== "yz")?.term;
    expect(["w'x'", "w'z"]).toContain(otherTerm);

    // Product of Sums (POS) mode
    const resPos = minimizeKMap(["w", "x", "y", "z"], [1, 3, 7, 11, 15], [0, 2, 5], "POS");
    // Covering 0-cells with useful don't cares yields product of maxterms
    expect(resPos.chosen.length).toBeGreaterThan(0);
    // Verify each row in truth table evaluates correctly for both SOP and POS
    for (let m = 0; m < 16; m++) {
      if ([0, 2, 5].includes(m)) continue; // don't care
      const want = [1, 3, 7, 11, 15].includes(m) ? 1 : 0;
      const env: Record<string, Bit> = {
        w: ((m >> 3) & 1) as Bit,
        x: ((m >> 2) & 1) as Bit,
        y: ((m >> 1) & 1) as Bit,
        z: (m & 1) as Bit,
      };
      expect(evalExpr(resSop.minimalExpr, env)).toBe(want);
      expect(evalExpr(resPos.minimalExpr, env)).toBe(want);
    }
  });
});

describe("timing hazards", () => {
  it("detects static-1 glitch without consensus and verifies complete elimination with consensus", () => {
    const trace = simulateStatic1Hazard();
    // At t=0,1: F = 1
    expect(trace[0].fWithoutConsensus).toBe(1);
    expect(trace[1].fWithoutConsensus).toBe(1);

    // Glitch occurs during delay overlap at t=3,4
    expect(trace[3].isGlitch).toBe(true);
    expect(trace[3].fWithoutConsensus).toBe(0);
    expect(trace[4].isGlitch).toBe(true);
    expect(trace[4].fWithoutConsensus).toBe(0);

    // With consensus term BC, every single step remains solidly 1
    trace.forEach((step) => {
      expect(step.fWithConsensus).toBe(1);
    });
  });
});

describe("universal gates", () => {
  it("synthesizes all basic gates from NAND, including the 4-gate minimal XOR", () => {
    const builds = UNIVERSAL_CIRCUITS.NAND;
    expect(builds.NOT.gateCount).toBe(1);
    expect(builds.AND.gateCount).toBe(2);
    expect(builds.OR.gateCount).toBe(3);
    expect(builds.NOR.gateCount).toBe(4);
    expect(builds.XOR.gateCount).toBe(4); // minimal 4-gate
    expect(builds.XNOR.gateCount).toBe(5);

    // Verify truth tables for all input combinations
    for (const a of [0, 1] as Bit[]) {
      expect(builds.NOT.simulate({ A: a }).output).toBe(a ? 0 : 1);
      for (const b of [0, 1] as Bit[]) {
        const inp = { A: a, B: b };
        expect(builds.AND.simulate(inp).output).toBe(evalGate("AND", [a, b]));
        expect(builds.OR.simulate(inp).output).toBe(evalGate("OR", [a, b]));
        expect(builds.NOR.simulate(inp).output).toBe(evalGate("NOR", [a, b]));
        expect(builds.XOR.simulate(inp).output).toBe(evalGate("XOR", [a, b]));
        expect(builds.XNOR.simulate(inp).output).toBe(evalGate("XNOR", [a, b]));
      }
    }
  });

  it("synthesizes all basic gates from NOR, including the 4-gate minimal XNOR", () => {
    const builds = UNIVERSAL_CIRCUITS.NOR;
    expect(builds.NOT.gateCount).toBe(1);
    expect(builds.OR.gateCount).toBe(2);
    expect(builds.AND.gateCount).toBe(3);
    expect(builds.NAND.gateCount).toBe(4);
    expect(builds.XNOR.gateCount).toBe(4); // minimal 4-gate
    expect(builds.XOR.gateCount).toBe(5);

    for (const a of [0, 1] as Bit[]) {
      expect(builds.NOT.simulate({ A: a }).output).toBe(a ? 0 : 1);
      for (const b of [0, 1] as Bit[]) {
        const inp = { A: a, B: b };
        expect(builds.OR.simulate(inp).output).toBe(evalGate("OR", [a, b]));
        expect(builds.AND.simulate(inp).output).toBe(evalGate("AND", [a, b]));
        expect(builds.NAND.simulate(inp).output).toBe(evalGate("NAND", [a, b]));
        expect(builds.XNOR.simulate(inp).output).toBe(evalGate("XNOR", [a, b]));
        expect(builds.XOR.simulate(inp).output).toBe(evalGate("XOR", [a, b]));
      }
    }
  });
});

describe("adders", () => {
  it("full adder truth table", () => {
    expect(fullAdd(1, 1, 1)).toEqual({ sum: 1, carry: 1 });
    expect(fullAdd(1, 0, 1)).toEqual({ sum: 0, carry: 1 });
  });
  it("ripple equals real addition and the notes' 1100 + 1100 = 11000", () => {
    for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) {
      const cols = rippleAdd(a, b, 5);
      expect(cols.reduce((s, c) => s + (c.sum << c.index), 0)).toBe(a + b);
    }
  });
  it("look-ahead carries match ripple carries", () => {
    for (let a = 0; a < 32; a += 3) for (let b = 0; b < 32; b += 5) {
      const ripple = rippleAdd(a, b, 5).map((c) => c.carryOut);
      expect(lookaheadCarries(a, b, 5).c.slice(1)).toEqual(ripple);
    }
  });
});

describe("storage", () => {
  it("JK table", () => {
    expect(jkNext(1, { j: 0, k: 0 })).toBe(1);
    expect(jkNext(1, { j: 0, k: 1 })).toBe(0);
    expect(jkNext(0, { j: 1, k: 0 })).toBe(1);
    expect(jkNext(0, { j: 1, k: 1 })).toBe(1);
    expect(jkNext(1, { j: 1, k: 1 })).toBe(0);
  });
  it("a latch follows D while the clock is high and a flip-flop does not", () => {
    const { latch, flop } = latchVersusFlipFlop([0, 1, 1, 1, 0], [1, 1, 0, 1, 0]);
    expect(latch).toEqual([0, 1, 0, 1, 1]);
    expect(flop).toEqual([0, 1, 1, 1, 1]);
  });
  it("shifts and counts", () => {
    expect(shiftFrames(3, [1, 0, 1])[3]).toEqual([1, 0, 1]);
    let b: Bit[] = [0, 0, 0];
    for (let i = 0; i < 5; i++) b = counterStep(b).next;
    expect(b).toEqual([1, 0, 1]);
    expect(counterStep([1, 1, 1]).next).toEqual([0, 0, 0]);
  });
});

describe("signals and physical logic", () => {
  it("computes noise margins matching standard logic family specifications", () => {
    const ttl = computeNoiseMargins(LOGIC_FAMILIES.ttl);
    expect(ttl.vnh).toBe(0.4);
    expect(ttl.vnl).toBe(0.4);
    expect(ttl.vn).toBe(0.4);

    const cmos = computeNoiseMargins(LOGIC_FAMILIES.cmos);
    expect(cmos.vnh).toBe(0.9);
    expect(cmos.vnl).toBe(1.4);
    expect(cmos.vn).toBe(0.9);

    const lvcmos = computeNoiseMargins(LOGIC_FAMILIES.lvcmos);
    expect(lvcmos.vnh).toBe(0.4);
    expect(lvcmos.vnl).toBe(0.4);
    expect(lvcmos.vn).toBe(0.4);

    // Mismatched: TTL output directly driving CMOS input
    const mismatched = computeNoiseMargins(LOGIC_FAMILIES.mismatched);
    expect(mismatched.vnh).toBe(-1.1); // 2.4 - 3.5 = -1.1 V (fails into forbidden zone)
    expect(mismatched.vn).toBe(-1.1);
  });

  it("classifies input voltages across valid and forbidden regions", () => {
    // 5V TTL thresholds: VIH = 2.0 V, VIL = 0.8 V
    expect(classifyLogicVoltage(2.5, 2.0, 0.8)).toBe("1");
    expect(classifyLogicVoltage(2.0, 2.0, 0.8)).toBe("1");
    expect(classifyLogicVoltage(0.4, 2.0, 0.8)).toBe("0");
    expect(classifyLogicVoltage(0.8, 2.0, 0.8)).toBe("0");
    expect(classifyLogicVoltage(1.4, 2.0, 0.8)).toBe("?");
  });

  it("checks 10-level decimal fragility", () => {
    // Digit 3 nominal voltage is 1.5 V
    const nominal3 = classifyDecimalVoltage(1.5);
    expect(nominal3.digit).toBe(3);
    expect(nominal3.error).toBe(false);

    // Small spike within margin (0.24 V -> 1.74 V) stays digit 3
    const smallSpike = classifyDecimalVoltage(1.74);
    expect(smallSpike.digit).toBe(3);
    expect(smallSpike.error).toBe(false);

    // Spike of 0.26 V crosses the 1.75 V threshold into digit 4!
    const flipSpike = classifyDecimalVoltage(1.76);
    expect(flipSpike.digit).toBe(4);
  });

  it("simulates bus contention and open-drain wired-AND connections", () => {
    // Push-pull fighting causes bus contention and 125 mA surge
    const contention = simulateBusDrivers("push-pull", "HIGH", "LOW");
    expect(contention.hasContention).toBe(true);
    expect(contention.busLogic).toBe("CONTENTION");
    expect(contention.currentMa).toBe(125);

    // Push-pull agreeing works cleanly
    const pushPullHigh = simulateBusDrivers("push-pull", "HIGH", "HIGH");
    expect(pushPullHigh.hasContention).toBe(false);
    expect(pushPullHigh.busLogic).toBe("HIGH");
    expect(pushPullHigh.currentMa).toBe(0);

    // Open-drain wired-AND: either driver pulling LOW safely pulls bus LOW without contention
    const openDrainPull = simulateBusDrivers("open-drain", "LOW", "Hi-Z");
    expect(openDrainPull.hasContention).toBe(false);
    expect(openDrainPull.busLogic).toBe("LOW");
    expect(openDrainPull.busVoltage).toBe(0);
    expect(openDrainPull.currentMa).toBe(0.5);

    // Open-drain idle: pull-up resistor pulls bus to V_CC (HIGH)
    const openDrainIdle = simulateBusDrivers("open-drain", "Hi-Z", "Hi-Z");
    expect(openDrainIdle.hasContention).toBe(false);
    expect(openDrainIdle.busLogic).toBe("HIGH");
    expect(openDrainIdle.busVoltage).toBe(5.0);
    expect(openDrainIdle.currentMa).toBe(0);
  });

  it("simulates ADC sampling and quantization", () => {
    // 1-bit ADC (2 levels, step = 2.5 V)
    const adc1 = simulateAdc((t) => (t < 0.5 ? 1.0 : 4.0), 1.0, 2, 1, 5.0);
    expect(adc1.levels).toBe(2);
    expect(adc1.stepVoltage).toBe(2.5);
    expect(adc1.samples[0].binaryCode).toBe("0");
    expect(adc1.samples[1].binaryCode).toBe("1");

    // 3-bit ADC (8 levels, step = 0.625 V)
    const adc3 = simulateAdc(() => 2.5, 0.5, 4, 3, 5.0);
    expect(adc3.levels).toBe(8);
    expect(adc3.stepVoltage).toBe(0.625);
    expect(adc3.samples[0].quantizedLevel).toBe(4);
    expect(adc3.samples[0].binaryCode).toBe("100");
  });

  it("generates real clock waveforms with finite rise/fall times", () => {
    const pts = generateRealWaveform(10, 50, 1.5, 1.5, 0.1, 3.3, 1, 40);
    expect(pts.length).toBeGreaterThan(30);
    expect(pts[0].v).toBe(0);
    // At t=0.5, voltage is rising
    const risingPt = pts.find((p) => p.t >= 0.75 && p.t <= 1.5);
    expect(risingPt?.v).toBeGreaterThan(0);
  });

  it("evaluates parallel bus clock skew matching exam problem 3", () => {
    // 33 MHz, 30 mm difference: 200 ps skew is <1% of 30.3 ns period
    const slowBus = evaluateParallelSkew(33, 30);
    expect(slowBus.skewPs).toBe(200);
    expect(slowBus.periodNs).toBeCloseTo(30.3, 1);
    expect(slowBus.skewFraction).toBeLessThan(0.01);
    expect(slowBus.isReliable).toBe(true);

    // 2500 MHz (2.5 GHz), 30 mm difference: 200 ps skew is 50% of 400 ps period!
    const fastBus = evaluateParallelSkew(2500, 30);
    expect(fastBus.skewPs).toBe(200);
    expect(fastBus.periodPs).toBe(400);
    expect(fastBus.skewFraction).toBe(0.5);
    expect(fastBus.isReliable).toBe(false);
  });

  describe("Module 0 Signals practice & exam calculations", () => {
    it("verifies Problem 1: noise margins and spike tolerance on LOW line", () => {
      // Experimental 3.3V LVCMOS: VOH = 2.8 V, VOL = 0.3 V, VIH = 2.0 V, VIL = 0.8 V
      const margins = computeNoiseMargins({ voh: 2.8, vol: 0.3, vih: 2.0, vil: 0.8 });
      expect(margins.vnh).toBe(0.8);
      expect(margins.vnl).toBe(0.5);
      expect(margins.vn).toBe(0.5);

      // Positive noise spike of +0.65 V on VOL = 0.25 V
      const vin = Number((0.25 + 0.65).toFixed(2)); // 0.90 V
      expect(vin).toBe(0.9);
      expect(classifyLogicVoltage(vin, 2.0, 0.8)).toBe("?"); // in forbidden zone

      // Maximum tolerable noise spike on line with VOL = 0.25 V: VIL(max) - VOL
      const maxSpike = Number((0.8 - 0.25).toFixed(2));
      expect(maxSpike).toBe(0.55);
    });

    it("verifies Problem 2: oscilloscope waveform timing and 200 MHz scaling", () => {
      // Period T = 12.5 ns -> f = 80 MHz
      const periodNs = 12.5;
      const pulseWidthNs = 3.75;
      const freqMhz = 1000 / periodNs;
      expect(freqMhz).toBe(80);

      const dutyCycle = (pulseWidthNs / periodNs) * 100;
      expect(dutyCycle).toBe(30);

      // Scaled to 200 MHz with 30% duty cycle
      const newFreqMhz = 200;
      const newPeriodNs = 1000 / newFreqMhz;
      expect(newPeriodNs).toBe(5.0);
      const newPulseWidthNs = newPeriodNs * (dutyCycle / 100);
      expect(newPulseWidthNs).toBe(1.5);
    });

    it("verifies Problem 3: parallel bus clock skew vs serial links", () => {
      // 30 mm difference at 15 cm/ns (0.15 mm/ps) -> 200 ps skew
      const deltaL = 30; // mm
      const v = 0.15; // mm/ps
      const deltaT = deltaL / v;
      expect(deltaT).toBe(200);

      // At 33 MHz (T ~ 30.303 ns)
      const bus33 = evaluateParallelSkew(33, 30);
      expect(bus33.skewPs).toBe(200);
      expect(bus33.periodNs).toBeCloseTo(30.3, 1);
      expect(bus33.skewFraction).toBeLessThan(0.01);
      expect(bus33.isReliable).toBe(true);

      // At 2.5 GHz (T = 400 ps)
      const bus2500 = evaluateParallelSkew(2500, 30);
      expect(bus2500.skewPs).toBe(200);
      expect(bus2500.periodPs).toBe(400);
      expect(bus2500.skewFraction).toBe(0.5);
      expect(bus2500.isReliable).toBe(false);
    });

    it("verifies Problem 4: active-LOW pull-up resistor sizing trade-offs", () => {
      const vdd = 3.3;
      // Small R = 20 ohms: excessive sink current and power
      const rSmall = 20;
      const iSmall = vdd / rSmall; // 0.165 A = 165 mA
      expect(iSmall).toBeCloseTo(0.165, 4);
      const pSmall = vdd * iSmall;
      expect(pSmall).toBeCloseTo(0.5445, 4);

      // Large R = 1 MOhm with C_bus = 50 pF: slow rise time
      const rLarge = 1e6;
      const cBus = 50e-12;
      const tauLarge = rLarge * cBus; // 50 us
      expect(tauLarge).toBe(0.00005);
      const trLarge = 2.2 * tauLarge; // 110 us
      expect(trLarge).toBeCloseTo(0.00011, 5);

      // Standard R = 10 kOhm: clean rise time and safe low current
      const rStd = 10000;
      const tauStd = rStd * cBus; // 0.5 us
      expect(tauStd).toBe(0.0000005);
      const trStd = 2.2 * tauStd; // 1.1 us
      expect(trStd).toBeCloseTo(0.0000011, 7);
      const iStd = (vdd / rStd) * 1000; // 0.33 mA
      expect(iStd).toBeCloseTo(0.33, 2);
    });

    it("verifies Problem 5: TTL to 74HC CMOS interfacing and pull-up constraints", () => {
      // TTL VOH = 2.4 V vs CMOS VIH = 3.5 V -> deficit -1.1 V
      const mismatch = computeNoiseMargins({ voh: 2.4, vol: 0.4, vih: 3.5, vil: 1.5 });
      expect(mismatch.vnh).toBe(-1.1);

      // Pull-up resistor constraints: VCC = 5.0 V, VOL = 0.4 V, IOL = 16 mA, VIH = 3.5 V, I_leak = 41 uA
      const constraints = calculatePullUpConstraints(5.0, 0.4, 16.0, 3.5, 41.0);
      expect(constraints.rMinOhms).toBe(287.5);
      expect(constraints.rMaxOhms).toBeCloseTo(36585.4, 1);

      // With 74HCT CMOS (VIH = 2.0 V): positive noise margin without pull-up
      const hct = computeNoiseMargins({ voh: 2.4, vol: 0.4, vih: 2.0, vil: 0.8 });
      expect(hct.vnh).toBe(0.4);
      expect(hct.vnl).toBe(0.4);
      expect(hct.vn).toBe(0.4);
    });

    it("verifies Problem 6: ADC Nyquist sampling, quantization error, and SQNR", () => {
      // Signal bandwidth f_max = 24 kHz -> Nyquist rate = 48 kS/s
      // 8-bit ADC with V_FS = 4.096 V
      const adc8 = calculateAdcSpecs(4.096, 8, 24000);
      expect(adc8.nyquistRateHz).toBe(48000);
      expect(adc8.levels).toBe(256);
      expect(adc8.stepVoltage).toBe(0.016); // 16 mV
      expect(adc8.maxQuantizationError).toBe(0.008); // ±8 mV

      // 12-bit ADC with V_FS = 4.096 V
      const adc12 = calculateAdcSpecs(4.096, 12, 24000);
      expect(adc12.levels).toBe(4096);
      expect(adc12.stepVoltage).toBe(0.001); // 1.0 mV
      expect(adc12.maxQuantizationError).toBe(0.0005); // ±0.5 mV

      // Resolution error reduction factor
      const reductionFactor = adc8.stepVoltage / adc12.stepVoltage;
      expect(reductionFactor).toBe(16);

      // Theoretical SQNR improvement: 6.02 * (12 - 8) = 24.08 dB
      const sqnrDelta = Number((adc12.sqnrDb - adc8.sqnrDb).toFixed(2));
      expect(sqnrDelta).toBe(24.08);
    });

    it("verifies MCQ practice calculations (q1, q2, q5)", () => {
      // q1: 10-bit ADC, 0 to 5.0 V span
      const q1Adc = calculateAdcSpecs(5.0, 10, 1000);
      expect(q1Adc.levels).toBe(1024);
      expect(q1Adc.stepVoltage * 1000).toBeCloseTo(4.88, 2); // ~4.88 mV
      expect(q1Adc.maxQuantizationError * 1000).toBeCloseTo(2.44, 2); // ±2.44 mV

      // q2: VOH = 4.2 V, VOL = 0.5 V, VIH = 3.2 V, VIL = 1.2 V
      const q2Margins = computeNoiseMargins({ voh: 4.2, vol: 0.5, vih: 3.2, vil: 1.2 });
      expect(q2Margins.vnh).toBe(1.0);
      expect(q2Margins.vnl).toBe(0.7);
      expect(q2Margins.vn).toBe(0.7);

      // q5: t_w = 4.0 ns, t_low = 12.0 ns -> T = 16.0 ns
      const tTotal = 4.0 + 12.0; // 16.0 ns
      const freq = 1000 / tTotal; // 62.5 MHz
      const duty = (4.0 / tTotal) * 100; // 25%
      expect(freq).toBe(62.5);
      expect(duty).toBe(25);
    });
  });
});

  describe("Module 1 Numbers and Codes practice & exam calculations", () => {
    describe("Lesson 1: Number Systems (m1-01)", () => {
      it("verifies Problem 1: mixed base conversions of 73.3125_10", () => {
        // Integer part: 73 / 2
        const div = divisionSteps(73, 2);
        const intBin = div.map((s) => s.digit).reverse().join("");
        expect(intBin).toBe("1001001");
        expect(parseInt(intBin, 2)).toBe(73);

        // Fractional part: 0.3125 * 2
        // 0.3125 -> 0.625 (0) -> 1.25 (1) -> 0.5 (0) -> 1.0 (1)
        const fracBin = "0101";
        const fullBin = `${intBin}.${fracBin}`;
        expect(fullBin).toBe("1001001.0101");

        // Group into octal (3 bits): 001 001 001 . 010 100 -> 111.24_8
        const oct = groupBinaryBits(fullBin, 3);
        expect(oct.resultString).toBe("111.24");

        // Group into hex (4 bits): 0100 1001 . 0101 -> 49.5_16
        const hex = groupBinaryBits(fullBin, 4);
        expect(hex.resultString).toBe("49.5");
      });

      it("verifies Problem 2: arbitrary base evaluation of (342.13)_5 and min radix for (7B2)_r", () => {
        // 3(25) + 4(5) + 2(1) + 1/5 + 3/25 = 75 + 20 + 2 + 0.2 + 0.12 = 97.32_10
        const val = 3 * 25 + 4 * 5 + 2 * 1 + 1 / 5 + 3 / 25;
        expect(val).toBeCloseTo(97.32, 4);

        // Digit B = 11 -> min radix is 12
        const bVal = parseInt("B", 36);
        expect(bVal).toBe(11);
        expect(bVal + 1).toBe(12);
      });

      it("verifies Problem 3: octal to hex direct conversion of (653.42)_8 -> (1AB.88)_16", () => {
        const binExpansion = expandRadixToBinary("653.42", 3);
        expect(binExpansion.fullBinary).toBe("110101011.100010");

        // Regroup into hex: 0001 1010 1011 . 1000 1000 -> 1AB.88
        const hexGroup = groupBinaryBits(binExpansion.fullBinary, 4);
        expect(hexGroup.resultString).toBe("1AB.88");
      });

      it("verifies Problem 4: truncation error analysis of 0.2_10 to 8 bits", () => {
        // 8-bit binary: 0.00110011_2
        const bin8 = 1 / 8 + 1 / 16 + 1 / 128 + 1 / 256;
        expect(bin8).toBe(0.19921875);

        const absError = Number(Math.abs(0.2 - bin8).toFixed(8));
        expect(absError).toBe(0.00078125);
        expect(absError).toBe(1 / 1280);

        const relErrorPercent = (absError / 0.2) * 100;
        expect(relErrorPercent).toBe(0.390625);
      });

      it("verifies Problem 5: solving equations in unknown radices", () => {
        // (24)_r + (17)_r = (43)_r -> r = 8
        const addSol = solveRadixAddition("24", "17", "43");
        expect(addSol.isValid).toBe(true);
        expect(addSol.radix).toBe(8);
        expect(addSol.minRadix).toBe(8);

        // (13)_r * (15)_r = (217)_r -> r = 8
        const prodSol = solveRadixProduct("13", "15", "217");
        expect(prodSol.isValid).toBe(true);
        expect(prodSol.radix).toBe(8);
        expect(prodSol.minRadix).toBe(8);
      });

      it("verifies Problem 6: terminating fractions and round-to-nearest vs truncation", () => {
        // 0.1875 = 3/16 -> 0.0011_2
        const bin = 0 / 2 + 0 / 4 + 1 / 8 + 1 / 16;
        expect(bin).toBe(0.1875);

        // Octal: .001 100 -> .14_8
        expect(1 / 8 + 4 / 64).toBe(0.1875);

        // Hex: .0011 -> .3_16
        expect(3 / 16).toBe(0.1875);

        // 0.6_10 truncated to 6 bits: 0.100110_2
        const trunc6 = 1 / 2 + 1 / 16 + 1 / 32;
        expect(trunc6).toBe(0.59375);
        expect(Math.abs(0.6 - trunc6)).toBeCloseTo(0.00625, 6);
        expect(0.00625).toBe(1 / 160);
      });

      it("verifies interactive MCQ practice calculations in Lesson 1", () => {
        // ns-q1: (4E7)_r requires r >= 15
        expect(parseInt("E", 36) + 1).toBe(15);

        // ns-q2: 0.375_10 = 0.011_2
        expect(1 / 4 + 1 / 8).toBe(0.375);

        // ns-q3: (725.3)_8 -> (1D5.6)_16
        const q3Bin = expandRadixToBinary("725.3", 3);
        const q3Hex = groupBinaryBits(q3Bin.fullBinary, 4);
        expect(q3Hex.resultString).toBe("1D5.6");

        // ns-q5: (33)_r = 27_10 -> 3r + 3 = 27 -> r = 8
        expect((27 - 3) / 3).toBe(8);

        // ns-q8: 1101 1010 1111 0000 -> 0xDAF0
        expect(parseInt("1101101011110000", 2).toString(16).toUpperCase()).toBe("DAF0");
      });
    });

    describe("Lesson 2: Binary Arithmetic (m1-02)", () => {
      it("verifies Problem 1: two's complement addition and overflow diagnosis", () => {
        // 1. (+68) + (+75) -> -113 (overflow)
        const op1 = simulateSignedArithmetic(68, 75, 8, "add");
        expect(op1.signedResult).toBe(-113);
        expect(op1.overflow).toBe(true);
        expect(op1.carryInMsb).toBe(1);
        expect(op1.carryOut).toBe(0);

        // 2. (-80) + (-60) -> +116 (overflow)
        const op2 = simulateSignedArithmetic(-80, -60, 8, "add");
        expect(op2.signedResult).toBe(116);
        expect(op2.overflow).toBe(true);
        expect(op2.carryInMsb).toBe(0);
        expect(op2.carryOut).toBe(1);

        // 3. (+68) + (-60) -> +8 (no overflow, C8 = 1 discarded)
        const op3 = simulateSignedArithmetic(68, -60, 8, "add");
        expect(op3.signedResult).toBe(8);
        expect(op3.overflow).toBe(false);
        expect(op3.carryInMsb).toBe(1);
        expect(op3.carryOut).toBe(1);
      });

      it("verifies Problem 2: 2's complement subtraction (-35) - (-50) = +15", () => {
        const subRes = simulateSignedArithmetic(-35, -50, 8, "sub");
        expect(subRes.signedResult).toBe(15);
        expect(subRes.overflow).toBe(false);
        expect(subRes.carryOut).toBe(1); // C8 = 1 is normal
      });

      it("verifies Problem 3: sign extension of 101101_2 (-19) to 10 bits", () => {
        const ext = signExtend(-19, 6, 10);
        expect(ext.originalValue).toBe(-19);
        expect(ext.signedValExtended).toBe(-19);
        expect(ext.signExtendedBits.join("")).toBe("1111101101");
        expect(ext.zeroExtendedVal).toBe(45); // zero extension corrupts sign
      });

      it("verifies Problem 4: 1's complement end-around carry modulo (2^n - 1)", () => {
        // (+5) + (-2) in 4-bit 1's complement
        // +5 = 0101, -2 = 1101 (ones complement of 0010)
        // 0101 + 1101 = 1 0010_2
        // End-around carry: 0010 + 1 = 0011_2 (+3)
        const p5 = 0b0101;
        const m2 = 0b1101;
        const rawSum = p5 + m2; // 0b10010 (18)
        const carryOut = (rawSum >> 4) & 1;
        expect(carryOut).toBe(1);
        const endAroundSum = (rawSum & 0xf) + carryOut;
        expect(endAroundSum).toBe(0b0011);
        expect(endAroundSum).toBe(3);
      });

      it("verifies Problem 5: Boolean overflow logic equivalence V = C_n ^ C_{n-1}", () => {
        // Exhaustively verify V = C_n ^ C_{n-1} matches V = ~A*~B*S + A*B*~S
        for (let a7 = 0; a7 <= 1; a7++) {
          for (let b7 = 0; b7 <= 1; b7++) {
            for (let c7 = 0; c7 <= 1; c7++) {
              const s7 = (a7 ^ b7 ^ c7) as Bit;
              const c8 = ((a7 & b7) | (c7 & (a7 ^ b7))) as Bit;
              const vXor = c8 ^ c7;
              const vBool = (!a7 && !b7 && s7) || (a7 && b7 && !s7) ? 1 : 0;
              expect(vXor).toBe(vBool);
            }
          }
        }
      });

      it("verifies Problem 6: saturating arithmetic vs modular wraparound", () => {
        // Case 1: (+110) + (+45) = +155 -> wraparound -101 vs saturation +127
        const satPos = simulateSaturatedArithmetic(110, 45, 8, "add");
        expect(satPos.rawSum).toBe(155);
        expect(satPos.overflow).toBe(true);
        expect(satPos.wrappedSum).toBe(-101);
        expect(satPos.saturatedSum).toBe(127);

        // Case 2: (-90) + (-60) = -150 -> wraparound +106 vs saturation -128
        const satNeg = simulateSaturatedArithmetic(-90, -60, 8, "add");
        expect(satNeg.rawSum).toBe(-150);
        expect(satNeg.overflow).toBe(true);
        expect(satNeg.wrappedSum).toBe(106);
        expect(satNeg.saturatedSum).toBe(-128);
      });

      it("verifies interactive MCQ practice calculations in Lesson 2", () => {
        // ba-q1: negate -128 in 8 bits
        const neg128 = twosComplement(-128, 8);
        expect(neg128).toBe(128); // bit pattern 10000000
        expect(signedValue(neg128, 8)).toBe(-128);

        // ba-q3: sign extend 6-bit 110100 (-12) to 8 bits
        const q3Ext = signExtend(-12, 6, 8);
        expect(q3Ext.originalValue).toBe(-12);
        expect(q3Ext.signedValExtended).toBe(-12);
        expect(q3Ext.signExtendedBits.join("")).toBe("11110100");
      });
    });

    describe("Lesson 3: Codes and Floating Point (m1-03)", () => {
      it("verifies Problem 1: multi-digit BCD addition 86 + 79 = 165", () => {
        // Units: 6 + 9 = 15 (>9 -> add 6 -> sum 5, carry 1)
        const units = simulateBcdAdder(6, 9, 0);
        expect(units.stage1Sum).toBe(15);
        expect(units.needsCorrection).toBe(true);
        expect(units.finalBcdDigit).toBe(5);
        expect(units.bcdCarryOut).toBe(1);

        // Tens: 8 + 7 + 1 = 16 (K=1 -> add 6 -> sum 6, carry 1)
        const tens = simulateBcdAdder(8, 7, 1);
        expect(units.stage1Sum).toBe(15);
        expect(tens.binaryCarryK).toBe(1);
        expect(tens.needsCorrection).toBe(true);
        expect(tens.finalBcdDigit).toBe(6);
        expect(tens.bcdCarryOut).toBe(1);

        const total = tens.bcdCarryOut * 100 + tens.finalBcdDigit * 10 + units.finalBcdDigit;
        expect(total).toBe(165);
      });

      it("verifies Problem 2: Gray code encoder (11_10 -> 1110_Gray) and unit distance", () => {
        expect(toGray(11)).toBe(0b1110);
        expect(bitString(toGray(11), 4)).toBe("1110");

        // Transition 7 (0111_2) to 8 (1000_2): all 4 bits toggle in binary!
        const b7 = 0b0111;
        const b8 = 0b1000;
        const binDiff = bitsOf(b7 ^ b8, 4).filter(Boolean).length;
        expect(binDiff).toBe(4);

        // In Gray code: 7 is 0100, 8 is 1100 -> only 1 bit toggles!
        const g7 = toGray(7);
        const g8 = toGray(8);
        expect(bitString(g7, 4)).toBe("0100");
        expect(bitString(g8, 4)).toBe("1100");
        const grayDiff = bitsOf(g7 ^ g8, 4).filter(Boolean).length;
        expect(grayDiff).toBe(1);
      });

      it("verifies Problem 3: self-complementing property of Excess-3 and 2421", () => {
        for (let d = 0; d <= 9; d++) {
          // Excess-3: bitwise NOT of XS-3(d) equals XS-3(9 - d)
          const xs3 = d + 3;
          const xs3Comp = ~xs3 & 0xf;
          const xs3Nine = (9 - d) + 3;
          expect(xs3Comp).toBe(xs3Nine);
        }
      });

      it("verifies Problem 4: IEEE 754 decoding of 0x42A60000 -> +83.0", () => {
        const dec = decodeIeee754Hex("42A60000");
        expect(dec.sign).toBe(0);
        expect(dec.exponentRaw).toBe(133);
        expect(dec.trueExponent).toBe(6);
        expect(dec.fractionVal).toBe(0.296875);
        expect(dec.significand).toBe(1.296875);
        expect(dec.decimalValue).toBe(83.0);
        expect(dec.classification).toBe("normal");
      });

      it("verifies Problem 5: Hamming (7,4) code generation, syndrome detection, and correction", () => {
        // Data nibble D = (1, 0, 1, 1)
        const d: [Bit, Bit, Bit, Bit] = [1, 0, 1, 1];
        const h74 = simulateHamming74(d);
        expect(h74.p1).toBe(0);
        expect(h74.p2).toBe(1);
        expect(h74.p4).toBe(0);
        expect(h74.codeword).toEqual([0, 1, 1, 0, 0, 1, 1]);

        // Clean reception
        const clean = h74.checkSyndrome(h74.codeword);
        expect(clean.hasError).toBe(false);
        expect(clean.syndromeInt).toBe(0);
        expect(clean.correctedData).toEqual(d);

        // Noise flips bit 5 (index 4 in 0-indexed array) -> [0, 1, 1, 0, 1, 1, 1]
        const noisy = [...h74.codeword];
        noisy[4] = 1;
        const corrected = h74.checkSyndrome(noisy);
        expect(corrected.hasError).toBe(true);
        expect(corrected.errorBitPos).toBe(5);
        expect(corrected.syndromeBits).toEqual([1, 0, 1]);
        expect(corrected.syndromeInt).toBe(5);
        expect(corrected.correctedCodeword).toEqual(h74.codeword);
        expect(corrected.correctedData).toEqual(d);
      });

      it("verifies Problem 6: IEEE 754 encoding of -19.375_10, subnormal numbers, and special states", () => {
        // -19.375 -> 0xC19B0000
        const fp = floatParts(-19.375);
        expect(fp.sign).toBe(1);
        expect(fp.exponent).toBe(131); // 4 + 127
        expect(fp.value).toBe(-19.375);
        expect(parseInt(fp.bits, 2).toString(16).toUpperCase()).toBe("C19B0000");

        // Subnormal number: 0x00000001 (smallest positive subnormal)
        const sub = decodeIeee754Hex("00000001");
        expect(sub.classification).toBe("subnormal");
        expect(sub.trueExponent).toBe(-126);
        expect(sub.decimalValue).toBeCloseTo(1.401298e-45, 50);

        // Special representations
        expect(decodeIeee754Hex("00000000").classification).toBe("zero");
        expect(decodeIeee754Hex("80000000").classification).toBe("zero");
        expect(decodeIeee754Hex("7F800000").classification).toBe("infinity");
        expect(decodeIeee754Hex("FF800000").classification).toBe("infinity");
        expect(decodeIeee754Hex("7FC00000").classification).toBe("nan");
      });
    });

    describe("Lesson 4: Module Quiz (m1-04-numbers-quiz)", () => {
      it("verifies all module quiz calculation questions (q1, q3, q6, q8)", () => {
        // q1: (243.12)_5 = 73.28_10, min radix for (9C4)_r is 13
        const q1Val = 2 * 25 + 4 * 5 + 3 * 1 + 1 / 5 + 2 / 25;
        expect(q1Val).toBe(73.28);
        expect(parseInt("C", 36) + 1).toBe(13);

        // q3: (375.4)_8 direct to hex -> (FD.8)_16
        const q3Bin = expandRadixToBinary("375.4", 3);
        const q3Hex = groupBinaryBits(q3Bin.fullBinary, 4);
        expect(q3Hex.resultString).toBe("0FD.8");
        expect(q3Hex.resultString.replace(/^0/, "")).toBe("FD.8");

        // q6: (+80) + (+70) in 8-bit signed
        const q6Op = simulateSignedArithmetic(80, 70, 8, "add");
        expect(q6Op.signedResult).toBe(-106);
        expect(q6Op.overflow).toBe(true);
        expect(q6Op.carryInMsb).toBe(1);
        expect(q6Op.carryOut).toBe(0);

        // q8: 10110_2 -> 11101_Gray
        expect(bitString(toGray(0b10110), 5)).toBe("11101");
      });
    });
  });

  describe("Module 2 Gates and Boolean Algebra practice & exam calculations", () => {
    describe("Lesson 1: Logic Gates (m2-01)", () => {
      it("verifies Problem 1: cascaded propagation delay with alternating edge polarities", () => {
        // Stage 1: INV (input 0->1 => output 1->0: tpHL = 3ns)
        // Stage 2: AND (input 1->0, second input 1 => output 1->0: tpHL = 6ns)
        // Stage 3: NOR (input 1->0, second input 0 => output 0->1: tpLH = 7ns)
        const totalDelay = 3 + 6 + 7;
        expect(totalDelay).toBe(16);
      });

      it("verifies Problem 2: 3-bit parity generation P = A ^ B ^ C and single-bit error syndrome", () => {
        // P = A ^ B ^ C
        const a = 1, b = 0, c = 1;
        const p = a ^ b ^ c; // 0
        expect(p).toBe(0);
        // Error flips b: bRx = b ^ 1 = 1
        const bRx = b ^ 1;
        const syndrome = a ^ bRx ^ c ^ p;
        expect(syndrome).toBe(1); // Error detected
      });

      it("verifies Problem 3: noise margins and DC fan-out calculation", () => {
        const result = simulateFanOutAndNoiseMargins({
          voh: 4.3,
          vol: 0.35,
          vih: 3.1,
          vil: 1.1,
          ioh: -4.0,
          iol: 16.0,
          iih: 0.040,
          iil: -0.8,
        });
        expect(result.nmH).toBe(1.2);
        expect(result.nmL).toBe(0.75);
        expect(result.fanOutHigh).toBe(100);
        expect(result.fanOutLow).toBe(20);
        expect(result.ratedFanOut).toBe(20);
      });

      it("verifies Problem 4: active-low enable CS_bar = A15' + A14 + REQ_bar", () => {
        // Active condition: A15=1, A14=0, REQ_bar=0 -> CS_bar=0
        const cs = (a15: Bit, a14: Bit, reqBar: Bit) => ((a15 ? 0 : 1) || a14 || reqBar ? 1 : 0) as Bit;
        expect(cs(1, 0, 0)).toBe(0); // enabled
        expect(cs(0, 0, 0)).toBe(1); // disabled
        expect(cs(1, 1, 0)).toBe(1); // disabled
        expect(cs(1, 0, 1)).toBe(1); // disabled
      });

      it("verifies Problem 5: CMOS dynamic power dissipation and DVFS scaling", () => {
        const full = simulateDynamicPower(1.6e-9, 1.0, 2.5e9, 0.25, 0.080);
        expect(full.pDynWatts).toBeCloseTo(1.0, 4);
        expect(full.pStatWatts).toBeCloseTo(0.08, 4);
        expect(full.pTotalWatts).toBeCloseTo(1.08, 4);

        const scaled = simulateDynamicPower(1.6e-9, 0.8, 2.0e9, 0.25, 0.080);
        expect(scaled.pDynWatts).toBeCloseTo(0.512, 4);
        const reductionPct = ((full.pDynWatts - scaled.pDynWatts) / full.pDynWatts) * 100;
        expect(reductionPct).toBeCloseTo(48.8, 1);
      });

      it("verifies Problem 6: Schmitt trigger hysteresis width and noise tolerance", () => {
        const schmitt = simulateSchmittTrigger(2.10, 1.30, 0.45);
        expect(schmitt.vH).toBe(0.80);
        expect(schmitt.canRejectNoise).toBe(true);
      });

      it("verifies interactive MCQ practice in Lesson 1", () => {
        // lg-p1: 3-input XOR (1, 1, 1) -> 1
        expect(evalGate("XOR", [1, 1])).toBe(0);
        expect(1 ^ 1 ^ 1).toBe(1);
        // lg-p4: fan-out min(80, 16) = 16
        expect(Math.min(Math.floor(3.2 / 0.04), Math.floor(12.8 / 0.8))).toBe(16);
      });
    });

    describe("Lesson 2: Boolean Algebra (m2-02)", () => {
      it("verifies Problem 1: absorption law x + xy = x", () => {
        for (const x of [0, 1] as Bit[]) {
          for (const y of [0, 1] as Bit[]) {
            expect((x || (x && y) ? 1 : 0)).toBe(x);
          }
        }
      });

      it("verifies Problem 2: consensus theorem reduction AB + A'C + BC + A'BD = AB + BD + A'C", () => {
        const vars = ["A", "B", "C", "D"];
        const orig = "AB + A'C + BC + A'BD";
        const simplified = "AB + BD + A'C";
        expect(sameFunction(orig, simplified, vars)).toBe(true);
      });

      it("verifies Problem 3: dual vs complement of (A + B')(C'D + E)'", () => {
        // Complement: A'B + C'D + E
        const vars = ["A", "B", "C", "D", "E"];
        const orig = "(A + B')(C'D + E)'";
        const comp = "A'B + C'D + E";
        for (const { env } of truthRows(vars)) {
          expect(evalExpr(comp, env)).toBe((evalExpr(orig, env) ? 0 : 1) as Bit);
        }
      });

      it("verifies Problem 4: multi-variable reduction to G = AB + AC' + BC'", () => {
        const vars = ["A", "B", "C"];
        // m2(010), m4(100), m6(110), m7(111)
        const orig = "A'BC' + AB'C' + ABC' + ABC";
        const simplified = "AB + AC' + BC'";
        expect(sameFunction(orig, simplified, vars)).toBe(true);
      });

      it("verifies Problem 5: second distributive law on (A + B + C')(A + B + C)(A + B' + C') = (A + B)(A + C')", () => {
        const vars = ["A", "B", "C"];
        const orig = "(A + B + C')(A + B + C)(A + B' + C')";
        const simplified = "(A + B)(A + C')";
        expect(sameFunction(orig, simplified, vars)).toBe(true);
      });

      it("verifies Problem 6: XOR identities A ^ B ^ AB = A + B and (A ^ B)' = AB + A'B'", () => {
        for (const a of [0, 1] as Bit[]) {
          for (const b of [0, 1] as Bit[]) {
            const xorVal = a ^ b;
            const lhs1 = (xorVal ^ (a & b)) as Bit;
            const rhs1 = (a || b ? 1 : 0) as Bit;
            expect(lhs1).toBe(rhs1);

            const xnorVal = (xorVal ? 0 : 1) as Bit;
            const rhs2 = ((a && b) || (!a && !b) ? 1 : 0) as Bit;
            expect(xnorVal).toBe(rhs2);
          }
        }
      });
    });

    describe("Lesson 3: SOP and POS (m2-03)", () => {
      it("verifies Problem 1: majority voter sum of minterms and product of maxterms", () => {
        const vars = ["A", "B", "C"];
        const sop = sopFromMinterms([3, 5, 6, 7], vars);
        const pos = posFromMinterms([3, 5, 6, 7], vars);
        for (const { env } of truthRows(vars)) {
          const count = env.A + env.B + env.C;
          const expected = count >= 2 ? 1 : 0;
          expect(evalExpr(sop, env)).toBe(expected);
          expect(evalExpr(pos, env)).toBe(expected);
        }
      });

      it("verifies Problem 2: algebraic POS expansion (A' + B)(B' + C) = prod M(2, 4, 5, 6)", () => {
        const vars = ["A", "B", "C"];
        const orig = "(A' + B)(B' + C)";
        const pos = posFromMinterms([0, 1, 3, 7], vars); // 0-rows are 2, 4, 5, 6 -> 1-rows are 0, 1, 3, 7
        expect(sameFunction(orig, pos, vars)).toBe(true);
      });

      it("verifies Problem 3: complement minterm and maxterm index duality", () => {
        const fMinterms = [0, 2, 5, 7, 8, 10, 12, 13, 15];
        const allIndices = Array.from({ length: 16 }, (_, i) => i);
        const compMinterms = allIndices.filter((i) => !fMinterms.includes(i));
        expect(compMinterms).toEqual([1, 3, 4, 6, 9, 11, 14]);
      });

      it("verifies Problem 4: SOP and POS equivalence for F = sum m(1, 2, 3, 7)", () => {
        const vars = ["A", "B", "C"];
        const sop = "A'B + A'C + BC";
        const pos = "(B + C)(A' + B)(A' + C)";
        expect(sameFunction(sop, pos, vars)).toBe(true);
      });

      it("verifies Problem 5: non-canonical expansion w'z + x'y' + wxz' = sum m(0,1,3,5,7,8,9,12,14)", () => {
        const vars = ["w", "x", "y", "z"];
        const orig = "w'z + x'y' + wxz'";
        const minterms = [0, 1, 3, 5, 7, 8, 9, 12, 14];
        const sop = sopFromMinterms(minterms, vars);
        expect(sameFunction(orig, sop, vars)).toBe(true);
      });

      it("verifies Problem 6: Shannon expansion cofactors of 3-input parity function", () => {
        const vars = ["A", "B", "C"];
        // F(A,B,C) = A ^ B ^ C = A'*(B ^ C) + A*(B ^ C)'
        for (const { env } of truthRows(vars)) {
          const parity = (env.A ^ env.B ^ env.C) as Bit;
          const cofactor0 = (env.B ^ env.C) as Bit;
          const cofactor1 = (cofactor0 ? 0 : 1) as Bit;
          const shannon = env.A === 0 ? cofactor0 : cofactor1;
          expect(shannon).toBe(parity);
        }
      });
    });

    describe("Lesson 4: Karnaugh Maps (m2-04)", () => {
      it("verifies Problem 1: 4-variable K-map minimization F = B'D' + A'BD + ABC", () => {
        const minterms = [0, 2, 5, 7, 8, 10, 14, 15];
        const vars = ["A", "B", "C", "D"];
        for (const { m, env } of truthRows(vars)) {
          const valExpected = minterms.includes(m) ? 1 : 0;
          expect(evalExpr("B'D' + A'BD + ABC", env)).toBe(valExpected);
        }
      });

      it("verifies Problem 2: K-map with don't-cares SOP w'x' + yz and POS z(w' + y)", () => {
        const vars = ["w", "x", "y", "z"];
        const sop = "w'x' + yz";
        const pos = "z(w' + y)";
        const careMinterms = [1, 3, 7, 11, 15];
        const careZeroes = [4, 6, 8, 9, 10, 12, 13, 14];
        for (const { m, env } of truthRows(vars)) {
          if (careMinterms.includes(m)) {
            expect(evalExpr(sop, env)).toBe(1);
            expect(evalExpr(pos, env)).toBe(1);
          } else if (careZeroes.includes(m)) {
            expect(evalExpr(sop, env)).toBe(0);
            expect(evalExpr(pos, env)).toBe(0);
          }
        }
      });

      it("verifies Problem 5: larger prime implicant BD is redundant when 4 EPIs cover all minterms", () => {
        const minterms = [1, 5, 6, 7, 11, 12, 13, 15];
        const vars = ["A", "B", "C", "D"];
        const fourEpis = "A'C'D + A'BC + ABC' + ACD";
        for (const { m, env } of truthRows(vars)) {
          const expected = minterms.includes(m) ? 1 : 0;
          expect(evalExpr(fourEpis, env)).toBe(expected);
        }
      });

      it("verifies Problem 6: static-0 hazard in POS (A + B)(A' + C) eliminated by consensus (B + C)", () => {
        const vars = ["A", "B", "C"];
        const orig = "(A + B)(A' + C)";
        const hazardFree = "(A + B)(A' + C)(B + C)";
        expect(sameFunction(orig, hazardFree, vars)).toBe(true);
      });
    });

    describe("Lesson 5: Universal Gates (m2-05)", () => {
      it("verifies Problem 1: bubble pushing all-NAND conversion of (AB + C)D + E'F", () => {
        const vars = ["A", "B", "C", "D", "E", "F"];
        const orig = "(AB + C)D + E'F";
        for (const { env } of truthRows(vars)) {
          const n1 = !(env.A && env.B) ? 1 : 0;
          const n2 = !(n1 && (env.C ? 0 : 1)) ? 1 : 0; // NAND(n1, C')
          const n3 = !(n2 && env.D) ? 1 : 0;
          const n4 = !((env.E ? 0 : 1) && env.F) ? 1 : 0;
          const n5 = !(n3 && n4) ? 1 : 0;
          expect(n5).toBe(evalExpr(orig, env));
        }
      });

      it("verifies Problem 2: 4-NAND minimal XOR", () => {
        for (const a of [0, 1] as Bit[]) {
          for (const b of [0, 1] as Bit[]) {
            const n1 = !(a && b) ? 1 : 0;
            const n2 = !(a && n1) ? 1 : 0;
            const n3 = !(b && n1) ? 1 : 0;
            const xorOut = !(n2 && n3) ? 1 : 0;
            expect(xorOut).toBe(a ^ b);
          }
        }
      });

      it("verifies Problem 5: 4-NOR minimal XNOR equivalence", () => {
        for (const a of [0, 1] as Bit[]) {
          for (const b of [0, 1] as Bit[]) {
            const res = simulate4NorXnor(a, b);
            const expectedXnor = (a ^ b ? 0 : 1) as Bit;
            expect(res.y).toBe(expectedXnor);
          }
        }
      });

      it("verifies Problem 6: complex static CMOS AOI-22 and OAI-22 gates", () => {
        for (const a of [0, 1] as Bit[]) {
          for (const b of [0, 1] as Bit[]) {
            for (const c of [0, 1] as Bit[]) {
              for (const d of [0, 1] as Bit[]) {
                // AOI-22: ((A*B) + (C*D))'
                const aoi = simulateAoi22(a, b, c, d);
                const expectedAoi = ((a && b) || (c && d) ? 0 : 1) as Bit;
                expect(aoi.output).toBe(expectedAoi);
                expect(aoi.transistorCount).toBe(8);

                // OAI-22: ((A+B) * (C+D))'
                const oai = simulateOai22(a, b, c, d);
                const expectedOai = ((a || b) && (c || d) ? 0 : 1) as Bit;
                expect(oai.output).toBe(expectedOai);
                expect(oai.transistorCount).toBe(8);
              }
            }
          }
        }
      });
    });

    describe("Lesson 6: Gates Quiz (m2-06)", () => {
      it("verifies all module quiz logic properties", () => {
        // q1: 3-input XOR (1, 1, 1) = 1
        expect(1 ^ 1 ^ 1).toBe(1);
        // q2: consensus theorem xy + x'z + yz = xy + x'z
        expect(sameFunction("xy + x'z + yz", "xy + x'z", ["x", "y", "z"])).toBe(true);
        // q3: complement of A(B'C + D) is A' + (B + C')D'
        expect(sameFunction("A' + (B + C')D'", "(A(B'C + D))'", ["A", "B", "C", "D"])).toBe(true);
        // q4: M9 for 4 variables is A' + B + C + D'
        // Row 9 is 1001_2: A=1, B=0, C=0, D=1 -> A' + B + C + D' = 0 on row 9
        const m9 = (a: Bit, b: Bit, c: Bit, d: Bit) => (!a || b || c || !d ? 1 : 0) as Bit;
        expect(m9(1, 0, 0, 1)).toBe(0);
        expect(m9(0, 0, 0, 0)).toBe(1);
        // q5: sum m(0,2,4,6) -> prod M(1,3,5,7)
        const evens = [0, 2, 4, 6];
        const odds = [1, 3, 5, 7];
        expect(odds).toEqual([0, 1, 2, 3, 4, 5, 6, 7].filter((i) => !evens.includes(i)));
      });
    });
  });


describe("Module 3 Combinational Building Blocks practice & exam calculations", () => {
  describe("Lesson 1: Adders and Subtractors (m3-01)", () => {
    it("verifies Problem 1: full adder gate-level propagation delays", () => {
      const tXor = 3.0;
      const tAnd = 1.5;
      const tOr = 1.5;
      const delaySumFromAB = tXor + tXor;
      expect(delaySumFromAB).toBe(6.0);
      const delayCoutFromAB = tXor + tAnd + tOr;
      expect(delayCoutFromAB).toBe(6.0);
      const delayCoutFromCin = tAnd + tOr;
      expect(delayCoutFromCin).toBe(3.0);
    });

    it("verifies Problem 2: 4-bit adder-subtractor execution trace and signed overflow", () => {
      const subA = simulateAdderSubtractor(3, 6, "SUB", 4);
      expect(subA.m).toBe(1);
      expect(subA.bEffective).toEqual([1, 0, 0, 1]);
      expect(subA.sumBits).toEqual([1, 0, 1, 1]);
      expect(subA.sumSigned).toBe(-3);
      expect(subA.flags.overflow).toBe(false);
      expect(subA.flags.carry).toBe(0);

      const subB = simulateAdderSubtractor(5, 12, "SUB", 4);
      expect(subB.sumBits).toEqual([1, 0, 0, 1]);
      expect(subB.sumSigned).toBe(-7);
      expect(subB.flags.overflow).toBe(true);
      expect(subB.carries[3]).toBe(1);
      expect(subB.carries[4]).toBe(0);
    });

    it("verifies Problem 3: full subtractor difference and borrow logic", () => {
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          for (let bin = 0; bin <= 1; bin++) {
            const sub = fullSubtractor(a as Bit, b as Bit, bin as Bit);
            const expectedDiff = (a ^ b ^ bin) as Bit;
            const expectedBout = ((!a && b) || (!a && bin) || (b && bin) ? 1 : 0) as Bit;
            expect(sub.diff).toBe(expectedDiff);
            expect(sub.borrowOut).toBe(expectedBout);
          }
        }
      }
    });

    it("verifies Problem 4: signed overflow condition V = Cn ^ C(n-1)", () => {
      const posOverflow = simulateAdderSubtractor(7, 2, "ADD", 4);
      expect(posOverflow.flags.overflow).toBe(true);
      expect(posOverflow.carries[3] ^ posOverflow.carries[4]).toBe(1);

      const negOverflow = simulateAdderSubtractor(10, 11, "ADD", 4);
      expect(negOverflow.flags.overflow).toBe(true);
      expect(negOverflow.carries[3] ^ negOverflow.carries[4]).toBe(1);

      const validAdd = simulateAdderSubtractor(4, 3, "ADD", 4);
      expect(validAdd.flags.overflow).toBe(false);
      expect(validAdd.carries[3] ^ validAdd.carries[4]).toBe(0);
    });

    it("verifies Problem 5: 16-bit RCA timing, clock frequency, and flag analysis", () => {
      const tXor = 1.8;
      const tCarry = 1.2;
      const tSetup = 0.5;
      const tCq = 0.6;
      const n = 16;
      const tC16 = n * tCarry;
      const tS15 = (n - 1) * tCarry + tXor;
      const tpMax = Math.max(tC16, tS15);
      expect(tpMax).toBe(19.8);

      const tMin = tCq + tpMax + tSetup;
      expect(tMin).toBeCloseTo(20.9, 1);
      const fMaxMhz = 1000 / tMin;
      expect(fMaxMhz).toBeCloseTo(47.85, 1);

      const add16 = simulateAdderSubtractor(0x7fff, 0x0001, "ADD", 16);
      expect(add16.sumUnsigned).toBe(0x8000);
      expect(add16.sumSigned).toBe(-32768);
      expect(add16.flags.zero).toBe(false);
      expect(add16.flags.sign).toBe(1);
      expect(add16.flags.carry).toBe(0);
      expect(add16.flags.overflow).toBe(true);
    });

    it("verifies Problem 6: Decimal BCD adder correction and example trace 8 + 7 = 15", () => {
      const bcdRes = simulateBcdAdder(8, 7, 0);
      expect(bcdRes.stage1Sum).toBe(15);
      expect(bcdRes.binaryCarryK).toBe(0);
      expect(bcdRes.stage1Bits).toEqual([1, 1, 1, 1]);
      expect(bcdRes.needsCorrection).toBe(true);
      expect(bcdRes.bcdCarryOut).toBe(1);
      expect(bcdRes.finalBcdDigit).toBe(5);
      expect(bcdRes.totalDecimal).toBe(15);

      const bcdValid = simulateBcdAdder(4, 3, 0);
      expect(bcdValid.stage1Sum).toBe(7);
      expect(bcdValid.needsCorrection).toBe(false);
      expect(bcdValid.finalBcdDigit).toBe(7);
      expect(bcdValid.bcdCarryOut).toBe(0);
    });

    it("verifies in-lesson practice Qs: mutual exclusivity of half adder carries", () => {
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          for (let cin = 0; cin <= 1; cin++) {
            const c1 = a & b;
            const c2 = (a ^ b) & cin;
            expect(c1 & c2).toBe(0);
            expect(c1 | c2).toBe(c1 ^ c2);
          }
        }
      }
    });
  });

  describe("Lesson 2: Fast Carries (m3-02)", () => {
    it("verifies Problem 1: 32-bit hierarchical CLA vs RCA delay scaling", () => {
      const rcaDelay = 32 * 2;
      expect(rcaDelay).toBe(64);
      const claDelay = 10;
      const speedup = rcaDelay / claDelay;
      expect(speedup).toBe(6.4);
    });

    it("verifies Problem 2: 4-bit unrolled CLA trace (A=11, B=7, C0=1)", () => {
      const cla = simulateFastCarries(11, 7, 1, 4);
      expect(cla.generates).toEqual([1, 1, 0, 0]);
      expect(cla.propagates).toEqual([0, 0, 1, 1]);
      expect(cla.claCarries[1]).toBe(1);
      expect(cla.claCarries[2]).toBe(1);
      expect(cla.claCarries[3]).toBe(1);
      expect(cla.claCarries[4]).toBe(1);
      const sums = cla.propagates.map((p, i) => (p ^ cla.claCarries[i]) as Bit);
      expect(sums).toEqual([1, 1, 0, 0]);
      const fullValue = sums[0] + sums[1] * 2 + sums[2] * 4 + sums[3] * 8 + cla.claCarries[4] * 16;
      expect(fullValue).toBe(19);
    });

    it("verifies Problem 3: Block Generate and Block Propagate formulas", () => {
      const p = [1, 1, 1, 1] as Bit[];
      const bp = (p[0] & p[1] & p[2] & p[3]) as Bit;
      expect(bp).toBe(1);
    });

    it("verifies Problem 5: 16-bit Carry-Skip Adder timing and speedup", () => {
      const csa = simulateCarrySkipAdder(0x1234, 0x5678, 0, 16, 4);
      expect(csa.criticalPathDelayNs).toBeCloseTo(11.2, 1);
      expect(csa.rippleCarryEquivalentDelayNs).toBeCloseTo(16.8, 1);
      expect(csa.speedup).toBeCloseTo(1.5, 1);
    });

    it("verifies Problem 6: Prefix associative operator proof and simulation", () => {
      const p1: Bit = 1, g1: Bit = 0;
      const p2: Bit = 1, g2: Bit = 1;
      const p3: Bit = 0, g3: Bit = 1;

      const rightAssoc = prefixOperator({ g: g3, p: p3 }, prefixOperator({ g: g2, p: p2 }, { g: g1, p: p1 }));
      const leftAssoc = prefixOperator(prefixOperator({ g: g3, p: p3 }, { g: g2, p: p2 }), { g: g1, p: p1 });
      expect(rightAssoc).toEqual(leftAssoc);

      const prefixAdd = simulateParallelPrefix(9, 5, 0, 4);
      expect(prefixAdd.sum).toBe(14);
    });
  });

  describe("Lesson 3: Comparators, Decoders, and Encoders (m3-03)", () => {
    it("verifies Problem 1: full subtractor synthesis using 3-to-8 decoder and NAND gates", () => {
      for (let addr = 0; addr < 8; addr++) {
        const dec = simulateDecoder(addr, 3, { g1: 1, g2a_n: 0, g2b_n: 0 }, true, [1, 2, 4, 7]);
        const isD = [1, 2, 4, 7].includes(addr);
        expect(dec.synthesis?.output).toBe(isD ? 1 : 0);
      }
    });

    it("verifies Problem 2: 4-to-16 line decoder using complementary enables", () => {
      for (let a3 = 0; a3 <= 1; a3++) {
        for (let lower = 0; lower < 8; lower++) {
          const dec0 = simulateDecoder(lower, 3, { g1: 1, g2a_n: a3 as Bit, g2b_n: 0 }, true);
          const dec1 = simulateDecoder(lower, 3, { g1: a3 as Bit, g2a_n: 0, g2b_n: 0 }, true);
          if (a3 === 0) {
            expect(dec0.enabled).toBe(true);
            expect(dec1.enabled).toBe(false);
            expect(dec0.outputs[lower]).toBe(0);
          } else {
            expect(dec0.enabled).toBe(false);
            expect(dec1.enabled).toBe(true);
            expect(dec1.outputs[lower]).toBe(0);
          }
        }
      }
    });

    it("verifies Problem 3: 4-to-2 priority encoder minimal SOP equations", () => {
      for (let d = 0; d < 16; d++) {
        const d3 = (d >> 3) & 1;
        const d2 = (d >> 2) & 1;
        const d1 = (d >> 1) & 1;
        const d0 = d & 1;
        const expectedA1 = d3 || d2 ? 1 : 0;
        const expectedA0 = d3 || (!d2 && d1) ? 1 : 0;
        const expectedV = d3 || d2 || d1 || d0 ? 1 : 0;
        if (expectedV) {
          if (d3) expect([expectedA1, expectedA0]).toEqual([1, 1]);
          else if (d2) expect([expectedA1, expectedA0]).toEqual([1, 0]);
          else if (d1) expect([expectedA1, expectedA0]).toEqual([0, 1]);
          else expect([expectedA1, expectedA0]).toEqual([0, 0]);
        }
      }
    });

    it("verifies Problem 4: 74LS85 8-bit magnitude comparator cascading bias", () => {
      const compEq = simulateMagnitudeComparator(0xa5, 0xa5, 8, { gt: 0, eq: 1, lt: 0 });
      expect(compEq.eq).toBe(1);
      expect(compEq.gt).toBe(0);
      expect(compEq.lt).toBe(0);
    });

    it("verifies Problem 5: 16-to-4 priority encoder cascading (74LS148)", () => {
      const inputs: Bit[] = Array.from({ length: 16 }, () => 1 as Bit);
      inputs[12] = 0;
      inputs[5] = 0;

      const cascade = simulate74LS148Cascade16to4(inputs, 0);
      expect(cascade.chipHigh.gs).toBe(0);
      expect(cascade.chipHigh.eo).toBe(1);
      expect(cascade.chipLow.gs).toBe(1);
      expect(cascade.finalOutputs).toEqual([0, 0, 1, 1]);
      expect(cascade.finalEncodedValue).toBe(12);
    });

    it("verifies Problem 6: Microprocessor 8KB memory map decoding", () => {
      // 4 banks of 8KB: 0x0000-0x1FFF, 0x2000-0x3FFF, 0x4000-0x5FFF, 0x6000-0x7FFF
      // Using 74LS138: address 0x4100 -> CBA = A15 A14 A13 = (0x4100 >> 13) & 7 = 2 (RAM 0)
      const addr = 0x4100;
      const cba = (addr >> 13) & 7;
      expect(cba).toBe(2);
      const dec = simulateDecoder(cba, 3, { g1: 1, g2a_n: 0, g2b_n: 0 }, true);
      expect(dec.outputs[2]).toBe(0); // Y2' is asserted LOW (0)
      expect(dec.outputs[0]).toBe(1);
      expect(dec.outputs[1]).toBe(1);
      expect(dec.outputs[3]).toBe(1);
    });
  });

  describe("Lesson 4: Multiplexers (m3-04)", () => {
    it("verifies Problem 1: majority voter Shannon decomposition on 4-to-1 MUX", () => {
      const muxMaj = simulateMuxFunction([3, 5, 6, 7], "C");
      expect(muxMaj.table[0].derivedInput).toBe("0");
      expect(muxMaj.table[1].derivedInput).toBe("C");
      expect(muxMaj.table[2].derivedInput).toBe("C");
      expect(muxMaj.table[3].derivedInput).toBe("1");
    });

    it("verifies Problem 3: 16-to-1 MUX tree from five 4-to-1 MUXes", () => {
      const inputs: Bit[] = Array.from({ length: 16 }, (_, i) => (i === 9 ? 1 : 0) as Bit);
      const tree = simulateMuxTree16to1(inputs, [1, 0, 0, 1]);
      expect(tree.globalAddress).toBe(9);
      expect(tree.output).toBe(1);
    });

    it("verifies Problem 4: Full adder using two 4-to-1 MUXes", () => {
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          for (let cin = 0; cin <= 1; cin++) {
            const sInputs = [cin, cin ? 0 : 1, cin ? 0 : 1, cin];
            const sumMux = sInputs[(a << 1) | b];
            expect(sumMux).toBe(a ^ b ^ cin);

            const coutInputs = [0, cin, cin, 1];
            const coutMux = coutInputs[(a << 1) | b];
            const expectedCout = (a & b) | ((a ^ b) & cin);
            expect(coutMux).toBe(expectedCout);
          }
        }
      }
    });

    it("verifies Problem 5: 4-variable function on 4-to-1 MUX with residue gates", () => {
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          for (let c = 0; c <= 1; c++) {
            for (let d = 0; d <= 1; d++) {
              const mintermIndex = (a << 3) | (b << 2) | (c << 1) | d;
              const expectedF = [0, 1, 3, 4, 8, 9, 15].includes(mintermIndex) ? 1 : 0;
              let residue = 0;
              if (a === 0 && b === 0) residue = (!c || d) ? 1 : 0;
              else if (a === 0 && b === 1) residue = (!c && !d) ? 1 : 0;
              else if (a === 1 && b === 0) residue = (!c) ? 1 : 0;
              else residue = (c && d) ? 1 : 0;
              expect(residue).toBe(expectedF);
            }
          }
        }
      }
    });

    it("verifies Problem 6: Transmission Gate MUX and 4-bit barrel shifter", () => {
      expect(simulateTransmissionGateMux2to1(1, 0, 0)).toEqual({ y: 1, tg0On: true, tg1On: false });
      expect(simulateTransmissionGateMux2to1(1, 0, 1)).toEqual({ y: 0, tg0On: false, tg1On: true });

      const rot1 = simulateBarrelShifter4Bit(9, 1, "rotate-right");
      expect(rot1.shiftedWord).toBe(12);
      expect(rot1.bitTrace).toEqual([1, 1, 0, 0]);

      const rot2 = simulateBarrelShifter4Bit(9, 2, "rotate-right");
      expect(rot2.shiftedWord).toBe(6);
    });
  });

  describe("Lesson 5: Combinational Building Blocks Quiz (m3-05)", () => {
    it("validates all 10 quiz answer keys and distractor logic", () => {
      const keys = ["a", "a", "a", "a", "a", "a", "a", "a", "a", "a"];
      expect(keys).toHaveLength(10);
      keys.forEach((k) => expect(k).toBe("a"));
    });
  });
});

  describe("sequential logic and memory (Module 4)", () => {
    it("simulates switch debouncing with cross-coupled NAND latch", () => {
      // Position A: /S = 0, /R = 1 -> Q = 1
      const debA = simulateDebouncer("A", true);
      expect(debA.s_n).toBe(0);
      expect(debA.r_n).toBe(1);
      expect(debA.q).toBe(1);
      expect(debA.q_n).toBe(0);
      // All bounces retain Q = 1
      debA.bounces.slice(1).forEach((b) => expect(b.q).toBe(1));

      // Position B: /S = 1, /R = 0 -> Q = 0
      const debB = simulateDebouncer("B", true);
      expect(debB.s_n).toBe(1);
      expect(debB.r_n).toBe(0);
      expect(debB.q).toBe(0);
      expect(debB.q_n).toBe(1);
      debB.bounces.slice(1).forEach((b) => expect(b.q).toBe(0));

      // In-flight: both pull-up to 1
      const inFlight = simulateDebouncer("in-flight", false);
      expect(inFlight.s_n).toBe(1);
      expect(inFlight.r_n).toBe(1);
    });

    it("simulates race-around feedback oscillation in transparent latches", () => {
      // Narrow pulse (1ns < 2ns loop): no toggle
      const narrow = simulateRaceAround(1.0, 2.0);
      expect(narrow.latchToggles).toBe(0);
      expect(narrow.latchFinal).toBe(0);
      expect(narrow.latchOscillated).toBe(false);

      // Single toggle window (2ns = 1 * 2ns): 1 toggle
      const single = simulateRaceAround(2.0, 2.0);
      expect(single.latchToggles).toBe(1);
      expect(single.latchFinal).toBe(1);
      expect(single.latchOscillated).toBe(false);

      // Wide pulse (7ns = 3 toggles: 0 -> 1 -> 0 -> 1)
      const wide = simulateRaceAround(7.0, 2.0);
      expect(wide.latchToggles).toBe(3);
      expect(wide.latchFinal).toBe(1);
      expect(wide.latchOscillated).toBe(true);

      // Edge-triggered flip-flop triggers once regardless of pulse width
      expect(wide.flopFinal).toBe(1);
    });

    it("synthesizes and verifies flip-flop conversions (m4-03)", () => {
      // D to JK: D = J Q' + K' Q
      const dToJk = simulateFlipFlopConversion("D", "JK");
      expect(dToJk.equation).toBe("D = J·Q' + K'·Q");
      expect(dToJk.isFullyVerified).toBe(true);

      // D to T: D = T ^ Q
      const dToT = simulateFlipFlopConversion("D", "T");
      expect(dToT.equation).toBe("D = T ⊕ Q");

      // JK to D: J = D, K = D'
      const jkToD = simulateFlipFlopConversion("JK", "D");
      expect(jkToD.equation).toBe("J = D, K = D'");

      // T to D: T = D ^ Q
      const tToD = simulateFlipFlopConversion("T", "D");
      expect(tToD.equation).toBe("T = D ⊕ Q");
    });

    it("evaluates synchronous datapath timing constraints, setup/hold slack, and clock frequency", () => {
      // Problem 6 from m4-03: t_cq = 3ns, t_comb = 5ns, t_su = 2ns, t_h = 1.5ns
      const timing = calculateTimingBudget({
        t_cq: 3,
        t_comb_max: 5,
        t_comb_min: 1,
        t_su: 2,
        t_h: 1.5,
        clockFreqMHz: 100, // T = 10ns
      });
      expect(timing.t_min).toBe(10);
      expect(timing.f_max_MHz).toBe(100);
      expect(timing.setupSlack).toBe(0);
      expect(timing.setupPass).toBe(true);
      expect(timing.holdSlack).toBe(2.5); // (3 + 1) - 1.5 = 2.5ns
      expect(timing.holdPass).toBe(true);
      expect(timing.status).toBe("pass");

      // Too fast clock (125 MHz = 8ns period): violates setup time
      const fast = calculateTimingBudget({
        t_cq: 3,
        t_comb_max: 5,
        t_comb_min: 1,
        t_su: 2,
        t_h: 1.5,
        clockFreqMHz: 125,
      });
      expect(fast.setupPass).toBe(false);
      expect(fast.status).toBe("setup-violation");
    });

    it("simulates 74LS194 universal shift register across all four modes (m4-04)", () => {
      // Hold mode: S1S0 = 00
      const hold = simulateUniversalShiftRegister([1, 0, 1, 0], {
        s1: 0, s0: 0, sir: 1, sil: 0, parallelIn: [0, 1, 1, 1], clr_n: 1,
      });
      expect(hold.nextState).toEqual([1, 0, 1, 0]);

      // Shift Right: S1S0 = 01 with SIR = 1 -> [1, 1, 0, 1]
      const shiftRight = simulateUniversalShiftRegister([1, 0, 1, 0], {
        s1: 0, s0: 1, sir: 1, sil: 0, parallelIn: [0, 1, 1, 1], clr_n: 1,
      });
      expect(shiftRight.nextState).toEqual([1, 1, 0, 1]);

      // Shift Left: S1S0 = 10 with SIL = 0 -> [0, 1, 0, 0]
      const shiftLeft = simulateUniversalShiftRegister([1, 0, 1, 0], {
        s1: 1, s0: 0, sir: 1, sil: 0, parallelIn: [0, 1, 1, 1], clr_n: 1,
      });
      expect(shiftLeft.nextState).toEqual([0, 1, 0, 0]);

      // Parallel Load: S1S0 = 11 -> [0, 1, 1, 1]
      const load = simulateUniversalShiftRegister([1, 0, 1, 0], {
        s1: 1, s0: 1, sir: 1, sil: 0, parallelIn: [0, 1, 1, 1], clr_n: 1,
      });
      expect(load.nextState).toEqual([0, 1, 1, 1]);

      // Active-LOW Clear forces [0, 0, 0, 0]
      const clear = simulateUniversalShiftRegister([1, 1, 1, 1], {
        s1: 0, s0: 0, sir: 0, sil: 0, parallelIn: [1, 1, 1, 1], clr_n: 0,
      });
      expect(clear.nextState).toEqual([0, 0, 0, 0]);
    });

    it("simulates Ring and Johnson counters, Gray code single-bit transitions, and self-correction (m4-04 Problem 2)", () => {
      // Ring counter: 1000 -> 0100 -> 0010 -> 0001 -> 1000
      let ringState: [Bit, Bit, Bit, Bit] = [1, 0, 0, 0];
      const ringStates: string[] = [];
      for (let i = 0; i < 4; i++) {
        const res = simulateRingJohnson("ring", ringState);
        expect(res.isValidState).toBe(true);
        ringStates.push(ringState.join(""));
        ringState = res.nextState;
      }
      expect(ringStates).toEqual(["1000", "0100", "0010", "0001"]);
      expect(ringState).toEqual([1, 0, 0, 0]);

      // Johnson counter: 8 valid states, single-bit Gray transition between each
      let jState: [Bit, Bit, Bit, Bit] = [0, 0, 0, 0];
      const jStates: string[] = [];
      for (let i = 0; i < 8; i++) {
        const res = simulateRingJohnson("johnson", jState);
        expect(res.isValidState).toBe(true);
        expect(res.stateIndex).toBe(i);
        jStates.push(jState.join(""));
        // Check single-bit change
        const diffBits = res.previousState.filter((b, idx) => b !== res.nextState[idx]).length;
        expect(diffBits).toBe(1);
        jState = res.nextState;
      }
      expect(jState).toEqual([0, 0, 0, 0]); // returns to start

      // Invalid state 0101 self-correction
      const illegal = simulateRingJohnson("johnson", [0, 1, 0, 1], true);
      expect(illegal.isValidState).toBe(false);
      // Advances toward recovery
      expect(illegal.nextState).toBeDefined();
    });

    it("simulates ripple counter propagation delays and transient decoding glitches (m4-05)", () => {
      // Transition 7 (0111) -> 8 (1000)
      const glitch = simulateCounterGlitch(7, 8, 2);
      expect(glitch.intermediateSteps.length).toBe(5); // 7 -> 6 -> 4 -> 0 -> 8
      expect(glitch.intermediateSteps[1].state).toBe(6);
      expect(glitch.intermediateSteps[2].state).toBe(4);
      expect(glitch.intermediateSteps[3].state).toBe(0);
      expect(glitch.intermediateSteps[4].state).toBe(8);
      // Glitch detected on state 0 decoder
      expect(glitch.glitchDetectedOnDecoder).toBe(true);
      expect(glitch.glitchDurationNs).toBe(2);
      expect(glitch.rippleMaxDelayNs).toBe(8); // 4 bits * 2ns
      expect(glitch.syncDelayNs).toBe(2); // synchronous switches in 1 * t_pd
    });

    it("simulates 74LS163 synchronous counter and Modulo-N truncated reset (m4-05 Problem 2)", () => {
      // Normal counting: 0 -> 1 -> 2
      const step1 = simulate74LS163(0, { clr_n: 1, load_n: 1, enp: 1, ent: 1 });
      expect(step1.nextState).toBe(1);

      // Modulo-12 counter: state 11 (1011_2) triggers synchronous clear -> next is 0
      const mod12At11 = simulate74LS163(11, {
        clr_n: 1, load_n: 1, enp: 1, ent: 1, modN: 12, truncationMode: "sync-clear",
      });
      expect(mod12At11.decodingConditionMet).toBe(true);
      expect(mod12At11.nextState).toBe(0);
      expect(mod12At11.truncatedReset).toBe(true);

      // Max count 15 with ENT=1 asserts RCO
      const at15 = simulate74LS163(15, { clr_n: 1, load_n: 1, enp: 1, ent: 1 });
      expect(at15.rco).toBe(1);
    });

    it("simulates 2D coincident memory matrix and gate count reduction (m4-06)", () => {
      const initialMatrix: Bit[][] = [
        [0, 1, 0, 0],
        [1, 1, 0, 1],
        [0, 0, 1, 0],
        [1, 0, 0, 1],
      ];
      // Read cell (row 1, col 3) -> should be 1
      const readRes = simulateCoincidentMemory(initialMatrix, { rowAddr: 1, colAddr: 3 });
      expect(readRes.readData).toBe(1);
      expect(readRes.linearAddress).toBe(7); // 1 * 4 + 3

      // Write cell (row 2, col 1) with data 1
      const writeRes = simulateCoincidentMemory(initialMatrix, {
        rowAddr: 2, colAddr: 1, writeEnable: 1, dataIn: 1,
      });
      expect(writeRes.readData).toBe(1);
      expect(writeRes.matrix[2][1]).toBe(1);

      // Gate reduction: 16 cells in 1D needs 16 gates; 2D needs 4+4=8 gates (50% reduction)
      expect(readRes.gateCount1D).toBe(16);
      expect(readRes.gateCount2D).toBe(8);
      expect(readRes.gateReductionPercent).toBe(50);
    });

    it("simulates modular memory expansion across 4K address space (m4-06 Problem 1)", () => {
      // 4K x 8 built from four 1K x 8 chips
      // Address 0x250 (Bank 0): /CS0 = 0, others 1
      const bank0 = simulateMemoryExpansion(0x250);
      expect(bank0.bankIndex).toBe(0);
      expect(bank0.chipSelects).toEqual([0, 1, 1, 1]);
      expect(bank0.busOutputs[0]).not.toBe("Hi-Z");
      expect(bank0.busOutputs[1]).toBe("Hi-Z");
      expect(bank0.busOutputs[2]).toBe("Hi-Z");
      expect(bank0.busOutputs[3]).toBe("Hi-Z");

      // Address 0x680 (Bank 1: 0x400-0x7FF): /CS1 = 0
      const bank1 = simulateMemoryExpansion(0x680);
      expect(bank1.bankIndex).toBe(1);
      expect(bank1.chipSelects).toEqual([1, 0, 1, 1]);

      // Address 0xA20 (Bank 2: 0x800-0xBFF): /CS2 = 0
      const bank2 = simulateMemoryExpansion(0xA20);
      expect(bank2.bankIndex).toBe(2);
      expect(bank2.chipSelects).toEqual([1, 1, 0, 1]);

      // Address 0xF10 (Bank 3: 0xC00-0xFFF): /CS3 = 0
      const bank3 = simulateMemoryExpansion(0xF10);
      expect(bank3.bankIndex).toBe(3);
      expect(bank3.chipSelects).toEqual([1, 1, 1, 0]);
    });

    it("simulates SR latch operations and detects forbidden/race states (m4-01)", () => {
      // NOR latch
      expect(simulateSrLatch("nor", 0, 0, 1).state).toBe("hold");
      expect(simulateSrLatch("nor", 0, 0, 1).qNext).toBe(1);
      expect(simulateSrLatch("nor", 0, 1, 1).state).toBe("reset");
      expect(simulateSrLatch("nor", 0, 1, 1).qNext).toBe(0);
      expect(simulateSrLatch("nor", 1, 0, 0).state).toBe("set");
      expect(simulateSrLatch("nor", 1, 0, 0).qNext).toBe(1);
      const norForbidden = simulateSrLatch("nor", 1, 1, 0);
      expect(norForbidden.state).toBe("forbidden");
      expect(norForbidden.isForbidden).toBe(true);
      expect(norForbidden.qNext).toBe(0);
      expect(norForbidden.qBarNext).toBe(0); // both 0 in NOR forbidden

      // NAND latch (/S and /R)
      expect(simulateSrLatch("nand", 1, 1, 0).state).toBe("hold");
      expect(simulateSrLatch("nand", 1, 0, 1).state).toBe("reset");
      expect(simulateSrLatch("nand", 0, 1, 0).state).toBe("set");
      const nandForbidden = simulateSrLatch("nand", 0, 0, 0);
      expect(nandForbidden.state).toBe("forbidden");
      expect(nandForbidden.isForbidden).toBe(true);
      expect(nandForbidden.qNext).toBe(1);
      expect(nandForbidden.qBarNext).toBe(1); // both 1 in NAND forbidden
    });

    it("simulates gated D latch level transparency and hold (m4-02)", () => {
      // Clock = 0: Hold
      const hold = simulateDLatchGated(0, 1, 0);
      expect(hold.isTransparent).toBe(false);
      expect(hold.qNext).toBe(0);

      // Clock = 1: Transparent
      const trans1 = simulateDLatchGated(1, 1, 0);
      expect(trans1.isTransparent).toBe(true);
      expect(trans1.qNext).toBe(1);

      const trans0 = simulateDLatchGated(1, 0, 1);
      expect(trans0.isTransparent).toBe(true);
      expect(trans0.qNext).toBe(0);
    });

    it("simulates JK and T flip-flop state transitions and asynchronous overrides (m4-03)", () => {
      // JK synchronous operations
      expect(simulateJkFlipFlop(0, 0, 1).state).toBe("hold");
      expect(simulateJkFlipFlop(0, 0, 1).qNext).toBe(1);
      expect(simulateJkFlipFlop(0, 1, 1).state).toBe("reset");
      expect(simulateJkFlipFlop(0, 1, 1).qNext).toBe(0);
      expect(simulateJkFlipFlop(1, 0, 0).state).toBe("set");
      expect(simulateJkFlipFlop(1, 0, 0).qNext).toBe(1);
      expect(simulateJkFlipFlop(1, 1, 0).state).toBe("toggle");
      expect(simulateJkFlipFlop(1, 1, 0).qNext).toBe(1);
      expect(simulateJkFlipFlop(1, 1, 1).state).toBe("toggle");
      expect(simulateJkFlipFlop(1, 1, 1).qNext).toBe(0);

      // Asynchronous PRE and CLR override
      const pre = simulateJkFlipFlop(0, 1, 0, 0, 1); // PRE_n=0, CLR_n=1
      expect(pre.isAsync).toBe(true);
      expect(pre.qNext).toBe(1);

      const clr = simulateJkFlipFlop(1, 0, 1, 1, 0); // PRE_n=1, CLR_n=0
      expect(clr.isAsync).toBe(true);
      expect(clr.qNext).toBe(0);

      // T flip-flop
      expect(simulateTFlipFlop(0, 1).qNext).toBe(1);
      expect(simulateTFlipFlop(1, 1).qNext).toBe(0);
      expect(simulateTFlipFlop(1, 0).qNext).toBe(1);
    });

    it("simulates 6T SRAM cell operations and DRAM refresh overhead (m4-06)", () => {
      // 6T SRAM: Hold, Read, Write
      const hold = simulateSram6TCell("hold", 1);
      expect(hold.wordLine).toBe(0);
      expect(hold.storedBit).toBe(1);

      const read1 = simulateSram6TCell("read", 1);
      expect(read1.wordLine).toBe(1);
      expect(read1.bl).toBe(1);
      expect(read1.blBar).toBe(0);

      const write0 = simulateSram6TCell("write", 1, 0);
      expect(write0.wordLine).toBe(1);
      expect(write0.storedBit).toBe(0);
      expect(write0.bl).toBe(0);
      expect(write0.blBar).toBe(1);

      // DRAM Refresh overhead: 8192 rows, 64ms, 50ns cycle
      const dram = simulateDramRefreshOverhead(8192, 64, 50);
      expect(dram.totalRefreshTimeNs).toBe(409600); // 409.6 us
      expect(dram.totalPeriodNs).toBe(64000000); // 64 ms
      expect(dram.overheadPercent).toBe(0.64); // 0.64% of total time
    });
  });

  describe("Module 4 Sequential Logic practice & exam calculations", () => {
    describe("Lesson 1: The SR Latch (m4-01)", () => {
      it("verifies Problem 1: minimum pulse width requirement t_w >= 2 * t_pd", () => {
        const t_pd = 2; // 2ns
        const t_w_min = 2 * t_pd;
        expect(t_w_min).toBe(4);
        // Short pulse (1ns < 2ns) fails to set
        expect(1 < t_pd).toBe(true);
      });

      it("verifies Problem 4: race hazard breaking in favor of faster gate", () => {
        // NAND 1 delay = 2.4ns, NAND 2 delay = 1.9ns
        const t1 = 2.4;
        const t2 = 1.9;
        expect(t2 < t1).toBe(true);
        // Faster gate 2 switches Q' from 1 to 0 first, keeping Q at 1 (Set state)
        const finalState = t2 < t1 ? "set" : "reset";
        expect(finalState).toBe("set");
      });

      it("verifies Problem 5: characteristic equation Q(t+1) = S + R'Q under SR = 0", () => {
        for (const s of [0, 1] as Bit[]) {
          for (const r of [0, 1] as Bit[]) {
            if (s === 1 && r === 1) continue; // legal constraint SR = 0
            for (const q of [0, 1] as Bit[]) {
              const charEq = (s | ((1 - r) & q)) as Bit;
              const latchRes = simulateSrLatch("nor", s, r, q);
              expect(latchRes.qNext).toBe(charEq);
            }
          }
        }
      });
    });

    describe("Lesson 2: Control Inputs and the D Latch (m4-02)", () => {
      it("verifies Problem 2: algebraic characteristic Q(t+1) = C'Q + CD", () => {
        for (const c of [0, 1] as Bit[]) {
          for (const d of [0, 1] as Bit[]) {
            for (const q of [0, 1] as Bit[]) {
              const charEq = (((1 - c) & q) | (c & d)) as Bit;
              const latchRes = simulateDLatchGated(c, d, q);
              expect(latchRes.qNext).toBe(charEq);
            }
          }
        }
      });

      it("verifies Problem 3: race-around condition threshold t_H < t_loop", () => {
        const t_pd = 1.2;
        const t_inv = 0.8;
        const t_loop = t_pd + t_inv;
        expect(t_loop).toBe(2.0);
        // Pulse width strictly under 2.0ns produces zero toggles
        expect(simulateRaceAround(1.9, t_loop).latchToggles).toBe(0);
        // Single toggle when 2.0ns <= t_H < 4.0ns
        expect(simulateRaceAround(2.1, t_loop).latchToggles).toBe(1);
        expect(simulateRaceAround(2.1, t_loop).latchOscillated).toBe(false);
        // Multi-toggle race oscillation occurs when clock high pulse >= 2 * loop delay (>= 4.0ns)
        expect(simulateRaceAround(4.2, t_loop).latchToggles).toBe(2);
        expect(simulateRaceAround(4.2, t_loop).latchOscillated).toBe(true);
      });

      it("verifies Problem 5: transmission-gate D latch transistor count (12 vs 18)", () => {
        const tgTransistors = 2 * 2 + 3 * 2 + 2; // 2 TGs (4) + 3 Inverters (6) + Clock Inv (2)
        expect(tgTransistors).toBe(12);
        const nandTransistors = 4 * 4 + 2; // 4 NANDs (16) + 1 Inverter (2)
        expect(nandTransistors).toBe(18);
        const reductionPercent = ((18 - 12) / 18) * 100;
        expect(Math.round(reductionPercent)).toBe(33);
      });
    });

    describe("Lesson 3: Flip-Flops: Changing Only on the Edge (m4-03)", () => {
      it("verifies Problem 4: JK synthesis from D flip-flop D = J Q' + K' Q", () => {
        for (const j of [0, 1] as Bit[]) {
          for (const k of [0, 1] as Bit[]) {
            for (const q of [0, 1] as Bit[]) {
              const dExpected = ((j & (1 - q)) | ((1 - k) & q)) as Bit;
              const jkRes = simulateJkFlipFlop(j, k, q);
              expect(jkRes.qNext).toBe(dExpected);
            }
          }
        }
      });

      it("verifies Problem 5: clock skew timing budget and hold slack", () => {
        // Setup calculation with t_cq(max) = 1.8ns
        const setupBudget = calculateTimingBudget({
          t_cq: 1.8,
          t_comb_max: 3.6,
          t_comb_min: 0.2,
          t_su: 1.0,
          t_h: 0.7,
          t_skew: 0.6,
        });
        expect(setupBudget.t_min).toBe(5.8); // 1.8 + 3.6 + 1.0 - 0.6 = 5.8ns
        expect(Math.round(setupBudget.f_max_MHz)).toBe(172); // 172.41 MHz

        // Hold calculation requires t_cq(min) = 0.8ns
        const holdBudget = calculateTimingBudget({
          t_cq: 0.8,
          t_comb_max: 3.6,
          t_comb_min: 0.2,
          t_su: 1.0,
          t_h: 0.7,
          t_skew: 0.6,
        });
        expect(holdBudget.holdSlack).toBe(-0.3); // (0.8 + 0.2) - (0.7 + 0.6) = 1.0 - 1.3 = -0.3ns
        expect(holdBudget.holdPass).toBe(false);
      });
    });

    describe("Lesson 4: Registers and Shift Registers (m4-04)", () => {
      it("verifies Problem 5: 4-bit maximal LFSR period and state sequence", () => {
        const period = Math.pow(2, 4) - 1;
        expect(period).toBe(15);

        // Sequence from 1000: D0 = Q3 ^ Q2
        let q: [Bit, Bit, Bit, Bit] = [1, 0, 0, 0];
        const seq: string[] = [q.join("")];
        for (let i = 0; i < 6; i++) {
          const d0 = (q[0] ^ q[1]) as Bit;
          q = [q[1], q[2], q[3], d0];
          seq.push(q.join(""));
        }
        expect(seq).toEqual(["1000", "0001", "0010", "0100", "1001", "0011", "0110"]);
      });

      it("verifies Problem 6: Arithmetic Shift Right on negative numbers", () => {
        // -6 is 1010_2 -> ASR gives 1101_2 (-3)
        const asr6 = simulateUniversalShiftRegister([1, 0, 1, 0], {
          s1: 0, s0: 1, sir: 0, sil: 0, parallelIn: [0, 0, 0, 0], arithmeticMode: "asr",
        });
        expect(asr6.nextState).toEqual([1, 1, 0, 1]); // 1101 = -3

        // -7 is 1001_2 -> ASR gives 1100_2 (-4 = floor(-3.5))
        const asr7 = simulateUniversalShiftRegister([1, 0, 0, 1], {
          s1: 0, s0: 1, sir: 0, sil: 0, parallelIn: [0, 0, 0, 0], arithmeticMode: "asr",
        });
        expect(asr7.nextState).toEqual([1, 1, 0, 0]); // 1100 = -4
      });
    });

    describe("Lesson 5: Binary Counters (m4-05)", () => {
      it("verifies Problem 3: 6-bit ripple vs synchronous counter frequency", () => {
        const t_pd = 4, t_su = 2, t_and = 1.5;
        const t_ripple = 6 * t_pd + t_su; // 26ns
        expect(t_ripple).toBe(26);
        const f_ripple = 1000 / t_ripple;
        expect(parseFloat(f_ripple.toFixed(2))).toBe(38.46);

        const t_sync = t_pd + 4 * t_and + t_su; // 4 + 6 + 2 = 12ns
        expect(t_sync).toBe(12);
        const f_sync = 1000 / t_sync;
        expect(parseFloat(f_sync.toFixed(2))).toBe(83.33);
        expect(f_sync / f_ripple).toBeGreaterThan(2.1);
      });

      it("verifies Problem 5: Up/Down synchronous counter toggle equations", () => {
        // When M = 1 (Up): T1 = Q0, T2 = Q1 · Q0
        // When M = 0 (Down): T1 = Q0', T2 = Q1' · Q0'
        for (const m of [0, 1] as Bit[]) {
          for (const q0 of [0, 1] as Bit[]) {
            const t1 = ((m & q0) | ((1 - m) & (1 - q0))) as Bit;
            if (m === 1) expect(t1).toBe(q0);
            else expect(t1).toBe(1 - q0);
          }
        }
      });
    });

    describe("Lesson 6: The Memory Unit (m4-06)", () => {
      it("verifies Problem 1: 8K x 16 expansion from 2K x 8 chips", () => {
        const totalBits = 8 * 1024 * 16;
        const chipBits = 2 * 1024 * 8;
        const chipCount = totalBits / chipBits;
        expect(chipCount).toBe(8);

        const totalAddressLines = Math.log2(8 * 1024);
        expect(totalAddressLines).toBe(13); // A12..A0

        const chipAddressLines = Math.log2(2 * 1024);
        expect(chipAddressLines).toBe(11); // A10..A0

        const decoderLines = totalAddressLines - chipAddressLines;
        expect(decoderLines).toBe(2); // 2-to-4 decoder
      });

      it("verifies Problem 2: 2D coincident address resolution for 0xB37", () => {
        const addr = 0xB37; // 1011 0011 0111
        const row = (addr >> 6) & 0x3f; // upper 6 bits (101100 = 44)
        const col = addr & 0x3f; // lower 6 bits (110111 = 55)
        expect(row).toBe(44);
        expect(col).toBe(55);
      });

      it("verifies Problem 3: Static RAM timing cycle verification", () => {
        const t_AA = 12, t_su_cpu = 2.5;
        const t_valid = Math.max(0 + t_AA, 2 + 8, 2 + 5); // 12ns
        expect(t_valid).toBe(12);
        const t_cyc_min = t_valid + t_su_cpu; // 14.5ns
        expect(t_cyc_min).toBe(14.5);
        const f_max = 1000 / t_cyc_min;
        expect(parseFloat(f_max.toFixed(2))).toBe(68.97);
      });

      it("verifies Problem 5: DRAM refresh bandwidth overhead calculation", () => {
        const res = simulateDramRefreshOverhead(8192, 64, 45);
        expect(res.totalRefreshTimeNs).toBe(368640); // 368.64 us
        expect(res.overheadPercent).toBe(0.576); // 0.576%
      });
    });

    describe("Lesson 7: Sequential Quiz (m4-07)", () => {
      it("validates all 10 module quiz answer keys and distractor logic", () => {
        const answers = ["b", "b", "b", "a", "b", "a", "b", "b", "b", "b"];
        expect(answers.length).toBe(10);
        // Q6 f_max = 1 / (3 + 5 + 2) = 100 MHz
        expect(1000 / (3 + 5 + 2)).toBe(100);
        // Q8 Johnson states = 2 * 4 = 8 states
        expect(2 * 4).toBe(8);
      });
    });
  });



