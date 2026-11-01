import type { Frame } from "@/lib/algorithms";
import { gcd, inverseMod, mod } from "@/lib/numberTheory";

/* ============================================================
   Classical ciphers and a toy stream cipher. Letters map to
   A = 0 ... Z = 25, and anything else passes through unchanged.
   These are for learning. None of them is safe to use.
   ============================================================ */

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const mapLetters = (text: string, f: (m: number) => number) =>
  text.toUpperCase().replace(/[A-Z]/g, (ch) => ALPHABET[mod(f(ch.charCodeAt(0) - 65), 26)]);

export const shiftEncrypt = (text: string, k: number) => mapLetters(text, (m) => m + k);
export const shiftDecrypt = (text: string, k: number) => mapLetters(text, (c) => c - k);

export const validAffineKey = (k1: number) => gcd(k1, 26) === 1;
export const VALID_K1 = Array.from({ length: 25 }, (_, i) => i + 1).filter(validAffineKey);

export const affineEncrypt = (text: string, k1: number, k2: number) => mapLetters(text, (m) => k1 * m + k2);

export function affineDecrypt(text: string, k1: number, k2: number): string | null {
  const inv = inverseMod(mod(k1, 26), 26);
  if (inv === null) return null;
  return mapLetters(text, (c) => inv * (c - k2));
}

/** Where each of the 26 letters lands. */
export const affineTable = (k1: number, k2: number) => Array.from({ length: 26 }, (_, m) => mod(k1 * m + k2, 26));

/* -------------------------------- stream cipher ------------------------------ */

export const textToBits = (text: string) => text.split("").flatMap((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0").split("").map(Number));
export const bitsToText = (bits: number[]) => Array.from({ length: Math.floor(bits.length / 8) }, (_, i) => String.fromCharCode(parseInt(bits.slice(i * 8, i * 8 + 8).join(""), 2))).join("");

/** A toy 16-bit LFSR. Real stream ciphers use far stronger generators. */
export function keystream(seed: number, count: number): number[] {
  let s = seed & 0xffff || 1;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const bit = ((s >> 0) ^ (s >> 2) ^ (s >> 3) ^ (s >> 5)) & 1;
    s = (s >> 1) | (bit << 15);
    out.push(s & 1);
  }
  return out;
}

export const xorBits = (a: number[], b: number[]) => a.map((x, i) => x ^ b[i]);

export type XorState = { input: number[]; key: number[]; output: (number | null)[]; at: number | null; decrypt: boolean };

export const MATLAB_XOR = ["m = double(dec2bin('HI', 8)' - '0');", "k = randi([0 1], size(m));   % the key stream", "c = xor(m, k)                % encrypt", "m2 = xor(c, k)               % decrypt"];

export function xorFrames(input: number[], key: number[], decrypt: boolean): Frame<XorState>[] {
  const output: (number | null)[] = input.map(() => null);
  const line = decrypt ? 3 : 2;
  const frames: Frame<XorState>[] = [{ state: { input, key, output: [...output], at: null, decrypt }, line, message: decrypt ? "XOR the ciphertext with the same key stream, using the same generator and seed." : "Mix the plaintext with the key stream, one bit at a time.", stats: { bits: 0 } }];
  input.forEach((b, i) => {
    output[i] = b ^ key[i];
    frames.push({ state: { input, key, output: [...output], at: i, decrypt }, line, message: `Bit ${i + 1}: ${b} XOR ${key[i]} = ${b ^ key[i]}. ${b === key[i] ? "They match, so the result is 0." : "They differ, so the result is 1."}`, stats: { bits: i + 1 } });
  });
  frames.push({ state: { input, key, output: [...output], at: null, decrypt }, line, message: decrypt ? `The original message is back: "${bitsToText(output as number[])}". XOR-ing with the same key twice cancels out.` : "Done. Without the key stream, these bits look random.", stats: { bits: input.length } });
  return frames;
}

/* ------------------------------ secret-key flow ------------------------------ */

export type FlowState = { stage: 0 | 1 | 2 | 3 | 4; plain: string; cipher: string; k: number };

export const FLOW_CODE = ["c = E(k, m);   % sender encrypts", "% c crosses the public channel", "m = D(k, c);   % receiver decrypts"];

export function flowFrames(plain: string, k: number): Frame<FlowState>[] {
  const cipher = shiftEncrypt(plain, k);
  const msgs = [
    `The sender and the receiver already share the secret key k = ${k}, sent over a secure channel. Now the sender has the message "${plain}".`,
    `The sender computes c = E(k, m) = "${cipher}".`,
    `"${cipher}" crosses the public channel. Anybody can read it, but without k it means nothing to them.`,
    `The receiver computes D(k, c), using the same key.`,
    `The receiver gets "${plain}" back: D(k, E(k, m)) = m.`,
  ];
  return msgs.map((message, i) => ({ state: { stage: i as FlowState["stage"], plain, cipher, k }, line: i < 2 ? 0 : i === 2 ? 1 : 2, message, stats: {} }));
}
