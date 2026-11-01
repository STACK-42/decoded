import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { getLesson } from "@/content/registry";
import { tools } from "@/content/tools";

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

          <div className="grid gap-4 md:grid-cols-2">
            {tools.map((tool) => (
              <section key={tool.name} aria-label={tool.name} className="border border-border bg-card p-6">
                <h2 className="font-display text-2xl font-bold">{tool.name}</h2>
                <p className="mt-1 mb-4 font-body text-sm italic text-muted-foreground">{tool.what}</p>
                <ul className="space-y-2">
                  {tool.lessons.map(({ course, lesson }) => {
                    const found = getLesson(course, lesson)!;
                    return (
                      <li key={`${course}/${lesson}`}>
                        <Link to={`/courses/${course}/${lesson}`} className="group block">
                          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{found.course.title}</span>
                          <span className="font-display font-semibold group-hover:text-neon transition-colors">{found.lesson.title} →</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
