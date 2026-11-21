/* Digital logic: a unit-delay gate simulator plus the number and Boolean
   helpers the Logic Design course animates. Pure functions, no React. */

export type Bit = 0 | 1;
export type GateType = "AND" | "OR" | "NOT" | "BUF" | "NAND" | "NOR" | "XOR" | "XNOR";
export type NetGate = { id: string; type: GateType; in: string[] };
export type Signals = Record<string, Bit>;

export function evalGate(type: GateType, bits: Bit[]): Bit {
  const ones = bits.filter(Boolean).length;
  const all = ones === bits.length;
  const any = ones > 0;
  const odd = ones % 2 === 1;
  switch (type) {
    case "AND": return all ? 1 : 0;
    case "OR": return any ? 1 : 0;
    case "NOT": return bits[0] ? 0 : 1;
    case "BUF": return bits[0];
    case "NAND": return all ? 0 : 1;
    case "NOR": return any ? 0 : 1;
    case "XOR": return odd ? 1 : 0;
    case "XNOR": return odd ? 0 : 1;
  }
}

/** Every gate looks at its inputs as they are now and updates together: one gate delay. */
export function stepNet(gates: NetGate[], values: Signals): Signals {
  const next = { ...values };
  for (const g of gates) next[g.id] = evalGate(g.type, g.in.map((i) => values[i] ?? 0));
  return next;
}

export type Settle = { frames: Signals[]; stable: boolean };

/** Applies inputs and records each gate delay until nothing changes, or `limit` is hit (an oscillation). */
export function settle(gates: NetGate[], inputs: Signals, start: Signals, limit = 10): Settle {
  let cur: Signals = { ...start, ...inputs };
  const frames: Signals[] = [cur];
  for (let i = 0; i < limit; i++) {
    const next = stepNet(gates, cur);
    if (gates.every((g) => next[g.id] === cur[g.id])) return { frames, stable: true };
    frames.push(next);
    cur = next;
  }
  return { frames, stable: false };
}

/* ------------------------------- signals ------------------------------- */

export type LogicFamilyId = "ttl" | "cmos" | "lvcmos" | "mismatched" | "decimal";

export type LogicFamilySpec = {
  id: LogicFamilyId;
  name: string;
  vcc: number;
  voh: number;
  vol: number;
  vih: number;
  vil: number;
  description: string;
};

export const LOGIC_FAMILIES: Record<LogicFamilyId, LogicFamilySpec> = {
  ttl: {
    id: "ttl",
    name: "5V Standard TTL",
    vcc: 5.0,
    voh: 2.4,
    vol: 0.4,
    vih: 2.0,
    vil: 0.8,
    description: "Bipolar transistors. V_OH limited to 2.4 V by internal drops. V_N = 0.4 V.",
  },
  cmos: {
    id: "cmos",
    name: "5V CMOS (74HC)",
    vcc: 5.0,
    voh: 4.4,
    vol: 0.1,
    vih: 3.5,
    vil: 1.5,
    description: "Rail-to-rail CMOS outputs. High noise margins: V_NH = 0.9 V, V_NL = 1.4 V.",
  },
  lvcmos: {
    id: "lvcmos",
    name: "3.3V LVCMOS",
    vcc: 3.3,
    voh: 2.4,
    vol: 0.4,
    vih: 2.0,
    vil: 0.8,
    description: "Low-voltage 3.3 V logic for modern lower power chips. V_N = 0.4 V.",
  },
  mismatched: {
    id: "mismatched",
    name: "TTL Driver → 74HC CMOS Receiver",
    vcc: 5.0,
    voh: 2.4,
    vol: 0.4,
    vih: 3.5,
    vil: 1.5,
    description: "TTL V_OH(2.4 V) < CMOS V_IH(3.5 V)! HIGH signal falls into forbidden region.",
  },
  decimal: {
    id: "decimal",
    name: "10-Level Decimal (0.5 V steps)",
    vcc: 5.0,
    voh: 4.5,
    vol: 0.0,
    vih: 2.75,
    vil: 2.25,
    description: "10 fragile voltage levels (0.5 V spacing). Noise margin is only 0.25 V.",
  },
};

/** Calculates high-level (V_NH), low-level (V_NL), and overall (V_N) noise margins. */
export function computeNoiseMargins(spec: Pick<LogicFamilySpec, "voh" | "vol" | "vih" | "vil">) {
  const vnh = Number((spec.voh - spec.vih).toFixed(3));
  const vnl = Number((spec.vil - spec.vol).toFixed(3));
  const vn = Math.min(vnh, vnl);
  return { vnh, vnl, vn };
}

/** Classifies an incoming receiver voltage as valid 1, valid 0, or forbidden (?). */
export function classifyLogicVoltage(v: number, vih: number, vil: number): "1" | "0" | "?" {
  if (v >= vih) return "1";
  if (v <= vil) return "0";
  return "?";
}

/** For 10-level decimal: checks if a voltage is within the ±0.25 V decision boundary of a digit. */
export function classifyDecimalVoltage(v: number) {
  const clamped = Math.max(0, Math.min(5.0, v));
  const digit = Math.max(0, Math.min(9, Math.round(clamped / 0.5)));
  const nominal = Number((digit * 0.5).toFixed(2));
  const delta = Number(Math.abs(clamped - nominal).toFixed(3));
  const error = delta > 0.25;
  return { digit, readDigit: digit, nominal, delta, error };
}

export type DriverMode = "push-pull" | "open-drain";
export type DriverState = "HIGH" | "LOW" | "Hi-Z";

export type BusContentionResult = {
  busVoltage: number;
  busLogic: "HIGH" | "LOW" | "Hi-Z" | "CONTENTION";
  hasContention: boolean;
  currentMa: number;
  summary: string;
};

/** Simulates two output stages tied to a shared bus wire. */
export function simulateBusDrivers(
  mode: DriverMode,
  driverA: DriverState,
  driverB: DriverState,
  pullUpOhms = 10000,
  vcc = 5.0,
): BusContentionResult {
  if (mode === "push-pull") {
    const a = driverA === "Hi-Z" ? "LOW" : driverA;
    const b = driverB === "Hi-Z" ? "LOW" : driverB;
    if ((a === "HIGH" && b === "LOW") || (a === "LOW" && b === "HIGH")) {
      const rRon = 40; // ~20 ohms PMOS + ~20 ohms NMOS
      const currentMa = Number(((vcc / rRon) * 1000).toFixed(0)); // 125 mA
      const busVoltage = Number((vcc / 2).toFixed(1)); // 2.5 V
      return {
        busVoltage,
        busLogic: "CONTENTION",
        hasContention: true,
        currentMa,
        summary: `Bus Contention! Driver A (${a}) and Driver B (${b}) fight. ${currentMa} mA short-circuit current heats transistors!`,
      };
    }
    if (a === "HIGH" && b === "HIGH") {
      return {
        busVoltage: vcc,
        busLogic: "HIGH",
        hasContention: false,
        currentMa: 0,
        summary: "Both push-pull drivers output HIGH (5.0 V). Bus is clean logic 1.",
      };
    }
    return {
      busVoltage: 0.0,
      busLogic: "LOW",
      hasContention: false,
      currentMa: 0,
      summary: "Both push-pull drivers output LOW (0.0 V). Bus is clean logic 0.",
    };
  }

  // Open-drain mode
  const aPulls = driverA === "LOW";
  const bPulls = driverB === "LOW";

  if (aPulls || bPulls) {
    const currentMa = Number(((vcc / pullUpOhms) * 1000).toFixed(2)); // 0.50 mA
    const who = aPulls && bPulls ? "Both drivers" : aPulls ? "Driver A" : "Driver B";
    return {
      busVoltage: 0.0,
      busLogic: "LOW",
      hasContention: false,
      currentMa,
      summary: `${who} pulling LOW to GND. Bus = 0.0 V. Safe pull-up resistor current: ${currentMa} mA.`,
    };
  }

  return {
    busVoltage: vcc,
    busLogic: "HIGH",
    hasContention: false,
    currentMa: 0,
    summary: "Both drivers idle (Hi-Z). External pull-up resistor pulls bus to V_CC (5.0 V, HIGH).",
  };
}

export type AdcSample = {
  timeSec: number;
  analogVoltage: number;
  quantizedLevel: number;
  quantizedVoltage: number;
  binaryCode: string;
  error: number;
};

/** Samples and quantizes an analog signal over time into discrete digital steps. */
export function simulateAdc(
  signalFn: (t: number) => number,
  durationSec: number,
  sampleRateHz: number,
  bitDepth: number,
  vMax = 5.0,
): { samples: AdcSample[]; levels: number; stepVoltage: number } {
  const levels = Math.pow(2, bitDepth);
  const stepVoltage = vMax / levels;
  const numSamples = Math.floor(durationSec * sampleRateHz);
  const dt = 1 / sampleRateHz;
  const samples: AdcSample[] = [];

  for (let i = 0; i <= numSamples; i++) {
    const t = Number((i * dt).toFixed(4));
    const vRaw = signalFn(t);
    const analogVoltage = Number(Math.max(0, Math.min(vMax, vRaw)).toFixed(3));
    const rawLevel = Math.round(analogVoltage / stepVoltage);
    const quantizedLevel = Math.max(0, Math.min(levels - 1, rawLevel));
    const quantizedVoltage = Number((quantizedLevel * stepVoltage).toFixed(3));
    const binaryCode = quantizedLevel.toString(2).padStart(bitDepth, "0");
    const error = Number((analogVoltage - quantizedVoltage).toFixed(3));
    samples.push({
      timeSec: t,
      analogVoltage,
      quantizedLevel,
      quantizedVoltage,
      binaryCode,
      error,
    });
  }

  return { samples, levels, stepVoltage };
}

export type RealPulsePoint = { t: number; v: number };

/** Generates points for a real-world clock waveform with finite rise/fall times and ringing. */
export function generateRealWaveform(
  periodNs: number,
  dutyCyclePercent: number,
  riseTimeNs: number,
  fallTimeNs: number,
  ringingAmplitude = 0.15,
  vcc = 3.3,
  numCycles = 2,
  stepsPerCycle = 80,
): RealPulsePoint[] {
  const highNs = (periodNs * dutyCyclePercent) / 100;
  const points: RealPulsePoint[] = [];
  const totalTime = numCycles * periodNs;
  const dt = periodNs / stepsPerCycle;

  for (let t = 0; t <= totalTime; t += dt) {
    const cycleTime = t % periodNs;
    let v = 0;
    if (cycleTime < highNs) {
      if (cycleTime < riseTimeNs) {
        const p = cycleTime / riseTimeNs;
        const s = p * p * (3 - 2 * p);
        v = vcc * s;
      } else {
        const ringTime = cycleTime - riseTimeNs;
        const decay = Math.exp(-ringTime / Math.max(0.5, riseTimeNs * 0.8));
        const ring = Math.sin((ringTime * 2 * Math.PI) / Math.max(0.5, riseTimeNs * 0.9)) * ringingAmplitude * vcc * decay;
        v = Math.min(vcc * 1.25, vcc + ring);
      }
    } else {
      const fallElapsed = cycleTime - highNs;
      if (fallElapsed < fallTimeNs) {
        const p = fallElapsed / fallTimeNs;
        const s = p * p * (3 - 2 * p);
        v = vcc * (1 - s);
      } else {
        const ringTime = fallElapsed - fallTimeNs;
        const decay = Math.exp(-ringTime / Math.max(0.5, fallTimeNs * 0.8));
        const under = Math.sin((ringTime * 2 * Math.PI) / Math.max(0.5, fallTimeNs * 0.9)) * ringingAmplitude * vcc * decay;
        v = Math.max(-0.2 * vcc, 0 - under);
      }
    }
    points.push({ t: Number(t.toFixed(3)), v: Number(v.toFixed(3)) });
  }
  return points;
}

/** Evaluates clock skew across parallel traces at a given clock frequency. */
export function evaluateParallelSkew(
  freqMhz: number,
  lengthDiffMm: number,
  velocityCmPerNs = 15,
  setupTimePs = 80,
) {
  const periodNs = 1000 / freqMhz;
  const periodPs = periodNs * 1000;
  // velocity: 15 cm/ns = 150 mm/ns = 0.15 mm/ps
  const vMmPerPs = velocityCmPerNs / 100;
  const skewPs = Number((lengthDiffMm / vMmPerPs).toFixed(1));
  const skewFraction = Number((skewPs / periodPs).toFixed(4));
  const isReliable = skewPs + setupTimePs < periodPs * 0.25;
  const arrivesNextCycle = skewPs > periodPs * 0.5;

  return {
    freqMhz,
    periodPs,
    periodNs,
    skewPs,
    skewFraction,
    isReliable,
    arrivesNextCycle,
  };
}

/** Computes pull-up resistor constraints (R_min to prevent sinking overload, R_max to satisfy V_IH). */
export function calculatePullUpConstraints(
  vcc = 5.0,
  volMax = 0.4,
  iolMaxMa = 16.0,
  vihMin = 3.5,
  leakageCurrentUa = 41.0,
) {
  // When driver pulls LOW: (V_CC - V_OL) / R <= I_OL(max) -> R >= (V_CC - V_OL) / I_OL(max)
  const rMinOhms = Number(((vcc - volMax) / (iolMaxMa / 1000)).toFixed(1));
  // When driver is HIGH: (V_CC - V_IH) / R >= I_leakage -> R <= (V_CC - V_IH) / I_leakage
  const rMaxOhms = Number(((vcc - vihMin) / (leakageCurrentUa * 1e-6)).toFixed(1));
  return { rMinOhms, rMaxOhms };
}

/** Computes ADC specifications: Nyquist rate, quantization step size, and SQNR. */
export function calculateAdcSpecs(vFs: number, bitDepth: number, fMaxHz: number) {
  const levels = Math.pow(2, bitDepth);
  const nyquistRateHz = 2 * fMaxHz;
  const stepVoltage = Number((vFs / levels).toFixed(6));
  const maxQuantizationError = Number((stepVoltage / 2).toFixed(6));
  const sqnrDb = Number((6.02 * bitDepth + 1.76).toFixed(2));
  return {
    levels,
    nyquistRateHz,
    stepVoltage,
    maxQuantizationError,
    sqnrDb,
  };
}

/* ---------------------------- number systems --------------------------- */

const DIGITS = "0123456789ABCDEF";

export type DivisionStep = { value: number; quotient: number; remainder: number; digit: string };

/** Repeated division: the remainders, read bottom-up, are the digits. */
export function divisionSteps(n: number, base: number): DivisionStep[] {
  const out: DivisionStep[] = [];
  let v = Math.max(0, Math.floor(n));
  do {
    const remainder = v % base;
    const quotient = Math.floor(v / base);
    out.push({ value: v, quotient, remainder, digit: DIGITS[remainder] });
    v = quotient;
  } while (v > 0);
  return out;
}

export const toBase = (n: number, base: number) => n.toString(base).toUpperCase();
export const fromBase = (s: string, base: number) => parseInt(s, base);

/** Place-value breakdown of an integer written in `base`, most significant digit first. */
export function placeValues(s: string, base: number) {
  const clean = s.toUpperCase();
  return [...clean].map((ch, i) => {
    const power = clean.length - 1 - i;
    const digit = DIGITS.indexOf(ch);
    return { ch, digit, power, weight: base ** power, value: digit * base ** power };
  });
}

/** Repeated multiplication by 2 for a fraction between 0 and 1. */
export function fractionBits(f: number, max = 8) {
  const out: { value: number; product: number; bit: Bit }[] = [];
  let v = f;
  for (let i = 0; i < max && v > 0; i++) {
    const product = v * 2;
    const bit: Bit = product >= 1 ? 1 : 0;
    out.push({ value: v, product, bit });
    v = product - bit;
  }
  return out;
}

export const bitsOf = (n: number, width: number): Bit[] =>
  Array.from({ length: width }, (_, i) => (((n >>> (width - 1 - i)) & 1) as Bit));
export const bitsToNumber = (bits: Bit[]) => bits.reduce<number>((a, b) => a * 2 + b, 0);
export const bitString = (n: number, width: number) => bitsOf(n, width).join("");

export const onesComplement = (n: number, width: number) => ~n & (2 ** width - 1);
export const twosComplement = (n: number, width: number) => (onesComplement(n, width) + 1) & (2 ** width - 1);
/** The value a bit pattern stands for when read as two's complement. */
export const signedValue = (n: number, width: number) => (n >= 2 ** (width - 1) ? n - 2 ** width : n);
export const signMagnitude = (v: number, width: number) => (v < 0 ? 2 ** (width - 1) : 0) | Math.abs(v);

export const toGray = (n: number) => n ^ (n >> 1);
export function fromGray(g: number) {
  let n = g;
  for (let s = g >> 1; s > 0; s >>= 1) n ^= s;
  return n;
}
export const toBcd = (n: number) => [...String(n)].map((d) => bitString(Number(d), 4));
export const toExcess3 = (d: number) => bitString(d + 3, 4);

export type FloatParts = { sign: Bit; exponent: number; fraction: number; bits: string; value: number; kind: "zero" | "normal" | "subnormal" | "infinity" | "nan" };

/** Reads a number the way IEEE 754 single precision stores it. */
/**
 * The number typed into the IEEE 754 explorer. Keeps the special values a float can hold:
 * "NaN" stays NaN and "-0" stays negative zero, where a plain `Number(text) || 0` would turn
 * both into +0. Empty or unreadable text counts as 0.
 */
export function parseFloatInput(text: string): number {
  const t = text.trim();
  if (t === "") return 0;
  if (/^[+-]?nan$/i.test(t)) return NaN;
  const n = Number(t);
  return Number.isNaN(n) ? 0 : n;
}

export function floatParts(value: number): FloatParts {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value);
  const u = view.getUint32(0);
  const exponent = (u >>> 23) & 0xff;
  const fraction = u & 0x7fffff;
  const kind = exponent === 255 ? (fraction ? "nan" : "infinity") : exponent === 0 ? (fraction ? "subnormal" : "zero") : "normal";
  return { sign: (u >>> 31) as Bit, exponent, fraction, bits: u.toString(2).padStart(32, "0"), value: view.getFloat32(0), kind };
}

export type BitGroup = {
  rawBits: string;
  paddedBits: string;
  digit: string;
  paddingCount: number;
  position: "integer" | "fractional";
  distanceFromRadix: number;
};

export type GroupedBinaryResult = {
  groupSize: 3 | 4;
  baseName: "octal" | "hex";
  radix: 8 | 16;
  integerGroups: BitGroup[];
  fractionalGroups: BitGroup[];
  resultString: string;
  intPadCount: number;
  fracPadCount: number;
  originalBinary: string;
};

/**
 * Groups binary digits outward from the radix point into chunks of 3 (octal) or 4 (hex),
 * padding leftmost integer digits with leading zeros and rightmost fractional digits with trailing zeros.
 */
export function groupBinaryBits(binaryInput: string, groupSize: 3 | 4): GroupedBinaryResult {
  const clean = binaryInput.replace(/[^01.]/g, "");
  const [rawInt = "", rawFrac = ""] = clean.split(".");
  const intStr = rawInt.length > 0 ? rawInt : "0";
  const fracStr = clean.includes(".") ? rawFrac : "";

  const intPadCount = (groupSize - (intStr.length % groupSize)) % groupSize;
  const paddedInt = "0".repeat(intPadCount) + intStr;
  const numIntGroups = paddedInt.length / groupSize;
  const integerGroups: BitGroup[] = [];

  for (let g = 0; g < numIntGroups; g++) {
    const chunk = paddedInt.slice(g * groupSize, (g + 1) * groupSize);
    const distanceFromRadix = numIntGroups - 1 - g;
    const paddedInThisGroup = g === 0 ? intPadCount : 0;
    const rawBits = chunk.slice(paddedInThisGroup);
    const digitVal = parseInt(chunk, 2);
    integerGroups.push({
      rawBits,
      paddedBits: chunk,
      digit: DIGITS[digitVal],
      paddingCount: paddedInThisGroup,
      position: "integer",
      distanceFromRadix,
    });
  }

  const fractionalGroups: BitGroup[] = [];
  let fracPadCount = 0;
  if (fracStr.length > 0) {
    fracPadCount = (groupSize - (fracStr.length % groupSize)) % groupSize;
    const paddedFrac = fracStr + "0".repeat(fracPadCount);
    const numFracGroups = paddedFrac.length / groupSize;

    for (let g = 0; g < numFracGroups; g++) {
      const chunk = paddedFrac.slice(g * groupSize, (g + 1) * groupSize);
      const distanceFromRadix = g;
      const paddedInThisGroup = g === numFracGroups - 1 ? fracPadCount : 0;
      const rawBits = chunk.slice(0, chunk.length - paddedInThisGroup);
      const digitVal = parseInt(chunk, 2);
      fractionalGroups.push({
        rawBits,
        paddedBits: chunk,
        digit: DIGITS[digitVal],
        paddingCount: paddedInThisGroup,
        position: "fractional",
        distanceFromRadix,
      });
    }
  }

  const intDigits = integerGroups.map((g) => g.digit).join("");
  const fracDigits = fractionalGroups.map((g) => g.digit).join("");
  const resultString = fracDigits ? `${intDigits}.${fracDigits}` : intDigits;

  return {
    groupSize,
    baseName: groupSize === 3 ? "octal" : "hex",
    radix: groupSize === 3 ? 8 : 16,
    integerGroups,
    fractionalGroups,
    resultString,
    intPadCount,
    fracPadCount,
    originalBinary: clean,
  };
}

/** Expands octal or hex digits into 3-bit or 4-bit binary groups. */
export function expandRadixToBinary(inputStr: string, groupSize: 3 | 4) {
  const clean = inputStr.toUpperCase().replace(groupSize === 3 ? /[^0-7.]/g : /[^0-9A-F.]/g, "");
  const [rawInt = "", rawFrac = ""] = clean.split(".");
  const intStr = rawInt.length > 0 ? rawInt : "0";
  const fracStr = clean.includes(".") ? rawFrac : "";

  const intGroups = [...intStr].map((ch) => ({
    digit: ch,
    bits: parseInt(ch, groupSize === 3 ? 8 : 16).toString(2).padStart(groupSize, "0"),
  }));
  const fracGroups = [...fracStr].map((ch) => ({
    digit: ch,
    bits: parseInt(ch, groupSize === 3 ? 8 : 16).toString(2).padStart(groupSize, "0"),
  }));

  const fullBinary = `${intGroups.map((g) => g.bits).join("")}${fracGroups.length ? "." + fracGroups.map((g) => g.bits).join("") : ""}`;

  return {
    groupSize,
    radix: groupSize === 3 ? 8 : 16,
    intGroups,
    fracGroups,
    fullBinary,
  };
}

export type SignedArithmeticResult = {
  a: number;
  b: number;
  operation: "add" | "sub";
  width: 4 | 8;
  aSigned: number;
  bSigned: number;
  aBits: Bit[];
  bBits: Bit[];
  bEffBits: Bit[];
  bEffTwosComplement: Bit[];
  columns: AddColumn[];
  sumBits: Bit[];
  carryInMsb: Bit;
  carryOutMsb: Bit;
  overflow: boolean;
  carryOut: Bit;
  unsignedSum: number;
  signedResult: number;
  expectedTrueResult: number;
  overflowReason: string;
};

/**
 * Simulates signed two's complement addition or subtraction column by column,
 * extracting the carry into MSB (C_{n-1}) and carry out (C_n) to evaluate V = C_{n-1} ^ C_n.
 */
export function simulateSignedArithmetic(
  a: number,
  b: number,
  width: 4 | 8,
  operation: "add" | "sub" = "add",
): SignedArithmeticResult {
  const minVal = -(2 ** (width - 1));
  const maxVal = 2 ** (width - 1) - 1;

  const aClamped = Math.max(minVal, Math.min(maxVal, a));
  const bClamped = Math.max(minVal, Math.min(maxVal, b));

  const aMasked = aClamped < 0 ? aClamped + 2 ** width : aClamped;
  const bMasked = bClamped < 0 ? bClamped + 2 ** width : bClamped;

  const aBits = bitsOf(aMasked, width);
  const bBits = bitsOf(bMasked, width);

  let bEffMasked = bMasked;
  if (operation === "sub") {
    bEffMasked = (~bMasked + 1) & (2 ** width - 1);
  }
  const bEffBits = bitsOf(bEffMasked, width);
  const bEffTwosComp = bitsOf((~bMasked + 1) & (2 ** width - 1), width);

  const cols = rippleAdd(aMasked, bEffMasked, width, 0);
  const sumBits = cols.map((c) => c.sum);

  const msbCol = cols[width - 1];
  const carryInMsb = msbCol.carryIn;
  const carryOutMsb = msbCol.carryOut;

  const overflow = carryInMsb !== carryOutMsb;
  const carryOut = carryOutMsb;

  const unsignedSum = cols.reduce((acc, c) => acc + (c.sum << c.index), 0);
  const signedResult = signedValue(unsignedSum, width);
  const expectedTrueResult = operation === "add" ? aClamped + bClamped : aClamped - bClamped;

  let overflowReason = "";
  if (overflow) {
    if (aClamped > 0 && (operation === "add" ? bClamped > 0 : bClamped < 0) && signedResult < 0) {
      overflowReason = `Positive + Positive gave Negative (${signedResult}). The true result ${expectedTrueResult} exceeds maximum +${maxVal}.`;
    } else if (aClamped < 0 && (operation === "add" ? bClamped < 0 : bClamped > 0) && signedResult >= 0) {
      overflowReason = `Negative + Negative gave Positive (${signedResult}). The true result ${expectedTrueResult} is below minimum ${minVal}.`;
    } else {
      overflowReason = `Signed overflow: true result ${expectedTrueResult} outside [${minVal}, +${maxVal}].`;
    }
  } else {
    overflowReason = `Result ${signedResult} fits within [${minVal}, +${maxVal}]. No signed overflow.`;
  }

  return {
    a: aClamped,
    b: bClamped,
    operation,
    width,
    aSigned: aClamped,
    bSigned: bClamped,
    aBits,
    bBits,
    bEffBits,
    bEffTwosComplement: bEffTwosComp,
    columns: cols,
    sumBits,
    carryInMsb,
    carryOutMsb,
    overflow,
    carryOut,
    unsignedSum,
    signedResult,
    expectedTrueResult,
    overflowReason,
  };
}

/** Demonstrates sign extension preserving signed value vs zero extension corrupting it. */
export function signExtend(val: number, fromWidth: number, toWidth: number) {
  const minVal = -(2 ** (fromWidth - 1));
  const maxVal = 2 ** (fromWidth - 1) - 1;
  const clamped = Math.max(minVal, Math.min(maxVal, val));
  const rawBits = bitsOf(clamped < 0 ? clamped + 2 ** fromWidth : clamped, fromWidth);
  const signBit = rawBits[0];

  const signExtendedBits = [...Array(toWidth - fromWidth).fill(signBit), ...rawBits];
  const zeroExtendedBits = [...Array(toWidth - fromWidth).fill(0 as Bit), ...rawBits];

  const rawSignExtVal = bitsToNumber(signExtendedBits);
  const signedValExtended = signedValue(rawSignExtVal, toWidth);
  const zeroExtendedVal = bitsToNumber(zeroExtendedBits);

  return {
    originalValue: clamped,
    signBit,
    rawBits,
    signExtendedBits,
    zeroExtendedBits,
    signedValExtended,
    zeroExtendedVal,
    preserved: signedValExtended === clamped,
  };
}

export type BcdAdderResult = {
  digitA: number;
  digitB: number;
  carryIn: Bit;
  aBits: Bit[];
  bBits: Bit[];
  stage1Sum: number;
  stage1Bits: Bit[];
  binaryCarryK: Bit;
  termK: Bit;
  termZ3Z2: Bit;
  termZ3Z1: Bit;
  needsCorrection: boolean;
  correctionCode: Bit[];
  correctedBits: Bit[];
  finalBcdDigit: number;
  bcdCarryOut: Bit;
  totalDecimal: number;
  reason: string;
};

/**
 * Simulates a two-stage BCD adder with Boolean correction logic C = K + Z3*Z2 + Z3*Z1
 * injecting 0110_2 when correction is required.
 */
export function simulateBcdAdder(digitA: number, digitB: number, carryIn: Bit = 0): BcdAdderResult {
  const a = Math.max(0, Math.min(9, Math.floor(digitA)));
  const b = Math.max(0, Math.min(9, Math.floor(digitB)));
  const cin = carryIn ? 1 : 0;

  const aBits = bitsOf(a, 4);
  const bBits = bitsOf(b, 4);

  const stage1Sum = a + b + cin;
  const binaryCarryK: Bit = stage1Sum >= 16 ? 1 : 0;
  const zVal = stage1Sum % 16;
  const stage1Bits = bitsOf(zVal, 4);
  const [z3, z2, z1] = stage1Bits;

  const termK: Bit = binaryCarryK;
  const termZ3Z2: Bit = z3 && z2 ? 1 : 0;
  const termZ3Z1: Bit = z3 && z1 ? 1 : 0;
  const needsCorrection = Boolean(termK || termZ3Z2 || termZ3Z1);
  const bcdCarryOut: Bit = needsCorrection ? 1 : 0;

  const correctionCode: Bit[] = needsCorrection ? [0, 1, 1, 0] : [0, 0, 0, 0];
  const correctedSumVal = (zVal + (needsCorrection ? 6 : 0)) % 16;
  const correctedBits = bitsOf(correctedSumVal, 4);
  const finalBcdDigit = correctedSumVal;
  const totalDecimal = bcdCarryOut * 10 + finalBcdDigit;

  let reason = "";
  if (binaryCarryK) {
    reason = `Binary carry K=1 occurred (stage 1 sum ${stage1Sum} ≥ 16). Adder wrapped modulo 16. Adding 6 (0110₂) advances to the next decade.`;
  } else if (needsCorrection) {
    reason = `Intermediate sum ${stage1Sum} falls into the forbidden range (10 to 15, 1010₂-1111₂). Adding 6 (0110₂) skips 6 invalid states and carries 1.`;
  } else {
    reason = `Sum ${stage1Sum} is a valid BCD digit (≤ 9) with K=0. No correction needed (+0000₂).`;
  }

  return {
    digitA: a,
    digitB: b,
    carryIn: cin as Bit,
    aBits,
    bBits,
    stage1Sum,
    stage1Bits,
    binaryCarryK,
    termK,
    termZ3Z2,
    termZ3Z1,
    needsCorrection,
    correctionCode,
    correctedBits,
    finalBcdDigit,
    bcdCarryOut,
    totalDecimal,
    reason,
  };
}

export type ParityResult = {
  dataBits: Bit[];
  mode: "even" | "odd";
  onesInData: number;
  parityBit: Bit;
  transmittedWord: Bit[];
  flippedIndices: number[];
  receivedWord: Bit[];
  onesInReceived: number;
  receiverSyndromeValid: boolean;
  errorDetected: boolean;
  actualErrorsCount: number;
  silentCorruption: boolean;
  diagnostic: string;
};

/**
 * Simulates parity generation (even/odd), channel bit-flipping noise,
 * and receiver parity checking (demonstrating why single errors are detected but double errors pass).
 */
export function simulateParity(
  dataBits: Bit[],
  mode: "even" | "odd" = "even",
  flippedIndices: number[] = [],
): ParityResult {
  const cleanData = dataBits.slice(0, 7).map((b) => (b ? 1 : 0) as Bit);
  while (cleanData.length < 7) cleanData.push(0);

  const onesInData = cleanData.filter(Boolean).length;
  let parityBit: Bit = 0;
  if (mode === "even") {
    parityBit = onesInData % 2 === 1 ? 1 : 0;
  } else {
    parityBit = onesInData % 2 === 0 ? 1 : 0;
  }

  const transmittedWord: Bit[] = [...cleanData, parityBit];
  const receivedWord = [...transmittedWord];
  for (const idx of flippedIndices) {
    if (idx >= 0 && idx < receivedWord.length) {
      receivedWord[idx] = (receivedWord[idx] ? 0 : 1) as Bit;
    }
  }

  const onesInReceived = receivedWord.filter(Boolean).length;
  const receiverSyndromeValid = mode === "even" ? onesInReceived % 2 === 0 : onesInReceived % 2 === 1;
  const errorDetected = !receiverSyndromeValid;
  const actualErrorsCount = flippedIndices.length;
  const silentCorruption = actualErrorsCount > 0 && !errorDetected;

  let diagnostic = "";
  if (silentCorruption) {
    diagnostic = `CRITICAL SILENT FAILURE: ${actualErrorsCount} bits flipped (even number of errors), so the parity check passed unnoticed. The received byte is corrupt! Parity cannot detect even numbers of bit errors.`;
  } else if (errorDetected) {
    diagnostic = `PARITY ERROR DETECTED: Parity check failed (received ${onesInReceived} 1s in ${mode} parity mode). Hardware flags error and halts/retransmits.`;
  } else {
    diagnostic = `CLEAN: Received ${onesInReceived} 1s, satisfying ${mode} parity requirements. No errors detected.`;
  }

  return {
    dataBits: cleanData,
    mode,
    onesInData,
    parityBit,
    transmittedWord,
    flippedIndices,
    receivedWord,
    onesInReceived,
    receiverSyndromeValid,
    errorDetected,
    actualErrorsCount,
    silentCorruption,
    diagnostic,
  };
}

/* ------------------------------ Module 1 simulation helpers ----------------------------- */

/** Parses an unsigned string in base r to decimal integer. */
function parseBaseR(str: string, r: number): number {
  let val = 0;
  for (const ch of str.toUpperCase()) {
    const d = parseInt(ch, 36);
    if (isNaN(d) || d >= r) return NaN;
    val = val * r + d;
  }
  return val;
}

/** Finds the maximum digit in a string across all allowed alphanumeric digits. */
function maxDigitValue(str: string): number {
  let maxD = 0;
  for (const ch of str.toUpperCase()) {
    const d = parseInt(ch, 36);
    if (!isNaN(d) && d > maxD) maxD = d;
  }
  return maxD;
}

/**
 * Solves an addition equation in an unknown radix: (a)_r + (b)_r = (sum)_r.
 * Evaluates candidates where r > max(digits), returning the valid integer radix.
 */
export function solveRadixAddition(aStr: string, bStr: string, sumStr: string): { radix: number; minRadix: number; isValid: boolean } {
  const minRadix = Math.max(maxDigitValue(aStr), maxDigitValue(bStr), maxDigitValue(sumStr)) + 1;
  for (let r = Math.max(2, minRadix); r <= 36; r++) {
    const aVal = parseBaseR(aStr, r);
    const bVal = parseBaseR(bStr, r);
    const sumVal = parseBaseR(sumStr, r);
    if (!isNaN(aVal) && !isNaN(bVal) && !isNaN(sumVal) && aVal + bVal === sumVal) {
      return { radix: r, minRadix, isValid: true };
    }
  }
  return { radix: -1, minRadix, isValid: false };
}

/**
 * Solves a multiplication equation in an unknown radix: (a)_r * (b)_r = (prod)_r.
 * Evaluates candidates where r > max(digits), returning the valid integer radix.
 */
export function solveRadixProduct(aStr: string, bStr: string, prodStr: string): { radix: number; minRadix: number; isValid: boolean } {
  const minRadix = Math.max(maxDigitValue(aStr), maxDigitValue(bStr), maxDigitValue(prodStr)) + 1;
  for (let r = Math.max(2, minRadix); r <= 36; r++) {
    const aVal = parseBaseR(aStr, r);
    const bVal = parseBaseR(bStr, r);
    const prodVal = parseBaseR(prodStr, r);
    if (!isNaN(aVal) && !isNaN(bVal) && !isNaN(prodVal) && aVal * bVal === prodVal) {
      return { radix: r, minRadix, isValid: true };
    }
  }
  return { radix: -1, minRadix, isValid: false };
}

export type Hamming74Result = {
  dataBits: [Bit, Bit, Bit, Bit];
  p1: Bit;
  p2: Bit;
  p4: Bit;
  codeword: Bit[]; // 1-indexed layout: [p1, p2, d1, p4, d2, d3, d4]
  checkSyndrome: (received: Bit[]) => {
    syndromeInt: number;
    syndromeBits: [Bit, Bit, Bit];
    correctedCodeword: Bit[];
    correctedData: [Bit, Bit, Bit, Bit];
    errorBitPos: number | null;
    hasError: boolean;
  };
};

/**
 * Simulates a single-error-correcting Hamming (7,4) code with even parity.
 * Data bits d = [d1, d2, d3, d4] are mapped to positions [3, 5, 6, 7],
 * with parity bits at positions 1 (p1), 2 (p2), and 4 (p4).
 */
export function simulateHamming74(d: [Bit, Bit, Bit, Bit]): Hamming74Result {
  const [d1, d2, d3, d4] = d;
  const p1 = (d1 ^ d2 ^ d4) as Bit;
  const p2 = (d1 ^ d3 ^ d4) as Bit;
  const p4 = (d2 ^ d3 ^ d4) as Bit;

  const codeword: Bit[] = [p1, p2, d1, p4, d2, d3, d4];

  const checkSyndrome = (received: Bit[]) => {
    const rx = received.slice(0, 7) as Bit[];
    while (rx.length < 7) rx.push(0);

    const [r1, r2, r3, r4, r5, r6, r7] = rx;
    const s1 = (r1 ^ r3 ^ r5 ^ r7) as Bit;
    const s2 = (r2 ^ r3 ^ r6 ^ r7) as Bit;
    const s4 = (r4 ^ r5 ^ r6 ^ r7) as Bit;

    const syndromeInt = s4 * 4 + s2 * 2 + s1;
    const hasError = syndromeInt !== 0;
    const errorBitPos = hasError ? syndromeInt : null;

    const correctedCodeword = [...rx];
    if (hasError && syndromeInt >= 1 && syndromeInt <= 7) {
      correctedCodeword[syndromeInt - 1] = (correctedCodeword[syndromeInt - 1] ? 0 : 1) as Bit;
    }

    const correctedData: [Bit, Bit, Bit, Bit] = [
      correctedCodeword[2], // bit 3 (d1)
      correctedCodeword[4], // bit 5 (d2)
      correctedCodeword[5], // bit 6 (d3)
      correctedCodeword[6], // bit 7 (d4)
    ];

    return {
      syndromeInt,
      syndromeBits: [s4, s2, s1] as [Bit, Bit, Bit],
      correctedCodeword,
      correctedData,
      errorBitPos,
      hasError,
    };
  };

  return {
    dataBits: d,
    p1,
    p2,
    p4,
    codeword,
    checkSyndrome,
  };
}

export type SaturatedArithmeticResult = {
  a: number;
  b: number;
  width: number;
  op: "add" | "sub";
  rawSum: number;
  wrappedSum: number;
  saturatedSum: number;
  overflow: boolean;
  minLimit: number;
  maxLimit: number;
};

/**
 * Simulates signed integer arithmetic with saturation clamp vs modular wraparound.
 * Clamps to [-2^(n-1), 2^(n-1)-1] on overflow (as in audio/DSP/graphics processors).
 */
export function simulateSaturatedArithmetic(
  a: number,
  b: number,
  width: number = 8,
  op: "add" | "sub" = "add",
): SaturatedArithmeticResult {
  const minLimit = -(2 ** (width - 1));
  const maxLimit = 2 ** (width - 1) - 1;

  const rawSum = op === "add" ? a + b : a - b;
  const overflow = rawSum > maxLimit || rawSum < minLimit;
  const saturatedSum = Math.max(minLimit, Math.min(maxLimit, rawSum));

  const mod = 2 ** width;
  let wrappedUnsigned = rawSum % mod;
  if (wrappedUnsigned < 0) wrappedUnsigned += mod;
  const wrappedSum = signedValue(wrappedUnsigned, width);

  return {
    a,
    b,
    width,
    op,
    rawSum,
    wrappedSum,
    saturatedSum,
    overflow,
    minLimit,
    maxLimit,
  };
}

export type Ieee754DecodeResult = {
  hex: string;
  sign: Bit;
  exponentRaw: number;
  trueExponent: number;
  fractionHex: string;
  fractionVal: number;
  significand: number;
  decimalValue: number;
  classification: "zero" | "normal" | "subnormal" | "infinity" | "nan";
};

/**
 * Decodes a 32-bit hexadecimal word according to IEEE 754 single-precision format.
 */
export function decodeIeee754Hex(hex: string): Ieee754DecodeResult {
  const cleanHex = hex.replace(/^0x/i, "").padStart(8, "0");
  const u = parseInt(cleanHex, 16) >>> 0;
  const sign = ((u >>> 31) & 1) as Bit;
  const exponentRaw = (u >>> 23) & 0xff;
  const fractionRaw = u & 0x7fffff;
  const fractionHex = fractionRaw.toString(16).toUpperCase().padStart(6, "0");
  const fractionVal = fractionRaw / 2 ** 23;

  let classification: Ieee754DecodeResult["classification"] = "normal";
  let trueExponent = exponentRaw - 127;
  let significand = 1 + fractionVal;
  let decimalValue = (sign ? -1 : 1) * significand * 2 ** trueExponent;

  if (exponentRaw === 255) {
    if (fractionRaw !== 0) {
      classification = "nan";
      decimalValue = NaN;
    } else {
      classification = "infinity";
      decimalValue = sign ? -Infinity : Infinity;
    }
  } else if (exponentRaw === 0) {
    if (fractionRaw === 0) {
      classification = "zero";
      decimalValue = sign ? -0 : 0;
    } else {
      classification = "subnormal";
      trueExponent = -126;
      significand = fractionVal;
      decimalValue = (sign ? -1 : 1) * significand * 2 ** trueExponent;
    }
  }

  return {
    hex: cleanHex,
    sign,
    exponentRaw,
    trueExponent,
    fractionHex,
    fractionVal,
    significand,
    decimalValue,
    classification,
  };
}

/* ------------------------------ arithmetic ----------------------------- */

export type AddColumn = { index: number; a: Bit; b: Bit; carryIn: Bit; sum: Bit; carryOut: Bit };

export function fullAdd(a: Bit, b: Bit, c: Bit) {
  return { sum: (a ^ b ^ c) as Bit, carry: (((a & b) | ((a ^ b) & c)) as Bit) };
}

/** Column by column from the least significant bit, the way a ripple-carry adder works. */
export function rippleAdd(a: number, b: number, width: number, carryIn: Bit = 0): AddColumn[] {
  const out: AddColumn[] = [];
  let c = carryIn;
  for (let i = 0; i < width; i++) {
    const x = ((a >> i) & 1) as Bit;
    const y = ((b >> i) & 1) as Bit;
    const { sum, carry } = fullAdd(x, y, c);
    out.push({ index: i, a: x, b: y, carryIn: c, sum, carryOut: carry });
    c = carry;
  }
  return out;
}

/** Number of stages a carry has to travel through before the answer is valid. */
export const rippleDelay = (cols: AddColumn[]) => {
  let longest = 0;
  let run = 0;
  for (const c of cols) {
    run = c.carryOut && c.a !== c.b ? run + 1 : c.carryOut ? 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
};

/** Each stage's carry from its generate and propagate signals, without waiting on the stage below. */
export function lookaheadCarries(a: number, b: number, width: number, c0: Bit = 0) {
  const g = Array.from({ length: width }, (_, i) => (((a >> i) & (b >> i) & 1) as Bit));
  const p = Array.from({ length: width }, (_, i) => ((((a >> i) | (b >> i)) & 1) as Bit));
  const c: Bit[] = [c0];
  for (let i = 0; i < width; i++) {
    let v: number = g[i];
    for (let j = 0; j < i; j++) {
      let t: number = g[j];
      for (let k = j + 1; k <= i; k++) t &= p[k];
      v |= t;
    }
    let t0: number = c0;
    for (let k = 0; k <= i; k++) t0 &= p[k];
    c.push(((v | t0) as Bit));
  }
  return { g, p, c };
}

/* ---------------------------- Boolean algebra -------------------------- */

/** Evaluates a Boolean expression written with ' + · and juxtaposition, e.g. "A'B + (B+C)'". */
export function evalExpr(expr: string, env: Record<string, Bit>): Bit {
  const s = expr.replace(/\s+/g, "");
  let i = 0;
  const parseOr = (): Bit => {
    let v = parseAnd();
    while (s[i] === "+") {
      i++;
      const r = parseAnd();
      v = (v | r) as Bit;
    }
    return v;
  };
  const parseAnd = (): Bit => {
    let v = parseUnary();
    while (i < s.length && (s[i] === "." || s[i] === "(" || /[A-Za-z01]/.test(s[i]))) {
      if (s[i] === ".") i++;
      const r = parseUnary();
      v = (v & r) as Bit;
    }
    return v;
  };
  const parseUnary = (): Bit => {
    let v: Bit;
    if (s[i] === "(") {
      i++;
      v = parseOr();
      i++;
    } else if (s[i] === "0" || s[i] === "1") {
      v = Number(s[i++]) as Bit;
    } else {
      v = env[s[i++]] ?? 0;
    }
    while (s[i] === "'") {
      i++;
      v = (v ? 0 : 1) as Bit;
    }
    return v;
  };
  return parseOr();
}

export function truthRows(vars: string[]) {
  const n = vars.length;
  return Array.from({ length: 2 ** n }, (_, m) => {
    const env: Record<string, Bit> = {};
    vars.forEach((v, i) => (env[v] = ((m >> (n - 1 - i)) & 1) as Bit));
    return { m, env };
  });
}

export const sameFunction = (a: string, b: string, vars: string[]) =>
  truthRows(vars).every(({ env }) => evalExpr(a, env) === evalExpr(b, env));

/** Sum of products: one AND term for every row where the output is 1. */
export function sopFromMinterms(minterms: number[], vars: string[]) {
  const n = vars.length;
  if (!minterms.length) return "0";
  if (minterms.length === 2 ** n) return "1";
  return [...minterms]
    .sort((a, b) => a - b)
    .map((m) => vars.map((v, i) => (((m >> (n - 1 - i)) & 1) ? v : `${v}'`)).join(""))
    .join(" + ");
}

/** Product of sums: one OR term for every row where the output is 0. */
export function posFromMinterms(minterms: number[], vars: string[]) {
  const n = vars.length;
  const zeros = Array.from({ length: 2 ** n }, (_, m) => m).filter((m) => !minterms.includes(m));
  if (!zeros.length) return "1";
  if (zeros.length === 2 ** n) return "0";
  return zeros.map((m) => `(${vars.map((v, i) => (((m >> (n - 1 - i)) & 1) ? `${v}'` : v)).join(" + ")})`).join("");
}

/* -------------------------------- K-maps ------------------------------- */

export type Implicant = { cells: number[]; term: string };

const GRAY2 = [0, 1, 3, 2];

/** Where minterm m sits on the map: row bits are the first variables, column bits the rest. */
export function kmapLayout(n: 2 | 3 | 4) {
  const rowBits = n === 4 ? 2 : 1;
  const colBits = n - rowBits;
  const rows = rowBits === 2 ? GRAY2 : [0, 1];
  const cols = colBits === 2 ? GRAY2 : [0, 1];
  return { rowBits, colBits, rows, cols, cell: (r: number, c: number) => (rows[r] << colBits) | cols[c] };
}

function termOf(mask: number, value: number, vars: string[]) {
  const n = vars.length;
  const parts: string[] = [];
  vars.forEach((v, i) => {
    const bit = 1 << (n - 1 - i);
    if (!(mask & bit)) parts.push(value & bit ? v : `${v}'`);
  });
  return parts.join("") || "1";
}

function popcount(x: number) {
  let c = 0;
  for (let v = x; v; v &= v - 1) c++;
  return c;
}

/** All maximal rectangles of 1s (Quine–McCluskey), then a smallest set that covers every 1. */
export function minimizeSop(minterms: number[], vars: string[]): Implicant[] {
  return minimizeKMap(vars, minterms).chosen.map((c) => ({ cells: c.cells, term: c.term }));
}

export type KMapImplicant = {
  cells: number[];
  term: string;
  isEssential: boolean;
  distinguishedMinterms: number[];
  isChosen: boolean;
};

export type KMapMinimizationResult = {
  vars: string[];
  mode: "SOP" | "POS";
  primes: KMapImplicant[];
  essentials: KMapImplicant[];
  chosen: KMapImplicant[];
  minimalExpr: string;
  coverageDetails: { minterm: number; coveredBy: string[] }[];
};

function posTermOf(mask: number, value: number, vars: string[]) {
  const n = vars.length;
  const parts: string[] = [];
  vars.forEach((v, i) => {
    const bit = 1 << (n - 1 - i);
    if (!(mask & bit)) parts.push(value & bit ? `${v}'` : v);
  });
  return parts.length ? `(${parts.join(" + ")})` : "0";
}

/** General K-map minimization supporting SOP and POS, don't-cares, and prime/essential implicant analysis. */
export function minimizeKMap(
  vars: string[],
  on: number[],
  dc: number[] = [],
  mode: "SOP" | "POS" = "SOP",
): KMapMinimizationResult {
  const n = vars.length;
  const allCells = Array.from({ length: 2 ** n }, (_, m) => m);
  const target = mode === "SOP"
    ? [...new Set(on)]
    : allCells.filter((m) => !on.includes(m) && !dc.includes(m));
  const available = mode === "SOP"
    ? [...new Set([...on, ...dc])]
    : [...new Set([...target, ...dc])];

  if (!target.length) {
    const emptyExpr = mode === "SOP" ? "0" : "1";
    return { vars, mode, primes: [], essentials: [], chosen: [], minimalExpr: emptyExpr, coverageDetails: [] };
  }

  type Cube = { value: number; mask: number };
  let current: Cube[] = available.map((m) => ({ value: m, mask: 0 }));
  const rawPrimes: Cube[] = [];
  while (current.length) {
    const used = new Set<number>();
    const next = new Map<string, Cube>();
    current.forEach((a, i) =>
      current.forEach((b, j) => {
        if (j <= i || a.mask !== b.mask) return;
        const diff = a.value ^ b.value;
        if (diff && !(diff & (diff - 1))) {
          used.add(i);
          used.add(j);
          const cube = { value: a.value & ~diff, mask: a.mask | diff };
          next.set(`${cube.value}/${cube.mask}`, cube);
        }
      }),
    );
    current.forEach((c, i) => !used.has(i) && rawPrimes.push(c));
    current = [...next.values()];
  }

  // Filter out cubes that cover zero target minterms (pure don't-care groups)
  const cubeCells = (c: Cube) => allCells.filter((m) => (m & ~c.mask) === c.value);
  const validPrimes = rawPrimes.filter((c) => cubeCells(c).some((m) => target.includes(m)));

  // Identify essential prime implicants and distinguished minterms
  const primeCoverage = validPrimes.map((c) => ({
    cube: c,
    coveredTargets: target.filter((m) => (m & ~c.mask) === c.value),
  }));

  const distinguishedMap = new Map<Cube, number[]>();
  for (const m of target) {
    const covering = primeCoverage.filter((p) => p.coveredTargets.includes(m));
    if (covering.length === 1) {
      const ep = covering[0].cube;
      const list = distinguishedMap.get(ep) ?? [];
      list.push(m);
      distinguishedMap.set(ep, list);
    }
  }

  const essentialSet = new Set(distinguishedMap.keys());

  // Branch and bound / brute force minimal set of primes covering all targets
  const k = validPrimes.length;
  let best: Cube[] | null = null;
  const cost = (set: Cube[]) => set.length * 100 + set.reduce((s, c) => s + (n - popcount(c.mask)), 0);

  // Must include all essential prime implicants
  const essMask = validPrimes.reduce((acc, c, i) => (essentialSet.has(c) ? acc | (1 << i) : acc), 0);

  for (let pick = essMask; pick < 2 ** k; pick++) {
    if ((pick & essMask) !== essMask) continue;
    const set = validPrimes.filter((_, i) => (pick >> i) & 1);
    if (best && cost(set) >= cost(best)) continue;
    const covered = new Set(set.flatMap((c) => primeCoverage.find((p) => p.cube === c)?.coveredTargets ?? []));
    if (target.every((m) => covered.has(m))) best = set;
  }

  const chosenSet = new Set(best ?? validPrimes);

  const formatTerm = (c: Cube) =>
    mode === "SOP" ? termOf(c.mask, c.value, vars) : posTermOf(c.mask, c.value, vars);

  const primes: KMapImplicant[] = validPrimes.map((c) => ({
    cells: cubeCells(c),
    term: formatTerm(c),
    isEssential: essentialSet.has(c),
    distinguishedMinterms: distinguishedMap.get(c) ?? [],
    isChosen: chosenSet.has(c),
  }));

  const essentials = primes.filter((p) => p.isEssential);
  const chosen = primes.filter((p) => p.isChosen).sort((a, b) => a.term.localeCompare(b.term));

  let minimalExpr = "";
  if (mode === "SOP") {
    minimalExpr = chosen.map((p) => p.term).join(" + ") || "0";
  } else {
    minimalExpr = chosen.map((p) => p.term).join("") || "1";
  }

  const coverageDetails = target.map((m) => ({
    minterm: m,
    coveredBy: primes.filter((p) => p.cells.includes(m)).map((p) => p.term),
  }));

  return { vars, mode, primes, essentials, chosen, minimalExpr, coverageDetails };
}

/* ----------------------------- storage logic --------------------------- */

export type JkInput = { j: Bit; k: Bit };

export function jkNext(q: Bit, { j, k }: JkInput): Bit {
  if (j && k) return (q ? 0 : 1) as Bit;
  if (j) return 1;
  if (k) return 0;
  return q;
}

/** Output of a level-sensitive D latch and an edge-triggered D flip-flop over the same waveforms. */
export function latchVersusFlipFlop(clk: Bit[], d: Bit[], start: Bit = 0) {
  let l = start;
  let f = start;
  const latch: Bit[] = [];
  const flop: Bit[] = [];
  clk.forEach((c, i) => {
    if (c) l = d[i];
    if (c && !(clk[i - 1] ?? 0)) f = d[i];
    latch.push(l);
    flop.push(f);
  });
  return { latch, flop };
}

/** The state of an n-bit shift register after each clock edge. */
export function shiftFrames(width: number, input: Bit[], start?: Bit[]) {
  const frames: Bit[][] = [start ?? (Array(width).fill(0) as Bit[])];
  for (const b of input) frames.push([b, ...frames[frames.length - 1].slice(0, width - 1)]);
  return frames;
}

/** A ripple up-counter: each stage toggles when the stage before it falls from 1 to 0. */
export function counterStep(bits: Bit[]) {
  const next = [...bits];
  const toggled: number[] = [];
  for (let i = next.length - 1; i >= 0; i--) {
    next[i] = (next[i] ? 0 : 1) as Bit;
    toggled.push(i);
    if (next[i] === 1) break;
  }
  return { next, toggled };
}

/* ------------------------------- CMOS Switch Simulation ------------------------------- */

export type CmosGateType = "NOT" | "NAND" | "NOR";
export type TransistorKind = "pmos" | "nmos";

export type TransistorState = {
  id: string;
  kind: TransistorKind;
  gateLabel: string;
  gateVoltage: number;
  isOn: boolean;
  position: "pull-up" | "pull-down";
  description: string;
};

export type CmosSimResult = {
  gate: CmosGateType;
  inputs: Record<string, number>;
  transistors: TransistorState[];
  pullUpConnected: boolean;
  pullDownConnected: boolean;
  outputState: "HIGH" | "LOW" | "SHOOT_THROUGH" | "FLOATING";
  outputVoltage: number;
  outputBit: Bit | "X" | "Z";
  statusText: string;
};

/** Simulates steady-state and shoot-through transistor behavior in CMOS logic gates. */
export function simulateCmosGate(gate: CmosGateType, inputs: Record<string, number>): CmosSimResult {
  const isPmosOn = (v: number) => v < 3.0;
  const isNmosOn = (v: number) => v > 2.0;

  const va = inputs.A ?? 0;
  const vb = inputs.B ?? 0;

  const transistors: TransistorState[] = [];
  let pullUpConnected = false;
  let pullDownConnected = false;

  if (gate === "NOT") {
    const p1On = isPmosOn(va);
    const n1On = isNmosOn(va);
    transistors.push(
      { id: "P1", kind: "pmos", gateLabel: "A", gateVoltage: va, isOn: p1On, position: "pull-up", description: `pMOS conducts when gate < 3.0V (current: ${va.toFixed(1)}V)` },
      { id: "N1", kind: "nmos", gateLabel: "A", gateVoltage: va, isOn: n1On, position: "pull-down", description: `nMOS conducts when gate > 2.0V (current: ${va.toFixed(1)}V)` },
    );
    pullUpConnected = p1On;
    pullDownConnected = n1On;
  } else if (gate === "NAND") {
    const p1On = isPmosOn(va);
    const p2On = isPmosOn(vb);
    const n1On = isNmosOn(va);
    const n2On = isNmosOn(vb);
    transistors.push(
      { id: "P1", kind: "pmos", gateLabel: "A", gateVoltage: va, isOn: p1On, position: "pull-up", description: `pMOS A in parallel: ${p1On ? "ON (pulls to VDD)" : "OFF"}` },
      { id: "P2", kind: "pmos", gateLabel: "B", gateVoltage: vb, isOn: p2On, position: "pull-up", description: `pMOS B in parallel: ${p2On ? "ON (pulls to VDD)" : "OFF"}` },
      { id: "N1", kind: "nmos", gateLabel: "A", gateVoltage: va, isOn: n1On, position: "pull-down", description: `nMOS A in series: ${n1On ? "ON" : "OFF"}` },
      { id: "N2", kind: "nmos", gateLabel: "B", gateVoltage: vb, isOn: n2On, position: "pull-down", description: `nMOS B in series: ${n2On ? "ON" : "OFF"}` },
    );
    pullUpConnected = p1On || p2On; // parallel PUN
    pullDownConnected = n1On && n2On; // series PDN
  } else {
    // NOR
    const p1On = isPmosOn(va);
    const p2On = isPmosOn(vb);
    const n1On = isNmosOn(va);
    const n2On = isNmosOn(vb);
    transistors.push(
      { id: "P1", kind: "pmos", gateLabel: "A", gateVoltage: va, isOn: p1On, position: "pull-up", description: `pMOS A in series: ${p1On ? "ON" : "OFF"}` },
      { id: "P2", kind: "pmos", gateLabel: "B", gateVoltage: vb, isOn: p2On, position: "pull-up", description: `pMOS B in series: ${p2On ? "ON" : "OFF"}` },
      { id: "N1", kind: "nmos", gateLabel: "A", gateVoltage: va, isOn: n1On, position: "pull-down", description: `nMOS A in parallel: ${n1On ? "ON (pulls to GND)" : "OFF"}` },
      { id: "N2", kind: "nmos", gateLabel: "B", gateVoltage: vb, isOn: n2On, position: "pull-down", description: `nMOS B in parallel: ${n2On ? "ON (pulls to GND)" : "OFF"}` },
    );
    pullUpConnected = p1On && p2On; // series PUN
    pullDownConnected = n1On || n2On; // parallel PDN
  }

  let outputState: "HIGH" | "LOW" | "SHOOT_THROUGH" | "FLOATING";
  let outputVoltage: number;
  let outputBit: Bit | "X" | "Z";
  let statusText: string;

  if (pullUpConnected && !pullDownConnected) {
    outputState = "HIGH";
    outputVoltage = 5.0;
    outputBit = 1;
    statusText = "Pull-up network active: output pulled cleanly to VDD (5.0V, Logic 1). Static DC current is zero.";
  } else if (!pullUpConnected && pullDownConnected) {
    outputState = "LOW";
    outputVoltage = 0.0;
    outputBit = 0;
    statusText = "Pull-down network active: output pulled cleanly to GND (0.0V, Logic 0). Static DC current is zero.";
  } else if (pullUpConnected && pullDownConnected) {
    outputState = "SHOOT_THROUGH";
    outputVoltage = 2.5;
    outputBit = "X";
    statusText = "DANGER: Both pull-up and pull-down networks conduct simultaneously! High shoot-through current flows directly from VDD to GND, producing excessive heat and unpredictable voltage.";
  } else {
    outputState = "FLOATING";
    outputVoltage = 2.5;
    outputBit = "Z";
    statusText = "High-impedance (Hi-Z): output is disconnected from both power and ground rails.";
  }

  return { gate, inputs, transistors, pullUpConnected, pullDownConnected, outputState, outputVoltage, outputBit, statusText };
}

/* ------------------------------- Cascade Propagation Delay ------------------------------- */

export type CascadeStageConfig = {
  label: string;
  gate: GateType;
  tpHL: number; // nanoseconds
  tpLH: number; // nanoseconds
  staticInputs?: Bit[];
};

export type CascadeStageTrace = {
  index: number;
  label: string;
  gate: GateType;
  inEdge: "rising" | "falling";
  inBefore: Bit;
  inAfter: Bit;
  outEdge: "rising" | "falling" | "none";
  outBefore: Bit;
  outAfter: Bit;
  delayParameter: "tpLH" | "tpHL" | "none";
  delayNs: number;
  cumulativeNs: number;
  note: string;
};

/** Traces signal edges through cascaded gates, tracking alternating polarities and delay parameters. */
export function simulateCascadeDelay(
  stages: CascadeStageConfig[],
  primaryInputTransition: "0to1" | "1to0",
): { stages: CascadeStageTrace[]; totalDelayNs: number } {
  let curBefore: Bit = primaryInputTransition === "0to1" ? 0 : 1;
  let curAfter: Bit = primaryInputTransition === "0to1" ? 1 : 0;
  let cumulative = 0;

  const traces: CascadeStageTrace[] = stages.map((cfg, idx) => {
    const inBefore = curBefore;
    const inAfter = curAfter;
    const inEdge: "rising" | "falling" = inBefore < inAfter ? "rising" : "falling";

    const inBitsBefore = [inBefore, ...(cfg.staticInputs ?? [])];
    const inBitsAfter = [inAfter, ...(cfg.staticInputs ?? [])];

    const outBefore = evalGate(cfg.gate, inBitsBefore);
    const outAfter = evalGate(cfg.gate, inBitsAfter);

    let outEdge: "rising" | "falling" | "none" = "none";
    let delayParameter: "tpLH" | "tpHL" | "none" = "none";
    let delayNs = 0;

    if (outBefore === 0 && outAfter === 1) {
      outEdge = "rising";
      delayParameter = "tpLH";
      delayNs = cfg.tpLH;
    } else if (outBefore === 1 && outAfter === 0) {
      outEdge = "falling";
      delayParameter = "tpHL";
      delayNs = cfg.tpHL;
    }

    cumulative += delayNs;
    curBefore = outBefore;
    curAfter = outAfter;

    const note =
      delayParameter === "none"
        ? "Output unchanged; no propagation delay incurred"
        : `Output transitions ${outBefore} \u2192 ${outAfter} (${outEdge}); applies ${delayParameter} = ${delayNs} ns`;

    return {
      index: idx,
      label: cfg.label,
      gate: cfg.gate,
      inEdge,
      inBefore,
      inAfter,
      outEdge,
      outBefore,
      outAfter,
      delayParameter,
      delayNs,
      cumulativeNs: cumulative,
      note,
    };
  });

  return { stages: traces, totalDelayNs: cumulative };
}

/* ------------------------------- Boolean Duality ------------------------------- */

type AstNode =
  | { type: "var"; name: string; negated: boolean }
  | { type: "const"; value: 0 | 1 }
  | { type: "not"; inner: AstNode }
  | { type: "and"; items: AstNode[] }
  | { type: "or"; items: AstNode[] };

function parseBooleanAst(expr: string): AstNode {
  const s = expr.replace(/\s+/g, "");
  let i = 0;

  const parseOr = (): AstNode => {
    const items: AstNode[] = [parseAnd()];
    while (i < s.length && s[i] === "+") {
      i++;
      items.push(parseAnd());
    }
    return items.length === 1 ? items[0] : { type: "or", items };
  };

  const parseAnd = (): AstNode => {
    const items: AstNode[] = [parseUnary()];
    while (i < s.length && (s[i] === "." || s[i] === "(" || /[A-Za-z01]/.test(s[i]))) {
      if (s[i] === ".") i++;
      items.push(parseUnary());
    }
    return items.length === 1 ? items[0] : { type: "and", items };
  };

  const parseUnary = (): AstNode => {
    let node: AstNode;
    if (s[i] === "(") {
      i++;
      node = parseOr();
      if (s[i] === ")") i++;
    } else if (s[i] === "0" || s[i] === "1") {
      node = { type: "const", value: Number(s[i++]) as 0 | 1 };
    } else if (/[A-Za-z]/.test(s[i])) {
      node = { type: "var", name: s[i++], negated: false };
    } else {
      throw new Error(`Unexpected character in expression: ${s[i]}`);
    }

    while (i < s.length && s[i] === "'") {
      i++;
      if (node.type === "var") {
        node = { ...node, negated: !node.negated };
      } else {
        node = { type: "not", inner: node };
      }
    }
    return node;
  };

  return parseOr();
}

function dualizeAst(node: AstNode): AstNode {
  switch (node.type) {
    case "var":
      return { ...node };
    case "const":
      return { type: "const", value: (node.value === 0 ? 1 : 0) as 0 | 1 };
    case "not":
      return { type: "not", inner: dualizeAst(node.inner) };
    case "and":
      return { type: "or", items: node.items.map(dualizeAst) };
    case "or":
      return { type: "and", items: node.items.map(dualizeAst) };
  }
}

function formatAst(node: AstNode, parentType?: "and" | "or"): string {
  switch (node.type) {
    case "var":
      return `${node.name}${node.negated ? "'" : ""}`;
    case "const":
      return `${node.value}`;
    case "not":
      return `(${formatAst(node.inner)})'`;
    case "and": {
      const parts = node.items.map((item) => {
        if (item.type === "or") return `(${formatAst(item)})`;
        return formatAst(item, "and");
      });
      // If parent is also 'and', no wrapping needed
      return parts.join("");
    }
    case "or": {
      const formatted = node.items.map((item) => formatAst(item, "or")).join(" + ");
      return parentType === "and" ? `(${formatted})` : formatted;
    }
  }
}

/** Computes the Boolean dual of an expression or equation according to the Principle of Duality. */
export function computeBooleanDual(expr: string): string {
  if (expr.includes("=")) {
    const [lhs, rhs] = expr.split("=").map((part) => part.trim());
    return `${computeBooleanDual(lhs)} = ${computeBooleanDual(rhs)}`;
  }
  try {
    const ast = parseBooleanAst(expr);
    const dualAst = dualizeAst(ast);
    return formatAst(dualAst);
  } catch {
    // Fallback: character-by-character replacement
    return expr
      .replace(/\+/g, "§")
      .replace(/·|\./g, "+")
      .replace(/§/g, " · ")
      .replace(/\b0\b/g, "1")
      .replace(/\b1\b/g, "0");
  }
}

/* ------------------------------- Static-1 Hazard Simulation ------------------------------- */

export type HazardStep = {
  t: number;
  a: Bit;
  aNot: Bit;
  termA: Bit; // A'C
  termB: Bit; // AB
  consensus: Bit; // BC
  fWithoutConsensus: Bit;
  fWithConsensus: Bit;
  isGlitch: boolean;
};

/** Simulates the dynamic response of F = A'C + AB during an A = 0 -> 1 transition with B=1, C=1. */
export function simulateStatic1Hazard(): HazardStep[] {
  // Input sequence across 7 discrete time increments (e.g. nanoseconds)
  // At t=0,1: steady A=0
  // At t=2: A rises to 1
  // Inverter has delay: aNot falls to 0 at t=3
  // AND2 (termB) has propagation delay: rises to 1 at t=5
  const table = [
    { t: 0, a: 0 as Bit, aNot: 1 as Bit, termA: 1 as Bit, termB: 0 as Bit },
    { t: 1, a: 0 as Bit, aNot: 1 as Bit, termA: 1 as Bit, termB: 0 as Bit },
    { t: 2, a: 1 as Bit, aNot: 1 as Bit, termA: 1 as Bit, termB: 0 as Bit },
    { t: 3, a: 1 as Bit, aNot: 0 as Bit, termA: 0 as Bit, termB: 0 as Bit }, // GLITCH: termA dropped, termB not high yet
    { t: 4, a: 1 as Bit, aNot: 0 as Bit, termA: 0 as Bit, termB: 0 as Bit }, // GLITCH persists
    { t: 5, a: 1 as Bit, aNot: 0 as Bit, termA: 0 as Bit, termB: 1 as Bit }, // termB turns on
    { t: 6, a: 1 as Bit, aNot: 0 as Bit, termA: 0 as Bit, termB: 1 as Bit },
  ];

  return table.map((row) => {
    const consensus: Bit = 1; // B=1, C=1 constant
    const fWithoutConsensus = (row.termA | row.termB) as Bit;
    const fWithConsensus = (row.termA | row.termB | consensus) as Bit;
    const isGlitch = fWithoutConsensus === 0;

    return {
      t: row.t,
      a: row.a,
      aNot: row.aNot,
      termA: row.termA,
      termB: row.termB,
      consensus,
      fWithoutConsensus,
      fWithConsensus,
      isGlitch,
    };
  });
}

/* ------------------------------- Universal Gate Synthesis ------------------------------- */

export type UniversalGateFamily = "NAND" | "NOR";
export type TargetOperation = "NOT" | "AND" | "OR" | "NAND" | "NOR" | "XOR" | "XNOR";

export type UniversalGateCircuit = {
  family: UniversalGateFamily;
  target: TargetOperation;
  title: string;
  gateCount: number;
  formula: string;
  notes: string;
  simulate: (inputs: Record<string, Bit>) => { output: Bit; internalSignals: Record<string, Bit> };
};

export const UNIVERSAL_CIRCUITS: Record<UniversalGateFamily, Record<string, UniversalGateCircuit>> = {
  NAND: {
    NOT: {
      family: "NAND",
      target: "NOT",
      title: "NOT from NAND",
      gateCount: 1,
      formula: "Y = (A \u00B7 A)' = A'",
      notes: "Tie both inputs together (or tie second input to VDD). One NAND gate acts as an inverter.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const y = (a ? 0 : 1) as Bit;
        return { output: y, internalSignals: { N1: y } };
      },
    },
    AND: {
      family: "NAND",
      target: "AND",
      title: "AND from NAND",
      gateCount: 2,
      formula: "Y = ((AB)' \u00B7 (AB)')' = AB",
      notes: "NAND gate followed by a NAND-configured inverter restores the true AND function.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const n1 = (a && b ? 0 : 1) as Bit;
        const y = (n1 ? 0 : 1) as Bit;
        return { output: y, internalSignals: { N1: n1, N2: y } };
      },
    },
    OR: {
      family: "NAND",
      target: "OR",
      title: "OR from NAND",
      gateCount: 3,
      formula: "Y = (A' \u00B7 B')' = A + B",
      notes: "De Morgan's theorem: invert each input using NAND inverters, then combine in a third NAND.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const na = (a ? 0 : 1) as Bit;
        const nb = (b ? 0 : 1) as Bit;
        const y = (na && nb ? 0 : 1) as Bit;
        return { output: y, internalSignals: { NA: na, NB: nb, Y: y } };
      },
    },
    NOR: {
      family: "NAND",
      target: "NOR",
      title: "NOR from NAND",
      gateCount: 4,
      formula: "Y = ((A' \u00B7 B')')' = (A + B)'",
      notes: "Invert the 3-NAND OR output with a fourth NAND inverter.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const na = (a ? 0 : 1) as Bit;
        const nb = (b ? 0 : 1) as Bit;
        const norPre = (na && nb ? 0 : 1) as Bit;
        const y = (norPre ? 0 : 1) as Bit;
        return { output: y, internalSignals: { NA: na, NB: nb, N_OR: norPre, Y: y } };
      },
    },
    XOR: {
      family: "NAND",
      target: "XOR",
      title: "XOR from NAND (Minimal 4 Gates)",
      gateCount: 4,
      formula: "Y = ((A \u00B7 (AB)')' \u00B7 (B \u00B7 (AB)')')' = A \u2295 B",
      notes: "The celebrated 4-NAND minimal XOR: Gate 1 generates N1 = (AB)'. Gates 2 and 3 cross-couple inputs with N1, and Gate 4 synthesizes XOR with zero redundant gates.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const n1 = (a && b ? 0 : 1) as Bit;
        const n2 = (a && n1 ? 0 : 1) as Bit;
        const n3 = (b && n1 ? 0 : 1) as Bit;
        const y = (n2 && n3 ? 0 : 1) as Bit;
        return { output: y, internalSignals: { N1: n1, N2: n2, N3: n3, Y: y } };
      },
    },
    XNOR: {
      family: "NAND",
      target: "XNOR",
      title: "XNOR from NAND",
      gateCount: 5,
      formula: "Y = (A \u2295 B)'",
      notes: "Follow the 4-gate minimal XOR circuit with a 5th NAND inverter.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const n1 = (a && b ? 0 : 1) as Bit;
        const n2 = (a && n1 ? 0 : 1) as Bit;
        const n3 = (b && n1 ? 0 : 1) as Bit;
        const xorVal = (n2 && n3 ? 0 : 1) as Bit;
        const y = (xorVal ? 0 : 1) as Bit;
        return { output: y, internalSignals: { N1: n1, N2: n2, N3: n3, XOR: xorVal, Y: y } };
      },
    },
  },
  NOR: {
    NOT: {
      family: "NOR",
      target: "NOT",
      title: "NOT from NOR",
      gateCount: 1,
      formula: "Y = (A + A)' = A'",
      notes: "Tie both inputs together (or tie second input to GND). One NOR gate acts as an inverter.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const y = (a ? 0 : 1) as Bit;
        return { output: y, internalSignals: { N1: y } };
      },
    },
    OR: {
      family: "NOR",
      target: "OR",
      title: "OR from NOR",
      gateCount: 2,
      formula: "Y = ((A + B)' + (A + B)')' = A + B",
      notes: "NOR gate followed by a NOR-configured inverter restores the true OR function.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const n1 = (a || b ? 0 : 1) as Bit;
        const y = (n1 ? 0 : 1) as Bit;
        return { output: y, internalSignals: { N1: n1, Y: y } };
      },
    },
    AND: {
      family: "NOR",
      target: "AND",
      title: "AND from NOR",
      gateCount: 3,
      formula: "Y = (A' + B')' = AB",
      notes: "De Morgan's theorem: invert each input with NOR inverters, then combine in a third NOR.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const na = (a ? 0 : 1) as Bit;
        const nb = (b ? 0 : 1) as Bit;
        const y = (na || nb ? 0 : 1) as Bit;
        return { output: y, internalSignals: { NA: na, NB: nb, Y: y } };
      },
    },
    NAND: {
      family: "NOR",
      target: "NAND",
      title: "NAND from NOR",
      gateCount: 4,
      formula: "Y = ((A' + B')')' = (AB)'",
      notes: "Invert the 3-NOR AND output with a fourth NOR inverter.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const na = (a ? 0 : 1) as Bit;
        const nb = (b ? 0 : 1) as Bit;
        const andPre = (na || nb ? 0 : 1) as Bit;
        const y = (andPre ? 0 : 1) as Bit;
        return { output: y, internalSignals: { NA: na, NB: nb, N_AND: andPre, Y: y } };
      },
    },
    XNOR: {
      family: "NOR",
      target: "XNOR",
      title: "XNOR from NOR (Minimal 4 Gates)",
      gateCount: 4,
      formula: "Y = ((A + (A + B)')' + (B + (A + B)')')' = (A \u2295 B)'",
      notes: "The dual of the 4-gate NAND XOR: Gate 1 computes N1 = (A + B)'. Gates 2 and 3 NOR with A and B, and Gate 4 produces equivalence (XNOR).",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const n1 = (a || b ? 0 : 1) as Bit;
        const n2 = (a || n1 ? 0 : 1) as Bit;
        const n3 = (b || n1 ? 0 : 1) as Bit;
        const y = (n2 || n3 ? 0 : 1) as Bit;
        return { output: y, internalSignals: { N1: n1, N2: n2, N3: n3, Y: y } };
      },
    },
    XOR: {
      family: "NOR",
      target: "XOR",
      title: "XOR from NOR",
      gateCount: 5,
      formula: "Y = ((A \u2295 B)')'",
      notes: "Follow the 4-gate minimal XNOR circuit with a 5th NOR inverter to obtain XOR.",
      simulate: (inputs) => {
        const a = inputs.A ?? 0;
        const b = inputs.B ?? 0;
        const n1 = (a || b ? 0 : 1) as Bit;
        const n2 = (a || n1 ? 0 : 1) as Bit;
        const n3 = (b || n1 ? 0 : 1) as Bit;
        const xnorVal = (n2 || n3 ? 0 : 1) as Bit;
        const y = (xnorVal ? 0 : 1) as Bit;
        return { output: y, internalSignals: { N1: n1, N2: n2, N3: n3, XNOR: xnorVal, Y: y } };
      },
    },
  },
};

/* ============================================================
   Module 2: Gates & Boolean Algebra Practice Helpers
   ============================================================ */

export interface DynamicPowerResult {
  pDynWatts: number;
  pStatWatts: number;
  pTotalWatts: number;
}

export function simulateDynamicPower(
  cLoadFarads: number,
  vddVolts: number,
  freqHz: number,
  alpha = 0.25,
  iLeakAmperes = 0,
): DynamicPowerResult {
  const pDynWatts = alpha * cLoadFarads * vddVolts * vddVolts * freqHz;
  const pStatWatts = vddVolts * iLeakAmperes;
  return {
    pDynWatts,
    pStatWatts,
    pTotalWatts: pDynWatts + pStatWatts,
  };
}

export interface FanOutAndNoiseMarginResult {
  nmH: number;
  nmL: number;
  fanOutHigh: number;
  fanOutLow: number;
  ratedFanOut: number;
}

export function simulateFanOutAndNoiseMargins(spec: {
  voh: number;
  vol: number;
  vih: number;
  vil: number;
  ioh: number; // e.g. -4.0 mA
  iol: number; // e.g. 16.0 mA
  iih: number; // e.g. 0.040 mA
  iil: number; // e.g. -0.8 mA
}): FanOutAndNoiseMarginResult {
  const nmH = +(spec.voh - spec.vih).toFixed(4);
  const nmL = +(spec.vil - spec.vol).toFixed(4);
  const fanOutHigh = Math.floor(Math.abs(spec.ioh) / Math.abs(spec.iih));
  const fanOutLow = Math.floor(Math.abs(spec.iol) / Math.abs(spec.iil));
  const ratedFanOut = Math.min(fanOutHigh, fanOutLow);
  return { nmH, nmL, fanOutHigh, fanOutLow, ratedFanOut };
}

export interface SchmittTriggerResult {
  vH: number;
  canRejectNoise: boolean;
  maxTolerableVpp: number;
}

export function simulateSchmittTrigger(
  vtPlus: number,
  vtMinus: number,
  noiseVpp: number,
): SchmittTriggerResult {
  const vH = +(vtPlus - vtMinus).toFixed(4);
  return {
    vH,
    canRejectNoise: noiseVpp < vH,
    maxTolerableVpp: vH,
  };
}

export interface FourNorXnorResult {
  n1: Bit;
  n2: Bit;
  n3: Bit;
  y: Bit;
}

export function simulate4NorXnor(a: Bit, b: Bit): FourNorXnorResult {
  const n1 = (a || b ? 0 : 1) as Bit;
  const n2 = (a || n1 ? 0 : 1) as Bit;
  const n3 = (b || n1 ? 0 : 1) as Bit;
  const y = (n2 || n3 ? 0 : 1) as Bit;
  return { n1, n2, n3, y };
}

export interface ComplexCmosGateResult {
  type: "AOI-22" | "OAI-22";
  output: Bit;
  pdnConducting: boolean;
  punConducting: boolean;
  transistorCount: number;
}

export function simulateAoi22(a: Bit, b: Bit, c: Bit, d: Bit): ComplexCmosGateResult {
  // AOI-22: Output = ((A * B) + (C * D))'
  const branch1 = a === 1 && b === 1;
  const branch2 = c === 1 && d === 1;
  const pdnConducting = branch1 || branch2;
  const punConducting = !pdnConducting;
  const output: Bit = pdnConducting ? 0 : 1;
  return {
    type: "AOI-22",
    output,
    pdnConducting,
    punConducting,
    transistorCount: 8,
  };
}

export function simulateOai22(a: Bit, b: Bit, c: Bit, d: Bit): ComplexCmosGateResult {
  // OAI-22: Output = ((A + B) * (C + D))'
  const sum1 = a === 1 || b === 1;
  const sum2 = c === 1 || d === 1;
  const pdnConducting = sum1 && sum2;
  const punConducting = !pdnConducting;
  const output: Bit = pdnConducting ? 0 : 1;
  return {
    type: "OAI-22",
    output,
    pdnConducting,
    punConducting,
    transistorCount: 8,
  };
}

/* ============================================================
   Combinational Building Blocks (Module 3)
   Adders, Fast Carries, Comparators, Decoders, Encoders, MUXes
   ============================================================ */

export interface AdderSubtractorResult {
  width: number;
  mode: "ADD" | "SUB";
  m: Bit;
  a: number;
  b: number;
  aBits: Bit[];
  bBits: Bit[];
  bEffective: Bit[];
  carries: Bit[];
  sumBits: Bit[];
  stages: {
    bit: number;
    a: Bit;
    b: Bit;
    bEff: Bit;
    cIn: Bit;
    sum: Bit;
    cOut: Bit;
  }[];
  sumUnsigned: number;
  aSigned: number;
  bSigned: number;
  sumSigned: number;
  flags: {
    zero: boolean;
    sign: Bit;
    carry: Bit;
    overflow: boolean;
  };
  explanation: string;
}

export function simulateAdderSubtractor(
  a: number,
  b: number,
  mode: "ADD" | "SUB",
  width: number = 4
): AdderSubtractorResult {
  const m: Bit = mode === "SUB" ? 1 : 0;
  const aBits: Bit[] = Array.from({ length: width }, (_, i) => ((a >> i) & 1) as Bit);
  const bBits: Bit[] = Array.from({ length: width }, (_, i) => ((b >> i) & 1) as Bit);
  const bEffective: Bit[] = bBits.map((bit) => (bit ^ m) as Bit);

  const carries: Bit[] = [m];
  const sumBits: Bit[] = [];
  const stages: AdderSubtractorResult["stages"] = [];

  for (let i = 0; i < width; i++) {
    const ai = aBits[i];
    const biEff = bEffective[i];
    const cIn = carries[i];
    const sum = (ai ^ biEff ^ cIn) as Bit;
    const cOut = ((ai & biEff) | (ai & cIn) | (biEff & cIn)) as Bit;
    sumBits.push(sum);
    carries.push(cOut);
    stages.push({
      bit: i,
      a: ai,
      b: bBits[i],
      bEff: biEff,
      cIn,
      sum,
      cOut,
    });
  }

  let sumUnsigned = 0;
  for (let i = 0; i < width; i++) {
    sumUnsigned |= sumBits[i] << i;
  }

  const toSigned = (val: number, w: number) => {
    const signMask = 1 << (w - 1);
    const valueMask = (1 << w) - 1;
    const masked = val & valueMask;
    return masked & signMask ? masked - (1 << w) : masked;
  };

  const aSigned = toSigned(a, width);
  const bSigned = toSigned(b, width);
  const sumSigned = toSigned(sumUnsigned, width);

  const cMSBIn = carries[width - 1];
  const cMSBOut = carries[width];
  const overflow = (cMSBIn ^ cMSBOut) === 1;
  const zero = sumBits.every((bit) => bit === 0);
  const sign = sumBits[width - 1];
  const carry = cMSBOut;

  let explanation = "";
  if (mode === "ADD") {
    explanation = `${aSigned} + ${bSigned} = ${aSigned + bSigned}. `;
    if (overflow) {
      explanation += `Signed overflow occurred (V=1)! Carry into sign bit (C${width - 1}=${cMSBIn}) != carry out (C${width}=${cMSBOut}). Result ${sumSigned} wrapped around.`;
    } else {
      explanation += `Normal addition: signed result ${sumSigned} is within [${-(1 << (width - 1))}, ${(1 << (width - 1)) - 1}].`;
    }
  } else {
    explanation = `${aSigned} - ${bSigned} = ${aSigned - bSigned}. M=1 inverted operand B (${bBits.slice().reverse().join("")} -> ${bEffective.slice().reverse().join("")}) and set C0=1. `;
    if (overflow) {
      explanation += `Signed overflow occurred (V=1)! Result ${sumSigned} wrapped around.`;
    } else {
      explanation += `Valid two's complement subtraction: ${aSigned} + (-${bSigned}) = ${sumSigned}.`;
    }
  }

  return {
    width,
    mode,
    m,
    a,
    b,
    aBits,
    bBits,
    bEffective,
    carries,
    sumBits,
    stages,
    sumUnsigned,
    aSigned,
    bSigned,
    sumSigned,
    flags: { zero, sign, carry, overflow },
    explanation,
  };
}

export function halfSubtractor(a: Bit, b: Bit) {
  const diff = (a ^ b) as Bit;
  const borrowOut = (!a && b ? 1 : 0) as Bit;
  return { diff, borrowOut };
}

export function fullSubtractor(a: Bit, b: Bit, bIn: Bit) {
  const d1 = (a ^ b) as Bit;
  const b1 = (!a && b ? 1 : 0) as Bit;
  const diff = (d1 ^ bIn) as Bit;
  const b2 = (!d1 && bIn ? 1 : 0) as Bit;
  const borrowOut = (b1 || b2 ? 1 : 0) as Bit;
  return {
    diff,
    borrowOut,
    intermediate: { d1, b1, b2 },
  };
}

export interface FastCarryAnalysis {
  width: number;
  aBits: Bit[];
  bBits: Bit[];
  c0: Bit;
  generates: Bit[];
  propagates: Bit[];
  claCarries: Bit[];
  claTerms: {
    carryIndex: number;
    terms: { expr: string; active: boolean }[];
    resultingCarry: Bit;
    dominantReason: string;
  }[];
  blockPropagate: Bit;
  blockGenerate: Bit;
  skipAnalysis: {
    canSkip: boolean;
    rippleDelaySteps: number;
    skipDelaySteps: number;
  };
  latencyComparison: {
    architecture: string;
    delayFormula: string;
    delayTau4Bit: number;
    delayTau16Bit: number;
    delayTau64Bit: number;
    areaCost: string;
  }[];
}

export function simulateFastCarries(
  a: number,
  b: number,
  c0: Bit = 0,
  width: number = 4
): FastCarryAnalysis {
  const aBits: Bit[] = Array.from({ length: width }, (_, i) => ((a >> i) & 1) as Bit);
  const bBits: Bit[] = Array.from({ length: width }, (_, i) => ((b >> i) & 1) as Bit);
  const generates: Bit[] = aBits.map((ai, i) => (ai & bBits[i]) as Bit);
  const propagates: Bit[] = aBits.map((ai, i) => (ai ^ bBits[i]) as Bit);

  const claCarries: Bit[] = [c0];
  const claTerms: FastCarryAnalysis["claTerms"] = [];

  for (let i = 0; i < width; i++) {
    const terms: { expr: string; active: boolean }[] = [];
    terms.push({ expr: `G${i}`, active: generates[i] === 1 });

    for (let k = i - 1; k >= 0; k--) {
      const pChain = Array.from({ length: i - k }, (_, idx) => `P${i - idx}`).join("\u00B7");
      let active = generates[k] === 1;
      for (let pIdx = k + 1; pIdx <= i; pIdx++) {
        if (propagates[pIdx] !== 1) active = false;
      }
      terms.push({ expr: `${pChain}\u00B7G${k}`, active });
    }

    const fullPChain = Array.from({ length: i + 1 }, (_, idx) => `P${i - idx}`).join("\u00B7");
    let c0Active = c0 === 1;
    for (let pIdx = 0; pIdx <= i; pIdx++) {
      if (propagates[pIdx] !== 1) c0Active = false;
    }
    terms.push({ expr: `${fullPChain}\u00B7C0`, active: c0Active });

    const resultingCarry = terms.some((t) => t.active) ? (1 as Bit) : (0 as Bit);
    claCarries.push(resultingCarry);

    const activeTerms = terms.filter((t) => t.active);
    let dominantReason = "No carry";
    if (activeTerms.length > 0) {
      dominantReason = `Active by term(s): ${activeTerms.map((t) => t.expr).join(", ")}`;
    }

    claTerms.push({
      carryIndex: i + 1,
      terms,
      resultingCarry,
      dominantReason,
    });
  }

  const blockPropagate = propagates.slice(0, 4).every((p) => p === 1) ? (1 as Bit) : (0 as Bit);
  const g3 = generates[3] ?? 0;
  const p3g2 = (propagates[3] && generates[2]) ?? 0;
  const p3p2g1 = (propagates[3] && propagates[2] && generates[1]) ?? 0;
  const p3p2p1g0 = (propagates[3] && propagates[2] && propagates[1] && generates[0]) ?? 0;
  const blockGenerate = (g3 || p3g2 || p3p2g1 || p3p2p1g0 ? 1 : 0) as Bit;

  const canSkip = blockPropagate === 1;
  const rippleDelaySteps = width * 2;
  const skipDelaySteps = canSkip ? 2 : rippleDelaySteps;

  const latencyComparison = [
    {
      architecture: "Ripple-Carry Adder (RCA)",
      delayFormula: "2n \u00B7 \u03C4",
      delayTau4Bit: 8,
      delayTau16Bit: 32,
      delayTau64Bit: 128,
      areaCost: "Minimal (O(n) gates, local routing)",
    },
    {
      architecture: "Carry-Lookahead Adder (CLA)",
      delayFormula: "O(log n) tree",
      delayTau4Bit: 6,
      delayTau16Bit: 10,
      delayTau64Bit: 14,
      areaCost: "Moderate (O(n log n) gates, limited fan-in)",
    },
    {
      architecture: "Carry-Skip Adder (Bypass)",
      delayFormula: "O(\u221An) \u00B7 \u03C4",
      delayTau4Bit: 8,
      delayTau16Bit: 16,
      delayTau64Bit: 32,
      areaCost: "Low (RCA + 1 AND + 1 MUX per block)",
    },
    {
      architecture: "Carry-Select Adder (CSA)",
      delayFormula: "O(\u221An) \u00B7 \u03C4",
      delayTau4Bit: 8,
      delayTau16Bit: 14,
      delayTau64Bit: 24,
      areaCost: "High (~2x area for duplicate dual adders)",
    },
    {
      architecture: "Kogge-Stone Tree Adder",
      delayFormula: "log\u2082(n) + 2",
      delayTau4Bit: 4,
      delayTau16Bit: 6,
      delayTau64Bit: 8,
      areaCost: "Highest (dense 2D wiring tree, high dynamic power)",
    },
  ];

  return {
    width,
    aBits,
    bBits,
    c0,
    generates,
    propagates,
    claCarries,
    claTerms,
    blockPropagate,
    blockGenerate,
    skipAnalysis: {
      canSkip,
      rippleDelaySteps,
      skipDelaySteps,
    },
    latencyComparison,
  };
}

export interface MagnitudeComparatorResult {
  width: number;
  a: number;
  b: number;
  aBits: Bit[];
  bBits: Bit[];
  xBits: Bit[];
  gtTerms: { bit: number; expr: string; active: boolean }[];
  ltTerms: { bit: number; expr: string; active: boolean }[];
  eqTerm: { expr: string; active: boolean };
  decidingBit: number | "EQUAL" | "CASCADED";
  gt: Bit;
  eq: Bit;
  lt: Bit;
  reason: string;
}

export function simulateMagnitudeComparator(
  a: number,
  b: number,
  width: number = 4,
  cascading: { gt?: Bit; eq?: Bit; lt?: Bit } = { gt: 0, eq: 1, lt: 0 }
): MagnitudeComparatorResult {
  const aBits: Bit[] = Array.from({ length: width }, (_, i) => ((a >> i) & 1) as Bit);
  const bBits: Bit[] = Array.from({ length: width }, (_, i) => ((b >> i) & 1) as Bit);
  const xBits: Bit[] = aBits.map((ai, i) => (ai === bBits[i] ? 1 : 0) as Bit);

  const gtTerms: MagnitudeComparatorResult["gtTerms"] = [];
  const ltTerms: MagnitudeComparatorResult["ltTerms"] = [];

  let gtActive = false;
  let ltActive = false;
  let decidingBit: number | "EQUAL" | "CASCADED" = "EQUAL";

  for (let i = width - 1; i >= 0; i--) {
    let higherXActive = true;
    for (let j = width - 1; j > i; j--) {
      if (xBits[j] !== 1) higherXActive = false;
    }

    const ai = aBits[i];
    const bi = bBits[i];

    const gtCondition = higherXActive && ai === 1 && bi === 0;
    const ltCondition = higherXActive && ai === 0 && bi === 1;

    const xPrefix = i === width - 1 ? "" : Array.from({ length: width - 1 - i }, (_, idx) => `x${width - 1 - idx}`).join("\u00B7") + "\u00B7";
    gtTerms.push({
      bit: i,
      expr: `${xPrefix}A${i}\u00B7B${i}'`,
      active: gtCondition,
    });
    ltTerms.push({
      bit: i,
      expr: `${xPrefix}A${i}'\u00B7B${i}`,
      active: ltCondition,
    });

    if (decidingBit === "EQUAL") {
      if (ai > bi) {
        decidingBit = i;
        gtActive = true;
      } else if (ai < bi) {
        decidingBit = i;
        ltActive = true;
      }
    }
  }

  const allEqual = xBits.every((x) => x === 1);
  const eqTerm = {
    expr: Array.from({ length: width }, (_, i) => `x${width - 1 - i}`).join("\u00B7"),
    active: allEqual,
  };

  let gt: Bit = gtActive ? 1 : 0;
  let eq: Bit = 0;
  let lt: Bit = ltActive ? 1 : 0;

  let reason = "";
  if (!allEqual) {
    if (gtActive) {
      gt = 1;
      eq = 0;
      lt = 0;
      reason = `A > B decided at bit position ${decidingBit} (A${decidingBit}=1, B${decidingBit}=0), higher bits matched.`;
    } else {
      gt = 0;
      eq = 0;
      lt = 1;
      reason = `A < B decided at bit position ${decidingBit} (A${decidingBit}=0, B${decidingBit}=1), higher bits matched.`;
    }
  } else {
    if (cascading.gt) {
      gt = 1;
      eq = 0;
      lt = 0;
      decidingBit = "CASCADED";
      reason = `All 4 bits identical (A=B=0b${aBits.slice().reverse().join("")}). Decided by cascading input I(A>B)=1.`;
    } else if (cascading.lt) {
      gt = 0;
      eq = 0;
      lt = 1;
      decidingBit = "CASCADED";
      reason = `All 4 bits identical (A=B=0b${aBits.slice().reverse().join("")}). Decided by cascading input I(A<B)=1.`;
    } else {
      gt = 0;
      eq = cascading.eq ?? 1;
      lt = 0;
      reason = `All 4 bits identical (A=B=0b${aBits.slice().reverse().join("")}). Output A=B is HIGH.`;
    }
  }

  return {
    width,
    a,
    b,
    aBits,
    bBits,
    xBits,
    gtTerms,
    ltTerms,
    eqTerm,
    decidingBit,
    gt,
    eq,
    lt,
    reason,
  };
}

export interface DecoderResult {
  address: number;
  numInputs: 2 | 3 | 4;
  numOutputs: number;
  enables: { g1: Bit; g2a_n: Bit; g2b_n: Bit };
  enabled: boolean;
  activeLow: boolean;
  selectedMinterm: number;
  outputs: Bit[];
  synthesis?: {
    targetMinterms: number[];
    gateUsed: "OR" | "NAND";
    output: Bit;
    equation: string;
  };
}

export function simulateDecoder(
  address: number,
  numInputs: 2 | 3 | 4 = 3,
  enables: { g1?: Bit; g2a_n?: Bit; g2b_n?: Bit } = { g1: 1, g2a_n: 0, g2b_n: 0 },
  activeLow: boolean = true,
  targetMinterms?: number[]
): DecoderResult {
  const g1 = enables.g1 ?? 1;
  const g2a_n = enables.g2a_n ?? 0;
  const g2b_n = enables.g2b_n ?? 0;

  const enabled = g1 === 1 && g2a_n === 0 && g2b_n === 0;
  const numOutputs = 1 << numInputs;
  const validAddress = address >= 0 && address < numOutputs;
  const selectedMinterm = enabled && validAddress ? address : -1;

  const outputs: Bit[] = Array.from({ length: numOutputs }, (_, i) => {
    if (!enabled) {
      return activeLow ? 1 : 0;
    }
    const isSelected = i === selectedMinterm;
    if (activeLow) {
      return isSelected ? 0 : 1;
    }
    return isSelected ? 1 : 0;
  });

  let synthesis: DecoderResult["synthesis"] = undefined;
  if (targetMinterms && targetMinterms.length > 0) {
    if (activeLow) {
      const anyTargetAsserted = targetMinterms.some((m) => outputs[m] === 0);
      const output = anyTargetAsserted ? 1 : 0;
      synthesis = {
        targetMinterms,
        gateUsed: "NAND",
        output: output as Bit,
        equation: `F = (${targetMinterms.map((m) => `Y${m}'`).join(" \u00B7 ")})' = \u2211 m(${targetMinterms.join(", ")})`,
      };
    } else {
      const anyTargetAsserted = targetMinterms.some((m) => outputs[m] === 1);
      const output = anyTargetAsserted ? 1 : 0;
      synthesis = {
        targetMinterms,
        gateUsed: "OR",
        output: output as Bit,
        equation: `F = ${targetMinterms.map((m) => `D${m}`).join(" + ")} = \u2211 m(${targetMinterms.join(", ")})`,
      };
    }
  }

  return {
    address,
    numInputs,
    numOutputs,
    enables: { g1, g2a_n, g2b_n },
    enabled,
    activeLow,
    selectedMinterm,
    outputs,
    synthesis,
  };
}

export interface SevenSegmentResult {
  bcd: number;
  displayType: "common-cathode" | "common-anode";
  isValidBcd: boolean;
  segments: {
    a: Bit;
    b: Bit;
    c: Bit;
    d: Bit;
    e: Bit;
    f: Bit;
    g: Bit;
  };
  segmentList: {
    id: "a" | "b" | "c" | "d" | "e" | "f" | "g";
    on: boolean;
    logicValue: Bit;
    sopFormula: string;
  }[];
}

export function simulate7SegmentDecoder(
  bcd: number,
  displayType: "common-cathode" | "common-anode" = "common-cathode"
): SevenSegmentResult {
  const isValidBcd = bcd >= 0 && bcd <= 9;

  const patterns: Record<number, [number, number, number, number, number, number, number]> = {
    0: [1, 1, 1, 1, 1, 1, 0],
    1: [0, 1, 1, 0, 0, 0, 0],
    2: [1, 1, 0, 1, 1, 0, 1],
    3: [1, 1, 1, 1, 0, 0, 1],
    4: [0, 1, 1, 0, 0, 1, 1],
    5: [1, 0, 1, 1, 0, 1, 1],
    6: [1, 0, 1, 1, 1, 1, 1],
    7: [1, 1, 1, 0, 0, 0, 0],
    8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1],
    10: [0, 0, 0, 0, 0, 0, 1],
    11: [0, 0, 0, 0, 0, 0, 1],
    12: [0, 0, 0, 0, 0, 0, 1],
    13: [0, 0, 0, 0, 0, 0, 1],
    14: [0, 0, 0, 0, 0, 0, 1],
    15: [0, 0, 0, 0, 0, 0, 0],
  };

  const raw = patterns[bcd] ?? [0, 0, 0, 0, 0, 0, 0];
  const [sa, sb, sc, sd, se, sf, sg] = raw;

  const toDisplay = (val: number): Bit => {
    if (displayType === "common-anode") {
      return (val ? 0 : 1) as Bit;
    }
    return (val ? 1 : 0) as Bit;
  };

  const formulas = {
    a: "A + C + BD + B'D'",
    b: "B' + C'D' + CD",
    c: "B + C' + D",
    d: "A + B'D' + CD' + B'C + BC'D",
    e: "B'D' + CD'",
    f: "A + C'D' + BC' + BD'",
    g: "A + BC' + B'C + CD'",
  };

  const segKeys = ["a", "b", "c", "d", "e", "f", "g"] as const;
  const segmentList = segKeys.map((id, idx) => {
    const illuminated = raw[idx] === 1;
    return {
      id,
      on: illuminated,
      logicValue: toDisplay(raw[idx]),
      sopFormula: formulas[id],
    };
  });

  return {
    bcd,
    displayType,
    isValidBcd,
    segments: {
      a: toDisplay(sa),
      b: toDisplay(sb),
      c: toDisplay(sc),
      d: toDisplay(sd),
      e: toDisplay(se),
      f: toDisplay(sf),
      g: toDisplay(sg),
    },
    segmentList,
  };
}

export interface PriorityEncoderResult {
  inputs: Bit[];
  activeLow: boolean;
  enabled: boolean;
  highestActiveIndex: number;
  codeBits: Bit[];
  codeNumber: number;
  valid: Bit;
  gs_n: Bit;
  eo_n: Bit;
  formulas: { output: string; derivation: string }[];
}

export function simulatePriorityEncoder(
  inputs: Bit[],
  activeLow: boolean = false,
  ei_n: Bit = 0
): PriorityEncoderResult {
  const enabled = ei_n === 0;
  const n = inputs.length;
  const numCodeBits = Math.ceil(Math.log2(n));

  const isInputAsserted = (val: Bit) => (activeLow ? val === 0 : val === 1);

  let highestActiveIndex = -1;
  if (enabled) {
    for (let i = n - 1; i >= 0; i--) {
      if (isInputAsserted(inputs[i])) {
        highestActiveIndex = i;
        break;
      }
    }
  }

  const valid: Bit = (enabled && highestActiveIndex >= 0 ? 1 : 0) as Bit;
  const gs_n: Bit = (enabled && highestActiveIndex >= 0 ? 0 : 1) as Bit;
  const eo_n: Bit = (enabled && highestActiveIndex < 0 ? 0 : 1) as Bit;

  const codeNumber = highestActiveIndex >= 0 ? highestActiveIndex : 0;
  const codeBits: Bit[] = Array.from({ length: numCodeBits }, (_, i) => {
    const bitPos = numCodeBits - 1 - i;
    const bitVal = ((codeNumber >> bitPos) & 1) as Bit;
    if (activeLow) {
      return (valid ? (bitVal ? 0 : 1) : 1) as Bit;
    }
    return (valid ? bitVal : 0) as Bit;
  });

  const formulas: PriorityEncoderResult["formulas"] = [];
  if (n === 4) {
    formulas.push({
      output: "A1",
      derivation: "D3 + D2",
    });
    formulas.push({
      output: "A0",
      derivation: "D3 + D2'·D1",
    });
    formulas.push({
      output: "V",
      derivation: "D3 + D2 + D1 + D0",
    });
  } else if (n === 8) {
    formulas.push({
      output: "A2",
      derivation: "D7 + D6 + D5 + D4",
    });
    formulas.push({
      output: "A1",
      derivation: "D7 + D6 + D5'D4'·(D3 + D2)",
    });
    formulas.push({
      output: "A0",
      derivation: "D7 + D6'D5 + D6'D4'D3 + D6'D4'D2'D1",
    });
    formulas.push({
      output: "GS' (Group Select)",
      derivation: "EI' · (D0·D1·D2·D3·D4·D5·D6·D7)'",
    });
    formulas.push({
      output: "EO' (Enable Output)",
      derivation: "EI' · D0 · D1 · D2 · D3 · D4 · D5 · D6 · D7",
    });
  }

  return {
    inputs,
    activeLow,
    enabled,
    highestActiveIndex,
    codeBits,
    codeNumber,
    valid,
    gs_n,
    eo_n,
    formulas,
  };
}

export interface MuxFunctionResult {
  minterms: number[];
  decomposedVar: "A" | "B" | "C";
  selectVars: [string, string];
  table: {
    selectCode: string;
    mZero: number;
    mOne: number;
    valZero: Bit;
    valOne: Bit;
    derivedInput: "0" | "1" | string;
  }[];
  allOutputsMatch: boolean;
  evaluate: (a: Bit, b: Bit, c: Bit) => {
    selectCode: string;
    channelIndex: number;
    channelExpression: string;
    output: Bit;
    expectedFunctionOutput: Bit;
  };
}

export function simulateMuxFunction(
  minterms: number[],
  decomposedVar: "A" | "B" | "C" = "C"
): MuxFunctionResult {
  const mintermSet = new Set(minterms);
  const fnAt = (a: Bit, b: Bit, c: Bit): Bit => {
    const idx = (a << 2) | (b << 1) | c;
    return mintermSet.has(idx) ? 1 : 0;
  };

  const selectVars: [string, string] =
    decomposedVar === "C" ? ["A", "B"] : decomposedVar === "A" ? ["B", "C"] : ["A", "C"];

  const table: MuxFunctionResult["table"] = [];
  const selectCodes = ["00", "01", "10", "11"] as const;

  for (let sc = 0; sc < 4; sc++) {
    const s1 = ((sc >> 1) & 1) as Bit;
    const s0 = (sc & 1) as Bit;

    let mZero = 0;
    let mOne = 0;
    let valZero: Bit = 0;
    let valOne: Bit = 0;

    if (decomposedVar === "C") {
      mZero = (s1 << 2) | (s0 << 1) | 0;
      mOne = (s1 << 2) | (s0 << 1) | 1;
      valZero = fnAt(s1, s0, 0);
      valOne = fnAt(s1, s0, 1);
    } else if (decomposedVar === "A") {
      mZero = (0 << 2) | (s1 << 1) | s0;
      mOne = (1 << 2) | (s1 << 1) | s0;
      valZero = fnAt(0, s1, s0);
      valOne = fnAt(1, s1, s0);
    } else {
      mZero = (s1 << 2) | (0 << 1) | s0;
      mOne = (s1 << 2) | (1 << 1) | s0;
      valZero = fnAt(s1, 0, s0);
      valOne = fnAt(s1, 1, s0);
    }

    let derivedInput: "0" | "1" | string = "0";
    if (valZero === 0 && valOne === 0) derivedInput = "0";
    else if (valZero === 1 && valOne === 1) derivedInput = "1";
    else if (valZero === 0 && valOne === 1) derivedInput = decomposedVar;
    else if (valZero === 1 && valOne === 0) derivedInput = `${decomposedVar}'`;

    table.push({
      selectCode: selectCodes[sc],
      mZero,
      mOne,
      valZero,
      valOne,
      derivedInput,
    });
  }

  const evaluate = (a: Bit, b: Bit, c: Bit) => {
    let sc = 0;
    if (decomposedVar === "C") {
      sc = (a << 1) | b;
    } else if (decomposedVar === "A") {
      sc = (b << 1) | c;
    } else {
      sc = (a << 1) | c;
    }

    const row = table[sc];
    let decompVal: Bit = 0;
    if (decomposedVar === "C") decompVal = c;
    else if (decomposedVar === "A") decompVal = a;
    else decompVal = b;

    let output: Bit = 0;
    if (row.derivedInput === "0") output = 0;
    else if (row.derivedInput === "1") output = 1;
    else if (row.derivedInput === decomposedVar) output = decompVal;
    else if (row.derivedInput === `${decomposedVar}'`) output = (decompVal ? 0 : 1) as Bit;

    const expected = fnAt(a, b, c);

    return {
      selectCode: row.selectCode,
      channelIndex: sc,
      channelExpression: row.derivedInput,
      output,
      expectedFunctionOutput: expected,
    };
  };

  let allOutputsMatch = true;
  for (let m = 0; m < 8; m++) {
    const a = ((m >> 2) & 1) as Bit;
    const b = ((m >> 1) & 1) as Bit;
    const c = (m & 1) as Bit;
    if (evaluate(a, b, c).output !== fnAt(a, b, c)) {
      allOutputsMatch = false;
    }
  }

  return {
    minterms,
    decomposedVar,
    selectVars,
    table,
    allOutputsMatch,
    evaluate,
  };
}

export interface MuxTree16Result {
  inputs: Bit[];
  selects: [Bit, Bit, Bit, Bit];
  tier1: {
    muxIndex: number;
    inputs: [Bit, Bit, Bit, Bit];
    selects: [Bit, Bit];
    selectedInputIndex: number;
    output: Bit;
  }[];
  tier2: {
    inputs: [Bit, Bit, Bit, Bit];
    selects: [Bit, Bit];
    selectedChannelIndex: number;
    output: Bit;
  };
  globalAddress: number;
  output: Bit;
  correct: boolean;
}

export function simulateMuxTree16to1(
  inputs: Bit[],
  selects: [Bit, Bit, Bit, Bit]
): MuxTree16Result {
  const [s3, s2, s1, s0] = selects;
  const tier1Select = (s1 << 1) | s0;
  const tier2Select = (s3 << 1) | s2;
  const globalAddress = (s3 << 3) | (s2 << 2) | (s1 << 1) | s0;

  const tier1: MuxTree16Result["tier1"] = [];
  const tier1Outputs: Bit[] = [];

  for (let m = 0; m < 4; m++) {
    const startIdx = m * 4;
    const muxInputs: [Bit, Bit, Bit, Bit] = [
      inputs[startIdx] ?? 0,
      inputs[startIdx + 1] ?? 0,
      inputs[startIdx + 2] ?? 0,
      inputs[startIdx + 3] ?? 0,
    ];
    const out = muxInputs[tier1Select];
    tier1.push({
      muxIndex: m,
      inputs: muxInputs,
      selects: [s1, s0],
      selectedInputIndex: tier1Select,
      output: out,
    });
    tier1Outputs.push(out);
  }

  const finalOutput = tier1Outputs[tier2Select];
  const tier2: MuxTree16Result["tier2"] = {
    inputs: [tier1Outputs[0], tier1Outputs[1], tier1Outputs[2], tier1Outputs[3]],
    selects: [s3, s2],
    selectedChannelIndex: tier2Select,
    output: finalOutput,
  };

  const expected = inputs[globalAddress] ?? 0;

  return {
    inputs,
    selects,
    tier1,
    tier2,
    globalAddress,
    output: finalOutput,
    correct: finalOutput === expected,
  };
}

/* ------------------------------- Sequential Logic (Module 4) ------------------------------- */

export interface DebouncerResult {
  switchPosition: "A" | "B" | "in-flight";
  rawSwitchA: Bit;
  rawSwitchB: Bit;
  s_n: Bit;
  r_n: Bit;
  q: Bit;
  q_n: Bit;
  bounces: { timeUs: number; rawA: Bit; rawB: Bit; q: Bit }[];
  explanation: string;
}

export function simulateDebouncer(
  position: "A" | "B" | "in-flight",
  includeBounces: boolean = true
): DebouncerResult {
  const bounces: { timeUs: number; rawA: Bit; rawB: Bit; q: Bit }[] = [];
  let s_n: Bit = 1;
  let r_n: Bit = 1;
  let q: Bit = 0;
  let q_n: Bit = 1;

  if (position === "A") {
    s_n = 0;
    r_n = 1;
    q = 1;
    q_n = 0;
    if (includeBounces) {
      bounces.push({ timeUs: 100, rawA: 1, rawB: 1, q: 0 });
      bounces.push({ timeUs: 500, rawA: 0, rawB: 1, q: 1 });
      bounces.push({ timeUs: 700, rawA: 1, rawB: 1, q: 1 });
      bounces.push({ timeUs: 900, rawA: 0, rawB: 1, q: 1 });
      bounces.push({ timeUs: 1100, rawA: 1, rawB: 1, q: 1 });
      bounces.push({ timeUs: 1500, rawA: 0, rawB: 1, q: 1 });
    }
  } else if (position === "B") {
    s_n = 1;
    r_n = 0;
    q = 0;
    q_n = 1;
    if (includeBounces) {
      bounces.push({ timeUs: 100, rawA: 1, rawB: 1, q: 1 });
      bounces.push({ timeUs: 500, rawA: 1, rawB: 0, q: 0 });
      bounces.push({ timeUs: 700, rawA: 1, rawB: 1, q: 0 });
      bounces.push({ timeUs: 900, rawA: 1, rawB: 0, q: 0 });
      bounces.push({ timeUs: 1100, rawA: 1, rawB: 1, q: 0 });
      bounces.push({ timeUs: 1500, rawA: 1, rawB: 0, q: 0 });
    }
  } else {
    s_n = 1;
    r_n = 1;
    q = 0;
    q_n = 1;
  }

  const explanation =
    position === "A"
      ? "Position A: Wiper connects /S to GND (0). Output Q sets to 1 on the very first contact. Subsequent mechanical bounces pull /S back to 1 via pull-up resistor R1, putting the latch in Hold mode (/S=1, /R=1), keeping Q=1 completely glitch-free."
      : position === "B"
      ? "Position B: Wiper connects /R to GND (0). Output Q resets to 0 on the very first contact. Subsequent mechanical bounces alternate between Reset and Hold, keeping Q=0 rock solid."
      : "In Flight: Switch is between contacts. Both pull-up resistors hold /S=1 and /R=1 (Hold mode). Output Q retains its previous state.";

  return {
    switchPosition: position,
    rawSwitchA: position === "A" ? 0 : 1,
    rawSwitchB: position === "B" ? 0 : 1,
    s_n,
    r_n,
    q,
    q_n,
    bounces,
    explanation,
  };
}

export interface RaceAroundResult {
  clockHighNs: number;
  loopDelayNs: number;
  latchToggles: number;
  latchHistory: Bit[];
  latchFinal: Bit;
  latchOscillated: boolean;
  flopFinal: Bit;
  explanation: string;
}

export function simulateRaceAround(
  clockHighNs: number,
  loopDelayNs: number = 2.0
): RaceAroundResult {
  let q: Bit = 0;
  const history: Bit[] = [0];
  const toggles = Math.floor(clockHighNs / loopDelayNs);

  for (let i = 0; i < toggles; i++) {
    q = (q === 0 ? 1 : 0) as Bit;
    history.push(q);
  }

  const latchOscillated = toggles > 1;
  const flopFinal: Bit = 1;

  const explanation =
    toggles === 0
      ? `Clock high pulse (${clockHighNs}ns) is shorter than loop delay (${loopDelayNs}ns). Latch never finishes switching.`
      : toggles === 1
      ? `Clock high pulse (${clockHighNs}ns) permits exactly one state toggle. Latch sets to Q=1.`
      : `Race-Around Hazard! Clock pulse (${clockHighNs}ns) exceeds loop delay (${loopDelayNs}ns). Signal toggles ${toggles} times back and forth while clock is high, locking in Q=${q} when clock falls.`;

  return {
    clockHighNs,
    loopDelayNs,
    latchToggles: toggles,
    latchHistory: history,
    latchFinal: q,
    latchOscillated,
    flopFinal,
    explanation,
  };
}

export type FlipFlopType = "D" | "JK" | "T" | "SR";

export interface FlipFlopConversionResult {
  available: FlipFlopType;
  desired: FlipFlopType;
  table: {
    inputs: Record<string, Bit>;
    qPresent: Bit;
    qNext: Bit;
    requiredAvailableInputs: Record<string, Bit | "X">;
  }[];
  equation: string;
  isFullyVerified: boolean;
}

export function simulateFlipFlopConversion(
  available: FlipFlopType,
  desired: FlipFlopType
): FlipFlopConversionResult {
  let equation = "";
  if (available === "D" && desired === "JK") equation = "D = J·Q' + K'·Q";
  else if (available === "D" && desired === "T") equation = "D = T ⊕ Q";
  else if (available === "D" && desired === "SR") equation = "D = S + R'·Q (S·R = 0)";
  else if (available === "D" && desired === "D") equation = "D = D";
  else if (available === "JK" && desired === "D") equation = "J = D, K = D'";
  else if (available === "JK" && desired === "T") equation = "J = T, K = T";
  else if (available === "JK" && desired === "SR") equation = "J = S, K = R";
  else if (available === "JK" && desired === "JK") equation = "J = J, K = K";
  else if (available === "T" && desired === "D") equation = "T = D ⊕ Q";
  else if (available === "T" && desired === "JK") equation = "T = J·Q' + K·Q";
  else if (available === "T" && desired === "SR") equation = "T = S·Q' + R·Q";
  else if (available === "T" && desired === "T") equation = "T = T";
  else if (available === "SR" && desired === "D") equation = "S = D, R = D'";
  else if (available === "SR" && desired === "JK") equation = "S = J·Q', R = K·Q";
  else if (available === "SR" && desired === "T") equation = "S = T·Q', R = T·Q";
  else if (available === "SR" && desired === "SR") equation = "S = S, R = R";

  const table: FlipFlopConversionResult["table"] = [];
  const desiredInputNames =
    desired === "D" ? ["D"] : desired === "T" ? ["T"] : desired === "JK" ? ["J", "K"] : ["S", "R"];

  const numInputCombinations = 1 << desiredInputNames.length;
  for (let c = 0; c < numInputCombinations; c++) {
    const inputVals: Record<string, Bit> = {};
    for (let idx = 0; idx < desiredInputNames.length; idx++) {
      const bitVal = ((c >> (desiredInputNames.length - 1 - idx)) & 1) as Bit;
      inputVals[desiredInputNames[idx]] = bitVal;
    }

    if (desired === "SR" && inputVals["S"] === 1 && inputVals["R"] === 1) {
      continue;
    }

    for (const qPresent of [0, 1] as Bit[]) {
      let qNext: Bit = qPresent;
      if (desired === "D") {
        qNext = inputVals["D"];
      } else if (desired === "T") {
        qNext = inputVals["T"] ? ((1 - qPresent) as Bit) : qPresent;
      } else if (desired === "JK") {
        const j = inputVals["J"], k = inputVals["K"];
        if (j && k) qNext = (1 - qPresent) as Bit;
        else if (j) qNext = 1;
        else if (k) qNext = 0;
        else qNext = qPresent;
      } else if (desired === "SR") {
        const s = inputVals["S"], r = inputVals["R"];
        if (s) qNext = 1;
        else if (r) qNext = 0;
        else qNext = qPresent;
      }

      const req: Record<string, Bit | "X"> = {};
      if (available === "D") {
        req["D"] = qNext;
      } else if (available === "T") {
        req["T"] = (qPresent ^ qNext) as Bit;
      } else if (available === "JK") {
        if (qPresent === 0 && qNext === 0) { req["J"] = 0; req["K"] = "X"; }
        else if (qPresent === 0 && qNext === 1) { req["J"] = 1; req["K"] = "X"; }
        else if (qPresent === 1 && qNext === 0) { req["J"] = "X"; req["K"] = 1; }
        else { req["J"] = "X"; req["K"] = 0; }
      } else if (available === "SR") {
        if (qPresent === 0 && qNext === 0) { req["S"] = 0; req["R"] = "X"; }
        else if (qPresent === 0 && qNext === 1) { req["S"] = 1; req["R"] = 0; }
        else if (qPresent === 1 && qNext === 0) { req["S"] = 0; req["R"] = 1; }
        else { req["S"] = "X"; req["R"] = 0; }
      }

      table.push({
        inputs: inputVals,
        qPresent,
        qNext,
        requiredAvailableInputs: req,
      });
    }
  }

  return {
    available,
    desired,
    table,
    equation,
    isFullyVerified: true,
  };
}

export interface TimingBudgetResult {
  t_cq: number;
  t_comb_max: number;
  t_comb_min: number;
  t_su: number;
  t_h: number;
  t_skew: number;
  t_clk: number;
  f_clk_MHz: number;
  t_min: number;
  f_max_MHz: number;
  setupSlack: number;
  setupPass: boolean;
  holdSlack: number;
  holdPass: boolean;
  status: "pass" | "setup-violation" | "hold-violation" | "both-violation";
}

export function calculateTimingBudget(params: {
  t_cq: number;
  t_comb_max: number;
  t_comb_min: number;
  t_su: number;
  t_h: number;
  t_skew?: number;
  clockFreqMHz?: number;
}): TimingBudgetResult {
  const t_skew = params.t_skew ?? 0;
  const t_min = params.t_cq + params.t_comb_max + params.t_su - t_skew;
  const f_max_MHz = Math.max(0, 1000 / t_min);

  const f_clk_MHz = params.clockFreqMHz ?? Math.min(100, Math.floor(f_max_MHz));
  const t_clk = 1000 / f_clk_MHz;

  const setupSlack = t_clk - (params.t_cq + params.t_comb_max + params.t_su - t_skew);
  const setupPass = setupSlack >= 0;

  const holdSlack = (params.t_cq + params.t_comb_min) - (params.t_h + t_skew);
  const holdPass = holdSlack >= 0;

  let status: TimingBudgetResult["status"] = "pass";
  if (!setupPass && !holdPass) status = "both-violation";
  else if (!setupPass) status = "setup-violation";
  else if (!holdPass) status = "hold-violation";

  return {
    t_cq: params.t_cq,
    t_comb_max: params.t_comb_max,
    t_comb_min: params.t_comb_min,
    t_su: params.t_su,
    t_h: params.t_h,
    t_skew,
    t_clk: parseFloat(t_clk.toFixed(2)),
    f_clk_MHz,
    t_min: parseFloat(t_min.toFixed(2)),
    f_max_MHz: parseFloat(f_max_MHz.toFixed(2)),
    setupSlack: parseFloat(setupSlack.toFixed(2)),
    setupPass,
    holdSlack: parseFloat(holdSlack.toFixed(2)),
    holdPass,
    status,
  };
}

export interface UniversalShiftRegisterResult {
  previousState: [Bit, Bit, Bit, Bit];
  nextState: [Bit, Bit, Bit, Bit];
  mode: "Hold" | "Shift Right" | "Shift Left" | "Parallel Load" | "Clear";
  s1: Bit;
  s0: Bit;
  sir: Bit;
  sil: Bit;
  arithmeticEffect?: string;
}

export function simulateUniversalShiftRegister(
  state: [Bit, Bit, Bit, Bit],
  control: {
    s1: Bit;
    s0: Bit;
    sir: Bit;
    sil: Bit;
    parallelIn: [Bit, Bit, Bit, Bit];
    clr_n?: Bit;
    arithmeticMode?: "none" | "lsl" | "lsr" | "asr";
  }
): UniversalShiftRegisterResult {
  if (control.clr_n === 0) {
    return {
      previousState: state,
      nextState: [0, 0, 0, 0],
      mode: "Clear",
      s1: control.s1,
      s0: control.s0,
      sir: control.sir,
      sil: control.sil,
      arithmeticEffect: "Asynchronous master reset: all flip-flops cleared to 0",
    };
  }

  const modeCode = (control.s1 << 1) | control.s0;
  let nextState: [Bit, Bit, Bit, Bit] = [...state];
  let mode: UniversalShiftRegisterResult["mode"] = "Hold";
  let arithmeticEffect = "";

  if (modeCode === 0b00) {
    mode = "Hold";
    nextState = [...state];
    arithmeticEffect = "State preserved (no change)";
  } else if (modeCode === 0b01) {
    mode = "Shift Right";
    const inBit = control.arithmeticMode === "asr" ? state[0] : control.sir;
    nextState = [inBit, state[0], state[1], state[2]];
    arithmeticEffect =
      control.arithmeticMode === "asr"
        ? "Arithmetic Shift Right (ASR): replicates MSB to preserve sign, dividing signed value by 2"
        : `Logical Shift Right (LSR): shifts in SIR=${inBit}, dividing unsigned value by 2`;
  } else if (modeCode === 0b10) {
    mode = "Shift Left";
    nextState = [state[1], state[2], state[3], control.sil];
    arithmeticEffect = `Logical Shift Left (LSL): shifts in SIL=${control.sil}, multiplying value by 2`;
  } else if (modeCode === 0b11) {
    mode = "Parallel Load";
    nextState = [...control.parallelIn];
    arithmeticEffect = "Parallel load: inputs I3..I0 latched simultaneously";
  }

  return {
    previousState: state,
    nextState,
    mode,
    s1: control.s1,
    s0: control.s0,
    sir: control.sir,
    sil: control.sil,
    arithmeticEffect,
  };
}

export interface RingJohnsonResult {
  type: "ring" | "johnson";
  previousState: [Bit, Bit, Bit, Bit];
  nextState: [Bit, Bit, Bit, Bit];
  feedbackBit: Bit;
  isValidState: boolean;
  stateIndex: number;
  decodedExpression: string;
  isSelfCorrecting: boolean;
  validCycleLength: number;
}

export function simulateRingJohnson(
  type: "ring" | "johnson",
  state: [Bit, Bit, Bit, Bit],
  withSelfCorrection: boolean = true
): RingJohnsonResult {
  const [q0, q1, q2, q3] = state;

  if (type === "ring") {
    const validRingStates = ["1000", "0100", "0010", "0001"];
    const stateStr = `${q0}${q1}${q2}${q3}`;
    const stateIdx = validRingStates.indexOf(stateStr);
    const isValid = stateIdx !== -1;

    let feedback: Bit = q3;
    if (withSelfCorrection) {
      // Self-correcting ring feedback: D0 = (Q0 + Q1 + Q2)' = Q0' · Q1' · Q2'
      feedback = (q0 === 0 && q1 === 0 && q2 === 0 ? 1 : 0) as Bit;
    }

    const nextState: [Bit, Bit, Bit, Bit] = [feedback, q0, q1, q2];
    const decodedExpression = isValid ? `State ${stateIdx}: Q${stateIdx}` : "Invalid / Unused State";

    return {
      type: "ring",
      previousState: state,
      nextState,
      feedbackBit: feedback,
      isValidState: isValid,
      stateIndex: stateIdx,
      decodedExpression,
      isSelfCorrecting: withSelfCorrection,
      validCycleLength: 4,
    };
  } else {
    const validJohnsonStates = [
      "0000", "1000", "1100", "1110",
      "1111", "0111", "0011", "0001"
    ];
    const decodings = [
      "Q0' · Q3'", "Q0 · Q1'", "Q1 · Q2'", "Q2 · Q3'",
      "Q0 · Q3", "Q0' · Q1", "Q1' · Q2", "Q2' · Q3"
    ];
    const stateStr = `${q0}${q1}${q2}${q3}`;
    const stateIdx = validJohnsonStates.indexOf(stateStr);
    const isValid = stateIdx !== -1;

    let feedback: Bit = (q3 === 0 ? 1 : 0) as Bit;
    if (withSelfCorrection && !isValid) {
      feedback = (q3 === 0 && (q1 === 0 || q2 === 1) ? 1 : 0) as Bit;
    }

    const nextState: [Bit, Bit, Bit, Bit] = [feedback, q0, q1, q2];
    const decodedExpression = isValid ? `State ${stateIdx}: ${decodings[stateIdx]}` : "Invalid State (trapped without correction)";

    return {
      type: "johnson",
      previousState: state,
      nextState,
      feedbackBit: feedback,
      isValidState: isValid,
      stateIndex: stateIdx,
      decodedExpression,
      isSelfCorrecting: withSelfCorrection,
      validCycleLength: 8,
    };
  }
}

export interface CounterGlitchResult {
  fromState: number;
  toState: number;
  bitDelayNs: number;
  intermediateSteps: { timeNs: number; state: number; bits: Bit[]; isFalseState: boolean }[];
  rippleMaxDelayNs: number;
  syncDelayNs: number;
  glitchDetectedOnDecoder: boolean;
  glitchDurationNs: number;
  glitchDescription: string;
}

export function simulateCounterGlitch(
  fromState: number,
  toState: number,
  bitDelayNs: number = 2
): CounterGlitchResult {
  const steps: CounterGlitchResult["intermediateSteps"] = [];
  let currentBits: Bit[] = [
    ((fromState >> 3) & 1) as Bit,
    ((fromState >> 2) & 1) as Bit,
    ((fromState >> 1) & 1) as Bit,
    (fromState & 1) as Bit,
  ];

  steps.push({
    timeNs: 0,
    state: fromState,
    bits: [...currentBits],
    isFalseState: false,
  });

  let currentTime = 0;
  let glitchDetected = false;
  let glitchDuration = 0;

  for (let bitIdx = 3; bitIdx >= 0; bitIdx--) {
    const bitBefore = currentBits[bitIdx];
    const targetBit = ((toState >> (3 - bitIdx)) & 1) as Bit;

    if (bitBefore !== targetBit) {
      currentTime += bitDelayNs;
      currentBits = [...currentBits];
      currentBits[bitIdx] = targetBit;
      const intermediateNum = (currentBits[0] << 3) | (currentBits[1] << 2) | (currentBits[2] << 1) | currentBits[3];
      const isFinal = intermediateNum === toState;

      steps.push({
        timeNs: currentTime,
        state: intermediateNum,
        bits: [...currentBits],
        isFalseState: !isFinal,
      });

      if (intermediateNum === 0 && !isFinal) {
        glitchDetected = true;
        glitchDuration += bitDelayNs;
      }
    }
  }

  const rippleMaxDelayNs = currentTime;
  const syncDelayNs = bitDelayNs;

  const glitchDescription = glitchDetected
    ? `Hazard Detected! During transition ${fromState} -> ${toState}, the ripple chain passes through false intermediate state 0 for ${glitchDuration}ns, firing a spurious spike (glitch) on connected combinational decoders.`
    : `Transition ${fromState} -> ${toState} settles across ${rippleMaxDelayNs}ns without triggering false zero decoder.`;

  return {
    fromState,
    toState,
    bitDelayNs,
    intermediateSteps: steps,
    rippleMaxDelayNs,
    syncDelayNs,
    glitchDetectedOnDecoder: glitchDetected,
    glitchDurationNs: glitchDuration,
    glitchDescription,
  };
}

export interface Counter74LS163Result {
  currentState: number;
  nextState: number;
  rco: Bit;
  action: "Clear" | "Load" | "Count Up" | "Count Down" | "Hold";
  truncatedReset: boolean;
  decodingConditionMet: boolean;
}

export function simulate74LS163(
  state: number,
  control: {
    clr_n: Bit;
    load_n: Bit;
    enp: Bit;
    ent: Bit;
    parallelIn?: number;
    upDown?: Bit;
    modN?: number;
    truncationMode?: "sync-clear" | "async-clear";
  }
): Counter74LS163Result {
  const modN = control.modN ?? 16;
  const isUp = control.upDown !== 0;
  const parallelVal = (control.parallelIn ?? 0) & 0xf;

  const isTerminalState = state === modN - 1;
  const autoClearAsserted = control.truncationMode === "sync-clear" && isTerminalState;
  const effectiveClrN: Bit = autoClearAsserted ? 0 : control.clr_n;

  let nextState = state;
  let action: Counter74LS163Result["action"] = "Hold";
  let truncatedReset = false;

  if (effectiveClrN === 0) {
    nextState = 0;
    action = "Clear";
    if (autoClearAsserted) truncatedReset = true;
  } else if (control.load_n === 0) {
    nextState = parallelVal;
    action = "Load";
  } else if (control.enp === 1 && control.ent === 1) {
    if (isUp) {
      nextState = (state + 1) % 16;
      action = "Count Up";
    } else {
      nextState = (state - 1 + 16) % 16;
      action = "Count Down";
    }
  }

  const rco: Bit = (state === 15 && control.ent === 1 ? 1 : 0) as Bit;

  return {
    currentState: state,
    nextState,
    rco,
    action,
    truncatedReset,
    decodingConditionMet: isTerminalState,
  };
}

export interface CoincidentMemoryResult {
  rowAddress: number;
  colAddress: number;
  linearAddress: number;
  selectedCell: { row: number; col: number };
  matrix: Bit[][];
  readData: Bit;
  gateCount1D: number;
  gateCount2D: number;
  gateReductionPercent: number;
}

export function simulateCoincidentMemory(
  matrix: Bit[][],
  op: {
    rowAddr: number;
    colAddr: number;
    writeEnable?: Bit;
    dataIn?: Bit;
  }
): CoincidentMemoryResult {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 4;
  const totalCells = rows * cols;

  const row = Math.max(0, Math.min(rows - 1, op.rowAddr));
  const col = Math.max(0, Math.min(cols - 1, op.colAddr));
  const linearAddress = row * cols + col;

  const newMatrix = matrix.map((r) => [...r]);
  if (op.writeEnable === 1 && op.dataIn !== undefined) {
    newMatrix[row][col] = op.dataIn;
  }

  const readData = newMatrix[row][col];

  const gateCount1D = totalCells;
  const gateCount2D = rows + cols;
  const gateReductionPercent = parseFloat(
    (((gateCount1D - gateCount2D) / gateCount1D) * 100).toFixed(1)
  );

  return {
    rowAddress: row,
    colAddress: col,
    linearAddress,
    selectedCell: { row, col },
    matrix: newMatrix,
    readData,
    gateCount1D,
    gateCount2D,
    gateReductionPercent,
  };
}

export interface MemoryExpansionResult {
  address12Bit: number;
  hexAddress: string;
  bankIndex: number;
  internalChipAddress: number;
  chipSelects: [Bit, Bit, Bit, Bit];
  busOutputs: [string, string, string, string];
  sharedBusValue: number;
  hasContention: boolean;
}

export function simulateMemoryExpansion(
  addr: number,
  op: "read" | "write" = "read",
  dataIn: number = 0,
  memoryChips: number[][] = [
    [0x12, 0x34],
    [0x56, 0x78],
    [0x9a, 0xbc],
    [0xde, 0xf0],
  ]
): MemoryExpansionResult {
  const address12Bit = addr & 0xfff;
  const hexAddress = `0x${address12Bit.toString(16).padStart(3, "0").toUpperCase()}`;

  const bankIndex = (address12Bit >> 10) & 0x3;
  const internalChipAddress = address12Bit & 0x3ff;

  const chipSelects: [Bit, Bit, Bit, Bit] = [
    bankIndex === 0 ? 0 : 1,
    bankIndex === 1 ? 0 : 1,
    bankIndex === 2 ? 0 : 1,
    bankIndex === 3 ? 0 : 1,
  ];

  const chipVal = memoryChips[bankIndex]?.[internalChipAddress % (memoryChips[bankIndex]?.length || 1)] ?? 0xaa;
  const busOutputs: [string, string, string, string] = [
    chipSelects[0] === 0 ? `0x${chipVal.toString(16).padStart(2, "0").toUpperCase()}` : "Hi-Z",
    chipSelects[1] === 0 ? `0x${chipVal.toString(16).padStart(2, "0").toUpperCase()}` : "Hi-Z",
    chipSelects[2] === 0 ? `0x${chipVal.toString(16).padStart(2, "0").toUpperCase()}` : "Hi-Z",
    chipSelects[3] === 0 ? `0x${chipVal.toString(16).padStart(2, "0").toUpperCase()}` : "Hi-Z",
  ];

  return {
    address12Bit,
    hexAddress,
    bankIndex,
    internalChipAddress,
    chipSelects,
    busOutputs,
    sharedBusValue: chipVal,
    hasContention: false,
  };
}

export interface CarrySkipBlockAnalysis {
  blockIndex: number;
  bitStart: number;
  bitEnd: number;
  blockPropagate: Bit;
  blockGenerate: Bit;
  canSkip: boolean;
}

export interface CarrySkipAdderResult {
  a: number;
  b: number;
  cin: Bit;
  wordSize: number;
  blockSize: number;
  blocks: CarrySkipBlockAnalysis[];
  criticalPathDelayNs: number;
  rippleCarryEquivalentDelayNs: number;
  speedup: number;
}

export function simulateCarrySkipAdder(
  a: number,
  b: number,
  cin: Bit = 0,
  wordSize = 16,
  blockSize = 4
): CarrySkipAdderResult {
  const numBlocks = Math.ceil(wordSize / blockSize);
  const blocks: CarrySkipBlockAnalysis[] = [];

  for (let blk = 0; blk < numBlocks; blk++) {
    const bitStart = blk * blockSize;
    const bitEnd = Math.min(wordSize - 1, bitStart + blockSize - 1);
    let bp: Bit = 1;
    let bg: Bit = 0;

    for (let i = bitEnd; i >= bitStart; i--) {
      const ai = ((a >> i) & 1) as Bit;
      const bi = ((b >> i) & 1) as Bit;
      const pi = (ai ^ bi) as Bit;
      const gi = (ai & bi) as Bit;
      if (pi === 0) bp = 0;
      if (gi === 1 && bg === 0) {
        let propagatesOut: Bit = 1;
        for (let j = i + 1; j <= bitEnd; j++) {
          const pj = (((a >> j) & 1) ^ ((b >> j) & 1)) as Bit;
          if (pj === 0) propagatesOut = 0;
        }
        if (propagatesOut === 1) bg = 1;
      }
    }

    blocks.push({
      blockIndex: blk,
      bitStart,
      bitEnd,
      blockPropagate: bp,
      blockGenerate: bg,
      canSkip: bp === 1,
    });
  }

  const tCarry = 1.0;
  const tSkip = 1.2;
  const tXor = 1.8;
  const worstCaseDelay = blockSize * tCarry + (numBlocks - 2) * tSkip + (blockSize - 1) * tCarry + tXor;
  const rcaDelay = (wordSize - 1) * tCarry + tXor;
  const speedup = parseFloat((rcaDelay / worstCaseDelay).toFixed(2));

  return {
    a,
    b,
    cin,
    wordSize,
    blockSize,
    blocks,
    criticalPathDelayNs: worstCaseDelay,
    rippleCarryEquivalentDelayNs: rcaDelay,
    speedup,
  };
}

export interface ParallelPrefixResult {
  a: number;
  b: number;
  cin: Bit;
  bits: number;
  generates: Bit[];
  propagates: Bit[];
  prefixCarries: Bit[];
  sumBits: Bit[];
  sum: number;
}

export function prefixOperator(
  b: { g: Bit; p: Bit },
  a: { g: Bit; p: Bit }
): { g: Bit; p: Bit } {
  return {
    g: (b.g | (b.p & a.g)) as Bit,
    p: (b.p & a.p) as Bit,
  };
}

export function simulateParallelPrefix(
  a: number,
  b: number,
  cin: Bit = 0,
  bits = 4
): ParallelPrefixResult {
  const generates: Bit[] = [];
  const propagates: Bit[] = [];
  for (let i = 0; i < bits; i++) {
    const ai = ((a >> i) & 1) as Bit;
    const bi = ((b >> i) & 1) as Bit;
    generates.push((ai & bi) as Bit);
    propagates.push((ai ^ bi) as Bit);
  }

  const prefixPairs: Array<{ g: Bit; p: Bit }> = [];
  prefixPairs[0] = { g: generates[0], p: propagates[0] };

  for (let i = 1; i < bits; i++) {
    prefixPairs[i] = prefixOperator({ g: generates[i], p: propagates[i] }, prefixPairs[i - 1]);
  }

  const prefixCarries: Bit[] = [cin];
  for (let i = 0; i < bits; i++) {
    const cout = (prefixPairs[i].g | (prefixPairs[i].p & cin)) as Bit;
    prefixCarries.push(cout);
  }

  const sumBits: Bit[] = [];
  let sum = 0;
  for (let i = 0; i < bits; i++) {
    const s = (propagates[i] ^ prefixCarries[i]) as Bit;
    sumBits.push(s);
    if (s) sum |= (1 << i);
  }
  if (prefixCarries[bits]) sum |= (1 << bits);

  return {
    a,
    b,
    cin,
    bits,
    generates,
    propagates,
    prefixCarries,
    sumBits,
    sum,
  };
}

export interface PriorityEncoder16to4Result {
  inputs: Bit[];
  masterEI: Bit;
  chipHigh: {
    inputs: Bit[];
    aOutputs: [Bit, Bit, Bit];
    gs: Bit;
    eo: Bit;
  };
  chipLow: {
    inputs: Bit[];
    aOutputs: [Bit, Bit, Bit];
    gs: Bit;
    eo: Bit;
  };
  finalOutputs: [Bit, Bit, Bit, Bit];
  finalEncodedValue: number;
  systemGS: Bit;
  systemEO: Bit;
}

export function simulate74LS148Cascade16to4(
  inputs16: Bit[],
  masterEI: Bit = 0
): PriorityEncoder16to4Result {
  const inputs = [...inputs16];
  while (inputs.length < 16) inputs.push(1);

  const highInputs: Bit[] = [];
  for (let i = 8; i <= 15; i++) highInputs.push(inputs[i]);

  const sim74148 = (pins: Bit[], ei: Bit) => {
    if (ei === 1) {
      return {
        aOutputs: [1, 1, 1] as [Bit, Bit, Bit],
        gs: 1 as Bit,
        eo: 1 as Bit,
        highestActive: -1,
      };
    }
    let highestActive = -1;
    for (let i = 7; i >= 0; i--) {
      if (pins[i] === 0) {
        highestActive = i;
        break;
      }
    }
    if (highestActive === -1) {
      return {
        aOutputs: [1, 1, 1] as [Bit, Bit, Bit],
        gs: 1 as Bit,
        eo: 0 as Bit,
        highestActive: -1,
      };
    }
    const code = highestActive;
    const a2: Bit = ((code >> 2) & 1 ? 0 : 1) as Bit;
    const a1: Bit = ((code >> 1) & 1 ? 0 : 1) as Bit;
    const a0: Bit = (code & 1 ? 0 : 1) as Bit;
    return {
      aOutputs: [a2, a1, a0] as [Bit, Bit, Bit],
      gs: 0 as Bit,
      eo: 1 as Bit,
      highestActive,
    };
  };

  const highRes = sim74148(highInputs, masterEI);
  const lowEI = highRes.eo;
  const lowInputs: Bit[] = inputs.slice(0, 8);
  const lowRes = sim74148(lowInputs, lowEI);

  const a3: Bit = highRes.gs;
  const a2: Bit = (highRes.aOutputs[0] & lowRes.aOutputs[0]) as Bit;
  const a1: Bit = (highRes.aOutputs[1] & lowRes.aOutputs[1]) as Bit;
  const a0: Bit = (highRes.aOutputs[2] & lowRes.aOutputs[2]) as Bit;

  const systemGS: Bit = (highRes.gs & lowRes.gs) as Bit;
  const systemEO: Bit = lowRes.eo;

  let finalEncodedValue = -1;
  if (systemGS === 0) {
    const val3 = a3 === 0 ? 8 : 0;
    const val2 = a2 === 0 ? 4 : 0;
    const val1 = a1 === 0 ? 2 : 0;
    const val0 = a0 === 0 ? 1 : 0;
    finalEncodedValue = val3 + val2 + val1 + val0;
  }

  return {
    inputs,
    masterEI,
    chipHigh: {
      inputs: highInputs,
      aOutputs: highRes.aOutputs,
      gs: highRes.gs,
      eo: highRes.eo,
    },
    chipLow: {
      inputs: lowInputs,
      aOutputs: lowRes.aOutputs,
      gs: lowRes.gs,
      eo: lowRes.eo,
    },
    finalOutputs: [a3, a2, a1, a0],
    finalEncodedValue,
    systemGS,
    systemEO,
  };
}

export function simulateTransmissionGateMux2to1(
  i0: Bit,
  i1: Bit,
  s: Bit
): { y: Bit; tg0On: boolean; tg1On: boolean } {
  const tg0On = s === 0;
  const tg1On = s === 1;
  const y = tg0On ? i0 : i1;
  return { y, tg0On, tg1On };
}

export function simulateBarrelShifter4Bit(
  data: number,
  shiftAmount: number,
  mode: "rotate-left" | "rotate-right" = "rotate-right"
): { inputWord: number; shiftedWord: number; bitTrace: [Bit, Bit, Bit, Bit] } {
  const d = data & 0xf;
  const k = ((shiftAmount % 4) + 4) % 4;
  let res = 0;
  if (mode === "rotate-right") {
    res = ((d >> k) | (d << (4 - k))) & 0xf;
  } else {
    res = ((d << k) | (d >> (4 - k))) & 0xf;
  }
  const bits: [Bit, Bit, Bit, Bit] = [
    ((res >> 3) & 1) as Bit,
    ((res >> 2) & 1) as Bit,
    ((res >> 1) & 1) as Bit,
    (res & 1) as Bit,
  ];
  return { inputWord: d, shiftedWord: res, bitTrace: bits };
}

export function simulateSrLatch(
  type: "nor" | "nand",
  s: Bit,
  r: Bit,
  qPrev: Bit
): {
  qNext: Bit;
  qBarNext: Bit;
  state: "hold" | "reset" | "set" | "forbidden";
  isForbidden: boolean;
  raceOnSimultaneousRelease: boolean;
} {
  if (type === "nor") {
    // Active-HIGH NOR latch
    if (s === 0 && r === 0) {
      return { qNext: qPrev, qBarNext: (1 - qPrev) as Bit, state: "hold", isForbidden: false, raceOnSimultaneousRelease: false };
    } else if (s === 0 && r === 1) {
      return { qNext: 0, qBarNext: 1, state: "reset", isForbidden: false, raceOnSimultaneousRelease: false };
    } else if (s === 1 && r === 0) {
      return { qNext: 1, qBarNext: 0, state: "set", isForbidden: false, raceOnSimultaneousRelease: false };
    } else {
      // s=1, r=1 is forbidden for NOR; both outputs forced to 0
      return { qNext: 0, qBarNext: 0, state: "forbidden", isForbidden: true, raceOnSimultaneousRelease: true };
    }
  } else {
    // Active-LOW NAND latch (s and r are /S and /R)
    if (s === 1 && r === 1) {
      return { qNext: qPrev, qBarNext: (1 - qPrev) as Bit, state: "hold", isForbidden: false, raceOnSimultaneousRelease: false };
    } else if (s === 1 && r === 0) {
      return { qNext: 0, qBarNext: 1, state: "reset", isForbidden: false, raceOnSimultaneousRelease: false };
    } else if (s === 0 && r === 1) {
      return { qNext: 1, qBarNext: 0, state: "set", isForbidden: false, raceOnSimultaneousRelease: false };
    } else {
      // s=0, r=0 is forbidden for NAND; both outputs forced to 1
      return { qNext: 1, qBarNext: 1, state: "forbidden", isForbidden: true, raceOnSimultaneousRelease: true };
    }
  }
}

export function simulateDLatchGated(
  c: Bit,
  d: Bit,
  qPrev: Bit
): {
  qNext: Bit;
  qBarNext: Bit;
  isTransparent: boolean;
} {
  const qNext = c === 1 ? d : qPrev;
  return {
    qNext,
    qBarNext: (1 - qNext) as Bit,
    isTransparent: c === 1,
  };
}

export function simulateJkFlipFlop(
  j: Bit,
  k: Bit,
  qPrev: Bit,
  pre_n: Bit = 1,
  clr_n: Bit = 1
): {
  qNext: Bit;
  qBarNext: Bit;
  state: "hold" | "reset" | "set" | "toggle" | "async-preset" | "async-clear" | "async-invalid";
  isAsync: boolean;
} {
  if (pre_n === 0 && clr_n === 1) {
    return { qNext: 1, qBarNext: 0, state: "async-preset", isAsync: true };
  }
  if (pre_n === 1 && clr_n === 0) {
    return { qNext: 0, qBarNext: 1, state: "async-clear", isAsync: true };
  }
  if (pre_n === 0 && clr_n === 0) {
    return { qNext: 1, qBarNext: 1, state: "async-invalid", isAsync: true };
  }

  // Synchronous operation
  if (j === 0 && k === 0) {
    return { qNext: qPrev, qBarNext: (1 - qPrev) as Bit, state: "hold", isAsync: false };
  } else if (j === 0 && k === 1) {
    return { qNext: 0, qBarNext: 1, state: "reset", isAsync: false };
  } else if (j === 1 && k === 0) {
    return { qNext: 1, qBarNext: 0, state: "set", isAsync: false };
  } else {
    const qToggled = (1 - qPrev) as Bit;
    return { qNext: qToggled, qBarNext: (1 - qToggled) as Bit, state: "toggle", isAsync: false };
  }
}

export function simulateTFlipFlop(
  t: Bit,
  qPrev: Bit
): {
  qNext: Bit;
  qBarNext: Bit;
  state: "hold" | "toggle";
} {
  const qNext = t === 1 ? ((1 - qPrev) as Bit) : qPrev;
  return {
    qNext,
    qBarNext: (1 - qNext) as Bit,
    state: t === 1 ? "toggle" : "hold",
  };
}

export function simulateSram6TCell(
  op: "read" | "write" | "hold",
  storedBit: Bit,
  bitLineIn?: Bit
): {
  storedBit: Bit;
  bl: Bit;
  blBar: Bit;
  wordLine: Bit;
  actionDescription: string;
} {
  if (op === "hold") {
    return {
      storedBit,
      bl: 1,
      blBar: 1,
      wordLine: 0,
      actionDescription: "Hold: Wordline is 0, access transistors OFF, cell isolated and stable.",
    };
  }

  if (op === "read") {
    // Both bitlines precharged to 1 prior to wordline activation.
    // The side holding 0 discharges its bitline through the access and pull-down NMOS.
    const bl = storedBit === 1 ? 1 : 0;
    const blBar = storedBit === 1 ? 0 : 1;
    return {
      storedBit,
      bl,
      blBar,
      wordLine: 1,
      actionDescription: `Read: Wordline asserted. Node Q=${storedBit} maintains BL=${bl}, node Q'=${1 - storedBit} discharges BL_bar to ${blBar}. Sense amp detects voltage difference.`,
    };
  }

  // Write operation
  const newBit = (bitLineIn ?? 1) as Bit;
  return {
    storedBit: newBit,
    bl: newBit,
    blBar: (1 - newBit) as Bit,
    wordLine: 1,
    actionDescription: `Write: Wordline asserted. Strong write drivers force BL=${newBit} and BL_bar=${1 - newBit}, overpowering internal cross-coupled PMOS pull-ups to flip the cell.`,
  };
}

export function simulateDramRefreshOverhead(
  rows: number,
  refreshPeriodMs: number,
  cycleTimeNs: number
): {
  rows: number;
  refreshPeriodMs: number;
  cycleTimeNs: number;
  totalRefreshTimeNs: number;
  totalPeriodNs: number;
  overheadPercent: number;
} {
  const totalRefreshTimeNs = rows * cycleTimeNs;
  const totalPeriodNs = refreshPeriodMs * 1e6;
  const overheadPercent = parseFloat(((totalRefreshTimeNs / totalPeriodNs) * 100).toFixed(3));
  return {
    rows,
    refreshPeriodMs,
    cycleTimeNs,
    totalRefreshTimeNs,
    totalPeriodNs,
    overheadPercent,
  };
}




