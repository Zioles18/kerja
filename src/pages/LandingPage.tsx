import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, FileText, Bell, BarChart3, Wallet, MessageSquare, Play, MessageCircle, X, ExternalLink, AlertCircle, ChevronLeft, Eye, EyeOff, Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useDesaAdat } from "../hooks/useDesaAdat";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, query, onSnapshot } from "firebase/firestore";

interface Package {
  name: string;
  price: string;
  duration: string;
  features: string[];
  waLink: string;
}

export default function LandingPage() {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    const fullText = "Desa adat kini lebih Tertib dan Modern";
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && text === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && text === "") {
      timer = setTimeout(() => setIsDeleting(false), 500);
    } else {
      timer = setTimeout(() => {
        setText(prev => 
          isDeleting 
            ? fullText.substring(0, prev.length - 1) 
            : fullText.substring(0, prev.length + 1)
        );
      }, isDeleting ? 30 : 80);
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting]);

  const [packages, setPackages] = useState<Package[]>([
    {
      name: "Gratis",
      price: "Rp 0",
      duration: "selamanya",
      features: ["Hingga 20 KK", "Data warga dasar", "Pengumuman", "Iuran sederhana", "Export data ke Excel"],
      waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Gratis%20DataWarga"
    },
    {
      name: "Warga",
      price: "Rp 124rb",
      duration: "bulan",
      features: ["KK & warga unlimited", "Semua fitur Paket Gratis", "Surat digital & arsip", "Buku kas lengkap", "Jadwal ronda", "Support prioritas via WA"],
      waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Warga%20DataWarga"
    },
    {
      name: "Harmoni",
      price: "Rp 224rb",
      duration: "3 bulan",
      features: ["Semua fitur Warga", "Hanya Rp 75.000/bulan", "Hemat 33% vs bulanan", "Cetak & export invoice", "Laporan lengkap", "Support prioritas via WA"],
      waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Harmoni%20DataWarga"
    },
    {
      name: "Nusantara",
      price: "Rp 374rb",
      duration: "6 bulan",
      features: ["Semua fitur Harmoni", "Hanya Rp 62.000/bulan", "Hemat 41% vs bulanan", "Multi Desa Adat management", "Custom branding & logo", "Dedicated support & onboarding"],
      waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Nusantara%20DataWarga"
    }
  ]);

  const { user } = useAuth();
  const { settings } = useDesaAdat();

  useEffect(() => {
    if (settings.subscriptionPackages && settings.subscriptionPackages.length > 0) {
      setPackages(settings.subscriptionPackages);
    }
  }, [settings]);

  const handleMobileNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    
    const targetId = href.replace('#', '');
    const elem = document.getElementById(targetId);
    if (elem) {
      setTimeout(() => {
        elem.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  const handleDesktopNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const elem = document.getElementById(targetId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePayment = async () => {
    if (!selectedPackage) return;
    
    if (!user) {
      alert("Silakan login terlebih dahulu untuk melakukan pembelian.");
      return;
    }

    try {
      // Create transaction in Firestore
      await addDoc(collection(db, "transactions"), {
        userId: user.id,
        userEmail: user.email,
        userName: user.nama,
        package: selectedPackage.name,
        amount: selectedPackage.price,
        status: "pending",
        timestamp: serverTimestamp()
      });

      // Open WhatsApp link
      window.open(selectedPackage.waLink, "_blank");
      setSelectedPackage(null);
    } catch (error) {
      console.error("Failed to create transaction", error);
      alert("Terjadi kesalahan saat memproses transaksi.");
    }
  };

  const { loginAsDemo } = useAuth();
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);

  const handleDemoLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDemoLoggingIn(true);
    try {
      await loginAsDemo();
    } catch (err) {
      alert("Gagal masuk ke akun demo. Silakan coba lagi.");
    } finally {
      setIsDemoLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-[#0f172a]/80 backdrop-blur-md z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                {settings.logo ? (
                  <img 
                    src={settings.logo} 
                    alt="Logo DataWarga" 
                    className="w-full h-full object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-blue-600 font-bold text-xl">D</span>
                )}
              </div>
              <span className="font-bold text-xl sm:text-2xl tracking-tight text-white">{settings.nama || "datawarga"}</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-10">
              <a href="#fitur" onClick={(e) => handleDesktopNavClick(e, '#fitur')} className="text-slate-300 hover:text-white font-medium transition-colors">Fitur</a>
              <a href="#cara-kerja" onClick={(e) => handleDesktopNavClick(e, '#cara-kerja')} className="text-slate-300 hover:text-white font-medium transition-colors">Cara Kerja</a>
              <a href="#harga" onClick={(e) => handleDesktopNavClick(e, '#harga')} className="text-slate-300 hover:text-white font-medium transition-colors">Harga</a>

            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4">
                <button 
                  onClick={handleDemoLogin}
                  disabled={isDemoLoggingIn}
                  className="text-slate-300 hover:text-white font-medium transition-colors active:scale-95 disabled:opacity-50"
                >
                  {isDemoLoggingIn ? "Loading..." : "Akun Demo"}
                </button>
                <Link to="/login" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 active:scale-95">Login Admin</Link>
              </div>
              
              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
              >
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ 
                opacity: 1, 
                height: 'auto',
                transition: {
                  height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
                  opacity: { duration: 0.25, delay: 0.05 }
                }
              }}
              exit={{ 
                opacity: 0, 
                height: 0,
                transition: {
                  height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                  opacity: { duration: 0.2 }
                }
              }}
              className="md:hidden bg-[#0f172a] border-b border-slate-800 overflow-hidden max-h-[calc(100vh-80px)] overflow-y-auto"
            >
              <motion.div 
                initial="closed"
                animate="open"
                variants={{
                  open: {
                    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
                  },
                  closed: {
                    transition: { staggerChildren: 0.05, staggerDirection: -1 }
                  }
                }}
                className="px-4 py-8 space-y-6"
              >
                {[
                  { name: "Fitur", href: "#fitur" },
                  { name: "Cara Kerja", href: "#cara-kerja" },
                  { name: "Harga", href: "#harga" },

                ].map((item) => (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleMobileNavClick(e, item.href)}
                    variants={{
                      open: { y: 0, opacity: 1 },
                      closed: { y: 20, opacity: 0 }
                    }}
                    className="block text-xl font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    {item.name}
                  </motion.a>
                ))}
                
                <motion.div 
                  variants={{
                    open: { y: 0, opacity: 1 },
                    closed: { y: 20, opacity: 0 }
                  }}
                  className="pt-6 flex flex-col gap-4"
                >
                  <button 
                    onClick={handleDemoLogin}
                    disabled={isDemoLoggingIn}
                    className="w-full py-4 text-center rounded-2xl font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isDemoLoggingIn ? "Loading..." : "Akun Demo"}
                  </button>
                  <Link 
                    to="/login" 
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-4 text-center rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Login Admin
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="beranda" className="pt-32 sm:pt-44 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-left z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-sm font-medium text-slate-300">Platform #1 Administrasi Desa Adat Digital</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.2]"
            >
              SANDAT BALI <br />
              <span className="text-xl sm:text-2xl lg:text-3xl text-slate-300 font-semibold block mt-3 mb-6">( Sistem Administrasi Desa Adat )</span>
              <span className="text-blue-500 text-2xl sm:text-3xl lg:text-4xl block min-h-[80px] sm:min-h-[60px]">
                {text}<span className="animate-pulse">|</span>
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-lg text-slate-400 max-w-xl mb-10 leading-relaxed"
            >
              Kelola data warga, iuran, kas, surat, dan pengumuman dalam satu aplikasi digital yang mudah digunakan siapa saja.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              <button 
                onClick={handleDemoLogin}
                disabled={isDemoLoggingIn}
                className="bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 text-base sm:text-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isDemoLoggingIn ? "Menghubungkan..." : "Klik Akun Demo"} <span className="text-xl">→</span>
              </button>
              <a href="#fitur" className="bg-transparent text-white border border-slate-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-medium hover:bg-slate-800 transition-all text-base sm:text-lg active:scale-95 flex items-center justify-center gap-2">
                <Play size={20} className="fill-current" /> Lihat Demo
              </a>
            </motion.div>


          </div>

          {/* Right Content - Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="relative"
          >
            {/* Main Laptop Mockup */}
            <div className="relative z-10 bg-white rounded-2xl p-2 shadow-2xl shadow-blue-900/20 border border-slate-200">
              <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" alt="Dashboard Mockup" className="w-full h-auto object-cover opacity-90" />
              </div>
              {/* Laptop Base */}
              <div className="h-4 bg-slate-300 rounded-b-3xl mx-[-8px] mt-2 shadow-inner"></div>
              <div className="h-1 bg-slate-400 rounded-b-3xl mx-4"></div>
            </div>

            {/* Floating Card 1 */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute left-0 sm:-left-12 top-1/4 sm:top-1/3 z-20 bg-[#1e293b] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl border border-slate-700 scale-75 sm:scale-100 origin-left"
            >
              <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Iuran Bulan Ini</p>
              <p className="text-base sm:text-xl font-bold text-emerald-400">Rp 4.250.000</p>
            </motion.div>

            {/* Floating Card 2 */}
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute right-0 sm:-right-8 bottom-1/4 z-20 bg-[#1e293b] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl border border-slate-700 scale-75 sm:scale-100 origin-right"
            >
              <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Warga Terdaftar</p>
              <p className="text-base sm:text-xl font-bold text-blue-400">1.247</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Masalah Section */}
      <section className="py-16 sm:py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Masalah yang Sering Terjadi di Desa Adat</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Apakah Desa Adat Anda mengalami hal-hal ini?</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              "Catatan iuran berantakan & sering hilang",
              "Warga sering lupa bayar iuran bulanan",
              "Pembuatan surat masih manual dan lambat",
              "Laporan keuangan sulit dibuat & tidak akurat",
              "Kas Desa Adat tidak transparan bagi warga"
            ].map((masalah, idx) => (
              <div 
                key={idx}
                className="bg-[#1e293b]/40 p-6 rounded-2xl border border-slate-800/50 flex items-start gap-4"
              >
                <div className="text-red-500/80 mt-1">
                  <AlertCircle size={20} />
                </div>
                <p className="text-slate-300 font-medium leading-relaxed">{masalah}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fitur Section */}
      <section id="fitur" className="py-16 sm:py-24 bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Fitur Lengkap untuk Desa Adat</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Semua yang Anda butuhkan untuk mengelola administrasi lingkungan dengan lebih profesional.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Users, title: "Manajemen Data Warga", desc: "Kelola data kependudukan, KK, dan status warga dengan mudah and aman." },
              { icon: FileText, title: "Pengajuan Surat Online", desc: "Warga dapat mengajukan surat pengantar Desa Adat secara online tanpa harus datang." },
              { icon: Bell, title: "Pengumuman Desa Adat", desc: "Sebarkan informasi penting dan pengumuman kegiatan ke seluruh warga dengan cepat." },
              { icon: BarChart3, title: "Dashboard Statistik", desc: "Pantau demografi warga dan statistik lingkungan melalui grafik interaktif." },
              { icon: Wallet, title: "Laporan Keuangan", desc: "Transparansi iuran kas Desa Adat dan pencatatan pengeluaran yang rapi." },
              { icon: MessageSquare, title: "Sistem Pengaduan Warga", desc: "Fasilitas pelaporan masalah lingkungan yang terstruktur dan mudah ditindaklanjuti." }
            ].map((fitur, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5 }}
                className="bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 text-blue-400">
                  <fitur.icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{fitur.title}</h3>
                <p className="text-slate-400">{fitur.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara Kerja */}
      <section id="cara-kerja" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Cara Kerja yang Sederhana</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Mulai digitalisasi administrasi lingkungan Anda hanya dalam 3 langkah mudah.</p>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12">
            {[
              { step: "1", title: "Daftar Akun", desc: "Buat akun untuk Desa Adat Anda dan atur profil lingkungan." },
              { step: "2", title: "Tambahkan Data Warga", desc: "Input data krama atau undang warga untuk mendaftar mandiri." },
              { step: "3", title: "Kelola Administrasi Digital", desc: "Mulai gunakan fitur surat, keuangan, dan pengumuman." }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center max-w-xs relative">
                {idx !== 2 && <div className="hidden md:block absolute top-8 left-[60%] w-full h-[2px] bg-slate-800"></div>}
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-blue-600/30 relative z-10">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-blue-500 font-bold tracking-widest text-sm mb-4">HARGA</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Pilih Paket Sesuai Kebutuhan</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Semua paket termasuk free trial. Tanpa kartu kredit.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {packages.map((pkg, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                transition={{ type: "spring", stiffness: 300 }}
                className={`${idx === 2 ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-800'} bg-[#1e293b]/50 p-8 rounded-3xl border flex flex-col relative`}
              >
                {idx === 2 && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap">Paling Populer</div>
                )}
                {idx === 3 && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap">Nilai Terbaik</div>
                )}
                
                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                  {idx === 0 && "Untuk Desa Adat kecil yang baru memulai digitalisasi."}
                  {idx === 1 && "Untuk Desa Adat yang aktif dan terorganisir."}
                  {idx === 2 && "Paling populer untuk Desa Adat yang berkembang."}
                  {idx === 3 && "Nilai terbaik untuk Desa Adat besar."}
                </p>

                <div className="mb-8">
                  <span className="text-3xl font-bold text-white">{pkg.price}</span>
                  <span className="text-slate-400 text-sm ml-1">/{pkg.duration}</span>
                </div>

                <button 
                  onClick={() => setSelectedPackage(pkg)}
                  className={`block text-center w-full py-3 rounded-xl font-bold transition-all active:scale-95 mb-8 ${
                    idx === 2 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-[#0f172a] text-white border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {idx === 0 ? "Mulai Gratis Sekarang" : `Pilih ${pkg.name}`}
                </button>

                <ul className="space-y-4 flex-1">
                  {pkg.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-slate-300 text-sm">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span> 
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b1120] text-slate-400 py-8 sm:py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                {settings.logo ? (
                  <img 
                    src={settings.logo} 
                    alt="Logo DataWarga" 
                    className="w-full h-full object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-blue-600 font-bold text-xl">D</span>
                )}
              </div>
              <span className="font-bold text-xl text-white tracking-tight">{settings.nama || "datawarga"}</span>
            </div>
            <p className="mb-4 max-w-sm">Solusi digital terbaik untuk administrasi lingkungan Desa Adat yang lebih transparan dan efisien.</p>
            <p>Email: alitsumberdana@gmail.com</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Menu</h4>
            <ul className="space-y-2">
              <li><a href="#beranda" className="hover:text-white transition-colors">Beranda</a></li>
              <li><a href="#fitur" className="hover:text-white transition-colors">Fitur</a></li>
              <li><a href="#harga" className="hover:text-white transition-colors">Harga</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-sm">
          &copy; {new Date().getFullYear()} Sandat Bali - PT.Digital Nusantara Creative.
        </div>
      </footer>

      {/* Floating Chat Button */}
      <a 
        href="https://wa.me/6282145612226" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-emerald-500 text-white p-3 sm:px-5 sm:py-3 rounded-full font-medium shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2 z-50"
      >
        <MessageCircle size={24} className="fill-current" />
        <span className="hidden sm:inline">Chat Kami</span>
      </a>

      {/* Purchase Modal */}
      <AnimatePresence>
        {selectedPackage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPackage(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-[95%] sm:w-full max-w-lg mx-auto bg-[#1e293b] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Upgrade ke Paket {selectedPackage.name}</h3>
                  <button 
                    onClick={() => setSelectedPackage(null)}
                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="bg-[#0f172a] rounded-2xl p-6 mb-6 border border-slate-800">
                  <p className="text-sm text-slate-400 mb-1">Detail paket:</p>
                  <h4 className="text-xl font-bold text-white mb-2">
                    {selectedPackage.name} — {selectedPackage.price}{selectedPackage.price !== "Gratis" && `/${selectedPackage.duration === "1 bulan" ? "bulan" : selectedPackage.duration}`}
                  </h4>
                  <p className="text-sm text-slate-400">
                    Durasi: {selectedPackage.duration} • {selectedPackage.name === "Basic" ? "Maks 50 KK" : selectedPackage.name === "Pro" ? "Maks 200 KK" : "Maks Unlimited KK"}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <p className="flex items-center gap-2 text-white font-medium">
                    <span role="img" aria-label="steps">📋</span> Langkah pembayaran:
                  </p>
                  <ol className="space-y-3 text-slate-400 text-sm sm:text-base">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">1</span>
                      <span>Klik tombol "Bayar Sekarang" di bawah</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">2</span>
                      <span>Selesaikan pembayaran di halaman Lynk.id / WhatsApp</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">3</span>
                      <span>Paket aktif dalam 1x24 jam setelah verifikasi</span>
                    </li>
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setSelectedPackage(null)}
                    className="flex-1 py-3.5 rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handlePayment}
                    className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={18} />
                    Bayar Sekarang
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
