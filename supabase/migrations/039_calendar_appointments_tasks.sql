-- 039_calendar_appointments_tasks.sql — upgrade calendar into task/appointment system

ALTER TABLE public.follow_up_reminders
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meeting_location text,
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_notes text;

ALTER TABLE public.follow_up_reminders DROP CONSTRAINT IF EXISTS follow_up_reminders_kind_check;
ALTER TABLE public.follow_up_reminders ADD CONSTRAINT follow_up_reminders_kind_check
  CHECK (kind IN ('follow_up', 'call', 'whatsapp', 'meeting', 'note'));

ALTER TABLE public.follow_up_reminders DROP CONSTRAINT IF EXISTS follow_up_reminders_status_check;
ALTER TABLE public.follow_up_reminders ADD CONSTRAINT follow_up_reminders_status_check
  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show'));

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_account_status_due
  ON public.follow_up_reminders(account_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_assigned_due
  ON public.follow_up_reminders(assigned_user_id, due_at)
  WHERE status = 'scheduled';

UPDATE public.follow_up_reminders
SET
  status = CASE
    WHEN completed_at IS NOT NULL THEN 'completed'
    ELSE status
  END,
  assigned_user_id = COALESCE(assigned_user_id, user_id)
WHERE assigned_user_id IS NULL OR completed_at IS NOT NULL;
