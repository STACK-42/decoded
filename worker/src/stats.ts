import type { Env } from "./index";

/** Counts below this are left out: a small number makes a course look empty and can point to a person. */
export const MIN_COUNT = 10;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LESSONS = 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// The numbers don't need to be live, and caching keeps a busy page from querying D1 on every view.
const CACHE = { "Cache-Control": "public, max-age=300" };
const STATS_TTL = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

let allStatsCache: { at: number; data: { registered: Record<string, number> } } | null = null;
const courseStatsCache = new Map<string, { at: number; data: Record<string, unknown> }>();

/** Test hook: reset cached statistics between test runs. */
export function resetStatsCacheForTests() {
  allStatsCache = null;
  courseStatsCache.clear();
}

const shown = (n: number | null | undefined) => (n != null && n >= MIN_COUNT ? n : undefined);

// Someone counts as taking a course if they registered or completed a lesson in it, as on the site.
const LEARNERS = `SELECT user_id, course FROM enrollments UNION SELECT user_id, course FROM progress`;

/** GET /stats: how many people take each course. */
export async function allCourseStats(env: Env): Promise<Response> {
  if (allStatsCache && Date.now() - allStatsCache.at < STATS_TTL) {
    return Response.json(allStatsCache.data, { headers: CACHE });
  }
  const { results } = await env.DB.prepare(
    `SELECT course, COUNT(*) AS n FROM (${LEARNERS}) GROUP BY course HAVING n >= ?`,
  )
    .bind(MIN_COUNT)
    .all<{ course: string; n: number }>();
  const data = { registered: Object.fromEntries(results.map((r) => [r.course, r.n])) };
  allStatsCache = { at: Date.now(), data };
  return Response.json(data, { headers: CACHE });
}

/**
 * GET /stats/<course>?lessons=N: learners, finishers, lessons completed this week, and quiz averages.
 * The Worker doesn't know the syllabus, so the site sends the lesson count that "finished" means.
 */
export async function courseStats(request: Request, env: Env, course: string): Promise<Response> {
  if (course.length > 100 || !SLUG.test(course)) return Response.json({ error: "invalid" }, { status: 400 });
  const lessonsParam = new URL(request.url).searchParams.get("lessons");
  const lessons = lessonsParam === null ? null : Number(lessonsParam);
  if (lessons !== null && !(Number.isInteger(lessons) && lessons >= 1 && lessons <= MAX_LESSONS)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const cacheKey = `${course}?lessons=${lessons ?? "none"}`;
  const cached = courseStatsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < STATS_TTL) {
    return Response.json(cached.data, { headers: CACHE });
  }

  const [registered, finished, week, quizzes] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM (${LEARNERS}) WHERE course = ?`).bind(course),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM (SELECT user_id FROM progress WHERE course = ? GROUP BY user_id HAVING COUNT(*) >= ?)`,
    ).bind(course, lessons ?? MAX_LESSONS + 1),
    env.DB.prepare(
      `SELECT lesson, COUNT(*) AS n FROM progress WHERE course = ? AND completed_at >= ? GROUP BY lesson HAVING n >= ?`,
    ).bind(course, Date.now() - WEEK_MS, MIN_COUNT),
    env.DB.prepare(
      `SELECT lesson, COUNT(*) AS n, AVG(best * 1.0 / total) AS average FROM quiz_scores
         WHERE course = ? GROUP BY lesson HAVING n >= ?`,
    ).bind(course, MIN_COUNT),
  ]);

  const count = (rows: { results: Record<string, unknown>[] }) => shown(rows.results[0]?.n as number);
  const data = {
    registered: count(registered),
    finished: lessons === null ? undefined : count(finished),
    completedThisWeek: Object.fromEntries(week.results.map((r) => [r.lesson, r.n])),
    quizAverages: Object.fromEntries(quizzes.results.map((r) => [r.lesson, Math.round((r.average as number) * 100)])),
  };

  if (courseStatsCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = courseStatsCache.keys().next().value;
    if (oldest) courseStatsCache.delete(oldest);
  }
  courseStatsCache.set(cacheKey, { at: Date.now(), data });

  return Response.json(data, { headers: CACHE });
}
