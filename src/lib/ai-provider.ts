const BRAINTRUST_PROXY_BASE_URL = 'https://api.braintrust.dev/v1/proxy';
const XAI_BASE_URL = 'https://api.x.ai/v1';

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
