import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserByToken } from '@/lib/auth-utils';

export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, nodes, edges, arrows } = await req.json();
    
    // Build base update data (without user_id to preserve ownership)
    const upsertData: any = {
      nodes: nodes || [], 
      edges: edges || [],
      arrows: arrows || [],
      updated_at: new Date().toISOString()
    };

    if (name) {
      upsertData.name = name;
    }

    // Handle canvas creation/update
    if (id) {
      // Check if canvas exists
      const { data: existing } = await supabase
        .from('canvases')
        .select('user_id')
        .eq('id', id)
        .single();
      
      if (existing) {
        // Canvas exists - check permissions before updating
        const isOwner = existing.user_id === user.id;
        
        if (!isOwner) {
          // Check if user has edit permission via share
          const { data: share } = await supabase
            .from('canvas_shares')
            .select('permission')
            .eq('canvas_id', id)
            .single();
          
          if (!share || share.permission !== 'edit') {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
          }
        }
        
        // Update canvas (without changing user_id)
        const { data, error } = await supabase
          .from('canvases')
          .update(upsertData)
          .eq('id', id)
          .select()
          .single();
          
        if (error) {
          console.error('Supabase update error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        return NextResponse.json(data);
      } else {
        // Canvas doesn't exist yet - create with provided ID
        upsertData.id = id;
        upsertData.user_id = user.id;
        if (!name) {
          upsertData.name = 'Untitled Canvas';
        }
        
        const { data, error } = await supabase
          .from('canvases')
          .insert(upsertData)
          .select()
          .single();
          
        if (error) {
          console.error('Supabase insert error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        return NextResponse.json(data);
      }
    } else {
      // No ID provided - create new canvas
      upsertData.user_id = user.id;
      if (!name) {
        upsertData.name = 'Untitled Canvas';
      }
      
      const { data, error } = await supabase
        .from('canvases')
        .insert(upsertData)
        .select()
        .single();
        
      if (error) {
        console.error('Supabase insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json(data);
    }
  } catch (e) {
    console.error('Canvas save error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Canvas ID required' }, { status: 400 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;

    const { data, error } = await supabase
      .from('canvases')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('Canvas update error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      // If ID provided, return single object
      // First try as owner
      let { data, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', id)
        .maybeSingle();
        
      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // If not found as owner, check if user has share access
      if (!data) {
        const { data: share } = await supabase
          .from('canvas_shares')
          .select('canvas_id, permission')
          .eq('canvas_id', id)
          .maybeSingle();
          
        if (share) {
          // User has share access, fetch the canvas
          const { data: sharedCanvas, error: sharedError } = await supabase
            .from('canvases')
            .select('*')
            .eq('id', id)
            .maybeSingle();
            
          if (sharedError) {
            console.error('Supabase error:', sharedError);
            return NextResponse.json({ error: sharedError.message }, { status: 500 });
          }
          
          data = sharedCanvas;
        }
      }
      
      if (!data) {
        return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
      }
      
      return NextResponse.json(data);
    } else {
      // List mode
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json(data);
    }
  } catch (e) {
    console.error('Canvas list error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing canvas ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('canvases')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Strict ownership check

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Canvas delete error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
