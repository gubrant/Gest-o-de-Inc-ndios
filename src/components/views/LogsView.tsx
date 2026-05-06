import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  serverTimestamp, orderBy, where 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { LogAction } from '../../types';
import { History, Plus, Clock, Calendar, MessageSquare, Filter, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface LogsViewProps {
  incidentId: string;
}

const CATEGORIES = [
  'COMBATE',
  'LOGÍSTICA',
  'PLANEJAMENTO',
  'ESTRATÉGIA',
  'SEGURANÇA',
  'COMUNICAÇÃO'
];

export default function LogsView({ incidentId }: LogsViewProps) {
  const [logs, setLogs] = useState<LogAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('ALL');
  
  const [formData, setFormData] = useState({
    description: '',
    category: CATEGORIES[0],
    customTimestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  useEffect(() => {
    const q = query(
      collection(db, 'actions'),
      where('incidentId', '==', incidentId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LogAction[];
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, 'actions');
    });

    return () => unsubscribe();
  }, [incidentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'actions'), {
        ...formData,
        timestamp: new Date(formData.customTimestamp).getTime(),
        incidentId,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setFormData({ 
        description: '', 
        category: CATEGORIES[0], 
        customTimestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm") 
      });
    } catch (error) {
      handleFirestoreError(error, 'create' as any, 'actions');
    }
  };

  const filteredLogs = filter === 'ALL' 
    ? logs 
    : logs.filter(l => l.category === filter);

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const date = format(new Date(log.timestamp), 'dd/MM/yyyy');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, LogAction[]>);

  return (
    <div className="p-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <History className="text-orange-600" />
            Histórico de Ações
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            Registro cronológico de eventos e decisões
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,88,12,0.3)]"
        >
          <Plus size={16} />
          Registrar Ação
        </button>
      </header>

      <div className="flex flex-wrap gap-2 mb-8">
        <button 
          onClick={() => setFilter('ALL')}
          className={cn(
            "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
            filter === 'ALL' 
              ? "bg-orange-600 border-orange-600 text-white" 
              : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"
          )}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
              filter === cat 
                ? "bg-orange-600 border-orange-600 text-white" 
                : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : Object.keys(groupedLogs).length === 0 ? (
        <div className="bg-[#1A1A1A] border border-dashed border-white/10 rounded-2xl p-12 text-center">
          <History size={48} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma ação registrada neste incidente</p>
        </div>
      ) : (
        <div className="space-y-12 relative before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[2px] before:bg-white/5">
          {(Object.entries(groupedLogs) as [string, LogAction[]][]).map(([date, items]) => (
            <div key={date} className="relative">
              <div className="sticky top-0 z-10 bg-[#121212] py-2 mb-6">
                <div className="inline-flex items-center gap-2 bg-orange-600/10 text-orange-500 px-3 py-1 rounded-full border border-orange-500/20">
                  <Calendar size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{date}</span>
                </div>
              </div>

              <div className="space-y-6">
                {items.map((log) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.id} 
                    className="relative pl-10"
                  >
                    <div className="absolute left-0 top-1 w-[24px] h-[24px] bg-[#121212] flex items-center justify-center">
                      <div className="w-[10px] h-[10px] bg-orange-600 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.5)]"></div>
                    </div>
                    
                    <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 hover:border-orange-600/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock size={12} />
                            <span className="text-[10px] font-mono font-bold">{format(new Date(log.timestamp), 'HH:mm')}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-white/5 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded border border-white/5">
                            {log.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium uppercase italic">
                        {log.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-orange-600/5">
                <h3 className="text-white font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <Plus size={18} className="text-orange-600" />
                  Registrar Nova Ação
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">Voltar</button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">CATEGORIA</label>
                  <select 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 outline-none text-white font-bold uppercase transition-all focus:border-orange-600"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">DATA E HORA DO EVENTO</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 outline-none text-white font-mono transition-all focus:border-orange-600"
                      value={formData.customTimestamp}
                      onChange={(e) => setFormData({...formData, customTimestamp: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">DESCRIÇÃO DA AÇÃO</label>
                  <textarea 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 outline-none text-white font-bold uppercase italic transition-all focus:border-orange-600 min-h-[120px]"
                    placeholder="DESCREVA A AÇÃO TOMADA, DECISÃO OU EVENTO..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                  >
                    Confirmar Registro
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
