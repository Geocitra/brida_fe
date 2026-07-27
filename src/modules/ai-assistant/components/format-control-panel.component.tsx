import React from 'react';
import { Loader2, Save, Download, Type, AlignLeft, LayoutGrid } from 'lucide-react';

/**
 * Kontrak Properti Input Modular Format Control Panel
 */
export interface FormatControlPanelProps {
    fontFamily: 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';
    setFontFamily: (f: 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial') => void;
    lineSpacing: number;
    setLineSpacing: (s: number) => void;
    marginCm: number;
    setMarginCm: (m: number) => void;
    onSave: () => void;
    onPrint: () => void;
    isSaving: boolean;
    isPrinting: boolean;
    disabled: boolean;
}

/**
 * Komponen Modular Kontrol Pemformatan Kertas (FormatControlPanel) [1].
 * Membungkus menu konfigurasi layout dan tombol aksi transaksional ke database [1].
 */
export const FormatControlPanel: React.FC<FormatControlPanelProps> = ({
    fontFamily,
    setFontFamily,
    lineSpacing,
    setLineSpacing,
    marginCm,
    setMarginCm,
    onSave,
    onPrint,
    isSaving,
    isPrinting,
    disabled,
}) => {
    return (
        <div className="bg-slate-50 border border-slate-300 p-4 space-y-4 rounded-none shadow-2xs font-roboto no-print">
            <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-200 pb-2 flex items-center gap-1.5">
                <LayoutGrid size={14} className="text-teal-700" />
                <span>Kontrol Format Kertas</span>
            </h3>

            {/* 1. Pengaturan Jenis Huruf (Font Family) */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Type size={12} className="text-slate-400" />
                    <span>Jenis Huruf (Font)</span>
                </label>
                <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as any)}
                    disabled={disabled || isSaving || isPrinting}
                    className="w-full bg-white border border-slate-400 text-xs font-bold px-2.5 py-2 rounded-none focus:outline-none focus:border-teal-600 shadow-xs cursor-pointer disabled:opacity-50"
                >
                    <option value="Calibri">Calibri</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Verdana">Verdana 10pt</option>
                    <option value="Arial">Arial 11pt</option>
                </select>
            </div>

            {/* 2. Pengaturan Jarak Baris (Line Spacing) */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <AlignLeft size={12} className="text-slate-400" />
                    <span>Jarak Baris (Spasi)</span>
                </label>
                <div className="grid grid-cols-2 divide-x divide-slate-300 border border-slate-400 bg-white">
                    <button
                        type="button"
                        onClick={() => setLineSpacing(1.18)}
                        disabled={disabled || isSaving || isPrinting}
                        className={`py-1.5 text-[11px] font-bold uppercase transition-colors cursor-pointer ${lineSpacing === 1.18
                            ? 'bg-teal-700 text-white font-extrabold'
                            : 'hover:bg-slate-50 text-slate-700'
                            } disabled:opacity-50`}
                    >
                        1.18 (Nota Dinas)
                    </button>
                    <button
                        type="button"
                        onClick={() => setLineSpacing(1.5)}
                        disabled={disabled || isSaving || isPrinting}
                        className={`py-1.5 text-[11px] font-bold uppercase transition-colors cursor-pointer ${lineSpacing === 1.5
                            ? 'bg-teal-700 text-white font-extrabold'
                            : 'hover:bg-slate-50 text-slate-700'
                            } disabled:opacity-50`}
                    >
                        1.50 (Laporan)
                    </button>
                </div>
            </div>

            {/* 3. Pengaturan Garis Tepi (Margins) */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <LayoutGrid size={12} className="text-slate-400" />
                    <span>Margin Kertas (Sisi)</span>
                </label>
                <div className="grid grid-cols-2 divide-x divide-slate-300 border border-slate-400 bg-white">
                    <button
                        type="button"
                        onClick={() => setMarginCm(2.5)}
                        disabled={disabled || isSaving || isPrinting}
                        className={`py-1.5 text-[11px] font-bold uppercase transition-colors cursor-pointer ${marginCm === 2.5
                            ? 'bg-teal-700 text-white font-extrabold'
                            : 'hover:bg-slate-50 text-slate-700'
                            } disabled:opacity-50`}
                    >
                        2.5 cm (Normal)
                    </button>
                    <button
                        type="button"
                        onClick={() => setMarginCm(3.0)}
                        disabled={disabled || isSaving || isPrinting}
                        className={`py-1.5 text-[11px] font-bold uppercase transition-colors cursor-pointer ${marginCm === 3.0
                            ? 'bg-teal-700 text-white font-extrabold'
                            : 'hover:bg-slate-50 text-slate-700'
                            } disabled:opacity-50`}
                    >
                        3.0 cm (Longgar)
                    </button>
                </div>
            </div>

            {/* 4. Blok Tombol Aksi Transaksional (Database & PDF Sync) [1] */}
            <div className="pt-3.5 space-y-2 border-t border-slate-200">
                <button
                    type="button"
                    onClick={onSave}
                    disabled={disabled || isSaving || isPrinting}
                    className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-2 border border-slate-950 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Simpan Perubahan DB</span>
                </button>

                <button
                    type="button"
                    onClick={onPrint}
                    disabled={disabled || isSaving || isPrinting}
                    className="w-full px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-2 border border-teal-850 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                    {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    <span>Cetak PDF Resmi</span>
                </button>
            </div>
        </div>
    );
};

export default FormatControlPanel;