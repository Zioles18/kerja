import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../firebase";
import { ArrowRightLeft, Download, Trash2, Users } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { handleFirestoreError, OperationType } from "../../utils/errorHandling";

interface Mutasi {
  id: string;
  nama: string;
  statusLama: string;
  statusBaru: string;
  timestamp: string;
  tanggalMeninggal?: string;
  tanggalPindah?: string;
}

export default function LaporanMutasi() {
  const { user, isReadOnly } = useAuth();
  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const path = "mutasi_warga";
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, path), orderBy("timestamp", "desc"));
    } else {
      q = query(collection(db, path), where("adminId", "==", user?.id), orderBy("timestamp", "desc"));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Mutasi[];
      setMutasi(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data laporan mutasi ini?")) {
      try {
        await deleteDoc(doc(db, "mutasi_warga", id));
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  const getFormatDate = (m: Mutasi) => {
    if (m.statusBaru === 'Meninggal' && m.tanggalMeninggal) return new Date(m.tanggalMeninggal).toLocaleDateString('id-ID');
    if (m.statusBaru === 'Pindah' && m.tanggalPindah) return new Date(m.tanggalPindah).toLocaleDateString('id-ID');
    return new Date(m.timestamp).toLocaleDateString('id-ID');
  };

  const [search, setSearch] = useState("");
  const filteredMutasi = mutasi.filter(m => {
    const isTargetStatus = m.statusBaru === 'Pindah' || m.statusBaru === 'Meninggal' || m.statusBaru === 'Non Aktif';
    const matchesSearch = m.nama?.toLowerCase().includes(search.toLowerCase());
    return isTargetStatus && matchesSearch;
  });

  const totalMutasi = filteredMutasi.length;
  const totalPindah = filteredMutasi.filter(m => m.statusBaru === 'Pindah').length;
  const totalMeninggal = filteredMutasi.filter(m => m.statusBaru === 'Meninggal').length;
  const totalNonAktif = filteredMutasi.filter(m => m.statusBaru === 'Non Aktif').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Mutasi</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const exportData = filteredMutasi.map(m => ({
                Nama: m.nama,
                'Status Lama': m.statusLama,
                'Status Baru': m.statusBaru,
                Tanggal: getFormatDate(m)
              }));
              const worksheet = XLSX.utils.json_to_sheet(exportData);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Mutasi");
              XLSX.writeFile(workbook, "Data_Mutasi.xlsx");
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-95"
          >
            <Download size={20} />
            Export Excel
          </button>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              doc.text("Data Mutasi", 14, 15);
              const tableColumn = ["Nama", "Status Lama", "Status Baru", "Tanggal"];
              const tableRows = filteredMutasi.map(m => [
                m.nama,
                m.statusLama,
                m.statusBaru,
                getFormatDate(m)
              ]);
              autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
              doc.save("Data_Mutasi.pdf");
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm shadow-blue-600/20 active:scale-95"
          >
            <Download size={20} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Mutasi</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalMutasi}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Pindah</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalPindah}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Meninggal</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalMeninggal}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Non Aktif</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalNonAktif}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="relative w-full sm:max-w-xs">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Cari nama warga..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nama</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status Lama</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status Baru</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tanggal</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Aksi</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Memuat data...</td></tr>
              ) : filteredMutasi.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Tidak ada data mutasi</td></tr>
              ) : filteredMutasi.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{m.nama}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-bold text-[10px] uppercase">{m.statusLama}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase">{m.statusBaru}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{getFormatDate(m)}</td>
                  <td className="px-6 py-4 text-right">
                    {!isReadOnly && (
                      <button 
                        onClick={() => handleDelete(m.id)}
                        className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
