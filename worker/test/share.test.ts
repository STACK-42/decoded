import { applyD1Migrations, env as testEnv } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";
import { resetShareCacheForTests } from "../src/share";

const env = testEnv as unknown as Env & { TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };
const API = "https://api.csdecod.ing";
const SHARE = "https://decoded-go.stack42.tech";
const SITE = "https://csdecod.ing";

function call(url: string, init: RequestInit = {}): Promise<Response> {
  return worker.fetch(new Request(url, { redirect: "manual", ...init }), env);
}

function cookieValue(response: Response, name: string): string {
  const cookie = response.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  return cookie!.slice(name.length + 1).split(";")[0];
}

async function signIn(githubId: number, avatar: string | null = null): Promise<string> {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) =>
    String(input).endsWith("/access_token") ? Response.json({ access_token: "t" }) : Response.json({ id: githubId, avatar_url: avatar }),
  );
  const start = await call(`${API}/auth/github/start`);
  const state = new URL(start.headers.get("Location")!).searchParams.get("state")!;
  const oauth = cookieValue(start, "__Host-decoded_oauth");
  const done = await call(`${API}/auth/github/callback?code=c&state=${state}`, { headers: { Cookie: `__Host-decoded_oauth=${oauth}` } });
  return cookieValue(done, "__Host-decoded_session");
}

const post = (session: string, path: string, body: unknown): Promise<Response> =>
  call(`${API}${path}`, { method: "POST", headers: { Origin: SITE, Cookie: `__Host-decoded_session=${session}` }, body: JSON.stringify(body) });

/** The site's og/courses.json, as the build writes it. */
function serveCourses() {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) =>
    String(input) === `${SITE}/og/courses.json`
      ? Response.json({
          "logic-design": { title: "Logic Design", available: true },
          "operating-systems": { title: "Operating Systems", available: true },
          "data-structures": { title: "Data Structures", available: true },
        })
      : new Response(null, { status: 404 }),
  );
}

const meta = (html: string, key: string) =>
  html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

beforeEach(async () => {
  resetShareCacheForTests();
  await env.DB.batch([env.DB.prepare("DELETE FROM sessions"), env.DB.prepare("DELETE FROM users")]);
});

afterEach(() => vi.unstubAllGlobals());

describe("shared profile links", () => {
  it("preview the handle, picture and courses, then open the profile", async () => {
    const sara = await signIn(1, "https://avatars.githubusercontent.com/u/1?v=4");
    await post(sara, "/profile", { handle: "sara_k", public: true });
    for (const course of ["operating-systems", "logic-design", "data-structures"]) await post(sara, "/enrollments", { course });
    serveCourses();

    const response = await call(`${SHARE}/u/sara_k`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(meta(html, "og:title")).toBe("@sara_k on Decoded");
    expect(meta(html, "og:description")).toBe("Learning Data Structures, Logic Design and 1 more on Decoded.");
    expect(meta(html, "og:image")).toBe("https://avatars.githubusercontent.com/u/1?v=4");
    expect(meta(html, "twitter:card")).toBe("summary");
    expect(meta(html, "og:url")).toBe(`${SHARE}/u/sara_k`);
    expect(html).toContain(`content="0;url=${SITE}/u/sara_k"`);
  });

  it("show a plain preview for a profile that's off or missing", async () => {
    const sara = await signIn(1, "https://avatars.githubusercontent.com/u/1?v=4");
    await post(sara, "/profile", { handle: "sara_k", public: false });
    const html = await (await call(`${SHARE}/u/sara_k`)).text();
    expect(meta(html, "og:title")).toBe("Decoded");
    expect(html).not.toContain("avatars.githubusercontent.com");
  });
});

describe("shared invite links", () => {
  it("preview who invited you to which course, then open the invite", async () => {
    const sara = await signIn(1);
    await post(sara, "/profile", { handle: "sara_k", public: true });
    await post(sara, "/enrollments", { course: "logic-design" });
    const { token } = await (await post(sara, "/companions/invites", { course: "logic-design" })).json<{ token: string }>();
    serveCourses();

    const response = await call(`${SHARE}/invite/${token}`);
    const html = await response.text();
    expect(meta(html, "og:title")).toBe("@sara_k invited you to study Logic Design");
    expect(meta(html, "og:image")).toBe(`${SITE}/og/invite-logic-design.png`);
    expect(meta(html, "twitter:card")).toBe("summary_large_image");
    expect(meta(html, "robots")).toBe("noindex");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(html).toContain(`content="0;url=${SITE}/invite/${token}"`);

    // looking at the preview doesn't use the link up
    expect((await call(`${API}/companions/invites/${token}`)).status).toBe(200);
  });

  it("say when an invite has expired", async () => {
    serveCourses();
    const html = await (await call(`${SHARE}/invite/not-a-real-token-at-all`)).text();
    expect(meta(html, "og:title")).toBe("This Decoded invite has expired");
  });
});

describe("the share domain", () => {
  it("sends anything else to the site", async () => {
    const response = await call(`${SHARE}/courses/logic-design`);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${SITE}/courses/logic-design`);
  });

  it("escapes what it puts in the page", async () => {
    const html = await (await call(`${SHARE}/u/%3Cscript%3E`)).text();
    expect(html).not.toContain("<script>alert");
    expect(html).not.toMatch(/\/u\/<script>/);
  });
});
