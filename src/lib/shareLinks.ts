/* Links meant to be pasted into chats point at the Worker's share domain,
   which gives each profile and invite its own link preview and then sends
   people on to the page here (worker/src/share.ts). */

import { toast } from "sonner";

export const SHARE_ORIGIN = import.meta.env.VITE_SHARE_URL ?? "https://decoded-go.stack42.tech";

export const profileShareUrl = (handle: string) => `${SHARE_ORIGIN}/u/${handle}`;
export const inviteShareUrl = (token: string) => `${SHARE_ORIGIN}/invite/${token}`;

export async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy it", { description: url });
  }
}
