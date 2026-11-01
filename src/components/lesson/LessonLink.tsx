import { AnchorHTMLAttributes, ReactNode, useEffect, useState } from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getCourse, getLesson } from "@/content/registry";
import { extractPreview, lessonKeyFromPath, type Excerpt } from "@/lib/lessonPreview";

/* Lesson links with a dictionary-style preview. Hover a link to another lesson
   and a card shows how that lesson defines the idea, so a reader can check a
   term without leaving the page. Touch screens skip the card and just follow
   the link. The linked lesson's source is fetched the first time it's needed. */

const sources = import.meta.glob("/src/content/**/*.mdx", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const loaderFor = new Map(Object.entries(sources).map(([file, load]) => [lessonKeyFromPath(file), load]));
const cache = new Map<string, Promise<Excerpt | null>>();

// KaTeX is only needed once a card opens (lessons render their own maths at build
// time), so it's fetched then, keeping it out of the lesson page's bundle.
let katex: typeof import("katex").default | undefined;
const loadKatex = () => import("katex").then((m) => (katex = m.default));

function loadExcerpt(course: string, lesson: string, section: string | undefined, term: string) {
  const key = `${course}/${lesson}#${section ?? ""}|${term}`;
  if (!cache.has(key)) {
    const load = loaderFor.get(`${course}/${lesson}`);
    cache.set(key, load ? load().then((src) => extractPreview(src, section, term)) : Promise.resolve(null));
  }
  return cache.get(key)!;
}

const accentBar: Record<string, string> = {
  neon: "bg-neon", orange: "bg-orange", sky: "bg-sky", violet: "bg-violet", mint: "bg-mint",
};

const math = (tex: string, displayMode: boolean) => (
  <span
    className={displayMode ? "block my-2 overflow-x-auto overflow-y-hidden" : undefined}
    // our own lesson source, rendered by KaTeX, which escapes it
    dangerouslySetInnerHTML={{ __html: katex?.renderToString(tex, { throwOnError: false, displayMode }) ?? tex }}
  />
);

/** The excerpt's small markdown subset: math, bold, italics, code and links (as plain words). */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\$[^$\n]+\$|\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    if (/^\$[^$]+\$$/.test(p)) return <span key={i}>{math(p.slice(1, -1), false)}</span>;
    if (/^\*\*.+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-foreground">{inline(p.slice(2, -2))}</strong>;
    if (/^\*.+\*$/.test(p)) return <em key={i}>{inline(p.slice(1, -1))}</em>;
    if (/^`.+`$/.test(p)) return <code key={i} className="font-mono text-[0.85em] px-1 rounded-sm bg-muted">{p.slice(1, -1)}</code>;
    const link = p.match(/^\[([^\]]+)\]\([^)]+\)$/);
    if (link) return <span key={i}>{inline(link[1])}</span>;
    return p;
  });
}

function ExcerptBody({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const bullets: string[] = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    nodes.push(
      <ul key={nodes.length} className="mt-1.5 space-y-1 pl-4 list-disc marker:text-muted-foreground">
        {bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}
      </ul>,
    );
    bullets.length = 0;
  };
  for (const chunk of text.split(/(\$\$[\s\S]+?\$\$)/)) {
    if (/^\$\$[\s\S]+\$\$$/.test(chunk)) {
      flushBullets();
      nodes.push(<div key={nodes.length}>{math(chunk.slice(2, -2), true)}</div>);
      continue;
    }
    for (const line of chunk.split("\n")) {
      if (line.startsWith("- ")) bullets.push(line.slice(2));
      else if (line.trim()) {
        flushBullets();
        nodes.push(<p key={nodes.length}>{inline(line)}</p>);
      }
    }
  }
  flushBullets();
  return <>{nodes}</>;
}

function PreviewCard({ course, lesson, section, term }: { course: string; lesson: string; section?: string; term: string }) {
  const [excerpt, setExcerpt] = useState<Excerpt | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    Promise.all([loadExcerpt(course, lesson, section, term), loadKatex()]).then(
      ([e]) => live && setExcerpt(e),
      () => live && setExcerpt(null),
    );
    return () => {
      live = false;
    };
  }, [course, lesson, section, term]);

  const found = getLesson(course, lesson);
  const courseInfo = getCourse(course);
  const lessonTitle = found?.lesson.title ?? lesson;
  const headword = excerpt?.headword || excerpt?.heading || lessonTitle;
  const where = excerpt?.heading && excerpt.heading !== headword ? `${lessonTitle} · ${excerpt.heading}` : lessonTitle;

  return (
    <div className="flex">
      <div className={`w-1 shrink-0 ${accentBar[courseInfo?.accent ?? "sky"]}`} aria-hidden />
      <div className="min-w-0 px-4 py-3.5">
        <div className="font-display text-lg leading-tight text-foreground first-letter:uppercase">{headword}</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {courseInfo?.title} · {where}
        </div>
        <div className="mt-2.5 font-body text-[13.5px] leading-relaxed text-muted-foreground space-y-1.5">
          {excerpt === undefined ? (
            <div className="space-y-2 py-1" aria-label="Loading definition">
              <div className="h-2.5 rounded bg-muted animate-pulse" />
              <div className="h-2.5 w-4/5 rounded bg-muted animate-pulse" />
            </div>
          ) : excerpt ? (
            <ExcerptBody text={excerpt.text} />
          ) : (
            <p>Open the lesson to read more.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Replaces <a> in lessons. Links to other lessons get the hover preview; others stay plain. */
export function LessonLink({ href = "", children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const m = href.match(/^\/courses\/([a-z0-9-]+)\/([a-z0-9-]+)(?:#([^?]+))?$/);
  if (!m) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  const [, course, lesson, hash] = m;
  const term = typeof children === "string" ? children : (Array.isArray(children) ? children : [children]).filter((c) => typeof c === "string").join("");

  return (
    <HoverCard openDelay={300} closeDelay={120}>
      <HoverCardTrigger asChild>
        <a href={href} {...props}>
          {children}
        </a>
      </HoverCardTrigger>
      <HoverCardPrimitive.Portal>
        <HoverCardContent side="top" align="start" collisionPadding={12} className="not-prose w-[min(24rem,calc(100vw-24px))] p-0 overflow-hidden">
          <PreviewCard course={course} lesson={lesson} section={hash ? decodeURIComponent(hash) : undefined} term={term} />
        </HoverCardContent>
      </HoverCardPrimitive.Portal>
    </HoverCard>
  );
}
