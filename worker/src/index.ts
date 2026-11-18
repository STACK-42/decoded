import { currentUserId, deleteAccount, finishSignIn, signOut, startSignIn } from "./auth";
import { changeProgress, enroll, getProgress, saveQuizScore, unenroll } from "./progress";
import { allCourseStats, courseStats } from "./stats";
import { share } from "./share";
import { acceptInvite, createInvite, getInvite, listCompanions, removeCompanion } from "./companions";
import { getOwnProfile, getPublicProfile, reportProfile, saveOwnProfile, searchProfiles } from "./profiles";

export interface Env {
  DB: D1Database;
  SITE_ORIGIN: string;
  /** Where shared profile and invite links point, so they get their own previews. */
  SHARE_ORIGIN: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

async function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  const key = `${request.method} ${pathname}`;

  // Cookies go with any request, so changes are only accepted from the site itself.
  if (request.method !== "GET" && request.headers.get("Origin") !== env.SITE_ORIGIN) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const invite = pathname.match(/^\/companions\/invites\/([A-Za-z0-9_-]+)(\/accept)?$/);
  if (invite && request.method === "POST" && invite[2]) return acceptInvite(request, env, invite[1]);
  if (invite && request.method === "GET" && !invite[2]) return getInvite(env, invite[1]);

  const report = pathname.match(/^\/profiles\/([a-z0-9_]+)\/report$/);
  if (request.method === "POST" && report) return reportProfile(request, env, report[1]);
  if (request.method === "GET" && pathname.startsWith("/profiles/")) {
    return getPublicProfile(env, pathname.slice("/profiles/".length));
  }

  if (request.method === "GET" && pathname.startsWith("/stats/")) {
    return courseStats(request, env, pathname.slice("/stats/".length));
  }

  switch (key) {
    case "GET /health":
      await env.DB.prepare("SELECT 1").first();
      return Response.json({ ok: true });
    case "GET /auth/github/start":
      return startSignIn(request, env, "github");
    case "GET /auth/github/callback":
      return finishSignIn(request, env, "github");
    case "GET /auth/google/start":
      return startSignIn(request, env, "google");
    case "GET /auth/google/callback":
      return finishSignIn(request, env, "google");
    case "GET /stats":
      return allCourseStats(env);
    case "GET /profile":
      return getOwnProfile(request, env);
    case "POST /profile":
      return saveOwnProfile(request, env);
    case "GET /profiles":
      return searchProfiles(request, env);
    case "POST /companions/invites":
      return createInvite(request, env);
    case "GET /companions":
      return listCompanions(request, env);
    case "POST /companions/remove":
      return removeCompanion(request, env);
    case "GET /me":
      return Response.json({ signedIn: (await currentUserId(request, env)) !== null });
    case "POST /auth/sign-out":
      return signOut(request, env);
    case "POST /account/delete":
      return deleteAccount(request, env);
    case "GET /progress":
      return getProgress(request, env);
    case "POST /progress":
      return changeProgress(request, env);
    case "POST /quiz-scores":
      return saveQuizScore(request, env);
    case "POST /enrollments":
      return enroll(request, env);
    case "POST /enrollments/remove":
      return unenroll(request, env);
    default:
      return Response.json({ error: "not_found" }, { status: 404 });
  }
}

/** Where the site lived before csdecod.ing (#71). */
const OLD_SITE_HOST = "decoded.stack42.tech";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // The site's old domain: send every page to the same path on the new one.
    if (url.hostname === OLD_SITE_HOST) {
      return Response.redirect(`${env.SITE_ORIGIN}${url.pathname}${url.search}`, 301);
    }
    if (url.origin === env.SHARE_ORIGIN) return share(request, env);

    const fromSite = request.headers.get("Origin") === env.SITE_ORIGIN;
    const corsHeaders: Record<string, string> = fromSite
      ? { "Access-Control-Allow-Origin": env.SITE_ORIGIN, "Access-Control-Allow-Credentials": "true" }
      : {};

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type",
          Vary: "Origin",
        },
      });
    }

    const response = await route(request, env);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
    headers.set("Vary", "Origin");
    // Account responses are private; a route that returns public numbers sets its own caching.
    if (!response.headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;
