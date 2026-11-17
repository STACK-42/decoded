import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

type Accent = "neon" | "orange" | "sky" | "violet" | "mint";

const accentText: Record<Accent, string> = {
  neon: "text-neon", orange: "text-orange", sky: "text-sky", violet: "text-violet", mint: "text-mint",
};
const accentBg: Record<Accent, string> = {
  neon: "bg-neon", orange: "bg-orange", sky: "bg-sky", violet: "bg-violet", mint: "bg-mint",
};

/* What's saved per lab: time banked before the current run, and when the current run began. */
type Saved = { banked: number; startedAt: number | null };

const storageKey = (id: string) => `decoded:lab-timer:${id}`;

function load(id: string): Saved {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (raw) {
      const s = JSON.parse(raw);
      if (typeof s.banked === "number") return { banked: s.banked, startedAt: typeof s.startedAt === "number" ? s.startedAt : null };
    }
  } catch {
    /* private mode or bad data: start fresh */
  }
  return { banked: 0, startedAt: null };
}

function save(id: string, s: Saved) {
  try {
    if (s.banked === 0 && s.startedAt === null) localStorage.removeItem(storageKey(id));
    else localStorage.setItem(storageKey(id), JSON.stringify(s));
  } catch {
    /* the timer still works for this visit */
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** 60 ticks around a circle; the ones up to the current second are lit. */
function Dial({ ms, accent }: { ms: number; accent: Accent }) {
  const second = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000);
  const lit = ms > 0 ? second + 1 : 0;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const long = i % 5 === 0;
          const r1 = long ? 36 : 39;
          return (
            <line
              key={i}
              x1={50 + r1 * Math.cos(a)}
              y1={50 + r1 * Math.sin(a)}
              x2={50 + 45 * Math.cos(a)}
              y2={50 + 45 * Math.sin(a)}
              strokeWidth={long ? 2.5 : 1.5}
              strokeLinecap="square"
              className={i < lit ? `stroke-current ${accentText[accent]}` : "stroke-border"}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold leading-none tabular-nums">{minutes}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-1">min</span>
      </div>
    </div>
  );
}

/**
 * A stopwatch for lab lessons. The reader starts it when they sit down to the lab; it keeps
 * counting across reloads and lesson switches, and a small chip follows them down the page.
 */
export function LabTimer({ id, accent = "neon" }: { id: string; accent?: Accent }) {
  const [state, setState] = useState<Saved>(() => load(id));
  const [now, setNow] = useState(() => Date.now());
  const [cardVisible, setCardVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const running = state.startedAt !== null;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setCardVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const elapsed = state.banked + (state.startedAt !== null ? Math.max(0, now - state.startedAt) : 0);

  const update = (next: Saved) => {
    setState(next);
    setNow(Date.now());
    save(id, next);
  };
  const start = () => update({ banked: state.banked, startedAt: Date.now() });
  const pause = () => update({ banked: elapsed, startedAt: null });
  const reset = () => update({ banked: 0, startedAt: null });

  const button =
    "inline-flex items-center gap-2 px-4 py-2.5 border font-mono text-[11px] uppercase tracking-widest transition";

  return (
    <>
      <div ref={cardRef} className="not-prose mb-10 border border-border bg-card/40" role="timer" aria-label="Lab timer">
        <div className="flex items-center gap-5 p-4 sm:p-5">
          <Dial ms={elapsed} accent={accent} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              <span className={`h-1.5 w-1.5 ${running ? `${accentBg[accent]} animate-pulse` : "bg-border"}`} aria-hidden="true" />
              {running ? "Lab in progress" : elapsed > 0 ? "Paused" : "Lab timer"}
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight">{formatElapsed(elapsed)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {running ? (
                <button type="button" onClick={pause} className={`${button} border-foreground bg-foreground text-background`}>
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" /> Pause
                </button>
              ) : (
                <button type="button" onClick={start} className={`${button} border-foreground bg-foreground text-background hover:opacity-90`}>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" /> {elapsed > 0 ? "Resume" : "Start the lab"}
                </button>
              )}
              {elapsed > 0 && (
                <button type="button" onClick={reset} className={`${button} border-border text-muted-foreground hover:border-foreground hover:text-foreground`}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {running && !cardVisible && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
          <span className={`h-1.5 w-1.5 animate-pulse ${accentBg[accent]}`} aria-hidden="true" />
          <span className="font-mono text-sm tabular-nums">{formatElapsed(elapsed)}</span>
          <button
            type="button"
            onClick={pause}
            aria-label="Pause lab timer"
            className="inline-flex h-7 w-7 items-center justify-center border border-border hover:border-foreground transition"
          >
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
