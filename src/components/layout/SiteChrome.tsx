import { Link, useLocation } from "react-router-dom";
import { BrandLockup, BrandMark } from "@/components/brand/BrandMark";
import { AccountButton } from "@/components/AccountButton";
import { SearchButton } from "@/components/SearchDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProgressBackup } from "@/components/ProgressBackup";
import { useAccountStatus } from "@/hooks/useAccountStatus";

export function SiteHeader() {
  const { pathname } = useLocation();

  return (
    <header className="relative z-10 bg-background text-foreground border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" aria-label="Decoded home">
          <BrandLockup collapse />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6 font-mono text-xs uppercase tracking-widest">
          <Link
            to="/"
            className={`hidden sm:inline transition-colors hover:text-foreground ${pathname === "/" ? "text-foreground" : "text-muted-foreground"}`}
          >
            Home
          </Link>
          <Link
            to="/courses"
            className={`transition-colors hover:text-foreground ${pathname.startsWith("/courses") ? "text-foreground" : "text-muted-foreground"}`}
          >
            Courses
          </Link>
          <SearchButton />
          <ThemeToggle />
          <AccountButton />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const status = useAccountStatus();

  return (
    <footer className="border-t border-border">
      <div className="container py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        <span className="flex items-center gap-2">
          <BrandMark compact className="h-4 w-4 text-foreground" />
          Decoded. Built for bridging the abstraction gap
        </span>
        <nav className="flex items-center gap-6">
          <Link to="/courses" className="hover:text-foreground transition-colors">Courses</Link>
          <Link to="/tools" className="hover:text-foreground transition-colors">Tools</Link>
          <Link to="/team" className="hover:text-foreground transition-colors">Contributors</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </nav>
        <span className="flex flex-col gap-2 md:items-end">
          <span>v0.1 · Progress saved {status === "signed-in" ? "to your account" : "on this device"}</span>
          <ProgressBackup />
        </span>
      </div>
    </footer>
  );
}
