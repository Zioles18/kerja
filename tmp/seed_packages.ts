import { db } from "../src/firebase";
import { doc, setDoc } from "firebase/firestore";

const packages = [
  {
    id: "gratis",
    name: "Gratis",
    price: "Rp 0",
    duration: "selamanya",
    features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Pengumuman", "Iuran Warga", "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Profil Saya", "Update Paket"],
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Gratis%20DataWarga"
  },
  {
    id: "warga",
    name: "Warga",
    price: "Rp 124rb",
    duration: "bulan",
    features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Profil Saya", "Update Paket"],
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Warga%20DataWarga"
  },
  {
    id: "harmoni",
    name: "Harmoni",
    price: "Rp 224rb",
    duration: "3 bulan",
    features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Laporan Kegiatan", "Profil Saya", "Update Paket"],
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Harmoni%20DataWarga"
  },
  {
    id: "nusantara",
    name: "Nusantara",
    price: "Rp 374rb",
    duration: "6 bulan",
    features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Laporan Kegiatan", "Profil Saya", "Update Paket", "Manajemen User", "Hak Akses", "Pengaturan"],
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Nusantara%20DataWarga"
  }
];

async function seed() {
  console.log("Starting seed...");
  for (const pkg of packages) {
    try {
      await setDoc(doc(db, "packages", pkg.id), pkg);
      console.log(`Seeded package: ${pkg.name}`);
    } catch (e) {
      console.error(`Error seeding ${pkg.name}:`, e);
    }
  }
  console.log("Seeding complete!");
  process.exit(0);
}

seed();
