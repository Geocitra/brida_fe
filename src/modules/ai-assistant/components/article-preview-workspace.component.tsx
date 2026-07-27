import React from 'react';
import { marked } from 'marked'; // Impor pustaka parser Markdown tepercaya [1]

// Pemetaan kelas font bawaan Tailwind v4 sesuai kustomisasi instansi [1]
const fontStyles: Record<string, string> = {
    'Calibri': 'font-sans',
    'Times New Roman': 'font-serif',
    'Verdana': 'font-sans tracking-tight',
    'Arial': 'font-sans tracking-tight',
};

/**
 * Kontrak Properti Input Modular Workspace
 */
export interface ArticlePreviewWorkspaceProps {
    editableText: string;
    setEditableText: (text: string) => void;
    isGenerating: boolean;
    fontFamily: 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';
    lineSpacing: number;
    marginCm: number;
}

/**
 * Komponen Modular Wadah Kerja Draf Artikel (Dual-Pane Workspace) [1].
 * Sisi Kiri: Markdown Editor stabil, Sisi Kanan: Kertas A4 Visual WYSIWYG [3].
 */
export const ArticlePreviewWorkspace: React.FC<ArticlePreviewWorkspaceProps> = ({
    editableText,
    setEditableText,
    isGenerating,
    fontFamily,
    lineSpacing,
    marginCm,
}) => {
    // Evaluasi dinamis ukuran huruf berdasarkan tipe font yang dipilih [1, 3]
    const fontSize = fontFamily === 'Times New Roman' ? '11pt' : fontFamily === 'Verdana' ? '10pt' : '11pt';

    /**
     * Mengonversi string Markdown mentah menjadi string HTML bersih secara instan.
     */
    const getRenderedHtml = (markdownText: string): string => {
        try {
            return marked.parse(markdownText) as string;
        } catch (err) {
            console.error('[Markdown Parser Error] Gagal menerjemahkan teks:', err);
            return markdownText;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 mt-4 h-full font-roboto">
            {/* SISI KIRI: Markdown Editor Textarea (Aman dari bug kursor melompat di React) [1, 5] */}
            <div className="flex flex-col h-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Markdown Source (Tulis / Sunting Manual)
                </label>
                <textarea
                    value={editableText}
                    onChange={(e) => setEditableText(e.target.value)}
                    disabled={isGenerating}
                    className="w-full flex-1 bg-slate-50 border border-slate-300 p-4 text-xs font-mono leading-relaxed text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 rounded-none resize-none overflow-y-auto"
                    placeholder="Tulis naskah artikel Anda di sini..."
                />
            </div>

            {/* SISI KANAN: Lembar Kertas A4 WYSIWYG Terformat Rapi (Real-Time PDF Preview) [3] */}
            <div className="flex flex-col h-full overflow-hidden">
                <label className="block text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-1.5">
                    Real-time A4 PDF Preview (Cetak Sesuai Layar)
                </label>
                <div className="flex-1 overflow-y-auto border border-slate-300 bg-slate-200/50 p-6 flex justify-center no-print">
                    <div
                        className={`bg-white shadow-lg border border-slate-300 text-slate-800 text-justify prose max-w-none prose-slate prose-xs focus:outline-none transition-all ${fontStyles[fontFamily]}`}
                        style={{
                            lineHeight: lineSpacing,
                            padding: `${marginCm}cm`,
                            minHeight: '29.7cm', // Tinggi standar rasio kertas A4
                            width: '21.0cm',     // Lebar standar rasio kertas A4
                            fontSize,
                        }}
                        dangerouslySetInnerHTML={{ __html: getRenderedHtml(editableText) }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ArticlePreviewWorkspace;