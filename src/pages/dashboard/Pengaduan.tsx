import React, { useState, useEffect } from "react";
import { MessageSquare, Plus, CheckCircle, XCircle, X, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, where } from "firebase/firestore";
import { db } from "../../firebase";

interface Pengaduan {
  id: string;
  judul: string;
  deskripsi: string;
  status: string;
  tanggal: string;
  pelapor?: string;
  tanggapan?: string;
  targetWargaId?: string;
}

export default function Pengaduan() {
  const [pengaduan, setPengaduan] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isReadOnly } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPengaduan, setEditingPengaduan] = useState<Pengaduan | null>(null);
  const [formData, setFormData] = useState({
    judul: "",
    deskripsi: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply Modal States
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!user) return;
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "pengaduan"), orderBy("tanggal", "desc"));
    } else {
      q = query(collection(db, "pengaduan"), where("adminId", "==", user?.id), orderBy("tanggal", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Pengaduan[];
      setPengaduan(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pengaduan:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk membuat pengaduan.");
      return;
    }
    setIsSubmitting(true);

    try {
      if (editingPengaduan) {
        await updateDoc(doc(db, "pengaduan", editingPengaduan.id), {
          ...formData,
        });
        setIsModalOpen(false);
        setEditingPengaduan(null);
        setFormData({ judul: "", deskripsi: "" });
      } else {
        await addDoc(collection(db, "pengaduan"), {
          ...formData,
          adminId: user?.id,
          pelapor: user?.nama || "Warga",
          status: "Menunggu",
          tanggal: new Date().toISOString()
        });

        await addDoc(collection(db, "notifikasi"), {
          adminId: user?.id,
          judul: "Pengaduan Baru",
          pesan: `Warga ${user?.nama} membuat pengaduan baru: ${formData.judul}.`,
          tipe: "pengaduan",
          timestamp: new Date().toISOString(),
          read: false
        });

        const operatorPhone = "6282145612226"; 
        const message = `Halo Admin, saya ${user?.nama} ingin membuat pengaduan.\n\nJudul: ${formData.judul}\nDeskripsi: ${formData.deskripsi}\n\nMohon segera ditindaklanjuti. Terima kasih.`;
        const waUrl = `https://wa.me/${operatorPhone}?text=${encodeURIComponent(message)}`;
        
        window.open(waUrl, '_blank');

        setIsModalOpen(false);
        setFormData({ judul: "", deskripsi: "" });
      }
    } catch (error) {
      console.error("Failed to save", error);
      alert("Terjadi kesalahan saat menyimpan pengaduan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengubah status.");
      return;
    }
    try {
      await updateDoc(doc(db, "pengaduan", id), { status });
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Gagal mengupdate status");
    }
  };

  const handleEdit = (p: Pengaduan) => {
    setEditingPengaduan(p);
    setFormData({ judul: p.judul, deskripsi: p.deskripsi });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus pengaduan ini?")) {
      try {
        await deleteDoc(doc(db, "pengaduan", id));
      } catch (error) {
        console.error("Failed to delete", error);
        alert("Gagal menghapus pengaduan");
      }
    }
  };

  const handleApproveEdit = async (pengaduanId: string, targetWargaId: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk memberikan persetujuan.");
      return;
    }
    try {
      // 1. Update Warga
      await updateDoc(doc(db, "warga", targetWargaId), { editApproved: true });

      // 2. Update Pengaduan
      await updateDoc(doc(db, "pengaduan", pengaduanId), {
        status: "Selesai", 
        tanggapan: "Permintaan edit diizinkan. Silakan edit data Anda di menu Data Warga." 
      });

      alert("Izin edit berhasil diberikan");
    } catch (error) {
      console.error("Failed to approve edit", error);
      alert("Terjadi kesalahan saat memberikan izin edit");
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk memberikan tanggapan.");
      return;
    }
    setIsSubmitting(true);

    try {
      if (!replyingId) return;
      await updateDoc(doc(db, "pengaduan", replyingId), {
        status: "Selesai",
        tanggapan: replyText
      });

      setIsReplyModalOpen(false);
      setReplyText("");
      setReplyingId(null);
    } catch (error) {
      console.error("Failed to send reply", error);
      alert("Terjadi kesalahan saat mengirim tanggapan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaduan Warga</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola laporan dan masalah lingkungan</p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => {
              setEditingPengaduan(null);
              setFormData({ judul: "", deskripsi: "" });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-sm shadow-blue-600/20"
          >
            <Plus size={20} />
            Buat Pengaduan
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">Memuat pengaduan...</div>
        ) : pengaduan.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">Belum ada pengaduan</div>
        ) : (
          pengaduan.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative group hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquare size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white pr-4">{p.judul}</h3>
                    <div className="flex items-center gap-2">
                      {(user?.role === 'super_admin' || user?.role === 'admin_rt') && !isReadOnly && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                          <button onClick={() => handleEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg" title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                        p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                        p.status === 'Ditolak' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{p.deskripsi}</p>
                  
                  {p.tanggapan && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                      <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">Tanggapan Desa Adat/Admin:</p>
                      <p className="text-sm text-blue-900 dark:text-blue-200">{p.tanggapan}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      Oleh: {p.pelapor || 'Warga'} • {new Date(p.tanggal).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {p.status === 'Menunggu' && user?.role !== 'Warga' && !isReadOnly && (
                      <div className="flex items-center gap-2 flex-wrap justify-end mt-2 sm:mt-0">
                        {p.targetWargaId && (
                          <button 
                            onClick={() => handleApproveEdit(p.id, p.targetWargaId!)}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-1"
                          >
                            <CheckCircle size={16} /> Izinkan Edit
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setReplyingId(p.id);
                            setIsReplyModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-1"
                        >
                          <CheckCircle size={16} /> Tanggapi
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(p.id, 'Ditolak')}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-1"
                        >
                          <XCircle size={16} /> Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal Buat Pengaduan */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setEditingPengaduan(null);
                setFormData({ judul: "", deskripsi: "" });
              }}
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
                  {editingPengaduan ? "Edit Pengadu an" : "Buat Pengaduan"}
                </h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPengaduan(null);
                    setFormData({ judul: "", deskripsi: "" });
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Judul Pengaduan</label>
                  <input 
                    type="text" 
                    required
                    value={formData.judul}
                    onChange={(e) => setFormData({...formData, judul: e.target.value})}
                    placeholder="Contoh: Lampu jalan mati"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi</label>
                  <textarea 
                    rows={6}
                    required
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    placeholder="Jelaskan detail masalah yang Anda alami..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingPengaduan(null);
                      setFormData({ judul: "", deskripsi: "" });
                    }}
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? "Menyimpan..." : editingPengaduan ? "Simpan Perubahan" : "Kirim Pengaduan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Tanggapan */}
      <AnimatePresence>
        {isReplyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReplyModalOpen(false)}
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
                  Beri Tanggapan
                </h3>
                <button 
                  onClick={() => setIsReplyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleReplySubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Isi Tanggapan</label>
                  <textarea 
                    rows={5}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tuliskan tanggapan atau solusi untuk pengaduan ini..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                  <button 
                    type="button"
                    onClick={() => setIsReplyModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? "Mengirim..." : "Kirim Tanggapan"}
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
