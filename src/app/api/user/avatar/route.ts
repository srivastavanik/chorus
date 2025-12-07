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

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 2MB' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Use canvas_assets bucket instead of separate avatars bucket
    const bucketName = 'canvas_assets';
    
    // Delete old avatar if exists
    const avatarPrefix = `avatars/${user.id}`;
    const { data: oldAvatars } = await supabaseAdmin
      .storage
      .from(bucketName)
      .list(avatarPrefix);
    
    if (oldAvatars && oldAvatars.length > 0) {
      await supabaseAdmin
        .storage
        .from(bucketName)
        .remove(oldAvatars.map(f => `${avatarPrefix}/${f.name}`));
    }

    // Upload new avatar
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `avatar_${Date.now()}.${ext}`;
    const filePath = `${avatarPrefix}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      // If bucket doesn't exist or upload fails, fall back to generated avatar
      const generatedUrl = generateAvatarUrl(user.email || user.id);
      
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ avatar_url: generatedUrl })
        .eq('id', user.id);
      
      if (updateError) {
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
      
      return NextResponse.json({ avatarUrl: generatedUrl, fallback: true });
    }

    // Generate signed URL (valid for 1 year)
    const { data: urlData, error: urlError } = await supabaseAdmin
      .storage
      .from(bucketName)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (urlError || !urlData) {
      console.error('URL generation error:', urlError);
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }

    const avatarUrl = urlData.signedUrl;

    // Update user record
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('User update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ avatarUrl });
  } catch (e) {
    console.error('Avatar upload exception:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
