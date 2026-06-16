import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { 
  Archive, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  XCircle,
  Filter,
  FileText,
  ExternalLink
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

interface Arsip {
  id: string;
  judul: string;
  kategori: 'Keuangan' | 'Surat' | 'Laporan' | 'Umum';
  tanggal: string;
  keterangan: string;
  linkFile: string;
  createdAt: string;
}

export default function ArsipDokumen() {
  const { user, isReadOnly } = useAuth();
  const [arsip, setArsip] = useState<Arsip[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArsip, setEditingArsip] = useState<Arsip | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    judul: "",
    kategori: "Umum" as Arsip['kategori'],
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: "",
    linkFile: ""
  });

  const isAdmin = user?.role === 'admin_rt' || user?.role === 'super_admin';

  useEffect(() => {
    if (!user) return;
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "arsip"), orderBy("tanggal", "desc"));
    } else {
      q = query(collection(db, "arsip"), where("adminId", "==", user?.id), orderBy("tanggal", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Arsip[];
      setArsip(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan data.");
      return;
    }
    try {
      if (editingArsip) {
        await updateDoc(doc(db, "arsip", editingArsip.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "arsip"), {
          ...formData,
          adminId: user?.id,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving arsip:", error);
      alert("Gagal menyimpan data arsip.");
    }
  };

  const handleEdit = (a: Arsip) => {
    setEditingArsip(a);
    setFormData({
      judul: a.judul,
      kategori: a.kategori,
      tanggal: a.tanggal,
      keterangan: a.keterangan || "",
      linkFile: a.linkFile || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus arsip ini?")) {
      try {
        await deleteDoc(doc(db, "arsip", id));
      } catch (error) {
        console.error("Error deleting arsip:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      judul: "",
      kategori: "Umum",
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: "",
      linkFile: ""
    });
    setEditingArsip(null);
  };

  const filteredArsip = arsip.filter(a => {
    const matchesSearch = a.judul.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKategori = filterKategori === "Semua" || a.kategori === filterKategori;
    return matchesSearch && matchesKategori;
  });

  const categories: Arsip['kategori'][] = ['Keuangan', 'Surat', 'Laporan', 'Umum'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Arsip Dokumen</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola arsip dan dokumen penting Desa Adat</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Tambah Arsip
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari judul dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all"
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Judul Dokumen</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredArsip.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada arsip ditemukan.
                  </td>
                </tr>
              ) : (
                filteredArsip.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{a.judul}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                        {a.kategori}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{a.keterangan || "-"}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {a.linkFile && (
                          <a
                            href={a.linkFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Buka File"
                          >
                            <ExternalLink size={18} />
                          </a>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEdit(a)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
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
                  {editingArsip ? "Edit Arsip" : "Tambah Arsip"}
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
                    Judul Dokumen
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Masukkan judul dokumen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

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
                    Link File (Opsional)
                  </label>
                  <input
                    type="url"
                    value={formData.linkFile}
                    onChange={(e) => setFormData({ ...formData, linkFile: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="https://drive.google.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Keterangan
                  </label>
                  <textarea
                    rows={3}
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder="Masukkan keterangan tambahan..."
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
                    {editingArsip ? "Simpan Perubahan" : "Tambah Arsip"}
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
