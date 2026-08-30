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
  CalendarX2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Link as LinkIcon,
  MapPin,
  MessageSquare,
  PhoneCall,
  Plus,
  RotateCcw,
  Sparkles,
  StickyNote,
  UserRound,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Kind = 'follow_up' | 'call' | 'whatsapp' | 'meeting' | 'note';
type Status = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
type Reminder = {
  id: string;
  contact_id: string;
  conversation_id: string | null;
  kind: Kind;
  title: string;
  due_at: string;
  completed_at: string | null;
  contacts: { name: string | null; phone: string | null } | null;
  status?: Status;
  assigned_user_id?: string | null;
  meeting_location?: string | null;
  meeting_url?: string | null;
  reminder_minutes_before?: number;
  cancelled_at?: string | null;
  no_show_at?: string | null;
  completed_notes?: string | null;
};
type ContactOption = { id: string; name: string | null; phone: string };
type ProfileOption = { user_id: string; full_name: string | null; email: string | null };

const kindLabel: Record<Kind, string> = {
  follow_up: 'Follow-up',
  call: 'Call',
  whatsapp: 'WhatsApp follow-up',
  meeting: 'Meeting',
  note: 'Note',
};
const kindIcon: Record<Kind, typeof Clock3> = {
  follow_up: Clock3,
  call: PhoneCall,
  whatsapp: MessageSquare,
  meeting: Video,
  note: StickyNote,
};
const kindTone: Record<Kind, string> = {
  follow_up: 'bg-primary/12 text-primary border-primary/20',
  call: 'bg-sky-500/12 text-sky-400 border-sky-500/20',
  whatsapp: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/20',
  meeting: 'bg-violet-500/12 text-violet-400 border-violet-500/20',
  note: 'bg-amber-500/12 text-amber-400 border-amber-500/20',
};
const statusLabel: Record<Status, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export default function CalendarPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [kind, setKind] = useState<Kind>('follow_up');
  const [contactId, setContactId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState('30');
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
    void supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .order('full_name')
      .then(({ data }) => setProfiles((data ?? []) as ProfileOption[]));
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
  const scheduledEvents = reminders.filter(
    (item) => (item.status ?? (item.completed_at ? 'completed' : 'scheduled')) === 'scheduled'
  ).length;
  const overdueEvents = reminders.filter((item) => {
    const status = item.status ?? (item.completed_at ? 'completed' : 'scheduled');
    return status === 'scheduled' && parseISO(item.due_at).getTime() < Date.now();
  }).length;

  const assigneeName = (userId?: string | null) => {
    const profile = profiles.find((item) => item.user_id === userId);
    return profile?.full_name || profile?.email || 'Unassigned';
  };

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
        assignedUserId,
        meetingLocation,
        meetingUrl,
        reminderMinutesBefore: Number(reminderMinutesBefore) || 30,
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
    setMeetingLocation('');
    setMeetingUrl('');
    void load();
  };

  const updateStatus = async (id: string, status: Status) => {
    const response = await fetch('/api/reminders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (!response.ok) return toast.error('Could not update item');
    setReminders((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              completed_at: status === 'completed' ? new Date().toISOString() : null,
              cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
              no_show_at: status === 'no_show' ? new Date().toISOString() : null,
            }
          : item
      )
    );
  };

  const reschedule = async (item: Reminder) => {
    const nextTime = window.prompt(
      'New time for this date, for example 15:30',
      format(parseISO(item.due_at), 'HH:mm')
    );
    if (!nextTime) return;
    const nextDueAt = new Date(`${format(selectedDay, 'yyyy-MM-dd')}T${nextTime}:00`);
    if (Number.isNaN(nextDueAt.getTime())) return toast.error('Use valid time like 15:30');
    const response = await fetch('/api/reminders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: item.id, dueAt: nextDueAt.toISOString() }),
    });
    if (!response.ok) return toast.error('Could not reschedule item');
    toast.success('Calendar item rescheduled');
    void load();
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
            Book calls, meetings, WhatsApp follow-ups, and next-step tasks with
            owner, reminder, reschedule, cancel, and no-show tracking.
          </p>
        </div>
        <Link href="/inbox">
          <Button className="rounded-xl">
            <MessageSquare className="mr-2 h-4 w-4" />
            Open inbox
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: 'Scheduled', value: scheduledEvents, icon: CalendarDays },
          { label: 'Overdue', value: overdueEvents, icon: Clock3 },
          { label: 'Today', value: reminders.filter((item) => isToday(parseISO(item.due_at))).length, icon: Sparkles },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="zovaix-glass-panel rounded-2xl border border-border/70 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {metric.label}
                </p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {metric.value}
              </p>
            </div>
          );
        })}
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
                Add a task, call, or meeting
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
                <option value="whatsapp">WhatsApp follow-up</option>
                <option value="meeting">Meeting booking</option>
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
              Assigned team member
              <select
                value={assignedUserId}
                onChange={(event) => setAssignedUserId(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Assign to me</option>
                {profiles.map((profile) => (
                  <option key={profile.user_id} value={profile.user_id}>
                    {profile.full_name || profile.email || 'Team member'}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  kind === 'meeting'
                    ? 'Discovery call with client'
                    : kind === 'call'
                    ? 'Call purpose'
                    : kind === 'note'
                      ? 'Note to remember'
                      : 'Follow-up task'
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            {kind === 'meeting' && (
              <>
                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Meeting link
                  <input
                    value={meetingUrl}
                    onChange={(event) => setMeetingUrl(event.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Location
                  <input
                    value={meetingLocation}
                    onChange={(event) => setMeetingLocation(event.target.value)}
                    placeholder="Google Meet, office, phone call..."
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              </>
            )}
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Time
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Reminder
              <select
                value={reminderMinutesBefore}
                onChange={(event) => setReminderMinutesBefore(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="0">At time</option>
                <option value="15">15 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
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
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                            <span className="rounded-full border border-border/70 px-2 py-0.5">
                              {statusLabel[item.status ?? (item.completed_at ? 'completed' : 'scheduled')]}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5">
                              <UserRound className="h-3 w-3" />
                              {assigneeName(item.assigned_user_id)}
                            </span>
                          </div>
                          {item.meeting_url && (
                            <a
                              href={item.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <LinkIcon className="h-3 w-3" />
                              Open meeting link
                            </a>
                          )}
                          {item.meeting_location && (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {item.meeting_location}
                            </p>
                          )}
                        </div>
                      </div>
                      {(item.status ?? (item.completed_at ? 'completed' : 'scheduled')) === 'scheduled' && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => void updateStatus(item.id, 'completed')}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs hover:bg-primary/10 hover:text-primary"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => void reschedule(item)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateStatus(item.id, 'no_show')}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs hover:bg-amber-500/10 hover:text-amber-500"
                          >
                            <Clock3 className="h-3.5 w-3.5" />
                            No-show
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateStatus(item.id, 'cancelled')}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs hover:bg-destructive/10 hover:text-destructive"
                          >
                            <CalendarX2 className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        </div>
                      )}
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
