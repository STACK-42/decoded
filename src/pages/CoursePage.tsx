import { useEffect, type CSSProperties } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { getCourse, flattenLessons, lessonKind } from "@/content/registry";
import { useProgress } from "@/hooks/useProgress";
import { useQuizScores } from "@/hooks/useQuizScores";
import { CoursePrerequisites, CourseRegistration } from "@/components/CourseRegistration";
import { CourseGlyph, LessonKindIcon } from "@/components/brand/Glyphs";
import { CourseAuthors } from "@/components/CourseAuthors";
import { CourseMaturity } from "@/components/CourseMaturity";
import { CourseLearners } from "@/components/LearnerCounts";
import { CourseCompanions } from "@/components/Companions";
import { coursesWithBanks } from "@/content/questionBanks";
import { readAttempts } from "@/lib/exams";
import { tools } from "@/content/tools";
import { TOOL_BADGES } from "@/components/tools/toolBadges";
import { ToolIcon } from "@/components/tools/ToolIcon";

const accentText: Record<string, string> = {
  neon: "text-neon", orange: "text-orange", sky: "text-sky", violet: "text-violet", mint: "text-mint",
};

export default function CoursePage() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const course = courseSlug ? getCourse(courseSlug) : undefined;
  const { isComplete } = useProgress(courseSlug);
  const scores = useQuizScores();

  useEffect(() => {
    if (course) document.title = `${course.title} — Decoded`;
  }, [course]);

  if (!course) return <Navigate to="/404" replace />;

  const total = flattenLessons(course).length;
  const courseTools = tools.filter((t) => t.lessons.some((l) => l.course === course.slug));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Course header */}
        <header className="border-b border-border">
          <div className="container py-12 md:py-16 max-w-4xl">
            <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-5">
              <Link to="/courses" className="hover:text-foreground transition">All tracks</Link>
              <span>/</span>
              <span className={accentText[course.accent]}>{course.title}</span>
            </div>

            <CourseGlyph slug={course.slug} className={`rise-in h-10 w-10 mb-5 ${accentText[course.accent]}`} />
            <h1 style={{ "--d": "60ms" } as CSSProperties} className="rise-in font-display text-4xl md:text-6xl font-extrabold leading-[1.02] tracking-tight mb-4">
              {course.title}
            </h1>
            <p style={{ "--d": "140ms" } as CSSProperties} className="rise-in font-body text-xl italic text-muted-foreground max-w-2xl mb-6 leading-relaxed">
              {course.tagline}
            </p>
            {course.status === "available" && <CourseMaturity rounds={course.rounds} className="mb-6" />}
            <CourseLearners course={course.slug} className="-mt-3 mb-6" />
            <p className="font-body text-base leading-relaxed text-foreground/80 max-w-2xl">
              {course.description}
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-x-14 empty:hidden">
              {course.authors && <CourseAuthors authors={course.authors} />}
              <CoursePrerequisites courseSlug={course.slug} />
            </div>
            {total > 0 && <CourseRegistration course={course} />}
            {total > 0 && <CourseCompanions course={course} />}
            {coursesWithBanks.has(course.slug) && <ExamEntry slug={course.slug} />}
          </div>
        </header>

        {/* Modules */}
        <section className="container py-12 md:py-16 max-w-4xl">
          {course.modules.length === 0 ? (
            <div className="border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-bold mb-2">In the workshop.</p>
              <p className="text-muted-foreground italic">
                Lessons for this track are being written. Check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {course.modules.map((module, mi) => {
                let lessonCounter = 0;
                course.modules.slice(0, mi).forEach((m) => (lessonCounter += m.lessons.length));
                return (
                  <div key={module.title}>
                    <div className="flex items-baseline gap-4 mb-1">
                      <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                        {module.label ?? `Module ${String(mi).padStart(2, "0")}`}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">{module.title}</h2>
                    {module.blurb && (
                      <p className="font-body italic text-muted-foreground mb-5 max-w-2xl">{module.blurb}</p>
                    )}

                    <ul className="border-t border-border">
                      {module.lessons.map((lesson, li) => {
                        const num = String(lessonCounter + li + 1).padStart(2, "0");
                        const complete = isComplete(lesson.slug);
                        return (
                          <li key={lesson.slug} className="border-b border-border">
                            <Link
                              to={`/courses/${course.slug}/${lesson.slug}`}
                              className="group grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 py-4 hover:bg-secondary/40 transition px-1"
                            >
                              <span
                                className={`font-mono text-[11px] tracking-widest w-10
                                ${complete ? accentText[course.accent] : "text-muted-foreground"}`}
                              >
                                {complete ? "✓" : num}
                              </span>
                              <LessonKindIcon kind={lessonKind(lesson)} className="h-4 w-4 text-muted-foreground" />
                              <span className="font-display text-base md:text-lg font-semibold group-hover:translate-x-0.5 transition-transform">
                                {lesson.title}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                {scores[`${course.slug}/${lesson.slug}`] && (
                                  <span className={`mr-3 ${accentText[course.accent]}`}>
                                    Best {scores[`${course.slug}/${lesson.slug}`].best}/{scores[`${course.slug}/${lesson.slug}`].total}
                                  </span>
                                )}
                                {lesson.duration}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {courseTools.length > 0 && (
          <section className="border-t border-border bg-card/30 py-12 md:py-16">
            <div className="container max-w-4xl">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                  Practical Applications
                </span>
                <Link
                  to="/tools"
                  className="font-mono text-xs text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1 group"
                >
                  <span>All 33 real-world tools</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
                Tools Decoded in this Course
              </h2>
              <p className="font-body text-base italic text-muted-foreground max-w-2xl mb-8">
                See how the abstract theory in this course powers the real software you use every day.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {courseTools.map((t) => {
                  const badges = TOOL_BADGES[t.name] ?? [];
                  const relevantLessons = t.lessons.filter((l) => l.course === course.slug);
                  return (
                    <div
                      key={t.name}
                      className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md motion-safe:hover:-translate-y-0.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {badges.map((b) => (
                            <span
                              key={b.label}
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium border"
                              style={{
                                borderColor: `${b.color}33`,
                                backgroundColor: `${b.color}14`,
                                color: b.color === "#000000" || b.color === "#181717" || b.color === "#231F20" ? "currentColor" : b.color,
                              }}
                            >
                              <ToolIcon badge={b} className="w-3.5 h-3.5 shrink-0" />
                              <span>{b.label}</span>
                            </span>
                          ))}
                          <h3 className="font-display font-semibold text-base leading-snug">{t.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                          {t.tagline}
                        </p>
                      </div>

                      {relevantLessons.length > 0 && (
                        <div className="pt-3 border-t border-border/50 space-y-1.5">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                            Decoded in:
                          </span>
                          {relevantLessons.map((l) => (
                            <Link
                              key={l.lesson}
                              to={`/courses/${course.slug}/${l.lesson}`}
                              className="text-xs text-foreground/80 hover:text-foreground hover:underline flex items-center justify-between gap-2 group/link"
                            >
                              <span className="truncate">{l.title}</span>
                              <span className="text-[10px] font-mono text-muted-foreground group-hover/link:translate-x-0.5 transition-transform shrink-0">
                                Read →
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

/** Link to the course exam, with the best score on this device if there is one. */
function ExamEntry({ slug }: { slug: string }) {
  const attempts = readAttempts(slug);
  const best = attempts.reduce<(typeof attempts)[number] | null>((b, a) => (!b || a.right / a.total > b.right / b.total ? a : b), null);
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
      <Link
        to={`/courses/${slug}/exam`}
        className="font-mono text-[11px] uppercase tracking-widest px-5 py-2.5 border border-foreground hover:bg-foreground hover:text-background transition rounded-sm"
      >
        Take a course exam
      </Link>
      <span className="font-mono text-[11px] text-muted-foreground">
        {best ? `Best so far: ${best.right}/${best.total}` : "Mixed questions from every module, scored by module"}
      </span>
    </div>
  );
}
