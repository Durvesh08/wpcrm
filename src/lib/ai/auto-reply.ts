import { supabaseAdmin } from './admin-client'
import { loadAiConfig } from './config'
import { buildConversationContext } from './context'
import { retrieveKnowledge } from './knowledge'
import { generateReply } from './generate'
import { buildSystemPrompt } from './defaults'
import { latestUserMessage } from './query'
import { claimManagedAiCredit } from './managed-usage'
import { engineSendText } from '@/lib/flows/meta-send'

interface DispatchArgs {
  /** Tenancy key — drives config, contact, and whatsapp_config lookups. */
  accountId: string
  conversationId: string
  contactId: string
  /** The account's WhatsApp config owner, used for the outbound send's
   *  audit columns (mirrors how the flow runner passes it through). */
  configOwnerUserId: string
}

/**
 * AI auto-reply for a freshly-arrived inbound message.
 *
 * Invoked from the WhatsApp webhook's `after()` block, only when no
 * deterministic flow consumed the message (flows win). Mirrors the flow
 * runner's contract: it owns its try/catch and NEVER throws — a failing
 * or slow LLM call must not affect the webhook's 200 to Meta.
 *
 * Eligibility gates (any → silent no-op):
 *   - AI off / auto-reply disabled for the account
 *   - a human agent is assigned (they own the thread)
 *   - auto-reply was disabled for this conversation (prior handoff)
 *   - the per-conversation reply cap is reached
 *   - there's nothing to reply to
 *
 * The 24h WhatsApp session window is inherently open here — we're
 * reacting to a customer message that just landed — so no separate
 * window check is needed.
 */
export async function dispatchInboundToAiReply(
  args: DispatchArgs,
): Promise<void> {
  const { accountId, conversationId, contactId, configOwnerUserId } = args

  try {
    const db = supabaseAdmin()

    const config = await loadAiConfig(db, accountId)
    if (!config || !config.autoReplyEnabled) return

    if (config.managedAi) {
      const hasCredit = await claimManagedAiCredit(db, configOwnerUserId, 'auto_reply')
      if (!hasCredit) {
        console.info('[ai auto-reply] managed AI allowance reached')
        return
      }
    }

    // Deterministic, user-configured responders win over the LLM — the
    // caller already excludes messages a Flow consumed. Message-level
    // automations (`new_message_received` / `keyword_match`) are
    // dispatched independently for this same inbound and may send their
    // own reply, so if the account has any active one we stand down to
    // avoid double-texting the customer. (Relationship triggers like
    // `first_inbound_message` don't count — they're not per-message
    // auto-responders.)
    const { data: autoResponders } = await db
      .from('automations')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .in('trigger_type', ['new_message_received', 'keyword_match'])
      .limit(1)
    if (autoResponders && autoResponders.length > 0) return

    const { data: conv, error: convErr } = await db
      .from('conversations')
      .select('assigned_agent_id, ai_autoreply_disabled, ai_reply_count')
      .eq('id', conversationId)
      .maybeSingle()
    if (convErr || !conv) return
    if (conv.assigned_agent_id) return // a human owns this thread
    if (conv.ai_autoreply_disabled) return // handed off / turned off here
    // Cheap early-out; the authoritative cap check is the atomic claim
    // below (this read can race a concurrent inbound).
    if (conv.ai_reply_count >= config.autoReplyMaxPerConversation) return

    const messages = await buildConversationContext(db, conversationId)
    if (messages.length === 0) return

    // Ground the reply in the account's knowledge base (best-effort).
    const knowledge = await retrieveKnowledge(
      db,
      accountId,
      config,
      latestUserMessage(messages),
    )

    const systemPrompt = buildSystemPrompt({
      userPrompt: config.systemPrompt,
      mode: 'auto_reply',
      knowledge,
    })

    const { text, handoff, booking, labels } = await generateReply({
      config,
      systemPrompt,
      messages,
    })

    if (handoff || !text) {
      // The model can't (or shouldn't) answer — stop auto-replying on
      // this thread and leave the inbound unanswered so it surfaces in
      // the inbox for a human. Sticky until an admin re-enables.
      await db
        .from('conversations')
        .update({ ai_autoreply_disabled: true })
        .eq('id', conversationId)
      return
    }

    // Atomically claim a reply slot: the cap check + increment happen in
    // one UPDATE, so concurrent inbounds can never overshoot the cap. If
    // another inbound just took the last slot, `claimed` is false and we
    // skip the send. (We consume a slot slightly before the send lands —
    // fail-safe: under-reply rather than over-reply.)
    const { data: claimed, error: claimErr } = await db.rpc(
      'claim_ai_reply_slot',
      {
        conversation_id: conversationId,
        max_replies: config.autoReplyMaxPerConversation,
      },
    )
    if (claimErr) {
      // A real error here (vs. losing the cap race) is almost always a
      // deploy issue — e.g. `claim_ai_reply_slot` not EXECUTE-able by the
      // service role, or the migration not applied. Log it loudly: a
      // silent return makes "auto-reply never fires" undiagnosable.
      console.error('[ai auto-reply] claim_ai_reply_slot failed:', claimErr)
      return
    }
    if (claimed !== true) return // lost the per-conversation cap race

    // If the AI identified the lead's industry, category, or service requirements,
    // apply them to contacts, conversation labels, and CRM tags.
    if (labels) {
      try {
        const contactUpdates: Record<string, unknown> = {}
        if (labels.industry) contactUpdates.industry = labels.industry
        if (labels.businessType) contactUpdates.business_type = labels.businessType
        if (labels.service) contactUpdates.requirement = labels.service

        if (Object.keys(contactUpdates).length > 0) {
          await db.from('contacts').update(contactUpdates).eq('id', contactId)
        }

        const chatLabel = labels.chatLabel || labels.industry || labels.service
        if (chatLabel) {
          await db
            .from('conversations')
            .update({ chat_label: chatLabel })
            .eq('id', conversationId)
        }

        if (labels.tags && labels.tags.length > 0) {
          for (const tagName of labels.tags) {
            const cleanName = tagName.trim()
            if (!cleanName) continue

            // Find or create tag
            let { data: tagRow } = await db
              .from('tags')
              .select('id')
              .eq('account_id', accountId)
              .ilike('name', cleanName)
              .maybeSingle()

            if (!tagRow) {
              const { data: newTag } = await db
                .from('tags')
                .insert({
                  account_id: accountId,
                  user_id: configOwnerUserId,
                  name: cleanName,
                  color: '#3b82f6',
                })
                .select('id')
                .maybeSingle()
              tagRow = newTag
            }

            if (tagRow?.id) {
              await db.from('contact_tags').upsert(
                { contact_id: contactId, tag_id: tagRow.id },
                { onConflict: 'contact_id,tag_id', ignoreDuplicates: true },
              )
            }
          }
        }
      } catch (labelErr) {
        console.error('[ai auto-reply] labeling handler error:', labelErr)
      }
    }

    // If the AI negotiated and booked a call with the customer, write it
    // directly into the team's Calendar & Tasks (follow_up_reminders).
    if (booking && booking.datetime) {
      try {
        const { error: remErr } = await db.from('follow_up_reminders').insert({
          account_id: accountId,
          contact_id: contactId,
          conversation_id: conversationId,
          user_id: configOwnerUserId,
          assigned_user_id: configOwnerUserId,
          kind: booking.kind || 'meeting',
          title: booking.title || 'Call booked via AI',
          due_at: booking.datetime,
          status: 'scheduled',
          meeting_location: booking.meetingLocation || null,
          meeting_url: booking.meetingUrl || null,
          reminder_minutes_before: 30,
        })

        if (remErr) {
          console.error('[ai auto-reply] failed to create calendar booking:', remErr)
        } else {
          // Update contact next_follow_up_at and advance lead stage
          await db
            .from('contacts')
            .update({
              next_follow_up_at: booking.datetime,
              lead_stage: 'sales_ready',
              last_contacted_at: new Date().toISOString(),
            })
            .eq('id', contactId)

          // In-app notification for the team
          const { data: contactRow } = await db
            .from('contacts')
            .select('name, phone')
            .eq('id', contactId)
            .maybeSingle()

          const contactLabel = contactRow?.name || contactRow?.phone || 'a customer'
          const formattedTime = new Date(booking.datetime).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })

          await db
            .from('notifications')
            .insert({
              account_id: accountId,
              user_id: configOwnerUserId,
              type: 'conversation_assigned',
              conversation_id: conversationId,
              contact_id: contactId,
              title: '📅 New Call Booked by AI',
              body: `AI scheduled a ${booking.kind || 'call'} with ${contactLabel} for ${formattedTime}`,
            })
        }
      } catch (bookErr) {
        console.error('[ai auto-reply] booking handler error:', bookErr)
      }
    }

    await engineSendText({
      accountId,
      userId: configOwnerUserId,
      conversationId,
      contactId,
      text,
    })
  } catch (err) {
    console.error('[ai auto-reply] dispatch failed:', err)
  }
}
