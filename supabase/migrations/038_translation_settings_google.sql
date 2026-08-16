-- 038_translation_settings_google.sql — Google Translation settings
--
-- Translation is no longer part of the managed AI credit pipeline. It uses
-- Google Cloud Translation via GOOGLE_TRANSLATE_API_KEY and stores only the
-- workspace preference here.

CREATE TABLE IF NOT EXISTS public.translation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  target_language text NOT NULL DEFAULT 'English',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.translation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS translation_settings_select ON public.translation_settings;
CREATE POLICY translation_settings_select ON public.translation_settings
  FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS translation_settings_insert ON public.translation_settings;
CREATE POLICY translation_settings_insert ON public.translation_settings
  FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS translation_settings_update ON public.translation_settings;
CREATE POLICY translation_settings_update ON public.translation_settings
  FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS translation_settings_updated_at ON public.translation_settings;
CREATE TRIGGER translation_settings_updated_at
  BEFORE UPDATE ON public.translation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Remove translation from the managed AI credit function. Existing usage
-- counters can remain in older databases, but nothing should claim them.
CREATE OR REPLACE FUNCTION public.claim_managed_ai_credit(
  target_user_id uuid,
  credit_kind text,
  credit_limit integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim_succeeded boolean := false;
  expected_limit integer;
BEGIN
  expected_limit := CASE credit_kind
    WHEN 'auto_reply' THEN 1000
    WHEN 'copilot' THEN 50
    ELSE NULL
  END;

  IF auth.role() <> 'service_role' AND target_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot claim credits for another user';
  END IF;

  IF expected_limit IS NULL OR credit_limit <> expected_limit THEN
    RAISE EXCEPTION 'Invalid managed AI credit claim';
  END IF;

  INSERT INTO public.ai_usage_credits (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF credit_kind = 'auto_reply' THEN
    UPDATE public.ai_usage_credits
      SET managed_auto_reply_count = managed_auto_reply_count + 1, updated_at = now()
      WHERE user_id = target_user_id AND managed_auto_reply_count < credit_limit
      RETURNING true INTO claim_succeeded;
  ELSE
    UPDATE public.ai_usage_credits
      SET managed_copilot_count = managed_copilot_count + 1, updated_at = now()
      WHERE user_id = target_user_id AND managed_copilot_count < credit_limit
      RETURNING true INTO claim_succeeded;
  END IF;

  RETURN COALESCE(claim_succeeded, false);
END;
$$;

ALTER FUNCTION public.claim_managed_ai_credit(uuid, text, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.claim_managed_ai_credit(uuid, text, integer) TO authenticated, service_role;
