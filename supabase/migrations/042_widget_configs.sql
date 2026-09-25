CREATE TABLE IF NOT EXISTS widget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  greeting_text TEXT DEFAULT 'Hi! 👋 How can we help you?',
  prefilled_message TEXT DEFAULT 'Hi, I''m interested in your services',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  primary_color TEXT DEFAULT '#25D366',
  show_on_mobile BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE widget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "widget_configs_account_isolation" ON widget_configs
  USING (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));
