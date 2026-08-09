-- 034_follow_up_reminders.sql — real follow-up records for Calendar + alerts

CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'follow_up' CHECK (kind IN ('follow_up', 'call', 'note')),
  title TEXT NOT NULL CHECK (char_length(title) <= 240),
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_account_due
  ON follow_up_reminders(account_id, due_at)
  WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_user_due
  ON follow_up_reminders(user_id, due_at)
  WHERE completed_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at ON follow_up_reminders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON follow_up_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follow_up_reminders_member_access ON follow_up_reminders;
CREATE POLICY follow_up_reminders_member_access ON follow_up_reminders
  FOR ALL USING (is_account_member(account_id))
  WITH CHECK (is_account_member(account_id));

-- Extend the existing notification enum-like constraint while preserving
-- already-created assignment notifications.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('conversation_assigned', 'follow_up_due'));
