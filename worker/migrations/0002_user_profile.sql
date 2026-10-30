-- Shown in the site's account menu; refreshed from GitHub at each sign-in.
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
