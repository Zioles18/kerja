import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Coins, Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { handleFirestoreError, OperationType } from "../../utils/errorHandling";

interface Iuran {
  id: string;
  namaWarga: string;
  jenisIuran: string;
  jumlah: number;
  periode: string;
  tanggalBayar: string;
}

export default function LaporanIuran() {
  const [iuran, setIuran] = useState<Iuran[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = "iuran";
    const q = query(collection(db, path), orderBy("tanggalBayar", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Iuran[];
      setIuran(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, []);

  const totalTerkumpul = iuran.reduce((sum, item) => sum + Number(item.jumlah), 0);
  const totalBulanan = iuran.filter(i => i.jenisIuran === 'Iuran Bulanan').reduce((sum, item) => sum + Number(item.jumlah), 0);
  const totalTahunan = iuran.filter(i => i.jenisIuran === 'Iuran Tahunan').reduce((sum, item) => sum + Number(item.jumlah), 0);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Iuran</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const exportData = iuran.map(i => ({
                'Nama Warga': i.namaWarga,
                Jenis: i.jenisIuran,
                Periode: i.periode,
                Jumlah: i.jumlah,
                Tanggal: new Date(i.tanggalBayar).toLocaleDateString('id-ID')
              }));
              const worksheet = XLSX.utils.json_to_sheet(exportData);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Iuran");
              XLSX.writeFile(workbook, "Data_Iuran.xlsx");
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-95"
          >
            <Download size={20} />
            Export Excel
          </button>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              doc.text("Data Iuran", 14, 15);
              const tableColumn = ["Nama Warga", "Jenis", "Periode", "Jumlah", "Tanggal"];
              const tableRows = iuran.map(i => [
                i.namaWarga,
                i.jenisIuran,
                i.periode,
                new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(i.jumlah),
                new Date(i.tanggalBayar).toLocaleDateString('id-ID')
              ]);
              autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
              doc.save("Data_Iuran.pdf");
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm shadow-blue-600/20 active:scale-95"
          >
            <Download size={20} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Terkumpul</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalTerkumpul)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Bulanan</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalBulanan)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Tahunan</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatRupiah(totalTahunan)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nama Warga</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Jenis</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Periode</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center">Memuat...</td></tr>
            ) : iuran.map(i => (
              <tr key={i.id}>
                <td className="px-6 py-4">{i.namaWarga}</td>
                <td className="px-6 py-4">{i.jenisIuran}</td>
                <td className="px-6 py-4">{i.periode}</td>
                <td className="px-6 py-4">{formatRupiah(i.jumlah)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
