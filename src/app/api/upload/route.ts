import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserByToken } from '@/lib/auth-utils';

// Helper to get service role client for storage admin operations
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Create a unique path: user_id/timestamp_filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

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

    // Generate a signed URL for viewing (valid for 1 year for simplicity in this MVP)
    // In a prod app, you might proxy the download or refresh tokens.
    const { data: urlData, error: urlError } = await supabaseAdmin
      .storage
      .from('canvas_assets')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }

    return NextResponse.json({ 
      path: data.path,
      url: urlData.signedUrl,
      filename: file.name,
      type: file.type,
      size: file.size
    });

  } catch (e) {
    console.error('Upload exception:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

