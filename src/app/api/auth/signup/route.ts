import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-utils';
import { generateAvatarUrl } from '@/lib/collaboration';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Check existing
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    const avatar_url = generateAvatarUrl(name || email);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash, name, avatar_url })
      .select()
      .single();

    if (error) {
      console.error('Signup error:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error('Signup exception:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
