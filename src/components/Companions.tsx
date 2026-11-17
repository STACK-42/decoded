import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { flattenLessons, getLesson, type Course } from "@/content/registry";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { useRegistration } from "@/hooks/useRegistration";
import { createInvite, removeCompanion, sinceLabel, useCompanions, type Companion, type InviteError } from "@/lib/companions";
import { copyLink, inviteShareUrl } from "@/lib/shareLinks";

const accentBg: Record<Course["accent"], string> = {
  neon: "bg-neon", orange: "bg-orange", sky: "bg-sky", violet: "bg-violet", mint: "bg-mint",
};

const INVITE_ERRORS: Record<InviteError, string> = {
  needs_profile: "Turn on a public profile first, so your companion sees who you are.",
  not_registered: "Register for this course first.",
  too_many: "You have 20 unused links already. Wait for some to be used or expire.",
  signed_out: "You've been signed out. Sign in again to make a link.",
  unavailable: "Couldn't reach Decoded's server. Check your connection and try again.",
};

function CompanionRow({ companion, course }: { companion: Companion; course: Course }) {
  const total = flattenLessons(course).length;
  const done = Math.min(companion.completed, total);
  const latest = companion.latest && getLesson(course.slug, companion.latest.lesson);

  const remove = async () => {
    if (!(await removeCompanion(course.slug, companion.handle))) toast.error("Couldn't remove them. Please try again.");
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
      <Link to={`/u/${companion.handle}`} className="flex items-center gap-3 min-w-0 flex-1 hover:text-neon">
        <Avatar className="h-9 w-9 border border-border">
          {companion.avatarUrl && <AvatarImage src={companion.avatarUrl} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback className="font-mono text-xs">{companion.handle.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block font-mono text-sm">@{companion.handle}</span>
          {latest && companion.latest && (
            <span className="block font-body text-xs italic text-muted-foreground truncate">
              Finished {latest.lesson.title} {sinceLabel(companion.latest.at)}
            </span>
          )}
        </span>
      </Link>
      <span className="w-40 shrink-0">
        <span className="block h-[3px] bg-secondary overflow-hidden" aria-hidden>
          <span className={`block h-full ${accentBg[course.accent]}`} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </span>
        <span className="mt-1 block font-mono text-[11px] text-muted-foreground text-right">
          {done === total && total > 0 ? "Finished" : `${done}/${total} lessons`}
        </span>
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button type="button" className="font-mono text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Remove
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop studying with @{companion.handle}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll stop seeing each other's progress in {course.title}. They won't be told.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function InviteButton({ course }: { course: Course }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<InviteError | null>(null);
  const [busy, setBusy] = useState(false);

  const make = async () => {
    setBusy(true);
    setError(null);
    const result = await createInvite(course.slug);
    setBusy(false);
    if ("error" in result) return setError(result.error);
    setLink(inviteShareUrl(result.token));
  };

  const copy = () => copyLink(link!);

  if (link) {
    return (
      <div className="space-y-2">
        <label htmlFor="invite-link" className="block font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Send this link to one person
        </label>
        <div className="flex gap-2">
          <input
            id="invite-link"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 border border-border bg-card px-3 py-2 font-mono text-xs"
          />
          <button type="button" onClick={copy} className="shrink-0 bg-foreground px-4 font-mono text-xs text-background hover:opacity-85">
            Copy
          </button>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">It works once, for 7 days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={make}
        disabled={busy}
        className="border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-widest hover:border-foreground disabled:opacity-50"
      >
        {busy ? "Making a link…" : "Study this with someone"}
      </button>
      {error && (
        <p role="alert" className="font-mono text-xs text-orange">
          {INVITE_ERRORS[error]}{" "}
          {error === "needs_profile" && (
            <Link to="/profile" className="underline underline-offset-4">
              Set up your profile
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

/** Companions on the course page: their progress, and a link to invite someone. */
export function CourseCompanions({ course }: { course: Course }) {
  const status = useAccountStatus();
  const { registered } = useRegistration(course.slug);
  const companions = useCompanions(course.slug);
  if (status !== "signed-in" || !registered) return null;

  return (
    <section aria-label="Study companions" className="mt-10 border-t border-border pt-8">
      <h2 className="font-display text-xl font-bold mb-1">Study companions</h2>
      <p className="font-body text-sm italic text-muted-foreground mb-4">
        You and your companions see each other's progress in this course, and nothing else.
      </p>
      {companions.length > 0 && (
        <ul className="divide-y divide-border border-y border-border mb-6">
          {companions.map((c) => (
            <CompanionRow key={c.handle} companion={c} course={course} />
          ))}
        </ul>
      )}
      <InviteButton course={course} />
    </section>
  );
}
