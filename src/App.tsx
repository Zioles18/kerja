import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import DataWarga from "./pages/dashboard/DataWarga";
import LaporanWarga from "./pages/dashboard/LaporanWarga";
import LaporanMutasi from "./pages/dashboard/LaporanMutasi";
import LaporanIuran from "./pages/dashboard/LaporanIuran";
import JadwalRonda from "./pages/dashboard/JadwalRonda";
import BantuanSosial from "./pages/dashboard/BantuanSosial";
import DataTamu from "./pages/dashboard/DataTamu";
import SuratOnline from "./pages/dashboard/SuratOnline";
import Pengumuman from "./pages/dashboard/Pengumuman";
import Keuangan from "./pages/dashboard/Keuangan";
import Pengaduan from "./pages/dashboard/Pengaduan";
import Profil from "./pages/dashboard/Profil";
import ProfilDesaAdat from "./pages/dashboard/ProfilDesaAdat";
import SuperAdminPanel from "./pages/dashboard/SuperAdminPanel";
import UpdatePaket from "./pages/dashboard/UpdatePaket";

import MutasiWarga from "./pages/dashboard/MutasiWarga";
import KartuKeluarga from "./pages/dashboard/KartuKeluarga";
import RumahBlok from "./pages/dashboard/RumahBlok";
import Pengurus from "./pages/dashboard/Pengurus";
import ArsipDokumen from "./pages/dashboard/ArsipDokumen";
import AgendaKegiatan from "./pages/dashboard/AgendaKegiatan";
import AbsensiWarga from "./pages/dashboard/AbsensiWarga";
import IuranWarga from "./pages/dashboard/IuranWarga";
import TagihanWarga from "./pages/dashboard/TagihanWarga";
import BukuKas from "./pages/dashboard/BukuKas";
import Pengeluaran from "./pages/dashboard/Pengeluaran";
import PlaceholderPage from "./pages/dashboard/PlaceholderPage";
import LaporanKas from "./pages/dashboard/LaporanKas";
import LaporanKegiatan from "./pages/dashboard/LaporanKegiatan";
import Pengaturan from "./pages/dashboard/Pengaturan";
import UserManagement from "./pages/dashboard/UserManagement";
import HakAkses from "./pages/dashboard/HakAkses";

import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardOverview />} />
            
            {/* Data Master */}
            <Route path="warga" element={<DataWarga />} />
            <Route path="kk" element={<KartuKeluarga />} />
            <Route path="mutasi" element={<MutasiWarga />} />
            <Route path="rumah" element={<RumahBlok />} />
            <Route path="pengurus" element={<Pengurus />} />

            {/* Administrasi */}
            <Route path="surat" element={<SuratOnline />} />
            <Route path="arsip" element={<ArsipDokumen />} />
            <Route path="pengumuman" element={<Pengumuman />} />
            <Route path="agenda" element={<AgendaKegiatan />} />
            <Route path="absensi" element={<AbsensiWarga />} />

            {/* Keuangan */}
            <Route path="iuran" element={<IuranWarga />} />
            <Route path="tagihan" element={<TagihanWarga />} />
            <Route path="buku-kas" element={<BukuKas />} />
            <Route path="pengeluaran" element={<Pengeluaran />} />
            <Route path="laporan-keuangan" element={<Keuangan />} /> {/* Keuangan existing */}

            {/* Keamanan & Sosial */}
            <Route path="ronda" element={<JadwalRonda />} />
            <Route path="pengaduan" element={<Pengaduan />} />
            <Route path="bansos" element={<BantuanSosial />} />
            <Route path="tamu" element={<DataTamu />} />

            {/* Pelaporan */}
            <Route path="laporan-warga" element={<LaporanWarga />} />
            <Route path="laporan-mutasi" element={<LaporanMutasi />} />
            <Route path="laporan-iuran" element={<LaporanIuran />} />
            <Route path="laporan-kas" element={<LaporanKas />} />
            <Route path="laporan-kegiatan" element={<LaporanKegiatan />} />

            {/* Sistem */}
            <Route path="user" element={<UserManagement />} />
            <Route path="hak-akses" element={<HakAkses />} />
            <Route path="pengaturan" element={<Pengaturan />} />

            <Route path="paket" element={<UpdatePaket />} />
            <Route path="profil" element={<Profil />} />
            <Route path="profil-desa-adat" element={<ProfilDesaAdat />} />
            <Route path="super-admin" element={<SuperAdminPanel />} />

            <Route path="dusun/:dusunName" element={<PlaceholderPage title="Data Dusun" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
