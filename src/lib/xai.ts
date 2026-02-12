import OpenAI from 'openai';
import { getAiProviderConfig } from '@/lib/ai-provider';

const aiProvider = getAiProviderConfig('grok-4-1-fast');

export const xai = new OpenAI({
  apiKey: aiProvider.apiKey,
  baseURL: aiProvider.baseUrl,
});

