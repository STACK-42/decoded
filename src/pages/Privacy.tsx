import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { ANALYTICS_TOKEN } from "@/lib/analytics";
import { HELLO_EMAIL, HELP_EMAIL } from "@/lib/contact";
import { deleteAccount } from "@/lib/progressSync";

export default function Privacy() {
  const status = useAccountStatus();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = "Privacy — Decoded";
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success("Account deleted", { description: "Your account and saved progress are gone." });
    } catch {
      toast.error("Couldn't delete your account", { description: "Check your connection and try again." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      <div className="grid-noise pointer-events-none fixed inset-0 z-0" aria-hidden />

      <SiteHeader />

      <main className="flex-1 relative z-10">
        <article className="container py-20 max-w-2xl prose dark:prose-invert font-body">
          <h1 className="font-display">Privacy</h1>
          <p>You can use all of Decoded without an account. Your progress is then saved only in your browser.</p>

          {ANALYTICS_TOKEN && (
            <p>
              Decoded counts page visits with Cloudflare Web Analytics, which doesn't use cookies or identify individual
              visitors.
            </p>
          )}

          <h2 className="font-display">If you sign in</h2>
          <p>Signing in saves your progress so it follows you between devices. Decoded stores:</p>
          <ul>
            <li>the user ID GitHub or Google gives you, which is how your account is recognised</li>
            <li>the address of your profile picture, and your username if you use GitHub, shown in your account menu</li>
            <li>the courses you've registered for, the lessons you've completed, your best quiz scores, and when</li>
            <li>a sign-in session, kept in a cookie that lasts up to 90 days</li>
            <li>if you make a profile, the handle you chose and whether it's public</li>
            <li>who you study each course with, if you invite someone or accept an invite</li>
          </ul>
          <p>
            Decoded doesn't store your email address, password or your name from Google. The data is held on Cloudflare,
            and the cookie is used only to keep you signed in.
          </p>

          <h2 className="font-display">Public profiles</h2>
          <p>
            A profile is off until you turn it on. While it's on, anyone can see your handle, your profile picture, when
            you joined, and the courses you take with how many lessons you've completed, and can find you by searching
            your handle. Your quiz scores are never shown. Turn it off on{" "}
            <Link to="/profile">your profile page</Link> and it disappears at once, though your handle stays reserved for
            you.
          </p>
          <p>
            If you report a profile, Decoded keeps who sent the report, the reason and when, so the team can review it.
            The person you report isn't told who you are.
          </p>

          <h2 className="font-display">Study companions</h2>
          <p>
            You can study a course with someone by sending them an invite link, which works once and expires after 7 days.
            Nobody can become your companion without a link you sent them. Companions see each other's handle, picture
            and progress in that one course: how many lessons are done and the latest one. They don't see quiz scores or
            your other courses. Either of you can remove the other at any time, and they aren't told. If you turn your
            profile off, you disappear from your companions' lists until you turn it back on.
          </p>

          <h2 className="font-display">If you email us</h2>
          <p>
            Mail to <a href={`mailto:${HELLO_EMAIL}`}>{HELLO_EMAIL}</a> or <a href={`mailto:${HELP_EMAIL}`}>{HELP_EMAIL}</a>{" "}
            passes through Cloudflare to the maintainer's inbox. It's read by a person and isn't added to a mailing list.
          </p>

          <h2 className="font-display">Deleting your data</h2>
          <p>
            Deleting your account removes your account, sessions, registrations, saved progress, profile and companions straight away.
          </p>
          {status === "signed-in" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={deleting}
                  className="font-mono text-xs uppercase tracking-widest underline text-destructive"
                >
                  Delete my account
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes your saved progress, on this browser too. It can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my account</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete account</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <p>Sign in first to delete your account.</p>
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
