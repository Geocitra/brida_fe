import type { DocumentRecord } from './document.service';
import type { MapLocationPoint } from '../modules/dashboard/components/spatial-map.component';

export interface IndicatorMatrixItem {
  id: string;
  name: string;
  sector: string;
  baseline: string;
  realization: string;
  deviationText: string;
  deviationPercent: number;
  status: 'KRITIS' | 'WASPADA' | 'NORMAL';
  period: string;
  causalFactors: Array<{ label: string; percentage: number; color: string }>;
  priorityRecommendations: Array<{
    priority: string;
    title: string;
    pic: string;
    deadline: string;
    cost: string;
    badgeColor: string;
  }>;
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
  ] as DocumentRecord[],

  spatialLocations: [
    { id: '1', locationName: 'Distrik Mimika Baru (Timika)', latitude: -4.5448, longitude: 136.8870, documentTitle: 'Laporan Kebijakan Pembangunan Mimika 2026' },
    { id: '2', locationName: 'Kawasan Tembagapura / PTFI', latitude: -4.2497, longitude: 137.1122, documentTitle: 'Dokumen RTRW & Infrastruktur Wilayah' },
    { id: '3', locationName: 'Distrik Mimika Timur', latitude: -4.6120, longitude: 137.0150, documentTitle: 'Dokumen RTRW & Infrastruktur Wilayah' },
    { id: '4', locationName: 'Kawasan Pesisir Agimuga', latitude: -4.7800, longitude: 137.3500, documentTitle: 'Audit Investigasi Pengadaan Jalan Agimuga' },
    { id: '5', locationName: 'Wilayah Pegunungan Hoya', latitude: -4.1200, longitude: 137.4500, documentTitle: 'Evaluasi Kualitas Pendidikan Distrik Hoya' },
  ] as MapLocationPoint[],

  indicatorsMatrix: [
    {
      id: 'pad',
      name: 'PENDAPATAN ASLI DAERAH (PAD)',
      sector: 'Keuangan & Pendapatan Daerah',
      baseline: 'Rp 110 Miliar',
      realization: 'Rp 85 Miliar',
      deviationText: '-22.7% (KRITIS)',
      deviationPercent: 77,
      status: 'KRITIS',
      period: 'April 2025 - Maret 2026',
      causalFactors: [
        { label: 'Penurunan harga pasar tembaga & royalti PTFI', percentage: 60, color: 'bg-red-600' },
        { label: 'Tunggakan pajak restoran & hotel daerah', percentage: 30, color: 'bg-amber-500' },
        { label: 'Gangguan distribusi logistik jalan tambang akibat banjir', percentage: 10, color: 'bg-emerald-600' },
      ],
      priorityRecommendations: [
        {
          priority: 'PRIORITAS 1 (7 hari)',
          title: 'Bentuk tim percepatan penagihan pajak hotel/restoran',
          pic: 'Dinas Pendapatan Daerah',
          deadline: '4 Mei 2026',
          cost: 'Rp 50 Juta',
          badgeColor: 'bg-red-600 text-white',
        },
        {
          priority: 'PRIORITAS 2 (14 hari)',
          title: 'Koordinasi dengan PTFI untuk proyeksi royalti semester II',
          pic: 'Bagian Ekonomi Setda',
          deadline: '19 April 2026',
          cost: 'Korektif Organisasional',
          badgeColor: 'bg-amber-500 text-white',
        },
        {
          priority: 'PRIORITAS 3 (30 hari)',
          title: 'Penyusunan kebijakan diversifikasi PAD non-tambang',
          pic: 'Bappeda + BRIDA',
          deadline: '2 Mei 2026',
          cost: 'Rp 120 Juta',
          badgeColor: 'bg-emerald-600 text-white',
        },
      ],
    },
    {
      id: 'putus-sekolah',
      name: 'ANGKA PUTUS SEKOLAH DISTRIK HOYA',
      sector: 'Pendidikan & Sumber Daya Manusia',
      baseline: '≤ 2.0%',
      realization: '5.5%',
      deviationText: '+3.5% (KRITIS)',
      deviationPercent: 36,
      status: 'KRITIS',
      period: 'Maret 2026',
      causalFactors: [
        { label: 'Akses jalan & jarak sekolah > 10 km dari pemukiman', percentage: 58, color: 'bg-red-600' },
        { label: 'Banjir bandang dan cuaca ekstrem', percentage: 32, color: 'bg-amber-500' },
        { label: 'Keterbatasan ekonomi keluarga', percentage: 10, color: 'bg-emerald-600' },
      ],
      priorityRecommendations: [
        {
          priority: 'PRIORITAS 1 (7 hari)',
          title: 'Penyediaan armada transportasi sekolah darurat & beasiswa transportasi',
          pic: 'Dinas Pendidikan',
          deadline: '28 April 2026',
          cost: 'Rp 350 Juta',
          badgeColor: 'bg-red-600 text-white',
        },
        {
          priority: 'PRIORITAS 2 (14 hari)',
          title: 'Pembangunan asrama siswa terdekat di Distrik Hoya',
          pic: 'Dinas PU & Pendidikan',
          deadline: '15 Mei 2026',
          cost: 'Rp 1.2 Miliar',
          badgeColor: 'bg-amber-500 text-white',
        },
      ],
    },
    {
      id: 'inflasi-pangan',
      name: 'INFLASI PANGAN MIMIKA - NABIRE',
      sector: 'Perekonomian & Ketahanan Pangan',
      baseline: '≤ 1.5%',
      realization: '3.6%',
      deviationText: '+2.1% (WASPADA)',
      deviationPercent: 58,
      status: 'WASPADA',
      period: 'Maret 2026',
      causalFactors: [
        { label: 'Kenaikan harga komoditas beras lokal & bawang merah', percentage: 50, color: 'bg-amber-500' },
        { label: 'Kendala kapal barang rantai pasok dari Nabire', percentage: 35, color: 'bg-blue-600' },
        { label: 'Biaya logistik penerbangan udara distrik interior', percentage: 15, color: 'bg-emerald-600' },
      ],
      priorityRecommendations: [
        {
          priority: 'PRIORITAS 1 (7 hari)',
          title: 'Gelar Operasi Pasar Murah beras dan minyak goreng di 3 Distrik Rawan',
          pic: 'Dinas Perdagangan + Bulog',
          deadline: '8 Mei 2026',
          cost: 'Rp 2.5 Miliar',
          badgeColor: 'bg-red-600 text-white',
        },
      ],
    },
    {
      id: 'pembangunan-jalan',
      name: 'PEMBANGUNAN JALAN AGIMUGA',
      sector: 'Infrastruktur & Pekerjaan Umum',
      baseline: '120 Km',
      realization: '98 Km',
      deviationText: '81.6% (NORMAL)',
      deviationPercent: 82,
      status: 'NORMAL',
      period: 'Januari - Maret 2026',
      causalFactors: [
        { label: 'Penyelesaian perkerasan sirtu lapangan', percentage: 80, color: 'bg-emerald-600' },
        { label: 'Kendala pengiriman alat berat lokasi rawa', percentage: 20, color: 'bg-blue-600' },
      ],
      priorityRecommendations: [
        {
          priority: 'PRIORITAS 2 (14 hari)',
          title: 'Percepatan drainase samping jalan sebelum pemadatan akhir',
          pic: 'Dinas Pekerjaan Umum',
          deadline: '20 Mei 2026',
          cost: 'Sesuai Kontrak',
          badgeColor: 'bg-emerald-600 text-white',
        },
      ],
    },
  ] as IndicatorMatrixItem[],

  bupatiReport: {
    title: 'LAPORAN PERKEMBANGAN WILAYAH',
    recipient: 'Kepada YTH. Bupati Kabupaten Mimika',
    sender: 'BRIDA SMART Analysis Engine',
    period: '1-31 Maret 2026',
    date: '5 April 2026',
    urgency: 'Segera',
    executiveSummary:
      'Berdasarkan analisis data Maret 2026 dibandingkan baseline RPJMD, ditemukan 2 indikator kritis: PAD turun 22,7% dan angka putus sekolah di Distrik Hoya naik 3,5%. Kebijakan nasional kenaikan BBM yang efektif 15 Mei diprediksi akan memperburuk inflasi menjadi +4.9% jika tidak ada intervensi. Rekomendasi utama: operasi pasar murah di 3 distrik rawan dan percepatan penagihan pajak hotel/restoran.',
    deviations: [
      {
        title: '1. PENDAPATAN ASLI DAERAH (PAD)',
        baseline: 'Rp110 Miliar',
        realization: 'Rp85 Miliar',
        deviationText: '-22.7% (KRITIS)',
        severityColor: 'text-red-700 font-bold',
        causes: 'Royalti tembaga turun (60%), tunggakan pajak hotel/restoran (30%), gangguan distribusi (10%)',
      },
      {
        title: '2. PENDIDIKAN (Angka Putus Sekolah di Distrik Hoya)',
        baseline: '≤ 2.0%',
        realization: '5.5%',
        deviationText: '+3.5% (KRITIS)',
        severityColor: 'text-red-700 font-bold',
        causes: 'Jarak sekolah > 10km (58%), banjir (32%), faktor ekonomi (10%)',
      },
      {
        title: '3. INFLASI PANGAN',
        baseline: '≤ 1.5%',
        realization: '3.6%',
        deviationText: '+2.1% (WASPADA)',
        severityColor: 'text-amber-700 font-bold',
        causes: 'Kenaikan harga beras lokal dan bawang merah, gangguan distribusi dari Nabire',
      },
    ],
    nationalPolicyImpact: {
      policyName: 'Kenaikan Harga BBM Bersubsidi 30% (efektif 15 Mei 2026)',
      simulationResults: [
        'Inflasi Mimika diprediksi naik dari 3,6% menjadi 4,9%',
        'Kemiskinan berpotensi naik 1,3% (sekitar 4.500 jiwa tambahan miskin)',
        'Daya beli masyarakat di distrik terpencil (Hoya, Agimuga, Jila) akan turun paling tajam',
      ],
    },
    actionPriorities: [
      '1. Operasi pasar murah beras dan minyak goreng di Distrik Hoya, Iwaka, Agimuga (PIC: Dinas Perdagangan + Bulog | Biaya: Rp 2,5 M | Deadline: 8 Mei 2026)',
      '2. Bentuk tim percepatan penagihan pajak hotel/restoran (PIC: Dinas Pendapatan | Biaya: Rp 50 Juta | Deadline: 4 Mei 2026)',
      '3. Koordinasi dengan PTFI untuk proyeksi royalti semester II (PIC: Bagian Ekonomi Setda | Deadline: 19 April 2026)',
    ],
  },
};
