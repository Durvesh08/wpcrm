-- 032_ai_gemini_provider.sql — allow Google Gemini as an AI provider
--
-- Earlier installs constrained ai_configs.provider to OpenAI/Anthropic.
-- The app now supports Google Gemini for chat generation, playground,
-- draft replies, and auto-reply, so widen the constraint in place.

ALTER TABLE ai_configs
  DROP CONSTRAINT IF EXISTS ai_configs_provider_check;

ALTER TABLE ai_configs
  ADD CONSTRAINT ai_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini'));
