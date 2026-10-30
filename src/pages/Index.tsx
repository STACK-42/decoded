import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { ContinueLearning } from "@/components/ContinueLearning";
import CourseCard from "@/components/CourseCard";
import { courses } from "@/content/registry";
import { CourseGlyph } from "@/components/brand/Glyphs";

const accentText: Record<string, string> = {
  neon: "text-neon", orange: "text-orange", sky: "text-sky", violet: "text-violet", mint: "text-mint",
};

export default function Index() {
  useEffect(() => {
    document.title = "Decoded — CS Theory to Real-World Skills";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* grid texture */}
      <div className="grid-noise pointer-events-none fixed inset-0 z-0" aria-hidden />

      <SiteHeader />

      {/* HERO */}
      <section className="relative z-10 border-b border-border">
        <div className="container py-20 md:py-28 max-w-6xl">
          <div className="eyebrow text-neon mb-5">CS Theory · Real-world skills mapped</div>
          {/* Syne is very wide: three fixed lines, sized to the viewport so each fits on one line from md up */}
          <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-[clamp(2.5rem,5.4vw,4.5rem)]">
            <span className="block md:whitespace-nowrap">Computer science</span>
            <span className="block md:whitespace-nowrap">
              proofs, <span className="text-neon">decoded</span> to
            </span>
            <span className="block md:whitespace-nowrap">production tools</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground italic font-body leading-relaxed">
            Every course in a CS curriculum maps to something practical, used daily, with applications everywhere. It just has to be mapped.
            This is the layer that connects the theory with what's out there.
          </p>

          <ContinueLearning />

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/courses/theory-of-computation"
              className="inline-flex items-center gap-2 bg-neon text-background px-5 py-3 font-mono text-xs uppercase tracking-widest font-semibold hover:opacity-90 transition"
            >
              Start with Theory of Computation
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 border border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-foreground hover:border-foreground/40 transition"
            >
              Browse all tracks
            </Link>
          </div>

          {/* Track legend: one glyph and colour per course */}
          <ul className="mt-14 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[11px] text-muted-foreground tracking-widest uppercase">
            {courses.map((c) => (
              <li key={c.slug} className={`inline-flex items-center gap-2 ${c.status === "coming-soon" ? "opacity-50" : ""}`}>
                <CourseGlyph slug={c.slug} className={`h-4 w-4 ${accentText[c.accent]}`} />
                {c.title}
                {c.status === "coming-soon" && <span className="normal-case tracking-normal">(soon)</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* INTRO TEXT */}
      <section className="relative z-10 border-b border-border">
        <div className="container py-16 md:py-20 max-w-3xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Theory vs. Tools
          </h2>
          <div className="font-body text-lg leading-relaxed text-foreground/80 space-y-5">
            <p>
              University courses hide the tools engineers use every day behind dense proofs, heavy notation
              and theorems. You shouldn't have to decode your own syllabus just to find out what it's really
              about or where it shows up in production. Decoded pulls out the real-world use hiding inside
              your coursework.
            </p>
            <p className="text-neon">
              One topic at a time.
            </p>
          </div>
        </div>
      </section>

      {/* COURSE GRID */}
      <section id="courses" className="relative z-10">
        <div className="container py-20 max-w-5xl">
          <div className="flex items-baseline justify-between mb-10 gap-4 flex-wrap">
            <div>
              <div className="eyebrow text-muted-foreground mb-2">Tracks</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">Choose where to start.</h2>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {courses.filter((c) => c.status === "available").length} of {courses.length} available
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((c) => (
              <CourseCard key={c.slug} slug={c.slug} />
            ))}
          </div>
        </div>
      </section>

      {/* THE STORY */}
      <section className="relative z-10 border-t border-border bg-black/20">
        <div className="container py-24 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="eyebrow text-neon mb-4">Our Origin</div>
              <h2 className="font-display text-4xl font-bold leading-tight mb-6">
                Born from the frustration of "Magic Boxes"
              </h2>
              <div className="font-body text-lg text-foreground/70 space-y-4">
                <p>
                  Computer science education is good at what it's supposed to do. But students are left to
                  connect each course to practice on their own, memorizing abstract proofs without ever
                  seeing the tools built on them.
                </p>
                <p>
                  Here you don't only learn the concepts. You learn how computing itself works, and how
                  its pieces talk to each other.
                </p>
              </div>
            </div>
            <div className="relative aspect-square border border-border bg-muted/5 flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 grid-noise opacity-20" />
               <div className="relative z-10 text-center p-8">
                 <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Core Philosophy</div>
                 <div className="font-display text-2xl italic leading-relaxed">
                   "Theory without tools is boring. Tools without theory are fragile."
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
