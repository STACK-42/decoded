/* Link previews: when a lesson links to another lesson, hovering the link shows
   the paragraph that defines what it points at, read straight from that lesson's
   MDX source. Everything here is plain string work, so it's easy to test. */

export type Excerpt = {
  /** The word or phrase being defined: a bold term that matched the link, else the section heading. */
  headword: string;
  /** The section heading the link points into, if any. */
  heading?: string;
  /** Markdown subset: **bold**, *italic*, `code`, $math$, $$display math$$ and [links](...). */
  text: string;
};

/** Heading ids the way rehype-slug (github-slugger) makes them, for the ASCII headings lessons use. */
export function headingId(text: string) {
  return plainText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/ /g, "-");
}

/** "src/content/<course>/m1-02-<slug>.mdx" → "<course>/<slug>" */
export function lessonKeyFromPath(file: string) {
  const m = file.match(/content\/([^/]+)\/(?:m\d+-)?\d+-([^/]+)\.mdx$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** Markdown down to the words a reader sees. */
function plainText(md: string) {
  return md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

type Block = { text: string; display?: boolean; item?: boolean };
type Section = { level: number; heading: string; id: string; blocks: Block[] };

/** Splits a lesson into sections of prose blocks, skipping code, JSX, tables and imports. */
export function parseSections(source: string): Section[] {
  const sections: Section[] = [{ level: 0, heading: "", id: "", blocks: [] }];
  const seen = new Map<string, number>();
  const lines = source.split("\n");
  let para: string[] = [];
  let i = 0;

  const flush = () => {
    const text = para.join(" ").trim();
    para = [];
    if (text) sections[sections.length - 1].blocks.push({ text });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      // fenced code: skip to the closing fence
      flush();
      const fence = trimmed.slice(0, 3);
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) i++;
      i++;
      continue;
    }
    if (trimmed === "$$") {
      // display math: kept, attached after the paragraph that introduces it
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "$$") body.push(lines[i++]);
      i++;
      sections[sections.length - 1].blocks.push({ text: body.join("\n"), display: true });
      continue;
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      // ids repeat like github-slugger's: "x", "x-1", "x-2"
      const base = headingId(heading[2]);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      sections.push({ level: heading[1].length, heading: plainText(heading[2]), id: n ? `${base}-${n}` : base, blocks: [] });
      i++;
      continue;
    }
    if (!trimmed) {
      flush();
    } else if (/^(import |export |<|\||>)/.test(trimmed) || /^[-*_]{3,}$/.test(trimmed)) {
      // imports, JSX components, tables, blockquotes and rules aren't prose
      flush();
    } else if (/^([-*+]|\d+\.)\s+/.test(trimmed)) {
      // each list item is a candidate on its own: lists often hold one definition per line
      flush();
      sections[sections.length - 1].blocks.push({ text: trimmed.replace(/^([-*+]|\d+\.)\s+/, ""), item: true });
    } else {
      para.push(trimmed);
    }
    i++;
  }
  flush();
  return sections;
}

const norm = (s: string) => plainText(s).toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/s\b/g, "").trim();

/** Bold terms in a block: **dot product** → "dot product". */
const boldTerms = (text: string) => [...text.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]);

/**
 * The paragraph a link should preview. `section` is the #fragment, if any, and
 * `term` the link's own words. Within the section (or the lesson's opening,
 * without a fragment), a paragraph that defines the term in bold wins; then one
 * that mentions it; then the first paragraph.
 */
export function extractPreview(source: string, section?: string, term?: string): Excerpt | null {
  const sections = parseSections(source);
  let range: Section[];
  if (section) {
    const start = sections.findIndex((s) => s.id === section);
    if (start < 0) return null;
    const level = sections[start].level;
    const end = sections.findIndex((s, k) => k > start && s.level <= level);
    range = sections.slice(start, end < 0 ? undefined : end);
  } else {
    // No section named: the section that defines the term in bold, anywhere in the
    // lesson, else the lesson's opening (the text under its # title)
    const t = term ? norm(term) : "";
    const defining =
      sections.find((s) => s.level > 1 && s.blocks.some((b) => boldTerms(b.text).some((w) => !!t && norm(w) === t))) ??
      sections.find((s) => s.level > 1 && s.blocks.some((b) => boldTerms(b.text).some((w) => !!t && norm(w).startsWith(t))));
    const title = sections.findIndex((s) => s.level === 1);
    range = defining ? [defining] : title >= 0 ? [sections[title]] : sections.slice(0, 1);
  }

  const blocks = range.flatMap((s) => s.blocks);
  const prose = blocks.map((b, k) => ({ b, k })).filter(({ b }) => !b.display);
  if (!prose.length) return null;

  const t = term ? norm(term) : "";
  const heading = range[0].level > 1 ? range[0].heading : undefined;
  const close = (w: string) => !!t && (norm(w).startsWith(t) || t.startsWith(norm(w)));
  const exactly = (b: Block) => boldTerms(b.text).find((w) => !!t && norm(w) === t);
  const roughly = (b: Block) => boldTerms(b.text).find(close);
  const pick =
    (t && prose.find(({ b }) => exactly(b))) ||
    // a section named after the term opens with its definition
    (t && heading && close(heading.replace(/^the /i, "")) && prose[0]) ||
    (t && prose.find(({ b }) => roughly(b))) ||
    (t && prose.find(({ b }) => norm(b.text).includes(t))) ||
    prose[0];

  // A paragraph that doesn't finish its sentence (ending in a colon, or in "with")
  // introduces what follows: bring along the formula, or the list items.
  let text = pick.b.text;
  const unfinished = !/[.!?)]\s*$/.test(text);
  const after = blocks.slice(pick.k + 1);
  if (unfinished && after[0]?.display) {
    text = `${text}\n\n$$${after[0].text}$$`;
  } else if (unfinished && after[0]?.item) {
    const end = after.findIndex((b) => !b.item);
    const items = after.slice(0, end < 0 ? after.length : end).slice(0, 4);
    text = `${text}\n${items.map((b) => `- ${b.text}`).join("\n")}`;
  } else if (/:\s*$/.test(text)) {
    text = text.replace(/:\s*$/, ".");
  }

  const headword = exactly(pick.b) ?? roughly(pick.b) ?? heading ?? "";
  return { headword, heading, text: trimToLength(text, 420) };
}

/** Cuts long prose at a sentence end, never inside math. */
function trimToLength(text: string, max: number) {
  if (text.length <= max || text.includes("$$") || text.includes("\n- ")) return text;
  const sentences = text.match(/[^.!?]+(?:[.!?](?!\d)|$)+(\s+|$)/g) ?? [text];
  let out = "";
  for (const s of sentences) {
    if (out && (out + s).length > max) break;
    out += s;
  }
  // don't leave an inline $...$ open
  return (out.split("$").length - 1) % 2 ? text : out.trim();
}
