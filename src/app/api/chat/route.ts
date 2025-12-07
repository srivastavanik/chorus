import { xai } from '@/lib/xai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, model, webSearch } = await req.json();

    const tools = webSearch ? [{ type: 'web_search' }] : undefined;

    // Using standard streaming response
    const stream = await xai.chat.completions.create({
      model: model || 'grok-4-fast',
      messages,
      stream: true,
      // @ts-expect-error - tools type definition might vary slightly
      tools,
    });

    const encoder = new TextEncoder();
    
    const customStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

