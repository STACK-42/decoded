import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Flag, Link2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { SignInDialog } from "@/components/AccountButton";
import { CourseGlyph } from "@/components/brand/Glyphs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { flattenLessons, getCourse, type Course } from "@/content/registry";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { fetchPublicProfile, reportProfile, type PublicProfile as Profile, type ReportReason } from "@/lib/profiles";
import { copyLink, profileShareUrl } from "@/lib/shareLinks";

const accentText: Record<Course["accent"], string> = {
  neon: "text-neon", orange: "text-orange", sky: "text-sky", violet: "text-violet", mint: "text-mint",
};
const accentBg: Record<Course["accent"], string> = {
  neon: "bg-neon", orange: "bg-orange", sky: "bg-sky", violet: "bg-violet", mint: "bg-mint",
};

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "offensive", label: "The handle or picture is offensive" },
  { value: "impersonation", label: "It pretends to be someone else" },
  { value: "personal-info", label: "It shows someone's personal details" },
  { value: "other", label: "Something else" },
];

function ReportDialog({ handle }: { handle: string }) {
  const status = useAccountStatus();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const trigger = (
    <button type="button" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
      <Flag className="h-3.5 w-3.5" aria-hidden />
      Report
    </button>
  );
  if (status !== "signed-in") return <SignInDialog title="Sign in to report" trigger={trigger} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) return;
    setState("sending");
    setState((await reportProfile(handle, reason)) ? "sent" : "failed");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Report @{handle}</DialogTitle>
          <DialogDescription className="font-body">The Decoded team reads every report. They don't tell the person who sent it.</DialogDescription>
        </DialogHeader>
        {state === "sent" ? (
          <p role="status" className="font-body">Thanks. Your report was sent.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="sr-only">What's wrong?</legend>
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-3 font-body text-sm">
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </fieldset>
            {state === "failed" && <p role="alert" className="font-mono text-xs text-orange">Couldn't send it. Please try again.</p>}
            <button
              type="submit"
              disabled={!reason || state === "sending"}
              className="w-full bg-foreground px-4 py-3 font-mono text-sm text-background hover:opacity-85 disabled:opacity-40"
            >
              {state === "sending" ? "Sending…" : "Send report"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function PublicProfile() {
  const { handle = "" } = useParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.title = `@${handle} — Decoded`;
    setLoaded(false);
    fetchPublicProfile(handle.toLowerCase()).then((p) => {
      setProfile(p);
      setLoaded(true);
    });
  }, [handle]);

  // Only courses the site still has, with completed lessons capped at today's syllabus.
  const courses = (profile?.courses ?? [])
    .map(({ course: slug, completed }) => {
      const course = getCourse(slug);
      if (!course) return null;
      const total = flattenLessons(course).length;
      return { course, done: Math.min(completed, total), total };
    })
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-14 md:py-20 max-w-3xl">
          {loaded && profile === null && (
            <div className="border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-bold mb-2">No public profile here.</p>
              <p className="font-body italic text-muted-foreground mb-5">Nobody has @{handle}, or they've turned their profile off.</p>
              <Link to="/people" className="font-mono text-xs underline underline-offset-4 hover:text-neon">Find people</Link>
            </div>
          )}
          {loaded && profile === undefined && (
            <p className="font-mono text-sm text-muted-foreground">Couldn't reach Decoded's server. Check your connection and try again.</p>
          )}

          {profile && (
            <>
              <header className="flex flex-wrap items-center gap-5 mb-12">
                <Avatar className="h-20 w-20 border border-border">
                  {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />}
                  <AvatarFallback className="font-display text-2xl">{profile.handle.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-3xl md:text-4xl font-extrabold break-words">@{profile.handle}</h1>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    Learning on Decoded since {new Date(profile.since).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => copyLink(profileShareUrl(profile.handle))}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    Copy link
                  </button>
                  <ReportDialog handle={profile.handle} />
                </div>
              </header>

              <div className="eyebrow text-muted-foreground mb-4">Courses</div>
              {courses.length === 0 ? (
                <p className="font-body italic text-muted-foreground">Not taking any courses yet.</p>
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {courses.map(({ course, done, total }) => (
                    <li key={course.slug}>
                      <Link to={`/courses/${course.slug}`} className="flex items-center gap-4 py-4 hover:bg-card/60 transition-colors">
                        <CourseGlyph slug={course.slug} className={`h-6 w-6 shrink-0 ${accentText[course.accent]}`} />
                        <span className="flex-1 min-w-0 font-display font-bold">{course.title}</span>
                        <span className="w-32 sm:w-48 shrink-0">
                          <span className="block h-[3px] bg-secondary overflow-hidden" aria-hidden>
                            <span className={`block h-full ${accentBg[course.accent]}`} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                          </span>
                          <span className="mt-1 block font-mono text-[11px] text-muted-foreground text-right">
                            {done === total && total > 0 ? "Finished" : `${done}/${total} lessons`}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
