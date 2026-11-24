import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ExamPage from "@/pages/ExamPage";
import { questions as networkQuestions } from "@/content/computer-networks/questions";
import { intToIp, parseCidr } from "@/lib/networks";

function renderExam(slug = "computer-networks") {
  return render(
    <MemoryRouter initialEntries={[`/courses/${slug}/exam`]}>
      <Routes>
        <Route path="/courses/:courseSlug/exam" element={<ExamPage />} />
        <Route path="/courses/:courseSlug/:lessonSlug" element={<div>lesson page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// Generated questions (subnets) get fresh numbers each attempt, so work their answers out from the prompt.
function generated(prompt: string): { right: string; wrong: string } | null {
  const hosts = /a \/(\d+) subnet/.exec(prompt);
  if (hosts) {
    const h = 32 - Number(hosts[1]);
    return { right: String(2 ** h - 2), wrong: String(2 ** h) };
  }
  const addr = /(network|broadcast) address of ([\d.]+\/\d+)\?/.exec(prompt);
  if (!addr) return null;
  const s = parseCidr(addr[2]);
  const [right, wrong] = addr[1] === "network" ? [s.network, s.broadcast] : [s.broadcast, s.network];
  return { right: intToIp(right), wrong: intToIp(wrong) };
}
const correctText = (prompt: string) => {
  const g = generated(prompt);
  if (g) return g.right;
  const q = networkQuestions.find((x) => x.prompt === prompt)!;
  return q.options.find((o) => o.id === q.correctOptionId)!.text;
};
const wrongText = (prompt: string) => {
  const g = generated(prompt);
  if (g) return g.wrong;
  const q = networkQuestions.find((x) => x.prompt === prompt)!;
  return q.options.find((o) => o.id !== q.correctOptionId)!.text;
};
const currentPrompt = () => screen.getByRole("group").querySelector("p")!.textContent!;

describe("course exam page", () => {
  beforeEach(() => {
    localStorage.clear();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; // jsdom doesn't implement it
  });
  afterEach(() => vi.useRealTimers());

  it("introduces the exam, then scores a perfect attempt and remembers it", async () => {
    renderExam();
    expect(await screen.findByText(/20 questions drawn from all 4 modules/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start the exam" }));

    for (let i = 0; i < 20; i++) {
      expect(screen.getByText(`Question ${i + 1} of 20`)).toBeTruthy();
      fireEvent.click(screen.getByRole("radio", { name: new RegExp(escape(correctText(currentPrompt()))) }));
      fireEvent.click(screen.getByRole("button", { name: i === 19 ? "Submit" : "Next →" }));
    }

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("20/20");
    expect(screen.queryByText("What you missed")).toBeNull();
    expect(JSON.parse(localStorage.getItem("decoded:exams:v1")!)["computer-networks"]).toHaveLength(1);
    // Every exam question also lands in the review queue.
    const cards = JSON.parse(localStorage.getItem("decoded:review:v1")!);
    expect(Object.keys(cards)).toHaveLength(20);
    expect(Object.values(cards).every((c) => (c as { box: number }).box === 2)).toBe(true);
  });

  it("asks before submitting with unanswered questions, then shows what was missed", async () => {
    renderExam();
    fireEvent.click(await screen.findByRole("button", { name: "Start the exam" }));
    const prompt = currentPrompt();
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(escape(wrongText(prompt))) }));
    fireEvent.click(screen.getAllByRole("button", { name: "Submit" })[0]);
    expect(screen.getByRole("alert").textContent).toMatch(/19 questions are unanswered/);
    fireEvent.click(screen.getAllByRole("button", { name: "Submit anyway" })[0]);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("0/20");
    expect(screen.getByText("What you missed")).toBeTruthy();
    expect(screen.getAllByText("No answer")).toHaveLength(19);
    expect(screen.getByText(correctText(prompt))).toBeTruthy();
    expect(screen.getAllByText(/^Re-read: /).length).toBeGreaterThan(0);
  });

  it("lets the number keys pick an answer", async () => {
    renderExam();
    fireEvent.click(await screen.findByRole("button", { name: "Start the exam" }));
    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: "Question 1, answered" })).toBeTruthy();
  });

  it("submits by itself when the exam-conditions time runs out", async () => {
    renderExam();
    const start = await screen.findByRole("button", { name: "Start the exam" });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(start);
    expect(screen.getByRole("timer").textContent).toBe("30:00");
    await act(async () => {
      vi.advanceTimersByTime(20 * 90 * 1000 + 500);
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("0/20");
    expect(JSON.parse(localStorage.getItem("decoded:exams:v1")!)["computer-networks"][0].conditions).toBe(true);
  });

  it("says so when a course has no questions yet", async () => {
    renderExam("distributed-systems");
    expect(await screen.findByText(/no exam questions yet/)).toBeTruthy();
  });
});

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
