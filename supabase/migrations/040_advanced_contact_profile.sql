-- Advanced CRM contact profile fields for lead qualification and ownership.
-- Safe to run more than once.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_stage text NOT NULL DEFAULT 'new_lead',
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS requirement text,
  ADD COLUMN IF NOT EXISTS problem text,
  ADD COLUMN IF NOT EXISTS desired_outcome text,
  ADD COLUMN IF NOT EXISTS budget text,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS decision_maker text,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversation_summary text;

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_lead_score_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_lead_score_check
  CHECK (lead_score >= 0 AND lead_score <= 100);

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_lead_stage_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_lead_stage_check
  CHECK (
    lead_stage IN (
      'new_lead',
      'cold',
      'warm',
      'hot',
      'qualified',
      'sales_ready',
      'customer'
    )
  );

CREATE INDEX IF NOT EXISTS idx_contacts_account_lead_stage
  ON public.contacts(account_id, lead_stage);

CREATE INDEX IF NOT EXISTS idx_contacts_account_lead_score
  ON public.contacts(account_id, lead_score DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_user
  ON public.contacts(assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up
  ON public.contacts(account_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;
