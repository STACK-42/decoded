import type { Frame } from "@/lib/algorithms";

/* ============================================================
   Logic behind the Operating Systems course visualizers.
   Every function here is pure, so the tests can check it and
   OsVisualizers.tsx only has to draw what it returns.
   ============================================================ */

/* ----------------------------- interrupts ----------------------------- */

export type Lane = { from: number; to: number; kind: string }[];

/** The textbook's interrupt timeline: a user process runs while an I/O device transfers, then an interrupt hands the CPU to the handler. */
export const INTERRUPT_TIMELINE = {
  length: 14,
  cpu: [
    { from: 0, to: 4, kind: "user" },
    { from: 4, to: 5, kind: "isr" },
    { from: 5, to: 10, kind: "user" },
    { from: 10, to: 11, kind: "isr" },
    { from: 11, to: 14, kind: "user" },
  ] as Lane,
  io: [
    { from: 0, to: 1, kind: "idle" },
    { from: 1, to: 4, kind: "transfer" },
    { from: 4, to: 6, kind: "idle" },
    { from: 6, to: 10, kind: "transfer" },
    { from: 10, to: 14, kind: "idle" },
  ] as Lane,
};

export const INTERRUPT_CODE = [
  "user program runs on the CPU",
  "program asks for I/O  →  device starts transferring",
  "CPU keeps running other work in parallel",
  "device finishes  →  raises an INTERRUPT",
  "CPU saves registers + program counter",
  "interrupt vector  →  jump to the service routine",
  "service routine handles the device",
  "restore registers, resume the interrupted program",
];

export type InterruptState = { t: number; flash?: "request" | "interrupt" | "resume" };

export function interruptFrames(): Frame<InterruptState>[] {
  const f = (t: number, line: number, message: string, flash?: InterruptState["flash"], handled = 0): Frame<InterruptState> => ({
    state: { t, flash },
    line,
    message,
    stats: { time: t, "interrupts handled": handled },
  });
  return [
    f(0, 0, "The CPU is running a user program. The I/O device has nothing to do yet (idle)."),
    f(1, 1, "The program asks for I/O, say reading a key press or a disk block. The device controller starts moving data into its local buffer.", "request"),
    f(3, 2, "The CPU does not sit and wait. It keeps running the user program while the device works. They run at the same time."),
    f(4, 3, "The transfer is done. The device controller raises an interrupt: a signal that says 'hey CPU, I'm finished!'", "interrupt"),
    f(4, 4, "Before doing anything else, the CPU saves where it was: the registers and the address of the interrupted instruction (the program counter)."),
    f(4, 5, "The interrupt vector is a table of addresses. The CPU looks up this interrupt's number and jumps straight to the right service routine."),
    f(5, 6, "The interrupt service routine handles the device, for example copying the data from the controller's buffer into memory.", undefined, 1),
    f(5, 7, "Registers are restored and the user program continues exactly where it stopped. It never notices the pause.", "resume", 1),
    f(6, 1, "Another I/O request. The device starts a new transfer while the CPU keeps working.", "request", 1),
    f(10, 3, "Done again: a second interrupt.", "interrupt", 1),
    f(11, 6, "The CPU handles it with the service routine.", undefined, 2),
    f(14, 7, "Back to the user program. This is why we say an operating system is interrupt driven: it sits quietly until an interrupt or a trap wakes it up.", "resume", 2),
  ];
}

/* --------------------------- storage hierarchy --------------------------- */

export type StorageLevel = { name: string; size: string; access: string; volatile: boolean; managedBy: string; example: string };

/** From fastest and smallest at the top to slowest and biggest at the bottom. */
export const STORAGE_LEVELS: StorageLevel[] = [
  { name: "Registers", size: "< 1 KB", access: "≈ 0.3 ns", volatile: true, managedBy: "compiler", example: "the value the CPU is adding right now" },
  { name: "Cache", size: "a few MB", access: "≈ 1–25 ns", volatile: true, managedBy: "hardware", example: "the variables your loop keeps touching" },
  { name: "Main memory (RAM)", size: "GBs", access: "≈ 80–250 ns", volatile: true, managedBy: "operating system", example: "your open browser tabs" },
  { name: "Solid-state disk", size: "hundreds of GB", access: "≈ 25–100 µs", volatile: false, managedBy: "operating system", example: "your installed apps" },
  { name: "Magnetic disk", size: "TBs", access: "≈ 5–10 ms", volatile: false, managedBy: "operating system", example: "a backup drive full of photos" },
  { name: "Optical disk", size: "GBs per disc", access: "≈ 100 ms", volatile: false, managedBy: "operating system", example: "a DVD or Blu-ray" },
  { name: "Magnetic tape", size: "TBs per tape", access: "seconds or more", volatile: false, managedBy: "operating system", example: "long-term archive in a data center" },
];

/** Where integer A lives as it climbs from disk to the CPU. Index into ["disk", "memory", "cache", "register"]. */
export const MIGRATION_STEPS = [
  { at: 0, message: "A starts on the magnetic disk, inside a file. The CPU can't use it from there: the CPU can only work directly with main memory." },
  { at: 1, message: "The OS copies the disk block that holds A into main memory." },
  { at: 2, message: "When the program touches A, the hardware copies it into the cache, which is smaller but much faster." },
  { at: 3, message: "Finally A is loaded into a CPU register, where an instruction can add to it. Now A has copies in four places!" },
  { at: 3, message: "If the CPU changes A in the register, the other copies are out of date. The system must always use the most recent value. With many CPUs, each with its own cache, the hardware keeps the caches in agreement: cache coherency." },
];

/* ------------------------------ DMA ------------------------------ */

/** Interrupts the CPU must handle to move `bytes` of data: one per byte without DMA, one per block with it. */
export function interruptCount(bytes: number, mode: "per-byte" | "dma", blockSize = 512) {
  if (bytes <= 0) return 0;
  return mode === "per-byte" ? bytes : Math.ceil(bytes / blockSize);
}

/* --------------------------- multiprogramming --------------------------- */

/** A job alternates CPU bursts and I/O waits: [cpu, io, cpu, io, cpu, ...]. */
export type Job = { name: string; bursts: number[] };

export type GanttSlice = { from: number; to: number; job: string | null };

export const DEMO_JOBS: Job[] = [
  { name: "A", bursts: [3, 4, 2] },
  { name: "B", bursts: [2, 5, 3] },
  { name: "C", bursts: [4, 2, 1] },
];

/**
 * Run the jobs on one CPU, one time unit at a time.
 * - "single": the CPU sticks with one job until it finishes, idling while that job waits for I/O.
 * - "multi": when the running job starts waiting for I/O, the CPU switches to another ready job.
 * I/O waits overlap freely (each job has its own device).
 */
export function runJobs(jobs: Job[], mode: "single" | "multi") {
  const left = jobs.map((j) => [...j.bursts]);
  const phase = jobs.map(() => 0); // index into bursts; even = CPU, odd = I/O
  const done = jobs.map((j) => j.bursts.length === 0);
  const cpu: GanttSlice[] = [];
  const io: GanttSlice[][] = jobs.map(() => []);
  let running = -1;
  let t = 0;
  let busy = 0;
  const finish: number[] = jobs.map(() => 0);
  const push = (lane: GanttSlice[], job: string | null) => {
    const lastSlice = lane[lane.length - 1];
    if (lastSlice && lastSlice.job === job && lastSlice.to === t) lastSlice.to = t + 1;
    else lane.push({ from: t, to: t + 1, job });
  };
  const advance = (i: number) => {
    left[i][phase[i]]--;
    if (left[i][phase[i]] === 0) {
      phase[i]++;
      if (phase[i] >= left[i].length) {
        done[i] = true;
        finish[i] = t + 1;
      }
    }
  };
  while (!done.every(Boolean) && t < 500) {
    const ready = (i: number) => !done[i] && phase[i] % 2 === 0;
    if (mode === "single") {
      // stick with the first unfinished job, even while it waits
      if (running < 0 || done[running]) running = done.findIndex((d) => !d);
    } else if (running < 0 || !ready(running)) {
      // pick the next ready job after the one that just left the CPU
      const from = running < 0 ? jobs.length - 1 : running;
      running = -1;
      for (let k = 1; k <= jobs.length; k++) {
        const i = (from + k) % jobs.length;
        if (ready(i)) {
          running = i;
          break;
        }
      }
    }
    const onCpu = running >= 0 && ready(running) ? running : -1;
    // everyone waiting on I/O makes progress at the same time
    const waiting = jobs.map((_, i) => !done[i] && phase[i] % 2 === 1);
    push(cpu, onCpu >= 0 ? jobs[onCpu].name : null);
    jobs.forEach((j, i) => push(io[i], waiting[i] ? j.name : null));
    if (onCpu >= 0) {
      busy++;
      advance(onCpu);
    }
    waiting.forEach((w, i) => w && advance(i));
    t++;
  }
  return { cpu, io, total: t, busy, utilization: t ? busy / t : 0, finish };
}

/* ------------------------------ dual mode ------------------------------ */

export const DUAL_MODE_CODE = [
  "user process executing        (mode bit = 1)",
  "calls a system call, e.g. read()",
  "trap!  mode bit ← 0           (kernel mode)",
  "kernel runs the system call",
  "return from system call: mode bit ← 1",
  "user process continues",
];

export type ModeState = { mode: 0 | 1; where: "user" | "kernel"; arrow?: "down" | "up" };

export function dualModeFrames(): Frame<ModeState>[] {
  const f = (s: ModeState, line: number, message: string, calls: number): Frame<ModeState> => ({ state: s, line, message, stats: { "mode bit": s.mode, "system calls": calls } });
  return [
    f({ mode: 1, where: "user" }, 0, "Your program runs in user mode. The mode bit is 1. In this mode the CPU refuses to run privileged instructions, like talking to the disk directly.", 0),
    f({ mode: 1, where: "user", arrow: "down" }, 1, "The program needs something only the OS may do, like reading a file. It makes a system call.", 0),
    f({ mode: 0, where: "kernel", arrow: "down" }, 2, "The system call causes a trap. The hardware flips the mode bit to 0 and jumps into the kernel. Only the hardware can make this switch, so a program can't sneak into kernel mode on its own.", 1),
    f({ mode: 0, where: "kernel" }, 3, "In kernel mode every instruction is allowed. The kernel checks the request is legal and does the work.", 1),
    f({ mode: 1, where: "user", arrow: "up" }, 4, "Return from the system call: the mode bit goes back to 1 before control returns to the program.", 1),
    f({ mode: 1, where: "user" }, 5, "The program carries on with the result. Dual mode is how the OS protects itself and every other program from a buggy or malicious one.", 1),
  ];
}

/* ------------------------------ system calls ------------------------------ */

/** A small slice of a system-call table: the number is the index the interface looks up. */
export const SYSCALL_TABLE = ["read", "write", "open", "close", "fork", "exit", "wait"];

export type SyscallState = { stage: "user" | "api" | "interface" | "kernel" | "return"; index: number | null; mode: 0 | 1 };

export const SYSCALL_CODE = [
  "user application calls the API function",
  "library prepares the system-call number + parameters",
  "trap into the kernel (mode bit ← 0)",
  "system-call interface looks up the number in its table",
  "kernel runs the real system call",
  "return status + values, mode bit ← 1",
];

/** One call travelling from a program, through the API and the system-call interface, into the kernel and back. */
export function syscallFrames(call: "open" | "printf"): Frame<SyscallState>[] {
  const name = call === "open" ? "open" : "write";
  const index = SYSCALL_TABLE.indexOf(name);
  const f = (stage: SyscallState["stage"], line: number, message: string, mode: 0 | 1 = 1, idx: number | null = null): Frame<SyscallState> => ({
    state: { stage, index: idx, mode },
    line,
    message,
    stats: { "mode bit": mode },
  });
  const first =
    call === "open"
      ? "Your program calls open(\"notes.txt\"). It's using the POSIX API, a library function, not the system call itself."
      : "Your C program calls printf(\"Hello\"). printf is part of the standard C library, not a system call.";
  const lib =
    call === "open"
      ? `The library puts the system-call number for open (${index}) and the parameters (file name, flags) where the kernel can find them.`
      : `printf formats the text, then the library calls the write() system call, number ${index}, with the screen as the destination.`;
  return [
    f("user", 0, first),
    f("api", 1, lib),
    f("interface", 2, "The library executes a trap instruction. The CPU switches to kernel mode and jumps into the system-call interface.", 0),
    f("interface", 3, `The system-call interface keeps a table indexed by system-call numbers. Entry ${index} points to the kernel's ${name}() code.`, 0, index),
    f("kernel", 4, `The kernel runs ${name}(). Your program never needs to know how this part works. It only follows the API.`, 0, index),
    f("return", 5, `The kernel returns a status (and any values) and switches back to user mode. ${call === "open" ? "open() hands back a file descriptor, a small number naming the open file." : "\"Hello\" appears on the screen and printf returns."}`, 1),
  ];
}

/** The textbook's system-call sequence for copying one file to another. */
export const COPY_FILE_CALLS: { step: string; group: "input" | "open" | "loop" | "close" }[] = [
  { step: "Write a prompt to the screen", group: "input" },
  { step: "Accept the input file name", group: "input" },
  { step: "Write a prompt to the screen", group: "input" },
  { step: "Accept the output file name", group: "input" },
  { step: "Open the input file (abort if it doesn't exist)", group: "open" },
  { step: "Create the output file (abort if it already exists)", group: "open" },
  { step: "Loop: read from the input file", group: "loop" },
  { step: "Loop: write to the output file (until read fails)", group: "loop" },
  { step: "Close the output file", group: "close" },
  { step: "Write a completion message to the screen", group: "close" },
  { step: "Terminate normally", group: "close" },
];

export type ParamMethod = "registers" | "table" | "stack";

/** Where the parameters end up for each passing method. Registers run out after `regs`. */
export function paramPassing(method: ParamMethod, params: string[], regs = 4) {
  if (method === "registers") return { registers: params.slice(0, regs), memory: [] as string[], stack: [] as string[], overflow: params.length > regs };
  if (method === "table") return { registers: ["X = address of the table"], memory: params, stack: [] as string[], overflow: false };
  return { registers: [] as string[], memory: [] as string[], stack: [...params].reverse(), overflow: false };
}

/* ------------------------------ OS structures ------------------------------ */

export type StructureKind = "simple" | "unix" | "layered" | "microkernel" | "modules" | "hybrid";

export const STRUCTURES: Record<StructureKind, { title: string; example: string; layers: string[]; pros: string[]; cons: string[] }> = {
  simple: {
    title: "Simple structure",
    example: "MS-DOS",
    layers: ["application program", "resident system program", "MS-DOS device drivers", "ROM BIOS device drivers"],
    pros: ["most functionality in the least space"],
    cons: ["not divided into modules", "levels aren't well separated: an app can reach the hardware directly, so one buggy app can crash everything"],
  },
  unix: {
    title: "Traditional UNIX (monolithic)",
    example: "original UNIX",
    layers: ["users", "shells, commands, compilers, interpreters, system libraries", "system-call interface to the kernel", "kernel: file system, CPU scheduling, memory management, signals, swapping, device drivers", "kernel interface to the hardware", "hardware: terminals, disks, memory"],
    pros: ["fast: kernel parts call each other directly, with little overhead"],
    cons: ["a huge number of functions packed into one level", "hard to implement, extend and maintain"],
  },
  layered: {
    title: "Layered approach",
    example: "layer 0 is the hardware, layer N is the user interface",
    layers: ["layer N: user interface", "…", "layer 2", "layer 1", "layer 0: hardware"],
    pros: ["each layer only uses the layers below it, so you can build and debug one layer at a time"],
    cons: ["hard to decide which layer goes where", "a request has to pass through many layers, which is slower"],
  },
  microkernel: {
    title: "Microkernel",
    example: "Mach (macOS's Darwin kernel is partly based on it)",
    layers: ["user mode: application program, file system, device driver", "kernel mode (microkernel): interprocess communication, memory management, CPU scheduling", "hardware"],
    pros: ["easier to extend", "easier to port to new hardware", "more reliable: less code runs in kernel mode", "more secure"],
    cons: ["performance overhead from all the messages between user space and kernel space"],
  },
  modules: {
    title: "Loadable kernel modules",
    example: "Linux, Solaris",
    layers: ["core kernel", "scheduling classes, file systems, loadable system calls, executable formats, STREAMS modules, device and bus drivers, miscellaneous"],
    pros: ["object-oriented: each core part is separate and talks to the others over known interfaces", "modules are loaded into the kernel only when needed", "like layers, but more flexible: any module can call any other"],
    cons: ["a buggy module still runs in kernel mode"],
  },
  hybrid: {
    title: "Hybrid systems",
    example: "Linux, Windows, macOS, iOS, Android",
    layers: ["Linux and Solaris: monolithic kernel plus loadable modules", "Windows: mostly monolithic, plus microkernel ideas for its subsystem personalities", "macOS: Aqua UI and Cocoa on top of a kernel made of the Mach microkernel, BSD UNIX parts, the I/O kit and kernel extensions"],
    pros: ["combines approaches to balance performance, security and usability"],
    cons: ["no single clean model: you have to learn each system's mix"],
  },
};

/** The message hops for one request in a microkernel: the app never talks to the file system directly. */
export const MICROKERNEL_HOPS = ["application", "microkernel", "file system", "microkernel", "application"];

/* ------------------------------ system boot ------------------------------ */

export const BOOT_CODE = [
  "power on: execution starts at a fixed memory address",
  "firmware in ROM runs the initial boot code",
  "ROM code loads the boot block from a fixed place on disk",
  "boot block loads the bootstrap loader (e.g. GRUB)",
  "loader lets you pick a kernel, then loads it into memory",
  "kernel starts: the system is running",
];

export const BOOT_STAGES = ["Power on", "ROM firmware", "Boot block", "Bootstrap loader", "Kernel in memory", "System running"];

export type BootState = { stage: number };

export function bootFrames(): Frame<BootState>[] {
  const msgs = [
    "You press the power button. The CPU starts executing at a fixed memory location, wired in by the hardware.",
    "That location holds firmware in ROM (or EEPROM). It can't be erased by accident, so the computer can always start.",
    "Booting is often a two-step process: the ROM code is tiny, so it only loads a boot block from a fixed location on the disk.",
    "The boot block loads the bootstrap loader. A common one on Linux is GRUB.",
    "GRUB lets you choose a kernel from several disks, versions or options. Then it finds the kernel, loads it into memory and starts it.",
    "The kernel takes over. The system is now running.",
  ];
  return msgs.map((message, stage) => ({ state: { stage }, line: stage, message, stats: { stage: stage + 1 } }));
}

/* ------------------------------ process states ------------------------------ */

export type PState = "new" | "ready" | "running" | "waiting" | "terminated";
export type PEvent = "admitted" | "dispatch" | "interrupt" | "wait" | "complete" | "exit";

/** The five-state diagram: which event moves a process from one state to another. */
export const PROCESS_TRANSITIONS: { from: PState; to: PState; event: PEvent; label: string }[] = [
  { from: "new", to: "ready", event: "admitted", label: "admitted" },
  { from: "ready", to: "running", event: "dispatch", label: "scheduler dispatch" },
  { from: "running", to: "ready", event: "interrupt", label: "interrupt" },
  { from: "running", to: "waiting", event: "wait", label: "I/O or event wait" },
  { from: "waiting", to: "ready", event: "complete", label: "I/O or event completion" },
  { from: "running", to: "terminated", event: "exit", label: "exit" },
];

export function nextState(s: PState, e: PEvent): PState | null {
  return PROCESS_TRANSITIONS.find((t) => t.from === s && t.event === e)?.to ?? null;
}

/* ------------------------------ context switch ------------------------------ */

export type PcbView = { name: string; state: PState; pc: number; reg: number };
export type SwitchState = { running: 0 | 1 | null; phase: "exec" | "save" | "reload"; touch: 0 | 1 | null; pcb: [PcbView, PcbView]; cpu: { pc: number; reg: number } | null };

export const SWITCH_CODE = [
  "P0 executing",
  "interrupt or system call",
  "save state into PCB0",
  "reload state from PCB1",
  "P1 executing",
  "interrupt or system call",
  "save state into PCB1",
  "reload state from PCB0",
  "P0 executing again",
];

/** The textbook's CPU switch from P0 to P1 and back, with the PCBs filling in. */
export function contextSwitchFrames(): Frame<SwitchState>[] {
  const p0: PcbView = { name: "P0", state: "running", pc: 104, reg: 7 };
  const p1: PcbView = { name: "P1", state: "ready", pc: 512, reg: 42 };
  const frames: Frame<SwitchState>[] = [];
  let idle = 0;
  const push = (running: 0 | 1 | null, phase: SwitchState["phase"], a: PcbView, b: PcbView, cpu: SwitchState["cpu"], line: number, message: string) => {
    if (running === null) idle++;
    // the PCB being written (save) or read (reload): SWITCH_CODE lines 2 and 7 touch PCB0, 3 and 6 touch PCB1
    const touch: 0 | 1 | null = phase === "exec" ? null : line === 2 || line === 7 ? 0 : 1;
    frames.push({ state: { running, phase, touch, pcb: [{ ...a }, { ...b }], cpu: cpu && { ...cpu } }, line, message, stats: { "idle steps": idle } });
  };
  push(0, "exec", p0, p1, { pc: 108, reg: 9 }, 0, "P0 is running. Its program counter and registers live in the CPU right now, and they keep changing.");
  push(null, "exec", p0, p1, { pc: 112, reg: 11 }, 1, "An interrupt (say, the timer) or a system call stops P0. The OS takes over.");
  const p0s = { ...p0, state: "ready" as PState, pc: 112, reg: 11 };
  push(null, "save", p0s, p1, { pc: 112, reg: 11 }, 2, "The OS saves P0's context into PCB0: program counter 112, its registers, and its state (now ready).");
  const p1r = { ...p1, state: "running" as PState };
  push(null, "reload", p0s, p1r, { pc: 512, reg: 42 }, 3, "Then it reloads P1's context from PCB1 into the CPU. Notice the CPU did no useful work during these steps: that's the overhead.");
  push(1, "exec", p0s, p1r, { pc: 520, reg: 44 }, 4, "P1 runs, picking up exactly where it left off last time.");
  push(null, "exec", p0s, p1r, { pc: 524, reg: 45 }, 5, "Another interrupt or system call. Time to switch back.");
  const p1s = { ...p1r, state: "ready" as PState, pc: 524, reg: 45 };
  push(null, "save", p0s, p1s, { pc: 524, reg: 45 }, 6, "Save P1's context into PCB1.");
  const p0r = { ...p0s, state: "running" as PState };
  push(null, "reload", p0r, p1s, { pc: 112, reg: 11 }, 7, "Reload P0's context from PCB0: PC = 112, exactly where it was stopped.");
  push(0, "exec", p0r, p1s, { pc: 116, reg: 12 }, 8, "P0 continues as if nothing happened. The more there is to save (a bigger PCB, more registers), the longer each switch takes.");
  return frames;
}

/* ------------------------------ fork ------------------------------ */

export type ForkNode = { id: number; parent: number | null; bornAt: number };

/** n fork() calls in a row: every existing process forks at each call, so 2^n processes. */
export function forkTree(n: number): ForkNode[] {
  const nodes: ForkNode[] = [{ id: 0, parent: null, bornAt: 0 }];
  for (let call = 1; call <= n; call++) {
    const alive = nodes.length;
    for (let i = 0; i < alive; i++) nodes.push({ id: nodes.length, parent: nodes[i].id, bornAt: call });
  }
  return nodes;
}

/** The textbook's Linux process tree (pid and name). */
export const LINUX_TREE: { pid: number; name: string; parent: number | null }[] = [
  { pid: 1, name: "init", parent: null },
  { pid: 8415, name: "login", parent: 1 },
  { pid: 2, name: "kthreadd", parent: 1 },
  { pid: 3028, name: "sshd", parent: 1 },
  { pid: 8416, name: "bash", parent: 8415 },
  { pid: 6, name: "khelper", parent: 2 },
  { pid: 200, name: "pdflush", parent: 2 },
  { pid: 3610, name: "sshd", parent: 3028 },
  { pid: 9298, name: "ps", parent: 8416 },
  { pid: 9204, name: "emacs", parent: 8416 },
  { pid: 4005, name: "tcsch", parent: 3610 },
];

/* ------------------------------ bounded buffer ------------------------------ */

export type Ring = { buf: (number | null)[]; in: number; out: number; next: number };

export function ring(size: number): Ring {
  return { buf: Array(size).fill(null), in: 0, out: 0, next: 1 };
}

/** The shared-memory solution: full when (in + 1) % size == out, so only size − 1 slots are ever used. */
export const ringFull = (r: Ring) => (r.in + 1) % r.buf.length === r.out;
export const ringEmpty = (r: Ring) => r.in === r.out;
export const ringCount = (r: Ring) => (r.in - r.out + r.buf.length) % r.buf.length;

export function produce(r: Ring): Ring | null {
  if (ringFull(r)) return null;
  const buf = [...r.buf];
  buf[r.in] = r.next;
  return { buf, in: (r.in + 1) % buf.length, out: r.out, next: r.next + 1 };
}

export function consume(r: Ring): { ring: Ring; item: number } | null {
  if (ringEmpty(r)) return null;
  const buf = [...r.buf];
  const item = buf[r.out]!;
  buf[r.out] = null;
  return { ring: { buf, in: r.in, out: (r.out + 1) % buf.length, next: r.next }, item };
}

/* ------------------------------ message buffering ------------------------------ */

export type Capacity = "zero" | "bounded" | "unbounded";

/**
 * A sender that wants to send a message every tick and a receiver that takes one every `every` ticks.
 * Returns, per tick, the queue length and whether the sender had to block.
 */
export function messageSim(capacity: Capacity, ticks: number, every = 3, bound = 3) {
  const limit = capacity === "zero" ? 0 : capacity === "bounded" ? bound : Infinity;
  let queue = 0;
  let sent = 0;
  let received = 0;
  const out: { tick: number; queue: number; blocked: boolean; sent: number; received: number }[] = [];
  for (let t = 1; t <= ticks; t++) {
    const receiverReady = t % every === 0;
    let blocked = false;
    if (limit === 0) {
      // rendezvous: the message only moves when the receiver is there to take it
      if (receiverReady) {
        sent++;
        received++;
      } else blocked = true;
    } else {
      if (queue < limit) {
        queue++;
        sent++;
      } else blocked = true;
      if (receiverReady && queue > 0) {
        queue--;
        received++;
      }
    }
    out.push({ tick: t, queue, blocked, sent, received });
  }
  return out;
}

/* ------------------------------ Java threads (lab 2) ------------------------------ */

export type JState = "New" | "Runnable" | "Running" | "Blocked" | "Dead";

/** The lab's Java thread lifecycle. */
export const JAVA_TRANSITIONS: { from: JState; to: JState; label: string }[] = [
  { from: "New", to: "Runnable", label: "start()" },
  { from: "Runnable", to: "Running", label: "run()" },
  { from: "Running", to: "Runnable", label: "yield()" },
  { from: "Running", to: "Blocked", label: "sleep() / wait() / suspend()" },
  { from: "Blocked", to: "Runnable", label: "resume() / notify()" },
  { from: "Running", to: "Dead", label: "end of execution" },
  { from: "New", to: "Dead", label: "stop()" },
  { from: "Runnable", to: "Dead", label: "stop()" },
  { from: "Blocked", to: "Dead", label: "stop()" },
];

/** A small seeded random generator, so a "random" schedule replays the same way. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

export type ThreadOpts = { yieldEach: boolean; join: boolean; priorities: Record<"t1" | "A" | "B", number>; iterations: number; seed: number };
export type PrintLine = { thread: "t1" | "A" | "B" | "main"; text: string };

const LINE_TEXT: Record<"t1" | "A" | "B", string> = { t1: "MyRunnable is running!", A: "A is running!", B: "B is running!" };

/**
 * Simulate the lab's main(): start t1 (MyRunnable), t2 ("A") and t3 ("B"), then print "In main thread!".
 * Without yield, the scheduler runs a thread for a random burst, picking higher priorities more often.
 * With yield, every thread gives up the CPU after each line, so they take turns.
 * With join, main waits for all three before printing.
 */
export function runThreads(o: ThreadOpts): PrintLine[] {
  const rnd = seeded(o.seed);
  const left: Record<"t1" | "A" | "B", number> = { t1: o.iterations, A: o.iterations, B: o.iterations };
  const order: ("t1" | "A" | "B")[] = ["t1", "A", "B"];
  const out: PrintLine[] = [];
  // main keeps running right after start() unless it joins; it gets the CPU after 0-2 lines
  let mainAfter = o.join ? Infinity : Math.floor(rnd() * 3);
  let turn = 0;
  while (order.some((t) => left[t] > 0)) {
    if (out.length >= mainAfter) {
      out.push({ thread: "main", text: "In main thread!" });
      mainAfter = Infinity;
    }
    const alive = order.filter((t) => left[t] > 0);
    let pick: "t1" | "A" | "B";
    let burst: number;
    if (o.yieldEach) {
      pick = alive[turn % alive.length];
      turn++;
      burst = 1;
    } else {
      const total = alive.reduce((s, t) => s + o.priorities[t], 0);
      let x = rnd() * total;
      pick = alive.find((t) => (x -= o.priorities[t]) < 0) ?? alive[alive.length - 1];
      burst = 1 + Math.floor(rnd() * 3);
    }
    for (let k = 0; k < burst && left[pick] > 0; k++) {
      out.push({ thread: pick, text: LINE_TEXT[pick] });
      left[pick]--;
    }
  }
  if (mainAfter !== Infinity || o.join) out.push({ thread: "main", text: "In main thread!" });
  return out;
}

export type MatrixState = { done: boolean[][]; active: number[]; joined: boolean };

/** Exercise 2: one thread per row adds its row; the threads run interleaved, then main joins. */
export function matrixAddFrames(rows: number, cols: number, seed = 7): Frame<MatrixState>[] {
  const rnd = seeded(seed);
  const done = Array.from({ length: rows }, () => Array(cols).fill(false));
  const next = Array(rows).fill(0);
  const frames: Frame<MatrixState>[] = [];
  const snap = (active: number[], joined: boolean, line: number, message: string) =>
    frames.push({ state: { done: done.map((r) => [...r]), active, joined }, line, message, stats: { "cells done": done.flat().filter(Boolean).length, threads: rows } });
  snap([], false, 0, `main creates ${rows} threads, one for each row, and starts them all.`);
  while (next.some((c) => c < cols)) {
    const alive = next.map((c, r) => (c < cols ? r : -1)).filter((r) => r >= 0);
    const r = alive[Math.floor(rnd() * alive.length)];
    done[r][next[r]] = true;
    next[r]++;
    snap([r], false, 2, `Thread ${r} adds A[${r}][${next[r] - 1}] + B[${r}][${next[r] - 1}] and writes it into C. The scheduler decides which thread runs, so rows fill in an unpredictable order.`);
  }
  snap([], true, 3, "main called join() on every thread, so it waited here until all of them finished. Now C is complete and main can print it.");
  return frames;
}

export const MATRIX_CODE = [
  "for each row r: threads[r] = new RowAdder(r); threads[r].start();",
  "  // inside RowAdder.run():",
  "  for (int c = 0; c < cols; c++) C[r][c] = A[r][c] + B[r][c];",
  "for each row r: threads[r].join();",
  "print(C);",
];

/* ------------------------------ race condition ------------------------------ */

export const RACE_CODE = {
  P: ["register1 = counter", "register1 = register1 + 1", "counter = register1"],
  C: ["register2 = counter", "register2 = register2 - 1", "counter = register2"],
};

export type RaceState = { counter: number; r1: number | null; r2: number | null; pcP: number; pcC: number; log: string[] };

/** counter++ (producer) and counter-- (consumer) as three machine instructions each, run in the given order. */
export function raceRun(order: ("P" | "C")[], start = 5): RaceState[] {
  let s: RaceState = { counter: start, r1: null, r2: null, pcP: 0, pcC: 0, log: [] };
  const out = [s];
  for (const who of order) {
    const pc = who === "P" ? s.pcP : s.pcC;
    if (pc >= 3) continue;
    const n = { ...s, log: [...s.log] };
    if (who === "P") {
      if (pc === 0) n.r1 = s.counter;
      else if (pc === 1) n.r1 = s.r1! + 1;
      else n.counter = s.r1!;
      n.pcP++;
      n.log.push(`S${s.log.length}: producer ${RACE_CODE.P[pc]}  {${pc === 2 ? `counter = ${n.counter}` : `register1 = ${n.r1}`}}`);
    } else {
      if (pc === 0) n.r2 = s.counter;
      else if (pc === 1) n.r2 = s.r2! - 1;
      else n.counter = s.r2!;
      n.pcC++;
      n.log.push(`S${s.log.length}: consumer ${RACE_CODE.C[pc]}  {${pc === 2 ? `counter = ${n.counter}` : `register2 = ${n.r2}`}}`);
    }
    s = n;
    out.push(s);
  }
  return out;
}

/** The interleaving from the slides: it ends with counter = 4 instead of 5. */
export const TEXTBOOK_RACE: ("P" | "C")[] = ["P", "P", "C", "C", "P", "C"];

/* ------------------------------ Peterson's solution ------------------------------ */

export const PETERSON_CODE = [
  "flag[i] = true;",
  "turn = j;",
  "while (flag[j] && turn == j);",
  "    /* critical section */",
  "flag[i] = false;",
  "    /* remainder section */",
];

export type PetersonState = { pc: [number, number]; flag: [boolean, boolean]; turn: 0 | 1; spins: [number, number]; entries: [number, number] };

export const petersonStart = (): PetersonState => ({ pc: [0, 0], flag: [false, false], turn: 0, spins: [0, 0], entries: [0, 0] });

/** Let process i run one line of Peterson's algorithm. */
export function petersonStep(s: PetersonState, i: 0 | 1): PetersonState {
  const j = (1 - i) as 0 | 1;
  const n: PetersonState = { pc: [...s.pc] as [number, number], flag: [...s.flag] as [boolean, boolean], turn: s.turn, spins: [...s.spins] as [number, number], entries: [...s.entries] as [number, number] };
  switch (s.pc[i]) {
    case 0:
      n.flag[i] = true;
      n.pc[i] = 1;
      break;
    case 1:
      n.turn = j;
      n.pc[i] = 2;
      break;
    case 2:
      if (s.flag[j] && s.turn === j) n.spins[i]++;
      else {
        n.pc[i] = 3;
        n.entries[i]++;
      }
      break;
    case 3:
      n.pc[i] = 4;
      break;
    case 4:
      n.flag[i] = false;
      n.pc[i] = 5;
      break;
    default:
      n.pc[i] = 0;
  }
  return n;
}

/* ------------------------------ hardware instructions ------------------------------ */

/** test_and_set: return the old value and set the target to true, as one atomic step. */
export function testAndSet(target: { value: boolean }) {
  const rv = target.value;
  target.value = true;
  return rv;
}

/** compare_and_swap: set to new_value only if it equals expected; always return the old value. */
export function compareAndSwap(target: { value: number }, expected: number, newValue: number) {
  const temp = target.value;
  if (target.value === expected) target.value = newValue;
  return temp;
}

/* ------------------------------ semaphores ------------------------------ */

export type Sem = { value: number; list: string[] };

/** wait() without busy waiting: decrement, and block the caller if the value went negative. */
export function semWait(s: Sem, who: string): { sem: Sem; blocked: boolean } {
  const value = s.value - 1;
  if (value < 0) return { sem: { value, list: [...s.list, who] }, blocked: true };
  return { sem: { value, list: s.list }, blocked: false };
}

/** signal(): increment, and wake the first blocked process if anyone is waiting. */
export function semSignal(s: Sem): { sem: Sem; woke: string | null } {
  const value = s.value + 1;
  if (value <= 0) return { sem: { value, list: s.list.slice(1) }, woke: s.list[0] };
  return { sem: { value, list: s.list }, woke: null };
}

export type DeadlockState = { held: Record<"S" | "Q", "P0" | "P1" | null>; waiting: Record<"P0" | "P1", "S" | "Q" | null> };

export const DEADLOCK_CODE = ["P0: wait(S);", "P1: wait(Q);", "P0: wait(Q);   ← blocks, P1 has Q", "P1: wait(S);   ← blocks, P0 has S", "deadlock: each waits for the other forever"];

/** The slides' S and Q example, in the one order that deadlocks. */
export function deadlockFrames(): Frame<DeadlockState>[] {
  const f = (held: DeadlockState["held"], waiting: DeadlockState["waiting"], line: number, message: string): Frame<DeadlockState> => ({
    state: { held, waiting },
    line,
    message,
    stats: { blocked: Object.values(waiting).filter(Boolean).length },
  });
  return [
    f({ S: null, Q: null }, { P0: null, P1: null }, -1, "S and Q are both semaphores initialized to 1. P0 needs S then Q. P1 needs Q then S."),
    f({ S: "P0", Q: null }, { P0: null, P1: null }, 0, "P0 runs wait(S). S goes from 1 to 0: P0 holds S."),
    f({ S: "P0", Q: "P1" }, { P0: null, P1: null }, 1, "Context switch. P1 runs wait(Q). Q goes from 1 to 0: P1 holds Q."),
    f({ S: "P0", Q: "P1" }, { P0: "Q", P1: null }, 2, "P0 runs wait(Q). Q is 0, so P0 blocks, waiting for P1 to signal(Q)."),
    f({ S: "P0", Q: "P1" }, { P0: "Q", P1: "S" }, 3, "P1 runs wait(S). S is 0, so P1 blocks, waiting for P0 to signal(S)."),
    f({ S: "P0", Q: "P1" }, { P0: "Q", P1: "S" }, 4, "Deadlock! Each process waits for an event (a signal) that only the other, blocked, process can cause. Nobody will ever move again."),
  ];
}

/* ------------------------------ bounded buffer with semaphores ------------------------------ */

export type SemBuffer = { slots: (number | null)[]; in: number; out: number; next: number; empty: number; full: number; blockedP: number; blockedC: number };

export const semBuffer = (n: number): SemBuffer => ({ slots: Array(n).fill(null), in: 0, out: 0, next: 1, empty: n, full: 0, blockedP: 0, blockedC: 0 });

/** Producer: wait(empty); wait(mutex); add; signal(mutex); signal(full). Blocks when empty is 0. */
export function semProduce(b: SemBuffer): SemBuffer {
  if (b.empty === 0) return { ...b, blockedP: b.blockedP + 1 };
  const slots = [...b.slots];
  slots[b.in] = b.next;
  return { ...b, slots, in: (b.in + 1) % slots.length, next: b.next + 1, empty: b.empty - 1, full: b.full + 1, blockedP: 0 };
}

/** Consumer: wait(full); wait(mutex); remove; signal(mutex); signal(empty). Blocks when full is 0. */
export function semConsume(b: SemBuffer): SemBuffer {
  if (b.full === 0) return { ...b, blockedC: b.blockedC + 1 };
  const slots = [...b.slots];
  slots[b.out] = null;
  return { ...b, slots, out: (b.out + 1) % slots.length, empty: b.empty + 1, full: b.full - 1, blockedC: 0 };
}

/* ------------------------------ readers-writers ------------------------------ */

export type RW = { reading: string[]; writing: string | null; readCount: number; queue: { kind: "R" | "W"; name: string }[]; behind: string[]; nextR: number; nextW: number };

export const rwStart = (): RW => ({ reading: [], writing: null, readCount: 0, queue: [], behind: [], nextR: 1, nextW: 1 });

/** Give rw_mutex to whoever is first in its queue. A reader brings every reader queued behind it. */
function rwRelease(s: RW): RW {
  const [first, ...rest] = s.queue;
  if (!first) return { ...s, queue: [] };
  if (first.kind === "W") return { ...s, writing: first.name, queue: rest };
  const reading = [first.name, ...s.behind];
  return { ...s, reading, readCount: reading.length, behind: [], queue: rest };
}

/** The first readers-writers variation: readers never wait unless a writer already has the data. */
export function rwArrive(s: RW, kind: "R" | "W"): RW {
  if (kind === "R") {
    const name = `R${s.nextR}`;
    const n = { ...s, nextR: s.nextR + 1 };
    if (s.writing || s.queue.some((q) => q.kind === "R")) {
      // the first reader waits on rw_mutex while holding mutex; later readers wait on mutex behind it
      if (s.queue.some((q) => q.kind === "R")) return { ...n, behind: [...s.behind, name] };
      return { ...n, queue: [...s.queue, { kind: "R", name }] };
    }
    return { ...n, reading: [...s.reading, name], readCount: s.readCount + 1 };
  }
  const name = `W${s.nextW}`;
  const n = { ...s, nextW: s.nextW + 1 };
  if (s.writing || s.readCount > 0) return { ...n, queue: [...s.queue, { kind: "W", name }] };
  return { ...n, writing: name };
}

export function rwLeave(s: RW, kind: "R" | "W"): RW {
  if (kind === "W") {
    if (!s.writing) return s;
    return rwRelease({ ...s, writing: null });
  }
  if (!s.reading.length) return s;
  const reading = s.reading.slice(1);
  const n = { ...s, reading, readCount: reading.length };
  return reading.length === 0 ? rwRelease(n) : n;
}

/* ------------------------------ dining philosophers ------------------------------ */

export type Phil = "thinking" | "hungry" | "eating";
export type Dining = { phil: Phil[]; stick: (number | null)[]; meals: number[] };

export const diningStart = (n = 5): Dining => ({ phil: Array(n).fill("thinking"), stick: Array(n).fill(null), meals: Array(n).fill(0) });

/** Philosopher i's chopsticks, in the order they pick them up. */
export function stickOrder(i: number, n: number, mode: "naive" | "asymmetric") {
  const left = i;
  const right = (i + 1) % n;
  return mode === "asymmetric" && i % 2 === 1 ? [right, left] : [left, right];
}

/** One move by philosopher i: get hungry, pick up the next chopstick if it's free, eat, or put both down. */
export function diningStep(d: Dining, i: number, mode: "naive" | "asymmetric"): Dining {
  const n = d.phil.length;
  const phil = [...d.phil];
  const stick = [...d.stick];
  const meals = [...d.meals];
  const [first, second] = stickOrder(i, n, mode);
  if (phil[i] === "thinking") phil[i] = "hungry";
  else if (phil[i] === "hungry") {
    if (stick[first] === null) stick[first] = i;
    else if (stick[first] === i && stick[second] === null) {
      stick[second] = i;
      phil[i] = "eating";
      meals[i]++;
    }
  } else {
    stick[first] = null;
    stick[second] = null;
    phil[i] = "thinking";
  }
  return { phil, stick, meals };
}

/** Deadlocked: everyone is hungry and holds exactly their first chopstick, waiting for one that's taken. */
export function diningDeadlocked(d: Dining, mode: "naive" | "asymmetric") {
  const n = d.phil.length;
  return d.phil.every((p, i) => {
    const [first, second] = stickOrder(i, n, mode);
    return p === "hungry" && d.stick[first] === i && d.stick[second] !== null && d.stick[second] !== i;
  });
}

/* ------------------------------ Java synchronization (lab 3) ------------------------------ */

export type JRace = { c: number; reg: [number | null, number | null]; pc: [number, number]; owner: 0 | 1 | null; blocked: [boolean, boolean]; log: string[] };

/** The steps of increment() / decrement(); acquire and release only exist when the methods are synchronized. */
export function jraceSteps(synced: boolean, op: "inc" | "dec") {
  const body = ["int register = c;", `register = register ${op === "inc" ? "+" : "-"} 1;`, "c = register;"];
  return synced ? ["acquire the object's lock", ...body, "release the lock"] : body;
}

/**
 * Thread 0 runs increment(), thread 1 runs decrement(), on the same counter (start 1, like the lab).
 * With synchronized methods, a thread that reaches the lock while the other holds it is blocked.
 */
export function jraceRun(order: (0 | 1)[], synced: boolean, start = 1): JRace {
  const ops: ("inc" | "dec")[] = ["inc", "dec"];
  const steps = ops.map((o) => jraceSteps(synced, o));
  const s: JRace = { c: start, reg: [null, null], pc: [0, 0], owner: null, blocked: [false, false], log: [] };
  for (const t of order) {
    const pc = s.pc[t];
    if (pc >= steps[t].length) continue;
    const line = steps[t][pc];
    if (synced && pc === 0) {
      if (s.owner !== null && s.owner !== t) {
        s.blocked[t] = true;
        s.log.push(`T${s.log.length}: ${t ? "B" : "A"} tries to enter, but ${s.owner ? "B" : "A"} holds the lock: blocked`);
        continue;
      }
      s.owner = t;
      s.blocked[t] = false;
    } else if (line.startsWith("int register")) s.reg[t] = s.c;
    else if (line.startsWith("register =")) s.reg[t] = s.reg[t]! + (ops[t] === "inc" ? 1 : -1);
    else if (line.startsWith("c =")) s.c = s.reg[t]!;
    else if (line.startsWith("release")) s.owner = null;
    s.pc[t]++;
    s.log.push(`T${s.log.length}: ${t ? "B" : "A"} ${line}  {${line.startsWith("c =") ? `c = ${s.c}` : line.includes("lock") ? `lock: ${s.owner === null ? "free" : s.owner ? "B" : "A"}` : `register = ${s.reg[t]}`}}`);
  }
  return s;
}

/* A Java object's monitor: one owner, an entry set waiting for the lock, a wait set waiting for notify. */
export type Monitor = { owner: string | null; entry: string[]; waitSet: string[]; note: string };

export const monitorStart = (): Monitor => ({ owner: null, entry: [], waitSet: [], note: "The object's lock is free." });

/** Hand the lock to the first thread in the entry set, if any. */
function nextOwner(m: Monitor): Monitor {
  const [first, ...rest] = m.entry;
  return first ? { ...m, owner: first, entry: rest } : { ...m, owner: null };
}

export function monitorEnter(m: Monitor, t: string): Monitor {
  if (m.owner === t || m.entry.includes(t) || m.waitSet.includes(t)) return m;
  if (m.owner === null) return { ...m, owner: t, note: `${t} enters the synchronized block and acquires the object's lock.` };
  return { ...m, entry: [...m.entry, t], note: `${t} wants the lock, but ${m.owner} has it. ${t} blocks in the entry set.` };
}

export function monitorExit(m: Monitor, t: string): Monitor {
  if (m.owner !== t) return m;
  const n = nextOwner(m);
  return { ...n, note: `${t} leaves the synchronized block and releases the lock.${n.owner ? ` ${n.owner} gets it next.` : ""}` };
}

export function monitorWait(m: Monitor, t: string): Monitor {
  if (m.owner !== t) return { ...m, note: `${t} can only call wait() while it owns the lock (otherwise Java throws IllegalMonitorStateException).` };
  const n = nextOwner({ ...m, waitSet: [...m.waitSet, t] });
  return { ...n, note: `${t} calls wait(): it releases the lock and goes to sleep in the wait set.${n.owner ? ` ${n.owner} gets the lock.` : ""}` };
}

export function monitorNotify(m: Monitor, t: string, all = false): Monitor {
  if (m.owner !== t) return { ...m, note: `${t} must own the lock to call notify${all ? "All" : ""}().` };
  if (!m.waitSet.length) return { ...m, note: `${t} calls notify${all ? "All" : ""}(), but nobody is in the wait set. Nothing happens.` };
  const woken = all ? m.waitSet : m.waitSet.slice(0, 1);
  return {
    ...m,
    waitSet: all ? [] : m.waitSet.slice(1),
    entry: [...m.entry, ...woken],
    note: `${t} calls notify${all ? "All" : ""}(): ${woken.join(", ")} ${woken.length > 1 ? "wake" : "wakes"} up and must re-acquire the lock, so ${woken.length > 1 ? "they move" : "it moves"} to the entry set. ${t} still holds the lock.`,
  };
}

/* ------------------------------ CPU scheduling ------------------------------ */

export type Proc = { name: string; arrival: number; burst: number; priority?: number };
export type Algo = "fcfs" | "sjf" | "srtf" | "priority" | "priority-p" | "rr";
export type Slice = { name: string | null; from: number; to: number };
export type ProcStats = { name: string; arrival: number; burst: number; completion: number; turnaround: number; waiting: number; response: number };

/**
 * Run one CPU over the processes and return the Gantt chart plus each process's times.
 * Ties go to the earlier arrival, then the earlier position in the list (so FCFS order is the list order).
 * Smaller priority numbers mean higher priority.
 */
export function schedule(procs: Proc[], algo: Algo, quantum = 4) {
  const n = procs.length;
  const left = procs.map((p) => p.burst);
  const firstRun: (number | null)[] = procs.map(() => null);
  const done: number[] = procs.map(() => -1);
  const slices: Slice[] = [];
  const order = procs.map((_, i) => i).sort((a, b) => procs[a].arrival - procs[b].arrival || a - b);
  const queue: number[] = []; // round-robin ready queue
  let enqueued = 0;
  let t = 0;
  let current = -1;
  let sliceLeft = 0;
  const push = (name: string | null, from: number, to: number) => {
    if (to <= from) return;
    const last = slices[slices.length - 1];
    if (last && last.name === name && last.to === from) last.to = to;
    else slices.push({ name, from, to });
  };
  const admit = (upTo: number) => {
    while (enqueued < n && procs[order[enqueued]].arrival <= upTo) queue.push(order[enqueued++]);
  };
  const key = (i: number) => (algo === "sjf" || algo === "srtf" ? left[i] : algo === "priority" || algo === "priority-p" ? procs[i].priority ?? 0 : procs[i].arrival);
  const preemptive = algo === "srtf" || algo === "priority-p";
  let guard = 0;
  while (done.some((d) => d < 0) && guard++ < 100000) {
    if (algo === "rr") {
      admit(t);
      if (current < 0) {
        if (!queue.length) {
          const nextArrival = procs[order[enqueued]].arrival;
          push(null, t, nextArrival);
          t = nextArrival;
          continue;
        }
        current = queue.shift()!;
        sliceLeft = quantum;
      }
      const run = Math.min(sliceLeft, left[current]);
      if (firstRun[current] === null) firstRun[current] = t;
      push(procs[current].name, t, t + run);
      t += run;
      left[current] -= run;
      sliceLeft -= run;
      admit(t); // arrivals during the slice join the queue before the preempted process
      if (left[current] === 0) {
        done[current] = t;
        current = -1;
      } else if (sliceLeft === 0) {
        queue.push(current);
        current = -1;
      }
      continue;
    }
    const ready = procs.map((_, i) => i).filter((i) => done[i] < 0 && procs[i].arrival <= t);
    if (!ready.length) {
      const next = Math.min(...procs.filter((_, i) => done[i] < 0).map((p) => p.arrival));
      push(null, t, next);
      t = next;
      continue;
    }
    const best = (cands: number[]) => cands.reduce((a, b) => (key(b) < key(a) || (key(b) === key(a) && (procs[b].arrival < procs[a].arrival || (procs[b].arrival === procs[a].arrival && b < a))) ? b : a));
    if (current < 0 || done[current] >= 0 || (preemptive && best(ready) !== current && key(best(ready)) < key(current))) current = best(ready);
    if (firstRun[current] === null) firstRun[current] = t;
    // run until it finishes, or (if preemptive) until the next arrival might change our mind
    const nextArrival = Math.min(...procs.filter((p, i) => done[i] < 0 && p.arrival > t).map((p) => p.arrival), Infinity);
    const run = preemptive ? Math.min(left[current], nextArrival - t) : left[current];
    push(procs[current].name, t, t + run);
    t += run;
    left[current] -= run;
    if (left[current] === 0) {
      done[current] = t;
      current = -1;
    }
  }
  const stats: ProcStats[] = procs.map((p, i) => ({
    name: p.name,
    arrival: p.arrival,
    burst: p.burst,
    completion: done[i],
    turnaround: done[i] - p.arrival,
    waiting: done[i] - p.arrival - p.burst,
    response: (firstRun[i] ?? 0) - p.arrival,
  }));
  const avg = (k: "waiting" | "turnaround" | "response") => stats.reduce((s, x) => s + x[k], 0) / n;
  const switches = slices.filter((s) => s.name !== null).length - 1;
  return { slices, stats, avgWaiting: avg("waiting"), avgTurnaround: avg("turnaround"), avgResponse: avg("response"), switches };
}

/** The deterministic-evaluation workload: five processes arriving at time 0. */
export const EVAL_WORKLOAD: Proc[] = [
  { name: "P1", arrival: 0, burst: 10 },
  { name: "P2", arrival: 0, burst: 29 },
  { name: "P3", arrival: 0, burst: 3 },
  { name: "P4", arrival: 0, burst: 7 },
  { name: "P5", arrival: 0, burst: 12 },
];

/** The worked examples from the slides, with the average waiting time each one should give. */
export const SCHED_PRESETS: { id: string; label: string; algo: Algo; quantum?: number; procs: Proc[]; expected: number }[] = [
  { id: "fcfs1", label: "FCFS: P1, P2, P3", algo: "fcfs", procs: [{ name: "P1", arrival: 0, burst: 24 }, { name: "P2", arrival: 0, burst: 3 }, { name: "P3", arrival: 0, burst: 3 }], expected: 17 },
  { id: "fcfs2", label: "FCFS: P2, P3, P1", algo: "fcfs", procs: [{ name: "P2", arrival: 0, burst: 3 }, { name: "P3", arrival: 0, burst: 3 }, { name: "P1", arrival: 0, burst: 24 }], expected: 3 },
  { id: "sjf", label: "SJF, all arrive at 0", algo: "sjf", procs: [{ name: "P1", arrival: 0, burst: 6 }, { name: "P2", arrival: 0, burst: 8 }, { name: "P3", arrival: 0, burst: 7 }, { name: "P4", arrival: 0, burst: 3 }], expected: 7 },
  { id: "sjf-np", label: "Non-preemptive SJF", algo: "sjf", procs: [{ name: "P1", arrival: 0, burst: 7 }, { name: "P2", arrival: 2, burst: 4 }, { name: "P3", arrival: 4, burst: 1 }, { name: "P4", arrival: 5, burst: 4 }], expected: 4 },
  { id: "srtf1", label: "Preemptive SJF (SRTF)", algo: "srtf", procs: [{ name: "P1", arrival: 0, burst: 7 }, { name: "P2", arrival: 2, burst: 4 }, { name: "P3", arrival: 4, burst: 1 }, { name: "P4", arrival: 5, burst: 4 }], expected: 3 },
  { id: "srtf2", label: "SRTF, second example", algo: "srtf", procs: [{ name: "P1", arrival: 0, burst: 8 }, { name: "P2", arrival: 1, burst: 4 }, { name: "P3", arrival: 2, burst: 9 }, { name: "P4", arrival: 3, burst: 5 }], expected: 6.5 },
  { id: "prio", label: "Priority", algo: "priority", procs: [{ name: "P1", arrival: 0, burst: 10, priority: 3 }, { name: "P2", arrival: 0, burst: 1, priority: 1 }, { name: "P3", arrival: 0, burst: 2, priority: 4 }, { name: "P4", arrival: 0, burst: 1, priority: 5 }, { name: "P5", arrival: 0, burst: 5, priority: 2 }], expected: 8.2 },
  { id: "rr4", label: "RR, q = 4", algo: "rr", quantum: 4, procs: [{ name: "P1", arrival: 0, burst: 24 }, { name: "P2", arrival: 0, burst: 3 }, { name: "P3", arrival: 0, burst: 3 }], expected: 17 / 3 },
  { id: "rr20", label: "RR, q = 20", algo: "rr", quantum: 20, procs: [{ name: "P1", arrival: 0, burst: 53 }, { name: "P2", arrival: 0, burst: 17 }, { name: "P3", arrival: 0, burst: 68 }, { name: "P4", arrival: 0, burst: 24 }], expected: 73 },
  { id: "eval", label: "Evaluation workload", algo: "fcfs", procs: EVAL_WORKLOAD, expected: 28 },
];

/** Exponential averaging: τ(n+1) = α·t(n) + (1 − α)·τ(n). Returns the predictions τ0, τ1, … */
export function expAverage(bursts: number[], alpha: number, tau0: number) {
  const tau = [tau0];
  for (const t of bursts) tau.push(alpha * t + (1 - alpha) * tau[tau.length - 1]);
  return tau;
}

/** The textbook's burst sequence for the prediction chart. */
export const BURST_SAMPLE = [6, 4, 6, 4, 13, 13, 13];

/** Context switches needed to run one burst of `burst` units with time quantum q. */
export const switchesFor = (burst: number, q: number) => Math.max(0, Math.ceil(burst / q) - 1);

export type MlfqSlice = { name: string; from: number; to: number; level: 0 | 1 | 2 };

/** The slides' multilevel feedback queue: Q0 is RR with q = 8, Q1 is RR with q = 16, Q2 is FCFS. All jobs arrive at 0. */
export function mlfq(jobs: { name: string; burst: number }[]) {
  const left = jobs.map((j) => j.burst);
  const slices: MlfqSlice[] = [];
  let t = 0;
  const quanta = [8, 16, Infinity];
  for (let level = 0 as 0 | 1 | 2; level <= 2; level = (level + 1) as 0 | 1 | 2) {
    for (let i = 0; i < jobs.length; i++) {
      if (left[i] === 0) continue;
      const run = Math.min(left[i], quanta[level]);
      slices.push({ name: jobs[i].name, from: t, to: t + run, level });
      t += run;
      left[i] -= run;
    }
    if (level === 2) break;
  }
  return slices;
}

/* ------------------------------ main memory ------------------------------ */

/** Hardware protection: a user-mode address must satisfy base ≤ address < base + limit, or it traps. */
export function baseLimitCheck(addr: number, base: number, limit: number) {
  if (addr < base) return { ok: false, failed: "addr ≥ base" as const };
  if (addr >= base + limit) return { ok: false, failed: "addr < base + limit" as const };
  return { ok: true, failed: null };
}

/** Dynamic relocation: the MMU adds the relocation register to every logical address (after checking the limit). */
export function relocate(logical: number, relocation: number, limit = Infinity) {
  if (logical >= limit) return { ok: false, physical: null };
  return { ok: true, physical: logical + relocation };
}

/** Swap time = size / transfer rate, out and back in. */
export const swapTime = (sizeMB: number, rateMBs: number) => ({ out: (sizeMB / rateMBs) * 1000, total: ((2 * sizeMB) / rateMBs) * 1000 });

export type Block = { start: number; size: number; owner: string | null };
export type Fit = "first" | "best" | "worst";

/** Pick a hole for a request of `size`: the first big enough, the smallest big enough, or the largest. Returns the block index or -1. */
export function chooseHole(mem: Block[], size: number, fit: Fit) {
  let pick = -1;
  mem.forEach((b, i) => {
    if (b.owner !== null || b.size < size) return;
    if (pick < 0) pick = i; // first fit stops at this one
    else if (fit === "best" && b.size < mem[pick].size) pick = i;
    else if (fit === "worst" && b.size > mem[pick].size) pick = i;
  });
  return pick;
}

/** Allocate from the chosen hole, leaving the rest of the hole free. */
export function allocate(mem: Block[], size: number, owner: string, fit: Fit): { mem: Block[]; at: number } {
  const i = chooseHole(mem, size, fit);
  if (i < 0) return { mem, at: -1 };
  const h = mem[i];
  const parts: Block[] = [{ start: h.start, size, owner }];
  if (h.size > size) parts.push({ start: h.start + size, size: h.size - size, owner: null });
  return { mem: [...mem.slice(0, i), ...parts, ...mem.slice(i + 1)], at: i };
}

/** Free a process's partition and merge it with neighbouring holes. */
export function release(mem: Block[], owner: string): Block[] {
  const freed = mem.map((b) => (b.owner === owner ? { ...b, owner: null } : b));
  const out: Block[] = [];
  for (const b of freed) {
    const last = out[out.length - 1];
    if (last && last.owner === null && b.owner === null && last.start + last.size === b.start) last.size += b.size;
    else out.push({ ...b });
  }
  return out;
}

/** Compaction: slide every process down and gather all free memory into one hole at the end. */
export function compact(mem: Block[]): Block[] {
  let at = mem[0]?.start ?? 0;
  const end = mem.length ? mem[mem.length - 1].start + mem[mem.length - 1].size : 0;
  const used = mem.filter((b) => b.owner !== null).map((b) => {
    const moved = { ...b, start: at };
    at += b.size;
    return moved;
  });
  return at < end ? [...used, { start: at, size: end - at, owner: null }] : used;
}

/** The textbook exercise: partitions of 100K, 500K, 200K, 300K and 600K (in order), with occupied blocks between them. */
export function fitExerciseMemory(): Block[] {
  const holes = [100, 500, 200, 300, 600];
  const mem: Block[] = [];
  let at = 0;
  holes.forEach((h, i) => {
    mem.push({ start: at, size: 50, owner: i === 0 ? "OS" : "used" });
    at += 50;
    mem.push({ start: at, size: h, owner: null });
    at += h;
  });
  return mem;
}

export const FIT_REQUESTS = [212, 417, 112, 426];

/* ------------------------------ segmentation ------------------------------ */

/** The textbook's segment table: segment → base and limit. */
export const SEGMENT_TABLE = [
  { name: "subroutine", base: 1400, limit: 1000 },
  { name: "sqrt", base: 6300, limit: 400 },
  { name: "main program", base: 4300, limit: 400 },
  { name: "stack", base: 3200, limit: 1100 },
  { name: "symbol table", base: 4700, limit: 1000 },
];

export function segTranslate(s: number, d: number, table = SEGMENT_TABLE) {
  if (s < 0 || s >= table.length) return { ok: false, physical: null, reason: `segment ${s} doesn't exist (s ≥ STLR)` };
  if (d >= table[s].limit) return { ok: false, physical: null, reason: `offset ${d} ≥ limit ${table[s].limit}: addressing error` };
  return { ok: true, physical: table[s].base + d, reason: null };
}

/* ------------------------------ paging ------------------------------ */

/** Split an address into fields of the given bit widths, from the most significant. */
export function splitAddress(addr: number, widths: number[]) {
  const total = widths.reduce((a, b) => a + b, 0);
  let shift = total;
  return widths.map((w) => {
    shift -= w;
    return Math.floor(addr / 2 ** shift) % 2 ** w;
  });
}

/** The textbook's paging example: 32-byte memory, 4-byte pages, page table 0→5, 1→6, 2→1, 3→2. */
export const PAGE_EXAMPLE = { pageSize: 4, frames: 8, table: [5, 6, 1, 2], data: "abcdefghijklmnop" };

export function pageTranslate(logical: number, pageSize: number, table: number[]) {
  const p = Math.floor(logical / pageSize);
  const d = logical % pageSize;
  if (p >= table.length) return { p, d, f: null, physical: null };
  return { p, d, f: table[p], physical: table[p] * pageSize + d };
}

/** Internal fragmentation when a process of `size` bytes is split into pages of `pageSize`. */
export function internalFrag(size: number, pageSize: number) {
  const full = Math.floor(size / pageSize);
  const rest = size % pageSize;
  return { full, rest, pages: full + (rest ? 1 : 0), waste: rest ? pageSize - rest : 0 };
}

/** Effective access time with a TLB: EAT = (m + ε)α + (2m + ε)(1 − α). */
export const eat = (alpha: number, epsilon: number, m: number) => (m + epsilon) * alpha + (2 * m + epsilon) * (1 - alpha);

/** Run a page-reference string through a small TLB (LRU replacement) and record hits and misses. */
export function tlbRun(refs: number[], size: number) {
  let tlb: number[] = [];
  return refs.map((p) => {
    const hit = tlb.includes(p);
    tlb = [...tlb.filter((x) => x !== p), p];
    let evicted: number | null = null;
    if (tlb.length > size) evicted = tlb.shift()!;
    return { page: p, hit, tlb: [...tlb], evicted };
  });
}

/* ------------------------------ virtual memory ------------------------------ */

/** Demand-paging effective access time: (1 − p) × memory + p × page-fault service time (both in ns). */
export const demandEat = (p: number, memNs = 200, faultNs = 8_000_000) => (1 - p) * memNs + p * faultNs;

/** Largest page-fault rate that keeps the slowdown under `pct` percent. */
export const maxFaultRate = (pct: number, memNs = 200, faultNs = 8_000_000) => ((pct / 100) * memNs) / (faultNs - memNs);

export type PfState = { stage: number; valid: boolean[]; frames: (string | null)[] };

export const PAGE_FAULT_CODE = [
  "reference: load M (page 3)",
  "page table entry is i → trap to the OS: page fault",
  "OS checks its internal table: legal, just not in memory",
  "find a free frame",
  "read the page from the backing store into the frame",
  "reset the page table: set the bit to v",
  "restart the instruction",
];

/** The six steps of handling a page fault, for page 3 of a process with pages A–F. */
export function pageFaultFrames(): Frame<PfState>[] {
  const before: PfState = { stage: 0, valid: [true, false, true, false, false, true], frames: [null, "A", null, "C", null, "F", null, null] };
  const after = { valid: [true, false, true, true, false, true], frames: [null, "A", "D", "C", null, "F", null, null] };
  const msgs = [
    "The process references page 3 (page D), say with an instruction like load M.",
    "The MMU finds the valid-invalid bit is i. It can't finish the translation, so it traps to the OS: a page fault.",
    "The OS looks at the process's internal table. Is the reference invalid (outside the process)? Then abort. Here it's legal, the page is just not in memory yet.",
    "The OS finds a free frame: frame 2.",
    "It schedules a disk read to bring page D from the backing store into frame 2. The process waits; the CPU runs someone else.",
    "When the read finishes, the OS updates the page table: page 3 → frame 2, bit set to v.",
    "Finally the instruction that caused the fault is restarted. This time the translation succeeds, as if the page had always been there.",
  ];
  return msgs.map((message, stage) => ({
    state: stage < 5 ? { ...before, stage, frames: stage === 4 ? [...before.frames.slice(0, 2), "D…", ...before.frames.slice(3)] : before.frames } : { stage, ...after },
    line: stage,
    message,
    stats: { "page faults": stage >= 1 ? 1 : 0 },
  }));
}

/* ------------------------------ page replacement ------------------------------ */

export type Repl = "fifo" | "opt" | "lru" | "clock" | "lfu" | "mfu";
export type ReplStep = { page: number; frames: (number | null)[]; fault: boolean; victim: number | null; slot: number | null; refBits?: number[]; hand?: number };

/** The slides' reference string. */
export const REF_STRING = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
/** The string that shows Belady's anomaly under FIFO. */
export const BELADY_STRING = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

/** Run a page-replacement algorithm. Ties (LFU/MFU) go to the page that has been in memory longest. */
export function replace(refs: number[], nFrames: number, algo: Repl): ReplStep[] {
  const frames: (number | null)[] = Array(nFrames).fill(null);
  const loadedAt: number[] = Array(nFrames).fill(-1);
  const lastUse: number[] = Array(nFrames).fill(-1);
  const count = new Map<number, number>();
  const refBit: number[] = Array(nFrames).fill(0);
  let hand = 0;
  return refs.map((page, t) => {
    count.set(page, (count.get(page) ?? 0) + 1);
    const at = frames.indexOf(page);
    if (at >= 0) {
      lastUse[at] = t;
      refBit[at] = 1;
      return { page, frames: [...frames], fault: false, victim: null, slot: null, refBits: [...refBit], hand };
    }
    let slot = frames.indexOf(null);
    let victim: number | null = null;
    if (slot < 0) {
      const idx = frames.map((_, i) => i);
      if (algo === "fifo") slot = idx.reduce((a, b) => (loadedAt[b] < loadedAt[a] ? b : a));
      else if (algo === "lru") slot = idx.reduce((a, b) => (lastUse[b] < lastUse[a] ? b : a));
      else if (algo === "opt") {
        const nextUse = (p: number) => {
          const k = refs.indexOf(p, t + 1);
          return k < 0 ? Infinity : k;
        };
        slot = idx.reduce((a, b) => (nextUse(frames[b]!) > nextUse(frames[a]!) || (nextUse(frames[b]!) === nextUse(frames[a]!) && loadedAt[b] < loadedAt[a]) ? b : a));
      } else if (algo === "clock") {
        // second chance: skip (and clear) pages whose reference bit is 1
        while (refBit[hand] === 1) {
          refBit[hand] = 0;
          hand = (hand + 1) % nFrames;
        }
        slot = hand;
        hand = (hand + 1) % nFrames;
      } else {
        const c = (i: number) => count.get(frames[i]!) ?? 0;
        slot = idx.reduce((a, b) => {
          const better = algo === "lfu" ? c(b) < c(a) : c(b) > c(a);
          return better || (c(b) === c(a) && loadedAt[b] < loadedAt[a]) ? b : a;
        });
      }
      victim = frames[slot];
    } else if (algo === "clock") hand = (slot + 1) % nFrames;
    frames[slot] = page;
    loadedAt[slot] = t;
    lastUse[slot] = t;
    refBit[slot] = algo === "clock" ? 0 : 1;
    return { page, frames: [...frames], fault: true, victim, slot, refBits: [...refBit], hand };
  });
}

export const faults = (refs: number[], n: number, algo: Repl) => replace(refs, n, algo).filter((s) => s.fault).length;

/* ------------------------------ frame allocation ------------------------------ */

/** Proportional allocation: a_i = s_i / S × m. */
export function proportional(sizes: number[], m: number) {
  const S = sizes.reduce((a, b) => a + b, 0);
  return sizes.map((s) => (s / S) * m);
}

/* ------------------------------ working set ------------------------------ */

/** The textbook's reference string for the working-set example, and the two times it looks at. */
export const WS_REFS = [2, 6, 1, 5, 7, 7, 7, 7, 5, 1, 6, 2, 3, 4, 1, 2, 3, 4, 4, 4, 3, 4, 3, 4, 4, 4, 1, 3, 2, 3, 4, 4, 4, 3, 4, 4, 4];
export const WS_T1 = 9;
export const WS_T2 = 25;

/** The pages referenced in the window of Δ references ending at time t (inclusive). */
export function workingSet(refs: number[], t: number, delta: number) {
  return [...new Set(refs.slice(Math.max(0, t - delta + 1), t + 1))].sort((a, b) => a - b);
}

/** A toy model of CPU utilization as the degree of multiprogramming grows, with a fixed amount of memory. */
export function utilization(n: number, memFrames = 60, wss = 12) {
  if (n <= 0) return 0;
  const busy = 1 - 0.55 ** n; // more processes: more chance someone is ready
  const demand = n * wss;
  if (demand <= memFrames) return busy;
  return busy * (memFrames / demand) ** 4; // not enough frames for everyone's locality: thrashing
}
