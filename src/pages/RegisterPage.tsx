import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDesaAdat } from '../hooks/useDesaAdat';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const { settings } = useDesaAdat();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email, password, name, phone);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError("Fitur Pendaftaran Email belum diaktifkan. Silakan buka Firebase Console (https://console.firebase.google.com/project/gen-lang-client-0084084846/authentication/providers) dan aktifkan 'Email/Password'.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Email ini sudah terdaftar. Silakan gunakan email lain atau langsung login.");
      } else {
        setError("Gagal mendaftar. Pastikan data benar dan koneksi stabil.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Gagal masuk dengan Google');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row font-sans">
      {/* Left Side: Branding & Image */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-900 to-[#0f172a] p-12 lg:p-20 flex-col justify-between relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-16 group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 overflow-hidden">
              {settings.logo ? (
                <img 
                  src={settings.logo} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-1"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-blue-600 font-bold text-xl">D</span>
              )}
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">{settings.nama || "datawarga"}</span>
          </Link>

          <div className="max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
              Administrasi Desa Adat <br />
              Kini Lebih <span className="text-blue-400">Tertib</span> & <br />
              <span className="text-cyan-400">Modern</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-12">
              Kelola data warga, iuran, kas, surat, dan pengumuman dalam satu aplikasi digital yang mudah digunakan siapa saja.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 p-2 rounded-2xl shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80" 
              alt="Dashboard Preview" 
              className="rounded-xl w-full h-auto shadow-inner opacity-90"
            />
          </div>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-[#0f172a]">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors group">
            <ChevronLeft size={20} className="mr-1 transition-transform group-hover:-translate-x-1" /> Kembali
          </Link>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Daftar Akun Baru</h2>
            <p className="text-slate-400">Mulai digitalisasi administrasi lingkungan Anda sekarang.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nama Lengkap</label>
              <input 
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nomor WhatsApp</label>
              <input 
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="0812xxxx"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[42px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Konfirmasi</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mt-4"
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <span className="relative px-4 bg-[#0f172a] text-sm text-slate-500">Atau daftar dengan</span>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-white text-slate-900 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Google
            </button>
          </div>

          <p className="mt-10 text-center text-slate-400">
            Sudah punya akun? <Link to="/login" className="text-blue-500 font-semibold hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
