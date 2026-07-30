import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AuthService } from '../../../services/auth.service';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [nip, setNip] = useState('197804122003121002');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await AuthService.login(nip, password);

      sessionStorage.setItem('brida_auth_token', response.data.accessToken);
      sessionStorage.setItem('brida_executive_name', response.data.executive.fullName);

      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menghubungi server autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-roboto relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/login-bg.png')` }}
    >
      { }
      <div className="absolute inset-0 bg-slate-950/20" />

      { }
      <div className="w-full max-w-md bg-white border border-slate-700 shadow-2xl rounded-none overflow-hidden relative z-10">
        <div className="bg-slate-950 p-6 border-b border-slate-800 text-center relative">
          <div className="w-12 h-12 bg-teal-600 border border-teal-400 mx-auto flex items-center justify-center text-white mb-3 rounded-none shadow-md">
            <Shield size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide uppercase">
            AKLS
          </h1>
          <p className="text-xs text-teal-400 font-medium mt-1">
            Portal Eksekutif
          </p>
        </div>

        <div className="p-8 bg-slate-50">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 rounded-none">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

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
                className="w-full bg-white border border-slate-400 px-4 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-teal-600 rounded-none shadow-xs font-mono"
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
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold text-sm uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-colors border border-teal-700 shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memverifikasi Sesi...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Masuk Portal Eksekutif</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="px-6 py-3 bg-slate-100 border-t border-slate-300 text-center">
          <span className="text-[11px] text-slate-500 font-medium">
            Zero-Knowledge Public Policy Engine
          </span>
        </div>
      </div>
    </div>
  );
};