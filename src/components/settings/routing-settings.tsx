'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function RoutingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<string>('manual');
  const [skipOffline, setSkipOffline] = useState(true);
  const [reassignOnReopen, setReassignOnReopen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/routing/config');
        if (res.ok) {
          const data = await res.json();
          setMode(data.mode || 'manual');
          setSkipOffline(data.skip_offline ?? true);
          setReassignOnReopen(data.reassign_on_reopen ?? false);
          setEnabled(data.enabled ?? true);
        }
      } catch (err) {
        console.error('Failed to load routing config', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/routing/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          skip_offline: skipOffline,
          reassign_on_reopen: reassignOnReopen,
          enabled,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update routing configuration');
      }

      toast.success('Routing configuration updated');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="zovaix-glass-panel space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Lead Routing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how new incoming conversations are assigned to your team members.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Enable Lead Routing
              </label>
              <p className="text-sm text-muted-foreground">
                Automatically assign incoming leads based on the routing mode.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(c) => setEnabled(c)}
            />
          </div>

          {enabled && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Routing Mode
                </label>
                <Select
                  value={mode}
                  onValueChange={(v) => setMode(v || 'round_robin')}
                >
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="load_balance">Load Balancing</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {mode === 'manual' && 'New leads stay unassigned until manually picked up.'}
                  {mode === 'round_robin' && 'Assigns leads to team members in order evenly.'}
                  {mode === 'load_balance' && 'Assigns leads to the team member with the fewest open conversations.'}
                </p>
              </div>

              {(mode === 'round_robin' || mode === 'load_balance') && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Skip Offline Agents
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Only assign to team members who are currently online.
                    </p>
                  </div>
                  <Switch
                    checked={skipOffline}
                    onCheckedChange={(c) => setSkipOffline(c)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
