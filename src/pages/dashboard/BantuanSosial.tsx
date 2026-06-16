import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Users, CheckCircle, Activity, Plus, XCircle, Check, Edit2, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { handleFirestoreError, OperationType } from "../../utils/errorHandling";
import Modal from "../../components/Modal";
import { motion, AnimatePresence } from "framer-motion";

interface Bansos {
  id: string;
  namaPenerima: string;
  jenisBantuan: string;
  periode: string;
  status: 'Tersalurkan' | 'Proses';
}

interface Warga {
  id: string;
  nama: string;
}

export default function BantuanSosial() {
  const { user, isReadOnly } = useAuth();
  const [bansos, setBansos] = useState<Bansos[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newJenis, setNewJenis] = useState("");
  const [newPeriode, setNewPeriode] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBansos, setEditingBansos] = useState<Bansos | null>(null);

  useEffect(() => {
    const pathBansos = "bansos";
    let qBansos;
    if (user?.role === 'super_admin') {
      qBansos = query(collection(db, pathBansos));
    } else {
      qBansos = query(collection(db, pathBansos), where("adminId", "==", user?.id));
    }
    const unsubscribeBansos = onSnapshot(qBansos, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Bansos[];
      setBansos(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathBansos);
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
        id: doc.id,
        nama: doc.data().nama
      })) as Warga[];
      setWarga(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathWarga);
    });

    return () => {
      unsubscribeBansos();
      unsubscribeWarga();
    };
  }, []);

  const handleAddBansos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menambah data.");
      return;
    }
    try {
      await addDoc(collection(db, "bansos"), {
        namaPenerima: newNama,
        jenisBantuan: newJenis,
        periode: newPeriode,
        status: 'Proses',
        adminId: user?.id
      });
      setIsModalOpen(false);
      setNewNama("");
      setNewJenis("");
      setNewPeriode("");
    } catch (error) {
      console.error("Error adding bansos:", error);
    }
  };

  const handleAccBansos = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk memproses data.");
      return;
    }
    try {
      await updateDoc(doc(db, "bansos", id), {
        status: 'Tersalurkan'
      });
    } catch (error) {
      console.error("Error updating bansos status:", error);
    }
  };

  const handleEditBansos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengedit data.");
      return;
    }
    if (!editingBansos) return;
    try {
      await updateDoc(doc(db, "bansos", editingBansos.id), {
        namaPenerima: editingBansos.namaPenerima,
        jenisBantuan: editingBansos.jenisBantuan,
        periode: editingBansos.periode
      });
      setIsEditModalOpen(false);
      setEditingBansos(null);
    } catch (error) {
      console.error("Error updating bansos:", error);
    }
  };

  const handleDeleteBansos = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (confirm("Yakin ingin menghapus data bansos ini?")) {
      try {
        await deleteDoc(doc(db, "bansos", id));
      } catch (error) {
        console.error("Error deleting bansos:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bantuan Sosial</h1>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => {
              const exportData = bansos.map(b => ({
                'Nama Penerima': b.namaPenerima,
                Jenis: b.jenisBantuan,
                Periode: b.periode,
                Status: b.status
              }));
              const worksheet = XLSX.utils.json_to_sheet(exportData);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Bansos");
              XLSX.writeFile(workbook, "Data_Bantuan_Sosial.xlsx");
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
          >
            <Download size={20} /> Export Excel
          </button>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              doc.text("Data Bantuan Sosial", 14, 15);
              const tableColumn = ["Nama Penerima", "Jenis", "Periode", "Status"];
              const tableRows = bansos.map(b => [
                b.namaPenerima,
                b.jenisBantuan,
                b.periode,
                b.status
              ]);
              autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
              doc.save("Data_Bantuan_Sosial.pdf");
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 active:scale-95"
          >
            <Download size={20} /> Export PDF
          </button>
          {!isReadOnly && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 active:scale-95"
            >
              <Plus size={20} /> Tambah Data
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Penerima</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{bansos.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Tersalurkan</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{bansos.filter(b => b.status === 'Tersalurkan').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Proses</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bansos.filter(b => b.status === 'Proses').length}</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nama Penerima</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Jenis</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Periode</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center">Memuat...</td></tr>
            ) : bansos.map(b => (
              <tr key={b.id}>
                <td className="px-6 py-4">{b.namaPenerima}</td>
                <td className="px-6 py-4">{b.jenisBantuan}</td>
                <td className="px-6 py-4">{b.periode}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${b.status === 'Tersalurkan' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {!isReadOnly && (
                    <div className="flex items-center gap-2">
                      {b.status === 'Proses' && (
                        <button 
                          onClick={() => handleAccBansos(b.id)}
                          className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1"
                          title="ACC"
                        >
                          <Check size={16} /> ACC
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setEditingBansos(b);
                          setIsEditModalOpen(true);
                        }} 
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteBansos(b.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Data Bansos">
        <form onSubmit={handleAddBansos} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Penerima</label>
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
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" 
              placeholder="Cari nama warga..."
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
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        {w.nama}
                      </button>
                    ))}
                  {warga.filter(w => w.nama.toLowerCase().includes(newNama.toLowerCase())).length === 0 && (
                    <div className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-sm">
                      Nama tidak ditemukan
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Jenis Bantuan</label>
            <input type="text" value={newJenis} onChange={(e) => setNewJenis(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Periode</label>
            <input type="text" value={newPeriode} onChange={(e) => setNewPeriode(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700">Simpan</button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Data Bansos">
        <form onSubmit={handleEditBansos} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Penerima</label>
            <input type="text" value={editingBansos?.namaPenerima || ""} onChange={(e) => setEditingBansos(prev => prev ? {...prev, namaPenerima: e.target.value} : null)} required className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Jenis Bantuan</label>
            <input type="text" value={editingBansos?.jenisBantuan || ""} onChange={(e) => setEditingBansos(prev => prev ? {...prev, jenisBantuan: e.target.value} : null)} required className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Periode</label>
            <input type="text" value={editingBansos?.periode || ""} onChange={(e) => setEditingBansos(prev => prev ? {...prev, periode: e.target.value} : null)} required className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700">Simpan Perubahan</button>
        </form>
      </Modal>
    </div>
  );
}
