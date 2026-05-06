import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  updateDoc, doc, serverTimestamp, orderBy, where 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { MealDemand, MealType } from '../../types';
import { UtensilsCrossed, Plus, Calendar, Clock, Coffee, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { motion } from 'motion/react';

interface MealsViewProps {
  incidentId: string;
}

export default function MealsView({ incidentId }: MealsViewProps) {
  const [demands, setDemands] = useState<MealDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    mealType: 'lunch' as MealType,
    count: 0,
    notes: ''
  });

  const path = 'meal_demands';

  useEffect(() => {
    const q = query(
      collection(db, path), 
      where('incidentId', '==', incidentId),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDemands(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealDemand)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, path);
    });
    return unsubscribe;
  }, [incidentId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, path), {
        ...formData,
        incidentId,
        updatedAt: Date.now()
      });
      setShowAddModal(false);
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), mealType: 'lunch', count: 0, notes: '' });
    } catch (error) {
      handleFirestoreError(error, 'create' as any, path);
    }
  };

  const mealIcons = {
    breakfast: <Coffee size={14} />,
    lunch: <UtensilsCrossed size={14} />,
    snack: <Coffee size={14} />,
    dinner: <Clock size={14} />
  };

  const mealLabels = {
    breakfast: 'Café da Manhã',
    lunch: 'Almoço',
    snack: 'Café da Tarde',
    dinner: 'Janta'
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Logística de Alimentação</h2>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1 italic">Levantamento de demanda para o Efetivo</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 text-[10px]"
        >
          <Plus size={16} />
          Registrar Demanda
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(mealLabels).map(([key, label]) => {
          const totalForMeal = demands
            .filter(d => d.mealType === key && d.date === format(new Date(), 'yyyy-MM-dd'))
            .reduce((acc, curr) => acc + curr.count, 0);
          
          return (
            <div key={key} className="bg-[#1A1A1A] border border-white/5 p-5 rounded-xl flex items-center gap-4 group hover:border-orange-500/20 transition-all">
              <div className="bg-orange-500/10 p-3 rounded-lg text-orange-600 transition-transform group-hover:scale-110">
                {mealIcons[key as MealType]}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{label} (HOJE)</p>
                <p className="text-3xl font-black text-white tracking-tighter">{totalForMeal}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 bg-[#1A1A1A]/50">
           <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">Histórico de Movimentação</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Data</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Refeição</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Quant.</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {demands.map(demand => (
                <tr key={demand.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4 text-xs font-mono font-bold text-white italic tracking-tighter">{demand.date}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500 italic">
                      <span className="p-1 bg-orange-500/10 rounded">{mealIcons[demand.mealType]}</span>
                      {mealLabels[demand.mealType]}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-black text-white uppercase tracking-tight">{demand.count} <span className="text-[9px] text-slate-500">PORÇÕES</span></td>
                  <td className="p-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">{demand.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#141414] border border-white/10 p-8 rounded-2xl w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
               <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><UtensilsCrossed size={20}/></div>
               <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">Nova Demanda</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Escalação de Rationamento</p>
               </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">DATA PREVISTA</label>
                <input 
                  required
                  type="date" 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white font-bold"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">TIPO DE REFEIÇÃO</label>
                <select 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white font-bold uppercase"
                  value={formData.mealType}
                  onChange={(e) => setFormData({...formData, mealType: e.target.value as MealType})}
                >
                  <option value="breakfast">CAFÉ DA MANHÃ</option>
                  <option value="lunch">ALMOÇO</option>
                  <option value="snack">CAFÉ DA TARDE</option>
                  <option value="dinner">JANTA</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">EFETIVO (PESSOAS)</label>
                <input 
                  required
                  type="number" 
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white font-bold"
                  value={formData.count}
                  onChange={(e) => setFormData({...formData, count: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">OBSERVAÇÕES OPERACIONAIS</label>
                <textarea 
                  placeholder="EX: FORNECEDOR X, SEM CARNE..."
                  className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-6 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 font-black transition-all text-[10px] uppercase tracking-widest"
                >
                  ABORTAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-700 text-white hover:bg-orange-600 font-black transition-all shadow-xl shadow-orange-950/20 text-[10px] uppercase tracking-widest"
                >
                  CONFIRMAR
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
