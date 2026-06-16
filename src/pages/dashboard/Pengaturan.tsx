import React, { useState, useEffect } from "react";
import { Settings, Bell, Shield, Database, Save, Activity, Smartphone, Mail, Download, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { db, auth } from "../../firebase";
import * as XLSX from "xlsx";
import { useAuth } from "../../hooks/useAuth";

export default function Pengaturan() {
  const [activeTab, setActiveTab] = useState("umum");
  const { user, isReadOnly } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // General Settings
  const [namaAplikasi, setNamaAplikasi] = useState("Sistem Informasi Desa Adat");
  const [zonaWaktu, setZonaWaktu] = useState("WITA (Asia/Makassar)");
  const [formatTanggal, setFormatTanggal] = useState("DD/MM/YYYY");
  const [updateOtomatis, setUpdateOtomatis] = useState(true);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification Specs
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, "pengaturan", "umum"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNamaAplikasi(data.namaAplikasi || "Sistem Informasi Desa Adat");
        setZonaWaktu(data.zonaWaktu || "WITA (Asia/Makassar)");
        setFormatTanggal(data.formatTanggal || "DD/MM/YYYY");
        setUpdateOtomatis(data.updateOtomatis !== false);
        setNotifInApp(data.notifInApp !== false);
        setNotifEmail(data.notifEmail === true);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveUmum = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan pengaturan umum.");
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(doc(db, "pengaturan", "umum"), {
        namaAplikasi,
        zonaWaktu,
        formatTanggal,
        updateOtomatis,
        notifInApp,
        notifEmail,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("Pengaturan berhasil disimpan.");
    } catch (error) {
      console.error("Error saving settings", error);
      alert("Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengubah password aplikasi.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Password baru dan konfirmasi password tidak cocok!");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password harus minimal 6 karakter!");
      return;
    }

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Password berhasil diubah!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        alert("Sesi Anda sudah terlalu lama. Silakan logout dan login kembali untuk mengubah password.");
      } else {
        alert("Gagal mengubah password.");
      }
    }
  };

  const handleBackup = async () => {
    try {
      alert("Memulai proses backup data warga...");
      const snapshot = await getDocs(collection(db, "warga"));
      const data = snapshot.docs.map(doc => doc.data());
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "BackupDataWarga");
      XLSX.writeFile(workbook, `Backup_DataWarga_${new Date().getTime()}.xlsx`);
    } catch (error) {
      console.error(error);
      alert("Gagal melakukan backup data.");
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-800/20">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan Sistem</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Konfigurasi preferensi dan keamanan aplikasi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 space-y-2"
        >
          <button
            onClick={() => setActiveTab("umum")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "umum" 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Settings size={18} />
            Pengaturan Umum
          </button>
          <button
            onClick={() => setActiveTab("notifikasi")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "notifikasi" 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Bell size={18} />
            Notifikasi & Alert
          </button>
          <button
            onClick={() => setActiveTab("keamanan")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "keamanan" 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Shield size={18} />
            Keamanan Akun
          </button>
          <button
            onClick={() => setActiveTab("data")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "data" 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Database size={18} />
            Pencadangan Data
          </button>
        </motion.div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          key={activeTab}
          className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 md:p-8"
        >
          {activeTab === "umum" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Pengaturan Umum Sistem</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Aplikasi / Portal</label>
                    <input 
                      type="text" 
                      value={namaAplikasi}
                      onChange={e => setNamaAplikasi(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Zona Waktu Default</label>
                    <input 
                      type="text"
                      value={zonaWaktu}
                      onChange={e => setZonaWaktu(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="Contoh: WITA / WIB"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Format Tanggal</label>
                    <input 
                      type="date"
                      value={formatTanggal}
                      onChange={e => setFormatTanggal(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              
              <hr className="border-slate-100 dark:border-slate-700" />
              
              <div>
                <h3 className="text-md font-bold text-slate-900 dark:text-white mb-2">Pembaruan Sistem</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Atur apakah sistem boleh mengunduh pembaruan secara otomatis saat terhubung jaringan stabil.</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={updateOtomatis}
                      onChange={e => !isReadOnly && setUpdateOtomatis(e.target.checked)}
                      disabled={isReadOnly}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${updateOtomatis ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${updateOtomatis ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pembaruan Visual Otomatis</span>
                </label>
              </div>

              {!isReadOnly && (
                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSaveUmum}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    <Save size={18} />
                    {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "notifikasi" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Preferensi Notifikasi</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                      <Bell size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Notifikasi In-App</p>
                      <p className="text-xs text-slate-500">Tampilkan pop-up notifikasi saat membuka dashboard</p>
                    </div>
                  </div>
                  <label className="relative cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={notifInApp}
                      onChange={e => !isReadOnly && setNotifInApp(e.target.checked)}
                      disabled={isReadOnly}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${notifInApp ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifInApp ? 'translate-x-4' : ''}`}></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Push Notifications (Mobile)</p>
                      <p className="text-xs text-slate-500">Terima pemberitahuan mendesak langsung ke perangkat HP Anda</p>
                    </div>
                  </div>
                  <label className="relative cursor-pointer">
                    <input type="checkbox" className="sr-only" defaultChecked />
                    <div className="w-10 h-6 bg-green-600 rounded-full"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform translate-x-4"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Laporan via Email</p>
                      <p className="text-xs text-slate-500">Kirim rekapan mingguan/bulanan dari sistem ke email terdaftar</p>
                    </div>
                  </div>
                  <label className="relative cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={notifEmail}
                      onChange={e => setNotifEmail(e.target.checked)}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${notifEmail ? 'bg-amber-600' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifEmail ? 'translate-x-4' : ''}`}></div>
                  </label>
                </div>
              </div>
              {!isReadOnly && (
                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSaveUmum}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    <Save size={18} />
                    {isSaving ? "Menyimpan..." : "Simpan Pengaturan Notifikasi"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "keamanan" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Pengaturan Keamanan</h2>

              <div className="p-6 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="text-blue-500" size={24} />
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">Ubah Password Administrator</h3>
                </div>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password Baru</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Masukkan kombinasi minimal 6 huruf dan angka" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Konfirmasi Password Baru</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  {!isReadOnly && (
                    <div className="pt-2">
                      <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto">
                        Perbarui Password
                      </button>
                    </div>
                  )}
                </form>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity size={18} className="text-slate-400" />
                  Log Aktivitas Login Terakhir
                </h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Windows 11 - Chrome Browser</p>
                      <p className="text-xs text-slate-500">IP: 182.23.14.99 • Denpasar, Bali</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Saat ini</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">iOS 16 - Safari Browser</p>
                      <p className="text-xs text-slate-500">IP: 140.99.12.3 • Badung, Bali</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">2 hari lalu</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Manajemen Pencadangan Data</h2>

              <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-center">
                <Database size={48} className="text-blue-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Simpan Sistem Data</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                  Anda dapat membuat salinan (backup) cadangan dari seluruh data warga, transaksi, dan surat secara manual.
                </p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={handleBackup}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <Download size={18} />
                    Buat Backup Data Warga (Excel)
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Histori Backup</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Belum ada riwayat backup yang dibuat.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
