import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Tipe data strict untuk memastikan integritas opsi formatting (Protected Variations)
export type FontFamilyKey = 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';

export interface EditorFormatting {
    fontFamily: FontFamilyKey;
    fontSize: string;
    lineSpacing: number;
    marginCm: number;
}

interface EditorState extends EditorFormatting {
    // Session Identity
    sessionId: string | null;
    articleTitle: string;

    // Content & Sync Status
    draftContent: string;
    isDirty: boolean; // Flag penanda apakah ada perubahan yang belum disimpan ke Database

    // Mutators (Actions)
    initSession: (sessionId: string, title: string, content: string) => void;
    setContent: (content: string) => void;
    setFormatting: (updates: Partial<EditorFormatting>) => void;
    markSaved: () => void;
    clearSession: () => void;
}

const initialState = {
    sessionId: null,
    articleTitle: '',
    draftContent: '',
    isDirty: false,
    // Format bawaan standar nota dinas pemerintah
    fontFamily: 'Calibri' as FontFamilyKey,
    fontSize: '11',
    lineSpacing: 1.18,
    marginCm: 2.5,
};

/**
 * ZUSTAND STORE: Editor Expert
 * Bertanggung jawab penuh sebagai Single Source of Truth untuk ruang kerja Editor A4.
 * Dilengkapi dengan middleware `persist` agar draf kebal terhadap tab-close tak disengaja.
 */
export const useEditorStore = create<EditorState>()(
    persist(
        (set, get) => ({
            ...initialState,

            // 1. Inisialisasi Sesi Saat Masuk Halaman Editor
            initSession: (sessionId: string, title: string, content: string) => {
                const current = get();
                // Jika masuk ke sesi yang sama, jangan timpa draf lokal yang mungkin belum tersimpan (Crash Recovery)
                if (current.sessionId === sessionId && current.isDirty) {
                    console.warn(`[EditorStore] Melakukan pemulihan (Crash Recovery) untuk Sesi ID: ${sessionId}`);
                    return;
                }

                // Jika sesi baru atau sesi lama sudah tersimpan bersih, muat ulang dari awal
                set({
                    sessionId,
                    articleTitle: title,
                    draftContent: content,
                    isDirty: false,
                    // Catatan: Opsi formatting (margin, dll) tidak di-reset agar preferensi pengguna persisten lintas sesi
                });
            },

            // 2. Pembaruan Konten Naskah secara Real-time dari TipTap
            setContent: (content: string) => {
                const currentContent = get().draftContent;
                if (currentContent !== content) {
                    set({
                        draftContent: content,
                        isDirty: true, // Tandai bahwa naskah butuh sinkronisasi ke DB
                    });
                }
            },

            // 3. Pembaruan Tata Letak Kertas & Gaya Huruf
            setFormatting: (updates: Partial<EditorFormatting>) => {
                set((state) => ({
                    ...state,
                    ...updates,
                    isDirty: true, // Perubahan format juga menuntut penyimpanan state
                }));
            },

            // 4. Konfirmasi Bahwa Sinkronisasi API Berhasil
            markSaved: () => {
                set({ isDirty: false });
            },

            // 5. Pembersihan Total Sesi (Misalnya saat Logout)
            clearSession: () => {
                set({ ...initialState });
            },
        }),
        {
            name: 'brida-editor-storage', // Kunci penyimpanan di LocalStorage
            storage: createJSONStorage(() => localStorage),
            // Kita mengecualikan beberapa data sementara agar tidak memenuhi localStorage jika tidak perlu, 
            // namun menyimpan draft dan formatting adalah prioritas.
            partialize: (state) => ({
                sessionId: state.sessionId,
                articleTitle: state.articleTitle,
                draftContent: state.draftContent,
                isDirty: state.isDirty,
                fontFamily: state.fontFamily,
                fontSize: state.fontSize,
                lineSpacing: state.lineSpacing,
                marginCm: state.marginCm,
            }),
        }
    )
);