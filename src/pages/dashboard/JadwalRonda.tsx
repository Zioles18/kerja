import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, orderBy, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Shield, Clock, Plus, XCircle, Check, Trash2, Calendar } from "lucide-react";
import { handleFirestoreError, OperationType } from "../../utils/errorHandling";
import Modal from "../../components/Modal";

interface Ronda {
  id: string;
  hari: string;
  petugas: string[];
}

export default function JadwalRonda() {
  const { user, isReadOnly } = useAuth();
  const [ronda, setRonda] = useState<Ronda[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newHari, setNewHari] = useState(new Date().toISOString().split('T')[0]);
  const [newPetugas, setNewPetugas] = useState<string[]>([]);
  
  const [wargaList, setWargaList] = useState<{id: string, nama: string}[]>([]);
  const [nameSearch, setNameSearch] = useState("");

  useEffect(() => {
    const path = "ronda";
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, path), orderBy("hari", "desc"));
    } else {
      q = query(collection(db, path), where("adminId", "==", user?.id), orderBy("hari", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Ronda[];
      setRonda(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    const qWarga = query(collection(db, "warga"), orderBy("nama", "asc"));
    const unsubWarga = onSnapshot(qWarga, (snap) => {
      setWargaList(snap.docs.map(doc => ({id: doc.id, nama: doc.data().nama})));
    });

    return () => {
      unsubscribe();
      unsubWarga();
    };
  }, []);

  const handleAddRonda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menambah data.");
      return;
    }
    if (newPetugas.length === 0) {
      alert("Pilih minimal satu petugas ronda.");
      return;
    }
    try {
      await addDoc(collection(db, "ronda"), {
        hari: newHari,
        petugas: newPetugas,
        adminId: user?.id
      });
      setIsModalOpen(false);
      setNewHari(new Date().toISOString().split('T')[0]);
      setNewPetugas([]);
    } catch (error) {
      console.error("Error adding ronda:", error);
      alert("Gagal menyimpan jadwal ronda.");
    }
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Hapus jadwal ini?")) {
      try {
        await deleteDoc(doc(db, "ronda", id));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Jadwal Ronda</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola jadwal keamanan keliling warga</p>
        </div>
        <button 
          onClick={() => {
            setNewHari(new Date().toISOString().split('T')[0]);
            setNewPetugas([]);
            setNameSearch("");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus size={20} /> Tambah Jadwal
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal pelaksana</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Petugas Ronda</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">Memuat data...</td></tr>
              ) : ronda.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">Belum ada jadwal ronda.</td></tr>
              ) : ronda.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-blue-500" />
                      {new Date(r.hari).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {r.petugas.map((p, i) => (
                        <span key={i} className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(r.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Jadwal Ronda">
        <form onSubmit={handleAddRonda} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pilih Tanggal</label>
            <input 
              type="date" 
              value={newHari} 
              onChange={(e) => setNewHari(e.target.value)} 
              required 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Petugas Ronda</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {newPetugas.map((nama, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-sm font-medium">
                  {nama}
                  <button 
                    type="button"
                    onClick={() => {
                      const arr = [...newPetugas];
                      arr.splice(idx, 1);
                      setNewPetugas(arr);
                    }}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <XCircle size={14} />
                  </button>
                </span>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                placeholder="Cari nama warga..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              
              {nameSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                  {wargaList.filter(w => w.nama.toLowerCase().includes(nameSearch.toLowerCase())).length > 0 ? (
                     wargaList.filter(w => w.nama.toLowerCase().includes(nameSearch.toLowerCase())).map(w => {
                       const isSelected = newPetugas.includes(w.nama);
                       return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setNameSearch("");
                            if (!isSelected) {
                              setNewPetugas([...newPetugas, w.nama]);
                            }
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex flex-row items-center justify-between ${isSelected ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
                          disabled={isSelected}
                        >
                          <span className="text-sm font-medium">{w.nama}</span>
                          {isSelected && <Check size={16} className="text-blue-600" />}
                        </button>
                      )
                     })
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 text-center">Data warga tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 text-right">Klik nama warga dari daftar yang muncul.</p>
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
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              Simpan Jadwal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
