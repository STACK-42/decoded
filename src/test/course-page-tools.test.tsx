import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import CoursePage from "@/pages/CoursePage";
import { PracticalApplication } from "@/components/mdx/MdxComponents";
import { courseToolBadges } from "@/components/tools/courseToolBadges";

describe("CoursePage tools", () => {
  it("shows the course's tools as linked icons in the header, not as cards below", () => {
    render(
      <MemoryRouter initialEntries={["/courses/computer-networks"]}>
        <Routes>
          <Route path="/courses/:courseSlug" element={<CoursePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Tools Decoded in this Course")).toBeNull();
    const row = screen.getByRole("list", { name: "Tools this course explains" });
    const wireshark = within(row).getByRole("link", { name: "Wireshark" });
    expect(wireshark.getAttribute("href")).toBe("/tools#ping-traceroute-and-wireshark");
    expect(wireshark.querySelector("svg")).toBeTruthy();
  });

  it("lists each product once even when two tool groups share it", () => {
    const labels = courseToolBadges("computer-networks").map((b) => b.badge.label);
    expect(new Set(labels).size).toBe(labels.length);
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
