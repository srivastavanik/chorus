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

    // Verify access to canvas (owner or has share access)
    const { data: canvas } = await supabase
      .from('canvases')
      .select('user_id')
      .eq('id', canvasId)
      .single();

    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    // For now, only owner can view version history
    if (canvas.user_id !== user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
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

    // Verify ownership
    const { data: canvas } = await supabase
      .from('canvases')
      .select('user_id')
      .eq('id', canvasId)
      .single();

    if (!canvas || canvas.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get current max version number
    const { data: maxVersion } = await supabase
      .from('canvas_versions')
      .select('version_number')
      .eq('canvas_id', canvasId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = (maxVersion?.version_number || 0) + 1;

    // Create version
    const { data: version, error } = await supabase
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

    if (error) {
      console.error('Create version error:', error);
      return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
    }

    // Cleanup old versions (keep last 50)
    const { data: oldVersions } = await supabase
      .from('canvas_versions')
      .select('id')
      .eq('canvas_id', canvasId)
      .order('version_number', { ascending: false })
      .range(50, 1000);

    if (oldVersions && oldVersions.length > 0) {
      await supabase
        .from('canvas_versions')
        .delete()
        .in('id', oldVersions.map(v => v.id));
    }

    return NextResponse.json({ version });
  } catch (e) {
    console.error('Create version error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

