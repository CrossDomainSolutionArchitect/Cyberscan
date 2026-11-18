ALTER TABLE scan_requests ADD COLUMN request_key TEXT;
ALTER TABLE scan_requests ADD COLUMN fingerprint TEXT;
ALTER TABLE scan_requests ADD COLUMN outcome TEXT;
CREATE UNIQUE INDEX scan_requests_idempotency ON scan_requests(clerk_user_id,request_key) WHERE request_key IS NOT NULL AND status IN ('reserved','completed');
CREATE INDEX scan_requests_key_history ON scan_requests(clerk_user_id,request_key);
