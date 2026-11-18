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
    expect(screen.getByRole("link", { name: /Ahmed Alghali/ }).getAttribute("href")).toBe("https://github.com/a7med7x7");
    expect(screen.getByRole("link", { name: /Asmaa Farouq/ }).getAttribute("href")).toBe("https://github.com/Asmaa6777");
  });

  it("shows contributors' csdecod.ing addresses and the contact addresses", () => {
    render(
      <MemoryRouter>
        <Team />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "ahmed@csdecod.ing" }).getAttribute("href")).toBe("mailto:ahmed@csdecod.ing");
    expect(screen.getByRole("link", { name: "asmaa@csdecod.ing" }).getAttribute("href")).toBe("mailto:asmaa@csdecod.ing");
    expect(screen.getByRole("link", { name: /hello@csdecod.ing/ }).getAttribute("href")).toBe("mailto:hello@csdecod.ing");
    expect(screen.getByRole("link", { name: /help@csdecod.ing/ }).getAttribute("href")).toBe("mailto:help@csdecod.ing");
    expect(screen.getByRole("link", { name: "Ask for your address →" }).getAttribute("href")).toContain("mailto:hello@csdecod.ing");
  });
});
