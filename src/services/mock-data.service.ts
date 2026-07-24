import type { DocumentRecord } from './document.service';
import type { MapLocationPoint } from '../modules/dashboard/components/spatial-map.component';

export interface DeterministicMetric {
  category: string;
  targetCount: number;
  realizedCount: number;
  unit: string;
  status: 'OPTIMAL' | 'PERLU_PERHATIAN' | 'CRITICAL';
}

export interface StructuredReportData {
  id: string;
  title: string;
  category: string;
  date: string;
  ringkasan: string;
  temuan: Array<{ topik: string; deskripsi: string; tingkatResiko: 'TINGGI' | 'SEDANG' | 'RENDAH' }>;
  rekomendasi: string[];
}

export const MOCK_DATA = {
  documents: [
    {
      id: 'doc-001',
      title: 'Laporan Kebijakan Pembangunan Mimika 2026',
      fileUrl: '/uploads/doc-001.pdf',
      mimeType: 'application/pdf',
      checksumHash: 'hash-001',
      status: 'READY' as const,
      createdAt: '2026-03-15T08:30:00Z',
      metadata: {
        fileSizeBytes: '2450000',
        pageCount: 13,
        totalTokenCount: 12500,
        category: 'Analisis Kebijakan',
        uploadedBy: 'Kepala BRIDA',
      },
      chunkCount: 24,
    },
    {
      id: 'doc-002',
      title: 'Dokumen RTRW & Infrastruktur Wilayah',
      fileUrl: '/uploads/doc-002.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      checksumHash: 'hash-002',
      status: 'READY' as const,
      createdAt: '2026-03-18T10:15:00Z',
      metadata: {
        fileSizeBytes: '1850000',
        pageCount: 8,
        totalTokenCount: 8200,
        category: 'Dokumen Hukum',
        uploadedBy: 'Staf Perencana',
      },
      chunkCount: 16,
    },
    {
      id: 'doc-003',
      title: 'Audit Investigasi Pengadaan Jalan Agimuga',
      fileUrl: '/uploads/doc-003.pdf',
      mimeType: 'application/pdf',
      checksumHash: 'hash-003',
      status: 'READY' as const,
      createdAt: '2026-03-20T14:45:00Z',
      metadata: {
        fileSizeBytes: '3200000',
        pageCount: 19,
        totalTokenCount: 16800,
        category: 'Laporan Investigasi',
        uploadedBy: 'Kepala BRIDA',
      },
      chunkCount: 32,
    },
    {
      id: 'doc-004',
      title: 'Evaluasi Kualitas Pendidikan Distrik Hoya',
      fileUrl: '/uploads/doc-004.pdf',
      mimeType: 'application/pdf',
      checksumHash: 'hash-004',
      status: 'PROCESSING' as const,
      createdAt: '2026-03-22T09:10:00Z',
      metadata: {
        fileSizeBytes: '1200000',
        pageCount: 6,
        totalTokenCount: 5400,
        category: 'Analisis Sosial',
        uploadedBy: 'Tim Riset BRIDA',
      },
      chunkCount: 10,
    },
    {
      id: 'doc-005',
      title: 'Rekapitulasi Anggaran Bantuan Poktan 2025',
      fileUrl: '/uploads/doc-005.txt',
      mimeType: 'text/plain',
      checksumHash: 'hash-005',
      status: 'FAILED' as const,
      createdAt: '2026-03-23T11:00:00Z',
      metadata: {
        fileSizeBytes: '450000',
        pageCount: 2,
        totalTokenCount: 1800,
        category: 'General Report',
        uploadedBy: 'Staf Administrasi',
      },
      chunkCount: 0,
    },
  ] as DocumentRecord[],

  spatialLocations: [
    { id: '1', locationName: 'Distrik Mimika Baru (Timika)', latitude: -4.5448, longitude: 136.8870, documentTitle: 'Laporan Kebijakan Pembangunan Mimika 2026' },
    { id: '2', locationName: 'Kawasan Tembagapura / PTFI', latitude: -4.2497, longitude: 137.1122, documentTitle: 'Dokumen RTRW & Infrastruktur Wilayah' },
    { id: '3', locationName: 'Distrik Mimika Timur', latitude: -4.6120, longitude: 137.0150, documentTitle: 'Dokumen RTRW & Infrastruktur Wilayah' },
    { id: '4', locationName: 'Kawasan Pesisir Agimuga', latitude: -4.7800, longitude: 137.3500, documentTitle: 'Audit Investigasi Pengadaan Jalan Agimuga' },
    { id: '5', locationName: 'Wilayah Pegunungan Hoya', latitude: -4.1200, longitude: 137.4500, documentTitle: 'Evaluasi Kualitas Pendidikan Distrik Hoya' },
  ] as MapLocationPoint[],

  deterministicMetrics: [
    { category: 'Pembangunan Jalan & Jembatan', targetCount: 120, realizedCount: 98, unit: 'Km', status: 'OPTIMAL' },
    { category: 'Fasilitas Layanan Kesehatan Desa', targetCount: 45, realizedCount: 28, unit: 'Unit', status: 'PERLU_PERHATIAN' },
    { category: 'Bantuan Listrik Tenaga Surya', targetCount: 800, realizedCount: 410, unit: 'Rumah', status: 'PERLU_PERHATIAN' },
    { category: 'Realisasi Anggaran Inovasi Daerah', targetCount: 100, realizedCount: 35, unit: '%', status: 'CRITICAL' },
  ] as DeterministicMetric[],

  structuredReports: [
    {
      id: 'rep-101',
      title: 'Laporan Eksekutif Evaluasi Infrastruktur Mimika 2026',
      category: 'Infrastruktur & Publik',
      date: '24 Juli 2026',
      ringkasan: 'Hasil verifikasi dokumen mengindikasikan pencapaian fisik jalan mencapai 81.6%. Terjadi keterlambatan pada paket pengerjaan Agimuga akibat akses logistik.',
      temuan: [
        { topik: 'Pencairan Termin Pembayaran', deskripsi: 'Pencairan dana termin 2 dilakukan sebelum hasil ujipetik fisik selesai.', tingkatResiko: 'TINGGI' },
        { topik: 'Dokumentasi Spesifikasi Teknis', deskripsi: 'Sebagian besar material menggunakan batu kali lokal tanpa sertifikasi uji lab.', tingkatResiko: 'SEDANG' },
      ],
      rekomendasi: [
        'Melakukan penundaan pencairan termin 3 sampai fisik lapangan diverifikasi 100%.',
        'Mendorong audit independen atas kualitas beton agregat.',
      ],
    },
    {
      id: 'rep-102',
      title: 'Matriks Analisis Kebijakan Sosial & Kesehatan',
      category: 'Sosial & Budaya',
      date: '20 Juli 2026',
      ringkasan: 'Cakupan program puskesmas keliling di wilayah pedalaman Mimika Barat menunjukkan peningkatan interaksi 24% pasca-penambahan armada bot motor.',
      temuan: [
        { topik: 'Ketersediaan Obat Obatan', deskripsi: 'Stok obat dasar di 3 puskesmas pembantu mengalami kekosongan selama 2 minggu.', tingkatResiko: 'TINGGI' },
      ],
      rekomendasi: [
        'Penyusunan jadwal distribusi buffer stock obat berbasis kuartal.',
      ],
    },
  ] as StructuredReportData[],
};
