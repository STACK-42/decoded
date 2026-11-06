import { beforeEach, describe, expect, it } from "vitest";
import { addDays, answer, BOX_DAYS, boxCounts, courseOfId, dropCards, dueIds, nextDue, readCards, recordAnswers, type Card } from "@/lib/review";

const T = "2026-11-04";

describe("answer: the Leitner rules", () => {
  it("starts a new card in box 2 when right, box 1 when wrong", () => {
    expect(answer(undefined, true, T)).toEqual({ box: 2, due: "2026-11-06", seen: 1, lapses: 0 });
    expect(answer(undefined, false, T)).toEqual({ box: 1, due: "2026-11-05", seen: 1, lapses: 1 });
  });

  it("moves a due card up one box and spaces it out: 2, 4, 8, 16, then stays at 16 days", () => {
    let day = T;
    let card = answer(undefined, true, day);
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      const before = card.due;
      day = card.due;
      card = answer(card, true, day);
      gaps.push(Math.round((new Date(card.due).getTime() - new Date(before).getTime()) / 86_400_000));
    }
    expect(gaps).toEqual([4, 8, 16, 16, 16]);
    expect(card.box).toBe(5);
  });

  it("sends a card back to box 1, due tomorrow, after any wrong answer", () => {
    const high: Card = { box: 5, due: "2026-11-20", seen: 6, lapses: 0 };
    expect(answer(high, false, T)).toEqual({ box: 1, due: "2026-11-05", seen: 7, lapses: 1 });
  });

  it("doesn't promote a card answered right before it's due, so cramming can't game it", () => {
    const card: Card = { box: 2, due: "2026-11-06", seen: 1, lapses: 0 };
    expect(answer(card, true, T)).toEqual({ ...card, seen: 2 });
  });

  it("promotes an overdue card from its own box, not further", () => {
    expect(answer({ box: 3, due: "2026-10-01", seen: 3, lapses: 1 }, true, T)).toMatchObject({ box: 4, due: addDays(T, BOX_DAYS[3]) });
  });
});

describe("dates", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-28", 16)).toBe("2026-04-13");
  });
});

describe("the queue", () => {
  const cards: Record<string, Card> = {
    "logic-design/q/a": { box: 2, due: "2026-11-04", seen: 1, lapses: 0 },
    "logic-design/q/b": { box: 1, due: "2026-11-01", seen: 2, lapses: 2 },
    "computer-networks/q/c": { box: 3, due: "2026-11-01", seen: 3, lapses: 0 },
    "computer-networks/q/d": { box: 4, due: "2026-11-09", seen: 4, lapses: 0 },
    "computer-networks/q/e": { box: 4, due: "2026-11-09", seen: 4, lapses: 0 },
    "microprocessors/q/f": { box: 5, due: "2026-11-30", seen: 5, lapses: 0 },
  };

  it("lists due cards, most overdue first, lower boxes first on ties", () => {
    expect(dueIds(cards, T)).toEqual(["logic-design/q/b", "computer-networks/q/c", "logic-design/q/a"]);
  });

  it("says when the next ones come back", () => {
    expect(nextDue(cards, T)).toEqual({ day: "2026-11-09", count: 2 });
    expect(nextDue({}, T)).toBeNull();
  });

  it("counts cards per box and reads the course from an id", () => {
    expect(boxCounts(cards)).toEqual([1, 1, 1, 2, 1]);
    expect(courseOfId("computer-networks/foundations-quiz/q1")).toBe("computer-networks");
  });
});

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("records answers in one write and forgets dropped cards", () => {
    recordAnswers([{ id: "x/y/1", correct: true }, { id: "x/y/2", correct: false }], T);
    expect(Object.keys(readCards())).toEqual(["x/y/1", "x/y/2"]);
    expect(readCards()["x/y/2"].box).toBe(1);
    dropCards(["x/y/1"]);
    expect(Object.keys(readCards())).toEqual(["x/y/2"]);
  });

  it("survives corrupt or odd storage", () => {
    localStorage.setItem("decoded:review:v1", "{nope");
    expect(readCards()).toEqual({});
    localStorage.setItem("decoded:review:v1", "[1,2]");
    expect(readCards()).toEqual({});
  });
});
