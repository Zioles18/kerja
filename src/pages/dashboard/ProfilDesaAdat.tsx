import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useDesaAdat } from "../../hooks/useDesaAdat";
import { Camera, Save, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function ProfilDesaAdat() {
  const { user, isReadOnly } = useAuth();
  const { settings, loading } = useDesaAdat();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nama: "",
    profil: "",
    dusun: [] as string[],
    logo: null as string | null
  });
  const [newDusun, setNewDusun] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFormData({
        nama: settings.nama || "Desa Adat",
        profil: settings.profil || "",
        dusun: settings.dusun || [],
        logo: settings.logo || null
      });
    }
  }, [settings, loading]);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin_rt";

  if (!isAdmin) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800/50">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, logo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDusun = () => {
    if (newDusun.trim()) {
      setFormData(prev => ({
        ...prev,
        dusun: [...prev.dusun, newDusun.trim()]
      }));
      setNewDusun("");
    }
  };

  const handleRemoveDusun = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dusun: prev.dusun.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk menyimpan perubahan.");
      return;
    }
    setIsSaving(true);
    try {
      const settingsId = user?.id || "desa_adat";
      await setDoc(doc(db, "settings", settingsId), {
        nama: formData.nama,
        profil: formData.profil,
        dusun: formData.dusun,
        logo: formData.logo
      }, { merge: true });
      alert("Profil Desa Adat berhasil disimpan!");
    } catch (error) {
      console.error("Error saving desa adat settings:", error);
      alert("Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profil Desa Adat</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola logo, profil, dan daftar dusun (Khusus Owner)</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
        
        {/* Logo Section */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Logo Desa Adat</label>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo Desa" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-slate-400 text-sm">Belum ada logo</span>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg"
              >
                <Camera size={16} />
              </button>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <p>Format yang didukung: JPG, PNG, GIF.</p>
              <p>Ukuran maksimal: 1MB.</p>
            </div>
          </div>
        </div>

        {/* Nama Desa */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nama Desa Adat</label>
          <input 
            type="text" 
            value={formData.nama}
            onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Masukkan nama desa adat"
          />
        </div>

        {/* Profil Desa */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Profil / Deskripsi Desa Adat</label>
          <textarea 
            value={formData.profil}
            onChange={(e) => setFormData(prev => ({ ...prev, profil: e.target.value }))}
            rows={4}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ceritakan profil singkat tentang desa adat ini..."
          />
        </div>

        {/* Daftar Dusun */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Daftar Dusun (Sub Menu)</label>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={newDusun}
              onChange={(e) => setNewDusun(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDusun()}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tambah nama dusun baru..."
            />
            <button 
              onClick={handleAddDusun}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
            >
              <Plus size={20} /> Tambah
            </button>
          </div>
          
          <div className="space-y-2">
            {formData.dusun.map((dusun, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300">{dusun}</span>
                <button 
                  onClick={() => handleRemoveDusun(idx)}
                  className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-2 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {formData.dusun.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-4">Belum ada dusun yang ditambahkan.</p>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
