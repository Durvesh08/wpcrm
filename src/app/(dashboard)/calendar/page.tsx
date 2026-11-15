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
  follow_up: 'bg-primary/15 text-primary border-primary/25',
  call: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  whatsapp: 'bg-primary/15 text-primary border-primary/25',
  meeting: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  note: 'bg-amber-400/15 text-amber-300 border-amber-400/25',
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
  const todayEvents = reminders.filter((item) => isToday(parseISO(item.due_at))).length;

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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(215,250,0,0.6)]" />
            <p className="text-primary text-xs font-mono font-bold tracking-[0.2em] uppercase">
              Team Planner & Agendas
            </p>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Calendar & Tasks
          </h1>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">
            Book calls, meetings, WhatsApp follow-ups, and next-step actions with owner, reminder, and status tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-card hover:border-primary/40 transition-all shadow-xs"
          >
            <MessageSquare className="h-4 w-4 text-primary" />
            Open inbox
          </Link>
        </div>
      </div>

      {/* Top 3 Bento Stat Capsules */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Scheduled */}
        <div className="group relative overflow-hidden rounded-[22px] bg-card/75 border border-border/80 p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Scheduled Items
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-primary/15 border border-primary/25 text-primary group-hover:scale-105 transition-transform">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="font-mono text-3xl xl:text-4xl font-black tracking-tight text-foreground">
              {scheduledEvents}
            </p>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-primary">
              Active agendas
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="group relative overflow-hidden rounded-[22px] bg-card/75 border border-border/80 p-5 shadow-xs transition-all duration-200 hover:border-rose-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Overdue Tasks
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-rose-500/15 border border-rose-500/25 text-rose-400 group-hover:scale-105 transition-transform">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="font-mono text-3xl xl:text-4xl font-black tracking-tight text-foreground">
              {overdueEvents}
            </p>
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border",
              overdueEvents > 0
                ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                : "bg-muted/80 border-border text-muted-foreground"
            )}>
              {overdueEvents > 0 ? "Requires action" : "All clear"}
            </span>
          </div>
        </div>

        {/* Today */}
        <div className="group relative overflow-hidden rounded-[22px] bg-card/75 border border-border/80 p-5 shadow-xs transition-all duration-200 hover:border-amber-400/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Due Today
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-amber-400/15 border border-amber-400/25 text-amber-300 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="font-mono text-3xl xl:text-4xl font-black tracking-tight text-foreground">
              {todayEvents}
            </p>
            <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-300">
              Today&apos;s queue
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Scheduler Sidecar on Right */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* Calendar Surface */}
        <section className="relative overflow-hidden rounded-[26px] bg-card/75 border border-border/80 backdrop-blur-xl shadow-xs">
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border/80 px-5 sm:px-6 py-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonth((value) => subMonths(value, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-border/80 bg-card/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMonth((value) => addMonths(value, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-border/80 bg-card/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setMonth(startOfMonth(now));
                  setSelectedDay(now);
                }}
                className="rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-card transition-all"
              >
                Today
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {format(month, 'MMMM yyyy')}
              </h2>
            </div>

            <div className="flex items-center">
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-primary">
                {openEvents} open item{openEvents === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 border-b border-border/70 bg-muted/30">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <p
                key={day}
                className="py-2.5 text-center text-[10px] sm:text-[11px] font-mono font-bold tracking-wider text-muted-foreground uppercase"
              >
                {day}
              </p>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const events = reminders.filter(
                (item) => isSameDay(parseISO(item.due_at), day) && !item.completed_at
              );
              const selected = isSameDay(day, selectedDay);
              const isCurrentDay = isToday(day);
              const muted = !isSameMonth(day, month);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'group relative min-h-16 border-r border-b border-border/60 p-1.5 text-left transition-all hover:bg-muted/40 sm:min-h-24 sm:p-2.5',
                    selected && 'bg-primary/10 ring-1 ring-inset ring-primary/50',
                    muted && 'opacity-35'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[11px] sm:text-xs font-mono font-bold transition-transform group-hover:scale-105',
                        isCurrentDay
                          ? 'bg-primary text-primary-foreground font-black shadow-[0_0_12px_rgba(215,250,0,0.5)]'
                          : selected
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'text-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {events.length > 0 && (
                      <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>

                  <div className="mt-1 sm:mt-1.5 space-y-1">
                    {events.slice(0, 2).map((item) => {
                      const Icon = kindIcon[item.kind];
                      return (
                        <span
                          key={item.id}
                          className={cn(
                            'flex items-center gap-1 truncate rounded-[7px] border px-1 py-0.5 sm:px-1.5 sm:py-0.5 text-[9px] sm:text-[10px] font-medium transition-transform group-hover:scale-[1.01]',
                            kindTone[item.kind]
                          )}
                        >
                          <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                          <span className="hidden sm:inline truncate">
                            {item.contacts?.name || item.title}
                          </span>
                          <span className="sm:hidden text-[8px] font-bold">
                            {item.kind === 'meeting' ? 'M' : item.kind === 'call' ? 'C' : item.kind === 'whatsapp' ? 'W' : 'T'}
                          </span>
                        </span>
                      );
                    })}
                    {events.length > 2 && (
                      <span className="block px-0.5 text-[8px] sm:text-[10px] font-mono text-muted-foreground">
                        +{events.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Scheduler Sidecar */}
        <aside className="space-y-4 rounded-[26px] bg-card/75 border border-border/80 backdrop-blur-xl p-5 sm:p-6 shadow-xs">
          {/* Sidecar Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-border/70">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground font-black text-sm shadow-[0_0_12px_rgba(215,250,0,0.35)]">
              {format(selectedDay, 'd')}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground truncate">
                {format(selectedDay, 'EEEE, MMM d')}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                Schedule task, call, or meeting
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Type
              </label>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as Kind)}
                className="h-10 w-full rounded-[14px] border border-border/80 bg-background/80 px-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="follow_up">Follow-up Task</option>
                <option value="call">Phone Call</option>
                <option value="whatsapp">WhatsApp Follow-up</option>
                <option value="meeting">Video Meeting</option>
                <option value="note">Internal Note</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Contact
              </label>
              <select
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                className="h-10 w-full rounded-[14px] border border-border/80 bg-background/80 px-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">Choose contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name || contact.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Assignee
              </label>
              <select
                value={assignedUserId}
                onChange={(event) => setAssignedUserId(event.target.value)}
                className="h-10 w-full rounded-[14px] border border-border/80 bg-background/80 px-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">Assign to me</option>
                {profiles.map((profile) => (
                  <option key={profile.user_id} value={profile.user_id}>
                    {profile.full_name || profile.email || 'Team member'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Title
              </label>
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
                className="h-10 w-full rounded-[14px] border border-border/80 bg-background/80 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {kind === 'meeting' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Meeting URL
                  </label>
                  <input
                    value={meetingUrl}
                    onChange={(event) => setMeetingUrl(event.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="h-10 w-full rounded-[14px] border border-border/80 bg-background/80 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Location
                  </label>
                  <input
                    value={meetingLocation}
                    onChange={(event) => setMeetingLocation(event.target.value)}
                    placeholder="Google Meet, Office, Call"
                    className="h-10 w-full rounded-[14px] border border-border/80 bg-background/80 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="h-10 w-full rounded-[14px] border border-border/80 bg-background/80 px-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Alert
                </label>
                <select
                  value={reminderMinutesBefore}
                  onChange={(event) => setReminderMinutesBefore(event.target.value)}
                  className="h-10 w-full rounded-[14px] border border-border/80 bg-background/80 px-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="0">At time</option>
                  <option value="15">15m before</option>
                  <option value="30">30m before</option>
                  <option value="60">1h before</option>
                  <option value="1440">1d before</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="mt-2 w-full rounded-full bg-primary text-primary-foreground hover:brightness-105 font-black h-11 text-xs shadow-sm hover:shadow-[0_0_16px_rgba(215,250,0,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'Saving...' : `Add ${kindLabel[kind]}`}
            </button>
          </div>

          {/* Scheduled items on this date */}
          <div className="pt-4 border-t border-border/70">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Scheduled ({selectedEvents.length})
              </p>
            </div>

            {loading ? (
              <div className="space-y-2">
                <div className="h-16 animate-pulse rounded-[16px] bg-muted/60" />
                <div className="h-16 animate-pulse rounded-[16px] bg-muted/60" />
              </div>
            ) : selectedEvents.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-border/80 bg-background/40 p-4 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-xs font-bold text-foreground">
                  Nothing scheduled
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Add a follow-up, call, or meeting above.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[22rem] overflow-y-auto pr-1">
                {selectedEvents.map((item) => {
                  const Icon = kindIcon[item.kind];
                  const isScheduled = (item.status ?? (item.completed_at ? 'completed' : 'scheduled')) === 'scheduled';

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-[18px] border border-border/80 bg-background/70 p-3 transition-all hover:border-border',
                        item.completed_at && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border',
                            kindTone[item.kind]
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                            {item.contacts?.name || item.contacts?.phone || 'Contact'}{' '}
                            · <span className="font-mono">{format(parseISO(item.due_at), 'h:mm a')}</span>
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[9px] font-mono">
                            <span className="rounded-full border border-border/80 bg-card px-2 py-0.5 text-muted-foreground">
                              {statusLabel[item.status ?? (item.completed_at ? 'completed' : 'scheduled')]}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card px-2 py-0.5 text-muted-foreground">
                              <UserRound className="h-2.5 w-2.5" />
                              {assigneeName(item.assigned_user_id)}
                            </span>
                          </div>
                          {item.meeting_url && (
                            <a
                              href={item.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              <LinkIcon className="h-3 w-3" />
                              Open meeting link
                            </a>
                          )}
                          {item.meeting_location && (
                            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {item.meeting_location}
                            </p>
                          )}
                        </div>
                      </div>

                      {isScheduled && (
                        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => void updateStatus(item.id, 'completed')}
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => void reschedule(item)}
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-border/80 bg-card px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateStatus(item.id, 'no_show')}
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 transition-all"
                          >
                            <Clock3 className="h-3 w-3" />
                            No-show
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateStatus(item.id, 'cancelled')}
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
                          >
                            <CalendarX2 className="h-3 w-3" />
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
