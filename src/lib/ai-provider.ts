import { initLogger } from 'braintrust';

const BRAINTRUST_PROXY_BASE_URL = 'https://api.braintrust.dev/v1/proxy';
const XAI_BASE_URL = 'https://api.x.ai/v1';

// Initialize Braintrust logger once at module load when the key is present.
// This is the piece that actually sends traces to the Braintrust dashboard.
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

function normalizeModelForBraintrust(model: string): string {
  if (!model) return 'xai/grok-4-1-fast';
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
