import { tools } from "@/content/tools";
import { TOOL_BADGES, type ToolBadge } from "./toolBadges";

/** The id each tool's card carries on /tools, so a course can link straight to it. */
export const toolAnchor = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Every real tool a course explains, one icon per product, in the order /tools lists them. */
export function courseToolBadges(courseSlug: string): { badge: ToolBadge; tool: string }[] {
  const seen = new Set<string>();
  const out: { badge: ToolBadge; tool: string }[] = [];
  for (const tool of tools) {
    if (!tool.lessons.some((l) => l.course === courseSlug)) continue;
    for (const badge of TOOL_BADGES[tool.name] ?? []) {
      if (seen.has(badge.label)) continue;
      seen.add(badge.label);
      out.push({ badge, tool: tool.name });
    }
  }
  return out;
}
