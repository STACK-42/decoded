/* Logic for the Distributed Systems course. Pure functions; the visualizers in
   src/components/mdx/DistributedVisualizers.tsx draw them. */

import type { Frame } from "@/lib/algorithms";

const f = <S>(state: S, line: number, message: string, stats: Record<string, number> = {}): Frame<S> => ({ state, line, message, stats });

/* ================================ partial failure ================================ */

/** What can happen to one request from a client to a payment server. */
export type FailureScenario = "ok" | "request-lost" | "crash-before" | "crash-after" | "reply-lost" | "slow";
/** What the client does when its timer runs out. */
export type RetryMode = "give-up" | "retry" | "retry-with-key";

export const SCENARIOS: [FailureScenario, string][] = [
  ["ok", "All goes well"],
  ["request-lost", "Request lost"],
  ["crash-before", "Server crashes first"],
  ["crash-after", "Server crashes after"],
  ["reply-lost", "Reply lost"],
  ["slow", "Server is slow"],
];

/** Where a message is: not sent, on the wire, delivered, or dropped. */
export type MsgState = "none" | "out" | "in" | "lost";
export type FailureState = {
  attempt: 1 | 2;
  request: MsgState;
  reply: MsgState;
  server: "up" | "working" | "crashed";
  client: "waiting" | "done" | "timeout" | "gave-up";
  charges: number;
};

/** The client's code, highlighted line by line in the visualizer. */
export const CLIENT_CODE = [
  "send(charge $10)",
  "wait for a reply, at most 2 s",
  "if a reply came: done",
  "timeout: did the charge happen?",
  "retry: send(charge $10) again",
  "wait for a reply",
];

/**
 * Step through one request under a failure scenario. The point: every failure looks
 * the same to the client (silence), yet the server may or may not have done the work,
 * so a blind retry can do it twice. An idempotency key lets the server spot the repeat.
 */
export function partialFailureFrames(scenario: FailureScenario, mode: RetryMode): Frame<FailureState>[] {
  const frames: Frame<FailureState>[] = [];
  let s: FailureState = { attempt: 1, request: "none", reply: "none", server: "up", client: "waiting", charges: 0 };
  const push = (patch: Partial<FailureState>, line: number, message: string) => {
    s = { ...s, ...patch };
    frames.push(f(s, line, message, { charges: s.charges, attempts: s.attempt }));
  };

  push({ request: "out" }, 0, "The client sends \"charge $10\" and starts a 2-second timer.");

  switch (scenario) {
    case "ok":
      push({ request: "in", server: "working" }, 1, "The request arrives and the server starts the charge.");
      push({ server: "up", charges: 1, reply: "out" }, 1, "The server charges the card once and sends back \"done\".");
      push({ reply: "in", client: "done" }, 2, "The reply arrives before the timer runs out. The client knows exactly what happened.");
      return frames;
    case "request-lost":
      push({ request: "lost" }, 1, "A router drops the request. The server never hears about it.");
      break;
    case "crash-before":
      push({ request: "in", server: "crashed" }, 1, "The request arrives, but the server crashes before doing anything.");
      break;
    case "crash-after":
      push({ request: "in", server: "working" }, 1, "The request arrives and the server starts the charge.");
      push({ charges: 1 }, 1, "The card is charged...");
      push({ server: "crashed" }, 1, "...and the server crashes before it can reply.");
      break;
    case "reply-lost":
      push({ request: "in", server: "working" }, 1, "The request arrives and the server starts the charge.");
      push({ server: "up", charges: 1, reply: "out" }, 1, "The server charges the card and sends back \"done\".");
      push({ reply: "lost" }, 1, "A router drops the reply.");
      break;
    case "slow":
      push({ request: "in", server: "working" }, 1, "The request arrives, but the server is overloaded and the charge is taking a while.");
      break;
  }

  const charged = s.charges > 0;
  push({ client: "timeout" }, 3, `2 seconds pass with no reply. The client sees silence, exactly as it would in every other failure. In this case the card ${charged ? "was" : "was not"} charged${scenario === "slow" ? " yet, but the server is still working on it" : ""}, and the client has no way to tell.`);

  if (scenario === "slow") {
    push({ server: "up", charges: s.charges + 1, reply: "out" }, 3, "The slow server finishes: the card is charged, and a late \"done\" heads back.");
    push({ reply: "in" }, 3, "The late reply arrives after the client has stopped waiting for it.");
  }

  if (mode === "give-up") {
    push({ client: "gave-up" }, 3, s.charges > 0
      ? `The client reports "payment failed", but the card was charged ${s.charges === 1 ? "once" : `${s.charges} times`}. The customer pays for an order the shop thinks failed.`
      : "The client reports \"payment failed\", and this time that's true. From the client's side it looked identical to the cases where it wasn't.");
    return frames;
  }

  const withKey = mode === "retry-with-key";
  const before = s.charges;
  push({ attempt: 2, request: "out", reply: "none", client: "waiting", server: "up" }, 4, withKey
    ? "The client sends the same request again, with the same idempotency key (\"order-7f3a\") as the first try."
    : "The client sends the same request again. The server has recovered by now.");
  const repeat = withKey && before > 0;
  push({ request: "in", server: "working" }, 5, repeat
    ? "The server looks up key order-7f3a, sees it already charged that order, and doesn't charge again."
    : "The retry arrives and the server starts a charge.");
  push({ server: "up", charges: repeat ? before : before + 1, reply: "out" }, 5, repeat ? "It sends back the result it stored the first time: \"done\"." : `The server charges the card and replies "done".`);
  push({ reply: "in", client: "done" }, 2, s.charges === 1
    ? `Done, and the card was charged exactly once.${withKey ? " The key turned a risky retry into a safe one." : ""}`
    : `Done, but the card was charged ${s.charges} times. The retry repeated work the server had already done.`);
  return frames;
}

/* ================================ logical clocks ================================ */

/** One event on one process. A receive names the send it matches. */
export type ClockEvent = { id: string; proc: number; kind: "local" | "send" | "recv"; from?: string };

export const PROCS = ["A", "B", "C"];

/**
 * Three processes swapping three messages, listed in the order they actually ran.
 * m1: a2 → b1, m2: b2 → c2, m3: c3 → a3.
 */
export const CLOCK_EVENTS: ClockEvent[] = [
  { id: "a1", proc: 0, kind: "local" },
  { id: "c1", proc: 2, kind: "local" },
  { id: "a2", proc: 0, kind: "send" },
  { id: "b1", proc: 1, kind: "recv", from: "a2" },
  { id: "b2", proc: 1, kind: "send" },
  { id: "b3", proc: 1, kind: "local" },
  { id: "c2", proc: 2, kind: "recv", from: "b2" },
  { id: "c3", proc: 2, kind: "send" },
  { id: "a3", proc: 0, kind: "recv", from: "c3" },
];

export const LAMPORT_CODE = [
  "local event or send:  C = C + 1",
  "send(m):  m.time = C",
  "receive(m):  C = max(C, m.time) + 1",
];

export type LamportState = { clocks: number[]; stamps: Record<string, number>; current: string | null };

/** Lamport timestamps for a list of events in execution order. */
export function lamportStamps(events: ClockEvent[], procs = PROCS.length): Record<string, number> {
  const clocks = Array(procs).fill(0);
  const stamps: Record<string, number> = {};
  for (const e of events) {
    clocks[e.proc] = e.kind === "recv" ? Math.max(clocks[e.proc], stamps[e.from!]) + 1 : clocks[e.proc] + 1;
    stamps[e.id] = clocks[e.proc];
  }
  return stamps;
}

export function lamportFrames(events: ClockEvent[] = CLOCK_EVENTS): Frame<LamportState>[] {
  const clocks = Array(PROCS.length).fill(0);
  const stamps: Record<string, number> = {};
  const frames: Frame<LamportState>[] = [f({ clocks: [...clocks], stamps: {}, current: null }, 0, "Every process starts its counter at 0. There is no shared clock.")];
  for (const e of events) {
    const p = PROCS[e.proc];
    const before = clocks[e.proc];
    let line: number, msg: string;
    if (e.kind === "recv") {
      const t = stamps[e.from!];
      clocks[e.proc] = Math.max(before, t) + 1;
      line = 2;
      msg = `${e.id}: ${p} receives a message stamped ${t}. Its own counter is ${before}, so it jumps to max(${before}, ${t}) + 1 = ${clocks[e.proc]}.`;
    } else {
      clocks[e.proc] = before + 1;
      line = e.kind === "send" ? 1 : 0;
      msg = e.kind === "send"
        ? `${e.id}: ${p} ticks to ${clocks[e.proc]} and sends a message carrying that number.`
        : `${e.id}: ${p} does some local work and ticks from ${before} to ${clocks[e.proc]}.`;
    }
    stamps[e.id] = clocks[e.proc];
    frames.push(f({ clocks: [...clocks], stamps: { ...stamps }, current: e.id }, line, msg, { events: Object.keys(stamps).length }));
  }
  frames.push(f({ clocks: [...clocks], stamps: { ...stamps }, current: null }, 2, "Done. Every arrow goes from a smaller number to a bigger one. But look at b3 and c2: both are 5, and neither caused the other.", { events: events.length }));
  return frames;
}

/* ---------------------------------- vectors ---------------------------------- */

export const VECTOR_CODE = [
  "local event or send:  V[me] = V[me] + 1",
  "send(m):  m.v = copy of V",
  "receive(m):  V = max(V, m.v); V[me] += 1",
];

export type VectorState = { clocks: number[][]; stamps: Record<string, number[]>; current: string | null };

/** Vector timestamps for a list of events in execution order. */
export function vectorStamps(events: ClockEvent[], procs = PROCS.length): Record<string, number[]> {
  const clocks = Array.from({ length: procs }, () => Array(procs).fill(0));
  const stamps: Record<string, number[]> = {};
  for (const e of events) {
    const v = clocks[e.proc];
    if (e.kind === "recv") stamps[e.from!].forEach((x, i) => (v[i] = Math.max(v[i], x)));
    v[e.proc] += 1;
    stamps[e.id] = [...v];
  }
  return stamps;
}

export const formatVector = (v: number[]) => `[${v.join(",")}]`;

export function vectorFrames(events: ClockEvent[] = CLOCK_EVENTS): Frame<VectorState>[] {
  const n = PROCS.length;
  const clocks = Array.from({ length: n }, () => Array(n).fill(0));
  const stamps: Record<string, number[]> = {};
  const snap = (current: string | null): VectorState => ({ clocks: clocks.map((v) => [...v]), stamps: { ...stamps }, current });
  const frames: Frame<VectorState>[] = [f(snap(null), 0, "Each process keeps one counter per process, all starting at 0: [A, B, C].")];
  for (const e of events) {
    const p = PROCS[e.proc];
    const v = clocks[e.proc];
    const before = formatVector(v);
    let line: number, msg: string;
    if (e.kind === "recv") {
      const m = stamps[e.from!];
      m.forEach((x, i) => (v[i] = Math.max(v[i], x)));
      v[e.proc] += 1;
      line = 2;
      msg = `${e.id}: ${p} receives ${formatVector(m)}. It takes the bigger of each entry against its own ${before}, then adds 1 to its own entry: ${formatVector(v)}.`;
    } else {
      v[e.proc] += 1;
      line = e.kind === "send" ? 1 : 0;
      msg = e.kind === "send"
        ? `${e.id}: ${p} adds 1 to its own entry and sends a copy of ${formatVector(v)} with the message.`
        : `${e.id}: ${p} does local work and adds 1 to its own entry: ${formatVector(v)}.`;
    }
    stamps[e.id] = [...v];
    frames.push(f(snap(e.id), line, msg, { events: Object.keys(stamps).length }));
  }
  frames.push(f(snap(null), 2, "Done. Now b3 = [2,3,0] and c2 = [2,2,2]: each is bigger in one entry, so the vectors show they're concurrent.", { events: events.length }));
  return frames;
}

export type Order = "before" | "after" | "concurrent" | "equal";

/** How event a relates to event b, read from their vector timestamps. */
export function compareVectors(a: number[], b: number[]): Order {
  let less = false;
  let more = false;
  a.forEach((x, i) => {
    if (x < b[i]) less = true;
    if (x > b[i]) more = true;
  });
  if (less && more) return "concurrent";
  if (less) return "before";
  if (more) return "after";
  return "equal";
}

/**
 * The happened-before relation computed straight from its definition, for checking
 * the clocks: same process and earlier, or a send and its receive, closed under
 * transitivity.
 */
export function happenedBefore(events: ClockEvent[]): Set<string> {
  const ids = events.map((e) => e.id);
  const rel = new Set<string>();
  events.forEach((e, i) => {
    const next = events.slice(i + 1).find((x) => x.proc === e.proc);
    if (next) rel.add(`${e.id}>${next.id}`);
    if (e.kind === "recv") rel.add(`${e.from}>${e.id}`);
  });
  for (const k of ids) for (const i of ids) for (const j of ids) {
    if (rel.has(`${i}>${k}`) && rel.has(`${k}>${j}`)) rel.add(`${i}>${j}`);
  }
  return rel;
}


/* ================================ replication ================================ */

export type ReplicationMode = "sync" | "async";
export type Replica = { name: string; value: number; leader: boolean; down: boolean };
export type ReplicationState = { replicas: Replica[]; inflight: number[]; client: string; acked: boolean };

export const REPLICATION_CODE = [
  "client: write x = 2 to leader",
  "leader: apply, send to followers",
  "sync: wait for all acks, then ok",
  "async: ok now, followers catch up",
  "client: read x from a follower",
  "leader crashes: promote follower",
];

/**
 * A leader and two followers. A client writes x = 2, then reads from a follower.
 * Optionally the leader crashes right after confirming, and a follower takes over.
 */
export function replicationFrames(mode: ReplicationMode, crash: boolean): Frame<ReplicationState>[] {
  const frames: Frame<ReplicationState>[] = [];
  let s: ReplicationState = {
    replicas: [
      { name: "leader", value: 1, leader: true, down: false },
      { name: "follower 1", value: 1, leader: false, down: false },
      { name: "follower 2", value: 1, leader: false, down: false },
    ],
    inflight: [],
    client: "",
    acked: false,
  };
  let rtts = 0;
  const set = (i: number, patch: Partial<Replica>) => s.replicas.map((r, k) => (k === i ? { ...r, ...patch } : r));
  const push = (patch: Partial<ReplicationState>, line: number, message: string) => {
    s = { ...s, ...patch };
    frames.push(f(s, line, message, { "round trips before ok": rtts, "copies of x = 2": s.replicas.filter((r) => !r.down && r.value === 2).length }));
  };

  push({ client: "write x = 2" }, 0, "Every replica holds x = 1. The client sends \"x = 2\" to the leader, the only replica that accepts writes.");
  push({ replicas: set(0, { value: 2 }), inflight: [1, 2] }, 1, "The leader applies the write to its own copy and sends it to both followers.");
  if (mode === "sync") {
    push({ replicas: set(1, { value: 2 }), inflight: [2] }, 2, "Follower 1 applies it and acknowledges.");
    rtts = 1;
    push({ replicas: set(2, { value: 2 }), inflight: [] }, 2, "Follower 2 is farther away, so its ack takes longer. The leader waits for it.");
    push({ acked: true, client: "ok" }, 2, "Only now does the leader tell the client \"ok\". The write is on all three machines, at the cost of waiting for the slowest follower.");
  } else {
    push({ acked: true, client: "ok" }, 3, "The leader tells the client \"ok\" straight away, without waiting. Fast, but for now the write exists on only one machine.");
    if (!crash) push({ replicas: set(1, { value: 2 }), inflight: [2] }, 3, "Follower 1 catches up quickly. Follower 2 is lagging behind.");
  }

  if (crash) {
    push({ replicas: set(0, { down: true }), inflight: [] }, 5, mode === "async"
      ? "The leader crashes before either copy reaches a follower. Both copies are lost with it."
      : "The leader crashes. Every follower already has x = 2.");
    const replicas = s.replicas.map((r, k) => (k === 1 ? { ...r, leader: true } : k === 0 ? { ...r, leader: false } : r));
    push({ replicas }, 5, mode === "async"
      ? "Follower 1 is promoted to leader. It's as up to date as any surviving replica, but it never got x = 2. The write the client was told succeeded is gone."
      : "Follower 1 is promoted to leader. It has x = 2, so the confirmed write survives the crash.");
    const v = s.replicas[1].value;
    push({ client: `read x → ${v}` }, 4, v === 2 ? "The client reads x = 2 from the new leader. Nothing was lost." : "The client reads x = 1 from the new leader. Its confirmed write has been lost.");
    return frames;
  }

  const v = s.replicas[2].value;
  push({ client: `read x → ${v}` }, 4, v === 2
    ? "The client reads from follower 2 and gets x = 2, its own write."
    : "The client reads from follower 2 and gets x = 1, older than the write it was just told succeeded. That's replication lag.");
  if (mode === "async") {
    push({ replicas: set(2, { value: 2 }), inflight: [] }, 3, "A moment later follower 2 catches up. Everyone agrees again: the replicas are eventually consistent.");
  }
  return frames;
}

/* ================================ quorums ================================ */

export type QuorumResult = { written: boolean[]; read: boolean[]; overlap: number; fresh: boolean; guaranteed: boolean };

/**
 * N replicas; a write reaches the first W; a read asks R of them. The read picks the
 * worst case, the R replicas least likely to have the write (the last R), unless the
 * caller gives its own choice.
 */
export function quorum(n: number, w: number, r: number, readSet?: number[]): QuorumResult {
  const written = Array.from({ length: n }, (_, i) => i < w);
  const chosen = readSet ?? Array.from({ length: r }, (_, i) => n - 1 - i);
  const read = Array.from({ length: n }, (_, i) => chosen.includes(i));
  const overlap = read.filter((x, i) => x && written[i]).length;
  return { written, read, overlap, fresh: overlap > 0, guaranteed: r + w > n };
}

/* ================================ consistency models ================================ */

/** One operation on a single register x (initially 0), with real-time start and end. */
export type Op = { client: string; kind: "w" | "r"; value: number; start: number; end: number };
export type History = { id: string; title: string; ops: Op[]; note: string };

export const HISTORIES: History[] = [
  {
    id: "fresh",
    title: "Read after the write",
    ops: [
      { client: "A", kind: "w", value: 1, start: 0, end: 2 },
      { client: "B", kind: "r", value: 1, start: 3, end: 4 },
    ],
    note: "A's write finishes, then B reads the new value. The system behaves like one copy.",
  },
  {
    id: "stale",
    title: "Stale read",
    ops: [
      { client: "A", kind: "w", value: 1, start: 0, end: 2 },
      { client: "B", kind: "r", value: 0, start: 3, end: 4 },
    ],
    note: "B starts reading after A's write finished, and still sees 0, as if from a lagging follower. One copy could never do that, so it isn't linearizable. It is sequentially consistent: B's read can be placed before A's write, because nothing ties two different clients to real time.",
  },
  {
    id: "flip",
    title: "New, then old",
    ops: [
      { client: "A", kind: "w", value: 1, start: 0, end: 5 },
      { client: "B", kind: "r", value: 1, start: 1, end: 2 },
      { client: "C", kind: "r", value: 0, start: 3, end: 4 },
    ],
    note: "While A's write is in progress, B sees the new value and then C, starting later, sees the old one. A read may return either value during the write, but once anyone has seen 1, a later read must too. Not linearizable; sequentially consistent (order C, A, B).",
  },
  {
    id: "own-write",
    title: "Lost your own write",
    ops: [
      { client: "A", kind: "w", value: 1, start: 0, end: 1 },
      { client: "A", kind: "r", value: 0, start: 2, end: 3 },
    ],
    note: "A writes 1 and then reads 0. Even the weakest model that respects each client's own order rules this out. It breaks read-your-writes, so it's neither linearizable nor sequentially consistent.",
  },
];

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** Does this order of operations behave like one register? Each read returns the last write before it (or 0). */
const legal = (order: Op[]) => {
  let x = 0;
  for (const op of order) {
    if (op.kind === "w") x = op.value;
    else if (op.value !== x) return false;
  }
  return true;
};

/** Linearizable: some legal order that also respects real time (if a ends before b starts, a comes first). */
export function isLinearizable(ops: Op[]): boolean {
  return permutations(ops).some((p) => legal(p) && p.every((a, i) => p.slice(0, i).every((b) => !(a.end < b.start))));
}

/** Sequentially consistent: some legal order that keeps each client's own operations in their order. */
export function isSequential(ops: Op[]): boolean {
  return permutations(ops).some((p) => legal(p) && p.every((a, i) => p.slice(0, i).every((b) => !(a.client === b.client && a.start < b.start))));
}

/* ================================ partitions ================================ */

export type PartitionMode = "CP" | "AP";
export type PartitionState = { values: number[]; cut: boolean; note: [string, string]; conflict: boolean };

export const PARTITION_CODE = [
  "all three nodes hold x = 1",
  "the network splits: {N1, N2} | {N3}",
  "client 1 writes x = 2 through N1",
  "client 2 reads x through N3",
  "client 2 writes x = 3 through N3",
  "the network heals",
];

/**
 * Three replicas, split into a majority {N1, N2} and a minority {N3}. A CP system serves
 * only where it can reach a majority; an AP system answers everywhere and fixes things up
 * after the partition heals.
 */
export function partitionFrames(mode: PartitionMode): Frame<PartitionState>[] {
  const frames: Frame<PartitionState>[] = [];
  let errors = 0;
  let stale = 0;
  let s: PartitionState = { values: [1, 1, 1], cut: false, note: ["", ""], conflict: false };
  const push = (patch: Partial<PartitionState>, line: number, message: string) => {
    s = { ...s, ...patch };
    frames.push(f(s, line, message, { errors, "stale reads": stale }));
  };
  const cp = mode === "CP";

  push({}, 0, "Three replicas hold x = 1. Client 1 talks to N1, client 2 talks to N3.");
  push({ cut: true }, 1, "A link fails. N1 and N2 can still talk to each other, but neither can reach N3. Nobody knows whether N3 has crashed or is just cut off.");
  push({ values: [2, 2, 1], note: ["write x = 2 → ok", ""] }, 2, `Client 1 writes x = 2 through N1. N1 and N2 are a majority (2 of 3), so ${cp ? "the write is safe to accept" : "the write is accepted"}. N3 can't hear about it.`);
  if (cp) {
    errors++;
    push({ note: ["write x = 2 → ok", "read x → error"] }, 3, "Client 2 reads through N3. N3 can't reach a majority, so it can't be sure x = 1 is current. A CP system refuses: an error, but never a wrong answer.");
    errors++;
    push({ note: ["write x = 2 → ok", "write x = 3 → error"] }, 4, "Client 2 tries to write x = 3. N3 refuses again. On this side of the split the service is unavailable.");
    push({ cut: false, values: [2, 2, 2], note: ["", ""] }, 5, "The network heals. N3 learns about x = 2 and catches up. There's nothing to reconcile: only one side ever accepted writes.");
  } else {
    stale++;
    push({ note: ["write x = 2 → ok", "read x → 1"] }, 3, "Client 2 reads through N3 and gets x = 1. An AP system always answers, so this answer is stale.");
    push({ values: [2, 2, 3], note: ["write x = 2 → ok", "write x = 3 → ok"], conflict: true }, 4, "Client 2 writes x = 3, and N3 accepts it. Both sides have now accepted different writes to the same key.");
    push({ cut: false, note: ["", ""] }, 5, "The network heals and the nodes compare notes: x = 2 on one side, x = 3 on the other, and neither saw the other. A real conflict. The system has to merge them, keep both as siblings, or pick one with last-write-wins and lose the other.");
  }
  return frames;
}
