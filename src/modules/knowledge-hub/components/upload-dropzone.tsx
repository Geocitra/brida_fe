import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2, Target, BarChart3, Newspaper } from 'lucide-react';
import { DocumentService, type DocumentRecord } from '../../../services/document.service';
import { AdminService } from '../../../services/admin.service';

interface UploadDropzoneProps {
  onUploadSuccess: (newDoc: DocumentRecord) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data Master States
  const [categories, setCategories] = useState<any[]>([]);
  const [opds, setOpds] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedOpdId, setSelectedOpdId] = useState('');
  const [selectedCategoryRole, setSelectedCategoryRole] = useState<string>('REFERENCE');

  useEffect(() => {
    let isMounted = true;
    const fetchMasterData = async () => {
      try {
        const [cats, opdList] = await Promise.all([
          AdminService.getCategories(),
          AdminService.getOpds(),
        ]);
        if (isMounted) {
          setCategories(cats);
          setOpds(opdList);
          if (cats.length > 0) {
            setSelectedCategoryId(cats[0].id);
            setCategory(cats[0].name);
            setSelectedCategoryRole(cats[0].analyticalRole || 'REFERENCE');
          }
        }
      } catch (err) {
        console.warn('Gagal memuat data master OPD/Kategori di upload dropzone:', err);
      }
    };
    fetchMasterData();
    return () => { isMounted = false; };
  }, []);

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
      const uploadedDoc = await DocumentService.uploadDocument(
        file,
        title,
        category,
        undefined, // docType auto-derived from categoryId at backend
        selectedCategoryId || undefined,
        selectedOpdId || undefined
      );
      onUploadSuccess(uploadedDoc);
      setFile(null);
      setTitle('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses dokumen di backend.');
    } finally {
      setIsUploading(false);
    }
  };

  const roleConfig: Record<string, { label: string; icon: any; className: string }> = {
    TARGET: { label: 'Target / Sasaran (RPJMD / Renstra)', icon: Target, className: 'bg-teal-50 border-teal-200 text-teal-800' },
    REALIZATION: { label: 'Capaian / Realisasi (LKPJ / Laporan)', icon: BarChart3, className: 'bg-sky-50 border-sky-200 text-sky-800' },
    REFERENCE: { label: 'Referensi Umum / Kajian Pendukung', icon: Newspaper, className: 'bg-slate-50 border-slate-200 text-slate-700' },
  };
  const currentRole = roleConfig[selectedCategoryRole] || roleConfig['REFERENCE'];
  const RoleIcon = currentRole.icon;

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

      {/* Classification badge — derived from selected category's analyticalRole */}
      <div className="mb-5 space-y-1.5">
        <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
          Klasifikasi Peran Analitik AI:
        </label>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold rounded-none ${currentRole.className}`}>
          <RoleIcon size={14} />
          <span>{currentRole.label}</span>
        </span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-roboto text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
              Judul Dokumen / Laporan
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: RPJMD Daerah 2026"
              required
              className="w-full bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-600 rounded-none"
            />
          </div>
          
          <div>
            <label className="block font-roboto text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
              Kategori Dokumen (Data Master)
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                const catId = e.target.value;
                setSelectedCategoryId(catId);
                const selectedCat = categories.find((c) => c.id === catId);
                if (selectedCat) {
                  setCategory(selectedCat.name);
                  setSelectedCategoryRole(selectedCat.analyticalRole || 'REFERENCE');
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600 rounded-none"
            >
              {categories.map((c) => {
                const cleanCode = c.code.replace(/_/g, ' ').toUpperCase();
                return (
                  <option key={c.id} value={c.id}>
                    [{cleanCode}] {c.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block font-roboto text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
              Dinas Pemilik Data (OPD)
            </label>
            <select
              value={selectedOpdId}
              onChange={(e) => setSelectedOpdId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600 rounded-none"
            >
              <option value="">-- Tanpa Dinas OPD (Umum) --</option>
              {opds.map((o) => (
                <option key={o.id} value={o.id}>
                  [{o.code}] {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!file || !title || isUploading}
            className={`
              px-6 py-2.5 font-roboto font-semibold text-xs text-white rounded-none flex items-center gap-2 transition-colors uppercase tracking-wider
              ${(!file || !title || isUploading)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800'}
            `}
          >
            {isUploading && <Loader2 size={14} className="animate-spin text-white" />}
            <span>{isUploading ? 'Memproses & Mengindeks Dokumen...' : `Unggah Dokumen`}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
