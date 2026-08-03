import React from 'react';
import {
  AlertCircle,
  Clock,
  ShieldAlert,
  WifiOff,
  Database,
  RefreshCw,
  Plus,
  LogOut,
} from 'lucide-react';
import { AiServiceException } from '../../../services/ai-assistant.service';
import { AiErrorMapper } from '../utils/error-mapper.util';

const iconMap = {
  AlertCircle,
  Clock,
  ShieldAlert,
  WifiOff,
  Database,
};

interface SystemFallbackCardProps {
  errorType: string;
  rawErrorMsg: string;
  onRetry: () => void;
  onNewSession: () => void;
  onLogin: () => void;
}

export const SystemFallbackCard: React.FC<SystemFallbackCardProps> = ({
  errorType,
  rawErrorMsg,
  onRetry,
  onNewSession,
  onLogin,
}) => {
  const mapped = AiErrorMapper.map(new AiServiceException(500, errorType, rawErrorMsg));
  const IconComponent = iconMap[mapped.iconName as keyof typeof iconMap] || AlertCircle;

  return (
    <div className="bg-slate-50 border border-slate-300 p-4 my-3 font-roboto w-full text-slate-800 space-y-3 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-white border border-slate-200 shrink-0 text-slate-600">
          <IconComponent size={18} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-snug">
            {mapped.title}
          </h4>
          <p className="text-xs font-medium text-slate-600 leading-relaxed text-justify">
            {mapped.description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 no-print">
        {mapped.actionType === 'RETRY' && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer rounded-none border border-teal-800 shadow-2xs"
          >
            <RefreshCw size={12} className="shrink-0" />
            <span>Coba Kirim Ulang</span>
          </button>
        )}

        {mapped.actionType === 'NEW_SESSION' && (
          <button
            type="button"
            onClick={onNewSession}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer rounded-none border border-teal-800 shadow-2xs"
          >
            <Plus size={12} className="shrink-0" />
            <span>Mulai Sesi Baru</span>
          </button>
        )}

        {mapped.actionType === 'LOGIN' && (
          <button
            type="button"
            onClick={onLogin}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer rounded-none border border-slate-950 shadow-2xs"
          >
            <LogOut size={12} className="shrink-0" />
            <span>Masuk Sesi Kembali</span>
          </button>
        )}
      </div>
    </div>
  );
};
