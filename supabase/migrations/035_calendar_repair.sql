-- 035_calendar_repair.sql
-- Safe, repeatable repair for projects where migration 034 was not applied
-- through the Supabase SQL editor before the CRM deployment went live.

CREATE TABLE IF NOT EXISTS public.follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'follow_up' CHECK (kind IN ('follow_up', 'call', 'note')),
  title TEXT NOT NULL CHECK (char_length(title) <= 240),
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.follow_up_reminders
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'follow_up';

ALTER TABLE public.follow_up_reminders DROP CONSTRAINT IF EXISTS follow_up_reminders_kind_check;
ALTER TABLE public.follow_up_reminders ADD CONSTRAINT follow_up_reminders_kind_check
  CHECK (kind IN ('follow_up', 'call', 'note'));

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_account_due
  ON public.follow_up_reminders(account_id, due_at)
  WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_user_due
  ON public.follow_up_reminders(user_id, due_at)
  WHERE completed_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at ON public.follow_up_reminders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.follow_up_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follow_up_reminders_member_access ON public.follow_up_reminders;
CREATE POLICY follow_up_reminders_member_access ON public.follow_up_reminders
  FOR ALL USING (public.is_account_member(account_id))
  WITH CHECK (public.is_account_member(account_id, 'agent'));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('conversation_assigned', 'follow_up_due'));
