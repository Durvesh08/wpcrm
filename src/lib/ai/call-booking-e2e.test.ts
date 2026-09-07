import { describe, it, expect } from 'vitest'
import { parseGeneration } from './generate'
import { buildSystemPrompt } from './defaults'

describe('End-to-End AI Call Booking Simulation', () => {
  it('Scenario 1: Customer confirms a 4 PM call tomorrow', () => {
    const rawAiOutput = `Awesome! I have scheduled our discovery call for tomorrow at 4:00 PM. Looking forward to speaking with you! [[BOOK_CALL:{"datetime":"2026-09-08T16:00:00.000Z","title":"Discovery Call with Lead","kind":"meeting"}]]`
    
    const result = parseGeneration(rawAiOutput)

    // Customer must ONLY see the clean message text, with zero internal tags
    expect(result.text).toBe('Awesome! I have scheduled our discovery call for tomorrow at 4:00 PM. Looking forward to speaking with you!')
    expect(result.handoff).toBe(false)
    
    // System must capture the structured booking event
    expect(result.booking).toEqual({
      datetime: '2026-09-08T16:00:00.000Z',
      title: 'Discovery Call with Lead',
      kind: 'meeting',
      meetingLocation: undefined,
      meetingUrl: undefined,
    })
  })

  it('Scenario 2: Customer requests a Google Meet video call', () => {
    const rawAiOutput = `Great, I've booked our video demo on Google Meet for Friday at 11:30 AM. [[BOOK_CALL:{"datetime":"2026-09-11T11:30:00.000Z","title":"Product Demo Video Call","kind":"meeting","meetingLocation":"Google Meet"}]]`
    
    const result = parseGeneration(rawAiOutput)

    expect(result.text).toBe("Great, I've booked our video demo on Google Meet for Friday at 11:30 AM.")
    expect(result.booking).toMatchObject({
      datetime: '2026-09-11T11:30:00.000Z',
      title: 'Product Demo Video Call',
      kind: 'meeting',
      meetingLocation: 'Google Meet',
    })
  })

  it('Scenario 3: General conversation with no booking intent', () => {
    const rawAiOutput = `Our standard plan is $49/month and includes unlimited WhatsApp broadcasts.`
    
    const result = parseGeneration(rawAiOutput)

    expect(result.text).toBe('Our standard plan is $49/month and includes unlimited WhatsApp broadcasts.')
    expect(result.booking).toBeNull()
    expect(result.handoff).toBe(false)
  })

  it('Scenario 4: Customer asks for human agent (Handoff)', () => {
    const rawAiOutput = `[[HANDOFF]]`
    
    const result = parseGeneration(rawAiOutput)

    expect(result.handoff).toBe(true)
    expect(result.booking).toBeNull()
  })

  it('System Prompt includes current reference timestamp and booking guidelines', () => {
    const refTime = '2026-09-07T15:00:00.000Z'
    const prompt = buildSystemPrompt({
      userPrompt: 'We are an agency helping e-commerce brands.',
      mode: 'auto_reply',
      referenceTime: refTime,
    })

    expect(prompt).toContain('Calendar & Appointment Booking')
    expect(prompt).toContain(refTime)
    expect(prompt).toContain('[[BOOK_CALL:')
    expect(prompt).toContain('[[HANDOFF]]')
  })
})
