import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginViewProps {
  onLogin: (user: string, pass: string) => Promise<boolean>;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await onLogin(username, password);
    setLoading(false);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-900/10 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 rounded-2xl shadow-[0_0_40px_rgba(234,88,12,0.4)] mb-6 transform -rotate-3">
             <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Gestão de Incêndios Florestais</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] font-mono">Gestão • Controle • Operação</p>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">IDENTIFICAÇÃO</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input 
                  type="text" 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-xl text-sm p-4 pl-12 outline-none text-white font-bold uppercase transition-all focus:border-orange-600"
                  placeholder="LOGIN"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">CREDENTIAL SECRETA</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input 
                  type="password" 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-xl text-sm p-4 pl-12 outline-none text-white font-bold transition-all focus:border-orange-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3 text-red-500 text-xs font-black uppercase tracking-widest"
              >
                <AlertCircle size={14} />
                Acesso Negado
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Iniciar Operação
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.4em]">Propriedade Reservada • 2024</p>
        </div>
      </motion.div>
    </div>
  );
}
