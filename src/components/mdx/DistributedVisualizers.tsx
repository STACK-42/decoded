import { Fragment, useId, useMemo, useState } from "react";
import { inputCls, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import {
  CLIENT_CODE,
  CLOCK_EVENTS,
  compareVectors,
  formatVector,
  lamportFrames,
  LAMPORT_CODE,
  partialFailureFrames,
  PROCS,
  SCENARIOS,
  vectorFrames,
  vectorStamps,
  VECTOR_CODE,
  type FailureScenario,
  type FailureState,
  type LamportState,
  type MsgState,
  type RetryMode,
  type VectorState,
  HISTORIES,
  isLinearizable,
  isSequential,
  partitionFrames,
  PARTITION_CODE,
  quorum,
  replicationFrames,
  REPLICATION_CODE,
  type PartitionMode,
  type PartitionState,
  type ReplicationMode,
  type ReplicationState,
} from "@/lib/distributed";

/* ============================================================
   Visualizers for the Distributed Systems course. Colours:
   sky = a message on its way, mint = delivered / done,
   orange = lost, crashed or a problem, neon = the step now.
   ============================================================ */

/* -------------------------------- partial failure -------------------------------- */

const MSG_STROKE: Record<MsgState, string> = { none: "", out: "stroke-sky", in: "stroke-mint", lost: "stroke-orange" };

function Arrow({ y, dir, state, label }: { y: number; dir: "right" | "left"; state: MsgState; label: string }) {
  if (state === "none") return null;
  const [from, to] = dir === "right" ? [96, 264] : [264, 96];
  const end = state === "in" ? to : (from + to) / 2;
  const cls = MSG_STROKE[state];
  const head = dir === "right" ? -1 : 1;
  return (
    <g className="animate-in fade-in">
      <line x1={from} y1={y} x2={end} y2={y} strokeWidth={2.5} strokeDasharray={state === "out" ? "6 4" : undefined} className={cls} />
      {state === "lost" ? (
        <g className="stroke-orange" strokeWidth={3}>
          <line x1={end - 7} y1={y - 7} x2={end + 7} y2={y + 7} />
          <line x1={end - 7} y1={y + 7} x2={end + 7} y2={y - 7} />
        </g>
      ) : (
        <path d={`M${end},${y} l${8 * head},-5 l0,10 z`} className={`${cls} ${cls.replace("stroke", "fill")}`} />
      )}
      <text x={dir === "right" ? 150 : 210} y={y - 9} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">{label}</text>
    </g>
  );
}

export function PartialFailureDemo() {
  const [scenario, setScenario] = useState<FailureScenario>("reply-lost");
  const [mode, setMode] = useState<RetryMode>("give-up");
  const frames = useMemo(() => partialFailureFrames(scenario, mode), [scenario, mode]);
  return (
    <Stepper
      title="One request, six ways it can go"
      frames={frames}
      code={CLIENT_CODE}
      codeLabel="The client"
      legend={[["bg-sky", "on its way"], ["bg-mint", "delivered"], ["bg-orange", "lost or crashed"]]}
      inputs={
        <div className="flex flex-col gap-2">
          <select aria-label="What happens" className={inputCls} value={scenario} onChange={(e) => setScenario(e.target.value as FailureScenario)}>
            {SCENARIOS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <Toggle<RetryMode> value={mode} onChange={setMode} options={[["give-up", "Give up"], ["retry", "Retry"], ["retry-with-key", "Retry + key"]]} />
        </div>
      }
      render={(s: FailureState) => {
        const server = s.server === "crashed" ? "fill-orange/20 stroke-orange" : s.server === "working" ? "fill-neon/20 stroke-neon" : "fill-card stroke-border";
        const client = s.client === "done" ? "fill-mint/20 stroke-mint" : s.client === "waiting" ? "fill-card stroke-border" : "fill-orange/20 stroke-orange";
        const clientText = { waiting: "waiting…", done: "got \"done\"", timeout: "timed out", "gave-up": "\"failed\"" }[s.client];
        const serverText = { up: "up", working: "working…", crashed: "crashed" }[s.server];
        return (
          <svg viewBox="0 0 360 150" className="w-full max-w-[480px] h-auto block mx-auto" role="img" aria-label="a client and a payment server exchanging a request and a reply">
            <rect x={6} y={30} width={90} height={84} rx={4} strokeWidth={2} className={client} />
            <text x={51} y={56} textAnchor="middle" className="fill-foreground font-mono text-[12px] font-bold">client</text>
            <text x={51} y={78} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">{clientText}</text>
            <text x={51} y={98} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">try {s.attempt}</text>
            <rect x={264} y={30} width={90} height={84} rx={4} strokeWidth={2} className={server} />
            <text x={309} y={56} textAnchor="middle" className="fill-foreground font-mono text-[12px] font-bold">server</text>
            <text x={309} y={78} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">{serverText}</text>
            <text x={309} y={98} textAnchor="middle" className={`font-mono text-[10px] ${s.charges > 1 ? "fill-orange font-bold" : "fill-muted-foreground"}`}>charged ×{s.charges}</text>
            <Arrow y={52} dir="right" state={s.request} label="charge $10" />
            <Arrow y={96} dir="left" state={s.reply} label="done" />
            <text x={180} y={140} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">the network</text>
          </svg>
        );
      }}
    />
  );
}

/* -------------------------------- space-time diagram -------------------------------- */

const LANE_Y = [36, 92, 148];
const evX = (i: number) => 64 + i * 48;
/** A background-coloured outline behind label text, so arrows passing under it don't hide it. */
const HALO = { paintOrder: "stroke", strokeWidth: 4, strokeLinejoin: "round" } as const;
const POS = Object.fromEntries(CLOCK_EVENTS.map((e, i) => [e.id, { x: evX(i), y: LANE_Y[e.proc] }]));

/** Processes as horizontal lines, events as dots, messages as arrows. `label` writes each stamp. */
function SpaceTime({ stamps, current, label, ariaLabel }: { stamps: Record<string, unknown>; current: string | null; label: (id: string) => string; ariaLabel: string }) {
  const marker = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 500 184" className="w-full max-w-[560px] h-auto block mx-auto" role="img" aria-label={ariaLabel}>
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX={10} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-sky" />
        </marker>
      </defs>
      {PROCS.map((p, i) => (
        <g key={p}>
          <text x={14} y={LANE_Y[i] + 4} className="fill-foreground font-mono text-[13px] font-bold">{p}</text>
          <line x1={32} y1={LANE_Y[i]} x2={490} y2={LANE_Y[i]} className="stroke-border" strokeWidth={1.5} />
        </g>
      ))}
      {CLOCK_EVENTS.filter((e) => e.kind === "recv").map((e) => {
        const a = POS[e.from!];
        const b = POS[e.id];
        const sent = e.from! in stamps;
        if (!sent) return null;
        const arrived = e.id in stamps;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const k = (len - 8) / len; // stop at the edge of the receiving dot
        return (
          <line key={e.id} x1={a.x} y1={a.y} x2={arrived ? a.x + (b.x - a.x) * k : (a.x + b.x) / 2} y2={arrived ? a.y + (b.y - a.y) * k : (a.y + b.y) / 2} strokeWidth={1.8} strokeDasharray={arrived ? undefined : "4 3"} className="stroke-sky" markerEnd={arrived ? `url(#${marker})` : undefined} />
        );
      })}
      {CLOCK_EVENTS.map((e) => {
        const { x, y } = POS[e.id];
        const done = e.id in stamps;
        const now = e.id === current;
        return (
          <g key={e.id} className={now ? "animate-in fade-in" : ""}>
            <circle cx={x} cy={y} r={now ? 7 : 5} strokeWidth={1.5} className={now ? "fill-neon stroke-foreground" : done ? "fill-foreground stroke-foreground" : "fill-card stroke-border"} />
            <text x={x} y={y - 11} textAnchor="middle" {...HALO} className={`font-mono text-[10px] stroke-card ${done ? "fill-muted-foreground" : "fill-border"}`}>{e.id}</text>
            {done && <text x={x} y={y + 20} textAnchor="middle" {...HALO} className={`font-mono text-[11px] font-bold stroke-card ${now ? "fill-foreground" : "fill-sky"}`}>{label(e.id)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function LamportClockDemo() {
  const frames = useMemo(() => lamportFrames(), []);
  return (
    <Stepper
      title="Lamport clocks: three processes, three messages"
      frames={frames}
      code={LAMPORT_CODE}
      codeLabel="The rules"
      legend={[["bg-neon", "this step"], ["bg-sky", "message"]]}
      render={(s: LamportState) => (
        <div className="space-y-2">
          <SpaceTime stamps={s.stamps} current={s.current} label={(id) => String(s.stamps[id])} ariaLabel="space-time diagram with Lamport timestamps" />
          <div className="flex justify-center gap-4 font-mono text-[11px] text-muted-foreground">
            {PROCS.map((p, i) => (
              <span key={p}>{p}: <span className="text-foreground font-bold">{s.clocks[i]}</span></span>
            ))}
          </div>
        </div>
      )}
    />
  );
}

export function VectorClockDemo() {
  const frames = useMemo(() => vectorFrames(), []);
  return (
    <Stepper
      title="Vector clocks on the same run"
      frames={frames}
      code={VECTOR_CODE}
      codeLabel="The rules"
      legend={[["bg-neon", "this step"], ["bg-sky", "message"]]}
      render={(s: VectorState) => (
        <div className="space-y-2">
          <SpaceTime stamps={s.stamps} current={s.current} label={(id) => s.stamps[id].join("")} ariaLabel="space-time diagram with vector timestamps" />
          <div className="flex flex-wrap justify-center gap-4 font-mono text-[11px] text-muted-foreground">
            {PROCS.map((p, i) => (
              <span key={p}>{p}: <span className="text-foreground font-bold">{formatVector(s.clocks[i])}</span></span>
            ))}
          </div>
          <p className="text-center font-mono text-[10px] text-muted-foreground">Under each dot, 223 is short for [2,2,3].</p>
        </div>
      )}
    />
  );
}

/* -------------------------------- compare two events -------------------------------- */

const ORDER_TEXT = {
  before: (a: string, b: string) => `${a} happened before ${b}: every entry of ${a}'s vector is ≤ ${b}'s, and at least one is smaller. Information from ${a} reached ${b}.`,
  after: (a: string, b: string) => `${b} happened before ${a}: every entry of ${b}'s vector is ≤ ${a}'s, and at least one is smaller.`,
  concurrent: (a: string, b: string) => `${a} and ${b} are concurrent: each vector is bigger somewhere. Neither could have known about the other.`,
  equal: (a: string) => `That's the same event, ${a}, twice.`,
};

export function VectorCompare() {
  const stamps = useMemo(() => vectorStamps(CLOCK_EVENTS), []);
  const ids = CLOCK_EVENTS.map((e) => e.id);
  const [a, setA] = useState("c1");
  const [b, setB] = useState("b3");
  const order = compareVectors(stamps[a], stamps[b]);
  const pick = (value: string, set: (v: string) => void, label: string) => (
    <select aria-label={label} className={inputCls} value={value} onChange={(e) => set(e.target.value)}>
      {ids.map((id) => (
        <option key={id} value={id}>{id}  {formatVector(stamps[id])}</option>
      ))}
    </select>
  );
  return (
    <Panel title="Compare any two events" legend={[["bg-mint", "ordered"], ["bg-orange", "concurrent"]]}>
      <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
        {pick(a, setA, "first event")}
        <span className="text-muted-foreground">vs</span>
        {pick(b, setB, "second event")}
      </div>
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,3rem))] gap-x-3 gap-y-1 font-mono text-sm w-fit">
        <span />
        {PROCS.map((p) => <span key={p} className="text-center text-muted-foreground text-[11px]">{p}</span>)}
        {[a, b].map((id, row) => (
          <Fragment key={row}>
            <span className="text-muted-foreground">{id}</span>
            {stamps[id].map((x, i) => {
              const other = stamps[row ? a : b][i];
              return (
                <span key={`${row}-${i}`} className={`text-center rounded-sm ${x > other ? "bg-sky/30 font-bold" : ""}`}>{x}</span>
              );
            })}
          </Fragment>
        ))}
      </div>
      <p className={`border-l-4 pl-3 text-sm ${order === "concurrent" ? "border-orange" : "border-mint"}`}>
        {order === "equal" ? ORDER_TEXT.equal(a) : ORDER_TEXT[order](a, b)}
      </p>
    </Panel>
  );
}

/* -------------------------------- replication -------------------------------- */

const NODE_X = [70, 200, 330];

export function ReplicationDemo() {
  const [mode, setMode] = useState<ReplicationMode>("async");
  const [crash, setCrash] = useState(false);
  const frames = useMemo(() => replicationFrames(mode, crash), [mode, crash]);
  return (
    <Stepper
      title="One write, three copies"
      frames={frames}
      code={REPLICATION_CODE}
      codeLabel="What happens"
      legend={[["bg-neon", "leader"], ["bg-sky", "copy on its way"], ["bg-mint", "has x = 2"], ["bg-orange", "crashed"]]}
      inputs={
        <div className="flex flex-col gap-2">
          <Toggle<ReplicationMode> value={mode} onChange={setMode} options={[["sync", "Synchronous"], ["async", "Asynchronous"]]} />
          <Toggle<string> value={crash ? "y" : "n"} onChange={(v) => setCrash(v === "y")} options={[["n", "No crash"], ["y", "Leader crashes"]]} />
        </div>
      }
      render={(s: ReplicationState) => (
        <svg viewBox="0 0 400 190" className="w-full max-w-[480px] h-auto block mx-auto" role="img" aria-label="a leader replicating a write to two followers">
          <rect x={150} y={4} width={100} height={30} rx={4} strokeWidth={1.5} className={s.acked ? "fill-mint/20 stroke-mint" : "fill-card stroke-border"} />
          <text x={200} y={17} textAnchor="middle" className="fill-foreground font-mono text-[11px] font-bold">client</text>
          <text x={200} y={29} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">{s.client || "idle"}</text>
          {s.replicas.map((r, i) => {
            const tone = r.down ? "fill-orange/20 stroke-orange" : r.value === 2 ? "fill-mint/20 stroke-mint" : "fill-card stroke-border";
            return (
              <g key={r.name}>
                <rect x={NODE_X[i] - 52} y={100} width={104} height={62} rx={4} strokeWidth={r.leader ? 3 : 1.5} className={`${tone} ${r.leader && !r.down ? "!stroke-neon" : ""}`} />
                <text x={NODE_X[i]} y={120} textAnchor="middle" className="fill-foreground font-mono text-[11px] font-bold">{r.leader ? "leader" : r.name}</text>
                <text x={NODE_X[i]} y={140} textAnchor="middle" className="fill-foreground font-mono text-[13px]">{r.down ? "crashed" : `x = ${r.value}`}</text>
                {r.leader && r.name !== "leader" && <text x={NODE_X[i]} y={155} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">(was {r.name})</text>}
              </g>
            );
          })}
          {s.inflight.map((i) => (
            <path key={i} d={`M${NODE_X[0]},98 Q${(NODE_X[0] + NODE_X[i]) / 2},${i === 1 ? 62 : 46} ${NODE_X[i]},98`} fill="none" strokeWidth={2.5} strokeDasharray="6 4" className="stroke-sky animate-in fade-in" />
          ))}
        </svg>
      )}
    />
  );
}

/* -------------------------------- quorums -------------------------------- */

export function QuorumExplorer() {
  const [n, setN] = useState(5);
  const [w, setW] = useState(3);
  const [r, setR] = useState(2);
  const W = Math.min(w, n);
  const R = Math.min(r, n);
  const q = quorum(n, W, R);
  const slider = (label: string, value: number, set: (v: number) => void, max: number, min = 1) => (
    <label className="flex items-center gap-3 font-mono text-xs">
      <span className="w-6 font-bold">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className="w-36 accent-current" aria-label={label} />
      <span className="w-4">{value}</span>
    </label>
  );
  return (
    <Panel title="Quorums: N, W and R" legend={[["bg-mint", "has the new write"], ["bg-sky", "asked by the read"]]}>
      <div className="flex flex-col gap-2">
        {slider("N", n, setN, 7, 3)}
        {slider("W", W, setW, n)}
        {slider("R", R, setR, n)}
      </div>
      <div className="flex flex-wrap gap-2">
        {q.written.map((has, i) => (
          <div key={i} className={`w-14 h-14 rounded-sm border-2 flex flex-col items-center justify-center font-mono text-[11px] ${has ? "bg-mint/25" : "bg-card"} ${q.read[i] ? "border-sky" : "border-border"}`}>
            <span className="text-muted-foreground">#{i + 1}</span>
            <span className="font-bold">{has ? "v2" : "v1"}</span>
          </div>
        ))}
      </div>
      <p className={`border-l-4 pl-3 text-sm ${q.fresh ? "border-mint" : "border-orange"}`}>
        The write reached {W} replicas and the read asks the {R} least lucky ones.{" "}
        {q.guaranteed
          ? `R + W = ${R + W} > N = ${n}, so at least ${q.overlap} of them must overlap: the read always sees v2. Writes survive ${n - W} replica${n - W === 1 ? "" : "s"} being down, reads survive ${n - R}.`
          : `R + W = ${R + W} ≤ N = ${n}, so the two groups can miss each other entirely, and here they do: the read only sees v1.`}
      </p>
    </Panel>
  );
}

/* -------------------------------- consistency models -------------------------------- */

export function ConsistencyHistories() {
  const [id, setId] = useState(HISTORIES[1].id);
  const h = HISTORIES.find((x) => x.id === id)!;
  const clients = [...new Set(h.ops.map((o) => o.client))];
  const end = Math.max(...h.ops.map((o) => o.end)) + 1;
  const X = (t: number) => 34 + (t / end) * 300;
  const lin = isLinearizable(h.ops);
  const seq = isSequential(h.ops);
  const badge = (ok: boolean, label: string) => (
    <span className={`font-mono text-[11px] px-2 py-1 rounded-sm border ${ok ? "border-mint bg-mint/20" : "border-orange bg-orange/20"}`}>{ok ? "✓" : "✗"} {label}</span>
  );
  return (
    <Panel title="Is this history allowed?" legend={[["bg-violet", "write"], ["bg-sky", "read"]]}>
      <select aria-label="history" className={inputCls} value={id} onChange={(e) => setId(e.target.value)}>
        {HISTORIES.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
      </select>
      <svg viewBox={`0 0 350 ${clients.length * 40 + 24}`} className="w-full max-w-[460px] h-auto" role="img" aria-label="operations on a timeline, one row per client">
        {clients.map((c, row) => (
          <g key={c}>
            <text x={8} y={row * 40 + 26} className="fill-foreground font-mono text-[12px] font-bold">{c}</text>
            <line x1={30} y1={row * 40 + 22} x2={340} y2={row * 40 + 22} className="stroke-border" strokeWidth={1} />
            {h.ops.filter((o) => o.client === c).map((o, k) => (
              <g key={k}>
                <rect x={X(o.start)} y={row * 40 + 10} width={X(o.end) - X(o.start)} height={24} rx={3} strokeWidth={1.5} className={o.kind === "w" ? "fill-violet/25 stroke-violet" : "fill-sky/25 stroke-sky"} />
                <text x={(X(o.start) + X(o.end)) / 2} y={row * 40 + 26} textAnchor="middle" className="fill-foreground font-mono text-[11px]">{o.kind === "w" ? `write ${o.value}` : `read → ${o.value}`}</text>
              </g>
            ))}
          </g>
        ))}
        <text x={340} y={clients.length * 40 + 18} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">time →</text>
      </svg>
      <div className="flex flex-wrap gap-2">
        {badge(lin, "linearizable")}
        {badge(seq, "sequentially consistent")}
      </div>
      <p className="text-sm">{h.note}</p>
    </Panel>
  );
}

/* -------------------------------- partitions -------------------------------- */

const P_POS: [number, number][] = [[70, 70], [190, 70], [330, 70]];

export function PartitionDemo() {
  const [mode, setMode] = useState<PartitionMode>("CP");
  const frames = useMemo(() => partitionFrames(mode), [mode]);
  return (
    <Stepper
      title="A network partition, CP or AP"
      frames={frames}
      code={PARTITION_CODE}
      codeLabel="What happens"
      legend={[["bg-mint", "has x = 2"], ["bg-orange", "conflict or error"]]}
      inputs={<Toggle<PartitionMode> value={mode} onChange={setMode} options={[["CP", "CP: consistent"], ["AP", "AP: available"]]} />}
      render={(s: PartitionState) => (
        <svg viewBox="0 0 400 180" className="w-full max-w-[480px] h-auto block mx-auto" role="img" aria-label="three replicas split by a network partition">
          <line x1={P_POS[0][0]} y1={70} x2={P_POS[1][0]} y2={70} className="stroke-border" strokeWidth={2} />
          <line x1={P_POS[1][0]} y1={70} x2={P_POS[2][0]} y2={70} strokeWidth={2} strokeDasharray={s.cut ? "4 6" : undefined} className={s.cut ? "stroke-orange" : "stroke-border"} />
          {s.cut && (
            <g className="stroke-orange animate-in fade-in" strokeWidth={3}>
              <line x1={252} y1={58} x2={268} y2={82} />
              <line x1={252} y1={82} x2={268} y2={58} />
            </g>
          )}
          {s.values.map((v, i) => {
            const [x, y] = P_POS[i];
            const tone = s.conflict && i === 2 ? "fill-orange/20 stroke-orange" : v === 2 ? "fill-mint/20 stroke-mint" : "fill-card stroke-border";
            return (
              <g key={i}>
                <rect x={x - 40} y={y - 26} width={80} height={52} rx={4} strokeWidth={1.5} className={tone} />
                <text x={x} y={y - 6} textAnchor="middle" className="fill-foreground font-mono text-[11px] font-bold">N{i + 1}</text>
                <text x={x} y={y + 13} textAnchor="middle" className="fill-foreground font-mono text-[13px]">x = {v}</text>
              </g>
            );
          })}
          {[0, 1].map((side) => {
            const x = side ? P_POS[2][0] : P_POS[0][0];
            const note = s.note[side];
            const bad = note.includes("error");
            return (
              <g key={side}>
                <line x1={x} y1={96} x2={x} y2={118} className="stroke-border" strokeWidth={1.5} />
                <text x={x} y={136} textAnchor="middle" className="fill-foreground font-mono text-[11px] font-bold">client {side + 1}</text>
                <text x={x} y={154} textAnchor="middle" className={`font-mono text-[10px] ${bad ? "fill-orange font-bold" : "fill-muted-foreground"}`}>{note}</text>
              </g>
            );
          })}
        </svg>
      )}
    />
  );
}
