import { describe, it, expect } from "vitest";
import {
  bitString, counterStep, divisionSteps, evalExpr, evalGate, floatParts, fromGray, fullAdd, jkNext, latchVersusFlipFlop, lookaheadCarries, minimizeSop, onesComplement,
  posFromMinterms, rippleAdd, sameFunction, settle, shiftFrames, signedValue, sopFromMinterms, toBase, toExcess3, toGray, truthRows, twosComplement, type Bit, type NetGate,
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
