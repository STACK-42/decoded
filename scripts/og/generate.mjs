// Build-time social previews. Runs after `vite build` (see package.json).
//
// For the home page, /courses, /tools, /team, /privacy, every course and every lesson it writes
// dist/<route>/index.html with that page's <title>, description, canonical
// URL and Open Graph / Twitter tags, so link unfurlers (which don't run JS)
// see the right card. It also renders a 1200×630 PNG per course plus one for
// home and /courses into dist/og/. Lessons reuse their course's image. Every
// route it writes also goes into dist/sitemap.xml.
//
// GitHub Pages serves dist/courses/<slug>/index.html for /courses/<slug>,
// and the SPA boots from it exactly as it does from the root index.html.

import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const SITE = "https://decoded.stack42.tech";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = path.join(ROOT, "dist");
const require = createRequire(import.meta.url);

const C = {
  bg: "#0A0A0F",
  card: "#13131F",
  border: "#1E1E2E",
  fg: "#EAEAF2",
  muted: "#85858F",
  soft: "#B9B9C6",
  neon: "#E8FF47",
  orange: "#FF6B35",
  sky: "#7EB8FF",
  violet: "#B47FFF",
  mint: "#47FFCC",
};

/* ---------- load the course registry and glyphs without compiling MDX ---------- */

async function loadSiteModules() {
  const out = await build({
    stdin: {
      contents: `
        export { courses, flattenLessons } from "@/content/registry";
        import { createElement } from "react";
        import { renderToStaticMarkup } from "react-dom/server";
        import { CourseGlyph } from "@/components/brand/Glyphs";
        export const glyphSvg = (slug) => renderToStaticMarkup(createElement(CourseGlyph, { slug, className: "" }));
      `,
      resolveDir: ROOT,
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    tsconfig: path.join(ROOT, "tsconfig.app.json"),
    jsx: "automatic",
    external: ["react", "react-dom"],
    logLevel: "silent",
    plugins: [
      {
        // Lessons are irrelevant here; stand each MDX file in with a null component.
        name: "stub-mdx",
        setup(b) {
          b.onResolve({ filter: /\.mdx$/ }, (a) => ({ path: a.path, namespace: "mdx-stub" }));
          b.onLoad({ filter: /.*/, namespace: "mdx-stub" }, () => ({ contents: "export default () => null;", loader: "js" }));
        },
      },
    ],
  });
  const file = path.join(ROOT, "node_modules/.cache/og-site.mjs");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, out.outputFiles[0].text);
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

/* ---------- tiny element helpers for satori (no JSX in a .mjs file) ---------- */

const h = (type, style, ...children) => ({ type, props: { style: { display: "flex", ...style }, children: children.flat() } });
const svgImg = (markup, size, style = {}) => ({
  type: "img",
  props: { src: `data:image/svg+xml;base64,${Buffer.from(markup).toString("base64")}`, width: size, height: size, style },
});

const MARK = (size) =>
  svgImg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="18" cy="36" r="14" fill="none" stroke="${C.fg}" stroke-width="8"/><rect x="38" y="20" width="32" height="32" fill="${C.neon}"/></svg>`,
    size,
  );

const ARROW = svgImg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${C.muted}" stroke-width="2"><path d="M4 12h15M14 7l5 5-5 5"/></svg>`,
  18,
);

function glyph(mod, slug, color, size) {
  const markup = mod.glyphSvg(slug)
    .replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    .replaceAll("currentColor", color);
  return svgImg(markup, size);
}

const mono = (size, color, extra = {}) => ({ fontFamily: "Plex Mono", fontSize: size, color, letterSpacing: size * 0.18, textTransform: "uppercase", ...extra });

function header() {
  return h(
    "div",
    { alignItems: "center", gap: 16 },
    MARK(40),
    h("div", { fontFamily: "Syne", fontWeight: 800, fontSize: 34, color: C.fg, letterSpacing: -1 }, "Decoded", h("span", { color: C.neon }, ".")),
    h("div", { ...mono(15, C.muted), alignItems: "center", gap: 10, marginLeft: 8 }, "CS", ARROW, "REAL WORLD"),
  );
}

function footer(mod, extraLeft) {
  return h(
    "div",
    { justifyContent: "space-between", alignItems: "center", width: "100%" },
    extraLeft ??
      h("div", { gap: 18, alignItems: "center" }, ...mod.courses.map((c) => glyph(mod, c.slug, C[c.accent], 30))),
    h("div", mono(16, C.muted, { letterSpacing: 2, textTransform: "none" }), "decoded.stack42.tech"),
  );
}

function frame(children, accent = C.neon) {
  return h(
    "div",
    {
      width: 1200,
      height: 630,
      backgroundColor: C.bg,
      backgroundImage: `linear-gradient(rgba(232,255,71,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232,255,71,0.05) 1px, transparent 1px)`,
      backgroundSize: "40px 40px",
      flexDirection: "column",
      position: "relative",
    },
    h("div", { flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 72px 52px" }, ...children),
    h("div", { height: 10, width: "100%", backgroundColor: accent }),
  );
}

function homeCard(mod) {
  return frame([
    header(),
    h(
      "div",
      { flexDirection: "column", gap: 22 },
      h("div", mono(18, C.neon), "CS theory · real-world tools"),
      h(
        "div",
        { flexDirection: "column", fontFamily: "Syne", fontWeight: 800, fontSize: 70, lineHeight: 1.0, color: C.fg, letterSpacing: -2.5 },
        h("div", {}, "Computer science proofs,"),
        h("div", { gap: 20 }, h("span", { color: C.neon }, "decoded"), h("span", {}, "to")),
        h("div", {}, "production tools."),
      ),
    ),
    footer(mod),
  ]);
}

function coursesCard(mod) {
  const available = mod.courses.filter((c) => c.status === "available").length;
  return frame([
    header(),
    h(
      "div",
      { flexDirection: "column", gap: 22 },
      h("div", mono(18, C.muted), `All tracks · ${available} of ${mod.courses.length} available`),
      h(
        "div",
        { flexDirection: "column", fontFamily: "Syne", fontWeight: 800, fontSize: 84, lineHeight: 1.0, color: C.fg, letterSpacing: -2.5 },
        h("div", {}, "Every CS course,"),
        h("div", {}, "decoded."),
      ),
    ),
    footer(mod),
  ]);
}

function courseCard(mod, course) {
  const accent = C[course.accent];
  const lessons = mod.flattenLessons(course).length;
  const status = course.status === "coming-soon" ? "Coming soon" : `${lessons} lesson${lessons === 1 ? "" : "s"}`;
  const titleSize = course.title.length > 24 ? 70 : 84;
  return frame(
    [
      header(),
      h(
        "div",
        { flexDirection: "column", gap: 22 },
        h(
          "div",
          { alignItems: "center", gap: 20 },
          glyph(mod, course.slug, accent, 52),
          h("div", mono(18, accent), `Course ${course.number}`),
          h("div", mono(18, C.muted), `· ${status}`),
        ),
        h("div", { fontFamily: "Syne", fontWeight: 800, fontSize: titleSize, lineHeight: 1.0, color: C.fg, letterSpacing: -2.5, maxWidth: 1000 }, course.title),
        h("div", { fontFamily: "Lora", fontStyle: "italic", fontSize: 30, lineHeight: 1.35, color: C.soft, maxWidth: 940 }, course.tagline.replace(/\.+$/, ".")),
      ),
      footer(mod, h("div", mono(16, C.muted), "Theory, mapped to the tools it powers")),
    ],
    accent,
  );
}

/* ---------- render ---------- */

async function loadFonts() {
  const f = (pkg, file) => readFile(require.resolve(`@fontsource/${pkg}/files/${file}`));
  return [
    { name: "Syne", data: await f("syne", "syne-latin-800-normal.woff"), weight: 800, style: "normal" },
    { name: "Plex Mono", data: await f("ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff"), weight: 500, style: "normal" },
    { name: "Lora", data: await f("lora", "lora-latin-400-italic.woff"), weight: 400, style: "italic" },
  ];
}

async function renderPng(tree, fonts, file) {
  const svg = await satori(tree, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, png);
}

/* ---------- per-route HTML ---------- */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s, n = 200) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

function seoBlock({ title, description, url, image }) {
  const t = esc(title);
  const d = esc(clip(description));
  return `<!-- seo:start (generated) -->
    <title>${t}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:site_name" content="Decoded" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${image}" />
    <!-- seo:end -->`;
}

const SEO_BLOCK = /<!-- seo:start[\s\S]*?<!-- seo:end -->/;

const routes = [];

async function writeRoute(template, route, meta) {
  // GitHub Pages redirects /route to /route/, so that's the address to advertise.
  const url = meta.url.endsWith("/") ? meta.url : `${meta.url}/`;
  routes.push(url);
  if (!SEO_BLOCK.test(template)) throw new Error("seo markers not found in dist/index.html");
  const html = template.replace(SEO_BLOCK, seoBlock({ ...meta, url }));
  const file = route === "/" ? path.join(DIST, "index.html") : path.join(DIST, route, "index.html");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

/* ---------- main ---------- */

const mod = await loadSiteModules();
const fonts = await loadFonts();
const template = await readFile(path.join(DIST, "index.html"), "utf8");
const img = (name) => `${SITE}/og/${name}.png`;

await renderPng(homeCard(mod), fonts, path.join(DIST, "og/home.png"));
await renderPng(coursesCard(mod), fonts, path.join(DIST, "og/courses.png"));

await writeRoute(template, "/", {
  title: "Decoded — CS Theory to Real-World Skills",
  description: "Computer science courses decoded into the practical skills engineers actually use. Bridge the gap between abstract theory and modern tools.",
  url: `${SITE}/`,
  image: img("home"),
});
await writeRoute(template, "/courses", {
  title: "All Tracks — Decoded",
  description: "Each track pairs the formal theoretical ideas with the modern tools and practices that are built on them.",
  url: `${SITE}/courses`,
  image: img("courses"),
});

await writeRoute(template, "/tools", {
  title: "Browse by Tool — Decoded",
  description: "Start from a tool you already use, like regex engines, hash maps or CPU caches, and go straight to the theory that explains it.",
  url: `${SITE}/tools`,
  image: img("courses"),
});
await writeRoute(template, "/team", {
  title: "Contributors — Decoded",
  description: "The people behind Decoded, mapping computer science theory to the real tools it powers.",
  url: `${SITE}/team`,
  image: img("home"),
});
await writeRoute(template, "/privacy", {
  title: "Privacy — Decoded",
  description: "What Decoded stores when you sign in, and how to delete it.",
  url: `${SITE}/privacy`,
  image: img("home"),
});

let pages = 5;
for (const course of mod.courses) {
  await renderPng(courseCard(mod, course), fonts, path.join(DIST, `og/${course.slug}.png`));
  await writeRoute(template, `/courses/${course.slug}`, {
    title: `${course.title} — Decoded`,
    description: course.description,
    url: `${SITE}/courses/${course.slug}`,
    image: img(course.slug),
  });
  pages++;
  for (const lesson of mod.flattenLessons(course)) {
    await writeRoute(template, `/courses/${course.slug}/${lesson.slug}`, {
      title: `${lesson.title} — ${course.title}`,
      description: `A ${lesson.duration} lesson from ${course.title} on Decoded. ${course.tagline}`,
      url: `${SITE}/courses/${course.slug}/${lesson.slug}`,
      image: img(course.slug),
    });
    pages++;
  }
}

/* ---------- search index, fetched by the search dialog when it first opens ---------- */

const SEARCH_TEXT_LIMIT = 6000;

/** course/lesson -> MDX file, read from registry.ts because the build stubs lessons out. */
async function lessonFiles() {
  const source = await readFile(path.join(ROOT, "src/content/registry.ts"), "utf8");
  const imports = new Map([...source.matchAll(/const (\w+) = lesson\(\(\) => import\("@\/([^"]+\.mdx)"\)\)/g)].map((m) => [m[1], m[2]]));
  return [...source.matchAll(/slug: "([a-z0-9-]+)"[^{}]*?Component: (\w+)/g)].map((m) => ({ slug: m[1], file: imports.get(m[2]) }));
}

function plainText(mdx) {
  return mdx
    .replace(/^(import|export) .*$/gm, " ")
    .replace(/^# .*$/gm, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`|>{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const files = await lessonFiles();
const searchIndex = [];
for (const course of mod.courses) {
  for (const lesson of mod.flattenLessons(course)) {
    const match = files.find((f) => f.slug === lesson.slug && f.file?.includes(`/${course.slug}/`)) ?? files.find((f) => f.slug === lesson.slug && f.file);
    if (!match) throw new Error(`no MDX file found for ${course.slug}/${lesson.slug}`);
    const mdx = await readFile(path.join(ROOT, "src", match.file), "utf8");
    const headings = [...mdx.matchAll(/^#{2,3} (.+)$/gm)].map((m) => plainText(m[1]));
    searchIndex.push({ course: course.slug, lesson: lesson.slug, headings, text: plainText(mdx).slice(0, SEARCH_TEXT_LIMIT) });
  }
}
await writeFile(path.join(DIST, "search-index.json"), JSON.stringify(searchIndex));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((url) => `  <url><loc>${esc(url)}</loc></url>`).join("\n")}
</urlset>
`;
await writeFile(path.join(DIST, "sitemap.xml"), sitemap);

console.log(`og: ${mod.courses.length + 2} images, ${pages} pages`);
