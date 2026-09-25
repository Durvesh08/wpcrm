CREATE TABLE IF NOT EXISTS payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe')),
  api_key_id TEXT NOT NULL,
  api_key_secret TEXT NOT NULL,
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, provider)
);

ALTER TABLE payment_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_configs_account_isolation" ON payment_configs
  USING (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe')),
  provider_link_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'expired', 'cancelled')),
  payment_url TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_links_account_isolation" ON payment_links
  USING (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_payment_links_conversation ON payment_links(conversation_id);
CREATE INDEX idx_payment_links_contact ON payment_links(contact_id);
