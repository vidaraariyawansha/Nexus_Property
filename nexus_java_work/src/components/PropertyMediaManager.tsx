import React, { useState, useRef, useEffect, DragEvent } from 'react';
import { PropertyImage } from '../types';
import { api } from '../api/client';
import {
  UploadCloud,
  Star,
  Trash2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';

export interface ManagedMediaItem {
  id: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
  status?: 'idle' | 'uploading' | 'success' | 'error';
  progress?: number;
  errorMessage?: string;
  file?: File;
}

interface PropertyMediaManagerProps {
  mode: 'create' | 'edit';
  propertyId?: string;
  initialImages?: PropertyImage[];
  maxImages?: number; // default 15
  onChange?: (images: Array<{ url: string; isPrimary: boolean; displayOrder: number }>) => void;
  onImagesUpdated?: (images: PropertyImage[]) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

const MAX_IMAGES_LIMIT = 15;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PropertyMediaManager: React.FC<PropertyMediaManagerProps> = ({
  mode,
  propertyId,
  initialImages = [],
  maxImages = MAX_IMAGES_LIMIT,
  onChange,
  onImagesUpdated,
  showToast,
}) => {
  const [items, setItems] = useState<ManagedMediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ManagedMediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize from initialImages
  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      const sorted = [...initialImages].sort((a, b) => a.displayOrder - b.displayOrder);
      const mapped: ManagedMediaItem[] = sorted.map((img, idx) => ({
        id: img.id || `init_${idx}`,
        url: img.url,
        isPrimary: Boolean(img.isPrimary),
        displayOrder: img.displayOrder !== undefined ? img.displayOrder : idx,
        status: 'idle',
      }));
      setItems(mapped);
    } else if (mode === 'edit' && initialImages.length === 0) {
      setItems([]);
    }
  }, [initialImages, mode]);

  // Sync changes up to parent in 'create' mode
  const notifyParent = (newItems: ManagedMediaItem[]) => {
    if (onChange) {
      const exportList = newItems
        .filter(item => item.status !== 'error' && Boolean(item.url))
        .map((item, idx) => ({
          url: item.url,
          isPrimary: item.isPrimary,
          displayOrder: idx,
        }));
      onChange(exportList);
    }
  };

  const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (showToast) {
      showToast(msg, type);
    }
  };

  // Convert File to base64 DataURL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Client-side file validation
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Invalid format for "${file.name}". Only JPG, PNG, and WebP are supported.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 5MB limit.`;
    }
    return null;
  };

  // Process incoming files from drop or browse
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    const remainingSlots = maxImages - items.length;
    if (remainingSlots <= 0) {
      toast(`Maximum ${maxImages} images allowed. Remove an image before adding more.`, 'error');
      return;
    }

    const filesToProcess = rawFiles.slice(0, remainingSlots);
    if (rawFiles.length > remainingSlots) {
      toast(`Only ${remainingSlots} images can be added. Remaining slots reached.`, 'error');
    }

    if (mode === 'create') {
      // In create mode: add items with temporary data URLs and upload in background
      for (const file of filesToProcess) {
        const error = validateFile(file);
        if (error) {
          toast(error, 'error');
          continue;
        }

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        try {
          const dataUrl = await fileToDataUrl(file);
          const isFirstImage = items.length === 0;

          // Optimistically add item with uploading status
          const newItem: ManagedMediaItem = {
            id: tempId,
            url: dataUrl,
            isPrimary: isFirstImage,
            displayOrder: items.length,
            status: 'uploading',
            file,
          };

          setItems(prev => {
            const next = [...prev, newItem];
            notifyParent(next);
            return next;
          });

          // Upload to temporary media endpoint
          const res = await api.post<{ url: string }>('/api/properties/media/upload-temp', {
            dataUrl,
            mimeType: file.type,
          });

          // Update item with permanent server URL
          setItems(prev => {
            const next = prev.map(item =>
              item.id === tempId ? { ...item, url: res.url, status: 'success' as const } : item
            );
            notifyParent(next);
            return next;
          });
        } catch (err: any) {
          setItems(prev =>
            prev.map(item =>
              item.id === tempId
                ? { ...item, status: 'error' as const, errorMessage: err.message || 'Upload failed' }
                : item
            )
          );
          toast(err.message || 'Failed to upload image.', 'error');
        }
      }
    } else if (mode === 'edit' && propertyId) {
      // In edit mode: upload directly to property
      for (const file of filesToProcess) {
        const error = validateFile(file);
        if (error) {
          toast(error, 'error');
          continue;
        }

        const tempId = `uploading_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        try {
          const dataUrl = await fileToDataUrl(file);
          const isFirstImage = items.length === 0;

          setItems(prev => [
            ...prev,
            {
              id: tempId,
              url: dataUrl,
              isPrimary: isFirstImage,
              displayOrder: prev.length,
              status: 'uploading',
            },
          ]);

          const uploaded = await api.post<PropertyImage>(`/api/properties/${propertyId}/images/upload`, {
            dataUrl,
            mimeType: file.type,
            isPrimary: isFirstImage,
          });

          setItems(prev =>
            prev.map(item =>
              item.id === tempId
                ? {
                    id: uploaded.id,
                    url: uploaded.url,
                    isPrimary: uploaded.isPrimary,
                    displayOrder: uploaded.displayOrder,
                    status: 'success' as const,
                  }
                : item
            )
          );

          toast('Image uploaded successfully.', 'success');
          if (onImagesUpdated) {
            const fullProp = await api.get<any>(`/api/properties/${propertyId}`);
            if (fullProp.images) onImagesUpdated(fullProp.images);
          }
        } catch (err: any) {
          setItems(prev => prev.filter(item => item.id !== tempId));
          toast(err.message || 'Failed to upload image.', 'error');
        }
      }
    }
  };

  // Add via direct URL
  const handleAddManualUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrlInput.trim()) return;

    if (items.length >= maxImages) {
      toast(`Maximum ${maxImages} images allowed.`, 'error');
      return;
    }

    const trimmed = manualUrlInput.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toast('Please enter a valid HTTP/HTTPS image URL.', 'error');
      return;
    }

    if (mode === 'create') {
      const isFirst = items.length === 0;
      const newItem: ManagedMediaItem = {
        id: `url_${Date.now()}`,
        url: trimmed,
        isPrimary: isFirst,
        displayOrder: items.length,
        status: 'success',
      };
      const next = [...items, newItem];
      setItems(next);
      notifyParent(next);
      setManualUrlInput('');
      setShowUrlInput(false);
      toast('Image URL added.', 'success');
    } else if (mode === 'edit' && propertyId) {
      try {
        const isFirst = items.length === 0;
        const uploaded = await api.post<PropertyImage>(`/api/properties/${propertyId}/images`, {
          imageUrl: trimmed,
          isPrimary: isFirst,
        });

        const next = [
          ...items,
          {
            id: uploaded.id,
            url: uploaded.url,
            isPrimary: uploaded.isPrimary,
            displayOrder: uploaded.displayOrder,
            status: 'success' as const,
          },
        ];
        setItems(next);
        setManualUrlInput('');
        setShowUrlInput(false);
        toast('Image added successfully.', 'success');

        if (onImagesUpdated) {
          const fullProp = await api.get<any>(`/api/properties/${propertyId}`);
          if (fullProp.images) onImagesUpdated(fullProp.images);
        }
      } catch (err: any) {
        toast(err.message || 'Failed to add image URL.', 'error');
      }
    }
  };

  // Primary image selection
  const handleSetPrimary = async (itemId: string) => {
    const updated = items.map(item => ({
      ...item,
      isPrimary: item.id === itemId,
    }));
    setItems(updated);
    notifyParent(updated);

    if (mode === 'edit' && propertyId) {
      try {
        await api.put(`/api/properties/${propertyId}/images/${itemId}/primary`);
        toast('Primary cover image updated.', 'success');
        if (onImagesUpdated) {
          const fullProp = await api.get<any>(`/api/properties/${propertyId}`);
          if (fullProp.images) onImagesUpdated(fullProp.images);
        }
      } catch (err: any) {
        toast(err.message || 'Failed to update primary image.', 'error');
      }
    }
  };

  // Trigger replacement file dialog
  const handleOpenReplace = (itemId: string) => {
    setReplacingItemId(itemId);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  // Execute image replacement
  const handleFileReplaced = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingItemId) return;

    const error = validateFile(file);
    if (error) {
      toast(error, 'error');
      setReplacingItemId(null);
      return;
    }

    const currentItem = items.find(i => i.id === replacingItemId);
    if (!currentItem) return;

    try {
      const dataUrl = await fileToDataUrl(file);

      if (mode === 'create') {
        // Upload temp file and replace in state
        const res = await api.post<{ url: string }>('/api/properties/media/upload-temp', {
          dataUrl,
          mimeType: file.type,
        });

        const next = items.map(item =>
          item.id === replacingItemId
            ? { ...item, url: res.url, status: 'success' as const }
            : item
        );
        setItems(next);
        notifyParent(next);
        toast('Image replaced successfully.', 'success');
      } else if (mode === 'edit' && propertyId) {
        // Call backend replace endpoint
        const replaced = await api.put<PropertyImage>(
          `/api/properties/${propertyId}/images/${replacingItemId}/replace`,
          {
            dataUrl,
            mimeType: file.type,
          }
        );

        const next = items.map(item =>
          item.id === replacingItemId
            ? {
                ...item,
                url: replaced.url,
                isPrimary: replaced.isPrimary,
                displayOrder: replaced.displayOrder,
              }
            : item
        );
        setItems(next);
        toast('Image replaced successfully.', 'success');

        if (onImagesUpdated) {
          const fullProp = await api.get<any>(`/api/properties/${propertyId}`);
          if (fullProp.images) onImagesUpdated(fullProp.images);
        }
      }
    } catch (err: any) {
      toast(err.message || 'Failed to replace image.', 'error');
    } finally {
      setReplacingItemId(null);
    }
  };

  // Image deletion
  const confirmDeleteImage = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);

    const targetId = deleteConfirmItem.id;
    const wasPrimary = deleteConfirmItem.isPrimary;

    try {
      if (mode === 'create') {
        const remaining = items.filter(i => i.id !== targetId);
        // If deleted was primary and items remain, designate first remaining as primary
        if (wasPrimary && remaining.length > 0) {
          remaining[0].isPrimary = true;
        }
        // Re-index display orders
        const reindexed = remaining.map((item, idx) => ({
          ...item,
          displayOrder: idx,
        }));
        setItems(reindexed);
        notifyParent(reindexed);
        toast('Image removed.', 'success');
      } else if (mode === 'edit' && propertyId) {
        await api.delete(`/api/properties/${propertyId}/images/${targetId}`);
        const fullProp = await api.get<any>(`/api/properties/${propertyId}`);
        if (fullProp.images) {
          const mapped: ManagedMediaItem[] = fullProp.images.map((img: PropertyImage, idx: number) => ({
            id: img.id,
            url: img.url,
            isPrimary: img.isPrimary,
            displayOrder: img.displayOrder !== undefined ? img.displayOrder : idx,
            status: 'idle',
          }));
          setItems(mapped);
          if (onImagesUpdated) onImagesUpdated(fullProp.images);
        } else {
          setItems([]);
        }
        toast('Image deleted from listing.', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to delete image.', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmItem(null);
    }
  };

  // Drag and drop reordering
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOverCard = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDropCard = async (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const reordered = [...items];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Re-index
    const normalized = reordered.map((item, idx) => ({
      ...item,
      displayOrder: idx,
    }));

    setItems(normalized);
    notifyParent(normalized);
    setDraggedIndex(null);

    // Persist reorder to database if in edit mode
    if (mode === 'edit' && propertyId) {
      try {
        const imageIds = normalized.map(i => i.id);
        await api.put(`/api/properties/${propertyId}/images/reorder`, { imageIds });
        toast('Display order saved.', 'success');
        if (onImagesUpdated) {
          const fullProp = await api.get<any>(`/api/properties/${propertyId}`);
          if (fullProp.images) onImagesUpdated(fullProp.images);
        }
      } catch (err: any) {
        toast(err.message || 'Failed to save new order.', 'error');
      }
    }
  };

  // Accessible move left / move right buttons
  const handleMove = async (fromIdx: number, direction: 'left' | 'right') => {
    const toIdx = direction === 'left' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const normalized = reordered.map((item, idx) => ({
      ...item,
      displayOrder: idx,
    }));

    setItems(normalized);
    notifyParent(normalized);

    if (mode === 'edit' && propertyId) {
      try {
        const imageIds = normalized.map(i => i.id);
        await api.put(`/api/properties/${propertyId}/images/reorder`, { imageIds });
        if (onImagesUpdated) {
          const fullProp = await api.get<any>(`/api/properties/${propertyId}`);
          if (fullProp.images) onImagesUpdated(fullProp.images);
        }
      } catch (err: any) {
        toast(err.message || 'Failed to persist order.', 'error');
      }
    }
  };

  const isFull = items.length >= maxImages;
  const remainingSlots = Math.max(0, maxImages - items.length);

  return (
    <div className="space-y-4">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={e => e.target.files && handleFilesSelected(e.target.files)}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileReplaced}
        className="hidden"
      />

      {/* Media Manager Header / Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Property Images
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {items.length} / {maxImages}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Remaining slots:{' '}
            <strong className={remainingSlots === 0 ? 'text-amber-600 font-bold' : 'text-slate-900'}>
              {remainingSlots} / {maxImages}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
          >
            {showUrlInput ? 'Hide URL field' : '+ Add via URL'}
          </button>
        </div>
      </div>

      {/* Manual URL Form (Collapsible) */}
      {showUrlInput && (
        <form onSubmit={handleAddManualUrl} className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <input
            type="url"
            placeholder="Paste public image link (https://...)"
            value={manualUrlInput}
            onChange={e => setManualUrlInput(e.target.value)}
            disabled={isFull}
            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 text-slate-900"
          />
          <button
            type="submit"
            disabled={isFull || !manualUrlInput.trim()}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
          >
            Add URL
          </button>
        </form>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          if (!isFull) setIsDragging(true);
        }}
        onDragLeave={e => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          if (!isFull && e.dataTransfer.files) {
            handleFilesSelected(e.dataTransfer.files);
          }
        }}
        onClick={() => {
          if (!isFull && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && !isFull && fileInputRef.current) {
            e.preventDefault();
            fileInputRef.current.click();
          }
        }}
        tabIndex={isFull ? -1 : 0}
        role="button"
        aria-label="Upload property images"
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 text-center cursor-pointer select-none ${
          isFull
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-75'
            : isDragging
            ? 'border-indigo-600 bg-indigo-50/70 scale-[1.005] shadow-inner'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div
            className={`p-3 rounded-2xl transition-colors ${
              isDragging ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 shadow-xs'
            }`}
          >
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {isFull ? (
                <span className="text-amber-700 font-bold">Maximum 15 images allowed.</span>
              ) : isDragging ? (
                <span className="text-indigo-600 font-bold">Drop to upload images now</span>
              ) : (
                <>
                  Drag & Drop images here or{' '}
                  <span className="text-indigo-600 underline pointer-events-auto">Browse Files</span>
                </>
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Maximum 15 images • Supported: JPG, JPEG, PNG, WebP • Max 5MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Image Gallery Grid */}
      {items.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
          No images added yet. Upload high-resolution photos to showcase this property.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
            <span>
              Drag cards to reorder or use arrow controls. Image #1 will default as primary if not set.
            </span>
            <span>{items.length} photo{items.length > 1 ? 's' : ''} uploaded</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((item, index) => {
              const isCardDragging = draggedIndex === index;
              const isCardDragOver = dragOverIndex === index;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => handleDragStart(e, index)}
                  onDragOver={e => handleDragOverCard(e, index)}
                  onDrop={e => handleDropCard(e, index)}
                  className={`group relative rounded-xl overflow-hidden border bg-white shadow-xs transition-all duration-200 flex flex-col ${
                    item.isPrimary
                      ? 'border-amber-400 ring-2 ring-amber-300/60'
                      : 'border-slate-200 hover:border-slate-300'
                  } ${isCardDragging ? 'opacity-40 scale-95' : ''} ${
                    isCardDragOver ? 'border-indigo-600 ring-2 ring-indigo-400/50 scale-[1.02]' : ''
                  }`}
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={item.url}
                      alt={`Property image ${index + 1}`}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />

                    {/* Order Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                      <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs">
                        #{index + 1}
                      </span>
                      {item.isPrimary && (
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-slate-950" />
                          Primary
                        </span>
                      )}
                    </div>

                    {/* Drag Handle Overlay */}
                    <div className="absolute top-2 right-2 p-1 bg-slate-900/60 text-white rounded cursor-grab active:cursor-grabbing opacity-70 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {/* Uploading Spinner */}
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-1 text-white z-20">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                        <span className="text-[10px] font-medium">Uploading...</span>
                      </div>
                    )}

                    {/* Error Indicator */}
                    {item.status === 'error' && (
                      <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center p-2 text-white z-20">
                        <AlertCircle className="w-5 h-5 text-rose-300 mb-1" />
                        <span className="text-[10px] text-center font-medium leading-tight">
                          {item.errorMessage || 'Upload failed'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Controls Toolbar */}
                  <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                    {/* Primary Button */}
                    {item.isPrimary ? (
                      <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        ★ Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(item.id)}
                        className="px-2 py-1 text-[10px] font-semibold text-slate-700 hover:text-amber-800 bg-white hover:bg-amber-50 border border-slate-200 rounded transition-colors flex items-center gap-1"
                        title="Set as primary cover photo"
                      >
                        <Star className="w-3 h-3" />
                        ★ Set Primary
                      </button>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Move Left */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'left')}
                        className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-20 hover:bg-slate-200 rounded"
                        title="Move left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>

                      {/* Move Right */}
                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={() => handleMove(index, 'right')}
                        className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-20 hover:bg-slate-200 rounded"
                        title="Move right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {/* Replace */}
                      <button
                        type="button"
                        onClick={() => handleOpenReplace(item.id)}
                        className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Replace image with new file"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(item)}
                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Image Deletion */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remove property image?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {deleteConfirmItem.isPrimary
                    ? 'This is currently the primary photo. Another image will automatically become primary.'
                    : 'This image will be permanently removed from the property gallery.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden aspect-[16/9] border border-slate-200 bg-slate-100">
              <img
                src={deleteConfirmItem.url}
                alt="Image to remove"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteImage}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove Image</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
