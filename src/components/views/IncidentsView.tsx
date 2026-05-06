import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  orderBy, updateDoc, doc 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { AppUser, Incident } from '../../types';
import { 
  Flame, Plus, MapPin, Calendar, Clock, ArrowRight, Activity, 
  Crosshair, LogOut, Shield, UserCog, Lock, Key, X,
  AlertCircle, Edit2
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
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
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
    password: '',
    allowedUsers: [] as string[]
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    location: '',
    coordinates: '',
    description: '',
    allowedUsers: [] as string[]
  });

  const path = 'incidents';

  useEffect(() => {
    // Listen to incidents
    const q = query(collection(db, path), orderBy('startDate', 'desc'));
    const unsubscribeIncidents = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      
      // Filter incidents based on access
      const filtered = docs.filter(incident => {
        if (user.role === 'admin') return true;
        if (incident.createdBy === user.login) return true;
        
        // If allowedUsers is set, the user must be in the list
        if (incident.allowedUsers && incident.allowedUsers.length > 0) {
          return incident.allowedUsers.includes(user.login);
        }
        
        // If no allowedUsers specified, it's public (to all authenticated users)
        return true;
      });

      setIncidents(filtered);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, path);
    });

    // Listen to all users (for selection in creation)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
    });

    return () => {
      unsubscribeIncidents();
      unsubUsers();
    };
  }, [user.login, user.role]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      // Sanitize and uppercase on submission for better mobile compatibility
      const dataToSave = {
        ...formData,
        name: formData.name.trim().toUpperCase(),
        location: formData.location.trim().toUpperCase(),
        description: formData.description.trim().toUpperCase(),
        startDate: Date.now(),
        createdBy: user.login
      };

      if (!dataToSave.name || !dataToSave.location) {
        throw new Error("Nome e Localização são obrigatórios.");
      }

      await addDoc(collection(db, path), dataToSave);
      setShowAddModal(false);
      setFormData({ name: '', location: '', coordinates: '', status: 'active_combat', description: '', password: '', allowedUsers: [] });
    } catch (error: any) {
      setErrorMsg(error.message || "Erro ao salvar. Verifique sua conexão.");
      handleFirestoreError(error, 'create' as any, path);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, incident: Incident) => {
    e.stopPropagation();
    setEditingIncident(incident);
    setEditFormData({
      name: incident.name,
      location: incident.location,
      coordinates: incident.coordinates || '',
      description: incident.description || '',
      allowedUsers: incident.allowedUsers || []
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident?.id) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const dataToSave = {
        name: editFormData.name.trim().toUpperCase(),
        location: editFormData.location.trim().toUpperCase(),
        coordinates: editFormData.coordinates.trim(),
        description: editFormData.description.trim().toUpperCase(),
        allowedUsers: editFormData.allowedUsers
      };

      if (!dataToSave.name || !dataToSave.location) {
        throw new Error("Nome e Localização são obrigatórios.");
      }

      await updateDoc(doc(db, path, editingIncident.id), dataToSave);
      setShowEditModal(false);
      setEditingIncident(null);
    } catch (error: any) {
      setErrorMsg(error.message || "Erro ao atualizar. Verifique sua conexão.");
      handleFirestoreError(error, 'update' as any, `${path}/${editingIncident.id}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserSelection = (userLogin: string, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      setFormData(prev => ({
        ...prev,
        allowedUsers: prev.allowedUsers.includes(userLogin)
          ? prev.allowedUsers.filter(u => u !== userLogin)
          : [...prev.allowedUsers, userLogin]
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        allowedUsers: prev.allowedUsers.includes(userLogin)
          ? prev.allowedUsers.filter(u => u !== userLogin)
          : [...prev.allowedUsers, userLogin]
      }));
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

  const calculateDuration = (incident: Incident) => {
    const start = incident.startDate;
    const end = incident.finishedAt || Date.now();
    const diffMs = end - start;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h`;
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
    <div className="min-h-screen bg-[#F5F5F5] p-6 lg:p-12">
      {/* Top Bar for User & Logout */}
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center no-print gap-4">
        <div className="flex-1">
          {user.role === 'admin' && (
            <button 
              onClick={onGoToUsers}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 px-4 py-2.5 rounded-2xl flex items-center gap-3 transition-all group shadow-sm"
            >
              <div className="p-1.5 bg-orange-600 rounded-lg shadow-lg">
                <UserCog size={16} className="text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Gestão de Usuários</span>
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-100 px-4 py-2 rounded-2xl flex items-center gap-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white border border-white/10 shadow-sm">
               <Shield size={14}/>
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black truncate text-slate-900 leading-tight uppercase italic">{user.login}</p>
              <p className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">{user.role === 'admin' ? 'Administrador' : 'Operador'}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-[9px] font-black uppercase tracking-widest"
          >
            <LogOut size={16} className="text-red-600/50" />
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-600 rounded-xl shadow-lg">
                <Flame size={32} className="text-white" />
              </div>
              <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-slate-900 uppercase italic">
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
            className="group relative bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-200 overflow-hidden"
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
              className="group cursor-pointer relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-orange-600/30 transition-all shadow-lg"
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
                  <div className="flex gap-2 text-slate-300 group-hover:text-slate-400 transition-colors">
                    {incident.password && <Lock size={14} className="text-orange-600/50" />}
                    <Calendar size={18} />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic mb-2 group-hover:text-orange-600 transition-colors">
                  {incident.name}
                </h3>
                
                <div className="flex flex-col gap-2 mb-6">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin size={14} className="text-orange-600/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest truncate">{incident.location}</span>
                  </div>
                  {incident.coordinates && (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-2 py-1.5 rounded-lg border border-orange-100">
                      <Crosshair size={14} className="animate-pulse" />
                      <span className="text-[10px] font-mono font-black tracking-tight">{incident.coordinates}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        <Calendar size={12} className="text-orange-600/60" />
                        {format(incident.startDate, 'dd/MM/yyyy')}
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-600 font-black">
                        <Clock size={12} />
                        {calculateDuration(incident)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                    {(user.role === 'admin' || incident.createdBy === user.login) && (
                      <div className="flex items-center gap-1">
                        <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             onSelect(incident);
                           }}
                           title="Acessar Dashboard"
                           className="bg-orange-600 hover:bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-100 text-[9px]"
                        >
                           <ArrowRight size={14}/>
                           Acessar
                        </button>
                        <button 
                           onClick={(e) => handleEditClick(e, incident)}
                           title="Editar Informações"
                           className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-900 transition-all border border-slate-200"
                        >
                           <Edit2 size={16}/>
                        </button>
                      </div>
                    )}
                      <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                        {handlePromptRequired(incident) ? 'Bloqueado' : 'Acessar'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {incidents.length === 0 && !loading && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-3xl">
              <Flame size={48} className="text-slate-200 mx-auto mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">Nenhum incêndio ativo registrado no sistema</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 p-8 rounded-1xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                 <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Plus size={20}/></div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter italic">Novo Registro</h3>
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
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">LOCALIZAÇÃO DETALHADA</label>
                  <input 
                    required
                    type="text" 
                    placeholder="EX: KM 45 - RODOVIA MG-010"
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-bold"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">COORDENADAS GEOGRÁFICAS</label>
                  <input 
                    type="text" 
                    placeholder="EX: -20°31'32'', -44°31'23''"
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-mono"
                    value={formData.coordinates}
                    onChange={(e) => setFormData({...formData, coordinates: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">STATUS INICIAL</label>
                  <select 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-bold uppercase"
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
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-bold min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-mono"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-widest leading-tight">Somente administradores ou você poderão alterar esta senha futuramente.</p>
                </div>

                {user.role === 'admin' && (
                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block tracking-[0.2em] flex items-center gap-2">
                      <Shield size={12} className="text-orange-600" />
                      SELECIONAR USUÁRIOS COM ACESSO
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                      {allUsers.filter(u => u.login !== user.login).map(u => (
                          <button
                            key={u.login}
                            type="button"
                            onClick={() => toggleUserSelection(u.login, 'add')}
                            className={cn(
                              "px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all text-left truncate flex items-center gap-2",
                              formData.allowedUsers.includes(u.login)
                                ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                            )}
                          >
                          <div className={cn(
                             "w-1.5 h-1.5 rounded-full shrink-0",
                             formData.allowedUsers.includes(u.login) ? "bg-orange-600" : "bg-slate-300"
                          )} />
                          {u.login}
                        </button>
                      ))}
                    </div>
                    {formData.allowedUsers.length === 0 && (
                      <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-widest italic">Nenhum usuário selecionado: Acesso livre a todos logados.</p>
                    )}
                    {formData.allowedUsers.length > 0 && (
                      <p className="text-[8px] text-orange-600 mt-2 font-black uppercase tracking-widest">{formData.allowedUsers.length} USUÁRIO(S) SELECIONADOS</p>
                    )}
                  </div>
                )}
                <div className="flex gap-4 pt-6 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-black transition-all text-[10px] uppercase tracking-widest"
                  >
                    CANCELAR
                  </button>
                  <button 
                    disabled={saving}
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-lg bg-slate-900 text-white hover:bg-black font-black transition-all shadow-xl shadow-slate-200 text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 p-8 rounded-1xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                 <div className="p-2 bg-blue-600/10 rounded-lg text-blue-600"><Activity size={20}/></div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter italic">Editar Ocorrência</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Atualizar Informações de Campo</p>
                 </div>
              </div>

              <form onSubmit={handleUpdate} className="space-y-5">
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
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-blue-600 outline-none transition-all text-slate-900 font-bold"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">LOCALIZAÇÃO DETALHADA</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-blue-600 outline-none transition-all text-slate-900 font-bold"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">COORDENADAS GEOGRÁFICAS</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-blue-600 outline-none transition-all text-slate-900 font-mono"
                    value={editFormData.coordinates}
                    onChange={(e) => setEditFormData({...editFormData, coordinates: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">DESCRIÇÃO EDITADA</label>
                  <textarea 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-blue-600 outline-none transition-all text-slate-900 font-bold min-h-[100px]"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  />
                </div>

                {user.role === 'admin' && (
                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block tracking-[0.2em] flex items-center gap-2">
                      <Shield size={12} className="text-orange-600" />
                      USUÁRIOS COM ACESSO
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                      {allUsers.filter(u => u.login !== user.login).map(u => (
                        <button
                          key={u.login}
                          type="button"
                          onClick={() => toggleUserSelection(u.login, 'edit')}
                          className={cn(
                            "px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all text-left truncate flex items-center gap-2",
                            editFormData.allowedUsers.includes(u.login)
                              ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          <div className={cn(
                             "w-1.5 h-1.5 rounded-full shrink-0",
                             editFormData.allowedUsers.includes(u.login) ? "bg-white" : "bg-slate-300"
                          )} />
                          {u.login}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-6 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingIncident(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-black transition-all text-[10px] uppercase tracking-widest"
                  >
                    CANCELAR
                  </button>
                  <button 
                    disabled={saving}
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-lg bg-blue-700 text-white hover:bg-blue-600 font-black transition-all shadow-xl shadow-blue-200 text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Activity size={14} className="animate-spin" />
                        SALVANDO...
                      </>
                    ) : 'SALVAR ALTERAÇÕES'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPasswordPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-white border border-slate-200 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
             >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-red-600"></div>
                
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-4 border border-orange-600/20">
                     <Lock size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Acesso Restrito</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Este incidente requer uma senha de acesso</p>
                </div>

                <form onSubmit={verifyPassword} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">IDENTIFICAÇÃO DE ACESSO</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        autoFocus
                        required
                        type="password" 
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border-slate-200 border rounded-xl text-sm p-4 pl-12 outline-none text-slate-900 font-bold transition-all focus:border-orange-600"
                        value={enteredPassword}
                        onChange={(e) => setEnteredPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest justify-center"
                    >
                      <AlertCircle size={14} />
                      Senha Incorreta
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowPasswordPrompt(null)}
                      className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      className="flex-2 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2"
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
