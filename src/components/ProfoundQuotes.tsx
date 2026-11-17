import { useEffect, useState } from "react";

interface QuoteItem {
  quote: string;
  author: string;
  source: string;
}

const quotes: QuoteItem[] = [
  {
    quote:
      "The best programs are written so that computing machines can perform them quickly and so that human beings can understand them clearly. A programmer is ideally an essayist who works with traditional aesthetic and literary forms as well as mathematical concepts, to communicate the way that an algorithm works and to convince a reader that the results will be correct.",
    author: "Donald E. Knuth",
    source: "Selected Papers on Computer Science",
  },
  {
    quote:
      "The most important property of a program is whether it accomplishes the intention of its user.",
    author: "C.A.R. Hoare",
    source: "Essays in Computing Science",
  },
  {
    quote:
      "If you aren't, at any given time, scandalized by code you wrote five or even three years ago, you're not learning anywhere near enough.",
    author: "Nick Black",
    source: "Axioms & Reflections",
  },
  {
    quote:
      "C is quirky, flawed, and an enormous success.",
    author: "Dennis M. Ritchie",
    source: "The Development of the C Language, 1993",
  },
  {
    quote:
      "What's in your hands I think and hope is intelligence: the ability to see the machine as more than when you were first led up to it that you can make it more.",
    author: "Alan J. Perlis",
    source: "SICP Foreword, 1984",
  },
  {
    quote:
      "All we have to do is to place a series of bytes in RAM that represent a series of things that we want to do, one after another.",
    author: "J. Clark Scott",
    source: "But How Do It Know? The Basic Principles of Computers for Everyone",
  },
];

export function ProfoundQuotes() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      // Fade out
      setFade(false);

      // Switch quote halfway through transition, then fade in
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % quotes.length);
        setFade(true);
      }, 600);
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const current = quotes[index];

  return (
    <section className="relative z-10 border-t border-border bg-black/20">
      <div className="container py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Quote side */}
          <div>
            <div className="eyebrow text-neon mb-6">Voices of the craft</div>
            <div className="min-h-[220px] md:min-h-[260px] flex items-center">
              <blockquote
                className={`font-body text-xl md:text-2xl lg:text-[1.65rem] italic leading-relaxed text-foreground/90 transition-opacity duration-700 ease-in-out ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              >
                &ldquo;{current.quote}&rdquo;
              </blockquote>
            </div>
          </div>

          {/* Square box side: Attribution */}
          <div className="relative aspect-square border border-border bg-muted/5 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 grid-noise opacity-20 pointer-events-none" aria-hidden />
            <div
              className={`relative z-10 text-center p-8 max-w-sm transition-opacity duration-700 ease-in-out ${
                fade ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Attribution
              </div>
              <div className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {current.author}
              </div>
              <div className="font-body text-sm md:text-base italic text-muted-foreground mt-3 leading-snug">
                {current.source}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
