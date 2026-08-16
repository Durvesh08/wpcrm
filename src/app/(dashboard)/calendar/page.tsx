'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquare,
  PhoneCall,
  Plus,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Kind = 'follow_up' | 'call' | 'note';
type Reminder = {
  id: string;
  contact_id: string;
  conversation_id: string | null;
  kind: Kind;
  title: string;
  due_at: string;
  completed_at: string | null;
  contacts: { name: string | null; phone: string | null } | null;
};
type ContactOption = { id: string; name: string | null; phone: string };

const kindLabel: Record<Kind, string> = {
  follow_up: 'Follow-up',
  call: 'Call',
  note: 'Note',
};
const kindIcon: Record<Kind, typeof Clock3> = {
  follow_up: Clock3,
  call: PhoneCall,
  note: StickyNote,
};
const kindTone: Record<Kind, string> = {
  follow_up: 'bg-primary/12 text-primary border-primary/20',
  call: 'bg-sky-500/12 text-sky-400 border-sky-500/20',
  note: 'bg-amber-500/12 text-amber-400 border-amber-500/20',
};

export default function CalendarPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [kind, setKind] = useState<Kind>('follow_up');
  const [contactId, setContactId] = useState('');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/reminders');
    const json = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      toast.error(json?.error ?? 'Could not load calendar');
      return;
    }
    setReminders(json.reminders ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from('contacts')
      .select('id, name, phone')
      .order('name')
      .limit(150)
      .then(({ data }) => setContacts((data ?? []) as ContactOption[]));
  }, []);

  const days = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) =>
        addDays(startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), index)
      ),
    [month]
  );
  const selectedEvents = useMemo(
    () =>
      reminders
        .filter((item) => isSameDay(parseISO(item.due_at), selectedDay))
        .sort((a, b) => a.due_at.localeCompare(b.due_at)),
    [reminders, selectedDay]
  );
  const openEvents = reminders.filter((item) => !item.completed_at).length;

  const save = async () => {
    if (!contactId) return toast.error('Choose a contact first');
    if (!title.trim()) return toast.error('Add a short call or note title');
    setSaving(true);
    const dueAt = new Date(`${format(selectedDay, 'yyyy-MM-dd')}T${time}:00`);
    const response = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contactId,
        kind,
        title,
        dueAt: dueAt.toISOString(),
      }),
    });
    const json = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      toast.error(json?.error ?? 'Could not save calendar item');
      return;
    }
    toast.success(`${kindLabel[kind]} added to calendar`);
    setTitle('');
    void load();
  };

  const complete = async (id: string) => {
    const response = await fetch('/api/reminders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) return toast.error('Could not complete item');
    setReminders((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed_at: new Date().toISOString() }
          : item
      )
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="zovaix-enter flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
            Team planner
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Calendar
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Schedule contact calls, notes, and follow-ups directly where the
            team plans the day.
          </p>
        </div>
        <Link href="/inbox">
          <Button className="rounded-xl">
            <MessageSquare className="mr-2 h-4 w-4" />
            Open inbox
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="zovaix-premium-panel zovaix-enter overflow-hidden rounded-[24px]">
          <div className="relative border-b border-border/80 px-5 py-4">
            <div className="zovaix-soft-grid pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMonth((value) => subMonths(value, 1))}
                className="zovaix-premium-hover text-muted-foreground hover:text-foreground inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/70"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-semibold">
                  {format(month, 'MMMM yyyy')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {openEvents} open item{openEvents === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMonth((value) => addMonths(value, 1))}
                className="zovaix-premium-hover text-muted-foreground hover:text-foreground inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/70"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border/70 bg-card/35">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <p
                key={day}
                className="py-3 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
              >
                {day}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const events = reminders.filter(
                (item) => isSameDay(parseISO(item.due_at), day) && !item.completed_at
              );
              const selected = isSameDay(day, selectedDay);
              const muted = !isSameMonth(day, month);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'group min-h-24 border-r border-b border-border/60 p-2 text-left transition-all hover:bg-muted/50 sm:min-h-28',
                    selected && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
                    muted && 'opacity-35'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-transform group-hover:scale-105',
                      isToday(day)
                        ? 'bg-primary text-primary-foreground'
                        : selected
                          ? 'bg-primary/15 text-primary'
                          : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="mt-2 space-y-1">
                    {events.slice(0, 2).map((item) => {
                      const Icon = kindIcon[item.kind];
                      return (
                        <span
                          key={item.id}
                          className={cn(
                            'flex items-center gap-1 truncate rounded-md border px-1.5 py-1 text-[10px]',
                            kindTone[item.kind]
                          )}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {item.contacts?.name || item.title}
                          </span>
                        </span>
                      );
                    })}
                    {events.length > 2 && (
                      <span className="block px-1 text-[10px] text-muted-foreground">
                        +{events.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="zovaix-glass-panel zovaix-enter rounded-[24px] p-4">
          <div className="flex items-center gap-3">
            <span className="zovaix-icon-tile inline-flex h-10 w-10 items-center justify-center rounded-2xl text-primary-foreground">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold">
                {format(selectedDay, 'EEE, MMM d')}
              </h2>
              <p className="text-xs text-muted-foreground">
                Add one focused next step
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Type
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as Kind)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="follow_up">Follow-up</option>
                <option value="call">Contact call</option>
                <option value="note">Contact note</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Contact
              <select
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Choose contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name || contact.phone}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Note
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  kind === 'call'
                    ? 'Call purpose'
                    : kind === 'note'
                      ? 'Note to remember'
                      : 'Follow-up task'
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Time
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <Button
              className="w-full rounded-xl"
              disabled={saving}
              onClick={() => void save()}
            >
              <Plus className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : `Add ${kindLabel[kind]}`}
            </Button>
          </div>

          <div className="mt-5 border-t border-border/70 pt-4">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Scheduled
            </p>
            {loading ? (
              <div className="mt-3 space-y-2">
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
              </div>
            ) : selectedEvents.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/45 p-4 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  Nothing planned
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a call, note, or follow-up for this date.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {selectedEvents.map((item) => {
                  const Icon = kindIcon[item.kind];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-2xl border border-border/70 bg-background/40 p-3',
                        item.completed_at && 'opacity-55'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                            kindTone[item.kind]
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.contacts?.name ||
                              item.contacts?.phone ||
                              'Contact'}{' '}
                            · {format(parseISO(item.due_at), 'h:mm a')}
                          </p>
                        </div>
                        {!item.completed_at && (
                          <button
                            type="button"
                            onClick={() => void complete(item.id)}
                            className="text-muted-foreground hover:text-primary"
                            aria-label="Complete"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
