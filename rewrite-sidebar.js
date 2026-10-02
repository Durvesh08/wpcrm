const fs = require('fs');

const code = `"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Contact, Deal, ContactNote, Tag, ConversationStatus } from "@/types";
import Link from "next/link";
import {
  Phone,
  Mail,
  Copy,
  Check,
  UserPlus,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
  Clock3,
  CircleDot,
  X,
  Sparkles,
  Flame,
  CalendarDays,
  TrendingUp,
  Briefcase,
  Target,
  Loader2,
  MoreVertical,
  ChevronRight,
  MessageSquare,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ContactSidebarProps {
  contact: Contact | null;
  conversationId?: string;
  conversationStatus?: ConversationStatus;
  onStatusChange?: (status: ConversationStatus) => void;
  onContactUpdated?: (contact: Contact) => void;
}

const STATUS_LABEL: Record<ConversationStatus, string> = {
  open: "Open",
  pending: "Waiting",
  closed: "Closed",
};

const REMINDERS = [
  { label: "Today", days: 0, hour: 18 },
  { label: "Tomorrow", days: 1, hour: 10 },
  { label: "3 days", days: 3, hour: 10 },
];

export function ContactSidebar({
  contact,
  conversationId,
  conversationStatus = "open",
  onStatusChange,
  onContactUpdated,
}: ContactSidebarProps) {
  const { accountId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [contactTags, setContactTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [extractingAi, setExtractingAi] = useState(false);
  const [savingTagId, setSavingTagId] = useState<string | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const contactNameRef = useRef<HTMLInputElement>(null);

  const handleExtractAiProfile = useCallback(async () => {
    if (!contact) return;
    setExtractingAi(true);
    try {
      const res = await fetch(\`/api/contacts/\${contact.id}/extract\`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to extract lead profile");
        return;
      }
      toast.success(\`Extracted lead profile! Score: \${json.lead_score} (\${json.lead_stage})\`);
      if (json.contact) {
        onContactUpdated?.(json.contact);
      }
    } catch (err) {
      toast.error("Network error extracting profile");
    } finally {
      setExtractingAi(false);
    }
  }, [contact, onContactUpdated]);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;
    const supabase = createClient();

    const [dealsRes, notesRes, tagsRes, allTagsRes] = await Promise.all([
      supabase.from("deals").select("*").eq("contact_id", contact.id).order("created_at", { ascending: false }),
      supabase.from("contact_notes").select("*").eq("contact_id", contact.id).order("created_at", { ascending: false }),
      supabase.from("contact_tags").select("id, tags(*)").eq("contact_id", contact.id),
      supabase.from("tags").select("*").eq("account_id", accountId).order("name"),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (allTagsRes.data) setAllTags(allTagsRes.data);
    if (tagsRes.data) {
      const mapped = tagsRes.data
        .filter((ct: Record<string, unknown>) => ct.tags)
        .map((ct: Record<string, unknown>) => ({
          ...(ct.tags as Tag),
          contact_tag_id: ct.id as string,
        }));
      setContactTags(mapped);
    }
  }, [contact, accountId]);

  useEffect(() => {
    fetchContactData();
  }, [contact, fetchContactData]);

  const assignedTagIds = useMemo(
    () => new Set(contactTags.map((tag) => tag.id)),
    [contactTags],
  );

  const availableTags = useMemo(
    () => allTags.filter((tag) => !assignedTagIds.has(tag.id)),
    [allTags, assignedTagIds],
  );

  const handleCopyPhone = useCallback(async () => {
    if (!contact?.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [contact]);

  const insertNote = useCallback(
    async (text: string) => {
      if (!contact || !text.trim() || !accountId) return null;

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("contact_notes")
        .insert({
          contact_id: contact.id,
          account_id: accountId,
          user_id: session?.user?.id,
          note_text: text.trim(),
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        return null;
      }
      if (data) setNotes((prev) => [data, ...prev]);
      return data as ContactNote;
    },
    [contact, accountId],
  );

  const handleAddNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    const inserted = await insertNote(newNote);
    if (inserted) setNewNote("");
    setAddingNote(false);
  }, [newNote, insertNote]);

  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!conversationId) return;
      setSavingStatus(true);
      const supabase = createClient();
      const { error } = await supabase
        .from("conversations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      setSavingStatus(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(\`Conversation marked as \${status}\`);
      onStatusChange?.(status);
    },
    [conversationId, onStatusChange],
  );

  const handleAddTag = useCallback(
    async (tagId: string) => {
      if (!contact || !tagId || assignedTagIds.has(tagId)) return;
      const tag = allTags.find((item) => item.id === tagId);
      if (!tag) return;

      setSavingTagId(tagId);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contact_tags")
        .insert({ contact_id: contact.id, tag_id: tagId })
        .select("id")
        .single();

      setSavingTagId(null);

      if (error) {
        toast.error(error.message);
        return;
      }

      setContactTags((prev) => [
        ...prev,
        { ...tag, contact_tag_id: data?.id as string },
      ]);
    },
    [contact, assignedTagIds, allTags],
  );

  const handleRemoveTag = useCallback(async (contactTagId: string) => {
    const snapshot = contactTags;
    setContactTags((prev) => prev.filter((tag) => tag.contact_tag_id !== contactTagId));

    const supabase = createClient();
    const { error } = await supabase
      .from("contact_tags")
      .delete()
      .eq("id", contactTagId);

    if (error) {
      setContactTags(snapshot);
      toast.error(error.message);
    }
  }, [contactTags]);

  const handleCreateAndAssignTag = useCallback(async () => {
    const name = newTagName.trim();
    if (!contact || !accountId || !name) return;

    setCreatingTag(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      setCreatingTag(false);
      toast.error("Not authenticated");
      return;
    }

    const color = "#22c55e";
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .insert({
        user_id: userId,
        account_id: accountId,
        name,
        color,
      })
      .select("*")
      .single();

    setCreatingTag(false);

    if (tagError) {
      toast.error(tagError.message);
      return;
    }

    const { data: contactTag, error: assignError } = await supabase
      .from("contact_tags")
      .insert({ contact_id: contact.id, tag_id: tag.id })
      .select("id")
      .single();

    if (assignError) {
      toast.error(assignError.message);
      setAllTags((prev) => [...prev, tag as Tag].sort((a, b) => a.name.localeCompare(b.name)));
      return;
    }

    setNewTagName("");
    setAllTags((prev) => [...prev, tag as Tag].sort((a, b) => a.name.localeCompare(b.name)));
    setContactTags((prev) => [
      ...prev,
      { ...(tag as Tag), contact_tag_id: contactTag?.id as string },
    ]);
    toast.success("Tag created");
  }, [newTagName, contact, accountId]);

  const handleReminder = useCallback(
    async (days: number, hour: number) => {
      if (!contact) return;
      setSavingReminder(true);
      const due = setMinutes(setHours(addDays(new Date(), days), hour), 0);
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          conversationId,
          title: \`Follow up with \${contact.name || contact.phone}\`,
          dueAt: due.toISOString(),
        }),
      });
      const json = await response.json().catch(() => null);
      setSavingReminder(false);
      if (!response.ok) {
        toast.error(json?.error || 'Could not save follow-up reminder');
        return;
      }
      toast.success(\`Follow-up scheduled for \${format(due, "MMM d, yyyy h:mm a")}\`);
    },
    [contact, conversationId],
  );

  const handleSaveContact = useCallback(async () => {
    if (!contact || !contactNameRef.current) return;
    const newName = contactNameRef.current.value.trim();
    if (!newName) {
      toast.error("Please enter a name");
      return;
    }

    setSavingContact(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq("id", contact.id)
      .select("*")
      .single();

    setSavingContact(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Contact name saved");
    if (data && onContactUpdated) {
      onContactUpdated(data as Contact);
    }
  }, [contact, onContactUpdated]);

  if (!contact) {
    return (
      <div className="flex h-full w-[340px] items-center justify-center border-l border-border bg-card/30 backdrop-blur-md">
        <p className="text-sm text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const initials = displayName.charAt(0).toUpperCase();
  const needsName = !contact.name?.trim();

  return (
    <div className="flex h-full w-[340px] flex-col border-l border-border bg-card/95 backdrop-blur-xl shadow-2xl">
      <ScrollArea className="flex-1">
        
        {/* PREMIUM HEADER */}
        <div className="relative border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent p-6 pb-5">
          <div className="flex items-start justify-between">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-xl font-bold text-primary shadow-inner border border-primary/20">
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-muted">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem onClick={handleExtractAiProfile}>
                  <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                  Auto-Profile with AI
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={\`/contacts/\${contact.id}\`}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Full Contact Page
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4">
            {needsName ? (
              <div className="flex items-center gap-2">
                <input
                  key={contact.id}
                  ref={contactNameRef}
                  defaultValue={contact.name ?? ""}
                  placeholder="Unknown Contact..."
                  className="h-8 flex-1 rounded-md border-b-2 border-transparent bg-transparent text-lg font-bold outline-none focus:border-primary placeholder:text-muted-foreground/60 transition-colors"
                />
                <Button size="sm" variant="secondary" className="h-7 text-xs rounded-full px-3" disabled={savingContact} onClick={handleSaveContact}>
                  Save
                </Button>
              </div>
            ) : (
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {displayName}
              </h2>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </span>
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[140px]">{contact.email}</span>
                </span>
              )}
            </div>
          </div>

          {/* QUICK TAGS */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            {contactTags.map((tag) => (
              <Badge 
                key={tag.contact_tag_id}
                variant="outline" 
                className="pl-2 pr-1.5 py-0.5 h-6 text-[10px] font-semibold flex items-center gap-1 rounded-md transition-all hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: \`\${tag.color}15\`, color: tag.color, borderColor: \`\${tag.color}30\` }}
                onClick={() => handleRemoveTag(tag.contact_tag_id)}
              >
                {tag.name}
                <X className="h-3 w-3 opacity-60 hover:opacity-100" />
              </Badge>
            ))}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 rounded-md border-dashed border-border/70 px-2 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors bg-transparent">
                  <Plus className="h-3 w-3 mr-1" /> Add Tag
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 rounded-xl" align="start">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <TagIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold">Assign Tags</span>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {availableTags.length > 0 ? (
                      availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => handleAddTag(tag.id)}
                          disabled={!!savingTagId}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-muted flex items-center gap-2 transition-colors"
                        >
                          <span className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: tag.color }} />
                          <span className="font-medium">{tag.name}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-1 text-[10px] text-muted-foreground">All tags assigned.</p>
                    )}
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex gap-2">
                      <input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Create new tag"
                        className="h-7 w-full rounded-md border bg-background px-2 text-xs outline-none focus:border-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAssignTag()}
                      />
                      <Button size="icon" className="h-7 w-7 rounded-md shrink-0" disabled={!newTagName.trim() || creatingTag} onClick={handleCreateAndAssignTag}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* PREMIUM METRICS SUMMARY */}
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Lead Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-foreground">{contact.lead_score ?? 0}</span>
              <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex flex-col justify-center">
             <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Chat Status</span>
             <Select value={conversationStatus} onValueChange={(val) => handleStatusChange(val as ConversationStatus)} disabled={savingStatus}>
                <SelectTrigger className="h-8 border-none bg-background/50 px-2 py-0 text-sm font-bold shadow-sm ring-1 ring-border/50 focus:ring-primary rounded-lg transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-xl min-w-[120px]">
                  {Object.entries(STATUS_LABEL).map(([val, lbl]) => (
                    <SelectItem key={val} value={val} className="text-xs font-medium rounded-lg focus:bg-primary/10 focus:text-primary">
                      {lbl}
                    </SelectItem>
                  ))}
                </SelectContent>
             </Select>
          </div>
        </div>

        {/* TABS (Intelligence, Notes, Deals) */}
        <div className="px-5 pb-6">
          <Tabs defaultValue="intel" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-9 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="intel" className="rounded-lg text-[11px] font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Intel</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg text-[11px] font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Notes</TabsTrigger>
              <TabsTrigger value="deals" className="rounded-lg text-[11px] font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Deals</TabsTrigger>
            </TabsList>

            {/* TAB: INTELLIGENCE */}
            <TabsContent value="intel" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Profile Details Card */}
              <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                <h4 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 text-primary/70" />
                  Profile Details
                </h4>
                
                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-[80px_1fr] items-baseline gap-2">
                    <span className="font-semibold text-muted-foreground">Company</span>
                    <span className="font-medium text-foreground">{contact.company || "—"}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] items-baseline gap-2">
                    <span className="font-semibold text-muted-foreground">Role</span>
                    <span className="font-medium text-foreground">{contact.decision_maker || "—"}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] items-baseline gap-2">
                    <span className="font-semibold text-muted-foreground">Timeline</span>
                    <span className="font-medium text-foreground">{contact.timeline || "—"}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] items-baseline gap-2">
                    <span className="font-semibold text-muted-foreground">Budget</span>
                    <span className="font-medium text-foreground">{contact.budget || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Requirement Card */}
              {(contact.requirement || contact.problem) && (
                <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-rose-500/70" />
                    Key Requirements
                  </h4>
                  {contact.requirement && (
                    <div className="mb-2">
                      <p className="text-xs leading-relaxed text-foreground/90">{contact.requirement}</p>
                    </div>
                  )}
                  {contact.problem && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="block text-[9px] font-bold uppercase text-muted-foreground mb-1">Pain Point</span>
                      <p className="text-xs leading-relaxed text-foreground/90">{contact.problem}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TAB: NOTES */}
            <TabsContent value="notes" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="relative rounded-xl border border-border bg-card p-1 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type an internal note..."
                  className="min-h-16 resize-none border-none text-xs shadow-none focus-visible:ring-0 px-2 py-2 bg-transparent"
                />
                <div className="flex justify-between items-center px-2 pb-1 pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <StickyNote className="h-3 w-3" /> Private Note
                  </span>
                  <Button size="sm" className="h-7 text-[10px] rounded-lg font-bold px-3" disabled={addingNote || !newNote.trim()} onClick={handleAddNote}>
                    {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No notes yet. Add one above.
                  </div>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="group relative rounded-xl border border-border/50 bg-amber-500/5 p-3 text-xs shadow-sm hover:border-amber-500/30 transition-colors">
                      <p className="whitespace-pre-wrap text-foreground/90">{n.note_text}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[9px] font-semibold text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(n.created_at), "MMM d, h:mm a")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB: DEALS */}
            <TabsContent value="deals" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-semibold text-muted-foreground">{deals.length} Active Deals</span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-primary hover:text-primary hover:bg-primary/10">
                  <Plus className="h-3 w-3 mr-1" /> New Deal
                </Button>
              </div>
              <div className="space-y-2">
                {deals.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">No active pipeline deals.</p>
                  </div>
                ) : (
                  deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={\`/pipelines?deal=\${deal.id}\`}
                      className="group flex flex-col rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{deal.title}</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md tabular-nums shrink-0">
                          $\{(deal.value ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <CircleDot className="h-3 w-3 text-primary/60" />
                          <span className="uppercase tracking-wider">{deal.stage_id.split('-')[0] || "Pipeline"}</span>
                        </div>
                        <span className="flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* FOLLOW-UP REMINDER BLOCK */}
          <div className="mt-8 rounded-xl border border-border/60 bg-muted/20 overflow-hidden shadow-sm">
            <div className="bg-muted/50 px-3 py-2 flex items-center gap-1.5 border-b border-border/60">
              <Clock3 className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Set Follow-up</h4>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2">
                {REMINDERS.map((r) => (
                  <Button
                    key={r.label}
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-[10px] font-semibold border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onClick={() => handleReminder(r.days, r.hour)}
                    disabled={savingReminder}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
`;

fs.writeFileSync('src/components/inbox/contact-sidebar.tsx', code);
