import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useDesaAdat } from "../hooks/useDesaAdat";
import { motion } from "framer-motion";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAsDemo, loginWithEmail, resetPassword } = useAuth();
  const { settings } = useDesaAdat();
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.email) setEmail(location.state.email);
    if (location.state?.password) setPassword(location.state.password);
    
    // Auto submit if both are present from demo login
    if (location.state?.email && location.state?.password) {
      const autoLogin = async () => {
        setLoading(true);
        setError("");
        try {
          await loginWithEmail(location.state.email, location.state.password);
        } catch (err) {
          console.error("Auto login error:", err);
          setError("Gagal login otomatis ke akun demo. Silakan periksa kembali atau masukkan manual.");
        } finally {
          setLoading(false);
        }
      };
      autoLogin();
    }
  }, [location.state]);

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Masukkan email Anda terlebih dahulu untuk mereset password.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess("Link reset password telah dikirim ke email Anda.");
      setError("");
    } catch (err: any) {
      setError("Gagal mengirim link reset password. Pastikan email benar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      let loginEmail = email;
      if (email.toLowerCase() === "owner") {
        loginEmail = "owner@datawarga.com";
      } else if (email.toLowerCase() === "demo") {
        loginEmail = "demo@meroket.com";
        if (!password) setPassword("demo123");
      }
      
      const loginPassword = (email.toLowerCase() === "demo" && !password) ? "demo123" : password;
      await loginWithEmail(loginEmail, loginPassword);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError("Fitur Login Email belum diaktifkan. Silakan buka Firebase Console (https://console.firebase.google.com/project/gen-lang-client-0084084846/authentication/providers) dan aktifkan 'Email/Password'.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Email/Username atau password salah. Silakan coba lagi.");
      } else {
        setError(err.message || "Gagal login. Periksa kembali input Anda.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginAsDemo();
    } catch (err: any) {
      setError("Gagal masuk ke akun demo: " + (err.message || "Terjadi kesalahan"));
      setLoading(false);
    }
    // We don't set loading false here because loginAsDemo might navigate 
    // and we want the loading state to persist or be handled by the next page/effect
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-12 group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Kembali
        </Link>

        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            {settings.logo ? (
              <img 
                src={settings.logo} 
                alt="Logo DataWarga" 
                className="w-full h-full object-contain p-1.5"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-blue-600 font-bold text-xl">D</span>
            )}
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">{settings.nama || "datawarga"}</span>
        </div>

        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Login Admin</h2>
          <p className="text-slate-400">Masukkan email dan password admin untuk melanjutkan</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-8">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm mb-8">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username / Email</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-[#1e293b]/50 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="Owner, demo, atau admin@email.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-sm text-blue-500 hover:text-blue-400 font-medium"
              >
                Lupa password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-[#1e293b]/50 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70 active:scale-[0.98]"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>



        <div className="mt-10 text-center">
          <p className="text-slate-400 text-sm">
            Belum ada akun?{" "}
            <button 
              onClick={handleDemoLogin}
              disabled={loading}
              className="text-blue-500 font-bold hover:underline disabled:opacity-50"
            >
              pakai akun demo aja dulu
            </button>
          </p>
          <p className="mt-8 text-slate-500 text-xs leading-relaxed">
            Warga dapat mengakses data melalui link yang diberikan admin.
          </p>
        </div>
      </div>
    </div>
  );
}
