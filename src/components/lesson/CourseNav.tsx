import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { flattenLessons, lessonKind, type Course } from "@/content/registry";
import { useProgress } from "@/hooks/useProgress";
import { useRegistration } from "@/hooks/useRegistration";
import { CourseGlyph, LessonKindIcon } from "@/components/brand/Glyphs";

const accentBg: Record<Course["accent"], string> = {
  neon: "bg-neon", orange: "bg-orange", sky: "bg-sky", violet: "bg-violet", mint: "bg-mint",
};
const accentText: Record<Course["accent"], string> = {
  neon: "text-neon", orange: "text-orange", sky: "text-sky", violet: "text-violet", mint: "text-mint",
};
const accentBorder: Record<Course["accent"], string> = {
  neon: "border-neon", orange: "border-orange", sky: "border-sky", violet: "border-violet", mint: "border-mint",
};

/**
 * Left sidebar on lesson pages: back link, course progress, and every
 * module's lessons. The module holding the current lesson starts open.
 */
export function CourseNav({
  course,
  lessonSlug,
  onNavigate,
}: {
  course: Course;
  lessonSlug: string;
  onNavigate?: () => void;
}) {
  const { isComplete, completed } = useProgress(course.slug);
  const { registered } = useRegistration(course.slug);
  const currentModule = course.modules.findIndex((m) => m.lessons.some((l) => l.slug === lessonSlug));
  const [open, setOpen] = useState<Set<number>>(() => new Set([currentModule]));

  // Moving to a lesson in another module opens that module too.
  useEffect(() => {
    setOpen((prev) => (prev.has(currentModule) ? prev : new Set(prev).add(currentModule)));
  }, [currentModule]);

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const total = flattenLessons(course).length;
  const done = flattenLessons(course).filter((l) => completed.includes(l.slug)).length;

  return (
    <nav aria-label="Course contents" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          to={`/courses/${course.slug}`}
          onClick={onNavigate}
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to course
        </Link>
        <div className="flex items-center gap-3">
          <CourseGlyph slug={course.slug} className={`h-6 w-6 shrink-0 ${accentText[course.accent]}`} />
          <div className="font-display text-xl font-bold leading-tight">{course.title}</div>
        </div>
        {registered && <div className="flex flex-col gap-1.5">
          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div className={`h-full ${accentBg[course.accent]} transition-[width]`} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {done} / {total} lessons complete
          </span>
        </div>}
      </div>

      <ul className="flex flex-col border-t border-border">
        {course.modules.map((m, i) => {
          const isOpen = open.has(i);
          const modDone = m.lessons.filter((l) => isComplete(l.slug)).length;
          return (
            <li key={m.title} className="border-b border-border">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 py-3.5 text-left group"
              >
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Module {i} · {modDone}/{m.lessons.length}
                  </span>
                  <span className="font-display text-sm font-semibold leading-snug group-hover:text-foreground">{m.title}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <ul className="flex flex-col gap-0.5 pb-3">
                  {m.lessons.map((l) => {
                    const current = l.slug === lessonSlug;
                    const complete = isComplete(l.slug);
                    const kind = lessonKind(l);
                    return (
                      <li key={l.slug}>
                        <Link
                          to={`/courses/${course.slug}/${l.slug}`}
                          onClick={onNavigate}
                          aria-current={current ? "page" : undefined}
                          className={`flex items-start gap-2.5 px-2.5 py-2 rounded-sm border-l-2 text-sm leading-snug transition-colors ${
                            current
                              ? `${accentBorder[course.accent]} bg-secondary text-foreground font-semibold`
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <span
                            aria-label={complete ? "Completed" : undefined}
                            className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border text-[9px] leading-none ${
                              complete ? "bg-foreground border-foreground text-background" : "border-foreground/30"
                            }`}
                          >
                            {complete ? "✓" : ""}
                          </span>
                          <span className="flex-1 min-w-0">{l.title}</span>
                          <LessonKindIcon kind={kind} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
