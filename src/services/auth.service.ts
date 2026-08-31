const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    executive: {
      nip: string;
      fullName: string;
      role: 'ADMIN' | 'USER';
    };
  };
}

export const AuthService = {
  async login(nip: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nip, password }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMsg = result?.message || 'Gagal masuk. Periksa kembali NIP dan Kata Sandi Anda.';
      throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
    }

    return result;
  },
};