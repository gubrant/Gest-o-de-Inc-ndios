import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  serverTimestamp, orderBy, where, doc, updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { LogAction } from '../../types';
import { History, Plus, Clock, Calendar, MessageSquare, Filter, FileText, Edit2 } from 'lucide-react';
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
  const [editingLog, setEditingLog] = useState<LogAction | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState<string | 'ALL'>('ALL');
  
  const [formData, setFormData] = useState({
    description: '',
    category: CATEGORIES[0],
    customTimestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  // Reset form data with current time whenever modal is opened
  useEffect(() => {
    if (showAddModal && !editingLog) {
      setFormData(prev => ({
        ...prev,
        customTimestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        description: '',
        category: CATEGORIES[0]
      }));
    } else if (showAddModal && editingLog) {
      setFormData({
        description: editingLog.description,
        category: editingLog.category,
        customTimestamp: format(new Date(editingLog.timestamp), "yyyy-MM-dd'T'HH:mm")
      });
    }
  }, [showAddModal, editingLog]);

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
      const logData = {
        ...formData,
        description: formData.description.toUpperCase(),
        timestamp: new Date(formData.customTimestamp).getTime(),
        incidentId,
        updatedAt: serverTimestamp()
      };

      if (editingLog) {
        await updateDoc(doc(db, 'actions', editingLog.id), logData);
      } else {
        await addDoc(collection(db, 'actions'), {
          ...logData,
          createdAt: serverTimestamp()
        });
      }
      
      setShowAddModal(false);
      setEditingLog(null);
      setFormData({ 
        description: '', 
        category: CATEGORIES[0], 
        customTimestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm") 
      });
    } catch (error) {
      handleFirestoreError(error, (editingLog ? 'update' : 'create') as any, 'actions');
    }
  };

  const handleEditClick = (log: LogAction) => {
    setEditingLog(log);
    setShowAddModal(true);
  };

  const filteredLogs = logs.filter(l => {
    const matchesCategory = filter === 'ALL' || l.category === filter;
    if (!matchesCategory) return false;
    
    if (selectedDate === 'ALL') return true;
    return format(new Date(l.timestamp), 'dd/MM/yyyy') === selectedDate;
  });

  // Grouped logs for display
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const date = format(new Date(log.timestamp), 'dd/MM/yyyy');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, LogAction[]>);

  const availableDates = Array.from(new Set(logs.map(l => format(new Date(l.timestamp), 'dd/MM/yyyy'))))
    .sort((a: string, b: string) => {
      const dateA = new Date(a.split('/').reverse().join('-')).getTime();
      const dateB = new Date(b.split('/').reverse().join('-')).getTime();
      return dateB - dateA;
    });

  return (
    <div className="p-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-3">
            <History className="text-orange-600" />
            Diário de Bombardeio
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            Registro cronológico de eventos e decisões do posto de comando
          </p>
        </div>
        
        <button 
          onClick={() => {
            setEditingLog(null);
            setShowAddModal(true);
          }}
          className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
        >
          <Plus size={16} />
          Registrar Ação
        </button>
      </header>

      <div className="space-y-6 mb-8">
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Filtrar por Categoria</label>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setFilter('ALL')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                filter === 'ALL' 
                  ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" 
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm"
              )}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                  filter === cat 
                    ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Navegação por Dias</label>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setSelectedDate('ALL')}
              className={cn(
                "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2",
                selectedDate === 'ALL' 
                  ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100" 
                  : "bg-white border-slate-200 text-slate-500 hover:border-orange-200 shadow-sm"
              )}
            >
              <History size={14} />
              Todos os Dias
            </button>
            {availableDates.map(date => (
              <button 
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2",
                  selectedDate === date 
                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-orange-200 shadow-sm"
                )}
              >
                <Calendar size={14} />
                {date}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : Object.keys(groupedLogs).length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-20 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
             <History size={32} className="text-slate-200" />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nenhum registro encontrado para este critério</p>
        </div>
      ) : (
        <div className="space-y-12 relative before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-100">
          {(Object.entries(groupedLogs) as [string, LogAction[]][]).map(([date, items]) => (
            <div key={date} className="relative">
              {selectedDate === 'ALL' && (
                <div className="sticky top-0 z-10 bg-[#F5F5F5] py-2 mb-6">
                  <div className="inline-flex items-center gap-2 bg-orange-600/10 text-orange-600 px-3 py-1 rounded-full border border-orange-200">
                    <Calendar size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{date}</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {items.map((log) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.id} 
                    className="relative pl-10"
                  >
                    <div className="absolute left-0 top-1 w-[24px] h-[24px] bg-[#F5F5F5] flex items-center justify-center">
                      <div className="w-[10px] h-[10px] bg-orange-600 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.3)]"></div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-orange-600 transition-all shadow-sm group">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock size={12} />
                            <span className="text-[10px] font-mono font-bold">{format(new Date(log.timestamp), 'HH:mm')}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded border border-slate-100">
                            {log.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedDate === 'ALL' && (
                             <span className="text-[8px] font-mono font-black text-slate-300 uppercase tracking-widest italic">{date}</span>
                          )}
                          <button 
                            onClick={() => handleEditClick(log)}
                            className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-bold uppercase italic tracking-tight">
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
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-slate-900 font-black italic uppercase tracking-tighter flex items-center gap-2">
                  {editingLog ? <Edit2 size={18} className="text-orange-600" /> : <Plus size={18} className="text-orange-600" />}
                  {editingLog ? 'Editar Ação Operacional' : 'Registrar Nova Ação'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLog(null);
                  }} 
                  className="text-slate-400 hover:text-slate-900 transition-colors uppercase text-[10px] font-black tracking-widest"
                >
                  Fechar
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">CATEGORIA</label>
                  <select 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 outline-none text-slate-900 font-bold uppercase transition-all focus:border-orange-600"
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
                      className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 outline-none text-slate-900 font-mono transition-all focus:border-orange-600"
                      value={formData.customTimestamp}
                      onChange={(e) => setFormData({...formData, customTimestamp: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">DESCRIÇÃO DA AÇÃO</label>
                  <textarea 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 outline-none text-slate-900 font-bold uppercase italic transition-all focus:border-orange-600 min-h-[120px]"
                    placeholder="DESCREVA A AÇÃO TOMADA, DECISÃO OU EVENTO..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-slate-200"
                  >
                    {editingLog ? 'Salvar Alterações' : 'Confirmar Registro'}
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
