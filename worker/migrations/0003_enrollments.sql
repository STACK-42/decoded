CREATE TABLE enrollments (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  enrolled_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course)
) WITHOUT ROWID;
