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
  HISTORIES,
  isLinearizable,
  isSequential,
  partitionFrames,
  PARTITION_CODE,
  quorum,
  replicationFrames,
  REPLICATION_CODE,
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

describe("replication", () => {
  const end = (mode: "sync" | "async", crash: boolean) => replicationFrames(mode, crash).at(-1)!.state;

  it("ends with every replica agreeing when nothing crashes", () => {
    for (const mode of ["sync", "async"] as const) expect(end(mode, false).replicas.map((r) => r.value)).toEqual([2, 2, 2]);
  });

  it("lets a follower serve a stale read only under async replication", () => {
    const readOf = (mode: "sync" | "async") => replicationFrames(mode, false).find((fr) => fr.state.client.startsWith("read"))!.state.client;
    expect(readOf("sync")).toBe("read x → 2");
    expect(readOf("async")).toBe("read x → 1");
  });

  it("confirms only after every follower has the write when synchronous", () => {
    const ok = replicationFrames("sync", false).find((fr) => fr.state.acked)!;
    expect(ok.state.replicas.every((r) => r.value === 2)).toBe(true);
    const okAsync = replicationFrames("async", false).find((fr) => fr.state.acked)!;
    expect(okAsync.state.replicas.filter((r) => r.value === 2)).toHaveLength(1);
  });

  it("loses a confirmed write on failover only under async replication", () => {
    expect(end("async", true).client).toBe("read x → 1");
    expect(end("sync", true).client).toBe("read x → 2");
    for (const mode of ["sync", "async"] as const) {
      const r = end(mode, true).replicas;
      expect(r[0].down).toBe(true);
      expect(r.filter((x) => x.leader && !x.down)).toHaveLength(1);
    }
  });

  it("only highlights real lines", () => {
    for (const mode of ["sync", "async"] as const) for (const crash of [false, true]) {
      for (const fr of replicationFrames(mode, crash)) expect(fr.line).toBeLessThan(REPLICATION_CODE.length);
    }
  });
});

describe("quorums", () => {
  it("guarantees a fresh read exactly when R + W > N, even in the worst case", () => {
    for (let n = 1; n <= 7; n++) for (let w = 1; w <= n; w++) for (let r = 1; r <= n; r++) {
      const q = quorum(n, w, r);
      expect(q.guaranteed, `${n} ${w} ${r}`).toBe(r + w > n);
      expect(q.fresh, `${n} ${w} ${r}`).toBe(r + w > n);
      expect(q.overlap).toBe(Math.max(0, r + w - n));
    }
  });

  it("can still be lucky without the guarantee", () => {
    const q = quorum(5, 2, 2, [0, 4]);
    expect(q.guaranteed).toBe(false);
    expect(q.fresh).toBe(true);
  });
});

describe("consistency models", () => {
  const verdicts = Object.fromEntries(HISTORIES.map((h) => [h.id, [isLinearizable(h.ops), isSequential(h.ops)]]));

  it("classifies the lesson's histories as the lesson says", () => {
    expect(verdicts).toEqual({
      fresh: [true, true],
      stale: [false, true],
      flip: [false, true],
      "own-write": [false, false],
    });
  });

  it("never calls something linearizable that isn't sequentially consistent", () => {
    for (const h of HISTORIES) if (isLinearizable(h.ops)) expect(isSequential(h.ops), h.id).toBe(true);
  });

  it("allows either value for a read that overlaps the write", () => {
    const during = (v: number) => [
      { client: "A", kind: "w" as const, value: 1, start: 0, end: 4 },
      { client: "B", kind: "r" as const, value: v, start: 1, end: 2 },
    ];
    expect(isLinearizable(during(0))).toBe(true);
    expect(isLinearizable(during(1))).toBe(true);
    expect(isLinearizable(during(7))).toBe(false);
  });
});

describe("partitions", () => {
  const last = (m: "CP" | "AP") => partitionFrames(m).at(-1)!;

  it("CP: refuses on the minority side, never conflicts, and converges after healing", () => {
    expect(last("CP").state).toMatchObject({ values: [2, 2, 2], conflict: false, cut: false });
    expect(last("CP").stats).toMatchObject({ errors: 2, "stale reads": 0 });
  });

  it("AP: always answers, serves a stale read, and ends with a conflict to resolve", () => {
    expect(last("AP").state).toMatchObject({ values: [2, 2, 3], conflict: true, cut: false });
    expect(last("AP").stats).toMatchObject({ errors: 0, "stale reads": 1 });
  });

  it("only highlights real lines", () => {
    for (const m of ["CP", "AP"] as const) for (const fr of partitionFrames(m)) expect(fr.line).toBeLessThan(PARTITION_CODE.length);
  });
});
