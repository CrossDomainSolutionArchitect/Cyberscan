-- Customer identity is the verified Clerk subject, never a browser-supplied ID.
CREATE TABLE users (
  clerk_user_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE scan_requests (
  id TEXT PRIMARY KEY NOT NULL,
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id),
  scan_type TEXT NOT NULL CHECK (scan_type = 'url'),
  status TEXT NOT NULL CHECK (status IN ('reserved','completed','failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX scan_requests_user_status ON scan_requests(clerk_user_id,status);
