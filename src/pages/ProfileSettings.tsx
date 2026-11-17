import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { SignInDialog } from "@/components/AccountButton";
import { Switch } from "@/components/ui/switch";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { fetchOwnProfile, handleHint, saveOwnProfile, type OwnProfile, type SaveError } from "@/lib/profiles";
import { copyLink, profileShareUrl } from "@/lib/shareLinks";

const ERRORS: Record<SaveError, string> = {
  invalid: "That handle isn't valid. Use 3 to 20 lowercase letters, digits or _.",
  not_allowed: "That handle isn't allowed. Please pick another.",
  taken: "Someone already has that handle.",
  signed_out: "You've been signed out. Sign in again to save.",
  unavailable: "Couldn't reach Decoded's server. Check your connection and try again.",
};

export default function ProfileSettings() {
  const status = useAccountStatus();
  const [saved, setSaved] = useState<OwnProfile | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [handle, setHandle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    document.title = "Your profile — Decoded";
  }, []);

  useEffect(() => {
    if (status !== "signed-in") return;
    fetchOwnProfile().then((profile) => {
      setSaved(profile);
      setLoaded(true);
      if (profile) {
        setHandle(profile.handle);
        setIsPublic(profile.public);
      }
    });
  }, [status]);

  const hint = handle ? handleHint(handle) : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (hint || !handle) return;
    setSaving(true);
    setError(null);
    const result = await saveOwnProfile(handle, isPublic);
    setSaving(false);
    if ("error" in result) return setError(ERRORS[result.error]);
    setSaved(result.profile);
    setJustSaved(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-14 md:py-20 max-w-2xl">
          <div className="eyebrow text-muted-foreground mb-3">Your profile</div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight mb-4">Show up for other learners</h1>
          <p className="font-body text-lg italic text-muted-foreground mb-10">
            A public profile shows your handle, your picture and the courses you're taking with your progress. Your quiz
            scores stay private. It's off until you turn it on.
          </p>

          {status === "signed-out" && (
            <SignInDialog
              title="Sign in to make a profile"
              trigger={
                <button type="button" className="bg-neon px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-background hover:opacity-90">
                  Sign in
                </button>
              }
            />
          )}
          {status === "unavailable" && <p className="font-mono text-sm text-muted-foreground">{ERRORS.unavailable}</p>}

          {status === "signed-in" && loaded && saved === undefined && (
            <p className="font-mono text-sm text-muted-foreground">{ERRORS.unavailable}</p>
          )}

          {status === "signed-in" && loaded && saved !== undefined && (
            <form onSubmit={submit} className="space-y-8">
              {saved?.hidden && (
                <p role="status" className="border border-orange/50 bg-orange/10 p-4 font-body text-sm">
                  Your profile was hidden after a report, so nobody else can see it right now. Changing your handle won't
                  bring it back. Contact the Decoded team if you think this is a mistake.
                </p>
              )}

              <div>
                <label htmlFor="handle" className="block font-mono text-xs uppercase tracking-widest mb-2">
                  Handle
                </label>
                <div className="flex items-center border border-border bg-card focus-within:border-foreground">
                  <span className="pl-3 font-mono text-muted-foreground" aria-hidden>
                    @
                  </span>
                  <input
                    id="handle"
                    value={handle}
                    onChange={(e) => {
                      setHandle(e.target.value.toLowerCase());
                      setJustSaved(false);
                    }}
                    maxLength={20}
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="handle-hint"
                    aria-invalid={Boolean(hint)}
                    className="w-full bg-transparent px-1.5 py-3 font-mono outline-none"
                  />
                </div>
                <p id="handle-hint" className={`mt-2 font-mono text-xs ${hint ? "text-orange" : "text-muted-foreground"}`}>
                  {hint ?? "3 to 20 lowercase letters, digits or _. This is how people find you."}
                </p>
              </div>

              <div className="flex items-start justify-between gap-6 border-t border-border pt-6">
                <div>
                  <label htmlFor="public" className="block font-display text-lg font-bold">
                    Public profile
                  </label>
                  <p className="font-body text-sm text-muted-foreground">
                    When it's off, your page and search results disappear, but your handle stays yours.
                  </p>
                </div>
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={(on) => {
                    setIsPublic(on);
                    setJustSaved(false);
                  }}
                />
              </div>

              {error && (
                <p role="alert" className="font-mono text-sm text-orange">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={saving || Boolean(hint) || !handle}
                  className="bg-neon px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-background hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                {justSaved && <span role="status" className="font-mono text-xs text-mint">Saved.</span>}
                {saved?.public && !saved.hidden && (
                  <>
                    <Link to={`/u/${saved.handle}`} className="font-mono text-xs underline underline-offset-4 hover:text-neon">
                      View your public page
                    </Link>
                    <button
                      type="button"
                      onClick={() => copyLink(profileShareUrl(saved.handle))}
                      className="font-mono text-xs underline underline-offset-4 hover:text-neon"
                    >
                      Copy link to share
                    </button>
                  </>
                )}
                <Link to="/people" className="font-mono text-xs underline underline-offset-4 hover:text-neon">
                  Find people
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
