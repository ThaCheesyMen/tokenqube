import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from './Toast';

interface MarketplaceImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function MarketplaceImageUpload({ images, onChange, maxImages = 5 }: MarketplaceImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    
    try {
      const newImages: string[] = [];
      
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        // Convert to base64 for preview (in production, upload to S3/Supabase Storage)
        const reader = new FileReader();
        const imageUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newImages.push(imageUrl);
      }

      onChange([...images, ...newImages]);
      toast.success(`${newImages.length} image(s) added`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleAddFromUrl = () => {
    const url = prompt('Enter image URL:');
    if (url && url.trim()) {
      if (images.length >= maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }
      onChange([...images, url.trim()]);
      toast.success('Image URL added');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-400">
          Images ({images.length}/{maxImages})
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= maxImages}
            className="px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            type="button"
            onClick={handleAddFromUrl}
            disabled={images.length >= maxImages}
            className="px-3 py-1.5 bg-[#2f3136] hover:bg-[#36393f] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            From URL
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square bg-[#0f0f0f] rounded-lg overflow-hidden border border-[#202225] group"
            >
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                }}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
              {index === 0 && (
                <div className="absolute bottom-1 left-1 px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
          
          {/* Add More Button */}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square bg-[#0f0f0f] rounded-lg border-2 border-dashed border-[#202225] hover:border-[#8B5CF6] transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white disabled:opacity-50"
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs font-semibold">Add More</span>
            </button>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-[#202225] rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 mb-3">No images yet</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Images'}
          </button>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-400">
          <p className="font-semibold text-white mb-1">Image Guidelines:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Maximum {maxImages} images</li>
            <li>Max size: 5MB per image</li>
            <li>First image will be the primary display</li>
            <li>Supported: JPG, PNG, GIF, WebP</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

