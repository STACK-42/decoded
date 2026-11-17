/* Links people paste into chats: decoded-go.stack42.tech/u/<handle> and
   /invite/<token>. Link previews don't run JavaScript, and GitHub Pages
   serves the same tags for every profile and invite, so these pages carry
   their own preview tags and send people on to the real page on the site.

   They forward with a meta refresh rather than an HTTP redirect: many
   crawlers follow redirects and would read the site's generic tags instead. */

import { findInvite } from "./companions";
import type { Env } from "./index";

type Courses = Record<string, { title: string; available: boolean }>;

let courses: { at: number; data: Courses } | null = null;
const COURSES_TTL = 60 * 60 * 1000;

/** Course titles, from the og/courses.json the site's build writes. */
async function courseTitles(env: Env): Promise<Courses> {
  if (courses && Date.now() - courses.at < COURSES_TTL) return courses.data;
  try {
    const response = await fetch(`${env.SITE_ORIGIN}/og/courses.json`);
    if (response.ok) courses = { at: Date.now(), data: await response.json() };
  } catch {
    // keep whatever we had; a preview without course names still works
  }
  return courses?.data ?? {};
}

/** Test hook: forget the cached course titles. */
export function resetShareCacheForTests() {
  courses = null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Preview = {
  title: string;
  description: string;
  /** the address that was shared, so a crawler that re-reads og:url gets this page again */
  url: string;
  /** where people are sent */
  target: string;
  image: string;
  /** a square picture (a profile photo) rather than a 1200×630 card */
  square?: boolean;
  noindex?: boolean;
};

function page(p: Preview, cache: string): Response {
  const t = esc(p.title);
  const d = esc(p.description);
  const target = esc(p.target);
  const size = p.square ? "" : `\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">${p.noindex ? '\n<meta name="robots" content="noindex">' : ""}
<meta property="og:site_name" content="Decoded">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(p.url)}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${esc(p.image)}">${size}
<meta name="twitter:card" content="${p.square ? "summary" : "summary_large_image"}">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${esc(p.image)}">
<meta http-equiv="refresh" content="0;url=${target}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0f;color:#eaeaf2;font:16px/1.5 system-ui,sans-serif}a{color:#e8ff47}</style>
</head>
<body>
<p>Opening <a href="${target}">${t}</a> on Decoded…</p>
<script>location.replace(${JSON.stringify(p.target).replace(/</g, "\\u003c")})</script>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": cache } });
}

/** "Logic Design", "Logic Design and Data Structures", "Logic Design, Data Structures and 2 more" */
function listCourses(titles: string[]): string {
  if (titles.length <= 2) return titles.join(" and ");
  return `${titles.slice(0, 2).join(", ")} and ${titles.length - 2} more`;
}

async function profilePreview(env: Env, shareOrigin: string, handle: string): Promise<Response> {
  const url = `${shareOrigin}/u/${handle}`;
  const target = `${env.SITE_ORIGIN}/u/${handle}`;
  const row = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/.test(handle)
    ? await env.DB.prepare(
        `SELECT p.user_id AS userId, u.avatar_url AS avatarUrl FROM profiles p JOIN users u ON u.id = p.user_id
           WHERE p.handle = ? AND p.public = 1 AND p.hidden = 0`,
      )
        .bind(handle)
        .first<{ userId: string; avatarUrl: string | null }>()
    : null;
  if (!row) {
    return page(
      { title: "Decoded", description: "Computer science theory, mapped to the tools it powers.", url, target, image: `${env.SITE_ORIGIN}/og/home.png` },
      "public, max-age=300",
    );
  }

  const { results } = await env.DB.prepare(
    "SELECT course FROM enrollments WHERE user_id = ?1 UNION SELECT course FROM progress WHERE user_id = ?1",
  )
    .bind(row.userId)
    .all<{ course: string }>();
  const known = await courseTitles(env);
  const titles = results.map((r) => known[r.course]?.title).filter((t): t is string => Boolean(t)).sort();
  return page(
    {
      title: `@${handle} on Decoded`,
      description: titles.length ? `Learning ${listCourses(titles)} on Decoded.` : "Learning computer science on Decoded.",
      url,
      target,
      image: row.avatarUrl ?? `${env.SITE_ORIGIN}/og/home.png`,
      square: Boolean(row.avatarUrl),
    },
    "public, max-age=300",
  );
}

async function invitePreview(env: Env, shareOrigin: string, token: string): Promise<Response> {
  const url = `${shareOrigin}/invite/${token}`;
  const target = `${env.SITE_ORIGIN}/invite/${token}`;
  const invite = await findInvite(env, token);
  const course = invite && (await courseTitles(env))[invite.course];
  if (!invite) {
    return page(
      {
        title: "This Decoded invite has expired",
        description: "Invite links work once, for 7 days. Ask for a new one.",
        url,
        target,
        image: `${env.SITE_ORIGIN}/og/home.png`,
        noindex: true,
      },
      "no-store",
    );
  }
  const title = course?.title ?? "a course";
  return page(
    {
      title: `@${invite.handle} invited you to study ${title}`,
      description: "Study it together on Decoded. You'll each see the other's progress in this course, and nothing else. The link works once.",
      url,
      target,
      image: course?.available ? `${env.SITE_ORIGIN}/og/invite-${invite.course}.png` : `${env.SITE_ORIGIN}/og/home.png`,
      noindex: true,
    },
    // the invite can be used or expire at any moment
    "no-store",
  );
}

/** Everything on the share domain. Unknown paths go to the same path on the site. */
export async function share(request: Request, env: Env): Promise<Response> {
  const { origin, pathname } = new URL(request.url);
  if (request.method === "GET") {
    const profile = pathname.match(/^\/u\/([^/]+)\/?$/);
    if (profile) return profilePreview(env, origin, decodeURIComponent(profile[1]).toLowerCase());
    const invite = pathname.match(/^\/invite\/([^/]+)\/?$/);
    if (invite) return invitePreview(env, origin, invite[1]);
  }
  return Response.redirect(`${env.SITE_ORIGIN}${pathname}`, 302);
}
