import { applyD1Migrations, env as testEnv } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";

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

const as = (session: string | null): Record<string, string> => (session ? { Cookie: `__Host-decoded_session=${session}` } : {});
const post = (session: string | null, path: string, body: unknown = {}) =>
  call(path, { method: "POST", headers: { Origin: SITE, ...as(session) }, body: JSON.stringify(body) });
const get = async (session: string | null, path: string) => {
  const r = await call(path, { headers: as(session) });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
};

/** A signed-in learner with a public profile, registered for Logic Design. */
async function learner(id: number, handle: string) {
  const session = await signIn(id);
  await post(session, "/profile", { handle, public: true });
  await post(session, "/enrollments", { course: "logic-design" });
  return session;
}

async function invite(session: string, course = "logic-design") {
  const r = await post(session, "/companions/invites", { course });
  return { status: r.status, body: (await r.json()) as { token: string; expiresAt: number; error?: string } };
}

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

beforeEach(async () => {
  await env.DB.batch([env.DB.prepare("DELETE FROM sessions"), env.DB.prepare("DELETE FROM users")]);
});

afterEach(() => vi.unstubAllGlobals());

describe("making an invite", () => {
  it("needs sign-in, a public profile and the course", async () => {
    expect((await post(null, "/companions/invites", { course: "logic-design" })).status).toBe(401);

    const me = await signIn(1);
    await post(me, "/enrollments", { course: "logic-design" });
    expect((await invite(me)).body.error).toBe("needs_profile");

    await post(me, "/profile", { handle: "sara_k", public: true });
    expect((await invite(me, "microprocessors")).body.error).toBe("not_registered");

    const { status, body } = await invite(me);
    expect(status).toBe(200);
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(body.expiresAt - Date.now()).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
  });

  it("shows who sent it and for which course", async () => {
    const { body } = await invite(await learner(1, "sara_k"));
    const { status, body: info } = await get(null, `/companions/invites/${body.token}`);
    expect(status).toBe(200);
    expect(info).toMatchObject({ inviter: { handle: "sara_k" }, course: "logic-design" });
    expect((await get(null, "/companions/invites/not-a-real-token-at-all")).status).toBe(404);
  });
});

describe("accepting", () => {
  it("pairs both people, registers the one accepting, and works once", async () => {
    const sara = await learner(1, "sara_k");
    const omar = await signIn(2);
    await post(omar, "/profile", { handle: "omar", public: true });
    const { token } = (await invite(sara)).body;

    expect((await post(omar, `/companions/invites/${token}/accept`)).status).toBe(200);
    expect((await post(await learner(3, "lina"), `/companions/invites/${token}/accept`)).status).toBe(404);

    const omarProgress = await get(omar, "/progress");
    expect(Object.keys(omarProgress.body.enrollments as object)).toContain("logic-design");
    expect(((await get(sara, "/companions")).body.companions as { handle: string }[]).map((c) => c.handle)).toEqual(["omar"]);
    expect(((await get(omar, "/companions")).body.companions as { handle: string }[]).map((c) => c.handle)).toEqual(["sara_k"]);
  });

  it("needs sign-in and a public profile, and refuses your own link", async () => {
    const sara = await learner(1, "sara_k");
    const { token } = (await invite(sara)).body;
    expect((await post(null, `/companions/invites/${token}/accept`)).status).toBe(401);
    expect((await (await post(await signIn(2), `/companions/invites/${token}/accept`)).json<{ error: string }>()).error).toBe("needs_profile");
    expect((await (await post(sara, `/companions/invites/${token}/accept`)).json<{ error: string }>()).error).toBe("own_invite");
  });

  it("refuses an expired link", async () => {
    const { token } = (await invite(await learner(1, "sara_k"))).body;
    await env.DB.prepare("UPDATE companion_invites SET expires_at = ?").bind(Date.now() - 1).run();
    expect((await post(await learner(2, "omar"), `/companions/invites/${token}/accept`)).status).toBe(404);
  });
});

describe("companions", () => {
  async function pair() {
    const sara = await learner(1, "sara_k");
    const omar = await learner(2, "omar");
    await post(omar, `/companions/invites/${(await invite(sara)).body.token}/accept`);
    return { sara, omar };
  }

  it("see each other's progress in the shared course, and nothing else", async () => {
    const { sara, omar } = await pair();
    await post(omar, "/progress", { add: [["logic-design", "signals"], ["logic-design", "logic-gates"], ["microprocessors", "flags"]] });
    await post(omar, "/quiz-scores", { course: "logic-design", lesson: "gates-quiz", best: 3, total: 10 });

    const { body } = await get(sara, "/companions");
    const [omarSeen] = body.companions as Record<string, unknown>[];
    expect(omarSeen).toMatchObject({ course: "logic-design", handle: "omar", completed: 2 });
    expect(["signals", "logic-gates"]).toContain((omarSeen.latest as { lesson: string }).lesson);
    expect(JSON.stringify(body)).not.toMatch(/gates-quiz|best|microprocessors/);
  });

  it("disappear while their profile is off", async () => {
    const { sara, omar } = await pair();
    await post(omar, "/profile", { handle: "omar", public: false });
    expect((await get(sara, "/companions")).body.companions).toEqual([]);
  });

  it("can be removed by either side", async () => {
    const { sara, omar } = await pair();
    expect((await post(omar, "/companions/remove", { course: "logic-design", handle: "sara_k" })).status).toBe(204);
    expect((await get(sara, "/companions")).body.companions).toEqual([]);
    expect((await get(omar, "/companions")).body.companions).toEqual([]);
  });

  it("are removed with the account", async () => {
    const { sara, omar } = await pair();
    await post(omar, "/account/delete");
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM companions").first<number>("n");
    expect(n).toBe(0);
    expect((await get(sara, "/companions")).body.companions).toEqual([]);
  });
});
