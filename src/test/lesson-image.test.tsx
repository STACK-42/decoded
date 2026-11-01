import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonImage } from "@/components/mdx/LessonImage";

const SRC = "https://res.cloudinary.com/demo/image/upload/v1/pic.jpg";

describe("LessonImage", () => {
  it("reserves its space and loads lazily", () => {
    render(<LessonImage src={SRC} alt="A curve" width={1000} height={500} />);
    const img = screen.getByAltText("A curve");
    expect(img.getAttribute("width")).toBe("1000");
    expect(img.getAttribute("height")).toBe("500");
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("offers sizes up to the original's width, without upscaling", () => {
    render(<LessonImage src={SRC} alt="A curve" width={1000} height={500} />);
    const srcSet = screen.getByAltText("A curve").getAttribute("srcset")!;
    expect(srcSet.match(/\d+w/g)).toEqual(["480w", "800w", "1000w"]);
    expect(srcSet).toContain("/image/upload/f_auto,q_auto,w_480/v1/pic.jpg 480w");
  });

  it("never asks for more than the original as a default", () => {
    render(<LessonImage src={SRC} alt="Small" width={600} height={300} />);
    expect(screen.getByAltText("Small").getAttribute("src")).toContain("w_600/");
  });
});
