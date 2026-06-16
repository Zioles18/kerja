import { db } from "../src/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const INITIAL_PACKAGES = [
  { 
    id: 'gratis', 
    name: "Gratis", 
    price: "Rp 0", 
    duration: "selamanya", 
    features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Pengumuman", "Iuran Warga", "Laporan Warga", "Update Paket", "Profil Saya"], 
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Gratis%20DataWarga" 
  },
  { 
    id: 'warga', 
    name: "Warga", 
    price: "Rp 124rb", 
    duration: "bulan", 
    features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Update Paket", "Profil Saya"], 
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Warga%20DataWarga" 
  },
  { 
    id: 'harmoni', 
    name: "Harmoni", 
    price: "Rp 224rb", 
    duration: "3 bulan", 
    features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Laporan Kegiatan", "Update Paket", "Profil Saya"], 
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Harmoni%20DataWarga" 
  },
  { 
    id: 'nusantara', 
    name: "Nusantara", 
    price: "Rp 374rb", 
    duration: "6 bulan", 
    features: ["Dashboard", "Data Warga", "Data Kartu Keluarga", "Mutasi Warga", "Data Rumah / Blok", "Data Pengurus", "Surat Menyurat", "Arsip Dokumen", "Pengumuman", "Agenda Kegiatan", "Absensi Warga", "Iuran Warga", "Tagihan/Iuran", "Buku Kas", "Pengeluaran", "Laporan Keuangan", "Jadwal Ronda", "Pengaduan Warga", "Bantuan Sosial", "Data Tamu", "Laporan Warga", "Laporan Mutasi", "Laporan Iuran", "Laporan Kas", "Laporan Kegiatan", "Update Paket", "Profil Saya"], 
    waLink: "https://wa.me/6282145612226?text=Halo%20saya%20tertarik%20dengan%20paket%20Nusantara%20DataWarga" 
  }
];

async function migrate() {
  console.log("Starting migration to move packages into settings...");
  try {
    const docRef = doc(db, "settings", "desa_adat");
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      await updateDoc(docRef, {
        subscriptionPackages: INITIAL_PACKAGES
      });
      console.log("SUCCESS: Initial packages added to settings/desa_adat!");
    } else {
      console.error("ERROR: settings/desa_adat document not found. Please make sure settings exist.");
    }
  } catch (e: any) {
    console.error("Migration FAILED:", e.message);
  }
  process.exit(0);
}

migrate();
