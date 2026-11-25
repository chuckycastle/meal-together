-- A family can accept requests to join from accounts that have no family.
-- An owner or admin approves or declines each request.

ALTER TABLE families ADD COLUMN accepts_join_requests INTEGER NOT NULL DEFAULT 0;

CREATE TABLE join_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  decided_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- One open request per person and family
CREATE UNIQUE INDEX idx_join_requests_pending ON join_requests(family_id, user_id) WHERE status = 'pending';
CREATE INDEX idx_join_requests_family ON join_requests(family_id, status);
CREATE INDEX idx_join_requests_user ON join_requests(user_id);
