-- 029_mobile_push_tokens.sql — device tokens for native app notifications

CREATE TABLE IF NOT EXISTS app_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_push_tokens_account
  ON app_push_tokens(account_id);

CREATE INDEX IF NOT EXISTS idx_app_push_tokens_user
  ON app_push_tokens(user_id);

DROP TRIGGER IF EXISTS set_updated_at ON app_push_tokens;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE app_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_push_tokens_select_own ON app_push_tokens;
CREATE POLICY app_push_tokens_select_own ON app_push_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS app_push_tokens_insert_own ON app_push_tokens;
CREATE POLICY app_push_tokens_insert_own ON app_push_tokens
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND is_account_member(account_id)
  );

DROP POLICY IF EXISTS app_push_tokens_update_own ON app_push_tokens;
CREATE POLICY app_push_tokens_update_own ON app_push_tokens
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_account_member(account_id)
  );

DROP POLICY IF EXISTS app_push_tokens_delete_own ON app_push_tokens;
CREATE POLICY app_push_tokens_delete_own ON app_push_tokens
  FOR DELETE USING (auth.uid() = user_id);
