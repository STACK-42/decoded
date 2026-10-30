import { useEffect } from "react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { ahmedAlghali, asmaaFarouq } from "@/content/authors";

export default function Team() {
  useEffect(() => {
    document.title = "Contributors — Decoded";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* grid texture */}
      <div className="grid-noise pointer-events-none fixed inset-0 z-0" aria-hidden />

      <SiteHeader />

      <main className="flex-1 relative z-10">
        <div className="container py-20 md:py-28 max-w-5xl">
          <div className="text-center mb-16">
            <div className="eyebrow text-muted-foreground mb-3">The People</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold">Contributors</h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            <CreatorCard
              name={ahmedAlghali.name}
              role="Maintainer"
              bio="I love when I finally understand what a theoretical CS course talks about"
              image={ahmedAlghali.image}
            />
            <CreatorCard
              name={asmaaFarouq.name}
              role="Course Author"
              image={asmaaFarouq.image}
              href={asmaaFarouq.href}
            />
            <div className="border border-dashed border-border p-6 bg-muted/5">
              <div className="font-display font-bold text-lg mb-2">Join in</div>
              <p className="text-sm text-muted-foreground leading-relaxed font-body mb-4">
                Decoded is open source. Add a course from your class notes, or pick up something smaller.
              </p>
              <div className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-widest">
                <a href="https://github.com/STACK-42/decoded/blob/main/docs/building-a-course.md" target="_blank" rel="noopener noreferrer" className="text-neon hover:underline underline-offset-4">Build a course →</a>
                <a href="https://github.com/STACK-42/decoded/issues" target="_blank" rel="noopener noreferrer" className="text-neon hover:underline underline-offset-4">See open issues →</a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function CreatorCard({ name, role, bio, image, href }: { name: string; role: string; bio?: string; image: string; href?: string }) {
  const Wrapper: React.ElementType = href ? "a" : "div";
  const linkProps = href ? { href, target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <Wrapper {...linkProps} className="group block border border-border bg-muted/5 p-6 hover:border-neon/40 transition-colors">
      <div className="flex items-center gap-4 mb-4">
        <img
          width={56}
          height={56}
          loading="lazy"
          src={image}
          alt={name}
          className="h-14 w-14 rounded-full border border-border object-cover grayscale group-hover:grayscale-0 transition-all"
        />
        <div>
          <div className="font-display font-bold text-lg">{name}</div>
          <div className="font-mono text-[10px] text-neon uppercase tracking-widest">{role}</div>
        </div>
      </div>
      {bio && (
        <p className="text-sm text-muted-foreground leading-relaxed font-body italic">
          "{bio}"
        </p>
      )}
    </Wrapper>
  );
}
