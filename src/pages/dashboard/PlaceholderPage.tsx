import React from "react";
import { motion } from "framer-motion";
import { Search, Filter, Plus, FileText, Users, Activity, CreditCard, Home, Shield, BookOpen, Receipt, CheckCircle } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  // Generate mock data based on title
  const getMockData = () => {
    const t = title.toLowerCase();
    let columns = ["ID", "Keterangan", "Tanggal", "Status"];
    let rows: any[] = [];
    let stats = [
      { label: "Total Data", value: "0", icon: FileText, color: "bg-blue-500" },
      { label: "Aktif", value: "0", icon: Activity, color: "bg-emerald-500" },
      { label: "Menunggu", value: "0", icon: Users, color: "bg-amber-500" },
    ];

    if (t.includes("kartu keluarga") || t.includes("kk")) {
      columns = ["No KK", "Kepala Keluarga", "Alamat", "Jumlah Anggota"];
      rows = [];
      stats = [
        { label: "Total KK", value: "0", icon: CreditCard, color: "bg-blue-500" },
        { label: "Warga Tetap", value: "0", icon: Home, color: "bg-emerald-500" },
        { label: "Warga Kontrak", value: "0", icon: Users, color: "bg-amber-500" },
      ];
    } else if (t.includes("mutasi")) {
      columns = ["Nama Warga", "Jenis Mutasi", "Tanggal", "Keterangan"];
      rows = [];
      stats[0].label = "Total Mutasi"; stats[0].value = "0";
      stats[1].label = "Pindah Masuk"; stats[1].value = "0";
      stats[2].label = "Pindah Keluar"; stats[2].value = "0";
    } else if (t.includes("rumah") || t.includes("blok")) {
      columns = ["Blok / No", "Pemilik", "Status Hunian", "Keterangan"];
      rows = [];
      stats = [
        { label: "Total Rumah", value: "0", icon: Home, color: "bg-blue-500" },
        { label: "Dihuni", value: "0", icon: Activity, color: "bg-emerald-500" },
        { label: "Kosong", value: "0", icon: FileText, color: "bg-slate-500" },
      ];
    } else if (t.includes("pengurus")) {
      columns = ["Nama", "Jabatan", "Periode", "No HP"];
      rows = [];
      stats[0].label = "Total Pengurus"; stats[0].value = "0";
    } else if (t.includes("iuran") || t.includes("tagihan")) {
      columns = ["Nama Warga", "Bulan", "Nominal", "Status"];
      rows = [];
      stats = [
        { label: "Total Iuran Bulan Ini", value: "Rp 0", icon: Receipt, color: "bg-blue-500" },
        { label: "Sudah Bayar", value: "0 Warga", icon: CheckCircle, color: "bg-emerald-500" },
        { label: "Belum Bayar", value: "0 Warga", icon: Users, color: "bg-rose-500" },
      ];
    } else if (t.includes("buku kas") || t.includes("pengeluaran")) {
      columns = ["Tanggal", "Keterangan", "Kategori", "Nominal"];
      rows = [];
      stats = [
        { label: "Saldo Kas", value: "Rp 0", icon: BookOpen, color: "bg-blue-500" },
        { label: "Pengeluaran Bulan Ini", value: "Rp 0", icon: Activity, color: "bg-rose-500" },
        { label: "Pemasukan Bulan Ini", value: "Rp 0", icon: FileText, color: "bg-emerald-500" },
      ];
    } else if (t.includes("ronda")) {
      columns = ["Hari", "Petugas 1", "Petugas 2", "Petugas 3"];
      rows = [];
      stats = [
        { label: "Total Petugas", value: "0", icon: Shield, color: "bg-blue-500" },
        { label: "Jadwal Aktif", value: "0 Hari", icon: Activity, color: "bg-emerald-500" },
        { label: "Absen Bulan Ini", value: "0 Orang", icon: Users, color: "bg-rose-500" },
      ];
    } else if (t.includes("bansos") || t.includes("bantuan sosial")) {
      columns = ["Nama Penerima", "Jenis Bantuan", "Periode", "Status"];
      rows = [];
      stats = [
        { label: "Total Penerima", value: "0", icon: Users, color: "bg-blue-500" },
        { label: "Tersalurkan", value: "0", icon: CheckCircle, color: "bg-emerald-500" },
        { label: "Proses", value: "0", icon: Activity, color: "bg-amber-500" },
      ];
    } else if (t.includes("tamu")) {
      columns = ["Nama Tamu", "Tujuan (Rumah)", "Tanggal Masuk", "Keterangan"];
      rows = [];
      stats[0].label = "Tamu Hari Ini"; stats[0].value = "0";
    } else if (t.includes("laporan")) {
      columns = ["Periode", "Kategori Laporan", "Total Data", "Aksi"];
      rows = [];
      stats[0].label = "Total Laporan"; stats[0].value = "0";
    } else if (t.includes("pengaturan") || t.includes("paket") || t.includes("user") || t.includes("hak akses")) {
       columns = ["Pengaturan", "Nilai", "Status", "Aksi"];
       rows = [];
       stats[0].label = "Pengaturan Aktif"; stats[0].value = "0";
    } else if (t.includes("arsip")) {
      columns = ["Nama Dokumen", "Kategori", "Tanggal Upload", "Ukuran"];
      rows = [];
      stats[0].label = "Total Dokumen"; stats[0].value = "0";
    } else if (t.includes("agenda") || t.includes("absensi")) {
      columns = ["Nama Kegiatan", "Tanggal", "Lokasi", "Status"];
      rows = [];
      stats[0].label = "Total Agenda"; stats[0].value = "0";
    }

    return { columns, rows, stats };
  };

  const { columns, rows, stats } = getMockData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {description || `Kelola data dan informasi terkait ${title.toLowerCase()}`}
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-sm shadow-blue-600/20">
          <Plus size={20} />
          Tambah Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder={`Cari ${title}...`}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Filter size={20} />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 font-medium whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {cell === "Lunas" || cell === "Aktif" || cell === "Selesai" ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {cell}
                        </span>
                      ) : cell === "Belum Bayar" || cell === "Pending" || cell === "Meninggal" || cell === "Nonaktif" ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                          {cell}
                        </span>
                      ) : cell === "Download PDF" ? (
                        <button className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                          {cell}
                        </button>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="text-center sm:text-left">Menampilkan 1 - {rows.length} dari {rows.length} data</span>
          <div className="flex gap-2">
            <button disabled className="px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg opacity-50">Prev</button>
            <button disabled className="px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg opacity-50">Next</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
