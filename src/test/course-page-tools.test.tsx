import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import CoursePage from "@/pages/CoursePage";
import { PracticalApplication } from "@/components/mdx/MdxComponents";

describe("CoursePage tools section", () => {
  it("renders tools decoded in course for computer-networks", () => {
    render(
      <MemoryRouter initialEntries={["/courses/computer-networks"]}>
        <Routes>
          <Route path="/courses/:courseSlug" element={<CoursePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Tools Decoded in this Course")).toBeTruthy();
    expect(screen.getByText("ping, traceroute and Wireshark")).toBeTruthy();
    expect(screen.getAllByText("Wireshark").length).toBeGreaterThan(0);
  });

  it("renders PracticalApplication with authentic tool icon", () => {
    const { container } = render(
      <PracticalApplication title="Permissions and flags" tool="LINUX · CHMOD">
        <p>File modes in Unix</p>
      </PracticalApplication>,
    );

    expect(screen.getByText("Permissions and flags")).toBeTruthy();
    expect(screen.getByText("LINUX · CHMOD")).toBeTruthy();
    // Expect SVG icon rendered inside the badge
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders PracticalApplication with reading icon for further reading", () => {
    const { container } = render(
      <PracticalApplication title="Rabin-Scott paper" tool="Read →">
        <p>Finite Automata and Decision Problems</p>
      </PracticalApplication>,
    );

    expect(screen.getByText("Rabin-Scott paper")).toBeTruthy();
    expect(screen.getByText("Read →")).toBeTruthy();
    const lucideSvg = container.querySelector("svg.lucide-book-open");
    expect(lucideSvg).toBeTruthy();
  });

  it("renders PracticalApplication with video icon for video links", () => {
    const { container } = render(
      <PracticalApplication title="Physiological Sighing" tool="Watch Video →">
        <p>Virtusan video</p>
      </PracticalApplication>,
    );

    expect(screen.getByText("Physiological Sighing")).toBeTruthy();
    expect(screen.getByText("Watch Video →")).toBeTruthy();
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
