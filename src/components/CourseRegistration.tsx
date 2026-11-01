import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { SignInDialog } from "@/components/AccountButton";
import { ProgressBackup } from "@/components/ProgressBackup";
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
import type { Course } from "@/content/registry";
import { flattenLessons, getCourse } from "@/content/registry";
import { prerequisites } from "@/content/paths";
import { useProgress } from "@/hooks/useProgress";
import { useRegistration } from "@/hooks/useRegistration";
import { leaveCourse, registerForCourse } from "@/lib/progressSync";

const accentBg: Record<string, string> = {
  neon: "bg-neon", orange: "bg-orange", sky: "bg-sky", violet: "bg-violet", mint: "bg-mint",
};

const REGISTER_PARAM = "register";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</dt>
      <dd className="font-mono text-sm">{children}</dd>
    </div>
  );
}

function RegisterPrompt({ course }: { course: Course }) {
  const { status } = useRegistration(course.slug);
  const [busy, setBusy] = useState(false);

  const register = async () => {
    setBusy(true);
    try {
      await registerForCourse(course.slug);
      toast.success(`You're registered for ${course.title}`);
    } catch {
      toast.error("Couldn't register you", { description: "Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  // Coming back from sign-in with the intent to register: finish the job once.
  useEffect(() => {
    if (status !== "signed-in") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(REGISTER_PARAM)) return;
    url.searchParams.delete(REGISTER_PARAM);
    window.history.replaceState(null, "", url);
    void register();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const button = (
    <button
      type="button"
      disabled={busy}
      onClick={status === "signed-in" ? register : undefined}
      className="bg-neon px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-background transition-opacity hover:opacity-85 disabled:opacity-50"
    >
      {busy ? "Registering…" : "Register for this course"}
    </button>
  );

  if (status === "unknown") return null;

  return (
    <div className="mt-8 flex flex-col gap-3 items-start">
      {status === "signed-in" ? (
        button
      ) : (
        <SignInDialog
          trigger={button}
          title={`Register for ${course.title}`}
          returnTo={`${window.location.pathname}?${REGISTER_PARAM}=1`}
        />
      )}
      <p className="font-body italic text-sm text-muted-foreground">
        Free. Track your progress and pick up where you left off. The lessons are open either way.
      </p>
    </div>
  );
}

function LeaveCourse({ course }: { course: Course }) {
  const leave = async () => {
    try {
      await leaveCourse(course.slug);
      toast.success(`You've left ${course.title}`);
    } catch {
      toast.error("Couldn't leave the course", { description: "Check your connection and try again." });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
        Leave course
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {course.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes your registration and clears your progress in this course. The lessons stay open, and you can register again any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay registered</AlertDialogCancel>
          <AlertDialogAction onClick={leave}>Leave course</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CourseProgress({ course }: { course: Course }) {
  const { completed, isComplete, reset } = useProgress(course.slug);
  const { registeredAt } = useRegistration(course.slug);
  const lessons = flattenLessons(course);
  const total = lessons.length;
  const done = lessons.filter((l) => completed.includes(l.slug)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const next = lessons.find((l) => !isComplete(l.slug));

  return (
    <div className="mt-8 max-w-md">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-2">
        <span>Your progress</span>
        <span>
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-1 w-full bg-secondary overflow-hidden">
        <div className={`h-full ${accentBg[course.accent]} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4">
        {registeredAt !== null && (
          <Detail label="Registered">
            {new Date(registeredAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </Detail>
        )}
        <Detail label="Lessons left">{total - done}</Detail>
        <div className="col-span-2">
          <Detail label={next ? "Up next" : "Status"}>
            {next ? (
              <Link to={`/courses/${course.slug}/${next.slug}`} className="underline underline-offset-4 hover:text-foreground">
                {next.title} →
              </Link>
            ) : (
              "Course complete"
            )}
          </Detail>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <ProgressBackup />
        {done > 0 && (
          <button
            onClick={() => {
              if (confirm("Reset progress for this course?")) reset();
            }}
            className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
          >
            Reset progress
          </button>
        )}
        {registeredAt !== null && <LeaveCourse course={course} />}
      </div>
    </div>
  );
}

/** Before registering: the call to register. After: the progress bar and details. */
export function CourseRegistration({ course }: { course: Course }) {
  const { registered } = useRegistration(course.slug);
  return registered ? <CourseProgress course={course} /> : <RegisterPrompt course={course} />;
}

/** What helps to read first. Only a suggestion: every course stays open. */
export function CoursePrerequisites({ courseSlug }: { courseSlug: string }) {
  const required = prerequisites[courseSlug];
  if (!required) return null;
  return (
    <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
      Helps to know first:{" "}
      {required.map((slug, i) => (
        <span key={slug}>
          {i > 0 && " · "}
          <Link to={`/courses/${slug}`} className="underline underline-offset-4 hover:text-foreground">
            {getCourse(slug)?.title}
          </Link>
        </span>
      ))}
    </p>
  );
}
