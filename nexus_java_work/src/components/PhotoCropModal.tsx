import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, Check, Loader2 } from 'lucide-react';

interface PhotoCropModalProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => Promise<void>;
}

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  imageSrc,
  isOpen,
  onClose,
  onSave,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image when imageSrc changes
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    setError(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.onerror = () => {
      setError('Unable to load selected image.');
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Redraw when zoom or offset changes
  useEffect(() => {
    if (imageRef.current) {
      drawCanvas();
    }
  }, [zoom, offset]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 320; // Canvas display size
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Calculate aspect ratio fit
    const aspect = img.width / img.height;
    let baseWidth = size;
    let baseHeight = size;

    if (aspect > 1) {
      baseWidth = size * aspect;
    } else {
      baseHeight = size / aspect;
    }

    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    // Center image + offset
    const x = (size - drawWidth) / 2 + offset.x;
    const y = (size - drawHeight) / 2 + offset.y;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSaveCrop = async () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    setSaving(true);
    setError(null);

    try {
      // Create high-res export canvas (400x400)
      const exportCanvas = document.createElement('canvas');
      const exportSize = 400;
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const exportCtx = exportCanvas.getContext('2d');

      if (!exportCtx) {
        throw new Error('Unable to initialize canvas context.');
      }

      const scale = exportSize / 320;
      const aspect = img.width / img.height;
      let baseWidth = exportSize;
      let baseHeight = exportSize;

      if (aspect > 1) {
        baseWidth = exportSize * aspect;
      } else {
        baseHeight = exportSize / aspect;
      }

      const drawWidth = baseWidth * zoom;
      const drawHeight = baseHeight * zoom;
      const x = (exportSize - drawWidth) / 2 + offset.x * scale;
      const y = (exportSize - drawHeight) / 2 + offset.y * scale;

      exportCtx.drawImage(img, x, y, drawWidth, drawHeight);

      // Export as high quality JPEG data URL
      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
      await onSave(dataUrl);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save cropped image.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Cancel"
          aria-label="Close Crop Window"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h3 className="font-serif text-lg font-bold text-slate-900">Crop Profile Photo</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Drag to reposition and use the slider to zoom for a perfect avatar framing.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Cropping Canvas Preview Container */}
        <div className="relative mx-auto w-[320px] h-[320px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-200">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="cursor-grab active:cursor-grabbing w-[320px] h-[320px]"
          />

          {/* Circular Crop Overlay Mask */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-[280px] h-[280px] rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)]"></div>
          </div>

          <div className="pointer-events-none absolute bottom-2 left-2 text-[10px] text-white/70 bg-slate-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Move className="w-3 h-3" />
            <span>Drag to reposition</span>
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
            <span className="flex items-center gap-1 text-slate-500">
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Zoom</span>
            </span>
            <span className="font-mono text-slate-900">{Math.round(zoom * 100)}%</span>
            <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
          />
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={saving}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Photo...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
