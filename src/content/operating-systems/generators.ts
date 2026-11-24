/* Generated questions for Operating Systems: fresh processes every time, answers from the
   same schedule() the lessons' CPU scheduler runs. Format: docs/exams.md. */

import { buildOptions, randomInt, type QuestionGenerator } from "@/lib/questions";
import { schedule, type Proc } from "@/lib/operatingSystems";

const BASICS = "cpu-scheduling-basics";

/** 3 or 4 processes, all arriving at time 0, with different burst times. */
function randomProcs(random: () => number): Proc[] {
  const n = randomInt(random, 3, 4);
  const bursts = new Set<number>();
  while (bursts.size < n) bursts.add(randomInt(random, 1, 12));
  return [...bursts].map((burst, i) => ({ name: `P${i + 1}`, arrival: 0, burst }));
}

/** An average, written the way the lessons write it: 17, 5.5 or 7.33. */
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));

/** The average waiting time if the longest burst ran first, the worst order: a tempting backwards SJF. */
const longestFirst = (procs: Proc[]) => schedule([...procs].sort((a, b) => b.burst - a.burst), "fcfs").avgWaiting;

const table = (procs: Proc[]) => procs.map((p) => `${p.name} = ${p.burst}`).join(", ");

export const generators: QuestionGenerator[] = [
  {
    id: "operating-systems/cpu-scheduling-basics/gen-fcfs-waiting",
    lesson: BASICS,
    section: "first-come-first-served-fcfs",
    generate(random) {
      const procs = randomProcs(random);
      const fcfs = schedule(procs, "fcfs");
      const sjf = schedule(procs, "sjf");
      const total = fcfs.stats.reduce((s, x) => s + x.waiting, 0);
      return {
        prompt: `Processes arrive at time 0 in the order ${procs.map((p) => p.name).join(", ")}, with burst times ${table(procs)}. What is the average waiting time under FCFS?`,
        ...buildOptions(fmt(fcfs.avgWaiting), [fmt(fcfs.avgTurnaround), fmt(sjf.avgWaiting), String(total), fmt(total / (procs.length - 1)), fmt(longestFirst(procs)), fmt(fcfs.avgWaiting + 1), fmt(fcfs.avgWaiting + 2), fmt(fcfs.avgWaiting + 0.5)], random),
        explanation: `FCFS runs them in arrival order, so each waits for everyone ahead of it: ${fcfs.stats.map((s) => `${s.name} waits ${s.waiting}`).join(", ")}. Average: (${fcfs.stats.map((s) => s.waiting).join(" + ")}) / ${procs.length} = ${fmt(fcfs.avgWaiting)}. ${fmt(fcfs.avgTurnaround)} is the average turnaround, which also counts each process's own burst, and ${fmt(sjf.avgWaiting)} is what SJF would give.`,
        difficulty: 1,
      };
    },
  },
  {
    id: "operating-systems/cpu-scheduling-basics/gen-sjf-waiting",
    lesson: BASICS,
    section: "shortest-job-first-sjf",
    generate(random) {
      const procs = randomProcs(random);
      const sjf = schedule(procs, "sjf");
      const fcfs = schedule(procs, "fcfs");
      const order = [...procs].sort((a, b) => a.burst - b.burst);
      const total = sjf.stats.reduce((s, x) => s + x.waiting, 0);
      return {
        prompt: `Processes ${procs.map((p) => p.name).join(", ")} all arrive at time 0, with burst times ${table(procs)}. What is the average waiting time under non-preemptive SJF?`,
        ...buildOptions(fmt(sjf.avgWaiting), [fmt(fcfs.avgWaiting), fmt(sjf.avgTurnaround), fmt(longestFirst(procs)), String(total), fmt(total / (procs.length - 1)), fmt(sjf.avgWaiting + 1), fmt(sjf.avgWaiting + 2), fmt(sjf.avgWaiting + 0.5)], random),
        explanation: `SJF runs the shortest burst first: ${order.map((p) => p.name).join(", ")}. Waiting times: ${order.map((p) => `${p.name} ${sjf.stats.find((s) => s.name === p.name)!.waiting}`).join(", ")}. Average: ${total} / ${procs.length} = ${fmt(sjf.avgWaiting)}, the smallest any order can give. ${fmt(fcfs.avgWaiting)} is FCFS in the listed order, and ${fmt(sjf.avgTurnaround)} is SJF's average turnaround.`,
        difficulty: 1,
      };
    },
  },
  {
    id: "operating-systems/round-robin-and-beyond/gen-rr-completion",
    lesson: "round-robin-and-beyond",
    section: "round-robin-rr",
    generate(random) {
      const procs = randomProcs(random);
      const q = randomInt(random, 2, 4);
      const rr = schedule(procs, "rr", q);
      const fcfs = schedule(procs, "fcfs");
      // ask about a process that gets preempted at least once, so the quantum matters
      const target = procs.find((p) => p.burst > q) ?? procs[procs.length - 1];
      const done = rr.stats.find((s) => s.name === target.name)!.completion;
      const fcfsDone = fcfs.stats.find((s) => s.name === target.name)!.completion;
      const slices = rr.slices.filter((s) => s.name).map((s) => `${s.name} ${s.from}-${s.to}`).join(", ");
      return {
        prompt: `Processes arrive at time 0 in the order ${procs.map((p) => p.name).join(", ")}, with burst times ${table(procs)}. Under Round Robin with quantum ${q}, at what time does ${target.name} finish?`,
        ...buildOptions(String(done), [String(fcfsDone), String(done - target.burst), String(done + q), String(done - q), String(done + 1), String(done + 2)], random),
        explanation: `Each process runs for at most ${q}, then goes to the back of the queue. The Gantt chart: ${slices}. ${target.name}'s last slice ends at ${done}. ${fcfsDone} is when it would finish under FCFS, and ${done - target.burst} is its waiting time, not its finish time.`,
        difficulty: 2,
      };
    },
  },
];
