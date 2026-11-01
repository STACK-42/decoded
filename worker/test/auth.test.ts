import { applyD1Migrations, env as testEnv } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";
import { safeReturnPath } from "../src/auth";

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

function stubGithub(id: number) {
  const stub = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/login/oauth/access_token")) return Response.json({ access_token: "gho_test" });
    if (url === "https://api.github.com/user") return Response.json({ id });
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", stub);
  return stub;
}

async function signIn(id = 1, returnPath = "/courses"): Promise<{ response: Response; session: string }> {
  stubGithub(id);
  const start = await call(`/auth/github/start?return=${encodeURIComponent(returnPath)}`);
  const state = new URL(start.headers.get("Location")!).searchParams.get("state")!;
  const oauth = cookieValue(start, "__Host-decoded_oauth");
  const response = await call(`/auth/github/callback?code=abc&state=${state}`, {
    headers: { Cookie: `__Host-decoded_oauth=${oauth}` },
  });
  return { response, session: cookieValue(response, "__Host-decoded_session") };
}

function stubGoogle(claims: Record<string, unknown>) {
  const payload = btoa(JSON.stringify({ aud: "test-google-id", iss: "https://accounts.google.com", ...claims }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const stub = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") return Response.json({ id_token: `header.${payload}.signature` });
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", stub);
  return stub;
}

async function finishGoogle(): Promise<{ response: Response; oauth: string }> {
  const start = await call("/auth/google/start");
  const state = new URL(start.headers.get("Location")!).searchParams.get("state")!;
  const oauth = cookieValue(start, "__Host-decoded_oauth");
  const response = await call(`/auth/google/callback?code=abc&state=${state}`, {
    headers: { Cookie: `__Host-decoded_oauth=${oauth}` },
  });
  return { response, oauth };
}

function withSession(session: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...init.headers, Cookie: `__Host-decoded_session=${session}` } };
}

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

beforeEach(async () => {
  await env.DB.batch([env.DB.prepare("DELETE FROM sessions"), env.DB.prepare("DELETE FROM users")]);
});

afterEach(() => vi.unstubAllGlobals());

describe("starting sign-in", () => {
  it("sends the browser to GitHub with state and PKCE", async () => {
    const response = await call("/auth/github/start");
    const location = new URL(response.headers.get("Location")!);
    expect(response.status).toBe(302);
    expect(location.origin).toBe("https://github.com");
    expect(location.searchParams.get("client_id")).toBe("test-client-id");
    expect(location.searchParams.get("redirect_uri")).toBe(`${API}/auth/github/callback`);
    expect(location.searchParams.get("state")).toBeTruthy();
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.toString()).not.toContain("test-client-secret");
  });
});

describe("finishing sign-in", () => {
  it("rejects a callback with the wrong state without calling GitHub", async () => {
    const github = stubGithub(1);
    const start = await call("/auth/github/start");
    const oauth = cookieValue(start, "__Host-decoded_oauth");
    const response = await call("/auth/github/callback?code=abc&state=forged", {
      headers: { Cookie: `__Host-decoded_oauth=${oauth}` },
    });
    expect(response.headers.get("Location")).toBe(`${SITE}/?signin=failed`);
    expect(github).not.toHaveBeenCalled();
  });

  it("rejects a callback with no state cookie", async () => {
    const github = stubGithub(1);
    const response = await call("/auth/github/callback?code=abc&state=anything");
    expect(response.headers.get("Location")).toBe(`${SITE}/?signin=failed`);
    expect(github).not.toHaveBeenCalled();
  });

  it("sets a locked-down cookie and returns to the page the user came from", async () => {
    const { response } = await signIn(1, "/courses");
    expect(response.headers.get("Location")).toBe(`${SITE}/courses`);
    const cookie = response.headers.getSetCookie().find((c) => c.startsWith("__Host-decoded_session="))!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("keeps dots in the return path", async () => {
    const { response } = await signIn(1, "/courses/v1.2/intro");
    expect(response.headers.get("Location")).toBe(`${SITE}/courses/v1.2/intro`);
  });

  it("stores a hash of the session token, not the token", async () => {
    const { session } = await signIn();
    const row = await env.DB.prepare("SELECT token_hash FROM sessions").first<string>("token_hash");
    expect(row).not.toBe(session);
    expect(row).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reuses one account for repeat sign-ins and keeps people apart", async () => {
    await signIn(1);
    await signIn(1);
    await signIn(2);
    const users = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<number>("n");
    expect(users).toBe(2);
  });
});

describe("Google sign-in", () => {
  it("sends the browser to Google asking for the openid and profile scopes", async () => {
    const response = await call("/auth/google/start");
    const location = new URL(response.headers.get("Location")!);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe("test-google-id");
    expect(location.searchParams.get("redirect_uri")).toBe(`${API}/auth/google/callback`);
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("scope")).toBe("openid profile");
    expect(location.searchParams.get("state")).toBeTruthy();
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.toString()).not.toContain("test-google-secret");
  });

  it("exchanges the code with the secret and PKCE verifier, then signs in", async () => {
    const google = stubGoogle({ sub: "1234" });
    const { response, oauth } = await finishGoogle();
    expect(response.headers.get("Location")).toBe(`${SITE}/`);

    const body = new URLSearchParams(google.mock.calls[0][1]!.body as URLSearchParams);
    expect(body.get("client_secret")).toBe("test-google-secret");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("redirect_uri")).toBe(`${API}/auth/google/callback`);
    expect(body.get("code_verifier")).toBe(oauth.split(".")[1]);

    const session = cookieValue(response, "__Host-decoded_session");
    expect(await (await call("/me", withSession(session))).json()).toEqual({ signedIn: true });
  });

  it("stores the picture but not the name", async () => {
    const picture = "https://lh3.googleusercontent.com/a/abc=s96-c";
    stubGoogle({ sub: "1234", name: "Ada", picture });
    await finishGoogle();
    const row = await env.DB.prepare("SELECT display_name, avatar_url FROM users").first();
    expect(row).toEqual({ display_name: null, avatar_url: picture });
  });

  it("ignores a picture from any other host", async () => {
    stubGoogle({ sub: "1234", picture: "https://evil.example/a.png" });
    await finishGoogle();
    expect(await env.DB.prepare("SELECT avatar_url FROM users").first<string>("avatar_url")).toBeNull();
  });

  it("reuses one account for repeat sign-ins", async () => {
    stubGoogle({ sub: "1234" });
    await finishGoogle();
    await finishGoogle();
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<number>("n")).toBe(1);
  });

  it("keeps the same ID on GitHub and Google as separate accounts", async () => {
    await signIn(1234);
    stubGoogle({ sub: "1234" });
    await finishGoogle();
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<number>("n")).toBe(2);
  });

  it.each([
    ["another app's audience", { sub: "1234", aud: "someone-else" }],
    ["the wrong issuer", { sub: "1234", iss: "https://evil.example" }],
    ["no subject", {}],
  ])("rejects a token with %s", async (_name, claims) => {
    stubGoogle(claims);
    const { response } = await finishGoogle();
    expect(response.headers.get("Location")).toBe(`${SITE}/?signin=failed`);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<number>("n")).toBe(0);
  });

  it("fails cleanly on a malformed token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id_token: "not-a-token" })));
    const { response } = await finishGoogle();
    expect(response.headers.get("Location")).toBe(`${SITE}/?signin=failed`);
  });
});

describe("sessions", () => {
  it("recognises a valid session and nothing else", async () => {
    const { session } = await signIn();
    expect(await (await call("/me", withSession(session))).json()).toEqual({ signedIn: true });
    expect(await (await call("/me", withSession("made-up"))).json()).toEqual({ signedIn: false });
    expect(await (await call("/me")).json()).toEqual({ signedIn: false });
  });

  it("ignores an expired session", async () => {
    const { session } = await signIn();
    await env.DB.prepare("UPDATE sessions SET expires_at = ?").bind(Date.now() - 1).run();
    expect(await (await call("/me", withSession(session))).json()).toEqual({ signedIn: false });
  });

  it("signs out only from the site's own origin", async () => {
    const { session } = await signIn();
    const foreign = await call(
      "/auth/sign-out",
      withSession(session, { method: "POST", headers: { Origin: "https://evil.example" } }),
    );
    expect(foreign.status).toBe(403);
    expect(await (await call("/me", withSession(session))).json()).toEqual({ signedIn: true });

    const own = await call("/auth/sign-out", withSession(session, { method: "POST", headers: { Origin: SITE } }));
    expect(own.status).toBe(204);
    expect(await (await call("/me", withSession(session))).json()).toEqual({ signedIn: false });
  });
});

describe("cross-origin access", () => {
  it("only allows the site's own origin to read responses", async () => {
    const own = await call("/me", { headers: { Origin: SITE } });
    expect(own.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
    const foreign = await call("/me", { headers: { Origin: "https://evil.example" } });
    expect(foreign.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("safeReturnPath", () => {
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "evil", "", null, "/a b"])(
    "falls back to the home page for %s",
    (value) => expect(safeReturnPath(value)).toBe("/"),
  );

  it("keeps paths on the site", () => {
    expect(safeReturnPath("/courses/toc/intro?x=1")).toBe("/courses/toc/intro?x=1");
  });
});
