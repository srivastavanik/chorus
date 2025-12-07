import { NextResponse } from 'next/server';

const XAI_API_KEY = process.env.XAI_API_KEY!;
const XAI_BASE_URL = 'https://api.x.ai/v1';

export async function POST(req: Request) {
  try {
    const { messages, model, webSearch } = await req.json();

    return handleChatCompletions(messages, model, webSearch);
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

// Helper to process message content for vision/files
function processMessages(messages: any[]) {
  return messages.map((m: any) => {
    if (typeof m.content !== 'string') {
      return { role: m.role, content: m.content };
    }
    return { role: m.role, content: m.content };
  });
}

async function handleChatCompletions(messages: any[], model: string, webSearch?: boolean) {
  const processedMessages = processMessages(messages);

  const body: any = {
    model: model || 'grok-4-fast',
    messages: processedMessages,
    stream: true,
  };

  if (webSearch) {
    body.search_parameters = {
      mode: 'auto',
      return_citations: true,
    };
  }

  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify(body),
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
            const delta = data.choices?.[0]?.delta;
            const content = delta?.content;
            
            // Check multiple reasoning fields as API might vary
            const reasoningContent = delta?.reasoning_content || delta?.reasoning;
            const reasoningTokens = data.usage?.reasoning_tokens;
            
            // Citations usually come in the final chunk or separate event
            const citations = data.citations;

            if (reasoningContent) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'reasoning',
                content: reasoningContent,
              }) + '\n'));
            }

            if (content || reasoningTokens) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'content',
                content: content || '',
                reasoning_tokens: reasoningTokens || 0,
              }) + '\n'));
            }
            
            if (citations) {
               controller.enqueue(encoder.encode(JSON.stringify({
                type: 'done',
                citations: citations,
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
