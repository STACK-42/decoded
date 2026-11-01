import { useEffect, useId, useMemo, useRef, useState } from "react";
import { btn, inputCls, Legend, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import {
  DEMO_JOBS,
  DUAL_MODE_CODE,
  dualModeFrames,
  INTERRUPT_CODE,
  INTERRUPT_TIMELINE,
  interruptCount,
  interruptFrames,
  MIGRATION_STEPS,
  runJobs,
  STORAGE_LEVELS,
  type Lane,
  type ModeState,
  BOOT_CODE,
  BOOT_STAGES,
  bootFrames,
  COPY_FILE_CALLS,
  MICROKERNEL_HOPS,
  paramPassing,
  STRUCTURES,
  SYSCALL_CODE,
  SYSCALL_TABLE,
  syscallFrames,
  type BootState,
  type ParamMethod,
  type StructureKind,
  type SyscallState,
  consume,
  contextSwitchFrames,
  forkTree,
  LINUX_TREE,
  messageSim,
  produce,
  PROCESS_TRANSITIONS,
  ring,
  ringCount,
  ringEmpty,
  ringFull,
  SWITCH_CODE,
  type Capacity,
  type ForkNode,
  type PcbView,
  type PState,
  type Ring,
  type SwitchState,
  JAVA_TRANSITIONS,
  type JState,
  matrixAddFrames,
  MATRIX_CODE,
  runThreads,
  type MatrixState,
  type PrintLine,
  compareAndSwap,
  DEADLOCK_CODE,
  deadlockFrames,
  diningDeadlocked,
  diningStart,
  diningStep,
  PETERSON_CODE,
  petersonStart,
  petersonStep,
  RACE_CODE,
  raceRun,
  rwArrive,
  rwLeave,
  rwStart,
  seeded,
  semBuffer,
  semConsume,
  semProduce,
  semSignal,
  semWait,
  testAndSet,
  TEXTBOOK_RACE,
  type DeadlockState,
  type Dining,
  type PetersonState,
  type Phil,
  type RW,
  type Sem,
  type SemBuffer,
  jraceRun,
  jraceSteps,
  monitorEnter,
  monitorExit,
  monitorNotify,
  monitorStart,
  monitorWait,
  type Monitor,
  BURST_SAMPLE,
  expAverage,
  mlfq,
  schedule,
  SCHED_PRESETS,
  switchesFor,
  type Algo,
  type Proc,
  allocate,
  baseLimitCheck,
  compact,
  eat,
  FIT_REQUESTS,
  fitExerciseMemory,
  internalFrag,
  PAGE_EXAMPLE,
  pageTranslate,
  relocate,
  release,
  SEGMENT_TABLE,
  segTranslate,
  splitAddress,
  swapTime,
  tlbRun,
  type Block,
  type Fit,
  BELADY_STRING,
  demandEat,
  faults,
  PAGE_FAULT_CODE,
  pageFaultFrames,
  proportional,
  REF_STRING,
  replace,
  utilization,
  workingSet,
  WS_REFS,
  WS_T1,
  WS_T2,
  type PfState,
  type Repl,
} from "@/lib/operatingSystems";
import { exists, initialShell, promptPath, readFile, run, type ShellState } from "@/lib/miniShell";

/* ============================================================
   Visualizers for the Operating Systems course. They reuse the
   look (and, where it fits, the <Stepper>) of AlgoVisualizers.tsx;
   the logic lives in operatingSystems.ts.
   ============================================================ */

export function Panel({ title, legend, children }: { title: string; legend?: [string, string][]; children: React.ReactNode }) {
  return (
    <div className="not-prose my-8 border border-border bg-card rounded-sm overflow-hidden text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="eyebrow text-mint">{title}</div>
        {legend && <Legend items={legend} />}
      </div>
      <div className="p-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

/** Advance a counter every `ms` while `on`, wrapping at `n`. Drives the small looping animations. */
function useTicker(on: boolean, n: number, ms = 600) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(t);
  }, [on, n, ms]);
  return [i, setI] as const;
}

/* --------------------------- system layers --------------------------- */

const LAYERS = [
  { name: "Users", detail: "people, machines, other computers", tone: "border-sky bg-sky/10" },
  { name: "Application programs", detail: "browser, compiler, word processor, games, databases", tone: "border-violet bg-violet/10" },
  { name: "Operating system", detail: "controls and coordinates the hardware for everyone", tone: "border-mint bg-mint/15" },
  { name: "Hardware", detail: "CPU, memory, I/O devices", tone: "border-orange bg-orange/10" },
];

/** The four components of a computer system, with a request travelling down to the hardware and the answer coming back up. */
export function SystemLayers() {
  const [running, setRunning] = useState(false);
  // 0..3 going down, 4..6 coming back up
  const [step, setStep] = useTicker(running, 7, 650);
  const at = step <= 3 ? step : 6 - step;
  const goingUp = step > 3;
  const notes = [
    "You click 'Save' in an app.",
    "The app can't touch the disk itself, so it asks the operating system.",
    "The OS picks the right device driver and tells the disk controller what to write.",
    "The hardware does the actual work: bits land on the disk.",
    "The hardware reports back to the OS (with an interrupt).",
    "The OS tells the app the save worked.",
    "The app shows you a little 'Saved ✓'.",
  ];
  return (
    <Panel title="Four components of a computer system">
      <div className="flex flex-col gap-2">
        {LAYERS.map((l, i) => (
          <div
            key={l.name}
            className={`relative flex items-center justify-between gap-3 border-l-4 rounded-sm px-4 py-3 transition-all duration-300 ${l.tone} ${
              running && at === i ? "scale-[1.02] shadow-lg ring-1 ring-foreground/30" : "opacity-90"
            }`}
          >
            <div>
              <div className="font-display font-bold">{l.name}</div>
              <div className="text-xs text-muted-foreground">{l.detail}</div>
            </div>
            {running && at === i && (
              <span className="font-mono text-lg animate-bounce" aria-hidden>
                {goingUp ? "▲" : "▼"}
              </span>
            )}
          </div>
        ))}
      </div>
      <p aria-live="polite" className="min-h-[2.5em] text-sm leading-relaxed">
        {running ? notes[step] : "Press play to follow one request from a user, down through the layers to the hardware, and back up."}
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => setRunning((r) => !r)}>
          {running ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button type="button" className={btn} onClick={() => { setRunning(false); setStep(0); }}>
          ⟲ Reset
        </button>
      </div>
    </Panel>
  );
}

/* --------------------------- interrupt timeline --------------------------- */

const LANE_TONE: Record<string, string> = {
  user: "bg-sky",
  isr: "bg-orange",
  idle: "bg-muted",
  transfer: "bg-violet",
};

function TimelineLane({ label, lane, t, length }: { label: string; lane: Lane; t: number; length: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="relative flex-1 h-7 rounded-sm bg-background/60 border border-border overflow-hidden">
        {lane.map((s, i) => {
          const end = Math.min(s.to, t);
          if (end <= s.from) return null;
          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 ${LANE_TONE[s.kind]} transition-all duration-500`}
              style={{ left: `${(s.from / length) * 100}%`, width: `${((end - s.from) / length) * 100}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** The textbook interrupt timeline, revealed step by step. */
export function InterruptTimeline() {
  const frames = useMemo(() => interruptFrames(), []);
  const { length, cpu, io } = INTERRUPT_TIMELINE;
  return (
    <Stepper
      title="Interrupt timeline"
      frames={frames}
      code={INTERRUPT_CODE}
      codeLabel="What happens"
      legend={[["bg-sky", "user process"], ["bg-orange", "interrupt handling"], ["bg-violet", "I/O transfer"], ["bg-muted", "idle"]]}
      render={(s) => (
        <div className="flex flex-col gap-3 min-w-[420px]">
          <TimelineLane label="CPU" lane={cpu} t={s.t} length={length} />
          <TimelineLane label="I/O device" lane={io} t={s.t} length={length} />
          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0" />
            <div className="relative flex-1 h-6">
              <div className="absolute top-0 h-6 w-0.5 bg-foreground transition-all duration-500" style={{ left: `${(s.t / length) * 100}%` }} />
              {s.flash && (
                <span
                  key={`${s.t}-${s.flash}`}
                  className={`absolute -top-1 -translate-x-1/2 font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm animate-in zoom-in-50 fade-in duration-300 ${
                    s.flash === "interrupt" ? "bg-orange text-background" : s.flash === "request" ? "bg-violet text-background" : "bg-sky text-background"
                  }`}
                  style={{ left: `${(s.t / length) * 100}%` }}
                >
                  {s.flash === "interrupt" ? "⚡ interrupt" : s.flash === "request" ? "I/O request" : "resume"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    />
  );
}

/* --------------------------- storage hierarchy --------------------------- */

/** The storage pyramid: click a level for its size, speed and volatility. */
export function StorageHierarchy() {
  const [sel, setSel] = useState(2);
  const lvl = STORAGE_LEVELS[sel];
  const n = STORAGE_LEVELS.length;
  return (
    <Panel title="Storage-device hierarchy" legend={[["bg-orange", "volatile"], ["bg-sky", "nonvolatile"]]}>
      <div className="flex flex-col items-center gap-1">
        {STORAGE_LEVELS.map((l, i) => (
          <button
            key={l.name}
            type="button"
            onClick={() => setSel(i)}
            className={`font-mono text-[11px] sm:text-xs py-2 rounded-sm border transition-all duration-300 ${
              l.volatile ? "border-orange/60 bg-orange/10" : "border-sky/60 bg-sky/10"
            } ${i === sel ? "ring-2 ring-foreground scale-[1.03]" : "hover:scale-[1.01]"}`}
            style={{ width: `${40 + (60 * i) / (n - 1)}%` }}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>▲ faster · smaller · more expensive per byte</span>
        <span>▼ slower · bigger · cheaper per byte</span>
      </div>
      <div key={sel} className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
        {[
          ["typical size", lvl.size],
          ["access time", lvl.access],
          ["volatile?", lvl.volatile ? "yes, lost on power-off" : "no, survives power-off"],
          ["managed by", lvl.managedBy],
        ].map(([k, v]) => (
          <div key={k} className="border border-border rounded-sm p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
            <div className="text-sm mt-1">{v}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Example: {lvl.example}.</p>
    </Panel>
  );
}

const PLACES = ["Magnetic disk", "Main memory", "Cache", "Hardware register"];

/** Integer A climbing from the disk to a CPU register, leaving a copy at every level. */
export function MigrationOfA() {
  const [i, setI] = useState(0);
  const step = MIGRATION_STEPS[i];
  return (
    <Panel title="Migration of integer A from disk to register">
      <div className="grid grid-cols-4 gap-2 items-end">
        {PLACES.map((p, k) => {
          const has = k <= step.at;
          const current = k === step.at;
          const stale = i === MIGRATION_STEPS.length - 1 && k < step.at;
          return (
            <div key={p} className="flex flex-col items-center gap-2">
              <div
                className={`h-16 w-16 sm:h-20 sm:w-20 rounded-sm border-2 flex items-center justify-center font-display text-2xl font-bold transition-all duration-500 ${
                  current ? "border-mint bg-mint/20 scale-110" : has ? (stale ? "border-orange bg-orange/10" : "border-border bg-muted/40") : "border-dashed border-border"
                }`}
              >
                {has && <span className={`animate-in zoom-in-50 duration-300 ${stale ? "text-orange" : ""}`}>{current && i === MIGRATION_STEPS.length - 1 ? "A+1" : "A"}</span>}
              </div>
              <div className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{p}</div>
            </div>
          );
        })}
      </div>
      <p aria-live="polite" className="min-h-[3em] text-sm leading-relaxed">
        {step.message}
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => setI(0)} disabled={i === 0}>
          ⟲ Reset
        </button>
        <button type="button" className={btn} onClick={() => setI((x) => Math.min(MIGRATION_STEPS.length - 1, x + 1))} disabled={i === MIGRATION_STEPS.length - 1}>
          Step →
        </button>
      </div>
    </Panel>
  );
}

/* ------------------------------ DMA ------------------------------ */

/** How many times the CPU gets interrupted moving a file, with and without DMA. */
export function DmaCounter() {
  const [kb, setKb] = useState(4);
  const bytes = kb * 1024;
  const perByte = interruptCount(bytes, "per-byte");
  const dma = interruptCount(bytes, "dma");
  const [tick] = useTicker(true, 12, 180);
  return (
    <Panel title="Interrupts without and with DMA" legend={[["bg-orange", "interrupt to the CPU"], ["bg-violet", "data"]]}>
      <label className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">transfer size</span>
        <input type="range" min={1} max={64} value={kb} onChange={(e) => setKb(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="transfer size in KB" />
        <span className="font-display text-lg font-bold w-20">{kb} KB</span>
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: "One interrupt per byte", count: perByte, every: 1 },
          { label: "DMA: one interrupt per 512-byte block", count: dma, every: 12 },
        ].map((m) => (
          <div key={m.label} className="border border-border rounded-sm p-4 flex flex-col gap-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</div>
            <div className="flex items-center gap-1 h-6">
              {Array.from({ length: 12 }, (_, k) => (
                <span
                  key={k}
                  className={`h-4 w-4 rounded-[2px] transition-colors duration-150 ${
                    k <= tick ? ((k + 1) % m.every === 0 ? "bg-orange" : "bg-violet") : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="font-display text-3xl font-bold">{m.count.toLocaleString("en-US")}</div>
            <div className="text-xs text-muted-foreground">interrupts the CPU must stop for</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        With DMA the device controller copies whole blocks straight into main memory, and the CPU is only told once each block is done. That's {perByte && dma ? Math.round(perByte / dma) : 0}× fewer interruptions here.
      </p>
    </Panel>
  );
}

/* --------------------------- multiprogramming --------------------------- */

const JOB_TONE: Record<string, string> = { A: "bg-sky", B: "bg-violet", C: "bg-orange" };

/** One CPU and three jobs: run them one at a time, or switch whenever a job waits for I/O. */
export function MultiprogrammingDemo() {
  const [mode, setMode] = useState<"single" | "multi">("single");
  const run = useMemo(() => runJobs(DEMO_JOBS, mode), [mode]);
  const longest = useMemo(() => Math.max(runJobs(DEMO_JOBS, "single").total, run.total), [run]);
  const [t, setT] = useState(0);
  useEffect(() => {
    setT(0);
  }, [mode]);
  useEffect(() => {
    if (t >= run.total) return;
    const id = setTimeout(() => setT((x) => x + 1), 160);
    return () => clearTimeout(id);
  }, [t, run.total]);

  const row = (label: string, lane: { from: number; to: number; job: string | null }[], isCpu = false) => (
    <div className="flex items-center gap-3" key={label}>
      <div className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="relative flex-1 h-6 rounded-sm bg-background/60 border border-border overflow-hidden">
        {lane.map((s, i) => {
          const end = Math.min(s.to, t);
          if (end <= s.from) return null;
          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 ${s.job ? JOB_TONE[s.job] : isCpu ? "bg-muted" : ""} ${!isCpu && s.job ? "opacity-50" : ""}`}
              style={{ left: `${(s.from / longest) * 100}%`, width: `${((end - s.from) / longest) * 100}%` }}
            >
              {isCpu && s.job && end - s.from >= 1 && <span className="px-1 font-mono text-[10px] text-background font-bold">{s.job}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Panel title="Multiprogramming keeps the CPU busy" legend={[["bg-sky", "job A"], ["bg-violet", "job B"], ["bg-orange", "job C"], ["bg-muted", "CPU idle"]]}>
      <Toggle<"single" | "multi">
        value={mode}
        onChange={setMode}
        options={[
          ["single", "One job at a time"],
          ["multi", "Multiprogramming"],
        ]}
      />
      <div className="flex flex-col gap-2 overflow-x-auto">
        {row("CPU", run.cpu, true)}
        {DEMO_JOBS.map((j, i) => row(`${j.name} waits I/O`, run.io[i]))}
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>
          time <span className="text-foreground">{Math.min(t, run.total)}</span>/{run.total}
        </span>
        <span>
          CPU utilization <span className="text-foreground">{Math.round(run.utilization * 100)}%</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Each job alternates between using the CPU and waiting for I/O. Run alone, the CPU sits idle (grey) every time the job waits. With multiprogramming the OS switches to another job instead, so the same work finishes sooner.
      </p>
      <button type="button" className={`${btn} self-start`} onClick={() => setT(0)}>
        ⟲ Replay
      </button>
    </Panel>
  );
}

/* ------------------------------ dual mode ------------------------------ */

/** User mode, trap into the kernel, and back again. */
export function DualModeSwitch() {
  const frames = useMemo(() => dualModeFrames(), []);
  return (
    <Stepper
      title="Transition from user to kernel mode"
      frames={frames}
      code={DUAL_MODE_CODE}
      codeLabel="What happens"
      legend={[["bg-sky", "user mode (bit = 1)"], ["bg-orange", "kernel mode (bit = 0)"]]}
      render={(s: ModeState) => (
        <div className="flex flex-col gap-3 min-w-[300px]">
          {(["user", "kernel"] as const).map((zone) => (
            <div
              key={zone}
              className={`relative rounded-sm border-2 px-4 py-4 transition-all duration-500 ${
                s.where === zone ? (zone === "user" ? "border-sky bg-sky/15" : "border-orange bg-orange/15") : "border-border opacity-50"
              }`}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{zone === "user" ? "user mode" : "kernel mode"}</div>
              <div className="font-display font-bold">{zone === "user" ? "user process" : "operating system kernel"}</div>
              {s.where === zone && <span className="absolute right-4 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-foreground animate-ping" aria-hidden />}
            </div>
          ))}
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="uppercase tracking-widest text-[10px] text-muted-foreground">mode bit</span>
            <span key={s.mode} className={`px-3 py-1 rounded-sm font-bold animate-in zoom-in-75 duration-300 ${s.mode ? "bg-sky text-background" : "bg-orange text-background"}`}>
              {s.mode}
            </span>
            {s.arrow && <span className="animate-bounce">{s.arrow === "down" ? "↓ trap" : "↑ return"}</span>}
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------ timer ------------------------------ */

/** A program stuck in an infinite loop, and the timer that takes the CPU back from it. */
export function TimerInterrupt({ slice = 8 }: { slice?: number }) {
  const [on, setOn] = useState(false);
  const [tick, setTick] = useTicker(on, slice + 3, 450);
  const counter = Math.max(0, slice - tick);
  const fired = tick >= slice;
  return (
    <Panel title="The timer takes back control" legend={[["bg-sky", "user program"], ["bg-orange", "operating system"]]}>
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
        <div className={`rounded-sm border-2 p-4 font-mono text-xs transition-colors duration-300 ${fired ? "border-orange bg-orange/10" : "border-sky bg-sky/10"}`}>
          {fired ? (
            <div className="animate-in fade-in duration-300">
              <div className="font-display text-base font-bold">⚡ timer interrupt → OS is back in charge</div>
              <div className="text-muted-foreground mt-1">It can give the CPU to another program, or end this one for going over its time.</div>
            </div>
          ) : (
            <>
              <div>while (true) {"{"}</div>
              <div className="pl-4">
                x = x + 1; <span className={on ? "inline-block animate-spin" : ""}>↻</span>
              </div>
              <div>{"}"}</div>
              <div className="text-muted-foreground mt-1">this loop will never give the CPU back by itself</div>
            </>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">counter</div>
          <div key={counter} className={`font-display text-5xl font-bold w-20 text-center animate-in zoom-in-90 duration-200 ${counter === 0 ? "text-orange" : ""}`}>
            {counter}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Before giving a program the CPU, the OS loads the timer's counter. Every clock tick the counter goes down by one. At zero the timer raises an interrupt, and the OS runs again, no matter what the program was doing.
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => setOn((r) => !r)}>
          {on ? "❚❚ Pause" : "▶ Run the program"}
        </button>
        <button type="button" className={btn} onClick={() => { setOn(false); setTick(0); }}>
          ⟲ Reset
        </button>
      </div>
    </Panel>
  );
}

/* ------------------------------ system calls ------------------------------ */

const SYSCALL_STAGES = [
  { key: "user", label: "user application", sub: "open(\"notes.txt\")", tone: "border-sky bg-sky/10" },
  { key: "api", label: "API / C library", sub: "libc, Win32, Java API", tone: "border-violet bg-violet/10" },
  { key: "interface", label: "system-call interface", sub: "table of call numbers", tone: "border-orange bg-orange/10" },
  { key: "kernel", label: "kernel", sub: "the real implementation", tone: "border-mint bg-mint/15" },
] as const;

/** A system call travelling from a program through the API and the system-call table into the kernel, and back. */
export function SystemCallFlow() {
  const [call, setCall] = useState<"open" | "printf">("open");
  const frames = useMemo(() => syscallFrames(call), [call]);
  return (
    <Stepper
      title="API → system call → OS"
      frames={frames}
      code={SYSCALL_CODE}
      codeLabel="What happens"
      legend={[["bg-sky", "user mode"], ["bg-orange", "kernel mode"]]}
      inputs={
        <Toggle<"open" | "printf">
          value={call}
          onChange={setCall}
          options={[
            ["open", "open() a file"],
            ["printf", "printf() in C"],
          ]}
        />
      }
      render={(s: SyscallState) => {
        const at = s.stage === "return" ? "user" : s.stage;
        return (
          <div className="grid md:grid-cols-[1fr_200px] gap-4 min-w-[300px]">
            <div className="flex flex-col gap-2">
              {SYSCALL_STAGES.map((st, i) => (
                <div key={st.key} className="flex flex-col items-stretch">
                  {i === 2 && (
                    <div className="my-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span className="flex-1 border-t border-dashed border-border" />
                      user mode ↑ · kernel mode ↓
                      <span className="flex-1 border-t border-dashed border-border" />
                    </div>
                  )}
                  <div className={`relative rounded-sm border-l-4 px-4 py-2 transition-all duration-300 ${st.tone} ${at === st.key ? "ring-2 ring-foreground scale-[1.02]" : "opacity-60"}`}>
                    <div className="font-display font-bold text-sm">{st.label}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{st.key === "user" && call === "printf" ? "printf(\"Hello\")" : st.sub}</div>
                    {at === st.key && <span className="absolute right-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-foreground animate-ping" aria-hidden />}
                  </div>
                </div>
              ))}
              {s.stage === "return" && <div className="font-mono text-xs text-mint animate-in fade-in slide-in-from-bottom-2 duration-300">↑ return value delivered</div>}
            </div>
            <div className="border border-border rounded-sm">
              <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">system-call table</div>
              {SYSCALL_TABLE.map((name, i) => (
                <div key={name} className={`flex justify-between px-3 py-1 font-mono text-xs transition-colors duration-300 ${s.index === i ? "bg-orange/25 text-foreground font-bold" : "text-muted-foreground"}`}>
                  <span>{i}</span>
                  <span>{name}()</span>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}

/** The system calls behind "copy one file to another", ticking off one by one. */
export function CopyFileCalls() {
  const [run, setRun] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run || n >= COPY_FILE_CALLS.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 550);
    return () => clearTimeout(t);
  }, [run, n]);
  const tone: Record<string, string> = { input: "bg-sky", open: "bg-violet", loop: "bg-orange", close: "bg-mint" };
  return (
    <Panel title="System calls to copy one file to another" legend={[["bg-sky", "get file names"], ["bg-violet", "open files"], ["bg-orange", "copy loop"], ["bg-mint", "finish"]]}>
      <div className="font-mono text-xs text-muted-foreground">
        <span className="text-foreground">$ cp</span> in.txt out.txt
      </div>
      <ol className="flex flex-col gap-1">
        {COPY_FILE_CALLS.map((c, i) => (
          <li
            key={i}
            className={`flex items-center gap-3 rounded-sm px-3 py-1.5 text-sm transition-all duration-300 ${i < n ? "bg-muted/50 opacity-100 translate-x-0" : "opacity-30 -translate-x-1"}`}
          >
            <span className={`h-2.5 w-2.5 rounded-[2px] ${tone[c.group]}`} />
            <span className="font-mono text-[10px] w-5 text-muted-foreground">{i + 1}</span>
            {c.step}
            {i < n && <span className="ml-auto text-mint animate-in zoom-in-50 duration-200">✓</span>}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Even a simple copy makes many system calls, and the read/write pair runs once per block, so a big file means thousands of them. Most programmers never see these: the API hides them.
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => { if (n >= COPY_FILE_CALLS.length) setN(0); setRun(true); }}>
          ▶ Run cp
        </button>
        <button type="button" className={btn} onClick={() => { setRun(false); setN(0); }}>
          ⟲ Reset
        </button>
      </div>
    </Panel>
  );
}

/** The three ways to hand parameters to the OS. */
export function ParameterPassing() {
  const [method, setMethod] = useState<ParamMethod>("table");
  const [count, setCount] = useState(3);
  const params = Array.from({ length: count }, (_, i) => `p${i + 1}`);
  const r = paramPassing(method, params);
  const box = "rounded-sm border border-border p-3 min-h-[120px] flex flex-col gap-1";
  const cell = (v: string, tone: string) => (
    <div key={v} className={`font-mono text-xs px-2 py-1 rounded-sm ${tone} animate-in fade-in slide-in-from-left-2 duration-300`}>
      {v}
    </div>
  );
  const notes: Record<ParamMethod, string> = {
    registers: "Simplest and fastest: put each parameter in a CPU register. But there are only a few registers, so long parameter lists don't fit.",
    table: "Store the parameters in a block (table) in memory and pass the block's address in one register. Linux and Solaris do this. No limit on the number of parameters.",
    stack: "The program pushes the parameters onto the stack, and the operating system pops them off. No limit either.",
  };
  return (
    <Panel title="Passing parameters to a system call">
      <div className="flex flex-wrap items-center gap-4">
        <Toggle<ParamMethod>
          value={method}
          onChange={setMethod}
          options={[
            ["registers", "Registers"],
            ["table", "Table in memory"],
            ["stack", "Stack"],
          ]}
        />
        <label className="inline-flex items-center gap-2 font-mono text-xs">
          <span className="uppercase tracking-widest text-muted-foreground">parameters</span>
          <input type="range" min={1} max={7} value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="number of parameters" />
          <span className="w-4">{count}</span>
        </label>
      </div>
      <div key={method} className="grid grid-cols-3 gap-3">
        <div className={box}>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">CPU registers</div>
          {r.registers.map((v) => cell(v, "bg-sky/20"))}
          {r.overflow && <div className="font-mono text-[11px] text-orange animate-pulse">✗ {count - 4} won't fit!</div>}
        </div>
        <div className={box}>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">memory (table at X)</div>
          {r.memory.map((v) => cell(v, "bg-violet/20"))}
        </div>
        <div className={box}>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">stack (top first)</div>
          {r.stack.map((v) => cell(v, "bg-orange/20"))}
        </div>
      </div>
      <p className="text-sm leading-relaxed">{notes[method]}</p>
    </Panel>
  );
}

/* ------------------------------ OS structures ------------------------------ */

const STRUCTURE_ORDER: [StructureKind, string][] = [
  ["simple", "Simple"],
  ["unix", "UNIX"],
  ["layered", "Layered"],
  ["microkernel", "Microkernel"],
  ["modules", "Modules"],
  ["hybrid", "Hybrid"],
];

/** Flip between the ways to structure an OS. The microkernel view animates its message passing. */
export function OsStructures() {
  const [kind, setKind] = useState<StructureKind>("simple");
  const s = STRUCTURES[kind];
  const [hop] = useTicker(kind === "microkernel", MICROKERNEL_HOPS.length, 700);
  const where = MICROKERNEL_HOPS[hop];
  return (
    <Panel title="Ways to structure an operating system">
      <div className="flex flex-wrap gap-1.5">
        {STRUCTURE_ORDER.map(([k, label]) => (
          <button key={k} type="button" className={`${btn} !px-2 !py-1 ${k === kind ? "bg-foreground text-background" : ""}`} onClick={() => setKind(k)}>
            {label}
          </button>
        ))}
      </div>
      <div key={kind} className="flex flex-col gap-3 animate-in fade-in duration-300">
        <div>
          <div className="font-display text-xl font-bold">{s.title}</div>
          <div className="font-mono text-[11px] text-muted-foreground">e.g. {s.example}</div>
        </div>
        {kind === "microkernel" ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              {["application", "file system", "device driver"].map((m) => (
                <div key={m} className={`rounded-sm border-2 px-2 py-3 text-center text-sm transition-all duration-300 ${where === m ? "border-mint bg-mint/20 scale-105" : "border-sky/50 bg-sky/10"}`}>
                  {m}
                </div>
              ))}
            </div>
            <div className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">user mode ↑ · messages · kernel mode ↓</div>
            <div className={`rounded-sm border-2 px-3 py-3 text-center text-sm transition-all duration-300 ${where === "microkernel" ? "border-mint bg-mint/20 scale-[1.02]" : "border-orange/50 bg-orange/10"}`}>
              microkernel: interprocess communication · memory management · CPU scheduling
            </div>
            <div className="rounded-sm border border-border bg-muted/40 px-3 py-2 text-center text-sm">hardware</div>
            <p className="font-mono text-xs text-muted-foreground">
              message now at: <span className="text-foreground">{where}</span>. The app asks to read a file: app → microkernel → file system → microkernel → app.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {s.layers.map((l, i) => (
              <div
                key={i}
                className="rounded-sm border border-border bg-muted/30 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-300"
                style={{ marginLeft: kind === "layered" ? `${i * 4}%` : 0, marginRight: kind === "layered" ? `${i * 4}%` : 0, animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                {l}
              </div>
            ))}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="border-l-2 border-mint pl-3">
            <div className="eyebrow text-mint mb-1">good</div>
            <ul className="list-disc pl-4 space-y-0.5">{s.pros.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <div className="border-l-2 border-orange pl-3">
            <div className="eyebrow text-orange mb-1">bad</div>
            <ul className="list-disc pl-4 space-y-0.5">{s.cons.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------ boot ------------------------------ */

/** From the power button to a running kernel. */
export function BootSequence() {
  const frames = useMemo(() => bootFrames(), []);
  return (
    <Stepper
      title="System boot"
      frames={frames}
      code={BOOT_CODE}
      codeLabel="What happens"
      render={(s: BootState) => (
        <div className="flex flex-wrap items-center gap-2 min-w-[300px]">
          {BOOT_STAGES.map((name, i) => (
            <div key={name} className="flex items-center gap-2">
              <div
                className={`rounded-sm border-2 px-3 py-2 text-xs sm:text-sm font-display font-bold transition-all duration-500 ${
                  i < s.stage ? "border-mint/60 bg-mint/10 opacity-70" : i === s.stage ? "border-mint bg-mint/25 scale-110 shadow-lg" : "border-dashed border-border opacity-40"
                }`}
              >
                {i === 0 && "⏻ "}
                {name}
                {i === BOOT_STAGES.length - 1 && i === s.stage && " 🎉"}
              </div>
              {i < BOOT_STAGES.length - 1 && <span className={`transition-opacity duration-500 ${i < s.stage ? "opacity-100" : "opacity-20"}`}>→</span>}
            </div>
          ))}
        </div>
      )}
    />
  );
}

/* ------------------------------ Linux terminal ------------------------------ */

type Mission = { text: string; hint: string; done: (st: ShellState, history: string[]) => boolean };

const ran = (history: string[], re: RegExp) => history.some((h) => re.test(h.trim()));

const LAB1_MISSIONS: Mission[] = [
  { text: "Print the working directory", hint: "pwd", done: (_s, h) => ran(h, /^pwd$/) },
  { text: "List everything, hidden files too", hint: "ls -a", done: (_s, h) => ran(h, /^ls\b.*-\w*a/) },
  { text: "Read the manual page of ls", hint: "man ls", done: (_s, h) => ran(h, /^man ls$/) },
  { text: "Make a directory called new1", hint: "mkdir new1", done: (s) => exists(s, "~/new1", "dir") },
  { text: "Create an empty file f1.txt inside new1", hint: "touch new1/f1.txt", done: (s) => exists(s, "~/new1/f1.txt", "file") },
  { text: "Copy file1 into new1", hint: "cp file1 new1", done: (s) => exists(s, "~/new1/file1", "file") },
  { text: "Remove the empty directory dir2", hint: "rmdir dir2", done: (s, h) => !exists(s, "~/dir2") && ran(h, /^(rmdir|rm)\b/) },
  { text: "Print both text files with one command", hint: "cat file1 file2.txt", done: (_s, h) => ran(h, /^cat\s+\S+\s+\S+/) },
  { text: "Save the output of ls into a file called list", hint: "ls > list", done: (s) => (readFile(s, "~/list") ?? "").includes("dir1") },
  { text: "Append ls to list again, then sort it and drop repeats", hint: "ls >> list   then   sort list | uniq", done: (_s, h) => ran(h, />>/) && ran(h, /sort.*\|\s*uniq/) },
];

type Line = { kind: "in" | "out" | "err"; text: string; prompt?: string };

/** A small Linux terminal running in the browser, with the lab's tasks as checkable missions. */
export function LinuxTerminal() {
  const [st, setSt] = useState<ShellState>(initialShell);
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: "Welcome! This is a pretend Linux terminal. Try ls, then work through the missions." }]);
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [back, setBack] = useState(-1);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = LAB1_MISSIONS.map((m) => m.done(st, history));
  const score = done.filter(Boolean).length;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const submit = (cmd: string) => {
    const prompt = `user@linux:${promptPath(st.cwd)}$`;
    const r = run(st, cmd);
    setSt(r.state);
    setHistory((h) => (cmd.trim() ? [...h, cmd] : h));
    setBack(-1);
    setInput("");
    if (r.clear) return setLines([]);
    setLines((ls) => [...ls, { kind: "in", text: cmd, prompt }, ...(r.output ? [{ kind: r.error ? "err" : "out", text: r.output } as Line] : [])]);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit(input);
    else if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      const i = back < 0 ? history.length - 1 : Math.max(0, back - 1);
      setBack(i);
      setInput(history[i]);
    } else if (e.key === "ArrowDown" && back >= 0) {
      e.preventDefault();
      const i = back + 1;
      if (i >= history.length) {
        setBack(-1);
        setInput("");
      } else {
        setBack(i);
        setInput(history[i]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const reset = () => {
    setSt(initialShell());
    setLines([{ kind: "out", text: "Fresh start: the home directory is back to dir1, dir2, file1 and file2.txt." }]);
    setHistory([]);
    setInput("");
  };

  return (
    <Panel title="Practice terminal" legend={[["bg-mint", `${score}/${LAB1_MISSIONS.length} missions`]]}>
      <div className="grid lg:grid-cols-[1fr_260px] gap-4">
        <div
          className="rounded-sm bg-[#0d1117] text-[#c9d1d9] font-mono text-[13px] leading-relaxed h-[340px] flex flex-col cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
            <span className="ml-2 text-[11px] text-white/40">bash</span>
          </div>
          <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-2" role="log" aria-live="polite">
            {lines.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap break-words animate-in fade-in duration-150">
                {l.kind === "in" ? (
                  <>
                    <span className="text-[#7ee787]">{l.prompt}</span> {l.text}
                  </>
                ) : (
                  <span className={l.kind === "err" ? "text-[#ff7b72]" : ""}>{l.text}</span>
                )}
              </div>
            ))}
            <div className="flex items-center">
              <span className="text-[#7ee787] shrink-0">user@linux:{promptPath(st.cwd)}$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                className="flex-1 min-w-0 bg-transparent outline-none ml-2 caret-[#7ee787]"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-label="terminal input"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">missions</div>
          {LAB1_MISSIONS.map((m, i) => (
            <button
              key={m.text}
              type="button"
              onClick={() => {
                setInput(m.hint.split("   ")[0]);
                inputRef.current?.focus();
              }}
              title={`Hint: ${m.hint}`}
              className={`text-left text-xs rounded-sm px-2 py-1.5 border transition-all duration-300 ${done[i] ? "border-mint bg-mint/15" : "border-border hover:border-foreground/40"}`}
            >
              <span className={`inline-block w-4 ${done[i] ? "text-mint animate-in zoom-in-50 duration-300" : "text-muted-foreground"}`}>{done[i] ? "✓" : i + 1}</span> {m.text}
            </button>
          ))}
          {score === LAB1_MISSIONS.length && <div className="text-sm font-display font-bold text-mint animate-in zoom-in-75 duration-500">🎉 All done. You speak Linux now!</div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btn} onClick={reset}>
          ⟲ Reset files
        </button>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">↑ ↓ history · ctrl+L clear · click a mission for a hint</span>
      </div>
    </Panel>
  );
}

/* ------------------------------ process in memory ------------------------------ */

/** A process's memory: call functions to grow the stack down, allocate to grow the heap up. */
export function ProcessMemory() {
  const [frames, setFrames] = useState<string[]>(["main()"]);
  const [heap, setHeap] = useState<number[]>([]);
  const FN = ["readFile()", "parse()", "draw()", "sum()"];
  const full = frames.length + heap.length >= 7;
  return (
    <Panel title="A process in memory" legend={[["bg-orange", "stack"], ["bg-violet", "heap"], ["bg-sky", "data"], ["bg-mint", "text"]]}>
      <div className="grid sm:grid-cols-[220px_1fr] gap-5 items-start">
        <div className="flex flex-col border-2 border-border rounded-sm overflow-hidden font-mono text-[11px]">
          <div className="px-2 py-0.5 text-[10px] text-muted-foreground text-right">max address</div>
          <div className="flex flex-col">
            {frames.map((f, i) => (
              <div key={i} className="bg-orange/25 border-b border-orange/40 px-2 py-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                stack frame: {f}
              </div>
            ))}
            <div className="text-center text-muted-foreground py-0.5">↓ stack grows down</div>
          </div>
          <div className="h-10 sm:h-16 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,hsl(var(--border))_6px,hsl(var(--border))_7px)] flex items-center justify-center text-muted-foreground">
            {full ? <span className="text-orange animate-pulse">nearly out of room!</span> : "free"}
          </div>
          <div className="flex flex-col-reverse">
            {heap.map((h, i) => (
              <div key={i} className="bg-violet/25 border-t border-violet/40 px-2 py-1.5 animate-in slide-in-from-bottom-2 fade-in duration-300">
                heap block #{h} (malloc)
              </div>
            ))}
            <div className="text-center text-muted-foreground py-0.5">↑ heap grows up</div>
          </div>
          <div className="bg-sky/20 px-2 py-2 border-t border-border">data: global variables</div>
          <div className="bg-mint/20 px-2 py-2 border-t border-border">text: the program code</div>
          <div className="px-2 py-0.5 text-[10px] text-muted-foreground text-right">0</div>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <p className="leading-relaxed">
            A process isn't just its code. It's the <b>text</b> (code), the <b>data</b> (globals), a <b>heap</b> for memory allocated while it runs, and a <b>stack</b> for function calls: their parameters, return addresses and local variables.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={full} onClick={() => setFrames((f) => [...f, FN[(f.length - 1) % FN.length]])}>
              call a function
            </button>
            <button type="button" className={btn} disabled={frames.length <= 1} onClick={() => setFrames((f) => f.slice(0, -1))}>
              return
            </button>
            <button type="button" className={btn} disabled={full} onClick={() => setHeap((h) => [...h, h.length + 1])}>
              malloc()
            </button>
            <button type="button" className={btn} disabled={!heap.length} onClick={() => setHeap((h) => h.slice(0, -1))}>
              free()
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">The stack and heap grow toward each other through the free space in the middle. If they ever meet, the process is out of memory.</p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------ state machines ------------------------------ */

type SmEdge<S extends string> = { from: S; to: S; label: string; bend?: number };

/** A clickable state diagram: only the transitions out of the current state are enabled. */
function StateMachine<S extends string>({
  title,
  positions,
  edges,
  notes,
  initial,
  height = 310,
  resetLabel,
}: {
  title: string;
  positions: Record<S, [number, number]>;
  edges: SmEdge<S>[];
  notes: Record<S, string>;
  initial: S;
  height?: number;
  resetLabel: string;
}) {
  const [s, setS] = useState<S>(initial);
  const [last, setLast] = useState<number | null>(null);
  const [trail, setTrail] = useState<S[]>([initial]);
  const uid = useId().replace(/:/g, "");
  const fire = (i: number) => {
    setS(edges[i].to);
    setLast(i);
    setTrail((t) => [...t, edges[i].to].slice(-8));
  };
  const curve = (from: S, to: S, bend = 0) => {
    const [x1, y1] = positions[from];
    const [x2, y2] = positions[to];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const sx = x1 + ux * 50;
    const sy = y1 + uy * 24;
    const ex = x2 - ux * 50;
    const ey = y2 - uy * 24;
    const mx = (sx + ex) / 2 - uy * bend;
    const my = (sy + ey) / 2 + ux * bend;
    return { d: `M${sx},${sy} Q${mx},${my} ${ex},${ey}`, lx: (sx + 2 * mx + ex) / 4, ly: (sy + 2 * my + ey) / 4 };
  };
  return (
    <Panel title={title}>
      <svg viewBox={`0 0 600 ${height}`} className="w-full h-auto max-w-[640px] mx-auto" role="img" aria-label={title}>
        <defs>
          {(["cold", "hot"] as const).map((k) => (
            <marker key={k} id={`${uid}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={k === "hot" ? "fill-mint" : "fill-muted-foreground"} />
            </marker>
          ))}
        </defs>
        {edges.map((e, i) => {
          const g = curve(e.from, e.to, e.bend);
          const hot = last === i && s === e.to;
          return (
            <g key={`${e.from}-${e.to}`}>
              <path d={g.d} fill="none" strokeWidth={hot ? 3 : 1.5} className={`transition-all duration-300 ${hot ? "stroke-mint" : "stroke-muted-foreground"}`} markerEnd={`url(#${uid}-${hot ? "hot" : "cold"})`} />
              <text x={g.lx} y={g.ly - 6} textAnchor="middle" className={`font-mono text-[11px] ${hot ? "fill-mint font-bold" : "fill-muted-foreground"}`}>
                {e.label}
              </text>
            </g>
          );
        })}
        {(Object.keys(positions) as S[]).map((k) => {
          const [x, y] = positions[k];
          const on = k === s;
          return (
            <g key={k}>
              {on && <ellipse cx={x} cy={y} rx={60} ry={30} className="fill-mint/20 animate-pulse" />}
              <ellipse cx={x} cy={y} rx={50} ry={24} strokeWidth={on ? 3 : 1.5} className={`transition-all duration-300 ${on ? "fill-mint/30 stroke-mint" : "fill-card stroke-border"}`} />
              <text x={x} y={y + 4} textAnchor="middle" className={`font-display text-[14px] font-bold ${on ? "fill-foreground" : "fill-muted-foreground"}`}>
                {k}
              </text>
            </g>
          );
        })}
      </svg>
      <p aria-live="polite" className="text-sm min-h-[2.5em]">
        {notes[s]}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {edges.map((e, i) => (
          <button key={`${e.from}-${e.to}`} type="button" className={`${btn} !px-2 !py-1 !normal-case !tracking-normal`} disabled={e.from !== s} onClick={() => fire(i)}>
            {e.label}
          </button>
        ))}
        <button type="button" className={`${btn} !px-2 !py-1`} onClick={() => { setS(initial); setLast(null); setTrail([initial]); }}>
          ⟲ {resetLabel}
        </button>
      </div>
      <div className="font-mono text-[11px] text-muted-foreground">path: {trail.join(" → ")}</div>
    </Panel>
  );
}

/** The five-state process diagram. */
export function ProcessStateDiagram() {
  return (
    <StateMachine<PState>
      title="Diagram of process state"
      positions={{ new: [80, 50], terminated: [520, 50], ready: [170, 170], running: [430, 170], waiting: [300, 265] }}
      edges={PROCESS_TRANSITIONS.map((t) => ({ ...t, bend: t.event === "dispatch" || t.event === "interrupt" ? -40 : 0 }))}
      notes={{
        new: "new: the process is being created.",
        ready: "ready: it's waiting to be assigned to a processor.",
        running: "running: its instructions are being executed. On one CPU, only one process can be here at a time.",
        waiting: "waiting: it's waiting for some event, like an I/O finishing or a signal.",
        terminated: "terminated: it has finished execution.",
      }}
      initial="new"
      resetLabel="new process"
    />
  );
}

/** The lab's Java thread lifecycle. */
export function JavaThreadLifecycle() {
  const bend: Record<string, number> = { "Runnable-Running": 30, "Running-Runnable": 30, "Blocked-Runnable": -120, "New-Dead": -30 };
  return (
    <StateMachine<JState>
      title="The thread lifecycle in Java"
      positions={{ New: [220, 40], Runnable: [220, 135], Running: [220, 235], Blocked: [220, 330], Dead: [500, 185] }}
      edges={JAVA_TRANSITIONS.map((t) => ({ ...t, bend: bend[`${t.from}-${t.to}`] ?? 0 }))}
      notes={{
        New: "New: the Thread object exists, but start() hasn't been called yet.",
        Runnable: "Runnable: started and ready to go. It's waiting for the scheduler to give it the CPU.",
        Running: "Running: the thread's run() method is executing on a CPU right now.",
        Blocked: "Blocked (idle, not runnable): it's sleeping or waiting, and won't be scheduled until it's woken up.",
        Dead: "Dead: run() finished, or the thread was killed. A dead thread can't be started again.",
      }}
      initial="New"
      height={370}
      resetLabel="new Thread()"
    />
  );
}

/* ------------------------------ context switch ------------------------------ */

function PcbCard({ p, hot }: { p: PcbView; hot: boolean }) {
  return (
    <div className={`rounded-sm border-2 p-3 font-mono text-xs flex flex-col gap-1 transition-all duration-300 ${hot ? "border-mint bg-mint/15 scale-[1.03]" : "border-border"}`}>
      <div className="font-display font-bold text-sm">PCB{p.name.slice(1)}</div>
      <div>process state: <span className="text-foreground">{p.state}</span></div>
      <div>process number: {p.name}</div>
      <div>program counter: <span key={p.pc} className="inline-block animate-in zoom-in-75 duration-300">{p.pc}</span></div>
      <div>registers: <span key={p.reg} className="inline-block animate-in zoom-in-75 duration-300">r1 = {p.reg}</span></div>
      <div className="text-muted-foreground">memory limits · open files · …</div>
    </div>
  );
}

/** CPU switching from P0 to P1 and back, saving into and reloading from the PCBs. */
export function ContextSwitch() {
  const frames = useMemo(() => contextSwitchFrames(), []);
  return (
    <Stepper
      title="CPU switch from process to process"
      frames={frames}
      code={SWITCH_CODE}
      codeLabel="What happens"
      legend={[["bg-sky", "executing"], ["bg-muted", "idle (OS working)"]]}
      render={(s: SwitchState) => (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center min-w-[420px]">
          <PcbCard p={s.pcb[0]} hot={s.touch === 0} />
          <div className="flex flex-col items-center gap-2">
            <div className={`rounded-sm border-2 px-4 py-3 text-center transition-all duration-300 ${s.running === null ? "border-dashed border-muted-foreground" : "border-sky bg-sky/20"}`}>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">CPU</div>
              <div className="font-display font-bold">{s.running === null ? "OS" : `P${s.running}`}</div>
              {s.cpu && <div className="font-mono text-[11px]">PC {s.cpu.pc}</div>}
            </div>
            <div className="font-mono text-lg h-6">
              {s.phase !== "exec" && (
                <span key={`${s.phase}${s.touch}`} className="animate-in fade-in duration-300">
                  {s.phase === "save" ? (s.touch === 0 ? "← save" : "save →") : s.touch === 0 ? "reload →" : "← reload"}
                </span>
              )}
              {s.phase === "exec" && s.running !== null && <span className="animate-spin inline-block">⚙</span>}
            </div>
          </div>
          <PcbCard p={s.pcb[1]} hot={s.touch === 1} />
        </div>
      )}
    />
  );
}

/* ------------------------------ fork ------------------------------ */

/** Put tree nodes on a grid: x by leaf order, y by `level`. */
function layoutTree<T>(nodes: T[], id: (n: T) => number, parent: (n: T) => number | null, level: (n: T) => number) {
  const kids = new Map<number, T[]>();
  for (const n of nodes) {
    const p = parent(n);
    if (p !== null) kids.set(p, [...(kids.get(p) ?? []), n]);
  }
  const pos = new Map<number, { x: number; y: number }>();
  let leaf = 0;
  const walk = (n: T): number => {
    const ch = kids.get(id(n)) ?? [];
    const x = ch.length ? ch.map(walk).reduce((a, b) => a + b, 0) / ch.length : leaf++;
    pos.set(id(n), { x, y: level(n) });
    return x;
  };
  nodes.filter((n) => parent(n) === null).forEach(walk);
  return { pos, leaves: Math.max(1, leaf) };
}

/** How many processes do n fork() calls make? Watch the tree double. */
export function ForkTree() {
  const [n, setN] = useState(2);
  const nodes = useMemo(() => forkTree(n), [n]);
  // depth in the tree = number of ancestors, which keeps children below their parents
  const depth = (k: ForkNode): number => (k.parent === null ? 0 : 1 + depth(nodes[k.parent]));
  const { pos, leaves } = layoutTree(nodes, (k) => k.id, (k) => k.parent, depth);
  const maxDepth = Math.max(...nodes.map(depth));
  const W = 560;
  const H = 70 + maxDepth * 70;
  const X = (x: number) => 30 + (leaves === 1 ? (W - 60) / 2 : (x / (leaves - 1)) * (W - 60));
  const Y = (y: number) => 30 + y * 70;
  const tone = ["fill-mint", "fill-sky", "fill-violet", "fill-orange", "fill-neon"];
  return (
    <Panel title="fork() doubles the processes" legend={[["bg-mint", "original"], ["bg-sky", "born at fork 1"], ["bg-violet", "fork 2"], ["bg-orange", "fork 3"]]}>
      <div className="flex flex-wrap items-center gap-4">
        <pre className="font-mono text-xs bg-muted/40 rounded-sm px-3 py-2 m-0">
          {"int main() {\n" + Array.from({ length: n }, () => "    fork();\n").join("") + '    printf("hi\\n");\n}'}
        </pre>
        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 font-mono text-xs">
            <span className="uppercase tracking-widest text-muted-foreground">fork() calls</span>
            <input type="range" min={0} max={4} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="number of fork calls" />
            <span className="w-4">{n}</span>
          </label>
          <div className="font-display text-2xl font-bold">
            {nodes.length} processes · "hi" printed {nodes.length}×
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            2<sup>{n}</sup> = {nodes.length}, so {nodes.length - 1} new child processes
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="tree of processes created by fork">
        {nodes.map((k) => {
          if (k.parent === null) return null;
          const a = pos.get(k.parent)!;
          const b = pos.get(k.id)!;
          return <line key={`e${k.id}`} x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} className="stroke-border" strokeWidth={1.5} />;
        })}
        {nodes.map((k) => {
          const p = pos.get(k.id)!;
          return (
            <g key={`${n}-${k.id}`} className="animate-in zoom-in-50 fade-in duration-500" style={{ transformOrigin: `${X(p.x)}px ${Y(p.y)}px`, animationDelay: `${k.bornAt * 150}ms`, animationFillMode: "both" }}>
              <circle cx={X(p.x)} cy={Y(p.y)} r={14} className={tone[k.bornAt]} />
              <text x={X(p.x)} y={Y(p.y) + 4} textAnchor="middle" className="fill-background font-mono text-[10px] font-bold">
                P{k.id}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground leading-relaxed">
        fork() creates a child that is a copy of the parent, and <i>both</i> continue from the next line. So at every fork() call, every process that exists splits in two.
      </p>
    </Panel>
  );
}

/** The textbook's tree of processes on a Linux system. */
export function LinuxProcessTree() {
  const { pos, leaves } = layoutTree(
    LINUX_TREE,
    (p) => p.pid,
    (p) => p.parent,
    (p) => {
      let d = 0;
      let cur = p;
      while (cur.parent !== null) {
        cur = LINUX_TREE.find((q) => q.pid === cur.parent)!;
        d++;
      }
      return d;
    },
  );
  const W = 640;
  const X = (x: number) => 45 + (x / (leaves - 1)) * (W - 90);
  const Y = (y: number) => 30 + y * 70;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Panel title="A tree of processes in Linux">
      <svg viewBox={`0 0 ${W} 260`} className="w-full h-auto" role="img" aria-label="Linux process tree">
        {LINUX_TREE.map((p) => {
          if (p.parent === null) return null;
          const a = pos.get(p.parent)!;
          const b = pos.get(p.pid)!;
          return <line key={`e${p.pid}`} x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} className="stroke-border" strokeWidth={1.5} />;
        })}
        {LINUX_TREE.map((p) => {
          const q = pos.get(p.pid)!;
          const on = hover === p.pid;
          return (
            <g key={p.pid} onMouseEnter={() => setHover(p.pid)} onMouseLeave={() => setHover(null)} className="cursor-default">
              <rect x={X(q.x) - 38} y={Y(q.y) - 17} width={76} height={34} rx={4} className={`transition-all ${on ? "fill-mint/30 stroke-mint" : "fill-card stroke-border"}`} strokeWidth={1.5} />
              <text x={X(q.x)} y={Y(q.y) - 2} textAnchor="middle" className="fill-foreground font-display text-[12px] font-bold">
                {p.name}
              </text>
              <text x={X(q.x)} y={Y(q.y) + 11} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                pid = {p.pid}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground leading-relaxed">
        <b>init</b> (pid 1) is the root of every user process. A user logged in through <b>login</b> got a <b>bash</b> shell, and every command typed in that shell, like <b>ps</b> or <b>emacs</b>, became bash's child.
      </p>
    </Panel>
  );
}

/* ------------------------------ bounded buffer ------------------------------ */

/** The shared-memory bounded buffer: a ring of BUFFER_SIZE slots with in and out pointers. */
export function BoundedBuffer({ size = 8 }: { size?: number }) {
  const [r, setR] = useState<Ring>(() => ring(size));
  const [log, setLog] = useState<string>("Press produce or consume, or let them both run.");
  const [auto, setAuto] = useState(false);
  const [busy, setBusy] = useState<"p" | "c" | null>(null);
  const doProduce = () => {
    const next = produce(r);
    setBusy("p");
    if (!next) return setLog(`Producer: (in + 1) % ${size} == out, so the buffer is full. It spins in its while loop, waiting.`);
    setR(next);
    setLog(`Producer: buffer[${r.in}] = item ${r.next}; in = (${r.in} + 1) % ${size} = ${next.in}.`);
  };
  const doConsume = () => {
    const res = consume(r);
    setBusy("c");
    if (!res) return setLog("Consumer: in == out, so the buffer is empty. It spins, waiting.");
    setR(res.ring);
    setLog(`Consumer: took item ${res.item} from buffer[${r.out}]; out = (${r.out} + 1) % ${size} = ${res.ring.out}.`);
  };
  const actions = useRef({ doProduce, doConsume });
  actions.current = { doProduce, doConsume };
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => (Math.random() < 0.55 ? actions.current.doProduce() : actions.current.doConsume()), 650);
    return () => clearInterval(t);
  }, [auto]);
  const R = 95;
  const C = 130;
  const angle = (i: number) => (i / size) * Math.PI * 2 - Math.PI / 2;
  const pt = (i: number, rad: number) => [C + rad * Math.cos(angle(i)), C + rad * Math.sin(angle(i))] as const;
  return (
    <Panel title="Bounded buffer in shared memory" legend={[["bg-mint", "item"], ["bg-sky", "in (producer)"], ["bg-orange", "out (consumer)"]]}>
      <div className="grid sm:grid-cols-[260px_1fr] gap-4 items-center">
        <svg viewBox="0 0 260 260" className="w-full max-w-[260px] h-auto mx-auto" role="img" aria-label="circular buffer">
          {r.buf.map((v, i) => {
            const [x, y] = pt(i, R);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={22} strokeWidth={2} className={`transition-all duration-300 ${v !== null ? "fill-mint/40 stroke-mint" : "fill-card stroke-border"}`} />
                <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground font-mono text-[12px] font-bold">
                  {v ?? ""}
                </text>
                <text x={pt(i, R + 34)[0]} y={pt(i, R + 34)[1] + 3} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
                  [{i}]
                </text>
              </g>
            );
          })}
          {(["in", "out"] as const).map((k) => {
            const idx = k === "in" ? r.in : r.out;
            const [x, y] = pt(idx, R - 40);
            return (
              <g key={k} style={{ transition: "transform 300ms" }}>
                <line x1={C} y1={C} x2={x} y2={y} strokeWidth={k === "in" ? 3 : 2} strokeDasharray={k === "out" ? "4 3" : undefined} className={`transition-all duration-300 ${k === "in" ? "stroke-sky" : "stroke-orange"}`} />
                <text x={(C + x) / 2 + (k === "in" ? 8 : -8)} y={(C + y) / 2} textAnchor="middle" className={`font-mono text-[10px] font-bold ${k === "in" ? "fill-sky" : "fill-orange"}`}>
                  {k}
                </text>
              </g>
            );
          })}
          <text x={C} y={C + 4} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
            {ringCount(r)}/{size - 1}
          </text>
        </svg>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${btn} ${busy === "p" ? "border-sky" : ""}`} onClick={doProduce}>
              produce
            </button>
            <button type="button" className={`${btn} ${busy === "c" ? "border-orange" : ""}`} onClick={doConsume}>
              consume
            </button>
            <button type="button" className={btn} onClick={() => setAuto((a) => !a)}>
              {auto ? "❚❚ stop" : "▶ run both"}
            </button>
            <button type="button" className={btn} onClick={() => { setAuto(false); setR(ring(size)); setLog("Empty buffer: in == out == 0."); }}>
              ⟲
            </button>
          </div>
          <p aria-live="polite" className="text-sm min-h-[3em] leading-relaxed font-mono">
            {log}
          </p>
          <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-widest">
            {ringFull(r) && <span className="px-2 py-0.5 rounded-sm bg-orange text-background animate-in zoom-in-75">full</span>}
            {ringEmpty(r) && <span className="px-2 py-0.5 rounded-sm bg-muted">empty</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fill it up: one slot always stays empty. If the buffer could fill completely, in would equal out, and that already means "empty". So this solution can use only BUFFER_SIZE − 1 slots.
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------ message buffering ------------------------------ */

/** Sender vs. a slower receiver, with a zero, bounded or unbounded message queue. */
export function MessageBuffering() {
  const [cap, setCap] = useState<Capacity>("bounded");
  const sim = useMemo(() => messageSim(cap, 18), [cap]);
  const [t, setT] = useState(0);
  useEffect(() => setT(0), [cap]);
  useEffect(() => {
    if (t >= sim.length) return;
    const id = setTimeout(() => setT((x) => x + 1), 450);
    return () => clearTimeout(id);
  }, [t, sim.length]);
  const now = sim[Math.max(0, t - 1)];
  const notes: Record<Capacity, string> = {
    zero: "Zero capacity: there's no queue at all. The sender must wait until the receiver takes the message: a rendezvous.",
    bounded: "Bounded capacity (here 3): the sender can run ahead until the queue is full, then it must wait.",
    unbounded: "Unbounded capacity: the queue is infinitely long, so the sender never waits. The messages just pile up.",
  };
  return (
    <Panel title="Buffering: how many messages can wait on the link?" legend={[["bg-sky", "message in the queue"], ["bg-orange", "sender blocked"]]}>
      <Toggle<Capacity>
        value={cap}
        onChange={setCap}
        options={[
          ["zero", "Zero"],
          ["bounded", "Bounded"],
          ["unbounded", "Unbounded"],
        ]}
      />
      <div className="flex items-center gap-3">
        <div className={`rounded-sm border-2 px-3 py-2 text-center transition-colors duration-200 ${now?.blocked ? "border-orange bg-orange/20" : "border-border"}`}>
          <div className="font-display font-bold">sender</div>
          <div className="font-mono text-[10px]">{now?.blocked ? "blocked ⏸" : "sending ▶"}</div>
        </div>
        <div className="flex-1 min-h-[44px] rounded-sm border border-dashed border-border flex items-center gap-1 px-2 overflow-hidden">
          {Array.from({ length: now?.queue ?? 0 }, (_, i) => (
            <span key={i} className="h-6 w-6 shrink-0 rounded-sm bg-sky animate-in zoom-in-50 duration-200" />
          ))}
          {cap === "zero" && <span className="font-mono text-[10px] text-muted-foreground">no queue</span>}
        </div>
        <div className="rounded-sm border-2 border-border px-3 py-2 text-center">
          <div className="font-display font-bold">receiver</div>
          <div className="font-mono text-[10px]">every 3 ticks</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>tick <span className="text-foreground">{now?.tick ?? 0}</span></span>
        <span>sent <span className="text-foreground">{now?.sent ?? 0}</span></span>
        <span>received <span className="text-foreground">{now?.received ?? 0}</span></span>
        <span>blocked ticks <span className="text-foreground">{sim.slice(0, t).filter((x) => x.blocked).length}</span></span>
      </div>
      <p className="text-sm leading-relaxed">{notes[cap]}</p>
      <button type="button" className={`${btn} self-start`} onClick={() => setT(0)}>
        ⟲ Replay
      </button>
    </Panel>
  );
}

/* ------------------------------ Java threads ------------------------------ */

const THREAD_TONE: Record<PrintLine["thread"], string> = { t1: "text-sky", A: "text-violet", B: "text-orange", main: "text-mint" };

/** Run the lab's main() and watch the threads' output interleave. Toggle yield, join and priorities. */
export function ThreadRace() {
  const [yieldEach, setYield] = useState(false);
  const [join, setJoin] = useState(false);
  const [prio, setPrio] = useState(false);
  const [seed, setSeed] = useState(3);
  const lines = useMemo(
    () => runThreads({ yieldEach, join, priorities: prio ? { t1: 1, A: 5, B: 10 } : { t1: 5, A: 5, B: 5 }, iterations: 5, seed }),
    [yieldEach, join, prio, seed],
  );
  const [shown, setShown] = useState(0);
  useEffect(() => setShown(0), [lines]);
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 140);
    return () => clearTimeout(t);
  }, [shown, lines.length]);
  const code = [
    "Thread t1 = new Thread(new MyRunnable());",
    'Thread t2 = new MyThread("A");',
    'Thread t3 = new MyThread("B");',
    ...(prio ? ["t3.setPriority(10); //MAX_PRIORITY", "t1.setPriority(Thread.MIN_PRIORITY);"] : []),
    "t1.start(); t2.start(); t3.start();",
    ...(join ? ["t1.join(); t2.join(); t3.join();"] : []),
    'System.out.println("In main thread!");',
  ];
  const toggle = (on: boolean, set: (v: boolean) => void, label: string) => (
    <button type="button" className={`${btn} !normal-case !tracking-normal ${on ? "bg-foreground text-background" : ""}`} onClick={() => set(!on)} aria-pressed={on}>
      {on ? "✓ " : ""}
      {label}
    </button>
  );
  return (
    <Panel title="Threads taking turns" legend={[["bg-sky", "t1 (MyRunnable)"], ["bg-violet", "A"], ["bg-orange", "B"], ["bg-mint", "main"]]}>
      <div className="flex flex-wrap gap-2">
        {toggle(yieldEach, setYield, "Thread.yield() after each print")}
        {toggle(join, setJoin, "main joins t1, t2, t3")}
        {toggle(prio, setPrio, "B = MAX, t1 = MIN priority")}
        <button type="button" className={btn} onClick={() => setSeed((x) => x + 1)}>
          ⟳ run again
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <pre className="font-mono text-[11px] leading-relaxed bg-muted/40 rounded-sm p-3 m-0 overflow-x-auto">
          {"public static void main(String[] args) {\n" + code.map((c) => "    " + c).join("\n") + "\n}"}
        </pre>
        <div className="rounded-sm bg-[#0d1117] text-[#c9d1d9] font-mono text-[12px] leading-relaxed p-3 h-[260px] overflow-y-auto" role="log">
          {lines.slice(0, shown).map((l, i) => (
            <div key={i} className={`${THREAD_TONE[l.thread]} animate-in fade-in slide-in-from-left-1 duration-150`}>
              {l.text}
            </div>
          ))}
          {shown < lines.length && <span className="animate-pulse">▌</span>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {yieldEach
          ? "With yield(), every thread steps aside after each line, so the output takes neat turns."
          : "Without yield(), the scheduler switches whenever it likes, so the order changes from run to run. Press run again."}{" "}
        {join ? "Because main joins all three, \"In main thread!\" is always last." : "main doesn't wait, so \"In main thread!\" usually appears early, before the threads are done."}
        {prio && " Priorities are only a hint to the scheduler: B tends to run more, but nothing is guaranteed."}
      </p>
    </Panel>
  );
}

/** Exercise 2: add two matrices with one thread per row. */
export function MatrixAddThreads({ rows = 3, cols = 4 }: { rows?: number; cols?: number }) {
  const A = useMemo(() => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r + c + 1)), [rows, cols]);
  const B = useMemo(() => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r * cols + c) % 5)), [rows, cols]);
  const frames = useMemo(() => matrixAddFrames(rows, cols), [rows, cols]);
  const rowTone = ["border-sky bg-sky/20", "border-violet bg-violet/20", "border-orange bg-orange/20", "border-mint bg-mint/20"];
  const grid = (m: number[][], label: string, s?: MatrixState) => (
    <div className="flex flex-col items-center gap-1">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {m.flatMap((row, r) =>
          row.map((v, c) => {
            const show = !s || s.done[r][c];
            return (
              <div
                key={`${r}-${c}`}
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-sm border flex items-center justify-center font-mono text-xs transition-all duration-300 ${
                  s ? (show ? rowTone[r % rowTone.length] : "border-dashed border-border") : "border-border"
                } ${s?.active.includes(r) && show && s.done[r][c] ? "scale-105" : ""}`}
              >
                {show ? v : ""}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
  const C = A.map((row, r) => row.map((v, c) => v + B[r][c]));
  return (
    <Stepper
      title="Matrix addition, one thread per row"
      frames={frames}
      code={MATRIX_CODE}
      codeLabel="Java (outline)"
      render={(s: MatrixState) => (
        <div className="flex flex-col gap-3 items-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {grid(A, "A")}
            <span className="font-display text-xl">+</span>
            {grid(B, "B")}
            <span className="font-display text-xl">=</span>
            {grid(C, "C (shared output)", s)}
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: rows }, (_, r) => {
              const finished = s.done[r].every(Boolean);
              return (
                <span key={r} className={`font-mono text-[11px] px-2 py-1 rounded-sm border transition-all ${s.active.includes(r) ? rowTone[r % rowTone.length] + " animate-pulse" : finished ? "border-border opacity-50" : "border-border"}`}>
                  thread {r}: {finished ? "dead ✓" : s.active.includes(r) ? "running" : "runnable"}
                </span>
              );
            })}
            <span className={`font-mono text-[11px] px-2 py-1 rounded-sm border ${s.joined ? "border-mint bg-mint/20" : "border-border"}`}>main: {s.joined ? "joined, printing C" : "waiting in join()"}</span>
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------ race condition ------------------------------ */

function CodeColumn({ title, lines, pc, tone, done }: { title: string; lines: string[]; pc: number; tone: string; done?: boolean }) {
  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${tone}`}>{title}</div>
      <div className="font-mono text-[12px] py-1">
        {lines.map((l, i) => (
          <div key={i} className={`px-3 py-0.5 whitespace-pre border-l-2 transition-colors duration-200 ${i === pc && !done ? "border-foreground bg-foreground/10 font-bold" : i < pc ? "border-transparent opacity-50 line-through decoration-1" : "border-transparent"}`}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Interleave the machine instructions of counter++ and counter-- yourself, and watch the shared counter go wrong. */
export function RaceCondition() {
  const [order, setOrder] = useState<("P" | "C")[]>([]);
  const states = useMemo(() => raceRun(order), [order]);
  const s = states[states.length - 1];
  const finished = s.pcP === 3 && s.pcC === 3;
  const step = (w: "P" | "C") => setOrder((o) => [...o, w]);
  return (
    <Panel title="A race on counter (it starts at 5)" legend={[["bg-sky", "producer: counter++"], ["bg-orange", "consumer: counter--"]]}>
      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">
        <CodeColumn title="producer" lines={RACE_CODE.P} pc={s.pcP} tone="bg-sky/20" done={s.pcP === 3} />
        <div className="flex sm:flex-col gap-3 justify-center items-center py-2">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">counter</div>
            <div key={s.counter} className={`font-display text-4xl font-bold animate-in zoom-in-75 duration-300 ${finished ? (s.counter === 5 ? "text-mint" : "text-orange") : ""}`}>
              {s.counter}
            </div>
          </div>
          <div className="font-mono text-xs text-center">
            <div>register1 = <b>{s.r1 ?? "–"}</b></div>
            <div>register2 = <b>{s.r2 ?? "–"}</b></div>
          </div>
        </div>
        <CodeColumn title="consumer" lines={RACE_CODE.C} pc={s.pcC} tone="bg-orange/20" done={s.pcC === 3} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${btn} border-sky`} disabled={s.pcP >= 3} onClick={() => step("P")}>
          producer step
        </button>
        <button type="button" className={`${btn} border-orange`} disabled={s.pcC >= 3} onClick={() => step("C")}>
          consumer step
        </button>
        <button type="button" className={btn} onClick={() => setOrder(TEXTBOOK_RACE)}>
          the slides' order
        </button>
        <button type="button" className={btn} onClick={() => setOrder([])}>
          ⟲
        </button>
      </div>
      <div className="font-mono text-[11px] text-muted-foreground min-h-[1.5em] flex flex-col">
        {s.log.map((l) => (
          <span key={l} className="animate-in fade-in duration-200">
            {l}
          </span>
        ))}
      </div>
      {finished && (
        <p className={`text-sm font-bold animate-in fade-in duration-300 ${s.counter === 5 ? "text-mint" : "text-orange"}`}>
          {s.counter === 5
            ? "counter = 5: correct, because one operation finished before the other started. Now try interleaving them."
            : `counter = ${s.counter}, but one item was produced and one consumed, so it should be 5! That's a race condition.`}
        </p>
      )}
    </Panel>
  );
}

/* ------------------------------ Peterson ------------------------------ */

/** Peterson's algorithm for two processes. You are the scheduler: pick who runs the next line. */
export function PetersonDemo() {
  const [s, setS] = useState<PetersonState>(petersonStart);
  const [last, setLast] = useState<string>("You're the scheduler. Pick which process runs its next line. Try to get both into the critical section at once!");
  const step = (i: 0 | 1) => {
    const n = petersonStep(s, i);
    setS(n);
    const j = 1 - i;
    if (s.pc[i] === 2 && n.pc[i] === 2) setLast(`P${i} spins: flag[${j}] is true and turn == ${j}, so P${j} goes first.`);
    else if (n.pc[i] === 3) setLast(`P${i} enters its critical section${s.flag[j] ? ` (turn == ${i}, so it's P${i}'s turn)` : ` (flag[${j}] is false: P${j} isn't interested)`}.`);
    else setLast(`P${i} ran: ${PETERSON_CODE[s.pc[i]].trim()}`);
  };
  const codeFor = (i: 0 | 1) => PETERSON_CODE.map((l) => l.replace(/\[i\]/g, `[${i}]`).replace(/\[j\]/g, `[${1 - i}]`).replace("turn = j", `turn = ${1 - i}`).replace("turn == j", `turn == ${1 - i}`));
  return (
    <Panel title="Peterson's solution" legend={[["bg-mint", "in critical section"]]}>
      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">
        {([0, 1] as const).map((i) => (
          <div key={i} className={`${i === 0 ? "order-1" : "order-3"} rounded-sm transition-all duration-300 ${s.pc[i] === 3 ? "ring-2 ring-mint" : ""}`}>
            <CodeColumn title={`P${i}${s.pc[i] === 3 ? " · in critical section" : s.pc[i] === 2 && s.spins[i] ? " · spinning" : ""}`} lines={codeFor(i)} pc={s.pc[i]} tone={s.pc[i] === 3 ? "bg-mint/30" : "bg-muted/50"} />
          </div>
        ))}
        <div className="order-2 flex sm:flex-col gap-4 justify-center items-center py-2 font-mono text-xs">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">flag</div>
            <div className="flex gap-1">
              {s.flag.map((f, i) => (
                <span key={i} className={`px-2 py-1 rounded-sm transition-colors ${f ? "bg-foreground text-background" : "bg-muted"}`}>
                  {f ? "T" : "F"}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">turn</div>
            <div key={s.turn} className="font-display text-2xl font-bold animate-in zoom-in-75 duration-300">
              {s.turn}
            </div>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="text-sm min-h-[2.5em]">
        {last}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => step(0)}>
          run P0
        </button>
        <button type="button" className={btn} onClick={() => step(1)}>
          run P1
        </button>
        <button type="button" className={btn} onClick={() => { setS(petersonStart()); setLast("Reset."); }}>
          ⟲
        </button>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground self-center">
          entries P0 {s.entries[0]} · P1 {s.entries[1]}
        </span>
      </div>
    </Panel>
  );
}

/* ------------------------------ spinlock ------------------------------ */

/** Three processes competing for a lock built from test_and_set or compare_and_swap. */
export function SpinlockDemo() {
  const [instr, setInstr] = useState<"tas" | "cas">("tas");
  const [lock, setLock] = useState(false);
  const [inside, setInside] = useState<number | null>(null);
  const [spins, setSpins] = useState([0, 0, 0]);
  const [msg, setMsg] = useState("Click a process to make it try to enter its critical section.");
  const tryEnter = (p: number) => {
    if (inside === p) return;
    let rv: boolean | number;
    if (instr === "tas") {
      const t = { value: lock };
      rv = testAndSet(t);
      setLock(t.value);
    } else {
      const t = { value: lock ? 1 : 0 };
      rv = compareAndSwap(t, 0, 1);
      setLock(t.value === 1);
    }
    const gotIt = rv === false || rv === 0;
    if (gotIt) {
      setInside(p);
      setMsg(instr === "tas" ? `P${p}: test_and_set(&lock) returned false (it was free) and set lock = true, all in one step. P${p} is in!` : `P${p}: compare_and_swap(&lock, 0, 1) returned 0: the lock was 0, so it's now 1. P${p} is in!`);
    } else {
      setSpins((s) => s.map((x, i) => (i === p ? x + 1 : x)));
      setMsg(instr === "tas" ? `P${p}: test_and_set returned true: someone holds the lock. P${p} loops and tries again (busy waiting).` : `P${p}: compare_and_swap returned 1, not 0, so nothing changed. P${p} spins.`);
    }
  };
  const leave = () => {
    if (inside === null) return;
    setMsg(`P${inside} leaves: lock = ${instr === "tas" ? "false" : "0"}.`);
    setLock(false);
    setInside(null);
  };
  return (
    <Panel title="A lock built from an atomic instruction">
      <Toggle<"tas" | "cas">
        value={instr}
        onChange={(v) => {
          setInstr(v);
          setLock(false);
          setInside(null);
          setSpins([0, 0, 0]);
        }}
        options={[
          ["tas", "test_and_set"],
          ["cas", "compare_and_swap"],
        ]}
      />
      <div className="flex flex-wrap items-center gap-4">
        {[0, 1, 2].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => tryEnter(p)}
            className={`rounded-sm border-2 px-4 py-3 text-center transition-all duration-300 ${inside === p ? "border-mint bg-mint/20 scale-105" : "border-border hover:border-foreground/50"}`}
          >
            <div className="font-display font-bold">P{p}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{inside === p ? "in critical section" : spins[p] ? `spun ${spins[p]}×` : "remainder"}</div>
          </button>
        ))}
        <div className={`ml-auto rounded-sm px-4 py-3 font-mono text-sm transition-colors duration-300 ${lock ? "bg-orange text-background" : "bg-muted"}`}>
          lock = {instr === "tas" ? String(lock) : lock ? 1 : 0} {lock ? "🔒" : "🔓"}
        </div>
      </div>
      <p aria-live="polite" className="text-sm min-h-[2.5em]">
        {msg}
      </p>
      <button type="button" className={`${btn} self-start`} disabled={inside === null} onClick={leave}>
        {inside === null ? "nobody inside" : `P${inside} leaves`}
      </button>
    </Panel>
  );
}

/* ------------------------------ semaphores ------------------------------ */

/** A semaphore with a waiting list: wait() below zero blocks you, signal() wakes the first in line. */
export function SemaphoreQueue({ initial = 2 }: { initial?: number }) {
  const [sem, setSem] = useState<Sem>({ value: initial, list: [] });
  const [inside, setInside] = useState<string[]>([]);
  const [next, setNext] = useState(1);
  const [msg, setMsg] = useState(`S = ${initial}: up to ${initial} processes can be inside at once.`);
  const arrive = () => {
    const who = `P${next}`;
    setNext((n) => n + 1);
    const r = semWait(sem, who);
    setSem(r.sem);
    if (r.blocked) setMsg(`${who}: wait(S) makes S.value = ${r.sem.value}. That's below 0, so ${who} is added to S.list and blocked. No busy waiting: it uses no CPU.`);
    else {
      setInside((x) => [...x, who]);
      setMsg(`${who}: wait(S) makes S.value = ${r.sem.value}, which isn't negative, so ${who} carries on.`);
    }
  };
  const leave = () => {
    if (!inside.length) return;
    const [who, ...rest] = inside;
    const r = semSignal(sem);
    setSem(r.sem);
    setInside(r.woke ? [...rest, r.woke] : rest);
    setMsg(r.woke ? `${who}: signal(S) makes S.value = ${r.sem.value}, which is ≤ 0, so someone is waiting: wakeup(${r.woke}) moves it to the ready queue.` : `${who}: signal(S) makes S.value = ${r.sem.value}. Nobody was waiting.`);
  };
  return (
    <Panel title="A semaphore with a waiting queue" legend={[["bg-mint", "inside"], ["bg-orange", "blocked in S.list"]]}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">S.value</div>
          <div key={sem.value} className={`font-display text-4xl font-bold animate-in zoom-in-75 duration-300 ${sem.value < 0 ? "text-orange" : ""}`}>
            {sem.value}
          </div>
        </div>
        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] rounded-sm border border-mint/50 p-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-1">inside</span>
            {inside.map((p) => (
              <span key={p} className="px-2 py-1 rounded-sm bg-mint/30 font-mono text-xs animate-in zoom-in-50 duration-300">
                {p}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] rounded-sm border border-orange/50 p-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-1">S.list</span>
            {sem.list.map((p) => (
              <span key={p} className="px-2 py-1 rounded-sm bg-orange/30 font-mono text-xs animate-in slide-in-from-right-2 duration-300">
                {p} 💤
              </span>
            ))}
          </div>
        </div>
      </div>
      <p aria-live="polite" className="text-sm min-h-[2.5em]">
        {msg}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={arrive}>
          a process calls wait(S)
        </button>
        <button type="button" className={btn} disabled={!inside.length} onClick={leave}>
          {inside[0] ? `${inside[0]} calls signal(S)` : "signal(S)"}
        </button>
        <button type="button" className={btn} onClick={() => { setSem({ value: initial, list: [] }); setInside([]); setNext(1); setMsg("Reset."); }}>
          ⟲
        </button>
      </div>
      <p className="text-xs text-muted-foreground">When S.value is negative, its size is exactly the number of processes waiting.</p>
    </Panel>
  );
}

/** The S and Q deadlock from the slides. */
export function SemaphoreDeadlock() {
  const frames = useMemo(() => deadlockFrames(), []);
  return (
    <Stepper
      title="Deadlock with two semaphores"
      frames={frames}
      code={DEADLOCK_CODE}
      codeLabel="What happens"
      legend={[["bg-sky", "holds"], ["bg-orange", "waits for"]]}
      render={(s: DeadlockState) => (
        <svg viewBox="0 0 420 200" className="w-full max-w-[460px] h-auto mx-auto" role="img" aria-label="processes and semaphores">
          <defs>
            <marker id="dl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" className="fill-orange" />
            </marker>
            <marker id="dl-arrow-hold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" className="fill-sky" />
            </marker>
          </defs>
          {(["S", "Q"] as const).map((r) => {
            const x = r === "S" ? 110 : 310;
            const owner = s.held[r];
            return owner ? (
              <line key={`h${r}`} x1={x} y1={135} x2={owner === "P0" ? 120 : 300} y2={68} className="stroke-sky animate-in fade-in duration-500" strokeWidth={3} markerEnd="url(#dl-arrow-hold)" />
            ) : null;
          })}
          {(["P0", "P1"] as const).map((p) => {
            const r = s.waiting[p];
            if (!r) return null;
            const x1 = p === "P0" ? 120 : 300;
            const x2 = r === "S" ? 120 : 300;
            return <line key={`w${p}`} x1={x1} y1={68} x2={x2 + (p === "P0" ? -10 : 10)} y2={135} className="stroke-orange animate-in fade-in duration-500" strokeWidth={3} strokeDasharray="6 4" markerEnd="url(#dl-arrow)" />;
          })}
          {(["P0", "P1"] as const).map((p) => {
            const x = p === "P0" ? 120 : 300;
            const blocked = !!s.waiting[p];
            return (
              <g key={p}>
                <circle cx={x} cy={45} r={24} strokeWidth={2} className={`transition-all duration-300 ${blocked ? "fill-orange/20 stroke-orange" : "fill-card stroke-border"}`} />
                <text x={x} y={50} textAnchor="middle" className="fill-foreground font-display font-bold text-[14px]">
                  {p}
                </text>
              </g>
            );
          })}
          {(["S", "Q"] as const).map((r) => {
            const x = r === "S" ? 110 : 310;
            return (
              <g key={r}>
                <rect x={x - 30} y={135} width={60} height={40} rx={4} strokeWidth={2} className={`transition-all duration-300 ${s.held[r] ? "fill-sky/20 stroke-sky" : "fill-card stroke-border"}`} />
                <text x={x} y={160} textAnchor="middle" className="fill-foreground font-mono text-[13px] font-bold">
                  {r} = {s.held[r] ? 0 : 1}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    />
  );
}

/* ------------------------------ bounded buffer with semaphores ------------------------------ */

/** The semaphore solution: empty counts free slots, full counts items, mutex guards the buffer. */
export function SemaphoreBuffer({ n = 5, java = false }: { n?: number; java?: boolean }) {
  // the lab's Java version calls the semaphores spaces/elements, uses P()/V(), and has no mutex
  const E = java ? "spaces" : "empty";
  const F = java ? "elements" : "full";
  const [b, setB] = useState<SemBuffer>(() => semBuffer(n));
  const [msg, setMsg] = useState(java ? `spaces = ${n}, elements = 0.` : "empty = n, full = 0, mutex = 1.");
  const prod = () => {
    const r = semProduce(b);
    setB(r);
    setMsg(
      r.blockedP
        ? `Producer: ${java ? "spaces.P()" : "wait(empty)"} with ${E} = 0. No free slot, so the producer blocks until a consumer signals ${E}.`
        : java
          ? `Producer: spaces.P() → spaces = ${r.empty}; store[inptr] = ${b.next}; elements.V() → elements = ${r.full}.`
          : `Producer: wait(empty) → empty = ${r.empty}; wait(mutex); put item ${b.next}; signal(mutex); signal(full) → full = ${r.full}.`,
    );
  };
  const cons = () => {
    const r = semConsume(b);
    setB(r);
    setMsg(
      r.blockedC
        ? `Consumer: ${java ? "elements.P()" : "wait(full)"} with ${F} = 0. Nothing to take, so the consumer blocks until a producer signals ${F}.`
        : java
          ? `Consumer: elements.P() → elements = ${r.full}; value = store[outptr]; spaces.V() → spaces = ${r.empty}.`
          : `Consumer: wait(full) → full = ${r.full}; wait(mutex); take an item; signal(mutex); signal(empty) → empty = ${r.empty}.`,
    );
  };
  const sem = (name: string, v: number, tone: string) => (
    <div className="text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{name}</div>
      <div key={v} className={`font-display text-2xl font-bold animate-in zoom-in-75 duration-300 ${tone}`}>
        {v}
      </div>
    </div>
  );
  return (
    <Panel title="Bounded buffer with semaphores">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex gap-1.5">
          {b.slots.map((v, i) => (
            <div key={i} className={`h-12 w-12 rounded-sm border-2 flex items-center justify-center font-mono font-bold transition-all duration-300 ${v !== null ? "border-mint bg-mint/25" : "border-dashed border-border"}`}>
              {v !== null && <span className="animate-in zoom-in-50 duration-300">{v}</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-5">
          {sem(E, b.empty, b.empty === 0 ? "text-orange" : "")}
          {sem(F, b.full, b.full === 0 ? "text-orange" : "")}
          {!java && sem("mutex", 1, "")}
        </div>
      </div>
      <p aria-live="polite" className="text-sm font-mono min-h-[2.5em]">
        {msg}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={prod}>
          producer
        </button>
        <button type="button" className={btn} onClick={cons}>
          consumer
        </button>
        <button type="button" className={btn} onClick={() => { setB(semBuffer(n)); setMsg("Reset."); }}>
          ⟲
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {java ? "One producer thread and one consumer thread: inptr and outptr are each touched by only one thread, so no mutex is needed." : `Unlike the in/out-only version from the IPC lesson, the semaphores keep count, so all ${n} slots can be used.`}
      </p>
    </Panel>
  );
}

/* ------------------------------ readers-writers ------------------------------ */

/** Readers share the data; a writer needs it alone. Add readers and writers and watch who waits. */
export function ReadersWriters() {
  const [s, setS] = useState<RW>(rwStart);
  return (
    <Panel title="Readers and writers" legend={[["bg-sky", "reader"], ["bg-orange", "writer"]]}>
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
        <div className={`relative rounded-sm border-2 min-h-[110px] p-3 flex flex-wrap content-start gap-2 transition-colors duration-300 ${s.writing ? "border-orange bg-orange/10" : s.reading.length ? "border-sky bg-sky/10" : "border-border"}`}>
          <div className="w-full font-mono text-[10px] uppercase tracking-widest text-muted-foreground">📄 shared data set</div>
          {s.reading.map((r) => (
            <span key={r} className="px-2 py-1 rounded-sm bg-sky/40 font-mono text-xs animate-in zoom-in-50 duration-300">
              {r} reading 👀
            </span>
          ))}
          {s.writing && <span className="px-2 py-1 rounded-sm bg-orange/50 font-mono text-xs animate-in zoom-in-50 duration-300">{s.writing} writing ✍️</span>}
        </div>
        <div className="font-mono text-xs flex sm:flex-col gap-3">
          <div>read_count = <b>{s.readCount}</b></div>
          <div>rw_mutex = <b>{s.writing || s.readCount ? 0 : 1}</b></div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] rounded-sm border border-dashed border-border p-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-1">waiting</span>
        {[...s.queue.map((q) => q.name), ...s.behind].map((w) => (
          <span key={w} className={`px-2 py-1 rounded-sm font-mono text-xs animate-in slide-in-from-right-2 duration-300 ${w.startsWith("W") ? "bg-orange/30" : "bg-sky/30"}`}>
            {w}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setS(rwArrive(s, "R"))}>
          + reader
        </button>
        <button type="button" className={btn} onClick={() => setS(rwArrive(s, "W"))}>
          + writer
        </button>
        <button type="button" className={btn} disabled={!s.reading.length} onClick={() => setS(rwLeave(s, "R"))}>
          a reader leaves
        </button>
        <button type="button" className={btn} disabled={!s.writing} onClick={() => setS(rwLeave(s, "W"))}>
          writer leaves
        </button>
        <button type="button" className={btn} onClick={() => setS(rwStart())}>
          ⟲
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Try this: add two readers, then a writer, then keep adding readers. New readers walk right in while the writer waits... possibly forever. That's the <b>starvation</b> risk of the first variation.
      </p>
    </Panel>
  );
}

/* ------------------------------ dining philosophers ------------------------------ */

/** Five philosophers, five chopsticks. Run them randomly, or make everyone grab their left chopstick at once. */
export function DiningPhilosophers() {
  const N = 5;
  const [mode, setMode] = useState<"naive" | "asymmetric">("naive");
  const [d, setD] = useState<Dining>(() => diningStart(N));
  const [running, setRunning] = useState(false);
  const rnd = useRef(seeded(11));
  const dead = diningDeadlocked(d, mode);
  useEffect(() => {
    if (!running || dead) return;
    const t = setInterval(() => setD((x) => diningStep(x, Math.floor(rnd.current() * N), mode)), 260);
    return () => clearInterval(t);
  }, [running, dead, mode]);
  const grabLeft = () => {
    setRunning(false);
    let x = diningStart(N);
    for (let i = 0; i < N; i++) x = diningStep(x, i, mode);
    for (let i = 0; i < N; i++) x = diningStep(x, i, mode);
    setD(x);
  };
  const C = 140;
  const at = (i: number, r: number, offset = 0) => {
    const a = ((i + offset) / N) * Math.PI * 2 - Math.PI / 2;
    return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
  };
  const face: Record<Phil, string> = { thinking: "🤔", hungry: "😋", eating: "🍜" };
  return (
    <Panel title="Dining philosophers" legend={[["bg-sky", "thinking"], ["bg-orange", "hungry"], ["bg-mint", "eating"]]}>
      <Toggle<"naive" | "asymmetric">
        value={mode}
        onChange={(m) => {
          setMode(m);
          setD(diningStart(N));
          setRunning(false);
        }}
        options={[
          ["naive", "Slides' algorithm: left, then right"],
          ["asymmetric", "Fix: odd philosophers pick right first"],
        ]}
      />
      <div className="grid sm:grid-cols-[280px_1fr] gap-4 items-center">
        <svg viewBox="0 0 280 280" className="w-full max-w-[280px] h-auto mx-auto" role="img" aria-label="table of philosophers">
          <circle cx={C} cy={C} r={62} className="fill-muted/60 stroke-border" />
          <text x={C} y={C + 6} textAnchor="middle" className="text-[22px]">
            🍚
          </text>
          {d.stick.map((owner, k) => {
            // chopstick k sits between philosopher k and k+1
            const [x1, y1] = at(k, owner === null ? 72 : 88, owner === null ? 0.5 : owner === k ? 0.25 : 0.75);
            const [x2, y2] = at(k, owner === null ? 102 : 112, owner === null ? 0.5 : owner === k ? 0.25 : 0.75);
            return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={5} strokeLinecap="round" className={`transition-all duration-300 ${owner === null ? "stroke-muted-foreground" : "stroke-foreground"}`} />;
          })}
          {d.phil.map((p, i) => {
            const [x, y] = at(i, 118);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={20} strokeWidth={2.5} className={`transition-all duration-300 ${p === "eating" ? "fill-mint/40 stroke-mint" : p === "hungry" ? "fill-orange/30 stroke-orange" : "fill-sky/20 stroke-sky"}`} />
                <text x={x} y={y + 6} textAnchor="middle" className="text-[16px]">
                  {face[p]}
                </text>
                <text x={x} y={y + 34} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
                  P{i} · {d.meals[i]}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-col gap-3">
          {dead ? (
            <p className="text-sm font-bold text-orange animate-in zoom-in-95 duration-300">
              💀 Deadlock! Every philosopher holds their left chopstick and waits forever for the right one, which their neighbour is holding.
            </p>
          ) : (
            <p className="text-sm">{running ? "Philosophers think, get hungry, pick up chopsticks one at a time, eat, and put them down." : "Press run, or force the worst case."}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={dead} onClick={() => setRunning((r) => !r)}>
              {running ? "❚❚ pause" : "▶ run"}
            </button>
            <button type="button" className={btn} onClick={grabLeft}>
              everyone grabs a chopstick at once
            </button>
            <button type="button" className={btn} onClick={() => { setD(diningStart(N)); setRunning(false); }}>
              ⟲
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {mode === "naive"
              ? "With the slides' algorithm, \"everyone grabs a chopstick at once\" deadlocks immediately."
              : "With the fix, philosophers next to each other reach for the same chopstick first, so the circle of waiting can never close. Try to deadlock it: you can't."}
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------ Java synchronization ------------------------------ */

/** Thread A increments and thread B decrements the same counter. Flip synchronized on and off. */
export function SynchronizedRace() {
  const [synced, setSynced] = useState(false);
  const [order, setOrder] = useState<(0 | 1)[]>([]);
  const s = useMemo(() => jraceRun(order, synced), [order, synced]);
  const steps = [jraceSteps(synced, "inc"), jraceSteps(synced, "dec")];
  const done = s.pc[0] >= steps[0].length && s.pc[1] >= steps[1].length;
  // the lab's trace: alternate A, B, A, B... (blocked turns don't advance) until both finish
  const labOrder = useMemo(() => {
    const o: (0 | 1)[] = [];
    for (let k = 0; k < 40; k++) {
      o.push((k % 2) as 0 | 1);
      const r = jraceRun(o, synced);
      if (r.pc[0] >= jraceSteps(synced, "inc").length && r.pc[1] >= jraceSteps(synced, "dec").length) break;
    }
    return o;
  }, [synced]);
  return (
    <Panel title="Two threads, one counter (c starts at 1)" legend={[["bg-sky", "A: increment()"], ["bg-violet", "B: decrement()"]]}>
      <div className="flex flex-wrap items-center gap-3">
        <Toggle<"off" | "on">
          value={synced ? "on" : "off"}
          onChange={(v) => {
            setSynced(v === "on");
            setOrder([]);
          }}
          options={[
            ["off", "plain methods"],
            ["on", "synchronized methods"],
          ]}
        />
        <span className={`font-mono text-xs px-2 py-1 rounded-sm transition-colors ${s.owner === null ? "bg-muted" : "bg-orange text-background"}`}>
          {synced ? (s.owner === null ? "🔓 lock free" : `🔒 held by ${s.owner ? "B" : "A"}`) : "no lock"}
        </span>
      </div>
      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">
        <CodeColumn title={`A · increment()${s.blocked[0] ? " · blocked" : ""}`} lines={steps[0]} pc={s.pc[0]} tone={s.blocked[0] ? "bg-orange/30" : "bg-sky/20"} done={s.pc[0] >= steps[0].length} />
        <div className="text-center py-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">c</div>
          <div key={s.c} className={`font-display text-4xl font-bold animate-in zoom-in-75 duration-300 ${done ? (s.c === 1 ? "text-mint" : "text-orange") : ""}`}>
            {s.c}
          </div>
          <div className="font-mono text-[11px]">A.reg = {s.reg[0] ?? "–"} · B.reg = {s.reg[1] ?? "–"}</div>
        </div>
        <CodeColumn title={`B · decrement()${s.blocked[1] ? " · blocked" : ""}`} lines={steps[1]} pc={s.pc[1]} tone={s.blocked[1] ? "bg-orange/30" : "bg-violet/20"} done={s.pc[1] >= steps[1].length} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={s.pc[0] >= steps[0].length} onClick={() => setOrder((o) => [...o, 0])}>
          run A
        </button>
        <button type="button" className={btn} disabled={s.pc[1] >= steps[1].length} onClick={() => setOrder((o) => [...o, 1])}>
          run B
        </button>
        <button type="button" className={btn} onClick={() => setOrder(labOrder)}>
          the lab's order (A, B, A, B, …)
        </button>
        <button type="button" className={btn} onClick={() => setOrder([])}>
          ⟲
        </button>
      </div>
      <div className="font-mono text-[11px] text-muted-foreground flex flex-col min-h-[1.5em]">
        {s.log.map((l, i) => (
          <span key={i} className="animate-in fade-in duration-200">
            {l}
          </span>
        ))}
      </div>
      {done && (
        <p className={`text-sm font-bold animate-in fade-in ${s.c === 1 ? "text-mint" : "text-orange"}`}>
          {s.c === 1 ? "c = 1, correct. " + (synced ? "With synchronized, the two methods can't interleave, whatever order you pick." : "Lucky order! Try alternating A and B.") : `c = ${s.c}, but +1 − 1 should leave it at 1. Now switch on synchronized and try the same order.`}
        </p>
      )}
    </Panel>
  );
}

/** A Java object's monitor: who owns the lock, who waits to enter, who sleeps in wait(). */
export function JavaMonitor() {
  const [m, setM] = useState<Monitor>(monitorStart);
  const threads = ["T1", "T2", "T3"];
  const where = (t: string) => (m.owner === t ? "owner" : m.entry.includes(t) ? "entry" : m.waitSet.includes(t) ? "wait" : "outside");
  const zone = (title: string, list: string[], tone: string, hint: string) => (
    <div className={`rounded-sm border-2 border-dashed p-2 min-h-[70px] ${tone}`}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="text-[10px] text-muted-foreground mb-1">{hint}</div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((t) => (
          <span key={t} className="px-2 py-1 rounded-sm bg-foreground text-background font-mono text-xs animate-in zoom-in-50 duration-300">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
  return (
    <Panel title="Inside a Java object's monitor">
      <div className="grid sm:grid-cols-3 gap-3">
        {zone("entry set", m.entry, "border-orange/50", "blocked, waiting for the lock")}
        <div className={`rounded-sm border-2 p-2 min-h-[70px] flex flex-col items-center justify-center transition-colors duration-300 ${m.owner ? "border-mint bg-mint/15" : "border-border"}`}>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">owner {m.owner ? "🔒" : "🔓"}</div>
          {m.owner ? (
            <span key={m.owner} className="mt-1 px-3 py-1.5 rounded-sm bg-mint text-background font-mono font-bold animate-in zoom-in-50 duration-300">
              {m.owner}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground mt-1">nobody</span>
          )}
        </div>
        {zone("wait set", m.waitSet, "border-sky/50", "called wait(), sleeping until notify()")}
      </div>
      <p aria-live="polite" className="text-sm min-h-[2.5em]">
        {m.note}
      </p>
      <div className="flex flex-col gap-2">
        {threads.map((t) => {
          const w = where(t);
          return (
            <div key={t} className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs w-20">
                {t} <span className="text-muted-foreground">· {w}</span>
              </span>
              <button type="button" className={`${btn} !px-2 !py-1`} disabled={w !== "outside"} onClick={() => setM(monitorEnter(m, t))}>
                synchronized
              </button>
              <button type="button" className={`${btn} !px-2 !py-1`} disabled={w !== "owner"} onClick={() => setM(monitorWait(m, t))}>
                wait()
              </button>
              <button type="button" className={`${btn} !px-2 !py-1`} disabled={w !== "owner"} onClick={() => setM(monitorNotify(m, t))}>
                notify()
              </button>
              <button type="button" className={`${btn} !px-2 !py-1`} disabled={w !== "owner"} onClick={() => setM(monitorNotify(m, t, true))}>
                notifyAll()
              </button>
              <button type="button" className={`${btn} !px-2 !py-1`} disabled={w !== "owner"} onClick={() => setM(monitorExit(m, t))}>
                exit block
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className={`${btn} self-start`} onClick={() => setM(monitorStart())}>
        ⟲ reset
      </button>
    </Panel>
  );
}

/* ------------------------------ CPU scheduling ------------------------------ */

const PROC_FILL = ["bg-sky", "bg-violet", "bg-orange", "bg-mint", "bg-neon", "bg-sky/60", "bg-violet/60", "bg-orange/60"];

/** A Gantt chart revealed up to time t, with the slice boundaries labelled underneath. */
function Gantt({ slices, t, names }: { slices: { name: string | null; from: number; to: number; level?: number }[]; t: number; names: string[] }) {
  const total = slices.length ? slices[slices.length - 1].to : 1;
  const ticks = [...new Set(slices.flatMap((s) => [s.from, s.to]))];
  return (
    <div className="min-w-[420px]">
      <div className="relative h-10 rounded-sm border border-border bg-background/60 overflow-hidden">
        {slices.map((s, i) => {
          const end = Math.min(s.to, t);
          if (end <= s.from) return null;
          const tone = s.name === null ? "bg-muted" : PROC_FILL[names.indexOf(s.name) % PROC_FILL.length];
          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 ${tone} border-r border-background flex items-center justify-center overflow-hidden transition-[width] duration-150`}
              style={{ left: `${(s.from / total) * 100}%`, width: `${((end - s.from) / total) * 100}%` }}
            >
              <span className="font-mono text-[11px] font-bold text-background">{s.name ?? "idle"}</span>
            </div>
          );
        })}
      </div>
      <div className="relative h-5">
        {ticks.map((x) => (
          <span key={x} className={`absolute -translate-x-1/2 font-mono text-[10px] transition-opacity ${x <= t ? "text-foreground" : "text-muted-foreground/40"}`} style={{ left: `${(x / total) * 100}%` }}>
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

const ALGO_LABEL: Record<Algo, string> = {
  fcfs: "FCFS",
  sjf: "SJF",
  srtf: "SRTF (preemptive SJF)",
  priority: "Priority",
  "priority-p": "Priority (preemptive)",
  rr: "Round robin",
};

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2));

/** Pick a slide example or type your own processes, choose an algorithm, and watch the Gantt chart fill in. */
export function CpuScheduler({ presets, algos }: { presets?: string; algos?: string }) {
  const presetList = useMemo(() => (presets ? presets.split(",").map((id) => SCHED_PRESETS.find((p) => p.id === id.trim())!).filter(Boolean) : SCHED_PRESETS), [presets]);
  const algoList = (algos ? algos.split(",").map((a) => a.trim()) : ["fcfs", "sjf", "srtf", "priority", "priority-p", "rr"]) as Algo[];
  const [presetId, setPresetId] = useState<string | null>(presetList[0].id);
  const [procs, setProcs] = useState<Proc[]>(presetList[0].procs);
  const [algo, setAlgo] = useState<Algo>(presetList[0].algo);
  const [q, setQ] = useState(presetList[0].quantum ?? 4);
  const run = useMemo(() => schedule(procs, algo, q), [procs, algo, q]);
  const total = run.slices.length ? run.slices[run.slices.length - 1].to : 0;
  const [t, setT] = useState(0);
  useEffect(() => setT(0), [run]);
  useEffect(() => {
    if (t >= total) return;
    const step = Math.max(1, Math.round(total / 60));
    const id = setTimeout(() => setT((x) => Math.min(total, x + step)), 40);
    return () => clearTimeout(id);
  }, [t, total]);
  const preset = presetList.find((p) => p.id === presetId);
  const showPriority = algo === "priority" || algo === "priority-p" || procs.some((p) => p.priority !== undefined);
  const choose = (id: string) => {
    const p = presetList.find((x) => x.id === id)!;
    setPresetId(id);
    setProcs(p.procs);
    setAlgo(p.algo);
    if (p.quantum) setQ(p.quantum);
  };
  const edit = (i: number, k: "arrival" | "burst" | "priority", v: number) => {
    setPresetId(null);
    setProcs((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: Math.max(k === "burst" ? 1 : 0, Math.min(99, v || 0)) } : p)));
  };
  const names = procs.map((p) => p.name);
  const cell = "w-14 bg-transparent border border-border rounded-sm px-1 py-0.5 font-mono text-xs text-right";
  return (
    <Panel title="CPU scheduler" legend={procs.map((p, i) => [PROC_FILL[i % PROC_FILL.length], p.name] as [string, string])}>
      <div className="flex flex-wrap gap-1.5">
        {presetList.map((p) => (
          <button key={p.id} type="button" className={`${btn} !px-2 !py-1 !normal-case !tracking-normal ${p.id === presetId ? "bg-foreground text-background" : ""}`} onClick={() => choose(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap border border-border rounded-sm overflow-hidden">
          {algoList.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAlgo(a);
                setPresetId(null);
              }}
              className={`font-mono text-[11px] uppercase tracking-widest px-3 py-2 transition-colors ${algo === a ? "bg-foreground text-background" : "hover:bg-foreground/10"}`}
            >
              {ALGO_LABEL[a]}
            </button>
          ))}
        </div>
        {algo === "rr" && (
          <label className="inline-flex items-center gap-2 font-mono text-xs">
            <span className="uppercase tracking-widest text-muted-foreground">quantum q</span>
            <input type="range" min={1} max={30} value={q} onChange={(e) => { setQ(Number(e.target.value)); setPresetId(null); }} aria-label="time quantum" />
            <span className="w-6">{q}</span>
          </label>
        )}
      </div>
      <div className="overflow-x-auto">
        <Gantt slices={run.slices} t={t} names={names} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs border-collapse min-w-[460px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <th className="text-left py-1.5 font-normal">process</th>
              <th className="text-right py-1.5 font-normal">arrival</th>
              <th className="text-right py-1.5 font-normal">burst</th>
              {showPriority && <th className="text-right py-1.5 font-normal">priority</th>}
              <th className="text-right py-1.5 font-normal">finish</th>
              <th className="text-right py-1.5 font-normal">turnaround</th>
              <th className="text-right py-1.5 font-normal">waiting</th>
            </tr>
          </thead>
          <tbody>
            {procs.map((p, i) => {
              const st = run.stats[i];
              const finished = st.completion <= t;
              return (
                <tr key={p.name} className="border-b border-border/50">
                  <td className="py-1">
                    <span className={`inline-block h-2.5 w-2.5 rounded-[2px] mr-2 ${PROC_FILL[i % PROC_FILL.length]}`} />
                    {p.name}
                  </td>
                  <td className="py-1 text-right">
                    <input type="number" className={cell} value={p.arrival} onChange={(e) => edit(i, "arrival", Number(e.target.value))} aria-label={`${p.name} arrival`} />
                  </td>
                  <td className="py-1 text-right">
                    <input type="number" className={cell} value={p.burst} onChange={(e) => edit(i, "burst", Number(e.target.value))} aria-label={`${p.name} burst`} />
                  </td>
                  {showPriority && (
                    <td className="py-1 text-right">
                      <input type="number" className={cell} value={p.priority ?? 0} onChange={(e) => edit(i, "priority", Number(e.target.value))} aria-label={`${p.name} priority`} />
                    </td>
                  )}
                  <td className="py-1 text-right">{finished ? st.completion : "…"}</td>
                  <td className="py-1 text-right">{finished ? st.turnaround : "…"}</td>
                  <td className={`py-1 text-right ${finished ? "font-bold" : ""}`}>{finished ? st.waiting : "…"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">average waiting time </span>
          <span className="font-display text-2xl font-bold">{t >= total ? fmt(run.avgWaiting) : "…"}</span>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          avg turnaround <span className="text-foreground">{t >= total ? fmt(run.avgTurnaround) : "…"}</span> · context switches <span className="text-foreground">{run.switches}</span>
        </div>
        {preset && t >= total && <span className="font-mono text-[11px] px-2 py-1 rounded-sm bg-mint/20 text-mint animate-in zoom-in-75">✓ same as the slides</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setT(0)}>
          ⟲ replay
        </button>
        <button
          type="button"
          className={btn}
          disabled={procs.length >= 8}
          onClick={() => {
            setPresetId(null);
            setProcs((ps) => [...ps, { name: `P${ps.length + 1}`, arrival: 0, burst: 5, priority: 3 }]);
          }}
        >
          + process
        </button>
        <button
          type="button"
          className={btn}
          disabled={procs.length <= 1}
          onClick={() => {
            setPresetId(null);
            setProcs((ps) => ps.slice(0, -1));
          }}
        >
          − process
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Edit any arrival, burst or priority to make your own exercise. Waiting time = turnaround − burst = finish − arrival − burst. Smaller priority numbers mean higher priority.</p>
    </Panel>
  );
}

/** Predicting the next CPU burst with exponential averaging. */
export function BurstPrediction() {
  const [alpha, setAlpha] = useState(0.5);
  const tau0 = 10;
  const tau = expAverage(BURST_SAMPLE, alpha, tau0);
  const W = 520;
  const H = 220;
  const steps = BURST_SAMPLE.length + 1;
  const X = (i: number) => 40 + (i / steps) * (W - 60);
  const Y = (v: number) => H - 30 - (v / 14) * (H - 50);
  const stair = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)} L${X(i + 1)},${Y(v)}`).join(" ");
  return (
    <Panel title="Predicting the length of the next CPU burst" legend={[["bg-sky", "actual burst tᵢ"], ["bg-orange", "prediction τᵢ"]]}>
      <label className="flex flex-wrap items-center gap-3 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">α</span>
        <input type="range" min={0} max={1} step={0.05} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="alpha" />
        <span className="w-10 font-display text-lg font-bold">{alpha.toFixed(2)}</span>
        <span className="text-muted-foreground">τ₀ = {tau0}</span>
      </label>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-[600px]" role="img" aria-label="actual and predicted CPU bursts">
        {[0, 2, 4, 6, 8, 10, 12].map((v) => (
          <g key={v}>
            <line x1={40} x2={W - 20} y1={Y(v)} y2={Y(v)} className="stroke-border" strokeWidth={0.5} />
            <text x={30} y={Y(v) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[9px]">
              {v}
            </text>
          </g>
        ))}
        <path d={stair(BURST_SAMPLE)} fill="none" strokeWidth={2.5} className="stroke-sky" />
        <path d={stair(tau)} fill="none" strokeWidth={2.5} strokeDasharray="5 3" className="stroke-orange transition-all duration-300" />
        {tau.map((v, i) => (
          <text key={i} x={(X(i) + X(i + 1)) / 2} y={Y(v) - 5} textAnchor="middle" className="fill-orange font-mono text-[10px] font-bold">
            {fmt(v)}
          </text>
        ))}
        {BURST_SAMPLE.map((v, i) => (
          <text key={i} x={(X(i) + X(i + 1)) / 2} y={Y(v) + 13} textAnchor="middle" className="fill-sky font-mono text-[10px]">
            {v}
          </text>
        ))}
      </svg>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {alpha === 0 ? "α = 0: the prediction never changes. Recent history doesn't count." : alpha === 1 ? "α = 1: the prediction is just the last actual burst. Only the most recent history counts." : "With α in between, the prediction follows the real bursts but smooths out sudden jumps. Commonly α = ½."}
      </p>
    </Panel>
  );
}

/** One process of 10 time units, cut into slices by the time quantum. */
export function QuantumSwitches() {
  const [q, setQ] = useState(6);
  const burst = 10;
  const n = Math.ceil(burst / q);
  return (
    <Panel title="A smaller time quantum means more context switches">
      <label className="flex flex-wrap items-center gap-3 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">quantum q</span>
        <input type="range" min={1} max={12} value={q} onChange={(e) => setQ(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="time quantum" />
        <span className="w-6 font-display text-lg font-bold">{q}</span>
      </label>
      <div className="flex h-10 rounded-sm overflow-hidden border border-border">
        {Array.from({ length: n }, (_, i) => (
          <div key={`${q}-${i}`} className={`flex items-center justify-center border-r-4 border-background last:border-r-0 animate-in fade-in duration-300 ${i % 2 ? "bg-sky/70" : "bg-sky"}`} style={{ width: `${(Math.min(q, burst - i * q) / burst) * 100}%` }}>
            <span className="font-mono text-[10px] text-background font-bold">{Math.min(q, burst - i * q)}</span>
          </div>
        ))}
      </div>
      <div className="font-mono text-sm">
        process time = {burst} · quantum = {q} · <b>context switches = {switchesFor(burst, q)}</b>
      </div>
      <p className="text-xs text-muted-foreground">Each switch costs time where no useful work is done. Rule of thumb: q should be large compared to the context-switch time, and about 80% of CPU bursts should be shorter than q.</p>
    </Panel>
  );
}

/** The slides' three-level feedback queue: long jobs sink to lower levels. */
export function MlfqDemo() {
  const [bursts, setBursts] = useState([5, 20, 40, 12]);
  const jobs = bursts.map((b, i) => ({ name: String.fromCharCode(65 + i), burst: b }));
  const slices = useMemo(() => mlfq(bursts.map((b, i) => ({ name: String.fromCharCode(65 + i), burst: b }))), [bursts]);
  const total = slices.length ? slices[slices.length - 1].to : 0;
  const [t, setT] = useState(0);
  useEffect(() => setT(0), [slices]);
  useEffect(() => {
    if (t >= total) return;
    const id = setTimeout(() => setT((x) => Math.min(total, x + 1)), 45);
    return () => clearTimeout(id);
  }, [t, total]);
  const levelTone = ["bg-mint", "bg-sky", "bg-orange"];
  const current = slices.find((s) => s.from <= t && t < s.to);
  const levelOf = (name: string) => {
    const past = slices.filter((s) => s.name === name && s.from <= t);
    const last = past[past.length - 1];
    if (!last) return 0;
    const job = jobs.find((j) => j.name === name)!;
    const usedSoFar = past.reduce((a, s) => a + Math.min(s.to, t) - s.from, 0);
    if (usedSoFar >= job.burst) return 3;
    return last.to <= t ? Math.min(2, last.level + 1) : last.level;
  };
  return (
    <Panel title="Multilevel feedback queue" legend={[["bg-mint", "Q0: RR, q = 8"], ["bg-sky", "Q1: RR, q = 16"], ["bg-orange", "Q2: FCFS"]]}>
      <div className="grid sm:grid-cols-3 gap-2">
        {["Q0 · quantum 8", "Q1 · quantum 16", "Q2 · FCFS"].map((title, lvl) => (
          <div key={title} className={`rounded-sm border-2 p-2 min-h-[64px] ${lvl === 0 ? "border-mint/50" : lvl === 1 ? "border-sky/50" : "border-orange/50"}`}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
            <div className="flex flex-wrap gap-1">
              {jobs
                .filter((j) => levelOf(j.name) === lvl)
                .map((j) => (
                  <span key={j.name} className={`px-2 py-1 rounded-sm font-mono text-xs text-background font-bold animate-in zoom-in-50 duration-300 ${levelTone[lvl]} ${current?.name === j.name ? "ring-2 ring-foreground" : ""}`}>
                    {j.name}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          <div className="relative h-9 rounded-sm border border-border overflow-hidden">
            {slices.map((s, i) => {
              const end = Math.min(s.to, t);
              if (end <= s.from) return null;
              return (
                <div key={i} className={`absolute top-0 bottom-0 ${levelTone[s.level]} border-r border-background flex items-center justify-center`} style={{ left: `${(s.from / total) * 100}%`, width: `${((end - s.from) / total) * 100}%` }}>
                  <span className="font-mono text-[11px] font-bold text-background">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
        {bursts.map((b, i) => (
          <label key={i} className="inline-flex items-center gap-1">
            {String.fromCharCode(65 + i)} burst
            <input type="number" min={1} max={60} value={b} onChange={(e) => setBursts((bs) => bs.map((x, j) => (j === i ? Math.max(1, Math.min(60, Number(e.target.value) || 1)) : x)))} className="w-14 bg-transparent border border-border rounded-sm px-1 py-0.5 text-right" aria-label={`job ${String.fromCharCode(65 + i)} burst`} />
          </label>
        ))}
        <button type="button" className={btn} onClick={() => setT(0)}>
          ⟲ replay
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">Every job starts in Q0. Short jobs finish there, fast. A job that uses its whole 8 ms is demoted to Q1, and one that also uses its 16 ms there sinks to Q2, where CPU-hungry jobs run FCFS when nothing better is waiting.</p>
    </Panel>
  );
}

/** Little's formula: n = λ × W. */
export function LittlesLaw() {
  const [lambda, setLambda] = useState(7);
  const [w, setW] = useState(2);
  return (
    <Panel title="Little's formula">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 font-mono text-xs">
          <span className="uppercase tracking-widest text-muted-foreground">λ: arrivals per second</span>
          <input type="range" min={1} max={20} value={lambda} onChange={(e) => setLambda(Number(e.target.value))} aria-label="arrival rate" />
          <span className="font-display text-lg font-bold">{lambda}</span>
        </label>
        <label className="flex flex-col gap-1 font-mono text-xs">
          <span className="uppercase tracking-widest text-muted-foreground">W: average wait (seconds)</span>
          <input type="range" min={0.5} max={5} step={0.5} value={w} onChange={(e) => setW(Number(e.target.value))} aria-label="average wait" />
          <span className="font-display text-lg font-bold">{w}</span>
        </label>
      </div>
      <div className="font-display text-2xl">
        n = λ × W = {lambda} × {w} = <b>{fmt(lambda * w)}</b> <span className="text-sm font-mono text-muted-foreground">processes in the queue, on average</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: Math.min(60, Math.round(lambda * w)) }, (_, i) => (
          <span key={i} className="h-3 w-3 rounded-[2px] bg-sky animate-in zoom-in-50 duration-200" />
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------ main memory ------------------------------ */

/** The MMU in two flavours: base/limit protection, and the relocation register. */
export function MmuDemo() {
  const [mode, setMode] = useState<"protect" | "relocate">("protect");
  const [addr, setAddr] = useState(300100);
  const [logical, setLogical] = useState(346);
  const base = 300040;
  const limit = 120900;
  const reloc = 14000;
  const check = baseLimitCheck(addr, base, limit);
  const r = relocate(logical, reloc);
  const stage = (label: string, body: React.ReactNode, tone: string, k: string) => (
    <div key={k} className={`rounded-sm border-2 px-3 py-2 text-center animate-in fade-in zoom-in-95 duration-300 ${tone}`}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-bold">{body}</div>
    </div>
  );
  return (
    <Panel title="The memory-management unit">
      <Toggle<"protect" | "relocate">
        value={mode}
        onChange={setMode}
        options={[
          ["protect", "Base + limit protection"],
          ["relocate", "Relocation register"],
        ]}
      />
      {mode === "protect" ? (
        <>
          <label className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="uppercase tracking-widest text-muted-foreground">CPU address</span>
            <input type="range" min={250000} max={460000} step={20} value={addr} onChange={(e) => setAddr(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="address" />
            <input type="number" value={addr} onChange={(e) => setAddr(Number(e.target.value) || 0)} className="w-24 bg-transparent border border-border rounded-sm px-1 py-0.5 text-right" aria-label="address value" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {stage("CPU", addr, "border-sky", `a${addr}`)}
            <span>→</span>
            {stage(`≥ base (${base})?`, addr >= base ? "yes" : "no", addr >= base ? "border-mint" : "border-orange bg-orange/15", `b${addr >= base}`)}
            <span>→</span>
            {stage(`< base + limit (${base + limit})?`, addr < base + limit ? "yes" : "no", addr >= base && addr < base + limit ? "border-mint" : addr >= base ? "border-orange bg-orange/15" : "border-border opacity-40", `c${addr < base + limit}`)}
            <span>→</span>
            {check.ok ? stage("memory", "access OK ✓", "border-mint bg-mint/20", "ok") : stage("trap to OS", "addressing error ✗", "border-orange bg-orange/25", "trap")}
          </div>
          <div className="relative h-8 rounded-sm bg-muted/40 border border-border overflow-hidden">
            <div className="absolute top-0 bottom-0 bg-mint/30 border-x-2 border-mint" style={{ left: `${((base - 250000) / 210000) * 100}%`, width: `${(limit / 210000) * 100}%` }} />
            <div className="absolute top-0 bottom-0 w-0.5 bg-foreground transition-all duration-150" style={{ left: `${((addr - 250000) / 210000) * 100}%` }} />
            <span className="absolute left-1 top-1.5 font-mono text-[10px] text-muted-foreground">other processes / OS</span>
          </div>
        </>
      ) : (
        <>
          <label className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="uppercase tracking-widest text-muted-foreground">logical address</span>
            <input type="range" min={0} max={2000} value={logical} onChange={(e) => setLogical(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="logical address" />
            <span className="w-14 font-bold">{logical}</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {stage("CPU: logical", logical, "border-sky", `l${logical}`)}
            <span>→</span>
            {stage("relocation register", `+ ${reloc}`, "border-violet", "r")}
            <span>→</span>
            {stage("memory: physical", r.physical, "border-mint bg-mint/20", `p${logical}`)}
          </div>
          <p className="text-xs text-muted-foreground">The program only ever sees addresses 0, 1, 2… The MMU adds {reloc} on the way to memory, so the process can live anywhere, and the OS can move it by changing one register.</p>
        </>
      )}
    </Panel>
  );
}

/** How long does it take to swap a process out and back in? */
export function SwapTimeCalc() {
  const [size, setSize] = useState(100);
  const [rate, setRate] = useState(50);
  const t = swapTime(size, rate);
  return (
    <Panel title="Context switch time with swapping">
      <div className="grid sm:grid-cols-2 gap-4 font-mono text-xs">
        <label className="flex flex-col gap-1">
          <span className="uppercase tracking-widest text-muted-foreground">process size: {size} MB</span>
          <input type="range" min={10} max={1000} step={10} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="process size" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="uppercase tracking-widest text-muted-foreground">disk transfer rate: {rate} MB/s</span>
          <input type="range" min={10} max={2000} step={10} value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="transfer rate" />
        </label>
      </div>
      <div className="flex h-8 rounded-sm overflow-hidden border border-border">
        <div className="bg-orange flex items-center justify-center font-mono text-[11px] text-background font-bold w-1/2">swap out {fmt(t.out)} ms</div>
        <div className="bg-sky flex items-center justify-center font-mono text-[11px] text-background font-bold w-1/2">swap in {fmt(t.out)} ms</div>
      </div>
      <div className="font-display text-xl">
        total ≈ <b>{t.total >= 1000 ? `${fmt(t.total / 1000)} seconds` : `${fmt(t.total)} ms`}</b> <span className="text-sm text-muted-foreground font-mono">for one context switch</span>
      </div>
    </Panel>
  );
}

const OWNER_TONE: Record<string, string> = { OS: "bg-muted-foreground/60", used: "bg-muted-foreground/30", P1: "bg-sky", P2: "bg-violet", P3: "bg-orange", P4: "bg-mint" };

/** First, best and worst fit on the textbook's holes, with release and compaction. */
export function MemoryAllocator() {
  const [fit, setFit] = useState<Fit>("first");
  const [mem, setMem] = useState<Block[]>(fitExerciseMemory);
  const [next, setNext] = useState(0);
  const [msg, setMsg] = useState("Holes of 100K, 500K, 200K, 300K and 600K (grey blocks are already in use). Place the requests one by one.");
  const total = mem.reduce((a, b) => a + b.size, 0);
  const free = mem.filter((b) => b.owner === null);
  const freeTotal = free.reduce((a, b) => a + b.size, 0);
  const biggest = Math.max(0, ...free.map((b) => b.size));
  const reset = (f: Fit = fit) => {
    setFit(f);
    setMem(fitExerciseMemory());
    setNext(0);
    setMsg("Fresh memory. Place the requests one by one.");
  };
  const place = () => {
    const size = FIT_REQUESTS[next];
    const name = `P${next + 1}`;
    const r = allocate(mem, size, name, fit);
    if (r.at < 0) {
      setMsg(`${name} needs ${size}K. There's ${freeTotal}K free in total, but the biggest hole is only ${biggest}K. It must wait. That's external fragmentation!`);
    } else {
      setMsg(`${name} (${size}K) goes into the ${mem[r.at].size}K hole${mem[r.at].size > size ? `, leaving a ${mem[r.at].size - size}K hole` : ""}.`);
      setMem(r.mem);
    }
    setNext((n) => n + 1);
  };
  return (
    <Panel title="Dynamic storage allocation" legend={[["bg-sky", "P1 212K"], ["bg-violet", "P2 417K"], ["bg-orange", "P3 112K"], ["bg-mint", "P4 426K"]]}>
      <Toggle<Fit>
        value={fit}
        onChange={(f) => reset(f)}
        options={[
          ["first", "First fit"],
          ["best", "Best fit"],
          ["worst", "Worst fit"],
        ]}
      />
      <div className="flex h-14 rounded-sm overflow-hidden border border-border">
        {mem.map((b) => (
          <div
            key={`${b.start}-${b.owner}`}
            className={`relative flex items-center justify-center border-r border-background transition-all duration-500 animate-in fade-in ${b.owner === null ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,hsl(var(--border))_5px,hsl(var(--border))_6px)]" : OWNER_TONE[b.owner] ?? "bg-muted"}`}
            style={{ width: `${(b.size / total) * 100}%` }}
            title={`${b.owner ?? "hole"}: ${b.size}K`}
          >
            {b.size >= 80 && <span className={`font-mono text-[10px] font-bold ${b.owner && b.owner.startsWith("P") ? "text-background" : "text-foreground"}`}>{b.owner && b.owner !== "used" ? `${b.owner} ` : ""}{b.size}K</span>}
          </div>
        ))}
      </div>
      <p aria-live="polite" className="text-sm min-h-[2.5em]">
        {msg}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={next >= FIT_REQUESTS.length} onClick={place}>
          {next < FIT_REQUESTS.length ? `place P${next + 1} (${FIT_REQUESTS[next]}K)` : "all requests placed"}
        </button>
        <button type="button" className={btn} disabled={!mem.some((b) => b.owner === "P1")} onClick={() => { setMem(release(mem, "P1")); setMsg("P1 exits. Its partition becomes a hole and merges with any free neighbours."); }}>
          P1 exits
        </button>
        <button type="button" className={btn} onClick={() => { setMem(compact(mem)); setMsg("Compaction: every block slides down, and all the free memory becomes one big hole. Only possible with dynamic relocation at execution time."); }}>
          compact
        </button>
        <button type="button" className={btn} onClick={() => reset()}>
          ⟲
        </button>
      </div>
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        free <span className="text-foreground">{freeTotal}K</span> in <span className="text-foreground">{free.length}</span> holes · largest hole <span className="text-foreground">{biggest}K</span>
      </div>
    </Panel>
  );
}

/** Translate <segment, offset> with the textbook's segment table. */
export function SegmentTranslator() {
  const [s, setS] = useState(2);
  const [d, setD] = useState(53);
  const r = segTranslate(s, d);
  return (
    <Panel title="Segmentation hardware">
      <div className="grid md:grid-cols-[1fr_260px] gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <label className="inline-flex items-center gap-2">
              segment s
              <select value={s} onChange={(e) => setS(Number(e.target.value))} className="bg-transparent border border-border rounded-sm px-2 py-1" aria-label="segment">
                {SEGMENT_TABLE.map((seg, i) => (
                  <option key={i} value={i}>
                    {i}: {seg.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2">
              offset d
              <input type="number" min={0} value={d} onChange={(e) => setD(Math.max(0, Number(e.target.value) || 0))} className="w-20 bg-transparent border border-border rounded-sm px-1 py-0.5 text-right" aria-label="offset" />
            </label>
          </div>
          <div key={`${s}-${d}`} className="flex flex-wrap items-center gap-2 font-mono text-sm animate-in fade-in duration-300">
            <span className="px-2 py-1 rounded-sm border-2 border-sky">&lt;{s}, {d}&gt;</span>
            <span>→</span>
            <span className={`px-2 py-1 rounded-sm border-2 ${r.ok ? "border-mint" : "border-orange bg-orange/15"}`}>
              {d} &lt; limit {SEGMENT_TABLE[s].limit}? {r.ok ? "yes" : "no"}
            </span>
            <span>→</span>
            {r.ok ? (
              <span className="px-2 py-1 rounded-sm border-2 border-mint bg-mint/20 font-bold">
                {SEGMENT_TABLE[s].base} + {d} = {r.physical}
              </span>
            ) : (
              <span className="px-2 py-1 rounded-sm border-2 border-orange bg-orange/25 font-bold">trap: addressing error</span>
            )}
          </div>
          <table className="font-mono text-xs border-collapse w-full max-w-[360px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="text-left py-1 font-normal">s</th>
                <th className="text-right py-1 font-normal">limit</th>
                <th className="text-right py-1 font-normal">base</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENT_TABLE.map((seg, i) => (
                <tr key={i} className={`border-b border-border/50 transition-colors ${i === s ? "bg-sky/20 font-bold" : ""}`}>
                  <td className="py-1">{i}</td>
                  <td className="py-1 text-right">{seg.limit}</td>
                  <td className="py-1 text-right">{seg.base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="relative h-[260px] rounded-sm border border-border bg-muted/20">
          {SEGMENT_TABLE.map((seg, i) => (
            <div key={i} className={`absolute left-2 right-2 rounded-sm border flex items-center justify-center font-mono text-[10px] transition-all duration-300 ${i === s ? "bg-sky/40 border-sky font-bold" : "bg-card border-border"}`} style={{ top: `${(seg.base / 7000) * 100}%`, height: `${(seg.limit / 7000) * 100}%` }}>
              seg {i} · {seg.base}
            </div>
          ))}
          {r.ok && <div className="absolute left-0 right-0 h-0.5 bg-mint animate-in fade-in" style={{ top: `${(r.physical! / 7000) * 100}%` }} />}
        </div>
      </div>
    </Panel>
  );
}

/** The textbook's 32-byte memory with 4-byte pages: pick a logical address and follow it through the page table. */
export function PagingTranslator() {
  const { pageSize, frames, table, data } = PAGE_EXAMPLE;
  const [addr, setAddr] = useState(13);
  const r = pageTranslate(addr, pageSize, table);
  const physicalOf = (frame: number, off: number) => {
    const page = table.indexOf(frame);
    return page < 0 ? "" : data[page * pageSize + off];
  };
  const bits = (v: number, w: number) => v.toString(2).padStart(w, "0");
  return (
    <Panel title="Paging example: 32-byte memory, 4-byte pages" legend={[["bg-sky", "page number p"], ["bg-orange", "offset d"], ["bg-mint", "frame f"]]}>
      <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">logical address</span>
        <span className="font-bold text-lg">{addr}</span>
        <span>=</span>
        <span className="px-2 py-0.5 rounded-sm bg-sky/30">{bits(r.p, 2)}</span>
        <span className="px-2 py-0.5 rounded-sm bg-orange/30">{bits(r.d, 2)}</span>
        <span className="text-xs text-muted-foreground">(p = {r.p}, d = {r.d})</span>
        <span>→</span>
        <span className="px-2 py-0.5 rounded-sm bg-mint/30">f = {r.f}</span>
        <span>→</span>
        <span className="font-bold">
          {r.f} × {pageSize} + {r.d} = {r.physical}
        </span>
      </div>
      <div className="grid grid-cols-[auto_auto_1fr] gap-4 items-start overflow-x-auto">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">logical memory</div>
          <div className="grid grid-cols-1 gap-0.5">
            {data.split("").map((ch, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAddr(i)}
                className={`flex items-center gap-2 px-2 py-0.5 font-mono text-xs rounded-sm transition-colors ${i === addr ? "bg-sky text-background font-bold" : Math.floor(i / pageSize) === r.p ? "bg-sky/20" : "hover:bg-muted"} ${i % pageSize === 0 ? "mt-1" : ""}`}
              >
                <span className="w-4 text-right opacity-60">{i}</span>
                {ch}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">page table</div>
          {table.map((f, p) => (
            <div key={p} className={`flex gap-3 px-2 py-1 font-mono text-xs border border-border -mt-px transition-colors duration-300 ${p === r.p ? "bg-mint/30 font-bold" : ""}`}>
              <span className="opacity-60">{p}</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">physical memory (frames)</div>
          <div className="grid grid-cols-1 gap-1">
            {Array.from({ length: frames }, (_, f) => (
              <div key={f} className={`flex items-center gap-2 rounded-sm border px-2 py-1 transition-all duration-300 ${f === r.f ? "border-mint bg-mint/15" : "border-border"}`}>
                <span className="font-mono text-[10px] w-14 opacity-60">frame {f}</span>
                {Array.from({ length: pageSize }, (_, o) => {
                  const phys = f * pageSize + o;
                  const hot = phys === r.physical;
                  return (
                    <span key={o} className={`w-6 h-6 flex items-center justify-center font-mono text-xs rounded-sm ${hot ? "bg-mint text-background font-bold animate-in zoom-in-50" : "bg-muted/40"}`} title={`physical ${phys}`}>
                      {physicalOf(f, o)}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Click a letter in logical memory. Here the logical address space is 2⁴ = 16 bytes (m = 4) and a page is 2² = 4 bytes (n = 2), so the top m − n = 2 bits are the page number and the bottom 2 bits are the offset.</p>
    </Panel>
  );
}

/** Internal fragmentation for a process split into pages. */
export function FragmentationCalc() {
  const [size, setSize] = useState(72766);
  const [page, setPage] = useState(2048);
  const r = internalFrag(size, page);
  return (
    <Panel title="Calculating internal fragmentation">
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <label className="inline-flex items-center gap-2">
          process size
          <input type="number" min={1} value={size} onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 1))} className="w-24 bg-transparent border border-border rounded-sm px-1 py-0.5 text-right" aria-label="process size in bytes" />
          bytes
        </label>
        <label className="inline-flex items-center gap-2">
          page size
          <select value={page} onChange={(e) => setPage(Number(e.target.value))} className="bg-transparent border border-border rounded-sm px-2 py-1" aria-label="page size">
            {[512, 1024, 2048, 4096, 8192].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          bytes
        </label>
      </div>
      <div className="font-mono text-sm leading-relaxed">
        {size} = {r.full} pages × {page} + {r.rest} bytes → needs <b>{r.pages} frames</b>
        <br />
        last frame wastes {page} − {r.rest} = <b className="text-orange">{r.waste} bytes</b> of internal fragmentation
      </div>
      <div className="flex gap-0.5 flex-wrap">
        {Array.from({ length: Math.min(r.pages, 60) }, (_, i) => {
          const last = i === r.pages - 1 && r.rest > 0;
          return (
            <span key={i} className="relative h-5 w-4 rounded-[2px] bg-muted overflow-hidden">
              <span className="absolute inset-x-0 bottom-0 bg-sky" style={{ height: last ? `${(r.rest / page) * 100}%` : "100%" }} />
            </span>
          );
        })}
      </div>
    </Panel>
  );
}

const TLB_REFS = [0, 1, 0, 2, 0, 1, 3, 0, 4, 1, 0, 2];

/** TLB hits, misses and the effective access time. */
export function TlbDemo() {
  const [alpha, setAlpha] = useState(0.8);
  const eps = 20;
  const m = 100;
  const run = useMemo(() => tlbRun(TLB_REFS, 3), []);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= run.length) return;
    const t = setTimeout(() => setI((x) => x + 1), 650);
    return () => clearTimeout(t);
  }, [i, run.length]);
  const shown = run.slice(0, i);
  const hits = shown.filter((x) => x.hit).length;
  const cur = shown[shown.length - 1];
  return (
    <Panel title="Translation look-aside buffer" legend={[["bg-mint", "TLB hit"], ["bg-orange", "TLB miss"]]}>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">TLB (3 entries)</div>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: 3 }, (_, k) => {
              const p = cur?.tlb[k];
              return (
                <span key={k} className={`h-10 w-14 rounded-sm border-2 flex items-center justify-center font-mono text-xs transition-all duration-300 ${p === undefined ? "border-dashed border-border" : p === cur.page ? (cur.hit ? "border-mint bg-mint/25" : "border-orange bg-orange/20") : "border-border"}`}>
                  {p !== undefined ? `p${p}` : ""}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {run.map((x, k) => (
            <span key={k} className={`h-8 w-8 rounded-sm flex items-center justify-center font-mono text-xs transition-all duration-300 ${k >= i ? "bg-muted/40 text-muted-foreground" : x.hit ? "bg-mint text-background font-bold" : "bg-orange text-background font-bold"} ${k === i - 1 ? "scale-110" : ""}`}>
              {x.page}
            </span>
          ))}
        </div>
      </div>
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        hits <span className="text-foreground">{hits}</span>/{shown.length} {cur && <span>· {cur.hit ? `p${cur.page} found in the TLB` : `p${cur.page} missed: read the page table in memory, then add it to the TLB${cur.evicted !== null ? ` (evicting p${cur.evicted})` : ""}`}</span>}
      </div>
      <button type="button" className={`${btn} self-start`} onClick={() => setI(0)}>
        ⟲ replay
      </button>
      <div className="border-t border-border pt-4 flex flex-col gap-2">
        <label className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className="uppercase tracking-widest text-muted-foreground">hit ratio α</span>
          <input type="range" min={0} max={1} step={0.01} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="hit ratio" />
          <span className="w-12 font-bold">{Math.round(alpha * 100)}%</span>
        </label>
        <div className="font-mono text-sm">
          EAT = ({m} + {eps}) × {alpha.toFixed(2)} + (2 × {m} + {eps}) × {(1 - alpha).toFixed(2)} = <b className="font-display text-xl">{fmt(eat(alpha, eps, m))} ns</b>
        </div>
        <p className="text-xs text-muted-foreground">ε = {eps} ns to search the TLB, m = {m} ns per memory access. A hit costs one memory access; a miss costs two (page table, then the data).</p>
      </div>
    </Panel>
  );
}

/** Split a 32-bit logical address into a one-level or two-level page number and an offset. */
export function AddressSplit() {
  const [mode, setMode] = useState<"one" | "two">("two");
  const [addr, setAddr] = useState(0x12345678);
  const widths = mode === "one" ? [22, 10] : [12, 10, 10];
  const names = mode === "one" ? ["page number p", "offset d"] : ["outer p₁", "inner p₂", "offset d"];
  const tones = mode === "one" ? ["bg-sky/30", "bg-orange/30"] : ["bg-violet/30", "bg-sky/30", "bg-orange/30"];
  const parts = splitAddress(addr, widths);
  const bin = addr.toString(2).padStart(32, "0");
  let pos = 0;
  return (
    <Panel title="A 32-bit logical address with 1 KB pages">
      <div className="flex flex-wrap items-center gap-3">
        <Toggle<"one" | "two">
          value={mode}
          onChange={setMode}
          options={[
            ["one", "one-level"],
            ["two", "two-level"],
          ]}
        />
        <button type="button" className={btn} onClick={() => setAddr(Math.floor(Math.random() * 2 ** 32))}>
          🎲 random address
        </button>
        <span className="font-mono text-sm">0x{addr.toString(16).toUpperCase().padStart(8, "0")}</span>
      </div>
      <div className="flex flex-wrap font-mono text-[12px] sm:text-sm overflow-x-auto">
        {widths.map((w, k) => {
          const chunk = bin.slice(pos, pos + w);
          pos += w;
          return (
            <div key={`${mode}-${k}`} className={`flex flex-col items-center px-1 py-1 border-r-2 border-background animate-in fade-in duration-300 ${tones[k]}`}>
              <span className="tracking-[0.15em]">{chunk}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {names[k]} · {w} bits = {parts[k]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {mode === "one"
          ? "One level: a 22-bit page number means a page table with 2²² (about 4 million) entries per process."
          : "Two levels: p₁ picks an entry in the outer page table, which points to an inner page table; p₂ picks the entry there; d is the offset in the page. Inner tables that aren't needed don't have to exist."}
      </p>
    </Panel>
  );
}

/* ------------------------------ virtual memory ------------------------------ */

/** The steps of handling a page fault: page table, physical memory and the backing store. */
export function PageFaultSteps() {
  const frames = useMemo(() => pageFaultFrames(), []);
  const pages = ["A", "B", "C", "D", "E", "F"];
  return (
    <Stepper
      title="Steps in handling a page fault"
      frames={frames}
      code={PAGE_FAULT_CODE}
      codeLabel="What happens"
      legend={[["bg-mint", "valid (in memory)"], ["bg-orange", "invalid / faulting"]]}
      render={(s: PfState) => (
        <div className="grid grid-cols-[auto_auto_1fr] gap-4 items-start min-w-[420px]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">page table</div>
            {pages.map((p, i) => {
              const frame = s.frames.indexOf(p);
              const hot = i === 3 && s.stage >= 0;
              return (
                <div key={p} className={`flex gap-3 px-2 py-1 font-mono text-xs border border-border -mt-px transition-colors duration-300 ${hot ? (s.valid[i] ? "bg-mint/30" : s.stage >= 1 ? "bg-orange/30" : "bg-sky/20") : ""}`}>
                  <span className="opacity-60 w-3">{i}</span>
                  <span className="w-4">{frame >= 0 ? frame : ""}</span>
                  <span key={`${i}-${s.valid[i]}`} className={`font-bold animate-in zoom-in-50 ${s.valid[i] ? "text-mint" : "text-orange"}`}>
                    {s.valid[i] ? "v" : "i"}
                  </span>
                </div>
              );
            })}
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">physical memory</div>
            {s.frames.map((f, i) => (
              <div key={i} className={`flex gap-2 px-2 py-1 font-mono text-xs border border-border -mt-px transition-all duration-300 ${i === 2 && s.stage >= 3 ? "bg-mint/25" : ""}`}>
                <span className="opacity-60 w-3">{i}</span>
                <span className={f === "D…" ? "animate-pulse" : ""}>{f ?? (i === 2 && s.stage === 3 ? "free ✓" : "")}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <div className={`rounded-sm border-2 px-3 py-2 font-mono text-xs transition-all duration-300 ${s.stage === 1 || s.stage === 2 ? "border-orange bg-orange/15 scale-[1.03]" : "border-border"}`}>
              ⚙ operating system {s.stage === 1 && <span className="font-bold">← trap!</span>}
            </div>
            <div className={`rounded-sm border-2 px-3 py-2 font-mono text-xs transition-all duration-300 ${s.stage === 4 ? "border-sky bg-sky/15 scale-[1.03]" : "border-border"}`}>
              💽 backing store: A B C <b className={s.stage === 4 ? "text-sky" : ""}>D</b> E F {s.stage === 4 && <span className="animate-pulse">→ frame 2</span>}
            </div>
            <div className={`rounded-sm border-2 px-3 py-2 font-mono text-xs transition-all duration-300 ${s.stage === 0 || s.stage === 6 ? "border-mint bg-mint/15" : "border-border"}`}>
              ▶ process: load M {s.stage === 6 && <span className="font-bold">(restarted ✓)</span>}
            </div>
          </div>
        </div>
      )}
    />
  );
}

/** How much a page-fault rate slows memory down. */
export function DemandPagingCost() {
  const [exp, setExp] = useState(-3); // p = 10^exp
  const p = 10 ** exp;
  const e = demandEat(p);
  const slow = e / 200;
  return (
    <Panel title="The cost of page faults">
      <label className="flex flex-wrap items-center gap-3 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">page-fault rate p</span>
        <input type="range" min={-7} max={-1} step={0.1} value={exp} onChange={(e) => setExp(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="page fault rate" />
        <span className="w-44">
          1 fault per {Math.round(1 / p).toLocaleString("en-US")} accesses
        </span>
      </label>
      <div className="font-mono text-sm">
        EAT = (1 − p) × 200 ns + p × 8,000,000 ns = <b className="font-display text-xl">{e >= 1000 ? `${fmt(Math.round(e / 10) / 100)} µs` : `${fmt(Math.round(e * 10) / 10)} ns`}</b>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-4 rounded-sm bg-muted overflow-hidden">
          <div className={`h-full transition-all duration-300 ${slow > 1.1 ? "bg-orange" : "bg-mint"}`} style={{ width: `${Math.min(100, (Math.log10(slow) / Math.log10(4000)) * 100 + 2)}%` }} />
        </div>
        <span className={`font-display text-lg font-bold w-28 ${slow > 1.1 ? "text-orange" : "text-mint"}`}>{fmt(Math.round(slow * 10) / 10)}× slower</span>
      </div>
      <p className="text-xs text-muted-foreground">To stay under 10% slowdown, p must be below 0.0000025: fewer than one page fault in every 400,000 memory accesses.</p>
    </Panel>
  );
}

/** Copy-on-write: parent and child share pages until one of them writes. */
export function CopyOnWrite() {
  const [copied, setCopied] = useState(false);
  const page = (label: string, k: string, hot = false) => (
    <div key={k} className={`h-9 w-16 rounded-sm border-2 flex items-center justify-center font-mono text-xs font-bold transition-all duration-500 animate-in zoom-in-75 ${hot ? "border-orange bg-orange/25" : "border-border bg-card"}`}>
      {label}
    </div>
  );
  return (
    <Panel title="Copy-on-write">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="rounded-sm border border-sky/60 p-2 text-center">
          <div className="font-display font-bold mb-1">process 1</div>
          <div className="font-mono text-[10px] text-muted-foreground">pages A B C</div>
        </div>
        <div className="flex flex-col gap-1.5 items-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">physical memory</div>
          {page("page A", "a")}
          {page("page B", "b")}
          {page("page C", "c")}
          {copied && page("copy of C", "c2", true)}
        </div>
        <div className="rounded-sm border border-violet/60 p-2 text-center">
          <div className="font-display font-bold mb-1">process 2</div>
          <div className="font-mono text-[10px] text-muted-foreground">pages A B C</div>
        </div>
      </div>
      <p className="text-sm min-h-[2.5em]">
        {copied
          ? "Process 1 wrote to page C. Only then did the OS make a copy of C for it. A and B are still shared, so only one page was copied instead of the whole process."
          : "After fork(), parent and child share all their pages, marked copy-on-write. Nothing is copied yet."}
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={copied} onClick={() => setCopied(true)}>
          process 1 modifies page C
        </button>
        <button type="button" className={btn} onClick={() => setCopied(false)}>
          ⟲
        </button>
      </div>
    </Panel>
  );
}

/* ------------------------------ page replacement ------------------------------ */

const REPL_LABEL: Record<Repl, string> = { fifo: "FIFO", opt: "Optimal", lru: "LRU", clock: "Second chance", lfu: "LFU", mfu: "MFU" };

/** Run a page-replacement algorithm over a reference string and watch the frames change, column by column. */
export function PageReplacement({ algos = "fifo,opt,lru,clock,lfu,mfu", initial = "fifo" }: { algos?: string; initial?: Repl }) {
  const list = algos.split(",").map((a) => a.trim()) as Repl[];
  const [algo, setAlgo] = useState<Repl>(initial);
  const [n, setN] = useState(3);
  const [text, setText] = useState(REF_STRING.join(","));
  const refs = useMemo(() => text.split(/[\s,]+/).map(Number).filter((x) => Number.isInteger(x) && x >= 0).slice(0, 30), [text]);
  const steps = useMemo(() => replace(refs, n, algo), [refs, n, algo]);
  const [k, setK] = useState(0);
  useEffect(() => setK(0), [steps]);
  useEffect(() => {
    if (k >= steps.length) return;
    const t = setTimeout(() => setK((x) => x + 1), 260);
    return () => clearTimeout(t);
  }, [k, steps.length]);
  const shown = steps.slice(0, k);
  const nFaults = shown.filter((s) => s.fault).length;
  return (
    <Panel title="Page replacement" legend={[["bg-orange", "page fault"], ["bg-mint", "page just loaded"]]}>
      <div className="flex flex-wrap gap-1.5">
        {list.map((a) => (
          <button key={a} type="button" className={`${btn} !px-2 !py-1 ${a === algo ? "bg-foreground text-background" : ""}`} onClick={() => setAlgo(a)}>
            {REPL_LABEL[a]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <label className="inline-flex items-center gap-2">
          <span className="uppercase tracking-widest text-muted-foreground">frames</span>
          <input type="range" min={1} max={7} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="number of frames" />
          <span className="w-3">{n}</span>
        </label>
        <label className="inline-flex flex-1 items-center gap-2 min-w-[240px]">
          <span className="uppercase tracking-widest text-muted-foreground">reference string</span>
          <input value={text} onChange={(e) => setText(e.target.value)} className={`${inputCls} !py-1 flex-1`} aria-label="reference string" />
        </label>
        <button type="button" className={`${btn} !px-2 !py-1`} onClick={() => setText(REF_STRING.join(","))}>
          slides
        </button>
        <button type="button" className={`${btn} !px-2 !py-1`} onClick={() => setText(BELADY_STRING.join(","))}>
          Belady
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse font-mono text-xs">
          <tbody>
            <tr>
              {refs.map((p, i) => (
                <td key={i} className={`w-7 h-7 text-center font-bold ${i === k - 1 ? "text-foreground" : "text-muted-foreground"}`}>
                  {p}
                </td>
              ))}
            </tr>
            {Array.from({ length: n }, (_, row) => (
              <tr key={row}>
                {steps.map((s, i) => {
                  const visible = i < k;
                  const v = s.frames[row];
                  const fresh = s.fault && s.slot === row;
                  return (
                    <td key={i} className={`w-7 h-7 text-center border border-border transition-colors duration-200 ${!visible ? "" : fresh ? "bg-mint/40 font-bold" : s.fault ? "bg-orange/10" : ""}`}>
                      {visible && v !== null ? (
                        <span className={fresh ? "inline-block animate-in zoom-in-50 duration-200" : ""}>
                          {v}
                          {algo === "clock" && s.refBits?.[row] ? "'" : ""}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              {steps.map((s, i) => (
                <td key={i} className="w-7 h-5 text-center">
                  {i < k && s.fault && <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange animate-in zoom-in-50" title={s.victim !== null ? `replaced ${s.victim}` : "loaded into a free frame"} />}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">page faults </span>
          <span className="font-display text-2xl font-bold">{nFaults}</span>
          <span className="font-mono text-xs text-muted-foreground"> / {refs.length} references</span>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {list.map((a) => `${REPL_LABEL[a]} ${faults(refs, n, a)}`).join(" · ")}
        </div>
        <button type="button" className={btn} onClick={() => setK(0)}>
          ⟲ replay
        </button>
      </div>
      {algo === "clock" && <p className="text-xs text-muted-foreground">A ' marks a page whose reference bit is 1: it gets a second chance before being replaced.</p>}
    </Panel>
  );
}

/** Page faults against number of frames: FIFO on the Belady string goes up at 4 frames. */
export function FaultsVsFrames() {
  const [refsName, setRefsName] = useState<"belady" | "slides">("belady");
  const refs = refsName === "belady" ? BELADY_STRING : REF_STRING;
  const ns = [1, 2, 3, 4, 5, 6, 7];
  const series: [Repl, string][] = [
    ["fifo", "stroke-orange"],
    ["lru", "stroke-sky"],
    ["opt", "stroke-mint"],
  ];
  const data = series.map(([a]) => ns.map((n) => faults(refs, n, a)));
  const max = Math.max(...data.flat());
  const W = 460;
  const H = 220;
  const X = (n: number) => 40 + ((n - 1) / 6) * (W - 60);
  const Y = (v: number) => H - 30 - (v / max) * (H - 50);
  return (
    <Panel title="Page faults vs number of frames" legend={[["bg-orange", "FIFO"], ["bg-sky", "LRU"], ["bg-mint", "Optimal"]]}>
      <Toggle<"belady" | "slides">
        value={refsName}
        onChange={setRefsName}
        options={[
          ["belady", "1,2,3,4,1,2,5,1,2,3,4,5"],
          ["slides", "slides' string"],
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-[520px]" role="img" aria-label="page faults by number of frames">
        {ns.map((n) => (
          <text key={n} x={X(n)} y={H - 10} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
            {n}
          </text>
        ))}
        <text x={W / 2} y={H} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
          number of frames
        </text>
        {series.map(([a, tone], si) => (
          <g key={`${refsName}-${a}`}>
            <path d={data[si].map((v, i) => `${i ? "L" : "M"}${X(ns[i])},${Y(v)}`).join(" ")} fill="none" strokeWidth={2.5} className={`${tone} animate-in fade-in duration-500`} />
            {data[si].map((v, i) => (
              <g key={i}>
                <circle cx={X(ns[i])} cy={Y(v)} r={3.5} className={tone.replace("stroke", "fill")} />
                {a === "fifo" && (
                  <text x={X(ns[i])} y={Y(v) - 8} textAnchor="middle" className="fill-orange font-mono text-[10px] font-bold">
                    {v}
                  </text>
                )}
              </g>
            ))}
          </g>
        ))}
      </svg>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {refsName === "belady"
          ? "Look at FIFO between 3 and 4 frames: 9 faults becomes 10. More memory, more faults! That's Belady's anomaly. LRU and Optimal never do this."
          : "On the slides' string all three curves only go down as frames are added."}
      </p>
    </Panel>
  );
}

/* ------------------------------ allocation and thrashing ------------------------------ */

/** Equal vs proportional allocation of frames. */
export function FrameAllocation() {
  const [m, setM] = useState(64);
  const [sizes, setSizes] = useState([10, 127]);
  const prop = proportional(sizes, m);
  const equal = sizes.map(() => m / sizes.length);
  const bar = (vals: number[], label: string) => (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="flex h-8 rounded-sm overflow-hidden border border-border">
        {vals.map((v, i) => (
          <div key={i} className={`flex items-center justify-center font-mono text-[11px] font-bold text-background transition-all duration-500 ${i ? "bg-violet" : "bg-sky"}`} style={{ width: `${(v / m) * 100}%` }}>
            {v >= 3 ? `P${i + 1}: ${fmt(Math.round(v * 10) / 10)}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Panel title="Allocating frames" legend={[["bg-sky", "P1"], ["bg-violet", "P2"]]}>
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <label className="inline-flex items-center gap-2">
          m (free frames)
          <input type="number" min={2} max={500} value={m} onChange={(e) => setM(Math.max(2, Number(e.target.value) || 2))} className="w-16 bg-transparent border border-border rounded-sm px-1 py-0.5 text-right" aria-label="total frames" />
        </label>
        {sizes.map((s, i) => (
          <label key={i} className="inline-flex items-center gap-2">
            s{i + 1} (size of P{i + 1})
            <input type="number" min={1} max={1000} value={s} onChange={(e) => setSizes((ss) => ss.map((x, j) => (j === i ? Math.max(1, Number(e.target.value) || 1) : x)))} className="w-16 bg-transparent border border-border rounded-sm px-1 py-0.5 text-right" aria-label={`size of process ${i + 1}`} />
          </label>
        ))}
      </div>
      {bar(equal, "equal allocation: m / n each")}
      {bar(prop, "proportional allocation: aᵢ = sᵢ / S × m")}
      <p className="font-mono text-xs text-muted-foreground">
        S = {sizes.join(" + ")} = {sizes.reduce((a, b) => a + b, 0)} · a₁ = {sizes[0]}/{sizes.reduce((a, b) => a + b, 0)} × {m} ≈ {Math.round(prop[0])} · a₂ = {sizes[1]}/{sizes.reduce((a, b) => a + b, 0)} × {m} ≈ {Math.round(prop[1])}
      </p>
    </Panel>
  );
}

/** CPU utilization against the degree of multiprogramming. */
export function ThrashingChart() {
  const [n, setN] = useState(3);
  const ns = Array.from({ length: 12 }, (_, i) => i + 1);
  const W = 460;
  const H = 210;
  const X = (k: number) => 40 + ((k - 1) / 11) * (W - 60);
  const Y = (u: number) => H - 30 - u * (H - 50);
  const u = utilization(n);
  const thrashing = n * 12 > 60;
  return (
    <Panel title="Thrashing">
      <label className="flex flex-wrap items-center gap-3 font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">processes in memory</span>
        <input type="range" min={1} max={12} value={n} onChange={(e) => setN(Number(e.target.value))} className="flex-1 min-w-[160px]" aria-label="degree of multiprogramming" />
        <span className="w-6 font-display text-lg font-bold">{n}</span>
      </label>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-[520px]" role="img" aria-label="CPU utilization against degree of multiprogramming">
        <path d={ns.map((k, i) => `${i ? "L" : "M"}${X(k)},${Y(utilization(k))}`).join(" ")} fill="none" strokeWidth={2.5} className="stroke-sky" />
        <rect x={X(5.5)} y={10} width={X(12) - X(5.5)} height={H - 40} className="fill-orange/10" />
        <text x={X(9)} y={26} textAnchor="middle" className="fill-orange font-mono text-[10px]">
          thrashing
        </text>
        <circle cx={X(n)} cy={Y(u)} r={7} className={`transition-all duration-300 ${thrashing ? "fill-orange" : "fill-mint"}`} />
        <text x={18} y={H / 2} textAnchor="middle" transform={`rotate(-90 18 ${H / 2})`} className="fill-muted-foreground font-mono text-[9px]">
          CPU utilization
        </text>
        <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
          degree of multiprogramming
        </text>
      </svg>
      <p className={`text-sm ${thrashing ? "text-orange font-bold" : ""}`}>
        {thrashing
          ? `CPU utilization ${Math.round(u * 100)}%. The processes' localities need ${n * 12} frames but only 60 exist. Everyone page-faults constantly and waits on the disk, and the CPU sits idle.`
          : `CPU utilization ${Math.round(u * 100)}%. Every process has room for its locality, so adding processes keeps the CPU busier.`}
      </p>
    </Panel>
  );
}

/** The working set: the pages used in the last Δ references. */
export function WorkingSetDemo() {
  const [delta, setDelta] = useState(10);
  const [t, setT] = useState(WS_T1);
  const ws = workingSet(WS_REFS, t, delta);
  return (
    <Panel title="Working-set model" legend={[["bg-sky", "inside the window Δ"]]}>
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <label className="inline-flex items-center gap-2">
          <span className="uppercase tracking-widest text-muted-foreground">Δ</span>
          <input type="range" min={1} max={20} value={delta} onChange={(e) => setDelta(Number(e.target.value))} aria-label="window size" />
          <span className="w-5">{delta}</span>
        </label>
        <button type="button" className={`${btn} !px-2 !py-1 ${t === WS_T1 ? "bg-foreground text-background" : ""}`} onClick={() => setT(WS_T1)}>
          t₁
        </button>
        <button type="button" className={`${btn} !px-2 !py-1 ${t === WS_T2 ? "bg-foreground text-background" : ""}`} onClick={() => setT(WS_T2)}>
          t₂
        </button>
      </div>
      <div className="flex flex-wrap gap-0.5">
        {WS_REFS.map((p, i) => {
          const inside = i <= t && i > t - delta;
          return (
            <button key={i} type="button" onClick={() => setT(i)} className={`h-8 w-7 rounded-sm font-mono text-xs transition-colors duration-200 ${inside ? "bg-sky/40 font-bold" : "bg-muted/40 text-muted-foreground"} ${i === t ? "ring-2 ring-foreground" : ""}`}>
              {p}
            </button>
          );
        })}
      </div>
      <div className="font-display text-xl">
        WS(t) = {"{"}
        {ws.join(", ")}
        {"}"} <span className="font-mono text-sm text-muted-foreground">· WSS = {ws.length}</span>
      </div>
      <p className="text-xs text-muted-foreground">Click any reference to move t. With Δ = 10, the working set at t₁ is {"{1, 2, 5, 6, 7}"}, and at t₂ the program has moved to a new locality: {"{3, 4}"}.</p>
    </Panel>
  );
}
