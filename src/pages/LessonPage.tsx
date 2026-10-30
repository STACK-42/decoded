import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { MDXProvider } from "@mdx-js/react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { getLesson, lessonNeighbors, lessonKind } from "@/content/registry";
import { useProgress } from "@/hooks/useProgress";
import { CodeBlock } from "@/components/mdx/MdxComponents";
import { CourseNav } from "@/components/lesson/CourseNav";
import { LessonToc } from "@/components/lesson/LessonToc";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Flag, PanelLeft } from "lucide-react";
import { reportMistakeUrl } from "@/lib/reportMistake";
import { writeLastLesson } from "@/lib/progressStore";
import { scrollToSection } from "@/lib/scrollToSection";

const SIDEBAR_KEY = "decoded:sidebar-open";

function readSidebarPref() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== "0";
  } catch {
    return true;
  }
}

const mdxComponents = { pre: CodeBlock };

function LessonSkeleton() {
  return (
    <div role="status" aria-label="Loading lesson" className="animate-pulse space-y-4 py-4">
      <div className="h-10 w-2/3 bg-secondary" />
      <div className="h-4 w-full bg-secondary" />
      <div className="h-4 w-11/12 bg-secondary" />
      <div className="h-4 w-4/5 bg-secondary" />
    </div>
  );
}

/** Renders next to the lesson, so its effect runs once the lesson's chunk is on the page. */
function LessonLoaded({ onLoaded }: { onLoaded: () => void }) {
  useEffect(onLoaded, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const accentBg: Record<string, string> = {
  neon: "bg-neon", orange: "bg-orange", sky: "bg-sky", violet: "bg-violet", mint: "bg-mint",
};

export default function LessonPage() {
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug: string }>();
  
  const data = useMemo(() => 
    courseSlug && lessonSlug ? getLesson(courseSlug, lessonSlug) : null,
    [courseSlug, lessonSlug]
  );

  const { isComplete, setComplete } = useProgress(courseSlug);
  const [scroll, setScroll] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  // Desktop: sidebar shown inline (remembered). Mobile: it opens as a drawer.
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarPref);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);

  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarOpen((o) => {
        try {
          localStorage.setItem(SIDEBAR_KEY, o ? "0" : "1");
        } catch {
          /* private mode */
        }
        return !o;
      });
    } else {
      setDrawerOpen(true);
    }
  };

  useEffect(() => {
    if (courseSlug && lessonSlug && data) writeLastLesson({ course: courseSlug, lesson: lessonSlug });
  }, [courseSlug, lessonSlug, data]);

  useEffect(() => {
    if (data) document.title = `${data.lesson.title} — ${data.course.title}`;
    // A #section deep link waits for the lesson to load; otherwise start at the top.
    if (!window.location.hash) window.scrollTo({ top: 0 });
  }, [data]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setScroll(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!data || !courseSlug || !lessonSlug) return <Navigate to="/404" replace />;
  const { course, module, lesson } = data;
  const Lesson = lesson.Component;
  const { prev, next } = lessonNeighbors(courseSlug, lessonSlug);
  const done = isComplete(lessonSlug);
  const kind = lessonKind(lesson);

  const onLessonLoaded = () => {
    setLoadedSlug(lessonSlug);
    const hash = window.location.hash;
    if (hash && contentRef.current) scrollToSection(decodeURIComponent(hash.slice(1)), contentRef.current);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-transparent">
        <div
          className={`h-full ${accentBg[course.accent]} transition-[width] duration-150`}
          style={{ width: `${scroll}%` }}
        />
      </div>

      <SiteHeader />

      <div className="flex-1 flex">
        {sidebarOpen && (
          <aside className="hidden lg:block w-72 shrink-0 border-r border-border">
            <div className="sticky top-0 max-h-screen overflow-y-auto px-5 py-8">
              <CourseNav course={course} lessonSlug={lessonSlug} />
            </div>
          </aside>
        )}

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-6">
            <SheetTitle className="sr-only">Course contents</SheetTitle>
            <CourseNav course={course} lessonSlug={lessonSlug} onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>

      <main className="flex-1 min-w-0">
        <div className="px-4 sm:px-6 pt-5">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Hide course contents" : "Show course contents"}
            className="inline-flex h-10 w-10 items-center justify-center border border-transparent hover:border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <PanelLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex justify-center gap-12 px-6">
        <article className="w-full max-w-2xl min-w-0 pb-10 md:pb-16 pt-4 md:pt-6">
          {/* breadcrumbs */}
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-8 flex-wrap">
            <Link to="/courses" className="hover:text-foreground transition">Tracks</Link>
            <span>/</span>
            <Link to={`/courses/${course.slug}`} className="hover:text-foreground transition">
              {course.title}
            </Link>
            <span>/</span>
            <span>{module.title}</span>
          </div>

          <div className="flex items-center gap-3 mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>{lesson.duration} read</span>
          </div>

          <MDXProvider components={mdxComponents}>
            <div className="prose-reading" ref={contentRef}>
              <ChunkErrorBoundary key={lessonSlug}>
                <Suspense fallback={<LessonSkeleton />}>
                  <Lesson />
                  <LessonLoaded onLoaded={onLessonLoaded} />
                </Suspense>
              </ChunkErrorBoundary>
            </div>
          </MDXProvider>

          {/* Mark complete */}
          <div className="mt-12 pt-8 border-t border-border">
            {kind === "quiz" ? (
              done ? (
                <div className="inline-flex items-center gap-3 px-5 py-3 border border-foreground bg-foreground text-background font-mono text-xs uppercase tracking-widest">
                  <span className="inline-flex h-4 w-4 items-center justify-center border border-background bg-background text-foreground">✓</span>
                  Quiz passed — lesson complete
                </div>
              ) : (
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Pass the quiz above to mark this lesson complete.
                </p>
              )
            ) : (
              <button
                onClick={() => setComplete(lessonSlug, !done)}
                className={`group inline-flex items-center gap-3 px-5 py-3 border transition font-mono text-xs uppercase tracking-widest
                  ${done
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground"}`}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center border ${
                    done ? "bg-background border-background text-foreground" : "border-foreground/40"
                  }`}
                >
                  {done ? "✓" : ""}
                </span>
                {done ? "Lesson complete" : "Mark as complete"}
              </button>
            )}
          </div>

          <a
            href={reportMistakeUrl(course.title, lesson.title, `${window.location.origin}/courses/${course.slug}/${lesson.slug}`)}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
          >
            <Flag className="h-3 w-3" aria-hidden="true" />
            Report a mistake
          </a>

          {/* Prev / Next */}
          <nav className="mt-10 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link
                to={`/courses/${course.slug}/${prev.slug}`}
                className="group border border-border p-5 hover:border-foreground/40 transition"
              >
                <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">
                  ← Previous
                </div>
                <div className="font-display font-semibold group-hover:-translate-x-0.5 transition-transform">
                  {prev.title}
                </div>
              </Link>
            ) : <span />}

            {next ? (
              <Link
                to={`/courses/${course.slug}/${next.slug}`}
                className="group border border-border p-5 hover:border-foreground/40 transition text-right"
              >
                <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">
                  Next →
                </div>
                <div className="font-display font-semibold group-hover:translate-x-0.5 transition-transform">
                  {next.title}
                </div>
              </Link>
            ) : (
              <Link
                to={`/courses/${course.slug}`}
                className="group border border-border p-5 hover:border-foreground/40 transition text-right"
              >
                <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">
                  Back to course
                </div>
                <div className="font-display font-semibold">{course.title}</div>
              </Link>
            )}
          </nav>
        </article>

        <aside className="hidden xl:block w-56 shrink-0">
          <div className="sticky top-0 max-h-screen overflow-y-auto pt-24 pb-8">
            <LessonToc contentRef={contentRef} contentKey={loadedSlug === lessonSlug ? lessonSlug : ""} accent={course.accent} />
          </div>
        </aside>
        </div>
      </main>
      </div>

      <SiteFooter />
    </div>
  );
}
