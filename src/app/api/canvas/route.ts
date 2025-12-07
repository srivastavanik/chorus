import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const { name, nodes, edges } = await req.json();
    
    const { data, error } = await supabase
      .from('canvases')
      .insert([{ name: name || 'Untitled Canvas', nodes, edges }])
      .select();
      
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data[0]);
  } catch (e) {
    console.error('Canvas save error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('canvases')
      .select('*')
      .order('created_at', { ascending: false });
      
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
