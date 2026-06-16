import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { 
  Receipt, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  XCircle,
  Filter,
  AlertCircle,
  User,
  CheckCircle2,
  Clock
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

interface Tagihan {
  id: string;
  namaWarga: string;
  jenisTagihan: 'Denda' | 'Pepeson' | 'Lainnya';
  jumlah: number;
  tanggalJatuhTempo: string;
  status: 'Belum Lunas' | 'Lunas';
  keterangan: string;
  createdAt: string;
}

export default function TagihanWarga() {
  const { user, isReadOnly } = useAuth();
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [wargaList, setWargaList] = useState<{ id: string; nama: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTagihan, setEditingTagihan] = useState<Tagihan | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenis, setFilterJenis] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    namaWarga: "",
    jenisTagihan: "Denda" as Tagihan['jenisTagihan'],
    jumlah: 0,
    tanggalJatuhTempo: new Date().toISOString().split('T')[0],
    status: "Belum Lunas" as Tagihan['status'],
    keterangan: ""
  });

  const isAdmin = user?.role === 'admin_rt' || user?.role === 'super_admin';

  useEffect(() => {
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "tagihan"), orderBy("tanggalJatuhTempo", "asc"));
    } else {
      q = query(collection(db, "tagihan"), where("adminId", "==", user?.id), orderBy("tanggalJatuhTempo", "asc"));
    }
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Tagihan[];
      setTagihanList(data);
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
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan data tagihan.");
      return;
    }
    try {
      if (editingTagihan) {
        await updateDoc(doc(db, "tagihan", editingTagihan.id), {
          ...formData,
          jumlah: Number(formData.jumlah),
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "tagihan"), {
          ...formData,
          adminId: user?.id,
          jumlah: Number(formData.jumlah),
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving tagihan:", error);
      alert("Gagal menyimpan data tagihan.");
    }
  };

  const handleEdit = (t: Tagihan) => {
    setEditingTagihan(t);
    setFormData({
      namaWarga: t.namaWarga,
      jenisTagihan: t.jenisTagihan,
      jumlah: t.jumlah,
      tanggalJatuhTempo: t.tanggalJatuhTempo,
      status: t.status,
      keterangan: t.keterangan || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus data tagihan ini?")) {
      try {
        await deleteDoc(doc(db, "tagihan", id));
      } catch (error) {
        console.error("Error deleting tagihan:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      namaWarga: "",
      jenisTagihan: "Denda",
      jumlah: 0,
      tanggalJatuhTempo: new Date().toISOString().split('T')[0],
      status: "Belum Lunas",
      keterangan: ""
    });
    setEditingTagihan(null);
    setShowSuggestions(false);
  };

  const filteredTagihan = tagihanList.filter(t => {
    const matchesSearch = t.namaWarga.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJenis = filterJenis === "Semua" || t.jenisTagihan === filterJenis;
    const matchesStatus = filterStatus === "Semua" || t.status === filterStatus;
    return matchesSearch && matchesJenis && matchesStatus;
  });

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // Calculate Statistics
  const totalBelumLunas = tagihanList.filter(t => t.status === 'Belum Lunas').reduce((sum, item) => sum + Number(item.jumlah), 0);
  const totalLunas = tagihanList.filter(t => t.status === 'Lunas').reduce((sum, item) => sum + Number(item.jumlah), 0);
  const totalDenda = tagihanList.filter(t => t.jenisTagihan === 'Denda' && t.status === 'Belum Lunas').reduce((sum, item) => sum + Number(item.jumlah), 0);
  const totalPepeson = tagihanList.filter(t => t.jenisTagihan === 'Pepeson' && t.status === 'Belum Lunas').reduce((sum, item) => sum + Number(item.jumlah), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tagihan Warga</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data tagihan denda, pepeson, dan lainnya</p>
        </div>
        {isAdmin && !isReadOnly && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Tambah Tagihan
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Belum Lunas</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalBelumLunas)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Lunas Lainnya</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalLunas)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Denda Belum Lunas</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalDenda)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pepeson Belum Lunas</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalPepeson)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <option value="Semua">Semua Jenis</option>
            <option value="Denda">Denda</option>
            <option value="Pepeson">Pepeson</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all"
          >
            <option value="Semua">Semua Status</option>
            <option value="Belum Lunas">Belum Lunas</option>
            <option value="Lunas">Lunas</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Warga</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jenis Tagihan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jatuh Tempo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jumlah</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
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
              ) : filteredTagihan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data tagihan ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTagihan.map((t) => {
                  const isOverdue = new Date(t.tanggalJatuhTempo) < new Date() && t.status === 'Belum Lunas';
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center shrink-0">
                            <User size={20} />
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white block">{t.namaWarga}</span>
                            {t.keterangan && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{t.keterangan}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          t.jenisTagihan === 'Denda' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          t.jenisTagihan === 'Pepeson' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {t.jenisTagihan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={isOverdue ? "text-rose-500" : "text-slate-400"} />
                          <span className={`text-sm ${isOverdue ? "text-rose-600 dark:text-rose-400 font-medium" : "text-slate-600 dark:text-slate-400"}`}>
                            {new Date(t.tanggalJatuhTempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 dark:text-white">{formatRupiah(t.jumlah)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          t.status === 'Lunas' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {t.status === 'Lunas' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && !isReadOnly && (
                            <>
                              <button
                                onClick={() => handleEdit(t)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                title="Hapus"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
                  {editingTagihan ? "Edit Tagihan" : "Tambah Tagihan"}
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
                    Jenis Tagihan
                  </label>
                  <select
                    value={formData.jenisTagihan}
                    onChange={(e) => setFormData({ ...formData, jenisTagihan: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Denda">Denda</option>
                    <option value="Pepeson">Pepeson</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
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
                    Tanggal Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalJatuhTempo}
                    onChange={(e) => setFormData({ ...formData, tanggalJatuhTempo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Belum Lunas">Belum Lunas</option>
                    <option value="Lunas">Lunas</option>
                  </select>
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
                    {editingTagihan ? "Simpan Perubahan" : "Tambah Tagihan"}
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
