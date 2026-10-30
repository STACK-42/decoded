/**
 * Scrolls to a lesson heading and keeps it there while images and fonts above
 * it finish loading and push it down. Stops as soon as the reader scrolls.
 * Returns a function that stops it early.
 */
export function scrollToSection(id: string, root: ParentNode = document) {
  const target = document.getElementById(id);
  if (!target) return () => {};
  target.scrollIntoView();

  let active = true;
  const rescroll = () => {
    if (active) target.scrollIntoView();
  };
  const images = Array.from(root.querySelectorAll("img")).filter((img) => !img.complete);
  const stop = () => {
    active = false;
    images.forEach((img) => img.removeEventListener("load", rescroll));
    userInput.forEach((name) => window.removeEventListener(name, stop));
  };
  const userInput = ["wheel", "touchstart", "keydown", "mousedown"];

  images.forEach((img) => img.addEventListener("load", rescroll));
  userInput.forEach((name) => window.addEventListener(name, stop, { passive: true }));
  void document.fonts?.ready.then(rescroll);
  return stop;
}
