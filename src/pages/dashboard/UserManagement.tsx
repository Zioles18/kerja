import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Trash2, UserCog, User as UserIcon, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

interface UserData {
  id: string;
  nama: string;
  email: string;
  role: string;
  status?: string;
  subscription: string;
  subscriptionStatus: string;             
  createdAt?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      setUsers(usersData.filter(u => u.status !== 'deleted').sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string, email: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus akun.");
      return;
    }
    if (!confirm(`Hapus akun ${email} secara permanen? Akun ini tidak akan bisa mengakses dasbor lagi.`)) return;
    try {
      await updateDoc(doc(db, "users", id), {
        status: 'deleted'
      });
      alert(`Akun ${email} berhasil dihapus dari sistem.`);
    } catch (error) {
      console.error("Delete failed", error);
      alert("Gagal menghapus akun");
    }
  };

  const toggleStatus = async (id: string, currentStatus?: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengubah status akun.");
      return;
    }
    const newStatus = currentStatus === 'nonaktif' ? 'aktif' : 'nonaktif';
    if (!confirm(`Ubah status akun ini menjadi ${newStatus}? Akun yang dinonaktifkan mungkin tidak bisa mengakses sistem sepenuhnya jika diterapkan.`)) return;
    try {
      await updateDoc(doc(db, "users", id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Failed to update status", error);
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
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
          <UserCog size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola akun dan role pengguna sistem</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">Daftar Pengguna Terdaftar</h3>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
              {users.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <th className="px-6 py-4 font-bold">Pengguna</th>
                  <th className="px-6 py-4 font-bold">Role</th>
                  <th className="px-6 py-4 font-bold">Paket</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Memuat data...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Belum ada pengguna</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                            <UserIcon size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{u.nama}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                            {u.status === 'nonaktif' && (
                              <span className="text-[10px] text-rose-500 font-medium">Nonaktif</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'super_admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {u.role === 'admin_rt' ? 'Admin Desa Adat' : u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {u.subscription || '-'}
                        </span>
                        {u.subscriptionStatus && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {u.subscriptionStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.email !== user?.email && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => toggleStatus(u.id, u.status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                u.status === 'nonaktif' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              }`}
                            >
                              {u.status === 'nonaktif' ? 'Aktifkan' : 'Nonaktifkan'}
                            </button>
                            <button 
                              onClick={() => handleDelete(u.id, u.email)}
                              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                              title="Hapus Akun Permanen"
                            >
                              Hapus Akun
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
        </motion.div>
      </div>
    </div>
  );
}
