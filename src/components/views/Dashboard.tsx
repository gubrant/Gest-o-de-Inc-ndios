import { useState, useEffect } from 'react';
import React from 'react';
import { doc, collection, query, onSnapshot, orderBy, limit, where, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { Person, Vehicle, Team, Material, Incident, AppUser, LogAction } from '../../types';
import { 
  Users, Truck, Shield, Package, 
  Activity, AlertTriangle, Clock, ArrowUpRight,
  UtensilsCrossed, MapPin, ChevronDown, Lock, Key,
  Crosshair, Calendar, Send, History, Edit2, Trash2, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface DashboardProps {
  incidentId: string;
  user: AppUser;
}

const STATUS_OPTIONS = [
  { value: 'active_no_resources', label: 'Ativo sem recursos', color: 'text-red-500', dot: 'bg-red-500' },
  { value: 'active_combat', label: 'Ativo em combate', color: 'text-orange-500', dot: 'bg-orange-500' },
  { value: 'mopping_up', label: 'Rescaldo', color: 'text-blue-500', dot: 'bg-blue-500' },
  { value: 'surveillance', label: 'Vigilância', color: 'text-zinc-500', dot: 'bg-zinc-500' },
  { value: 'controlled', label: 'Debelado', color: 'text-green-500', dot: 'bg-green-500' }
];

export default function Dashboard({ incidentId, user }: DashboardProps) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Incident>>({});
  const [logs, setLogs] = useState<LogAction[]>([]);
  const [quickLog, setQuickLog] = useState('');
  const [quickLogTime, setQuickLogTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [showAdvancedLog, setShowAdvancedLog] = useState(false);
  const [editingLog, setEditingLog] = useState<LogAction | null>(null);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [stats, setStats] = useState({
    people: 0,
    activePeople: 0,
    vehicles: 0,
    activeTeams: 0,
    lowStock: 0
  });

  useEffect(() => {
    const unsubIncident = onSnapshot(doc(db, 'incidents', incidentId), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as Incident;
        setIncident(data);
        setEditFormData(data);
      }
    }, (error) => {
      handleFirestoreError(error, 'get' as any, 'incidents');
    });

    const unsubPeople = onSnapshot(query(collection(db, 'people'), where('incidentId', '==', incidentId)), (s) => {
      const all = s.docs.map(d => d.data() as Person);
      setStats(prev => ({ 
        ...prev, 
        people: all.length, 
        activePeople: all.filter(p => p.status === 'active').length 
      }));
    });

    const unsubVehicles = onSnapshot(query(collection(db, 'vehicles'), where('incidentId', '==', incidentId)), (s) => {
      setStats(prev => ({ ...prev, vehicles: s.docs.length }));
    });

    const unsubTeams = onSnapshot(query(collection(db, 'teams'), where('incidentId', '==', incidentId)), (s) => {
      setStats(prev => ({ ...prev, activeTeams: s.docs.filter(d => d.data().status === 'field').length }));
    });

    const unsubMaterials = onSnapshot(query(collection(db, 'materials'), where('incidentId', '==', incidentId)), (s) => {
      setStats(prev => ({ ...prev, lowStock: s.docs.filter(d => d.data().quantity < 10).length }));
    });

    const unsubLogs = onSnapshot(query(
      collection(db, 'actions'),
      where('incidentId', '==', incidentId),
      orderBy('timestamp', 'desc'),
      limit(5)
    ), (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LogAction[];
      setLogs(logsData);
    });

    return () => { 
      unsubIncident();
      unsubPeople(); 
      unsubVehicles(); 
      unsubTeams(); 
      unsubMaterials(); 
      unsubLogs();
    };
  }, [incidentId]);

  const handleQuickLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLog.trim() || submittingLog) return;
    
    setSubmittingLog(true);
    try {
      await addDoc(collection(db, 'actions'), {
        description: quickLog.toUpperCase(),
        category: 'PLANEJAMENTO',
        timestamp: new Date(quickLogTime).getTime(),
        incidentId,
        createdAt: serverTimestamp()
      });
      setQuickLog('');
      setQuickLogTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setShowAdvancedLog(false);
    } catch (error) {
      handleFirestoreError(error, 'create' as any, 'actions');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    try {
      await updateDoc(doc(db, 'actions', editingLog.id), {
        description: editingLog.description.toUpperCase(),
        category: editingLog.category,
        timestamp: editingLog.timestamp,
        updatedAt: serverTimestamp()
      });
      setEditingLog(null);
    } catch (error) {
      handleFirestoreError(error, 'update' as any, `actions/${editingLog.id}`);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Confirmar exclusão deste registro?')) return;
    try {
      await deleteDoc(doc(db, 'actions', id));
    } catch (error) {
      handleFirestoreError(error, 'delete' as any, `actions/${id}`);
    }
  };

  const canEdit = incident?.createdBy === user.login || user.role === 'admin';

  const handleStatusChange = async (newStatus: string) => {
    if (!canEdit) return;
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'controlled' && !incident?.finishedAt) {
        updates.finishedAt = Date.now();
      } else if (newStatus !== 'controlled' && incident?.finishedAt) {
        // If it was controlled and is now something else, we might want to clear finishedAt or keep it?
        // Usually, if it reactivates, we clear it to resume counting.
        updates.finishedAt = null;
      }
      
      await updateDoc(doc(db, 'incidents', incidentId), updates);
    } catch (error) {
      handleFirestoreError(error, 'update' as any, `incidents/${incidentId}`);
    }
  };

  const handleUpdateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      const dataToSave = {
        ...editFormData,
        name: editFormData.name?.toUpperCase(),
        location: editFormData.location?.toUpperCase(),
        description: editFormData.description?.toUpperCase(),
        startDate: incident?.startDate // keep original start date
      };
      await updateDoc(doc(db, 'incidents', incidentId), dataToSave);
      setShowEditModal(false);
    } catch (error) {
      handleFirestoreError(error, 'update' as any, `incidents/${incidentId}`);
    }
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === incident?.status) || STATUS_OPTIONS[1];

  const calculateDuration = () => {
    if (!incident) return '';
    const start = incident.startDate;
    const end = incident.finishedAt || Date.now();
    const diffMs = end - start;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h`;
  };

  const StatCard = ({ icon: Icon, label, value, subtext, color, borderSide }: any) => (
    <div className={cn(
      "bg-white p-6 rounded-xl border border-slate-200 relative overflow-hidden group hover:bg-slate-50 transition-all shadow-sm",
      borderSide && "border-l-4 border-l-orange-600"
    )}>
      <div className="relative z-10">
        <p className={cn("text-[10px] uppercase font-bold tracking-[0.2em] mb-3", borderSide ? "text-orange-600" : "text-slate-500")}>
          {label}
        </p>
        <div className="flex items-end gap-2">
          <p className="text-4xl font-bold text-slate-900 tracking-tighter">{value}</p>
          <span className="text-xs text-slate-500 font-medium mb-1.5">{subtext}</span>
        </div>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon size={100} className="text-slate-900" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{incident?.name || 'Visão Operacional'}</h2>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} className="text-orange-600" />
              {incident && format(incident.startDate, 'dd/MM/yyyy HH:mm')}
            </p>
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest flex items-center gap-2 border-l border-slate-200 pl-4">
              <Clock size={14} className="text-orange-600" />
              Ativo: {calculateDuration()}
            </p>
            {incident?.coordinates && (
              <p className="text-orange-600 text-[10px] font-mono font-black border border-orange-200 bg-orange-50 px-2 py-0.5 rounded flex items-center gap-2">
                <Crosshair size={12} />
                {incident.coordinates}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative group">
            <select 
              disabled={!canEdit}
              value={incident?.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={cn(
                "appearance-none bg-white border border-slate-200 pl-10 pr-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] outline-none cursor-pointer hover:bg-slate-50 transition-all text-slate-900 shadow-sm",
                currentStatus.color,
                !canEdit && "opacity-50 cursor-not-allowed"
              )}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse", currentStatus.dot)}></div>
            {canEdit && <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
            {!canEdit && <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
          </div>
          
          <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sistemas OK</span>
          </div>
          
          {canEdit && (
            <button 
              onClick={() => setShowEditModal(true)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 shadow-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all group"
            >
              <Shield size={14} className="text-orange-600" />
              <span className="text-[10px] font-black uppercase tracking-widest">Editar Ocorrência</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Total Efetivo" 
          value={stats.people} 
          subtext="pessoas"
          color="text-slate-900"
        />
        <StatCard 
          icon={Shield} 
          label="Equipes Ativas" 
          value={stats.activeTeams} 
          subtext="em campo"
          color="text-green-600"
        />
        <StatCard 
          icon={Truck} 
          label="Veículos" 
          value={stats.vehicles} 
          subtext="unidades"
          color="text-blue-600"
        />
        <StatCard 
          icon={UtensilsCrossed} 
          label="Próxima Refeição" 
          value="138" 
          subtext="almoços"
          color="text-orange-600"
          borderSide
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-3 text-slate-900">
                  <span className="text-orange-600">●</span> Diário de Operações
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <form onSubmit={handleQuickLogSubmit} className="space-y-3">
                  <div className="relative group">
                    <input 
                      type="text"
                      value={quickLog}
                      onChange={(e) => setQuickLog(e.target.value)}
                      placeholder="REGISTRAR AÇÃO RÁPIDA..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-4 pr-24 text-xs font-bold uppercase tracking-widest outline-none focus:border-orange-600 focus:bg-white transition-all shadow-inner"
                    />
                    <div className="absolute right-2 top-2 bottom-2 flex gap-1">
                      <button 
                        type="button"
                        onClick={() => setShowAdvancedLog(!showAdvancedLog)}
                        className={cn(
                          "px-2 rounded-lg flex items-center justify-center transition-all",
                          showAdvancedLog ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-400 hover:text-slate-600"
                        )}
                        title="Ajustar Data/Hora"
                      >
                        <Clock size={16} />
                      </button>
                      <button 
                        type="submit"
                        disabled={!quickLog.trim() || submittingLog}
                        className="aspect-square bg-slate-900 rounded-lg flex items-center justify-center text-white hover:bg-black transition-all disabled:opacity-50"
                      >
                        {submittingLog ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {showAdvancedLog && (
                    <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                       <div className="flex-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block tracking-widest">Informar Data/Hora Ocorrido</label>
                          <input 
                            type="datetime-local"
                            value={quickLogTime}
                            onChange={(e) => setQuickLogTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-mono outline-none focus:border-orange-600"
                          />
                       </div>
                    </div>
                  )}
                </form>

                <div className="space-y-3">
                  {logs.length === 0 ? (
                    <div className="py-10 text-center">
                      <History size={32} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sem registros recentes</p>
                    </div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="flex items-center gap-5 p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-600/30 transition-all border-l-2 border-l-orange-600 shadow-sm group relative">
                        <div className="bg-orange-600/10 p-2.5 rounded text-orange-600 group-hover:scale-110 transition-transform">
                          {log.category === 'COMBATE' ? <Shield size={18}/> : 
                           log.category === 'LOGÍSTICA' ? <Package size={18}/> :
                           <Activity size={18}/>}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 italic uppercase tracking-tight">{log.description}</p>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-widest">{log.category}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">{format(log.timestamp, 'HH:mm')}</span>
                            <span className="text-[8px] font-mono text-slate-300 uppercase tracking-widest block">{format(log.timestamp, 'dd/MM')}</span>
                          </div>
                          
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                               onClick={() => setEditingLog(log)}
                               className="p-1 hover:text-orange-600 transition-colors"
                             >
                                <Edit2 size={12} />
                             </button>
                             <button 
                               onClick={() => handleDeleteLog(log.id)}
                               className="p-1 hover:text-red-600 transition-colors"
                             >
                                <Trash2 size={12} />
                             </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg">
              <h3 className="font-bold text-xs text-slate-900 mb-6 uppercase tracking-widest border-b border-slate-100 pb-4">Painel de Acesso Rápido</h3>
              <div className="space-y-2">
                 <button className="w-full text-left p-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-between group transition-all shadow-xl shadow-orange-100">
                    CADASTRAR EQUIPE
                    <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                 </button>
                 <button className="w-full text-left p-4 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between group transition-all">
                    GESTÃO DE ALIMENTAÇÃO
                    <ArrowUpRight size={14} />
                 </button>
                 <button className="w-full text-left p-4 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between group transition-all">
                    RECURSOS EXTERNOS
                    <ArrowUpRight size={14} />
                 </button>
              </div>
           </div>

           <div className="bg-orange-600 p-6 rounded-xl text-white relative overflow-hidden shadow-2xl shadow-orange-100">
              <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12">
                 <Shield size={140} />
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-2 opacity-80 font-mono text-white">Safety First</p>
              <h4 className="text-2xl font-black italic uppercase leading-none mb-3 tracking-tighter">Protocolo LACES</h4>
              <p className="text-[11px] opacity-90 italic font-medium leading-relaxed">
                Lookouts, Communications, Escape Routes, Safety Zones. Verifique sempre o plano de fuga.
              </p>
           </div>
        </div>
      </div>

      <footer className="mt-8 flex justify-between items-center text-[10px] text-slate-500 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-8 uppercase font-bold tracking-widest">
          <span>SISTEMA ATUALIZADO: <span className="text-slate-900">2 MINUTOS</span></span>
          <span className="hidden sm:block">SERVER-ID: <span className="text-slate-900 font-mono">FIRE_MG_0112_B</span></span>
        </div>
        <div className="font-mono text-orange-600/50">FIREMONITOR v2.4.0</div>
      </footer>

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Shield size={20}/></div>
                  <div>
                      <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter italic">Editar Ocorrência</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Alterar informações base</p>
                  </div>
               </div>
               <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
               </button>
            </div>

            <form onSubmit={handleUpdateIncident} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">NOME DA OPERAÇÃO</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 text-slate-900 font-bold"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">LOCALIZAÇÃO</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 text-slate-900 font-bold"
                  value={editFormData.location || ''}
                  onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">COORDENADAS</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 text-slate-900 font-mono"
                  value={editFormData.coordinates || ''}
                  onChange={(e) => setEditFormData({...editFormData, coordinates: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block flex items-center gap-2">
                  <Key size={12} className="text-orange-600" />
                  SENHA DE ACESSO
                </label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 text-slate-900 font-mono"
                  value={editFormData.password || ''}
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">DESCRIÇÃO</label>
                <textarea 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 text-slate-900 font-bold min-h-[100px]"
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-900 text-white hover:bg-black font-black text-[10px] uppercase shadow-lg shadow-slate-200 transition-all"
                >
                  SALVAR ALTERAÇÕES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Edit2 size={20}/></div>
                  <div>
                      <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter italic">Editar Registro</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ajustar detalhes da ação</p>
                  </div>
               </div>
               <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
               </button>
            </div>

            <form onSubmit={handleUpdateLog} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">DESCRIÇÃO DA AÇÃO</label>
                <textarea 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 text-slate-900 font-bold uppercase italic min-h-[100px]"
                  value={editingLog.description}
                  onChange={(e) => setEditingLog({...editingLog, description: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                   <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">DATA E HORA DO OCORRIDO</label>
                   <input 
                     type="datetime-local" 
                     className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 text-slate-900 font-mono"
                     value={format(new Date(editingLog.timestamp), "yyyy-MM-dd'T'HH:mm")}
                     onChange={(e) => setEditingLog({...editingLog, timestamp: new Date(e.target.value).getTime()})}
                     required
                   />
                </div>
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-black text-[10px] uppercase shadow-lg shadow-orange-100 transition-all font-black"
                >
                  SALVAR ALTERAÇÕES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
