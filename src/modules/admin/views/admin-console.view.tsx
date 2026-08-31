import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Tag,
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Settings,
} from "lucide-react";
import { AdminService } from "../../../services/admin.service";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

type ActiveTab = "opd" | "category" | "district" | "user" | "settings";

export default function AdminConsoleView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("opd");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [newSuggestion, setNewSuggestion] = useState("");
  const [newAlias, setNewAlias] = useState("");

  // Data States
  const [opds, setOpds] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form Fields
  const [formData, setFormData] = useState<any>({});

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Load Data based on Active Tab
  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === "opd") {
        const data = await AdminService.getOpds();
        setOpds(data);
      } else if (activeTab === "category") {
        const data = await AdminService.getCategories();
        setCategories(data);
      } else if (activeTab === "district") {
        const data = await AdminService.getDistricts();
        setDistricts(data);
      } else if (activeTab === "user") {
        const [userData, opdData] = await Promise.all([
          AdminService.getUsers(),
          AdminService.getOpds(),
        ]);
        setUsers(userData);
        setOpds(opdData); // Cache OPDs for user assignment dropdown
      } else if (activeTab === "settings") {
        const settingData = await AdminService.getSettings();
        setSettings(settingData || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat data master.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedItem(null);
    if (activeTab === "opd") {
      setFormData({ name: "", code: "", headName: "", headPhone: "" });
    } else if (activeTab === "category") {
      setFormData({ name: "", code: "", description: "", analyticalRole: "REFERENCE" });
    } else if (activeTab === "district") {
      setFormData({
        name: "",
        latitude: "",
        longitude: "",
        aliases: "",
        luasWilayah: "",
        jumlahPenduduk: "",
        deskripsi: "",
        batasWilayah: "",
        images: "",
        suggestions: "",
      });
      setNewSuggestion("");
      setNewAlias("");
    } else if (activeTab === "user") {
      setFormData({ nip: "", fullName: "", role: "USER", opdId: "", password: "" });
    }
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalMode("edit");
    setSelectedItem(item);
    if (activeTab === "opd") {
      setFormData({ name: item.name, code: item.code, headName: item.headName || "", headPhone: item.headPhone || "" });
    } else if (activeTab === "category") {
      setFormData({ name: item.name, code: item.code, description: item.description || "", analyticalRole: item.analyticalRole || "REFERENCE" });
    } else if (activeTab === "district") {
      setFormData({
        name: item.name,
        latitude: String(item.latitude),
        longitude: String(item.longitude),
        aliases: Array.isArray(item.aliases) ? item.aliases.join(", ") : "",
        luasWilayah: String(item.luasWilayah || 0),
        jumlahPenduduk: String(item.jumlahPenduduk || 0),
        deskripsi: item.deskripsi || "",
        batasWilayah: item.batasWilayah || "",
        images: Array.isArray(item.images) ? item.images.join(", ") : "",
        suggestions: Array.isArray(item.suggestions) ? item.suggestions.join(", ") : "",
      });
      setNewSuggestion("");
      setNewAlias("");
    } else if (activeTab === "user") {
      setFormData({
        nip: item.nip,
        fullName: item.fullName,
        role: item.role,
        opdId: item.opdId || "",
        password: "", // Left blank for security
      });
    }
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (activeTab === "opd") {
        if (modalMode === "create") {
          await AdminService.createOpd(formData);
          setSuccessMsg("OPD berhasil ditambahkan.");
        } else {
          await AdminService.updateOpd(selectedItem.id, formData);
          setSuccessMsg("OPD berhasil diperbarui.");
        }
      } else if (activeTab === "category") {
        if (modalMode === "create") {
          await AdminService.createCategory(formData);
          setSuccessMsg("Kategori berhasil ditambahkan.");
        } else {
          await AdminService.updateCategory(selectedItem.id, formData);
          setSuccessMsg("Kategori berhasil diperbarui.");
        }
      } else if (activeTab === "district") {
        const payload = {
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          aliases: formData.aliases
            ? formData.aliases.split(",").map((s: string) => s.trim())
            : [],
          luasWilayah: parseFloat(formData.luasWilayah || "0"),
          jumlahPenduduk: parseInt(formData.jumlahPenduduk || "0", 10),
          images: formData.images
            ? formData.images.split(",").map((s: string) => s.trim())
            : [],
          suggestions: formData.suggestions
            ? formData.suggestions.split(",").map((s: string) => s.trim())
            : [],
        };
        if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
          throw new Error("Garis bujur dan lintang harus berupa angka desimal.");
        }
        if (isNaN(payload.luasWilayah)) {
          throw new Error("Luas wilayah harus berupa angka.");
        }
        if (isNaN(payload.jumlahPenduduk)) {
          throw new Error("Jumlah penduduk harus berupa angka bulat.");
        }
        if (modalMode === "create") {
          await AdminService.createDistrict(payload);
          setSuccessMsg("Distrik berhasil ditambahkan.");
        } else {
          await AdminService.updateDistrict(selectedItem.id, payload);
          setSuccessMsg("Distrik berhasil diperbarui.");
        }
      } else if (activeTab === "user") {
        const payload = {
          ...formData,
          opdId: formData.opdId || undefined,
          password: formData.password || undefined,
        };
        if (modalMode === "create") {
          await AdminService.createUser(payload);
          setSuccessMsg("Pengguna baru berhasil dibuat.");
        } else {
          await AdminService.updateUser(selectedItem.id, payload);
          setSuccessMsg("Profil pengguna berhasil diperbarui.");
        }
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data master ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    setErrorMsg(null);
    try {
      if (activeTab === "opd") {
        await AdminService.deleteOpd(id);
        setSuccessMsg("OPD berhasil dihapus.");
      } else if (activeTab === "category") {
        await AdminService.deleteCategory(id);
        setSuccessMsg("Kategori berhasil dihapus.");
      } else if (activeTab === "district") {
        await AdminService.deleteDistrict(id);
        setSuccessMsg("Distrik berhasil dihapus.");
      } else if (activeTab === "user") {
        await AdminService.deleteUser(id);
        setSuccessMsg("Pengguna berhasil dihapus.");
      }
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus data.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 font-roboto p-6 space-y-6">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-slate-300 bg-white p-6 rounded-none gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">Portal Utama Administrator</span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Konsol Manajemen Data Master</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola data dasar wilayah spasial, OPD instansi dinas, klasifikasi kategori, dan pengguna sistem.</p>
        </div>

        {activeTab !== "settings" && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-teal-600 transition-colors cursor-pointer rounded-none self-start sm:self-center uppercase tracking-wider"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Tambah Data</span>
          </button>
        )}
      </div>

      {/* Alert Notification Bar */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-300 text-red-700 text-xs rounded-none">
          <AlertCircle size={16} className="shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs rounded-none">
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs and Table Section (Side-by-Side Grid Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Menu Navigation Sidebar */}
        <div className="flex flex-col border border-slate-300 bg-white rounded-none divide-y divide-slate-200">
          <button
            onClick={() => setActiveTab("opd")}
            className={`flex items-center gap-3 px-5 py-4 text-xs font-bold transition-colors text-left rounded-none cursor-pointer ${
              activeTab === "opd" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Building2 size={16} />
            <span>Master OPD / Dinas</span>
          </button>
          <button
            onClick={() => setActiveTab("category")}
            className={`flex items-center gap-3 px-5 py-4 text-xs font-bold transition-colors text-left rounded-none cursor-pointer ${
              activeTab === "category" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Tag size={16} />
            <span>Kategori &amp; Tipe Laporan</span>
          </button>
          <button
            onClick={() => setActiveTab("district")}
            className={`flex items-center gap-3 px-5 py-4 text-xs font-bold transition-colors text-left rounded-none cursor-pointer ${
              activeTab === "district" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <MapPin size={16} />
            <span>Batas Wilayah Spasial</span>
          </button>
          <button
            onClick={() => setActiveTab("user")}
            className={`flex items-center gap-3 px-5 py-4 text-xs font-bold transition-colors text-left rounded-none cursor-pointer ${
              activeTab === "user" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Users size={16} />
            <span>Hak Akses Pengguna</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 px-5 py-4 text-xs font-bold transition-colors text-left rounded-none cursor-pointer ${
              activeTab === "settings" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Settings size={16} />
            <span>Pengaturan Sistem</span>
          </button>
        </div>

        {/* Dynamic Table Board (Spans 3 Columns) */}
        <div className="lg:col-span-3 border border-slate-300 bg-white rounded-none p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              {activeTab === "opd" && "Daftar Instansi Dinas Resmi (OPD)"}
              {activeTab === "category" && "Daftar Kategori Laporan Daerah"}
              {activeTab === "district" && "Daftar Centroid Wilayah Administrasi"}
              {activeTab === "user" && "Daftar Akun Pengguna Terdaftar"}
              {activeTab === "settings" && "Profil Pimpinan Daerah & Konfigurasi"}
            </h2>
            {loading && <Loader2 size={16} className="text-slate-500 animate-spin" />}
          </div>

          <div className="overflow-x-auto">
            {/* 1. OPD Table */}
            {activeTab === "opd" && (
              <table className="w-full text-[12px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Nama Instansi Dinas</th>
                    <th className="py-2.5 px-3">Kepala OPD</th>
                    <th className="py-2.5 px-3">Nomor WA</th>
                    <th className="py-2.5 px-3 text-center">Pengguna/Dokumen</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {opds.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">Belum ada data dinas OPD terdaftar.</td>
                    </tr>
                  )}
                  {opds.map((opd) => (
                    <tr key={opd.id} className="hover:bg-slate-50/30">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{opd.code}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{opd.name}</td>
                      <td className="py-3 px-3 text-slate-600">{opd.headName || "-"}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{opd.headPhone || "-"}</td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {opd._count?.users ?? 0} Staf / {opd._count?.documents ?? 0} Dok
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(opd)}
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200"
                          title="Ubah Data"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(opd.id)}
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200"
                          title="Hapus Data"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. Category Table */}
            {activeTab === "category" && (
              <table className="w-full text-[12px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                    <th className="py-2.5 px-3">Kode Tipe</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Dokumen</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">Belum ada kategori dokumen.</td>
                    </tr>
                  )}
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/30">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{cat.code}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{cat.name}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={cat.description}>{cat.description || "-"}</td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">{cat._count?.documents ?? 0} Dokumen</td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200"
                          title="Ubah Data"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(cat.id)}
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200"
                          title="Hapus Data"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. District Table */}
            {activeTab === "district" && (
              <table className="w-full text-[12px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                    <th className="py-2.5 px-3">Nama Distrik Resmi</th>
                    <th className="py-2.5 px-3">Bujur (Longitude)</th>
                    <th className="py-2.5 px-3">Lintang (Latitude)</th>
                    <th className="py-2.5 px-3">Kamus Kata Alias AI</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {districts.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">Belum ada distrik spasial.</td>
                    </tr>
                  )}
                  {districts.map((dist) => (
                    <tr key={dist.id} className="hover:bg-slate-50/30">
                      <td className="py-3 px-3 font-semibold text-slate-900">{dist.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{dist.longitude}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{dist.latitude}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={dist.aliases?.join(", ")}>
                        {dist.aliases?.map((a: string) => (
                          <span key={a} className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-bold mr-1">{a}</span>
                        )) || "-"}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(dist)}
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200"
                          title="Ubah Data"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(dist.id)}
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200"
                          title="Hapus Data"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. User Table */}
            {activeTab === "user" && (
              <table className="w-full text-[12px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                    <th className="py-2.5 px-3">Nomor NIP</th>
                    <th className="py-2.5 px-3">Nama Lengkap</th>
                    <th className="py-2.5 px-3">Instansi (OPD)</th>
                    <th className="py-2.5 px-3">Peran Akses</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">Belum ada pengguna terdaftar.</td>
                    </tr>
                  )}
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/30">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{user.nip}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{user.fullName}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {user.opd ? (
                          <span className="font-bold text-slate-800">[{user.opd.code}] {user.opd.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Belum Dipetakan</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-none border ${
                          user.role === "ADMIN" 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : "bg-teal-50 text-teal-700 border-teal-200"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200"
                          title="Ubah Data"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(user.id)}
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200"
                          title="Hapus Data"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6 max-w-xl">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-none">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Profil Kepala Daerah / Bupati</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nama Lengkap Bupati</label>
                      <input
                        type="text"
                        value={settings.find(s => s.key === 'BUPATI_NAME')?.value || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => prev.map(s => s.key === 'BUPATI_NAME' ? { ...s, value: val } : s));
                        }}
                        placeholder="Contoh: Darius Sabon Rain, S.E., M.Ec.Dev. (Pjs)"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-white focus:border-slate-900 outline-none font-semibold text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nomor WhatsApp Bupati</label>
                      <input
                        type="text"
                        value={settings.find(s => s.key === 'BUPATI_PHONE')?.value || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => prev.map(s => s.key === 'BUPATI_PHONE' ? { ...s, value: val } : s));
                        }}
                        placeholder="Contoh: 628123456789"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-white focus:border-slate-900 outline-none font-mono text-slate-700"
                      />
                      <p className="text-[8px] text-slate-400">Gunakan format internasional tanpa tanda + atau spasi (contoh: 628123456789)</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setErrorMsg(null);
                      try {
                        const nameObj = settings.find(s => s.key === 'BUPATI_NAME');
                        const phoneObj = settings.find(s => s.key === 'BUPATI_PHONE');
                        if (nameObj) {
                          await AdminService.updateSetting('BUPATI_NAME', nameObj.value);
                        }
                        if (phoneObj) {
                          // Clean phone number from +, spaces, hyphens
                          const cleanPhone = phoneObj.value.replace(/[^0-9]/g, '');
                          await AdminService.updateSetting('BUPATI_PHONE', cleanPhone);
                        }
                        setSuccessMsg("Konfigurasi sistem berhasil diperbarui.");
                        loadData();
                      } catch (err: any) {
                        setErrorMsg(err.message || "Gagal menyimpan konfigurasi.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-teal-600 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Dynamic Modal Overlay (rounded-none borders) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className={`w-full ${activeTab === 'district' ? 'max-w-2xl' : 'max-w-md'} bg-white border border-slate-300 shadow-2xl rounded-none flex flex-col max-h-[90vh]`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <span className="text-[10px] font-black text-teal-600 uppercase tracking-wider">Form Editor Master</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mt-0.5">
                  {modalMode === "create" ? "Tambah Data Baru" : "Ubah Data Master"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* 1. OPD Input Fields */}
              {activeTab === "opd" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Kode OPD (Singkat)</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Contoh: BAPPEDA"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nama Instansi Dinas Lengkap</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Badan Perencanaan Pembangunan Daerah"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nama Kepala Instansi</label>
                    <input
                      type="text"
                      value={formData.headName || ""}
                      onChange={(e) => setFormData({ ...formData, headName: e.target.value })}
                      placeholder="Contoh: Ir. Yohana Paliling, M.Si."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nomor WA Kepala Instansi</label>
                    <input
                      type="text"
                      value={formData.headPhone || ""}
                      onChange={(e) => setFormData({ ...formData, headPhone: e.target.value })}
                      placeholder="Contoh: 628123456789"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <p className="text-[8px] text-slate-400">Gunakan format kode negara tanpa spasi/tanda hubung, contoh: 628123456789</p>
                  </div>
                </>
              )}

              {/* 2. DocumentCategory Input Fields */}
              {activeTab === "category" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Kode Kategori (Singkat)</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Contoh: RPJMD"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nama Kategori Resmi</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Rencana Pembangunan Jangka Menengah Daerah"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Deskripsi Keterangan</label>
                    <textarea
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Deskripsi instrumen perencanaan dinas..."
                      rows={3}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Peran Analitik AI</label>
                    <select
                      value={formData.analyticalRole || "REFERENCE"}
                      onChange={(e) => setFormData({ ...formData, analyticalRole: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    >
                      <option value="TARGET">🎯 TARGET — Dokumen Target / Sasaran (RPJMD, Renstra, RKPD)</option>
                      <option value="REALIZATION">📊 REALIZATION — Dokumen Realisasi / Capaian (LKPJ, Laporan Dinas)</option>
                      <option value="REFERENCE">📰 REFERENCE — Referensi Umum / Kajian Pendukung</option>
                    </select>
                    <p className="text-[8px] text-slate-400">Menentukan bagaimana AI menggunakan dokumen dalam kategori ini saat analisis kebijakan.</p>
                  </div>
                </>
              )}

              {/* 3. District Input Fields */}
              {activeTab === "district" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nama Distrik Resmi</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Mimika Baru"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Garis Lintang (Latitude)</label>
                      <input
                        type="text"
                        required
                        value={formData.latitude || ""}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="Contoh: -4.5456"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Garis Bujur (Longitude)</label>
                      <input
                        type="text"
                        required
                        value={formData.longitude || ""}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="Contoh: 136.8872"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Luas Wilayah (Km²)</label>
                      <input
                        type="text"
                        value={formData.luasWilayah || ""}
                        onChange={(e) => setFormData({ ...formData, luasWilayah: e.target.value })}
                        placeholder="Contoh: 2216"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Jumlah Penduduk (Jiwa)</label>
                      <input
                        type="text"
                        value={formData.jumlahPenduduk || ""}
                        onChange={(e) => setFormData({ ...formData, jumlahPenduduk: e.target.value })}
                        placeholder="Contoh: 142000"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Batas Administrasi</label>
                    <input
                      type="text"
                      value={formData.batasWilayah || ""}
                      onChange={(e) => setFormData({ ...formData, batasWilayah: e.target.value })}
                      placeholder="Contoh: Utara: Kuala Kencana, Selatan: Wania..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Gambaran Umum / Deskripsi</label>
                    <textarea
                      value={formData.deskripsi || ""}
                      onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                      placeholder="Deskripsi singkat wilayah..."
                      rows={3}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Foto Profil Wilayah / Galeri Distrik</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Render existing images */}
                      {(formData.images ? formData.images.split(",").map((s: string) => s.trim()).filter(Boolean) : []).map((imgUrl: string, idx: number) => (
                        <div key={idx} className="relative group aspect-video border border-slate-200 bg-slate-50 overflow-hidden">
                          <img
                            src={imgUrl}
                            alt={`Galeri ${idx}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = formData.images ? formData.images.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                              const updated = current.filter((_: string, i: number) => i !== idx).join(", ");
                              setFormData({ ...formData, images: updated });
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white hover:bg-red-800 transition-colors opacity-0 group-hover:opacity-100 rounded-none shadow-md cursor-pointer"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                      
                      {/* Upload Trigger Dropzone */}
                      <div className="border border-dashed border-slate-300 hover:border-slate-800 transition-colors relative flex items-center justify-center p-3 aspect-video cursor-pointer bg-slate-50 hover:bg-slate-100/50">
                        {uploadingImage ? (
                          <div className="flex flex-col items-center gap-1 text-slate-500">
                            <Loader2 className="animate-spin text-teal-600 animate-duration-1000" size={16} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Uploading...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-500 text-center">
                            <Plus size={14} />
                            <span className="text-[9px] font-black uppercase tracking-wider">Tambah Foto</span>
                            <span className="text-[7px] text-slate-400">PNG/JPG (Maks 10MB)</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingImage(true);
                            try {
                              const url = await AdminService.uploadDistrictImage(file);
                              const current = formData.images ? formData.images.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                              const updated = current.concat(url).join(", ");
                              setFormData({ ...formData, images: updated });
                            } catch (err: any) {
                              alert(err.message || "Gagal mengunggah foto");
                            } finally {
                              setUploadingImage(false);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Suggestions (Saran Pertanyaan AI) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Saran Pertanyaan AI</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSuggestion}
                        onChange={(e) => setNewSuggestion(e.target.value)}
                        placeholder="Ketik saran pertanyaan baru di sini..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = newSuggestion.trim();
                            if (val) {
                              const current = formData.suggestions ? formData.suggestions.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                              if (!current.includes(val)) {
                                const updated = current.concat(val).join(", ");
                                setFormData({ ...formData, suggestions: updated });
                              }
                              setNewSuggestion("");
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = newSuggestion.trim();
                          if (val) {
                            const current = formData.suggestions ? formData.suggestions.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                            if (!current.includes(val)) {
                              const updated = current.concat(val).join(", ");
                              setFormData({ ...formData, suggestions: updated });
                            }
                            setNewSuggestion("");
                          }
                        }}
                        className="px-4 py-2 bg-slate-900 text-white hover:bg-teal-600 transition-colors text-xs font-bold rounded-none cursor-pointer uppercase tracking-wider text-[10px]"
                      >
                        Tambah
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {(formData.suggestions ? formData.suggestions.split(",").map((s: string) => s.trim()).filter(Boolean) : []).length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic py-0.5">Belum ada saran pertanyaan.</span>
                      ) : (
                        (formData.suggestions ? formData.suggestions.split(",").map((s: string) => s.trim()).filter(Boolean) : []).map((item: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                            {item}
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.suggestions ? formData.suggestions.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                                const updated = current.filter((_: string, i: number) => i !== idx).join(", ");
                                setFormData({ ...formData, suggestions: updated });
                              }}
                              className="text-teal-600 hover:text-teal-900 font-bold cursor-pointer ml-1 text-xs"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Kamus Alias AI */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Kamus Alias AI</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        placeholder="Ketik kata alias baru di sini..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = newAlias.trim();
                            if (val) {
                              const current = formData.aliases ? formData.aliases.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                              if (!current.includes(val)) {
                                const updated = current.concat(val).join(", ");
                                setFormData({ ...formData, aliases: updated });
                              }
                              setNewAlias("");
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = newAlias.trim();
                          if (val) {
                            const current = formData.aliases ? formData.aliases.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                            if (!current.includes(val)) {
                              const updated = current.concat(val).join(", ");
                              setFormData({ ...formData, aliases: updated });
                            }
                            setNewAlias("");
                          }
                        }}
                        className="px-4 py-2 bg-slate-900 text-white hover:bg-teal-600 transition-colors text-xs font-bold rounded-none cursor-pointer uppercase tracking-wider text-[10px]"
                      >
                        Tambah
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 py-1 font-mono">
                      {(formData.aliases ? formData.aliases.split(",").map((s: string) => s.trim()).filter(Boolean) : []).length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic py-0.5 font-sans">Belum ada kata alias.</span>
                      ) : (
                        (formData.aliases ? formData.aliases.split(",").map((s: string) => s.trim()).filter(Boolean) : []).map((item: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold">
                            {item}
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.aliases ? formData.aliases.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                                const updated = current.filter((_: string, i: number) => i !== idx).join(", ");
                                setFormData({ ...formData, aliases: updated });
                              }}
                              className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer ml-1 text-xs"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 4. User Input Fields */}
              {activeTab === "user" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nomor NIP (Akun ID)</label>
                    <input
                      type="text"
                      required
                      disabled={modalMode === "edit"}
                      value={formData.nip || ""}
                      onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                      placeholder="Contoh: 197804122003121002"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nama Lengkap &amp; Gelar</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName || ""}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Contoh: Darius Sabon Rain, S.E., M.Ec.Dev."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Peran Hak Akses</label>
                      <select
                        value={formData.role || "USER"}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none font-bold"
                      >
                        <option value="USER">USER (Staf/Eksekutif)</option>
                        <option value="ADMIN">ADMIN (Administrator)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Instansi Dinas (OPD)</label>
                      <select
                        value={formData.opdId || ""}
                        onChange={(e) => setFormData({ ...formData, opdId: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                      >
                        <option value="">-- Tanpa Dinas OPD --</option>
                        {opds.map((opd) => (
                          <option key={opd.id} value={opd.id}>
                            [{opd.code}] {opd.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Kata Sandi {modalMode === "edit" && "(Kosongkan jika tidak diubah)"}
                    </label>
                    <input
                      type="password"
                      required={modalMode === "create"}
                      value={formData.password || ""}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={modalMode === "create" ? "password123" : "••••••••"}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                </>
              )}

              {/* Action Buttons Frame */}
              <div className="border-t border-slate-200 pt-4 mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer rounded-none border border-slate-200 uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-teal-600 transition-colors cursor-pointer rounded-none uppercase tracking-wider"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
