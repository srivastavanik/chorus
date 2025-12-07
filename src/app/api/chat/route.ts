import { NextResponse } from 'next/server';

const XAI_API_KEY = process.env.XAI_API_KEY!;
const XAI_BASE_URL = 'https://api.x.ai/v1';

export async function POST(req: Request) {
  try {
    const { messages, model, webSearch } = await req.json();

    // For web search, use the Responses API
    if (webSearch) {
      return handleResponsesAPI(messages, model);
    }

    // For regular chat, use Chat Completions API
    return handleChatCompletions(messages, model);
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

async function handleChatCompletions(messages: any[], model: string) {
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || 'grok-4-fast',
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('xAI API error:', errorText);
    throw new Error(`API error: ${response.status}`);
  }

  // Transform SSE stream to include metadata
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            const reasoningTokens = data.usage?.reasoning_tokens;
            
            if (content || reasoningTokens) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'content',
                content: content || '',
                reasoning_tokens: reasoningTokens || 0,
              }) + '\n'));
            }
          } catch (e) {
            // Skip invalid JSON
          }
        } else if (line === 'data: [DONE]') {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
        }
      }
    },
  });

  return new NextResponse(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function handleResponsesAPI(messages: any[], model: string) {
  // Convert messages format for Responses API
  const input = messages.map((m: any) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${XAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || 'grok-4-fast',
      input,
      tools: [{ type: 'web_search' }],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('xAI Responses API error:', errorText);
    throw new Error(`API error: ${response.status}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            
            // Handle different event types
            if (data.type === 'response.output_text.delta') {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'content',
                content: data.delta || '',
              }) + '\n'));
            } else if (data.type === 'response.web_search.searching') {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'status',
                status: 'searching',
                message: 'Searching the web...',
              }) + '\n'));
            } else if (data.type === 'response.reasoning.delta') {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'reasoning',
                content: data.delta || '',
              }) + '\n'));
            } else if (data.type === 'response.done') {
              const citations = data.response?.citations || [];
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'done',
                citations,
              }) + '\n'));
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    },
  });

  return new NextResponse(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
