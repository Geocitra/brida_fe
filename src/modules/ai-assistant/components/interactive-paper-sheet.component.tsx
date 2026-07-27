import React from 'react';
import { RichMessageRenderer } from './chat-panel.component'; // Menggunakan kembali perender terpadu (DRY) [3]

// Pemetaan kelas keluarga font standar Tailwind v4 [1]
const fontStyles: Record<string, string> = {
    'Calibri': 'font-sans',
    'Times New Roman': 'font-serif',
    'Verdana': 'font-sans tracking-tight',
    'Arial': 'font-sans tracking-tight',
};

/**
 * Kontrak Properti Input Modular Interactive Paper Sheet
 */
export interface InteractivePaperSheetProps {
    markdownText: string;
    fontFamily: 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';
    lineSpacing: number;
    marginCm: number;
}

/**
 * Komponen Modular Lembar Kertas A4 WYSIWYG Terformat Rapi [3].
 * Menampilkan draf naskah publikasi formal secara instan sesuai rasio cetak asli [3].
 */
export const InteractivePaperSheet: React.FC<InteractivePaperSheetProps> = ({
    markdownText,
    fontFamily,
    lineSpacing,
    marginCm,
}) => {
    // Evaluasi dinamis ukuran huruf berdasarkan tipe font yang dipilih [1, 3]
    const fontSize = fontFamily === 'Times New Roman' ? '11pt' : fontFamily === 'Verdana' ? '10pt' : '11pt';

    return (
        <div className="flex justify-center bg-slate-200/50 p-6 overflow-x-auto select-none no-print w-full">
            {/* Struktur Kertas Putih A4 Virtual dengan Pengaturan Gaya Presisi [3] */}
            <div
                className={`bg-white shadow-lg border border-slate-300 text-slate-800 text-justify prose max-w-none prose-slate prose-xs focus:outline-none transition-all ${fontStyles[fontFamily]}`}
                style={{
                    lineHeight: lineSpacing,
                    padding: `${marginCm}cm`,
                    minHeight: '29.7cm', // Tinggi standar rasio kertas A4
                    width: '21.0cm',     // Lebar standar rasio kertas A4
                    fontSize,
                }}
            >
                {/* Menggunakan kembali RichMessageRenderer untuk menampilkan draf rapi bebas tag mentah [3] */}
                <RichMessageRenderer text={markdownText || 'Mempersiapkan draf naskah publikasi...'} />
            </div>
        </div>
    );
};

export default InteractivePaperSheet;