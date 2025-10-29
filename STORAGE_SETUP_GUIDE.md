# 📸 SUPABASE STORAGE SETUP GUIDE

## Option 1: Run SQL Migration (Recommended)

Copy and paste this in Supabase SQL Editor:

```sql
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

-- Drop existing policies if they exist
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
```

## Option 2: Create Bucket via Supabase Dashboard (Even Easier!)

1. Go to your Supabase project dashboard
2. Click on **Storage** in the left sidebar
3. Click **"New Bucket"**
4. Enter these details:
   - **Name:** `marketplace-images`
   - **Public bucket:** ✅ **YES** (check this!)
   - **File size limit:** `5 MB`
   - **Allowed MIME types:** `image/png, image/jpeg, image/jpg, image/gif, image/webp`
5. Click **"Create bucket"**

6. Now set up policies:
   - Click on your new `marketplace-images` bucket
   - Go to **"Policies"** tab
   - Click **"New Policy"**
   
   **Policy 1 - View (SELECT):**
   - Name: `Anyone can view marketplace images`
   - Allowed operation: `SELECT`
   - Policy definition: `true` (everyone can read)
   
   **Policy 2 - Upload (INSERT):**
   - Name: `Authenticated users can upload`
   - Allowed operation: `INSERT`
   - Policy definition: `(bucket_id = 'marketplace-images') AND (auth.uid() IS NOT NULL)`
   
   **Policy 3 - Update:**
   - Name: `Users can update their own images`
   - Allowed operation: `UPDATE`
   - Policy definition: `(bucket_id = 'marketplace-images') AND (auth.uid()::text = (storage.foldername(name))[1])`
   
   **Policy 4 - Delete:**
   - Name: `Users can delete their own images`
   - Allowed operation: `DELETE`
   - Policy definition: `(bucket_id = 'marketplace-images') AND (auth.uid()::text = (storage.foldername(name))[1])`

## ✅ Verify Setup

After setup, verify it works:

1. Go to Storage → marketplace-images
2. Try uploading a test image manually
3. Check if you can view it
4. Delete the test image

## 🧪 Test Image Upload in Your App

1. Go to Marketplace
2. Click "List Item"
3. Click "Upload" and select an image
4. You should see "Uploading 1 image(s)..."
5. Image should appear in preview
6. Submit the listing
7. Check if the image displays correctly

## 🐛 Troubleshooting

**If upload fails:**
1. Check browser console for errors
2. Verify bucket is public
3. Verify policies are active
4. Check file size (max 5MB)
5. Check file type (must be image)

**Common Errors:**
- `403 Forbidden` → Bucket is not public or policies are wrong
- `413 Payload Too Large` → File exceeds 5MB
- `400 Bad Request` → Invalid file type

## 📝 How It Works

```typescript
// When user uploads an image:
1. File is validated (size, type)
2. File is uploaded to Supabase Storage
3. Public URL is returned
4. URL is stored in marketplace_items.images array
5. Image is displayed using the public URL
```

**Storage Path Structure:**
```
marketplace-images/
  └── <user_id>/
      └── <timestamp>_<random>.jpg
```

**Example URL:**
```
https://[your-project].supabase.co/storage/v1/object/public/marketplace-images/user-123/1698765432_abc123.jpg
```

## 💡 Benefits vs Base64

| Feature | Base64 (Old) | Supabase Storage (New) |
|---------|--------------|------------------------|
| Max Size | Limited by database | 5MB per image |
| Loading Speed | Slow (embedded in JSON) | Fast (CDN) |
| Bandwidth | High | Low |
| Cost | Database storage | Cheap object storage |
| Caching | No | Yes (CDN) |
| Performance | ❌ Poor | ✅ Excellent |

## 🚀 You're All Set!

Once the bucket is created, image uploads will automatically work in your marketplace! 📸

