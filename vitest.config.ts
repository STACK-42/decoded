import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import rehypeSlug from "rehype-slug";
import mdx from "@mdx-js/rollup";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  plugins: [
    {
      enforce: "pre" as const,
      ...mdx({
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeSlug, rehypeKatex],
      }),
    },
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
