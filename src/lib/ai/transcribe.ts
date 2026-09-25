import { AiError, type AiConfig } from './types'

/**
 * Transcribe audio from a URL using the account's configured AI provider.
 * OpenAI uses the Whisper API; Gemini uses multimodal audio input.
 * Anthropic does not support audio transcription.
 */
export async function transcribeAudio(
  config: AiConfig,
  audioUrl: string,
): Promise<{ transcription: string; summary: string }> {
  // Download the audio file
  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    throw new AiError('Failed to download audio file for transcription', {
      code: 'audio_download_failed',
      status: 500,
    })
  }
  const audioBuffer = await audioResponse.arrayBuffer()
  const audioBytes = new Uint8Array(audioBuffer)

  let transcription: string

  switch (config.provider) {
    case 'openai': {
      transcription = await transcribeWithOpenAi(config.apiKey, audioBytes)
      break
    }
    case 'gemini': {
      transcription = await transcribeWithGemini(config.apiKey, audioBytes)
      break
    }
    case 'anthropic':
      throw new AiError(
        'Anthropic does not support audio transcription. Please configure OpenAI or Gemini for voice note transcription.',
        { code: 'unsupported_provider', status: 400 }
      )
    default:
      throw new AiError(`Unsupported provider for transcription: ${config.provider}`, {
        code: 'unsupported_provider',
        status: 400,
      })
  }

  // Generate a 1-sentence summary using the same provider
  const summary = await generateSummary(config, transcription)

  return { transcription, summary }
}

async function transcribeWithOpenAi(
  apiKey: string,
  audioBytes: Uint8Array,
): Promise<string> {
  const formData = new FormData()
  formData.append(
    'file',
    new Blob([audioBytes as unknown as BlobPart], { type: 'audio/ogg' }),
    'voice_note.ogg'
  )
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'text')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error')
    throw new AiError(`Whisper transcription failed: ${err}`, {
      code: 'transcription_failed',
      status: 502,
    })
  }

  return (await response.text()).trim()
}

async function transcribeWithGemini(
  apiKey: string,
  audioBytes: Uint8Array,
): Promise<string> {
  const base64Audio = Buffer.from(audioBytes).toString('base64')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'audio/ogg',
                  data: base64Audio,
                },
              },
              {
                text: 'Transcribe this audio message accurately. Return ONLY the transcription text, nothing else. If the audio is in a non-English language, transcribe it in that language.',
              },
            ],
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error')
    throw new AiError(`Gemini transcription failed: ${err}`, {
      code: 'transcription_failed',
      status: 502,
    })
  }

  const data = await response.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return text.trim()
}

async function generateSummary(
  config: AiConfig,
  transcription: string,
): Promise<string> {
  if (!transcription.trim()) return ''

  // Use a minimal prompt to generate a 1-sentence action summary
  const prompt = `Summarize this voice message in exactly 1 short sentence (max 15 words) focusing on what the person wants or needs:\n\n"${transcription}"`

  try {
    if (config.provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
        }),
      })
      if (!res.ok) return ''
      const data = await res.json()
      return (data?.choices?.[0]?.message?.content ?? '').trim()
    }

    if (config.provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      )
      if (!res.ok) return ''
      const data = await res.json()
      return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
    }

    return ''
  } catch {
    return ''
  }
}
