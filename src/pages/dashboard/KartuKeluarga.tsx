import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  deleteDoc,
  where
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { writeBatch, addDoc } from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { useAuth } from "../../hooks/useAuth";
import { 
  Users, 
  Search, 
  FileText, 
  Trash2, 
  Eye,
  Home,
  CreditCard,
  XCircle,
  FileDown,
  FileUp,
  FileSpreadsheet
} from "lucide-react";
import { motion } from "framer-motion";

interface KartuKeluarga {
  id: string;
  noKk: string;
  kepalaKeluarga?: string;
  alamat: string;
  jumlahAnggota?: number;
  updatedAt: string;
}

export default function KartuKeluarga() {
  const { user, isReadOnly } = useAuth();
  const [kkList, setKkList] = useState<KartuKeluarga[]>([]);
  const [wargaList, setWargaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKk, setSelectedKk] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const downloadToExcel = () => {
    const exportData = filteredKk.map(kk => ({
      "No. KK": kk.noKk,
      "Kepala Keluarga": kk.kepalaKeluarga,
      "Jumlah Anggota": kk.jumlahAnggota,
      "Alamat": kk.alamat
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data KK");
    XLSX.writeFile(workbook, `Data_Kartu_Keluarga_${new Date().getTime()}.xlsx`);
  };

  const downloadToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Data Kartu Keluarga", 14, 20);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [['No. KK', 'Kepala Keluarga', 'Anggota', 'Alamat']],
      body: filteredKk.map(kk => [
        kk.noKk,
        kk.kepalaKeluarga,
        `${kk.jumlahAnggota} Orang`,
        kk.alamat
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(`Data_Kartu_Keluarga_${new Date().getTime()}.pdf`);
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
      
      if (rawRows.length === 0) {
        alert("File Excel kosong.");
        setImporting(false);
        return;
      }

      let headerRowIndex = 0;
      const keywords = ['nik', 'nama', 'kk', 'nomor', 'ktp'];
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i].map(cell => String(cell || "").toLowerCase());
        if (row.some(cell => keywords.some(kw => cell.includes(kw)))) {
          headerRowIndex = i;
          break;
        }
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
        const jkRaw = String(findKey(row, ['jeniskelamin', 'jk', 'gender', 'jenis kelamin']) || "Laki-laki").toLowerCase().trim();
        let jenisKelamin = "Laki-laki";
        if (jkRaw === 'p' || jkRaw.includes('perempuan') || jkRaw.includes('wanita') || jkRaw === 'female') {
          jenisKelamin = "Perempuan";
        }

        const nik = String(findKey(row, ['nik', 'noktp', 'ktp', 'no ktp', 'nomor ktp']) || "").trim();
        const kk = String(findKey(row, ['kk', 'nokk', 'no kk', 'nomor kk']) || "").trim();
        const nama = String(findKey(row, ['nama', 'namalengkap', 'name', 'nama lengkap']) || "").trim();

        if (!nama && !nik) return null;

        return {
          nik,
          nama,
          kk,
          alamat: String(findKey(row, ['alamat', 'address', 'domisili']) || "").trim(),
          noHp: String(findKey(row, ['nohp', 'telepon', 'phone', 'no hp']) || "").trim(),
          status: String(findKey(row, ['status', 'keterangan']) || "Aktif").trim(),
          jenisKelamin,
          pekerjaan: String(findKey(row, ['pekerjaan', 'job', 'profesi']) || "").trim(),
          pendidikan: String(findKey(row, ['pendidikanterakhir', 'pendidikan', 'education']) || "").trim(),
          domisili: String(findKey(row, ['domisili', 'tinggal']) || "Dalam Desa").trim(),
          tanggalLahir: String(findKey(row, ['tanggallahir', 'tanggal lahir', 'tgl lahir']) || "").trim(),
          hubunganKeluarga: (() => {
            const val = String(findKey(row, ['hubungankeluarga', 'hubungan keluarga', 'hubungan']) || "Anggota Keluarga").trim();
            return val.toLowerCase().includes('kepala') ? 'Kepala Keluarga' : val;
          })(),
        };
      }).filter(item => item !== null) as any[];

      if (formattedData.length === 0) {
        alert("Tidak ada data valid yang ditemukan.");
        setImporting(false);
        return;
      }

      const chunkSize = 100; 
      for (let i = 0; i < formattedData.length; i += chunkSize) {
        const chunk = formattedData.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach((item: any) => {
          const docId = (item.nik && item.nik !== "" && item.nik !== "-") ? item.nik : undefined;
          const docRef = docId ? doc(db, "warga", docId) : doc(collection(db, "warga"));
          
          batch.set(docRef, {
            ...item,
            adminId: user?.id,
            updatedAt: new Date().toISOString(),
          }, { merge: true });

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
        });
        
        await batch.commit();
      }

      alert(`Berhasil mengimport ${formattedData.length} data.`);
    } catch (error) {
      console.error("Error importing file:", error);
      alert("Gagal mengimport file Excel.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!user) return;

    let q;
    if (user?.role === 'super_admin') {
      q = query(collection(db, "kartu_keluarga"), orderBy("updatedAt", "desc"));
    } else {
      q = query(collection(db, "kartu_keluarga"), where("adminId", "==", user?.id), orderBy("updatedAt", "desc"));
    }
    const unsubscribeKk = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as KartuKeluarga[];
      setKkList(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching KK:", error);
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, "kartu_keluarga");
      } catch (e) {}
    });

    let qWarga;
    if (user?.role === 'super_admin') {
      qWarga = query(collection(db, "warga"));
    } else {
      qWarga = query(collection(db, "warga"), where("adminId", "==", user?.id));
    }
    const unsubscribeWarga = onSnapshot(qWarga, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setWargaList(data);
    }, (error) => {
      console.error("Error fetching Warga:", error);
    });

    return () => {
      unsubscribeKk();
      unsubscribeWarga();
    };
  }, [user]);

  const handleDelete = async (id: string) => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menghapus data.");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus data Kartu Keluarga ini?")) {
      try {
        await deleteDoc(doc(db, "kartu_keluarga", id));
      } catch (error) {
        console.error("Error deleting KK:", error);
        alert("Gagal menghapus data");
      }
    }
  };

  const getKkDetails = (kk: KartuKeluarga) => {
    const members = wargaList.filter(w => w.kk === kk.noKk);
    
    // Find all members who are "Kepala Keluarga"
    const foundKepala = members.filter(w => 
      w.hubunganKeluarga?.trim() === 'Kepala Keluarga' || 
      w.statusKeluarga?.trim() === 'Kepala Keluarga'
    );
    
    // Join names if multiple, or fallback to stored kepalaKeluarga if no members found yet
    let kepala = foundKepala.length > 0 
      ? foundKepala.map(w => w.nama).join(", ") 
      : kk.kepalaKeluarga;
    
    return {
      kepalaKeluarga: kepala || 'Tidak Ada Kepala Keluarga',
      jumlahAnggota: members.length,
      members
    };
  };

  const filteredKk = kkList.map(kk => ({
    ...kk,
    ...getKkDetails(kk)
  })).filter(kk => 
    kk.noKk.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kk.alamat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kk.kepalaKeluarga.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-indigo-600" />
            Data Kartu Keluarga
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Manajemen data Kartu Keluarga (KK) warga</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadToExcel}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={downloadToPDF}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-medium"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-medium"
          >
            <FileUp className="w-4 h-4" />
            {importing ? "Importing..." : "Import Excel"}
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls"
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <CreditCard className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total KK</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kkList.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari No. KK, Nama Kepala Keluarga, Alamat..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">No. KK</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Kepala Keluarga</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Anggota</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Alamat</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">Loading data...</td>
                </tr>
              ) : filteredKk.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">Tidak ada data ditemukan</td>
                </tr>
              ) : (
                filteredKk.map((kk) => (
                  <motion.tr 
                    key={kk.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{kk.noKk}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{kk.kepalaKeluarga}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{kk.jumlahAnggota} Orang</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        {kk.alamat}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedKk(kk.noKk)}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          title="Lihat Anggota"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {!isReadOnly && (
                          <button 
                            onClick={() => handleDelete(kk.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedKk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Anggota Keluarga
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  No. KK: {selectedKk}
                </p>
              </div>
              <button 
                onClick={() => setSelectedKk(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">NIK</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Nama</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Hubungan</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">L/P</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {wargaList.filter(w => w.kk === selectedKk).map((warga, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{warga.nik || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{warga.nama}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{warga.hubunganKeluarga || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{warga.jenisKelamin}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            warga.status === 'Aktif' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                            {warga.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
