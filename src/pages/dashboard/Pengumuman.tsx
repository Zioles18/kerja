import React, { useState, useEffect } from "react";
import { Bell, Plus, Trash2, X, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase";

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  tanggal: string;
}

export default function Pengumuman() {
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isReadOnly } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    judul: "",
    isi: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "pengumuman"), orderBy("tanggal", "desc"));
    } else {
      q = query(collection(db, "pengumuman"), where("adminId", "==", user?.id), orderBy("tanggal", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Pengumuman[];
      setPengumuman(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pengumuman:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan pengumuman.");
      return;
    }
    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateDoc(doc(db, "pengumuman", editingId), formData);
      } else {
        await addDoc(collection(db, "pengumuman"), {
          ...formData,
          adminId: user?.id,
          tanggal: new Date().toISOString()
        });

        await addDoc(collection(db, "notifikasi"), {
          adminId: user?.id,
          judul: "Pengumuman Baru",
          pesan: `Admin merilis pengumuman baru: ${formData.judul}.`,
          tipe: "umum",
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      closeModal();
    } catch (error) {
      console.error("Failed to save", error);
      alert("Terjadi kesalahan saat menyimpan pengumuman");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus pengumuman.");
      return;
    }
    if (!window.confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) return;

    try {
      await deleteDoc(doc(db, "pengumuman", id));
    } catch (error) {
      console.error("Failed to delete", error);
      alert("Gagal menghapus pengumuman");
    }
  };

  const openEditModal = (p: Pengumuman) => {
    setFormData({
      judul: p.judul,
      isi: p.isi
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ judul: "", isi: "" });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Informasi dan kegiatan warga Desa Adat</p>
        </div>
        {user?.role !== "Warga" && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-sm shadow-blue-600/20"
          >
            <Plus size={20} />
            Buat Pengumuman
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">Memuat pengumuman...</div>
        ) : pengumuman.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">Belum ada pengumuman</div>
        ) : (
          pengumuman.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative group hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                  <Bell size={24} />
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white pr-0 sm:pr-16">{p.judul}</h3>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-full w-fit">
                      {new Date(p.tanggal).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{p.isi}</p>
                </div>
              </div>
              {user?.role !== "Warga" && (
                <div className="mt-4 sm:mt-0 sm:absolute sm:top-6 sm:right-6 flex justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => openEditModal(p)}
                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all active:scale-95"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all active:scale-95"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Modal Buat/Edit Pengumuman */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingId ? "Edit Pengumuman" : "Buat Pengumuman"}
                </h3>
                <button 
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Judul</label>
                  <input 
                    type="text" 
                    required
                    value={formData.judul}
                    onChange={(e) => setFormData({...formData, judul: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Isi Pengumuman</label>
                  <textarea 
                    rows={6}
                    required
                    value={formData.isi}
                    onChange={(e) => setFormData({...formData, isi: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
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
