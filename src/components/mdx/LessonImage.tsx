const WIDTHS = [480, 800, 1200, 1600];
const CLOUDINARY_UPLOAD = "/image/upload/";

/** Cloudinary resizes and converts through the URL, so each browser gets a size and format that suits it. */
function cloudinaryUrl(src: string, width: number) {
  return src.replace(CLOUDINARY_UPLOAD, `${CLOUDINARY_UPLOAD}f_auto,q_auto,w_${width}/`);
}

/**
 * A lesson image. `width` and `height` are the original's size: they reserve the
 * space up front, so the page doesn't jump when the image arrives.
 */
export function LessonImage({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  const sizes = [...WIDTHS.filter((w) => w < width), width];
  return (
    <img
      src={cloudinaryUrl(src, Math.min(width, 800))}
      srcSet={sizes.map((w) => `${cloudinaryUrl(src, w)} ${w}w`).join(", ")}
      sizes="(min-width: 768px) 680px, 100vw"
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      style={{ height: "auto" }}
    />
  );
}
