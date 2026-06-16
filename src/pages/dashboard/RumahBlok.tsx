import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  where
} from "firebase/firestore";
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

import { useAuth } from "../../hooks/useAuth";
import { 
  Home, 
  Search, 
  Trash2, 
  MapPin,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { motion } from "framer-motion";

interface RumahBlok {
  id: string;
  alamat: string;
  penghuni?: string;
  status: "Dihuni" | "Kosong";
  updatedAt: string;
}

export default function RumahBlok() {
  const { user, isReadOnly } = useAuth();
  const [rumahList, setRumahList] = useState<RumahBlok[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) return;

    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "rumah_blok"), orderBy("updatedAt", "desc"));
    } else {
      q = query(collection(db, "rumah_blok"), where("adminId", "==", user?.id), orderBy("updatedAt", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as RumahBlok[];
      setRumahList(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching Rumah:", error);
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, "rumah_blok");
      } catch (e) {
        // Error already logged
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus data Rumah/Blok ini?")) {
      try {
        await deleteDoc(doc(db, "rumah_blok", id));
      } catch (error) {
        console.error("Error deleting Rumah:", error);
        alert("Gagal menghapus data");
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengubah status.");
      return;
    }
    try {
      const newStatus = currentStatus === "Dihuni" ? "Kosong" : "Dihuni";
      await updateDoc(doc(db, "rumah_blok", id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredRumah = rumahList.filter(rumah => 
    rumah.alamat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rumah.penghuni && rumah.penghuni.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Home className="w-8 h-8 text-emerald-600" />
            Data Rumah / Blok
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Manajemen data rumah dan blok pemukiman</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <Home className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Rumah</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{rumahList.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dihuni</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{rumahList.filter(r => r.status === "Dihuni").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <XCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kosong</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{rumahList.filter(r => r.status === "Kosong").length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Alamat..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Alamat</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Terakhir Update</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">Loading data...</td>
                </tr>
              ) : filteredRumah.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">Tidak ada data ditemukan</td>
                </tr>
              ) : (
                filteredRumah.map((rumah) => (
                  <motion.tr 
                    key={rumah.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-indigo-500" />
                        {rumah.alamat}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(rumah.id, rumah.status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          rumah.status === "Dihuni" 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50" 
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                        }`}
                      >
                        {rumah.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(rumah.updatedAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleDelete(rumah.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
