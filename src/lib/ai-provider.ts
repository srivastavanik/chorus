import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { initLogger, wrapOpenAI, wrapAnthropic, setMaskingFunction } from 'braintrust';

const XAI_BASE_URL = 'https://api.x.ai/v1';

// ---------------------------------------------------------------------------
// Braintrust logger (project-level tracing)
// ---------------------------------------------------------------------------

let _braintrustInitialized = false;
function isBraintrustSdkWrappingEnabled(): boolean {
  return process.env.BRAINTRUST_ENABLE_SDK_WRAPPING === 'true';
}

// Raw prompt/response logging is opt-in and should only be enabled in
// environments explicitly approved for storing user content in the shared
// Braintrust project.
function isRawContentLoggingAllowed(): boolean {
  return process.env.BRAINTRUST_LOG_RAW_CONTENT === 'true';
}

const REDACTED = '[REDACTED]';

// Field names whose values may carry raw prompts, model outputs, uploaded file
// contents, citations, signed URLs, or other tenant-sensitive payloads.
const SENSITIVE_KEYS = new Set<string>([
  'messages',
  'message',
  'input',
  'input_text',
  'input_image',
  'input_file',
  'content',
  'output',
  'output_text',
  'text',
  'prompt',
  'completion',
  'reasoning',
  'reasoning_content',
  'thinking',
  'delta',
  'image_url',
  'file_id',
  'citations',
  'arguments',
  'tool_calls',
  'system',
  'b64_json',
  'audio',
  'refusal',
  'data',
  'url',
  'source',
]);

function redactValue(value: unknown, depth = 0): unknown {
  if (value == null || depth > 12) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key) ? REDACTED : redactValue(val, depth + 1);
    }
    return out;
  }
  return value;
}

// Masking function applied by Braintrust to every record before export. Keeps
// non-sensitive metadata (model, usage, latency) while stripping content.
function redactSensitiveData(value: unknown): unknown {
  return redactValue(value);
}

export function ensureBraintrustLogger(): void {
  if (_braintrustInitialized) return;
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey || !isBraintrustSdkWrappingEnabled()) return;

  initLogger({
    projectName: 'chorus',
    apiKey,
  });

  // Default to metadata-only export. Redact prompts/responses/file contents
  // unless an operator explicitly opts in for an approved environment.
  if (!isRawContentLoggingAllowed()) {
    setMaskingFunction(redactSensitiveData);
  }

  _braintrustInitialized = true;
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

export function isAnthropicModel(model: string): boolean {
  return model.startsWith('claude-');
}

// ---------------------------------------------------------------------------
// xAI config -- always hits xAI directly (no proxy).
// Tracing is handled by wrapOpenAI on the SDK client, not by routing
// through the Braintrust proxy (which requires storing provider keys in
// Braintrust's secret vault).
// ---------------------------------------------------------------------------

export function getAiProviderConfig(model?: string): {
  baseUrl: string;
  apiKey: string;
  model: string;
} {
  const xaiApiKey = process.env.XAI_API_KEY;
  if (!xaiApiKey) {
    throw new Error('Missing XAI_API_KEY environment variable');
  }

  // Kick off Braintrust logger so SDK-wrapped calls are traced
  ensureBraintrustLogger();

  return {
    baseUrl: XAI_BASE_URL,
    apiKey: xaiApiKey,
    model: model || 'grok-4-1-fast',
  };
}

export function getAiApiConfig(): { baseUrl: string; apiKey: string } {
  const config = getAiProviderConfig();
  return { baseUrl: config.baseUrl, apiKey: config.apiKey };
}

// ---------------------------------------------------------------------------
// Wrapped OpenAI client (xAI-compatible) -- Braintrust traces every call
// ---------------------------------------------------------------------------

let _xaiClient: OpenAI | null = null;

export function getXaiClient(): OpenAI {
  if (_xaiClient) return _xaiClient;

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing XAI_API_KEY environment variable');
  }

  const raw = new OpenAI({ apiKey, baseURL: XAI_BASE_URL });

  if (process.env.BRAINTRUST_API_KEY && isBraintrustSdkWrappingEnabled()) {
    ensureBraintrustLogger();
    _xaiClient = wrapOpenAI(raw);
  } else {
    _xaiClient = raw;
  }

  return _xaiClient;
}

// ---------------------------------------------------------------------------
// Wrapped Anthropic client -- Braintrust traces every call
// ---------------------------------------------------------------------------

let _anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_anthropicClient) return _anthropicClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }

  const raw = new Anthropic({ apiKey });

  if (process.env.BRAINTRUST_API_KEY && isBraintrustSdkWrappingEnabled()) {
    ensureBraintrustLogger();
    _anthropicClient = wrapAnthropic(raw);
  } else {
    _anthropicClient = raw;
  }

  return _anthropicClient;
}
