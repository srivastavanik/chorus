import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
import { maybeAutoTitleCanvas } from '@/lib/canvas-title';

export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canvasId, prompt } = await req.json();

    if (!canvasId || !prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing canvasId or prompt' }, { status: 400 });
    }

    // Call the helper to potentially title the canvas
    const result = await maybeAutoTitleCanvas({
      canvasId,
      userId: user.id,
      prompt: prompt.trim()
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Auto-title API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process auto-title request' },
      { status: 500 }
    );
  }
}

