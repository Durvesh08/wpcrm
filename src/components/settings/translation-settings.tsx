'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SettingsPanelHead } from './settings-panel-head';

const TRANSLATION_LANGUAGES = [
  'English',
  'Hindi',
  'Marathi',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Punjabi',
  'Urdu',
];

export function TranslationSettings() {
  const { accountRole, profileLoading } = useAuth();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;
  const disabled = profileLoading || !canEdit;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [googleConfigured, setGoogleConfigured] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/translation/config');
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to load translation settings');
        return;
      }
      setAvailable(data.available !== false);
      setEnabled(Boolean(data.enabled));
      setTargetLanguage(data.target_language ?? 'English');
      setGoogleConfigured(data.google_translate_configured === true);
    } catch {
      toast.error('Failed to load translation settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/translation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          target_language: targetLanguage,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to save translation settings');
        return;
      }
      toast.success('Translation settings saved.');
      await fetchSettings();
    } catch {
      toast.error('Failed to save translation settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <SettingsPanelHead
        title="Translation"
        description="Use Google Cloud Translation for message-level Translate actions in the inbox."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-4 w-4 text-primary" />
            Inbox translation
          </CardTitle>
          <CardDescription>
            Agents can translate individual messages on demand. The original
            WhatsApp message stays unchanged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading translation settings...
            </div>
          ) : (
            <>
              {!available && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  Translation settings need Supabase migration
                  038_translation_settings_google.sql.
                </p>
              )}

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Enable message translation
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Shows the Translate button beside Copy and Delete on chat
                      messages.
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    disabled={disabled || !available || !googleConfigured}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2
                    className={
                      googleConfigured
                        ? 'h-3.5 w-3.5 text-emerald-500'
                        : 'h-3.5 w-3.5 text-amber-500'
                    }
                  />
                  Google Translate key is{' '}
                  {googleConfigured ? 'connected' : 'not configured'}.
                </div>
              </div>

              <div className="grid gap-2 sm:max-w-xs">
                <Label>Default translate language</Label>
                <Select
                  value={targetLanguage}
                  onValueChange={(value) => {
                    if (value) setTargetLanguage(value);
                  }}
                  disabled={disabled || !available || !googleConfigured}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATION_LANGUAGES.map((language) => (
                      <SelectItem key={language} value={language}>
                        {language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!canEdit && (
                <p className="text-xs text-muted-foreground">
                  Only admins and owners can change translation settings.
                </p>
              )}

              <Button
                onClick={handleSave}
                disabled={disabled || saving || !available || !googleConfigured}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save translation settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
