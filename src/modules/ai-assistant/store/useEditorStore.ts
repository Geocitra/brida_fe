import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type FontFamilyKey = 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';

export interface EditorFormatting {
    fontFamily: FontFamilyKey;
    fontSize: string;
    lineSpacing: number;
    marginCm: number;
}

interface EditorState extends EditorFormatting {
    sessionId: string | null;
    articleTitle: string;
    draftContent: string; // Menyimpan HTML/DOM visual resmi
    isDirty: boolean;

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
    fontFamily: 'Calibri' as FontFamilyKey,
    fontSize: '11',
    lineSpacing: 1.18,
    marginCm: 2.5,
};

export const useEditorStore = create<EditorState>()(
    persist(
        (set, get) => ({
            ...initialState,

            initSession: (sessionId: string, title: string, content: string) => {
                const current = get();

                // Lindungi draf yang belum disimpan dari crash atau reload tidak sengaja
                if (current.sessionId === sessionId && current.isDirty) {
                    console.warn(`[EditorStore] Memulihkan naskah aktif sesi ID: ${sessionId}`);
                    return;
                }

                set({
                    sessionId,
                    articleTitle: title,
                    draftContent: content,
                    isDirty: false,
                    marginCm: 2.5,
                });
            },

            setContent: (content: string) => {
                const currentContent = get().draftContent;
                if (currentContent !== content) {
                    set({
                        draftContent: content,
                        isDirty: true,
                    });
                }
            },

            setFormatting: (updates: Partial<EditorFormatting>) => {
                set((state) => ({
                    ...state,
                    ...updates,
                    isDirty: true,
                }));
            },

            markSaved: () => {
                set({ isDirty: false });
            },

            clearSession: () => {
                set({ ...initialState });
            },
        }),
        {
            name: 'brida-editor-ssot-storage',
            storage: createJSONStorage(() => localStorage),
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