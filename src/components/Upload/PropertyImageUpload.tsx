/**
 * PropertyImageUpload.tsx – Comprehensive Image Uploader for Property Listings.
 * Supports:
 * 1. File Upload (drag-and-drop & browse) with automatic Supabase Storage upload
 *    and client-side Canvas Data-URL compression fallback (never breaks on refresh or offline).
 * 2. Direct Web Image URL paste with instant live preview.
 * 3. Curated Luxury Photography Presets (one-click high-res luxury property imagery).
 * 4. Thumbnail Gallery with Cover designation, "Set as Cover", full-size preview lightbox, and removal.
 */
import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  Loader2,
  Image as ImageIcon,
  Plus,
  Link as LinkIcon,
  Sparkles,
  Check,
  Eye,
  Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface PropertyImageUploadProps {
  images: string[];
  onChange: (urls: string[]) => void;
  orgId?: string | null;
}

// Curated high-resolution luxury estate imagery for 1-click addition
const LUXURY_PHOTO_PRESETS = [
  {
    title: 'Modern Glass Villa',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Beverly Hills Sunset Estate',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Wilshire Skyline Penthouse',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Contemporary Atrium Residence',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Heritage Pasadena Craftsman',
    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Architectural Hillside Sanctuary',
    url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Metropolitan High-Rise Interior',
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Zero-Edge Pool & Terrace',
    url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
  },
];

/**
 * Resizes and compresses image via in-browser HTML Canvas to produce a lightweight,
 * persistent Data URL (~150-250KB) that saves directly in DB and never vanishes.
 */
function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 960;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export const PropertyImageUpload: React.FC<PropertyImageUploadProps> = ({
  images,
  onChange,
  orgId,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload a single file with Supabase Storage + Data URL fallback
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${orgId || 'public'}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      // 1. Try Supabase Storage upload
      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(data.path);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }

      // 2. Storage failed or not yet provisioned: Fallback to persistent compressed Data URL
      console.info('Supabase Storage unavailable, converting to compressed data image…');
      return await compressImageToDataUrl(file);
    } catch (err: any) {
      console.warn('Image upload fallback triggered:', err);
      return await compressImageToDataUrl(file);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const url = await uploadFile(file);
      if (url) newUrls.push(url);
    }

    setUploading(false);
    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:image/')) {
      setUploadError('Please provide a valid image URL (e.g. starting with https://)');
      return;
    }

    onChange([...images, cleanUrl]);
    setUrlInput('');
    setUploadError(null);
  };

  const handleTogglePreset = (url: string) => {
    if (images.includes(url)) {
      onChange(images.filter((img) => img !== url));
    } else {
      onChange([...images, url]);
    }
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const filtered = images.filter((_, i) => i !== index);
    onChange([target, ...filtered]);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Upload Modes Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-white text-[#005d42] shadow-xs'
              : 'text-slate-600 hover:text-[#0b1c30]'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Photos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'url'
              ? 'bg-white text-[#005d42] shadow-xs'
              : 'text-slate-600 hover:text-[#0b1c30]'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Paste Image URL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'presets'
              ? 'bg-white text-[#005d42] shadow-xs'
              : 'text-slate-600 hover:text-[#0b1c30]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Luxury Presets</span>
        </button>
      </div>

      {/* Tab 1: Drag & Drop File Upload */}
      {activeTab === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
            dragActive
              ? 'border-[#005d42] bg-[#99efe5]/20 ring-2 ring-[#005d42]/30'
              : 'border-slate-200 bg-[#f8fafc] hover:bg-[#eff4ff] hover:border-[#005d42]/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#005d42]">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <span className="text-sm font-semibold text-[#0b1c30] block">
              {uploading ? 'Processing & uploading photos…' : 'Drag & drop property photos or click to browse'}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Supports high-resolution PNG, JPG, JPEG, WEBP. Automatic Supabase Storage sync.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Direct URL Input */}
      {activeTab === 'url' && (
        <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-200 flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-[#0b1c30]">
            Paste Public Image URL (Unsplash, CDN, or Direct Link)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="px-4 py-2 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add URL</span>
            </button>
          </div>
          {urlInput.startsWith('http') && (
            <div className="mt-2 flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
              <img
                src={urlInput}
                alt="Preview link"
                className="w-12 h-10 object-cover rounded-lg bg-slate-100"
                onError={() => {}}
              />
              <span className="text-[11px] text-slate-600 truncate flex-1">{urlInput}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Curated Luxury Presets */}
      {activeTab === 'presets' && (
        <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Curated Luxury Photography
            </span>
            <span className="text-[11px] text-slate-500">Click any photo to attach</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1">
            {LUXURY_PHOTO_PRESETS.map((preset) => {
              const isSelected = images.includes(preset.url);
              return (
                <button
                  type="button"
                  key={preset.url}
                  onClick={() => handleTogglePreset(preset.url)}
                  className={`group relative rounded-xl overflow-hidden aspect-4/3 border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#005d42] ring-2 ring-[#005d42]/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 opacity-85 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                    <span className="text-[10px] font-semibold text-white drop-shadow-xs truncate">
                      {preset.title}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#005d42] text-white flex items-center justify-center shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {uploadError && (
        <span className="text-xs text-red-500 font-medium px-1">{uploadError}</span>
      )}

      {/* Thumbnails Gallery & Management */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#3e4943] uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#005d42]" />
            Property Photos Gallery ({images.length})
          </span>
          {images.length > 0 && (
            <span className="text-[11px] text-slate-500">
              Tip: Click &quot;Set Cover&quot; to make photo the primary MLS hero image.
            </span>
          )}
        </div>

        {images.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-white text-center">
            <p className="text-xs text-slate-400">
              No photos attached yet. Upload photos, paste a URL, or choose from luxury presets above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((url, idx) => (
              <div
                key={url + idx}
                className="relative group rounded-xl overflow-hidden aspect-4/3 border border-slate-200 shadow-xs bg-slate-100"
              >
                <img
                  src={url}
                  alt={`Property preview ${idx + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Cover Badge or Set as Cover Button */}
                {idx === 0 ? (
                  <span className="absolute bottom-2 left-2 bg-[#005d42] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Cover Photo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetCover(idx)}
                    className="absolute bottom-2 left-2 bg-black/70 hover:bg-[#005d42] text-white text-[10px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
                  >
                    Set as Cover
                  </button>
                )}

                {/* Actions: Full Preview Lightbox & Delete */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewLightbox(url);
                    }}
                    className="w-6 h-6 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Preview full size"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(idx);
                    }}
                    className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Quick Add More Tile */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                fileInputRef.current?.click();
              }}
              className="rounded-xl border border-dashed border-slate-300 hover:border-[#005d42] aspect-4/3 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#005d42] transition-colors bg-[#f8fafc] hover:bg-[#eff4ff] cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[11px] font-semibold">Add More Photos</span>
            </button>
          </div>
        )}
      </div>

      {/* Full-size Lightbox Modal */}
      {previewLightbox && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewLightbox(null)}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewLightbox}
              alt="Full size property preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setPreviewLightbox(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
