import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Github, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountProfile, useAccountStatus } from "@/hooks/useAccountStatus";
import { signIn, signOut } from "@/lib/progressSync";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.26a12 12 0 0 0 0 10.78l4.01-3.11z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

/** `returnTo` is where the sign-in provider sends people back to; defaults to the current page. */
export function SignInDialog({ trigger, title = "Keep your progress", returnTo }: { trigger: ReactNode; title?: string; returnTo?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <BrandMark className="mb-2 h-10 w-10 text-foreground" />
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription className="font-body text-base">
            Sign in to pick up where you left off on any device. Lessons you've already finished here come with you.
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={() => signIn("github", returnTo)}
          className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-sm bg-foreground px-4 py-3 font-mono text-sm text-background transition-opacity hover:opacity-85"
        >
          <Github className="h-4 w-4" aria-hidden />
          Continue with GitHub
        </button>
        <button
          type="button"
          onClick={() => signIn("google", returnTo)}
          className="flex w-full items-center justify-center gap-2.5 rounded-sm border border-border px-4 py-3 font-mono text-sm text-foreground transition-colors hover:border-foreground"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <p className="text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
          Decoded only keeps your account ID and picture, plus your username on GitHub.{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}

function AccountMenu() {
  const profile = useAccountProfile();
  const name = profile?.name ?? "Your account";

  const handleSignOut = () =>
    signOut().catch(() =>
      toast.error("Couldn't sign you out", { description: "Your latest progress hasn't been saved yet. Check your connection and try again." }),
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar className="h-8 w-8 border border-border transition-colors hover:border-foreground">
          {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback className="font-mono text-xs text-foreground">{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate font-mono text-sm normal-case tracking-normal">{name}</div>
          <div className="font-mono text-[11px] normal-case tracking-normal text-muted-foreground">Progress saved to your account</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer font-mono text-xs normal-case tracking-normal">
          <Link to="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer font-mono text-xs normal-case tracking-normal">
          <Link to="/privacy">
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
            Privacy &amp; account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer font-mono text-xs normal-case tracking-normal">
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Hidden until the API has answered, and if it can't be reached. */
export function AccountButton() {
  const status = useAccountStatus();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("signin") !== "failed") return;
    url.searchParams.delete("signin");
    window.history.replaceState(null, "", url);
    toast.error("Couldn't sign you in", { description: "Your progress is still saved on this device. Please try again." });
  }, []);

  if (status === "signed-out") {
    return (
      <SignInDialog
        trigger={
          <button
            type="button"
            className="rounded-sm border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:border-foreground"
          >
            Sign in
          </button>
        }
      />
    );
  }
  if (status === "signed-in") return <AccountMenu />;
  return null;
}
