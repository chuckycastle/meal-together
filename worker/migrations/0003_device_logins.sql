-- Sign-in for a device without a keyboard, such as the Apple TV app.
-- The device shows user_code as text and as a QR code; a signed-in person
-- approves it from a phone, and the device trades its secret for tokens.

CREATE TABLE device_logins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- SHA-256 of the secret the device polls with; the secret is never stored
  device_code_hash TEXT NOT NULL UNIQUE,
  user_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_device_logins_expires ON device_logins(expires_at);
