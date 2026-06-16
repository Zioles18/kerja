import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Search, 
  Filter,
  MapPin,
  Clock,
  Download
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "../../firebase";

interface Agenda {
  id: string;
  namaKegiatan: string;
  tanggal: string;
  lokasi: string;
  deskripsi: string;
  status: 'Akan Datang' | 'Berlangsung' | 'Selesai' | 'Dibatalkan';
  createdAt: string;
}

export default function LaporanKegiatan() {
  const [agenda, setAgenda] = useState<Agenda[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "agenda"), orderBy("tanggal", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Agenda[];
      setAgenda(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredAgenda = agenda.filter(a => {
    const matchesSearch = a.namaKegiatan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "Semua" || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses: Agenda['status'][] = ['Akan Datang', 'Berlangsung', 'Selesai', 'Dibatalkan'];

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Kegiatan</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Laporan agenda dan kegiatan Desa Adat</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {
              const exportData = filteredAgenda.map(a => ({
                'Nama Kegiatan': a.namaKegiatan,
                Tanggal: formatDateTime(a.tanggal),
                Lokasi: a.lokasi,
                Status: a.status,
                Deskripsi: a.deskripsi
              }));
              const worksheet = XLSX.utils.json_to_sheet(exportData);
              const workbook = XLSX.utils.book_new();
              const fileName = searchQuery ? `Data_Kegiatan_${searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_')}` : "Data_Kegiatan";
              XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Kegiatan");
              XLSX.writeFile(workbook, `${fileName}.xlsx`);
            }}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            <Download size={20} />
            Export Excel
          </button>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              const printTitle = searchQuery ? `Data Kegiatan - ${searchQuery}` : "Data Kegiatan";
              doc.text(printTitle, 14, 15);
              const tableColumn = ["Nama Kegiatan", "Tanggal", "Lokasi", "Status"];
              const tableRows = filteredAgenda.map(a => [
                a.namaKegiatan,
                formatDateTime(a.tanggal),
                a.lokasi,
                a.status
              ]);
              autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
              
              const fileName = searchQuery ? `Data_Kegiatan_${searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_')}` : "Data_Kegiatan";
              doc.save(`${fileName}.pdf`);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Download size={20} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Kegiatan</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{agenda.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Akan Datang</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{agenda.filter(a => a.status === 'Akan Datang').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Selesai</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{agenda.filter(a => a.status === 'Selesai').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama kegiatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all"
          >
            <option value="Semua">Semua Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Kegiatan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal & Waktu</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lokasi</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAgenda.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada agenda ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAgenda.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-2">{a.namaKegiatan}</p>
                      {a.deskripsi && <p className="text-xs text-slate-500 line-clamp-1">{a.deskripsi}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{formatDateTime(a.tanggal)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-rose-500 shrink-0" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{a.lokasi}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        a.status === 'Akan Datang' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        a.status === 'Berlangsung' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        a.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
