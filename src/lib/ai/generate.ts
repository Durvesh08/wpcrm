import { AiError, type AiConfig, type ChatMessage, type GenerateResult, type AppointmentBooking, type LeadLabeling } from './types'
import { HANDOFF_SENTINEL, aiRequestTimeoutMs } from './defaults'
import { generateOpenAi } from './providers/openai'
import { generateAnthropic } from './providers/anthropic'
import { generateGemini } from './providers/gemini'

import {
  parseBookingDateTime,
  sanitizeAiMessageText,
  detectBookingFromText,
  normalizeAiLabels,
} from './booking-parser'

export {
  parseBookingDateTime,
  sanitizeAiMessageText,
  detectBookingFromText,
  normalizeAiLabels,
}

export interface GenerateArgs {
  config: AiConfig
  /** Fully-built system prompt (see `buildSystemPrompt`). */
  systemPrompt: string
  /** Recent conversation turns, oldest first. */
  messages: ChatMessage[]
  referenceDate?: Date
}

/**
 * Generate the next reply from the account's configured provider.
 * Dispatches to the right adapter, then parses the handoff sentinel out
 * of the raw text. Throws `AiError` on any provider/network failure.
 */
export async function generateReply(args: GenerateArgs): Promise<GenerateResult> {
  const { config, systemPrompt, messages, referenceDate } = args
  const timeoutMs = aiRequestTimeoutMs()
  const providerArgs = {
    apiKey: config.apiKey,
    model: config.model,
    systemPrompt,
    messages,
    timeoutMs,
  }

  let raw: string
  switch (config.provider) {
    case 'openai':
      raw = await generateOpenAi(providerArgs)
      break
    case 'anthropic':
      raw = await generateAnthropic(providerArgs)
      break
    case 'gemini':
      raw = await generateGemini(providerArgs)
      break
    default:
      throw new AiError(`Unsupported AI provider: ${config.provider}`, {
        code: 'unsupported_provider',
        status: 400,
      })
  }

  return parseGeneration(raw, referenceDate)
}

/**
 * Split the raw model output into `{ text, handoff, booking, labels }`.
 * Any [[BOOK_CALL:{...}]] and [[LABEL:{...}]] tags are parsed cleanly.
 * All internal tags are safely stripped so no code syntax leaks to WhatsApp.
 */
export function parseGeneration(raw: string, referenceDate: Date = new Date()): GenerateResult {
  const handoff = raw.includes(HANDOFF_SENTINEL)
  let cleaned = raw.split(HANDOFF_SENTINEL).join('')

  let booking: AppointmentBooking | null = null
  let labels: LeadLabeling | null = null

  // 1. Scan for [[LABEL:{...}]] (both closed and unclosed)
  const labelRegex = /\[\[LABEL:\s*(\{[\s\S]*?\})\s*\]\]/i
  const unclosedLabelRegex = /\[\[LABEL:\s*(\{[\s\S]*?)(?:\]\]|$)/i
  const labelMatch = cleaned.match(labelRegex) || cleaned.match(unclosedLabelRegex)
  if (labelMatch) {
    try {
      let jsonStr = labelMatch[1].trim()
      if (!jsonStr.endsWith('}')) {
        const openBraces = (jsonStr.match(/\{/g) || []).length
        const closeBraces = (jsonStr.match(/\}/g) || []).length
        if (openBraces > closeBraces) {
          jsonStr += '}'.repeat(openBraces - closeBraces)
        }
      }
      const parsed = JSON.parse(jsonStr)
      const tags = Array.isArray(parsed?.tags)
        ? parsed.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
        : []
      const industry = typeof parsed?.industry === 'string' && parsed.industry.trim()
        ? parsed.industry.trim().slice(0, 100)
        : undefined
      const service = typeof parsed?.service === 'string' && parsed.service.trim()
        ? parsed.service.trim().slice(0, 100)
        : undefined
      const businessType = typeof parsed?.businessType === 'string' && parsed.businessType.trim()
        ? parsed.businessType.trim().slice(0, 100)
        : undefined
      const chatLabel = typeof parsed?.chatLabel === 'string' && parsed.chatLabel.trim()
        ? parsed.chatLabel.trim().slice(0, 50)
        : industry || service

      if (industry || service || businessType || tags.length > 0 || chatLabel) {
        labels = {
          industry,
          service,
          businessType,
          tags: tags.length > 0 ? tags : (industry ? [industry] : service ? [service] : []),
          chatLabel,
        }
      }
    } catch {
      // Ignore malformed JSON in label tag
    }
  }

  // 2. Scan for [[BOOK_CALL:{...}]] (both closed and unclosed)
  const bookCallRegex = /\[\[BOOK_CALL:\s*(\{[\s\S]*?\})\s*\]\]/i
  const unclosedBookCallRegex = /\[\[BOOK_CALL:\s*(\{[\s\S]*?)(?:\]\]|$)/i
  const match = cleaned.match(bookCallRegex) || cleaned.match(unclosedBookCallRegex)
  if (match) {
    try {
      let jsonStr = match[1].trim()
      if (!jsonStr.endsWith('}')) {
        const openBraces = (jsonStr.match(/\{/g) || []).length
        const closeBraces = (jsonStr.match(/\}/g) || []).length
        if (openBraces > closeBraces) {
          jsonStr += '}'.repeat(openBraces - closeBraces)
        }
      }
      const parsed = JSON.parse(jsonStr)
      if (typeof parsed?.datetime === 'string' && parsed.datetime.trim()) {
        const iso = parseBookingDateTime(parsed.datetime, referenceDate)
        if (iso) {
          booking = {
            datetime: iso,
            title: typeof parsed.title === 'string' && parsed.title.trim()
              ? parsed.title.trim().slice(0, 240)
              : 'Call booked via AI',
            kind: ['follow_up', 'call', 'whatsapp', 'meeting', 'note'].includes(parsed.kind)
              ? parsed.kind
              : 'meeting',
            meetingLocation: typeof parsed.meetingLocation === 'string'
              ? parsed.meetingLocation.trim().slice(0, 240)
              : undefined,
            meetingUrl: typeof parsed.meetingUrl === 'string'
              ? parsed.meetingUrl.trim().slice(0, 500)
              : undefined,
          }
        }
      }
    } catch {
      // Ignore malformed JSON in booking tag
    }
  }

  // 3. Robust sanitization of all control tags so NOTHING leaks to WhatsApp
  cleaned = sanitizeAiMessageText(cleaned)

  // 4. Fallback booking detection: if no booking tag was parsed, but the message text
  // confirms a scheduled call (e.g. "Aapka call kal dopahar 12:00 baje ke liye schedule kar diya gaya hai"),
  // automatically extract and schedule the call!
  if (!booking) {
    booking = detectBookingFromText(cleaned, referenceDate)
  }

  // 5. Post-process & normalize labels (e.g. "Ads Agency" -> "Meta Ads", "Trading" / "Share Market")
  labels = normalizeAiLabels(labels, raw)

  const text = cleaned.trim()
  return { text, handoff, booking, labels }
}
