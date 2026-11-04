/* The review queue: a Leitner system over question-bank ids. Every answered question
   becomes a card in one of five boxes; each box comes back after a longer gap. Pure
   functions take "today" as a parameter so they can be tested; the storage helpers at
   the end read and write localStorage. Design: docs/exams.md. */

/** Days until a card in box 1..5 is due again. */
export const BOX_DAYS = [1, 2, 4, 8, 16] as const;
export const SESSION_SIZE = 20;

export type Card = {
  /** Box 1..5. */
  box: number;
  /** Local date (YYYY-MM-DD) the card is next due. */
  due: string;
  /** Times answered, and times answered wrong. */
  seen: number;
  lapses: number;
};
export type Cards = Record<string, Card>;

/** A local calendar date as YYYY-MM-DD (not UTC: a review "tomorrow" means the reader's tomorrow). */
export function localDay(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + days));
}

const daysFor = (box: number) => BOX_DAYS[Math.min(Math.max(box, 1), BOX_DAYS.length) - 1];

/**
 * The card after one answer.
 * - A new card starts in box 1; a right first answer moves it straight to box 2.
 * - Wrong, at any time: back to box 1, due tomorrow. Forgetting matters whenever it shows.
 * - Right while due (or overdue): up one box, due after that box's gap.
 * - Right before it's due (say, retaking a quiz the same day): no change, so cramming
 *   can't push a card out to 16 days. That's the spacing effect at work.
 */
export function answer(card: Card | undefined, correct: boolean, today: string): Card {
  const c: Card = card ?? { box: 0, due: today, seen: 0, lapses: 0 };
  const seen = c.seen + 1;
  if (!correct) return { box: 1, due: addDays(today, daysFor(1)), seen, lapses: c.lapses + 1 };
  if (card && card.due > today) return { ...card, seen };
  const box = card ? Math.min(card.box + 1, BOX_DAYS.length) : 2;
  return { box, due: addDays(today, daysFor(box)), seen, lapses: c.lapses };
}

/** Ids due on or before today, most overdue first. */
export function dueIds(cards: Cards, today: string): string[] {
  return Object.entries(cards)
    .filter(([, c]) => c.due <= today)
    .sort(([a, x], [b, y]) => (x.due < y.due ? -1 : x.due > y.due ? 1 : x.box - y.box || (a < b ? -1 : 1)))
    .map(([id]) => id);
}

/** The next date anything becomes due, and how many cards then; null if there are no cards. */
export function nextDue(cards: Cards, today: string): { day: string; count: number } | null {
  const later = Object.values(cards).filter((c) => c.due > today).map((c) => c.due).sort();
  if (!later.length) return null;
  return { day: later[0], count: later.filter((d) => d === later[0]).length };
}

/** How many cards sit in each box, for a small summary. */
export function boxCounts(cards: Cards): number[] {
  const counts = BOX_DAYS.map(() => 0);
  for (const c of Object.values(cards)) counts[Math.min(Math.max(c.box, 1), BOX_DAYS.length) - 1]++;
  return counts;
}

/** The course a bank question belongs to: ids are "<course>/<lesson-or-quiz>/<name>". */
export const courseOfId = (id: string) => id.split("/")[0];

/* ---------------------------------- storage ---------------------------------- */

const REVIEW_KEY = "decoded:review:v1";

export function readCards(): Cards {
  try {
    const raw = JSON.parse(localStorage.getItem(REVIEW_KEY) ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function writeCards(cards: Cards) {
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(cards));
    window.dispatchEvent(new CustomEvent("decoded:progress"));
  } catch {
    // Storage can be unavailable (private mode, full quota); review still works for this visit.
  }
}

/** Record answers to bank questions (from a quiz, an exam or a review) in one write. */
export function recordAnswers(results: { id: string; correct: boolean }[], today = localDay()) {
  if (!results.length) return;
  const cards = readCards();
  for (const { id, correct } of results) cards[id] = answer(cards[id], correct, today);
  writeCards(cards);
}

/** Forget cards whose question no longer exists in the bank. */
export function dropCards(ids: string[]) {
  if (!ids.length) return;
  const cards = readCards();
  for (const id of ids) delete cards[id];
  writeCards(cards);
}
