import { applyD1Migrations, env as testEnv } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import worker, { type Env } from "../src/index";
import { MIN_COUNT } from "../src/stats";

const env = testEnv as unknown as Env & { TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };
const API = "https://api.csdecod.ing";
const DAY = 24 * 60 * 60 * 1000;

async function get(path: string) {
  const response = await worker.fetch(new Request(`${API}${path}`), env);
  return { status: response.status, cache: response.headers.get("Cache-Control"), body: (await response.json()) as Record<string, unknown> };
}

/** Adds `count` learners, each with the given completed lessons, enrollment and quiz score. */
async function addLearners(
  count: number,
  { course = "logic-design", lessons = [] as string[], enrolled = false, quiz = null as null | [string, number, number], at = Date.now() } = {},
) {
  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < count; i++) {
    const id = crypto.randomUUID();
    statements.push(env.DB.prepare("INSERT INTO users (id, created_at) VALUES (?, ?)").bind(id, at));
    if (enrolled) statements.push(env.DB.prepare("INSERT INTO enrollments VALUES (?, ?, ?)").bind(id, course, at));
    for (const lesson of lessons) {
      statements.push(env.DB.prepare("INSERT INTO progress VALUES (?, ?, ?, ?)").bind(id, course, lesson, at));
    }
    if (quiz) statements.push(env.DB.prepare("INSERT INTO quiz_scores VALUES (?, ?, ?, ?, ?, ?)").bind(id, course, ...quiz, at));
  }
  await env.DB.batch(statements);
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch(["quiz_scores", "progress", "enrollments", "sessions", "identities", "users"].map((t) => env.DB.prepare(`DELETE FROM ${t}`)));
});

describe("GET /stats", () => {
  it("counts registered people and people with progress once each, from 10 up", async () => {
    await addLearners(6, { enrolled: true, lessons: ["signals"] });
    await addLearners(4, { lessons: ["signals"] });
    await addLearners(MIN_COUNT - 1, { course: "microprocessors", enrolled: true });

    const { status, cache, body } = await get("/stats");
    expect(status).toBe(200);
    expect(cache).toContain("max-age");
    expect(body.registered).toEqual({ "logic-design": 10 });
  });
});

describe("GET /stats/<course>", () => {
  it("leaves out every count under 10", async () => {
    await addLearners(MIN_COUNT - 1, { enrolled: true, lessons: ["signals"], quiz: ["numbers-quiz", 8, 10] });
    const { body } = await get("/stats/logic-design?lessons=1");
    expect(body).toEqual({ completedThisWeek: {}, quizAverages: {} });
  });

  it("reports learners, finishers, this week's completions and quiz averages", async () => {
    await addLearners(10, { enrolled: true, lessons: ["signals", "number-systems"], quiz: ["numbers-quiz", 6, 10] });
    await addLearners(10, { lessons: ["signals"], quiz: ["numbers-quiz", 10, 10] });
    await addLearners(12, { lessons: ["logic-gates"], at: Date.now() - 8 * DAY });

    const { body } = await get("/stats/logic-design?lessons=2");
    expect(body).toEqual({
      registered: 32,
      finished: 10,
      completedThisWeek: { signals: 20, "number-systems": 10 },
      quizAverages: { "numbers-quiz": 80 },
    });
  });

  it("only counts finishers when the site says how many lessons there are", async () => {
    await addLearners(10, { lessons: ["signals"] });
    expect((await get("/stats/logic-design")).body.finished).toBeUndefined();
  });

  it("rejects a bad course or lesson count", async () => {
    expect((await get("/stats/Logic_Design")).status).toBe(400);
    expect((await get("/stats/logic-design?lessons=0")).status).toBe(400);
    expect((await get("/stats/logic-design?lessons=two")).status).toBe(400);
  });
});
