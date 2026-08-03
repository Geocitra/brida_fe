import React, { useState, useEffect } from 'react';
import { Globe, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { DocumentService } from '../../../services/document.service';
import { MarkdownTableRenderer } from './markdown-table-renderer.component';

// --- HELPER FUNCTION: parseInlineStylesRaw ---
export const parseInlineStylesRaw = (lineText: string, activeDocIds: string[] = [], allDocs: any[] = []): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let keyIdx = 0;

  const boldParts = lineText.split('**');
  boldParts.forEach((part, index) => {
    const isBold = index % 2 === 1;
    const codeParts = part.split('`');

    codeParts.forEach((subPart, subIndex) => {
      const isInlineCode = subIndex % 2 === 1;

      if (isInlineCode) {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 bg-slate-100 text-teal-800 font-mono text-[11px] border border-slate-200"
          >
            {subPart}
          </code>,
        );
      } else {
        // Integrasi Pencarian Pola Sitasi Dokumen Lokal/Scraped (RAG Anchor) [1.1.2]
        // Mendukung baik RAG standar [doc-001:2], tautan web dengan indeks [https://example.com:2], maupun tautan web langsung [https://example.com].
        const citationRegex = /\[(https?:\/\/[^\]\s]+?)(?::(\d+))?\]|\[([^\]\s:]+):(\d+)\]/gi;
        let lastIndex = 0;
        let match;
        const subParts: React.ReactNode[] = [];

        while ((match = citationRegex.exec(subPart)) !== null) {
          const matchIndex = match.index;

          if (matchIndex > lastIndex) {
            subParts.push(subPart.slice(lastIndex, matchIndex));
          }

          let rawCitationId = '';
          let chunkIdx = '';
          let isExternalUrl = false;

          if (match[1]) {
            // Skenario Tautan Web Langsung (Group 1 & 2)
            rawCitationId = match[1];
            chunkIdx = match[2] || '';
            isExternalUrl = true;
          } else {
            // Skenario RAG Standar (Group 3 & 4)
            rawCitationId = match[3];
            chunkIdx = match[4];
            isExternalUrl = false;
          }

          const docId = rawCitationId;

          // Ambil detail metadata sitasi secara dinamis
          const docMatch = docId.match(/^doc[-_]?(\d+)$/i);
          let targetDocId = docId;
          let docDisplayIndex = 1;

          if (docMatch && activeDocIds.length > 0) {
            const idx = parseInt(docMatch[1], 10) - 1;
            if (idx >= 0 && idx < activeDocIds.length) {
              targetDocId = activeDocIds[idx];
              docDisplayIndex = idx + 1;
            }
          } else if (activeDocIds.length > 0) {
            const idx = activeDocIds.indexOf(targetDocId);
            if (idx !== -1) {
              docDisplayIndex = idx + 1;
            }
          }

          const doc = !isExternalUrl
            ? allDocs.find((d) => {
              const docTitle = (d.title || '').toLowerCase();
              const targetId = (targetDocId || '').toLowerCase();
              return d.id === targetDocId || d.id === docId || docTitle.includes(targetId) || docTitle.includes(docId.toLowerCase());
            })
            : allDocs.find((d) => d.metadata?.sourceUrl === rawCitationId);

          // Tentukan label tampilan tombol sitasi
          let displayLabel = '';
          if (isExternalUrl) {
            if (doc) {
              const idx = activeDocIds.indexOf(doc.id);
              const displayIdx = idx !== -1 ? idx + 1 : 1;
              displayLabel = `Link:${displayIdx}`;
            } else {
              displayLabel = 'Link';
            }
          } else {
            displayLabel = `Dokumen:${docDisplayIndex}`;
          }

          const title = doc ? (doc.title || `Dokumen Referensi (${docId})`) : (isExternalUrl ? rawCitationId : `Dokumen Referensi (${docId})`);
          const category = doc ? (doc.category || doc.metadata?.category) : (isExternalUrl ? 'Tautan Web Luar' : 'Referensi Dokumen');

          // Tentukan URL: Prioritaskan sourceUrl eksternal, jika tidak ada, arahkan ke endpoint stream file API backend
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
          const isWebUrl = isExternalUrl || !!doc?.metadata?.sourceUrl;
          const url = isExternalUrl
            ? rawCitationId
            : (doc
              ? (doc.metadata?.sourceUrl || (doc.id ? `${API_BASE_URL}/documents/${doc.id}/file` : null))
              : null);

          subParts.push(
            <span key={keyIdx++} className="relative inline-block group">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[9px] font-bold font-mono rounded-none mx-0.5 cursor-pointer no-print transition-colors ${isWebUrl
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-850 border-emerald-200'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-850 border-blue-200'
                    }`}
                >
                  {isWebUrl ? (
                    <Globe size={10} className="text-emerald-600 shrink-0" />
                  ) : (
                    <FileText size={10} className="text-blue-600 shrink-0" />
                  )}
                  <span>{displayLabel}</span>
                </a>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[9px] font-bold font-mono rounded-none mx-0.5 cursor-help no-print transition-colors"
                >
                  <AlertCircle size={10} className="text-slate-500 shrink-0" />
                  <span>{chunkIdx ? `Sitasi:${chunkIdx}` : 'Sitasi'}</span>
                </span>
              )}

              {/* Hover Reference Card (Rounded-None, Roboto, Sleek Dark Palette) */}
              <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white rounded-none border border-slate-700 shadow-xl z-50 flex flex-col gap-1.5 pointer-events-none transition-all duration-150 text-left font-roboto">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-400">
                  {isWebUrl ? 'Tautan Web Luar' : (category || 'Dokumen Acuan')}
                </span>
                <span className="text-[11px] font-bold leading-normal text-slate-100 line-clamp-2">
                  {title}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  {chunkIdx ? `Rujukan Paragraf: #${chunkIdx}` : 'Rujukan Tautan Langsung'}
                </span>
                {url && (
                  <span className="text-[9px] font-bold text-teal-300 mt-0.5 flex items-center gap-1">
                    <Sparkles size={8} />
                    {isWebUrl ? 'Klik untuk membuka tautan web asli' : 'Klik untuk mengunduh/membuka file dokumen'}
                  </span>
                )}
              </span>
            </span>
          );

          lastIndex = citationRegex.lastIndex;
        }

        if (lastIndex < subPart.length) {
          subParts.push(subPart.slice(lastIndex));
        }

        if (isBold) {
          parts.push(
            <strong key={keyIdx++} className="font-bold text-slate-900">
              {subParts.length > 0 ? subParts : subPart}
            </strong>,
          );
        } else {
          subParts.forEach((sp) => parts.push(sp));
        }
      }
    });
  });

  return parts;
};

export interface RichMessageRendererProps {
  text: string;
  activeDocIds?: string[];
}

export const RichMessageRenderer: React.FC<RichMessageRendererProps> = ({ text, activeDocIds = [] }) => {
  const [allDocs, setAllDocs] = useState<any[]>([]);

  useEffect(() => {
    DocumentService.listDocuments()
      .then((docs) => setAllDocs(docs || []))
      .catch((err) => console.warn('Gagal memuat dokumen untuk rujukan sitasi:', err));
  }, []);

  const parseInlineStyles = (lineText: string) => {
    return parseInlineStylesRaw(lineText, activeDocIds, allDocs);
  };

  // Pre-process and clean up raw HTML tags and escaped brackets to prevent raw render
  const cleanedText = (text || '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    .replace(/\\+\[/g, '[')
    .replace(/\\+\]/g, ']');

  const lines = cleanedText.split('\n');
  const elements: React.ReactNode[] = [];

  let tableBuffer: string[] = [];
  let insideTable = false;
  let listBuffer: React.ReactNode[] = [];
  let keyIdx = 0;

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${keyIdx++}`} className="list-disc pl-5 space-y-1.5 my-2">
          {listBuffer}
        </ul>,
      );
      listBuffer = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      elements.push(
        <MarkdownTableRenderer key={`table-${keyIdx++}`} rawTable={tableBuffer.join('\n')} />,
      );
      tableBuffer = [];
      insideTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      insideTable = true;
      tableBuffer.push(line);
      continue;
    } else if (insideTable) {
      flushTable();
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const content = parseInlineStyles(trimmed.slice(2));
      listBuffer.push(
        <li key={`li-${keyIdx++}`} className="text-xs text-slate-700 leading-relaxed font-roboto">
          {content}
        </li>,
      );
      continue;
    } else {
      flushList();
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4
          key={keyIdx++}
          className="text-xs font-bold text-teal-800 uppercase tracking-wider mt-4 mb-1.5 font-roboto"
        >
          {parseInlineStyles(trimmed.slice(4))}
        </h4>,
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={keyIdx++}
          className="text-sm font-bold text-slate-900 mt-5 mb-2 border-b border-slate-200 pb-1 font-roboto"
        >
          {parseInlineStyles(trimmed.slice(3))}
        </h3>,
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2
          key={keyIdx++}
          className="text-base font-extrabold text-slate-900 mt-6 mb-3 border-b-2 border-slate-300 pb-1.5 font-roboto"
        >
          {parseInlineStyles(trimmed.slice(2))}
        </h2>,
      );
    } else if (trimmed === '') {
      continue;
    } else {
      elements.push(
        <p
          key={keyIdx++}
          className="text-xs text-slate-800 font-normal leading-relaxed my-2 font-roboto text-justify"
        >
          {parseInlineStyles(line)}
        </p>
      );
    }
  }

  flushList();
  flushTable();

  return <div className="space-y-1 w-full text-left">{elements}</div>;
};
