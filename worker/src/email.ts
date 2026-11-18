/* Mail sent to the site's public addresses is forwarded to the maintainer's own inbox.
   Cloudflare Email Routing hands each message to this handler. The inbox itself is the
   FORWARD_TO secret, so it never appears in the repo. */

/** Keep in step with src/lib/contact.ts, which the site links to. */
export const ADDRESSES = ["hello@csdecod.ing", "help@csdecod.ing"];

export async function handleEmail(message: ForwardableEmailMessage, env: { FORWARD_TO: string }): Promise<void> {
  if (!ADDRESSES.includes(message.to.toLowerCase())) {
    message.setReject("No mailbox here.");
    return;
  }
  await message.forward(env.FORWARD_TO);
}
