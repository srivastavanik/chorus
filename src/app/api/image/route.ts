import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Increase timeout for generation

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

    let response;

    if (isEdit) {
      // For edits, use FormData to handle large image data and avoid JSON limits
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('model', model);
      formData.append('n', n.toString());
      formData.append('response_format', 'url');
      
      // Convert base64 to Blob
      // editImage is expected to be a data URL: "data:image/png;base64,..."
      if (editImage.startsWith('data:')) {
        const fetchResponse = await fetch(editImage);
        const blob = await fetchResponse.blob();
        formData.append('image', blob, 'image.png');
      } else {
        // If it's a remote URL, we might need to fetch it first or check if xAI supports URL in formData
        // xAI edit endpoint typically requires file upload
        formData.append('image', editImage); 
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          // Content-Type is set automatically
        },
        body: formData,
      });
    } else {
      // For generations, JSON is fine
      const requestBody: any = {
        prompt,
        model: model,
        n,
        response_format: 'url',
      };

      if (model.includes('grok-imagine')) {
        requestBody.quality = quality;
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image API error:', errorText);
      return NextResponse.json({ error: `Failed to generate image: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
