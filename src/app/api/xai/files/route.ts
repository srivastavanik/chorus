import { NextResponse } from 'next/server';

const XAI_API_KEY = process.env.XAI_API_KEY!;
const XAI_BASE_URL = 'https://api.x.ai/v1';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const purpose = formData.get('purpose') || 'assistants';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // We need to forward this to xAI
    // Since we are in a server environment, we can use fetch with FormData but 
    // we need to be careful about headers.
    // Alternatively, we can use the openai package if it's configured for xAI.
    
    // Let's use raw fetch to ensure we pass the buffer correctly
    const xaiFormData = new FormData();
    xaiFormData.append('file', file);
    xaiFormData.append('purpose', purpose as string);

    const response = await fetch(`${XAI_BASE_URL}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        // Do not set Content-Type manually for FormData, fetch does it with boundary
      },
      body: xaiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI File Upload Error:', errorText);
      return NextResponse.json({ error: `xAI Upload Failed: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('File proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

