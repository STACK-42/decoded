import { useEffect, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import CourseCard from "@/components/CourseCard";
import { LearningPaths } from "@/components/LearningPaths";
import { courses } from "@/content/registry";
import { useAccountStatus, useEnrollments } from "@/hooks/useAccountStatus";
import { useProgress } from "@/hooks/useProgress";

export default function Courses() {
  const status = useAccountStatus();
  const enrollments = useEnrollments();
  const { allProgress } = useProgress();
  const mine = status === "signed-in" ? courses.filter((c) => enrollments[c.slug] || allProgress[c.slug]?.length) : [];

  useEffect(() => {
    document.title = "All Tracks — Decoded";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-14 md:py-20">
          <div className="rise-in eyebrow text-muted-foreground mb-3">All Tracks</div>
          <h1 className="rise-in font-display text-[clamp(1.375rem,calc((100vw_-_3rem)/13.25),2.25rem)] sm:text-4xl md:text-6xl font-extrabold hyphens-auto break-words leading-[1.05] tracking-tight mb-5">
            Every CS course,<br />decoded.
          </h1>
          <p style={{ "--d": "120ms" } as CSSProperties} className="rise-in font-body text-lg text-muted-foreground italic max-w-2xl mb-12">
            Each track pairs the formal theoretical ideas with the modern tools and practices, the job, and the failure mode you've already seen.
          </p>

          {mine.length > 0 && (
            <section aria-label="Your courses" className="mb-12">
              <div className="eyebrow text-muted-foreground mb-4">Your courses</div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mine.map((c) => (
                  <CourseCard key={c.slug} slug={c.slug} />
                ))}
              </div>
            </section>
          )}

          <LearningPaths />

          <p className="mb-6 font-mono text-xs text-muted-foreground">
            Rather start from something you already use?{" "}
            <Link to="/tools" className="underline underline-offset-4 hover:text-foreground">
              Browse by tool
            </Link>
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.filter((c) => !mine.includes(c)).map((c) => (
              <CourseCard key={c.slug} slug={c.slug} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
