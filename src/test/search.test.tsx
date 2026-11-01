import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchButton } from "@/components/SearchDialog";
import { buildDocs, searchLessons, type SearchDoc } from "@/lib/search";

const doc = (over: Partial<SearchDoc>): SearchDoc => ({
  course: "c",
  lesson: "l",
  courseTitle: "Course",
  title: "Title",
  headings: [],
  text: "",
  ...over,
});

describe("searchLessons", () => {
  it("returns nothing for an empty query", () => {
    expect(searchLessons("  ", [doc({})])).toEqual([]);
  });

  it("ranks title above heading above body, ignoring case", () => {
    const docs = [
      doc({ lesson: "body", text: "uses a Regex engine" }),
      doc({ lesson: "heading", headings: ["Regex in practice"] }),
      doc({ lesson: "title", title: "Regex Engines" }),
    ];
    expect(searchLessons("regex", docs).map((r) => r.doc.lesson)).toEqual(["title", "heading", "body"]);
  });

  it("needs every word, across any field", () => {
    const docs = [doc({ lesson: "both", title: "Paging", text: "virtual memory" }), doc({ lesson: "one", title: "Paging" })];
    expect(searchLessons("paging memory", docs).map((r) => r.doc.lesson)).toEqual(["both"]);
  });

  it("shows a snippet around the body match", () => {
    const text = `${"x ".repeat(100)}the needle sits here ${"y ".repeat(100)}`;
    const [{ snippet }] = searchLessons("needle", [doc({ text })]);
    expect(snippet).toContain("the needle sits here");
    expect(snippet!.startsWith("…")).toBe(true);
    expect(snippet!.length).toBeLessThan(170);
  });

  it("caps the number of results", () => {
    const docs = Array.from({ length: 30 }, (_, i) => doc({ lesson: `l${i}`, title: "same" }));
    expect(searchLessons("same", docs, 5)).toHaveLength(5);
  });
});

describe("buildDocs", () => {
  it("covers lessons by title even when the index hasn't loaded", () => {
    const docs = buildDocs();
    expect(docs.length).toBeGreaterThan(100);
    expect(searchLessons("abstraction gap", docs)[0].doc.lesson).toBe("intro");
  });

  it("adds body text from the index", () => {
    const docs = buildDocs([{ course: "theory-of-computation", lesson: "intro", headings: [], text: "zebrafish" }]);
    expect(searchLessons("zebrafish", docs)[0].doc.lesson).toBe("intro");
  });
});

describe("SearchButton", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens with a click or Cmd+K, and finds a lesson without the index", async () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    render(
      <MemoryRouter>
        <SearchButton />
      </MemoryRouter>,
    );
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = await screen.findByPlaceholderText(/Search lessons/);
    fireEvent.change(input, { target: { value: "abstraction gap" } });
    expect(await screen.findByText("The Abstraction Gap")).toBeTruthy();
  });
});
