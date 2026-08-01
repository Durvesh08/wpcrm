-- 031_conversation_pin_labels.sql — chat labels and pinned inbox chats

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chat_label TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_pinned_last_message
  ON conversations(account_id, is_pinned DESC, last_message_at DESC);
