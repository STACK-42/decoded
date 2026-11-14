import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { btn, btnPrimary, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import { TimingDiagram } from "@/components/mdx/LogicVisualizers";
import type { Bit } from "@/lib/logic";
import { shiftRegisterStep, simulateRippleStep, simulateSynchronousStep } from "@/lib/datapath";
import {
  CHIPS,
  chipOutputs,
  DEVICES,
  device,
  deviceStep,
  gateBehaves,
  gateOutput,
  gateSymbolName,
  gateTruth,
  GND_PIN,
  pinRole,
  VCC_PIN,
  type ChipGateKind,
  type DeviceId,
  type DeviceState,
  type GateBody,
  type GateParts,
} from "@/lib/symbolMaps";

/* ============================================================
   Symbol maps: the drawings from the lecture slides, drawn
   live. Colours follow the rest of the hardware courses:
     mint  = wire is HIGH (1)
     muted = wire is LOW (0)
     neon  = changing right now
     violet = the part you picked to read
   ============================================================ */

const wire = (on: boolean) => (on ? "stroke-mint" : "stroke-muted-foreground/45");
const ink = "stroke-foreground/70";
const label = "fill-foreground font-mono text-[12px] select-none";
const small = "fill-muted-foreground font-mono text-[10px] select-none";
const LEGEND: [string, string][] = [
  ["bg-mint", "1 (high)"],
  ["bg-muted-foreground/45", "0 (low)"],
  ["bg-neon", "changing now"],
];

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** setTimeout that is cleared when the component unmounts. */
function useTimers() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => ids.current.forEach((id) => window.clearTimeout(id)), []);
  return {
    after(ms: number, fn: () => void) {
      ids.current.push(window.setTimeout(fn, reducedMotion() ? 0 : ms));
    },
    clear() {
      ids.current.forEach((id) => window.clearTimeout(id));
      ids.current = [];
    },
  };
}

/** A clickable 0/1 driver drawn inside an SVG. */
function Driver({ x, y, v, name, onClick, w = 30 }: { x: number; y: number; v: Bit; name: string; onClick: () => void; w?: number }) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${name}, currently ${v}. Activate to flip.`}
      aria-pressed={!!v}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer focus:outline-none [&:focus-visible>rect]:stroke-foreground"
    >
      <rect x={x - w / 2} y={y - 13} width={w} height={26} rx={4} strokeWidth={2} className={v ? "fill-mint/25 stroke-mint" : "fill-background stroke-border"} />
      <text x={x} y={y + 5} textAnchor="middle" className="fill-foreground font-mono text-[14px] font-bold select-none">
        {v}
      </text>
    </g>
  );
}

/** A round output lamp. */
function Lamp({ x, y, v, r = 12 }: { x: number; y: number; v: Bit; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} strokeWidth={2} className={`transition-colors duration-200 ${v ? "fill-mint/30 stroke-mint" : "fill-background stroke-border"}`} />
      <text x={x} y={y + 4.5} textAnchor="middle" className="fill-foreground font-mono text-[13px] font-bold select-none">
        {v}
      </text>
    </g>
  );
}

const Dot = ({ x, y, on }: { x: number; y: number; on: boolean }) => <circle cx={x} cy={y} r={3.4} className={on ? "fill-mint" : "fill-muted-foreground/60"} />;

/* --------------------------------- Gate glyph --------------------------------- */

type Mark = "none" | "open-collector" | "schmitt";

/** Geometry of a gate body drawn at height h with its back at x = 0. */
function gateGeom(body: GateBody, n: number, h: number, inBubbles: boolean, outBubble: boolean) {
  const w = h * 1.2;
  const r = Math.max(3.2, h * 0.09);
  const ys = n === 1 ? [h / 2] : [h * 0.3, h * 0.7];
  const curve = h * 0.35;
  const backX = (y: number) => {
    if (body === "and" || body === "buffer") return 0;
    const t = y / h;
    const x = 2 * t * (1 - t) * curve;
    return body === "xor" ? x - h * 0.17 : x;
  };
  const tip = body === "buffer" ? w * 0.92 : w;
  const ins = ys.map((y) => ({ y, x: backX(y) - (inBubbles ? 2 * r : 0), bubbleX: backX(y) - r }));
  return { w, r, ys, curve, tip, ins, out: { x: tip + (outBubble ? 2 * r : 0), y: h / 2 } };
}

function GateGlyph({
  body,
  n = body === "buffer" ? 1 : 2,
  h = 40,
  inBubbles = false,
  outBubble = false,
  mark = "none",
  stroke = ink,
  hot,
}: {
  body: GateBody;
  n?: number;
  h?: number;
  inBubbles?: boolean;
  outBubble?: boolean;
  mark?: Mark;
  stroke?: string;
  /** part ids to paint violet: "body" | "back" | "in" | "out" | "mark" */
  hot?: string[];
}) {
  const g = gateGeom(body, n, h, inBubbles, outBubble);
  const sw = Math.max(1.8, h / 22);
  const s = (part: string) => (hot?.includes(part) ? "stroke-violet" : stroke);
  const m = h / 2;
  const path =
    body === "buffer"
      ? `M0,${m - h * 0.45} L${g.tip},${m} L0,${m + h * 0.45} Z`
      : body === "and"
        ? `M0,0 H${g.w / 2} A${g.w / 2},${m} 0 0 1 ${g.w / 2},${h} H0 Z`
        : `M0,0 Q${g.curve},${m} 0,${h} Q${g.w * 0.62},${h} ${g.w},${m} Q${g.w * 0.62},0 0,0 Z`;
  const cx = body === "buffer" ? g.tip * 0.36 : g.w * 0.42;
  return (
    <g>
      <path d={path} strokeWidth={sw} strokeLinejoin="round" className={`fill-card transition-colors ${s("body")}`} />
      {body === "xor" && <path d={`M${-h * 0.17},0 Q${g.curve - h * 0.17},${m} ${-h * 0.17},${h}`} fill="none" strokeWidth={sw} className={s("back")} />}
      {inBubbles && g.ins.map((p, i) => <circle key={i} cx={p.bubbleX} cy={p.y} r={g.r} strokeWidth={sw} className={`fill-card ${s("in")}`} />)}
      {outBubble && <circle cx={g.tip + g.r} cy={m} r={g.r} strokeWidth={sw} className={`fill-card ${s("out")}`} />}
      {mark === "open-collector" && (
        <g transform={`translate(${cx},${m})`} className={s("mark")} fill="none" strokeWidth={sw * 0.8}>
          <path d={`M0,${-h * 0.13} L${h * 0.11},0 L0,${h * 0.13} L${-h * 0.11},0 Z`} />
          <path d={`M${-h * 0.11},${h * 0.13} H${h * 0.11}`} />
        </g>
      )}
      {mark === "schmitt" && (
        <g transform={`translate(${cx},${m})`} className={s("mark")} fill="none" strokeWidth={sw * 0.8}>
          <path d={`M${-h * 0.16},${h * 0.09} H${h * 0.05} V${-h * 0.09} M${-h * 0.05},${h * 0.09} V${-h * 0.09} H${h * 0.16}`} />
        </g>
      )}
    </g>
  );
}

/* ================================ ComputerZoom ================================ */

type ZoomNode = { id: string; lines: string[]; x: number; y: number; r: number; role: string; does: string[]; open?: ZoomLevel };
type ZoomLevel = "computer" | "cpu" | "cu";

const ZOOM: Record<ZoomLevel, { title: string; tone: string; fill: string; nodes: ZoomNode[] }> = {
  computer: {
    title: "Computer",
    tone: "stroke-violet",
    fill: "fill-violet/10",
    nodes: [
      { id: "io", lines: ["Input /", "Output"], x: 128, y: 150, r: 62, role: "Moves data between the computer and the outside world: keyboard, screen, disks, network. Permanent storage (disks, SSDs) sits out here, behind I/O.", does: ["data movement"] },
      { id: "mem", lines: ["Main", "memory"], x: 272, y: 150, r: 62, role: "Holds the running program and its data while the computer is on. Von Neumann called it working storage; today we call it RAM.", does: ["data storage"] },
      { id: "bus", lines: ["System", "interconnection"], x: 200, y: 222, r: 50, role: "The system bus: the shared wires that carry addresses, data and control signals between CPU, memory and I/O. It touches every other part, which is why it sits in the middle.", does: ["data movement"] },
      { id: "cpu", lines: ["Central", "processing", "unit"], x: 200, y: 302, r: 62, role: "Controls the whole computer and processes the data. Open it to see what is inside.", does: ["data processing", "control"], open: "cpu" },
    ],
  },
  cpu: {
    title: "Central processing unit",
    tone: "stroke-sky",
    fill: "fill-sky/10",
    nodes: [
      { id: "reg", lines: ["Registers"], x: 128, y: 150, r: 62, role: "A handful of very fast storage cells inside the CPU, each one a row of flip-flops. Module 1 builds them from gates.", does: ["data storage"] },
      { id: "alu", lines: ["Arithmetic", "and logic", "unit"], x: 272, y: 150, r: 62, role: "The ALU does the arithmetic (add, subtract) and the logic (AND, OR, shifts) on values taken from the registers.", does: ["data processing"] },
      { id: "ibus", lines: ["Internal CPU", "interconnection"], x: 200, y: 222, r: 50, role: "The wires inside the CPU that carry values between registers, ALU and control unit, without touching the system bus.", does: ["data movement"] },
      { id: "cu", lines: ["Control", "unit"], x: 200, y: 302, r: 62, role: "Reads each instruction and sends the control signals that make everything else act at the right moment. Open it.", does: ["control"], open: "cu" },
    ],
  },
  cu: {
    title: "Control unit",
    tone: "stroke-orange",
    fill: "fill-orange/10",
    nodes: [
      { id: "seq", lines: ["Sequencing", "logic"], x: 135, y: 165, r: 62, role: "Steps through the operations of an instruction in the right order, one clock tick at a time. A counter (Module 1) keeps its place.", does: ["control"] },
      { id: "cureg", lines: ["Control unit", "registers and", "decoders"], x: 262, y: 212, r: 64, role: "Hold the instruction being run and decode its operation code, so exactly one line is active for the operation that was asked for.", does: ["control"] },
      { id: "cmem", lines: ["Control", "memory"], x: 172, y: 300, r: 58, role: "In a microprogrammed control unit, this memory stores the control signals for each step as words, read out one per clock.", does: ["control"] },
    ],
  },
};

/** The nested-circle drawing from the lecture: click a circle to zoom inside it. */
export function ComputerZoom() {
  const [level, setLevel] = useState<ZoomLevel>("computer");
  const [picked, setPicked] = useState<string | null>(null);
  const [zooming, setZooming] = useState<ZoomNode | null>(null);
  const timers = useTimers();
  const L = ZOOM[level];
  const path: ZoomLevel[] = level === "computer" ? ["computer"] : level === "cpu" ? ["computer", "cpu"] : ["computer", "cpu", "cu"];
  const node = L.nodes.find((n) => n.id === picked);

  const choose = (n: ZoomNode) => {
    if (zooming) return;
    if (n.open && picked === n.id) {
      setZooming(n);
      timers.after(650, () => {
        setLevel(n.open!);
        setPicked(null);
        setZooming(null);
      });
    } else setPicked(n.id);
  };

  const zoomStyle = zooming
    ? { transformOrigin: "0 0", transform: `translate(200px,200px) scale(${180 / zooming.r}) translate(${-zooming.x}px,${-zooming.y}px)`, transition: "transform 650ms cubic-bezier(.6,0,.3,1)" }
    : { transform: "none" };

  return (
    <Panel title="Zoom into the computer">
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {path.map((p, i) => (
          <span key={p} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            <button
              type="button"
              className={`${btn} ${p === level ? "border-violet text-violet" : ""}`}
              onClick={() => {
                setLevel(p);
                setPicked(null);
              }}
            >
              {ZOOM[p].title}
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
        <svg viewBox="0 0 400 400" className="w-full max-w-[400px] shrink-0" role="img" aria-label={`${L.title}: the parts inside`}>
          <g key={level} style={zoomStyle} className="animate-in fade-in duration-500 motion-reduce:animate-none">
            <circle cx={200} cy={200} r={180} strokeWidth={2.5} className={`fill-secondary/60 ${L.tone}`} />
            <text x={200} y={62} textAnchor="middle" className="fill-muted-foreground font-mono text-[12px] uppercase tracking-widest select-none">
              {level === "cpu" ? "CPU" : L.title}
            </text>
            {L.nodes.map((n) => {
              const on = picked === n.id;
              return (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.lines.join(" ")}${n.open ? ", can be opened" : ""}`}
                  onClick={() => choose(n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      choose(n);
                    }
                  }}
                  className="cursor-pointer focus:outline-none group"
                >
                  <circle cx={n.x} cy={n.y} r={n.r} strokeWidth={on ? 3 : 2} className={`transition-colors ${on ? `${L.fill} ${L.tone}` : "fill-card stroke-foreground/50 group-hover:stroke-foreground group-focus-visible:stroke-foreground"}`} />
                  {n.lines.map((t, i) => (
                    <text key={i} x={n.x} y={n.y + (i - (n.lines.length - 1) / 2) * 15 + 4} textAnchor="middle" className="fill-foreground font-sans text-[12.5px] font-semibold select-none">
                      {t}
                    </text>
                  ))}
                  {n.open && (
                    <g transform={`translate(${n.x + n.r * 0.62},${n.y - n.r * 0.62})`}>
                      <circle r={11} className={`${on ? "fill-violet" : "fill-background"} stroke-violet`} strokeWidth={1.5} />
                      <path d="M-4.5,0 H4.5 M0,-4.5 V4.5" strokeWidth={2} className={on ? "stroke-white" : "stroke-violet"} />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <div className="flex-1 min-w-0 flex flex-col gap-3 text-[15px] leading-relaxed">
          {node ? (
            <>
              <div className="font-display text-lg font-semibold">{node.lines.join(" ")}</div>
              <p>{node.role}</p>
              <div className="flex flex-wrap gap-1.5">
                {node.does.map((d) => (
                  <span key={d} className="font-mono text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    {d}
                  </span>
                ))}
              </div>
              {node.open && (
                <button type="button" className={`${btn} ${btnPrimary} self-start`} onClick={() => choose(node)} disabled={!!zooming}>
                  Zoom inside ⊕
                </button>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Click a circle to read what it does. Circles marked <span className="text-violet font-bold">⊕</span> open up: click one twice to zoom inside, the
              way the lecture drawings zoom from the whole computer down to the control unit.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ================================ SchematicMarks ================================ */

type MarkId = "junction" | "crossing" | "bus" | "in-bubble" | "out-bubble" | "rising" | "falling";
const MARKS: { id: MarkId; name: string; rule: string; drive: string }[] = [
  { id: "junction", name: "Dot: joined", rule: "A dot where wires meet means they are one wire. Whatever is on one is on all of them.", drive: "Drive the left wire" },
  { id: "crossing", name: "No dot: not joined", rule: "Wires that cross without a dot pass over each other. The vertical wire keeps its own value whatever happens on the horizontal one.", drive: "Drive the left wire" },
  { id: "bus", name: "Slash and number", rule: "A short slash with a number is a bundle of that many wires drawn as one line. /8 is eight wires, usually D0 to D7, carrying a byte side by side.", drive: "Send the next byte" },
  { id: "in-bubble", name: "Bubble on an input", rule: "A bubble on an input means the pin acts when it is 0 (active-low). The name usually carries a bar: CLR with a bar clears the register when pulled to 0 and does nothing at 1.", drive: "Drive CLR" },
  { id: "out-bubble", name: "Bubble on an output", rule: "A bubble on an output means the pin gives the opposite of what is inside. A flip-flop shows its stored bit on Q and the opposite on Q-bar, the pin with the bubble.", drive: "Change the stored bit" },
  { id: "rising", name: "Triangle at C", rule: "A small triangle on the clock pin means edge-triggered: the device acts only at the instant C goes from 0 to 1. Holding C at 1 does nothing more. No triangle means level-triggered: it acts the whole time C is 1.", drive: "Flip C" },
  { id: "falling", name: "Bubble + triangle at C", rule: "A bubble in front of the triangle flips the clock first, so the device acts on the falling edge, when C goes from 1 to 0. Ripple counters are built from these.", drive: "Flip C" },
];

function MarkIcon({ id }: { id: MarkId }) {
  const s = "stroke-foreground/80";
  switch (id) {
    case "junction":
      return (
        <>
          <path d="M6,20 H54 M30,4 V36" strokeWidth={2} className={s} />
          <circle cx={30} cy={20} r={3.5} className="fill-foreground/80" />
        </>
      );
    case "crossing":
      return <path d="M6,20 H54 M30,4 V36" strokeWidth={2} className={s} />;
    case "bus":
      return (
        <>
          <path d="M6,20 H54" strokeWidth={3.5} className={s} />
          <path d="M25,28 L35,12" strokeWidth={2} className={s} />
          <text x={38} y={13} className="fill-foreground font-mono text-[10px]">8</text>
        </>
      );
    case "in-bubble":
      return (
        <>
          <path d="M4,20 H20" strokeWidth={2} className={s} />
          <circle cx={24} cy={20} r={4} strokeWidth={2} className={`fill-card ${s}`} />
          <path d="M28,6 V34 H54" fill="none" strokeWidth={2} className={s} />
        </>
      );
    case "out-bubble":
      return (
        <>
          <path d="M6,6 H32 V34 H6" fill="none" strokeWidth={2} className={s} />
          <circle cx={36} cy={20} r={4} strokeWidth={2} className={`fill-card ${s}`} />
          <path d="M40,20 H56" strokeWidth={2} className={s} />
        </>
      );
    case "rising":
    case "falling":
      return (
        <>
          <path d={id === "falling" ? "M4,20 H18" : "M4,20 H26"} strokeWidth={2} className={s} />
          {id === "falling" && <circle cx={22} cy={20} r={4} strokeWidth={2} className={`fill-card ${s}`} />}
          <path d="M26,4 V36 H54" fill="none" strokeWidth={2} className={s} />
          <path d="M26,13 L36,20 L26,27" fill="none" strokeWidth={2} className={s} />
        </>
      );
  }
}

const BYTES = [0xa5, 0x3c, 0xff, 0x01];

/** The marks every schematic uses, each one drawn and driveable. */
export function SchematicMarks() {
  const [id, setId] = useState<MarkId>("junction");
  const [sig, setSig] = useState<Bit>(1);
  const [byteIx, setByteIx] = useState(0);
  const [clk, setClk] = useState<Bit[]>([0]);
  const clkRef = useRef<Bit[]>([0]);
  const [caught, setCaught] = useState(0);
  const [flash, setFlash] = useState(false);
  const timers = useTimers();
  const mark = MARKS.find((m) => m.id === id)!;

  const pick = (m: MarkId) => {
    setId(m);
    setSig(1);
    setClk([0]);
    clkRef.current = [0];
    setCaught(0);
  };

  const drive = () => {
    if (id === "bus") return setByteIx((i) => (i + 1) % BYTES.length);
    if (id === "rising" || id === "falling") {
      const last = clkRef.current[clkRef.current.length - 1];
      const next: Bit = last ? 0 : 1;
      const fires = id === "rising" ? next === 1 : next === 0;
      clkRef.current = [...clkRef.current.slice(-11), next];
      setClk(clkRef.current);
      if (fires) {
        setCaught((n) => n + 1);
        setFlash(true);
        timers.after(500, () => setFlash(false));
      }
      return;
    }
    setSig((v) => (v ? 0 : 1));
  };

  const byte = BYTES[byteIx];
  const c = clk[clk.length - 1];

  let stage: ReactNode = null;
  if (id === "junction" || id === "crossing") {
    const joined = id === "junction";
    const v: Bit = joined ? sig : 0;
    stage = (
      <>
        <path d="M70,80 H330" strokeWidth={3} className={`transition-colors ${wire(!!sig)}`} />
        <path d="M200,22 V138" strokeWidth={3} className={`transition-colors ${wire(!!v)}`} />
        {joined && <Dot x={200} y={80} on={!!sig} />}
        <Driver x={45} y={80} v={sig} name="Left wire" onClick={drive} />
        <Lamp x={350} y={80} v={sig} />
        <Lamp x={200} y={12} v={v} r={10} />
        <Lamp x={200} y={148} v={v} r={10} />
        <text x={215} y={30} className={small}>{joined ? "same wire" : "its own wire, held at 0"}</text>
      </>
    );
  } else if (id === "bus") {
    const bits = Array.from({ length: 8 }, (_, i) => ((byte >> (7 - i)) & 1) as Bit);
    stage = (
      <>
        {bits.map((b, i) => (
          <g key={i}>
            <text x={38} y={22 + i * 15} textAnchor="end" className={small}>D{7 - i}</text>
            <path d={`M44,${18 + i * 15} H110 L150,80`} fill="none" strokeWidth={2} className={`transition-colors ${wire(!!b)}`} />
          </g>
        ))}
        <path d="M150,80 H300" strokeWidth={6} className="stroke-foreground/70" />
        <path d="M215,94 L233,66" strokeWidth={2.4} className="stroke-foreground" />
        <text x={238} y={66} className={label}>8</text>
        <rect x={300} y={58} width={80} height={44} rx={4} strokeWidth={2} className="fill-card stroke-foreground/70" />
        <text x={340} y={77} textAnchor="middle" className={small}>register</text>
        <text x={340} y={93} textAnchor="middle" className={label}>{byte.toString(2).padStart(8, "0")}</text>
        <text x={150} y={140} className={small}>eight wires, or one line marked /8</text>
      </>
    );
  } else if (id === "in-bubble") {
    const cleared = sig === 0;
    stage = (
      <>
        <path d="M70,80 H178" strokeWidth={3} className={`transition-colors ${wire(!!sig)}`} />
        <circle cx={184} cy={80} r={6} strokeWidth={2.4} className="fill-card stroke-foreground/80" />
        <rect x={190} y={36} width={130} height={88} rx={4} strokeWidth={2} className={`transition-colors ${cleared ? "fill-orange/10 stroke-orange" : "fill-card stroke-foreground/70"}`} />
        <text x={198} y={84} className={label}>CLR</text>
        <path d="M198,70 H224" strokeWidth={1.4} className="stroke-foreground" />
        <text x={255} y={64} textAnchor="middle" className={small}>contents</text>
        <text x={268} y={92} textAnchor="middle" className="fill-foreground font-mono text-[18px] font-bold">{cleared ? "0000" : "1011"}</text>
        <Driver x={45} y={80} v={sig} name="CLR pin" onClick={drive} />
        <text x={190} y={145} className={small}>{cleared ? "CLR is 0: the bubble makes 0 the active level, so it clears" : "CLR is 1: inactive, the register keeps its value"}</text>
      </>
    );
  } else if (id === "out-bubble") {
    const qn: Bit = sig ? 0 : 1;
    stage = (
      <>
        <path d="M75,80 H120" strokeWidth={3} className={`transition-colors ${wire(!!sig)}`} />
        <rect x={120} y={30} width={120} height={100} rx={4} strokeWidth={2} className="fill-card stroke-foreground/70" />
        <text x={180} y={70} textAnchor="middle" className={small}>stored bit</text>
        <text x={180} y={98} textAnchor="middle" className="fill-foreground font-mono text-[24px] font-bold">{sig}</text>
        <path d="M240,55 H320" strokeWidth={3} className={`transition-colors ${wire(!!sig)}`} />
        <circle cx={246} cy={105} r={6} strokeWidth={2.4} className="fill-card stroke-foreground/80" />
        <path d="M252,105 H320" strokeWidth={3} className={`transition-colors ${wire(!!qn)}`} />
        <text x={226} y={59} textAnchor="end" className={label}>Q</text>
        <text x={226} y={109} textAnchor="end" className={label}>Q̄</text>
        <Lamp x={338} y={55} v={sig} />
        <Lamp x={338} y={105} v={qn} />
        <Driver x={60} y={80} v={sig} name="Stored bit" onClick={drive} />
      </>
    );
  } else {
    const falling = id === "falling";
    const cellW = 22;
    const wave = clk
      .map((b, i) => `${i ? "V" : "M190,"}${b ? 26 : 56}H${190 + (i + 1) * cellW}`)
      .join("");
    const edges = clk.map((b, i) => (i > 0 && b !== clk[i - 1] && (falling ? b === 0 : b === 1) ? 190 + i * cellW : -1)).filter((x) => x >= 0);
    stage = (
      <>
        <path d={falling ? "M70,110 H112" : "M70,110 H124"} strokeWidth={3} className={`transition-colors ${wire(!!c)}`} />
        {falling && <circle cx={118} cy={110} r={6} strokeWidth={2.4} className="fill-card stroke-foreground/80" />}
        <rect x={124} y={80} width={50} height={60} rx={4} strokeWidth={2} className={`transition-colors ${flash ? "fill-neon/20 stroke-neon" : "fill-card stroke-foreground/70"}`} />
        <path d="M124,101 L136,110 L124,119" fill="none" strokeWidth={2} className="stroke-foreground" />
        <text x={140} y={114} className={label}>C</text>
        <Driver x={45} y={110} v={c} name="Clock pin C" onClick={drive} />
        <path d={wave} fill="none" strokeWidth={2.2} className="stroke-foreground/80" />
        {edges.map((x) => (
          <g key={x}>
            <path d={`M${x},18 V64`} strokeWidth={2} className="stroke-neon" />
            <circle cx={x} cy={falling ? 56 : 26} r={4} className="fill-neon" />
          </g>
        ))}
        <text x={190} y={84} className={small}>C over time</text>
        <text x={190} y={120} className={label}>acted {caught} time{caught === 1 ? "" : "s"}</text>
        <text x={190} y={138} className={small}>{falling ? "only on 1 → 0" : "only on 0 → 1"}</text>
      </>
    );
  }

  return (
    <Panel title="Read the marks on a schematic" legend={LEGEND}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MARKS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => pick(m.id)}
            aria-pressed={id === m.id}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors ${id === m.id ? "border-violet bg-violet/[0.08]" : "border-border hover:border-violet/50"}`}
          >
            <svg viewBox="0 0 60 40" className="w-14 h-9" aria-hidden>
              <MarkIcon id={m.id} />
            </svg>
            <span className="font-mono text-[11px] text-center leading-tight">{m.name}</span>
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-secondary/30 p-4">
        <svg viewBox="0 0 400 160" className="w-full max-w-[520px] mx-auto block" role="img" aria-label={mark.name}>
          {stage}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`${btn} ${btnPrimary}`} onClick={drive}>
          {mark.drive}
        </button>
      </div>
      <p className="rounded-lg border-l-[3px] border-violet/50 bg-violet/[0.05] px-4 py-2.5 text-[15px] leading-relaxed">{mark.rule}</p>
    </Panel>
  );
}

/* ================================= GateAnatomy ================================= */

type Preset = { name: string; parts: GateParts; mark?: Mark };
const PRESETS: Preset[] = [
  { name: "Buffer", parts: { body: "buffer", inBubbles: false, outBubble: false } },
  { name: "Inverter", parts: { body: "buffer", inBubbles: false, outBubble: true } },
  { name: "AND", parts: { body: "and", inBubbles: false, outBubble: false } },
  { name: "NAND", parts: { body: "and", inBubbles: false, outBubble: true } },
  { name: "OR", parts: { body: "or", inBubbles: false, outBubble: false } },
  { name: "NOR", parts: { body: "or", inBubbles: false, outBubble: true } },
  { name: "XOR", parts: { body: "xor", inBubbles: false, outBubble: false } },
  { name: "XNOR", parts: { body: "xor", inBubbles: false, outBubble: true } },
  { name: "Negative-AND", parts: { body: "and", inBubbles: true, outBubble: false } },
  { name: "Negative-OR", parts: { body: "or", inBubbles: true, outBubble: false } },
  { name: "Open-collector output", parts: { body: "and", inBubbles: false, outBubble: false }, mark: "open-collector" },
  { name: "Schmitt-trigger input", parts: { body: "and", inBubbles: false, outBubble: true }, mark: "schmitt" },
];

const BODY_READ: Record<GateBody, string> = {
  buffer: "Triangle: a buffer. The signal passes through unchanged (only made stronger).",
  and: "Flat back, round front: AND. The output is 1 only when every input reaching the body is 1.",
  or: "Curved back, pointed front: OR. The output is 1 when at least one input reaching the body is 1.",
  xor: "Curved back with a second curved line: XOR. The output is 1 when the two inputs differ.",
};
const MARK_READ: Record<Mark, string> = {
  none: "",
  "open-collector": "The diamond with a bar marks an open-collector output: the gate can pull its wire down to 0 but cannot push it up to 1. A pull-up resistor supplies the 1, and several such outputs can share one wire.",
  schmitt: "The small loop marks Schmitt-trigger inputs: the gate switches to 1 at a higher voltage than it switches back to 0, so a slow or noisy input does not make the output chatter.",
};

/** Build any gate symbol from its parts and see what it does. */
export function GateAnatomy() {
  const [parts, setParts] = useState<GateParts>({ body: "and", inBubbles: true, outBubble: false });
  const [mark, setMark] = useState<Mark>("none");
  const [a, setA] = useState<Bit>(0);
  const [b, setB] = useState<Bit>(0);
  const [hot, setHot] = useState<string | null>(null);

  const H = 76;
  const one = parts.body === "buffer";
  const g = gateGeom(parts.body, one ? 1 : 2, H, parts.inBubbles, parts.outBubble);
  const gx = 150;
  const gy = 42;
  const out = gateOutput(parts, a, b);
  const truth = gateTruth(parts);
  const behaves = gateBehaves(parts);
  const name = mark === "none" ? gateSymbolName(parts) : PRESETS.find((p) => p.mark === mark)?.name ?? gateSymbolName(parts);
  const vals = one ? [a] : [a, b];
  const row = one ? a : a * 2 + b;

  const set = (p: Partial<GateParts>) => setParts((s) => ({ ...s, ...p }));
  const applyPreset = (p: Preset) => {
    setParts(p.parts);
    setMark(p.mark ?? "none");
  };

  const reading: { part: string; text: string }[] = [];
  if (parts.inBubbles) reading.push({ part: "in", text: `Bubble${one ? "" : "s"} on the input${one ? "" : "s"}: flip each input first. This gate is looking for 0s.` });
  reading.push({ part: "body", text: BODY_READ[parts.body] });
  if (parts.body === "xor") reading.push({ part: "back", text: "The extra line at the back is what turns OR into exclusive-OR." });
  if (parts.outBubble) reading.push({ part: "out", text: "Bubble on the output: flip the result on its way out." });
  if (mark !== "none") reading.push({ part: "mark", text: MARK_READ[mark] });

  return (
    <Panel title="Gate symbols, one part at a time" legend={LEGEND}>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const on = p.parts.body === parts.body && p.parts.inBubbles === parts.inBubbles && p.parts.outBubble === parts.outBubble && (p.mark ?? "none") === mark;
          return (
            <button key={p.name} type="button" className={`${btn} !px-2.5 !py-1 ${on ? "border-violet bg-violet/10 text-violet" : ""}`} onClick={() => applyPreset(p)}>
              {p.name}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs">
        <Toggle
          value={parts.body}
          options={[
            ["buffer", "triangle"],
            ["and", "flat back"],
            ["or", "curved back"],
            ["xor", "curved + line"],
          ]}
          onChange={(v) => set({ body: v })}
        />
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" className="accent-violet" checked={parts.inBubbles} onChange={(e) => set({ inBubbles: e.target.checked })} />
          input bubbles
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" className="accent-violet" checked={parts.outBubble} onChange={(e) => set({ outBubble: e.target.checked })} />
          output bubble
        </label>
        <Toggle
          value={mark}
          options={[
            ["none", "no mark"],
            ["open-collector", "◇ open collector"],
            ["schmitt", "⊓ Schmitt"],
          ]}
          onChange={(v) => setMark(v)}
        />
      </div>

      <div className="rounded-xl bg-secondary/30 p-4 flex flex-col lg:flex-row gap-5 items-center">
        <svg viewBox="0 0 400 160" className="w-full lg:flex-1 min-w-0 max-w-[480px]" role="img" aria-label={`${name}, inputs ${vals.join(" ")}, output ${out}`}>
          {g.ins.map((p, i) => {
            const v = vals[i];
            const inner: Bit = parts.inBubbles ? (v ? 0 : 1) : v;
            const y = gy + p.y;
            return (
              <g key={i}>
                <path d={`M72,${y} H${gx + p.x}`} strokeWidth={3} className={`transition-colors ${wire(!!v)}`} />
                <Driver x={52} y={y} v={v} name={`Input ${"AB"[i]}`} onClick={() => (i ? setB((x) => (x ? 0 : 1)) : setA((x) => (x ? 0 : 1)))} />
                <text x={22} y={y + 4} textAnchor="middle" className={label}>{"AB"[i]}</text>
                {parts.inBubbles && (
                  <text x={gx + p.x - 4} y={y - 12} textAnchor="end" className="fill-violet font-mono text-[11px] font-bold">
                    {v}→{inner}
                  </text>
                )}
              </g>
            );
          })}
          <g transform={`translate(${gx},${gy})`}>
            <GateGlyph body={parts.body} n={one ? 1 : 2} h={H} inBubbles={parts.inBubbles} outBubble={parts.outBubble} mark={mark} hot={hot ? [hot] : []} />
          </g>
          <path d={`M${gx + g.out.x},${gy + H / 2} H330`} strokeWidth={3} className={`transition-colors ${wire(!!out)}`} />
          <Lamp x={346} y={gy + H / 2} v={out} r={15} />
          <text x={372} y={gy + H / 2 + 4} className={label}>Y</text>
        </svg>
        <table className="font-mono text-sm border-collapse">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-3 py-1 font-normal">A</th>
              {!one && <th className="px-3 py-1 font-normal">B</th>}
              <th className="px-3 py-1 font-normal">Y</th>
            </tr>
          </thead>
          <tbody>
            {truth.map((y, i) => (
              <tr key={i} className={`transition-colors ${i === row ? "bg-violet/15" : ""}`}>
                <td className="px-3 py-0.5 text-center">{one ? i : i >> 1}</td>
                {!one && <td className="px-3 py-0.5 text-center">{i & 1}</td>}
                <td className={`px-3 py-0.5 text-center font-bold ${y ? "text-mint" : ""}`}>{y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 text-[15px] leading-relaxed">
        <div>
          <span className="font-display font-semibold text-lg">{name}</span>
          {behaves && name.toUpperCase() !== behaves && (
            <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded-full bg-mint/15 text-foreground">same truth table as {behaves}</span>
          )}
        </div>
        <ol className="flex flex-col gap-1.5 list-none p-0 m-0">
          {reading.map((r, i) => (
            <li
              key={r.part}
              onMouseEnter={() => setHot(r.part)}
              onMouseLeave={() => setHot(null)}
              className="flex gap-2.5 rounded-md px-2 py-1 hover:bg-violet/[0.07]"
            >
              <span className="font-mono text-xs text-violet pt-1">{i + 1}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ol>
        {parts.inBubbles && parts.body !== "buffer" && parts.body !== "xor" && (
          <p className="text-muted-foreground text-sm">
            Flipping every input and swapping AND for OR (or OR for AND) gives the same gate. That is De Morgan's theorem drawn as a picture, and it is why one
            chip can be drawn two ways.
          </p>
        )}
      </div>
    </Panel>
  );
}

/* =================================== IcChip =================================== */

const COL = 62;
const CHIP_L = 64;
const colX = (c: number) => CHIP_L + 34 + c * COL;
/** Bottom row: pins 1..7 left to right. Top row: pins 14..8 left to right. */
const pinCol = (p: number) => (p <= 7 ? p - 1 : 14 - p);
const KIND_PARTS: Record<ChipGateKind, GateParts> = {
  NAND: { body: "and", inBubbles: false, outBubble: true },
  AND: { body: "and", inBubbles: false, outBubble: false },
  OR: { body: "or", inBubbles: false, outBubble: false },
  NOR: { body: "or", inBubbles: false, outBubble: true },
  XOR: { body: "xor", inBubbles: false, outBubble: false },
  NOT: { body: "buffer", inBubbles: false, outBubble: true },
};

/** A 14-pin logic chip with its gates showing through the package. */
export function IcChip() {
  const [chipId, setChipId] = useState("7400");
  const [pins, setPins] = useState<Record<number, Bit>>({});
  const [hover, setHover] = useState<number | null>(null);
  const chip = CHIPS.find((c) => c.id === chipId)!;
  const outs = chipOutputs(chip, pins);
  const level = (p: number): Bit => (p === VCC_PIN ? 1 : p === GND_PIN ? 0 : (outs[p] ?? pins[p] ?? 0));
  const T = 78;
  const B = 238;
  const flipPin = (p: number) => setPins((s) => ({ ...s, [p]: s[p] ? 0 : 1 }));
  const info = hover ? pinRole(chip, hover) : null;

  return (
    <Panel title="Inside a 14-pin logic chip" legend={LEGEND}>
      <Toggle
        value={chipId}
        options={CHIPS.map((c) => [c.id, c.id] as [string, string])}
        onChange={(v) => {
          setChipId(v);
          setPins({});
        }}
      />
      <div className="rounded-xl bg-secondary/30 p-3 overflow-x-auto">
        <svg viewBox="0 0 560 316" className="w-full min-w-[480px] max-w-[640px] mx-auto block" role="img" aria-label={`${chip.id} ${chip.name}`}>
          <rect x={CHIP_L} y={T} width={7 * COL + 8} height={B - T} rx={6} className="fill-foreground/[0.06] stroke-foreground/60" strokeWidth={2} />
          <path d={`M${CHIP_L},${(T + B) / 2 - 16} A16,16 0 0 1 ${CHIP_L},${(T + B) / 2 + 16}`} className="fill-background stroke-foreground/60" strokeWidth={2} />
          <circle cx={CHIP_L + 14} cy={B - 14} r={4.5} className="fill-foreground/50" />
          <text x={CHIP_L + 3.5 * COL + 4} y={(T + B) / 2 + 6} textAnchor="middle" className="fill-foreground/25 font-mono text-[26px] font-bold select-none">
            {chip.id}
          </text>

          {chip.gates.map((g) => {
            const bottom = g.output <= 7;
            const edge = bottom ? B : T;
            const gy = bottom ? B - 52 : T + 52;
            const inCols = g.inputs.map(pinCol);
            const oc = pinCol(g.output);
            const dir = oc > Math.max(...inCols) ? 1 : -1;
            const near = dir > 0 ? Math.max(...inCols) : Math.min(...inCols);
            const parts = KIND_PARTS[g.kind];
            const n = g.inputs.length;
            const h = n === 1 ? 26 : 30;
            const geom = gateGeom(parts.body, n, h, false, parts.outBubble);
            const bodyX = colX(near) + dir * 10;
            const top = gy - h / 2;
            const v = chipOutputs(chip, pins)[g.output];
            // the input pin farther from the gate takes the gate input farther from the chip edge
            const order = [...g.inputs].sort((p, q) => dir * (pinCol(p) - pinCol(q)));
            const slotFor = (p: number) => {
              if (n === 1) return geom.ins[0];
              const far = bottom ? 0 : n - 1;
              return geom.ins[order.indexOf(p) === 0 ? far : n - 1 - far];
            };
            const outX = bodyX + dir * geom.out.x;
            return (
              <g key={g.label}>
                {g.inputs.map((p) => {
                  const slot = slotFor(p);
                  return <path key={p} d={`M${colX(pinCol(p))},${edge} V${top + slot.y} H${bodyX + dir * slot.x}`} fill="none" strokeWidth={2} className={`transition-colors ${wire(!!(pins[p] ?? 0))}`} />;
                })}
                <path d={`M${outX},${gy} H${colX(oc)} V${edge}`} fill="none" strokeWidth={2} className={`transition-colors ${wire(!!v)}`} />
                <g transform={`translate(${bodyX},${top}) scale(${dir},1)`}>
                  <GateGlyph body={parts.body} n={n} h={h} outBubble={parts.outBubble} stroke={v ? "stroke-mint" : ink} />
                </g>
              </g>
            );
          })}
          {/* power rails: VCC (pin 14) and GND (pin 7) feed every gate inside */}
          <path d={`M${colX(0)},${T} V${T + 12}`} strokeWidth={2.4} className="stroke-orange" />
          <path d={`M${colX(6)},${B} V${B - 12}`} strokeWidth={2.4} className="stroke-sky" />

          {Array.from({ length: 14 }, (_, k) => k + 1).map((p) => {
            const bottom = p <= 7;
            const x = colX(pinCol(p));
            const role = pinRole(chip, p);
            const v = level(p);
            const y0 = bottom ? B : T - 22;
            const cls =
              role.role === "vcc"
                ? "fill-orange/30 stroke-orange"
                : role.role === "gnd"
                  ? "fill-sky/30 stroke-sky"
                  : v
                    ? "fill-mint/40 stroke-mint"
                    : "fill-background stroke-foreground/60";
            const clickable = role.role === "in";
            return (
              <g
                key={p}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(p)}
                onBlur={() => setHover(null)}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={`Pin ${p}, ${role.name}${clickable ? `, currently ${v}. Activate to flip.` : `, ${v}`}`}
                onClick={clickable ? () => flipPin(p) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          flipPin(p);
                        }
                      }
                    : undefined
                }
                className={clickable ? "cursor-pointer focus:outline-none" : undefined}
              >
                <rect x={x - 11} y={y0} width={22} height={22} rx={2} strokeWidth={hover === p ? 2.6 : 1.6} className={`transition-colors ${cls}`} />
                {(role.role === "in" || role.role === "out") && (
                  <text x={x} y={y0 + 15.5} textAnchor="middle" className="fill-foreground font-mono text-[12px] font-bold select-none">
                    {v}
                  </text>
                )}
                <text x={x} y={bottom ? B + 38 : T - 30} textAnchor="middle" className={label}>
                  {p}
                </text>
                <text x={x} y={bottom ? B + 52 : T - 44} textAnchor="middle" className={small}>
                  {role.role === "vcc" ? "VCC" : role.role === "gnd" ? "GND" : role.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="rounded-lg border-l-[3px] border-violet/50 bg-violet/[0.05] px-4 py-2.5 text-[15px] leading-relaxed min-h-[3.2em]">
        {info ? (
          <>
            <b>Pin {hover}</b>:{" "}
            {info.role === "vcc"
              ? "the supply, +5 V. Every gate inside takes its power from here."
              : info.role === "gnd"
                ? "ground, 0 V. The other end of the supply."
                : info.role === "in"
                  ? `input ${info.name} of gate ${info.gate!.label}. Click to flip it.`
                  : `output ${info.name} of gate ${info.gate!.label}: ${info.gate!.kind} of pins ${info.gate!.inputs.join(" and ")}.`}
          </>
        ) : (
          <>
            The {chip.id} holds a <b>{chip.name}</b> gate set. Pin 1 is the one nearest the dot, at the notched end, and numbers run
            counterclockwise: 1 to 7 along the bottom, 8 to 14 back along the top. Click an input pin to flip it.
          </>
        )}
      </p>
    </Panel>
  );
}

/* ================================== FF boxes ================================== */

type BoxPin = { name: string; y: number; bubble?: boolean; clock?: "level" | "rising" | "falling"; over?: boolean };

/** A latch or flip-flop drawn as a box with labelled pins, as on the slides. */
function FFBox({
  x,
  y,
  w,
  h,
  left,
  right = [],
  title,
  stroke = ink,
  fill = "fill-card",
  hot,
  value,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  left: BoxPin[];
  right?: BoxPin[];
  title?: string;
  stroke?: string;
  fill?: string;
  hot?: string | null;
  value?: ReactNode;
}) {
  const H = (part: string) => (hot === part ? "stroke-violet" : stroke);
  const T = (part: string) => (hot === part ? "fill-violet" : "fill-foreground");
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} strokeWidth={hot === "box" ? 3 : 2} className={`transition-colors duration-200 ${fill} ${H("box")}`} />
      {title && (
        <text x={x + w / 2} y={y - 7} textAnchor="middle" className={small}>
          {title}
        </text>
      )}
      {left.map((p) => (
        <g key={p.name}>
          {p.bubble && <circle cx={x - 5} cy={p.y} r={5} strokeWidth={2} className={`fill-card ${H(p.clock ? "clock-bubble" : "in-bubble")}`} />}
          {p.clock && p.clock !== "level" && <path d={`M${x},${p.y - 6} L${x + 9},${p.y} L${x},${p.y + 6}`} fill="none" strokeWidth={2} className={H("triangle")} />}
          <text x={x + (p.clock && p.clock !== "level" ? 12 : 5)} y={p.y + 4} className={`${T(`pin:${p.name}`)} font-mono text-[12px] select-none`}>
            {p.name}
          </text>
          {p.over && <path d={`M${x + 5},${p.y - 9} H${x + 13}`} strokeWidth={1.3} className={H(`pin:${p.name}`)} />}
        </g>
      ))}
      {right.map((p) => (
        <g key={p.name}>
          {p.bubble && <circle cx={x + w + 5} cy={p.y} r={5} strokeWidth={2} className={`fill-card ${H("out-bubble")}`} />}
          <text x={x + w - 5} y={p.y + 4} textAnchor="end" className={`${T(`pin:${p.name}`)} font-mono text-[12px] select-none`}>
            {p.name}
          </text>
        </g>
      ))}
      {value}
    </g>
  );
}

/* ================================= FlipFlopMap ================================= */

type PartInfo = { id: string; name: string; text: string };

function partsOf(d: (typeof DEVICES)[number], edge: "rising" | "falling"): PartInfo[] {
  const parts: PartInfo[] = [{ id: "box", name: "the box", text: "The box hides the gates. What matters is the pins around it: inputs on the left, outputs on the right." }];
  const pinText: Record<string, string> = {
    S: d.activeLow ? "S with a bubble (written S'): pull it to 0 to set Q to 1." : "S, set: make it 1 to store a 1 (Q = 1).",
    R: d.activeLow ? "R with a bubble (written R'): pull it to 0 to reset Q to 0." : "R, reset: make it 1 to store a 0 (Q = 0).",
    D: d.clock === "edge" ? "D, data: whatever D is at the clock edge is what gets stored." : "D, data: while C is 1, Q copies D. When C drops to 0, the last value is kept.",
    J: "J works like set: J = 1, K = 0 stores a 1 at the clock edge.",
    K: "K works like reset: J = 0, K = 1 stores a 0. J = K = 1 makes Q toggle.",
    T: "T, toggle: T = 1 flips Q at every clock edge; T = 0 keeps it.",
  };
  for (const p of d.pins) parts.push({ id: `pin:${p}`, name: `pin ${p}`, text: pinText[p] });
  if (d.activeLow) parts.push({ id: "in-bubble", name: "input bubbles", text: "The bubbles say these pins act at 0. Rest them at 1; S' = R' = 0 together is the forbidden input here." });
  if (d.clock !== "none")
    parts.push({
      id: "pin:C",
      name: "pin C",
      text: d.clock === "level" ? "C with no triangle: level-triggered. The device listens to its inputs for the whole time C is 1, and ignores them while C is 0." : "C, the clock input. On this device it only matters at the edge marked by the triangle.",
    });
  if (d.clock === "edge") {
    parts.push({ id: "triangle", name: "the triangle", text: "The triangle means edge-triggered: the device acts at one instant per clock cycle, not for as long as C is high." });
    if (edge === "falling") parts.push({ id: "clock-bubble", name: "bubble before C", text: "A bubble in front of the triangle: it acts on the falling edge, 1 → 0." });
  }
  parts.push({ id: "pin:Q", name: "pin Q", text: "Q is the stored bit." });
  parts.push({ id: "out-bubble", name: "Q̄ and its bubble", text: "Q̄ (Q') is always the opposite of Q in normal use. The bubble on the pin marks the inverted output." });
  return parts;
}

/** The boxed latch and flip-flop symbols: read each mark, then drive the pins. */
export function FlipFlopMap({ start = "sr-nor" }: { start?: DeviceId }) {
  const [id, setId] = useState<DeviceId>(start);
  const [edge, setEdge] = useState<"rising" | "falling">("rising");
  const d = device(id);
  const restIns = (dev: typeof d) => Object.fromEntries(dev.pins.map((p) => [p, dev.activeLow ? 1 : 0])) as Record<string, Bit>;
  const [ins, setIns] = useState<Record<string, Bit>>(restIns(d));
  const [c, setC] = useState<Bit>(0);
  const [st, setSt] = useState<DeviceState>({ q: 0, qn: 1 });
  const [hist, setHist] = useState<Record<string, Bit>[]>([{ ...restIns(d), C: 0, Q: 0 }]);
  const [hot, setHot] = useState<string | null>(null);
  const [fired, setFired] = useState(false);
  const timers = useTimers();

  const reset = (next: DeviceId) => {
    const dev = device(next);
    setId(next);
    setIns(restIns(dev));
    setC(0);
    setSt({ q: 0, qn: 1 });
    setHist([{ ...restIns(dev), C: 0, Q: 0 }]);
    setHot(null);
  };

  const apply = (nIns: Record<string, Bit>, nC: Bit, s0 = st, i0 = ins, c0 = c) => {
    const s = deviceStep(id, { ins: i0, c: c0 }, { ins: nIns, c: nC }, s0, edge);
    if (s.q !== s0.q || s.qn !== s0.qn) {
      setFired(true);
      timers.after(450, () => setFired(false));
    }
    setIns(nIns);
    setC(nC);
    setSt(s);
    setHist((h) => [...h.slice(-13), { ...nIns, C: nC, Q: s.q }]);
    return s;
  };

  const pulse = () => {
    const up: Bit = c ? 0 : 1;
    const s1 = apply(ins, up);
    timers.after(380, () => apply(ins, (up ? 0 : 1) as Bit, s1, ins, up));
  };

  const X = 170;
  const Y = 34;
  const W = 116;
  const HH = 150;
  const order = d.clock === "none" ? d.pins : d.pins.length === 2 ? [d.pins[0], "C", d.pins[1]] : [d.pins[0], "C"];
  const pinY = (k: number) => Y + (HH * (k + 1)) / (order.length + 1);
  const left: BoxPin[] = order.map((p, k) => ({
    name: p,
    y: pinY(k),
    bubble: p === "C" ? d.clock === "edge" && edge === "falling" : !!d.activeLow?.includes(p),
    clock: p === "C" ? (d.clock === "edge" ? edge : "level") : undefined,
  }));
  const qy = Y + HH * 0.3;
  const qny = Y + HH * 0.7;
  const right: BoxPin[] = [
    { name: "Q", y: qy },
    { name: "Q̄", y: qny, bubble: true },
  ];
  const forbidden = st.q === st.qn;
  const parts = partsOf(d, edge);
  const hotPart = parts.find((p) => p.id === hot);

  let status: string;
  if (forbidden) status = `Q and Q̄ are both ${st.q}. That breaks the rule that they are opposites: this is the forbidden input.`;
  else if (d.clock === "level" && !c) status = `C is 0, so the inputs are locked out. Q holds ${st.q}.`;
  else if (d.clock === "edge") status = `Q = ${st.q}. Change the inputs as much as you like; nothing happens until the ${edge} edge of C.`;
  else status = `Q = ${st.q}, Q̄ = ${st.qn}.`;

  const signals = [...order.map((p) => ({ name: p === "C" ? "C" : d.activeLow ? `${p}'` : p, key: p })), { name: "Q", key: "Q" }].map((s) => ({
    name: s.name,
    bits: hist.map((h) => h[s.key] as Bit),
    tone: s.key === "Q" ? "stroke-mint" : s.key === "C" ? "stroke-sky" : "stroke-foreground/70",
  }));

  return (
    <Panel title="Latch and flip-flop symbols" legend={LEGEND}>
      <div className="flex flex-wrap gap-1.5">
        {DEVICES.map((x) => (
          <button key={x.id} type="button" className={`${btn} !px-2.5 !py-1 ${x.id === id ? "border-violet bg-violet/10 text-violet" : ""}`} onClick={() => reset(x.id)}>
            {x.name}
          </button>
        ))}
      </div>
      {d.clock === "edge" && (
        <Toggle
          value={edge}
          options={[
            ["rising", "acts on rising edge ▷"],
            ["falling", "acts on falling edge ○▷"],
          ]}
          onChange={(v) => {
            setEdge(v);
            reset(id);
          }}
        />
      )}
      <div className="rounded-xl bg-secondary/30 p-4 flex flex-col lg:flex-row gap-4 items-center">
        <svg viewBox="0 0 420 220" className="w-full lg:flex-1 min-w-0 max-w-[500px]" role="img" aria-label={`${d.name} symbol, Q = ${st.q}`}>
          {left.map((p) => {
            const v: Bit = p.name === "C" ? c : ins[p.name];
            return (
              <g key={p.name}>
                <path d={`M74,${p.y} H${X - (p.bubble ? 10 : 0)}`} strokeWidth={3} className={`transition-colors ${p.name === "C" ? (v ? "stroke-sky" : "stroke-muted-foreground/45") : wire(!!v)}`} />
                <Driver
                  x={54}
                  y={p.y}
                  v={v}
                  name={`Pin ${p.name}`}
                  onClick={() => (p.name === "C" ? apply(ins, c ? 0 : 1) : apply({ ...ins, [p.name]: ins[p.name] ? 0 : 1 }, c))}
                />
                <text x={22} y={p.y + 4} textAnchor="middle" className={label}>
                  {p.name === "C" ? "C" : d.activeLow ? `${p.name}'` : p.name}
                </text>
              </g>
            );
          })}
          <FFBox
            x={X}
            y={Y}
            w={W}
            h={HH}
            left={left}
            right={right}
            hot={hot}
            stroke={forbidden ? "stroke-orange" : ink}
            fill={fired ? "fill-neon/15" : "fill-card"}
            value={
              <text x={X + W / 2} y={Y + HH / 2 + 9} textAnchor="middle" className="fill-foreground/20 font-mono text-[30px] font-bold select-none">
                {st.q}
              </text>
            }
          />
          <path d={`M${X + W},${qy} H352`} strokeWidth={3} className={`transition-colors ${wire(!!st.q)}`} />
          <path d={`M${X + W + 10},${qny} H352`} strokeWidth={3} className={`transition-colors ${wire(!!st.qn)}`} />
          <Lamp x={368} y={qy} v={st.q} />
          <Lamp x={368} y={qny} v={st.qn} />
          <text x={392} y={qy + 4} className={label}>Q</text>
          <text x={392} y={qny + 4} className={label}>Q̄</text>
          <text x={X + W / 2} y={Y + HH + 22} textAnchor="middle" className={small}>
            {d.name}
          </text>
        </svg>
        <div className="flex flex-col gap-2 w-full lg:max-w-[260px]">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Read the symbol</span>
          <div className="flex flex-wrap gap-1.5">
            {parts.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setHot(p.id)}
                onFocus={() => setHot(p.id)}
                onClick={() => setHot(hot === p.id ? null : p.id)}
                className={`font-mono text-[11px] px-2 py-1 rounded-md border transition-colors ${hot === p.id ? "border-violet bg-violet/10 text-violet" : "border-border hover:border-violet/50"}`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="text-sm leading-relaxed min-h-[4.5em]">{hotPart ? hotPart.text : "Point at a part to read what that mark means. Click the 0/1 boxes on the left to drive the pins."}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {d.clock === "edge" && (
          <button type="button" className={`${btn} ${btnPrimary}`} onClick={pulse}>
            Pulse C (0 → 1 → 0)
          </button>
        )}
        <button type="button" className={btn} onClick={() => reset(id)}>
          Reset
        </button>
      </div>
      <p className={`rounded-lg border-l-[3px] px-4 py-2.5 text-[15px] leading-relaxed ${forbidden ? "border-orange bg-orange/[0.07]" : "border-violet/50 bg-violet/[0.05]"}`}>{status}</p>
      <div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">What you did, over time</span>
        <div style={{ maxWidth: 48 + signals[0].bits.length * 30 }}>
          <TimingDiagram signals={signals} cellW={30} />
        </div>
      </div>
    </Panel>
  );
}

/* ============================== RegisterSchematic ============================== */

/** The lecture's 4-bit register: four D flip-flops sharing Clock and Clear, with optional LOAD multiplexers. */
export function RegisterSchematic({ withLoad = false }: { withLoad?: boolean }) {
  const [I, setI] = useState<Bit[]>([1, 0, 1, 1]);
  const [A, setA] = useState<Bit[]>([0, 0, 0, 0]);
  const [clr, setClr] = useState<Bit>(1);
  const [load, setLoad] = useState<Bit>(1);
  const [showLoad, setShowLoad] = useState(withLoad);
  const [pulse, setPulse] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Set the inputs I0 to I3, then pulse the clock.");
  const timers = useTimers();

  const rowY = (i: number) => 34 + i * 86;
  const BX = 318;
  const CLK_X = 270;
  const CLR_X = 225;
  const LOAD_X = 112;
  const MUX_X = 150;

  const clock = () => {
    if (busy) return;
    setBusy(true);
    setPulse((p) => p + 1);
    timers.after(520, () => {
      if (!clr) setMsg("CLR is held at 0, so the register stays cleared. Clear wins over the clock.");
      else if (showLoad && !load) setMsg("LOAD = 0: each multiplexer fed the flip-flop its own output, so the clock edge stored the same value again. Nothing changed.");
      else {
        setA(I);
        setMsg(`Clock edge: all four flip-flops copied their D input at the same instant. The register now holds ${[...I].reverse().join("")} (A3..A0).`);
      }
      setBusy(false);
    });
  };

  const toggleClr = () => {
    const n: Bit = clr ? 0 : 1;
    setClr(n);
    if (!n) {
      setA([0, 0, 0, 0]);
      setMsg("CLR pulled to 0: the register cleared at once, without waiting for the clock. That is what asynchronous means.");
    } else setMsg("CLR back at 1: inactive again. The register keeps its zeros until the next clock edge.");
  };

  const H = 400;
  return (
    <Panel title="A 4-bit register, wire by wire" legend={LEGEND}>
      <label className="inline-flex items-center gap-2 font-mono text-xs cursor-pointer self-start">
        <input type="checkbox" className="accent-violet" checked={showLoad} onChange={(e) => setShowLoad(e.target.checked)} />
        add a LOAD control (2-to-1 multiplexer in front of each D)
      </label>
      <div className="rounded-xl bg-secondary/30 p-3 overflow-x-auto">
        <svg viewBox={`0 0 520 ${H}`} className="w-full min-w-[440px] max-w-[600px] mx-auto block" role="img" aria-label={`4-bit register holding ${[...A].reverse().join("")}`}>
          {/* shared verticals first, so the row wires draw over them */}
          <path d={`M${CLK_X},${H - 34} V${rowY(0) + 32}`} strokeWidth={2.4} className="stroke-sky/70" />
          <path d={`M${CLR_X},${H - 34} V${rowY(0) + 50}`} strokeWidth={2.4} className={`transition-colors ${wire(!!clr)}`} />
          {showLoad && <path d={`M${LOAD_X},${H - 34} V${rowY(0) + 48}`} strokeWidth={2.4} className={`transition-colors ${wire(!!load)}`} />}
          {pulse > 0 && !reducedMotion() && (
            <circle key={pulse} r={6} className="fill-neon">
              <animateMotion dur="0.5s" fill="freeze" path={`M${CLK_X},${H - 34} V${rowY(0) + 32}`} />
              <animate attributeName="opacity" values="1;1;0" dur="0.6s" fill="freeze" />
            </circle>
          )}
          {I.map((v, i) => {
            const y = rowY(i);
            const dY = y + 14;
            const out = A[i];
            const muxOut: Bit = showLoad && !load ? out : v;
            return (
              <g key={i}>
                {showLoad ? (
                  <>
                    <path d={`M88,${y + 10} H${MUX_X}`} strokeWidth={2.4} className={`transition-colors ${wire(!!v)}`} />
                    <path d={`M${BX + 100},${dY} V${y - 8} H128 V${y + 30} H${MUX_X}`} fill="none" strokeWidth={2.2} className={`transition-colors ${wire(!!out)}`} />
                    <Dot x={BX + 100} y={dY} on={!!out} />
                    <path d={`M${MUX_X},${y + 2} L${MUX_X + 30},${y + 10} V${y + 32} L${MUX_X},${y + 40} Z`} strokeWidth={2} className={`fill-card ${ink}`} />
                    <text x={MUX_X + 4} y={y + 14} className={small}>1</text>
                    <text x={MUX_X + 4} y={y + 34} className={small}>0</text>
                    <path d={`M${LOAD_X},${y + 48} H${MUX_X + 15} V${y + 36}`} fill="none" strokeWidth={2} className={`transition-colors ${wire(!!load)}`} />
                    {i > 0 && <Dot x={LOAD_X} y={y + 48} on={!!load} />}
                    <path d={`M${MUX_X + 30},${y + 21} H192 V${dY} H${BX}`} fill="none" strokeWidth={2.4} className={`transition-colors ${wire(!!muxOut)}`} />
                  </>
                ) : (
                  <path d={`M88,${dY} H${BX}`} strokeWidth={2.4} className={`transition-colors ${wire(!!v)}`} />
                )}
                <path d={`M${CLK_X},${y + 32} H${BX}`} strokeWidth={2.4} className="stroke-sky/70" />
                {i > 0 && <Dot x={CLK_X} y={y + 32} on />}
                <path d={`M${CLR_X},${y + 50} H${BX - 10}`} strokeWidth={2.4} className={`transition-colors ${wire(!!clr)}`} />
                {i > 0 && <Dot x={CLR_X} y={y + 50} on={!!clr} />}
                <FFBox
                  x={BX}
                  y={y}
                  w={74}
                  h={64}
                  left={[
                    { name: "D", y: dY },
                    { name: "C", y: y + 32, clock: "rising" },
                    { name: "R", y: y + 50, bubble: true },
                  ]}
                  right={[{ name: "Q", y: dY }]}
                  fill={busy ? "fill-sky/10" : "fill-card"}
                  value={
                    <text x={BX + 50} y={y + 50} textAnchor="middle" className="fill-foreground/30 font-mono text-[20px] font-bold select-none">
                      {out}
                    </text>
                  }
                />
                <path d={`M${BX + 74},${dY} H${BX + 128}`} strokeWidth={2.4} className={`transition-colors ${wire(!!out)}`} />
                <Lamp x={BX + 142} y={dY} v={out} />
                <text x={BX + 162} y={dY + 4} className={label}>A{i}</text>
                <Driver x={68} y={showLoad ? y + 10 : dY} v={v} name={`Input I${i}`} onClick={() => setI((s) => s.map((b, k) => (k === i ? ((b ? 0 : 1) as Bit) : b)))} />
                <text x={36} y={(showLoad ? y + 10 : dY) + 4} textAnchor="middle" className={label}>I{i}</text>
              </g>
            );
          })}
          <Driver x={CLR_X} y={H - 20} v={clr} name="Clear, active low" onClick={toggleClr} />
          <text x={CLR_X} y={H - 40} textAnchor="middle" className={small}>Clear</text>
          <text x={CLK_X} y={H - 14} textAnchor="middle" className="fill-sky font-mono text-[12px] select-none">Clock</text>
          {showLoad && (
            <>
              <Driver x={LOAD_X} y={H - 20} v={load} name="LOAD" onClick={() => setLoad((l) => (l ? 0 : 1))} />
              <text x={LOAD_X} y={H - 40} textAnchor="middle" className={small}>LOAD</text>
            </>
          )}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`${btn} ${btnPrimary}`} onClick={clock} disabled={busy}>
          Pulse the clock
        </button>
        <span className="font-mono text-sm">
          A3..A0 = <b>{[...A].reverse().join("")}</b>
        </span>
      </div>
      <p className="rounded-lg border-l-[3px] border-violet/50 bg-violet/[0.05] px-4 py-2.5 text-[15px] leading-relaxed">{msg}</p>
      <p className="text-sm text-muted-foreground">
        The I wires cross the Clock and Clear wires without a dot, so they are not connected. The dots on Clock and Clear are where one shared wire branches to every
        flip-flop.
      </p>
    </Panel>
  );
}

/* ================================== ShiftChain ================================== */

type Tok = { id: number; v: Bit };
const STREAMS: Record<string, string> = { short: "1011", lecture: "1011001110" };

/** Four D flip-flops in a chain; bits slide one stage per clock edge. */
export function ShiftChain() {
  const [streamKey, setStreamKey] = useState<"short" | "lecture">("lecture");
  const [mode, setMode] = useState<"siso" | "sipo">("siso");
  const next = useRef(100);
  const fresh = (bits: string) => bits.split("").map((b) => ({ id: next.current++, v: Number(b) as Bit }));
  const [slots, setSlots] = useState<Tok[]>(() => [0, 1, 2, 3].map((i) => ({ id: i, v: 0 as Bit })));
  const [queue, setQueue] = useState<Tok[]>(() => fresh(STREAMS.lecture));
  const [gone, setGone] = useState<Tok | null>(null);
  const [rows, setRows] = useState<{ si: Bit | null; q: Bit[]; so: Bit | null }[]>([{ si: null, q: [0, 0, 0, 0], so: null }]);
  const [pulse, setPulse] = useState(0);
  const [busy, setBusy] = useState(false);
  const timers = useTimers();

  const restart = (key: "short" | "lecture") => {
    setStreamKey(key);
    setSlots([0, 1, 2, 3].map((i) => ({ id: next.current++, v: 0 as Bit })));
    setQueue(fresh(STREAMS[key]));
    setGone(null);
    setRows([{ si: null, q: [0, 0, 0, 0], so: null }]);
  };

  const clock = () => {
    if (busy) return;
    const head: Tok = queue[0] ?? { id: next.current++, v: 0 };
    setBusy(true);
    setPulse((p) => p + 1);
    timers.after(320, () => {
      const res = shiftRegisterStep(
        slots.map((s) => s.v),
        head.v,
        "right",
      );
      setGone(slots[3]);
      setSlots([head, ...slots.slice(0, 3)]);
      setQueue((q) => q.slice(1));
      setRows((r) => [...r, { si: head.v, q: res.bits as Bit[], so: res.serialOut as Bit }]);
      timers.after(480, () => setBusy(false));
    });
  };

  const BX = (i: number) => 190 + i * 118;
  const BW = 66;
  const CLK_Y = 196;
  const slotPos = (i: number) => [BX(i) + 40, 110];
  const queuePos = (k: number) => [150 - k * 26, 80];
  const all: { t: Tok; x: number; y: number; o: number; r: number }[] = [
    ...queue.slice(0, 5).map((t, k) => ({ t, x: queuePos(k)[0], y: queuePos(k)[1], o: 1, r: 10 })),
    ...queue.slice(5).map((t) => ({ t, x: queuePos(5)[0], y: queuePos(5)[1], o: 0, r: 10 })),
    ...slots.map((t, i) => ({ t, x: slotPos(i)[0], y: slotPos(i)[1], o: 1, r: 13 })),
    ...(gone ? [{ t: gone, x: 668, y: 80, o: 0, r: 10 }] : []),
  ];
  const last = rows[rows.length - 1];

  return (
    <Panel title="A shift register, one clock edge at a time" legend={LEGEND}>
      <div className="flex flex-wrap items-center gap-3">
        <Toggle
          value={streamKey}
          options={[
            ["short", "stream 1011"],
            ["lecture", "stream 1011001110"],
          ]}
          onChange={(v) => restart(v)}
        />
        <Toggle
          value={mode}
          options={[
            ["siso", "serial out"],
            ["sipo", "parallel out"],
          ]}
          onChange={(v) => setMode(v as "siso" | "sipo")}
        />
      </div>
      <div className="rounded-xl bg-secondary/30 p-3 overflow-x-auto">
        <svg viewBox="0 0 680 230" className="w-full min-w-[560px] block" role="img" aria-label={`Shift register holding ${slots.map((s) => s.v).join("")}`}>
          <path d={`M162,80 H${BX(0)}`} strokeWidth={2.6} className={`transition-colors ${wire(!!queue[0]?.v)}`} />
          <text x={168} y={70} className={small}>SI</text>
          {slots.map((s, i) => {
            const outEnd = i < 3 ? BX(i + 1) : 652;
            const tapX = BX(i) + BW + 22;
            return (
              <g key={i}>
                <path d={`M${BX(i) + BW},80 H${outEnd}`} strokeWidth={2.6} className={`transition-colors ${wire(!!s.v)}`} />
                {mode === "sipo" && (
                  <>
                    <path d={`M${tapX},80 V34`} strokeWidth={2.4} className={`transition-colors ${wire(!!s.v)}`} />
                    <Dot x={tapX} y={80} on={!!s.v} />
                    <Lamp x={tapX} y={20} v={s.v} r={11} />
                  </>
                )}
                <path d={`M${BX(i) - 22},${CLK_Y} V128 H${BX(i)}`} fill="none" strokeWidth={2.4} className="stroke-sky/70" />
                <Dot x={BX(i) - 22} y={CLK_Y} on />
                <FFBox
                  x={BX(i)}
                  y={58}
                  w={BW}
                  h={86}
                  title={`Q${3 - i}`}
                  left={[
                    { name: "D", y: 80 },
                    { name: "C", y: 128, clock: "rising" },
                  ]}
                  right={[{ name: "Q", y: 80 }]}
                  fill={busy ? "fill-sky/10" : "fill-card"}
                />
              </g>
            );
          })}
          <path d={`M40,${CLK_Y} H${BX(3) - 22}`} strokeWidth={2.4} className="stroke-sky/70" />
          <text x={36} y={CLK_Y + 4} textAnchor="end" className="fill-sky font-mono text-[12px]">CLK</text>
          {pulse > 0 && !reducedMotion() && (
            <circle key={pulse} r={6} className="fill-neon">
              <animateMotion dur="0.32s" fill="freeze" path={`M40,${CLK_Y} H${BX(3) - 22}`} />
              <animate attributeName="opacity" values="1;1;0" dur="0.42s" fill="freeze" />
            </circle>
          )}
          <text x={656} y={70} className={small}>SO</text>
          <Lamp x={656} y={100} v={last.so ?? 0} r={11} />
          {queue.length > 5 && (
            <text x={queuePos(5)[0] + 12} y={110} className={small}>
              +{queue.length - 5} more
            </text>
          )}
          {all.map(({ t, x, y, o, r }) => (
            <g key={t.id} style={{ transform: `translate(${x}px, ${y}px)`, opacity: o, transition: "transform 460ms cubic-bezier(.5,0,.3,1), opacity 460ms" }}>
              <circle r={r} strokeWidth={2} className={t.v ? "fill-mint/30 stroke-mint" : "fill-background stroke-foreground/50"} />
              <text y={r > 11 ? 5.5 : 4.5} textAnchor="middle" className={`fill-foreground font-mono ${r > 11 ? "text-[15px]" : "text-[12px]"} font-bold select-none`}>
                {t.v}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`${btn} ${btnPrimary}`} onClick={clock} disabled={busy}>
          Clock edge
        </button>
        <button type="button" className={btn} onClick={() => restart(streamKey)}>
          Start over
        </button>
        <span className="font-mono text-xs text-muted-foreground">{queue.length ? `${queue.length} bit${queue.length > 1 ? "s" : ""} waiting` : "stream used up: 0s shift in now"}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="font-mono text-xs border-collapse">
          <tbody>
            {[
              ["SI", rows.map((r) => r.si)],
              ["Q3", rows.map((r) => r.q[0])],
              ["Q2", rows.map((r) => r.q[1])],
              ["Q1", rows.map((r) => r.q[2])],
              ["Q0", rows.map((r) => r.q[3])],
              ["SO", rows.map((r) => r.so)],
            ].map(([name, vals]) => (
              <tr key={name as string}>
                <th className={`pr-3 py-0.5 text-right font-normal ${name === "SI" || name === "SO" ? "text-violet" : "text-muted-foreground"}`}>{name as string}</th>
                {(vals as (Bit | null)[]).map((v, k) => (
                  <td key={k} className={`w-6 text-center py-0.5 ${k === rows.length - 1 ? "bg-violet/10 font-bold" : ""}`}>
                    {v === null ? "·" : v}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="pr-3 pt-1 text-right font-normal text-muted-foreground">clock</th>
              {rows.map((_, k) => (
                <td key={k} className="w-6 text-center pt-1 text-muted-foreground">
                  {k === 0 ? "" : "↑"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="rounded-lg border-l-[3px] border-violet/50 bg-violet/[0.05] px-4 py-2.5 text-[15px] leading-relaxed">
        {mode === "siso"
          ? "Serial out: only SO leaves the chip. Read the SO row against the SI row: it is the same stream, four clocks later. An n-stage register delays its input by n clock periods."
          : "Parallel out: every Q is wired out (the dots are where each Q branches to its own pin). After four clocks the first four bits sit side by side, ready to read in one go. That is how a serial receiver turns a stream into a byte."}
      </p>
    </Panel>
  );
}

/* =============================== CounterSchematic =============================== */

const bin = (v: number, n: number) => v.toString(2).padStart(n, "0");

function StateRing({ value, n = 8 }: { value: number; n?: number }) {
  const R = 74;
  const pos = (k: number) => {
    const a = (k / n) * 2 * Math.PI - Math.PI / 2;
    return [110 + R * Math.cos(a), 110 + R * Math.sin(a)];
  };
  return (
    <svg viewBox="0 0 220 220" className="w-[200px] shrink-0" role="img" aria-label={`State diagram, now in state ${bin(value, 3)}`}>
      {Array.from({ length: n }, (_, k) => {
        const [x1, y1] = pos(k);
        const [x2, y2] = pos((k + 1) % n);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        return (
          <g key={k}>
            <path d={`M${x1},${y1} L${x2},${y2}`} strokeWidth={1.6} className={k === value ? "stroke-neon" : "stroke-sky/50"} />
            <path d="M-4,-4 L3,0 L-4,4" fill="none" strokeWidth={1.6} transform={`translate(${mx},${my}) rotate(${ang})`} className={k === value ? "stroke-neon" : "stroke-sky/60"} />
          </g>
        );
      })}
      {Array.from({ length: n }, (_, k) => {
        const [x, y] = pos(k);
        const on = k === value;
        return (
          <g key={k}>
            <circle cx={x} cy={y} r={17} strokeWidth={2} className={`transition-colors duration-300 ${on ? "fill-mint/30 stroke-mint" : "fill-card stroke-foreground/40"}`} />
            <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground font-mono text-[11px] font-bold select-none">
              {bin(k, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Ripple counter vs synchronous counter, drawn as on the slides and run step by step. */
export function CounterSchematic({ start = "ripple" }: { start?: "ripple" | "sync" }) {
  const [mode, setMode] = useState<"ripple" | "sync">(start);
  const [val, setVal] = useState(0);
  const [shown, setShown] = useState(0);
  const [active, setActive] = useState<number[]>([]);
  const [trail, setTrail] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [hist, setHist] = useState<number[]>([0]);
  const timers = useTimers();
  const bits = mode === "ripple" ? 4 : 3;

  const switchMode = (m: "ripple" | "sync") => {
    timers.clear();
    setMode(m);
    setVal(0);
    setShown(0);
    setActive([]);
    setTrail([]);
    setBusy(false);
    setHist([0]);
  };
  const jump = (v: number) => {
    if (busy) return;
    setVal(v);
    setShown(v);
    setTrail([]);
    setHist([v]);
  };

  const step = () => {
    if (busy) return;
    setBusy(true);
    setPulse((p) => p + 1);
    if (mode === "ripple") {
      const r = simulateRippleStep(val, 4, 10);
      setTrail([val]);
      r.glitchStates.forEach((g, k) => {
        timers.after(300 + k * 520, () => {
          setShown(g);
          setActive([k]);
          setTrail((t) => [...t, g]);
        });
      });
      timers.after(300 + r.glitchStates.length * 520, () => {
        setVal(r.to);
        setActive([]);
        setBusy(false);
        setHist((h) => [...h.slice(-15), r.to]);
      });
    } else {
      const s = simulateSynchronousStep(val, 3);
      timers.after(380, () => {
        setShown(s.to);
        setActive(s.tInputs.map((t, i) => (t ? i : -1)).filter((i) => i >= 0));
        setTrail([val, s.to]);
      });
      timers.after(900, () => {
        setVal(s.to);
        setActive([]);
        setBusy(false);
        setHist((h) => [...h.slice(-15), s.to]);
      });
    }
  };

  const q = (i: number) => ((shown >> i) & 1) as Bit;
  const settling = busy && mode === "ripple" && trail.length > 1 && shown !== simulateRippleStep(trail[0], 4).to;

  let drawing: ReactNode;
  if (mode === "ripple") {
    const BX = (i: number) => 112 + i * 138;
    drawing = (
      <svg viewBox="0 0 680 200" className="w-full min-w-[560px] block" role="img" aria-label={`Ripple counter showing ${bin(shown, 4)}`}>
        <path d={`M40,140 H${BX(0) - 10}`} strokeWidth={2.4} className="stroke-sky/70" />
        <text x={40} y={128} className="fill-sky font-mono text-[11px]">count pulses</text>
        {pulse > 0 && !reducedMotion() && (
          <circle key={pulse} r={6} className="fill-neon">
            <animateMotion dur="0.3s" fill="freeze" path={`M40,140 H${BX(0) - 10}`} />
            <animate attributeName="opacity" values="1;1;0" dur="0.4s" fill="freeze" />
          </circle>
        )}
        {[0, 1, 2, 3].map((i) => {
          const x = BX(i);
          const v = q(i);
          const hot = active.includes(i);
          return (
            <g key={i}>
              <path d={`M${x - 14},100 H${x}`} strokeWidth={2.2} className="stroke-mint" />
              <text x={x - 17} y={104} textAnchor="end" className={label}>1</text>
              <FFBox
                x={x}
                y={76}
                w={80}
                h={84}
                title={`Q${i}`}
                left={[
                  { name: "T", y: 100 },
                  { name: "C", y: 140, clock: "falling", bubble: true },
                ]}
                right={[{ name: "Q", y: 100 }]}
                stroke={hot ? "stroke-neon" : ink}
                fill={hot ? "fill-neon/15" : "fill-card"}
                value={
                  <text x={x + 52} y={146} textAnchor="middle" className="fill-foreground font-mono text-[22px] font-bold select-none">
                    {v}
                  </text>
                }
              />
              {i < 3 && (
                <path
                  d={`M${x + 80},100 H${x + 104} V140 H${BX(i + 1) - 10}`}
                  fill="none"
                  strokeWidth={2.4}
                  className={`transition-colors ${active.includes(i + 1) ? "stroke-neon" : wire(!!v)}`}
                />
              )}
              {i === 3 && <path d={`M${x + 80},100 H${x + 104}`} strokeWidth={2.4} className={wire(!!v)} />}
            </g>
          );
        })}
        <text x={112} y={190} className={small}>Each Q clocks the next stage, which flips when that wire falls 1 → 0.</text>
      </svg>
    );
  } else {
    const BX = [96, 264, 494];
    const t = [1, q(0), q(0) & q(1)] as Bit[];
    drawing = (
      <svg viewBox="0 0 640 230" className="w-full min-w-[520px] block" role="img" aria-label={`Synchronous counter showing ${bin(shown, 3)}`}>
        <path d={`M${BX[0] - 26},100 H${BX[0]}`} strokeWidth={2.2} className="stroke-mint" />
        <text x={BX[0] - 32} y={104} textAnchor="end" className={label}>1</text>
        {/* A0 → T1, and A0 up and over to the AND gate */}
        <path d={`M${BX[0] + 80},100 H${BX[1]}`} strokeWidth={2.4} className={`transition-colors ${wire(!!q(0))}`} />
        <path d={`M${BX[0] + 104},100 V52 H404 V93.6 H420`} fill="none" strokeWidth={2.4} className={`transition-colors ${wire(!!q(0))}`} />
        <Dot x={BX[0] + 104} y={100} on={!!q(0)} />
        {/* A1 → AND gate */}
        <path d={`M${BX[1] + 80},100 H392 V106.4 H420`} fill="none" strokeWidth={2.4} className={`transition-colors ${wire(!!q(1))}`} />
        <g transform="translate(420,84)">
          <GateGlyph body="and" h={32} stroke={t[2] ? "stroke-mint" : ink} />
        </g>
        <path d={`M${420 + 38.4},100 H${BX[2]}`} strokeWidth={2.4} className={`transition-colors ${wire(!!t[2])}`} />
        <text x={440} y={78} textAnchor="middle" className={small}>A1·A0</text>
        {BX.map((x, i) => {
          const hot = active.includes(i);
          const ready = !busy && t[i] === 1;
          return (
            <g key={i}>
              <path d={`M${x - 24},196 V140 H${x}`} fill="none" strokeWidth={2.4} className="stroke-sky/70" />
              <Dot x={x - 24} y={196} on />
              <FFBox
                x={x}
                y={76}
                w={80}
                h={84}
                title={`A${i}`}
                left={[
                  { name: "T", y: 100 },
                  { name: "C", y: 140, clock: "rising" },
                ]}
                right={[{ name: "Q", y: 100 }]}
                stroke={hot ? "stroke-neon" : ready ? "stroke-orange" : ink}
                fill={hot ? "fill-neon/15" : "fill-card"}
                value={
                  <text x={x + 52} y={146} textAnchor="middle" className="fill-foreground font-mono text-[22px] font-bold select-none">
                    {q(i)}
                  </text>
                }
              />
              <text x={x + 40} y={176} textAnchor="middle" className={ready ? "fill-orange font-mono text-[10px]" : small}>
                T{i} = {t[i]}
                {ready ? ": flips next" : ""}
              </text>
            </g>
          );
        })}
        <path d={`M30,196 H${BX[2] - 24}`} strokeWidth={2.4} className="stroke-sky/70" />
        <text x={30} y={216} className="fill-sky font-mono text-[11px]">CLK (to every flip-flop)</text>
        {pulse > 0 && !reducedMotion() && (
          <circle key={pulse} r={6} className="fill-neon">
            <animateMotion dur="0.38s" fill="freeze" path={`M30,196 H${BX[2] - 24}`} />
            <animate attributeName="opacity" values="1;1;0" dur="0.48s" fill="freeze" />
          </circle>
        )}
      </svg>
    );
  }

  const signals = Array.from({ length: bits }, (_, i) => ({
    name: mode === "ripple" ? `Q${i}` : `A${i}`,
    bits: hist.map((v) => ((v >> i) & 1) as Bit),
    tone: "stroke-mint",
  }));

  return (
    <Panel title="Two ways to build a counter" legend={LEGEND}>
      <Toggle
        value={mode}
        options={[
          ["ripple", "ripple (4-bit)"],
          ["sync", "synchronous (3-bit)"],
        ]}
        onChange={switchMode}
      />
      <div className="rounded-xl bg-secondary/30 p-3 overflow-x-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="w-full min-w-0 overflow-x-auto">{drawing}</div>
          {mode === "sync" && <StateRing value={shown} />}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`${btn} ${btnPrimary}`} onClick={step} disabled={busy}>
          {mode === "ripple" ? "Count pulse" : "Clock edge"}
        </button>
        <button type="button" className={btn} onClick={() => jump(mode === "ripple" ? 7 : 3)} disabled={busy}>
          Jump to {mode === "ripple" ? "7 (0111)" : "3 (011)"}
        </button>
        <button type="button" className={btn} onClick={() => jump(0)} disabled={busy}>
          Reset
        </button>
        <span className={`font-mono text-sm px-2.5 py-1 rounded-md ${settling ? "bg-orange/15 text-orange" : "bg-mint/15"}`}>
          {bin(shown, bits)} = {shown}
          {settling ? "  (not a real count, still settling)" : ""}
        </span>
      </div>
      {trail.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {trail.map((v, k) => {
            const first = k === 0;
            const lastOne = k === trail.length - 1 && !busy;
            return (
              <span key={k} className="inline-flex items-center gap-1.5">
                {k > 0 && <span className="text-muted-foreground">→</span>}
                <span className={`px-2 py-0.5 rounded ${first ? "bg-secondary" : lastOne ? "bg-mint/20" : mode === "ripple" ? "bg-orange/15 text-orange" : "bg-mint/20"}`}>
                  {bin(v, bits)}
                  {mode === "ripple" && k > 0 && <span className="text-muted-foreground"> @{k * 10} ns</span>}
                </span>
              </span>
            );
          })}
        </div>
      )}
      <p className="rounded-lg border-l-[3px] border-violet/50 bg-violet/[0.05] px-4 py-2.5 text-[15px] leading-relaxed">
        {mode === "ripple"
          ? "Jump to 7, then count. Q0 flips and falls, which clocks Q1, which falls and clocks Q2, and so on. With 10 ns per stage the outputs pass through 6, 4 and 0 before reaching 8 at 40 ns."
          : "Every flip-flop sees the same clock edge. The wires decide in advance which ones flip: T0 is tied to 1, T1 = A0, T2 = A1·A0 (orange boxes flip on the next edge). All the flips happen together, so there are no in-between values."}
      </p>
      <div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Outputs, one cell per count</span>
        <div style={{ maxWidth: 48 + signals[0].bits.length * 30 }}>
          <TimingDiagram signals={signals} cellW={30} />
        </div>
      </div>
    </Panel>
  );
}
