import type { CSSProperties, ComponentType } from "react";
import type { SimpleIcon } from "simple-icons";
import type { ToolBadge } from "./toolBadges";

/** True for brand colours too dark to read on the dark theme (SQLite navy, LLVM, OpenSSL maroon). */
function isDark(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.06;
}

/**
 * Renders a tool's icon in its brand colour. Brand colours that would vanish on the dark theme
 * keep their colour in light mode and switch to the text colour in dark mode.
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
  lucideIcon?: ComponentType<{ className?: string; style?: CSSProperties }>;
  color?: string;
  className?: string;
}) {
  const icon = simpleIcon ?? badge?.icon;
  const Lucide = (lucideIcon ?? badge?.lucideIcon) as ComponentType<{ className?: string; style?: CSSProperties }> | undefined;
  const iconColor = color ?? badge?.color ?? "currentColor";
  const dark = isDark(iconColor);
  const style = { "--tool-icon": iconColor } as CSSProperties;

  if (icon) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} fill-[var(--tool-icon)] ${dark ? "dark:fill-current" : ""}`}
        style={style}
        aria-hidden="true"
      >
        <path d={icon.path} />
      </svg>
    );
  }

  if (Lucide) {
    return (
      <Lucide
        className={`${className} text-[var(--tool-icon)] ${dark ? "dark:text-current" : ""}`}
        style={style}
        aria-hidden="true"
      />
    );
  }

  return null;
}
