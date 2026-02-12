import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
import { getAiProviderConfig } from '@/lib/ai-provider';

export const maxDuration = 60; // Increase timeout for reasoning models

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
  const aiProvider = getAiProviderConfig(model || 'grok-4-1-fast');
  const processedMessages = processMessages(messages, imageUrls);

  const body: any = {
    model: aiProvider.model,
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

  const response = await fetch(`${aiProvider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiProvider.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('xAI API error:', errorText);
    throw new Error(`API error: ${response.status}`);
  }

  return streamChatResponse(response);
}

async function handleAgenticResponse(messages: any[], model: string, attachedFileIds: string[], imageUrls?: string[]) {
  const aiProvider = getAiProviderConfig(model || 'grok-4-1-fast');
  // Process images first if any
  const processedMessages = processMessages(messages, imageUrls);
  
  // Convert standard messages to "input" format for /responses
  // Use content array format with input_file for proper file handling
  const input = processedMessages.map((m: any, index: number) => {
    // For the LAST user message, use content array format with files
    if (index === processedMessages.length - 1 && m.role === 'user' && attachedFileIds.length > 0) {
      const contentArray: any[] = [];
      
      // Add file references first
      attachedFileIds.forEach(fileId => {
        contentArray.push({
          type: 'input_file',
          file_id: fileId
        });
      });
      
      // Add the text content
      const textContent = typeof m.content === 'string' ? m.content : 
        (Array.isArray(m.content) ? m.content.find((c: any) => c.type === 'text')?.text || '' : '');
      
      if (textContent) {
        contentArray.push({
          type: 'input_text',
          text: textContent
        });
      }
      
      // Handle images if present in the content
      if (Array.isArray(m.content)) {
        m.content.forEach((c: any) => {
          if (c.type === 'image_url') {
            contentArray.push({
              type: 'input_image',
              image_url: c.image_url.url,
              detail: c.image_url.detail || 'high'
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
    input: input,
    stream: true,
    temperature: 0.7
  };

  const response = await fetch(`${aiProvider.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiProvider.apiKey}`,
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

// Shared stream handler for /chat/completions
function streamChatResponse(response: Response) {
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
            // Skip parse errors
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

// Stream handler for /responses endpoint (agentic)
function streamAgenticResponse(response: Response) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            
            // Handle /responses streaming format
            // Events can be: response.created, response.in_progress, response.output_item.added,
            // response.content_part.added, response.content_part.delta, response.output_item.done, response.done
            
            const eventType = data.type;
            
            // Handle content delta events
            if (eventType === 'response.content_part.delta' && data.delta?.text) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'content',
                content: data.delta.text,
              }) + '\n'));
            }
            
            // Handle reasoning content if present
            if (data.delta?.reasoning_content) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'reasoning',
                content: data.delta.reasoning_content,
              }) + '\n'));
            }
            
            // Handle completed response
            if (eventType === 'response.done' || eventType === 'response.completed') {
              // Extract final content if available
              if (data.response?.output) {
                for (const item of data.response.output) {
                  if (item.content && Array.isArray(item.content)) {
                    for (const part of item.content) {
                      if (part.type === 'output_text' && part.text) {
                        controller.enqueue(encoder.encode(JSON.stringify({
                          type: 'content',
                          content: part.text,
                        }) + '\n'));
                      }
                    }
                  }
                }
              }
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
            }

          } catch (e) {
            // Skip parse errors
          }
        } else if (line === 'data: [DONE]') {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
        }
      }
    },
    flush(controller) {
      // Handle any remaining buffer
      if (buffer.trim()) {
        try {
          if (buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
            const data = JSON.parse(buffer.slice(6));
            if (data.delta?.text) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'content',
                content: data.delta.text,
              }) + '\n'));
            }
          }
        } catch (e) {
          // Skip
        }
      }
      controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
    }
  });

  return new NextResponse(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
