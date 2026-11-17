import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { courseToolBadges, toolAnchor } from "./courseToolBadges";
import { ToolIcon } from "./ToolIcon";

/** A row of tool icons for the course header, beside the authors and prerequisites. */
export function CourseTools({ courseSlug }: { courseSlug: string }) {
  const items = courseToolBadges(courseSlug);
  if (items.length === 0) return null;
  return (
    <div>
      <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-3">
        Tools it explains
      </div>
      <TooltipProvider delayDuration={150}>
        <ul className="flex flex-wrap items-center gap-2 min-h-10" aria-label="Tools this course explains">
          {items.map(({ badge, tool }) => (
            <li key={badge.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={`/tools#${toolAnchor(tool)}`}
                    aria-label={badge.label}
                    className="group/badge flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card transition-all duration-200 hover:border-border hover:bg-secondary/60 motion-safe:hover:-translate-y-0.5"
                  >
                    <ToolIcon badge={badge} className="h-5 w-5 shrink-0 transition-transform group-hover/badge:scale-110" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs">{badge.label}</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </TooltipProvider>
    </div>
  );
}
