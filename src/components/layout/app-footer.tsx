import React from 'react';
import { Cpu } from 'lucide-react';

export const AppFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-slate-300 px-6 py-4 font-roboto text-slate-600 rounded-none shrink-0">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Side: BRIDA Organization & Copyright Metadata */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              Policy Brief
            </span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.5 rounded-none uppercase">
              Dashboard
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-normal mt-1">
            Sistem Data Analisis &amp; Infrastructure Knowledge Warehouse — © {currentYear} Policy Brief. All rights reserved.
          </p>
        </div>

        {/* Right Side: System Telemetry & Operational Health Status */}
        <div className="flex items-center gap-4 divide-x divide-slate-200 text-[11px]">
          <div className="pl-4 flex items-center gap-1.5 text-slate-600">
            <Cpu size={14} className="text-teal-600" />
            <span className="font-semibold text-slate-700">v1.0.0-dev</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
