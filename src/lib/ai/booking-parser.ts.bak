import type { AppointmentBooking, LeadLabeling } from './types'
import { HANDOFF_SENTINEL } from './defaults'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+05:30

/**
 * Parses informal, relative, Hinglish, or ISO date-time strings into a standard UTC ISO-8601 string.
 */
export function parseBookingDateTime(raw: string, referenceDate: Date = new Date()): string | null {
  if (!raw || typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null

  // 1. If it's already an explicit ISO string with timezone or Z:
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString()
    }
  }

  // 2. Reference date in IST (+05:30)
  const refIstMs = referenceDate.getTime() + IST_OFFSET_MS
  const refIst = new Date(refIstMs)

  let targetYear = refIst.getUTCFullYear()
  let targetMonth = refIst.getUTCMonth() // 0-indexed
  let targetDay = refIst.getUTCDate()

  const lower = s.toLowerCase()

  // Weekday mapping
  const weekdays: Record<string, number> = {
    sunday: 0,
    ravivar: 0,
    monday: 1,
    somwar: 1,
    tuesday: 2,
    mangalwar: 2,
    wednesday: 3,
    budhwar: 3,
    thursday: 4,
    guruwar: 4,
    friday: 5,
    shukrawar: 5,
    saturday: 6,
    shaniwar: 6,
  }

  // Relative Day resolution
  if (/\b(tarso|day after parso)\b/i.test(lower)) {
    targetDay += 3
  } else if (/\b(parso|parson|day after tomorrow)\b/i.test(lower)) {
    targetDay += 2
  } else if (/\b(kal|tomorrow|next day)\b/i.test(lower)) {
    targetDay += 1
  } else if (/\b(aaj|today)\b/i.test(lower)) {
    // keep targetDay as today
  } else {
    // Check weekday
    let foundWeekday = false
    for (const [name, dow] of Object.entries(weekdays)) {
      const re = new RegExp(`\\b${name}\\b`, 'i')
      if (re.test(lower)) {
        const curDow = refIst.getUTCDay()
        let diff = (dow - curDow + 7) % 7
        if (diff === 0) diff = 7 // next occurrence
        targetDay += diff
        foundWeekday = true
        break
      }
    }

    if (!foundWeekday) {
      // Check explicit date format: YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY
      const ymdMatch = lower.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/)
      const dmyMatch = lower.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/)
      if (ymdMatch) {
        targetYear = parseInt(ymdMatch[1], 10)
        targetMonth = parseInt(ymdMatch[2], 10) - 1
        targetDay = parseInt(ymdMatch[3], 10)
      } else if (dmyMatch) {
        targetDay = parseInt(dmyMatch[1], 10)
        targetMonth = parseInt(dmyMatch[2], 10) - 1
        targetYear = parseInt(dmyMatch[3], 10)
      }
    }
  }

  // Time resolution: look for hours & minutes
  let hours = -1
  let minutes = 0

  // Pattern: "12:00 PM", "12:30", "12 baje", "12:00 baje", "3pm", "3 pm", "4:30 pm"
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|o'clock)?\b/i
  const match = lower.match(timeRegex)

  if (match) {
    let h = parseInt(match[1], 10)
    const m = match[2] ? parseInt(match[2], 10) : 0
    const ampm = match[3]?.toLowerCase()

    const isPmHint = /\b(pm|dopahar|din me|din ke|afternoon|shaam|sham|evening|raat|night)\b/i.test(lower)
    const isAmHint = /\b(am|subah|morning)\b/i.test(lower)

    if (ampm === 'pm') {
      if (h < 12) h += 12
    } else if (ampm === 'am') {
      if (h === 12) h = 0
    } else if (isPmHint) {
      if (h < 12 && h !== 12) {
        h += 12
      } else if (h === 12) {
        h = 12
      }
    } else if (isAmHint) {
      if (h === 12) h = 0
    } else {
      // Default heuristics: 1..7 without am/pm are usually afternoon/evening business hours (1 PM - 7 PM)
      if (h >= 1 && h <= 7) {
        h += 12
      }
    }
    hours = h
    minutes = m
  }

  if (hours === -1) {
    // If relative day was recognized (like "kal" or "tomorrow"), default to 12:00 PM noon IST
    if (/\b(kal|tomorrow|parso|aaj|today)\b/i.test(lower)) {
      hours = 12
      minutes = 0
    } else {
      // Try generic Date fallback
      const fb = new Date(s)
      if (!Number.isNaN(fb.getTime())) {
        return fb.toISOString()
      }
      return null
    }
  }

  // Construct target UTC timestamp from IST date components
  const targetUtcMs = Date.UTC(targetYear, targetMonth, targetDay, hours, minutes, 0, 0) - IST_OFFSET_MS
  const finalDate = new Date(targetUtcMs)
  if (Number.isNaN(finalDate.getTime())) return null
  return finalDate.toISOString()
}

/**
 * Strips all internal control tags and sentinels so zero internal syntax leaks to WhatsApp.
 */
export function sanitizeAiMessageText(text: string): string {
  if (!text || typeof text !== 'string') return ''
  let cleaned = text

  // 1. Remove handoff sentinel
  cleaned = cleaned.split(HANDOFF_SENTINEL).join('')

  // 2. Remove closed tags
  cleaned = cleaned.replace(/\[\[LABEL:\s*[\s\S]*?\]\]/gi, '')
  cleaned = cleaned.replace(/\[\[BOOK_CALL:\s*[\s\S]*?\]\]/gi, '')

  // 3. Remove unclosed / truncated tags up to next [[ or end of string
  cleaned = cleaned.replace(/\[\[(?:LABEL|BOOK_CALL|HANDOFF)[\s\S]*?(?=\[\[|$)/gi, '')

  // 4. Remove any remaining [[...]] blocks
  cleaned = cleaned.replace(/\[\[[\s\S]*?\]\]/g, '')

  // 5. Remove any trailing unclosed [[... at end of string
  cleaned = cleaned.replace(/\[\[[\s\S]*$/g, '')

  return cleaned.trim()
}

/**
 * Detects if the AI message confirmed a call booking even if the explicit tag was omitted or malformed.
 */
export function detectBookingFromText(text: string, referenceDate: Date = new Date()): AppointmentBooking | null {
  if (!text || typeof text !== 'string') return null

  // Must have clear confirmation phrasing (e.g. "schedule kar diya", "booked our call", "call confirm ho gayi")
  const hasConfirmation =
    /(?:schedule\s*kar\s*diya|schedule\s*ho\s*gaya|scheduled\s*(?:our|your|the)?\s*(?:call|meeting)|booked\s*(?:our|your|the)?\s*(?:call|meeting)|call\s*confirm\s*ho\s*gayi|call\s*schedule\s*ho\s*gayi|meeting\s*schedule|meeting\s*booked|appointment\s*scheduled)/i.test(
      text,
    )

  if (!hasConfirmation) return null

  // Must have date/time indicator
  const hasTimeIndicator =
    /(?:kal|tomorrow|parso|aaj|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\b\d{1,2}(?::\d{2})?\s*(?:am|pm|baje)\b)/i.test(
      text,
    )

  if (!hasTimeIndicator) return null

  const iso = parseBookingDateTime(text, referenceDate)
  if (!iso) return null

  return {
    datetime: iso,
    title: 'Call booked via AI',
    kind: 'meeting',
  }
}

/**
 * Normalizes labels to ensure specific industry niches (e.g. "Trading" / "Share Market")
 * and exact ad platforms (e.g. "Meta Ads" instead of generic "Ads Agency") are captured.
 */
export function normalizeAiLabels(
  labels: LeadLabeling | null,
  contextText: string = '',
): LeadLabeling | null {
  const lower = contextText.toLowerCase()

  let industry = labels?.industry
  let service = labels?.service
  let businessType = labels?.businessType
  let tags = labels?.tags ? [...labels.tags] : []
  let chatLabel = labels?.chatLabel

  // Check for Meta Ads / Facebook Ads / Instagram Ads
  if (/\b(meta ads?|facebook ads?|fb ads?|insta(?:gram)? ads?)\b/i.test(lower)) {
    if (service === 'Ads Agency' || !service) {
      service = 'Meta Ads'
    }
    tags = tags.map((t) => (t.toLowerCase() === 'ads agency' ? 'Meta Ads' : t))
    if (!tags.some((t) => /meta ads/i.test(t))) {
      tags.push('Meta Ads')
    }
    if (chatLabel === 'Ads Agency') {
      chatLabel = 'Meta Ads'
    }
  } else if (/\b(google ads?|ppc)\b/i.test(lower)) {
    if (service === 'Ads Agency' || !service) {
      service = 'Google Ads'
    }
    tags = tags.map((t) => (t.toLowerCase() === 'ads agency' ? 'Google Ads' : t))
    if (!tags.some((t) => /google ads/i.test(t))) {
      tags.push('Google Ads')
    }
    if (chatLabel === 'Ads Agency') {
      chatLabel = 'Google Ads'
    }
  }

  // Check for Trading / Share Market / Stock Market
  if (/\b(share\s*market|trading|stocks?|forex|crypto)\b/i.test(lower)) {
    if (industry === 'Finance' || !industry) {
      industry = 'Trading'
    }
    tags = tags.map((t) => (t.toLowerCase() === 'finance' ? 'Trading' : t))
    if (!tags.some((t) => /trading|share\s*market/i.test(t))) {
      tags.push('Trading')
    }
    if (!chatLabel || chatLabel === 'Finance' || chatLabel === 'Ads Agency') {
      chatLabel = 'Trading'
    }
  }

  // Check for Real Estate
  if (/\b(real\s*estate|property|builder)\b/i.test(lower)) {
    if (!industry) industry = 'Real Estate'
    if (!tags.some((t) => /real\s*estate/i.test(t))) tags.push('Real Estate')
    if (!chatLabel) chatLabel = 'Real Estate'
  }

  // Check for Healthcare
  if (/\b(healthcare|clinic|hospital|doctor)\b/i.test(lower)) {
    if (!industry) industry = 'Healthcare'
    if (!tags.some((t) => /healthcare/i.test(t))) tags.push('Healthcare')
    if (!chatLabel) chatLabel = 'Healthcare'
  }

  // Check for Automation
  if (/\b(automation|chatbot|bot)\b/i.test(lower)) {
    if (!service) service = 'Automation'
    if (!tags.some((t) => /automation/i.test(t))) tags.push('Automation')
  }

  // Check for Web Dev
  if (/\b(web\s*dev|website|web\s*app)\b/i.test(lower)) {
    if (!service) service = 'Web Dev'
    if (!tags.some((t) => /web\s*dev/i.test(t))) tags.push('Web Dev')
  }

  // Check for App Dev
  if (/\b(app\s*dev|mobile\s*app|android\s*app|ios\s*app)\b/i.test(lower)) {
    if (!service) service = 'App Dev'
    if (!tags.some((t) => /app\s*dev/i.test(t))) tags.push('App Dev')
  }

  // Deduplicate tags
  tags = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)))

  if (industry || service || businessType || tags.length > 0 || chatLabel) {
    return {
      industry,
      service,
      businessType,
      tags: tags.length > 0 ? tags : (industry ? [industry] : service ? [service] : []),
      chatLabel: chatLabel || industry || service,
    }
  }

  return labels
}
