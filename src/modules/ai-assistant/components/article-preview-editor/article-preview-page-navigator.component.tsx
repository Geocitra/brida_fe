import React from 'react';

interface ArticlePreviewPageNavigatorProps {
    totalPages: number;
    activePage: number;
    onScrollToPage: (pageIdx: number) => void;
}

export const ArticlePreviewPageNavigator: React.FC<ArticlePreviewPageNavigatorProps> = ({
    totalPages,
    activePage,
    onScrollToPage,
}) => {
    return (
        <div className="w-56 bg-slate-50 border-r border-slate-300 flex flex-col min-h-0 select-none no-print shrink-0">
            <div className="p-3 bg-slate-100 border-b border-slate-250 flex items-center justify-between text-left">
                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                    Navigasi Halaman
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5">
                    {totalPages} Hlm
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {Array.from({ length: totalPages }).map((_, idx) => {
                    const isCurrent = activePage === idx;
                    return (
                        <div
                            key={idx}
                            onClick={() => onScrollToPage(idx)}
                            className={`flex flex-col items-center gap-1.5 cursor-pointer p-1.5 transition-all group ${isCurrent ? 'bg-teal-50/50 border border-teal-600 shadow-2xs' : 'border border-transparent hover:bg-slate-200/50'}`}
                        >
                            <div className={`w-28 h-36 bg-white shadow-xs border ${isCurrent ? 'border-teal-600' : 'border-slate-300 group-hover:border-slate-400'} flex flex-col justify-between p-2 relative overflow-hidden transition-colors`}>
                                <div className="space-y-1.5 opacity-30 select-none">
                                    <div className="h-1.5 bg-slate-600 w-3/4" />
                                    <div className="h-1 bg-slate-400 w-full" />
                                    <div className="h-1 bg-slate-400 w-full" />
                                    <div className="h-1 bg-slate-400 w-5/6" />
                                    <div className="pt-2 space-y-1">
                                        <div className="h-1 bg-slate-400 w-full" />
                                        <div className="h-1 bg-slate-400 w-2/3" />
                                    </div>
                                </div>
                                <span className={`text-[8px] font-black text-right self-end mt-auto transition-colors ${isCurrent ? 'text-teal-700' : 'text-slate-400'}`}>
                                    Hal {idx + 1}
                                </span>
                            </div>
                            <span className={`text-[10px] font-bold transition-colors ${isCurrent ? 'text-teal-800' : 'text-slate-655 group-hover:text-slate-900'}`}>
                                Halaman {idx + 1}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
