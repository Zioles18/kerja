import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { User, Plus, Eye, X, Home, Calendar, FileText, CreditCard, User as UserIcon, GraduationCap, Phone, MapPin, Edit2, Trash2 } from "lucide-react";
import { handleFirestoreError, OperationType } from "../../utils/errorHandling";
import Modal from "../../components/Modal";
import { motion, AnimatePresence } from "framer-motion";

interface Tamu {
  id: string;
  namaTamu: string;
  nik?: string;
  tujuanRumah: string;
  tanggalMasuk: string;
  tanggalSelesai?: string;
  keterangan: string;
  statusTinggal?: string;
}

interface Warga {
  id: string;
  nama: string;
  nik?: string;
  kk?: string;
  jenisKelamin?: string;
  pendidikan?: string;
  tanggalLahir?: string;
  noHp?: string;
  alamat?: string;
  domisili?: string;
}

export default function DataTamu() {
  const { user, isReadOnly } = useAuth();
  const [tamu, setTamu] = useState<Tamu[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states for Action Add
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newNik, setNewNik] = useState("");
  const [newTujuan, setNewTujuan] = useState("");
  const [newTanggalMasuk, setNewTanggalMasuk] = useState(new Date().toISOString().split('T')[0]);
  const [newTanggalSelesai, setNewTanggalSelesai] = useState("");
  const [newKeterangan, setNewKeterangan] = useState("");
  const [newStatusTinggal, setNewStatusTinggal] = useState("Tinggal Sementara");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // States for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editNik, setEditNik] = useState("");
  const [editTujuan, setEditTujuan] = useState("");
  const [editTanggalMasuk, setEditTanggalMasuk] = useState("");
  const [editTanggalSelesai, setEditTanggalSelesai] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");
  const [editStatusTinggal, setEditStatusTinggal] = useState("Tinggal Sementara");
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);

  // States for Detail Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTamu, setSelectedTamu] = useState<Tamu | null>(null);

  useEffect(() => {
    const pathTamu = "tamu";
    let qTamu;
    if (user?.role === 'super_admin') {
      qTamu = query(collection(db, pathTamu), orderBy("tanggalMasuk", "desc"));
    } else {
      qTamu = query(collection(db, pathTamu), where("adminId", "==", user?.id), orderBy("tanggalMasuk", "desc"));
    }
    const unsubscribeTamu = onSnapshot(qTamu, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Tamu[];
      setTamu(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathTamu);
      setLoading(false);
    });

    const pathWarga = "warga";
    let qWarga;
    if (user?.role === 'super_admin') {
      qWarga = query(collection(db, pathWarga));
    } else {
      qWarga = query(collection(db, pathWarga), where("adminId", "==", user?.id));
    }
    const unsubscribeWarga = onSnapshot(qWarga, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Warga[];
      setWarga(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathWarga);
    });

    return () => {
      unsubscribeTamu();
      unsubscribeWarga();
    };
  }, []);

  const handleAddTamu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menambah data.");
      return;
    }
    try {
      await addDoc(collection(db, "tamu"), {
        namaTamu: newNama,
        nik: newNik,
        tujuanRumah: newTujuan,
        tanggalMasuk: newTanggalMasuk,
        tanggalSelesai: newTanggalSelesai,
        keterangan: newKeterangan,
        statusTinggal: newStatusTinggal,
        adminId: user?.id
      });
      setIsModalOpen(false);
      setNewNama("");
      setNewNik("");
      setNewTujuan("");
      setNewTanggalMasuk(new Date().toISOString().split('T')[0]);
      setNewTanggalSelesai("");
      setNewKeterangan("");
      setNewStatusTinggal("Tinggal Sementara");
    } catch (error) {
      console.error("Error adding tamu:", error);
    }
  };

  const handleEditTamu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengedit data.");
      return;
    }
    if (!editingId) return;
    try {
      await updateDoc(doc(db, "tamu", editingId), {
        namaTamu: editNama,
        nik: editNik,
        tujuanRumah: editTujuan,
        tanggalMasuk: editTanggalMasuk,
        tanggalSelesai: editTanggalSelesai,
        keterangan: editKeterangan,
        statusTinggal: editStatusTinggal
      });
      setIsEditModalOpen(false);
      setEditingId("");
      setEditNama("");
      setEditNik("");
      setEditTujuan("");
      setEditTanggalMasuk("");
      setEditTanggalSelesai("");
      setEditKeterangan("");
      setEditStatusTinggal("Tinggal Sementara");
    } catch (error) {
      console.error("Error updating tamu:", error);
    }
  };

  const handleDeleteTamu = async (id: string, nama: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus catatan kunjungan tamu untuk "${nama}"?`)) {
      try {
        await deleteDoc(doc(db, "tamu", id));
      } catch (error) {
        console.error("Error deleting tamu:", error);
      }
    }
  };

  const openEditModal = (t: Tamu) => {
    setEditingId(t.id);
    setEditNama(t.namaTamu || "");
    setEditNik(t.nik || "");
    setEditTujuan(t.tujuanRumah);
    setEditTanggalMasuk(t.tanggalMasuk ? t.tanggalMasuk.split('T')[0] : "");
    setEditTanggalSelesai(t.tanggalSelesai || "");
    setEditKeterangan(t.keterangan || "");
    setEditStatusTinggal(t.statusTinggal || "Kunjungan Singkat");
    setIsEditModalOpen(true);
  };

  // Stats calculation
  const totalTamu = tamu.length;
  const tinggalTetap = tamu.filter(t => t.statusTinggal === "Tinggal Tetap").length;
  const tinggalSementara = tamu.filter(t => t.statusTinggal === "Tinggal Sementara").length;
  const kunjunganSingkat = tamu.filter(t => t.statusTinggal === "Kunjungan Singkat" || !t.statusTinggal).length;

  // Cek ketersediaan data Warga yang cocok dengan nama tamu yang diklik
  const matchWarga = selectedTamu 
    ? warga.find(w => w.nama.toLowerCase() === selectedTamu.namaTamu.toLowerCase()) 
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Tamu</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Catatan kunjungan tamu masuk dan keluar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-600/20"
          >
            <Plus size={20} /> Tambah Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total Tamu / Kunjungan</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalTamu}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kunjungan Singkat</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{kunjunganSingkat}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tinggal Sementara</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{tinggalSementara}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tinggal Tetap</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{tinggalTetap}</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <th className="px-6 py-4 font-bold uppercase">Nama Tamu</th>
                <th className="px-6 py-4 font-bold uppercase">NIK</th>
                <th className="px-6 py-4 font-bold uppercase">Status Tinggal</th>
                <th className="px-6 py-4 font-bold uppercase">Tujuan (Rumah)</th>
                <th className="px-6 py-4 font-bold uppercase">Periode Tinggal</th>
                <th className="px-6 py-4 font-bold uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                       <p>Memuat Data Tamu...</p>
                    </div>
                  </td>
                </tr>
              ) : tamu.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Belum ada data tamu.
                  </td>
                </tr>
              ) : tamu.map(t => (
                <tr 
                  key={t.id} 
                  onClick={() => {
                    setSelectedTamu(t);
                    setIsDetailModalOpen(true);
                  }}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">{t.namaTamu}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{t.nik || "-"}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      t.statusTinggal === 'Tinggal Tetap' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                      t.statusTinggal === 'Tinggal Sementara' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {t.statusTinggal || 'Kunjungan Singkat'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">{t.tujuanRumah}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <div>{new Date(t.tanggalMasuk).toLocaleDateString('id-ID')}</div>
                    {t.tanggalSelesai && (
                      <div className="text-[10px] text-slate-400">s/d {new Date(t.tanggalSelesai).toLocaleDateString('id-ID')}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTamu(t);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-95 transition-all"
                        title="Lihat Detail"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(t);
                        }}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg active:scale-95 transition-all"
                        title="Edit Tamu"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTamu(t.id, t.namaTamu);
                        }}
                        className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg active:scale-95 transition-all"
                        title="Hapus Kunjungan"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Tamu */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTamu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="text-blue-600" size={24} />
                  Detail Tamu
                </h3>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold text-2xl">
                    {selectedTamu.namaTamu.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedTamu.namaTamu}</h4>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        selectedTamu.statusTinggal === 'Tinggal Tetap' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        selectedTamu.statusTinggal === 'Tinggal Sementara' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {selectedTamu.statusTinggal || 'Kunjungan Singkat'}
                      </span>
                      {matchWarga ? (
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          Terverifikasi di Data Warga
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          Data Belum Terdaftar
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nomor NIK</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <CreditCard size={16} className="text-slate-400" />
                      {selectedTamu.nik || matchWarga?.nik || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nomor KK</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Home size={16} className="text-slate-400" />
                      {matchWarga?.kk || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jenis Kelamin</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <UserIcon size={16} className="text-slate-400" />
                      {matchWarga?.jenisKelamin || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendidikan</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <GraduationCap size={16} className="text-slate-400" />
                      {matchWarga?.pendidikan || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal Lahir</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Calendar size={16} className="text-slate-400" />
                      {matchWarga?.tanggalLahir ? new Date(matchWarga.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No. HP / WhatsApp</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Phone size={16} className="text-slate-400" />
                      {matchWarga?.noHp || "-"}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alamat Asal / Domisili Lengkap</p>
                  <div className="flex gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                    <MapPin size={16} className="text-slate-400 mt-1 shrink-0" />
                    {matchWarga?.alamat || matchWarga?.domisili || "-"}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tujuan (Rumah)</p>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                        <Home size={16} className="text-slate-400" />
                        {selectedTamu.tujuanRumah || "-"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Periode Tinggal</p>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                        <Calendar size={16} className="text-slate-400" />
                        <div>
                          {selectedTamu.tanggalMasuk ? new Date(selectedTamu.tanggalMasuk).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                          {selectedTamu.tanggalSelesai && (
                            <span className="text-slate-400 font-normal ml-2">s/d {new Date(selectedTamu.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
  
                  <div className="space-y-1 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Keterangan / Keperluan</p>
                    <div className="flex gap-2 text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
                      <FileText size={16} className="text-slate-400 mt-1 shrink-0" />
                      {selectedTamu.keterangan || "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Tutup Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Data Tamu">
        <form onSubmit={handleAddTamu} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Tamu</label>
            <input 
              type="text" 
              value={newNama} 
              onChange={(e) => {
                setNewNama(e.target.value);
                setShowSuggestions(true);
              }} 
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              required 
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Cari dari data warga..."
            />
            <AnimatePresence>
              {showSuggestions && newNama && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                >
                  {warga
                    .filter(w => w.nama.toLowerCase().includes(newNama.toLowerCase()))
                    .map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setNewNama(w.nama);
                          setNewNik(w.nik || "");
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-colors flex justify-between"
                      >
                        <span>{w.nama}</span>
                        <span className="text-xs text-slate-500">{w.nik}</span>
                      </button>
                    ))}
                  {warga.filter(w => w.nama.toLowerCase().includes(newNama.toLowerCase())).length === 0 && (
                    <div className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-sm">
                      Nama tidak ditemukan di data warga. Pastikan warga sudah terdaftar terlebih dahulu.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nomor NIK</label>
            <input 
              type="text" 
              value={newNik} 
              onChange={(e) => setNewNik(e.target.value)} 
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Masukkan Nomor NIK tamu..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Masuk</label>
              <input 
                type="date" 
                value={newTanggalMasuk} 
                onChange={(e) => setNewTanggalMasuk(e.target.value)} 
                required 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sampai Dengan (Opsional)</label>
              <input 
                type="date" 
                value={newTanggalSelesai} 
                onChange={(e) => setNewTanggalSelesai(e.target.value)} 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status Tinggal</label>
              <select 
                value={newStatusTinggal}
                onChange={(e) => setNewStatusTinggal(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Kunjungan Singkat">Kunjungan Singkat</option>
                <option value="Tinggal Sementara">Tinggal Sementara</option>
                <option value="Tinggal Tetap">Tinggal Tetap</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tujuan (Rumah)</label>
              <input 
                type="text" 
                value={newTujuan} 
                onChange={(e) => setNewTujuan(e.target.value)} 
                required 
                placeholder="Contoh: Rumah Prajuru Desa Adat"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan / Keperluan</label>
            <textarea 
              rows={3}
              value={newKeterangan} 
              onChange={(e) => setNewKeterangan(e.target.value)} 
              required 
              placeholder="Contoh: Mengantar barang titipan"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-600/20 mt-2">
            Simpan Data Tamu
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Data Tamu">
        <form onSubmit={handleEditTamu} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Tamu</label>
            <input 
              type="text" 
              value={editNama} 
              onChange={(e) => {
                setEditNama(e.target.value);
                setShowEditSuggestions(true);
              }} 
              onFocus={() => setShowEditSuggestions(true)}
              onBlur={() => setTimeout(() => setShowEditSuggestions(false), 200)}
              required 
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Cari dari data warga..."
            />
            <AnimatePresence>
              {showEditSuggestions && editNama && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                >
                  {warga
                    .filter(w => w.nama.toLowerCase().includes(editNama.toLowerCase()))
                    .map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setEditNama(w.nama);
                          setEditNik(w.nik || "");
                          setShowEditSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-colors flex justify-between"
                      >
                        <span>{w.nama}</span>
                        <span className="text-xs text-slate-500">{w.nik}</span>
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nomor NIK</label>
            <input 
              type="text" 
              value={editNik} 
              onChange={(e) => setEditNik(e.target.value)} 
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Masukkan Nomor NIK tamu..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Masuk</label>
              <input 
                type="date" 
                value={editTanggalMasuk} 
                onChange={(e) => setEditTanggalMasuk(e.target.value)} 
                required 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sampai Dengan (Opsional)</label>
              <input 
                type="date" 
                value={editTanggalSelesai} 
                onChange={(e) => setEditTanggalSelesai(e.target.value)} 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status Tinggal</label>
              <select 
                value={editStatusTinggal}
                onChange={(e) => setEditStatusTinggal(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Kunjungan Singkat">Kunjungan Singkat</option>
                <option value="Tinggal Sementara">Tinggal Sementara</option>
                <option value="Tinggal Tetap">Tinggal Tetap</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tujuan (Rumah)</label>
              <input 
                type="text" 
                value={editTujuan} 
                onChange={(e) => setEditTujuan(e.target.value)} 
                required 
                placeholder="Contoh: Rumah Prajuru Desa Adat"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan / Keperluan</label>
            <textarea 
              rows={3}
              value={editKeterangan} 
              onChange={(e) => setEditKeterangan(e.target.value)} 
              required 
              placeholder="Contoh: Mengantar barang titipan"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-600/20 mt-2">
            Simpan Perubahan
          </button>
        </form>
      </Modal>
    </div>
  );
}
