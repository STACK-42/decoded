import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  // The saved theme is only known in the browser, after mounting.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = isDark ? "light" : "dark";
        // Picking the theme the OS already uses means "follow the OS" again, so a later
        // switch in system settings still reaches the site instead of a saved override.
        setTheme(next === systemTheme ? "system" : next);
      }}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {mounted && isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
