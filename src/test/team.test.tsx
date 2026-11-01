import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Team from "@/pages/Team";

describe("contributors page", () => {
  it("tells people where to go to join in", () => {
    render(
      <MemoryRouter>
        <Team />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Build a course →" }).getAttribute("href")).toContain("/docs/building-a-course.md");
    expect(screen.getByRole("link", { name: "See open issues →" }).getAttribute("href")).toContain("/decoded/issues");
  });
});
