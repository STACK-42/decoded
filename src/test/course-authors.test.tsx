import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CoursePage from "@/pages/CoursePage";
import { courses } from "@/content/registry";

function renderCourse(slug: string) {
  render(
    <MemoryRouter initialEntries={[`/courses/${slug}`]}>
      <Routes>
        <Route path="/courses/:courseSlug" element={<CoursePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("course authors", () => {
  it("credits someone on every available course", () => {
    const uncredited = courses.filter((c) => c.status === "available" && !c.authors?.length);
    expect(uncredited.map((c) => c.slug)).toEqual([]);
  });

  it("links each author from the course page", () => {
    renderCourse("advanced-algorithms");
    const section = screen.getByText("Authored by").parentElement;
    const link = within(section).getByRole("link", { name: "Asmaa Farouq" });
    expect(link.getAttribute("href")).toBe("https://github.com/Asmaa6777");
  });

  it("leaves the section out when a course has no authors", () => {
    renderCourse("distributed-systems");
    expect(screen.queryByText("Authored by")).toBeNull();
  });
});
