import { useEffect, useMemo, useState } from "react";
import { btn, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel } from "@/components/mdx/MatrixVisualizers";
import {
  apparentFrequency, convFrames, errorNorm, gaussian, gaussianHistogram, gaussianPdf, MATLAB_MOVING_AVERAGE, movingAverage, playgroundClean, snr, std, tradeoffDecomposition, voiceLike,
} from "@/lib/signals";

/* ============================================================
   Visualizers for the Signals project in Computational Mathematics.
   Waves are SVG polylines. Colors follow the rest of the site:
   sky = the clean signal, orange = noise and the noisy recording,
   mint = the filtered result, neon = what the window is on now.
   ============================================================ */

const label = "font-mono text-[11px] uppercase tracking-widest text-muted-foreground";
const range = "w-28 sm:w-36 accent-[hsl(var(--sky))]";
const fmt = (v: number, d = 2) => String(Number(v.toFixed(d)));

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches), []);
  return reduce;
}

function Slider({ name, value, min, max, step = 1, onChange, unit = "" }: { name: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
      <span className={label}>{name}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={range} aria-label={name} />
      <span className="font-mono text-xs sm:text-sm">
        {value}
        {unit}
      </span>
    </label>
  );
}

/** A polyline through values, scaled into a w × h box with the given y range. */
function path(values: number[], w: number, h: number, lo: number, hi: number, x0 = 0) {
  const n = values.length;
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(x0 + (i / Math.max(1, n - 1)) * (w - x0)).toFixed(1)},${(h - ((v - lo) / (hi - lo)) * h).toFixed(1)}`)
    .join(" ");
}

/* ---------------------------- sound ---------------------------- */

let audio: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;

/** Play an array of samples in [−1, 1] at sample rate Fs. Does nothing where Web Audio isn't available. */
function play(samples: number[], Fs: number) {
  const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  audio ??= new Ctx();
  playing?.stop();
  const buf = audio.createBuffer(1, samples.length, Fs);
  buf.copyToChannel(Float32Array.from(samples, (v) => Math.max(-1, Math.min(1, v)) * 0.6), 0);
  const src = audio.createBufferSource();
  src.buffer = buf;
  src.connect(audio.destination);
  src.start();
  playing = src;
}

const AUDIO_FS = 22050;

/** One second of a slow wave, with a dot going round a circle once per cycle. */
export function WaveCycle() {
  const reduce = useReducedMotion();
  const [f, setF] = useState(3);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const s = (now - start) / 1000;
      if (s >= 1) {
        setT(1);
        setRunning(false);
        return;
      }
      setT(s);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running]);
  const W = 360;
  const H = 120;
  const wave = Array.from({ length: 241 }, (_, i) => Math.sin(2 * Math.PI * f * (i / 240)));
  const shown = wave.slice(0, Math.round(t * 240) + 1);
  const angle = 2 * Math.PI * f * t;
  return (
    <Panel title="One second of a wave">
      <svg viewBox={`0 0 ${W + 140} ${H + 20}`} className="w-full max-w-xl block" role="img" aria-label={`A ${f} hertz wave over one second`}>
        <circle cx={60} cy={H / 2 + 10} r={45} fill="none" className="stroke-border" />
        <circle cx={60 + 45 * Math.cos(angle)} cy={H / 2 + 10 - 45 * Math.sin(angle)} r={6} className="fill-neon" />
        <line x1={60 + 45 * Math.cos(angle)} y1={H / 2 + 10 - 45 * Math.sin(angle)} x2={130 + t * W} y2={H / 2 + 10 - 45 * Math.sin(angle)} className="stroke-neon/50" strokeDasharray="3 3" />
        <g transform={`translate(130, ${10 + H / 2 - 45})`}>
          <path d={path(wave, W, 90, -1, 1)} fill="none" className="stroke-border" strokeWidth={1.5} />
          <path d={path(shown, (W * (shown.length - 1)) / 240 || 1, 90, -1, 1)} fill="none" className="stroke-sky" strokeWidth={2.5} />
          <text x={0} y={108} className="fill-muted-foreground font-mono text-[10px]">0 s</text>
          <text x={W} y={108} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">1 s</text>
        </g>
      </svg>
      <div className="flex flex-wrap items-center gap-4">
        <Slider name="Frequency f" value={f} min={1} max={6} onChange={(v) => (setF(v), setT(0))} unit=" Hz" />
        <button type="button" className={btn} onClick={() => (reduce ? setT(1) : (setT(0), setRunning(true)))}>
          Play 1 second
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        The dot goes round {f} time{f > 1 ? "s" : ""} in one second, so this is {f} Hz. One cycle takes T = 1/{f} ≈ {fmt(1 / f)} s.
      </p>
    </Panel>
  );
}

/** Four tones, an octave apart. */
export function ToneButtons() {
  const tone = (f: number) => play(Array.from({ length: AUDIO_FS }, (_, i) => Math.sin((2 * Math.PI * f * i) / AUDIO_FS) * Math.min(1, i / 400, (AUDIO_FS - i) / 400)), AUDIO_FS);
  return (
    <Panel title="Hear what a hertz is">
      <div className="flex flex-wrap gap-2">
        {[110, 220, 440, 880].map((f) => (
          <button key={f} type="button" className={btn} onClick={() => tone(f)}>
            ▶ {f} Hz
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Each tone plays for one second. Each one is twice the frequency of the one before, which your ear hears as one octave higher.</p>
    </Panel>
  );
}

/** A wave, the moments we measure it, and the wave those measurements seem to show. */
export function SamplingDemo() {
  const [f, setF] = useState(2);
  const [Fs, setFs] = useState(16);
  const W = 480;
  const H = 120;
  const fine = Array.from({ length: 481 }, (_, i) => Math.sin(2 * Math.PI * f * (i / 480)));
  const samples = Array.from({ length: Fs + 1 }, (_, n) => [n / Fs, Math.sin((2 * Math.PI * f * n) / Fs)] as const);
  const Y = (v: number) => H / 2 - v * (H / 2 - 8);
  const fake = apparentFrequency(f, Fs);
  const aliased = Fs <= 2 * f;
  return (
    <Panel title="Measuring a wave" legend={[["bg-sky", "the real wave"], ["bg-neon", "samples kept"], ["bg-orange", "joining the samples"]]}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label={`A ${f} hertz wave sampled ${Fs} times a second`}>
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} className="stroke-border" />
        <path d={path(fine, W, H - 16, -1, 1).replace(/,(\d+(\.\d+)?)/g, (_, y) => `,${Number(y) + 8}`)} fill="none" className="stroke-sky/70" strokeWidth={1.5} />
        <path d={samples.map(([t, v], i) => `${i ? "L" : "M"}${(t * W).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} fill="none" className="stroke-orange" strokeWidth={2} />
        {samples.map(([t, v], i) => (
          <circle key={i} cx={t * W} cy={Y(v)} r={4} className="fill-neon" />
        ))}
      </svg>
      <div className="flex flex-wrap gap-5">
        <Slider name="Wave f" value={f} min={1} max={10} onChange={setF} unit=" Hz" />
        <Slider name="Sample rate Fs" value={Fs} min={2} max={40} onChange={setFs} unit=" Hz" />
      </div>
      <p className={`text-sm ${aliased ? "text-orange" : "text-muted-foreground"}`}>
        {aliased
          ? `Fs = ${Fs} is not more than 2 × ${f} = ${2 * f}. The samples trace a false wave of ${fmt(fake)} Hz that isn't there. That's aliasing.`
          : `${Fs} samples per second is more than 2 × ${f} = ${2 * f}, so the samples follow the real ${f} Hz wave.`}
      </p>
    </Panel>
  );
}

/** Clean plus noise equals what the microphone records. */
export function NoiseAdd() {
  const [sigma, setSigma] = useState(0.2);
  const [seed, setSeed] = useState(42);
  const N = 300;
  const clean = useMemo(() => Array.from({ length: N }, (_, n) => 0.7 * Math.sin((2 * Math.PI * 2 * n) / N) + 0.25 * Math.sin((2 * Math.PI * 5 * n) / N)), []);
  const e = useMemo(() => gaussian(N, seed), [seed]);
  const noise = e.map((v) => sigma * v);
  const y = clean.map((v, i) => v + noise[i]);
  const row = (vals: number[], cls: string, name: string) => (
    <div>
      <div className={`${label} mb-1`}>{name}</div>
      <svg viewBox="0 0 480 70" className="w-full block" role="img" aria-label={name}>
        <line x1={0} y1={35} x2={480} y2={35} className="stroke-border" />
        <path d={path(vals, 480, 70, -1.6, 1.6)} fill="none" className={cls} strokeWidth={1.4} />
      </svg>
    </div>
  );
  return (
    <Panel title="Clean + noise = recording">
      {row(clean, "stroke-sky", "clean voice x(n)")}
      {row(noise, "stroke-orange", `noise e(n), σ = ${sigma}`)}
      {row(y, "stroke-orange/80", "recording y(n) = x(n) + e(n): the only one we hear")}
      <div className="flex flex-wrap items-center gap-4">
        <Slider name="Noise strength σ" value={sigma} min={0} max={0.6} step={0.05} onChange={setSigma} />
        <button type="button" className={btn} onClick={() => setSeed((s) => s + 1)}>
          New random noise
        </button>
      </div>
    </Panel>
  );
}

/** Visualizes the normal / Gaussian distribution N(0, σ²): live sample histogram vs theoretical bell curve. */
export function GaussianBellVisualizer() {
  const [sigma, setSigma] = useState(0.2);
  const [seed, setSeed] = useState(42);
  const N = 1000;
  const raw = useMemo(() => gaussian(N, seed), [seed]);
  const samples = useMemo(() => raw.map((v) => v * sigma), [raw, sigma]);

  const numBins = 25;
  const span = 1.6;
  const bins = useMemo(() => gaussianHistogram(samples, sigma, numBins, span / sigma), [samples, sigma]);
  const maxDensity = 4.2; // provides stable vertical headroom for sigma from 0.1 to 0.5

  const within1Sigma = samples.filter((v) => Math.abs(v) <= sigma).length;
  const pct1Sigma = ((within1Sigma / N) * 100).toFixed(1);
  const sampleStd = std(samples);

  const W = 480;
  const H = 140;
  const X = (x: number) => ((x + span) / (2 * span)) * W;
  const Y = (density: number) => H - 18 - (Math.min(density, maxDensity) / maxDensity) * (H - 32);

  const curvePts = Array.from({ length: 161 }, (_, i) => {
    const x = -span + (i / 160) * (2 * span);
    return [X(x), Y(gaussianPdf(x, sigma))] as const;
  });
  const bellPath = curvePts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const binW = W / numBins;

  return (
    <Panel
      title="The Gaussian noise distribution"
      legend={[
        ["bg-orange", "sampled noise counts"],
        ["bg-neon", "theoretical bell curve"],
        ["bg-sky", "±1σ range (68% of noise)"],
      ]}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full block"
        role="img"
        aria-label={`Normal distribution bell curve for noise with standard deviation ${sigma}`}
      >
        <line x1={0} y1={H - 18} x2={W} y2={H - 18} className="stroke-border" />

        {/* Shaded +/- 1 sigma zone */}
        <rect
          x={X(-sigma)}
          y={8}
          width={Math.max(0, X(sigma) - X(-sigma))}
          height={H - 26}
          className="fill-sky/10"
        />

        {/* Histogram bars */}
        {bins.map((b, i) => {
          const barH = Math.max(0, (Math.min(b.density, maxDensity) / maxDensity) * (H - 32));
          return (
            <rect
              key={i}
              x={i * binW + 1}
              y={H - 18 - barH}
              width={Math.max(1, binW - 2)}
              height={barH}
              className="fill-orange/40 hover:fill-orange/70 transition-colors"
            />
          );
        })}

        {/* Theoretical bell curve */}
        <path d={bellPath} fill="none" className="stroke-neon" strokeWidth={2.2} />

        {/* +/- 1 sigma dashed markers */}
        <line x1={X(-sigma)} y1={8} x2={X(-sigma)} y2={H - 18} className="stroke-sky" strokeWidth={1.5} strokeDasharray="3 3" />
        <line x1={X(sigma)} y1={8} x2={X(sigma)} y2={H - 18} className="stroke-sky" strokeWidth={1.5} strokeDasharray="3 3" />

        {/* Axis labels */}
        <text x={X(-sigma)} y={H - 4} textAnchor="middle" className="fill-sky font-mono text-[10px]">−σ</text>
        <text x={X(0)} y={H - 4} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">0 (mean)</text>
        <text x={X(sigma)} y={H - 4} textAnchor="middle" className="fill-sky font-mono text-[10px]">+σ</text>
        <text x={X(-span) + 4} y={H - 4} textAnchor="start" className="fill-muted-foreground font-mono text-[10px]">−1.6</text>
        <text x={X(span) - 4} y={H - 4} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">+1.6</text>
      </svg>

      <div className="flex flex-wrap items-center gap-4">
        <Slider name="Noise spread σ" value={sigma} min={0.1} max={0.5} step={0.05} onChange={setSigma} />
        <button type="button" className={btn} onClick={() => setSeed((s) => s + 1)}>
          New random noise
        </button>
      </div>

      <p className="font-mono text-xs sm:text-sm text-muted-foreground">
        Theoretical σ: <span className="text-foreground">{fmt(sigma)}</span> · Measured std: <span className="text-foreground">{fmt(sampleStd)}</span> · {pct1Sigma}% of {N} samples fall within ±σ (rule: ~68.3%)
      </p>
    </Panel>
  );
}

/** Pure noise, and the average of M neighbours at each point. */
export function NoiseAveraging() {
  const [M, setM] = useState(9);
  const N = 120;
  const e = useMemo(() => gaussian(N + 80, 42), []);
  const avg = movingAverage(e, M).slice(40, 40 + N);
  const raw = e.slice(40, 40 + N);
  const H = 140;
  const Y = (v: number) => H / 2 - v * 22;
  const bw = 480 / N;
  return (
    <Panel title="Averaging pure noise" legend={[["bg-orange", "noise"], ["bg-mint", `average of ${M}`]]}>
      <svg viewBox={`0 0 480 ${H}`} className="w-full block" role="img" aria-label={`Noise and its ${M}-sample moving average`}>
        <line x1={0} y1={H / 2} x2={480} y2={H / 2} className="stroke-border" />
        {raw.map((v, i) => (
          <rect key={i} x={i * bw + 0.5} y={Math.min(Y(v), H / 2)} width={bw - 1} height={Math.abs(Y(v) - H / 2)} className="fill-orange/45" />
        ))}
        <path d={avg.map((v, i) => `${i ? "L" : "M"}${(i * bw + bw / 2).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} fill="none" className="stroke-mint" strokeWidth={2.2} />
      </svg>
      <Slider name="Samples averaged M" value={M} min={1} max={49} step={2} onChange={setM} />
      <div className="font-mono text-sm leading-relaxed">
        typical size of the noise: {fmt(std(raw))} → after averaging: <span className="text-mint">{fmt(std(avg))}</span>
        <br />
        shrunk by {fmt(std(raw) / std(avg), 1)}× (the rule predicts √{M} ≈ {fmt(Math.sqrt(M), 1)}×)
      </div>
    </Panel>
  );
}

const KERNELS: Record<string, [string, number[]]> = {
  average: ["Average ⅓ ⅓ ⅓", [1 / 3, 1 / 3, 1 / 3]],
  centre: ["Centre-heavy ¼ ½ ¼", [0.25, 0.5, 0.25]],
  copy: ["Copy 0 1 0", [0, 1, 0]],
};
const SIGNALS: Record<string, [string, number[]]> = {
  noisy: ["Noisy constant", [3, 1, 3, 1, 3]],
  spike: ["Sharp spike", [0, 0, 6, 0, 0]],
};

/** Slide a three-weight kernel along a five-sample signal and watch each output appear. */
export function ConvolutionStepper() {
  const [k, setK] = useState("average");
  const [sig, setSig] = useState("noisy");
  const h = KERNELS[k][1];
  const x = SIGNALS[sig][1];
  const frames = useMemo(() => convFrames(x, h), [k, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  // 36 px cells on phones so the 7 cells (5 samples + 2 zero pads) fit 390 px; the row name sits above them there
  const cell = "h-11 w-9 sm:w-14 shrink-0 flex flex-col items-center justify-center border font-mono text-xs sm:text-sm rounded-sm";
  const row = "flex flex-col gap-1 sm:flex-row sm:items-center";
  const cells = "flex items-center gap-[3px] sm:gap-1";
  const f = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
  return (
    <Stepper
      title="Sliding the kernel"
      frames={frames}
      code={MATLAB_MOVING_AVERAGE}
      codeLabel="MATLAB"
      legend={[["bg-neon", "inside the window"], ["bg-mint", "outputs so far"]]}
      render={(s) => (
        <div className="flex flex-col gap-3 overflow-x-auto pb-2 max-w-full">
          <div className={row}>
            <span className={`${label} sm:w-16 shrink-0`}>signal</span>
            <div className={cells}>
            {[0, ...s.x, 0].map((v, i) => {
              const inWin = s.n >= 0 && s.n < s.x.length && i >= s.n && i <= s.n + 2;
              const pad = i === 0 || i === s.x.length + 1;
              return (
                <div key={i} className={`${cell} ${pad ? "border-dashed text-muted-foreground" : ""} ${inWin ? "border-neon bg-neon/15" : "border-border"}`}>
                  {v}
                </div>
              );
            })}
            </div>
          </div>
          <div className={row}>
            <span className={`${label} sm:w-16 shrink-0`}>kernel</span>
            <div className={cells}>
            {[0, ...s.x, 0].map((_, i) => {
              const j = i - s.n;
              const show = s.n >= 0 && s.n < s.x.length && j >= 0 && j <= 2;
              return (
                <div key={i} className={`${cell} ${show ? "border-violet text-violet" : "border-transparent"}`}>
                  {show ? f(s.h[j]) : ""}
                  {show && <span className="text-[9px] text-muted-foreground">× {s.window[j]}</span>}
                </div>
              );
            })}
            </div>
          </div>
          <div className={row}>
            <span className={`${label} sm:w-16 shrink-0`}>output</span>
            <div className={cells}>
            <div className="w-9 sm:w-14 shrink-0" />
            {s.y.map((v, i) => (
              <div key={i} className={`${cell} ${v === null ? "border-border text-muted-foreground" : i === s.n ? "border-neon bg-neon/15" : "border-mint bg-mint/10"}`}>
                {v === null ? "·" : f(v)}
              </div>
            ))}
            </div>
          </div>
        </div>
      )}
      inputs={
        <div className="flex flex-col gap-2">
          <Toggle value={k} options={Object.entries(KERNELS).map(([key, [name]]) => [key, name] as [string, string])} onChange={setK} />
          <Toggle value={sig} options={Object.entries(SIGNALS).map(([key, [name]]) => [key, name] as [string, string])} onChange={setSig} />
        </div>
      }
    />
  );
}

/** The whole trade-off: noise removed against detail lost, as M grows. */
export function FilterPlayground() {
  const [M, setM] = useState(7);
  const [sigma, setSigma] = useState(0.2);
  const [seed, setSeed] = useState(42);
  const [view, setView] = useState<"snr" | "decomp">("snr");
  const clean = useMemo(() => playgroundClean(), []);
  const e = useMemo(() => gaussian(clean.length, seed), [clean, seed]);
  const noise = useMemo(() => e.map((v) => sigma * v), [e, sigma]);
  const y = useMemo(() => clean.map((v, i) => v + noise[i]), [clean, noise]);
  const xHat = useMemo(() => movingAverage(y, M), [y, M]);
  const decomp = useMemo(() => tradeoffDecomposition(clean, noise, 61), [clean, noise]);
  const curve = useMemo(() => decomp.map((d) => d.snrDb), [decomp]);
  const best = curve.indexOf(Math.max(...curve)) + 1;
  const W = 600;
  const H = 170;
  const lo = Math.min(...curve);
  const hi = Math.max(...curve);
  const maxErr = Math.max(...decomp.map((d) => Math.max(d.totalError, d.blurError, d.noiseError)));
  const curPt = decomp[M - 1] ?? decomp[0];

  return (
    <Panel title="Filter playground" legend={[["bg-sky", "clean x"], ["bg-orange", "noisy y"], ["bg-mint", "filtered x̂"]]}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label={`The signal filtered with a ${M}-sample moving average`}>
        <text x={W / 3} y={12} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">spike</text>
        <text x={(W * 420) / 600} y={12} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">fast burst</text>
        <path d={path(y, W, H, -1.8, 1.8)} fill="none" className="stroke-orange/35" strokeWidth={1} />
        <path d={path(clean, W, H, -1.8, 1.8)} fill="none" className="stroke-sky" strokeWidth={1.4} />
        <path d={path(xHat, W, H, -1.8, 1.8)} fill="none" className="stroke-mint" strokeWidth={2.2} />
      </svg>
      <div className="flex flex-wrap items-center gap-4">
        <Slider name="Kernel length M" value={M} min={1} max={61} onChange={setM} />
        <Slider name="Noise σ" value={sigma} min={0.05} max={0.5} step={0.05} onChange={setSigma} />
        <button type="button" className={btn} onClick={() => setSeed((s) => s + 1)}>
          New random noise
        </button>
      </div>
      <div className="font-mono text-sm leading-relaxed">
        error norm ‖x − x̂‖: {fmt(errorNorm(clean, y))} → <span className="text-mint">{fmt(errorNorm(clean, xHat))}</span>
        {" · "}SNR: {fmt(snr(clean, y), 1)} dB → <span className="text-mint">{fmt(snr(clean, xHat), 1)} dB</span>
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={label}>
            {view === "snr" ? `SNR after filtering · best M = ${best} (${fmt(curve[best - 1], 1)} dB)` : `Trade-off breakdown · sweet spot at M = ${best}`}
          </div>
          <Toggle
            value={view}
            options={[
              ["snr", "SNR curve (dB)"],
              ["decomp", "Error breakdown"],
            ]}
            onChange={(v) => setView(v as "snr" | "decomp")}
          />
        </div>

        {view === "snr" ? (
          <div>
            <svg viewBox={`0 0 ${W} 90`} className="w-full block" role="img" aria-label={`SNR against M, highest at M = ${best}`}>
              <path d={path(curve, W, 80, lo - 0.5, hi + 0.5)} transform="translate(0,5)" fill="none" className="stroke-mint" strokeWidth={2} />
              <line x1={((M - 1) / 60) * W} y1={0} x2={((M - 1) / 60) * W} y2={90} className="stroke-neon" strokeWidth={1.5} />
              <circle cx={((best - 1) / 60) * W} cy={5 + 80 - ((curve[best - 1] - lo + 0.5) / (hi - lo + 1)) * 80} r={4} className="fill-violet" />
            </svg>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              At M = {M}: SNR = <span className="text-mint font-bold">{fmt(curPt.snrDb, 1)} dB</span> (peak is {fmt(curve[best - 1], 1)} dB at M = {best})
            </p>
          </div>
        ) : (
          <div>
            <svg viewBox={`0 0 ${W} 90`} className="w-full block" role="img" aria-label="Error breakdown against M showing blur vs residual noise">
              <line x1={0} y1={85} x2={W} y2={85} className="stroke-border" />
              <path d={path(decomp.map((d) => d.noiseError), W, 78, 0, maxErr * 1.05)} transform="translate(0,6)" fill="none" className="stroke-orange" strokeWidth={1.8} strokeDasharray="4 2" />
              <path d={path(decomp.map((d) => d.blurError), W, 78, 0, maxErr * 1.05)} transform="translate(0,6)" fill="none" className="stroke-sky" strokeWidth={1.8} />
              <path d={path(decomp.map((d) => d.totalError), W, 78, 0, maxErr * 1.05)} transform="translate(0,6)" fill="none" className="stroke-mint" strokeWidth={2.4} />
              <line x1={((M - 1) / 60) * W} y1={0} x2={((M - 1) / 60) * W} y2={90} className="stroke-neon" strokeWidth={1.5} />
              <circle cx={((best - 1) / 60) * W} cy={6 + 78 - ((decomp[best - 1].totalError) / (maxErr * 1.05)) * 78} r={4} className="fill-violet" />
            </svg>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-1 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-0.5 bg-orange" /> noise: <span className="text-orange">{fmt(curPt.noiseError)}</span> (shrinks as 1/√M)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-0.5 bg-sky" /> blur: <span className="text-sky">{fmt(curPt.blurError)}</span> (grows with M)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-0.5 bg-mint" /> total error: <span className="text-mint font-bold">{fmt(curPt.totalError)}</span> (min at M = {best})
              </span>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

/** Listen to the clean, noisy and filtered versions of a voice-like sound. */
export function HearIt() {
  const [M, setM] = useState(10);
  const [sigma, setSigma] = useState(0.15);
  const clean = useMemo(() => voiceLike(AUDIO_FS), []);
  const e = useMemo(() => gaussian(clean.length, 42), [clean]);
  const noisy = () => clean.map((v, i) => v + sigma * e[i]);
  return (
    <Panel title="Clean, noisy, filtered">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => play(clean, AUDIO_FS)}>
          ▶ Clean
        </button>
        <button type="button" className={btn} onClick={() => play(noisy(), AUDIO_FS)}>
          ▶ Noisy
        </button>
        <button type="button" className={btn} onClick={() => play(movingAverage(noisy(), M), AUDIO_FS)}>
          ▶ Filtered
        </button>
      </div>
      <div className="flex flex-wrap gap-5">
        <Slider name="Kernel length M" value={M} min={1} max={80} onChange={setM} />
        <Slider name="Noise σ" value={sigma} min={0.05} max={0.4} step={0.05} onChange={setSigma} />
      </div>
      <p className="text-sm text-muted-foreground">
        A buzz at 140 Hz with 25 overtones, shaped into two syllables, at {AUDIO_FS.toLocaleString("en-US")} samples per second. Try M = 10, then M = 60: the hiss fades, and then the voice itself goes dull.
      </p>
    </Panel>
  );
}
