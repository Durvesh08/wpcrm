-- 037_managed_ai_translation_credits.sql — separate included translation allowance

CREATE TABLE IF NOT EXISTS public.ai_usage_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  managed_auto_reply_count integer NOT NULL DEFAULT 0 CHECK (managed_auto_reply_count >= 0),
  managed_copilot_count integer NOT NULL DEFAULT 0 CHECK (managed_copilot_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_credits
  ADD COLUMN IF NOT EXISTS managed_translation_count integer NOT NULL DEFAULT 0 CHECK (managed_translation_count >= 0);

ALTER TABLE public.ai_usage_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_usage_credits_select_own ON public.ai_usage_credits;
CREATE POLICY ai_usage_credits_select_own ON public.ai_usage_credits
  FOR SELECT USING (auth.uid() = user_id);

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
    WHEN 'translation' THEN 230
    ELSE NULL
  END;

  IF auth.role() <> 'service_role' AND target_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot claim credits for another user';
  END IF;

  IF expected_limit IS NULL OR credit_limit <> expected_limit THEN
    RAISE EXCEPTION 'Invalid managed AI credit claim';
  END IF;

  INSERT INTO ai_usage_credits (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF credit_kind = 'auto_reply' THEN
    UPDATE ai_usage_credits
      SET managed_auto_reply_count = managed_auto_reply_count + 1, updated_at = now()
      WHERE user_id = target_user_id AND managed_auto_reply_count < credit_limit
      RETURNING true INTO claim_succeeded;
  ELSIF credit_kind = 'translation' THEN
    UPDATE ai_usage_credits
      SET managed_translation_count = managed_translation_count + 1, updated_at = now()
      WHERE user_id = target_user_id AND managed_translation_count < credit_limit
      RETURNING true INTO claim_succeeded;
  ELSE
    UPDATE ai_usage_credits
      SET managed_copilot_count = managed_copilot_count + 1, updated_at = now()
      WHERE user_id = target_user_id AND managed_copilot_count < credit_limit
      RETURNING true INTO claim_succeeded;
  END IF;

  RETURN COALESCE(claim_succeeded, false);
END;
$$;

ALTER FUNCTION public.claim_managed_ai_credit(uuid, text, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.claim_managed_ai_credit(uuid, text, integer) TO authenticated, service_role;
