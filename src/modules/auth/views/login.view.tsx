import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [nip, setNip] = useState('19780412 200312 1 002');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-roboto">
      <div className="w-full max-w-md bg-white border-2 border-slate-700 shadow-2xl rounded-none overflow-hidden">
        {/* Header Branding */}
        <div className="bg-slate-950 p-6 border-b border-slate-800 text-center relative">
          <div className="w-12 h-12 bg-teal-600 border border-teal-400 mx-auto flex items-center justify-center text-white mb-3 rounded-none shadow-md">
            <Shield size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide uppercase">
            Geo Analisis
          </h1>
          <p className="text-xs text-teal-400 font-medium mt-1">
            Portal Eksekutif
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8 bg-slate-50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 tracking-wider">
                NIP / Identitas Eksekutif
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required
                className="w-full bg-white border border-slate-400 px-4 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-teal-600 rounded-none shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 tracking-wider">
                Kata Sandi Otorisasi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white border border-slate-400 px-4 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-teal-600 rounded-none shadow-xs"
              />
            </div>

            <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2 rounded-none">
              <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
              <span>Akses Khusus Terotentikasi Executive</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-colors border border-teal-700 shadow-md"
            >
              <Lock size={16} />
              <span>{isLoading ? 'Memverifikasi Sesi...' : 'Masuk Portal Eksekutif'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-300 text-center">
          <span className="text-[11px] text-slate-500 font-medium">
            Zero-Knowledge Public Policy Engine
          </span>
        </div>
      </div>
    </div>
  );
};
