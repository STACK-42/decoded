import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import rehypeSlug from "rehype-slug";
import mdx from "@mdx-js/rollup";
import type { Plugin } from "vite";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

/** The MDX compiler, except for `?raw` imports: those load a lesson's source text
 *  (for link previews), and @mdx-js/rollup would otherwise strip the query and compile it. */
function mdxExceptRaw(options: Parameters<typeof mdx>[0]): Plugin {
  const plugin = mdx(options) as Plugin;
  const transform = plugin.transform as (this: unknown, code: string, id: string) => ReturnType<Extract<Plugin["transform"], (...a: never[]) => unknown>>;
  return {
    ...plugin,
    enforce: "pre",
    transform(code, id) {
      return id.includes("?raw") ? undefined : transform.call(this, code, id);
    },
  };
}

export default defineConfig({
  plugins: [
    mdxExceptRaw({
      providerImportSource: "@mdx-js/react",
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeSlug, rehypeKatex],
    }),
    react(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
