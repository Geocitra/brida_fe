// Jalur: src/modules/auth/views/login.view.tsx

import React, { useState } from 'react';
import {
  FileText,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  LogOut // Tambahkan impor LogOut
} from 'lucide-react';
import { AuthService } from '../../../services/auth.service';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onClose?: () => void; // Tambahkan prop onClose opsional untuk mendukung fleksibilitas reusabilitas
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onClose }) => {
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
      sessionStorage.setItem('brida_user_role', response.data.executive.role);

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
      <div className="w-full max-w-md bg-white border border-slate-300 shadow-2xl rounded-none overflow-hidden relative z-10">

        {/* Tombol Tutup dipindahkan ke sini, diposisikan absolut terhadap pembungkus Card putih */}
        {onClose && (
          <button
            type="button" // Gunakan type="button" agar tidak memicu submit form secara tidak sengaja
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-red-500 p-1.5 transition-colors cursor-pointer z-25 bg-white/80 hover:bg-slate-100"
            title="Tutup"
          >
            <LogOut size={16} />
          </button>
        )}

        <div className="bg-white p-6 border-b border-slate-200 flex items-left justify-left gap-3 relative select-none">
          <FileText size={28} className="text-blue-600 shrink-0" />
          <div className="w-px h-8 bg-slate-300 mx-1" />
          <div className="flex flex-col text-left">
            <h1 className="text-base font-black tracking-tight leading-none text-slate-900 m-0 p-0 flex items-center">
              <span>AKLS</span>
              <span className="text-blue-600 ml-1">Platform</span>
            </h1>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
              Portal Eksekutif
            </span>
          </div>
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#0070c0] hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-colors border border-blue-800 shadow-md cursor-pointer disabled:cursor-not-allowed"
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