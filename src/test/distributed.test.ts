import { describe, expect, it } from "vitest";
import {
  CLIENT_CODE,
  CLOCK_EVENTS,
  compareVectors,
  happenedBefore,
  lamportFrames,
  lamportStamps,
  LAMPORT_CODE,
  partialFailureFrames,
  SCENARIOS,
  vectorFrames,
  vectorStamps,
  VECTOR_CODE,
  type RetryMode,
} from "@/lib/distributed";

describe("partial failure", () => {
  const final = (scenario: Parameters<typeof partialFailureFrames>[0], mode: RetryMode) => partialFailureFrames(scenario, mode).at(-1)!.state;

  it("charges once and needs no timeout when nothing goes wrong", () => {
    for (const mode of ["give-up", "retry", "retry-with-key"] as RetryMode[]) {
      const frames = partialFailureFrames("ok", mode);
      expect(frames.some((fr) => fr.state.client === "timeout")).toBe(false);
      expect(frames.at(-1)!.state).toMatchObject({ client: "done", charges: 1, attempt: 1 });
    }
  });

  it("looks the same to the client in every failure: a timeout with no reply", () => {
    for (const [scenario] of SCENARIOS.filter(([s]) => s !== "ok")) {
      const at = partialFailureFrames(scenario, "give-up").find((fr) => fr.state.client === "timeout")!;
      expect(at, scenario).toBeTruthy();
      expect(at.state.reply === "in", scenario).toBe(false);
    }
  });

  it("charges the right number of times when the client gives up", () => {
    expect(final("request-lost", "give-up").charges).toBe(0);
    expect(final("crash-before", "give-up").charges).toBe(0);
    expect(final("crash-after", "give-up").charges).toBe(1);
    expect(final("reply-lost", "give-up").charges).toBe(1);
    expect(final("slow", "give-up").charges).toBe(1);
  });

  it("double-charges on a blind retry exactly when the first try did the work", () => {
    expect(final("request-lost", "retry").charges).toBe(1);
    expect(final("crash-before", "retry").charges).toBe(1);
    expect(final("crash-after", "retry").charges).toBe(2);
    expect(final("reply-lost", "retry").charges).toBe(2);
    expect(final("slow", "retry").charges).toBe(2);
  });

  it("charges exactly once in every case with an idempotency key", () => {
    for (const [scenario] of SCENARIOS) {
      expect(final(scenario, "retry-with-key"), scenario).toMatchObject({ charges: 1, client: "done" });
    }
  });

  it("only highlights real lines of the client code", () => {
    for (const [scenario] of SCENARIOS) for (const mode of ["give-up", "retry", "retry-with-key"] as RetryMode[]) {
      for (const fr of partialFailureFrames(scenario, mode)) expect(fr.line).toBeLessThan(CLIENT_CODE.length);
    }
  });
});

describe("Lamport clocks", () => {
  const stamps = lamportStamps(CLOCK_EVENTS);

  it("stamps the example as worked in the lesson", () => {
    expect(stamps).toEqual({ a1: 1, c1: 1, a2: 2, b1: 3, b2: 4, b3: 5, c2: 5, c3: 6, a3: 7 });
  });

  it("gives every happened-before pair increasing timestamps (the clock condition)", () => {
    for (const pair of happenedBefore(CLOCK_EVENTS)) {
      const [a, b] = pair.split(">");
      expect(stamps[a], pair).toBeLessThan(stamps[b]);
    }
  });

  it("can give smaller numbers to events that are concurrent, so the converse fails", () => {
    const hb = happenedBefore(CLOCK_EVENTS);
    expect(stamps.c1).toBeLessThan(stamps.b1);
    expect(hb.has("c1>b1") || hb.has("b1>c1")).toBe(false);
  });

  it("matches the frames and ends on the final stamps", () => {
    const frames = lamportFrames();
    expect(frames.at(-1)!.state.stamps).toEqual(stamps);
    expect(frames.at(-1)!.state.clocks).toEqual([7, 5, 6]);
    for (const fr of frames) expect(fr.line).toBeLessThan(LAMPORT_CODE.length);
  });
});

describe("vector clocks", () => {
  const stamps = vectorStamps(CLOCK_EVENTS);

  it("stamps the example as worked in the lesson", () => {
    expect(stamps).toEqual({
      a1: [1, 0, 0], c1: [0, 0, 1], a2: [2, 0, 0], b1: [2, 1, 0], b2: [2, 2, 0],
      b3: [2, 3, 0], c2: [2, 2, 2], c3: [2, 2, 3], a3: [3, 2, 3],
    });
  });

  it("captures happened-before exactly: a → b if and only if V(a) < V(b)", () => {
    const hb = happenedBefore(CLOCK_EVENTS);
    const ids = CLOCK_EVENTS.map((e) => e.id);
    for (const a of ids) for (const b of ids) {
      if (a === b) continue;
      expect(compareVectors(stamps[a], stamps[b]) === "before", `${a} vs ${b}`).toBe(hb.has(`${a}>${b}`));
    }
  });

  it("compares vectors", () => {
    expect(compareVectors([1, 0, 0], [2, 1, 0])).toBe("before");
    expect(compareVectors([2, 1, 0], [1, 0, 0])).toBe("after");
    expect(compareVectors([2, 3, 0], [2, 2, 2])).toBe("concurrent");
    expect(compareVectors([1, 2], [1, 2])).toBe("equal");
  });

  it("matches the frames and ends on the final stamps", () => {
    const frames = vectorFrames();
    expect(frames.at(-1)!.state.stamps).toEqual(stamps);
    expect(frames.at(-1)!.state.clocks).toEqual([[3, 2, 3], [2, 3, 0], [2, 2, 3]]);
    for (const fr of frames) expect(fr.line).toBeLessThan(VECTOR_CODE.length);
  });
});
