import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  orderBy, updateDoc, doc 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { AppUser, Incident } from '../../types';
import { 
  Flame, Plus, MapPin, Calendar, ArrowRight, Activity, 
  Crosshair, LogOut, Shield, UserCog, Lock, Key, X,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';

interface IncidentsViewProps {
  onSelect: (incident: Incident) => void;
  user: AppUser;
  onLogout: () => void;
  onGoToUsers: () => void;
}

export default function IncidentsView({ onSelect, user, onLogout, onGoToUsers }: IncidentsViewProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<Incident | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    coordinates: '',
    status: 'active_combat' as const,
    description: '',
    password: ''
  });

  const path = 'incidents';

  useEffect(() => {
    const q = query(collection(db, path), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, path);
    });
    return unsubscribe;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await addDoc(collection(db, path), {
        ...formData,
        startDate: Date.now(),
        createdBy: user.login
      });
      setShowAddModal(false);
      setFormData({ name: '', location: '', coordinates: '', status: 'active_combat', description: '', password: '' });
    } catch (error) {
      setErrorMsg("Erro ao salvar. Verifique sua conexão.");
      handleFirestoreError(error, 'create' as any, path);
    } finally {
      setSaving(false);
    }
  };

  const handleIncidentClick = (incident: Incident) => {
    const isCreator = incident.createdBy === user.login;
    const isAdmin = user.role === 'admin';

    if (isAdmin || isCreator || !incident.password) {
      onSelect(incident);
    } else {
      setShowPasswordPrompt(incident);
      setEnteredPassword('');
      setPasswordError(false);
    }
  };

  const verifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (showPasswordPrompt && enteredPassword === showPasswordPrompt.password) {
      onSelect(showPasswordPrompt);
      setShowPasswordPrompt(null);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const handlePromptRequired = (incident: Incident) => {
    const isCreator = incident.createdBy === user.login;
    const isAdmin = user.role === 'admin';
    return incident.password && !isCreator && !isAdmin;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 lg:p-12">
      {/* Top Bar for User & Logout */}
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center no-print gap-4">
        <div className="flex-1">
          {user.role === 'admin' && (
            <button 
              onClick={onGoToUsers}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-2xl flex items-center gap-3 transition-all group"
            >
              <div className="p-1.5 bg-orange-600 rounded-lg shadow-lg">
                <UserCog size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Gestão de Usuários</span>
            </button>
          )}
        </div>

        <div className="bg-[#121212] border border-white/5 px-4 py-2 rounded-2xl flex items-center gap-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white border border-white/10 shadow-[0_0_10px_rgba(234,88,12,0.3)]">
               <Shield size={14}/>
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black truncate text-slate-200 leading-tight uppercase italic">{user.login}</p>
              <p className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">{user.role === 'admin' ? 'Administrador' : 'Operador'}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest"
          >
            <LogOut size={16} className="text-red-500/50" />
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-600 rounded-xl shadow-2xl shadow-orange-950/40">
                <Flame size={32} className="text-white" />
              </div>
              <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-white uppercase italic">
                Central de <span className="text-orange-600">Incidentes</span>
              </h1>
            </div>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.3em] flex items-center gap-2">
              <Activity size={14} className="text-orange-600 animate-pulse" />
              SISTEMA DE GESTÃO DE INCÊNDIOS FLORESTAIS
            </p>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="group relative bg-white text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-3 active:scale-95 transition-all shadow-2xl shadow-white/5 overflow-hidden"
          >
            <div className="absolute inset-0 bg-orange-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors">
              <Plus size={18} />
              Novo Registro de Incêndio
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {incidents.map((incident, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={incident.id}
              onClick={() => handleIncidentClick(incident)}
              className="group cursor-pointer relative bg-[#141414] border border-white/5 rounded-2xl overflow-hidden hover:border-orange-600/30 transition-all shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    incident.status === 'active_combat' ? "bg-orange-600/10 border-orange-600 text-orange-600" :
                    incident.status === 'active_no_resources' ? "bg-red-600/10 border-red-600 text-red-600" :
                    incident.status === 'mopping_up' ? "bg-blue-600/10 border-blue-600 text-blue-600" :
                    incident.status === 'surveillance' ? "bg-zinc-600/10 border-zinc-600 text-zinc-600" :
                    "bg-green-600/10 border-green-600 text-green-600"
                  )}>
                    {incident.status === 'active_no_resources' ? 'Ativo sem recursos' : 
                     incident.status === 'active_combat' ? 'Ativo em combate' : 
                     incident.status === 'mopping_up' ? 'Rescaldo' :
                     incident.status === 'surveillance' ? 'Vigilância' : 'Debelado'}
                  </div>
                  <div className="flex gap-2">
                    {incident.password && <Lock size={14} className="text-orange-600/50" />}
                    <Calendar size={18} className="text-slate-700" />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-2 group-hover:text-orange-500 transition-colors">
                  {incident.name}
                </h3>
                
                <div className="flex flex-col gap-2 mb-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin size={14} className="text-orange-600/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest truncate">{incident.location}</span>
                  </div>
                  {incident.coordinates && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Crosshair size={14} className="text-orange-600/50" />
                      <span className="text-[9px] font-mono tracking-tight">{incident.coordinates}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-600">
                    {format(incident.startDate, 'dd/MM/yyyy HH:mm')}
                  </span>
                  <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
                    {handlePromptRequired(incident) ? 'Bloqueado' : 'Acessar'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {incidents.length === 0 && !loading && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <Flame size={48} className="text-slate-800 mx-auto mb-6" />
              <p className="text-slate-600 font-black uppercase tracking-[0.2em] text-sm">Nenhum incêndio ativo registrado no sistema</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-white/10 p-8 rounded-1xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                 <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Plus size={20}/></div>
                 <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">Novo Registro</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Abertura de Ocorrência</p>
                 </div>
              </div>

              <form onSubmit={handleAdd} className="space-y-5">
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">NOME DA OPERAÇÃO / LOCAL</label>
                  <input 
                    required
                    type="text" 
                    placeholder="EX: INCÊNDIO SERRA DO CIPÓ"
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">LOCALIZAÇÃO DETALHADA</label>
                  <input 
                    required
                    type="text" 
                    placeholder="EX: KM 45 - RODOVIA MG-010"
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">COORDENADAS GEOGRÁFICAS</label>
                  <input 
                    type="text" 
                    placeholder="EX: -20°31'32'', -44°31'23''"
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white font-mono"
                    value={formData.coordinates}
                    onChange={(e) => setFormData({...formData, coordinates: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">STATUS INICIAL</label>
                  <select 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white font-bold uppercase"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="active_no_resources">Ativo sem recursos</option>
                    <option value="active_combat">Ativo em combate</option>
                    <option value="mopping_up">Rescaldo</option>
                    <option value="surveillance">Vigilância</option>
                    <option value="controlled">Debelado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">DESCRIÇÃO INICIAL</label>
                  <textarea 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em] flex items-center gap-2">
                    <Key size={12} className="text-orange-600" />
                    SENHA DE ACESSO (PROTEÇÃO)
                  </label>
                  <input 
                    type="password" 
                    placeholder="DEIXE EM BRANCO PARA ACESSO LIVRE"
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white font-mono"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <p className="text-[8px] text-slate-600 mt-2 font-bold uppercase tracking-widest leading-tight">Somente administradores ou você poderão alterar esta senha futuramente.</p>
                </div>
                <div className="flex gap-4 pt-6 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 font-black transition-all text-[10px] uppercase tracking-widest"
                  >
                    CANCELAR
                  </button>
                  <button 
                    disabled={saving}
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-lg bg-orange-700 text-white hover:bg-orange-600 font-black transition-all shadow-xl shadow-orange-950/20 text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Activity size={14} className="animate-spin" />
                        SALVANDO...
                      </>
                    ) : 'REGISTRAR'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPasswordPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-[#121212] border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
             >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-red-600"></div>
                
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-4 border border-orange-600/20">
                     <Lock size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Acesso Restrito</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Este incidente requer uma senha de acesso</p>
                </div>

                <form onSubmit={verifyPassword} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">IDENTIFICAÇÃO DE ACESSO</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input 
                        autoFocus
                        required
                        type="password" 
                        placeholder="••••••••"
                        className="w-full bg-[#1A1A1A] border-white/5 border rounded-xl text-sm p-4 pl-12 outline-none text-white font-bold transition-all focus:border-orange-600"
                        value={enteredPassword}
                        onChange={(e) => setEnteredPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest justify-center"
                    >
                      <AlertCircle size={14} />
                      Senha Incorreta
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowPasswordPrompt(null)}
                      className="flex-1 bg-white/5 text-slate-500 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all border border-white/5"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      className="flex-2 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-orange-950/20 flex items-center justify-center gap-2"
                    >
                      Acessar
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
