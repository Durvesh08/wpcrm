'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { CalendarDays, CheckCircle2, Clock3, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type Reminder = {
  id: string;
  conversation_id: string | null;
  title: string;
  due_at: string;
  completed_at: string | null;
  contacts: { name: string | null; phone: string | null } | null;
};

export default function CalendarPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/reminders');
    const json = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) return toast.error(json?.error ?? 'Could not load calendar');
    setReminders(json.reminders ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const upcoming = useMemo(() => reminders.filter((item) => !item.completed_at), [reminders]);
  const complete = async (id: string) => {
    const response = await fetch('/api/reminders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!response.ok) return toast.error('Could not complete reminder');
    setReminders((current) => current.map((item) => item.id === id ? { ...item, completed_at: new Date().toISOString() } : item));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">Follow-up planner</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every saved follow-up appears here, so the next customer action is easy to find.</p>
        </div>
        <Link href="/inbox"><Button><MessageSquare className="mr-2 h-4 w-4" />Open inbox</Button></Link>
      </div>
      <section className="zovaix-premium-panel overflow-hidden rounded-2xl">
        <div className="border-border/80 flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3"><CalendarDays className="text-primary h-5 w-5" /><h2 className="font-semibold">Upcoming follow-ups</h2></div>
          <span className="text-muted-foreground text-sm">{upcoming.length} open</span>
        </div>
        {loading ? <p className="p-8 text-sm text-muted-foreground">Loading calendar...</p> : upcoming.length === 0 ? (
          <div className="p-10 text-center"><Clock3 className="text-muted-foreground mx-auto h-7 w-7" /><p className="mt-3 font-medium">No follow-ups scheduled</p><p className="mt-1 text-sm text-muted-foreground">Open a chat and use Follow-up to schedule your next action.</p></div>
        ) : <div className="divide-y divide-border/70">{upcoming.map((item) => {
          const date = parseISO(item.due_at); const overdue = isPast(date) && !isToday(date);
          return <div key={item.id} className="flex items-center gap-4 px-5 py-4">
            <div className={`w-24 shrink-0 text-sm font-medium ${overdue ? 'text-destructive' : 'text-primary'}`}>{isToday(date) ? 'Today' : format(date, 'EEE, MMM d')}<span className="block text-xs text-muted-foreground">{format(date, 'h:mm a')}</span></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{item.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{item.contacts?.name || item.contacts?.phone || 'Contact'}{overdue ? ' · Overdue' : ''}</p></div>
            {item.conversation_id && <Link href={`/inbox?c=${item.conversation_id}`} className="text-primary text-sm font-medium">Open chat</Link>}
            <button type="button" onClick={() => void complete(item.id)} className="text-muted-foreground hover:text-primary" aria-label="Mark reminder complete"><CheckCircle2 className="h-5 w-5" /></button>
          </div>;
        })}</div>}
      </section>
    </div>
  );
}
