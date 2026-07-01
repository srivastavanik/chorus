import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
import { getUnauthorizedFileIds } from '@/lib/file-uploads';
import {
  getAiProviderConfig,
  getXaiClient,
  isAnthropicModel,
  getAnthropicClient,
} from '@/lib/ai-provider';

export const maxDuration = 60; // Increase timeout for reasoning models

// ---------------------------------------------------------------------------
// Message / streaming shapes
// ---------------------------------------------------------------------------

type ChatRole = 'system' | 'user' | 'assistant';

interface TextContentPart {
  type: 'text';
  text: string;
}

interface ImageUrlContentPart {
  type: 'image_url';
  image_url: { url: string; detail?: string };
}

type ContentPart =
  | TextContentPart
  | ImageUrlContentPart
  | { type: string; [key: string]: unknown };

interface ChatMessage {
  role: ChatRole | string;
  content: string | ContentPart[];
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | unknown[];
}

interface OpenAIStreamDelta {
  content?: string;
  reasoning_content?: string;
}

interface OpenAIStreamChunk {
  choices?: Array<{ delta?: OpenAIStreamDelta }>;
  citations?: unknown;
}

interface AnthropicStreamDelta {
  type?: string;
  text?: string;
  thinking?: string;
}

interface AgenticEvent {
  type?: string;
  delta?: { text?: string; reasoning_content?: string };
  response?: {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
}

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
      return handleAgenticResponse(user.id, messages, model, attachedFileIds, imageUrls);
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

function processMessages(messages: ChatMessage[], imageUrls?: string[]): ChatMessage[] {
  const processed = [...messages];

  if (imageUrls && imageUrls.length > 0) {
    const lastUserIndex = processed.map(m => m.role).lastIndexOf('user');
    if (lastUserIndex !== -1) {
      const lastMsg = processed[lastUserIndex];
      const textContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';

      const newContent: ContentPart[] = [];

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

function toAnthropicMessages(messages: ChatMessage[], imageUrls?: string[]): {
  system: string | undefined;
  messages: AnthropicMessage[];
} {
  let system: string | undefined;
  const out: AnthropicMessage[] = [];

  for (const m of messages) {
    if (m.role === 'system') {
      system = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      continue;
    }
    const role = m.role === 'assistant' ? ('assistant' as const) : ('user' as const);
    out.push({ role, content: m.content });
  }

  if (imageUrls && imageUrls.length > 0 && out.length > 0) {
    const lastIdx = out.length - 1;
    if (out[lastIdx].role === 'user') {
      const existing =
        typeof out[lastIdx].content === 'string'
          ? [{ type: 'text' as const, text: out[lastIdx].content as string }]
          : (out[lastIdx].content as unknown[]);

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

async function handleAnthropicChat(messages: ChatMessage[], model: string, imageUrls?: string[]) {
  const client = getAnthropicClient();
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages, imageUrls);

  const encoder = new TextEncoder();

  const stream = await client.messages.stream({
    model,
    max_tokens: 4096,
    ...(system ? { system } : {}),
    messages: anthropicMessages,
  } as unknown as Parameters<typeof client.messages.stream>[0]);

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const rawEvent of stream) {
          const event = rawEvent as { type?: string; delta?: AnthropicStreamDelta };
          if (event.type === 'content_block_delta' && event.delta) {
            const delta = event.delta;
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
  messages: ChatMessage[],
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
  const stream = (await client.chat.completions.create(
    params as unknown as Parameters<typeof client.chat.completions.create>[0],
  )) as unknown as AsyncIterable<OpenAIStreamChunk>;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta;
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
          if (chunk.citations) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'done', citations: chunk.citations }) + '\n'),
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
  userId: string,
  messages: ChatMessage[],
  model: string,
  attachedFileIds: string[],
  imageUrls?: string[],
) {
  // Authorize every requested attachment against server-side upload metadata
  // before the server uses its API key to have the model read the file. This
  // prevents an authenticated user from referencing another user's file id.
  const unauthorized = await getUnauthorizedFileIds(userId, attachedFileIds);
  if (unauthorized.length > 0) {
    return NextResponse.json(
      { error: 'One or more attached files are not authorized for this user' },
      { status: 403 },
    );
  }

  const aiProvider = getAiProviderConfig(model || 'grok-4-1-fast');
  const processedMessages = processMessages(messages, imageUrls);

  const input = processedMessages.map((m, index) => {
    if (index === processedMessages.length - 1 && m.role === 'user' && attachedFileIds.length > 0) {
      const contentArray: Record<string, unknown>[] = [];

      attachedFileIds.forEach(fileId => {
        contentArray.push({ type: 'input_file', file_id: fileId });
      });

      const textContent =
        typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? (m.content.find(c => c.type === 'text') as TextContentPart | undefined)?.text || ''
            : '';

      if (textContent) {
        contentArray.push({ type: 'input_text', text: textContent });
      }

      if (Array.isArray(m.content)) {
        m.content.forEach(c => {
          if (c.type === 'image_url') {
            const img = c as ImageUrlContentPart;
            contentArray.push({
              type: 'input_image',
              image_url: img.image_url.url,
              detail: img.image_url.detail || 'high',
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
            const data = JSON.parse(line.slice(6)) as AgenticEvent;
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
          } catch {
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
            const data = JSON.parse(buffer.slice(6)) as AgenticEvent;
            if (data.delta?.text) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'content', content: data.delta.text }) + '\n',
                ),
              );
            }
          }
        } catch {
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
