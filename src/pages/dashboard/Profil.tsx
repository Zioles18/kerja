import React, { useState, useRef, useEffect } from "react";
import { useAuth, User as UserType } from "../../hooks/useAuth";
import { User as UserIcon, Mail, Phone, Shield, Camera } from "lucide-react";
import { motion } from "framer-motion";

import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../../firebase";

export default function Profil() {
  const { user, updateUser, isReadOnly } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(user?.profilePic || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nama: user?.nama || "",
    email: user?.email || "",
    noHp: user?.noHp || "081234567890",
  });

  useEffect(() => {
    if (user?.profilePic) {
      setProfilePic(user.profilePic);
    }
  }, [user?.profilePic]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk memperbarui profil.");
      return;
    }
    
    try {
      if (!user?.id) return;
      
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        nama: formData.nama,
        email: formData.email,
        noHp: formData.noHp,
      });

      updateUser({
        ...user,
        nama: formData.nama,
        email: formData.email,
        noHp: formData.noHp,
      });
      
      await addDoc(collection(db, "notifikasi"), {
        judul: "Perubahan Profil",
        pesan: `Warga ${user?.nama} telah memperbarui data profilnya.`,
        tipe: "profil",
        timestamp: new Date().toISOString(),
        read: false
      });

      setIsEditing(false);
      alert("Profil berhasil diperbarui");
    } catch (error) {
      console.error("Failed to save profile", error);
      alert("Terjadi kesalahan saat memperbarui profil");
    }
  };

  const handlePasswordChange = async () => {
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengganti password.");
      return;
    }
    try {
      await addDoc(collection(db, "notifikasi"), {
        judul: "Perubahan Password",
        pesan: `Warga ${user?.nama} telah mengganti password akunnya.`,
        tipe: "keamanan",
        timestamp: new Date().toISOString(),
        read: false
      });
      alert("Permintaan ganti password berhasil dikirim/diproses.");
    } catch (error) {
      console.error("Failed to send notification", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (isReadOnly) {
      alert("Mode Demo: Anda tidak memiliki izin untuk mengubah foto profil.");
      return;
    }
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfilePic(base64String);
        
        try {
          if (!user?.id) return;
          const userRef = doc(db, "users", user.id);
          await updateDoc(userRef, {
            profilePic: base64String
          });

          updateUser({
            ...user,
            profilePic: base64String
          });

          await addDoc(collection(db, "notifikasi"), {
            judul: "Perubahan Foto Profil",
            pesan: `Warga ${user?.nama} telah mengubah foto profilnya.`,
            tipe: "profil",
            timestamp: new Date().toISOString(),
            read: false
          });
        } catch (error) {
          console.error("Failed to save profile picture", error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profil Saya</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola informasi akun Anda</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-1"
        >
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-white dark:border-slate-800 shadow-sm">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.nama?.charAt(0).toUpperCase()
                )}
              </div>
              {!isReadOnly && (
                <>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={triggerFileInput}
                    className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600 dark:hover:border-blue-400 transition-all active:scale-95 shadow-sm"
                    title="Ubah Foto Profil"
                  >
                    <Camera size={16} />
                  </button>
                </>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.nama}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{user?.role}</p>
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1">
              <Shield size={14} /> Akun Terverifikasi
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2"
        >
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Informasi Pribadi</h3>
              {!isReadOnly && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {isEditing ? "Batal" : "Edit Profil"}
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <UserIcon size={16} className="text-slate-400 dark:text-slate-500" /> Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Mail size={16} className="text-slate-400 dark:text-slate-500" /> Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Phone size={16} className="text-slate-400 dark:text-slate-500" /> Nomor HP
                  </label>
                  <input
                    type="tel"
                    name="noHp"
                    value={formData.noHp}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-600/20"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Keamanan Akun</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">Password</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Terakhir diubah 3 bulan yang lalu</p>
                </div>
                {!isReadOnly && (
                  <button 
                    onClick={handlePasswordChange}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all active:scale-95"
                  >
                    Ganti Password
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
