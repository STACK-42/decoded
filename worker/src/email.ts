/* Mail sent to the site's addresses is forwarded to a real inbox. Cloudflare Email Routing
   hands each message to this handler. The inboxes are Worker secrets, so they never appear
   in this public repo. Keep the shared addresses in step with src/lib/contact.ts. */

export interface EmailEnv {
  /** Inbox for hello@, help@ and ahmed@. */
  FORWARD_TO: string;
  /** Inbox for asmaa@. */
  FORWARD_TO_ASMAA: string;
}

/** Each address and the secret holding the inbox it forwards to. */
export const ADDRESSES: Record<string, keyof EmailEnv> = {
  "hello@csdecod.ing": "FORWARD_TO",
  "help@csdecod.ing": "FORWARD_TO",
  "ahmed@csdecod.ing": "FORWARD_TO",
  "asmaa@csdecod.ing": "FORWARD_TO_ASMAA",
};

export async function handleEmail(message: ForwardableEmailMessage, env: EmailEnv): Promise<void> {
  const secret = ADDRESSES[message.to.toLowerCase()];
  if (!secret) {
    message.setReject("No mailbox here.");
    return;
  }
  await message.forward(env[secret]);
}
