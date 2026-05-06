import { useState, useEffect } from 'react';
import React from 'react';
import { doc, collection, query, onSnapshot, orderBy, limit, where, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { Person, Vehicle, Team, Material, Incident, AppUser } from '../../types';
import { 
  Users, Truck, Shield, Package, 
  Activity, AlertTriangle, Clock, ArrowUpRight,
  UtensilsCrossed, MapPin, ChevronDown, Lock, Key 
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

    return () => { 
      unsubIncident();
      unsubPeople(); 
      unsubVehicles(); 
      unsubTeams(); 
      unsubMaterials(); 
    };
  }, [incidentId]);

  const canEdit = incident?.createdBy === user.login || user.role === 'admin';

  const handleStatusChange = async (newStatus: string) => {
    if (!canEdit) return;
    try {
      await updateDoc(doc(db, 'incidents', incidentId), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, 'update' as any, `incidents/${incidentId}`);
    }
  };

  const handleUpdateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      await updateDoc(doc(db, 'incidents', incidentId), {
        ...editFormData,
        startDate: incident?.startDate // keep original start date
      });
      setShowEditModal(false);
    } catch (error) {
      handleFirestoreError(error, 'update' as any, `incidents/${incidentId}`);
    }
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === incident?.status) || STATUS_OPTIONS[1];

  const StatCard = ({ icon: Icon, label, value, subtext, color, borderSide }: any) => (
    <div className={cn(
      "bg-[#1A1A1A] p-6 rounded-xl border border-white/5 relative overflow-hidden group hover:bg-[#222222] transition-all",
      borderSide && "border-l-4 border-l-orange-500"
    )}>
      <div className="relative z-10">
        <p className={cn("text-[10px] uppercase font-bold tracking-[0.2em] mb-3", borderSide ? "text-orange-500" : "text-slate-500")}>
          {label}
        </p>
        <div className="flex items-end gap-2">
          <p className="text-4xl font-bold text-white tracking-tighter">{value}</p>
          <span className="text-xs text-slate-500 font-medium mb-1.5">{subtext}</span>
        </div>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon size={100} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Visão Operacional</h2>
          <p className="text-slate-500 text-sm mt-2 font-mono uppercase tracking-widest">Tempo real • Central de Comando MG</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative group">
            <select 
              disabled={!canEdit}
              value={incident?.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={cn(
                "appearance-none bg-[#141414] border border-white/5 pl-10 pr-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] outline-none cursor-pointer hover:bg-white/5 transition-all text-white",
                currentStatus.color,
                !canEdit && "opacity-50 cursor-not-allowed"
              )}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#141414] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse", currentStatus.dot)}></div>
            {canEdit && <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />}
            {!canEdit && <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />}
          </div>
          
          <div className="bg-[#141414] border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sistemas OK</span>
          </div>
          
          {canEdit && (
            <button 
              onClick={() => setShowEditModal(true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all group"
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
          color="text-slate-200"
        />
        <StatCard 
          icon={Shield} 
          label="Equipes Ativas" 
          value={stats.activeTeams} 
          subtext="em campo"
          color="text-green-500"
        />
        <StatCard 
          icon={Truck} 
          label="Veículos" 
          value={stats.vehicles} 
          subtext="unidades"
          color="text-blue-500"
        />
        <StatCard 
          icon={UtensilsCrossed} 
          label="Próxima Refeição" 
          value="138" 
          subtext="almoços"
          color="text-orange-500"
          borderSide
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-[#141414] border border-white/5 rounded-xl flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1A1A1A]/30">
                <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-3 text-slate-200">
                  <span className="text-orange-500">●</span> Monitoramento de Ocorrências
                </h3>
                <button className="px-3 py-1 bg-white/5 rounded text-[10px] hover:bg-white/10 text-slate-400 font-bold uppercase transition-all">Exportar Logs</button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="flex items-center gap-5 p-4 bg-[#1A1A1A] rounded-xl border border-white/5 hover:border-orange-500/30 transition-all border-l-2 border-l-orange-500">
                    <div className="bg-orange-500/10 p-2.5 rounded text-orange-500"><AlertTriangle size={18}/></div>
                    <div className="flex-1">
                       <p className="text-sm font-bold text-white italic uppercase tracking-tight">Ponto Crítico em Setor Norte</p>
                       <p className="text-xs text-slate-500 mt-1 italic">Monitoramento aéreo solicitado via Rádio Canal 04</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">10m atrás</span>
                 </div>
                 
                 <div className="flex items-center gap-5 p-4 bg-[#1A1A1A] rounded-xl border border-white/5 opacity-60">
                    <div className="bg-white/5 p-2.5 rounded text-slate-500"><Clock size={18}/></div>
                    <div className="flex-1">
                       <p className="text-sm font-bold text-slate-300 italic uppercase tracking-tight text-white/70">Troca de Turno Concluída</p>
                       <p className="text-xs text-slate-500 mt-1 italic">VTR-24 e VTR-09 em base para reabastecimento</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">2h atrás</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
              <h3 className="font-bold text-xs text-slate-200 mb-6 uppercase tracking-widest border-b border-white/5 pb-4">Painel de Acesso Rápido</h3>
              <div className="space-y-2">
                 <button className="w-full text-left p-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-between group transition-all shadow-lg shadow-orange-950/20">
                    CADASTRAR EQUIPE
                    <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                 </button>
                 <button className="w-full text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between group transition-all">
                    GESTÃO DE ALIMENTAÇÃO
                    <ArrowUpRight size={14} />
                 </button>
                 <button className="w-full text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between group transition-all">
                    RECURSOS EXTERNOS
                    <ArrowUpRight size={14} />
                 </button>
              </div>
           </div>

           <div className="bg-orange-600 p-6 rounded-xl text-white relative overflow-hidden shadow-2xl shadow-orange-950/40">
              <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12">
                 <Shield size={140} />
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-2 opacity-80 font-mono">Safety First</p>
              <h4 className="text-2xl font-black italic uppercase leading-none mb-3 tracking-tighter">Protocolo LACES</h4>
              <p className="text-[11px] opacity-90 italic font-medium leading-relaxed">
                Lookouts, Communications, Escape Routes, Safety Zones. Verifique sempre o plano de fuga.
              </p>
           </div>
        </div>
      </div>

      <footer className="mt-8 flex justify-between items-center text-[10px] text-slate-600 bg-[#141414] p-4 rounded-xl border border-white/5">
        <div className="flex gap-8 uppercase font-bold tracking-widest">
          <span>SISTEMA ATUALIZADO: <span className="text-slate-400">2 MINUTOS</span></span>
          <span className="hidden sm:block">SERVER-ID: <span className="text-slate-400 font-mono">FIRE_MG_0112_B</span></span>
        </div>
        <div className="font-mono text-orange-500/50">FIREMONITOR v2.4.0</div>
      </footer>

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#141414] border border-white/10 p-8 rounded-1xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
               <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Shield size={20}/></div>
               <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">Editar Ocorrência</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Alterar informações base</p>
               </div>
            </div>

            <form onSubmit={handleUpdateIncident} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">NOME DA OPERAÇÃO</label>
                <input 
                  type="text" 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 text-white uppercase font-bold"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value.toUpperCase()})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">LOCALIZAÇÃO</label>
                <input 
                  type="text" 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 text-white uppercase font-bold"
                  value={editFormData.location || ''}
                  onChange={(e) => setEditFormData({...editFormData, location: e.target.value.toUpperCase()})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">COORDENADAS</label>
                <input 
                  type="text" 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 text-white font-mono"
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
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 text-white font-mono"
                  value={editFormData.password || ''}
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">DESCRIÇÃO</label>
                <textarea 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 text-white uppercase font-bold min-h-[100px]"
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="flex gap-4 pt-6 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-slate-500 hover:text-white font-black text-[10px] uppercase"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-700 text-white hover:bg-orange-600 font-black text-[10px] uppercase"
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
