import { applyD1Migrations, env as testEnv } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";

const env = testEnv as unknown as Env & { TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };
const API = "https://decoded-api.stack42.tech";
const SITE = "https://decoded.stack42.tech";

function call(path: string, init: RequestInit = {}): Promise<Response> {
  return worker.fetch(new Request(`${API}${path}`, { redirect: "manual", ...init }), env);
}

function cookieValue(response: Response, name: string): string {
  const cookie = response.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  return cookie!.slice(name.length + 1).split(";")[0];
}

async function signIn(githubId: number): Promise<string> {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) =>
    String(input).endsWith("/access_token") ? Response.json({ access_token: "t" }) : Response.json({ id: githubId }),
  );
  const start = await call("/auth/github/start");
  const state = new URL(start.headers.get("Location")!).searchParams.get("state")!;
  const oauth = cookieValue(start, "__Host-decoded_oauth");
  const done = await call(`/auth/github/callback?code=c&state=${state}`, {
    headers: { Cookie: `__Host-decoded_oauth=${oauth}` },
  });
  return cookieValue(done, "__Host-decoded_session");
}

function post(session: string | null, body: unknown, origin = SITE): Promise<Response> {
  return call("/progress", {
    method: "POST",
    headers: { Origin: origin, ...(session ? { Cookie: `__Host-decoded_session=${session}` } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function read(session: string) {
  const response = await call("/progress", { headers: { Cookie: `__Host-decoded_session=${session}` } });
  return response.json<{ signedIn: boolean; progress: Record<string, string[]> }>();
}

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

beforeEach(async () => {
  await env.DB.batch([env.DB.prepare("DELETE FROM sessions"), env.DB.prepare("DELETE FROM users")]);
});

afterEach(() => vi.unstubAllGlobals());

describe("progress", () => {
  it("reports signed-out visitors without an error", async () => {
    const response = await call("/progress");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ signedIn: false });
  });

  it("refuses changes from signed-out visitors", async () => {
    expect((await post(null, { add: [["toc", "intro"]] })).status).toBe(401);
  });

  it("saves additions and removals and returns the result", async () => {
    const session = await signIn(1);
    await post(session, { add: [["toc", "intro"], ["toc", "dfa"], ["os", "threads"]] });
    const response = await post(session, { remove: [["toc", "dfa"]], add: [["os", "paging"]] });
    const { progress } = await response.json<{ progress: Record<string, string[]> }>();
    expect(progress.toc).toEqual(["intro"]);
    expect(progress.os.sort()).toEqual(["paging", "threads"]);
    expect((await read(session)).progress).toEqual(progress);
  });

  it("treats a repeated addition as a no-op", async () => {
    const session = await signIn(1);
    await post(session, { add: [["toc", "intro"]] });
    expect((await post(session, { add: [["toc", "intro"]] })).status).toBe(200);
    expect((await read(session)).progress).toEqual({ toc: ["intro"] });
  });

  it("keeps each user's progress out of reach of everyone else", async () => {
    const alice = await signIn(1);
    const bob = await signIn(2);
    await post(alice, { add: [["toc", "intro"]] });

    expect((await read(bob)).progress).toEqual({});

    await post(bob, { remove: [["toc", "intro"]], user_id: "anyone", userId: "anyone" });
    expect((await read(alice)).progress).toEqual({ toc: ["intro"] });
  });

  it("ignores any user ID sent by the client", async () => {
    const alice = await signIn(1);
    const bob = await signIn(2);
    const aliceId = await env.DB.prepare("SELECT user_id FROM sessions LIMIT 1").first<string>("user_id");
    await post(bob, { add: [["toc", "bobs-lesson"]], user_id: aliceId });
    expect((await read(alice)).progress).toEqual({});
    expect((await read(bob)).progress).toEqual({ toc: ["bobs-lesson"] });
  });

  it("refuses changes from other origins", async () => {
    const session = await signIn(1);
    expect((await post(session, { add: [["toc", "intro"]] }, "https://evil.example")).status).toBe(403);
    expect((await read(session)).progress).toEqual({});
  });

  it.each([
    ["not JSON", "{"],
    ["a non-list", { add: "toc" }],
    ["a malformed pair", { add: [["toc"]] }],
    ["a non-slug", { add: [["toc", "<script>"]] }],
    ["SQL in a slug", { add: [["toc", "x'; DROP TABLE users;--"]] }],
    ["an overlong slug", { add: [["toc", "a".repeat(101)]] }],
  ])("rejects %s", async (_name, body) => {
    const session = await signIn(1);
    expect((await post(session, body)).status).toBe(400);
    expect((await read(session)).progress).toEqual({});
  });

  it("rejects an oversized body", async () => {
    const session = await signIn(1);
    expect((await post(session, "x".repeat(256 * 1024 + 1))).status).toBe(413);
  });

  it("caps how many lessons one user can store", async () => {
    const session = await signIn(1);
    const lessons = Array.from({ length: 5000 }, (_, i) => ["toc", `l${i}`]);
    expect((await post(session, { add: lessons })).status).toBe(200);
    expect((await post(session, { add: [["toc", "one-more"]] })).status).toBe(413);
  });
});

describe("profile", () => {
  function stubProfile(login: string, avatarUrl: string) {
    return async (input: RequestInfo | URL) =>
      String(input).endsWith("/access_token")
        ? Response.json({ access_token: "t" })
        : Response.json({ id: 1, login, avatar_url: avatarUrl });
  }

  async function signInAs(login: string, avatarUrl: string): Promise<string> {
    const session = await signIn(1);
    vi.stubGlobal("fetch", stubProfile(login, avatarUrl));
    const start = await call("/auth/github/start");
    const state = new URL(start.headers.get("Location")!).searchParams.get("state")!;
    const oauth = cookieValue(start, "__Host-decoded_oauth");
    await call(`/auth/github/callback?code=c&state=${state}`, { headers: { Cookie: `__Host-decoded_oauth=${oauth}` } });
    return session;
  }

  const AVATAR = "https://avatars.githubusercontent.com/u/1?v=4";

  it("returns the GitHub username and avatar, refreshed at sign-in", async () => {
    const session = await signInAs("octocat", AVATAR);
    expect(((await read(session)) as unknown as { user: unknown }).user).toEqual({ name: "octocat", avatarUrl: AVATAR });
  });

  it("drops an avatar from any other host and a malformed username", async () => {
    const session = await signInAs("<b>x</b>", "https://evil.example/a.png");
    expect(((await read(session)) as unknown as { user: unknown }).user).toEqual({ name: null, avatarUrl: null });
  });
});

describe("registering for a course", () => {
  function register(session: string | null, body: unknown, origin = SITE): Promise<Response> {
    return call("/enrollments", {
      method: "POST",
      headers: { Origin: origin, ...(session ? { Cookie: `__Host-decoded_session=${session}` } : {}) },
      body: JSON.stringify(body),
    });
  }
  const enrollmentsOf = async (session: string) =>
    ((await read(session)) as unknown as { enrollments: Record<string, number> }).enrollments;

  it("records the course and keeps the first date on a repeat", async () => {
    const session = await signIn(1);
    expect((await register(session, { course: "toc" })).status).toBe(200);
    const first = (await enrollmentsOf(session)).toc;
    expect(first).toBeGreaterThan(0);
    await env.DB.prepare("UPDATE enrollments SET enrolled_at = 1").run();
    await register(session, { course: "toc" });
    expect((await enrollmentsOf(session)).toc).toBe(1);
  });

  it("keeps registrations separate between users", async () => {
    const alice = await signIn(1);
    const bob = await signIn(2);
    await register(alice, { course: "toc" });
    expect(await enrollmentsOf(bob)).toEqual({});
  });

  it("needs a session, the site's origin and a valid slug", async () => {
    const session = await signIn(1);
    expect((await register(null, { course: "toc" })).status).toBe(401);
    expect((await register(session, { course: "toc" }, "https://evil.example")).status).toBe(403);
    expect((await register(session, { course: "<b>" })).status).toBe(400);
    expect((await register(session, {})).status).toBe(400);
    expect(await enrollmentsOf(session)).toEqual({});
  });

  it("leaving removes that course's registration and progress, and nothing else", async () => {
    const alice = await signIn(1);
    const bob = await signIn(2);
    for (const session of [alice, bob]) {
      await register(session, { course: "toc" });
      await post(session, { add: [["toc", "intro"]] });
    }
    await register(alice, { course: "os" });
    await post(alice, { add: [["os", "threads"]] });

    const response = await call("/enrollments/remove", {
      method: "POST",
      headers: { Origin: SITE, Cookie: `__Host-decoded_session=${alice}` },
      body: JSON.stringify({ course: "toc" }),
    });
    expect(response.status).toBe(200);

    expect(Object.keys(await enrollmentsOf(alice))).toEqual(["os"]);
    expect((await read(alice)).progress).toEqual({ os: ["threads"] });
    expect((await read(bob)).progress).toEqual({ toc: ["intro"] });
    expect(Object.keys(await enrollmentsOf(bob))).toEqual(["toc"]);
  });

  it("leaving needs a session and the site's origin", async () => {
    const session = await signIn(1);
    await register(session, { course: "toc" });
    const remove = (headers: Record<string, string>) =>
      call("/enrollments/remove", { method: "POST", headers, body: JSON.stringify({ course: "toc" }) });
    expect((await remove({ Origin: SITE })).status).toBe(401);
    expect((await remove({ Origin: "https://evil.example", Cookie: `__Host-decoded_session=${session}` })).status).toBe(403);
    expect(Object.keys(await enrollmentsOf(session))).toEqual(["toc"]);
  });

  it("is removed with the account", async () => {
    const session = await signIn(1);
    await register(session, { course: "toc" });
    await call("/account/delete", { method: "POST", headers: { Origin: SITE, Cookie: `__Host-decoded_session=${session}` } });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM enrollments").first<number>("n")).toBe(0);
  });
});

describe("quiz scores", () => {
  function save(session: string | null, body: unknown, origin = SITE): Promise<Response> {
    return call("/quiz-scores", {
      method: "POST",
      headers: { Origin: origin, ...(session ? { Cookie: `__Host-decoded_session=${session}` } : {}) },
      body: JSON.stringify(body),
    });
  }
  const scoresOf = async (session: string) =>
    ((await read(session)) as unknown as { quizScores: Record<string, { best: number; total: number }> }).quizScores;

  it("keeps the best attempt only", async () => {
    const session = await signIn(1);
    await save(session, { course: "toc", lesson: "quiz", best: 6, total: 10 });
    await save(session, { course: "toc", lesson: "quiz", best: 3, total: 10 });
    expect(await scoresOf(session)).toEqual({ "toc/quiz": { best: 6, total: 10 } });
    await save(session, { course: "toc", lesson: "quiz", best: 9, total: 10 });
    expect(await scoresOf(session)).toEqual({ "toc/quiz": { best: 9, total: 10 } });
  });

  it("keeps each user's scores separate", async () => {
    const alice = await signIn(1);
    const bob = await signIn(2);
    await save(alice, { course: "toc", lesson: "quiz", best: 6, total: 10 });
    expect(await scoresOf(bob)).toEqual({});
  });

  it("needs a session, the site's origin and sensible numbers", async () => {
    const session = await signIn(1);
    const good = { course: "toc", lesson: "quiz", best: 1, total: 2 };
    expect((await save(null, good)).status).toBe(401);
    expect((await save(session, good, "https://evil.example")).status).toBe(403);
    for (const bad of [
      { ...good, best: 3 },
      { ...good, best: -1 },
      { ...good, total: 0, best: 0 },
      { ...good, best: 0.5 },
      { ...good, best: "1" },
      { ...good, lesson: "<b>" },
      { ...good, course: undefined },
    ]) {
      expect((await save(session, bad)).status).toBe(400);
    }
    expect(await scoresOf(session)).toEqual({});
  });

  it("is cleared by leaving the course and by deleting the account", async () => {
    const session = await signIn(1);
    await save(session, { course: "toc", lesson: "quiz", best: 1, total: 2 });
    await save(session, { course: "os", lesson: "quiz", best: 1, total: 2 });
    await call("/enrollments/remove", {
      method: "POST",
      headers: { Origin: SITE, Cookie: `__Host-decoded_session=${session}` },
      body: JSON.stringify({ course: "toc" }),
    });
    expect(Object.keys(await scoresOf(session))).toEqual(["os/quiz"]);
    await call("/account/delete", { method: "POST", headers: { Origin: SITE, Cookie: `__Host-decoded_session=${session}` } });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM quiz_scores").first<number>("n")).toBe(0);
  });
});

describe("deleting an account", () => {
  const count = (table: string) => env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<number>("n");

  it("removes every row for that user and leaves others alone", async () => {
    const alice = await signIn(1);
    const bob = await signIn(2);
    await post(alice, { add: [["toc", "intro"]] });
    await post(bob, { add: [["toc", "intro"]] });

    const response = await call("/account/delete", {
      method: "POST",
      headers: { Origin: SITE, Cookie: `__Host-decoded_session=${alice}` },
    });
    expect(response.status).toBe(204);

    for (const table of ["users", "identities", "sessions", "progress"]) expect(await count(table)).toBe(1);
    expect((await read(alice)).signedIn).toBe(false);
    expect((await read(bob)).progress).toEqual({ toc: ["intro"] });
  });

  it("needs a session and the site's own origin", async () => {
    const alice = await signIn(1);
    const foreign = await call("/account/delete", {
      method: "POST",
      headers: { Origin: "https://evil.example", Cookie: `__Host-decoded_session=${alice}` },
    });
    expect(foreign.status).toBe(403);
    const anonymous = await call("/account/delete", { method: "POST", headers: { Origin: SITE } });
    expect(anonymous.status).toBe(401);
    expect(await count("users")).toBe(1);
  });
});
