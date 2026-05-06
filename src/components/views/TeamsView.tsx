import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  updateDoc, doc, serverTimestamp, orderBy, where 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { Team, Person, TeamStatus } from '../../types';
import { Shield, Plus, Users, MapPin, CheckCircle2, Navigation, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface TeamsViewProps {
  incidentId: string;
}

export default function TeamsView({ incidentId }: TeamsViewProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    memberIds: [] as string[],
    status: 'base' as TeamStatus,
    currentLocation: ''
  });

  const path = 'teams';

  useEffect(() => {
    const qTeams = query(
      collection(db, path), 
      where('incidentId', '==', incidentId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });

    const qPeople = query(
      collection(db, 'people'), 
      where('incidentId', '==', incidentId),
      where('status', '==', 'active')
    );
    const unsubscribePeople = onSnapshot(qPeople, (snapshot) => {
      setPeople(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person)));
      setLoading(false);
    });

    return () => { unsubscribeTeams(); unsubscribePeople(); };
  }, [incidentId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.memberIds.length === 0) return alert('Selecione ao menos um membro');
    try {
      await addDoc(collection(db, path), {
        ...formData,
        incidentId,
        createdAt: Date.now()
      });
      setShowAddModal(false);
      setFormData({ name: '', memberIds: [], status: 'base', currentLocation: '' });
    } catch (error) {
      handleFirestoreError(error, 'create' as any, path);
    }
  };

  const updateStatus = async (team: Team, newStatus: TeamStatus) => {
    try {
      await updateDoc(doc(db, path, team.id!), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, 'update' as any, path);
    }
  };

  const toggleMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(id) 
        ? prev.memberIds.filter(mId => mId !== id) 
        : [...prev.memberIds, id]
    }));
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Equipes de Combate</h2>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1 italic">Organização Tática e Emprego Operacional</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 text-[10px]"
        >
          <Plus size={16} />
          Formar Nova Equipe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <div key={team.id} className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col group hover:border-orange-500/30 transition-all">
            <div className="p-4 border-b border-white/5 flex justify-between items-start bg-[#1A1A1A]/50">
              <div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">{team.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Equipe de Resposta</p>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                team.status === 'field' ? "bg-orange-600 text-white" : 
                team.status === 'base' ? "bg-green-600 text-white" : "bg-slate-800 text-slate-500"
              )}>
                {team.status === 'field' ? 'EM CAMPO' : team.status === 'base' ? 'NA BASE' : 'CONCLUÍDO'}
              </div>
            </div>
            
            <div className="p-4 flex-1 space-y-3">
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-600 mb-2 border-b border-white/5 pb-1">Componentes ({team.memberIds.length})</p>
                <div className="flex flex-wrap gap-1">
                  {team.memberIds.map((mId, idx) => {
                    const person = people.find(p => p.id === mId);
                    return (
                      <span key={idx} className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded border border-white/5 font-bold uppercase tracking-tight">
                        {person?.name || 'Não identificado'}
                      </span>
                    );
                  })}
                </div>
              </div>
              {team.status === 'field' && team.currentLocation && (
                <div className="flex items-center gap-2 text-[10px] text-orange-500 font-bold uppercase mt-2 bg-orange-500/5 p-2 rounded border border-orange-500/10">
                   <MapPin size={12} />
                   LOC: {team.currentLocation}
                </div>
              )}
            </div>

            <div className="p-3 bg-[#0A0A0A]/50 flex gap-2 border-t border-white/5">
              <button 
                onClick={() => updateStatus(team, 'field')}
                className={cn("flex-1 text-[9px] font-black uppercase tracking-widest py-2 rounded transition-all", 
                  team.status === 'field' ? "bg-orange-600/20 text-orange-400 border border-orange-500/20" : "bg-white/5 text-slate-500 hover:text-white"
                )}
              >
                Campo
              </button>
              <button 
                onClick={() => updateStatus(team, 'base')}
                className={cn("flex-1 text-[9px] font-black uppercase tracking-widest py-2 rounded transition-all", 
                  team.status === 'base' ? "bg-green-600/20 text-green-400 border border-green-500/20" : "bg-white/5 text-slate-500 hover:text-white"
                )}
              >
                Base
              </button>
              <button 
                onClick={() => updateStatus(team, 'left')}
                className="flex-1 text-[9px] font-black uppercase tracking-widest py-2 rounded bg-white/5 text-slate-500 hover:bg-white/10"
              >
                Sair
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#141414] border border-white/10 p-8 rounded-2xl w-full max-w-lg shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
               <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Plus size={20}/></div>
               <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">Composição de Equipe</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Escalação de Componentes e Recursos</p>
               </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">IDENTIFICADOR</label>
                <input 
                  required
                  placeholder="EX: GUARANI 01"
                  type="text" 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">EFETIVO DISPONÍVEL (CLIQUE PARA SELECIONAR)</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2 p-1">
                  {people.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleMember(p.id!)}
                      className={cn(
                        "p-3 rounded border text-left transition-all flex items-center justify-between",
                        formData.memberIds.includes(p.id!) 
                          ? "bg-orange-600 border-orange-500 text-white" 
                          : "bg-[#1A1A1A] border-white/5 text-slate-400 hover:border-white/20"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-tight">{p.name}</span>
                        <div className="flex items-center gap-2 mt-0.5 opacity-60">
                           <span className="text-[8px] font-bold uppercase">{p.role}</span>
                           {p.unit && <span className="text-[8px] font-bold uppercase border-l border-white/20 pl-2">{p.unit}</span>}
                        </div>
                      </div>
                      {p.registrationNumber && (
                        <span className="text-[9px] font-mono opacity-50">{p.registrationNumber}</span>
                      )}
                    </button>
                  ))}
                  {people.length === 0 && (
                    <p className="col-span-full text-slate-600 italic text-[10px] p-4 text-center">Ninguém disponível em base.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block tracking-[0.2em]">MISSÃO / LOCALIZAÇÃO INICIAL</label>
                <input 
                  type="text" 
                  placeholder="EX: SETOR NORTE - ACEIRO"
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold"
                  value={formData.currentLocation}
                  onChange={(e) => setFormData({...formData, currentLocation: e.target.value.toUpperCase()})}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 font-black transition-all text-[10px] uppercase tracking-widest"
                >
                  DESCARTAR
                </button>
                <button 
                  type="submit"
                  disabled={formData.memberIds.length === 0}
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-700 disabled:opacity-30 text-white hover:bg-orange-600 font-black transition-all shadow-xl shadow-orange-950/20 text-[10px] uppercase tracking-widest"
                >
                  ATIVAR EQUIPE ({formData.memberIds.length})
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
