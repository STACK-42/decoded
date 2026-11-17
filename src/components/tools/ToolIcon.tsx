import type { ComponentType } from "react";
import type { SimpleIcon } from "simple-icons";
import type { ToolBadge } from "./toolBadges";

/**
 * Renders an authentic tool icon with theme-adaptive styling.
 */
export function ToolIcon({
  badge,
  simpleIcon,
  lucideIcon,
  color,
  className = "w-3.5 h-3.5 shrink-0 transition-transform group-hover/badge:scale-110",
}: {
  badge?: ToolBadge;
  simpleIcon?: SimpleIcon;
  lucideIcon?: ComponentType<{ className?: string }>;
  color?: string;
  className?: string;
}) {
  const icon = simpleIcon ?? badge?.icon;
  const Lucide = lucideIcon ?? badge?.lucideIcon;
  const iconColor = color ?? badge?.color ?? "currentColor";

  if (icon) {
    const isDarkNeutral = iconColor === "#000000" || iconColor === "#181717" || iconColor === "#231F20";
    return (
      <svg
        role="img"
        viewBox="0 0 24 24"
        className={className}
        style={{ fill: isDarkNeutral ? "currentColor" : iconColor }}
        aria-hidden="true"
      >
        <title>{icon.title}</title>
        <path d={icon.path} />
      </svg>
    );
  }

  if (Lucide) {
    return (
      <Lucide
        className={className}
        style={{ color: iconColor }}
      />
    );
  }

  return null;
}
