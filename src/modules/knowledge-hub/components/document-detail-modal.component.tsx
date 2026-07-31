import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, CheckCircle2, Clock, AlertTriangle, Download, Database, Hash, Calendar, Search, Copy, Check, Eye, FileCode, Loader2 } from 'lucide-react';
import { renderAsync } from 'docx-preview';


import { DocumentService, type DocumentRecord } from '../../../services/document.service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface DocumentDetailModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({ document, onClose }) => {
  const [activeTab, setActiveTab] = useState<'VISUAL_FILE' | 'AI_CHUNKS' | 'METADATA'>('VISUAL_FILE');
  const [fullDetail, setFullDetail] = useState<DocumentRecord | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedChunkIndex, setCopiedChunkIndex] = useState<number | null>(null);

  // DOCX Rendering states
  const [isDocxLoading, setIsDocxLoading] = useState(false);
  const [docxRendered, setDocxRendered] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document) {
      setFullDetail(null);
      return;
    }

    setFullDetail(document);
    setIsLoadingDetail(true);

    DocumentService.getDocumentById(document.id)
      .then((res) => {
        if (res) setFullDetail(res);
      })
      .catch(() => {
        // Fallback to mock/initial document if API offline
      })
      .finally(() => {
        setIsLoadingDetail(false);
      });
  }, [document]);

  const currentDoc = fullDetail || document;
  const isPdf = currentDoc?.mimeType === 'application/pdf' || currentDoc?.title.toLowerCase().endsWith('.pdf');
  const isDocx = currentDoc?.mimeType?.includes('wordprocessingml') || 
                 currentDoc?.mimeType?.includes('msword') || 
                 currentDoc?.title.toLowerCase().endsWith('.docx') ||
                 currentDoc?.title.toLowerCase().endsWith('.doc');

  const fileStreamUrl = currentDoc ? `${API_BASE_URL}/documents/${currentDoc.id}/file` : '';

  // Render DOCX via docx-preview library when Tab VISUAL_FILE is active
  useEffect(() => {
    if (activeTab !== 'VISUAL_FILE' || !isDocx || !currentDoc) return;

    let isMounted = true;
    setIsDocxLoading(true);
    setDocxRendered(false);

    fetch(fileStreamUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Status HTTP: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML = '';
          return renderAsync(blob, docxContainerRef.current, undefined, {
            className: 'docx-view-content',
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            debug: false,
          });
        }
      })
      .then(() => {
        if (isMounted) {
          setIsDocxLoading(false);
          setDocxRendered(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsDocxLoading(false);
          setDocxRendered(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, isDocx, currentDoc, fileStreamUrl]);

  if (!document || !currentDoc) return null;

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return 'Unknown';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return bytesStr;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
            <CheckCircle2 size={14} className="text-emerald-600" /> Siap Digunakan (READY)
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold text-xs">
            <Clock size={14} className="animate-spin text-amber-600" /> Sedang Diproses (PROCESSING)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 text-red-700 font-semibold text-xs">
            <AlertTriangle size={14} className="text-red-600" /> Gagal Ingesti (FAILED)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium text-xs">
            Menunggu (PENDING)
          </span>
        );
    }
  };

  const handleCopyChunk = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkIndex(index);
    setTimeout(() => setCopiedChunkIndex(null), 2000);
  };

  // Fallback chunks for demo mode if backend has no chunk text
  const displayChunks = currentDoc.chunks && currentDoc.chunks.length > 0
    ? currentDoc.chunks
    : [
        {
          chunkIndex: 0,
          rawText: `DOKUMEN SPESIFIKASI PRODUK LKH-E REKAS (LEMBAR KERJA HASIL EVALUASI)\n\n1. PENDAHULUAN\nLaporan Evaluasi Kinerja Hasil Riset dan Inovasi BRIDA Provinsi Jawa Barat disusun untuk memetakan capaian indikator prioritas daerah.\n\n2. RUANG LINGKUP & SASARAN\nProgram mencakup analisis indikator makro pembangunan daerah, evaluasi kausalitas tingkat kemiskinan, serta integrasi peta spasial lokasi kejadian bencana di wilayah Jawa Barat.`,
          tokenCount: 180,
        },
        {
          chunkIndex: 1,
          rawText: `3. CAPAIAN & EVALUASI INDIKATOR\n- Indikator Utama Realisasi: Terjadi peningkatan efisiensi alokasi anggaran riset sebesar 14.2% dibanding baseline tahun sebelumnya.\n- Pemetaan Geospatial: Seluruh 27 Kabupaten/Kota telah terpetakan dengan koordinat geofensial terverifikasi.`,
          tokenCount: 215,
        },
      ];

  const fullDocumentTextText = displayChunks.map((c) => c.rawText).join('\n\n');

  const filteredChunks = displayChunks.filter((c) =>
    c.rawText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      {/* Outer Single Shell Modal Container (NO NESTED BOXES) */}
      <div className="bg-white shadow-2xl w-full max-w-4xl overflow-hidden rounded-none flex flex-col h-[88vh]">
        
        {/* Flat Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={22} className="text-teal-700 shrink-0" />
            <div>
              <h2 className="text-base font-roboto font-bold text-slate-900 line-clamp-1">{currentDoc.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-mono">
                <span>ID: {currentDoc.id}</span>
                <span>•</span>
                <span>{currentDoc.metadata?.category || 'General Report'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Flat Tab Navigation (No inner boxes) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-slate-50/50">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('VISUAL_FILE')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'VISUAL_FILE'
                  ? 'border-teal-700 text-teal-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye size={15} />
              <span>Pratinjau Visual Berkas</span>
            </button>

            <button
              onClick={() => setActiveTab('AI_CHUNKS')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'AI_CHUNKS'
                  ? 'border-teal-700 text-teal-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCode size={15} />
              <span>Chunks Semantik AI ({displayChunks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('METADATA')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'METADATA'
                  ? 'border-teal-700 text-teal-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database size={15} />
              <span>Spesifikasi &amp; Metadata</span>
            </button>
          </div>
        </div>


        {/* Modal Body: Seamless & Flat layout without nested boxed cards */}
        <div className="flex-1 overflow-y-auto flex flex-col p-6">
          
          {/* TAB 1: VISUAL BERKAS ASLI (FLAT INTEGRATED VIEWER) */}
          {activeTab === 'VISUAL_FILE' && (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-800">
                  Format Dokumen: {isPdf ? 'PDF (Native Reader)' : isDocx ? 'Microsoft Word (.docx)' : currentDoc.mimeType || 'Standard File'}
                </span>
                <span className="text-slate-500">Ukuran: {formatFileSize(currentDoc.metadata?.fileSizeBytes)}</span>
              </div>

              {isPdf ? (
                /* PDF Reader seamless iframe */
                <iframe
                  src={`${fileStreamUrl}#toolbar=1&navpanes=0`}
                  title={currentDoc.title}
                  className="w-full flex-1 min-h-120 bg-slate-50"
                />
              ) : isDocx ? (
                /* DOCX Renderer using docx-preview */
                <div className="flex-1 flex flex-col relative min-h-115">
                  {isDocxLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 text-teal-800 space-y-2">
                      <Loader2 size={26} className="animate-spin text-teal-700" />
                      <span className="text-xs font-semibold">Merender berkas Word secara visual...</span>
                    </div>
                  )}

                  <div
                    ref={docxContainerRef}
                    className={`flex-1 overflow-y-auto text-xs leading-relaxed text-slate-800 bg-white ${!docxRendered && !isDocxLoading ? 'hidden' : ''}`}
                    style={{ minHeight: '460px' }}
                  />

                  {/* Fallback readable full document view if API server offline or docx-preview fetch fails */}
                  {!docxRendered && !isDocxLoading && (
                    <div className="flex-1 flex flex-col space-y-3">
                      <div className="text-xs text-slate-500 italic pb-1">
                        Menampilkan pratinjau teks dokumen lengkap hasil ingesti:
                      </div>
                      <div className="flex-1 bg-slate-50 p-5 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap selection:bg-teal-700 selection:text-white">
                        {fullDocumentTextText}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Generic Text Viewer */
                <div className="flex-1 bg-slate-50 p-6 text-xs text-slate-800 font-mono leading-relaxed whitespace-pre-wrap">
                  {fullDocumentTextText}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHUNKS SEMANTIK AI (FLAT LIST, NO NESTED BOX CARDS) */}
          {activeTab === 'AI_CHUNKS' && (
            <div className="space-y-4 flex-1">
              {/* Flat Search Input */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kata kunci dalam potongan chunk semantik AI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border-b border-slate-300 focus:bg-white focus:outline-none focus:border-teal-700 transition-colors"
                />
              </div>

              {isLoadingDetail ? (
                <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Clock size={16} className="animate-spin text-teal-600" />
                  <span>Memuat potongan chunk semantik...</span>
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Tidak ada chunk semantik yang cocok dengan kata kunci "{searchQuery}".
                </div>
              ) : (
                /* Flat Chunk Items separated by clean dividers (NO NESTED BOXES) */
                <div className="divide-y divide-slate-200">
                  {filteredChunks.map((chunk, idx) => (
                    <div key={idx} className="py-4 space-y-2 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-teal-800">
                            CHUNK #{chunk.chunkIndex + 1}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {chunk.tokenCount} Tokens
                          </span>
                        </div>

                        <button
                          onClick={() => handleCopyChunk(chunk.rawText, idx)}
                          className="text-xs text-slate-600 hover:text-teal-700 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Salin Teks Chunk"
                        >
                          {copiedChunkIndex === idx ? (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Salin Teks</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-xs text-slate-800 font-mono leading-relaxed bg-slate-50/70 p-3 selection:bg-teal-700 selection:text-white whitespace-pre-wrap">
                        {chunk.rawText}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPESIFIKASI & METADATA (FLAT LIST, NO NESTED BOX CARDS) */}
          {activeTab === 'METADATA' && (
            <div className="space-y-6">
              {/* Flat Status Row */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Status Ingesti AI</span>
                  {renderStatusBadge(currentDoc.status)}
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block mb-1">Tipe Dokumen</span>
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1">
                    {currentDoc.metadata?.docType || 'REALIZATION'}
                  </span>
                </div>
              </div>

              {/* Flat Metadata Definition List (No individual boxed cards!) */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Metrik &amp; Detail Spesifikasi</h3>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <dt className="text-slate-500 mb-0.5">Ukuran Berkas</dt>
                    <dd className="font-bold text-slate-900 text-sm">{formatFileSize(currentDoc.metadata?.fileSizeBytes)}</dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 mb-0.5">Jumlah Halaman</dt>
                    <dd className="font-bold text-slate-900 text-sm">{currentDoc.metadata?.pageCount || 0} Halaman</dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 mb-0.5">Jumlah Chunks Semantik</dt>
                    <dd className="font-bold text-slate-900 text-sm">{currentDoc.chunkCount || displayChunks.length} Chunks</dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 mb-0.5">Total Token Ingesti</dt>
                    <dd className="font-bold text-slate-900 text-sm">
                      {currentDoc.metadata?.totalTokenCount ? currentDoc.metadata.totalTokenCount.toLocaleString('id-ID') : '0'} Tokens
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 mb-0.5">Kategori Dokumen</dt>
                    <dd className="font-bold text-slate-900 text-sm">{currentDoc.metadata?.category || 'General Report'}</dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 mb-0.5">Pengunggah</dt>
                    <dd className="font-bold text-slate-900 text-sm">{currentDoc.metadata?.uploadedBy || 'Tim Analis AKLS'}</dd>
                  </div>
                </dl>
              </div>

              {/* Flat Audit Trail */}
              <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><Calendar size={13} /> Tanggal Diunggah:</span>
                  <span className="font-semibold text-slate-800">
                    {currentDoc.createdAt ? new Date(currentDoc.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><Hash size={13} /> Checksum SHA-256:</span>
                  <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5">
                    {currentDoc.checksumHash || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Flat Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {currentDoc.fileUrl && (
            <a
              href={fileStreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs"
            >
              <Download size={14} /> Unduh Berkas Asli
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
