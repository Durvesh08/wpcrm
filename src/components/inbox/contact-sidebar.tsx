"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Contact, Deal, ContactNote, Tag, ConversationStatus } from "@/types";
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

interface ContactSidebarProps {
  contact: Contact | null;
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
  const [savingTagId, setSavingTagId] = useState<string | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const contactNameRef = useRef<HTMLInputElement>(null);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();

    const [dealsRes, notesRes, tagsRes, allTagsRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, stage:pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_tags")
        .select("id, tag_id, tags(*)")
        .eq("contact_id", contact.id),
      supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true }),
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
  }, [contact]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleSaveContact = useCallback(async () => {
    const nextName = contactNameRef.current?.value.trim() ?? "";
    if (!contact || !nextName) return;
    setSavingContact(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .update({ name: nextName })
      .eq("id", contact.id)
      .select("*")
      .single();

    setSavingContact(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Contact saved");
    if (data) onContactUpdated?.(data as Contact);
  }, [contact, onContactUpdated]);

  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!contact || status === conversationStatus) return;
      setSavingStatus(true);
      onStatusChange?.(status);
      setSavingStatus(false);
    },
    [contact, conversationStatus, onStatusChange],
  );

  const handleAddTag = useCallback(
    async (tagId: string | null) => {
      if (!tagId) return;
      if (!contact || assignedTagIds.has(tagId)) return;
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

    if (tagError || !tag) {
      setCreatingTag(false);
      toast.error(tagError?.message || "Failed to create tag");
      return;
    }

    const { data: contactTag, error: assignError } = await supabase
      .from("contact_tags")
      .insert({ contact_id: contact.id, tag_id: tag.id })
      .select("id")
      .single();

    setCreatingTag(false);

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
      setSavingReminder(true);
      const due = setMinutes(setHours(addDays(new Date(), days), hour), 0);
      const inserted = await insertNote(
        `Follow-up reminder: ${format(due, "MMM d, yyyy h:mm a")}`,
      );
      setSavingReminder(false);
      if (inserted) toast.success("Follow-up reminder saved");
    },
    [insertNote],
  );

  if (!contact) {
    return (
      <div className="flex h-full w-80 items-center justify-center border-l border-border bg-card">
        <p className="text-sm text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const initials = displayName.charAt(0).toUpperCase();
  const needsName = !contact.name?.trim();

  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-card">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-semibold text-foreground">
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={displayName}
                  className="h-16 w-16 object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              {displayName}
            </h3>
            {contact.company && (
              <p className="text-xs text-muted-foreground">{contact.company}</p>
            )}
          </div>

          <section className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <CircleDot className="h-3 w-3" />
              Chat Status
            </div>
            <Select
              value={conversationStatus}
              onValueChange={(value) => handleStatusChange(value as ConversationStatus)}
              disabled={savingStatus}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {needsName && (
            <section className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase text-primary">
                <UserPlus className="h-3 w-3" />
                Save Contact
              </div>
              <input
                key={contact.id}
                ref={contactNameRef}
                defaultValue={contact.name ?? ""}
                placeholder="Customer name"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/60"
              />
              <Button
                size="sm"
                className="w-full"
                disabled={savingContact}
                onClick={handleSaveContact}
              >
                Save contact
              </Button>
            </section>
          )}

          <section className="space-y-2">
            <button
              onClick={handleCopyPhone}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-left">{contact.phone}</span>
              {copied ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>

            {contact.email && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase text-muted-foreground">
              <TagIcon className="h-3 w-3" />
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contactTags.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No tags</p>
              ) : (
                contactTags.map((tag) => (
                  <button
                    key={tag.contact_tag_id}
                    onClick={() => handleRemoveTag(tag.contact_tag_id)}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      borderColor: `${tag.color}50`,
                    }}
                    title="Remove tag"
                  >
                    {tag.name}
                    <X className="h-3 w-3" />
                  </button>
                ))
              )}
            </div>

            {availableTags.length > 0 ? (
              <Select
                value=""
                onValueChange={handleAddTag}
                disabled={!!savingTagId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={savingTagId ? "Adding..." : "+ Add tag"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="px-1 text-xs text-muted-foreground">
                No more tags available.
              </p>
            )}

            <div className="flex gap-2">
              <input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="New tag"
                className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary/60"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
                disabled={!newTagName.trim() || creatingTag}
                onClick={handleCreateAndAssignTag}
              >
                Create
              </Button>
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              Follow-up
            </div>
            <div className="grid grid-cols-3 gap-2">
              {REMINDERS.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="px-2 text-xs"
                  disabled={savingReminder}
                  onClick={() => handleReminder(item.days, item.hour)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase text-muted-foreground">
              <StickyNote className="h-3 w-3" />
              Notes
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="min-h-16 flex-1 resize-none text-xs"
              />
              <Button
                size="sm"
                className="h-auto px-2"
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No notes</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-muted px-3 py-2">
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {note.note_text}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Active Deals
            </div>
            <div className="space-y-2">
              {deals.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No deals</p>
              ) : (
                deals.map((deal) => (
                  <div key={deal.id} className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-sm font-medium text-foreground">
                      {deal.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {deal.currency ?? "$"}
                        {deal.value.toLocaleString()}
                      </span>
                      {deal.stage && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: `${deal.stage.color}20`,
                            color: deal.stage.color,
                          }}
                        >
                          {deal.stage.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
