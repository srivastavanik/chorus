import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword, generateToken } from '@/lib/auth-utils';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session
    const token = generateToken();
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, token, expires_at });

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const response = NextResponse.json({ user, token });
    
    // Set cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expires_at,
    });

    return response;
  } catch (e) {
    console.error('Login exception:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

