import { AiError, type AiConfig, type ChatMessage, type GenerateResult, type AppointmentBooking, type LeadLabeling } from './types'
import { HANDOFF_SENTINEL, aiRequestTimeoutMs } from './defaults'
import { generateOpenAi } from './providers/openai'
import { generateAnthropic } from './providers/anthropic'
import { generateGemini } from './providers/gemini'

export interface GenerateArgs {
  config: AiConfig
  /** Fully-built system prompt (see `buildSystemPrompt`). */
  systemPrompt: string
  /** Recent conversation turns, oldest first. */
  messages: ChatMessage[]
}

/**
 * Generate the next reply from the account's configured provider.
 * Dispatches to the right adapter, then parses the handoff sentinel out
 * of the raw text. Throws `AiError` on any provider/network failure.
 */
export async function generateReply(args: GenerateArgs): Promise<GenerateResult> {
  const { config, systemPrompt, messages } = args
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

  return parseGeneration(raw)
}

/**
 * Split the raw model output into `{ text, handoff, booking, labels }`. The sentinel can
 * appear alone or trailing a partial reply; either way we treat the
 * turn as a handoff and strip the marker from any remaining text.
 * Any [[BOOK_CALL:{...}]] and [[LABEL:{...}]] tags are parsed cleanly.
 */
export function parseGeneration(raw: string): GenerateResult {
  const handoff = raw.includes(HANDOFF_SENTINEL)
  let cleaned = raw.split(HANDOFF_SENTINEL).join('')

  let booking: AppointmentBooking | null = null
  let labels: LeadLabeling | null = null

  // Scan for [[LABEL:{...}]]
  const labelRegex = /\[\[LABEL:\s*(\{[\s\S]*?\})\s*\]\]/i
  const labelMatch = cleaned.match(labelRegex)
  if (labelMatch) {
    try {
      const parsed = JSON.parse(labelMatch[1])
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
    cleaned = cleaned.replace(labelRegex, '')
  }

  // Scan for [[BOOK_CALL:{...}]]
  const bookCallRegex = /\[\[BOOK_CALL:\s*(\{[\s\S]*?\})\s*\]\]/i
  const match = cleaned.match(bookCallRegex)
  if (match) {
    try {
      const parsed = JSON.parse(match[1])
      if (typeof parsed?.datetime === 'string' && parsed.datetime.trim()) {
        const d = new Date(parsed.datetime)
        if (!Number.isNaN(d.getTime())) {
          booking = {
            datetime: d.toISOString(),
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
    cleaned = cleaned.replace(bookCallRegex, '')
  }

  const text = cleaned.trim()
  return { text, handoff, booking, labels }
}
