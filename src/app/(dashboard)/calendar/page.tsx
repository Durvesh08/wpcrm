'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, MessageSquare, PhoneCall, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

type Kind = 'follow_up' | 'call' | 'note';
type Reminder = { id: string; contact_id: string; conversation_id: string | null; kind: Kind; title: string; due_at: string; completed_at: string | null; contacts: { name: string | null; phone: string | null } | null };
type ContactOption = { id: string; name: string | null; phone: string };

const kindLabel: Record<Kind, string> = { follow_up: 'Follow-up', call: 'Call', note: 'Note' };
const kindIcon: Record<Kind, typeof Clock3> = { follow_up: Clock3, call: PhoneCall, note: StickyNote };

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
    if (!response.ok) return toast.error(json?.error ?? 'Could not load calendar');
    setReminders(json.reminders ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const supabase = createClient();
    void supabase.from('contacts').select('id, name, phone').order('name').limit(150).then(({ data }) => setContacts((data ?? []) as ContactOption[]));
  }, []);

  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), index)), [month]);
  const selectedEvents = useMemo(() => reminders.filter((item) => isSameDay(parseISO(item.due_at), selectedDay)), [reminders, selectedDay]);

  const save = async () => {
    if (!contactId) return toast.error('Choose a contact first');
    if (!title.trim()) return toast.error('Add a short call or note title');
    setSaving(true);
    const dueAt = new Date(`${format(selectedDay, 'yyyy-MM-dd')}T${time}:00`);
    const response = await fetch('/api/reminders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contactId, kind, title, dueAt: dueAt.toISOString() }) });
    const json = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return toast.error(json?.error ?? 'Could not save calendar item');
    toast.success(`${kindLabel[kind]} added to calendar`);
    setTitle('');
    void load();
  };

  const complete = async (id: string) => {
    const response = await fetch('/api/reminders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!response.ok) return toast.error('Could not complete item');
    setReminders((current) => current.map((item) => item.id === id ? { ...item, completed_at: new Date().toISOString() } : item));
  };

  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">Team planner</p><h1 className="mt-1 text-2xl font-semibold text-foreground">Calendar</h1><p className="mt-1 text-sm text-muted-foreground">Plan a contact call, note, or follow-up directly on the day it needs attention.</p></div><Link href="/inbox"><Button><MessageSquare className="mr-2 h-4 w-4" />Open inbox</Button></Link></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="zovaix-premium-panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4"><button type="button" onClick={() => setMonth((value) => subMonths(value, 1))} className="text-muted-foreground hover:text-foreground" aria-label="Previous month"><ChevronLeft /></button><h2 className="font-semibold">{format(month, 'MMMM yyyy')}</h2><button type="button" onClick={() => setMonth((value) => addMonths(value, 1))} className="text-muted-foreground hover:text-foreground" aria-label="Next month"><ChevronRight /></button></div>
        <div className="grid grid-cols-7 border-b border-border/70">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => <p key={day} className="py-3 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{day}</p>)}</div>
        <div className="grid grid-cols-7">{days.map((day) => { const events = reminders.filter((item) => isSameDay(parseISO(item.due_at), day) && !item.completed_at); const selected = isSameDay(day, selectedDay); return <button key={day.toISOString()} type="button" onClick={() => setSelectedDay(day)} className={`min-h-24 border-r border-b border-border/60 p-2 text-left transition-colors ${selected ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : 'hover:bg-muted/50'} ${!isSameMonth(day, month) ? 'opacity-35' : ''}`}><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>{format(day, 'd')}</span><div className="mt-1 space-y-1">{events.slice(0,2).map((item) => <span key={item.id} className="block truncate rounded bg-primary/12 px-1.5 py-0.5 text-[10px] text-primary">{kindLabel[item.kind]} · {item.contacts?.name || item.title}</span>)}{events.length > 2 && <span className="block px-1 text-[10px] text-muted-foreground">+{events.length - 2} more</span>}</div></button>; })}</div>
      </section>
      <aside className="zovaix-premium-panel rounded-2xl p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><h2 className="font-semibold">{format(selectedDay, 'EEE, MMM d')}</h2></div><div className="mt-4 space-y-3"><select value={kind} onChange={(event) => setKind(event.target.value as Kind)} className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm"><option value="follow_up">Follow-up</option><option value="call">Contact call</option><option value="note">Contact note</option></select><select value={contactId} onChange={(event) => setContactId(event.target.value)} className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm"><option value="">Choose contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name || contact.phone}</option>)}</select><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === 'call' ? 'Call purpose' : kind === 'note' ? 'Note to remember' : 'Follow-up task'} className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" /><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" /><Button className="w-full" disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : `Add ${kindLabel[kind]}`}</Button></div><div className="mt-5 border-t border-border/70 pt-4"><p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Scheduled</p>{loading ? <p className="mt-3 text-sm text-muted-foreground">Loading...</p> : selectedEvents.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nothing planned on this date.</p> : <div className="mt-3 space-y-2">{selectedEvents.map((item) => { const Icon = kindIcon[item.kind]; return <div key={item.id} className={`rounded-lg border border-border/70 p-2.5 ${item.completed_at ? 'opacity-50' : ''}`}><div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.contacts?.name || item.contacts?.phone || 'Contact'} · {format(parseISO(item.due_at), 'h:mm a')}</p></div>{!item.completed_at && <button type="button" onClick={() => void complete(item.id)} className="text-muted-foreground hover:text-primary" aria-label="Complete"><CheckCircle2 className="h-4 w-4" /></button>}</div></div>; })}</div>}</div></aside>
    </div>
  </div>;
}
