import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];

  if (token) {
    await supabase.from('sessions').delete().eq('token', token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}

