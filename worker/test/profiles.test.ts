import { applyD1Migrations, env as testEnv } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";
import { handleProblem } from "../src/profiles";

const env = testEnv as unknown as Env & { TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };
const API = "https://api.csdecod.ing";
const SITE = "https://csdecod.ing";

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
  const done = await call(`/auth/github/callback?code=c&state=${state}`, { headers: { Cookie: `__Host-decoded_oauth=${oauth}` } });
  return cookieValue(done, "__Host-decoded_session");
}

const as = (session: string) => ({ Cookie: `__Host-decoded_session=${session}` });

function save(session: string, body: unknown) {
  return call("/profile", { method: "POST", headers: { Origin: SITE, ...as(session) }, body: JSON.stringify(body) });
}

async function json(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
}

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

beforeEach(async () => {
  await env.DB.batch([env.DB.prepare("DELETE FROM sessions"), env.DB.prepare("DELETE FROM users")]);
});

afterEach(() => vi.unstubAllGlobals());

describe("handle rules", () => {
  it("accepts ordinary handles", () => {
    for (const h of ["sara_k", "mo7", "grape_lover", "classic_dev", "a1b", "asmaa", "asmaa_6"]) expect(handleProblem(h), h).toBeNull();
  });

  it("rejects the wrong shape", () => {
    for (const h of ["ab", "Sara", "_sara", "sara_", "sara-k", "a".repeat(21)]) expect(handleProblem(h), h).toBe("invalid");
  });

  it("rejects reserved names and blocked words, however they're dressed up", () => {
    for (const h of ["admin", "ad_min7", "decoded", "ahmed_alghali", "ahmedalghali1", "asmaa_farouq", "a7med7x7", "xfuckx", "big_ass", "rape99"]) {
      expect(handleProblem(h), h).toBe("not_allowed");
    }
  });
});

describe("your profile", () => {
  it("starts empty, then saves a handle and whether it's public", async () => {
    const me = await signIn(1);
    expect((await json(call("/profile", { headers: as(me) }))).body).toEqual({ profile: null });
    const saved = await json(save(me, { handle: "Sara_K", public: true }));
    expect(saved.body).toEqual({ profile: { handle: "sara_k", public: true, hidden: false } });
  });

  it("needs sign-in", async () => {
    expect((await call("/profile")).status).toBe(401);
  });

  it("refuses a handle someone else has, even when their profile is off", async () => {
    const sara = await signIn(1);
    const other = await signIn(2);
    await save(sara, { handle: "sara_k", public: false });
    expect((await save(other, { handle: "sara_k", public: true })).status).toBe(409);
  });

  it("says why a handle can't be used", async () => {
    const me = await signIn(1);
    expect((await save(me, { handle: "ab", public: true })).status).toBe(400);
    expect((await save(me, { handle: "admin", public: true })).status).toBe(422);
    expect((await save(me, { handle: "sara_k" })).status).toBe(400);
  });

  it("is deleted with the account", async () => {
    const me = await signIn(1);
    await save(me, { handle: "sara_k", public: true });
    await call("/account/delete", { method: "POST", headers: { Origin: SITE, ...as(me) } });
    const other = await signIn(2);
    expect((await save(other, { handle: "sara_k", public: true })).status).toBe(200);
  });
});

describe("public profiles", () => {
  it("show the handle, avatar and courses with completed lessons, never scores", async () => {
    const me = await signIn(1);
    await save(me, { handle: "sara_k", public: true });
    const post = (path: string, body: unknown) =>
      call(path, { method: "POST", headers: { Origin: SITE, ...as(me) }, body: JSON.stringify(body) });
    await post("/enrollments", { course: "operating-systems" });
    await post("/progress", { add: [["logic-design", "signals"], ["logic-design", "logic-gates"]] });
    await post("/quiz-scores", { course: "logic-design", lesson: "gates-quiz", best: 3, total: 10 });

    const { status, body } = await json(call("/profiles/sara_k"));
    expect(status).toBe(200);
    expect(body.handle).toBe("sara_k");
    expect(body.courses).toEqual([
      { course: "logic-design", completed: 2 },
      { course: "operating-systems", completed: 0 },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/best|gates-quiz/);
  });

  it("are not found when turned off or hidden", async () => {
    const me = await signIn(1);
    await save(me, { handle: "sara_k", public: false });
    expect((await call("/profiles/sara_k")).status).toBe(404);
    await save(me, { handle: "sara_k", public: true });
    await env.DB.prepare("UPDATE profiles SET hidden = 1 WHERE handle = 'sara_k'").run();
    expect((await call("/profiles/sara_k")).status).toBe(404);
    expect((await json(call("/profile", { headers: as(me) }))).body.profile).toMatchObject({ hidden: true });
  });
});

describe("search", () => {
  it("finds public handles by how they start, treating _ literally", async () => {
    for (const [id, handle, isPublic] of [[1, "sara_k", true], [2, "sarah", true], [3, "sara_x", false], [4, "sa_ra", true], [5, "omar", true]] as const) {
      await save(await signIn(id), { handle, public: isPublic });
    }
    const handles = async (q: string) =>
      ((await json(call(`/profiles?q=${q}`))).body.results as { handle: string }[]).map((r) => r.handle);
    expect(await handles("sara")).toEqual(["sara_k", "sarah"]);
    expect(await handles("sara_")).toEqual(["sara_k"]);
    expect(await handles("SA")).toEqual(["sa_ra", "sara_k", "sarah"]);
    expect(await handles("s")).toEqual([]);
  });
});

describe("reports", () => {
  it("are saved once per person and need sign-in", async () => {
    const sara = await signIn(1);
    await save(sara, { handle: "sara_k", public: true });
    const me = await signIn(2);
    const report = (session: string | null, reason: string) =>
      call("/profiles/sara_k/report", {
        method: "POST",
        headers: { Origin: SITE, ...(session ? as(session) : {}) },
        body: JSON.stringify({ reason }),
      });
    expect((await report(null, "offensive")).status).toBe(401);
    expect((await report(me, "rude")).status).toBe(400);
    expect((await report(me, "offensive")).status).toBe(204);
    expect((await report(me, "impersonation")).status).toBe(204);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM profile_reports").first<number>("n");
    expect(n).toBe(1);
  });
});
