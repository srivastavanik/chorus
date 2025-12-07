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
    
    // Upsert canvas
    const { data, error } = await supabase
      .from('canvases')
      .upsert({ 
        id, // If provided, update. If not, insert (but we likely need an ID for upsert to work as update)
        user_id: user.id,
        name: name || 'Untitled Canvas', 
        nodes, 
        edges,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
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

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
  } catch (e) {
    console.error('Canvas list error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
