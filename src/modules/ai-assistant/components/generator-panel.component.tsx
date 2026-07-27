import React, { useState } from 'react';
import { PenTool, Loader2, FileCheck, Copy } from 'lucide-react';
import { AiAssistantService } from '../../../services/ai-assistant.service';

interface GeneratorPanelProps {
  selectedDocumentId: string | null;
  documentTitle?: string;
}

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({ selectedDocumentId, documentTitle }) => {
  const [tone, setTone] = useState<'kritis' | 'solutif' | 'akademis'>('kritis');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedDocumentId || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const resultText = await AiAssistantService.generateArticle(selectedDocumentId, tone);
      setGeneratedArticle(resultText);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghasilkan artikel publikasi.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedArticle) {
      navigator.clipboard.writeText(generatedArticle);
      alert('Draf artikel berhasil disalin ke papan klip.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 flex flex-col h-150 rounded-none shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-h2 text-slate-800">Article & Release Generator (CoT)</h2>
          <p className="font-roboto text-xs text-slate-500 font-medium">
            Sumber Dokumen: <span className="text-teal-700 font-semibold">{documentTitle || 'Belum ada dokumen dipilih'}</span>
          </p>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div>
          <label className="block font-roboto text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
            Pilih Gaya Bahasa / Tone Publikasi
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['kritis', 'solutif', 'akademis'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={`
                  py-2.5 px-4 text-sm font-roboto font-semibold uppercase transition-all rounded-none border shadow-xs
                  ${tone === t 
                    ? 'bg-teal-50 border-teal-600 text-teal-700 font-bold' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
                `}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!selectedDocumentId || isGenerating}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white font-roboto font-semibold text-sm transition-colors border border-teal-700 disabled:border-slate-300 disabled:text-slate-400 rounded-none flex items-center justify-center gap-2 shadow-sm"
        >
          {isGenerating && <Loader2 size={16} className="animate-spin text-white" />}
          <PenTool size={16} />
          <span>{isGenerating ? 'Menyusun Kerangka & Artikel (CoT 2-Step)...' : 'Generate Draf Publikasi'}</span>
        </button>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-none">
            {errorMessage}
          </div>
        )}

        {generatedArticle && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-roboto text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">
                <FileCheck size={14} className="text-teal-600" /> Draf Artikel Hasil Analisis
              </span>
              <button
                onClick={handleCopy}
                className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-roboto font-semibold rounded-none flex items-center gap-1 border border-slate-300 shadow-xs"
              >
                <Copy size={12} /> Salin Teks
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 text-slate-900 text-sm font-roboto leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto rounded-none text-left shadow-xs">
              {generatedArticle}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
