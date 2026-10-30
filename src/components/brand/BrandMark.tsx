/**
 * The Decoded mark: an outlined circle (the abstract idea) beside a solid
 * neon square (the real tool it becomes). The circle takes currentColor so
 * it follows the theme; the square uses the neon brand token.
 *
 * "compact" uses heavier strokes for sizes under ~32px (header, favicon).
 */
export function BrandMark({
  className = "h-6 w-6",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true" focusable="false">
      {compact ? (
        <>
          <circle cx="18" cy="36" r="14" fill="none" stroke="currentColor" strokeWidth="8" />
          <rect x="38" y="20" width="32" height="32" className="fill-neon" />
        </>
      ) : (
        <>
          <circle cx="19" cy="36" r="14" fill="none" stroke="currentColor" strokeWidth="5" />
          <rect x="40" y="22" width="28" height="28" className="fill-neon" />
        </>
      )}
    </svg>
  );
}

/** Mark + "Decoded." wordmark, as used in the header and footer. */
export function BrandLockup({ tagline = true, collapse = false }: { tagline?: boolean; collapse?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark compact className="h-[26px] w-[26px] shrink-0" />
      <span className={`font-display text-xl font-extrabold tracking-tight leading-none ${collapse ? "hidden min-[480px]:inline" : ""}`}>
        Decoded<span className="text-neon">.</span>
      </span>
      {tagline && (
        <span className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] uppercase hidden sm:inline">
          cs → real world
        </span>
      )}
    </span>
  );
}
