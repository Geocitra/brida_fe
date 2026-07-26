import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2, Target, BarChart3, Newspaper } from 'lucide-react';
import { DocumentService, type DocumentRecord } from '../../../services/document.service';

interface UploadDropzoneProps {
  onUploadSuccess: (newDoc: DocumentRecord) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Perencanaan & Baseline Target');
  const [docType, setDocType] = useState<'BASELINE' | 'REALIZATION' | 'GENERAL_REFERENCE'>('BASELINE');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setErrorMessage(null);
    const maxSize = 20 * 1024 * 1024; // 20 MB
    if (selectedFile.size > maxSize) {
      setErrorMessage('Ukuran file melebihi batas maksimal 20 MB.');
      return;
    }
    setFile(selectedFile);
    if (!title) {
      const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
      setTitle(nameWithoutExt);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const uploadedDoc = await DocumentService.uploadDocument(file, title, category, docType);
      onUploadSuccess(uploadedDoc);
      setFile(null);
      setTitle('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses dokumen di backend.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-none shadow-xs font-roboto">
      <h2 className="text-base font-bold text-slate-900 mb-3">
        Unggah Dokumen Laporan / Acuan Baru
      </h2>

      {errorMessage && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 rounded-none">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Classification Selector Tabs (Flat Segmented Row - Zero Boxed Cards) */}
      <div className="mb-5 space-y-1.5">
        <label className="block text-sm font-bold text-slate-800">
          Pilih Klasifikasi Jenis Dokumen Acuan:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-y border-slate-200">
          <button
            type="button"
            onClick={() => {
              setDocType('BASELINE');
              setCategory('Perencanaan & Baseline Target');
            }}
            className={`p-3 text-left transition-all cursor-pointer ${docType === 'BASELINE'
              ? 'bg-teal-50/80 border-b-2 border-teal-700 text-teal-950 font-bold'
              : 'hover:bg-slate-50 text-slate-700 border-b-2 border-transparent'
              }`}
          >
            <div className="text-sm font-bold flex items-center gap-1.5 text-teal-800 mb-0.5">
              <Target size={15} className="text-teal-600 shrink-0" />
              <span>1. Target (Baseline)</span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              RPJMD, Renstra OPD, Dokumen Target Indikator Makro.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocType('REALIZATION');
              setCategory('Laporan Realisasi Capaian');
            }}
            className={`p-3 text-left transition-all cursor-pointer ${docType === 'REALIZATION'
              ? 'bg-teal-50/80 border-b-2 border-teal-700 text-teal-950 font-bold'
              : 'hover:bg-slate-50 text-slate-700 border-b-2 border-transparent'
              }`}
          >
            <div className="text-sm font-bold flex items-center gap-1.5 text-teal-800 mb-0.5">
              <BarChart3 size={15} className="text-teal-600 shrink-0" />
              <span>2. Capaian (Realisasi)</span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Laporan Fisik Bulanan, Capaian Triwulan, Laporan OPD.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocType('GENERAL_REFERENCE');
              setCategory('Referensi Umum & Kliping');
            }}
            className={`p-3 text-left transition-all cursor-pointer ${docType === 'GENERAL_REFERENCE'
              ? 'bg-teal-50/80 border-b-2 border-teal-700 text-teal-950 font-bold'
              : 'hover:bg-slate-50 text-slate-700 border-b-2 border-transparent'
              }`}
          >
            <div className="text-sm font-bold flex items-center gap-1.5 text-teal-800 mb-0.5">
              <Newspaper size={15} className="text-teal-600 shrink-0" />
              <span>3. Umum / Referensi</span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Berita, Regulasi/Inpres, Kliping Media, Artikel Riset.
            </p>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-slate-300 hover:border-teal-600 bg-slate-50/50 p-6 text-center cursor-pointer transition-colors rounded-none flex flex-col items-center justify-center gap-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
            accept=".pdf,.docx,.txt"
            className="hidden"
          />
          <UploadCloud size={32} className="text-teal-600 mb-1" />
          {file ? (
            <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
              <FileText size={16} className="text-teal-600" />
              <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          ) : (
            <>
              <p className="font-roboto text-sm text-slate-700 font-medium">
                Seret dan lepas file laporan di sini, atau <span className="text-teal-600 underline font-semibold">telusuri perangkat</span>
              </p>
              <p className="font-roboto text-xs text-slate-500">
                Mendukung format PDF, DOCX, dan TXT (Maksimal 20 MB)
              </p>
            </>
          )}
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-roboto text-sm font-bold text-slate-800 mb-1.5">
              Judul Dokumen / Laporan
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: RPJMD Kabupaten Mimika 2026"
              required
              className="w-full bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-600 rounded-none"
            />
          </div>
          <div>
            <label className="block font-roboto text-sm font-bold text-slate-800 mb-1.5">
              Kategori Dokumen
            </label>
            <select
              value={category}
              onChange={(e) => {
                const val = e.target.value;
                setCategory(val);
                if (val.includes('Baseline') || val.includes('Perencanaan')) {
                  setDocType('BASELINE');
                } else if (val.includes('Realisasi') || val.includes('Capaian')) {
                  setDocType('REALIZATION');
                } else {
                  setDocType('GENERAL_REFERENCE');
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-teal-600 rounded-none"
            >
              <option value="Perencanaan & Baseline Target">Perencanaan &amp; Baseline Target (Baseline)</option>
              <option value="Laporan Realisasi Capaian">Laporan Realisasi Capaian (Realisasi)</option>
              <option value="Referensi Umum & Kliping">Referensi Umum &amp; Kliping (Umum)</option>
            </select>
          </div>
        </div>


        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!file || !title || isUploading}
            className={`
              px-6 py-2.5 font-roboto font-semibold text-sm text-white rounded-none flex items-center gap-2 transition-colors
              ${(!file || !title || isUploading)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800'}
            `}
          >
            {isUploading && <Loader2 size={16} className="animate-spin text-white" />}
            <span>{isUploading ? 'Memproses & Mengindeks Dokumen...' : `Unggah Dokumen`}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
