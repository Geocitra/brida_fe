import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Send,
    X,
    Loader2,
    Paperclip,
    AlertCircle,
    Globe,
    Sparkles,
    PenTool,
} from 'lucide-react';

export interface StagedAttachment {
    fileId: string;
    fileName: string;
    mimeType: string;
    classification?: 'BASELINE' | 'REALIZATION' | 'GENERAL_REFERENCE';
    base64Data?: string; // Menyimpan Base64 untuk preview visual instan
}

interface ChatInputBarProps {
    isLoading: boolean;              // Melacak apakah AI sedang berpikir
    initialPrompt?: string;          // Auto-fill input text
    onSendMessage: (                 // Trigger pengiriman kueri multimodal terpadu ke parent [5]
        query: string,
        attachments: StagedAttachment[],
        tone: string,
        targetLength: 'SHORT' | 'MEDIUM' | 'LONG',
    ) => void;
    onUploadAttachment: (            // Delegasi pengunggahan berkas transien ke parent [5]
        file: File
    ) => Promise<{ tempFileId: string; fileName: string; mimeType: string; tempPath: string }>;
    activeSessionId?: string | null;
    onNavigateToEditor?: (sessionId: string) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
    isLoading,
    initialPrompt,
    onSendMessage,
    onUploadAttachment,
    activeSessionId,
    onNavigateToEditor,
}) => {
    const [inputQuery, setInputQuery] = useState('');
    const [tone, setTone] = useState<string>('solutif');
    const [targetLength, setTargetLength] = useState<'SHORT' | 'MEDIUM' | 'LONG'>('MEDIUM');

    useEffect(() => {
        if (initialPrompt) {
            setInputQuery(initialPrompt);
        }
    }, [initialPrompt]);

    // Pengelolaan State Antrean Berkas Lampiran Internal (Encapsulated State) [5]
    const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref dedikatif untuk Auto-Resizing Textarea [1.1.2]

    // --- RESPONSIVE URL DETECTION (on-keystroke) --- [1.1.2]
    const URL_REGEX = /https?:\/\/[^\s]+/gi;
    const containsUrl = useMemo(() => {
        return URL_REGEX.test(inputQuery);
    }, [inputQuery]);

    // --- AUTO-RESIZING HEIGHT ENGINE --- [1.1.2]
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset tinggi untuk mendeteksi penyusutan teks
            const scrollHeight = textarea.scrollHeight;
            // Batasi tinggi maksimum textarea di 144px (setara ~6 baris), setelah itu tampilkan scrollbar
            textarea.style.height = `${Math.max(64, Math.min(144, scrollHeight))}px`;
        }
    }, [inputQuery]);

    /**
     * Mengolah file biner (gambar / dokumen) yang diunggah secara asinkron ke server [5]
     */
    const handleProcessUpload = async (file: File) => {
        setIsUploading(true);
        setLocalError(null);
        try {
            const res = await onUploadAttachment(file);
            const isImg = file.type.startsWith('image/');
            let base64Data: string | undefined = undefined;

            // Jika berkas berupa gambar, konversi ke Base64 untuk rendering thumbnail instan di UI [5]
            if (isImg) {
                base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        resolve(result.split(',')[1]); // Ambil hanya bodi base64
                    };
                    reader.readAsDataURL(file);
                });
            }

            setStagedAttachments((prev) => [
                ...prev,
                {
                    fileId: res.tempFileId,
                    fileName: file.name,
                    mimeType: file.type,
                    classification: isImg ? undefined : 'GENERAL_REFERENCE', // Default klasifikasi dokumen teks [5]
                    base64Data,
                },
            ]);
        } catch (err: any) {
            setLocalError(err.message || 'Gagal mengunggah berkas lampiran.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Jika berkas bertipe gambar, pastikan tidak melampaui limit ubin visual [5]
            if (file.type.startsWith('image/')) {
                const existingImagesCount = stagedAttachments.filter((att) => att.mimeType.startsWith('image/')).length;
                if (existingImagesCount >= 3) {
                    setLocalError('Batas Terlampaui: Anda hanya dapat melampirkan maksimal 3 gambar per prompt.');
                    return;
                }
            }
            handleProcessUpload(file);
        }
    };

    /**
     * Menangkap penempelan gambar biner screenshot dari clipboard keyboard (Ctrl+V) [5]
     */
    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();

                    // Circuit Breaker: Batasan jumlah gambar (Maksimal 3 per prompt) [5]
                    const existingImagesCount = stagedAttachments.filter((att) => att.mimeType.startsWith('image/')).length;
                    if (existingImagesCount >= 3) {
                        setLocalError('Batas Terlampaui: Anda hanya dapat melampirkan maksimal 3 gambar per prompt.');
                        return;
                    }
                    await handleProcessUpload(file);
                }
            }
        }
    };

    const handleUpdateClassification = (fileId: string, classification: any) => {
        setStagedAttachments((prev) =>
            prev.map((att) => (att.fileId === fileId ? { ...att, classification } : att)),
        );
    };

    const handleRemoveAttachment = (fileId: string) => {
        setStagedAttachments((prev) => prev.filter((att) => att.fileId !== fileId));
    };

    /**
     * Fungsi Terpadu untuk Pengiriman Form
     */
    const handleSubmitForm = () => {
        if (!inputQuery.trim() && stagedAttachments.length === 0) return;
        if (isLoading || isUploading) return;

        // Kirim kueri multimodal terpadu (mempertahankan karakter newline \n secara utuh) [1.1.2]
        onSendMessage(inputQuery.trim(), stagedAttachments, tone, targetLength);

        // Bersihkan state input area lokal secara instan [Optimistic UI]
        setInputQuery('');
        setStagedAttachments([]);
        setLocalError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSubmitForm();
    };

    /**
     * Pencegat Peristiwa Tombol Keyboard (Keyboard Event Interceptor) [1.1.2]
     * - Enter (Saja): Memicu pengiriman pesan secara langsung (Submit)
     * - Shift + Enter: Mengabaikan submit dan menyisipkan baris baru (\n) ke bawah
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Cegah karakter baris baru disisipkan secara tidak sengaja
            handleSubmitForm();
        }
    };

    return (
        <div className="p-4 border-t border-slate-300 bg-white no-print space-y-4 font-roboto w-full">
            {/* Penampil Pesan Galat Lokalisasi */}
            {localError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 rounded-none">
                    <AlertCircle size={14} className="shrink-0 text-red-650" />
                    <span className="flex-1 text-left">{localError}</span>
                    <button
                        onClick={() => setLocalError(null)}
                        className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
                    >
                        [Tutup]
                    </button>
                </div>
            )}

            {/* Tampilan Antrean Berkas Lampiran & Screenshot [5] */}
            {stagedAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-none">
                    {stagedAttachments.map((att) => (
                        <div
                            key={att.fileId}
                            className="p-1.5 bg-white border border-slate-300 flex items-center gap-2.5 shadow-2xs rounded-none"
                        >
                            {/* Thumbnail Gambar vs Icon Dokumen */}
                            {att.base64Data ? (
                                <img
                                    src={`data:${att.mimeType};base64,${att.base64Data}`}
                                    alt={att.fileName}
                                    className="w-8 h-8 object-cover border border-slate-200 rounded-none"
                                />
                            ) : (
                                <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-teal-800 font-extrabold text-[10px] rounded-none">
                                    DOC
                                </div>
                            )}

                            <div className="text-left space-y-0.5">
                                <span className="block text-[10px] font-bold text-slate-800 truncate max-w-40" title={att.fileName}>
                                    {att.fileName}
                                </span>

                                {/* Dropdown Pemilihan Klasifikasi Dokumen Teks [5] */}
                                {att.classification && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider">Kategori:</span>
                                        <select
                                            value={att.classification}
                                            onChange={(e) => handleUpdateClassification(att.fileId, e.target.value as any)}
                                            className="text-[9px] bg-slate-100 border border-slate-300 text-slate-700 font-bold focus:outline-none focus:border-teal-700 px-1 py-0.5 rounded-none"
                                        >
                                            <option value="BASELINE">1. Target</option>
                                            <option value="REALIZATION">2. Realisasi</option>
                                            <option value="GENERAL_REFERENCE">3. Referensi</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => handleRemoveAttachment(att.fileId)}
                                className="p-0.5 text-slate-400 hover:text-red-650 transition-colors cursor-pointer ml-1"
                                title="Batalkan lampiran"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* --- RESPONSIVE TELEMETRY INDICATORS (on-keystroke / on-processing) --- [1.1.2] */}
            {containsUrl && !isLoading && (
                <div className="p-2.5 bg-teal-50 border border-teal-200 text-teal-900 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 select-none rounded-none animate-in fade-in duration-200">
                    <span className="w-2 h-2 bg-teal-600 animate-ping" />
                    <Globe size={13} className="text-teal-700" />
                    <span>Tautan Web Terdeteksi: AI akan melakukan ekstraksi teks &amp; penyerapan konten secara proaktif.</span>
                </div>
            )}

            {isLoading && (
                <div className="p-2.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2.5 select-none rounded-none animate-in fade-in duration-200">
                    <Loader2 size={13} className="animate-spin text-teal-700" />
                    {containsUrl ? (
                        <span>Mesin Kognitif Aktif: Mengunduh teks web &amp; merakit sinkronisasi data daerah...</span>
                    ) : (
                        <span>Mesin Kognitif Aktif: Mensintesis rujukan lokal &amp; melakukan pengayaan data nasional...</span>
                    )}
                </div>
            )}

            {/* Baris Tengah (Row 1): Pemilihan Parameter Gaya Bahasa & Panjang Artikel */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-200 px-4 py-3 rounded-none">
                <div className="flex flex-wrap items-center gap-5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Gaya Bahasa:</span>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            disabled={isLoading || isUploading}
                            className="text-xs bg-white border border-slate-300 text-slate-800 font-bold focus:outline-none focus:border-teal-700 px-2.5 py-1.5 rounded-none cursor-pointer hover:border-slate-400 transition-colors"
                        >
                            <option value="solutif">SOLUTIF (Bupati)</option>
                            <option value="kritis">KRITIS (OPD)</option>
                            <option value="akademis">AKADEMIS (Media)</option>
                            <option value="populer">POPULER (Publik)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Panjang Teks:</span>
                        <select
                            value={targetLength}
                            onChange={(e) => setTargetLength(e.target.value as any)}
                            disabled={isLoading || isUploading}
                            className="text-xs bg-white border border-slate-300 text-slate-800 font-bold focus:outline-none focus:border-teal-700 px-2.5 py-1.5 rounded-none cursor-pointer hover:border-slate-400 transition-colors"
                        >
                            <option value="SHORT">Ringkas (~700 Kata)</option>
                            <option value="MEDIUM">Sedang (~1000 Kata)</option>
                            <option value="LONG">Mendalam (~1500 Kata)</option>
                        </select>
                    </div>
                </div>

                {activeSessionId && onNavigateToEditor && (
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => onNavigateToEditor(activeSessionId)}
                        className="px-3 py-1.5 text-teal-700 hover:bg-teal-50 border border-teal-300 hover:border-teal-500 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed font-bold text-xs uppercase rounded-none inline-flex items-center gap-1.5 cursor-pointer transition-colors bg-white"
                        title={isLoading ? "Tunggu AI selesai merakit naskah..." : "Alihkan langsung ke lembar kerja A4 Word WYSIWYG untuk sunting manual penuh"}
                    >
                        <PenTool size={12} className="shrink-0" />
                        <span>Sunting Manual</span>
                    </button>
                )}
            </div>

            {/* Baris Bawah (Row 2): Kolom Masukan & Unggah Berkas */}
            <form onSubmit={handleSubmit} className="w-full">
                <div className="flex items-center border border-slate-300 focus-within:border-teal-600 bg-white transition-colors w-full rounded-none gap-0">

                    {/* Kiri: Tombol Lampirkan (Icon Only) */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploading}
                        className="px-3 py-3 text-slate-400 hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0 border-r border-slate-200"
                        title="Unggah berkas acuan atau screenshot (.pdf, .docx, .png, .jpg)"
                    >
                        {isUploading ? (
                            <Loader2 size={16} className="animate-spin text-teal-600" />
                        ) : (
                            <Paperclip size={16} />
                        )}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.txt,image/*"
                        className="hidden"
                    />

                    {/* Tengah: Textarea Input */}
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="Ketik pertanyaan / draf revisi Anda di sini..."
                        disabled={isLoading || isUploading}
                        className="flex-1 bg-transparent px-4 py-3 text-xs text-slate-900 font-medium focus:outline-none disabled:opacity-50 resize-none overflow-y-auto leading-relaxed min-h-[44px] max-h-[144px]"
                        style={{ height: '44px' }}
                    />

                    {/* Kanan: Tombol KIRIM */}
                    <button
                        type="submit"
                        disabled={(!inputQuery.trim() && stagedAttachments.length === 0) || isLoading || isUploading}
                        className="px-4 py-3 text-teal-700 hover:text-teal-900 disabled:text-slate-300 font-extrabold text-xs uppercase tracking-widest transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0 border-l border-slate-200 bg-transparent"
                    >
                        {isLoading ? (
                            <>
                                <span>Proses</span>
                                <Loader2 size={14} className="animate-spin shrink-0" />
                            </>
                        ) : (
                            <>
                                <span>Kirim</span>
                                <Send size={14} className="shrink-0" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatInputBar;