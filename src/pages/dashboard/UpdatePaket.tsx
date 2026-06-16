import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useDesaAdat, Package } from "../../hooks/useDesaAdat";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Package as PackageIcon, X, MessageCircle } from "lucide-react";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const FALLBACK_PACKAGES: Package[] = [
  { 
    id: 'gratis', 
    name: "Gratis", 
    price: "Rp 0", 
    duration: "selamanya", 
    features: ["Hingga 20 KK", "Data warga dasar", "Pengumuman", "Iuran sederhana", "Export data ke Excel"], 
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Gratis%20DataWarga" 
  },
  { 
    id: 'warga', 
    name: "Warga", 
    price: "Rp 124rb", 
    duration: "bulan", 
    features: ["KK & warga unlimited", "Semua fitur Paket Gratis", "Surat digital & arsip", "Buku kas lengkap", "Jadwal ronda", "Support prioritas via WA"], 
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Warga%20DataWarga" 
  },
  { 
    id: 'harmoni', 
    name: "Harmoni", 
    price: "Rp 224rb", 
    duration: "3 bulan", 
    features: ["Semua fitur Warga", "Hanya Rp 75.000/bulan", "Hemat 33% vs bulanan", "Cetak & export invoice", "Laporan lengkap", "Support prioritas via WA"], 
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Harmoni%20DataWarga" 
  },
  { 
    id: 'nusantara', 
    name: "Nusantara", 
    price: "Rp 374rb", 
    duration: "6 bulan", 
    features: ["Semua fitur Harmoni", "Hanya Rp 62.000/bulan", "Hemat 41% vs bulanan", "Multi Desa Adat management", "Custom branding & logo", "Dedicated support & onboarding"], 
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Nusantara%20DataWarga" 
  }
];

export default function UpdatePaket() {
  const { user, isReadOnly } = useAuth();
  const { settings, loading } = useDesaAdat();
  const [packages, setPackages] = useState<Package[]>(FALLBACK_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (settings.subscriptionPackages && settings.subscriptionPackages.length > 0) {
      setPackages(settings.subscriptionPackages);
    }
  }, [settings]);

  const handleUpgrade = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk melakukan upgrade paket.");
      return;
    }
    if (!selectedPackage || !user) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "transactions"), {
        userId: user.id,
        userEmail: user.email,
        userName: user.nama,
        package: selectedPackage.name,
        amount: selectedPackage.price,
        status: "pending",
        timestamp: serverTimestamp()
      });

      window.open(selectedPackage.waLink, "_blank");
      setSelectedPackage(null);
    } catch (error) {
      console.error("Failed to create transaction", error);
      alert("Gagal memproses permintaan upgrade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && packages.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-500 animate-pulse font-medium">Memuat daftar paket...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden sm:overflow-visible">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
          <PackageIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Update Paket</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pilih paket yang sesuai dengan kebutuhan lingkungan Anda</p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-6 rounded-2xl flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
          <Check size={20} />
        </div>
        <div>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Paket Aktif Saat Ini</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Paket {user?.subscription || "Gratis"} 
            <span className="ml-2 text-xs font-normal bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {user?.subscriptionStatus || "Active"}
            </span>
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg, idx) => {
          const isCurrent = user?.subscription === pkg.name || (!user?.subscription && pkg.name === "Gratis");
          
          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative bg-white dark:bg-slate-800 p-8 rounded-3xl border flex flex-col ${
                isCurrent 
                  ? 'border-blue-600 ring-2 ring-blue-600/20' 
                  : 'border-slate-100 dark:border-slate-700'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  Aktif
                </div>
              )}
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{pkg.name}</h3>
              <div className="mb-6">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{pkg.price}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">/{pkg.duration === "selamanya" ? "forever" : pkg.duration}</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {pkg.features?.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-3 text-slate-600 dark:text-slate-400 text-sm">
                    <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent}
                onClick={() => setSelectedPackage(pkg)}
                className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${
                  isCurrent
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                }`}
              >
                {isCurrent ? "Paket Saat Ini" : `Pilih ${pkg.name}`}
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPackage(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-[95%] sm:w-full max-w-md mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Konfirmasi Upgrade</h3>
                  <button onClick={() => setSelectedPackage(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Paket yang dipilih:</p>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedPackage.name} — {selectedPackage.price}
                  </h4>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Klik tombol di bawah untuk diarahkan ke WhatsApp Admin.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Kirim pesan dan lakukan pembayaran sesuai instruksi admin.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Admin akan memverifikasi dan mengaktifkan paket Anda dalam 1x24 jam.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedPackage(null)}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpgrade}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? "Memproses..." : (
                      <>
                        <MessageCircle size={20} />
                        Bayar Sekarang
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
