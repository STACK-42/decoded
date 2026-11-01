import type { ProgressMap } from "@/lib/progressBackup";

const STORAGE_KEY = "decoded:progress:v1";
const LAST_LESSON_KEY = "decoded:last-lesson:v1";
const QUIZ_SCORES_KEY = "decoded:quiz-scores:v1";

export function readProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function writeProgress(map: ProgressMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("decoded:progress"));
  } catch {
    /* ignore quota errors */
  }
}

export type LastLesson = { course: string; lesson: string };

/** The lesson last opened on this device, for "continue where you left off". */
export function readLastLesson(): LastLesson | null {
  try {
    const raw = localStorage.getItem(LAST_LESSON_KEY);
    return raw ? (JSON.parse(raw) as LastLesson) : null;
  } catch {
    return null;
  }
}

export function writeLastLesson(last: LastLesson) {
  try {
    localStorage.setItem(LAST_LESSON_KEY, JSON.stringify(last));
  } catch {
    /* ignore quota errors */
  }
}

export function clearLastLesson() {
  try {
    localStorage.removeItem(LAST_LESSON_KEY);
  } catch {
    /* storage unavailable */
  }
}

export type QuizScore = { best: number; total: number };
/** "course/lesson" -> the best attempt at that quiz */
export type QuizScores = Record<string, QuizScore>;

export function readQuizScores(): QuizScores {
  try {
    const raw = localStorage.getItem(QUIZ_SCORES_KEY);
    return raw ? (JSON.parse(raw) as QuizScores) : {};
  } catch {
    return {};
  }
}

export function writeQuizScores(scores: QuizScores) {
  try {
    localStorage.setItem(QUIZ_SCORES_KEY, JSON.stringify(scores));
    window.dispatchEvent(new CustomEvent("decoded:progress"));
  } catch {
    /* ignore quota errors */
  }
}

export function isBetterScore(next: QuizScore, current: QuizScore | undefined) {
  return !current || next.best * current.total > current.best * next.total;
}
