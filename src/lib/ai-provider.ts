import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { initLogger, wrapOpenAI, wrapAnthropic } from 'braintrust';

const XAI_BASE_URL = 'https://api.x.ai/v1';

// ---------------------------------------------------------------------------
// Braintrust logger (project-level tracing)
// ---------------------------------------------------------------------------

let _braintrustInitialized = false;
export function ensureBraintrustLogger(): void {
  if (_braintrustInitialized) return;
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) return;

  initLogger({
    projectName: 'chorus',
    apiKey,
  });
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

  if (process.env.BRAINTRUST_API_KEY) {
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

  if (process.env.BRAINTRUST_API_KEY) {
    ensureBraintrustLogger();
    _anthropicClient = wrapAnthropic(raw);
  } else {
    _anthropicClient = raw;
  }

  return _anthropicClient;
}
