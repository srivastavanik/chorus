import bcrypt from 'bcryptjs';
import { supabase } from './supabase';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export function generateToken() {
  return crypto.randomUUID();
}

export async function getUserByToken(token: string) {
  const { data: session, error } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (error || !session) return null;

  if (new Date(session.expires_at) < new Date()) {
    // Token expired
    await supabase.from('sessions').delete().eq('token', token);
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user_id)
    .single();

  if (userError || !user) return null;

  return user;
}

