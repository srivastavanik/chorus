import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
import { getAiApiConfig } from '@/lib/ai-provider';
import { recordUploadedFile } from '@/lib/file-uploads';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Enforce file size limit: 10MB
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    // 1. Upload to Supabase Storage (for UI/Persistence)
    // Sanitize original filename to be safe but recognizable
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Use timestamp prefix to ensure uniqueness but keep original name
    const fileName = `${Date.now()}_${safeName}`;
    const filePath = `${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .storage
      .from('canvas_assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URL
    const { data: urlData, error: urlError } = await supabaseAdmin
      .storage
      .from('canvas_assets')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }

    // 2. Upload to xAI Files API (for Chat/Agentic capabilities)
    // Braintrust/tracing configuration must not enable forwarding uploaded file contents.
    let xaiFileId = null;
    if (process.env.XAI_API_KEY) {
        try {
            const aiProvider = getAiApiConfig();
            const xaiFormData = new FormData();
            // We need to re-create a Blob/File from buffer because we consumed it? 
            // Actually ArrayBuffer is reusable.
            // Node's FormData might need a Blob or compatible object.
            const blob = new Blob([buffer], { type: file.type });
            xaiFormData.append('file', blob, file.name); // Keep original name for xAI
            xaiFormData.append('purpose', 'assistants'); // Standard purpose

            const xaiRes = await fetch(`${aiProvider.baseUrl}/files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${aiProvider.apiKey}`,
                    // Content-Type is set automatically by FormData
                },
                body: xaiFormData
            });

            if (xaiRes.ok) {
                const xaiData = await xaiRes.json();
                xaiFileId = xaiData.id;
            } else {
                console.warn('xAI File Upload failed:', await xaiRes.text());
            }
        } catch (xaiError) {
            console.error('xAI Upload exception:', xaiError);
        }
    }

    // Record ownership so the chat/agentic route can authorize this file id
    // against the authenticated user. If ownership cannot be recorded, do not
    // hand the provider file id back to the client (fail closed): the file
    // still exists in storage for display, but it will not be attachable.
    if (xaiFileId) {
      try {
        await recordUploadedFile({
          userId: user.id,
          xaiFileId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storagePath: filePath,
        });
      } catch (ownershipError) {
        console.error('File ownership record failed:', ownershipError);
        xaiFileId = null;
      }
    }

    return NextResponse.json({ 
      path: data.path,
      url: urlData.signedUrl,
      filename: file.name, // Return ORIGINAL name to frontend
      type: file.type,
      size: file.size,
      xaiFileId // Return this to frontend to store in node data
    });

  } catch (e) {
    console.error('Upload exception:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
