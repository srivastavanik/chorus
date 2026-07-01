import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
import { getAiApiConfig } from '@/lib/ai-provider';
import { recordUploadedFile } from '@/lib/file-uploads';

export async function POST(req: Request) {
  try {
    // Require an authenticated user: this endpoint spends the server's xAI API
    // key, so it must never be an open proxy.
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiProvider = getAiApiConfig();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const purpose = formData.get('purpose') || 'assistants';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Forward to xAI with raw fetch so the multipart boundary is preserved.
    const xaiFormData = new FormData();
    xaiFormData.append('file', file);
    xaiFormData.append('purpose', purpose as string);

    const response = await fetch(`${aiProvider.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiProvider.apiKey}`,
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

    // Record ownership so the chat/agentic route can authorize this file id
    // against the authenticated user. Fail closed if it cannot be recorded.
    if (data?.id) {
      try {
        await recordUploadedFile({
          userId: user.id,
          xaiFileId: data.id,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
      } catch (ownershipError) {
        console.error('File ownership record failed:', ownershipError);
        return NextResponse.json({ error: 'Failed to record file ownership' }, { status: 500 });
      }
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('File proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
