import { Link } from "react-router-dom";
import { CourseGlyph } from "@/components/brand/Glyphs";
import { courses, flattenLessons } from "@/content/registry";
import { useEnrollments } from "@/hooks/useAccountStatus";
import { useProgress } from "@/hooks/useProgress";
import { pickContinue } from "@/lib/continueLearning";
import { readLastLesson } from "@/lib/progressStore";

const accentText: Record<string, string> = {
  neon: "text-neon", orange: "text-orange", sky: "text-sky", violet: "text-violet", mint: "text-mint",
};
const accentBg: Record<string, string> = {
  neon: "bg-neon", orange: "bg-orange", sky: "bg-sky", violet: "bg-violet", mint: "bg-mint",
};

/** For returning students: a way straight back into their course. Renders nothing for new visitors. */
export function ContinueLearning() {
  const { allProgress } = useProgress();
  const enrollments = useEnrollments();
  const target = pickContinue(courses, allProgress, readLastLesson(), enrollments);
  if (!target) return null;

  const { course, lesson, started } = target;
  const lessons = flattenLessons(course);
  const done = lessons.filter((l) => allProgress[course.slug]?.includes(l.slug)).length;
  const pct = Math.round((done / lessons.length) * 100);

  return (
    <Link
      to={`/courses/${course.slug}/${lesson.slug}`}
      className="group mt-10 block max-w-2xl border border-border bg-card p-5 transition hover:border-foreground/40"
    >
      <div className="flex items-center gap-4">
        <CourseGlyph slug={course.slug} className={`h-8 w-8 shrink-0 ${accentText[course.accent]}`} />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {started ? "Continue where you left off" : "Start your course"} · {course.title}
          </div>
          <div className="font-display text-lg font-semibold leading-snug group-hover:translate-x-0.5 transition-transform">
            {lesson.title} <span aria-hidden>→</span>
          </div>
        </div>
        <div className="shrink-0 font-mono text-[11px] tracking-widest text-muted-foreground">
          {done}/{lessons.length}
        </div>
      </div>
      <div className="mt-4 h-[3px] w-full bg-secondary overflow-hidden">
        <div className={`h-full ${accentBg[course.accent]}`} style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
