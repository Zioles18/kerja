import React, { useState, useEffect, useMemo } from "react";
import { Wallet, ArrowUpRight, ArrowDownRight, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebase";

interface Transaction {
  id: string;
  tanggal: string;
  jenis: 'Pemasukan' | 'Pengeluaran';
  jumlah: number;
  keterangan: string;
  sumber: string;
}

export default function Keuangan() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const unsubIuran = onSnapshot(collection(db, "iuran"), (snap) => {
      const iuranData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tanggal: data.tanggalBayar,
          keterangan: `Iuran ${data.jenisIuran} - ${data.namaWarga}`,
          jumlah: Number(data.jumlah),
          jenis: 'Pemasukan' as const,
          sumber: 'Iuran'
        };
      });
      updateTransactions('iuran', iuranData);
    });

    const unsubTagihan = onSnapshot(query(collection(db, "tagihan"), where("status", "==", "Lunas")), (snap) => {
      const tagihanData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tanggal: data.tanggalJatuhTempo,
          keterangan: `Tagihan ${data.jenisTagihan} - ${data.namaWarga}`,
          jumlah: Number(data.jumlah),
          jenis: 'Pemasukan' as const,
          sumber: 'Tagihan'
        };
      });
      updateTransactions('tagihan', tagihanData);
    });

    const unsubKeuangan = onSnapshot(collection(db, "keuangan"), (snap) => {
      const keuanganData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tanggal: data.tanggal,
          keterangan: data.keterangan,
          jumlah: Number(data.jumlah),
          jenis: data.jenis as 'Pemasukan' | 'Pengeluaran',
          sumber: data.jenis === 'Pemasukan' ? 'Pemasukan Lainnya' : 'Pengeluaran'
        };
      });
      updateTransactions('keuangan', keuanganData);
    });

    const allData: Record<string, Transaction[]> = {
      iuran: [],
      tagihan: [],
      keuangan: []
    };

    function updateTransactions(source: string, data: Transaction[]) {
      allData[source] = data;
      const combined = [
        ...allData.iuran,
        ...allData.tagihan,
        ...allData.keuangan
      ];
      combined.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      setTransactions(combined);
      setLoading(false);
    }

    return () => {
      unsubIuran();
      unsubTagihan();
      unsubKeuangan();
    };
  }, []);

  const totalPemasukan = transactions.filter(t => t.jenis === "Pemasukan").reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalPengeluaran = transactions.filter(t => t.jenis === "Pengeluaran").reduce((acc, curr) => acc + curr.jumlah, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const chartData = useMemo(() => {
    const chartDataMap = new Map<string, { name: string, Pemasukan: number, Pengeluaran: number }>();
    
    // Sort ascending for chart
    const sorted = [...transactions].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    
    sorted.forEach(t => {
      const date = new Date(t.tanggal);
      if (isNaN(date.getTime())) return;

      const month = date.toLocaleString('id-ID', { month: 'short' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;
      
      if (!chartDataMap.has(key)) {
        chartDataMap.set(key, { name: month, Pemasukan: 0, Pengeluaran: 0 });
      }
      
      const current = chartDataMap.get(key)!;
      if (t.jenis === "Pemasukan") {
        current.Pemasukan += t.jumlah;
      } else {
        current.Pengeluaran += t.jumlah;
      }
    });

    return Array.from(chartDataMap.values());
  }, [transactions]);

  return (
    <>
      <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Keuangan</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan seluruh arus kas Desa Adat</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <a 
            href="https://wa.me/6282145612226?text=Halo%20saya%20ingin%20membayar%20iuran%20kas%20Desa%20Adat" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
          >
            <MessageCircle size={20} />
            Bayar Iuran
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Kas</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Rp {saldo.toLocaleString("id-ID")}</h3>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
              <ArrowDownRight size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pemasukan</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Rp {totalPemasukan.toLocaleString("id-ID")}</h3>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pengeluaran</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Rp {totalPengeluaran.toLocaleString("id-ID")}</h3>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Grafik Keuangan</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#0f172a'
                  }}
                  formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`}
                />
                <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[400px] lg:h-auto"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Transaksi Terbaru</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading ? (
              <div className="text-center text-slate-500 dark:text-slate-400">Memuat transaksi...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400">Belum ada transaksi</div>
            ) : (
              transactions.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      t.jenis === 'Pemasukan' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      {t.jenis === 'Pemasukan' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{t.keterangan}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(t.tanggal).toLocaleDateString("id-ID")}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ml-2 ${
                    t.jenis === 'Pemasukan' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {t.jenis === 'Pemasukan' ? '+' : '-'}Rp {t.jumlah.toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}

