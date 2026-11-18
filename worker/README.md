# Decoded API

The Cloudflare Worker and D1 database behind sign-in, saved progress, learner counts and public profiles. It runs at `https://api.csdecod.ing`. Pushing to GitHub doesn't deploy it.

## Deploying

```bash
npm run migrate        # apply new files in migrations/ to the live database
npx wrangler deploy    # then publish the Worker
```

> [!IMPORTANT]
> Run the migration first, then deploy the Worker, then push the site. A Worker that expects a table the database doesn't have yet breaks sign-in for everyone.

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
