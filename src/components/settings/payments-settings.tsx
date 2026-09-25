'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, CreditCard } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function PaymentsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isActive, setIsActive] = useState(true);
  const [apiKeyId, setApiKeyId] = useState('');
  const [apiKeySecret, setApiKeySecret] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch('/api/payments/config');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to load payments config');
        return;
      }
      if (data.config) {
        setIsActive(data.config.is_active ?? true);
        setApiKeyId(data.config.api_key_id || '');
        setApiKeySecret(data.config.api_key_secret || '');
      }
    } catch {
      toast.error('Network error loading payments config');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!apiKeyId.trim() || !apiKeySecret.trim()) {
      toast.error('Both publishable key and secret key are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/payments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'stripe',
          api_key_id: apiKeyId.trim(),
          api_key_secret: apiKeySecret.trim(),
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save payments config');
      } else {
        toast.success('Payments configuration saved');
        load();
      }
    } catch {
      toast.error('Network error saving payments config');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Payments Configuration
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Stripe to generate payment links directly within chats.
        </p>
      </div>

      <Card className="zovaix-glass-panel border-border/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Stripe
              </CardTitle>
              <CardDescription className="mt-1.5">
                Enable Stripe integration to quickly create and share payment links with your customers.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="stripe-active" className="text-xs text-muted-foreground cursor-pointer">
                {isActive ? 'Enabled' : 'Disabled'}
              </Label>
              <Switch
                id="stripe-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api_key_id">Publishable Key</Label>
            <Input
              id="api_key_id"
              placeholder="pk_test_..."
              value={apiKeyId}
              onChange={(e) => setApiKeyId(e.target.value)}
              className="font-mono text-sm bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api_key_secret">Secret Key</Label>
            <Input
              id="api_key_secret"
              type="password"
              placeholder="sk_test_..."
              value={apiKeySecret}
              onChange={(e) => setApiKeySecret(e.target.value)}
              className="font-mono text-sm bg-background/50"
            />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t border-border/50 justify-end py-4">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
