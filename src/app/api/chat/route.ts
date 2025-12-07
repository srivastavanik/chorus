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

    const { messages, model, webSearch, attachedFileIds, imageUrls } = await req.json();

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

// Helper to process message content for vision/files
function processMessages(messages: any[], imageUrls?: string[]) {
  // Clone messages to avoid mutation
  const processed = [...messages];
  
  // If we have images, attach them to the LAST user message
  if (imageUrls && imageUrls.length > 0) {
    const lastUserIndex = processed.map(m => m.role).lastIndexOf('user');
    if (lastUserIndex !== -1) {
      const lastMsg = processed[lastUserIndex];
      const textContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';
      
      // Construct multipart content
      const newContent: any[] = [];
      
      // Add images first (or last, doesn't matter much, but contextually usually images then question)
      imageUrls.forEach(url => {
        newContent.push({
          type: 'image_url',
          image_url: {
            url: url,
            detail: 'high' // Default to high detail
          }
        });
      });
      
      // Add text
      if (textContent) {
        newContent.push({ type: 'text', text: textContent });
      }
      
      processed[lastUserIndex] = { ...lastMsg, content: newContent };
    }
  }
  
  return processed;
}

async function handleChatCompletions(messages: any[], model: string, webSearch?: boolean, imageUrls?: string[]) {
  const processedMessages = processMessages(messages, imageUrls);

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

  return streamResponse(response);
}

async function handleAgenticResponse(messages: any[], model: string, attachedFileIds: string[], imageUrls?: string[]) {
  // Process images first if any
  const processedMessages = processMessages(messages, imageUrls);
  
  // Convert standard messages to "input" format for /responses
  const input = processedMessages.map((m: any, index: number) => {
    const msg: any = { role: m.role, content: m.content };
    // Attach files to the LAST user message
    if (index === processedMessages.length - 1 && m.role === 'user' && attachedFileIds.length > 0) {
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

  return streamResponse(response);
}

// Shared stream handler
function streamResponse(response: Response) {
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
            
            let content = '';
            let reasoningContent = '';
            
            // Handle Chat Completion format
            if (data.choices?.[0]?.delta?.content) {
                content = data.choices[0].delta.content;
            }
            if (data.choices?.[0]?.delta?.reasoning_content) {
                reasoningContent = data.choices[0].delta.reasoning_content;
            }

            // Handle Agentic /responses format
            if (data.output?.[0]?.content) {
                const contentObj = data.output[0].content;
                if (Array.isArray(contentObj)) {
                    content = contentObj.map((c: any) => c.text || '').join('');
                } else if (typeof contentObj === 'string') {
                    content = contentObj;
                }
            }
            // Agentic reasoning? (Structure varies, sometimes in content with type)
            
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
            
            // Pass citations if available
            if (data.citations) {
               controller.enqueue(encoder.encode(JSON.stringify({
                type: 'done',
                citations: data.citations,
              }) + '\n'));
            }

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
