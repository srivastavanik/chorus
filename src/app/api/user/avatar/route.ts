import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth-utils';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateAvatarUrl } from '@/lib/collaboration';

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

export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const user = token ? await getUserByToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    const supabaseAdmin = getSupabaseAdmin();

    // Handle JSON request (avatar URL or generated avatar)
    if (contentType.includes('application/json')) {
      const { avatarUrl, generateNew } = await req.json();
      
      let newAvatarUrl: string;
      
      if (generateNew) {
        // Generate a new random avatar
        const seed = `${user.email}-${Date.now()}`;
        newAvatarUrl = generateAvatarUrl(seed);
      } else if (avatarUrl) {
        // Use provided URL (must be a valid URL)
        try {
          new URL(avatarUrl);
          newAvatarUrl = avatarUrl;
        } catch {
          return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'No avatar URL provided' }, { status: 400 });
      }

      // Update user record
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('User update error:', updateError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json({ avatarUrl: newAvatarUrl });
    }

    // Handle file upload - convert to base64 data URL
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 500KB for base64)
    if (file.size > 500 * 1024) {
      return NextResponse.json({ error: 'Image must be under 500KB' }, { status: 400 });
    }

    // Convert to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update user record with base64 avatar
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: dataUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('User update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ avatarUrl: dataUrl });
  } catch (e) {
    console.error('Avatar upload exception:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
