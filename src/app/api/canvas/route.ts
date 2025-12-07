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

    const { id, name, nodes, edges } = await req.json();
    
    const upsertData: any = {
      user_id: user.id,
      name: name || 'Untitled Canvas', 
      nodes: nodes || [], 
      edges: edges || [],
      updated_at: new Date().toISOString()
    };

    if (id) {
      upsertData.id = id;
    }

    // Upsert canvas
    const { data, error } = await supabase
      .from('canvases')
      .upsert(upsertData, { onConflict: 'id' })
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
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

    let query = supabase
      .from('canvases')
      .select('*')
      .eq('user_id', user.id);

    if (id) {
        // If ID provided, return single object
        query = query.eq('id', id).single();
    } else {
        // List mode
        query = query.order('updated_at', { ascending: false });
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
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
