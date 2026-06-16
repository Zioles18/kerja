import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { MessageSquare, AlertCircle, CheckCircle, Download, Search } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { handleFirestoreError, OperationType } from "../../utils/errorHandling";

interface Pengaduan {
  id: string;
  judul: string;
  deskripsi: string;
  status: string;
  tanggal: string;
  pelapor?: string;
  tanggapan?: string;
}

export default function LaporanWarga() {
  const [pengaduan, setPengaduan] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const path = "pengaduan";
    // Mengambil semua data pengaduan yang diurutkan berdasar tanggal terbaru
    const q = query(collection(db, path), orderBy("tanggal", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Pengaduan[];
      setPengaduan(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalPengaduan = pengaduan.length;
  const belumDitanggapi = pengaduan.filter(p => p.status === 'Menunggu' || p.status === 'pending').length;
  const sudahSelesai = pengaduan.filter(p => p.status !== 'Menunggu' && p.status !== 'pending').length;

  // Filter untuk hanya menampilkan pengaduan yang "Menunggu" (belum ditanggapi) 
  // dan yang sesuai pencarian
  const filteredPengaduan = pengaduan.filter(p => {
    const isUnresolved = p.status === 'Menunggu' || p.status === 'pending';
    const matchesSearch = (p.judul && p.judul.toLowerCase().includes(searchQuery.toLowerCase())) || 
                          (p.pelapor && p.pelapor.toLowerCase().includes(searchQuery.toLowerCase()));
    return isUnresolved && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Pengaduan Warga</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar semua pengaduan warga yang belum ditindaklanjuti</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const exportData = filteredPengaduan.map(p => ({
                Tanggal: p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID') : "-",
                Pelapor: p.pelapor || "Warga",
                Judul: p.judul,
                Deskripsi: p.deskripsi,
                Status: p.status
              }));
              const worksheet = XLSX.utils.json_to_sheet(exportData);
              const workbook = XLSX.utils.book_new();
              const titleName = searchQuery ? `Pengaduan_Warga_${searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_')}` : "Data_Pengaduan_Warga";
              XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Pengaduan");
              XLSX.writeFile(workbook, `${titleName}.xlsx`);
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-95"
          >
            <Download size={20} />
            Export Excel
          </button>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              const printTitle = searchQuery ? `Data Pengaduan Warga - ${searchQuery}` : "Data Pengaduan Warga";
              doc.text(printTitle, 14, 15);
              const tableColumn = ["Tanggal", "Pelapor", "Judul", "Status"];
              const tableRows = filteredPengaduan.map(p => [
                p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID') : "-",
                p.pelapor || "Warga",
                p.judul,
                p.status
              ]);
              autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
              
              const fileName = searchQuery ? `Data_Pengaduan_Warga_${searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_')}` : "Data_Pengaduan_Warga";
              doc.save(`${fileName}.pdf`);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm shadow-blue-600/20 active:scale-95"
          >
            <Download size={20} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pengaduan</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalPengaduan}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum Ditanggapi</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{belumDitanggapi}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Telah Direspons</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{sudahSelesai}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Cari berdasarkan pelapor atau judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pelapor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Judul Pengaduan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                       <p>Memuat Laporan Pengaduan Warga...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPengaduan.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada pengaduan yang belum ditanggapi ditemukan.
                  </td>
                </tr>
              ) : filteredPengaduan.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                    {p.pelapor || "Warga"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">{p.judul}</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{p.deskripsi}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 inline-flex items-center gap-1">
                      <AlertCircle size={14} /> Menunggu
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
