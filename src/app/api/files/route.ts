import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
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

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List files from Supabase Storage "canvas_assets" bucket under user folder
    // Note: "canvas_assets" is the bucket name we used in upload
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .storage
      .from('canvas_assets')
      .list(user.id, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Storage list error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URLs for each file (expensive for many files? maybe just public URL if public?)
    // We made them signed. Let's generate signed URLs.
    const filesWithUrls = await Promise.all(data.map(async (file) => {
      const filePath = `${user.id}/${file.name}`;
      const { data: urlData } = await supabaseAdmin
        .storage
        .from('canvas_assets')
        .createSignedUrl(filePath, 3600); // 1 hour

      return {
        id: file.id, // Storage ID
        name: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'application/octet-stream',
        created_at: file.created_at,
        url: urlData?.signedUrl || '',
        path: filePath
      };
    }));

    return NextResponse.json(filesWithUrls);

  } catch (e) {
    console.error('Files list error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

