import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { getCourse } from "@/content/registry";
import { loadBank } from "@/content/questionBanks";
import type { Question } from "@/lib/questions";
import { moduleOf, seededRandom, shuffle } from "@/lib/exams";
import { BOX_DAYS, boxCounts, courseOfId, dropCards, dueIds, localDay, nextDue, readCards, recordAnswers, SESSION_SIZE } from "@/lib/review";
import { useReviewCards } from "@/hooks/useReviewCards";

const btn = "font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 border border-border hover:border-foreground transition-colors rounded-sm";
const btnPrimary = "font-mono text-[11px] uppercase tracking-widest px-5 py-2.5 border border-foreground bg-foreground text-background hover:opacity-90 transition rounded-sm";

const friendlyDay = (day: string, today: string) => {
  if (day === today) return "today";
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (day === localDay(tomorrow)) return "tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

/** Where to re-read the idea behind a question: its lesson, or the first lesson of its quiz's module. */
function lessonLink(q: Question): { href: string; title: string } | null {
  const course = getCourse(courseOfId(q.id));
  if (!course) return null;
  if (q.lesson) {
    const l = course.modules.flatMap((m) => m.lessons).find((x) => x.slug === q.lesson);
    if (l) return { href: `/courses/${course.slug}/${l.slug}${q.section ? `#${q.section}` : ""}`, title: l.title };
  }
  const m = course.modules[moduleOf(course, q)];
  const first = m?.lessons.find((l) => l.kind !== "quiz");
  return first ? { href: `/courses/${course.slug}/${first.slug}`, title: first.title } : null;
}

type Session = { questions: Question[]; index: number; chosen: string | null; right: number };

export default function ReviewPage() {
  const cards = useReviewCards();
  const today = localDay();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState<{ right: number; total: number } | null>(null);
  const due = useMemo(() => dueIds(cards, today), [cards, today]);
  const counts = boxCounts(cards);
  const total = Object.keys(cards).length;
  const upcoming = nextDue(cards, today);

  useEffect(() => {
    document.title = "Review — Decoded";
  }, []);

  const start = async () => {
    setLoading(true);
    setFinished(null);
    const ids = dueIds(readCards(), today).slice(0, SESSION_SIZE);
    const courses = [...new Set(ids.map(courseOfId))];
    const banks = await Promise.all(courses.map(loadBank));
    const byId = new Map(banks.flat().map((q) => [q.id, q]));
    const gone = ids.filter((id) => !byId.has(id));
    dropCards(gone); // questions removed from the site since they were answered
    const random = seededRandom(Date.now() % 2 ** 31);
    // Mixed order across courses and topics (interleaving), options shuffled.
    const questions = shuffle(ids.filter((id) => byId.has(id)).map((id) => byId.get(id)!), random).map((q) => ({ ...q, options: shuffle(q.options, random) }));
    setLoading(false);
    setSession(questions.length ? { questions, index: 0, chosen: null, right: 0 } : null);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-10 md:py-14 max-w-3xl">
          <div className="eyebrow text-muted-foreground mb-3">Review</div>
          {session ? (
            <Card
              session={session}
              onChoose={(optionId) => {
                const q = session.questions[session.index];
                const correct = optionId === q.correctOptionId;
                recordAnswers([{ id: q.id, correct }]);
                setSession({ ...session, chosen: optionId, right: session.right + (correct ? 1 : 0) });
              }}
              onNext={() => {
                if (session.index + 1 < session.questions.length) setSession({ ...session, index: session.index + 1, chosen: null });
                else {
                  setFinished({ right: session.right, total: session.questions.length });
                  setSession(null);
                  window.scrollTo(0, 0);
                }
              }}
            />
          ) : (
            <>
              <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight mb-4">
                {finished ? `${finished.right}/${finished.total} remembered` : due.length ? `${due.length} question${due.length === 1 ? "" : "s"} due` : "Nothing due"}
              </h1>
              {finished && (
                <p className="font-body text-lg text-foreground/80 mb-6">
                  The ones you missed come back tomorrow. The ones you knew come back later, a little further apart each time.
                </p>
              )}
              {total === 0 ? (
                <p className="font-body text-lg leading-relaxed text-foreground/80 max-w-2xl">
                  Every question you answer in a module quiz or a <Link to="/courses" className="underline">course exam</Link> lands here. The ones you get wrong come back tomorrow; the ones you get right come back after 2, 4, 8 and then 16 days. A few minutes a day of this beats a night of cramming.
                </p>
              ) : (
                <>
                  {due.length > 0 ? (
                    <>
                      <p className="font-body text-lg leading-relaxed text-foreground/80 mb-6 max-w-2xl">
                        {due.length > SESSION_SIZE ? `This session takes the ${SESSION_SIZE} most overdue, ` : "They come "}mixed across topics, with the answer shown right after each one.
                      </p>
                      <button type="button" className={btnPrimary} onClick={start} disabled={loading}>
                        {loading ? "Loading…" : "Start reviewing"}
                      </button>
                    </>
                  ) : (
                    upcoming && (
                      <p className="font-body text-lg text-foreground/80">
                        Next: {upcoming.count} question{upcoming.count === 1 ? "" : "s"} {friendlyDay(upcoming.day, today)}.
                      </p>
                    )
                  )}
                  <div className="mt-10 border-t border-border pt-6">
                    <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-3">{total} questions in your queue, by box</div>
                    <div className="grid grid-cols-5 gap-2 max-w-md">
                      {counts.map((c, i) => (
                        <div key={i} className="border border-border bg-card rounded-sm p-2 text-center">
                          <div className="font-display text-xl font-bold">{c}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">every {BOX_DAYS[i]}d</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Card({ session, onChoose, onNext }: { session: Session; onChoose: (optionId: string) => void; onNext: () => void }) {
  const q = session.questions[session.index];
  const course = getCourse(courseOfId(q.id));
  const link = lessonLink(q);
  const answered = session.chosen !== null;
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  // Number keys pick an option; Enter moves on once answered.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!answered && n >= 1 && n <= q.options.length) onChoose(q.options[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
        <span>{session.index + 1} of {session.questions.length}</span>
        {course && <span>{course.title}</span>}
      </div>
      <fieldset className="border border-border bg-card rounded-sm">
        <legend className="sr-only">Question {session.index + 1}</legend>
        <p className="p-5 border-b border-border font-semibold">{q.prompt}</p>
        <div className="p-5 space-y-3">
          {q.options.map((o, i) => {
            const isRight = o.id === q.correctOptionId;
            const isChosen = o.id === session.chosen;
            const tone = !answered ? "border-border hover:border-foreground/40" : isRight ? "border-mint bg-mint/10" : isChosen ? "border-orange bg-orange/10" : "border-border opacity-60";
            return (
              <button key={o.id} type="button" disabled={answered} onClick={() => onChoose(o.id)} className={`w-full text-left px-4 py-3 border transition font-mono text-sm flex gap-3 ${tone}`}>
                <span className="text-muted-foreground">{i + 1}</span>
                <span>{o.text}</span>
              </button>
            );
          })}
          {answered && (
            <div className="mt-3 px-3 py-2 bg-background border border-border text-sm" role="status">
              <span className={`font-mono text-[11px] uppercase tracking-widest mr-2 ${session.chosen === q.correctOptionId ? "text-mint" : "text-orange"}`}>
                {session.chosen === q.correctOptionId ? "Right" : "Not quite"}
              </span>
              <span className="text-muted-foreground">{q.explanation}</span>
              {link && (
                <Link to={link.href} className="block mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  Re-read: {link.title} →
                </Link>
              )}
            </div>
          )}
        </div>
      </fieldset>
      {answered && (
        <button ref={nextRef} type="button" className={`mt-6 ${btn}`} onClick={onNext}>
          {session.index + 1 < session.questions.length ? "Next →" : "Finish"}
        </button>
      )}
    </div>
  );
}
