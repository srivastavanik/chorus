import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Server-side ownership tracking for uploaded provider files.
//
// Provider (xAI) file IDs are opaque and, on their own, carry no notion of
// which user uploaded them. Persisting an (xai_file_id -> user_id) record lets
// the chat route authorize every attachment against the authenticated user
// before the server uses its API key to have the model read the file.
// ---------------------------------------------------------------------------

let _admin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase admin environment variables');
  }

  _admin = createClient(url, key);
  return _admin;
}

export interface RecordUploadInput {
  userId: string;
  xaiFileId: string;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storagePath?: string | null;
}

/**
 * Persist ownership metadata for a provider file upload.
 *
 * @throws if the record cannot be written, so callers can decide whether to
 *         expose the resulting file id to the client (fail closed).
 */
export async function recordUploadedFile(input: RecordUploadInput): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('file_uploads')
    .upsert(
      {
        user_id: input.userId,
        xai_file_id: input.xaiFileId,
        filename: input.filename ?? null,
        mime_type: input.mimeType ?? null,
        size_bytes: input.sizeBytes ?? null,
        storage_path: input.storagePath ?? null,
      },
      { onConflict: 'xai_file_id' },
    );

  if (error) {
    console.error('Failed to record file ownership:', error.message);
    throw new Error('Failed to record file ownership');
  }
}

function normalizeIds(fileIds: unknown): string[] {
  if (!Array.isArray(fileIds)) return [];
  const cleaned = fileIds.filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
  return Array.from(new Set(cleaned));
}

/**
 * Return the subset of requested file IDs that are NOT owned by the user.
 *
 * An empty array means every requested id is authorized. Fails closed: any
 * lookup error propagates so the caller rejects the request rather than
 * granting access.
 *
 * @throws if the ownership lookup cannot be completed.
 */
export async function getUnauthorizedFileIds(
  userId: string,
  fileIds: unknown,
): Promise<string[]> {
  const requested = normalizeIds(fileIds);
  if (requested.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from('file_uploads')
    .select('xai_file_id')
    .eq('user_id', userId)
    .in('xai_file_id', requested);

  if (error) {
    console.error('File ownership lookup failed:', error.message);
    throw new Error('File ownership lookup failed');
  }

  const owned = new Set((data ?? []).map((row) => row.xai_file_id as string));
  return requested.filter((id) => !owned.has(id));
}
