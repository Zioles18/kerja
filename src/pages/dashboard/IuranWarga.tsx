import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { 
  Coins, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  XCircle,
  Filter,
  Calendar,
  User,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface Iuran {
  id: string;
  namaWarga: string;
  jenisIuran: 'Iuran Bulanan' | 'Iuran Tahunan';
  jumlah: number;
  tanggalBayar: string;
  periode: string;
  keterangan: string;
  createdAt: string;
}

export default function IuranWarga() {
  const { user, isReadOnly } = useAuth();
  const [iuranList, setIuranList] = useState<Iuran[]>([]);
  const [wargaList, setWargaList] = useState<{ id: string; nama: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIuran, setEditingIuran] = useState<Iuran | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenis, setFilterJenis] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    namaWarga: "",
    jenisIuran: "Iuran Bulanan" as Iuran['jenisIuran'],
    jumlah: 0,
    tanggalBayar: new Date().toISOString().split('T')[0],
    periode: "",
    keterangan: ""
  });

  const isAdmin = user?.role === 'admin_rt' || user?.role === 'super_admin';

  useEffect(() => {
    if (!user) return;
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "iuran"), orderBy("tanggalBayar", "desc"));
    } else {
      q = query(collection(db, "iuran"), where("adminId", "==", user?.id), orderBy("tanggalBayar", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Iuran[];
      setIuranList(data);
      setLoading(false);
    });

    let qWarga;
    if (user?.role === 'super_admin') {
      qWarga = query(collection(db, "warga"));
    } else {
      qWarga = query(collection(db, "warga"), where("adminId", "==", user?.id));
    }
    const unsubscribeWarga = onSnapshot(qWarga, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        nama: doc.data().nama as string
      }));
      setWargaList(data);
    });

    return () => {
      unsubscribe();
      unsubscribeWarga();
    };
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan data iuran.");
      return;
    }
    try {
      if (editingIuran) {
        await updateDoc(doc(db, "iuran", editingIuran.id), {
          ...formData,
          jumlah: Number(formData.jumlah),
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "iuran"), {
          ...formData,
          adminId: user?.id,
          jumlah: Number(formData.jumlah),
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving iuran:", error);
      alert("Gagal menyimpan data iuran.");
    }
  };

  const handleEdit = (i: Iuran) => {
    setEditingIuran(i);
    setFormData({
      namaWarga: i.namaWarga,
      jenisIuran: i.jenisIuran,
      jumlah: i.jumlah,
      tanggalBayar: i.tanggalBayar,
      periode: i.periode,
      keterangan: i.keterangan || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus data iuran ini?")) {
      try {
        await deleteDoc(doc(db, "iuran", id));
      } catch (error) {
        console.error("Error deleting iuran:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      namaWarga: "",
      jenisIuran: "Iuran Bulanan",
      jumlah: 0,
      tanggalBayar: new Date().toISOString().split('T')[0],
      periode: "",
      keterangan: ""
    });
    setEditingIuran(null);
    setShowSuggestions(false);
  };

  const filteredIuran = iuranList.filter(i => {
    const matchesSearch = i.namaWarga.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJenis = filterJenis === "Semua" || i.jenisIuran === filterJenis;
    return matchesSearch && matchesJenis;
  });

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // Calculate Statistics
  const chartData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    
    // Sort ascending for chart
    const sortedList = [...iuranList].sort((a, b) => new Date(a.tanggalBayar).getTime() - new Date(b.tanggalBayar).getTime());
    
    sortedList.forEach(iuran => {
      const date = new Date(iuran.tanggalBayar);
      const monthYear = date.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = 0;
      }
      monthlyData[monthYear] += Number(iuran.jumlah);
    });

    return Object.keys(monthlyData).map(key => ({
      name: key,
      total: monthlyData[key]
    }));
  }, [iuranList]);

  const totalIuran = iuranList.reduce((sum, item) => sum + Number(item.jumlah), 0);
  const totalBulanan = iuranList.filter(i => i.jenisIuran === 'Iuran Bulanan').reduce((sum, item) => sum + Number(item.jumlah), 0);
  const totalTahunan = iuranList.filter(i => i.jenisIuran === 'Iuran Tahunan').reduce((sum, item) => sum + Number(item.jumlah), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Iuran Warga</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data iuran bulanan dan tahunan warga</p>
        </div>
        {isAdmin && !isReadOnly && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Tambah Iuran
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Iuran Terkumpul</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalIuran)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Iuran Bulanan</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalBulanan)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Iuran Tahunan</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalTahunan)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama warga..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all"
          >
            <option value="Semua">Semua Jenis Iuran</option>
            <option value="Iuran Bulanan">Iuran Bulanan</option>
            <option value="Iuran Tahunan">Iuran Tahunan</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Warga</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jenis Iuran</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Periode</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal Bayar</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jumlah</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredIuran.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data iuran ditemukan.
                  </td>
                </tr>
              ) : (
                filteredIuran.map((iuran) => (
                  <tr key={iuran.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center shrink-0">
                          <User size={20} />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{iuran.namaWarga}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        iuran.jenisIuran === 'Iuran Bulanan' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {iuran.jenisIuran}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{iuran.periode}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(iuran.tanggalBayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900 dark:text-white">{formatRupiah(iuran.jumlah)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && !isReadOnly && (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditingIuran(iuran);
                                setFormData({
                                  namaWarga: iuran.namaWarga,
                                  jenisIuran: iuran.jenisIuran,
                                  jumlah: Number(iuran.jumlah),
                                  tanggalBayar: iuran.tanggalBayar,
                                  periode: iuran.periode,
                                  keterangan: iuran.keterangan || ""
                                });
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(iuran.id)}
                              className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Statistik Iuran Per Bulan</h2>
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `Rp ${value / 1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [formatRupiah(value), 'Total Iuran']}
                />
                <Bar 
                  dataKey="total" 
                  fill="#2563eb" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-500 dark:text-slate-400">
            Belum ada data statistik untuk ditampilkan.
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingIuran ? "Edit Iuran" : "Tambah Iuran"}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Warga
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namaWarga}
                    onChange={(e) => {
                      setFormData({ ...formData, namaWarga: e.target.value });
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Masukkan nama warga"
                  />
                  <AnimatePresence>
                    {showSuggestions && formData.namaWarga && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                      >
                        {wargaList
                          .filter(w => w.nama.toLowerCase().includes(formData.namaWarga.toLowerCase()))
                          .map((warga) => (
                            <button
                              key={warga.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, namaWarga: warga.nama });
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              {warga.nama}
                            </button>
                          ))}
                        {wargaList.filter(w => w.nama.toLowerCase().includes(formData.namaWarga.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-sm">
                            Nama tidak ditemukan di data warga
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Jenis Iuran
                  </label>
                  <select
                    value={formData.jenisIuran}
                    onChange={(e) => setFormData({ ...formData, jenisIuran: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Iuran Bulanan">Iuran Bulanan</option>
                    <option value="Iuran Tahunan">Iuran Tahunan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Periode
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.periode}
                    onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder={formData.jenisIuran === 'Iuran Bulanan' ? "Misal: Maret 2026" : "Misal: 2026"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Jumlah (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.jumlah}
                    onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal Bayar
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalBayar}
                    onChange={(e) => setFormData({ ...formData, tanggalBayar: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Keterangan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder="Catatan tambahan..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                  >
                    {editingIuran ? "Simpan Perubahan" : "Tambah Iuran"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
