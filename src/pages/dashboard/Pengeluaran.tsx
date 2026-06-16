import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { 
  ArrowUpRight, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  XCircle,
  Filter,
  Calendar
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

interface Pengeluaran {
  id: string;
  jenis: 'Pengeluaran';
  jumlah: number;
  keterangan: string;
  tanggal: string;
  userId: string;
}

export default function Pengeluaran() {
  const { user, isReadOnly } = useAuth();
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<Pengeluaran | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    jumlah: 0,
    keterangan: "",
    tanggal: new Date().toISOString().split('T')[0]
  });

  const isAdmin = user?.role === 'admin_rt' || user?.role === 'super_admin';

  useEffect(() => {
    if (!user) return;
    let q;
    if (user?.role === 'super_admin') {
      q = query(
        collection(db, "keuangan"), 
        where("jenis", "==", "Pengeluaran"),
        orderBy("tanggal", "desc")
      );
    } else {
      q = query(
        collection(db, "keuangan"), 
        where("jenis", "==", "Pengeluaran"),
        where("adminId", "==", user?.id),
        orderBy("tanggal", "desc")
      );
    }
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Pengeluaran[];
      setPengeluaranList(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mencatat pengeluaran.");
      return;
    }
    try {
      if (editingData) {
        await updateDoc(doc(db, "keuangan", editingData.id), {
          jumlah: Number(formData.jumlah),
          keterangan: formData.keterangan,
          tanggal: new Date(formData.tanggal).toISOString(),
        });
      } else {
        await addDoc(collection(db, "keuangan"), {
          jenis: "Pengeluaran",
          jumlah: Number(formData.jumlah),
          keterangan: formData.keterangan,
          tanggal: new Date(formData.tanggal).toISOString(),
          userId: user?.id || "anonymous",
          adminId: user?.id || "anonymous"
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving pengeluaran:", error);
      alert("Gagal menyimpan data pengeluaran.");
    }
  };

  const handleEdit = (item: Pengeluaran) => {
    setEditingData(item);
    setFormData({
      jumlah: item.jumlah,
      keterangan: item.keterangan,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus data pengeluaran ini?")) {
      try {
        await deleteDoc(doc(db, "keuangan", id));
      } catch (error) {
        console.error("Error deleting pengeluaran:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      jumlah: 0,
      keterangan: "",
      tanggal: new Date().toISOString().split('T')[0]
    });
    setEditingData(null);
  };

  const filteredData = pengeluaranList.filter(item => 
    item.keterangan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const totalPengeluaran = pengeluaranList.reduce((sum, item) => sum + Number(item.jumlah), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengeluaran Kas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data pengeluaran kas Desa Adat</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-rose-600/20"
          >
            <Plus size={20} />
            Catat Pengeluaran
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pengeluaran</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalPengeluaran)}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Cari keterangan pengeluaran..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jumlah</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data pengeluaran ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900 dark:text-white">{item.keterangan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-rose-600 dark:text-rose-400">{formatRupiah(item.jumlah)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
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
                ))
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
                  {editingData ? "Edit Pengeluaran" : "Catat Pengeluaran"}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Keterangan
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder="Misal: Pembelian alat kebersihan..."
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
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                  >
                    {editingData ? "Simpan Perubahan" : "Catat Pengeluaran"}
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
