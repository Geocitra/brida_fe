import React, { useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
    Loader2,
    Download,
    ArrowLeft,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Undo,
    Redo,
    LayoutGrid,
    Image as ImageIcon,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import type { FontFamilyKey } from '../../store/useEditorStore';

const ZOOM_PRESETS = [0.5, 0.75, 0.9, 1.0, 1.25, 1.5, 2.0];
const ZOOM_LABELS: Record<number, string> = {
    0.5: '50%', 0.75: '75%', 0.9: '90%', 1.0: '100%',
    1.25: '125%', 1.5: '150%', 2.0: '200%',
};

interface ArticlePreviewEditorHeaderProps {
    editor: Editor | null;
    isSaving: boolean;
    isPrinting: boolean;
    isDirty: boolean;
    articleTitle: string;
    activeSessionTitle: string;
    fontFamily: FontFamilyKey;
    fontSize: string;
    lineSpacing: number;
    fontSizePresets: number[];
    zoomLevel: number;
    onSaveAndBack: () => void;
    onPrint: () => void;
    onFontFamilyChange: (value: FontFamilyKey) => void;
    onLineSpacingChange: (value: number) => void;
    onApplyFontSize: (size: string) => void;
    onFontSizeStep: (direction: 'up' | 'down') => void;
    onSetTextAlign: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
    onToggleBulletList: () => void;
    onToggleOrderedList: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onInsertPageBreak: () => void;
    onInsertImage: (file: File) => void;
    onZoomChange: (level: number) => void;
}

export const ArticlePreviewEditorHeader: React.FC<ArticlePreviewEditorHeaderProps> = ({
    editor,
    isSaving,
    isPrinting,
    isDirty,
    articleTitle,
    activeSessionTitle,
    fontFamily,
    fontSize,
    lineSpacing,
    fontSizePresets,
    zoomLevel,
    onSaveAndBack,
    onPrint,
    onFontFamilyChange,
    onLineSpacingChange,
    onApplyFontSize,
    onFontSizeStep,
    onSetTextAlign,
    onToggleBulletList,
    onToggleOrderedList,
    onUndo,
    onRedo,
    onInsertPageBreak,
    onInsertImage,
    onZoomChange,
}) => {
    const zoomOut = () => {
        const idx = ZOOM_PRESETS.indexOf(zoomLevel);
        if (idx > 0) onZoomChange(ZOOM_PRESETS[idx - 1]);
    };
    const zoomIn = () => {
        const idx = ZOOM_PRESETS.indexOf(zoomLevel);
        if (idx < ZOOM_PRESETS.length - 1) onZoomChange(ZOOM_PRESETS[idx + 1]);
    };
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentFontSize = parseInt(fontSize, 10);
    const isFontSizePreset = fontSizePresets.includes(currentFontSize);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onInsertImage(file);
            e.target.value = '';
        }
    };

    return (
        <div className="bg-white border-b border-slate-350 flex flex-col shrink-0 no-print z-20 shadow-xs">
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-left">
                    <button
                        onClick={onSaveAndBack}
                        disabled={isSaving || isPrinting}
                        className="px-3 py-1.5 bg-transparent hover:bg-transparent text-slate-700 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer font-bold text-xs uppercase border-none shadow-none rounded-none"
                    >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeft size={12} />}
                        <span>{isDirty ? 'Simpan & Kembali' : 'Kembali'}</span>
                    </button>
                    <div className="h-4 w-px bg-slate-300" />
                    <div>
                        <h1 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                            <span>Sunting Naskah &amp; Tata Letak A4</span>
                            {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Terdapat perubahan belum tersimpan" />}
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 max-w-lg truncate">
                            Sesi Cetak: <span className="text-teal-700 font-black">{articleTitle || activeSessionTitle}</span>
                        </p>
                    </div>
                </div>

            </div>

            <div className="px-6 py-2 bg-slate-50 flex flex-wrap items-center justify-between gap-4 select-none">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Font:</span>
                        <select
                            value={fontFamily}
                            onChange={(e) => onFontFamilyChange(e.target.value as FontFamilyKey)}
                            disabled={isSaving || isPrinting}
                            className="bg-white border border-slate-300 text-[10px] font-bold px-2 py-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer"
                        >
                            <option value="Calibri">Calibri</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Arial">Arial</option>
                        </select>
                    </div>

                    <div className="h-4 w-px bg-slate-300" />

                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Spasi:</span>
                        <select
                            value={lineSpacing}
                            onChange={(e) => onLineSpacingChange(parseFloat(e.target.value))}
                            disabled={isSaving || isPrinting}
                            className="bg-white border border-slate-300 text-[10px] font-bold px-2 py-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer"
                        >
                            <option value="1.18">1.18 (Nota Dinas)</option>
                            <option value="1.5">1.50 (Laporan)</option>
                        </select>
                    </div>
                </div>

                <div className="hidden md:block h-5 w-px bg-slate-300" />

                <div className="flex flex-wrap items-center gap-1">
                    <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive('bold') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Tebal (Ctrl+B)"
                    >
                        <Bold size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive('italic') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Miring (Ctrl+I)"
                    >
                        <Italic size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive('underline') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Garis Bawah (Ctrl+U)"
                    >
                        <UnderlineIcon size={13} />
                    </button>

                    <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={() => onFontSizeStep('down')}
                            disabled={isSaving || isPrinting || currentFontSize <= fontSizePresets[0]}
                            className="flex items-center justify-center w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Perkecil Huruf"
                        >
                            <span className="text-[10px] font-black text-slate-600 select-none leading-none">A<sub style={{ fontSize: '7px', verticalAlign: 'sub' }}>▼</sub></span>
                        </button>
                        <select
                            value={isFontSizePreset ? fontSize : ''}
                            onChange={(e) => onApplyFontSize(e.target.value)}
                            disabled={isSaving || isPrinting}
                            className="h-6 bg-white border-t border-b border-slate-300 text-[10px] font-bold px-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer w-12 text-center"
                        >
                            {!isFontSizePreset && <option value="" disabled>{fontSize}pt</option>}
                            {fontSizePresets.map((size) => (
                                <option key={size} value={String(size)}>{size}pt</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => onFontSizeStep('up')}
                            disabled={isSaving || isPrinting || currentFontSize >= fontSizePresets[fontSizePresets.length - 1]}
                            className="flex items-center justify-center w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Perbesar Huruf"
                        >
                            <span className="text-[11px] font-black text-slate-700 select-none leading-none">A<sup style={{ fontSize: '7px', verticalAlign: 'super' }}>▲</sup></span>
                        </button>
                    </div>

                    <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                    <button
                        type="button"
                        onClick={() => onSetTextAlign('left')}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'left' }) ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Rata Kiri"
                    >
                        <AlignLeft size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onSetTextAlign('center')}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'center' }) ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Rata Tengah"
                    >
                        <AlignCenter size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onSetTextAlign('right')}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'right' }) ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Rata Kanan"
                    >
                        <AlignRight size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onSetTextAlign('justify')}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Rata Kiri Kanan"
                    >
                        <AlignJustify size={13} />
                    </button>

                    <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                    <button
                        type="button"
                        onClick={onToggleBulletList}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive('bulletList') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Daftar Berbutir"
                    >
                        <List size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={onToggleOrderedList}
                        className={`p-1 transition-colors cursor-pointer ${editor?.isActive('orderedList') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
                        title="Daftar Berangka"
                    >
                        <ListOrdered size={13} />
                    </button>

                    <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                    <button
                        type="button"
                        onClick={onUndo}
                        disabled={!editor?.can().undo()}
                        className="p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Undo"
                    >
                        <Undo size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={onRedo}
                        disabled={!editor?.can().redo()}
                        className="p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Redo"
                    >
                        <Redo size={13} />
                    </button>

                    <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                    <button
                        type="button"
                        onClick={onInsertPageBreak}
                        className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1 rounded-none border border-transparent hover:border-slate-300"
                        title="Sisipkan Potongan Batas Halaman (Ctrl+Enter)"
                    >
                        <LayoutGrid size={12} className="text-teal-700" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Potong Halaman</span>
                    </button>

                    <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                    {/* ===== ZOOM CONTROLS ===== */}
                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={zoomOut}
                            disabled={zoomLevel <= ZOOM_PRESETS[0]}
                            className="flex items-center justify-center w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Perkecil tampilan (Zoom Out)"
                        >
                            <ZoomOut size={11} className="text-slate-600" />
                        </button>
                        <select
                            value={zoomLevel}
                            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                            className="h-6 bg-white border-t border-b border-slate-300 text-[10px] font-bold px-1 focus:outline-none focus:border-teal-600 w-14 text-center cursor-pointer"
                        >
                            {ZOOM_PRESETS.map((z) => (
                                <option key={z} value={z}>{ZOOM_LABELS[z]}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={zoomIn}
                            disabled={zoomLevel >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1]}
                            className="flex items-center justify-center w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Perbesar tampilan (Zoom In)"
                        >
                            <ZoomIn size={11} className="text-slate-600" />
                        </button>
                    </div>

                    <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSaving || isPrinting}
                        className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1 rounded-none border border-transparent hover:border-slate-300 disabled:opacity-50"
                        title="Sisipkan Berkas Gambar dari Komputer"
                    >
                        <ImageIcon size={12} className="text-teal-700" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Sisipkan Gambar</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            </div>
        </div>
    );
};
