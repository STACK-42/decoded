import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import mdx from "@mdx-js/rollup";
import type { Plugin } from "vite";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";

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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    mdxExceptRaw({
      providerImportSource: "@mdx-js/react",
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [
        rehypeKatex,
        // ids on headings, used by the lesson contents sidebar and deep links
        rehypeSlug,
        // Shiki highlighting at build time. Only fences with a language
        // (```java, ```ts) get colours; bare fences stay plain for pseudocode.
        [rehypePrettyCode, { theme: "github-dark-dimmed", keepBackground: false }],
      ],
    }),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
