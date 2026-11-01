import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readLastLesson, readProgress, writeLastLesson, writeProgress } from "@/lib/progressStore";
import { deleteAccount, diffProgress, getAccountStatus, queueProgressChange, resetProgressSyncForTests, signOut, syncProgress } from "@/lib/progressSync";

/** A tiny stand-in for the API, holding one account's progress. */
function fakeApi(account: Record<string, string[]> | null) {
  const posts: { add: string[][]; remove: string[][] }[] = [];
  const state = { account, online: true };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!state.online) throw new TypeError("offline");
      if (url.endsWith("/auth/sign-out") || url.endsWith("/account/delete")) return new Response(null, { status: 204 });
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        posts.push(body);
        const next = Object.fromEntries(Object.entries(state.account).map(([c, l]) => [c, new Set(l)]));
        for (const [c, l] of body.remove) next[c]?.delete(l);
        for (const [c, l] of body.add) (next[c] ??= new Set()).add(l);
        state.account = Object.fromEntries(Object.entries(next).map(([c, l]) => [c, [...l]]));
        return Response.json({ progress: state.account });
      }
      return Response.json(state.account ? { signedIn: true, progress: state.account } : { signedIn: false });
    }),
  );
  return { posts, state };
}

function sorted(map: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(map).map(([c, l]) => [c, [...l].sort()]).filter(([, l]) => l.length));
}

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  resetProgressSyncForTests();
});

afterEach(() => vi.unstubAllGlobals());

describe("diffProgress", () => {
  it("finds additions and removals across courses", () => {
    expect(diffProgress({ a: ["x", "y"], b: ["z"] }, { a: ["y", "w"] })).toEqual({ "a/x": false, "a/w": true, "b/z": false });
  });
});

describe("signed-out visitors", () => {
  it("leaves local progress alone and sends nothing", async () => {
    const { posts } = fakeApi(null);
    writeProgress({ toc: ["intro"] });
    await syncProgress();
    queueProgressChange({ toc: ["intro"] }, { toc: ["intro", "dfa"] });
    expect(getAccountStatus()).toBe("signed-out");
    expect(readProgress()).toEqual({ toc: ["intro"] });
    expect(posts).toEqual([]);
  });

  it("shows no sign-in option when the API can't be reached", async () => {
    fakeApi(null).state.online = false;
    writeProgress({ toc: ["intro"] });
    await syncProgress();
    expect(getAccountStatus()).toBe("unavailable");
    expect(readProgress()).toEqual({ toc: ["intro"] });
  });
});

describe("first sign-in on a browser", () => {
  it("merges both sides so neither loses a lesson", async () => {
    const { state } = fakeApi({ toc: ["from-account"], os: ["threads"] });
    writeProgress({ toc: ["from-device"] });
    await syncProgress();
    const expected = { toc: ["from-account", "from-device"], os: ["threads"] };
    expect(sorted(readProgress())).toEqual(expected);
    expect(sorted(state.account)).toEqual(expected);
  });

  it("takes the account's progress on a browser with none", async () => {
    fakeApi({ toc: ["intro"] });
    await syncProgress();
    expect(readProgress()).toEqual({ toc: ["intro"] });
  });
});

describe("later visits", () => {
  it("doesn't bring back a lesson unmarked on another device", async () => {
    const { state, posts } = fakeApi({ toc: ["intro", "dfa"] });
    await syncProgress();
    state.account = { toc: ["intro"] };
    posts.length = 0;
    await syncProgress();
    expect(readProgress()).toEqual({ toc: ["intro"] });
    expect(posts).toEqual([]);
  });

  it("sends a change straight away", async () => {
    const { state } = fakeApi({ toc: ["intro"] });
    await syncProgress();
    writeProgress({ toc: ["intro", "dfa"] });
    queueProgressChange({ toc: ["intro"] }, { toc: ["intro", "dfa"] });
    await vi.waitFor(() => expect(sorted(state.account)).toEqual({ toc: ["dfa", "intro"] }));
  });
});

describe("offline changes", () => {
  it("keeps them queued and sends them on the next visit", async () => {
    const api = fakeApi({ toc: ["intro"] });
    await syncProgress();
    api.state.online = false;
    writeProgress({ toc: ["intro", "dfa"] });
    queueProgressChange({ toc: ["intro"] }, { toc: ["intro", "dfa"] });
    await vi.waitFor(() => expect(localStorage.getItem("decoded:account:v1")).toContain("toc/dfa"));

    resetProgressSyncForTests();
    api.state.online = true;
    await syncProgress();
    expect(sorted(api.state.account)).toEqual({ toc: ["dfa", "intro"] });
    expect(sorted(readProgress())).toEqual({ toc: ["dfa", "intro"] });
  });

  it("keeps the local copy when the account is unreachable", async () => {
    const api = fakeApi({ toc: ["intro"] });
    await syncProgress();
    writeProgress({ toc: ["intro", "dfa"] });
    api.state.online = false;
    await syncProgress();
    expect(readProgress()).toEqual({ toc: ["intro", "dfa"] });
  });
});

describe("signing out", () => {
  it("clears this browser so the next person's account can't absorb it", async () => {
    const api = fakeApi({ toc: ["alice-lesson"] });
    await syncProgress();
    await signOut();
    expect(getAccountStatus()).toBe("signed-out");
    expect(readProgress()).toEqual({});

    api.state.account = { toc: ["bob-lesson"] };
    await syncProgress();
    expect(readProgress()).toEqual({ toc: ["bob-lesson"] });
    expect(api.state.account).toEqual({ toc: ["bob-lesson"] });
  });

  it("forgets the last lesson, so the next person isn't sent back to it", async () => {
    fakeApi({ toc: ["intro"] });
    await syncProgress();
    writeLastLesson({ course: "toc", lesson: "intro" });
    await signOut();
    expect(readLastLesson()).toBeNull();
  });

  it("refuses while changes can't be saved, and keeps them", async () => {
    const api = fakeApi({ toc: ["intro"] });
    await syncProgress();
    api.state.online = false;
    writeProgress({ toc: ["intro", "dfa"] });
    queueProgressChange({ toc: ["intro"] }, { toc: ["intro", "dfa"] });
    await expect(signOut()).rejects.toThrow();
    expect(readProgress()).toEqual({ toc: ["intro", "dfa"] });
    expect(getAccountStatus()).toBe("signed-in");
  });
});

describe("deleting the account", () => {
  it("clears this browser's copy and returns to signed out", async () => {
    fakeApi({ toc: ["intro"] });
    await syncProgress();
    await deleteAccount();
    expect(getAccountStatus()).toBe("signed-out");
    expect(readProgress()).toEqual({});
  });

  it("keeps everything when the request fails", async () => {
    const api = fakeApi({ toc: ["intro"] });
    await syncProgress();
    api.state.online = false;
    await expect(deleteAccount()).rejects.toThrow();
    expect(getAccountStatus()).toBe("signed-in");
    expect(readProgress()).toEqual({ toc: ["intro"] });
  });
});
