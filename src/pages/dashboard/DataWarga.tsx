import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Plus, Edit, Trash2, Filter, Upload, X, ShieldAlert, Eye, FileText, MapPin, Phone, GraduationCap, User, CreditCard, Home, Calendar, Download, Columns, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../hooks/useAuth";
import { useLocation } from "react-router-dom";

import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, writeBatch, setDoc, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase";

import { handleFirestoreError, OperationType } from "../../utils/errorHandling";

interface Warga {
  id: string;
  nik: string;
  nama: string;
  alamat: string;
  noHp: string;
  status: string;
  kk: string;
  jenisKelamin: string;
  pendidikan: string;
  kelas: string;
  domisili: string;
  editApproved?: boolean;
  createdAt?: string;
  pindahKe?: string;
  keperluanPindah?: string;
  rumah?: string;
  tanggalLahir?: string;
  tanggalPindah?: string;
  tanggalMeninggal?: string;
  tanggalStatus?: string;
  hubunganKeluarga?: string;
  pekerjaan?: string;
  isPenguwot?: boolean;
}

const calculateAge = (birthDate: string | undefined): string => {
  if (!birthDate) return "-";
  const bDate = new Date(birthDate);
  if (isNaN(bDate.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - bDate.getFullYear();
  const m = today.getMonth() - bDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
    age--;
  }
  return age.toString();
};

export default function DataWarga() {
  const [warga, setWarga] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isReadOnly } = useAuth();
  const location = useLocation();

  const [filterGender, setFilterGender] = useState<string | null>(null);
  const [filterEducation, setFilterEducation] = useState<string | null>(null);
  const [filterDomisili, setFilterDomisili] = useState<string | null>(null);
  const [filterAgeRange, setFilterAgeRange] = useState<string | null>(null);
  const [filterJob, setFilterJob] = useState<string | null>(null);

  const availableColumns = [
    { id: 'nik', label: 'NIK' },
    { id: 'kk', label: 'KK' },
    { id: 'nama', label: 'NAMA' },
    { id: 'noHp', label: 'NO HP' },
    { id: 'jenisKelamin', label: 'JENIS KELAMIN' },
    { id: 'umur', label: 'UMUR' },
    { id: 'pekerjaan', label: 'PEKERJAAN' },
    { id: 'pendidikan', label: 'PENDIDIKAN' },
    { id: 'status', label: 'STATUS' },
    { id: 'hubungan', label: 'HUBUNGAN' },
    { id: 'domisili', label: 'DOMISILI' }
  ];
  
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    nik: true, kk: true, nama: true, noHp: true, jenisKelamin: true, umur: true, pekerjaan: true, pendidikan: true, status: true, hubungan: true, domisili: true
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [editingWarga, setEditingWarga] = useState<Warga | null>(null);
  const [formData, setFormData] = useState<Partial<Warga>>({
    nik: "",
    nama: "",
    kk: "",
    alamat: "",
    noHp: "",
    status: "Aktif",
    jenisKelamin: "Laki-laki",
    pekerjaan: "",
    pendidikan: "",
    domisili: "Dalam Desa",
    tanggalLahir: "",
    tanggalPindah: "",
    tanggalMeninggal: "",
    tanggalStatus: new Date().toISOString().split('T')[0],
    hubunganKeluarga: "Anggota Keluarga",
    isPenguwot: false,
  });
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [wargaToDelete, setWargaToDelete] = useState<Warga | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWarga, setSelectedWarga] = useState<Warga | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingEmpty, setIsDeletingEmpty] = useState(false);

  useEffect(() => {
    if (!user) return;
    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "warga"), orderBy("nama", "asc"));
    } else {
      q = query(collection(db, "warga"), where("adminId", "==", user?.id), orderBy("nama", "asc"));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data() as Warga;
        const isNeutral = !d.pendidikan || d.pendidikan === "";
        let edu = d.pendidikan || "Tidak Sekolah";
        let job = d.pekerjaan || "";
        
        if (d.tanggalLahir) {
          const agStr = calculateAge(d.tanggalLahir);
          if (agStr !== "-") {
            const age = parseInt(agStr);
            
            // Auto setting Pekerjaan
            const jobLower = (job || "").toLowerCase().trim();
            const isJobEmpty = !job || jobLower === "" || jobLower === "-" || jobLower === "lainnya" || jobLower === "tidak bekerja" || jobLower === "belum bekerja";
            
            if (age >= 7 && age <= 18 && isJobEmpty) {
              job = "Pelajar";
            } else if (age < 7 && isJobEmpty) {
              job = "Belum Bekerja";
            }

            // Auto setting Pendidikan
            const isInvalidLulus = (edu === "Lulus" || edu === "Pendidikan Tinggi") && age < 19;
            if (isNeutral || isInvalidLulus) {
              if (age < 2) edu = "Belum Sekolah";
              else if (age < 6) edu = "TK/PAUD";
              else if (age < 12) edu = "SD";
              else if (age < 15) edu = "SMP";
              else if (age < 19) edu = "SMA";
              else edu = "Lulus";
            }
          } else if (isNeutral) {
            edu = "SMA";
          }
        } else if (isNeutral) {
          edu = "SMA";
        }

        return {
          ...d,
          pendidikan: edu,
          pekerjaan: job,
          id: doc.id
        };
      });
      setWarga(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching warga:", error);
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, "warga");
      } catch (e) {
        // Error already logged
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (formData.tanggalLahir) {
      const ageStr = calculateAge(formData.tanggalLahir);
      if (ageStr !== "-") {
        const age = parseInt(ageStr);
        // Robust check for empty job
        const jobLower = (formData.pekerjaan || "").toLowerCase().trim();
        const isJobEmpty = !formData.pekerjaan || jobLower === "" || jobLower === "-" || jobLower === "lainnya" || jobLower === "tidak bekerja" || jobLower === "belum bekerja";

        if (age >= 7 && age <= 18 && isJobEmpty) {
          setFormData(prev => ({ ...prev, pekerjaan: "Pelajar" }));
        } else if (age < 7 && isJobEmpty) {
          setFormData(prev => ({ ...prev, pekerjaan: "Belum Bekerja" }));
        }
      }
    }
  }, [formData.tanggalLahir]);

  useEffect(() => {
    if (location.state?.filter) {
      const { type, value } = location.state.filter;
      if (type === 'gender') setFilterGender(value);
      if (type === 'education') setFilterEducation(value);
      if (type === 'domicile') setFilterDomisili(value);
      if (type === 'age') setFilterAgeRange(value);
      if (type === 'job') setFilterJob(value);
      
      // Clear location state to prevent reapplying on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const clearAdvancedFilters = () => {
    setFilterGender(null);
    setFilterEducation(null);
    setFilterDomisili(null);
    setFilterAgeRange(null);
    setFilterJob(null);
    setSearch("");
  };

  const handleDeleteAll = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      alert("Hanya admin yang dapat menghapus semua data.");
      return;
    }

    setIsDeletingAll(true);
    try {
      // Firestore client SDK doesn't support deleting a whole collection.
      // We need to delete documents in batches.
      const chunkSize = 450;
      for (let i = 0; i < warga.length; i += chunkSize) {
        const chunk = warga.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          batch.delete(doc(db, "warga", item.id));
        });
        await batch.commit();
      }
      setIsDeleteAllModalOpen(false);
      alert("Semua data warga berhasil dihapus.");
    } catch (error) {
      console.error("Error deleting all warga:", error);
      alert("Gagal menghapus semua data warga.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteEmpty = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      alert("Hanya admin yang dapat menghapus data.");
      return;
    }

    const emptyWarga = warga.filter(w => (!w.nik || w.nik === "-" || w.nik === "") && (!w.nama || w.nama === "-" || w.nama === ""));
    
    if (emptyWarga.length === 0) {
      alert("Tidak ada data warga yang kosong.");
      return;
    }

    if (!confirm(`Ditemukan ${emptyWarga.length} data warga yang kosong (Tanpa NIK & Nama). Yakin ingin menghapus semuanya?`)) return;

    setIsDeletingEmpty(true);
    try {
      const chunkSize = 450;
      for (let i = 0; i < emptyWarga.length; i += chunkSize) {
        const chunk = emptyWarga.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          batch.delete(doc(db, "warga", item.id));
        });
        await batch.commit();
      }
      alert(`Berhasil menghapus ${emptyWarga.length} data warga yang kosong.`);
    } catch (error) {
      console.error("Error deleting empty warga:", error);
      alert("Gagal menghapus data warga yang kosong.");
    } finally {
      setIsDeletingEmpty(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Read as array of arrays to find header row
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawRows.length === 0) {
        alert("File Excel kosong.");
        setImporting(false);
        return;
      }

      // Find header row: row that contains NIK, NAMA, or KK
      let headerRowIndex = 0;
      const keywords = ['nik', 'nama', 'kk', 'nomor', 'ktp'];
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i].map(cell => String(cell || "").toLowerCase());
        if (row.some(cell => keywords.some(kw => cell.includes(kw)))) {
          headerRowIndex = i;
          break;
        }
      }

      // Convert to JSON using the detected header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });

      const findKey = (row: any, keys: string[]) => {
        const rowKeys = Object.keys(row);
        for (const key of keys) {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const found = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedKey);
          if (found) return row[found];
        }
        return "";
      };

      const formattedData = jsonData.map((row: any) => {
        const jkRaw = String(findKey(row, ['jeniskelamin', 'jk', 'gender', 'jenis kelamin', 'jns kel', 'jns klmn', 'kelamin']) || "Laki-laki").toLowerCase().trim();
        let jenisKelamin = "Laki-laki";
        if (jkRaw === 'p' || jkRaw === 'perempuan' || jkRaw === 'wanita' || jkRaw === 'female' || jkRaw.includes('wanita') || jkRaw.includes('perempuan')) {
          jenisKelamin = "Perempuan";
        }

        let nik = String(findKey(row, ['nik', 'noktp', 'ktp', 'no ktp', 'nomor ktp', 'nomor nik', 'nonik', 'nikwarga', 'no. nik', 'no. ktp', 'nomor induk']) || "").trim();
        const kk = String(findKey(row, ['kk', 'nokk', 'kartukeluarga', 'no kk', 'nomor kk', 'no kartu keluarga', 'no. kk', 'no. kartu keluarga']) || "").trim();
        const nama = String(findKey(row, ['nama', 'namalengkap', 'name', 'nama lengkap', 'nama warga', 'fullname', 'nama_lengkap']) || "").trim();

        // Skip rows that have neither Name nor NIK (likely empty footer rows or notes)
        if (!nama && !nik) return null;

        return {
          nik,
          nama,
          kk,
          alamat: String(findKey(row, ['alamat', 'address', 'domisili', 'tempat tinggal', 'lokasi', 'tempattinggal', 'dusun', 'lingkungan']) || "").trim(),
          rumah: String(findKey(row, ['rumah', 'blok', 'no rumah', 'nomor rumah', 'house', 'block', 'no. rumah', 'no rumah/blok']) || "").trim(),
          noHp: String(findKey(row, ['nohp', 'telepon', 'phone', 'no hp', 'nomor hp', 'whatsapp', 'no wa', 'no. hp', 'no. telp/wa']) || "").trim(),
          status: String(findKey(row, ['status', 'keterangan', 'kondisi', 'status warga', 'ket']) || "Aktif").trim(),
          jenisKelamin,
          pekerjaan: String(findKey(row, ['pekerjaan', 'job', 'profesi', 'pekerjaan utama', 'mata pencaharian']) || "").trim(),
          pendidikan: String(findKey(row, ['pendidikanterakhir', 'pendidikan', 'education', 'sekolah', 'lulusan', 'tingkatpendidikan', 'pend terakhir', 'pend. terakhir']) || "").trim(),
          domisili: String(findKey(row, ['domisili', 'tempattinggal', 'tinggal', 'status tinggal', 'domisili warga']) || "Dalam Desa").trim(),
          pindahKe: String(findKey(row, ['pindahke', 'tujuanpindah', 'pindah ke', 'tujuan', 'alamat pindah']) || "").trim(),
          keperluanPindah: String(findKey(row, ['keperluanpindah', 'alasanpindah', 'keperluan pindah', 'alasan', 'ket pindah']) || "Lainnya").trim(),
          tanggalLahir: String(findKey(row, ['tanggallahir', 'tanggal lahir', 'tgl lahir', 'tgllahir', 'dob', 'tgl. lahir', 'tgl_lahir']) || "").trim(),
          tanggalPindah: String(findKey(row, ['tanggalpindah', 'tanggal pindah', 'tgl pindah', 'tglpindah', 'tgl. pindah']) || "").trim(),
          hubunganKeluarga: (() => {
            const val = String(findKey(row, ['hubungankeluarga', 'hubungan keluarga', 'status hubungan', 'status keluarga', 'st keluarga', 'hubungan', 'status', 'hub kel', 'hub. kel']) || "Anggota Keluarga").trim();
            const normalized = val.toLowerCase();
            if (normalized.includes('kepala') || normalized === 'kk' || normalized === 'kepala keluarga') {
              return 'Kepala Keluarga';
            }
            return val;
          })(),
        };
      }).filter(item => item !== null) as any[];

      if (formattedData.length === 0) {
        alert("Tidak ada data valid yang ditemukan (Nama dan NIK kosong di semua baris).");
        setImporting(false);
        return;
      }

      // Firestore Batch Write has a limit of 500 operations total.
      // Each citizen can have up to 4 operations (Warga, KK, Rumah, Mutasi).
      const chunkSize = 100; 
      for (let i = 0; i < formattedData.length; i += chunkSize) {
        const chunk = formattedData.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach((item) => {
          const docId = (item.nik && item.nik !== "" && item.nik !== "-" && item.nik !== "0000000000000000") ? item.nik : undefined;
          const docRef = docId ? doc(db, "warga", docId) : doc(collection(db, "warga"));
          
          batch.set(docRef, {
            ...item,
            adminId: user?.id,
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          // Record mutation if status is non-active
          if (item.status === 'Pindah' || item.status === 'Meninggal' || item.status === 'Non Aktif') {
            const mutasiRef = doc(collection(db, "mutasi_warga"));
            batch.set(mutasiRef, {
              ...item,
              adminId: user?.id,
              wargaId: docRef.id,
              statusLama: "Imported",
              statusBaru: item.status,
              timestamp: new Date().toISOString(),
              operator: `Import Excel (${user?.nama || "Admin"})`
            });
          }

          // Sync KK
          if (item.kk && item.kk !== "-") {
            const kkRef = doc(db, "kartu_keluarga", item.kk);
            const kkData: any = {
              noKk: item.kk,
              adminId: user?.id,
              alamat: item.alamat,
              updatedAt: new Date().toISOString()
            };
            if (item.hubunganKeluarga === 'Kepala Keluarga') {
              kkData.kepalaKeluarga = item.nama;
            }
            batch.set(kkRef, kkData, { merge: true });
          }

          // Sync Rumah
          const rumahVal = item.rumah || item.alamat;
          if (rumahVal && rumahVal !== "-") {
            const rumahId = rumahVal.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const rumahRef = doc(db, "rumah_blok", rumahId);
            batch.set(rumahRef, {
              id: rumahId,
              adminId: user?.id,
              alamat: item.alamat,
              noRumah: item.rumah || "",
              status: "Dihuni",
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        });
        
        await batch.commit();
      }

      alert(`Berhasil mengimport ${formattedData.length} data warga.`);
    } catch (error) {
      console.error("Error importing file:", error);
      alert("Gagal mengimport file Excel/CSV. Pastikan format sesuai.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const getReportTitle = () => {
    let titleParts = ["DATA WARGA"];
    if (filterStatus && filterStatus !== "Semua") titleParts.push(filterStatus.toUpperCase());
    if (filterGender) titleParts.push(filterGender.toUpperCase());
    if (filterEducation) titleParts.push(filterEducation.toUpperCase());
    if (filterDomisili) titleParts.push(filterDomisili.toUpperCase());
    if (filterAgeRange) titleParts.push(filterAgeRange.toUpperCase());
    if (search && search.trim() !== "") titleParts.push(`CARI "${search.toUpperCase()}"`);
    
    return titleParts.join(" - ");
  };

  const downloadToExcel = () => {
    const dataToExport = filteredWarga.length > 0 ? filteredWarga : [
      {
        nik: "1234567890123456",
        nama: "Budi Santoso",
        kk: "1234567890123456",
        alamat: "Jl. Mawar No. 1, Lingkungan Desa Adat",
        rumah: "A-12",
        noHp: "081234567890",
        status: "Aktif",
        jenisKelamin: "Laki-laki",
        pendidikan: "SMA",
        domisili: "Dalam Desa",
        tanggalLahir: "1990-01-01",
        tanggalPindah: "",
        hubunganKeluarga: "Kepala Keluarga"
      }
    ];

    const exportData = dataToExport.map(w => {
      const rowData: Record<string, string | number> = {};
      if (visibleColumns.nik) rowData["NIK"] = w.nik || "-";
      if (visibleColumns.kk) rowData["KK"] = w.kk || "-";
      if (visibleColumns.nama) rowData["NAMA"] = w.nama || "-";
      rowData["ALAMAT"] = w.alamat || "-";
      rowData["RUMAH (BLOK/RT/RW)"] = w.rumah || "-";
      rowData["TGL LAHIR"] = w.tanggalLahir || "-";
      if (visibleColumns.noHp) rowData["NO HP"] = w.noHp || "-";
      if (visibleColumns.jenisKelamin) rowData["JENIS KELAMIN"] = w.jenisKelamin || "-";
      if (visibleColumns.umur) rowData["UMUR"] = calculateAge(w.tanggalLahir);
      if (visibleColumns.pekerjaan) rowData["PEKERJAAN"] = w.pekerjaan || "-";
      if (visibleColumns.pendidikan) rowData["PENDIDIKAN"] = w.pendidikan || "-";
      if (visibleColumns.status) rowData["STATUS"] = w.status || "-";
      if (visibleColumns.hubungan) rowData["HUBUNGAN"] = w.hubunganKeluarga || "Anggota Keluarga";
      if (visibleColumns.domisili) rowData["DOMISILI"] = w.domisili || "-";
      return rowData;
    });

    const reportTitle = getReportTitle();
    const worksheet = XLSX.utils.aoa_to_sheet([[reportTitle], []]); // Row 1: Title, Row 2: Empty
    XLSX.utils.sheet_add_json(worksheet, exportData, { origin: "A3" });
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Warga");
    // Gunakan nama file yang berbeda sedikit untuk memastikan versi terbaru
    const fileName = `Ekspor_Data_Warga_${new Date().getTime()}`;
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const handleDelete = async () => {
    if (!wargaToDelete) return;

    setIsDeleting(true);
    try {
      const id = wargaToDelete.id;
      await deleteDoc(doc(db, "warga", id));

      await addDoc(collection(db, "notifikasi"), {
        adminId: user?.id,
        judul: "Penghapusan Data Warga",
        pesan: `Admin ${user?.nama} menghapus data warga: ${wargaToDelete?.nama || "Unknown"}.`,
        tipe: "warga",
        timestamp: new Date().toISOString(),
        read: false
      });
      setIsDeleteModalOpen(false);
      setWargaToDelete(null);
    } catch (error) {
      console.error("Failed to delete", error);
      alert("Gagal menghapus data");
    } finally {
      setIsDeleting(false);
    }
  };

  const openModal = (wargaToEdit?: Warga) => {
    if (wargaToEdit) {
      setEditingWarga(wargaToEdit);
      setFormData({
        ...wargaToEdit,
        pindahKe: wargaToEdit.pindahKe || "",
        keperluanPindah: wargaToEdit.keperluanPindah || "Lainnya",
        rumah: wargaToEdit.rumah || "",
        tanggalLahir: wargaToEdit.tanggalLahir || "",
        tanggalPindah: wargaToEdit.tanggalPindah || "",
        tanggalMeninggal: wargaToEdit.tanggalMeninggal || "",
        tanggalStatus: wargaToEdit.tanggalStatus || (wargaToEdit.createdAt ? wargaToEdit.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        hubunganKeluarga: wargaToEdit.hubunganKeluarga || "Anggota Keluarga",
        isPenguwot: wargaToEdit.isPenguwot || wargaToEdit.status === 'Penguwot',
        status: wargaToEdit.status === 'Penguwot' ? 'Aktif' : (wargaToEdit.status || 'Aktif'),
      });
    } else {
      setEditingWarga(null);
      setFormData({
        nik: "",
        nama: "",
        kk: "",
        alamat: "",
        rumah: "",
        noHp: "",
        status: "Aktif",
        jenisKelamin: "Laki-laki",
        pekerjaan: "",
        pendidikan: "",
        kelas: "-",
        domisili: "Dalam Desa",
        pindahKe: "",
        keperluanPindah: "Lainnya",
        tanggalLahir: "",
        tanggalPindah: "",
        tanggalMeninggal: "",
        tanggalStatus: new Date().toISOString().split('T')[0],
        hubunganKeluarga: "Anggota Keluarga",
        isPenguwot: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWarga(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menambah atau mengubah data.");
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = { ...formData };
      if (user?.role === 'Warga') {
        payload.editApproved = false;
      }

      if (payload.nik && payload.kk && payload.nik !== "0000000000000000") {
        const qNik = query(collection(db, "warga"), where("kk", "==", payload.kk), where("nik", "==", payload.nik));
        const snapshot = await getDocs(qNik);
        const isDuplicate = snapshot.docs.some(d => d.id !== editingWarga?.id);
        if (isDuplicate) {
          payload.nik = "0000000000000000";
        }
      }

      if (editingWarga) {
        const oldStatus = editingWarga.status;
        const batch = writeBatch(db);
        const wargaRef = doc(db, "warga", editingWarga.id);
        
        batch.update(wargaRef, payload);
        
        // Sync KK and Rumah
        if (payload.kk) {
          batch.set(doc(db, "kartu_keluarga", payload.kk), {
            noKk: payload.kk,
            adminId: user?.id,
            alamat: payload.alamat,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        
        const rumahVal = payload.rumah || payload.alamat;
        if (rumahVal) {
          const rumahId = rumahVal.toLowerCase().replace(/[^a-z0-9]/g, '-');
          batch.set(doc(db, "rumah_blok", rumahId), {
            id: rumahId,
            adminId: user?.id,
            alamat: payload.alamat,
            noRumah: payload.rumah || "",
            status: "Dihuni",
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        // Record mutation if status changed
        if (oldStatus !== payload.status) {
          if (payload.status === 'Pindah' || payload.status === 'Meninggal' || payload.status === 'Non Aktif') {
            const { id: _removedId, ...mutasiPayload } = payload as any;
            const newMutasiRef = doc(collection(db, "mutasi_warga"));
            batch.set(newMutasiRef, {
              ...mutasiPayload, 
              adminId: user?.id,
              wargaId: editingWarga.id,
              statusLama: oldStatus,
              statusBaru: payload.status,
              pindahKe: payload.status === 'Pindah' ? payload.pindahKe : "",
              keperluanPindah: payload.status === 'Pindah' ? payload.keperluanPindah : "",
              tanggalPindah: payload.status === 'Pindah' ? payload.tanggalStatus : "",
              tanggalMeninggal: payload.status === 'Meninggal' ? payload.tanggalStatus : "",
              timestamp: new Date().toISOString(),
              operator: user?.nama || "Admin"
            });
          }
        }

        await batch.commit();

        if (user?.role === 'Warga') {
          await addDoc(collection(db, "notifikasi"), {
            adminId: user?.adminId || user?.id,
            judul: "Perubahan Data Warga",
            pesan: `Warga ${user?.nama} telah mengubah data kependudukannya.`,
            tipe: "profil",
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      } else {
        const docRef = await addDoc(collection(db, "warga"), {
          ...payload,
          adminId: user?.id,
          createdAt: new Date().toISOString(),
          createdBy: user?.id || "anonymous"
        });

        // Sync KK and Rumah
        if (payload.kk) {
          await setDoc(doc(db, "kartu_keluarga", payload.kk), {
            noKk: payload.kk,
            adminId: user?.id,
            alamat: payload.alamat,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        const rumahVal = payload.rumah || payload.alamat;
        if (rumahVal) {
          const rumahId = rumahVal.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await setDoc(doc(db, "rumah_blok", rumahId), {
            id: rumahId,
            adminId: user?.id,
            alamat: payload.alamat,
            noRumah: payload.rumah || "",
            status: "Dihuni",
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        await addDoc(collection(db, "notifikasi"), {
          adminId: user?.id,
          judul: "Penambahan Data Warga",
          pesan: `Admin ${user?.nama} menambahkan data warga baru: ${payload.nama}.`,
          tipe: "warga",
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      closeModal();
    } catch (error) {
      console.error("Failed to save", error);
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "pengaduan"), {
        judul: `Permintaan Perubahan Data: ${editingWarga?.nama} (${editingWarga?.nik})`,
        deskripsi: `Mohon izinkan perubahan data dengan catatan berikut:\n\n${requestNote}`,
        pelapor: user?.nama || "Warga",
        targetWargaId: editingWarga?.id || "",
        status: "pending",
        timestamp: new Date().toISOString()
      });

      await addDoc(collection(db, "notifikasi"), {
        adminId: user?.adminId || user?.id,
        judul: "Permintaan Perubahan Data",
        pesan: `Warga ${user?.nama} mengajukan permintaan perubahan data.`,
        tipe: "pengaduan",
        timestamp: new Date().toISOString(),
        read: false
      });
      
      alert("Permintaan perubahan data berhasil dikirim ke Admin. Silakan cek menu Pengaduan untuk melihat statusnya.");
      setIsRequestModalOpen(false);
      setRequestNote("");
      setEditingWarga(null);
    } catch (error) {
      console.error("Failed to send request", error);
      alert("Terjadi kesalahan saat mengirim permintaan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterStatus, setFilterStatus] = useState("Semua");

  const ageStats = useMemo(() => {
    const stats = {
      balita: 0, // 0-5
      anak: 0, // 6-12
      remaja: 0, // 13-17
      dewasa: 0, // 18-59
      lansia: 0, // 60+
      tidakDiketahui: 0,
      lakiLaki: 0,
      perempuan: 0
    };

    warga.forEach(w => {
      // Hanya hitung warga aktif, non aktif, atau penguwot yang belum pindah/meninggal
      const isActiveStatus = (w.status === 'Aktif' || w.status === 'Non Aktif' || w.status === 'Penguwot' || w.isPenguwot === true) && w.status !== 'Pindah' && w.status !== 'Meninggal';
      if (!isActiveStatus) return;

      const normalizedGender = w.jenisKelamin?.toLowerCase().trim();
      if (normalizedGender === 'l' || normalizedGender === 'laki-laki' || normalizedGender === 'laki laki' || normalizedGender === 'pria' || normalizedGender === 'male') {
        stats.lakiLaki++;
      } else if (normalizedGender === 'p' || normalizedGender === 'perempuan' || normalizedGender === 'wanita' || normalizedGender === 'female') {
        stats.perempuan++;
      }

      if (!w.tanggalLahir) {
        stats.tidakDiketahui++;
        return;
      }

      const birthDate = new Date(w.tanggalLahir);
      if (isNaN(birthDate.getTime())) {
        stats.tidakDiketahui++;
        return;
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age <= 5) stats.balita++;
      else if (age <= 12) stats.anak++;
      else if (age <= 17) stats.remaja++;
      else if (age <= 59) stats.dewasa++;
      else stats.lansia++;
    });

    return stats;
  }, [warga]);

  const filteredWarga = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    
    // Parse range search: "8-17", "8 sampai 17", "dari 8 ke 17"
    const rangeMatch = searchLower.match(/^(?:dari\s+)?(\d+)\s*(?:-|sampai|ke)\s*(\d+)\s*(?:th|thn|tahun)?$/i);
    
    // Parse single age: "8", "8 thn", "8 tahun"
    const singleAgeMatch = searchLower.match(/^(\d+)\s*(?:th|thn|tahun)?$/i);

    const result = warga.filter(w => {
      const ageStr = calculateAge(w.tanggalLahir);
      
      let matchAgeRange = false;
      if (rangeMatch && ageStr !== "-") {
        const v1 = parseInt(rangeMatch[1]);
        const v2 = parseInt(rangeMatch[2]);
        const age = parseInt(ageStr);
        matchAgeRange = age >= Math.min(v1, v2) && age <= Math.max(v1, v2);
      }

      let matchAgeExact = false;
      if (singleAgeMatch && ageStr !== "-") {
        matchAgeExact = (ageStr === singleAgeMatch[1]);
      }

      // Existing features: Search by name, NIK, KK, phone, status, address, house
      // Restore partial search for NIK/KK and add Alamat/Rumah
      const matchSearch = w.nama.toLowerCase().includes(searchLower) || 
                          (w.status && w.status.toLowerCase().includes(searchLower)) ||
                          (matchAgeExact) || 
                          matchAgeRange ||
                          (w.nik && w.nik.includes(searchLower)) || 
                          (w.kk && w.kk.includes(searchLower)) ||
                          (w.noHp && w.noHp.includes(searchLower)) ||
                          (w.alamat && w.alamat.toLowerCase().includes(searchLower)) ||
                          (w.rumah && w.rumah.toLowerCase().includes(searchLower)) ||
                          (w.jenisKelamin && w.jenisKelamin.toLowerCase().includes(searchLower)) ||
                          (w.domisili && w.domisili.toLowerCase().includes(searchLower));
      
      let matchGender = true;
      if (filterGender) {
        const normalized = w.jenisKelamin?.toLowerCase().trim();
        if (filterGender === "Laki-laki") {
          matchGender = normalized === 'l' || normalized === 'laki-laki' || normalized === 'laki laki' || normalized === 'pria' || normalized === 'male';
        } else if (filterGender === "Perempuan") {
          matchGender = normalized === 'p' || normalized === 'perempuan' || normalized === 'wanita' || normalized === 'female';
        } else {
          matchGender = w.jenisKelamin === filterGender;
        }
      }

      let matchEducation = true;
      if (filterEducation) {
        const edu = w.pendidikan || "Tidak Sekolah";
        const l = edu.toLowerCase();
        let category = edu;
        if (l.includes("sd") && !l.includes("belum")) category = "SD/Sederajat";
        else if (l.includes("smp") || l.includes("sltp")) category = "SMP/Sederajat";
        else if (l.includes("sma") || l.includes("smk") || l.includes("slta")) category = "SMA/Sederajat";
        else if (l.includes("s1") || l.includes("d4")) category = "S1/D4";
        else if (l.includes("s2")) category = "S2";
        else if (l.includes("s3")) category = "S3";
        else if (l.includes("d1") || l.includes("d2") || l.includes("d3") || l.includes("diploma")) category = "D1/D2/D3";
        else if (l.includes("tidak")) category = "Tidak Sekolah";
        
        matchEducation = category === filterEducation;
      }

      let matchDomicile = true;
      if (filterDomisili) {
        matchDomicile = w.domisili === filterDomisili;
      }

      let matchAge = true;
      if (filterAgeRange) {
        if (ageStr === "-") {
          matchAge = false;
        } else {
          const age = parseInt(ageStr);
          if (filterAgeRange === "0-5 Thn") matchAge = age <= 5;
          else if (filterAgeRange === "6-12 Thn") matchAge = age > 5 && age <= 12;
          else if (filterAgeRange === "13-17 Thn") matchAge = age > 12 && age <= 17;
          else if (filterAgeRange === "18-25 Thn") matchAge = age > 17 && age <= 25;
          else if (filterAgeRange === "26-45 Thn") matchAge = age > 25 && age <= 45;
          else if (filterAgeRange === "46-60 Thn") matchAge = age > 45 && age <= 60;
          else if (filterAgeRange === "> 60 Thn") matchAge = age > 60;
        }
      }

      let matchJob = true;
      if (filterJob) {
        const job = w.pekerjaan || "";
        const jobLower = job.toLowerCase().trim();
        const filterJobLower = filterJob.toLowerCase().trim();
        
        if (filterJobLower === "kosong") {
          matchJob = !job || jobLower === "" || jobLower === "kosong" || jobLower === "kosong/tidak diketahui";
        } else if (filterJobLower === "lainnya") {
          const jobOrder = ["pelajar", "petani", "pedagang", "pertukangan", "asn/pns", "tni/polri", "pegawai swasta", "wiraswasta", "lainnya"];
          const isKnownJob = jobOrder.includes(jobLower);
          
          if (!isKnownJob && jobLower !== "") {
             matchJob = true;
          } else {
             matchJob = jobLower === "lainnya";
          }
        } else {
          matchJob = jobLower === filterJobLower;
        }
      }

      let matchStatus = false;
      const relationshipOptions = ["Kepala Keluarga", "Anak", "Istri"];
      
       if (filterStatus === "Semua") {
        matchStatus = w.status !== 'Pindah' && w.status !== 'Meninggal';
      } else if (relationshipOptions.includes(filterStatus)) {
        matchStatus = w.hubunganKeluarga === filterStatus && w.status !== 'Pindah' && w.status !== 'Meninggal';
      } else if (filterStatus === "Aktif") {
        matchStatus = (w.status === 'Aktif' || w.status === 'Penguwot' || w.isPenguwot === true) && w.status !== 'Pindah' && w.status !== 'Meninggal' && w.status !== 'Non Aktif';
      } else if (filterStatus === "Penguwot") {
        matchStatus = (w.status === 'Penguwot' || w.isPenguwot === true) && w.status !== 'Pindah' && w.status !== 'Meninggal';
      } else if (filterStatus === "Laki-laki" || filterStatus === "Perempuan") {
        const normalized = w.jenisKelamin?.toLowerCase().trim();
        const isLaki = normalized === 'l' || normalized === 'laki-laki' || normalized === 'laki laki' || normalized === 'pria' || normalized === 'male';
        const isPerempuan = normalized === 'p' || normalized === 'perempuan' || normalized === 'wanita' || normalized === 'female';
        
        if (filterStatus === "Laki-laki") {
          matchStatus = isLaki && w.status !== 'Pindah' && w.status !== 'Meninggal';
        } else {
          matchStatus = isPerempuan && w.status !== 'Pindah' && w.status !== 'Meninggal';
        }
      } else {
        matchStatus = w.status === filterStatus;
      }
      
      return matchSearch && matchStatus && matchGender && matchEducation && matchDomicile && matchAge && matchJob;
    });

    if (rangeMatch || singleAgeMatch) {
      return [...result].sort((a, b) => {
        const ageA = calculateAge(a.tanggalLahir);
        const ageB = calculateAge(b.tanggalLahir);
        
        // Prioritas 1: Exact Age Match
        if (singleAgeMatch) {
          const target = singleAgeMatch[1];
          if (ageA === target && ageB !== target) return -1;
          if (ageB === target && ageA !== target) return 1;
        }

        const numA = parseInt(ageA) || 1000;
        const numB = parseInt(ageB) || 1000;
        return numA - numB;
      });
    }

    return result;
  }, [warga, search, filterStatus, filterGender, filterEducation, filterDomisili, filterAgeRange, filterJob]);

  const totalPages = Math.ceil(filteredWarga.length / itemsPerPage);
  const paginatedWarga = filteredWarga.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeColSpan = Object.values(visibleColumns).filter(Boolean).length + 1;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Warga</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data kependudukan Desa Adat</p>
          {(filterGender || filterEducation || filterDomisili || filterAgeRange || filterJob) && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-2 flex items-center gap-2"
            >
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full flex items-center gap-2">
                Filter: {filterGender || filterEducation || filterDomisili || filterAgeRange || filterJob}
                <button onClick={clearAdvancedFilters} className="hover:text-blue-800 dark:hover:text-blue-200">
                  <X size={14} />
                </button>
              </span>
              <button 
                onClick={clearAdvancedFilters}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-dotted"
              >
                Reset Semua Filter
              </button>
            </motion.div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {user?.role !== 'Warga' && (
            <>
              {!isReadOnly && (user?.role === 'admin' || user?.role === 'super_admin') && warga.length > 0 && (
                <button 
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="flex-1 sm:flex-none bg-rose-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shadow-rose-600/20"
                >
                  <Trash2 size={18} />
                  <span>Hapus Semua</span>
                </button>
              )}
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <div className="relative">
                <button
                  onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                  className="flex-1 sm:flex-none bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <Columns size={20} />
                  Kolom
                </button>
                {isColumnDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 p-3 overflow-hidden">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-1">TAMPILKAN KOLOM</div>
                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                      {availableColumns.map(col => (
                        <label key={col.id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={visibleColumns[col.id]}
                            onChange={(e) => setVisibleColumns(prev => ({ ...prev, [col.id]: e.target.checked }))}
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={downloadToExcel}
                className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
              >
                <Download size={20} />
                Export ke Excel
              </button>
              <button 
                onClick={() => {
                  const doc = new jsPDF({ orientation: 'landscape' });
                  const reportTitle = getReportTitle();
                  doc.setFontSize(16);
                  doc.text(reportTitle, 14, 15);
                  doc.setFontSize(10);
                  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);
                  
                  const headers = ["No"];
                  if (visibleColumns.nik) headers.push("NIK");
                  if (visibleColumns.kk) headers.push("KK");
                  if (visibleColumns.nama) headers.push("NAMA");
                  headers.push("ALAMAT");
                  headers.push("RUMAH");
                  headers.push("TGL LAHIR");
                  if (visibleColumns.noHp) headers.push("NO HP");
                  if (visibleColumns.jenisKelamin) headers.push("JK");
                  if (visibleColumns.umur) headers.push("UMUR");
                  if (visibleColumns.pekerjaan) headers.push("PEKERJAAN");
                  if (visibleColumns.pendidikan) headers.push("PEND.");
                  if (visibleColumns.status) headers.push("STATUS");
                  if (visibleColumns.hubungan) headers.push("HUBUNGAN");
                  if (visibleColumns.domisili) headers.push("DOMISILI");

                  const tableRows = filteredWarga.map((w, index) => {
                    const row: any[] = [index + 1];
                    if (visibleColumns.nik) row.push(w.nik || "-");
                    if (visibleColumns.kk) row.push(w.kk || "-");
                    if (visibleColumns.nama) row.push(w.nama || "-");
                    row.push(w.alamat || "-");
                    row.push(w.rumah || "-");
                    row.push(w.tanggalLahir || "-");
                    if (visibleColumns.noHp) row.push(w.noHp || "-");
                    if (visibleColumns.jenisKelamin) row.push(w.jenisKelamin === 'Perempuan' ? 'P' : 'L');
                    if (visibleColumns.umur) row.push(calculateAge(w.tanggalLahir));
                    if (visibleColumns.pekerjaan) row.push(w.pekerjaan || "-");
                    if (visibleColumns.pendidikan) row.push(w.pendidikan || "-");
                    if (visibleColumns.status) row.push(w.status || "-");
                    if (visibleColumns.hubungan) row.push(w.hubunganKeluarga || "Anggota Keluarga");
                    if (visibleColumns.domisili) row.push(w.domisili || "-");
                    return row;
                  });

                  autoTable(doc, {
                    head: [headers],
                    body: tableRows,
                    startY: 28,
                    styles: { 
                      fontSize: 7, 
                      cellPadding: 2,
                      overflow: 'linebreak'
                    },
                    headStyles: { 
                      fillColor: [51, 65, 85],
                      halign: 'center'
                    },
                    columnStyles: {
                      0: { cellWidth: 8 }, // No
                    }
                  });

                  doc.save(`${reportTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
                }}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20"
              >
                <FileText size={20} />
                Export PDF
              </button>
              {!isReadOnly && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 disabled:opacity-70"
                >
                  <Upload size={20} />
                  {importing ? "Mengimport..." : "Import Excel"}
                </button>
              )}
              {!isReadOnly && (
                <button 
                  onClick={() => {
                    openModal();
                  }}
                  className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20"
                >
                  <Plus size={20} />
                  <span>Tambah</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Balita (0-5)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{ageStats.balita}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Anak (6-12)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{ageStats.anak}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Remaja (13-17)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{ageStats.remaja}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dewasa (18-59)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{ageStats.dewasa}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Lansia (60+)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{ageStats.lansia}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 line-clamp-1 truncate">Tdk Diketahui</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{ageStats.tidakDiketahui}</p>
        </div>
        <button 
          onClick={() => setFilterStatus("Laki-laki")}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-blue-500 transition-colors text-left"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Laki-laki</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ageStats.lakiLaki}</p>
        </button>
        <button 
          onClick={() => setFilterStatus("Perempuan")}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-pink-500 transition-colors text-left"
        >
          <p className="text-xs font-medium text-pink-600 dark:text-pink-400 mb-1">Perempuan</p>
          <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{ageStats.perempuan}</p>
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Cari NIK, Nama, atau Umur..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            >
              <option value="Semua">Semua Data</option>
              <option value="Aktif">Aktif</option>
              <option value="Non Aktif">Non Aktif</option>
              <option value="Penguwot">Penguwot</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
              <option value="Kepala Keluarga">Kepala Keluarga</option>
              <option value="Istri">Istri</option>
              <option value="Anak">Anak</option>
              <option value="Pindah">Pindah</option>
              <option value="Meninggal">Meninggal</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                {visibleColumns.nik && <th className="px-6 py-4 font-medium whitespace-nowrap">NIK</th>}
                {visibleColumns.kk && <th className="px-6 py-4 font-medium whitespace-nowrap">KK</th>}
                {visibleColumns.nama && <th className="px-6 py-4 font-medium whitespace-nowrap">Nama Lengkap</th>}
                {visibleColumns.noHp && <th className="px-6 py-4 font-medium whitespace-nowrap">No HP</th>}
                {visibleColumns.jenisKelamin && <th className="px-6 py-4 font-medium whitespace-nowrap">Jenis Kelamin</th>}
                {visibleColumns.umur && <th className="px-6 py-4 font-medium whitespace-nowrap">Umur</th>}
                {visibleColumns.pekerjaan && <th className="px-6 py-4 font-medium whitespace-nowrap">Pekerjaan</th>}
                {visibleColumns.pendidikan && <th className="px-6 py-4 font-medium whitespace-nowrap">Pendidikan</th>}
                {visibleColumns.status && <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>}
                {visibleColumns.hubungan && <th className="px-6 py-4 font-medium whitespace-nowrap">Hubungan</th>}
                {visibleColumns.domisili && <th className="px-6 py-4 font-medium whitespace-nowrap">Domisili</th>}
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={activeColSpan} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Memuat data...</td>
                </tr>
              ) : paginatedWarga.length === 0 ? (
                <tr>
                  <td colSpan={activeColSpan} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Data tidak ditemukan</td>
                </tr>
              ) : (
                paginatedWarga.map((w) => (
                  <tr 
                    key={w.id} 
                    onClick={() => {
                      setSelectedWarga(w);
                      setIsDetailModalOpen(true);
                    }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    {visibleColumns.nik && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{w.nik || "-"}</td>}
                    {visibleColumns.kk && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{w.kk || "-"}</td>}
                    {visibleColumns.nama && (
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{w.nama || "-"}</div>
                        {!visibleColumns.nik && w.nik && <div className="text-xs text-slate-500 font-normal">{w.nik}</div>}
                      </td>
                    )}
                    {visibleColumns.noHp && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{w.noHp || "-"}</td>}
                    {visibleColumns.jenisKelamin && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{w.jenisKelamin || "-"}</td>}
                    {visibleColumns.umur && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{calculateAge(w.tanggalLahir)} Tahun</td>}
                    {visibleColumns.pekerjaan && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{w.pekerjaan || "-"}</td>}
                    {visibleColumns.pendidikan && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{w.pendidikan || "-"}</td>}
                    {visibleColumns.status && (
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            w.status === 'Aktif' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {w.status}
                          </span>
                          {(w.isPenguwot || w.status === 'Penguwot') && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Penguwot
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.hubungan && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{w.hubunganKeluarga || "-"}</td>}
                    {visibleColumns.domisili && <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{w.domisili || "-"}</td>}
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWarga(w);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg active:scale-95 transition-all"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        {!isReadOnly && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (user?.role === 'Warga') {
                                if (w.editApproved) {
                                  openModal(w);
                                } else {
                                  setEditingWarga(w);
                                  setIsRequestModalOpen(true);
                                }
                              } else {
                                openModal(w);
                              }
                            }}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg active:scale-95 transition-all"
                            title={user?.role === 'Warga' ? (w.editApproved ? "Edit Data" : "Ajukan Perubahan Data") : "Edit Data"}
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {!isReadOnly && user?.role !== 'Warga' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setWargaToDelete(w);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg active:scale-95 transition-all"
                            title="Hapus Data"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="text-center sm:text-left">Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredWarga.length)} dari {filteredWarga.length} data</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal Tambah/Edit Warga */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-[95%] sm:w-full max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingWarga ? "Edit Data Warga" : "Tambah Data Warga"}
                </h3>
                <button 
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">NIK</label>
                    <input 
                      type="text" 
                      required
                      value={formData.nik}
                      onChange={(e) => setFormData({...formData, nik: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">No. KK</label>
                    <input 
                      type="text" 
                      required
                      value={formData.kk}
                      onChange={(e) => setFormData({...formData, kk: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                  <textarea 
                    rows={3}
                    value={formData.alamat}
                    onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rumah / Blok (Opsional)</label>
                  <input 
                    type="text" 
                    value={formData.rumah || ""}
                    onChange={(e) => setFormData({...formData, rumah: e.target.value})}
                    placeholder="Contoh: Blok A-12"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">No. HP</label>
                    <input 
                      type="tel" 
                      value={formData.noHp}
                      onChange={(e) => setFormData({...formData, noHp: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                    <input 
                      type="date" 
                      value={formData.tanggalLahir || ""}
                      onChange={(e) => setFormData({...formData, tanggalLahir: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Non Aktif">Non Aktif</option>
                      <option value="Pindah">Pindah</option>
                      <option value="Meninggal">Meninggal</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Penguwot?</label>
                    <select 
                      value={formData.isPenguwot ? "Ya" : "Tidak"}
                      onChange={(e) => setFormData({...formData, isPenguwot: e.target.value === "Ya"})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Tidak">Tidak</option>
                      <option value="Ya">Ya</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tgl :</label>
                    <input 
                      type="date" 
                      required
                      value={formData.tanggalStatus || ""}
                      onChange={(e) => setFormData({...formData, tanggalStatus: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {formData.status === 'Pindah' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-r-xl"
                  >
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pindah Ke</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Denpasar, Bali"
                        value={formData.pindahKe}
                        onChange={(e) => setFormData({...formData, pindahKe: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Keperluan Pindah</label>
                      <select 
                        value={formData.keperluanPindah}
                        onChange={(e) => setFormData({...formData, keperluanPindah: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Kerja">Kerja</option>
                        <option value="Menikah">Menikah</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <select 
                    value={formData.pekerjaan || ""}
                    onChange={(e) => setFormData({...formData, pekerjaan: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih Pekerjaan</option>
                    <option value="Pelajar">Pelajar</option>
                    <option value="Petani">Petani</option>
                    <option value="Pedagang">Pedagang</option>
                    <option value="Pertukangan">Pertukangan</option>
                    <option value="ASN/PNS">ASN/PNS</option>
                    <option value="TNI/POLRI">TNI/POLRI</option>
                    <option value="Pegawai Swasta">Pegawai Swasta</option>
                    <option value="Wiraswasta">Wiraswasta</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                    <select 
                      value={formData.jenisKelamin}
                      onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hubungan Keluarga</label>
                    <select 
                      value={formData.hubunganKeluarga || "Anggota Keluarga"}
                      onChange={(e) => setFormData({...formData, hubunganKeluarga: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Kepala Keluarga">Kepala Keluarga</option>
                      <option value="Istri">Istri</option>
                      <option value="Suami">Suami</option>
                      <option value="Anak">Anak</option>
                      <option value="Menantu">Menantu</option>
                      <option value="Cucu">Cucu</option>
                      <option value="Orang Tua">Orang Tua</option>
                      <option value="Mertua">Mertua</option>
                      <option value="Famili Lain">Famili Lain</option>
                      <option value="Pembantu">Pembantu</option>
                      <option value="Lainnya">Lainnya</option>
                      <option value="Anggota Keluarga">Anggota Keluarga</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pendidikan</label>
                    <select 
                      value={formData.pendidikan || ""}
                      onChange={(e) => setFormData({...formData, pendidikan: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">- Otomatis (Berdasarkan Umur) -</option>
                      <option value="Belum Sekolah">Belum Sekolah</option>
                      <option value="TK/PAUD">TK/PAUD</option>
                      <option value="Tidak Sekolah">Tidak Sekolah</option>
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA</option>
                      <option value="D3">D3</option>
                      <option value="S1">S1</option>
                      <option value="S2">S2</option>
                      <option value="S3">S3</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kelas / Tingkat</label>
                    <select 
                      value={formData.kelas}
                      onChange={(e) => setFormData({...formData, kelas: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="-">-</option>
                      {formData.pendidikan === 'SD' && [1,2,3,4,5,6].map(v => <option key={v} value={v}>{v}</option>)}
                      {formData.pendidikan === 'SMP' && [7,8,9].map(v => <option key={v} value={v}>{v}</option>)}
                      {formData.pendidikan === 'SMA' && [10,11,12].map(v => <option key={v} value={v}>{v}</option>)}
                      {!['SD', 'SMP', 'SMA'].includes(formData.pendidikan) && (
                        <option value="Reguler">Reguler</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Domisili</label>
                    <select 
                      value={formData.domisili}
                      onChange={(e) => setFormData({...formData, domisili: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Dalam Desa">Dalam Desa</option>
                      <option value="Luar Desa">Luar Desa</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Ajukan Perubahan (Untuk Warga) */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRequestModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-[95%] sm:w-full max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="text-amber-500" size={24} />
                  Izin Perubahan Data
                </h3>
                <button 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl text-sm text-amber-800 dark:text-amber-300 mb-4">
                  Sebagai warga, Anda tidak dapat mengubah data secara langsung. Silakan tuliskan data apa yang ingin diubah dan alasannya. Admin akan meninjau permintaan Anda.
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Catatan Perubahan</label>
                  <textarea 
                    rows={4}
                    required
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="Contoh: Mohon ubah alamat saya menjadi Jl. Mawar No. 10 karena saya baru saja pindah rumah."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? "Mengirim..." : "Kirim Permintaan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Single Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && wargaToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-[95%] sm:w-full mx-auto shadow-2xl border border-slate-100 dark:border-slate-700 text-center"
            >
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Hapus Data Warga?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Apakah Anda yakin ingin menghapus data <strong>{wargaToDelete.nama}</strong>? Tindakan ini tidak dapat dikembalikan.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setWargaToDelete(null);
                  }}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    "Ya, Hapus"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Warga Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedWarga && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-[95%] sm:w-full mx-auto max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="text-blue-600" size={24} />
                  Detail Warga
                </h3>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold text-2xl">
                    {selectedWarga.nama.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedWarga.nama}</h4>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                        (selectedWarga.status === 'Aktif' || selectedWarga.status === 'Penguwot')
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {selectedWarga.status}
                      </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nomor NIK</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <CreditCard size={16} className="text-slate-400" />
                      {selectedWarga.nik || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nomor KK</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Home size={16} className="text-slate-400" />
                      {selectedWarga.kk}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jenis Kelamin</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <User size={16} className="text-slate-400" />
                      {selectedWarga.jenisKelamin}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hubungan Keluarga</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <User size={16} className="text-slate-400" />
                      {selectedWarga.hubunganKeluarga || "Anggota Keluarga"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendidikan</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <GraduationCap size={16} className="text-slate-400" />
                      {selectedWarga.pendidikan} {selectedWarga.kelas && selectedWarga.kelas !== '-' ? `(Kelas ${selectedWarga.kelas})` : ''}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal Lahir</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Calendar size={16} className="text-slate-400" />
                      {selectedWarga.tanggalLahir ? new Date(selectedWarga.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No. HP / WhatsApp</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Phone size={16} className="text-slate-400" />
                      {selectedWarga.noHp || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Domisili</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <MapPin size={16} className="text-slate-400" />
                      {selectedWarga.domisili}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pekerjaan</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Briefcase size={16} className="text-slate-400" />
                      {selectedWarga.pekerjaan || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal (Status)</p>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Calendar size={16} className="text-slate-400" />
                      {selectedWarga.tanggalStatus ? new Date(selectedWarga.tanggalStatus).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : (selectedWarga.createdAt ? new Date(selectedWarga.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-")}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alamat Lengkap</p>
                  <div className="flex gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                    <MapPin size={16} className="text-slate-400 mt-1 shrink-0" />
                    {selectedWarga.alamat}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anggota Keluarga (1 KK)</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {warga.filter(w => w.kk === selectedWarga.kk).map((anggota, index) => (
                      <div key={index} className={`flex items-center justify-between p-3 rounded-xl border ${anggota.id === selectedWarga.id ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'}`}>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">
                            {anggota.nama}
                            {anggota.id === selectedWarga.id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">Dipilih</span>}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{anggota.hubunganKeluarga || 'Anggota Keluarga'} • {anggota.jenisKelamin}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                            (anggota.status === 'Aktif' || anggota.status === 'Penguwot')
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                            {anggota.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Tutup Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-[95%] sm:w-full mx-auto shadow-2xl border border-slate-100 dark:border-slate-700 text-center"
            >
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Hapus Semua Data?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Tindakan ini akan menghapus seluruh data warga secara permanen. Data yang sudah dihapus tidak dapat dikembalikan.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeletingAll}
                  className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {isDeletingAll ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    "Ya, Hapus Semua"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
