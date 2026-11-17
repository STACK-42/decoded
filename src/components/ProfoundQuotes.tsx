import { useEffect, useState } from "react";

interface QuoteItem {
  quote: string;
  author: string;
  source: string;
  imageUrl?: string;
}

const quotes: QuoteItem[] = [
  {
    quote:
      "The best programs are written so that computing machines can perform them quickly and so that human beings can understand them clearly. A programmer is ideally an essayist who works with traditional aesthetic and literary forms as well as mathematical concepts, to communicate the way that an algorithm works and to convince a reader that the results will be correct.",
    author: "Donald E. Knuth",
    source: "Selected Papers on Computer Science",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Donald_Ervin_Knuth_%28cropped%29.jpg/330px-Donald_Ervin_Knuth_%28cropped%29.jpg",
  },
  {
    quote:
      "The most important property of a program is whether it accomplishes the intention of its user.",
    author: "C.A.R. Hoare",
    source: "Essays in Computing Science",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Sir_Tony_Hoare_IMG_5125.jpg/330px-Sir_Tony_Hoare_IMG_5125.jpg",
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
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Dennis_Ritchie_2011.jpg/330px-Dennis_Ritchie_2011.jpg",
  },
  {
    quote:
      "What's in your hands I think and hope is intelligence: the ability to see the machine as more than when you were first led up to it that you can make it more.",
    author: "Alan J. Perlis",
    source: "SICP Foreword, 1984",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/59/Alan_Perlis.jpg",
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
      setFade(false);
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

          {/* Square box side: Portrait or Typographic Attribution */}
          <div className="relative aspect-square border border-border bg-muted/5 flex items-center justify-center overflow-hidden group">
            <div className="absolute inset-0 grid-noise opacity-20 pointer-events-none z-10" aria-hidden />

            {current.imageUrl ? (
              <div
                className={`relative w-full h-full transition-opacity duration-700 ease-in-out ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={current.imageUrl}
                  alt={current.author}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover object-top grayscale contrast-125 brightness-90 transition duration-700 group-hover:grayscale-0"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-6 text-left z-20">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon mb-1">
                    Attribution
                  </div>
                  <div className="font-display text-xl md:text-2xl font-bold text-white tracking-tight">
                    {current.author}
                  </div>
                  <div className="font-body text-xs md:text-sm italic text-neutral-300 mt-1 line-clamp-1">
                    {current.source}
                  </div>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
