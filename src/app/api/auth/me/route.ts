import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';

export async function GET(req: Request) {
  const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const user = await getUserByToken(token);
  return NextResponse.json({ user });
}

