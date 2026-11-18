import { currentUserId } from "./auth";
import type { Env } from "./index";

/** 3 to 20 characters: lowercase letters, digits and "_", starting and ending with a letter or digit. */
export const HANDLE = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/;

const SEARCH_LIMIT = 20;
const REPORT_REASONS = ["offensive", "impersonation", "personal-info", "other"];

// Compared with the handle's letters only (digits and "_" removed), so "ad_min7" counts as "admin".
// Authors are reserved by full name only: a first name like "asmaa" belongs to every Asmaa.
const RESERVED = new Set([
  "admin", "administrator", "decoded", "support", "help", "moderator", "mod", "staff", "team", "official",
  "root", "system", "api", "null", "undefined", "anonymous", "deleted", "settings", "profile", "people",
  "ahmedalghali", "asmaafarouq", "amedx",
]);
// Rejected anywhere in the handle's letters.
const BLOCKED_ANYWHERE = ["fuck", "shit", "cunt", "nigg", "fagg", "whore", "slut", "bitch", "porn", "hitler", "pedo"];
// Rejected only as a whole word between digits or "_", so "grape" and "classic" stay allowed.
const BLOCKED_WORDS = new Set(["ass", "rape", "dick", "cock", "sex", "nazi", "kill", "die"]);

/** Why a handle can't be used, or null if it can. */
export function handleProblem(handle: string): "invalid" | "not_allowed" | null {
  if (!HANDLE.test(handle)) return "invalid";
  const letters = handle.replace(/[0-9_]/g, "");
  if (RESERVED.has(letters) || RESERVED.has(handle.replace(/_/g, ""))) return "not_allowed";
  if (BLOCKED_ANYWHERE.some((word) => letters.includes(word))) return "not_allowed";
  if (handle.split(/[0-9_]+/).some((word) => BLOCKED_WORDS.has(word))) return "not_allowed";
  return null;
}

type OwnProfile = { handle: string; public: boolean; hidden: boolean };

async function readOwn(env: Env, userId: string): Promise<OwnProfile | null> {
  const row = await env.DB.prepare("SELECT handle, public, hidden FROM profiles WHERE user_id = ?")
    .bind(userId)
    .first<{ handle: string; public: number; hidden: number }>();
  return row && { handle: row.handle, public: row.public === 1, hidden: row.hidden === 1 };
}

/** GET /profile: your own profile settings, or null if you never made one. */
export async function getOwnProfile(request: Request, env: Env): Promise<Response> {
  const userId = await currentUserId(request, env);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
  return Response.json({ profile: await readOwn(env, userId) });
}

/** POST /profile {handle, public}: creates or changes your profile. */
export async function saveOwnProfile(request: Request, env: Env): Promise<Response> {
  const userId = await currentUserId(request, env);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });

  const text = await request.text();
  if (text.length > 1024) return Response.json({ error: "too_large" }, { status: 413 });
  let body: { handle?: unknown; public?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const handle = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : "";
  if (typeof body.public !== "boolean") return Response.json({ error: "invalid" }, { status: 400 });
  const problem = handleProblem(handle);
  if (problem) return Response.json({ error: problem }, { status: problem === "invalid" ? 400 : 422 });

  const owner = await env.DB.prepare("SELECT user_id FROM profiles WHERE handle = ?").bind(handle).first<string>("user_id");
  if (owner && owner !== userId) return Response.json({ error: "taken" }, { status: 409 });

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO profiles (user_id, handle, public, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET handle = excluded.handle, public = excluded.public, updated_at = excluded.updated_at`,
  )
    .bind(userId, handle, body.public ? 1 : 0, now, now)
    .run();
  return Response.json({ profile: await readOwn(env, userId) });
}

/** GET /profiles/<handle>: a profile that is turned on and not hidden. */
export async function getPublicProfile(env: Env, handle: string): Promise<Response> {
  if (!HANDLE.test(handle)) return Response.json({ error: "not_found" }, { status: 404 });
  const row = await env.DB.prepare(
    `SELECT p.user_id AS userId, p.handle, p.created_at AS since, u.avatar_url AS avatarUrl
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.handle = ? AND p.public = 1 AND p.hidden = 0`,
  )
    .bind(handle)
    .first<{ userId: string; handle: string; since: number; avatarUrl: string | null }>();
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });

  // The courses they take, by the site's rule: registered, or completed a lesson in it.
  const { results } = await env.DB.prepare(
    `SELECT c.course, (SELECT COUNT(*) FROM progress p WHERE p.user_id = ?1 AND p.course = c.course) AS completed
       FROM (SELECT course FROM enrollments WHERE user_id = ?1 UNION SELECT course FROM progress WHERE user_id = ?1) c
       ORDER BY c.course`,
  )
    .bind(row.userId)
    .all<{ course: string; completed: number }>();

  return Response.json({ handle: row.handle, avatarUrl: row.avatarUrl, since: row.since, courses: results });
}

/** GET /profiles?q=<start of a handle>: up to 20 matching profiles that are turned on. */
export async function searchProfiles(request: Request, env: Env): Promise<Response> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{2,20}$/.test(q)) return Response.json({ results: [] });
  // Every handle character sorts before "{", so this range is "starts with q" and uses the handle index.
  const { results } = await env.DB.prepare(
    `SELECT p.handle, u.avatar_url AS avatarUrl FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.handle >= ?1 AND p.handle < ?1 || '{' AND p.public = 1 AND p.hidden = 0
       ORDER BY p.handle LIMIT ?2`,
  )
    .bind(q, SEARCH_LIMIT)
    .all<{ handle: string; avatarUrl: string | null }>();
  return Response.json({ results });
}

/** POST /profiles/<handle>/report {reason}: signed-in people only, once per profile. */
export async function reportProfile(request: Request, env: Env, handle: string): Promise<Response> {
  const userId = await currentUserId(request, env);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
  let reason: unknown;
  try {
    ({ reason } = JSON.parse(await request.text()));
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (typeof reason !== "string" || !REPORT_REASONS.includes(reason)) return Response.json({ error: "invalid" }, { status: 400 });

  const target = await env.DB.prepare("SELECT user_id FROM profiles WHERE handle = ?").bind(handle).first<string>("user_id");
  if (!target) return Response.json({ error: "not_found" }, { status: 404 });
  await env.DB.prepare(
    "INSERT OR IGNORE INTO profile_reports (reporter_id, profile_user_id, handle, reason, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(userId, target, handle, reason, Date.now())
    .run();
  return new Response(null, { status: 204 });
}
