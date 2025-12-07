-- Enable the storage schema if it doesn't exist (standard in Supabase)
-- create extension if not exists "storage";

-- 1. Create a private bucket for canvas assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'canvas_assets', 
  'canvas_assets', 
  false, -- Private bucket
  52428800, -- 50MB limit
  NULL -- Allow all mime types
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- 2. Create a policy to allow the service role (our API) to do everything
-- Note: Service role bypasses RLS by default, but good to be explicit if we ever enable RLS on storage.objects
-- These policies assume you might want to use Supabase Auth later. 
-- For now, our Next.js API uses the service role key, so it has full access.

-- 3. (Optional) If we were using Supabase Auth, we would add policies here like:
-- CREATE POLICY "Users can upload their own files" ON storage.objects FOR INSERT 
-- WITH CHECK (bucket_id = 'canvas_assets' AND auth.uid() = owner);

