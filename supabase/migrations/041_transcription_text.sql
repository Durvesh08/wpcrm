-- Add transcription column for AI voice note transcription
ALTER TABLE messages ADD COLUMN IF NOT EXISTS transcription_text TEXT;
