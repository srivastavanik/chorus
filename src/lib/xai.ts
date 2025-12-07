import OpenAI from 'openai';

export const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || 'dummy', // Should be in env
  baseURL: 'https://api.x.ai/v1',
});

