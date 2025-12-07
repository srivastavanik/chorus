import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateShareToken } from '@/lib/collaboration';

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

// GET - Get share settings for a canvas
export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    const { searchParams } = new URL(req.url);
    const canvasId = searchParams.get('canvasId');

    if (!canvasId) {
      return NextResponse.json({ error: 'Canvas ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get canvas to verify ownership
    const { data: canvas, error: canvasError } = await supabase
      .from('canvases')
      .select('user_id')
      .eq('id', canvasId)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    // Only owner can view share settings
    if (canvas.user_id !== user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get share settings
    const { data: shares, error: shareError } = await supabase
      .from('canvas_shares')
      .select('*')
      .eq('canvas_id', canvasId);

    if (shareError) {
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
    }

    return NextResponse.json({ shares: shares || [] });
  } catch (e) {
    console.error('Get shares error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create or update share settings
export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canvasId, permission, isPublic } = await req.json();

    if (!canvasId) {
      return NextResponse.json({ error: 'Canvas ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: canvas, error: canvasError } = await supabase
      .from('canvases')
      .select('user_id')
      .eq('id', canvasId)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    if (canvas.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if share already exists
    const { data: existing } = await supabase
      .from('canvas_shares')
      .select('*')
      .eq('canvas_id', canvasId)
      .single();

    if (existing) {
      // Update existing share
      const { data: updated, error: updateError } = await supabase
        .from('canvas_shares')
        .update({
          permission: permission || existing.permission,
          is_public: isPublic !== undefined ? isPublic : existing.is_public,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update share' }, { status: 500 });
      }

      return NextResponse.json({ share: updated });
    } else {
      // Create new share
      const shareToken = generateShareToken();

      const { data: newShare, error: createError } = await supabase
        .from('canvas_shares')
        .insert({
          canvas_id: canvasId,
          share_token: shareToken,
          permission: permission || 'view',
          is_public: isPublic !== undefined ? isPublic : false,
        })
        .select()
        .single();

      if (createError) {
        console.error('Create share error:', createError);
        return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
      }

      return NextResponse.json({ share: newShare });
    }
  } catch (e) {
    console.error('Share error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Remove share
export async function DELETE(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const canvasId = searchParams.get('canvasId');

    if (!canvasId) {
      return NextResponse.json({ error: 'Canvas ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: canvas, error: canvasError } = await supabase
      .from('canvases')
      .select('user_id')
      .eq('id', canvasId)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    if (canvas.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete share
    const { error: deleteError } = await supabase
      .from('canvas_shares')
      .delete()
      .eq('canvas_id', canvasId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete share error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

