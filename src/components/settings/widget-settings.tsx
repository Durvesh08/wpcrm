'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SettingsPanelHead } from './settings-panel-head';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Copy } from 'lucide-react';

export function WidgetSettings() {
  const supabase = createClient();
  const { accountId, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [enabled, setEnabled] = useState(true);
  const [greetingText, setGreetingText] = useState('Hi! 👋 How can we help you?');
  const [prefilledMessage, setPrefilledMessage] = useState("Hi, I'm interested in your services");
  const [position, setPosition] = useState('bottom-right');
  const [primaryColor, setPrimaryColor] = useState('#25D366');
  const [showOnMobile, setShowOnMobile] = useState(true);
  
  useEffect(() => {
    if (authLoading || !accountId) return;
    
    const fetchConfig = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('widget_configs')
        .select('*')
        .eq('account_id', accountId)
        .single();
        
      if (data) {
        setEnabled(data.enabled ?? true);
        setGreetingText(data.greeting_text ?? '');
        setPrefilledMessage(data.prefilled_message ?? '');
        setPosition(data.position ?? 'bottom-right');
        setPrimaryColor(data.primary_color ?? '#25D366');
        setShowOnMobile(data.show_on_mobile ?? true);
      }
      setLoading(false);
    };
    
    fetchConfig();
  }, [accountId, authLoading, supabase]);

  const saveConfig = async () => {
    if (!accountId) return;
    setSaving(true);
    
    const payload = {
      account_id: accountId,
      enabled,
      greeting_text: greetingText,
      prefilled_message: prefilledMessage,
      position,
      primary_color: primaryColor,
      show_on_mobile: showOnMobile,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('widget_configs')
      .upsert(payload, { onConflict: 'account_id' });
      
    if (error) {
      console.error(error);
      toast.error('Failed to save widget configuration');
    } else {
      toast.success('Widget configuration saved');
    }
    
    setSaving(false);
  };
  
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const snippet = `<script src="${origin}/api/widget/${accountId}"></script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    toast.success('Snippet copied to clipboard');
  };

  if (loading || authLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading widget settings...</div>;
  }
  
  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsPanelHead 
        title="Website Widget" 
        description="Add a floating WhatsApp button to your website."
      />
      
      <Card className="zovaix-glass-card">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Customize how the widget appears on your site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Widget</Label>
              <div className="text-sm text-muted-foreground">Turn the widget on or off globally.</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="greetingText">Greeting Text</Label>
            <Input 
              id="greetingText"
              value={greetingText}
              onChange={(e) => setGreetingText(e.target.value)}
              placeholder="e.g. Hi! 👋 How can we help you?"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="prefilledMessage">Prefilled Message</Label>
            <Input 
              id="prefilledMessage"
              value={prefilledMessage}
              onChange={(e) => setPrefilledMessage(e.target.value)}
              placeholder="Message drafted when users open WhatsApp"
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={position} onValueChange={(val: string | null) => val && setPosition(val)}>
                <SelectTrigger id="position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label>Show on Mobile</Label>
              <div className="text-sm text-muted-foreground">Display the widget on screens smaller than 768px.</div>
            </div>
            <Switch checked={showOnMobile} onCheckedChange={setShowOnMobile} />
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="zovaix-glass-card">
        <CardHeader>
          <CardTitle>Installation</CardTitle>
          <CardDescription>Copy this snippet and paste it before the closing &lt;/body&gt; tag of your website.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto text-muted-foreground border">
              {snippet}
            </pre>
            <Button 
              size="icon" 
              variant="outline" 
              className="absolute top-2 right-2 h-8 w-8 bg-background"
              onClick={copySnippet}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
