import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, model = 'grok-2-image', quality = 'medium', n = 1, editImage } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Determine if this is an edit or generation
    const isEdit = !!editImage;
    const endpoint = isEdit 
      ? 'https://api.x.ai/v1/images/edits'
      : 'https://api.x.ai/v1/images/generations';

    const requestBody: any = {
      prompt,
      model,
      n,
      response_format: 'url',
    };

    // Add quality for generations
    if (!isEdit) {
      requestBody.quality = quality;
    }

    // Add image for edits
    if (isEdit) {
      requestBody.image = { url: editImage };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate image' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

