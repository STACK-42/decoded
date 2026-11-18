# Decoded API

The Cloudflare Worker and D1 database behind sign-in, saved progress, learner counts and public profiles. It runs at `https://api.csdecod.ing`. Pushing to GitHub doesn't deploy it.

## Deploying

```bash
npm run migrate        # apply new files in migrations/ to the live database
npx wrangler deploy    # then publish the Worker
```

> [!IMPORTANT]
> Run the migration first, then deploy the Worker, then push the site. A Worker that expects a table the database doesn't have yet breaks sign-in for everyone.

## Contact email

`hello@csdecod.ing` and `help@csdecod.ing` forward to the maintainer's own inbox. Cloudflare Email Routing hands each message to the Worker's `email` handler (`src/email.ts`), which forwards it, or rejects any other address. The inbox is a secret so it stays out of this public repo.

One-time setup, after the first deploy:

```bash
npx wrangler secret put FORWARD_TO     # type the inbox address
```

Then in the Cloudflare dashboard, under the csdecod.ing zone:

1. Email, Email Routing: turn it on and let it add the MX and SPF records.
2. Destination addresses: add the inbox and click the verification link Cloudflare sends there. Forwarding fails until that's done.
3. Routing rules: add a custom address for `hello` and another for `help`, each set to "Send to a Worker" and pointed at `decoded-api`.

To add or change an address, edit `ADDRESSES` in `src/email.ts` and `src/lib/contact.ts` in the site, add a matching routing rule, and deploy.

## Moderating profiles

People report a profile with the Report link on its page. Reports land in `profile_reports`, one per person per profile. To see the newest:

```bash
npx wrangler d1 execute decoded --remote --command \
  "SELECT handle, reason, COUNT(*) AS reports, MAX(created_at) AS latest
     FROM profile_reports GROUP BY profile_user_id, handle, reason ORDER BY latest DESC LIMIT 20"
```

To hide a profile, so its page and search results disappear while the person keeps their account and progress:

```bash
npx wrangler d1 execute decoded --remote --command "UPDATE profiles SET hidden = 1 WHERE handle = 'the_handle'"
```

To rename one instead, for example a handle that impersonates someone, pick a neutral replacement:

```bash
npx wrangler d1 execute decoded --remote --command "UPDATE profiles SET handle = 'learner_4821' WHERE handle = 'the_handle'"
```

Set `hidden = 0` to bring a profile back. The owner sees on their profile settings that it was hidden.

Handles are checked when they're chosen against the reserved names and blocked words in `src/profiles.ts`. Add to those lists when a report shows a gap.
