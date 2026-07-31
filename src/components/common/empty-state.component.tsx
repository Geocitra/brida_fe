import React from 'react';
import { type LucideIcon, FileText } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FileText,
  title,
  description,
  actionButton,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-300 bg-slate-50/30 rounded-none text-center select-none space-y-3 w-full">
      <Icon size={32} className="text-slate-400 shrink-0" />

      <div className="space-y-1 max-w-md">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-roboto">
          {title}
        </h3>
        {description && (
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium font-roboto">
            {description}
          </p>
        )}
      </div>
      {actionButton && <div className="pt-1">{actionButton}</div>}
    </div>
  );
};
