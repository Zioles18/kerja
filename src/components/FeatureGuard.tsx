import React from 'react';
import { motion } from 'framer-motion';
import { Lock, MessageCircle } from 'lucide-react';

interface FeatureGuardProps {
  children: React.ReactNode;
  isLocked: boolean;
  featureName: string;
}

export default function FeatureGuard({ children, isLocked, featureName }: FeatureGuardProps) {
  if (!isLocked) return <>{children}</>;

  return (
    <div className="relative group">
      <div className="blur-[2px] pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] rounded-2xl flex items-center justify-center p-6 border border-white/10">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm text-center border border-slate-100 dark:border-slate-700"
        >
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Fitur Terkunci</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
            Fitur <span className="font-bold text-slate-900 dark:text-white">{featureName}</span> hanya tersedia untuk langganan paket Premium (<span className="text-emerald-600 font-bold">Warga</span>, <span className="text-blue-600 font-bold">Harmoni</span>, atau <span className="text-indigo-600 font-bold">Nusantara</span>).
          </p>
          <a 
            href={`https://wa.me/628123456789?text=Halo%20Admin%2C%20saya%20ingin%20upgrade%20paket%20untuk%20fitur%20${featureName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <MessageCircle size={20} />
            Hubungi Admin (WA)
          </a>
        </motion.div>
      </div>
    </div>
  );
}
