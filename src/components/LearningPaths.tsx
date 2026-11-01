import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { courses, flattenLessons, type Course } from "@/content/registry";
import { learningPaths } from "@/content/paths";
import { useProgress } from "@/hooks/useProgress";

export function LearningPaths() {
  const { allProgress } = useProgress();
  const isFinished = (course: Course) => {
    const lessons = flattenLessons(course);
    return lessons.length > 0 && lessons.every((l) => allProgress[course.slug]?.includes(l.slug));
  };

  return (
    <section aria-label="Suggested paths" className="mb-14">
      <div className="eyebrow text-muted-foreground mb-4">Not sure where to start?</div>
      <div className="grid gap-4 md:grid-cols-2">
        {learningPaths.map((path) => (
          <div key={path.slug} className="border border-border bg-card p-5">
            <h2 className="font-display text-xl font-bold">{path.title}</h2>
            <p className="mt-1 mb-4 font-body text-sm italic text-muted-foreground">{path.description}</p>
            <ol className="space-y-1.5">
              {path.courses.map((slug, i) => {
                const course = courses.find((c) => c.slug === slug)!;
                const finished = isFinished(course);
                return (
                  <li key={slug}>
                    <Link to={`/courses/${slug}`} className="flex items-center gap-3 font-mono text-xs hover:text-neon transition-colors">
                      <span className="w-4 shrink-0 text-muted-foreground">
                        {finished ? <Check className="h-3.5 w-3.5 text-mint" aria-label="Finished" /> : `${i + 1}.`}
                      </span>
                      {course.title}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
