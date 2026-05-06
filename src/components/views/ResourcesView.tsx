import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  updateDoc, doc, serverTimestamp, orderBy, where 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { ExternalResource, ExternalResourceType } from '../../types';
import { PhoneCall, Plus, Search, ExternalLink, Briefcase, Truck, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface ResourcesViewProps {
  incidentId: string;
}

export default function ResourcesView({ incidentId }: ResourcesViewProps) {
  const [resources, setResources] = useState<ExternalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'partner' as ExternalResourceType,
    contact: '',
    description: ''
  });

  const path = 'external_resources';

  useEffect(() => {
    const q = query(
      collection(db, path), 
      where('incidentId', '==', incidentId),
      orderBy('name', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalResource)));
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
        incidentId
      });
      setShowAddModal(false);
      setFormData({ name: '', type: 'partner', contact: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, 'create' as any, path);
    }
  };

  const resourceIcons = {
    machinery: <Truck size={18} />,
    partner: <Briefcase size={18} />,
    phone: <Phone size={18} />,
    supplier: <ExternalLink size={18} />
  };

  const typeLabels = {
    machinery: 'Maquinário',
    partner: 'Parceiro/Órgão',
    phone: 'Telefone Útil',
    supplier: 'Fornecedor'
  };

  const filteredResources = resources.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">Recursos Externos</h2>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1 italic">Catálogo de Parceiros e Infraestrutura</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 text-[10px]"
        >
          <Plus size={16} />
          Novo Recurso
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
          <Search className="text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR PARCEIRO, MÁQUINA OU DESCRIÇÃO..." 
            className="bg-transparent border-none focus:ring-0 text-[10px] font-bold uppercase tracking-widest w-full text-slate-900 placeholder:text-slate-400 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {filteredResources.map(resource => (
             <div key={resource.id} className="bg-white border border-slate-200 p-6 rounded-xl hover:border-orange-500 transition-all group flex flex-col shadow-sm">
                <div className="flex items-start justify-between mb-5">
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-400 group-hover:text-orange-600 transition-colors border border-slate-100">
                    {resourceIcons[resource.type]}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic border-b border-slate-100 pb-1">{typeLabels[resource.type]}</span>
                </div>
                <h3 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tighter italic">{resource.name}</h3>
                <p className="text-[11px] text-slate-500 mb-6 font-bold uppercase tracking-widest leading-relaxed flex-1 line-clamp-3">{resource.description}</p>
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50 -mx-6 -mb-6 p-4 mt-auto">
                   <div className="p-2 bg-orange-600/10 rounded">
                      <PhoneCall size={14} className="text-orange-600" />
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contato Direto</p>
                      <p className="text-xs font-mono font-bold text-slate-900 uppercase tracking-tighter">{resource.contact}</p>
                   </div>
                </div>
             </div>
          ))}
          {filteredResources.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center">
               <div className="inline-block p-4 bg-slate-50 rounded-full text-slate-200 mb-4 border border-slate-100"><Search size={32}/></div>
               <p className="text-slate-400 uppercase font-black text-[10px] tracking-[0.3em]">Nenhum recurso encontrado na base</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 p-8 rounded-2xl w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
               <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Plus size={20}/></div>
               <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter italic">Novo Recurso</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inclusão em Registro Operacional</p>
               </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">NOME / RAZÃO SOCIAL</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 uppercase font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">TIPO DE RECURSO</label>
                  <select 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-bold uppercase"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as ExternalResourceType})}
                  >
                    <option value="partner">PARCEIRO</option>
                    <option value="machinery">MAQUINÁRIO</option>
                    <option value="supplier">FORNECEDOR</option>
                    <option value="phone">ÚTIL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">CONTATO</label>
                  <input 
                    required
                    placeholder="(00) 0000-0000"
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-bold"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">DESCRIÇÃO / OBSERVAÇÕES</label>
                <textarea 
                  placeholder="EX: ESCAVADEIRA HIDRÁULICA, DEPÓSITO DE COMBUSTÍVEL..."
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 uppercase font-bold min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-black transition-all text-[10px] uppercase tracking-widest"
                >
                  ABORTAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-900 text-white hover:bg-black font-black transition-all shadow-xl shadow-slate-200 text-[10px] uppercase tracking-widest"
                >
                  REGISTRAR
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
