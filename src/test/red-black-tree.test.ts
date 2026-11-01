import { describe, it, expect } from "vitest";
import { RBTree, rbFrames, rng } from "@/lib/advancedAlgorithms";

describe("red-black tree", () => {
  it("stays valid through random inserts and deletes", () => {
    const r = rng(42);
    for (let trial = 0; trial < 30; trial++) {
      const t = new RBTree();
      const keys = new Set<number>();
      for (let i = 0; i < 60; i++) {
        const k = Math.floor(r() * 200);
        if (!keys.has(k)) { t.insert(k); keys.add(k); }
        t.check();
      }
      expect(t.inorder()).toEqual([...keys].sort((a, b) => a - b));
      for (const k of [...keys].sort(() => r() - 0.5).slice(0, 40)) {
        t.delete(k); keys.delete(k);
        t.check();
        expect(t.inorder()).toEqual([...keys].sort((a, b) => a - b));
      }
      expect(t.height()).toBeLessThanOrEqual(2 * Math.log2(keys.size + 1) + 1e-9);
    }
  });

  it("deletion example hits every fix-up case", () => {
    // the example used in the deletion lesson
    const f = rbFrames([5, 25, 10, 20, 90, 80, 40, 55, 70, 95], [25, 5, 80, 10].map((key) => ({ op: "delete" as const, key })));
    const got = new Set(f.map((x) => x.state.caseLabel).filter(Boolean));
    for (const c of ["x red", "Sibling red", "Both nephews black", "Red nephew"]) expect(got).toContain(c);
  });

  it("uses the insertion cases on the textbook example (insert 15)", () => {
    const f = rbFrames([7, 3, 18, 10, 22, 8, 11, 26], [{ op: "insert", key: 15 }]);
    const cases = f.map((x) => x.state.caseLabel).filter(Boolean);
    // the lecture: recolor, RIGHT-ROTATE(18), then LEFT-ROTATE(7) and recolor
    expect([...new Set(cases)]).toEqual(["Case 1", "Case 2", "Case 3"]);
    const last = f.at(-1)!.state;
    const root = last.nodes.find((n) => n.id === last.root)!;
    expect(root.key).toBe(10);
  });
});
