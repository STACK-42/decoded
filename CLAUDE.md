# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Decoded is a client-side educational site that maps abstract CS theory to the real tools it powers (e.g. finite automata → regex engines). It is content-first: courses and lessons are authored as MDX and rendered by a small React/Vite app. The site is static; the only backend is a small Cloudflare Worker in `worker/` for optional sign-in and saved progress.

## Commands

```bash
npm run dev          # Vite dev server on http://localhost:8080
npm run build        # production build
npm run build:dev    # build in development mode (unminified, source maps)
npm run lint         # eslint over the repo
npm run preview      # serve the production build
npm run test         # vitest run (one-shot)
npm run test:watch   # vitest in watch mode
```

`bun` works in place of `npm` for any of the above (the repo ships both `bun.lockb` and `package-lock.json`).

Run a single test file or pattern:
```bash
npx vitest run src/test/example.test.ts
npx vitest run -t "name of test"
```

## Architecture

### Content registry is the single source of truth
`src/content/registry.ts` defines the entire course catalog as a typed `courses: Course[]` array (`Course` → `Module[]` → `Lesson[]`). Each MDX lesson is a `lazy()` import declared at the top of this file and attached to its lesson as `Component`, so its chunk is only fetched when the lesson opens. Render it inside a `Suspense` boundary; `LessonPage` does, and tests use `src/test/renderLesson.tsx`. Helper functions (`getCourse`, `getLesson`, `lessonNeighbors`, `flattenLessons`) are how every page looks content up — pages never import MDX directly.

**To add a lesson:** create the `.mdx` file under `src/content/<course-slug>/NN-slug.mdx`, then declare it with `lesson(() => import(...))` in `registry.ts` and add a `{ slug, title, duration, Component }` entry to the right module. The `NN-` numeric prefix orders files on disk only; ordering at runtime comes from array position. Lesson `slug` must be kebab-case and is what appears in the URL.

A course with `status: "coming-soon"` typically has empty `modules: []` and is rendered as a teaser; `status: "available"` courses have real lessons.

### Routing and rendering flow
`src/App.tsx` wires global providers (React Query, `ThemeProvider`, tooltip, toasters) and four routes via React Router:
`/` (Index) → `/courses` (Courses) → `/courses/:courseSlug` (CoursePage) → `/courses/:courseSlug/:lessonSlug` (LessonPage).

`LessonPage` (itself lazily loaded) pulls the lesson from the registry, renders `<lesson.Component />` inside a Tailwind Typography `prose` article, and builds prev/next navigation from `lessonNeighbors`.

### MDX components are imported, not provided
MDX is compiled by `@mdx-js/rollup` (configured `enforce: "pre"` in `vite.config.ts`). Although `providerImportSource: "@mdx-js/react"` is set, **there is no `MDXProvider` wrapping the app** — custom components (`Callout`, `PracticalApplication`, `Pillar`, `ApplicationsGrid` in `src/components/mdx/MdxComponents.tsx`) must be explicitly `import`ed at the top of each `.mdx` file that uses them. Plain markdown elements get their styling from the `prose` classes, not from mapped components.

### Design tokens
Five brand accent colors — `neon`, `orange`, `sky`, `violet`, `mint` — are the only accents in use. They are defined as CSS variables (`src/index.css`), exposed as Tailwind colors (`tailwind.config.ts`), and referenced two ways: a course's `accent` field in the registry, and the `tone` prop on MDX components (which maps through `toneMap`). Use only these five. Fonts: Syne (`font-display`), IBM Plex Mono (`font-mono`), Lora (`font-body`), loaded via Google Fonts in `index.html`.

### Progress tracking
`localStorage` under `decoded:progress:v1` is the copy the UI reads, through `src/hooks/useProgress.ts`, for signed-in and signed-out visitors alike. It syncs across mounted components by dispatching/listening for a custom `decoded:progress` window event (plus the native `storage` event for cross-tab).

For signed-in users, `src/lib/progressSync.ts` keeps that copy in step with the account. A browser's first sign-in merges its progress into the account; after that the account wins on load, so a lesson unmarked on one device doesn't return from another. Unsent changes wait in `decoded:account:v1`.

Registering for a course (`src/hooks/useRegistration.ts`) is what shows the progress bar and details. Lessons stay readable without it. Someone counts as registered if the account has an enrollment or they've completed a lesson in that course, so older local progress keeps its bar; if the API is unreachable everyone counts as registered, which falls back to device-only progress. Leaving a course removes the enrollment and its progress.

### Paths and tools
`src/content/paths.ts` holds the suggested learning paths and course prerequisites (suggestions only; nothing is locked). `src/content/tools.ts` maps real tools to lessons for `/tools`. A test checks each linked lesson's source mentions what the entry claims, so update the entry if a lesson changes.

### Search
`src/components/SearchDialog.tsx` (header icon or Cmd/Ctrl+K) searches in the browser. Lesson titles come from the registry; headings and body text come from `dist/search-index.json`, which `scripts/og/generate.mjs` writes and the dialog fetches on first open. In `npm run dev` that file doesn't exist, so only titles match.

### API Worker
`worker/` is a separate npm project (Cloudflare Worker + D1) deployed to `https://decoded-api.stack42.tech` with `npx wrangler deploy`; pushing to GitHub doesn't deploy it. Schema changes go in `worker/migrations/` and are applied with `npm run migrate`. It has its own tests (`npm test` in `worker/`), which CI runs. OAuth credentials are Worker secrets (`wrangler secret put`), never committed. Accounts hold only the sign-in provider's user ID, plus an avatar URL and, for GitHub, a username (Google's name is left unread), and session tokens are stored hashed. Accounts aren't linked across providers.

## Conventions and gotchas

- **Deployment:** GitHub Pages (repo `STACK-42/decoded`) at the root domain `https://decoded.stack42.tech` (`base: "/"` in `vite.config.ts`, no `basename` on `BrowserRouter`). The custom domain is set in the repo's Pages settings, not by a `CNAME` file. The site URL is also hardcoded as `SITE` in `scripts/og/generate.mjs` and in the SEO block of `index.html`.
- **Social previews are generated at build time.** `npm run build` runs `vite build` then `scripts/og/generate.mjs`, which loads the registry via esbuild (MDX stubbed out) and writes `dist/og/<course>.png` (plus `home.png`, `courses.png`) with satori + resvg, and a `dist/<route>/index.html` for home, `/courses`, every course and every lesson with that page's title/description/OG tags. It rewrites the block between the `<!-- seo:start -->` / `<!-- seo:end -->` markers in `index.html`, so keep those markers. New courses and lessons get previews automatically.
- Brand assets: `BrandMark`/`BrandLockup` (`src/components/brand/BrandMark.tsx`), course and lesson-kind icons (`src/components/brand/Glyphs.tsx`, keyed by course slug), favicons in `public/`.
- Import from `src/` via the `@/*` alias (configured in both `vite.config.ts` and `vitest.config.ts`).
- `src/components/ui/**` is shadcn/ui (config in `components.json`, base color slate, no prefix). Treat these as generated primitives; project-specific UI lives in `src/components/` and `src/components/layout/`.
- TypeScript runs in loose mode (`tsconfig.app.json`) — `noImplicitAny`, `strictNullChecks`, and unused-var checks are off.
- Tests use Vitest + jsdom + Testing Library; `src/test/setup.ts` mocks `matchMedia`. Matched by `src/**/*.{test,spec}.{ts,tsx}`.
