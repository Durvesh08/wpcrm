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

  it('Scenario 5: Lead mentions industry (Healthcare) and service needed (Automation)', () => {
    const rawAiOutput = `We would be happy to help automate patient follow-ups for your healthcare practice! [[LABEL:{"industry":"Healthcare","service":"Automation","tags":["Healthcare","Automation"],"chatLabel":"Healthcare"}]]`
    
    const result = parseGeneration(rawAiOutput)

    expect(result.text).toBe('We would be happy to help automate patient follow-ups for your healthcare practice!')
    expect(result.handoff).toBe(false)
    expect(result.booking).toBeNull()
    expect(result.labels).toEqual({
      industry: 'Healthcare',
      service: 'Automation',
      businessType: undefined,
      tags: ['Healthcare', 'Automation'],
      chatLabel: 'Healthcare',
    })
  })

  it('Scenario 6: Lead in Real Estate requests Web Dev and books a meeting', () => {
    const rawAiOutput = `Perfect! I have scheduled our discovery call for tomorrow at 2:00 PM to discuss building a custom website for your real estate agency. [[BOOK_CALL:{"datetime":"2026-09-08T14:00:00.000Z","title":"Real Estate Web Dev Call","kind":"meeting"}]] [[LABEL:{"industry":"Real Estate","service":"Web Dev","tags":["Real Estate","Web Dev"],"chatLabel":"Real Estate"}]]`
    
    const result = parseGeneration(rawAiOutput)

    expect(result.text).toBe('Perfect! I have scheduled our discovery call for tomorrow at 2:00 PM to discuss building a custom website for your real estate agency.')
    expect(result.booking?.title).toBe('Real Estate Web Dev Call')
    expect(result.labels).toEqual({
      industry: 'Real Estate',
      service: 'Web Dev',
      businessType: undefined,
      tags: ['Real Estate', 'Web Dev'],
      chatLabel: 'Real Estate',
    })
  })

  it('Scenario 7 (Customer Screenshot): Customer confirms "Kal din me 12 baje", call is booked on calendar', () => {
    const refDate = new Date('2026-09-14T09:00:00.000Z') // Monday 2:30 PM IST
    // Case A: AI returns booking tag with informal Hindi datetime
    const rawAiOutput1 = `Perfect! Aapka call kal dopahar 12:00 baje ke liye schedule kar diya gaya hai. Hamare expert aapse connect karenge. [[BOOK_CALL:{"datetime":"kal din me 12 baje","title":"Discovery Call"}]]`
    const res1 = parseGeneration(rawAiOutput1, refDate)
    expect(res1.text).toBe('Perfect! Aapka call kal dopahar 12:00 baje ke liye schedule kar diya gaya hai. Hamare expert aapse connect karenge.')
    expect(res1.booking?.datetime).toBe('2026-09-15T06:30:00.000Z')

    // Case B: AI omitted the tag, but confirmed in the text
    const rawAiOutput2 = `Perfect! Aapka call kal dopahar 12:00 baje ke liye schedule kar diya gaya hai. Hamare expert aapse connect karenge.`
    const res2 = parseGeneration(rawAiOutput2, refDate)
    expect(res2.text).toBe('Perfect! Aapka call kal dopahar 12:00 baje ke liye schedule kar diya gaya hai. Hamare expert aapse connect karenge.')
    expect(res2.booking?.datetime).toBe('2026-09-15T06:30:00.000Z')
  })

  it('Scenario 8 (Customer Screenshot): Strips leaked [[LABEL:{" tag and sets exact "Trading" & "Meta Ads" labels', () => {
    const rawAiOutput = `Shukriya! Share Market ke Meta Ads ke liye call confirm ho gayi hai... [[LABEL:{"`
    const res = parseGeneration(rawAiOutput)

    // Customer receives clean message with zero leaked syntax
    expect(res.text).toBe('Shukriya! Share Market ke Meta Ads ke liye call confirm ho gayi hai...')
    expect(res.text).not.toContain('[[LABEL')
    expect(res.text).not.toContain('[[')

    // System captures specific niche and ad service (never generic Ads Agency)
    expect(res.labels?.industry).toBe('Trading')
    expect(res.labels?.service).toBe('Meta Ads')
    expect(res.labels?.tags).toContain('Trading')
    expect(res.labels?.tags).toContain('Meta Ads')
    expect(res.labels?.tags).not.toContain('Ads Agency')
  })

  it('System Prompt includes current reference timestamp, booking guidelines, and lead categorization rules', () => {
    const refTime = '2026-09-07T15:00:00.000Z'
    const prompt = buildSystemPrompt({
      userPrompt: 'We are an agency helping e-commerce brands.',
      mode: 'auto_reply',
      referenceTime: refTime,
    })

    expect(prompt).toContain('Calendar & Appointment Booking')
    expect(prompt).toContain('Lead Categorization & Industry/Service Labeling')
    expect(prompt).toContain(refTime)
    expect(prompt).toContain('Meta Ads')
    expect(prompt).toContain('Trading')
    expect(prompt).toContain('[[BOOK_CALL:')
    expect(prompt).toContain('[[LABEL:')
    expect(prompt).toContain('[[HANDOFF]]')
  })
})

