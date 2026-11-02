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

