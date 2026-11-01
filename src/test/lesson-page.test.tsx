import { Suspense, lazy } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import LessonPage from "@/pages/LessonPage";

vi.setConfig({ testTimeout: 60_000 });

const COURSE = "theory-of-computation";
const LESSON = "language-of-languages";

function showLesson() {
  return render(
    <MemoryRouter initialEntries={[`/courses/${COURSE}/${LESSON}`]}>
      <Routes>
        <Route path="/courses/:courseSlug/:lessonSlug" element={<LessonPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.location.hash = "";
});

describe("LessonPage with a lazily loaded lesson", () => {
  it("shows a loading state, then the lesson, and fills the contents sidebar", async () => {
    showLesson();
    expect(screen.getByRole("status", { name: "Loading lesson" })).toBeTruthy();
    await waitFor(() => expect(document.querySelector(".prose-reading h1")).toBeTruthy(), { timeout: 60_000 });
    expect(screen.queryByRole("status", { name: "Loading lesson" })).toBeNull();
    await screen.findByText("Lesson contents");
  });

  it("scrolls to a #section link once the lesson has loaded", async () => {
    window.location.hash = "#concatenation";
    showLesson();
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled(), { timeout: 60_000 });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe("ChunkErrorBoundary", () => {
  it("offers a reload when a chunk fails, as it can after a deploy", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Missing = lazy(() => Promise.reject(new TypeError("Failed to fetch dynamically imported module")));
    render(
      <ChunkErrorBoundary>
        <Suspense fallback={null}>
          <Missing />
        </Suspense>
      </ChunkErrorBoundary>,
    );
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
  });
});
