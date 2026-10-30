import type { Author } from "@/content/authors";

export function CourseAuthors({ authors }: { authors: Author[] }) {
  return (
    <div className="mt-8">
      <div className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-3">
        Authored by
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {authors.map((author) => (
          <li key={author.href}>
            <a
              href={author.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3"
            >
              <img
                width={40}
                height={40}
                loading="lazy"
                src={author.image}
                alt=""
                className="h-10 w-10 rounded-full border border-border object-cover grayscale group-hover:grayscale-0 transition-all"
              />
              <span className="font-display font-bold group-hover:underline">{author.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
