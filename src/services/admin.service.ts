const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('brida_auth_token');
  const headers = {
    ...(options.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

const formatError = (msg: any, fallback: string): string => {
  if (!msg) return fallback;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return String(msg);
};

export const AdminService = {
  // OPD Management
  async getOpds() {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/opds`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengambil data OPD.'));
    return result.data;
  },
  async createOpd(data: { name: string; code: string; headName?: string; headPhone?: string }) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/opds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal menambah OPD.'));
    return result.data;
  },
  async updateOpd(id: string, data: { name?: string; code?: string; headName?: string; headPhone?: string }) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/opds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengubah OPD.'));
    return result.data;
  },
  async deleteOpd(id: string) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/opds/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal menghapus OPD.'));
    return result;
  },

  // DocumentCategory Management
  async getCategories() {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/categories`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengambil kategori.'));
    return result.data;
  },
  async createCategory(data: { name: string; code: string; description?: string }) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal menambah kategori.'));
    return result.data;
  },
  async updateCategory(id: string, data: { name?: string; code?: string; description?: string }) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengubah kategori.'));
    return result.data;
  },
  async deleteCategory(id: string) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal menghapus kategori.'));
    return result;
  },

  // District Management
  async getDistricts() {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/districts`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengambil distrik.'));
    return result.data;
  },
  async getDistrictsPublic() {
    const res = await fetchWithAuth(`${API_BASE_URL}/districts`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengambil daftar distrik.'));
    return result.data;
  },
  async getDistrictDetail(id: string) {
    const res = await fetchWithAuth(`${API_BASE_URL}/districts/${id}`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengambil detail distrik.'));
    return result.data;
  },
  async createDistrict(data: {
    name: string;
    latitude: number;
    longitude: number;
    aliases?: string[];
    luasWilayah?: number;
    jumlahPenduduk?: number;
    deskripsi?: string;
    batasWilayah?: string;
    images?: string[];
    suggestions?: string[];
  }) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/districts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal menambah distrik.'));
    return result.data;
  },
  async updateDistrict(
    id: string,
    data: {
      name?: string;
      latitude?: number;
      longitude?: number;
      aliases?: string[];
      luasWilayah?: number;
      jumlahPenduduk?: number;
      deskripsi?: string;
      batasWilayah?: string;
      images?: string[];
      suggestions?: string[];
    },
  ) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/districts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengubah distrik.'));
    return result.data;
  },
  async deleteDistrict(id: string) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/districts/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal menghapus distrik.'));
    return result;
  },

  // User Management
  async getUsers() {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/users`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengambil pengguna.'));
    return result.data;
  },
  async createUser(data: { nip: string; fullName: string; role: 'ADMIN' | 'USER'; opdId?: string; password?: string }) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal menambah pengguna.'));
    return result.data;
  },
  async updateUser(id: string, data: { fullName?: string; role?: 'ADMIN' | 'USER'; opdId?: string | null; password?: string }) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengubah pengguna.'));
    return result.data;
  },
  async deleteUser(id: string) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal menghapus pengguna.'));
    return result;
  },
  async uploadDistrictImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetchWithAuth(`${API_BASE_URL}/admin/districts/upload-media`, {
      method: 'POST',
      body: formData,
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengunggah gambar.'));
    return result.data.url;
  },
  // System Settings Management
  async getSettings() {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/settings`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengambil konfigurasi sistem.'));
    return result.data;
  },
  async getPublicSettings() {
    const res = await fetch(`${API_BASE_URL}/admin/settings/public`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengambil konfigurasi publik.'));
    return result.data;
  },
  async updateSetting(key: string, value: string) {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(formatError(result.message, 'Gagal mengubah konfigurasi.'));
    return result.data;
  },
};
