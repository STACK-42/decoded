import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { ContinueLearning } from "@/components/ContinueLearning";
import CourseCard from "@/components/CourseCard";
import { courses } from "@/content/registry";
import { useAccountStatus, useEnrollments, useAccountProfile } from "@/hooks/useAccountStatus";
import { useProgress } from "@/hooks/useProgress";
import { useQuizScores } from "@/hooks/useQuizScores";
import { summarize } from "@/lib/dashboard";
import { useReviewCards } from "@/hooks/useReviewCards";
import { dueIds, localDay, nextDue } from "@/lib/review";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const status = useAccountStatus();
  const profile = useAccountProfile();
  const enrollments = useEnrollments();
  const scores = useQuizScores();
  const { allProgress } = useProgress();
  const { activeCourses, finishedCourses, lessonsDone, quizzes } = summarize(courses, allProgress, enrollments, scores);
  const passed = quizzes.filter((q) => q.passed).length;

  useEffect(() => {
    document.title = "Dashboard — Decoded";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-14 md:py-20 max-w-5xl">
          <div className="eyebrow text-muted-foreground mb-3">Dashboard</div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight">
            {status === "signed-in" && profile?.name ? `Hi, ${profile.name}` : "Your progress"}
          </h1>
          {status !== "signed-in" && activeCourses.length > 0 && (
            <p className="mt-3 font-body italic text-muted-foreground">This is saved on this device. Sign in to keep it on every device.</p>
          )}

          <ReviewPanel />

          {activeCourses.length === 0 ? (
            <div className="mt-10 border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-bold mb-2">Nothing here yet.</p>
              <p className="font-body italic text-muted-foreground mb-5">Register for a course and your progress will show up here.</p>
              <Link to="/courses" className="bg-neon px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-background hover:opacity-90 transition inline-block">
                Browse courses
              </Link>
            </div>
          ) : (
            <>
              <ContinueLearning />

              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Lessons done" value={lessonsDone} />
                <Stat label="Courses active" value={activeCourses.length} />
                <Stat label="Courses finished" value={finishedCourses} />
                <Stat label="Quizzes passed" value={`${passed}/${quizzes.length}`} />
              </div>

              <section aria-label="Your courses" className="mt-12">
                <div className="eyebrow text-muted-foreground mb-4">Your courses</div>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeCourses.map((c) => (
                    <CourseCard key={c.slug} slug={c.slug} />
                  ))}
                </div>
              </section>

              {quizzes.length > 0 && (
                <section aria-label="Quiz scores" className="mt-12">
                  <div className="eyebrow text-muted-foreground mb-4">Quiz scores · weakest first</div>
                  <ul className="border-t border-border">
                    {quizzes.map((q) => (
                      <li key={`${q.course.slug}/${q.lessonSlug}`} className="border-b border-border">
                        <Link
                          to={`/courses/${q.course.slug}/${q.lessonSlug}`}
                          className="flex items-center justify-between gap-4 px-1 py-4 transition hover:bg-secondary/40"
                        >
                          <span className="min-w-0">
                            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{q.course.title}</span>
                            <span className="block font-display font-semibold">{q.title}</span>
                          </span>
                          <span className={`shrink-0 font-mono text-sm ${q.passed ? "text-mint" : "text-orange"}`}>
                            {q.best}/{q.total}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Review queue status: how many questions are due today, or when the next ones are. Hidden until there are cards. */
function ReviewPanel() {
  const cards = useReviewCards();
  const today = localDay();
  const total = Object.keys(cards).length;
  if (!total) return null;
  const due = dueIds(cards, today).length;
  const next = nextDue(cards, today);
  return (
    <section aria-label="Review" className="mt-8 border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="font-display text-2xl font-bold">{due ? `${due} question${due === 1 ? "" : "s"} to review` : "Review: all caught up"}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {due
            ? "Questions you answered before, back at the right moment to stick."
            : next
              ? `${next.count} more come back on ${new Date(next.day + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}. ${total} in your queue.`
              : `${total} in your queue.`}
        </div>
      </div>
      <Link
        to="/review"
        className={`font-mono text-[11px] uppercase tracking-widest px-5 py-2.5 rounded-sm transition ${due ? "bg-neon text-background font-semibold hover:opacity-90" : "border border-border hover:border-foreground"}`}
      >
        {due ? "Start reviewing" : "Open review"}
      </Link>
    </section>
  );
}
