-- =====================================================
-- SUPABASE STORAGE FOR MARKETPLACE IMAGES
-- =====================================================

-- Create marketplace-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-images',
  'marketplace-images',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We just need to create the policies

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Anyone can view marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own marketplace images" ON storage.objects;

-- Policy: Anyone can view marketplace images (public bucket)
CREATE POLICY "Anyone can view marketplace images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-images');

-- Policy: Authenticated users can upload marketplace images
CREATE POLICY "Authenticated users can upload marketplace images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketplace-images' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Users can update their own images
CREATE POLICY "Users can update their own marketplace images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketplace-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own marketplace images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketplace-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Done!
SELECT 'Marketplace storage bucket created successfully!' AS message;

