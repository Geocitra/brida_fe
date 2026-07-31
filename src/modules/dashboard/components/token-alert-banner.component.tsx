import React, { useState, useEffect } from 'react';
import { AlertTriangle, Zap, X, ExternalLink, BatteryWarning, BatteryLow } from 'lucide-react';
import type { TokenBudget } from './token-budget-guard.component';

interface TokenAlertBannerProps {
  budget?: TokenBudget | null;
  isLoading?: boolean;
}

export const TokenAlertBanner: React.FC<TokenAlertBannerProps> = ({ budget, isLoading }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (budget && (budget.paguStatus === 'WARNING' || budget.paguStatus === 'ALERT') && !isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [budget, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 300);
  };

  if (isLoading || !budget || isDismissed) return null;
  if (budget.paguStatus === 'SAFE') return null;

  const isWarning = budget.paguStatus === 'WARNING';
  const remainingPercent = parseFloat((100 - budget.quotaPercentage).toFixed(1));
  const remainingUsd = (budget as any).remainingCostUsd ?? null;
  const totalCreditUsd = (budget as any).totalCreditUsd ?? null;

  const config = isWarning
    ? {
        wrapperBg: 'bg-rose-950',
        borderColor: 'border-rose-700',
        accentLine: 'bg-rose-500',
        iconColor: 'text-rose-300',
        badgeBg: 'bg-rose-700/60',
        badgeText: 'text-rose-100',
        barBg: 'bg-rose-900/60',
        barFill: 'bg-rose-400',
        titleText: 'text-rose-50',
        bodyText: 'text-rose-200',
        metaText: 'text-rose-300',
        Icon: BatteryLow,
        AlertIcon: AlertTriangle,
        statusLabel: '⚡ KRITIS — SEGERA ISI ULANG',
        headline: 'Kredit AI Hampir Habis!',
        body: `Sisa kredit OpenAI Anda hanya tinggal ${remainingPercent}%. Sistem AI akan otomatis berhenti bekerja ketika kredit habis.`,
        buttonBg: 'bg-rose-500 hover:bg-rose-400',
        buttonText: 'text-white',
        buttonLabel: 'Isi Kredit Sekarang',
        pulseColor: 'bg-rose-500',
      }
    : {
        wrapperBg: 'bg-amber-950',
        borderColor: 'border-amber-700',
        accentLine: 'bg-amber-500',
        iconColor: 'text-amber-300',
        badgeBg: 'bg-amber-700/60',
        badgeText: 'text-amber-100',
        barBg: 'bg-amber-900/60',
        barFill: 'bg-amber-400',
        titleText: 'text-amber-50',
        bodyText: 'text-amber-200',
        metaText: 'text-amber-300',
        Icon: BatteryWarning,
        AlertIcon: Zap,
        statusLabel: '⚠ WASPADA — Kuota Setengah Jalan',
        headline: 'Pantau Penggunaan Kredit AI',
        body: `Sudah ${budget.quotaPercentage}% dari total kredit digunakan. Batasi aktivitas AI yang tidak mendesak untuk menghindari kehabisan mendadak.`,
        buttonBg: 'bg-amber-500 hover:bg-amber-400',
        buttonText: 'text-amber-950',
        buttonLabel: 'Cek Penggunaan OpenAI',
        pulseColor: 'bg-amber-500',
      };

  const { Icon, AlertIcon } = config;

  return (
    <div
      className={`w-full border-b ${config.borderColor} ${config.wrapperBg} font-roboto overflow-hidden transition-all duration-300 ease-out ${
        isVisible ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      {/* Accent line di paling atas — seperti sirine darurat */}
      <div className={`w-full h-0.5 ${config.accentLine}`} />

      <div className="w-full px-8 md:px-10 py-4 flex items-start gap-5">

        {/* Ikon Battery + Pulse Animasi */}
        <div className="relative shrink-0 mt-0.5">
          <div
            className={`absolute inset-0 ${config.pulseColor} opacity-30 animate-ping`}
            style={{ borderRadius: 0 }}
          />
          <div className={`relative p-2 ${config.badgeBg}`}>
            <Icon size={22} className={config.iconColor} strokeWidth={2.5} />
          </div>
        </div>

        {/* Konten Utama */}
        <div className="flex-1 min-w-0">
          {/* Badge Status */}
          <span className={`inline-block text-[9px] font-black tracking-widest uppercase px-2 py-0.5 mb-2 ${config.badgeBg} ${config.badgeText}`}>
            {config.statusLabel}
          </span>

          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            {/* Teks Peringatan */}
            <div className="flex-1 space-y-1">
              <h3 className={`text-sm font-black ${config.titleText} flex items-center gap-2`}>
                <AlertIcon size={14} className={config.iconColor} />
                {config.headline}
              </h3>
              <p className={`text-xs font-medium ${config.bodyText} leading-relaxed max-w-2xl`}>
                {config.body}
              </p>
            </div>

            {/* Panel Saldo */}
            <div className="shrink-0 space-y-2 lg:text-right">
              <div className="flex lg:flex-col gap-4 lg:gap-1">
                {remainingUsd !== null && (
                  <div>
                    <span className={`text-[9px] font-bold ${config.metaText} uppercase tracking-widest block`}>Sisa Saldo</span>
                    <span className={`text-xl font-black ${config.titleText} font-mono tracking-tight`}>
                      ${remainingUsd.toFixed(2)}
                    </span>
                    {totalCreditUsd !== null && (
                      <span className={`text-[10px] ${config.metaText} font-medium`}> / ${totalCreditUsd.toFixed(2)} total</span>
                    )}
                  </div>
                )}
                <div>
                  <span className={`text-[9px] font-bold ${config.metaText} uppercase tracking-widest block`}>Sisa (%)</span>
                  <span className={`text-xl font-black ${config.titleText} font-mono tracking-tight`}>
                    {remainingPercent}%
                  </span>
                </div>
              </div>

              {/* Mini Progress Bar */}
              <div className={`w-full lg:w-48 h-1.5 ${config.barBg} overflow-hidden`}>
                <div
                  className={`h-full ${config.barFill} transition-all duration-1000 ease-out`}
                  style={{ width: `${remainingPercent}%` }}
                />
              </div>
              <p className={`text-[9px] ${config.metaText} font-medium`}>
                {remainingPercent}% kredit tersisa dari ${totalCreditUsd?.toFixed(2) ?? '—'}
              </p>
            </div>
          </div>

          {/* Tombol CTA */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href="https://platform.openai.com/account/billing"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-wider ${config.buttonBg} ${config.buttonText} transition-colors duration-150 select-none`}
              style={{ borderRadius: 0 }}
            >
              <ExternalLink size={11} strokeWidth={2.5} />
              {config.buttonLabel}
            </a>
            <a
              href="https://platform.openai.com/usage"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${config.badgeBg} ${config.metaText} hover:opacity-80 transition-opacity duration-150 select-none`}
              style={{ borderRadius: 0 }}
            >
              Lihat Rincian Penggunaan
            </a>
          </div>
        </div>

        {/* Tombol Tutup Notifikasi */}
        <button
          onClick={handleDismiss}
          className={`shrink-0 p-1 ${config.metaText} hover:opacity-60 transition-opacity duration-150 select-none mt-0.5`}
          aria-label="Tutup notifikasi"
          style={{ borderRadius: 0 }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TokenAlertBanner;
