import React, { useState, useEffect } from 'react';
import { Globe, FileText, AlertCircle, Sparkles, AlertTriangle, Lightbulb } from 'lucide-react';
import { DocumentService } from '../../../services/document.service';
import { MarkdownTableRenderer } from './markdown-table-renderer.component';

export const parseInlineStylesRaw = (
  lineText: string,
  activeDocIds: string[] = [],
  allDocs: any[] = [],
): React.ReactNode[] => {
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
            className="px-1.5 py-0.5 bg-slate-100 text-teal-900 font-mono text-[11px] border border-slate-300 font-semibold"
          >
            {subPart}
          </code>,
        );
      } else {
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
            rawCitationId = match[1];
            chunkIdx = match[2] || '';
            isExternalUrl = true;
          } else {
            rawCitationId = match[3];
            chunkIdx = match[4];
            isExternalUrl = false;
          }

          const docId = rawCitationId;
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
                return (
                  d.id === targetDocId ||
                  d.id === docId ||
                  docTitle.includes(targetId) ||
                  docTitle.includes(docId.toLowerCase())
                );
              })
            : allDocs.find((d) => d.metadata?.sourceUrl === rawCitationId);

          let displayLabel = '';
          if (isExternalUrl) {
            if (doc) {
              const idx = activeDocIds.indexOf(doc.id);
              const displayIdx = idx !== -1 ? idx + 1 : 1;
              displayLabel = `Web:${displayIdx}`;
            } else {
              displayLabel = 'Web Rujukan';
            }
          } else {
            displayLabel = `Dokumen:${docDisplayIndex}`;
          }

          const title = doc
            ? doc.title || `Dokumen Referensi (${docId})`
            : isExternalUrl
              ? rawCitationId
              : `Dokumen Referensi (${docId})`;
          const category = doc
            ? doc.category || doc.metadata?.category
            : isExternalUrl
              ? 'Tautan Sumber Web'
              : 'Referensi Dokumen';

          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
          const isWebUrl = isExternalUrl || !!doc?.metadata?.sourceUrl;
          const url = isExternalUrl
            ? rawCitationId
            : doc
              ? doc.metadata?.sourceUrl || (doc.id ? `${API_BASE_URL}/documents/${doc.id}/file` : null)
              : null;

          subParts.push(
            <span key={keyIdx++} className="relative inline-block group">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-bold font-mono mx-0.5 cursor-pointer no-print transition-colors ${
                    isWebUrl
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
                  }`}
                >
                  {isWebUrl ? (
                    <Globe size={10} className="text-emerald-700 shrink-0" />
                  ) : (
                    <FileText size={10} className="text-blue-700 shrink-0" />
                  )}
                  <span>{displayLabel}</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold font-mono mx-0.5 cursor-help no-print">
                  <AlertCircle size={10} className="text-slate-500 shrink-0" />
                  <span>{chunkIdx ? `Sitasi:${chunkIdx}` : 'Sitasi'}</span>
                </span>
              )}

              <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white border border-slate-700 shadow-xl z-50 flex flex-col gap-1.5 pointer-events-none transition-all duration-150 text-left font-roboto">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-400">
                  {isWebUrl ? 'Rujukan Web Eksternal' : category || 'Dokumen Acuan'}
                </span>
                <span className="text-[11px] font-bold leading-normal text-slate-100 line-clamp-2">
                  {title}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  {chunkIdx ? `Bagian Paragraf: #${chunkIdx}` : 'Sumber Terverifikasi'}
                </span>
                {url && (
                  <span className="text-[9px] font-bold text-teal-300 mt-0.5 flex items-center gap-1">
                    <Sparkles size={9} />
                    <span>Klik untuk membuka sumber asli</span>
                  </span>
                )}
              </span>
            </span>,
          );

          lastIndex = citationRegex.lastIndex;
        }

        if (lastIndex < subPart.length) {
          subParts.push(subPart.slice(lastIndex));
        }

        if (isBold) {
          const boldTextContent = subPart.trim();
          // Deteksi metrik angka statistik kunci (KPI Highlight)
          const isStatisticalMetric =
            /(?:rp\s*[\d.,]+|[\d.,]+%|[\d.,]+\s*(?:miliar|triliun|juta|jiwa|ton|ha|km))/i.test(
              boldTextContent,
            );

          if (isStatisticalMetric) {
            parts.push(
              <strong
                key={keyIdx++}
                className="inline-flex items-baseline font-black font-mono text-slate-950 bg-teal-50 px-1.5 py-0.2 border border-teal-200/80 mx-0.5"
              >
                {subParts.length > 0 ? subParts : subPart}
              </strong>,
            );
          } else {
            parts.push(
              <strong key={keyIdx++} className="font-bold text-slate-900">
                {subParts.length > 0 ? subParts : subPart}
              </strong>,
            );
          }
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

export const RichMessageRenderer: React.FC<RichMessageRendererProps> = ({
  text,
  activeDocIds = [],
}) => {
  const [allDocs, setAllDocs] = useState<any[]>([]);

  useEffect(() => {
    DocumentService.listDocuments()
      .then((docs) => setAllDocs(docs || []))
      .catch((err) => console.warn('Gagal memuat dokumen sitasi:', err));
  }, []);

  const parseInlineStyles = (lineText: string) => {
    return parseInlineStylesRaw(lineText, activeDocIds, allDocs);
  };

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

  let bulletListBuffer: React.ReactNode[] = [];
  let numberedListBuffer: React.ReactNode[] = [];
  let blockquoteBuffer: string[] = [];

  let keyIdx = 0;

  const flushBulletList = () => {
    if (bulletListBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${keyIdx++}`} className="list-disc pl-5 space-y-1.5 my-2.5 text-slate-750">
          {bulletListBuffer}
        </ul>,
      );
      bulletListBuffer = [];
    }
  };

  const flushNumberedList = () => {
    if (numberedListBuffer.length > 0) {
      elements.push(
        <ol key={`ol-${keyIdx++}`} className="list-decimal pl-5 space-y-1.5 my-2.5 text-slate-750">
          {numberedListBuffer}
        </ol>,
      );
      numberedListBuffer = [];
    }
  };

  const flushBlockquote = () => {
    if (blockquoteBuffer.length > 0) {
      const fullText = blockquoteBuffer.join(' ');
      const isWarning = /(perhatian|peringatan|kritis|urgent|warning|alert)/i.test(fullText);

      elements.push(
        <div
          key={`quote-${keyIdx++}`}
          className={`border-l-3 p-3.5 my-3.5 text-xs leading-relaxed space-y-1 ${
            isWarning
              ? 'border-rose-600 bg-rose-50/80 text-rose-950'
              : 'border-teal-700 bg-teal-50/70 text-teal-950'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
            {isWarning ? (
              <>
                <AlertTriangle size={13} className="text-rose-600" />
                <span className="text-rose-800">Catatan Kritis / Peringatan Kebijakan</span>
              </>
            ) : (
              <>
                <Lightbulb size={13} className="text-teal-700" />
                <span className="text-teal-900">Sorotan Analisis / Key Takeaway</span>
              </>
            )}
          </div>
          <div className="text-[11.5px] font-medium leading-relaxed">
            {parseInlineStyles(fullText)}
          </div>
        </div>,
      );
      blockquoteBuffer = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      elements.push(
        <MarkdownTableRenderer
          key={`table-${keyIdx++}`}
          rawTable={tableBuffer.join('\n')}
          activeDocIds={activeDocIds}
          allDocs={allDocs}
        />,
      );
      tableBuffer = [];
      insideTable = false;
    }
  };

  const flushAllBuffers = () => {
    flushBulletList();
    flushNumberedList();
    flushBlockquote();
    flushTable();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Parser Tabel Markdown (|...|)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushBulletList();
      flushNumberedList();
      flushBlockquote();

      const isSeparator = /^\|\s*[-:]+[\s-|]*\|$/.test(trimmed);
      if (isSeparator && tableBuffer.length > 1) {
        const nextTableHeader = tableBuffer.pop();
        flushTable();
        if (nextTableHeader) {
          tableBuffer.push(nextTableHeader);
        }
      }

      insideTable = true;
      tableBuffer.push(line);
      continue;
    } else if (insideTable) {
      flushTable();
    }

    // 2. Parser Blockquote / Catatan Kritis (> )
    if (trimmed.startsWith('> ') || trimmed === '>') {
      flushBulletList();
      flushNumberedList();
      blockquoteBuffer.push(trimmed.replace(/^>\s?/, ''));
      continue;
    } else {
      flushBlockquote();
    }

    // 3. Parser Unordered Bullet List (- , * , • )
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      flushNumberedList();
      const content = parseInlineStyles(trimmed.slice(2));
      bulletListBuffer.push(
        <li key={`li-${keyIdx++}`} className="text-xs text-slate-800 leading-relaxed font-roboto">
          {content}
        </li>,
      );
      continue;
    } else {
      flushBulletList();
    }

    // 4. Parser Numbered List (1. , 2. )
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      const content = parseInlineStyles(numberedMatch[2]);
      numberedListBuffer.push(
        <li key={`oli-${keyIdx++}`} className="text-xs text-slate-800 leading-relaxed font-roboto">
          {content}
        </li>,
      );
      continue;
    } else {
      flushNumberedList();
    }

    // 5. Parser Heading & Paragraphs
    if (trimmed.startsWith('### ')) {
      flushAllBuffers();
      elements.push(
        <h4
          key={keyIdx++}
          className="text-xs font-black text-teal-900 uppercase tracking-wider mt-4 mb-1.5 font-roboto flex items-center gap-1.5"
        >
          <span className="w-1.5 h-3 bg-teal-700 inline-block" />
          <span>{parseInlineStyles(trimmed.slice(4))}</span>
        </h4>,
      );
    } else if (trimmed.startsWith('## ')) {
      flushAllBuffers();
      elements.push(
        <h3
          key={keyIdx++}
          className="text-sm font-black text-slate-900 mt-5 mb-2 border-b border-slate-200 pb-1.5 font-roboto"
        >
          {parseInlineStyles(trimmed.slice(3))}
        </h3>,
      );
    } else if (trimmed.startsWith('# ')) {
      flushAllBuffers();
      elements.push(
        <h2
          key={keyIdx++}
          className="text-base font-black text-slate-900 mt-6 mb-3 border-b-2 border-slate-900 pb-1.5 font-roboto"
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
        </p>,
      );
    }
  }

  flushAllBuffers();

  return <div className="space-y-1 w-full text-left">{elements}</div>;
};
