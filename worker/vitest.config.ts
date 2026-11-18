import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        bindings: {
          GITHUB_CLIENT_ID: "test-client-id",
          GITHUB_CLIENT_SECRET: "test-client-secret",
          GOOGLE_CLIENT_ID: "test-google-id",
          GOOGLE_CLIENT_SECRET: "test-google-secret",
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
        },
      },
    }),
  ],
}));
