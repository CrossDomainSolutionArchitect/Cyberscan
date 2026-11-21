-- PAY-001: Paystack billing foundation. Schema only; no production migration applied.
-- Prices are ZAR minor units. Never trust a price sent by the browser.
CREATE TABLE billing_plans (
  code TEXT PRIMARY KEY NOT NULL CHECK (code IN ('basic','pro','enterprise')),
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL DEFAULT 'ZAR' CHECK (currency = 'ZAR'),
  interval TEXT NOT NULL DEFAULT 'monthly' CHECK (interval = 'monthly'),
  scans_per_period INTEGER NOT NULL CHECK (scans_per_period > 0),
  paystack_plan_code TEXT UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Paystack's amount unit for ZAR is cents; retain a generic minor-unit column.
INSERT INTO billing_plans (code,amount_kobo,scans_per_period) VALUES
  ('basic',4000,30),
  ('pro',7000,100),
  ('enterprise',20000,500);

CREATE TABLE billing_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id),
  plan_code TEXT NOT NULL REFERENCES billing_plans(code),
  provider TEXT NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  provider_customer_code TEXT,
  provider_subscription_code TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending','active','past_due','cancelled','expired')),
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (current_period_end IS NULL OR current_period_start IS NOT NULL)
);
CREATE INDEX billing_subscriptions_user_status ON billing_subscriptions(clerk_user_id,status);

CREATE TABLE billing_transactions (
  reference TEXT PRIMARY KEY NOT NULL,
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id),
  subscription_id TEXT REFERENCES billing_subscriptions(id),
  plan_code TEXT NOT NULL REFERENCES billing_plans(code),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL CHECK (currency = 'ZAR'),
  status TEXT NOT NULL CHECK (status IN ('initialized','success','failed','refunded','disputed')),
  provider_transaction_id TEXT UNIQUE,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX billing_transactions_user_status ON billing_transactions(clerk_user_id,status);

-- Idempotency: event ID or stable event fingerprint must be determined
-- from a verified provider payload before writing.
CREATE TABLE billing_webhook_events (
  event_key TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
