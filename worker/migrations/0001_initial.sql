-- Accounts hold no email or password: a sign-in provider's user ID is enough.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TABLE identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (provider, provider_user_id)
) WITHOUT ROWID;

CREATE INDEX identities_user_id ON identities(user_id);

-- Only the SHA-256 of a session token is stored, so a leaked table can't sign anyone in.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX sessions_user_id ON sessions(user_id);
CREATE INDEX sessions_expires_at ON sessions(expires_at);

CREATE TABLE progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  lesson TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course, lesson)
) WITHOUT ROWID;
