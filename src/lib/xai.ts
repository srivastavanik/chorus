import { getXaiClient } from '@/lib/ai-provider';

// Re-export a Braintrust-wrapped OpenAI client pointed at xAI
export const xai = getXaiClient();
