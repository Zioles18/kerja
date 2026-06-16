import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { MessageSquare, Plus, Edit2, Trash2, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

interface TestimoniData {
  id: string;
  name: string;
  role: string;
  text: string;
}

export default function TestimoniManagement() {
  const [testimonials, setTestimonials] = useState<TestimoniData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    text: ""
  });

  const { user, isReadOnly } = useAuth();

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "testimonials"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as TestimoniData[];
      setTestimonials(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenModal = (testi?: TestimoniData) => {
    if (testi) {
      setEditingId(testi.id);
      setFormData({ name: testi.name, role: testi.role, text: testi.text });
    } else {
      setEditingId(null);
      setFormData({ name: "", role: "", text: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", role: "", text: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan testimoni.");
      return;
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, "testimonials", editingId), {
          ...formData
        });
      } else {
        await addDoc(collection(db, "testimonials"), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving testimonial", error);
      alert("Gagal menyimpan testimoni.");
    }
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus testimoni.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus testimoni ini?")) {
      try {
        await deleteDoc(doc(db, "testimonials", id));
      } catch (error) {
        console.error("Error deleting testimonial", error);
        alert("Gagal menghapus testimoni.");
      }
    }
  };

  if (user?.role !== 'super_admin' && user?.role !== 'demo') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Akses Ditolak</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Halaman ini hanya untuk Super Admin</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Testimoni</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola testimoni yang tampil di Halaman Depan</p>
          </div>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={20} />
            Tambah Testimoni
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10 text-slate-500">Memuat data...</div>
        ) : testimonials.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-800 rounded-3xl p-10 text-center border border-slate-100 dark:border-slate-700">
            <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Belum ada testimoni. Tambahkan testimoni agar muncul di Halaman Depan.</p>
          </div>
        ) : (
          testimonials.map((testi) => (
            <motion.div
              key={testi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex text-amber-400">
                  {"★★★★★"}
                </div>
                      {!isReadOnly && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenModal(testi)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(testi.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-6 flex-1 italic">"{testi.text}"</p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                  {testi.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{testi.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{testi.role}</p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingId ? "Edit Testimoni" : "Tambah Testimoni Baru"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Panjang</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Contoh: Bapak Ahmad"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Jabatan / Peran</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    placeholder="Contoh: Bandesa Adat"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pesan Testimoni</label>
                  <textarea
                    required
                    value={formData.text}
                    onChange={(e) => setFormData({...formData, text: e.target.value})}
                    placeholder="Contoh: Aplikasi ini sangat membantu kami mengelola..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all resize-none"
                  ></textarea>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Simpan Testimoni
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
