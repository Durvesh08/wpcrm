-- 033_ai_translation_settings.sql — inbox auto-translation settings

ALTER TABLE ai_configs
  ADD COLUMN IF NOT EXISTS translation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS translation_target_language text NOT NULL DEFAULT 'English';
