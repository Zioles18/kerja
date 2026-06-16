import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useDesaAdat } from "../hooks/useDesaAdat";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bell, 
  Wallet, 
  MessageSquare, 
  User, 
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  CreditCard,
  ArrowRightLeft,
  Home,
  UserCog,
  Archive,
  Calendar,
  ClipboardCheck,
  Coins,
  Receipt,
  BookOpen,
  ArrowUpRight,
  PieChart,
  Shield,
  HeartHandshake,
  UserPlus,
  FileBarChart,
  UsersRound,
  Key,
  Package,
  Settings,
  ShieldAlert,
  Gem
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { collection, onSnapshot, query, orderBy, where, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export default function DashboardLayout() {
  const { user, logout, isReadOnly } = useAuth();
  const isExpired = (user as any)?.isExpired;
  const { theme, toggleTheme } = useTheme();
  const { settings } = useDesaAdat();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const [activePackage, setActivePackage] = useState<any>(null);

  useEffect(() => {
    if (settings.subscriptionPackages && settings.subscriptionPackages.length > 0) {
      const userSub = user?.subscription || "Gratis";
      const pkg = settings.subscriptionPackages.find(p => p.name === userSub) || settings.subscriptionPackages[0];
      setActivePackage(pkg);
    }
  }, [settings, user]);

  useEffect(() => {
    if (user?.role !== 'Warga' && user?.id) {
      const q = query(collection(db, "notifikasi"), where("adminId", "==", user?.id), orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
        setNotifications(data);
      }, (error) => {
        console.error("Error fetching notifications:", error);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifikasi", id), { read: true });
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, "notifikasi", n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const menuGroups = [
    {
      title: "MENU UTAMA",
      items: [
        { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/dashboard/warga", icon: Users, label: "Data Warga" },
        { path: "/dashboard/kk", icon: CreditCard, label: "Data Kartu Keluarga" },
        { path: "/dashboard/mutasi", icon: ArrowRightLeft, label: "Mutasi Warga" },
        { path: "/dashboard/rumah", icon: Home, label: "Data Rumah / Blok" },
        { path: "/dashboard/pengurus", icon: UserCog, label: "Data Pengurus" },
      ]
    },
    {
      title: "ADMINISTRASI",
      items: [
        { path: "/dashboard/surat", icon: FileText, label: "Surat Menyurat" },
        { path: "/dashboard/arsip", icon: Archive, label: "Arsip Dokumen" },
        { path: "/dashboard/pengumuman", icon: Bell, label: "Pengumuman" },
        { path: "/dashboard/agenda", icon: Calendar, label: "Agenda Kegiatan" },
        { path: "/dashboard/absensi", icon: ClipboardCheck, label: "Absensi Warga" },
      ]
    },
    {
      title: "KEUANGAN",
      items: [
        { path: "/dashboard/iuran", icon: Coins, label: "Iuran Warga" },
        { path: "/dashboard/tagihan", icon: Receipt, label: "Tagihan/Iuran" },
        { path: "/dashboard/buku-kas", icon: BookOpen, label: "Buku Kas" },
        { path: "/dashboard/pengeluaran", icon: ArrowUpRight, label: "Pengeluaran" },
        { path: "/dashboard/laporan-keuangan", icon: PieChart, label: "Data Keuangan" },
      ]
    },
    {
      title: "KEAMANAN & SOSIAL",
      items: [
        { path: "/dashboard/ronda", icon: Shield, label: "Jadwal Ronda" },
        { path: "/dashboard/pengaduan", icon: MessageSquare, label: "Pengaduan Warga" },
        { path: "/dashboard/bansos", icon: HeartHandshake, label: "Bantuan Sosial" },
        { path: "/dashboard/tamu", icon: UserPlus, label: "Data Tamu" },
      ]
    },
    {
      title: "PELAPORAN",
      items: [
        { path: "/dashboard/laporan-warga", icon: FileBarChart, label: "Data Pengaduan Warga" },
        { path: "/dashboard/laporan-mutasi", icon: FileBarChart, label: "Data Mutasi" },
        { path: "/dashboard/laporan-iuran", icon: FileBarChart, label: "Data Iuran" },
        { path: "/dashboard/laporan-kas", icon: FileBarChart, label: "Data Kas" },
        { path: "/dashboard/laporan-kegiatan", icon: FileBarChart, label: "Data Kegiatan" },
      ]
    },
    ...(user?.role === 'super_admin' ? [{
      title: "SUPER ADMIN",
      items: [
        { path: "/dashboard/super-admin", icon: ShieldAlert, label: "Panel Transaksi" },
        { path: "/dashboard/profil-desa-adat", icon: Settings, label: "Profil Desa Adat" },
      ]
    }] : []),
    {
      title: "SISTEM",
      items: [
        { path: "/dashboard/user", icon: UsersRound, label: "Manajemen User" },
        { path: "/dashboard/hak-akses", icon: Key, label: "Hak Akses" },

        { path: "/dashboard/pengaturan", icon: Settings, label: "Pengaturan" },
        { path: "/dashboard/profil", icon: User, label: "Profil Saya" },
        { path: "/dashboard/paket", icon: Gem, label: "Update Paket", isNew: true },
      ]
    }
  ];

  const filteredMenuGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Super Admin sees everything
      if (user?.role === 'super_admin') return true;

      // Filter based on subscription features
      if (activePackage && !activePackage.features?.includes(item.label)) {
        return false;
      }

      // Hide most SYSTEM group items for demo users
      if (user?.role === 'demo' && group.title === "SISTEM" && !["Profil Saya", "Update Paket"].includes(item.label)) {
        return false;
      }

      // Manual disable menus from Hak Akses
      if (user?.disabledMenus?.includes(item.label)) {
        return false;
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  const sidebarContent = (
    <>
      <div className="p-6 flex items-center gap-3">
        {settings.logo ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white">
            <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">D</span>
          </div>
        )}
        <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white truncate" title={settings.nama || "DataWarga"}>
          {settings.nama || "DataWarga"}
        </span>
      </div>

      <div className="px-4 pb-6">
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold overflow-hidden shrink-0">
            {user?.profilePic ? (
              <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user?.nama?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.nama}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={user?.email}>{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                {user?.role === 'demo' ? (isExpired ? "TRIAL EXPIRED" : "TRIAL 30 HARI") : (user?.role === 'admin_rt' ? "Admin Desa Adat" : user?.role.replace('_', ' '))}
              </p>
              <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold uppercase tracking-wider">
                {user?.subscription || "Gratis"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-6 overflow-y-auto pb-4 custom-scrollbar">
        {filteredMenuGroups.map((group, index) => (
          <div key={index}>
            <h3 className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                      isActive 
                        ? "bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <item.icon size={18} className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-full z-10 transition-colors duration-200">
        {sidebarContent}
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col md:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 md:ml-64 flex flex-col min-h-screen">
        <div className="sticky top-0 z-[60] flex flex-col w-full">
          {user?.role === 'demo' && (
            <div className={`${isExpired ? 'bg-rose-600' : 'bg-amber-500'} text-white px-4 py-3 text-center text-sm font-bold shadow-lg flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full z-[70]`}>
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} />
                <span>
                  {isExpired 
                    ? "Masa percobaan 30 hari telah habis. Silakan upgrade paket untuk melanjutkan." 
                    : "MODE TRIAL: Anda bebas mencoba fitur input data selama 30 hari."}
                </span>
              </div>
              <Link 
                to="/dashboard/paket" 
                className="bg-white text-slate-900 px-4 py-1 rounded-full text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Upgrade Sekarang
              </Link>
            </div>
          )}
          {/* Header */}
          <header className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8 transition-colors duration-200 w-full`}>
            <div className="flex items-center gap-2 md:hidden">
            {settings.logo ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white shadow-sm border border-slate-100 dark:border-slate-800">
                <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">{settings.nama?.charAt(0).toUpperCase() || "D"}</span>
              </div>
            )}
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white truncate max-w-[140px]">
              {settings.nama || "DataWarga"}
            </span>
          </div>
          <div className="hidden md:block"></div>
          
          <div className="flex items-center gap-2">
            {user?.role !== 'Warga' && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                >
                  <Bell size={20} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[100]"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h4 className="font-bold text-slate-900 dark:text-white">Notifikasi</h4>
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          Tandai semua dibaca
                        </button>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                            Belum ada notifikasi
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => markAsRead(n.id)}
                              className={`p-4 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                            >
                              <div className="flex gap-3">
                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                <div>
                                  <p className="text-sm text-slate-900 dark:text-white font-medium">{n.judul}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.pesan}</p>
                                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{new Date(n.timestamp?.toDate ? n.timestamp.toDate() : n.timestamp).toLocaleDateString("id-ID")}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-8 flex-1 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
