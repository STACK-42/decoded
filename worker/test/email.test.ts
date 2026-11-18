import { env as testEnv } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";

const env = testEnv as unknown as Env;

function message(to: string) {
  return { to, forward: vi.fn(async () => {}), setReject: vi.fn() } as unknown as ForwardableEmailMessage;
}

describe("email", () => {
  it.each(["hello@csdecod.ing", "help@csdecod.ing", "Help@CSDecod.ing"])("forwards %s to the inbox", async (to) => {
    const m = message(to);
    await worker.email!(m, env);
    expect(m.forward).toHaveBeenCalledWith("inbox@example.com");
    expect(m.setReject).not.toHaveBeenCalled();
  });

  it("rejects an address nobody uses", async () => {
    const m = message("anything@csdecod.ing");
    await worker.email!(m, env);
    expect(m.forward).not.toHaveBeenCalled();
    expect(m.setReject).toHaveBeenCalled();
  });
});
