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

// Check if user has access to canvas
async function hasCanvasAccess(supabase: SupabaseClient, canvasId: string, userId: string | undefined): Promise<{ isOwner: boolean; canEdit: boolean }> {
  if (!userId) return { isOwner: false, canEdit: false };

  // Check ownership
  const { data: canvas } = await supabase
    .from('canvases')
    .select('user_id')
    .eq('id', canvasId)
    .single();

  if (!canvas) return { isOwner: false, canEdit: false };
  
  if (canvas.user_id === userId) {
    return { isOwner: true, canEdit: true };
  }

  // Check share permissions
  const { data: share } = await supabase
    .from('canvas_shares')
    .select('permission')
    .eq('canvas_id', canvasId)
    .single();

  if (share && share.permission === 'edit') {
    return { isOwner: false, canEdit: true };
  }

  return { isOwner: false, canEdit: false };
}

// GET - Fetch version history for a canvas
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
    const { isOwner, canEdit } = await hasCanvasAccess(supabase, canvasId, user?.id);

    // Need at least view access (owner or shared)
    if (!isOwner && !canEdit) {
      // Check if canvas has any public share
      const { data: share } = await supabase
        .from('canvas_shares')
        .select('is_public')
        .eq('canvas_id', canvasId)
        .single();

      if (!share?.is_public) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    // Get versions
    const { data: versions, error } = await supabase
      .from('canvas_versions')
      .select('id, version_number, created_by, created_at')
      .eq('canvas_id', canvasId)
      .order('version_number', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Fetch versions error:', error);
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }

    return NextResponse.json({ versions: versions || [] });
  } catch (e) {
    console.error('Get versions error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create a new version snapshot
export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canvasId, nodes, edges } = await req.json();

    if (!canvasId) {
      return NextResponse.json({ error: 'Canvas ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { isOwner, canEdit } = await hasCanvasAccess(supabase, canvasId, user.id);

    if (!canEdit) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Use a more robust approach to avoid race conditions
    // Get current max version number with FOR UPDATE lock pattern
    const { data: maxVersion } = await supabase
      .from('canvas_versions')
      .select('version_number')
      .eq('canvas_id', canvasId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    let newVersionNumber = (maxVersion?.version_number || 0) + 1;
    let attempts = 0;
    const maxAttempts = 3;
    let version = null;
    let error = null;

    // Retry loop to handle race conditions
    while (attempts < maxAttempts) {
      const { data, error: insertError } = await supabase
        .from('canvas_versions')
        .insert({
          canvas_id: canvasId,
          version_number: newVersionNumber,
          nodes: nodes || [],
          edges: edges || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (!insertError) {
        version = data;
        break;
      }

      // If duplicate key error, increment version number and retry
      if (insertError.code === '23505') {
        newVersionNumber++;
        attempts++;
        continue;
      }

      // Other error, break out
      error = insertError;
      break;
    }

    if (error || !version) {
      console.error('Create version error:', error);
      return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
    }

    // Cleanup old versions (keep last 50) - do this async, don't wait
    supabase
      .from('canvas_versions')
      .select('id')
      .eq('canvas_id', canvasId)
      .order('version_number', { ascending: false })
      .range(50, 1000)
      .then(({ data: oldVersions }) => {
        if (oldVersions && oldVersions.length > 0) {
          supabase
            .from('canvas_versions')
            .delete()
            .in('id', oldVersions.map(v => v.id))
            .then(() => {});
        }
      });

    return NextResponse.json({ version });
  } catch (e) {
    console.error('Create version error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
