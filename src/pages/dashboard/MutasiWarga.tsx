import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, writeBatch, getDoc, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, Search, Calendar, User, ShieldAlert, Clock, Edit2, Trash2, UserMinus, MoreHorizontal } from "lucide-react";

interface Mutasi {
  id: string;
  wargaId: string;
  nama: string;
  nik: string;
  statusLama: string;
  statusBaru: string;
  pindahKe?: string;
  keperluanPindah?: string;
  tanggalPindah?: string;
  tanggalMeninggal?: string;
  timestamp: string;
  operator: string;
  [key: string]: any; 
}

import { useAuth } from "../../hooks/useAuth";

export default function MutasiWarga() {
  const { user, isReadOnly, loading: authLoading } = useAuth();
  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMutation, setEditingMutation] = useState<Mutasi | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Mutasi>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (mutation: Mutasi) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengubah data.");
      return;
    }
    setEditingMutation(mutation);
    setEditFormData({
      statusBaru: mutation.statusBaru,
      pindahKe: mutation.pindahKe || "",
      keperluanPindah: mutation.keperluanPindah || "Lainnya",
      tanggalPindah: mutation.tanggalPindah || "",
      tanggalMeninggal: mutation.tanggalMeninggal || "",
    });
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (authLoading || !user) return;

    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "mutasi_warga"), orderBy("timestamp", "desc"));
    } else {
      q = query(collection(db, "mutasi_warga"), where("adminId", "==", user?.id), orderBy("timestamp", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Mutasi[];
      setMutasi(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching mutasi:", error);
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, "mutasi_warga");
      } catch (e) {
        // Error already logged
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (mutasi: Mutasi) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus data mutasi ini dan mengembalikan warga ke daftar utama dengan status Aktif/sebelumnya?")) return;
    try {
      const batch = writeBatch(db);
      // Hanya hapus baris mutasi yang dipilih (jangan hapus sejarah lainnya)
      batch.delete(doc(db, "mutasi_warga", mutasi.id));
      
      const { id, wargaId, statusLama, statusBaru, timestamp, operator, ...wargaData } = mutasi;
      
      const payload: any = {
        ...wargaData,
        status: statusLama,
        updatedAt: new Date().toISOString()
      };

      if (statusLama === 'Aktif') {
        payload.pindahKe = '';
        payload.keperluanPindah = '';
        payload.tanggalPindah = '';
        payload.tanggalMeninggal = '';
        payload.tanggalStatus = '';
      }

      const wargaRef = doc(db, "warga", mutasi.wargaId);
      // Gunakan set dengan merge agar tidak gagal jika dokumen tidak ada
      batch.set(wargaRef, payload, { merge: true });

      await batch.commit();
      alert("Data mutasi dihapus dan status warga dipulihkan.");
    } catch (error) {
      console.error("Failed to delete", error);
      alert(`Gagal menghapus data: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const filteredMutasi = useMemo(() => {
    // Tampilkan semua riwayat mutasi tanpa dikelompokkan (stacking/tumpuk)
    return mutasi.filter(m => 
      (m.statusBaru === 'Pindah' || m.statusBaru === 'Meninggal' || m.statusBaru === 'Non Aktif') &&
      (m.nama.toLowerCase().includes(search.toLowerCase()) || m.nik.includes(search))
    );
  }, [mutasi, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aktif':
      case 'Penguwot':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Non Aktif':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      case 'Pindah':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Meninggal':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const handleUpdateMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMutation) return;
    setIsSubmitting(true);

    try {
      if (!editingMutation.id || !editingMutation.wargaId) {
        throw new Error("ID Mutasi atau ID Warga tidak valid. Silakan muat ulang halaman.");
      }

      const batch = writeBatch(db);
      const mutationRef = doc(db, "mutasi_warga", editingMutation.id);
      const wargaRef = doc(db, "warga", editingMutation.wargaId);

      const updateData: any = {
        statusBaru: editFormData.statusBaru,
        updatedAt: new Date().toISOString()
      };

      if (editFormData.statusBaru === 'Pindah') {
        updateData.pindahKe = editFormData.pindahKe;
        updateData.keperluanPindah = editFormData.keperluanPindah;
        updateData.tanggalPindah = editFormData.tanggalPindah;
        updateData.tanggalMeninggal = "";
      } else if (editFormData.statusBaru === 'Meninggal') {
        updateData.tanggalMeninggal = editFormData.tanggalMeninggal;
        updateData.pindahKe = "";
        updateData.keperluanPindah = "";
        updateData.tanggalPindah = "";
      } else {
        updateData.pindahKe = "";
        updateData.keperluanPindah = "";
        updateData.tanggalPindah = "";
        updateData.tanggalMeninggal = "";
      }

      batch.update(mutationRef, updateData);

      // Sinkronisasi dengan Data Warga
      const wargaUpdate: any = {
        status: editFormData.statusBaru,
        updatedAt: new Date().toISOString()
      };
      
      if (editFormData.statusBaru === 'Pindah') {
        wargaUpdate.pindahKe = editFormData.pindahKe;
        wargaUpdate.keperluanPindah = editFormData.keperluanPindah;
        wargaUpdate.tanggalStatus = editFormData.tanggalPindah; // Mapping ke field tanggalStatus di Warga
      } else if (editFormData.statusBaru === 'Meninggal') {
        wargaUpdate.tanggalStatus = editFormData.tanggalMeninggal;
      } else {
        wargaUpdate.pindahKe = "";
        wargaUpdate.keperluanPindah = "";
        wargaUpdate.tanggalStatus = ""; 
      }

      // Update data warga (Status tetap tersimpan, tidak dihapus!)
      batch.update(wargaRef, wargaUpdate);
      
      await batch.commit();
      setIsEditModalOpen(false);
      alert("Data mutasi dan warga berhasil diperbarui.");
    } catch (error) {
      console.error("Error updating mutation:", error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Gagal memperbarui data: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mutasi Warga</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Riwayat perubahan status kependudukan warga</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Cari nama atau NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <ArrowRightLeft className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Mutasi Pindah</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredMutasi.filter(m => m.statusBaru === 'Pindah').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Mutasi Meninggal</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredMutasi.filter(m => m.statusBaru === 'Meninggal').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <UserMinus className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Non Aktif</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredMutasi.filter(m => m.statusBaru === 'Non Aktif').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <MoreHorizontal className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Lainnya</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredMutasi.filter(m => m.keperluanPindah === 'Lainnya').length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Waktu</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Warga</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Perubahan Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operator</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data mutasi...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredMutasi.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data mutasi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredMutasi.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                        <Clock size={14} className="text-slate-400" />
                        {new Date(m.timestamp).toLocaleString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                          {m.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{m.nama}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{m.nik}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadge(m.statusLama)}`}>
                          {m.statusLama}
                        </span>
                        <ArrowRightLeft size={12} className="text-slate-400" />
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadge(m.statusBaru)}`}>
                          {m.statusBaru}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {m.statusBaru === 'Pindah' ? (
                        <div className="text-xs space-y-1">
                          <p className="text-slate-700 dark:text-slate-200 font-medium">Ke: {m.pindahKe}</p>
                          <p className="text-slate-500 dark:text-slate-400">Keperluan: {m.keperluanPindah}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Tidak ada keterangan tambahan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <User size={14} className="text-slate-400" />
                        {m.operator}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        {!isReadOnly && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(m)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit Riwayat">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(m)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Hapus Riwayat">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isEditModalOpen && editingMutation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Riwayat Mutasi</h3>
                <p className="text-sm text-slate-500 mt-1">{editingMutation.nama} ({editingMutation.nik})</p>
              </div>

              <form onSubmit={handleUpdateMutation} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status Baru</label>
                  <select 
                    value={editFormData.statusBaru}
                    onChange={(e) => setEditFormData({...editFormData, statusBaru: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non Aktif">Non Aktif</option>
                    <option value="Pindah">Pindah</option>
                    <option value="Meninggal">Meninggal</option>
                  </select>
                </div>

                {editFormData.statusBaru === 'Pindah' && (
                  <div className="space-y-4 pt-2 border-l-4 border-blue-500 pl-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-r-xl py-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pindah Ke</label>
                      <input 
                        type="text" 
                        required
                        value={editFormData.pindahKe}
                        onChange={(e) => setEditFormData({...editFormData, pindahKe: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Keperluan Pindah</label>
                      <select 
                        value={editFormData.keperluanPindah}
                        onChange={(e) => setEditFormData({...editFormData, keperluanPindah: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Kerja">Kerja</option>
                        <option value="Menikah">Menikah</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Pindah</label>
                      <input 
                        type="date" 
                        required
                        value={editFormData.tanggalPindah}
                        onChange={(e) => setEditFormData({...editFormData, tanggalPindah: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {editFormData.statusBaru === 'Meninggal' && (
                  <div className="space-y-1 border-l-4 border-rose-500 pl-4 bg-rose-50/30 dark:bg-rose-900/10 rounded-r-xl py-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Meninggal</label>
                    <input 
                      type="date" 
                      required
                      value={editFormData.tanggalMeninggal}
                      onChange={(e) => setEditFormData({...editFormData, tanggalMeninggal: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {(editFormData.statusBaru === 'Aktif' || editFormData.statusBaru === 'Non Aktif' || editFormData.statusBaru === 'Penguwot') && (
                  <div className="space-y-1 border-l-4 border-emerald-500 pl-4 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-r-xl py-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Perubahan Status</label>
                    <input 
                      type="date" 
                      required
                      value={(editFormData.statusBaru === 'Aktif' || editFormData.statusBaru === 'Penguwot') ? editFormData.tanggalPindah : editFormData.tanggalMeninggal}
                      onChange={(e) => {
                         if (editFormData.statusBaru === 'Aktif' || editFormData.statusBaru === 'Penguwot') setEditFormData({...editFormData, tanggalPindah: e.target.value});
                         else setEditFormData({...editFormData, tanggalMeninggal: e.target.value});
                      }}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
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
