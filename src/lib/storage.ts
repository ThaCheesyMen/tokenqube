import { supabase } from './supabase';

const MARKETPLACE_BUCKET = 'marketplace-images';

/**
 * Upload image to Supabase Storage
 * @param file File to upload
 * @param userId User ID for folder organization
 * @param itemId Item ID for file naming
 * @returns Public URL of uploaded image
 */
export async function uploadMarketplaceImage(
  file: File,
  userId: string,
  itemId?: string
): Promise<string> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    const fileName = itemId 
      ? `${itemId}/${timestamp}_${randomString}.${fileExt}`
      : `${userId}/${timestamp}_${randomString}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(MARKETPLACE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(MARKETPLACE_BUCKET)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Upload multiple images
 * @param files Files to upload
 * @param userId User ID
 * @param itemId Optional item ID
 * @returns Array of public URLs
 */
export async function uploadMultipleImages(
  files: File[],
  userId: string,
  itemId?: string
): Promise<string[]> {
  const uploadPromises = files.map(file => 
    uploadMarketplaceImage(file, userId, itemId)
  );
  return Promise.all(uploadPromises);
}

/**
 * Delete image from storage
 * @param imageUrl Full URL of image to delete
 */
export async function deleteMarketplaceImage(imageUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const path = imageUrl.split(`${MARKETPLACE_BUCKET}/`)[1];
    if (!path) return;

    const { error } = await supabase.storage
      .from(MARKETPLACE_BUCKET)
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

/**
 * Delete multiple images
 * @param imageUrls Array of image URLs to delete
 */
export async function deleteMultipleImages(imageUrls: string[]): Promise<void> {
  const deletePromises = imageUrls.map(url => deleteMarketplaceImage(url));
  await Promise.all(deletePromises);
}

/**
 * Ensure marketplace bucket exists (run once during setup)
 */
export async function ensureMarketplaceBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === MARKETPLACE_BUCKET);

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(MARKETPLACE_BUCKET, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      });

      if (error) throw error;
      console.log('✅ Marketplace bucket created');
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
  }
}

