import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight,
  Plus, 
  Search, 
  XCircle,
  Calendar,
  Edit2,
  Trash2,
  Download
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy,
  where,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import { db } from "../../firebase";

interface LedgerEntry {
  id: string;
  tanggal: string;
  keterangan: string;
  pemasukan: number;
  pengeluaran: number;
  sumber: 'Iuran' | 'Tagihan' | 'Pemasukan Lainnya' | 'Pengeluaran';
}

export default function BukuKas() {
  const { user, isReadOnly } = useAuth();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

  const [formData, setFormData] = useState({
    jumlah: 0,
    keterangan: "",
    tanggal: new Date().toISOString().split('T')[0]
  });

  const [editFormData, setEditFormData] = useState({
    jumlah: 0,
    keterangan: "",
    tanggal: new Date().toISOString().split('T')[0],
    jenis: "Pemasukan" as "Pemasukan" | "Pengeluaran"
  });

  const isAdmin = user?.role === 'admin_rt' || user?.role === 'super_admin';

  useEffect(() => {
    if (!user) return;
    // We need to fetch from 3 collections: iuran, tagihan, keuangan
    let qIuran;
    if (user?.role === 'super_admin') {
      qIuran = collection(db, "iuran");
    } else {
      qIuran = query(collection(db, "iuran"), where("adminId", "==", user?.id));
    }
    const unsubIuran = onSnapshot(qIuran, (snap) => {
      const iuranData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tanggal: data.tanggalBayar,
          keterangan: `Iuran ${data.jenisIuran} - ${data.namaWarga} (${data.periode})`,
          pemasukan: Number(data.jumlah),
          pengeluaran: 0,
          sumber: 'Iuran' as const
        };
      });
      updateLedger('iuran', iuranData);
    });

    let qTagihan;
    if (user?.role === 'super_admin') {
      qTagihan = query(collection(db, "tagihan"), where("status", "==", "Lunas"));
    } else {
      qTagihan = query(collection(db, "tagihan"), where("status", "==", "Lunas"), where("adminId", "==", user?.id));
    }
    const unsubTagihan = onSnapshot(qTagihan, (snap) => {
      const tagihanData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tanggal: data.tanggalJatuhTempo, // Assuming paid on this date or we should have a tanggalBayar for tagihan. We'll use this for now.
          keterangan: `Pembayaran Tagihan ${data.jenisTagihan} - ${data.namaWarga}`,
          pemasukan: Number(data.jumlah),
          pengeluaran: 0,
          sumber: 'Tagihan' as const
        };
      });
      updateLedger('tagihan', tagihanData);
    });

    let qKeuangan;
    if (user?.role === 'super_admin') {
      qKeuangan = collection(db, "keuangan");
    } else {
      qKeuangan = query(collection(db, "keuangan"), where("adminId", "==", user?.id));
    }
    const unsubKeuangan = onSnapshot(qKeuangan, (snap) => {
      const keuanganData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tanggal: data.tanggal,
          keterangan: data.keterangan,
          pemasukan: data.jenis === 'Pemasukan' ? Number(data.jumlah) : 0,
          pengeluaran: data.jenis === 'Pengeluaran' ? Number(data.jumlah) : 0,
          sumber: data.jenis === 'Pemasukan' ? 'Pemasukan Lainnya' as const : 'Pengeluaran' as const
        };
      });
      updateLedger('keuangan', keuanganData);
    });

    const allData: Record<string, LedgerEntry[]> = {
      iuran: [],
      tagihan: [],
      keuangan: []
    };

    function updateLedger(source: string, data: LedgerEntry[]) {
      allData[source] = data;
      
      const combined = [
        ...allData.iuran,
        ...allData.tagihan,
        ...allData.keuangan
      ];

      // Sort by date ascending to calculate running balance
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mencatat data.");
      return;
    }
    try {
      await addDoc(collection(db, "keuangan"), {
        jenis: "Pemasukan",
        jumlah: Number(formData.jumlah),
        keterangan: formData.keterangan,
        tanggal: new Date(formData.tanggal).toISOString(),
        adminId: user?.id,
        userId: user?.id || "anonymous"
      });
      setIsModalOpen(false);
      setFormData({
        jumlah: 0,
        keterangan: "",
        tanggal: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error("Error saving pemasukan:", error);
      alert("Gagal menyimpan data pemasukan.");
    }
  };

  const handleEditClick = (item: LedgerEntry) => {
    setEditingEntry(item);
    setEditFormData({
      jumlah: item.pemasukan > 0 ? item.pemasukan : item.pengeluaran,
      keterangan: item.keterangan,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      jenis: item.pemasukan > 0 ? "Pemasukan" : "Pengeluaran"
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengedit data.");
      return;
    }
    if (!editingEntry) return;
    try {
      await updateDoc(doc(db, "keuangan", editingEntry.id), {
        jenis: editFormData.jenis,
        jumlah: Number(editFormData.jumlah),
        keterangan: editFormData.keterangan,
        tanggal: new Date(editFormData.tanggal).toISOString()
      });
      setIsEditModalOpen(false);
      setEditingEntry(null);
    } catch (error) {
      console.error("Error updating keuangan:", error);
      alert("Gagal mengupdate data.");
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (confirm("Yakin ingin menghapus catatan kas ini?")) {
      try {
        await deleteDoc(doc(db, "keuangan", id));
      } catch (error) {
        console.error("Error deleting keuangan:", error);
        alert("Gagal menghapus data.");
      }
    }
  };

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

  // Calculate running balance for display (reverse order so newest is on top)
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buku Kas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Catatan seluruh arus kas masuk dan keluar</p>
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
              const titleName = searchQuery ? `Buku_Kas_${searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_')}` : "Data_Buku_Kas";
              XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Buku_Kas");
              XLSX.writeFile(workbook, `${titleName}.xlsx`);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            <Download size={20} /> Export Excel
          </button>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              const printTitle = searchQuery ? `Data Buku Kas - ${searchQuery}` : "Data Buku Kas";
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
              
              const fileName = searchQuery ? `Data_Buku_Kas_${searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_')}` : "Data_Buku_Kas";
              doc.save(`${fileName}.pdf`);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Download size={20} /> Export PDF
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <Plus size={20} />
              Catat Pemasukan Lain
            </button>
          )}
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
                {isAdmin && <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>}
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
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        {(item.sumber === 'Pemasukan Lainnya' || item.sumber === 'Pengeluaran') ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditClick(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteClick(item.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Otomatis</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Catat Pemasukan Lainnya
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Keterangan
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder="Misal: Donasi warga..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Jumlah (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.jumlah}
                    onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="0"
                  />
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
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    Catat Pemasukan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Edit Catatan Kas
                </h3>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Jenis
                  </label>
                  <select
                    value={editFormData.jenis}
                    onChange={(e) => setEditFormData({ ...editFormData, jenis: e.target.value as "Pemasukan" | "Pengeluaran" })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Pemasukan">Pemasukan</option>
                    <option value="Pengeluaran">Pengeluaran</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.tanggal}
                    onChange={(e) => setEditFormData({ ...editFormData, tanggal: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Keterangan
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editFormData.keterangan}
                    onChange={(e) => setEditFormData({ ...editFormData, keterangan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Jumlah (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editFormData.jumlah}
                    onChange={(e) => setEditFormData({ ...editFormData, jumlah: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
