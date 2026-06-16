import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDocs, writeBatch, serverTimestamp, addDoc } from "firebase/firestore";
import { Check, X, Trash2, ShieldCheck, User as UserIcon, Package as PackageIcon, Settings, RefreshCw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { useDesaAdat, Package } from "../../hooks/useDesaAdat";

interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  package: string;
  amount: string;
  status: string;
  timestamp: any;
}

interface GraduationReport {
  sdToSmp: string[];
  smpToSma: string[];
  sma12: string[];
  regular: string[];
  total: number;
}

const FALLBACK_PACKAGES: Package[] = [
  { id: 'gratis', name: "Gratis", price: "Rp 0", duration: "selamanya", features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Pengumuman", "Iuran Warga", "Laporan Warga", "Update Paket", "Profil Saya"], waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Gratis%20DataWarga" },
  { id: 'warga', name: "Warga", price: "Rp 124rb", duration: "bulan", features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Update Paket", "Profil Saya"], waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Warga%20DataWarga" },
  { id: 'harmoni', name: "Harmoni", price: "Rp 224rb", duration: "3 bulan", features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Laporan Kegiatan", "Update Paket", "Profil Saya"], waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Harmoni%20DataWarga" },
  { id: 'nusantara', name: "Nusantara", price: "Rp 374rb", duration: "6 bulan", features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Laporan Kegiatan", "Update Paket", "Profil Saya"], waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Nusantara%20DataWarga" }
];

export default function SuperAdminPanel() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { user, isReadOnly } = useAuth();
  const { settings, loading: settingsLoading } = useDesaAdat();
  
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessingSystem, setIsProcessingSystem] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<GraduationReport | null>(null);
  
  // Package editing state
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isSavingPackage, setIsSavingPackage] = useState(false);

  const ALL_MENUS = [
    "Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus",
    "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga",
    "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan",
    "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu",
    "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Laporan Kegiatan"
  ];

  // Auto-seed packages into settings if they don't exist
  useEffect(() => {
    if (!settingsLoading && user?.role === 'super_admin' && !isReadOnly) {
      if (!settings.subscriptionPackages || settings.subscriptionPackages.length === 0) {
        console.log("Auto-seeding packages into settings document...");
        setDoc(doc(db, "settings", "desa_adat"), {
          subscriptionPackages: FALLBACK_PACKAGES
        }, { merge: true }).catch(err => console.error("Auto-seed failed:", err));
      }
    }
  }, [settingsLoading, settings.subscriptionPackages, user, isReadOnly]);

  useEffect(() => {
    if (settings.subscriptionPackages && settings.subscriptionPackages.length > 0) {
      setPackages(settings.subscriptionPackages);
    } else {
      setPackages(FALLBACK_PACKAGES);
    }
  }, [settings]);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      setLoading(false);
      return;
    }

    const unsubTrans = onSnapshot(query(collection(db, "transactions")), 
      (snapshot) => {
        const transData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Transaction[];
        
        setTransactions(transData.sort((a, b) => {
          const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        }));
        setLoading(false);
      },
      (error) => {
        console.error("Trans focus error:", error);
        setLoading(false);
      }
    );

    return () => unsubTrans();
  }, [user]);

  const handleApprove = async (transaction: Transaction) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyetujui transaksi.");
      return;
    }
    try {
      await updateDoc(doc(db, "transactions", transaction.id), {
        status: "approved"
      });
      await updateDoc(doc(db, "users", transaction.userId), {
        subscription: transaction.package,
        subscriptionStatus: "active"
      });
      alert(`Berhasil menyetujui paket ${transaction.package} untuk ${transaction.userName}`);
    } catch (error) {
      console.error("Approval failed", error);
    }
  };

  const handleReject = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menolak transaksi.");
      return;
    }
    if (!confirm("Yakin ingin menolak transaksi ini?")) return;
    try {
      await updateDoc(doc(db, "transactions", id), {
        status: "rejected"
      });
    } catch (error) {
      console.error("Rejection failed", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (!confirm("Hapus riwayat transaksi ini?")) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleEditPackage = (pkg: Package) => {
    setEditingPackage({ ...pkg });
  };

  const handleSavePackage = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan paket.");
      return;
    }
    if (!editingPackage) return;
    setIsSavingPackage(true);
    
    try {
      const updatedPackages = packages.map(p => 
        p.id === editingPackage.id ? editingPackage : p
      );
      
      await updateDoc(doc(db, "settings", "desa_adat"), {
        subscriptionPackages: updatedPackages
      });
      
      alert("Data paket berhasil diperbarui!");
      setEditingPackage(null);
    } catch (error: any) {
      console.error("Failed to save package", error);
      alert("Gagal menyimpan perubahan. Pastikan Anda memiliki akses yang cukup.");
    } finally {
      setIsSavingPackage(false);
    }
  };

  const handleAutoIncrementGrades = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menjalankan fitur ini.");
      return;
    }

    if (!confirm("PENTING! Fitur ini akan mensimulasikan berlalunya 1 tahun:\n\n1. Semua usia warga akan naik 1 tahun (menggeser tanggal lahir).\n2. Kenaikan tingkat pendidikan otomatis:\n   - Usia 12: Menjadi SMP (Kelas 7)\n   - Usia 15: Menjadi SMA (Kelas 10)\n   - Usia 19: Lulus SMA\n   - Siswa lain: Naik 1 tingkat kelas.\n\nYakin ingin menjalankan sekarang?")) return;

    setIsProcessingSystem(true);
    try {
      const wargaSnap = await getDocs(collection(db, "warga"));
      const batch = writeBatch(db);
      
      const report: GraduationReport = {
        sdToSmp: [],
        smpToSma: [],
        sma12: [],
        regular: [],
        total: 0
      };

      const calculateAgeInternal = (birthDate: string | undefined): number => {
        if (!birthDate) return -1;
        const bDate = new Date(birthDate);
        if (isNaN(bDate.getTime())) return -1;
        const today = new Date();
        let age = today.getFullYear() - bDate.getFullYear();
        const m = today.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
          age--;
        }
        return age;
      };

      wargaSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const edu = data.pendidikan;
        let grade = parseInt(data.kelas);
        const name = data.nama;
        const dob = data.tanggalLahir;

        let newEdu = edu;
        let newGrade = isNaN(grade) ? grade : grade + 1;
        let newDob = dob;

        const updates: any = {};
        let modified = false;

        // 1. Always increment age by shifting birth year if exists
        if (dob) {
          const bDate = new Date(dob);
          if (!isNaN(bDate.getTime())) {
            bDate.setFullYear(bDate.getFullYear() - 1);
            // Re-format to YYYY-MM-DD
            newDob = bDate.toISOString().split('T')[0];
          }
        }

        // 2. Education Logic based on NEW Calculated Age
        const currentAge = calculateAgeInternal(dob);
        const newAge = currentAge !== -1 ? currentAge + 1 : -1;

        if (newAge !== -1) {
          // 2a. Education Logic based on NEW Calculated Age
          if (newAge === 12) {
            newEdu = "SMP";
            newGrade = 7;
            report.sdToSmp.push(name);
          } else if (newAge === 15) {
            newEdu = "SMA";
            newGrade = 10;
            report.smpToSma.push(name);
          } else if (newAge === 19) {
            newEdu = "Lulus";
            newGrade = NaN;
            report.sma12.push(name);
          } else if (edu === "SD" || edu === "SMP" || edu === "SMA") {
            if (!isNaN(grade)) {
              report.regular.push(`${name} (${edu} ${grade} -> ${newGrade})`);
            }
          }
        } else {
          // Fallback if age unknown
          if (edu === "SD" && grade === 6) {
            newEdu = "SMP";
            newGrade = 7;
            report.sdToSmp.push(name + " (Tanpa Tgl Lahir)");
          } else if (edu === "SMP" && grade === 9) {
            newEdu = "SMA";
            newGrade = 10;
            report.smpToSma.push(name + " (Tanpa Tgl Lahir)");
          } else if (!isNaN(grade) && (edu === "SD" || edu === "SMP" || edu === "SMA")) {
             // Regular increment
          } else {
            return;
          }
        }

        if (newEdu !== edu) {
          updates.pendidikan = newEdu;
          modified = true;
        }
        if (!isNaN(newGrade) && newGrade.toString() !== data.kelas) {
          updates.kelas = newGrade.toString();
          modified = true;
        } else if (isNaN(newGrade) && data.kelas !== "-") {
          updates.kelas = "-";
          modified = true;
        }
        if (newDob !== dob) {
          updates.tanggalLahir = newDob;
          modified = true;
        }

        if (modified) {
          batch.update(docSnap.ref, updates);
          report.total++;
        }
      });

      if (report.total > 0 || report.sdToSmp.length > 0 || report.smpToSma.length > 0 || report.sma12.length > 0) {
        if (report.total > 0) await batch.commit();
        
        await addDoc(collection(db, "notifikasi"), {
          judul: "Sistem: Update Tahunan Warga Selesai",
          pesan: `Simulasi 1 tahun telah dijalankan. Total ${report.total} perubahan dilakukan (termasuk kenaikan usia).`,
          tipe: "warga",
          timestamp: new Date().toISOString(),
          read: false
        });

        setReportData(report);
        setIsReportModalOpen(true);
      } else {
        alert("Tidak ada data warga yang perlu diperbarui.");
      }
    } catch (error: any) {
      console.error("Yearly increment failed:", error);
      alert("Gagal menjalankan update tahunan: " + error.message);
    } finally {
      setIsProcessingSystem(false);
    }
  };

  const toggleFeature = (feature: string) => {
    if (!editingPackage) return;
    const currentFeatures = editingPackage.features || [];
    if (currentFeatures.includes(feature)) {
      setEditingPackage({
        ...editingPackage,
        features: currentFeatures.filter((f: string) => f !== feature)
      });
    } else {
      setEditingPackage({
        ...editingPackage,
        features: [...currentFeatures, feature]
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden sm:overflow-visible">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel Super Admin</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola transaksi dan paket subscription</p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'transactions' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Transaksi
          </button>
          <button 
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'packages' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Manajemen Paket
          </button>
          <button 
            onClick={() => setActiveTab("system")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'system' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Sistem
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "transactions" ? (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">Daftar Transaksi Masuk</h3>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                {transactions.length} Total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <th className="px-6 py-4 font-bold">User</th>
                    <th className="px-6 py-4 font-bold">Paket</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Memuat data...</td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Belum ada transaksi pembayaran</td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                              <UserIcon size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{t.userName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{t.userEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <PackageIcon size={16} className="text-blue-500" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.package}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            t.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            t.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {t.status === 'pending' && (
                              <>
                                <button onClick={() => handleApprove(t)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all active:scale-90" title="Setujui">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => handleReject(t.id)} className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all active:scale-90" title="Tolak">
                                  <X size={16} />
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : activeTab === "system" ? (
          <motion.div
            key="system"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Update Tahunan & Kenaikan Kelas</h3>
                  <p className="text-sm text-slate-500">Mensimulasikan berlalunya 1 tahun (Usia +1) dan menyesuaikan tingkat pendidikan</p>
                </div>
              </div>

              <div className="space-y-4 mb-8 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-blue-50 text-blue-600 rounded flex items-center justify-center shrink-0">1</div>
                  <p>Usia warga otomatis naik 1 tahun (menggeser tanggal lahir).</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-blue-50 text-blue-600 rounded flex items-center justify-center shrink-0">2</div>
                  <p>Usia 12 $\rightarrow$ SMP (7), Usia 15 $\rightarrow$ SMA (10), Usia 19 $\rightarrow$ Lulus SMA.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-blue-50 text-blue-600 rounded flex items-center justify-center shrink-0">3</div>
                  <p>Siswa lain di tingkat SD/SMP/SMA akan naik 1 tingkat kelas.</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex gap-3 mb-8">
                <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Peringatan:</strong> Tindakan ini akan mengubah data warga dalam jumlah banyak sekaligus. Pastikan data pendidikan saat ini sudah benar sebelum melanjutkan.
                </p>
              </div>

              <button
                onClick={handleAutoIncrementGrades}
                disabled={isProcessingSystem}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 disabled:opacity-70"
              >
                {isProcessingSystem ? (
                  <>
                    <div className="w-5 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses Kenaikan...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    Jalankan Kenaikan Kelas
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="packages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white px-2">Daftar Paket</h3>
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleEditPackage(pkg)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${editingPackage?.id === pkg.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white hover:border-indigo-600'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{pkg.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${editingPackage?.id === pkg.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>{pkg.price}</span>
                  </div>
                  <p className={`text-xs mt-1 ${editingPackage?.id === pkg.id ? 'text-indigo-100' : 'text-slate-500'}`}>{pkg.features?.length || 0} fitur aktif</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {editingPackage ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Paket: {editingPackage.name}</h3>
                    <button 
                      onClick={handleSavePackage}
                      disabled={isSavingPackage}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-indigo-600/20"
                    >
                      {isSavingPackage ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Nama Paket</label>
                      <input 
                        type="text"
                        value={editingPackage.name}
                        onChange={(e) => setEditingPackage({...editingPackage, name: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="Nama Paket"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Harga Display</label>
                      <input 
                        type="text"
                        value={editingPackage.price}
                        onChange={(e) => setEditingPackage({...editingPackage, price: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Contoh: Rp 124rb"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Durasi</label>
                      <input 
                        type="text"
                        value={editingPackage.duration}
                        onChange={(e) => setEditingPackage({...editingPackage, duration: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Contoh: bulan atau 3 bulan"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">WhatsApp Link (Opsional)</label>
                      <input 
                        type="text"
                        value={editingPackage.waLink || ''}
                        onChange={(e) => setEditingPackage({...editingPackage, waLink: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs"
                        placeholder="https://wa.me/..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase">Daftar Fitur Paket</label>
                      <button 
                        onClick={() => setEditingPackage({
                          ...editingPackage,
                          features: [...(editingPackage.features || []), "Fitur Baru"]
                        })}
                        className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-md font-bold hover:bg-emerald-600 transition-all"
                      >
                        + Tambah Fitur
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar border border-slate-50 dark:border-slate-700/50 p-4 rounded-2xl">
                      {editingPackage.features?.map((feature, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input 
                            type="text"
                            value={feature}
                            onChange={(e) => {
                              const newFeatures = [...(editingPackage.features || [])];
                              newFeatures[idx] = e.target.value;
                              setEditingPackage({...editingPackage, features: newFeatures});
                            }}
                            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                          <button 
                            onClick={() => {
                              const newFeatures = (editingPackage.features || []).filter((_, i) => i !== idx);
                              setEditingPackage({...editingPackage, features: newFeatures});
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(!editingPackage.features || editingPackage.features.length === 0) && (
                        <p className="text-center text-xs text-slate-400 py-4 italic">Belum ada fitur ditambahkan</p>
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Cepat dari Menu Dashboard (Penting untuk Hak Akses)</label>
                        <div className="group relative">
                          <AlertTriangle size={12} className="text-amber-500 cursor-help" />
                          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl z-50">
                            Fitur yang ada di sini akan otomatis membuka akses menu di dashboard warga.
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_MENUS.map((menu) => (
                          <button
                            key={menu}
                            onClick={() => toggleFeature(menu)}
                            className={`px-2 py-1 rounded-md text-[10px] transition-all border ${editingPackage.features?.includes(menu) ? 'bg-indigo-600 border-indigo-600 text-white font-bold' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300'}`}
                          >
                            {menu}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
                  <PackageIcon size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Pilih paket untuk mengedit harga dan hak akses fitur</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graduation Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && reportData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-[95%] sm:w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-indigo-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Laporan Kenaikan Kelas</h3>
                  <p className="text-indigo-100 text-sm">Berhasil memproses {reportData.total} data warga</p>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                {/* SD to SMP */}
                {reportData.sdToSmp.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      Lulus SD $\rightarrow$ SMP ({reportData.sdToSmp.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {reportData.sdToSmp.map((name, i) => (
                        <div key={i} className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl text-sm font-medium text-emerald-800 dark:text-emerald-300">
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SMP to SMA */}
                {reportData.smpToSma.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Lulus SMP $\rightarrow$ SMA ({reportData.smpToSma.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {reportData.smpToSma.map((name, i) => (
                        <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl text-sm font-medium text-blue-800 dark:text-blue-300">
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lulus */}
                {reportData.sma12.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      Telah Selesai Kelas (SMA) ({reportData.sma12.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {reportData.sma12.map((name, i) => (
                        <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl text-sm font-medium text-amber-800 dark:text-amber-300">
                          {name}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 italic font-normal">* Status diperbarui menjadi pendidikan "Lulus" dan kelas "-"</p>
                  </div>
                )}

                {/* Regular Increments */}
                {reportData.regular.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full" />
                      Kenaikan Kelas Reguler ({reportData.regular.length})
                    </h4>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl">
                      <div className="flex flex-wrap gap-2">
                        {reportData.regular.map((entry, i) => (
                          <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                            {entry}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
