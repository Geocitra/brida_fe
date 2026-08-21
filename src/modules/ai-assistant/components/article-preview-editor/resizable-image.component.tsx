import React, { useRef, useState, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Subtitles,
  Check,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const getDisplaySrc = (src?: string): string => {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = src.startsWith('/') ? src : `/${src}`;
  return `${cleanBase}${cleanPath}`;
};

export type ImageAlignment = 'left' | 'center' | 'right' | 'float-left' | 'float-right';

export const ResizableImageComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  deleteNode,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDimensions, setResizeDimensions] = useState<{ widthPx: number; heightPx: number; widthPct: string } | null>(null);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(node.attrs.caption || '');

  const align: ImageAlignment = node.attrs.align || 'center';
  const width: string = node.attrs.width || '100%';

  useEffect(() => {
    setCaptionText(node.attrs.caption || '');
  }, [node.attrs.caption]);

  // Hitung wrapper style berdasarkan mode perataan (Block vs Float/Wrap)
  const getWrapperStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: width,
      maxWidth: '100%',
      position: 'relative',
      userSelect: 'none',
      contain: 'layout paint style',
      isolation: 'isolate',
      boxSizing: 'border-box',
    };

    switch (align) {
      case 'float-left':
        return {
          ...baseStyle,
          float: 'left',
          margin: '8px 24px 12px 0',
          display: 'inline-block',
          clear: 'none',
        };
      case 'float-right':
        return {
          ...baseStyle,
          float: 'right',
          margin: '8px 0 12px 24px',
          display: 'inline-block',
          clear: 'none',
        };
      case 'left':
        return {
          ...baseStyle,
          display: 'block',
          marginLeft: '0',
          marginRight: 'auto',
          marginTop: '16px',
          marginBottom: '16px',
          clear: 'both',
        };
      case 'right':
        return {
          ...baseStyle,
          display: 'block',
          marginLeft: 'auto',
          marginRight: '0',
          marginTop: '16px',
          marginBottom: '16px',
          clear: 'both',
        };
      case 'center':
      default:
        return {
          ...baseStyle,
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginTop: '16px',
          marginBottom: '16px',
          clear: 'both',
        };
    }
  };

  // Handler Resizing Multi-Corner (Seamless Scaler)
  const handleResizeStart = (
    event: React.MouseEvent,
    direction: 'se' | 'sw' | 'ne' | 'nw'
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizing(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const imgEl = imageRef.current;
    if (!imgEl) return;

    const startWidth = imgEl.getBoundingClientRect().width;
    const startHeight = imgEl.getBoundingClientRect().height;
    const aspectRatio = startHeight / (startWidth || 1);

    // Dapatkan lebar induk kanvas A4 dari ProseMirror element (lebar sebenarnya tanpa zoom CSS)
    const proseMirrorEl = imgEl.closest('.ProseMirror') as HTMLElement | null;
    const parentWidth = proseMirrorEl?.getBoundingClientRect().width
      || imgEl.parentElement?.getBoundingClientRect().width
      || 700;

    let finalPct = width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newWidth = startWidth;

      // Orientasi arah drag corner handle
      if (direction === 'se' || direction === 'ne') {
        newWidth = startWidth + deltaX;
      } else {
        newWidth = startWidth - deltaX;
      }

      // Batasan skala: fleksibel dari 10% (min 50px) hingga 100% lebar kertas
      const clampedWidth = Math.max(50, Math.min(newWidth, parentWidth));
      const calculatedPct = `${Math.round((clampedWidth / parentWidth) * 100)}%`;
      finalPct = calculatedPct;

      setResizeDimensions({
        widthPx: Math.round(clampedWidth),
        heightPx: Math.round(clampedWidth * aspectRatio),
        widthPct: calculatedPct,
      });

      if (containerRef.current) {
        containerRef.current.style.width = calculatedPct;
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      setResizeDimensions(null);
      updateAttributes({ width: finalPct });
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Handler Perataan
  const handleSetAlign = useCallback((newAlign: ImageAlignment) => {
    updateAttributes({ align: newAlign });
  }, [updateAttributes]);

  // Handler Preset Ukuran Cepat
  const handleSetPresetWidth = useCallback((presetPct: string) => {
    updateAttributes({ width: presetPct });
  }, [updateAttributes]);

  // Handler Simpan Caption
  const handleSaveCaption = () => {
    updateAttributes({ caption: captionText.trim() });
    setIsEditingCaption(false);
  };

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={`relative inline-block group font-roboto ${selected ? 'outline-2 outline-teal-600 outline-offset-2' : ''}`}
      style={getWrapperStyle()}
    >
      {/* FLOATING ACTION TOOLBAR (Google Docs / MS Word Style) */}
      {selected && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1 z-40 bg-slate-900/95 backdrop-blur-xs text-white px-2 py-1 flex items-center gap-1.5 shadow-2xl border border-slate-700 rounded-none no-print select-none animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Alignment Buttons */}
          <div className="flex items-center gap-0.5 border-r border-slate-700 pr-1.5">
            <button
              type="button"
              onClick={() => handleSetAlign('left')}
              className={`p-1 transition-colors rounded-none cursor-pointer ${align === 'left' ? 'bg-teal-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Rata Kiri (Block)"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('center')}
              className={`p-1 transition-colors rounded-none cursor-pointer ${align === 'center' ? 'bg-teal-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Rata Tengah (Block)"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('right')}
              className={`p-1 transition-colors rounded-none cursor-pointer ${align === 'right' ? 'bg-teal-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Rata Kanan (Block)"
            >
              <AlignRight size={13} />
            </button>
          </div>

          {/* Text Wrap / Float Buttons */}
          <div className="flex items-center gap-0.5 border-r border-slate-700 pr-1.5">
            <button
              type="button"
              onClick={() => handleSetAlign('float-left')}
              className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none cursor-pointer transition-colors ${align === 'float-left' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Bungkus Teks di Kanan (Float Kiri)"
            >
              Wrap Kiri
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('float-right')}
              className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none cursor-pointer transition-colors ${align === 'float-right' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Bungkus Teks di Kiri (Float Kanan)"
            >
              Wrap Kanan
            </button>
          </div>

          {/* Quick Size Presets */}
          <div className="flex items-center gap-0.5 border-r border-slate-700 pr-1.5">
            {['25%', '50%', '75%', '100%'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetPresetWidth(preset)}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded-none cursor-pointer transition-colors ${width === preset ? 'bg-teal-700 text-white font-black' : 'text-slate-300 hover:bg-slate-800'}`}
                title={`Ubah ukuran ke ${preset}`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Caption & Delete Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsEditingCaption((prev) => !prev)}
              className={`p-1 transition-colors rounded-none cursor-pointer ${node.attrs.caption || isEditingCaption ? 'text-teal-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
              title="Tambah / Ubah Keterangan Gambar"
            >
              <Subtitles size={13} />
            </button>
            <button
              type="button"
              onClick={() => deleteNode()}
              className="p-1 text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors rounded-none cursor-pointer"
              title="Hapus Gambar"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* LIVE RESIZE DIMENSION BADGE */}
      {isResizing && resizeDimensions && (
        <div className="absolute top-2 left-2 z-50 bg-slate-950/90 text-teal-400 px-2 py-1 text-[10px] font-mono font-bold tracking-wider border border-teal-500/50 shadow-lg select-none no-print rounded-none">
          {resizeDimensions.widthPx} × {resizeDimensions.heightPx} px ({resizeDimensions.widthPct})
        </div>
      )}

      {/* IMAGE ELEMENT */}
      <img
        ref={imageRef}
        src={getDisplaySrc(node.attrs.src)}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        className="block w-full h-auto select-none transition-all duration-75 object-contain"
        style={{
          width: '100%',
          maxHeight: '850px',
          display: 'block',
          boxSizing: 'border-box',
        }}
        onError={(e) => {
          console.error('[ResizableImage] Gagal memuat gambar dari URL:', node.attrs.src, e);
        }}
      />

      {/* 4 CORNER RESIZE HANDLES (Sharp Edges rounded-none) */}
      {selected && (
        <>
          {/* Top-Left */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-teal-700 border border-white shadow-md cursor-nwse-resize z-30 rounded-none no-print hover:scale-125 transition-transform"
            title="Tarik untuk ubah ukuran"
          />
          {/* Top-Right */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-teal-700 border border-white shadow-md cursor-nesw-resize z-30 rounded-none no-print hover:scale-125 transition-transform"
            title="Tarik untuk ubah ukuran"
          />
          {/* Bottom-Left */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-teal-700 border border-white shadow-md cursor-nesw-resize z-30 rounded-none no-print hover:scale-125 transition-transform"
            title="Tarik untuk ubah ukuran"
          />
          {/* Bottom-Right */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3 h-3 bg-teal-700 border border-white shadow-md cursor-nwse-resize z-30 rounded-none no-print hover:scale-125 transition-transform"
            title="Tarik untuk ubah ukuran"
          />
        </>
      )}

      {/* CAPTION FORM OR DISPLAY */}
      {isEditingCaption ? (
        <div className="mt-1.5 flex items-center gap-1.5 no-print select-none" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCaption();
              if (e.key === 'Escape') setIsEditingCaption(false);
            }}
            placeholder="Tulis keterangan gambar (e.g. Gambar 1.1)..."
            className="flex-1 text-[10px] px-2 py-1 bg-white border border-teal-600 focus:outline-none rounded-none text-slate-800 font-medium"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSaveCaption}
            className="p-1 bg-teal-700 text-white rounded-none hover:bg-teal-800 cursor-pointer"
            title="Simpan Keterangan"
          >
            <Check size={12} />
          </button>
        </div>
      ) : (
        node.attrs.caption && (
          <figcaption
            onClick={() => setIsEditingCaption(true)}
            className="text-center text-[10px] text-slate-500 font-medium italic mt-1.5 cursor-pointer hover:text-teal-700 transition-colors"
            title="Klik untuk mengedit keterangan"
          >
            {node.attrs.caption}
          </figcaption>
        )
      )}
    </NodeViewWrapper>
  );
};
