/* Logic behind the Advanced Software Engineering visualizations. The React side
   lives in src/components/mdx/SoftwareEngineeringVisualizers.tsx. */

/* ----------------------- Lecture 1: float32 integral ----------------------- */

export type AccumulatorRow = { step: number; sum32: number; sum64: number; added32: number };

/** Add `delta` to `start` `steps` times, once in 32-bit floats (Math.fround) and once in 64-bit. */
export function accumulate(start: number, delta: number, steps: number): AccumulatorRow[] {
  const rows: AccumulatorRow[] = [];
  let s32 = Math.fround(start);
  let s64 = start;
  for (let i = 1; i <= steps; i++) {
    const before = s32;
    s32 = Math.fround(s32 + Math.fround(delta));
    s64 = s64 + delta;
    rows.push({ step: i, sum32: s32, sum64: s64, added32: s32 - before });
  }
  return rows;
}

/** The gap between a float32 value and the next one up: anything below half of it vanishes when added. */
export function float32Spacing(x: number): number {
  const f = Math.fround(x);
  const buf = new DataView(new ArrayBuffer(4));
  buf.setFloat32(0, f);
  buf.setUint32(0, buf.getUint32(0) + 1);
  return buf.getFloat32(0) - f;
}

/* ------------------- Lecture 2: the cost of each new feature ------------------- */

/** Relative cost of the n-th feature: flat for good design, growing for bad (an illustrative model, not data). */
export function featureCost(n: number, design: "good" | "bad"): number {
  return design === "good" ? 1 : Math.pow(1.04, n - 1);
}

/* ------------------------- Lecture 3: the "itself" test ------------------------- */

export type ItselfRow = { method: string; sentence: string; belongs: boolean; movedTo?: string; why: string };

export const FRONT_CAMERA_METHODS: ItselfRow[] = [
  { method: "captureFrame()", sentence: "The FrontCamera captures a frame itself.", belongs: true, why: "Capturing images is what a camera is for." },
  { method: "adjustExposure()", sentence: "The FrontCamera adjusts its exposure itself.", belongs: true, why: "Exposure is the camera's own hardware setting." },
  { method: "runSelfTest()", sentence: "The FrontCamera runs its self-test itself.", belongs: true, why: "Checking its own hardware for internal faults is the camera's job." },
  { method: "detectLanes()", sentence: "The FrontCamera detects lanes itself.", belongs: false, movedTo: "LaneDetector", why: "Lane detection is a perception algorithm, changed by the perception team. (A 'smart camera' that runs perception on its own chip would pass, so context matters.)" },
  { method: "reportFault(dtc)", sentence: "The FrontCamera stores and manages fault codes (DTCs) itself.", belongs: false, movedTo: "DiagnosticEventManager", why: "The camera may detect a fault, but storing and managing fault codes belongs to diagnostics." },
  { method: "renderOnHud(f)", sentence: "The FrontCamera renders on the HUD itself.", belongs: false, movedTo: "HudRenderer", why: "Drawing on the head-up display is HMI work, requested by the UX team." },
  { method: "cleanLens()", sentence: "The FrontCamera cleans its lens itself.", belongs: false, movedTo: "SensorCleaningSystem", why: "A camera can't wash itself: washer fluid and wipers are a separate actuator system." },
];

/* ------------------------ Lecture 5: pipe-and-filter ------------------------ */

export type FilterStage = { label: string; output: string[] };

/** Run `ls invoices | grep -e August | sort` over a list of file names, keeping every intermediate stream. */
export function runInvoicePipeline(files: string[]): FilterStage[] {
  const listed = [...files];
  const grepped = listed.filter((f) => /August/.test(f));
  const sorted = [...grepped].sort();
  return [
    { label: "ls invoices", output: listed },
    { label: "grep -e August", output: grepped },
    { label: "sort", output: sorted },
  ];
}

export const INVOICE_FILES = [
  "inv-104-August-2024.pdf",
  "inv-101-July-2024.pdf",
  "inv-117-August-2024.pdf",
  "inv-099-June-2024.pdf",
  "inv-102-August-2024.pdf",
  "inv-110-July-2024.pdf",
];

/* --------------------------- Lecture 5: messaging --------------------------- */

export type QueueEvent = { kind: "send"; msg: string } | { kind: "take" };
export type QueueFrame = { queue: string[]; note: string; clientBusy: boolean; serverHas?: string };

/** Step through a client writing to a queue and a server removing messages. The client never waits. */
export function queueFrames(events: QueueEvent[]): QueueFrame[] {
  const frames: QueueFrame[] = [{ queue: [], note: "The queue is empty. Client and server are running independently.", clientBusy: false }];
  const q: string[] = [];
  for (const e of events) {
    if (e.kind === "send") {
      q.push(e.msg);
      frames.push({ queue: [...q], note: `The client writes "${e.msg}" to the queue and carries on at once, without waiting.`, clientBusy: false });
    } else {
      const m = q.shift();
      frames.push(
        m === undefined
          ? { queue: [...q], note: "The server looks, but the queue is empty, so there is nothing to remove yet.", clientBusy: false }
          : { queue: [...q], note: `The server removes "${m}" from the front of the queue and processes it.`, clientBusy: false, serverHas: m },
      );
    }
  }
  return frames;
}

/* --------------------- Lecture 6: back-of-the-envelope --------------------- */

export type Estimate = { peakStreams: number; egressTbps: number; storagePB: number; eventsPerSecAvg: number; eventsPerSecPeak: number };

/** Lecture 6's Streamify estimates. Peak events assume about 3× the average, as the slide does (230 K → ~700 K). */
export function streamifyEstimate({ dau = 100e6, concurrency = 0.15, bitrateKbps = 160, tracks = 100e6, encodings = 4, mbPerFile = 5, eventsPerUser = 200 } = {}): Estimate {
  const peakStreams = dau * concurrency;
  const egressTbps = (peakStreams * bitrateKbps * 1e3) / 1e12;
  const storagePB = (tracks * encodings * mbPerFile * 1e6) / 1e15;
  const eventsPerSecAvg = (dau * eventsPerUser) / 86400;
  return { peakStreams, egressTbps, storagePB, eventsPerSecAvg, eventsPerSecPeak: eventsPerSecAvg * 3 };
}
