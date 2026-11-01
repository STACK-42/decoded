import { Link } from "react-router-dom";
import { courses, flattenLessons } from "@/content/registry";
import { useProgress } from "@/hooks/useProgress";
import { useRegistration } from "@/hooks/useRegistration";
import { CourseGlyph } from "@/components/brand/Glyphs";

const accentText: Record<string, string> = {
  neon: "text-neon",
  orange: "text-orange",
  sky: "text-sky",
  violet: "text-violet",
  mint: "text-mint",
};
const accentBg: Record<string, string> = {
  neon: "bg-neon",
  orange: "bg-orange",
  sky: "bg-sky",
  violet: "bg-violet",
  mint: "bg-mint",
};

export default function CourseCard({ slug }: { slug: string }) {
  const course = courses.find((c) => c.slug === slug)!;
  const { allProgress } = useProgress();
  const { registered } = useRegistration(course.slug);
  const total = flattenLessons(course).length;
  const done = (allProgress[course.slug] ?? []).filter((s) =>
    flattenLessons(course).some((l) => l.slug === s)
  ).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const disabled = course.status === "coming-soon";

  const Wrapper: React.ElementType = disabled ? "div" : Link;
  const wrapperProps = disabled ? {} : { to: `/courses/${course.slug}` };

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative block border border-border bg-card overflow-hidden transition-all
        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-foreground/40 hover:-translate-y-0.5"}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentBg[course.accent]}`} aria-hidden />

      <div className="p-6 md:p-7">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="flex items-center gap-3">
            <CourseGlyph slug={course.slug} className={`h-7 w-7 ${accentText[course.accent]}`} />
            <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
              {course.number}
            </span>
          </span>
          <span className={`font-mono text-[10px] tracking-[0.15em] uppercase ${accentText[course.accent]}`}>
            {course.status === "coming-soon" ? "Coming soon" : `${total} lesson${total !== 1 ? "s" : ""}`}
          </span>
        </div>

        <h3 className="font-display text-2xl md:text-[26px] font-bold leading-tight mb-2 group-hover:translate-x-0.5 transition-transform">
          {course.title}
        </h3>
        <p className="text-sm text-muted-foreground italic leading-relaxed mb-5">
          {course.tagline}
        </p>

        {!disabled && total > 0 && !registered && (
          <div className={`font-mono text-[10px] tracking-widest uppercase ${accentText[course.accent]}`}>
            Register to track progress →
          </div>
        )}

        {!disabled && total > 0 && registered && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              <span>Progress</span>
              <span>{done}/{total}</span>
            </div>
            <div className="h-[3px] w-full bg-secondary overflow-hidden">
              <div
                className={`h-full ${accentBg[course.accent]} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
