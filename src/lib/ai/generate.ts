import { AiError, type AiConfig, type ChatMessage, type GenerateResult } from './types'
import { HANDOFF_SENTINEL, aiRequestTimeoutMs, MAX_OUTPUT_TOKENS } from './defaults'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { updateCrmContactTool } from './tools/update-contact'
import { SupabaseClient } from '@supabase/supabase-js'

export interface GenerateArgs {
  db?: SupabaseClient
  contactId?: string
  config: AiConfig
  /** Fully-built system prompt (see `buildSystemPrompt`). */
  systemPrompt: string
  /** Recent conversation turns, oldest first. */
  messages: ChatMessage[]
}

export async function generateReply(args: GenerateArgs): Promise<GenerateResult> {
  const { db, contactId, config, systemPrompt, messages } = args
  
  let model: any;
  if (config.provider === 'openai') {
    const openai = createOpenAI({ apiKey: config.apiKey });
    model = openai(config.model);
  } else if (config.provider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: config.apiKey });
    model = anthropic(config.model);
  } else if (config.provider === 'gemini') {
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
    model = google(config.model);
  } else {
    throw new AiError(`Unsupported AI provider: ${config.provider}`, {
      code: 'unsupported_provider',
      status: 400,
    });
  }

  // Convert custom ChatMessage to Vercel AI SDK CoreMessage format
  const coreMessages = messages.map(msg => ({
    role: msg.role === 'customer' ? 'user' : 'assistant',
    content: msg.content
  })) as any[];

  // Only enable tools if we have db and contactId (e.g. during auto-reply)
  const tools = db && contactId ? {
    update_crm_contact: updateCrmContactTool(db, contactId)
  } : undefined;

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      messages: coreMessages,
      maxTokens: MAX_OUTPUT_TOKENS,
      tools,
      maxSteps: tools ? 3 : 1, // Allow the model to call the tool and then generate a text response
      abortSignal: AbortSignal.timeout(aiRequestTimeoutMs()),
    });

    return parseGeneration(result.text);
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new AiError('AI request timed out', { code: 'timeout', status: 504 });
    }
    throw new AiError(err.message || 'AI request failed', { code: 'network_error', status: 500 });
  }
}

export function parseGeneration(raw: string): GenerateResult {
  const handoff = raw.includes(HANDOFF_SENTINEL)
  const text = raw.split(HANDOFF_SENTINEL).join('').trim()
  return { text, handoff }
}
