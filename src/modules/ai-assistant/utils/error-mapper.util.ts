import { AiServiceException } from '../../../services/ai-assistant.service';

/**
 * Kontrak respons keluaran terstruktur dari AiErrorMapper.
 * Menjamin keseragaman tipe data yang akan dirender oleh ChatPanel dan Article Generator [3].
 */
export interface MappedErrorResponse {
    title: string;       // Judul kesalahan formal ramah eksekutif
    description: string; // Penjelasan solutif berbahasa Indonesia
    iconName: 'AlertCircle' | 'Clock' | 'ShieldAlert' | 'WifiOff' | 'Database'; // Indikator nama ikon representatif
    actionType: 'RETRY' | 'NEW_SESSION' | 'LOGIN' | 'NONE'; // Rekomendasi tindakan taktis UX
}

export const AiErrorMapper = {
    /**
     * Menganalisis objek kesalahan teknis secara polimorfis dan kontekstual [5].
     * Menerjemahkan kode status teknis menjadi narasi formal Bahasa Indonesia yang solutif
     * berdasarkan konteks modul aktif (AI Chat vs. Article Generator) [1].
     */
    map(error: unknown, context: 'CHAT' | 'DRAFTING' = 'CHAT'): MappedErrorResponse {
        // Objek fallback aman jika terjadi kesalahan sistem umum tidak terduga (Fail-Safe) [5]
        const defaultResponse: MappedErrorResponse = {
            title: 'Hambatan Analisis Sistem',
            description: 'Mohon maaf, terjadi gangguan teknis yang tidak terduga saat memproses kueri data Anda. Tim analis sistem sedang berupaya memulihkan jalur komunikasi.',
            iconName: 'AlertCircle',
            actionType: 'RETRY',
        };

        if (!error) {
            return defaultResponse;
        }

        let statusCode = 500;
        let errorType = 'UNKNOWN_ERROR';

        // 1. Ekstraksi properti jika objek kesalahan berasal dari AiServiceException [5]
        if (error instanceof AiServiceException) {
            statusCode = error.statusCode;
            errorType = error.errorType;
        }
        // 2. Evaluasi heuristik jika objek kesalahan adalah Error bawaan browser/TypeScript
        else if (error instanceof Error) {
            const lowerMessage = error.message.toLowerCase();
            if (lowerMessage.includes('fetch') || lowerMessage.includes('network') || lowerMessage.includes('failed to fetch')) {
                statusCode = 503;
                errorType = 'CONNECTION_FAILURE';
            }
        }

        // 3. Pemetaan Kamus Narasi Berdasarkan Jenis Kesalahan (errorType) & Konteks Modul
        switch (errorType) {
            case 'CONNECTION_FAILURE':
                return {
                    title: 'Hambatan Koneksi Server',
                    description: 'Sistem mengalami kegagalan transmisi data sementara dengan server BRIDA Mimika. Silakan pastikan perangkat Anda terhubung ke internet dan coba kirim kembali pesan Anda.',
                    iconName: 'WifiOff',
                    actionType: 'RETRY',
                };

            case 'PayloadTooLarge':
            case 'TOKEN_OVERFLOW':
                // Penyesuaian solusi kontekstual jika batas muatan token terlampaui saat drafting [1, 5]
                if (context === 'DRAFTING') {
                    return {
                        title: 'Kapasitas Sintesis Terlampaui',
                        description: 'Ukuran gabungan teks dokumen rujukan terlalu tebal untuk dirangkum sekaligus menjadi satu draf naskah. Silakan kurangi beberapa pilihan dokumen acuan pada panel atas, atau kurangi instruksi tambahan Anda.',
                        iconName: 'Database',
                        actionType: 'NEW_SESSION',
                    };
                }
                return {
                    title: 'Kapasitas Diskusi Penuh',
                    description: 'Sesi diskusi ini telah melampaui batas anggaran token memori demi menjaga stabilitas sistem. Direkomendasikan untuk mempersempit pilihan dokumen acuan atau memulai diskusi di sesi baru.',
                    iconName: 'Database',
                    actionType: 'NEW_SESSION',
                };

            case 'TOO_MANY_REQUESTS':
                return {
                    title: 'Antrean AI Sangat Padat',
                    description: 'Mesin kecerdasan buatan sedang menerima volume kueri yang sangat tinggi dari penyedia layanan. Mohon berikan jeda waktu beberapa saat sebelum mengirimkan kueri Anda kembali.',
                    iconName: 'Clock',
                    actionType: 'RETRY',
                };

            case 'UNAUTHORIZED':
                return {
                    title: 'Otorisasi Sesi Berakhir',
                    description: 'Demi menjaga keamanan data riset daerah, sesi otentikasi eksekutif Anda telah berakhir. Silakan masuk kembali ke portal untuk melanjutkan diskusi.',
                    iconName: 'ShieldAlert',
                    actionType: 'LOGIN',
                };
        }

        // 4. Pemetaan Fallback Berdasarkan Kode Status HTTP & Konteks Modul
        if (statusCode === 401 || statusCode === 403) {
            return {
                title: 'Sesi Otorisasi Berakhir',
                description: 'Sesi otentikasi eksekutif Anda telah berakhir demi keamanan data daerah. Silakan masuk kembali ke portal untuk melanjutkan diskusi.',
                iconName: 'ShieldAlert',
                actionType: 'LOGIN',
            };
        }

        if (statusCode === 413) {
            // Penyesuaian solusi kontekstual jika dokumen acuan terlalu panjang saat drafting [1, 5]
            if (context === 'DRAFTING') {
                return {
                    title: 'Muatan Dokumen Sintesis Terlalu Tebal',
                    description: 'Berkas laporan daerah yang Anda jadikan acuan memiliki muatan teks yang melampaui kapasitas sintesis mesin penulis. Silakan kurangi dokumen acuan, atau pilih opsi draf dengan target panjang yang lebih ringkas.',
                    iconName: 'Database',
                    actionType: 'NEW_SESSION',
                };
            }
            return {
                title: 'Batas Anggaran Dokumen Terlampaui',
                description: 'Ukuran akumulatif dokumen acuan terlalu besar untuk dianalisis dalam satu sesi obrolan. Direkomendasikan untuk membagi dokumen rujukan atau memulai sesi diskusi baru.',
                iconName: 'Database',
                actionType: 'NEW_SESSION',
            };
        }

        if (statusCode === 429) {
            return {
                title: 'Layanan AI Sangat Sibuk',
                description: 'Mesin AI sedang melayani antrean pemrosesan yang sangat padat. Mohon tunggu beberapa saat sebelum menanyakan kueri Anda kembali.',
                iconName: 'Clock',
                actionType: 'RETRY',
            };
        }

        if (statusCode >= 500 && statusCode < 600) {
            return {
                title: 'Kendala Sistem Internal',
                description: 'Sistem BRIDA sedang mengalami kendala teknis internal saat mengolah data. Tim analis telah diberi tahu untuk melakukan perbaikan. Mohon coba beberapa saat lagi.',
                iconName: 'AlertCircle',
                actionType: 'RETRY',
            };
        }

        return defaultResponse;
    }
};