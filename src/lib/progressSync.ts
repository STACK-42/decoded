/* Keeps progress in step with the signed-in account. localStorage stays the
   copy the UI reads. On a browser's first sign-in its progress is merged into
   the account; after that the account wins on load, so a lesson unmarked on
   one device doesn't come back from another. Changes wait in a saved queue
   until the API has accepted them, so being offline loses nothing. */

import type { ProgressMap } from "@/lib/progressBackup";
import {
  clearLastLesson,
  isBetterScore,
  readLastLesson,
  readProgress,
  readQuizScores,
  writeProgress,
  writeQuizScores,
  type QuizScore,
  type QuizScores,
} from "@/lib/progressStore";

export const API_URL = import.meta.env.VITE_API_URL ?? "https://decoded-api.stack42.tech";

const ACCOUNT_KEY = "decoded:account:v1";

export type AccountStatus = "unknown" | "unavailable" | "signed-out" | "signed-in";

/** "course/lesson" -> true to mark complete, false to unmark. Present only once linked to an account. */
type Pending = Record<string, boolean>;

export type AccountProfile = { name: string | null; avatarUrl: string | null };

let status: AccountStatus = "unknown";
let profile: AccountProfile | null = null;
let enrollments: Record<string, number> = {};
let flushing = false;
const listeners = new Set<() => void>();

function setStatus(next: AccountStatus) {
  status = next;
  if (next === "signed-out") enrollments = {};
  listeners.forEach((listener) => listener());
}

export function getAccountStatus() {
  return status;
}

export function getAccountProfile() {
  return profile;
}

/** course slug -> when the signed-in user registered for it */
export function getEnrollments() {
  return enrollments;
}

export function subscribeAccountStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function loadPending(): Pending | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

function savePending(pending: Pending) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(pending));
  } catch {
    /* ignore quota errors */
  }
}

function forgetAccount() {
  try {
    localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Every lesson that differs between two progress maps. */
export function diffProgress(before: ProgressMap, after: ProgressMap): Pending {
  const changes: Pending = {};
  for (const course of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const was = new Set(before[course] ?? []);
    const now = new Set(after[course] ?? []);
    for (const lesson of now) if (!was.has(lesson)) changes[`${course}/${lesson}`] = true;
    for (const lesson of was) if (!now.has(lesson)) changes[`${course}/${lesson}`] = false;
  }
  return changes;
}

function toRequestBody(pending: Pending) {
  const add: string[][] = [];
  const remove: string[][] = [];
  for (const [key, done] of Object.entries(pending)) (done ? add : remove).push(key.split("/"));
  return JSON.stringify({ add, remove });
}

async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const sent = loadPending();
      if (!sent) return;
      const response = await fetch(`${API_URL}/progress`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: toRequestBody(sent),
      });
      if (response.status === 401) {
        setStatus("signed-out");
        return;
      }
      if (!response.ok && response.status !== 400 && response.status !== 413) return;

      // Keep anything changed while the request was in flight. A rejected batch
      // would fail the same way every time, so it's dropped instead of retried.
      const remaining = loadPending() ?? {};
      for (const [key, done] of Object.entries(sent)) if (remaining[key] === done) delete remaining[key];
      savePending(remaining);

      if (Object.keys(remaining).length > 0) continue;
      if (response.ok) writeProgress(((await response.json()) as { progress: ProgressMap }).progress);
      return;
    }
  } catch {
    /* offline: the queue is saved, so the next load or reconnect sends it */
  } finally {
    flushing = false;
  }
}

/** Queues a local change for the account. Does nothing for signed-out visitors. */
export function queueProgressChange(before: ProgressMap, after: ProgressMap) {
  const pending = loadPending();
  if (!pending) return;
  savePending({ ...pending, ...diffProgress(before, after) });
  if (status === "signed-in") void flush();
}

export async function syncProgress() {
  let body: { signedIn: boolean; user?: AccountProfile; progress?: ProgressMap; enrollments?: Record<string, number>; quizScores?: QuizScores };
  try {
    const response = await fetch(`${API_URL}/progress`, { credentials: "include" });
    if (!response.ok) throw new Error(String(response.status));
    body = await response.json();
  } catch {
    if (status === "unknown") setStatus("unavailable");
    return;
  }

  if (!body.signedIn) {
    forgetAccount();
    setStatus("signed-out");
    return;
  }

  // Nothing queued for this browser yet means this is its first sign-in.
  const pending = loadPending() ?? diffProgress({}, readProgress());
  savePending(pending);
  profile = body.user ?? null;
  enrollments = body.enrollments ?? {};
  setStatus("signed-in");

  await mergeQuizScores(body.quizScores ?? {});

  if (Object.keys(pending).length > 0) await flush();
  else writeProgress(body.progress ?? {});
}

function postQuizScore(key: string, score: QuizScore) {
  const [course, lesson] = key.split("/");
  return fetch(`${API_URL}/quiz-scores`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course, lesson, ...score }),
  });
}

/** Keeps the better of each score from this browser and the account, on both sides. */
async function mergeQuizScores(server: QuizScores) {
  const local = readQuizScores();
  const merged: QuizScores = { ...server };
  for (const [key, score] of Object.entries(local)) {
    if (!isBetterScore(score, server[key])) continue;
    merged[key] = score;
    await postQuizScore(key, score).catch(() => undefined);
  }
  writeQuizScores(merged);
}

/** Saves a finished quiz if it beats the best so far. Offline attempts reach the account on the next load. */
export function recordQuizScore(course: string, lesson: string, score: QuizScore) {
  const key = `${course}/${lesson}`;
  const scores = readQuizScores();
  if (!isBetterScore(score, scores[key])) return;
  writeQuizScores({ ...scores, [key]: score });
  if (status === "signed-in") void postQuizScore(key, score).catch(() => undefined);
}

export async function registerForCourse(course: string) {
  const response = await fetch(`${API_URL}/enrollments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course }),
  });
  if (!response.ok) throw new Error(String(response.status));
  enrollments = ((await response.json()) as { enrollments: Record<string, number> }).enrollments;
  listeners.forEach((listener) => listener());
}

/** Leaves a course. The server clears its progress too, so this browser's copy and queue follow. */
export async function leaveCourse(course: string) {
  const response = await fetch(`${API_URL}/enrollments/remove`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course }),
  });
  if (!response.ok) throw new Error(String(response.status));
  enrollments = ((await response.json()) as { enrollments: Record<string, number> }).enrollments;

  const pending = loadPending();
  if (pending) {
    for (const key of Object.keys(pending)) if (key.startsWith(`${course}/`)) delete pending[key];
    savePending(pending);
  }
  if (readLastLesson()?.course === course) clearLastLesson();
  writeQuizScores(Object.fromEntries(Object.entries(readQuizScores()).filter(([key]) => !key.startsWith(`${course}/`))));
  const { [course]: _left, ...rest } = readProgress();
  writeProgress(rest);
  listeners.forEach((listener) => listener());
}

export function signIn(provider: "github" | "google", returnTo = window.location.pathname + window.location.search) {
  window.location.href = `${API_URL}/auth/${provider}/start?return=${encodeURIComponent(returnTo)}`;
}

/** Signs out and clears this browser's copy, so the next person's sign-in can't absorb it. */
export async function signOut() {
  await flush();
  if (Object.keys(loadPending() ?? {}).length > 0) throw new Error("unsaved progress");
  const response = await fetch(`${API_URL}/auth/sign-out`, { method: "POST", credentials: "include" });
  if (!response.ok) throw new Error(String(response.status));
  forgetAccount();
  clearLastLesson();
  writeQuizScores({});
  writeProgress({});
  setStatus("signed-out");
}

/** Deletes the account and everything saved with it. */
export async function deleteAccount() {
  const response = await fetch(`${API_URL}/account/delete`, { method: "POST", credentials: "include" });
  if (!response.ok) throw new Error(String(response.status));
  forgetAccount();
  clearLastLesson();
  writeQuizScores({});
  writeProgress({});
  setStatus("signed-out");
}

let started = false;

export function startProgressSync() {
  if (started) return;
  started = true;
  void syncProgress();
  window.addEventListener("online", () => void flush());
}

/** Test hook: forget in-memory state between tests. */
export function resetProgressSyncForTests() {
  status = "unknown";
  profile = null;
  enrollments = {};
  flushing = false;
  started = false;
  listeners.clear();
}
