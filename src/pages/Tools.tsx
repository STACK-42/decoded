import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { getLesson } from "@/content/registry";
import { tools } from "@/content/tools";
import { TOOL_BADGES } from "@/components/tools/toolBadges";
import { ToolIcon } from "@/components/tools/ToolIcon";

export default function Tools() {
  useEffect(() => {
    document.title = "Browse by Tool — Decoded";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-14 md:py-20 max-w-5xl">
          <div className="eyebrow text-muted-foreground mb-3">Browse by tool</div>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-5">
            Start from what you already use.
          </h1>
          <p className="font-body text-lg text-muted-foreground italic max-w-2xl mb-12">
            Pick a tool you've run into and go straight to the theory that explains it.
          </p>

          <div className="grid gap-5 md:grid-cols-2">
            {tools.map((tool) => {
              const badges = TOOL_BADGES[tool.name] || [];
              return (
                <section
                  key={tool.name}
                  aria-label={tool.name}
                  className="group relative border border-border/80 bg-card p-6 md:p-7 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:border-violet/40 hover:shadow-md motion-safe:hover:-translate-y-0.5"
                >
                  <div>
                    {badges.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {badges.map((b) => (
                          <span
                            key={b.label}
                            className="group/badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/70 bg-secondary/40 text-xs font-mono text-foreground/80 transition-colors hover:border-border hover:bg-secondary/70"
                          >
                            <ToolIcon badge={b} />
                            <span>{b.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <h2 className="font-display text-2xl font-bold tracking-tight mb-2">
                      {tool.name}
                    </h2>
                    <p className="font-body text-sm text-muted-foreground italic leading-relaxed mb-6">
                      {tool.what}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2.5">
                      Explained in {tool.lessons.length === 1 ? "lesson" : "lessons"}:
                    </div>
                    <ul className="space-y-1.5">
                      {tool.lessons.map(({ course, lesson }) => {
                        const found = getLesson(course, lesson)!;
                        return (
                          <li key={`${course}/${lesson}`}>
                            <Link
                              to={`/courses/${course}/${lesson}`}
                              className="group/link flex items-baseline justify-between gap-3 text-sm rounded-lg px-2.5 py-1.5 -mx-2 hover:bg-secondary/50 transition-colors"
                            >
                              <span className="font-display font-medium text-foreground/90 group-hover/link:text-neon transition-colors">
                                {found.lesson.title}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
                                {found.course.title} →
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
