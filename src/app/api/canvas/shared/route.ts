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

// GET - Get canvas by share token
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get('token');

    if (!shareToken) {
      return NextResponse.json({ error: 'Share token required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find share by token
    const { data: share, error: shareError } = await supabase
      .from('canvas_shares')
      .select('*')
      .eq('share_token', shareToken)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
    }

    // Get the canvas
    const { data: canvas, error: canvasError } = await supabase
      .from('canvases')
      .select('*')
      .eq('id', share.canvas_id)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    // Get current user if logged in
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    // Check if user is the owner
    const isOwner = user?.id === canvas.user_id;

    return NextResponse.json({
      canvas,
      share: {
        permission: share.permission,
        isPublic: share.is_public,
      },
      isOwner,
      canEdit: isOwner || share.permission === 'edit',
    });
  } catch (e) {
    console.error('Get shared canvas error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

