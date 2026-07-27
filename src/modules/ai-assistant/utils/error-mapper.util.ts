import { AiServiceException } from '../../../services/ai-assistant.service';

/**
 * Kontrak respons keluaran terstruktur dari AiErrorMapper.
 * Menjamin keseragaman tipe data yang akan dirender oleh ChatPanel [3].
 */
export interface MappedErrorResponse {
    title: string;       // Judul kesalahan formal ramah eksekutif
    description: string; // Penjelasan solutif berbahasa Indonesia
    iconName: 'AlertCircle' | 'Clock' | 'ShieldAlert' | 'WifiOff' | 'Database'; // Indikator ikon representatif
    actionType: 'RETRY' | 'NEW_SESSION' | 'LOGIN' | 'NONE'; // Rekomendasi tindakan taktis UX
}

export const AiErrorMapper = {
    /**
     * Menganalisis objek kesalahan teknis dan memetakan datanya secara polimorfis
     * menjadi narasi Bahasa Indonesia yang solutif dan sopan bagi jajaran eksekutif BRIDA [5].
     */
    map(error: unknown): MappedErrorResponse {
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

        // 3. Pemetaan Kamus Narasi Berdasarkan Jenis Kesalahan (errorType)
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

        // 4. Pemetaan Fallback Berdasarkan Kode Status HTTP (Jika errorType bernilai default)
        if (statusCode === 401 || statusCode === 403) {
            return {
                title: 'Sesi Otorisasi Berakhir',
                description: 'Sesi otentikasi eksekutif Anda telah berakhir demi keamanan data daerah. Silakan masuk kembali ke portal untuk melanjutkan diskusi.',
                iconName: 'ShieldAlert',
                actionType: 'LOGIN',
            };
        }

        if (statusCode === 413) {
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