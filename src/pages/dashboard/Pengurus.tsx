import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { 
  UserCog, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  Filter
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

interface Pengurus {
  id: string;
  nama: string;
  jabatan: string;
  status: 'Aktif' | 'Non Aktif';
  periode?: string;
  createdAt: string;
  updatedAt?: string;
  nik?: string;
  jenisKelamin?: string;
}

export default function Pengurus() {
  const { user, isReadOnly } = useAuth();
  const [pengurus, setPengurus] = useState<Pengurus[]>([]);
  const [wargaList, setWargaList] = useState<{ id: string; nama: string; nik: string; jenisKelamin: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPengurus, setEditingPengurus] = useState<Pengurus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    nama: "",
    jabatan: "Bandesa Adat",
    status: "Aktif" as Pengurus['status'],
    periode: "",
    nik: "",
    jenisKelamin: "Laki-laki"
  });

  useEffect(() => {
    if (!user) return;
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "pengurus"), orderBy("createdAt", "desc"));
    } else {
      q = query(collection(db, "pengurus"), where("adminId", "==", user?.id), orderBy("createdAt", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Pengurus[];
      setPengurus(data);
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
        nama: doc.data().nama as string,
        nik: (doc.data().nik as string) || "-",
        jenisKelamin: (doc.data().jenisKelamin as string) || "Laki-laki"
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
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan data.");
      return;
    }
    try {
      if (editingPengurus) {
        await updateDoc(doc(db, "pengurus", editingPengurus.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "pengurus"), {
          ...formData,
          adminId: user?.id,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving pengurus:", error);
      alert("Gagal menyimpan data pengurus.");
    }
  };

  const handleEdit = (p: Pengurus) => {
    setEditingPengurus(p);
    setFormData({
      nama: p.nama,
      jabatan: p.jabatan,
      status: p.status,
      periode: p.periode || "",
      nik: p.nik || "",
      jenisKelamin: p.jenisKelamin || "Laki-laki"
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus data pengurus "${nama}"?`)) {
      try {
        await deleteDoc(doc(db, "pengurus", id));
      } catch (error) {
        console.error("Error deleting pengurus:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nama: "",
      jabatan: "Bandesa Adat",
      status: "Aktif",
      periode: "",
      nik: "",
      jenisKelamin: "Laki-laki"
    });
    setEditingPengurus(null);
    setShowSuggestions(false);
  };

  const filteredPengurus = pengurus.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJabatan = filterJabatan === "Semua" || p.jabatan === filterJabatan;
    return matchesSearch && matchesJabatan;
  });

  const defaultJabatans = [
    'Bandesa Adat', 'Petajuh', 'Penyarikan', 'Petengen',
    'Kerta Desa', 'Saba Desa', 'Pemangku', 'Pecalang',
    'Linmas', 'Bakamda', 'Serati', 'Hansip', 'Sipandu beradat'
  ];
  const existingJabatans: string[] = Array.from(new Set(pengurus.map(p => p.jabatan)));
  const jabatans: string[] = Array.from(new Set([...defaultJabatans, ...existingJabatans]));

  const getActivePengurus = (jabatan: string) => {
    return pengurus.filter(p => p.jabatan === jabatan && p.status === 'Aktif');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Pengurus</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data pengurus Desa Adat</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
        >
          <Plus size={20} />
          Tambah Pengurus
        </button>
      </div>

      {/* Core Management Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {jabatans.map((jabatan) => {
          const actives = getActivePengurus(jabatan);
          const active = actives.length > 0 ? actives[0] : null; // Show first active or none if 0
          
          return (
            <motion.div
              key={jabatan}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setFilterJabatan(filterJabatan === jabatan ? "Semua" : jabatan)}
              className={`p-5 rounded-2xl border shadow-sm cursor-pointer transition-all active:scale-95 ${
                filterJabatan === jabatan 
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 ring-2 ring-blue-500/50' 
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700'
              }`}
            >
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">{jabatan}</p>
              {actives.length > 0 ? (
                <div>
                  <h3 className="text-sm lg:text-md xl:text-lg font-bold text-slate-900 dark:text-white truncate">
                    {actives.length === 1 ? active!.nama : `${actives.length} Orang Aktif`}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-medium">Aktif</span>
                    {actives.length === 1 && active!.periode && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full ml-1 truncate max-w-full">
                        Periode: {active!.periode}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm lg:text-md xl:text-lg font-bold text-slate-400 dark:text-slate-500 italic">Belum Diisi</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-slate-400 dark:text-slate-500">
                    <XCircle size={14} />
                    <span className="text-xs font-medium">Kosong</span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama pengurus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={filterJabatan}
            onChange={(e) => setFilterJabatan(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all"
          >
            <option value="Semua">Semua Jabatan</option>
            {jabatans.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NIK</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jenis Kelamin</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jabatan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Periode</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPengurus.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data pengurus ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPengurus.map((p) => {
                  const wargaMatch = wargaList.find(w => w.nama === p.nama);
                  const nik = p.nik || (wargaMatch ? wargaMatch.nik : "-");
                  const jenisKelamin = p.jenisKelamin || (wargaMatch ? wargaMatch.jenisKelamin : "-");
                  
                  return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                          {p.nama.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{p.nama}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{nik}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{jenisKelamin}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{p.jabatan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{p.periode || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.status === 'Aktif' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
                      }`}>
                        {p.status === 'Aktif' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nama)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
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
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingPengurus ? "Edit Pengurus" : "Tambah Pengurus"}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar p-6 space-y-4">
                <form id="pengurus-form" onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nama}
                      onChange={(e) => {
                        setFormData({ ...formData, nama: e.target.value });
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Masukkan nama lengkap"
                    />
                    <AnimatePresence>
                      {showSuggestions && formData.nama && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                        >
                          {wargaList
                            .filter(w => w.nama.toLowerCase().includes(formData.nama.toLowerCase()))
                            .map((warga) => (
                              <button
                                key={warga.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ 
                                    ...formData, 
                                    nama: warga.nama,
                                    nik: warga.nik !== "-" ? warga.nik : formData.nik,
                                    jenisKelamin: warga.jenisKelamin !== "-" ? warga.jenisKelamin : formData.jenisKelamin
                                  });
                                  setShowSuggestions(false);
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-colors"
                              >
                                {warga.nama}
                              </button>
                            ))}
                          {wargaList.filter(w => w.nama.toLowerCase().includes(formData.nama.toLowerCase())).length === 0 && (
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
                      Jabatan
                    </label>
                    <input
                      list="jabatan-list"
                      type="text"
                      required
                      value={formData.jabatan}
                      onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Pilih atau ketik jabatan baru..."
                    />
                    <datalist id="jabatan-list">
                      {jabatans.map(j => <option key={j} value={j} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Periode Kepengurusan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.periode}
                      onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Contoh: 2024 - 2029"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Status
                    </label>
                    <div className="flex gap-4">
                      {['Aktif', 'Non Aktif'].map((s) => (
                        <label key={s} className="flex-1 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value={s}
                            checked={formData.status === s}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            className="sr-only peer"
                          />
                          <div className="p-3 text-center rounded-xl border border-slate-200 dark:border-slate-700 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 peer-checked:text-blue-600 dark:peer-checked:text-blue-400 transition-all">
                            <span className="text-sm font-medium">{s}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Jenis Kelamin
                    </label>
                    <div className="flex gap-4">
                      {['Laki-laki', 'Perempuan'].map((jk) => (
                        <label key={jk} className="flex-1 cursor-pointer">
                          <input
                            type="radio"
                            name="jenisKelamin"
                            value={jk}
                            checked={formData.jenisKelamin === jk}
                            onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value })}
                            className="sr-only peer"
                          />
                          <div className="p-3 text-center rounded-xl border border-slate-200 dark:border-slate-700 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 peer-checked:text-blue-600 dark:peer-checked:text-blue-400 transition-all">
                            <span className="text-sm font-medium">{jk}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3 bg-white dark:bg-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="pengurus-form"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  {editingPengurus ? "Simpan" : "Tambah"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
