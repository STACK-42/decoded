import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrollToSection } from "@/lib/scrollToSection";

let scroll: ReturnType<typeof vi.fn<() => void>>;
let image: HTMLImageElement;

beforeEach(() => {
  scroll = vi.fn<() => void>();
  Element.prototype.scrollIntoView = scroll;
  document.body.innerHTML = `<img id="pic" /><h2 id="section">Section</h2>`;
  image = document.getElementById("pic") as HTMLImageElement;
  Object.defineProperty(image, "complete", { value: false });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scrollToSection", () => {
  it("does nothing for a missing heading", () => {
    scrollToSection("missing");
    expect(scroll).not.toHaveBeenCalled();
  });

  it("scrolls again when an image above finishes loading", () => {
    const stop = scrollToSection("section");
    expect(scroll).toHaveBeenCalledTimes(1);
    image.dispatchEvent(new Event("load"));
    expect(scroll).toHaveBeenCalledTimes(2);
    stop();
  });

  it("stops once the reader scrolls", () => {
    scrollToSection("section");
    window.dispatchEvent(new Event("wheel"));
    image.dispatchEvent(new Event("load"));
    expect(scroll).toHaveBeenCalledTimes(1);
  });
});
