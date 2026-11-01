import { Suspense } from "react";
import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { Lesson } from "@/content/registry";

// The first lesson pulls in every visualizer, which is slow to transform.
vi.setConfig({ testTimeout: 60_000 });

/** Renders a lazily loaded lesson and waits for its chunk to arrive. */
export async function renderLesson(lesson: Lesson) {
  const Component = lesson.Component;
  const result = render(
    <Suspense fallback={<div data-testid="loading" />}>
      <Component />
    </Suspense>,
  );
  await waitFor(() => expect(result.queryByTestId("loading")).toBeNull(), { timeout: 60_000 });
  return result;
}
