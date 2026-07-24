import React from 'react';
import { FileText, Cpu, MapPin, CheckCircle } from 'lucide-react';

interface StatCardsProps {
  totalDocuments: number;
  totalChunks: number;
  totalLocations: number;
  systemStatus: string;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalDocuments,
  totalChunks,
  totalLocations,
  systemStatus,
}) => {
  const cards = [
    { title: 'Total Laporan Arsip', value: totalDocuments, icon: FileText, change: 'Aktif di Database', color: 'text-teal-600 bg-teal-50 border-teal-200' },
    { title: 'Total Vektor Chunks', value: totalChunks, icon: Cpu, change: 'Tersindeks pgvector', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { title: 'Titik Spasial Kasus', value: totalLocations, icon: MapPin, change: 'Terdeteksi PostGIS', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { title: 'Status Engine', value: systemStatus, icon: CheckCircle, change: 'Zero-Knowledge Active', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-white border border-slate-200 p-5 rounded-none shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="font-roboto text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 border ${card.color} rounded-none`}>
                <Icon size={18} />
              </div>
            </div>
            <div>
              <div className="font-roboto font-bold text-2xl text-slate-900 mb-1 tracking-tight">
                {card.value}
              </div>
              <span className="font-roboto text-xs text-slate-500 font-medium">
                {card.change}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
