import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
import {
  getAiProviderConfig,
  getXaiClient,
  isAnthropicModel,
  getAnthropicClient,
} from '@/lib/ai-provider';

export const maxDuration = 60; // Increase timeout for reasoning models

export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, model, webSearch, attachedFileIds, imageUrls } = await req.json();

    // Route to Anthropic handler for Claude models
    if (isAnthropicModel(model)) {
      return handleAnthropicChat(messages, model, imageUrls);
    }

    if (attachedFileIds && attachedFileIds.length > 0) {
      return handleAgenticResponse(messages, model, attachedFileIds, imageUrls);
    } else {
      return handleChatCompletions(messages, model, webSearch, imageUrls);
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function processMessages(messages: any[], imageUrls?: string[]) {
  const processed = [...messages];

  if (imageUrls && imageUrls.length > 0) {
    const lastUserIndex = processed.map(m => m.role).lastIndexOf('user');
    if (lastUserIndex !== -1) {
      const lastMsg = processed[lastUserIndex];
      const textContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';

      const newContent: any[] = [];

      imageUrls.forEach(url => {
        newContent.push({
          type: 'image_url',
          image_url: { url, detail: 'high' },
        });
      });

      if (textContent) {
        newContent.push({ type: 'text', text: textContent });
      }

      processed[lastUserIndex] = { ...lastMsg, content: newContent };
    }
  }

  return processed;
}

function toAnthropicMessages(messages: any[], imageUrls?: string[]): {
  system: string | undefined;
  messages: Array<{ role: 'user' | 'assistant'; content: string | any[] }>;
} {
  let system: string | undefined;
  const out: Array<{ role: 'user' | 'assistant'; content: string | any[] }> = [];

  for (const m of messages) {
    if (m.role === 'system') {
      system = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      continue;
    }
    const role = m.role === 'assistant' ? ('assistant' as const) : ('user' as const);
    out.push({ role, content: typeof m.content === 'string' ? m.content : m.content });
  }

  if (imageUrls && imageUrls.length > 0 && out.length > 0) {
    const lastIdx = out.length - 1;
    if (out[lastIdx].role === 'user') {
      const existing =
        typeof out[lastIdx].content === 'string'
          ? [{ type: 'text' as const, text: out[lastIdx].content as string }]
          : (out[lastIdx].content as any[]);

      const imageBlocks = imageUrls.map(url => ({
        type: 'image' as const,
        source: { type: 'url' as const, url },
      }));

      out[lastIdx].content = [...imageBlocks, ...existing];
    }
  }

  return { system, messages: out };
}

// ---------------------------------------------------------------------------
// Anthropic (Claude) handler -- traced via wrapAnthropic
// ---------------------------------------------------------------------------

async function handleAnthropicChat(messages: any[], model: string, imageUrls?: string[]) {
  const client = getAnthropicClient();
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages, imageUrls);

  const encoder = new TextEncoder();

  const stream = await client.messages.stream({
    model,
    max_tokens: 4096,
    ...(system ? { system } : {}),
    messages: anthropicMessages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta as any;
            if (delta.type === 'text_delta' && delta.text) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: 'content', content: delta.text }) + '\n'),
              );
            }
            if (delta.type === 'thinking_delta' && delta.thinking) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'reasoning', content: delta.thinking }) + '\n',
                ),
              );
            }
          }
        }
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
        controller.close();
      } catch (err) {
        console.error('Anthropic stream error:', err);
        controller.error(err);
      }
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ---------------------------------------------------------------------------
// xAI chat completions -- uses wrapped OpenAI SDK (traced by Braintrust)
// ---------------------------------------------------------------------------

async function handleChatCompletions(
  messages: any[],
  model: string,
  webSearch?: boolean,
  imageUrls?: string[],
) {
  const client = getXaiClient();
  const processedMessages = processMessages(messages, imageUrls);
  const resolvedModel = model || 'grok-4-1-fast';

  const encoder = new TextEncoder();

  // Build params -- search_parameters is xAI-specific
  const params: Record<string, unknown> = {
    model: resolvedModel,
    messages: processedMessages,
    stream: true,
    temperature: 0.7,
  };
  if (webSearch) {
    params.search_parameters = { mode: 'auto', return_citations: true };
  }

  // The wrapOpenAI wrapper intercepts this call and logs input/output to
  // Braintrust automatically. Cast to get the streaming async iterator type.
  const stream = (await client.chat.completions.create(params as any)) as unknown as AsyncIterable<any>;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta as any;
          if (!delta) continue;

          if (delta.reasoning_content) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'reasoning', content: delta.reasoning_content }) + '\n',
              ),
            );
          }

          if (delta.content) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'content', content: delta.content }) + '\n'),
            );
          }

          // xAI returns citations at the chunk level
          const raw = chunk as any;
          if (raw.citations) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'done', citations: raw.citations }) + '\n'),
            );
          }
        }
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
        controller.close();
      } catch (err) {
        console.error('xAI stream error:', err);
        controller.error(err);
      }
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ---------------------------------------------------------------------------
// xAI agentic /responses handler (raw fetch -- xAI-specific endpoint)
// ---------------------------------------------------------------------------

async function handleAgenticResponse(
  messages: any[],
  model: string,
  attachedFileIds: string[],
  imageUrls?: string[],
) {
  const aiProvider = getAiProviderConfig(model || 'grok-4-1-fast');
  const processedMessages = processMessages(messages, imageUrls);

  const input = processedMessages.map((m: any, index: number) => {
    if (index === processedMessages.length - 1 && m.role === 'user' && attachedFileIds.length > 0) {
      const contentArray: any[] = [];

      attachedFileIds.forEach(fileId => {
        contentArray.push({ type: 'input_file', file_id: fileId });
      });

      const textContent =
        typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? m.content.find((c: any) => c.type === 'text')?.text || ''
            : '';

      if (textContent) {
        contentArray.push({ type: 'input_text', text: textContent });
      }

      if (Array.isArray(m.content)) {
        m.content.forEach((c: any) => {
          if (c.type === 'image_url') {
            contentArray.push({
              type: 'input_image',
              image_url: c.image_url.url,
              detail: c.image_url.detail || 'high',
            });
          }
        });
      }

      return { role: m.role, content: contentArray };
    }

    return { role: m.role, content: m.content };
  });

  const body = {
    model: aiProvider.model,
    input,
    stream: true,
    temperature: 0.7,
  };

  const response = await fetch(`${aiProvider.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiProvider.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('xAI Agentic API error:', errorText);
    throw new Error(`Agentic API error: ${response.status}`);
  }

  return streamAgenticResponse(response);
}

// ---------------------------------------------------------------------------
// Stream handler for /responses endpoint (agentic)
// ---------------------------------------------------------------------------

function streamAgenticResponse(response: Response) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const eventType = data.type;

            if (eventType === 'response.content_part.delta' && data.delta?.text) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'content', content: data.delta.text }) + '\n',
                ),
              );
            }

            if (data.delta?.reasoning_content) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'reasoning', content: data.delta.reasoning_content }) +
                    '\n',
                ),
              );
            }

            if (eventType === 'response.done' || eventType === 'response.completed') {
              if (data.response?.output) {
                for (const item of data.response.output) {
                  if (item.content && Array.isArray(item.content)) {
                    for (const part of item.content) {
                      if (part.type === 'output_text' && part.text) {
                        controller.enqueue(
                          encoder.encode(
                            JSON.stringify({ type: 'content', content: part.text }) + '\n',
                          ),
                        );
                      }
                    }
                  }
                }
              }
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
            }
          } catch (_e) {
            // Skip parse errors
          }
        } else if (line === 'data: [DONE]') {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
        }
      }
    },
    flush(controller) {
      if (buffer.trim()) {
        try {
          if (buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
            const data = JSON.parse(buffer.slice(6));
            if (data.delta?.text) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'content', content: data.delta.text }) + '\n',
                ),
              );
            }
          }
        } catch (_e) {
          // Skip
        }
      }
      controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
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
