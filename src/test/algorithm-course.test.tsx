import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { getCourse, flattenLessons } from "@/content/registry";
import { SortVisualizer, SearchVisualizer, GraphTraversal, MstVisualizer, KnapsackTable, EuclidVisualizer, GrowthTable } from "@/components/mdx/AlgoVisualizers";

beforeAll(() => {
  // ReactFlow (used by <Diagram>) needs ResizeObserver, which jsdom lacks.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("Algorithm Design & Analysis course", () => {
  const course = getCourse("algorithm-design-and-analysis")!;

  it("is registered and available", () => {
    expect(course).toBeDefined();
    expect(course.status).toBe("available");
    expect(flattenLessons(course).length).toBeGreaterThanOrEqual(10);
  });

  for (const lesson of flattenLessons(getCourse("algorithm-design-and-analysis")!)) {
    it(`renders lesson "${lesson.slug}" without throwing`, () => {
      const Lesson = lesson.Component;
      const { container, unmount } = render(<Lesson />);
      expect(container.querySelector("h1")?.textContent).toBe(lesson.title);
      unmount();
    });
  }

  it("never mentions source institutions or instructors", () => {
    const dir = path.resolve(__dirname, "../content/algorithm-design-and-analysis");
    const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
    const all = files.map((f) => readFileSync(path.join(dir, f), "utf8")).join("\n").toLowerCase();
    expect(files.length).toBe(flattenLessons(course).length);
    for (const banned of ["kufa", "uokufa", "lecturer", "faculty of", "haidary", "cslib"]) {
      expect(all).not.toContain(banned);
    }
  });
});

function stepToEnd(root: HTMLElement) {
  const step = within(root).getByRole("button", { name: /step/i });
  let guard = 0;
  while (!(step as HTMLButtonElement).disabled && guard++ < 2000) fireEvent.click(step);
  return guard;
}

describe("visualizers step all the way through", () => {
  it.each(["selection", "bubble", "insertion", "merge", "quick"] as const)("%s sort", (algo) => {
    const { container } = render(<SortVisualizer algorithm={algo} initial={[5, 2, 9, 1, 7]} />);
    stepToEnd(container);
    expect(screen.getByText(/^Sorted\./)).toBeDefined();
  });

  it("focus mode shows just the visualizer, takes keyboard controls and keeps the step", () => {
    const { container } = render(<SortVisualizer algorithm="insertion" initial={[5, 2, 9, 1, 7]} />);
    fireEvent.click(within(container).getByRole("button", { name: /focus mode/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Java")).toBeNull(); // code hidden by default
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(dialog.textContent).toMatch(/step\s*3\//i);
    fireEvent.keyDown(window, { key: "c" });
    expect(within(dialog).getByText("Java")).toBeDefined();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.textContent).toMatch(/step\s*3\//i);
  });

  it("binary search finds the target", () => {
    const { container } = render(<SearchVisualizer algorithm="binary" target={58} />);
    stepToEnd(container);
    expect(screen.getByText(/Found it/)).toBeDefined();
  });

  it("graph traversal toggles between BFS and DFS", () => {
    const { container } = render(<GraphTraversal />);
    stepToEnd(container);
    expect(screen.getByText(/level by level/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /DFS/ }));
    stepToEnd(container);
    expect(screen.getByText(/deep down one path/)).toBeDefined();
  });

  it("MST, knapsack, Euclid and growth table render their final state", () => {
    const mst = render(<MstVisualizer algorithm="kruskal" />);
    stepToEnd(mst.container);
    expect(screen.getByText(/Total weight = 13/)).toBeDefined();
    mst.unmount();

    const ks = render(<KnapsackTable />);
    stepToEnd(ks.container);
    expect(screen.getByText(/Total value 37/)).toBeDefined();
    ks.unmount();

    const eu = render(<EuclidVisualizer m={210} n={45} />);
    stepToEnd(eu.container);
    expect(screen.getByText(/= 15\. Took/)).toBeDefined();
    eu.unmount();

    render(<GrowthTable />);
    expect(screen.getByText("O(n log n)")).toBeDefined();
  });
});
