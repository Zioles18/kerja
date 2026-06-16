import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  XCircle,
  Filter,
  MapPin,
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

interface Agenda {
  id: string;
  namaKegiatan: string;
  tanggal: string;
  lokasi: string;
  deskripsi: string;
  status: 'Akan Datang' | 'Berlangsung' | 'Selesai' | 'Dibatalkan';
  createdAt: string;
}

export default function AgendaKegiatan() {
  const { user, isReadOnly } = useAuth();
  const [agenda, setAgenda] = useState<Agenda[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<Agenda | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    namaKegiatan: "",
    tanggal: "",
    lokasi: "",
    deskripsi: "",
    status: "Akan Datang" as Agenda['status']
  });

  const isAdmin = user?.role === 'admin_rt' || user?.role === 'super_admin';

  useEffect(() => {
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "agenda"), orderBy("tanggal", "asc"));
    } else {
      q = query(collection(db, "agenda"), where("adminId", "==", user?.id), orderBy("tanggal", "asc"));
    }
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Agenda[];
      setAgenda(data);
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
      if (editingAgenda) {
        await updateDoc(doc(db, "agenda", editingAgenda.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "agenda"), {
          ...formData,
          adminId: user?.id,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving agenda:", error);
      alert("Gagal menyimpan data agenda.");
    }
  };

  const handleEdit = (a: Agenda) => {
    setEditingAgenda(a);
    setFormData({
      namaKegiatan: a.namaKegiatan,
      tanggal: a.tanggal,
      lokasi: a.lokasi,
      deskripsi: a.deskripsi || "",
      status: a.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus agenda ini?")) {
      try {
        await deleteDoc(doc(db, "agenda", id));
      } catch (error) {
        console.error("Error deleting agenda:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      namaKegiatan: "",
      tanggal: "",
      lokasi: "",
      deskripsi: "",
      status: "Akan Datang"
    });
    setEditingAgenda(null);
  };

  const filteredAgenda = agenda.filter(a => {
    const matchesSearch = a.namaKegiatan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "Semua" || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses: Agenda['status'][] = ['Akan Datang', 'Berlangsung', 'Selesai', 'Dibatalkan'];

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agenda Kegiatan</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola jadwal dan agenda kegiatan Desa Adat</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Tambah Agenda
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data...</p>
            </div>
          </div>
        ) : filteredAgenda.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            Tidak ada agenda ditemukan.
          </div>
        ) : (
          filteredAgenda.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    a.status === 'Akan Datang' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    a.status === 'Berlangsung' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    a.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                  }`}>
                    {a.status}
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(a)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">{a.namaKegiatan}</h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock size={16} className="mt-0.5 shrink-0 text-blue-500" />
                    <span>{formatDateTime(a.tanggal)}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-rose-500" />
                    <span className="line-clamp-2">{a.lokasi}</span>
                  </div>
                </div>

                {a.deskripsi && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {a.deskripsi}
                  </p>
                )}
              </div>
            </motion.div>
          ))
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
                  {editingAgenda ? "Edit Agenda" : "Tambah Agenda"}
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
                    Tanggal & Waktu
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Balai Banjar, Pura, dll."
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
                    Deskripsi
                  </label>
                  <textarea
                    rows={3}
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder="Masukkan deskripsi kegiatan..."
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
                    {editingAgenda ? "Simpan Perubahan" : "Tambah Agenda"}
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
