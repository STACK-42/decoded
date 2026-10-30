import { useMemo, useState } from "react";
import { btn, inputCls, Stepper, Toggle } from "@/components/mdx/AlgoVisualizers";
import { Panel, useTween } from "@/components/mdx/MatrixVisualizers";
import { affineDecrypt, affineEncrypt, affineTable, ALPHABET, bitsToText, FLOW_CODE, flowFrames, keystream, MATLAB_XOR, shiftDecrypt, shiftEncrypt, textToBits, validAffineKey, xorBits, xorFrames } from "@/lib/ciphers";
import { gcd, inverseMod } from "@/lib/numberTheory";

/* ------------------------------ secret-key flow ----------------------------- */

const FLOW_X = [60, 190, 330, 470, 600];

export function SecretKeyFlow({ text = "HELLO", k = 3 }: { text?: string; k?: number }) {
  const frames = useMemo(() => flowFrames(text, k), [text, k]);
  return (
    <Stepper
      title="A secret-key system"
      frames={frames}
      code={FLOW_CODE}
      codeLabel="Pseudocode"
      legend={[["bg-mint", "readable"], ["bg-orange", "encrypted"], ["bg-violet", "secret key"]]}
      render={(s) => {
        const isCipher = s.stage >= 1 && s.stage <= 3;
        const word = isCipher ? s.cipher : s.plain;
        const boxes = [
          { x: FLOW_X[1], label: "E" },
          { x: FLOW_X[3], label: "D" },
        ];
        return (
          <svg viewBox="0 0 660 190" className="w-full min-w-[520px]" role="img" aria-label={`Message ${s.plain} encrypted to ${s.cipher} and decrypted again`}>
            <path d={`M${FLOW_X[0]},70H${FLOW_X[4]}`} className="stroke-border" strokeWidth={2} />
            <text x={FLOW_X[2]} y={40} textAnchor="middle" fontSize={11} className="fill-muted-foreground font-mono">public channel</text>
            <path d={`M${FLOW_X[1]},95V150H${FLOW_X[3]}V95`} fill="none" strokeDasharray="5 4" className="stroke-violet" strokeWidth={1.6} />
            <rect x={FLOW_X[2] - 62} y={137} width={124} height={26} rx={3} className="fill-card stroke-violet" />
            <text x={FLOW_X[2]} y={154} textAnchor="middle" fontSize={12} className="fill-violet font-mono">secret key k = {s.k}</text>
            {boxes.map((b, i) => {
              const live = (i === 0 && s.stage === 1) || (i === 1 && s.stage === 3);
              return (
                <g key={b.label}>
                  <rect x={b.x - 26} y={46} width={52} height={48} rx={4} className={`transition-colors duration-300 ${live ? "fill-violet/40 stroke-violet" : "fill-card stroke-border"}`} strokeWidth={1.6} />
                  <text x={b.x} y={76} textAnchor="middle" fontSize={18} className="fill-foreground font-display">{b.label}</text>
                </g>
              );
            })}
            <g className="transition-transform duration-700 ease-in-out motion-reduce:transition-none" style={{ transform: `translate(${FLOW_X[s.stage]}px, ${s.stage === 1 || s.stage === 3 ? 20 : 70}px)` }}>
              <rect x={-44} y={-14} width={88} height={28} rx={3} className={`transition-colors duration-500 ${isCipher ? "fill-orange" : "fill-mint"}`} />
              <text textAnchor="middle" dy=".35em" fontSize={14} className="fill-background font-mono font-bold">{word}</text>
            </g>
          </svg>
        );
      }}
    />
  );
}

/* ------------------------------- XOR stream ------------------------------- */

function BitRow({ label, bits, at, tone, keyPrefix }: { label: string; bits: (number | null)[]; at: number | null; tone: string; keyPrefix: string }) {
  return (
    <div className="flex items-center gap-1 font-mono">
      <span className="w-10 text-[11px] text-muted-foreground shrink-0">{label}</span>
      {bits.map((b, i) => (
        <div
          key={`${keyPrefix}${i}`}
          className={`w-6 h-7 shrink-0 flex items-center justify-center text-[12px] rounded-[2px] border transition-[transform,background-color,border-color,opacity] duration-200 motion-reduce:transition-none ${i === at ? `${tone} scale-110` : "border-border bg-background/50"} ${i > 0 && i % 8 === 0 ? "ml-2" : ""}`}
          style={{ opacity: b === null ? 0.25 : 1 }}
        >
          {b ?? "·"}
        </div>
      ))}
    </div>
  );
}

export function XorStreamVisualizer() {
  const [text, setText] = useState("HI");
  const [seed, setSeed] = useState(44257);
  const [decrypt, setDecrypt] = useState(false);
  const plain = useMemo(() => textToBits(text), [text]);
  const key = useMemo(() => keystream(seed, plain.length), [seed, plain.length]);
  const frames = useMemo(() => xorFrames(decrypt ? xorBits(plain, key) : plain, key, decrypt), [plain, key, decrypt]);
  return (
    <Stepper
      title="A stream cipher, bit by bit"
      frames={frames}
      code={MATLAB_XOR}
      codeLabel="MATLAB"
      legend={[["bg-neon", "this bit"], ["bg-violet", "key"], ["bg-mint", "output"]]}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Message, up to 3 characters" className={`${inputCls} w-24`} maxLength={3} value={text} onChange={(e) => setText(e.target.value.replace(/[^\x20-\x7e]/g, "") || "A")} />
          <Toggle<string> value={decrypt ? "d" : "e"} onChange={(v) => setDecrypt(v === "d")} options={[["e", "Encrypt"], ["d", "Decrypt"]]} />
          <button type="button" className={btn} onClick={() => setSeed((s) => (s * 75 + 74) % 65537 || 1)}>New key stream</button>
        </div>
      }
      render={(s) => (
        <div className="flex flex-col gap-1.5 overflow-x-auto pb-1">
          <BitRow label={s.decrypt ? "c" : "m"} bits={s.input} at={s.at} tone="border-neon bg-neon/25" keyPrefix="i" />
          <BitRow label="⊕ k" bits={s.key} at={s.at} tone="border-violet bg-violet/30" keyPrefix="k" />
          <div className="h-px bg-foreground/40 ml-11 my-0.5" />
          <BitRow label={s.decrypt ? "m" : "c"} bits={s.output} at={s.at} tone="border-mint bg-mint/30" keyPrefix="o" />
          <div className="font-mono text-[12px] text-muted-foreground ml-11 mt-1 min-h-[1.4em]">
            {s.decrypt && s.output.every((x) => x !== null) ? <>reads: <span className="text-mint">{bitsToText(s.output as number[])}</span></> : ""}
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------- cipher wheel ------------------------------ */

const ringAt = (i: number, r: number): [number, number] => {
  const t = (2 * Math.PI * i) / 26 - Math.PI / 2;
  return [170 + r * Math.cos(t), 170 + r * Math.sin(t)];
};

/** The inner ring turns against the outer one, so each plaintext letter sits above its ciphertext. */
export function CipherWheel({ start = "ATTACK AT DAWN", k: k0 = 3 }: { start?: string; k?: number }) {
  const [k, setK] = useState(k0);
  const [text, setText] = useState(start);
  const [focus, setFocus] = useState(0);
  const clean = text.toUpperCase().replace(/[^A-Z ]/g, "");
  const out = shiftEncrypt(clean, k);
  const letters = clean.split("").map((c, i) => ({ c, o: out[i], i })).filter((x) => x.c !== " ");
  const cur = letters[Math.min(focus, letters.length - 1)];
  const plainIdx = cur ? ALPHABET.indexOf(cur.c) : -1;
  return (
    <Panel title="Cipher wheel" legend={[["bg-mint", "plaintext ring"], ["bg-orange", "ciphertext ring"], ["bg-neon", "current letter"]]}>
      <div className="flex flex-wrap items-center gap-6">
        <svg viewBox="0 0 340 340" className="w-full max-w-[340px]" role="img" aria-label={`Caesar wheel with shift ${k}`}>
          <circle cx={170} cy={170} r={162} className="fill-background/60 stroke-border" />
          <circle cx={170} cy={170} r={122} className="fill-card stroke-border" />
          {ALPHABET.split("").map((ch, i) => {
            const [x, y] = ringAt(i, 142);
            const live = i === plainIdx;
            return (
              <g key={ch}>
                {live && <circle cx={x} cy={y} r={12} className="fill-neon" />}
                <text x={x} y={y} dy=".35em" textAnchor="middle" fontSize={14} className={`font-mono ${live ? "fill-background font-bold" : "fill-mint"}`}>{ch}</text>
              </g>
            );
          })}
          <g className="transition-transform duration-700 ease-in-out motion-reduce:transition-none" style={{ transformOrigin: "170px 170px", transform: `rotate(${(-k * 360) / 26}deg)` }}>
            {ALPHABET.split("").map((ch, i) => {
              const [x, y] = ringAt(i, 104);
              const live = plainIdx >= 0 && i === (plainIdx + k) % 26;
              return (
                <g key={ch} transform={`rotate(${(i * 360) / 26} ${x} ${y})`}>
                  {live && <circle cx={x} cy={y} r={11} className="fill-orange" />}
                  <text x={x} y={y} dy=".35em" textAnchor="middle" fontSize={13} className={`font-mono ${live ? "fill-background font-bold" : "fill-orange"}`}>{ch}</text>
                </g>
              );
            })}
          </g>
          <text x={170} y={164} textAnchor="middle" fontSize={11} className="fill-muted-foreground font-mono">shift</text>
          <text x={170} y={190} textAnchor="middle" fontSize={26} className="fill-foreground font-display">{k}</text>
        </svg>
        <div className="flex flex-col gap-3 flex-1 min-w-[240px] font-mono text-sm">
          <input aria-label="Message" className={inputCls} value={text} onChange={(e) => { setText(e.target.value.slice(0, 40)); setFocus(0); }} />
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            shift k = {k}{k === 3 ? " (the Caesar cipher)" : ""}
            <input type="range" aria-label="Shift" min={0} max={25} value={k} onChange={(e) => setK(Number(e.target.value))} className="accent-[hsl(var(--orange))]" />
          </label>
          <div className="flex flex-wrap gap-y-1">
            {clean.split("").map((c, i) => {
              const hot = cur?.i === i;
              return (
                <button type="button" key={i} disabled={c === " "} aria-label={c === " " ? "space" : `Show letter ${c}`} onClick={() => setFocus(letters.findIndex((l) => l.i === i))} className={`w-6 flex flex-col items-center rounded-sm transition-colors ${hot ? "bg-neon/20" : ""}`}>
                  <span className="text-mint">{c === " " ? " " : c}</span>
                  <span className="text-orange">{c === " " ? " " : out[i]}</span>
                </button>
              );
            })}
          </div>
          {cur && <div className="text-[12px] text-muted-foreground">{cur.c} = {plainIdx}, and ({plainIdx} + {k}) mod 26 = {(plainIdx + k) % 26}, which is {cur.o}</div>}
          <button type="button" className={`${btn} self-start`} onClick={() => setFocus((f) => (f + 1) % Math.max(1, letters.length))}>Next letter →</button>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------ brute force ----------------------------- */

export function ShiftBruteForce({ cipher = shiftEncrypt("MEET ME AFTER THE TOGA PARTY", 3) }: { cipher?: string }) {
  const [shown, setShown] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const rows = Array.from({ length: 25 }, (_, i) => i + 1);
  return (
    <Panel title="Trying every key" legend={[["bg-mint", "readable"]]}>
      <div className="font-mono text-sm break-all">ciphertext: <span className="text-orange">{cipher}</span></div>
      <div className="grid gap-y-0.5 font-mono text-[12px] max-h-[290px] overflow-y-auto">
        {rows.slice(0, shown).map((k) => (
          <button type="button" key={k} onClick={() => setPicked(k)} className={`text-left px-2 py-0.5 rounded-sm transition-colors ${picked === k ? (k === 3 ? "bg-mint/25 text-mint" : "bg-orange/15") : "hover:bg-background/60"}`}>
            <span className="inline-block w-12 text-muted-foreground">k = {k}</span>
            {shiftDecrypt(cipher, k)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} disabled={shown >= 25} onClick={() => setShown((s) => Math.min(25, s + 1))}>Try next key</button>
        <button type="button" className={btn} disabled={shown >= 25} onClick={() => setShown(25)}>Try them all</button>
        <span className="font-mono text-[11px] text-muted-foreground">{picked === 3 ? "That's the one. 25 keys took a moment." : "Click the line that reads like English."}</span>
      </div>
    </Panel>
  );
}

/* ------------------------------- affine map ------------------------------ */

const STEP = 21;

/** Lines from each letter to its image. A bad k1 makes them pile up, so the map visibly can't be undone. */
export function AffineMapVisualizer({ start = "SECURITY" }: { start?: string }) {
  const [k1, setK1] = useState(7);
  const [k2, setK2] = useState(21);
  const [text, setText] = useState(start);
  const table = useMemo(() => affineTable(k1, k2), [k1, k2]);
  const [xs] = useTween(table, 700);
  const clean = text.toUpperCase().replace(/[^A-Z ]/g, "");
  const ok = validAffineKey(k1);
  const distinct = new Set(table).size;
  const cipher = affineEncrypt(clean, k1, k2);
  const back = affineDecrypt(cipher, k1, k2);
  const used = new Set(clean.replace(/ /g, "").split("").map((c) => ALPHABET.indexOf(c)));
  const inv = inverseMod(k1, 26);
  return (
    <Panel title="Affine map" legend={[["bg-mint", "letters in your message"], ["bg-sky", "other letters"]]}>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${26 * STEP + 8} 170`} className="min-w-[560px] w-full" role="img" aria-label={`Letters mapped by ${k1} m plus ${k2} mod 26`}>
          {ALPHABET.split("").map((_, m) => {
            const x1 = m * STEP + 14;
            const x2 = (xs[m] ?? table[m]) * STEP + 14;
            return <line key={m} x1={x1} y1={32} x2={x2} y2={138} strokeWidth={used.has(m) ? 2 : 1} className={used.has(m) ? "stroke-mint" : "stroke-sky/35"} />;
          })}
          {ALPHABET.split("").map((ch, i) => (
            <g key={ch}>
              <text x={i * STEP + 14} y={20} textAnchor="middle" fontSize={13} className={`font-mono ${used.has(i) ? "fill-mint font-bold" : "fill-foreground"}`}>{ch}</text>
              <text x={i * STEP + 14} y={158} textAnchor="middle" fontSize={13} className={`font-mono transition-opacity duration-300 ${table.includes(i) ? "fill-orange" : "fill-muted-foreground/25"}`}>{ch}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap gap-5 font-mono text-sm">
        <div className="flex flex-col gap-2 min-w-[220px] flex-1">
          <div>E(m) = ({k1} × m + {k2}) mod 26</div>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            k₁ = {k1}
            <input type="range" aria-label="Multiplier" min={1} max={25} value={k1} onChange={(e) => setK1(Number(e.target.value))} className="accent-[hsl(var(--mint))]" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            k₂ = {k2}
            <input type="range" aria-label="Shift" min={0} max={25} value={k2} onChange={(e) => setK2(Number(e.target.value))} className="accent-[hsl(var(--mint))]" />
          </label>
          <input aria-label="Message" className={inputCls} value={text} onChange={(e) => setText(e.target.value.slice(0, 30))} />
        </div>
        <div className="flex flex-col gap-1.5 min-w-[240px] flex-1 text-[13px]">
          <div>cipher: <span className="text-orange">{cipher}</span></div>
          {ok ? (
            <>
              <div className="text-muted-foreground">inverse of {k1} modulo 26 is {inv}</div>
              <div>D(c) = {inv} × (c − {k2}) mod 26</div>
              <div>decrypts to: <span className="text-mint">{back}</span></div>
            </>
          ) : (
            <p className="font-body text-orange leading-relaxed">
              gcd({k1}, 26) = {gcd(k1, 26)}, so {k1} has no inverse. All 26 letters land on just {distinct} {distinct === 1 ? "letter" : "letters"}, and different messages can encrypt the same way. This key can't be decrypted.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => { setK1(7); setK2(21); }}>k = (7, 21)</button>
        <button type="button" className={btn} onClick={() => { setK1(11); setK2(23); }}>k = (11, 23)</button>
        <button type="button" className={btn} onClick={() => { setK1(13); setK2(5); }}>Bad key: k₁ = 13</button>
        <button type="button" className={btn} onClick={() => { setK1(2); setK2(0); }}>Bad key: k₁ = 2</button>
      </div>
    </Panel>
  );
}
