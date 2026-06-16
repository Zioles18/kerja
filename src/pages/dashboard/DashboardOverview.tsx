import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Users, Home, FileText, MessageSquare, TrendingUp, PieChart as PieIcon, GraduationCap, MapPin, Bell, ChevronDown, Briefcase, FileDown, FileUp, FileSpreadsheet, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart, Pie, Cell 
} from "recharts";
import { useTheme } from "../../hooks/useTheme";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, orderBy, limit, where, addDoc, writeBatch, doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

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

export default function DashboardOverview() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [counts, setCounts] = useState({
    warga: 0,
    kkDinas: 0,
    kkAdat: 0,
    surat: 0,
    pengaduan: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [wargaList, setWargaList] = useState<any[]>([]);
  const [wargaStats, setWargaStats] = useState<any[]>([]);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [educationData, setEducationData] = useState<any[]>([]);
  const [domicileData, setDomicileData] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<any[]>([]);
  const [jobData, setJobData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const navigate = useNavigate();

  const handleFilterClick = (type: string, value: string) => {
    navigate("/dashboard/warga", { state: { filter: { type, value } } });
  };

  const downloadToExcel = () => {
    const activeWarga = wargaList.filter(w =>
      (w.status === 'Aktif' || w.status === 'Non Aktif' || w.status === 'Penguwot' || w.isPenguwot === true) &&
      w.status !== 'Pindah' && w.status !== 'Meninggal'
    );
    const exportData = activeWarga.map(w => ({
      "NIK": w.nik || "-",
      "NAMA": w.nama || "-",
      "NO KK": w.kk || "-",
      "JENIS KELAMIN": w.jenisKelamin || "-",
      "PEKERJAAN": w.pekerjaan || "-",
      "PENDIDIKAN": w.pendidikan || "-",
      "STATUS": w.status || "-",
      "HUBUNGAN KELUARGA": w.hubunganKeluarga || "-",
      "DOMISILI": w.domisili || "-",
      "NO HP": w.noHp || "-",
      "ALAMAT": w.alamat || "-",
    }));
    const title = `REKAP DATA WARGA - ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`;
    const worksheet = XLSX.utils.aoa_to_sheet([[title], []]);
    XLSX.utils.sheet_add_json(worksheet, exportData, { origin: "A3" });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Warga");
    XLSX.writeFile(workbook, `Rekap_Data_Warga_${new Date().getTime()}.xlsx`);
  };

  const downloadToPDF = () => {
    const pdfDoc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
    
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('LAPORAN STATISTIK KEPENDUDUKAN', 14, 20);
    pdfDoc.setFontSize(10);
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.text(`Tanggal Cetak: ${dateStr}`, 14, 28);
    pdfDoc.line(14, 32, 196, 32);

    // Summary table
    autoTable(pdfDoc, {
      startY: 38,
      head: [['Kategori', 'Jumlah']],
      body: [
        ['Total Warga Aktif', counts.warga.toString()],
        ['Total KK Dinas', counts.kkDinas.toString()],
        ['Total KK Adat', counts.kkAdat.toString()],
        ['Surat Diajukan', counts.surat.toString()],
        ['Pengaduan', counts.pengaduan.toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
      styles: { fontSize: 11 },
    });

    const afterSummary = (pdfDoc as any).lastAutoTable.finalY + 10;

    // Gender table
    if (genderData.length > 0) {
      pdfDoc.setFontSize(12);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Distribusi Jenis Kelamin', 14, afterSummary);
      autoTable(pdfDoc, {
        startY: afterSummary + 6,
        head: [['Jenis Kelamin', 'Jumlah', 'Persentase']],
        body: genderData.map(g => [g.name, g.value.toString(), g.percentage]),
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94] },
        styles: { fontSize: 10 },
      });
    }

    pdfDoc.save(`Laporan_Statistik_${new Date().getTime()}.pdf`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      if (rawRows.length === 0) { alert("File Excel kosong."); setImporting(false); return; }

      let headerRowIndex = 0;
      const keywords = ['nik', 'nama', 'kk', 'nomor', 'ktp'];
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i].map(cell => String(cell || "").toLowerCase());
        if (row.some(cell => keywords.some(kw => cell.includes(kw)))) { headerRowIndex = i; break; }
      }

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
        const jkRaw = String(findKey(row, ['jeniskelamin','jk','gender','jenis kelamin','jns kel','jns klmn','kelamin']) || "Laki-laki").toLowerCase().trim();
        let jenisKelamin = "Laki-laki";
        if (jkRaw === 'p' || jkRaw === 'perempuan' || jkRaw === 'wanita' || jkRaw === 'female' || jkRaw.includes('wanita') || jkRaw.includes('perempuan')) {
          jenisKelamin = "Perempuan";
        }

        const nik = String(findKey(row, ['nik','noktp','ktp','no ktp','nomor ktp','nomor nik','nonik','nikwarga','no. nik','no. ktp','nomor induk']) || "").trim();
        const kk = String(findKey(row, ['kk','nokk','kartukeluarga','no kk','nomor kk','no kartu keluarga','no. kk','no. kartu keluarga']) || "").trim();
        const nama = String(findKey(row, ['nama','namalengkap','name','nama lengkap','namawarga','fullname','nama_lengkap']) || "").trim();

        if (!nama && !nik) return null;

        return {
          nik,
          nama,
          kk,
          alamat: String(findKey(row, ['alamat','address','domisili','tempat tinggal', 'lokasi', 'tempattinggal', 'dusun', 'lingkungan']) || "").trim(),
          rumah: String(findKey(row, ['rumah','blok','no rumah','nomor rumah','house','block','no. rumah','no rumah/blok']) || "").trim(),
          noHp: String(findKey(row, ['nohp','telepon','phone','no hp','nomor hp','whatsapp','no wa','no. hp','no. telp/wa']) || "").trim(),
          status: String(findKey(row, ['status','keterangan','kondisi','status warga','ket']) || "Aktif").trim(),
          jenisKelamin,
          pekerjaan: String(findKey(row, ['pekerjaan','job','profesi','pekerjaan utama','mata pencaharian']) || "").trim(),
          pendidikan: String(findKey(row, ['pendidikanterakhir','pendidikan','education','sekolah','lulusan','tingkatpendidikan','pend terakhir','pend. terakhir']) || "").trim(),
          domisili: String(findKey(row, ['domisili','tempattinggal','tinggal','status tinggal','domisili warga']) || "Dalam Desa").trim(),
          pindahKe: String(findKey(row, ['pindahke','tujuanpindah','pindah ke','tujuan','alamat pindah']) || "").trim(),
          keperluanPindah: String(findKey(row, ['keperluanpindah','alasanpindah','keperluan pindah','alasan','ket pindah']) || "Lainnya").trim(),
          tanggalLahir: String(findKey(row, ['tanggallahir','tanggal lahir','tgl lahir','tgllahir','dob','tgl. lahir','tgl_lahir']) || "").trim(),
          tanggalPindah: String(findKey(row, ['tanggalpindah','tanggal pindah','tgl pindah','tglpindah','tgl. pindah']) || "").trim(),
          hubunganKeluarga: (() => {
            const val = String(findKey(row, ['hubungankeluarga','hubungan keluarga','status hubungan','status keluarga','st keluarga','hubungan','status','hub kel','hub. kel']) || "Anggota Keluarga").trim();
            const normalized = val.toLowerCase();
            if (normalized.includes('kepala') || normalized === 'kk' || normalized === 'kepala keluarga') {
              return 'Kepala Keluarga';
            }
            return val;
          })(),
        };
      }).filter(Boolean) as any[];

      if (formattedData.length === 0) { alert("Tidak ada data valid ditemukan."); setImporting(false); return; }

      const chunkSize = 100;
      for (let i = 0; i < formattedData.length; i += chunkSize) {
        const chunk = formattedData.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((item: any) => {
          const docId = (item.nik && item.nik !== "" && item.nik !== "-" && item.nik !== "0000000000000000") ? item.nik : undefined;
          const docRef = docId ? doc(db, "warga", docId) : doc(collection(db, "warga"));
          
          batch.set(docRef, { 
            ...item, 
            adminId: user?.id, 
            updatedAt: new Date().toISOString() 
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
              operator: `Import Dashboard (${user?.nama || "Admin"})`
            });
          }

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
      console.error("Error importing:", error);
      alert("Gagal mengimport file Excel.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    if (!user) return;
    let qWarga;
    if (user?.role === 'super_admin') {
      qWarga = collection(db, "warga");
    } else {
      qWarga = query(collection(db, "warga"), where("adminId", "==", user?.id));
    }
    const unsubWarga = onSnapshot(qWarga, (snap) => {
      const list: any[] = [];
      let kkAdatCount = 0;
      
      snap.forEach(doc => {
        const data = doc.data();
        list.push({ id: doc.id, ...data });
        
        // Count KK Adat: active NIK, status is Kepala Keluarga
        const isAktif = data.status === 'Aktif' || data.status === 'Penguwot' || data.status === 'Non Aktif';
        const isKepalaKeluarga = data.hubunganKeluarga?.trim() === 'Kepala Keluarga' || data.statusKeluarga?.trim() === 'Kepala Keluarga';
        if (data.nik && isAktif && isKepalaKeluarga && data.status !== 'Pindah' && data.status !== 'Meninggal') {
          kkAdatCount++;
        }
      });
      
      const totalWargaCount = list.filter(w => (w.status === 'Aktif' || w.status === 'Non Aktif' || w.status === 'Penguwot' || w.isPenguwot === true) && w.status !== 'Pindah' && w.status !== 'Meninggal').length;
      setCounts(prev => ({ ...prev, warga: totalWargaCount, kkAdat: kkAdatCount }));
      setWargaList(list);
    });

    let qKk;
    if (user?.role === 'super_admin') {
      qKk = collection(db, "kartu_keluarga");
    } else {
      qKk = query(collection(db, "kartu_keluarga"), where("adminId", "==", user?.id));
    }
    const unsubKkList = onSnapshot(qKk, (snap) => {
      setCounts(prev => ({ ...prev, kkDinas: snap.size }));
    });

    let qSurat;
    if (user?.role === 'super_admin') {
      qSurat = collection(db, "surat");
    } else {
      qSurat = query(collection(db, "surat"), where("adminId", "==", user?.id));
    }
    const unsubSurat = onSnapshot(qSurat, (snap) => {
      setCounts(prev => ({ ...prev, surat: snap.size }));
    });
    let qPengaduan;
    if (user?.role === 'super_admin') {
      qPengaduan = collection(db, "pengaduan");
    } else {
      qPengaduan = query(collection(db, "pengaduan"), where("adminId", "==", user?.id));
    }
    const unsubPengaduan = onSnapshot(qPengaduan, (snap) => {
      setCounts(prev => ({ ...prev, pengaduan: snap.size }));
    });
    
    let qNotif;
    if (user?.role === 'super_admin') {
      qNotif = query(collection(db, "notifikasi"), orderBy("timestamp", "desc"), limit(5));
    } else {
      qNotif = query(collection(db, "notifikasi"), where("adminId", "==", user?.id), orderBy("timestamp", "desc"), limit(5));
    }
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      const notifs = snap.docs.map(doc => {
        const data = doc.data();
        let color = "bg-blue-500";
        if (data.tipe === "pengaduan") color = "bg-rose-500";
        if (data.tipe === "keuangan") color = "bg-emerald-500";
        if (data.tipe === "warga") color = "bg-indigo-500";
        
        const rawDate = data.timestamp;
        const date = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
        const now = new Date();
        
        let timeStr = "Baru saja";
        if (!isNaN(date.getTime())) {
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);
          
          if (diffDays > 0) timeStr = `${diffDays} hari lalu`;
          else if (diffHours > 0) timeStr = `${diffHours} jam lalu`;
          else if (diffMins > 0) timeStr = `${diffMins} menit lalu`;
        }

        return {
          id: doc.id,
          title: data.judul,
          desc: data.pesan,
          time: timeStr,
          color
        };
      });
      setActivities(notifs);
    });

    return () => {
      unsubWarga();
      unsubKkList();
      unsubSurat();
      unsubPengaduan();
      unsubNotif();
    };
  }, []);

  // Process statistics when data or filters change
  useEffect(() => {
    if (wargaList.length === 0) return;

    const currentYear = filterYear;
    const prevYear = currentYear - 1;
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    
    // 1. Total Warga per Month (Jan-Dec) for selected year
    const monthlyData = shortMonths.map((month, idx) => {
      const currentYearCount = wargaList.filter(w => {
        const date = w.createdAt ? new Date(w.createdAt) : new Date();
        const isActive = (w.status === 'Aktif' || w.status === 'Non Aktif' || w.status === 'Penguwot' || w.isPenguwot === true) && w.status !== 'Pindah' && w.status !== 'Meninggal';
        return date.getFullYear() === currentYear && date.getMonth() === idx && isActive;
      }).length;
      
      const prevYearCount = wargaList.filter(w => {
        const date = w.createdAt ? new Date(w.createdAt) : null;
        const isActive = (w.status === 'Aktif' || w.status === 'Non Aktif' || w.status === 'Penguwot' || w.isPenguwot === true) && w.status !== 'Pindah' && w.status !== 'Meninggal';
        return date && date.getFullYear() === prevYear && date.getMonth() === idx && isActive;
      }).length;

      return {
        name: month,
        "Tahun Ini": currentYearCount,
        "Tahun Lalu": prevYearCount
      };
    });
    setWargaStats(monthlyData);

    // Filter data for other charts based on Year and Month, and active status
    const filteredWarga = wargaList.filter(w => {
      const date = w.createdAt ? new Date(w.createdAt) : new Date();
      const yearMatch = date.getFullYear() === currentYear;
      const monthMatch = filterMonth === "all" || date.getMonth() === filterMonth;
      const isActive = (w.status === 'Aktif' || w.status === 'Non Aktif' || w.status === 'Penguwot' || w.isPenguwot === true) && w.status !== 'Pindah' && w.status !== 'Meninggal';
      return yearMatch && monthMatch && isActive;
    });

    // 2. Gender Stats
    const totalFiltered = filteredWarga.length || 1;
    const genderMap = filteredWarga.reduce((acc: any, curr: any) => {
      let jk = curr.jenisKelamin;
      
      if (!jk) {
        jk = "Tidak Diketahui";
      } else {
        // Normalisasi nilai umum dari Excel
        const normalized = jk.toLowerCase().trim();
        if (normalized === 'l' || normalized === 'laki-laki' || normalized === 'laki laki' || normalized === 'pria' || normalized === 'male') {
          jk = "Laki-laki";
        } else if (normalized === 'p' || normalized === 'perempuan' || normalized === 'wanita' || normalized === 'female') {
          jk = "Perempuan";
        }
      }
      
      acc[jk] = (acc[jk] || 0) + 1;
      return acc;
    }, {});
    const genderDataArray = Object.entries(genderMap).map(([name, value]: [string, any]) => {
      const numValue = Number(value);
      return { 
        name, 
        value: numValue,
        percentage: ((numValue / totalFiltered) * 100).toFixed(1) + "%"
      };
    });
    setGenderData(genderDataArray);

    // 3. Education Stats
    const eduOrder = ["Belum Sekolah", "TK/PAUD", "Tidak Sekolah", "Belum Tamat SD", "SD/Sederajat", "SMP/Sederajat", "SMA/Sederajat", "D1/D2/D3", "S1/D4", "S2", "S3"];
    const eduMap = filteredWarga.reduce((acc: any, curr: any) => {
      const isNeutral = !curr.pendidikan || curr.pendidikan === "";
      let edu = curr.pendidikan || "Tidak Sekolah";
      
      if (curr.tanggalLahir) {
        const agStr = calculateAge(curr.tanggalLahir);
        if (agStr !== "-") {
          const age = parseInt(agStr);
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

      const l = edu.toLowerCase();
      if (l.includes("sd") && !l.includes("belum")) edu = "SD/Sederajat";
      else if (l.includes("smp") || l.includes("sltp")) edu = "SMP/Sederajat";
      else if (l.includes("sma") || l.includes("smk") || l.includes("slta")) edu = "SMA/Sederajat";
      else if (l.includes("s1") || l.includes("d4")) edu = "S1/D4";
      else if (l.includes("s2")) edu = "S2";
      else if (l.includes("s3")) edu = "S3";
      else if (l.includes("d1") || l.includes("d2") || l.includes("d3") || l.includes("diploma")) edu = "D1/D2/D3";
      else if (l.includes("tidak")) edu = "Tidak Sekolah";

      acc[edu] = (acc[edu] || 0) + 1;
      return acc;
    }, {});
    
    const orderedEdu = eduOrder.map(name => ({
      name,
      value: eduMap[name] || 0
    })).filter(x => x.value > 0);
    
    Object.keys(eduMap).forEach(key => {
      if (!eduOrder.includes(key)) {
        orderedEdu.push({ name: key, value: eduMap[key] });
      }
    });

    setEducationData(orderedEdu);

    // 4. Domicile Stats
    const domMap = filteredWarga.reduce((acc: any, curr: any) => {
      const dom = curr.domisili || "Dalam Desa";
      acc[dom] = (acc[dom] || 0) + 1;
      return acc;
    }, {});
    const total = filteredWarga.length || 1;
    const domicileDataArray = Object.entries(domMap).map(([name, value]: [string, any]) => {
      const numValue = Number(value);
      return { 
        name, 
        value: numValue,
        percentage: ((numValue / total) * 100).toFixed(1) + "%"
      };
    });
    setDomicileData(domicileDataArray);

    // 5. Job Stats
    const jobOrder = ["Pelajar", "Petani", "Pedagang", "Pertukangan", "ASN/PNS", "TNI/POLRI", "Pegawai Swasta", "Wiraswasta", "Lainnya"];
    const jobMap = filteredWarga.reduce((acc: any, curr: any) => {
      let job = curr.pekerjaan || "";
      let matchedJob = "Lainnya";

      // Automation for 'Pelajar' based on Age
      if (curr.tanggalLahir) {
        const agStr = calculateAge(curr.tanggalLahir);
        if (agStr !== "-") {
          const age = parseInt(agStr);
          const jobLower = job.toLowerCase().trim();
          const isJobEmpty = !job || jobLower === "" || jobLower === "-" || jobLower === "lainnya" || jobLower === "tidak bekerja" || jobLower === "belum bekerja" || job === "Kosong";
          
          if (age >= 7 && age <= 18 && isJobEmpty) {
            job = "Pelajar";
          }
        }
      }

      if (!job || job.trim() === "") {
        matchedJob = "Kosong/Tidak Diketahui";
      } else {
        const found = jobOrder.find(j => j.toLowerCase() === job.toLowerCase().trim());
        if (found) matchedJob = found;
      }
      
      acc[matchedJob] = (acc[matchedJob] || 0) + 1;
      return acc;
    }, {});
    
    // Populate all known jobs with 0 if no data, to ensure chart initially looks empty but has columns
    const orderedJobs = jobOrder.map(name => ({
      name,
      value: jobMap[name] || 0
    }));
    
    if (jobMap["Kosong/Tidak Diketahui"]) {
      orderedJobs.push({ name: "Kosong", value: jobMap["Kosong/Tidak Diketahui"] });
    }
    setJobData(orderedJobs);

    // 6. Age Stats
    const ageMap: Record<string, number> = {
      "0-5 Thn": 0,
      "6-12 Thn": 0,
      "13-17 Thn": 0,
      "18-25 Thn": 0,
      "26-45 Thn": 0,
      "46-60 Thn": 0,
      "> 60 Thn": 0
    };
    const ageOrder = Object.keys(ageMap);
    
    filteredWarga.forEach(w => {
      if (w.tanggalLahir) {
        const agStr = calculateAge(w.tanggalLahir);
        if (agStr !== "-") {
          const age = parseInt(agStr);
          if (age <= 5) ageMap["0-5 Thn"]++;
          else if (age <= 12) ageMap["6-12 Thn"]++;
          else if (age <= 17) ageMap["13-17 Thn"]++;
          else if (age <= 25) ageMap["18-25 Thn"]++;
          else if (age <= 45) ageMap["26-45 Thn"]++;
          else if (age <= 60) ageMap["46-60 Thn"]++;
          else ageMap["> 60 Thn"]++;
        }
      }
    });
    setAgeData(ageOrder.map(name => ({ name, value: ageMap[name] })));

  }, [wargaList, filterYear, filterMonth]);

  const stats = [
    { title: "Total Warga", value: counts.warga.toLocaleString(), icon: Users, color: "bg-blue-500", ring: "ring-blue-200 dark:ring-blue-800", route: "/dashboard/warga", routeState: undefined, desc: "Lihat Data Warga" },
    { title: "Total KK Dinas", value: counts.kkDinas.toLocaleString(), icon: Home, color: "bg-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-800", route: "/dashboard/kk", routeState: undefined, desc: "Lihat Kartu Keluarga" },
    { title: "Total KK Adat", value: counts.kkAdat.toLocaleString(), icon: Home, color: "bg-indigo-500", ring: "ring-indigo-200 dark:ring-indigo-800", route: "/dashboard/warga", routeState: { filter: { type: 'hubungan', value: 'Kepala Keluarga' } }, desc: "Lihat KK Adat" },
    { title: "Surat Diajukan", value: counts.surat.toLocaleString(), icon: FileText, color: "bg-amber-500", ring: "ring-amber-200 dark:ring-amber-800", route: "/dashboard/surat", routeState: undefined, desc: "Lihat Surat" },
    { title: "Pengaduan", value: counts.pengaduan.toLocaleString(), icon: MessageSquare, color: "bg-rose-500", ring: "ring-rose-200 dark:ring-rose-800", route: "/dashboard/pengaduan", routeState: undefined, desc: "Lihat Pengaduan" },
  ];

  return (
    <div className="space-y-8 pt-2">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="py-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Statistik</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan data kependudukan Desa Adat</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Export / Import Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={downloadToExcel}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition-colors"
              title="Export ke Excel"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              onClick={downloadToPDF}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition-colors"
              title="Export ke PDF"
            >
              <FileDown size={14} />
              PDF
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition-colors"
              title="Import dari Excel"
            >
              <FileUp size={14} />
              {importing ? "Importing..." : "Import"}
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-300 ml-2 uppercase tracking-wider">Bulan:</span>
            <div className="relative">
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                className="appearance-none bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold focus:outline-none pl-3 pr-8 py-1 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer"
              >
                <option value="all">Semua Bulan</option>
                {months.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400" size={14} />
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-300 ml-2 uppercase tracking-wider">Tahun:</span>
            <div className="relative">
              <select 
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="appearance-none bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold focus:outline-none pl-3 pr-8 py-1 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400" size={14} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => navigate(stat.route, stat.routeState ? { state: stat.routeState } : undefined)}
            className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 cursor-pointer group hover:shadow-md hover:ring-2 ${stat.ring} transition-shadow`}
          >
            <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
              <stat.icon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 mt-0.5 group-hover:text-blue-500 transition-colors">
                {stat.desc} <ArrowRight size={10} />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Stats: Total Warga Jan-Dec */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              Statistik Pertumbuhan Warga (Jan - Des)
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wargaStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend verticalAlign="top" align="right" height={36} />
                <Line type="monotone" dataKey="Tahun Ini" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Tahun Lalu" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Gender Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <PieIcon size={20} className="text-rose-500" />
            Statistik Jenis Kelamin
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  isAnimationActive={false}
                  dataKey="value"
                  label={(props: any) => `${props.percentage}`}
                  className="cursor-pointer"
                  onClick={(data: any) => handleFilterClick('gender', data.name)}
                >
                  {genderData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {genderData.map((g, i) => (
              <div 
                key={i} 
                className="flex justify-between items-center text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded-lg transition-colors"
                onClick={() => handleFilterClick('gender', g.name)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-slate-500 dark:text-slate-400">{g.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{g.value} ({g.percentage})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Education Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <GraduationCap size={20} className="text-emerald-500" />
            Statistik Tingkat Pendidikan
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={educationData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#10b981" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20} 
                  className="cursor-pointer"
                  onClick={(data: any) => handleFilterClick('education', data.name)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Domicile Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <MapPin size={20} className="text-amber-500" />
            Statistik Domisili
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={domicileData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  isAnimationActive={false}
                  dataKey="value"
                  label={(props: any) => `${props.name}: ${props.percentage}`}
                  className="cursor-pointer"
                  onClick={(data: any) => handleFilterClick('domicile', data.name)}
                >
                  {domicileData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {domicileData.map((d, i) => (
              <div 
                key={i} 
                className="flex justify-between items-center text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded-lg transition-colors"
                onClick={() => handleFilterClick('domicile', d.name)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }}></div>
                  <span className="text-slate-500 dark:text-slate-400">{d.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{d.value} ({d.percentage})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Age Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Users size={20} className="text-indigo-500" />
            Statistik Demografi Umur
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                  className="cursor-pointer"
                  onClick={(data: any) => handleFilterClick('age', data.name)}
                >
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Job Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Briefcase size={20} className="text-purple-500" />
            Statistik Pekerjaan
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8b5cf6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={15} 
                  className="cursor-pointer"
                  onClick={(data: any) => handleFilterClick('job', data.name)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Aktivitas Terbaru</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm col-span-full text-center py-4">Belum ada aktivitas terbaru.</p>
          ) : (
            activities.map((activity, i) => (
              <div key={activity.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className={`w-10 h-10 ${activity.color} rounded-lg shrink-0 flex items-center justify-center text-white`}>
                  <Bell size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{activity.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{activity.desc}</p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 block font-medium">{activity.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
