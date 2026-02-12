import Anthropic from '@anthropic-ai/sdk';
import { initLogger, wrapAnthropic } from 'braintrust';

const BRAINTRUST_PROXY_BASE_URL = 'https://api.braintrust.dev/v1/proxy';
const XAI_BASE_URL = 'https://api.x.ai/v1';

// Initialize Braintrust logger once at module load when the key is present.
let _braintrustInitialized = false;
function ensureBraintrustLogger(): void {
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

const ANTHROPIC_MODEL_PREFIXES = ['claude-'];

export function isAnthropicModel(model: string): boolean {
  return ANTHROPIC_MODEL_PREFIXES.some((p) => model.startsWith(p));
}

// ---------------------------------------------------------------------------
// xAI / Braintrust-proxy config (OpenAI-compatible)
// ---------------------------------------------------------------------------

function normalizeModelForBraintrust(model: string): string {
  if (!model) return 'xai/grok-4-1-fast';
  // Anthropic models go through as-is; xAI models get the xai/ prefix
  if (isAnthropicModel(model)) return model;
  return model.startsWith('xai/') ? model : `xai/${model}`;
}

export function getAiProviderConfig(model?: string): {
  baseUrl: string;
  apiKey: string;
  model: string;
} {
  const braintrustApiKey = process.env.BRAINTRUST_API_KEY;
  const xaiApiKey = process.env.XAI_API_KEY;

  if (braintrustApiKey) {
    ensureBraintrustLogger();
    return {
      baseUrl: BRAINTRUST_PROXY_BASE_URL,
      apiKey: braintrustApiKey,
      model: normalizeModelForBraintrust(model || 'grok-4-1-fast'),
    };
  }

  if (!xaiApiKey) {
    throw new Error('Missing AI credentials: set BRAINTRUST_API_KEY or XAI_API_KEY');
  }

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
// Anthropic client (wrapped with Braintrust tracing when available)
// ---------------------------------------------------------------------------

let _anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_anthropicClient) return _anthropicClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }

  const raw = new Anthropic({ apiKey });

  // If Braintrust is configured, wrap for automatic tracing
  if (process.env.BRAINTRUST_API_KEY) {
    ensureBraintrustLogger();
    _anthropicClient = wrapAnthropic(raw);
  } else {
    _anthropicClient = raw;
  }

  return _anthropicClient;
}
