import { useEffect, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { ContinueLearning } from "@/components/ContinueLearning";
import { TrackPicker } from "@/components/TrackPicker";
import { courses } from "@/content/registry";
import { DecodeText } from "@/components/DecodeText";
import { CourseGlyph } from "@/components/brand/Glyphs";
import { HeroField } from "@/components/HeroField";

const accentText: Record<string, string> = {
  neon: "text-neon", orange: "text-orange", sky: "text-sky", violet: "text-violet", mint: "text-mint",
};

export default function Index() {
  useEffect(() => {
    document.title = "Decoded — Computer Science, In Depth and Connected";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* grid texture */}
      <div className="grid-noise pointer-events-none fixed inset-0 z-0" aria-hidden />

      <SiteHeader />

      {/* HERO */}
      <section className="relative z-10 overflow-hidden border-b border-border">
        <HeroField />
        <div className="container relative py-20 md:py-28">
          <div className="rise-in eyebrow text-neon mb-5">CS theory · In depth, connected</div>
          {/* Syne is very wide: three fixed lines, sized to the viewport so each fits on one line from md up */}
          <h1 className="rise-in font-display font-extrabold leading-[0.95] tracking-tight text-[clamp(2.5rem,5.4vw,4.5rem)]">
            <span className="block md:whitespace-nowrap">Computer science</span>
            <span className="block md:whitespace-nowrap">
              proofs, <span className="text-neon"><DecodeText text="decoded" /></span> to
            </span>
            <span className="block md:whitespace-nowrap">production tools</span>
          </h1>
          <p style={{ "--d": "120ms" } as CSSProperties} className="rise-in mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground italic font-body leading-relaxed">
            Every course in a CS degree is already inside something you use: the regex in your editor, the encryption in
            your browser, the pixels on your screen. Each lesson here starts with the idea and ends at the tool.
          </p>

          <ContinueLearning />

          <div style={{ "--d": "220ms" } as CSSProperties} className="rise-in mt-10 flex flex-wrap gap-3">
            <Link
              to="/courses/theory-of-computation"
              className="group inline-flex items-center gap-2 bg-neon text-background px-5 py-3 font-mono text-xs uppercase tracking-widest font-semibold hover:opacity-90 transition"
            >
              Start with Theory of Computation
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 border border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-foreground hover:border-foreground/40 transition"
            >
              Browse all tracks
            </Link>
          </div>

          {/* Track legend: one glyph and colour per course */}
          <ul style={{ "--d": "320ms" } as CSSProperties} className="rise-in mt-14 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[11px] text-muted-foreground tracking-widest uppercase">
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
        <div className="container py-16 md:py-20">
          <div className="max-w-3xl">
            <figure className="mb-10 max-w-2xl border-l-2 border-neon pl-5">
              <blockquote className="font-body text-xl italic leading-snug text-foreground/90">
                &ldquo;Computer science is not about computers in the same sense that physics is not really about particle accelerators.&rdquo;
              </blockquote>
              <figcaption className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Hal Abelson, <span className="normal-case italic">MIT Lecture 1A, 1986</span>
              </figcaption>
            </figure>

            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              The essence of the craft
            </h2>
            <div className="font-body text-lg leading-relaxed text-foreground/80 space-y-5">
              <p>
                It is easy to spend years in a CS degree memorizing proofs without realizing you are looking at the engine
                of a compiler, a database, or a network router. The laptop in front of you is just the instrument. The math
                is what makes it do anything useful.
              </p>
              <p className="font-mono text-base text-foreground/90">
                A regex engine is a state machine. A build tool is a topological sort. Git is a directed acyclic graph.
              </p>
              <p className="text-neon">
                Decoded cuts through the academic posturing. We explain why someone had to think of it in the first place,
                and point straight to the software you use every day that runs on it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COURSE GRID */}
      <section id="courses" className="relative z-10">
        <div className="container py-20">
          <div className="flex items-baseline justify-between mb-10 gap-4 flex-wrap">
            <div>
              <div className="eyebrow text-muted-foreground mb-2">Tracks</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">Choose where to start.</h2>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {courses.filter((c) => c.status === "available").length} of {courses.length} available
            </span>
          </div>

          <TrackPicker />
        </div>
      </section>

      {/* THE STORY */}
      <section className="relative z-10 border-t border-border bg-black/20">
        <div className="container py-24">
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
