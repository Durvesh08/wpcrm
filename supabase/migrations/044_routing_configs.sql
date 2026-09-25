CREATE TABLE IF NOT EXISTS routing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'round_robin', 'load_balance')),
  skip_offline BOOLEAN DEFAULT true,
  reassign_on_reopen BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  last_assigned_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE routing_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routing_configs_account_isolation" ON routing_configs
  USING (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));
