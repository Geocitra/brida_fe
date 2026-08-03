import React from 'react';
import { ArrowRight } from 'lucide-react';
import { parseInlineStylesRaw } from './rich-message-renderer.component';

interface SuggestionChipsProps {
  suggestions?: string[];
  onClick: (suggestion: string) => void;
  disabled: boolean;
}

const normalizeSuggestions = (suggestions?: string[]): string[] => {
  if (!suggestions || suggestions.length === 0) return [];

  if (suggestions.length === 1 && typeof suggestions[0] === 'string') {
    const raw = suggestions[0];

    if (raw.includes('\n-') || raw.includes(' - ') || raw.includes('? -') || raw.includes('?* -')) {
      let cleaned = raw.replace(/^##\s*Opsi\s*Lanjutan\s*/i, '').trim();

      const parts = cleaned
        .split(/(?:\r?\n)?-\s+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (parts.length > 1) {
        return parts;
      }

      const inlineParts = cleaned
        .split(/\?\s+-\s+/)
        .map((p, idx, arr) => {
          let item = p.trim();
          if (idx < arr.length - 1 && !item.endsWith('?')) {
            item += '?';
          }
          return item;
        })
        .filter((p) => p.length > 0);

      if (inlineParts.length > 1) {
        return inlineParts;
      }
    }
  }

  return suggestions
    .map((s) => s.replace(/^##\s*Opsi\s*Lanjutan\s*/i, '').replace(/^-\s+/, '').trim())
    .filter((s) => s.length > 0);
};

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onClick,
  disabled,
}) => {
  const normalized = normalizeSuggestions(suggestions);
  if (normalized.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-100 no-print">
      {normalized.map((s, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onClick(s)}
          disabled={disabled}
          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 text-teal-800 hover:text-teal-950 font-bold text-xs border border-teal-200 hover:border-teal-300 rounded-none shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <span>{parseInlineStylesRaw(s)}</span>
          <ArrowRight size={11} className="text-teal-600 shrink-0 animate-pulse" />
        </button>
      ))}
    </div>
  );
};
