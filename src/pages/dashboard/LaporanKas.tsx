import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight,
  Search, 
  Calendar,
  Download
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

interface LedgerEntry {
  id: string;
  tanggal: string;
  keterangan: string;
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
  sumber: string;
}

export default function LaporanKas() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let allData: any = {
      iuran: [],
      tagihan: [],
      keuangan: []
    };

    const qIuran = query(collection(db, "iuran"), orderBy("tanggalBayar", "desc"));
    const unsubIuran = onSnapshot(qIuran, (snap) => {
      allData.iuran = snap.docs.map(doc => ({
        id: doc.id,
        tanggal: doc.data().tanggalBayar,
        keterangan: `Iuran ${doc.data().jenisIuran} - ${doc.data().namaWarga}`,
        pemasukan: Number(doc.data().jumlah) || 0,
        pengeluaran: 0,
        sumber: 'Iuran',
        saldo: 0
      }));
      updateLedger("iuran", allData.iuran);
    });

    const qTagihan = query(collection(db, "tagihan"), orderBy("tanggalBayar", "desc"));
    const unsubTagihan = onSnapshot(qTagihan, (snap) => {
      allData.tagihan = snap.docs.filter(doc => doc.data().status === 'Lunas').map(doc => ({
        id: doc.id,
        tanggal: doc.data().tanggalBayar,
        keterangan: `Tagihan ${doc.data().jenisTagihan} - ${doc.data().namaWarga}`,
        pemasukan: Number(doc.data().jumlah) || 0,
        pengeluaran: 0,
        sumber: 'Tagihan',
        saldo: 0
      }));
      updateLedger("tagihan", allData.tagihan);
    });

    const qKeuangan = query(collection(db, "keuangan"), orderBy("tanggal", "desc"));
    const unsubKeuangan = onSnapshot(qKeuangan, (snap) => {
      allData.keuangan = snap.docs.map(doc => {
        const data = doc.data();
        const isPemasukan = data.jenis === 'Pemasukan';
        return {
          id: doc.id,
          tanggal: data.tanggal,
          keterangan: data.keterangan,
          pemasukan: isPemasukan ? Number(data.jumlah) : 0,
          pengeluaran: !isPemasukan ? Number(data.jumlah) : 0,
          sumber: isPemasukan ? 'Pemasukan Lainnya' : 'Pengeluaran',
          saldo: 0
        };
      });
      updateLedger("keuangan", allData.keuangan);
    });

    function updateLedger(source: string, data: LedgerEntry[]) {
      allData[source] = data;
      
      const combined = [
        ...allData.iuran,
        ...allData.tagihan,
        ...allData.keuangan
      ];

      combined.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
      
      setLedger(combined);
      setLoading(false);
    }

    return () => {
      unsubIuran();
      unsubTagihan();
      unsubKeuangan();
    };
  }, []);

  const filteredLedger = ledger.filter(item => 
    item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const totalPemasukan = ledger.reduce((sum, item) => sum + item.pemasukan, 0);
  const totalPengeluaran = ledger.reduce((sum, item) => sum + item.pengeluaran, 0);
  const saldoAkhir = totalPemasukan - totalPengeluaran;

  let currentBalance = 0;
  const ledgerWithBalance = ledger.map(item => {
    currentBalance += item.pemasukan - item.pengeluaran;
    return { ...item, saldo: currentBalance };
  }).reverse();

  const displayLedger = ledgerWithBalance.filter(item => 
    item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Kas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Laporan komprehensif seluruh arus kas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {
              const exportData = displayLedger.map(i => ({
                Tanggal: new Date(i.tanggal).toLocaleDateString('id-ID'),
                Keterangan: i.keterangan,
                Sumber: i.sumber,
                Masuk: i.pemasukan,
                Keluar: i.pengeluaran,
                Saldo: i.saldo
              }));
              const worksheet = XLSX.utils.json_to_sheet(exportData);
              const workbook = XLSX.utils.book_new();
              const fileName = searchQuery ? `Data_Kas_${searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_')}` : "Data_Kas";
              XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Kas");
              XLSX.writeFile(workbook, `${fileName}.xlsx`);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            <Download size={20} /> Export Excel
          </button>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              const printTitle = searchQuery ? `Data Kas - ${searchQuery}` : "Data Kas";
              doc.text(printTitle, 14, 15);
              const tableColumn = ["Tanggal", "Keterangan", "Sumber", "Masuk", "Keluar", "Saldo"];
              const tableRows = displayLedger.map(i => [
                new Date(i.tanggal).toLocaleDateString('id-ID'),
                i.keterangan,
                i.sumber,
                i.pemasukan.toString(),
                i.pengeluaran.toString(),
                i.saldo.toString()
              ]);
              autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
              
              const fileName = searchQuery ? `Data_Kas_${searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_')}` : "Data_Kas";
              doc.save(`${fileName}.pdf`);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Download size={20} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Akhir</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(saldoAkhir)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pemasukan</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalPemasukan)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pengeluaran</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalPengeluaran)}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Cari transaksi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sumber</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Masuk</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Keluar</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : displayLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                displayLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900 dark:text-white line-clamp-2">{item.keterangan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.sumber === 'Pengeluaran' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                        item.sumber === 'Iuran' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        item.sumber === 'Tagihan' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {item.sumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.pemasukan > 0 ? formatRupiah(item.pemasukan) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {item.pengeluaran > 0 ? formatRupiah(item.pengeluaran) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(item.saldo)}
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
