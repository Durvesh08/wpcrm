import { describe, it, expect } from 'vitest'
import { extractJsonObject } from './route'

describe('extractJsonObject — robust LLM JSON parsing', () => {
  it('parses valid JSON inside markdown code fences', () => {
    const raw = '```json\n{\n  "name": "Durvesh",\n  "industry": "Trading",\n  "requirement": "Meta Ads"\n}\n```'
    const res = extractJsonObject(raw)
    expect(res).toEqual({
      name: 'Durvesh',
      industry: 'Trading',
      requirement: 'Meta Ads',
    })
  })

  it('repairs and parses JSON with literal unescaped newlines in string literals', () => {
    const raw = `{\n  "name": "Durvesh",\n  "conversation_summary": "Line 1 summary\nLine 2 continued on new line",\n  "industry": "Trading"\n}`
    const res = extractJsonObject(raw)
    expect(res?.name).toBe('Durvesh')
    expect(res?.industry).toBe('Trading')
    expect(res?.conversation_summary).toContain('Line 1 summary')
    expect(res?.conversation_summary).toContain('Line 2 continued')
  })

  it('repairs trailing commas before closing braces', () => {
    const raw = '{\n  "name": "Durvesh",\n  "requirement": "Meta Ads",\n}'
    const res = extractJsonObject(raw)
    expect(res).toEqual({
      name: 'Durvesh',
      requirement: 'Meta Ads',
    })
  })

  it('handles Python-style None, True, False literals', () => {
    const raw = '{\n  "company": None,\n  "decision_maker": True,\n  "budget": None\n}'
    const res = extractJsonObject(raw)
    expect(res?.company).toBeNull()
    expect(res?.decision_maker).toBe(true)
    expect(res?.budget).toBeNull()
  })

  it('repairs truncated JSON with missing closing quotes and braces', () => {
    const raw = '{\n  "name": "Durvesh",\n  "industry": "Trading",\n  "conversation_summary": "Looking for meta ads'
    const res = extractJsonObject(raw)
    expect(res?.name).toBe('Durvesh')
    expect(res?.industry).toBe('Trading')
  })

  it('unwraps nested profile or data objects', () => {
    const raw = '{\n  "profile": {\n    "name": "Durvesh",\n    "industry": "Trading"\n  }\n}'
    const res = extractJsonObject(raw)
    expect(res?.name).toBe('Durvesh')
    expect(res?.industry).toBe('Trading')
  })

  it('falls back to regex field extraction when JSON syntax is completely broken', () => {
    const raw = `
Here is the extracted contact info:
name: "Durvesh"
industry: "Trading"
requirement: "Meta Ads"
next_follow_up_at: "2026-09-15T06:30:00.000Z"
conversation_summary: "Confirmed call for tomorrow"
`
    const res = extractJsonObject(raw)
    expect(res?.name).toBe('Durvesh')
    expect(res?.industry).toBe('Trading')
    expect(res?.requirement).toBe('Meta Ads')
    expect(res?.next_follow_up_at).toBe('2026-09-15T06:30:00.000Z')
    expect(res?.conversation_summary).toBe('Confirmed call for tomorrow')
  })
})
