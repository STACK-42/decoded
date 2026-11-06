import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReviewPage from "@/pages/ReviewPage";
import Dashboard from "@/pages/Dashboard";
import { SiteHeader } from "@/components/layout/SiteChrome";
import { Quiz } from "@/components/mdx/MdxComponents";
import { questions as networkQuestions } from "@/content/computer-networks/questions";
import { questionsForQuiz } from "@/lib/questions";
import { localDay, readCards, type Card } from "@/lib/review";

const today = localDay();
const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDay(d);
})();

function seed(ids: string[], due = yesterday) {
  const cards: Record<string, Card> = {};
  for (const id of ids) cards[id] = { box: 1, due, seen: 1, lapses: 1 };
  localStorage.setItem("decoded:review:v1", JSON.stringify(cards));
}

const page = (el: JSX.Element, path = "/review") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={el} />
      </Routes>
    </MemoryRouter>,
  );

const correctText = (prompt: string) => {
  const q = networkQuestions.find((x) => x.prompt === prompt)!;
  return q.options.find((o) => o.id === q.correctOptionId)!.text;
};

describe("review page", () => {
  beforeEach(() => {
    localStorage.clear();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; // jsdom doesn't implement it
  });

  it("explains itself when the queue is empty", () => {
    page(<ReviewPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Nothing due");
    expect(screen.getByText(/lands here/)).toBeTruthy();
  });

  it("reviews due questions with feedback right away, and reschedules them", async () => {
    const ids = networkQuestions.slice(0, 3).map((q) => q.id);
    seed([...ids, "computer-networks/gone-quiz/q9"]);
    page(<ReviewPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("4 questions due");
    fireEvent.click(screen.getByRole("button", { name: "Start reviewing" }));

    for (let i = 0; i < 3; i++) {
      const prompt = (await screen.findByRole("group")).querySelector("p")!.textContent!;
      fireEvent.click(screen.getByRole("button", { name: new RegExp(correctText(prompt).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }));
      expect(screen.getByRole("status").textContent).toMatch(/^Right/);
      fireEvent.click(screen.getByRole("button", { name: i === 2 ? "Finish" : "Next →" }));
    }

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("3/3 remembered");
    const cards = readCards();
    expect(Object.keys(cards).sort()).toEqual([...ids].sort()); // the removed question was dropped
    for (const id of ids) expect(cards[id]).toMatchObject({ box: 2, seen: 2 });
  });

  it("says when the next questions come back if nothing is due", () => {
    seed([networkQuestions[0].id], "2099-01-01");
    page(<ReviewPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Nothing due");
    expect(screen.getByText(/Next: 1 question/)).toBeTruthy();
  });
});

describe("feeding the queue", () => {
  beforeEach(() => localStorage.clear());

  it("turns every quiz answer into a card", () => {
    const qs = questionsForQuiz(networkQuestions, "foundations-quiz");
    render(
      <MemoryRouter>
        <Quiz courseSlug="computer-networks" lessonSlug="foundations-quiz" questions={qs} />
      </MemoryRouter>,
    );
    const right = qs[0].options.find((o) => o.id === qs[0].correctOptionId)!.text;
    const wrong = qs[1].options.find((o) => o.id !== qs[1].correctOptionId)!.text;
    fireEvent.click(screen.getAllByRole("button", { name: right })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: wrong })[0]);
    const cards = readCards();
    expect(cards[qs[0].id]).toMatchObject({ box: 2 });
    expect(cards[qs[1].id]).toMatchObject({ box: 1, lapses: 1 });
  });
});

describe("where the queue shows up", () => {
  beforeEach(() => localStorage.clear());

  it("adds a Review link with a count to the header only when something is due", () => {
    const { unmount } = page(<SiteHeader />, "/");
    expect(screen.queryByRole("link", { name: /Review/ })).toBeNull();
    unmount();
    seed(networkQuestions.slice(0, 2).map((q) => q.id));
    page(<SiteHeader />, "/");
    expect(screen.getByRole("link", { name: "Review: 2 questions due" })).toBeTruthy();
  });

  it("shows due questions on the dashboard", () => {
    seed(networkQuestions.slice(0, 5).map((q) => q.id), today);
    page(<Dashboard />, "/dashboard");
    expect(screen.getByText("5 questions to review")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start reviewing" }).getAttribute("href")).toBe("/review");
  });
});
