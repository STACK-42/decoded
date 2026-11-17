import { currentUserId, hashToken, randomToken } from "./auth";
import type { Env } from "./index";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;
const HANDLE = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/;
export const INVITE_DAYS = 7;
const MAX_OPEN_INVITES = 20;

function readJson(text: string): Record<string, unknown> | null {
  if (text.length > 1024) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

const isCourse = (value: unknown): value is string => typeof value === "string" && value.length <= 100 && SLUG.test(value);

/** The user's handle while their profile is public and not hidden; companions only ever see each other by handle. */
function visibleHandle(env: Env, userId: string) {
  return env.DB.prepare("SELECT handle FROM profiles WHERE user_id = ? AND public = 1 AND hidden = 0").bind(userId).first<string>("handle");
}

/** POST /companions/invites {course}: a link to study the course with someone. */
export async function createInvite(request: Request, env: Env): Promise<Response> {
  const userId = await currentUserId(request, env);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
  const course = readJson(await request.text())?.course;
  if (!isCourse(course)) return Response.json({ error: "invalid" }, { status: 400 });

  if (!(await visibleHandle(env, userId))) return Response.json({ error: "needs_profile" }, { status: 403 });
  const takes = await env.DB.prepare(
    "SELECT 1 FROM enrollments WHERE user_id = ?1 AND course = ?2 UNION SELECT 1 FROM progress WHERE user_id = ?1 AND course = ?2 LIMIT 1",
  )
    .bind(userId, course)
    .first();
  if (!takes) return Response.json({ error: "not_registered" }, { status: 403 });

  const now = Date.now();
  await env.DB.prepare("DELETE FROM companion_invites WHERE inviter_id = ? AND expires_at <= ?").bind(userId, now).run();
  const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM companion_invites WHERE inviter_id = ?").bind(userId).first<number>("n");
  if ((open ?? 0) >= MAX_OPEN_INVITES) return Response.json({ error: "too_many" }, { status: 429 });

  const token = randomToken();
  const expiresAt = now + INVITE_DAYS * 24 * 60 * 60 * 1000;
  await env.DB.prepare("INSERT INTO companion_invites (token_hash, inviter_id, course, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(await hashToken(token), userId, course, now, expiresAt)
    .run();
  return Response.json({ token, expiresAt });
}

type Invite = { inviterId: string; course: string; expiresAt: number; handle: string; avatarUrl: string | null };

/** An unused, unexpired invite whose sender still has a visible profile. */
export async function findInvite(env: Env, token: string): Promise<Invite | null> {
  if (!TOKEN.test(token)) return null;
  return env.DB.prepare(
    `SELECT i.inviter_id AS inviterId, i.course, i.expires_at AS expiresAt, p.handle, u.avatar_url AS avatarUrl
       FROM companion_invites i
       JOIN profiles p ON p.user_id = i.inviter_id AND p.public = 1 AND p.hidden = 0
       JOIN users u ON u.id = i.inviter_id
       WHERE i.token_hash = ? AND i.expires_at > ?`,
  )
    .bind(await hashToken(token), Date.now())
    .first<Invite>();
}

/** GET /companions/invites/<token>: who sent it and for which course, for the page that accepts it. */
export async function getInvite(env: Env, token: string): Promise<Response> {
  const invite = await findInvite(env, token);
  if (!invite) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ inviter: { handle: invite.handle, avatarUrl: invite.avatarUrl }, course: invite.course, expiresAt: invite.expiresAt });
}

/** POST /companions/invites/<token>/accept: pairs the two people for the course and registers the one accepting. */
export async function acceptInvite(request: Request, env: Env, token: string): Promise<Response> {
  const userId = await currentUserId(request, env);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
  if (!(await visibleHandle(env, userId))) return Response.json({ error: "needs_profile" }, { status: 403 });

  const invite = await findInvite(env, token);
  if (!invite) return Response.json({ error: "not_found" }, { status: 404 });
  if (invite.inviterId === userId) return Response.json({ error: "own_invite" }, { status: 400 });

  // Delete first and check it was still there, so two people opening the same link can't both use it.
  const used = await env.DB.prepare("DELETE FROM companion_invites WHERE token_hash = ?").bind(await hashToken(token)).run();
  if (used.meta.changes !== 1) return Response.json({ error: "not_found" }, { status: 404 });

  const [a, b] = [invite.inviterId, userId].sort();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO companions (user_a, user_b, course, created_at) VALUES (?, ?, ?, ?)").bind(a, b, invite.course, now),
    env.DB.prepare("INSERT OR IGNORE INTO enrollments (user_id, course, enrolled_at) VALUES (?, ?, ?)").bind(userId, invite.course, now),
  ]);
  return Response.json({ course: invite.course, companion: invite.handle });
}

/** GET /companions: every companion with a visible profile, with their progress in the course you share. */
export async function listCompanions(request: Request, env: Env): Promise<Response> {
  const userId = await currentUserId(request, env);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
  const { results } = await env.DB.prepare(
    `WITH mine AS (
       SELECT course, user_b AS other FROM companions WHERE user_a = ?1
       UNION ALL SELECT course, user_a FROM companions WHERE user_b = ?1
     )
     SELECT m.course, p.handle, u.avatar_url AS avatarUrl,
       (SELECT COUNT(*) FROM progress g WHERE g.user_id = m.other AND g.course = m.course) AS completed,
       (SELECT lesson FROM progress g WHERE g.user_id = m.other AND g.course = m.course ORDER BY completed_at DESC LIMIT 1) AS latestLesson,
       (SELECT MAX(completed_at) FROM progress g WHERE g.user_id = m.other AND g.course = m.course) AS latestAt
     FROM mine m
     JOIN profiles p ON p.user_id = m.other AND p.public = 1 AND p.hidden = 0
     JOIN users u ON u.id = m.other
     ORDER BY m.course, p.handle`,
  )
    .bind(userId)
    .all<{ course: string; handle: string; avatarUrl: string | null; completed: number; latestLesson: string | null; latestAt: number | null }>();
  return Response.json({
    companions: results.map(({ latestLesson, latestAt, ...rest }) => ({
      ...rest,
      latest: latestLesson && latestAt ? { lesson: latestLesson, at: latestAt } : null,
    })),
  });
}

/** POST /companions/remove {course, handle}: ends the pairing. The other person isn't told. */
export async function removeCompanion(request: Request, env: Env): Promise<Response> {
  const userId = await currentUserId(request, env);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
  const body = readJson(await request.text());
  if (!isCourse(body?.course) || typeof body?.handle !== "string" || !HANDLE.test(body.handle)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const other = await env.DB.prepare("SELECT user_id FROM profiles WHERE handle = ?").bind(body.handle).first<string>("user_id");
  if (other) {
    const [a, b] = [userId, other].sort();
    await env.DB.prepare("DELETE FROM companions WHERE user_a = ? AND user_b = ? AND course = ?").bind(a, b, body.course).run();
  }
  return new Response(null, { status: 204 });
}
