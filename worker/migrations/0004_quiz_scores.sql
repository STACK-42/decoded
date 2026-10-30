-- The best attempt at each quiz.
CREATE TABLE quiz_scores (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  lesson TEXT NOT NULL,
  best INTEGER NOT NULL,
  total INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course, lesson)
) WITHOUT ROWID;
