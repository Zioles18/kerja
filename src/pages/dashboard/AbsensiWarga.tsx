import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  XCircle,
  Filter,
  Users,
  Check
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

interface Absensi {
  id: string;
  namaKegiatan: string;
  tanggal: string;
  daftarHadir: string;
  status: 'Berlangsung' | 'Selesai';
  createdAt: string;
}

export default function AbsensiWarga() {
  const { user, isReadOnly } = useAuth();
  const [absensi, setAbsensi] = useState<Absensi[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAbsensi, setEditingAbsensi] = useState<Absensi | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [loading, setLoading] = useState(true);

  const [wargaList, setWargaList] = useState<{id: string, nama: string}[]>([]);
  const [nameSearch, setNameSearch] = useState("");

  const [formData, setFormData] = useState({
    namaKegiatan: "",
    tanggal: new Date().toISOString().split('T')[0],
    daftarHadir: "",
    status: "Berlangsung" as Absensi['status']
  });

  const isAdmin = user?.role === 'admin_rt' || user?.role === 'super_admin';

  useEffect(() => {
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "absensi"), orderBy("tanggal", "desc"));
    } else {
      q = query(collection(db, "absensi"), where("adminId", "==", user?.id), orderBy("tanggal", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Absensi[];
      setAbsensi(data);
      setLoading(false);
    });

    let qWarga;
    if (user?.role === 'super_admin') {
      qWarga = query(collection(db, "warga"), orderBy("nama", "asc"));
    } else {
      qWarga = query(collection(db, "warga"), where("adminId", "==", user?.id), orderBy("nama", "asc"));
    }
    const unsubWarga = onSnapshot(qWarga, (snap) => {
      setWargaList(snap.docs.map(doc => ({id: doc.id, nama: doc.data().nama})));
    });

    return () => {
      unsubscribe();
      unsubWarga();
    };
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan data.");
      return;
    }
    try {
      if (editingAbsensi) {
        await updateDoc(doc(db, "absensi", editingAbsensi.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "absensi"), {
          ...formData,
          adminId: user?.id,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving absensi:", error);
      alert("Gagal menyimpan data absensi.");
    }
  };

  const handleEdit = (a: Absensi) => {
    setEditingAbsensi(a);
    setFormData({
      namaKegiatan: a.namaKegiatan,
      tanggal: a.tanggal,
      daftarHadir: a.daftarHadir || "",
      status: a.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus data absensi ini?")) {
      try {
        await deleteDoc(doc(db, "absensi", id));
      } catch (error) {
        console.error("Error deleting absensi:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      namaKegiatan: "",
      tanggal: new Date().toISOString().split('T')[0],
      daftarHadir: "",
      status: "Berlangsung"
    });
    setEditingAbsensi(null);
    setNameSearch("");
  };

  const filteredAbsensi = absensi.filter(a => {
    const matchesSearch = a.namaKegiatan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "Semua" || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses: Absensi['status'][] = ['Berlangsung', 'Selesai'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Absensi Warga</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data kehadiran warga dalam kegiatan Desa Adat</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Tambah Absensi
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama kegiatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all"
          >
            <option value="Semua">Semua Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kegiatan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Daftar Hadir</th>
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
              ) : filteredAbsensi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data absensi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAbsensi.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                          <ClipboardCheck size={20} />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{a.namaKegiatan}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        a.status === 'Berlangsung' 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Users size={16} className="text-slate-400" />
                        <span className="truncate max-w-[200px]">{a.daftarHadir || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
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
                  {editingAbsensi ? "Edit Absensi" : "Tambah Absensi"}
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
                    Nama Kegiatan
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namaKegiatan}
                    onChange={(e) => setFormData({ ...formData, namaKegiatan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Masukkan nama kegiatan"
                  />
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
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Daftar Hadir
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.daftarHadir.split(',').map(n => n.trim()).filter(Boolean).map((nama, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-sm font-medium">
                        {nama}
                        <button 
                          type="button"
                          onClick={() => {
                            const arr = formData.daftarHadir.split(',').map(n => n.trim()).filter(Boolean);
                            arr.splice(idx, 1);
                            setFormData({...formData, daftarHadir: arr.join(', ')});
                          }}
                          className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                        >
                          <XCircle size={14} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                      placeholder="Ketik nama warga untuk mencari..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    
                    {nameSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                        {wargaList.filter(w => w.nama.toLowerCase().includes(nameSearch.toLowerCase())).length > 0 ? (
                           wargaList.filter(w => w.nama.toLowerCase().includes(nameSearch.toLowerCase())).map(w => {
                             const isSelected = formData.daftarHadir.split(',').map(n => n.trim()).filter(Boolean).includes(w.nama);
                             return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                  setNameSearch("");
                                  if (!isSelected) {
                                    const arr = formData.daftarHadir.split(',').map(n => n.trim()).filter(Boolean);
                                    arr.push(w.nama);
                                    setFormData({...formData, daftarHadir: arr.join(', ')});
                                  }
                                }}
                                className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex flex-row items-center justify-between ${isSelected ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
                                disabled={isSelected}
                              >
                                <span className="text-sm font-medium">{w.nama}</span>
                                {isSelected && <Check size={16} className="text-blue-600" />}
                              </button>
                            )
                           })
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500 text-center">Data warga tidak ditemukan</div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Nama akan ditambahkan otomatis dari Data Warga desa Anda.</p>
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
                    {editingAbsensi ? "Simpan Perubahan" : "Tambah Absensi"}
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
