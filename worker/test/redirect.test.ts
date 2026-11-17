import { describe, expect, it } from "vitest";
import worker from "../src/index";

const env = { SITE_ORIGIN: "https://csdecod.ing", SHARE_ORIGIN: "https://decoded-go.stack42.tech" } as never;

describe("old site domain", () => {
  it("redirects to the same path and query on the new domain", async () => {
    const response = await worker.fetch(new Request("https://decoded.stack42.tech/courses/logic-design/adders?x=1"), env);
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://csdecod.ing/courses/logic-design/adders?x=1");
  });
});
