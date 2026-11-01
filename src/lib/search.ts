import { courses, flattenLessons } from "@/content/registry";

/** One lesson's searchable text, from the search-index.json the build writes. */
export type IndexEntry = { course: string; lesson: string; headings: string[]; text: string };

export type SearchDoc = {
  course: string;
  lesson: string;
  courseTitle: string;
  title: string;
  headings: string[];
  text: string;
};

export type SearchResult = { doc: SearchDoc; snippet: string | null };

/** Every available lesson, with body text where the index has it. Titles work without the index. */
export function buildDocs(index: IndexEntry[] = []): SearchDoc[] {
  const byLesson = new Map(index.map((e) => [`${e.course}/${e.lesson}`, e]));
  return courses
    .filter((c) => c.status === "available")
    .flatMap((c) =>
      flattenLessons(c).map((l) => {
        const entry = byLesson.get(`${c.slug}/${l.slug}`);
        return {
          course: c.slug,
          lesson: l.slug,
          courseTitle: c.title,
          title: l.title,
          headings: entry?.headings ?? [],
          text: entry?.text ?? "",
        };
      }),
    );
}

function snippetAround(text: string, term: string): string | null {
  const at = text.toLowerCase().indexOf(term);
  if (at === -1) return null;
  const start = Math.max(0, at - 50);
  const end = Math.min(text.length, at + term.length + 90);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/** Every word must appear somewhere in a lesson; title matches rank above headings, then body text. */
export function searchLessons(query: string, docs: SearchDoc[], limit = 20): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored: { result: SearchResult; score: number }[] = [];
  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const courseTitle = doc.courseTitle.toLowerCase();
    const headings = doc.headings.join(" ").toLowerCase();
    const text = doc.text.toLowerCase();

    let score = 0;
    let everyTerm = true;
    for (const term of terms) {
      let termScore = 0;
      if (title.includes(term)) termScore += title.startsWith(term) ? 12 : 10;
      if (headings.includes(term)) termScore += 5;
      if (courseTitle.includes(term)) termScore += 2;
      if (text.includes(term)) termScore += 1;
      if (termScore === 0) {
        everyTerm = false;
        break;
      }
      score += termScore;
    }
    if (!everyTerm) continue;

    const inBody = terms.find((t) => !title.includes(t) && text.includes(t)) ?? terms[0];
    scored.push({ result: { doc, snippet: snippetAround(doc.text, inBody) }, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.result);
}
