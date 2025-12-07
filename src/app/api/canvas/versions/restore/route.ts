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

// POST - Restore canvas to a specific version
export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canvasId, versionId } = await req.json();

    if (!canvasId || !versionId) {
      return NextResponse.json({ error: 'Canvas ID and Version ID required' }, { status: 400 });
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

    // Get the version to restore
    const { data: version, error: versionError } = await supabase
      .from('canvas_versions')
      .select('nodes, edges')
      .eq('id', versionId)
      .eq('canvas_id', canvasId)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Update the canvas with the version's data
    const { error: updateError } = await supabase
      .from('canvases')
      .update({
        nodes: version.nodes,
        edges: version.edges,
        updated_at: new Date().toISOString(),
      })
      .eq('id', canvasId);

    if (updateError) {
      console.error('Restore error:', updateError);
      return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      nodes: version.nodes,
      edges: version.edges,
    });
  } catch (e) {
    console.error('Restore version error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

