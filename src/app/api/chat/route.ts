import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';

const XAI_API_KEY = process.env.XAI_API_KEY!;
const XAI_BASE_URL = 'https://api.x.ai/v1';

export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, model, webSearch, attachedFileIds } = await req.json();

    if (attachedFileIds && attachedFileIds.length > 0) {
      return handleAgenticResponse(messages, model, attachedFileIds);
    } else {
      return handleChatCompletions(messages, model, webSearch);
    }
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
    temperature: 0.7,
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

async function handleAgenticResponse(messages: any[], model: string, attachedFileIds: string[]) {
  // Use /responses endpoint for agentic/file capabilities
  
  // Convert standard messages to "input" format if needed
  // The curl example suggests "input" is an array of messages with role/content
  // AND attachments on specific messages.
  
  const input = messages.map((m: any, index: number) => {
    const msg: any = { role: m.role, content: m.content };
    // Attach files to the LAST message (which should be user)
    if (index === messages.length - 1 && m.role === 'user') {
        msg.attachments = attachedFileIds.map(id => ({
            file_id: id,
            tools: [{ type: "file_search" }]
        }));
    }
    return msg;
  });

  const body = {
    model: model || 'grok-4-fast',
    input: input,
    stream: true,
    temperature: 0.7
  };

  const response = await fetch(`${XAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('xAI Agentic API error:', errorText);
    throw new Error(`Agentic API error: ${response.status}`);
  }

  // Transform SSE stream
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
            
            // The /responses stream format might differ. 
            // Typically: data.output[0].content[0].text (delta?) or similar.
            // Or tool_calls.
            
            // Let's try to handle generic delta structure if it matches standard, 
            // otherwise look for specific fields.
            // Assuming similar structure to ChatCompletion chunk but maybe "output" instead of "choices"
            
            // Heuristic parser:
            // 1. Content delta
            let content = '';
            let reasoningContent = '';
            
            // Check choices/delta first (if compatible)
            if (data.choices?.[0]?.delta?.content) {
                content = data.choices[0].delta.content;
            } else if (data.output?.[0]?.content) {
                // Might be full content or delta?
                // If streaming, likely delta.
                const contentObj = data.output[0].content;
                if (Array.isArray(contentObj)) {
                    // List of content parts?
                    // e.g. [{type: 'text', text: '...'}]
                    content = contentObj.map((c: any) => c.text || '').join('');
                } else if (typeof contentObj === 'string') {
                    content = contentObj;
                }
            }

            // Check for reasoning
            if (data.choices?.[0]?.delta?.reasoning_content) {
                reasoningContent = data.choices[0].delta.reasoning_content;
            }

            if (reasoningContent) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'reasoning',
                content: reasoningContent,
              }) + '\n'));
            }

            if (content) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'content',
                content: content,
              }) + '\n'));
            }
            
            // If status/tool calls
            // ...

          } catch (e) {
            // Skip
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
