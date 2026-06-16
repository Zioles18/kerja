import React, { useState, useEffect } from "react";
import { FileText, CheckCircle, XCircle, Download, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase";

interface Surat {
  id: string;
  nama: string;
  nik: string;
  jenis: string;
  keterangan: string;
  status: string;
  tanggal: string;
}

export default function SuratOnline() {
  const [surat, setSurat] = useState<Surat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isReadOnly } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    jenis: "Surat Pengantar Desa Adat",
    keterangan: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "surat"), orderBy("tanggal", "desc"));
    } else {
      q = query(collection(db, "surat"), where("adminId", "==", user?.id), orderBy("tanggal", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Surat[];
      setSurat(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching surat:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengajukan surat.");
      return;
    }
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "surat"), {
        ...formData,
        nama: user?.nama || "Unknown",
        nik: user?.nik || "1234567890",
        adminId: user?.id || "anonymous",
        status: "Pending",
        tanggal: new Date().toISOString()
      });

      await addDoc(collection(db, "notifikasi"), {
        judul: "Pengajuan Surat Baru",
        pesan: `Warga ${user?.nama} mengajukan surat baru: ${formData.jenis}.`,
        tipe: "surat",
        adminId: user?.id || "anonymous",
        timestamp: new Date().toISOString(),
        read: false
      });

      setIsModalOpen(false);
      setFormData({ jenis: "Surat Pengantar Desa Adat", keterangan: "" });
    } catch (error) {
      console.error("Failed to submit", error);
      alert("Terjadi kesalahan saat mengajukan surat");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengubah status surat.");
      return;
    }
    try {
      await updateDoc(doc(db, "surat", id), { status });
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Gagal mengupdate status");
    }
  };

  return (
    <>
      <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengajuan Surat</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola permohonan surat pengantar warga</p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-sm shadow-blue-600/20"
          >
            <Plus size={20} />
            Ajukan Surat
          </button>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 font-medium whitespace-nowrap">Tanggal</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Nama Pemohon</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">NIK</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Jenis Surat</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Memuat data...</td>
                </tr>
              ) : surat.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Belum ada pengajuan surat</td>
                </tr>
              ) : (
                surat.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{new Date(s.tanggal).toLocaleDateString("id-ID")}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">{s.nama}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{s.nik}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{s.jenis}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        s.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                        s.status === 'Ditolak' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.status === 'Pending' && user?.role !== 'Warga' && !isReadOnly && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(s.id, 'Disetujui')}
                              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all active:scale-95" title="Setujui"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(s.id, 'Ditolak')}
                              className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all active:scale-95" title="Tolak"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                        {s.status === 'Disetujui' && (
                          <button className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all active:scale-95" title="Download PDF">
                            <Download size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal Ajukan Surat */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Ajukan Surat
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Jenis Surat</label>
                  <select 
                    value={formData.jenis}
                    onChange={(e) => setFormData({...formData, jenis: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Surat Pengantar Desa Adat">Surat Pengantar Desa Adat</option>
                    <option value="Surat Keterangan Domisili">Surat Keterangan Domisili</option>
                    <option value="Surat Keterangan Tidak Mampu">Surat Keterangan Tidak Mampu</option>
                    <option value="Surat Keterangan Usaha">Surat Keterangan Usaha</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Keterangan / Keperluan</label>
                  <textarea 
                    rows={3}
                    required
                    value={formData.keterangan}
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                    placeholder="Contoh: Untuk keperluan pembuatan KTP"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? "Mengajukan..." : "Ajukan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
