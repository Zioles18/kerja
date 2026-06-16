import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Key, ShieldAlert, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

const ALL_MENUS = [
  "Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus",
  "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga",
  "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan",
  "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu",
  "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Laporan Kegiatan"
];

interface UserData {
  id: string;
  nama: string;
  email: string;
  role: string;
  disabledMenus?: string[];
}

export default function HakAkses() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [disabledMenusTemp, setDisabledMenusTemp] = useState<string[]>([]);
  const { user, isReadOnly } = useAuth();

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as UserData[];
      
      // Only show admins, not super_admins (or show all, but restrict super_admin edits)
      setUsers(usersData.filter(u => u.role !== 'super_admin' && u.id !== user.id));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSelectUser = (u: UserData) => {
    setSelectedUser(u);
    setDisabledMenusTemp(u.disabledMenus || []);
  };

  const toggleMenu = (menu: string) => {
    if (disabledMenusTemp.includes(menu)) {
      setDisabledMenusTemp(disabledMenusTemp.filter(m => m !== menu));
    } else {
      setDisabledMenusTemp([...disabledMenusTemp, menu]);
    }
  };

  const saveAccess = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengubah hak akses.");
      return;
    }
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, "users", selectedUser.id), {
        disabledMenus: disabledMenusTemp
      });
      alert(`Hak akses untuk ${selectedUser.nama} berhasil diperbarui.`);
      setSelectedUser(null);
    } catch (error) {
      console.error("Update failed", error);
      alert("Gagal memperbarui hak akses");
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <ShieldAlert size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Akses Ditolak</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Halaman ini hanya untuk Super Admin</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
          <Key size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hak Akses</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Batasi dan atur fitur yang dapat diakses oleh Admin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* User List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white">Pilih Admin</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-2 custom-scrollbar">
            {loading ? (
              <p className="text-center text-slate-500 text-sm py-4">Memuat data...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-4">Belum ada admin lain</p>
            ) : (
              users.map(u => (
                <div 
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all ${
                    selectedUser?.id === u.id 
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-600' 
                      : 'border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800'
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{u.nama}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{u.email}</p>
                  {u.disabledMenus && u.disabledMenus.length > 0 && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] rounded-full font-medium">
                      {u.disabledMenus.length} Menu Dibatasi
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Feature Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]"
        >
          {selectedUser ? (
            <>
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Pengaturan Fitur: {selectedUser.nama}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hilangkan centang untuk menyembunyikan menu dari admin ini</p>
                </div>
                <button
                  onClick={saveAccess}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                >
                  Simpan Perubahan
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ALL_MENUS.map(menu => {
                    const isDisabled = disabledMenusTemp.includes(menu);
                    return (
                      <div 
                        key={menu}
                        onClick={() => toggleMenu(menu)}
                        className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          !isDisabled 
                            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10' 
                            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 opacity-70'
                        }`}
                      >
                        <span className={`text-sm font-medium ${!isDisabled ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-500 dark:text-slate-400 line-through'}`}>
                          {menu}
                        </span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          !isDisabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                        }`}>
                          {!isDisabled ? <Check size={14} /> : <X size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 dark:text-slate-400">
              <Key size={48} className="mb-4 opacity-50 text-slate-300 dark:text-slate-600" />
              <p>Pilih admin dari daftar di sebelah kiri untuk mengatur hak aksesnya</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
