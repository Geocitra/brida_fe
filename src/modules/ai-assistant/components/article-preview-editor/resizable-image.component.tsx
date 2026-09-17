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
  BarChart3,
  RefreshCw,
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
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(node.attrs.caption || '');

  const align: ImageAlignment = node.attrs.align || 'center';
  const width: string = node.attrs.width || '100%';
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setCaptionText(node.attrs.caption || '');
  }, [node.attrs.caption]);

  const getWrapperStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: width,
      maxWidth: '100%',
      position: 'relative',
      userSelect: 'none',
      boxSizing: 'border-box',
    };

    switch (align) {
      case 'float-left':
        return {
          ...baseStyle,
          float: 'left',
          margin: '8px 18px 12px 0',
          display: 'inline-block',
          clear: 'none',
        };
      case 'float-right':
        return {
          ...baseStyle,
          float: 'right',
          margin: '8px 0 12px 18px',
          display: 'inline-block',
          clear: 'none',
        };
      case 'left':
        return {
          ...baseStyle,
          display: 'block',
          marginLeft: '0',
          marginRight: 'auto',
          marginTop: '14px',
          marginBottom: '14px',
          clear: 'both',
        };
      case 'right':
        return {
          ...baseStyle,
          display: 'block',
          marginLeft: 'auto',
          marginRight: '0',
          marginTop: '14px',
          marginBottom: '14px',
          clear: 'both',
        };
      case 'center':
      default:
        return {
          ...baseStyle,
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginTop: '14px',
          marginBottom: '14px',
          clear: 'both',
        };
    }
  };

  const handleSetAlign = useCallback((newAlign: ImageAlignment) => {
    updateAttributes({ align: newAlign });
  }, [updateAttributes]);

  const handleSetPresetWidth = useCallback((presetPct: string) => {
    updateAttributes({ width: presetPct });
  }, [updateAttributes]);

  const handleSaveCaption = () => {
    updateAttributes({ caption: captionText.trim() });
    setIsEditingCaption(false);
  };

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={`relative inline-block font-roboto ${selected ? 'ring-2 ring-teal-600 ring-offset-2' : ''}`}
      style={getWrapperStyle()}
    >
      {/* Toolbar Kontrol Gambar Cepat (Hanya tampil saat dipilih) */}
      {selected && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1.5 z-40 bg-slate-900 text-white px-2 py-1 flex items-center gap-1.5 shadow-2xl border border-slate-700 rounded-none no-print select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Alignment Controls */}
          <div className="flex items-center gap-0.5 border-r border-slate-700 pr-1.5">
            <button
              type="button"
              onClick={() => handleSetAlign('left')}
              className={`p-1 cursor-pointer transition-colors ${align === 'left' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Rata Kiri"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('center')}
              className={`p-1 cursor-pointer transition-colors ${align === 'center' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Rata Tengah"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('right')}
              className={`p-1 cursor-pointer transition-colors ${align === 'right' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Rata Kanan"
            >
              <AlignRight size={13} />
            </button>
          </div>

          {/* Text Wrapping Controls */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-1.5">
            <button
              type="button"
              onClick={() => handleSetAlign('float-left')}
              className={`px-1.5 py-0.5 text-[9px] font-bold uppercase cursor-pointer ${align === 'float-left' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Teks di Kanan (Float Kiri)"
            >
              Wrap Kiri
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('float-right')}
              className={`px-1.5 py-0.5 text-[9px] font-bold uppercase cursor-pointer ${align === 'float-right' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Teks di Kiri (Float Kanan)"
            >
              Wrap Kanan
            </button>
          </div>

          {/* Preset Ukuran Aman A4 */}
          <div className="flex items-center gap-0.5 border-r border-slate-700 pr-1.5">
            {['25%', '50%', '75%', '100%'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetPresetWidth(preset)}
                className={`px-1.5 py-0.5 text-[9px] font-bold cursor-pointer transition-colors ${width === preset ? 'bg-teal-700 text-white font-black' : 'hover:bg-slate-800 text-slate-300'}`}
                title={`Atur lebar ${preset}`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Keterangan & Hapus */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsEditingCaption((prev) => !prev)}
              className="p-1 text-slate-300 hover:bg-slate-800 cursor-pointer"
              title="Tambah/Edit Keterangan"
            >
              <Subtitles size={13} />
            </button>
            <button
              type="button"
              onClick={() => deleteNode()}
              className="p-1 text-red-400 hover:bg-red-950 cursor-pointer"
              title="Hapus Gambar"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {hasError ? (
        <div className="w-full py-6 px-4 bg-slate-50 border border-slate-300 flex flex-col items-center justify-center text-center space-y-2 select-none">
          <BarChart3 className="text-slate-400" size={32} />
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">{node.attrs.alt || 'Visualisasi Grafik'}</div>
          <div className="text-[11px] text-slate-500 max-w-sm">Grafik visualisasi data belum dapat dimuat dari server penyedia.</div>
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              setRetryKey((k) => k + 1);
            }}
            className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 bg-teal-700 text-white text-[10px] font-bold uppercase rounded-none hover:bg-teal-800 cursor-pointer no-print"
          >
            <RefreshCw size={11} />
            <span>Muat Ulang Grafik</span>
          </button>
        </div>
      ) : (
        <img
          key={retryKey}
          ref={imageRef}
          src={getDisplaySrc(node.attrs.src)}
          alt={node.attrs.alt || ''}
          onLoad={() => {
            window.dispatchEvent(new CustomEvent('tiptap-media-loaded'));
          }}
          onError={() => {
            setHasError(true);
          }}
          className="block w-full h-auto object-contain transition-all duration-75"
          style={{
            width: '100%',
            minHeight: '180px',
            maxHeight: '750px',
            boxSizing: 'border-box',
          }}
        />
      )}

      {isEditingCaption ? (
        <div className="mt-1 flex items-center gap-1.5 no-print" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCaption();
              if (e.key === 'Escape') setIsEditingCaption(false);
            }}
            placeholder="Ketik keterangan gambar..."
            className="flex-1 text-[10px] px-2 py-1 bg-white border border-teal-600 outline-none text-slate-800"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSaveCaption}
            className="p-1 bg-teal-700 text-white hover:bg-teal-800 cursor-pointer"
          >
            <Check size={12} />
          </button>
        </div>
      ) : (
        node.attrs.caption && (
          <figcaption
            onClick={() => setIsEditingCaption(true)}
            className="text-center text-[10px] text-slate-500 italic mt-1 cursor-pointer hover:text-teal-700"
          >
            {node.attrs.caption}
          </figcaption>
        )
      )}
    </NodeViewWrapper>
  );
};
