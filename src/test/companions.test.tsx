import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CourseCompanions } from "@/components/Companions";
import { flattenLessons, getCourse } from "@/content/registry";
import { resetCompanionsForTests, sinceLabel } from "@/lib/companions";
import AcceptInvite from "@/pages/AcceptInvite";

vi.mock("@/hooks/useAccountStatus", async (importActual) => ({
  ...(await importActual<typeof import("@/hooks/useAccountStatus")>()),
  useAccountStatus: () => "signed-in",
}));
vi.mock("@/hooks/useRegistration", () => ({ useRegistration: () => ({ registered: true }) }));

const course = getCourse("logic-design")!;
const total = flattenLessons(course).length;

/** Answers each "METHOD /path" with a status and JSON body. */
function fakeApi(routes: Record<string, [number, unknown?]>) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(url);
    const [status, body] = routes[`${init?.method ?? "GET"} ${pathname}`] ?? [500];
    return body === undefined ? new Response(null, { status }) : Response.json(body, { status });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetCompanionsForTests();
});

describe("since labels", () => {
  it("count whole days back", () => {
    const now = new Date(2026, 10, 15, 9).getTime();
    expect(sinceLabel(new Date(2026, 10, 15, 1).getTime(), now)).toBe("today");
    expect(sinceLabel(new Date(2026, 10, 14, 23).getTime(), now)).toBe("yesterday");
    expect(sinceLabel(new Date(2026, 10, 12).getTime(), now)).toBe("3 days ago");
  });
});

describe("companions on the course page", () => {
  function renderPanel() {
    render(
      <MemoryRouter>
        <CourseCompanions course={course} />
      </MemoryRouter>,
    );
  }

  it("show each companion's progress and latest lesson", async () => {
    resetCompanionsForTests(true);
    fakeApi({
      "GET /companions": [200, { companions: [{ course: "logic-design", handle: "sara_k", avatarUrl: null, completed: 2, latest: { lesson: "signals", at: Date.now() } }] }],
    });
    renderPanel();
    const row = (await screen.findByText("@sara_k")).closest("li")!;
    expect(within(row).getByText(`2/${total} lessons`)).toBeTruthy();
    expect(within(row).getByText(/^Finished Signals.* today$/)).toBeTruthy();
  });

  it("make a one-time link, or say what's missing", async () => {
    resetCompanionsForTests(true);
    fakeApi({ "GET /companions": [200, { companions: [] }], "POST /companions/invites": [200, { token: "tok_123", expiresAt: 0 }] });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Study this with someone" }));
    expect(((await screen.findByLabelText("Send this link to one person")) as HTMLInputElement).value).toBe("https://decoded-go.stack42.tech/invite/tok_123");

    vi.unstubAllGlobals();
    fakeApi({ "POST /companions/invites": [403, { error: "needs_profile" }] });
    resetCompanionsForTests(true);
    render(
      <MemoryRouter>
        <CourseCompanions course={course} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Study this with someone" }).at(-1)!);
    expect(await screen.findByRole("link", { name: "Set up your profile" })).toBeTruthy();
  });

  it("let you remove a companion", async () => {
    resetCompanionsForTests(true);
    const fetch = fakeApi({
      "GET /companions": [200, { companions: [{ course: "logic-design", handle: "sara_k", avatarUrl: null, completed: 0, latest: null }] }],
      "POST /companions/remove": [204],
    });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("@sara_k")).toBeNull());
    expect(JSON.parse(fetch.mock.calls.at(-1)![1]!.body as string)).toEqual({ course: "logic-design", handle: "sara_k" });
  });
});

describe("accepting an invite", () => {
  function renderAt(token: string) {
    render(
      <MemoryRouter initialEntries={[`/invite/${token}`]}>
        <Routes>
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route path="/courses/:slug" element={<p>course page</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }
  const invite = { inviter: { handle: "sara_k", avatarUrl: null }, course: "logic-design", expiresAt: Date.now() + 1000 };

  it("names who sent it and opens the course once accepted", async () => {
    fakeApi({
      "GET /companions/invites/tok_1": [200, invite],
      "POST /companions/invites/tok_1/accept": [200, { course: "logic-design", companion: "sara_k" }],
      "GET /companions": [200, { companions: [] }],
    });
    renderAt("tok_1");
    expect(await screen.findByRole("heading", { name: /Study Logic Design together\?/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "@sara_k" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(await screen.findByText("course page")).toBeTruthy();
  });

  it("explains your own link and a dead one", async () => {
    fakeApi({ "GET /companions/invites/tok_1": [200, invite], "POST /companions/invites/tok_1/accept": [400, { error: "own_invite" }] });
    renderAt("tok_1");
    fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
    expect(await screen.findByText(/This is your own link/)).toBeTruthy();
  });

  it("says when a link no longer works", async () => {
    fakeApi({ "GET /companions/invites/tok_2": [404, { error: "not_found" }] });
    renderAt("tok_2");
    expect(await screen.findByText("This link doesn't work anymore.")).toBeTruthy();
  });
});
