import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { getCourse } from "@/content/registry";
import { loadBank } from "@/content/questionBanks";
import type { Question } from "@/lib/questions";
import { recordAnswers } from "@/lib/review";
import {
  buildExam,
  EXAM_SIZE,
  readAttempts,
  recordAttempt,
  scoreExam,
  SECONDS_PER_QUESTION,
  type ExamAttempt,
  type ExamQuestion,
  type ExamResult,
} from "@/lib/exams";

const accentText: Record<string, string> = {
  neon: "text-neon", orange: "text-orange", sky: "text-sky", violet: "text-violet", mint: "text-mint",
};
const btn = "font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 border border-border hover:border-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm";
const btnPrimary = "font-mono text-[11px] uppercase tracking-widest px-5 py-2.5 border border-foreground bg-foreground text-background hover:opacity-90 transition rounded-sm";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Phase = { name: "intro" } | { name: "running"; exam: ExamQuestion[]; started: number } | { name: "done"; exam: ExamQuestion[]; result: ExamResult; answers: Record<string, string> };

export default function ExamPage() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const course = courseSlug ? getCourse(courseSlug) : undefined;
  const [bank, setBank] = useState<Question[] | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [conditions, setConditions] = useState(false);
  const [attempts, setAttempts] = useState<ExamAttempt[]>(() => (courseSlug ? readAttempts(courseSlug) : []));

  useEffect(() => {
    if (course) document.title = `Exam: ${course.title} — Decoded`;
  }, [course]);

  useEffect(() => {
    let live = true;
    if (courseSlug) loadBank(courseSlug).then((b) => live && setBank(b));
    return () => {
      live = false;
    };
  }, [courseSlug]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase.name]);

  const finish = useCallback(
    (exam: ExamQuestion[], answers: Record<string, string>, started: number) => {
      if (!course) return;
      const result = scoreExam(course, exam, answers);
      // Every exam question feeds the review queue; unanswered counts as wrong.
      recordAnswers(exam.map((q) => ({ id: q.id, correct: answers[q.id] === q.correctOptionId })));
      recordAttempt(course.slug, { date: new Date().toISOString(), right: result.right, total: result.total, seconds: Math.round((Date.now() - started) / 1000), conditions });
      setAttempts(readAttempts(course.slug));
      setPhase({ name: "done", exam, result, answers });
    },
    [course, conditions],
  );

  if (!course) return <Navigate to="/404" replace />;

  const start = () => {
    if (!bank) return;
    const seed = Math.floor(Math.random() * 2 ** 31);
    setPhase({ name: "running", exam: buildExam(course, bank, seed), started: Date.now() });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-10 md:py-14 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-5">
            <Link to="/courses" className="hover:text-foreground transition">All tracks</Link>
            <span>/</span>
            <Link to={`/courses/${course.slug}`} className={`${accentText[course.accent]} hover:underline`}>{course.title}</Link>
            <span>/</span>
            <span>Exam</span>
          </div>

          {phase.name === "intro" && (
            <Intro courseTitle={course.title} bank={bank} moduleCount={new Set((bank ?? []).map((q) => course.modules.findIndex((m) => m.lessons.some((l) => l.slug === (q.lesson ?? q.quiz))))).size} conditions={conditions} setConditions={setConditions} attempts={attempts} onStart={start} />
          )}
          {phase.name === "running" && (
            <Running key={phase.started} exam={phase.exam} conditions={conditions} onSubmit={(answers) => finish(phase.exam, answers, phase.started)} />
          )}
          {phase.name === "done" && (
            <Results courseSlug={course.slug} course={course} result={phase.result} answers={phase.answers} onAgain={start} />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------- intro ---------------------------------- */

function Intro({ courseTitle, bank, moduleCount, conditions, setConditions, attempts, onStart }: {
  courseTitle: string;
  bank: Question[] | null;
  moduleCount: number;
  conditions: boolean;
  setConditions: (v: boolean) => void;
  attempts: ExamAttempt[];
  onStart: () => void;
}) {
  const n = Math.min(EXAM_SIZE, bank?.length ?? 0);
  const best = attempts.reduce<ExamAttempt | null>((b, a) => (!b || a.right / a.total > b.right / b.total ? a : b), null);
  const last = attempts.at(-1);
  return (
    <>
      <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight mb-4">{courseTitle} exam</h1>
      {bank === null ? (
        <p className="text-muted-foreground">Loading questions…</p>
      ) : n === 0 ? (
        <p className="text-muted-foreground italic">This course has no exam questions yet.</p>
      ) : (
        <>
          <p className="font-body text-lg leading-relaxed text-foreground/80 mb-8 max-w-2xl">
            {n} questions drawn from {moduleCount === 1 ? "the course" : `all ${moduleCount} modules`}, in a mixed order. Every attempt draws a fresh set. You won't see any answers until you submit, like in a real exam; then you get a score for each module and an explanation for every question you missed.
          </p>
          <label className="flex items-start gap-3 mb-8 cursor-pointer max-w-xl">
            <input type="checkbox" checked={conditions} onChange={(e) => setConditions(e.target.checked)} className="mt-1 h-4 w-4 accent-current" />
            <span>
              <span className="font-semibold">Exam conditions</span>
              <span className="block text-sm text-muted-foreground">
                A {Math.round((n * SECONDS_PER_QUESTION) / 60)}-minute time limit ({SECONDS_PER_QUESTION} seconds a question). When it runs out, the exam is submitted.
              </span>
            </span>
          </label>
          <button type="button" className={btnPrimary} onClick={onStart}>Start the exam</button>
          {last && best && (
            <div className="mt-10 border-t border-border pt-6 font-mono text-xs text-muted-foreground space-y-1">
              <div>Best: <span className="text-foreground">{best.right}/{best.total}</span></div>
              <div>Last: <span className="text-foreground">{last.right}/{last.total}</span>, {new Date(last.date).toLocaleDateString()}{last.conditions ? ", under exam conditions" : ""}</div>
              <div>{attempts.length} attempt{attempts.length === 1 ? "" : "s"} on this device</div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ---------------------------------- running ---------------------------------- */

function Running({ exam, conditions, onSubmit }: { exam: ExamQuestion[]; conditions: boolean; onSubmit: (answers: Record<string, string>) => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const limit = exam.length * SECONDS_PER_QUESTION;
  const [left, setLeft] = useState(limit);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submitted = useRef(false);

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    onSubmit(answersRef.current);
  }, [onSubmit]);

  useEffect(() => {
    if (!conditions) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const remaining = Math.max(0, limit - Math.floor((Date.now() - started) / 1000));
      setLeft(remaining);
      if (remaining === 0) submit();
    }, 250);
    return () => window.clearInterval(id);
  }, [conditions, limit, submit]);

  const q = exam[index];
  const unanswered = exam.filter((x) => !answers[x.id]).length;
  const isLast = index === exam.length - 1;
  const choose = (optionId: string) => {
    setAnswers((a) => ({ ...a, [q.id]: optionId }));
    setConfirm(false);
  };
  const next = () => (isLast ? (unanswered > 0 && !confirm ? setConfirm(true) : submit()) : setIndex(index + 1));

  // Number keys pick an option; Enter moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) choose(q.options[n - 1].id);
      else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const announce = conditions && (left === 300 || left === 60) ? `${left / 60} minute${left === 60 ? "" : "s"} left` : "";

  return (
    <div>
      <div className="flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
        <span>Question {index + 1} of {exam.length}</span>
        {conditions && (
          <span role="timer" aria-label="time left" className={left <= 60 ? "text-orange font-bold" : "text-foreground"}>{clock(left)}</span>
        )}
        <span className="sr-only" aria-live="polite">{announce}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-8" aria-label="Questions">
        {exam.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${answers[x.id] ? ", answered" : ""}`}
            aria-current={i === index ? "step" : undefined}
            className={`h-8 w-8 font-mono text-[11px] rounded-sm border transition ${i === index ? "border-foreground" : "border-border"} ${answers[x.id] ? "bg-foreground/10" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <fieldset className="border border-border bg-card rounded-sm">
        <legend className="sr-only">Question {index + 1}</legend>
        <p className="p-5 border-b border-border font-semibold">{q.prompt}</p>
        <div className="p-5 space-y-3" role="radiogroup" aria-label="Answers">
          {q.options.map((o, i) => {
            const selected = answers[q.id] === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(o.id)}
                className={`w-full text-left px-4 py-3 border transition font-mono text-sm flex gap-3 ${selected ? "border-foreground bg-foreground/10" : "border-border hover:border-foreground/40"}`}
              >
                <span className={`shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-sm text-[11px] ${selected ? "bg-foreground text-background font-bold" : "text-muted-foreground"}`}>{i + 1}</span>
                <span>{o.text}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className={btn} onClick={() => setIndex(index - 1)} disabled={index === 0}>← Back</button>
        <button type="button" className={isLast ? btnPrimary : btn} onClick={next}>{isLast ? (confirm ? "Submit anyway" : "Submit") : "Next →"}</button>
        {!isLast && (
          <button type="button" className={`${btn} ml-auto`} onClick={() => (unanswered > 0 && !confirm ? setConfirm(true) : submit())}>
            {confirm ? "Submit anyway" : "Submit"}
          </button>
        )}
      </div>
      {confirm && unanswered > 0 && (
        <p className="mt-4 text-sm text-orange" role="alert">
          {unanswered} question{unanswered === 1 ? " is" : "s are"} unanswered and will count as wrong. Press submit again to finish, or use the numbers above to go back.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------- results ---------------------------------- */

function Results({ courseSlug, course, result, answers, onAgain }: {
  courseSlug: string;
  course: NonNullable<ReturnType<typeof getCourse>>;
  result: ExamResult;
  answers: Record<string, string>;
  onAgain: () => void;
}) {
  const pct = Math.round((result.right / Math.max(result.total, 1)) * 100);
  const lessonTitle = useMemo(() => new Map(course.modules.flatMap((m) => m.lessons.map((l) => [l.slug, l.title] as const))), [course]);
  return (
    <>
      <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight mb-2">
        {result.right}/{result.total}
      </h1>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-10">{pct}% correct</p>

      <h2 className="font-display text-2xl font-bold mb-4">By module</h2>
      <ul className="space-y-4 mb-12">
        {result.perModule.map((m) => {
          const share = m.right / m.total;
          return (
            <li key={m.module}>
              <div className="flex flex-wrap justify-between gap-x-4 text-sm mb-1.5">
                <span className="font-semibold">{m.title}</span>
                <span className="font-mono text-muted-foreground">{m.right}/{m.total}</span>
              </div>
              <div className="h-2 bg-border rounded-sm overflow-hidden">
                <div className={`h-full ${share >= 0.8 ? "bg-mint" : share >= 0.5 ? "bg-sky" : "bg-orange"}`} style={{ width: `${share * 100}%` }} />
              </div>
              {share < 1 && m.firstLesson && (
                <Link to={`/courses/${courseSlug}/${m.firstLesson}`} className="inline-block mt-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  Review this module →
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {result.missed.length > 0 && (
        <>
          <h2 className="font-display text-2xl font-bold mb-2">What you missed</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These come back in your <Link to="/review" className="underline hover:text-foreground">review queue</Link> tomorrow, and then at growing gaps until you know them.
          </p>
          <ol className="space-y-6 mb-12">
            {result.missed.map((q) => {
              const yours = q.options.find((o) => o.id === answers[q.id]);
              const right = q.options.find((o) => o.id === q.correctOptionId)!;
              const reread = q.lesson ?? course.modules[q.module]?.lessons.find((l) => l.kind !== "quiz")?.slug;
              return (
                <li key={q.id} className="border border-border bg-card rounded-sm p-5">
                  <p className="font-semibold mb-3">{q.prompt}</p>
                  <p className="text-sm mb-1"><span className="font-mono text-[11px] uppercase tracking-widest text-orange mr-2">Yours</span>{yours ? yours.text : <span className="italic text-muted-foreground">No answer</span>}</p>
                  <p className="text-sm mb-3"><span className="font-mono text-[11px] uppercase tracking-widest text-mint mr-2">Right</span>{right.text}</p>
                  <p className="text-sm text-muted-foreground">{q.explanation}</p>
                  {reread && (
                    <Link to={`/courses/${courseSlug}/${reread}${q.lesson && q.section ? `#${q.section}` : ""}`} className="inline-block mt-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                      Re-read: {lessonTitle.get(reread)} →
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className={btnPrimary} onClick={onAgain}>New exam</button>
        <Link to={`/courses/${courseSlug}`} className={btn}>Back to the course</Link>
      </div>
    </>
  );
}
