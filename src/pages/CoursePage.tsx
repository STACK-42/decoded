import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { getCourse, flattenLessons, lessonKind } from "@/content/registry";
import { useProgress } from "@/hooks/useProgress";
import { useQuizScores } from "@/hooks/useQuizScores";
import { CoursePrerequisites, CourseRegistration } from "@/components/CourseRegistration";
import { CourseGlyph, LessonKindIcon } from "@/components/brand/Glyphs";
import { CourseAuthors } from "@/components/CourseAuthors";

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
              <span className={accentText[course.accent]}>{course.number}</span>
            </div>

            <CourseGlyph slug={course.slug} className={`h-10 w-10 mb-5 ${accentText[course.accent]}`} />
            <h1 className="font-display text-4xl md:text-6xl font-extrabold leading-[1.02] tracking-tight mb-4">
              {course.title}
            </h1>
            <p className="font-body text-xl italic text-muted-foreground max-w-2xl mb-6 leading-relaxed">
              {course.tagline}
            </p>
            <p className="font-body text-base leading-relaxed text-foreground/80 max-w-2xl">
              {course.description}
            </p>

            {course.authors && <CourseAuthors authors={course.authors} />}

            <CoursePrerequisites courseSlug={course.slug} />
            {total > 0 && <CourseRegistration course={course} />}
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
                        Module {String(mi).padStart(2, "0")}
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
      </main>

      <SiteFooter />
    </div>
  );
}
