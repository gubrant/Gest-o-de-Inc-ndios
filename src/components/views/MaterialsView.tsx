import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  updateDoc, doc, serverTimestamp, orderBy, where 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { Material } from '../../types';
import { Package, Plus, Minus, Search, Edit2, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import PhotoUpload from '../PhotoUpload';

interface MaterialsViewProps {
  incidentId: string;
}

export default function MaterialsView({ incidentId }: MaterialsViewProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: 'un',
    patrimony: '',
    photos: [] as string[]
  });

  const path = 'materials';

  useEffect(() => {
    const q = query(
      collection(db, path), 
      where('incidentId', '==', incidentId),
      orderBy('name', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
      setMaterials(docs);
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
      setFormData({ name: '', category: '', quantity: 0, unit: 'un', patrimony: '', photos: [] });
    } catch (error) {
      handleFirestoreError(error, 'create' as any, path);
    }
  };

  const adjustQuantity = async (material: Material, amount: number) => {
    try {
      const newQty = Math.max(0, material.quantity + amount);
      await updateDoc(doc(db, path, material.id!), { 
        quantity: newQty,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'update' as any, path);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">Logística e Almoxarifado</h2>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1 italic">Controle de Estoque e Suprimentos</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 text-[10px]"
        >
          <Package size={16} />
          Cadastrar Item
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <Search className="text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR POR NOME OU CATEGORIA..." 
            className="bg-transparent border-none focus:ring-0 text-[10px] font-bold uppercase tracking-widest w-full text-slate-900 placeholder:text-slate-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">Item / Equipamento</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">Patrimônio</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">Categoria</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">Fotos</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.map(material => (
                <tr key={material.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 text-sm font-bold text-slate-900 uppercase tracking-tighter">{material.name}</td>
                  <td className="p-4">
                    {material.patrimony ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-600 font-black uppercase italic">
                        <Tag size={10} />
                        {material.patrimony}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 uppercase font-black tracking-widest italic">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 italic">
                       {material.category}
                    </span>
                  </td>
                  <td className="p-4">
                    {material.photos && material.photos.length > 0 ? (
                      <div className="flex -space-x-2">
                        {material.photos.map((p, i) => (
                          <div key={i} className="w-8 h-8 rounded-lg border border-white overflow-hidden bg-slate-100">
                             <img src={p} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-200 uppercase font-black italic">Sem fotos</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => adjustQuantity(material, -1)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-all"
                        disabled={material.quantity <= 0}
                      >
                        <Minus size={14} />
                      </button>
                      <button 
                        onClick={() => adjustQuantity(material, 1)}
                        className="p-1.5 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 p-8 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
               <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Plus size={20}/></div>
               <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter italic">Novo Material</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inclusão em Inventário Operacional</p>
               </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">NOME DO ITEM</label>
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
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">CATEGORIA</label>
                  <input 
                    placeholder="EX: EPI, ALIMENTO"
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 uppercase font-bold"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">UNIDADE</label>
                  <select 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-bold uppercase"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="un">UN</option>
                    <option value="kg">KG</option>
                    <option value="L">LT</option>
                    <option value="cx">CX</option>
                    <option value="par">PAR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">QUANTIDADE INICIAL</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 font-bold"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">PATRIMÔNIO (TAG)</label>
                <input 
                  placeholder="EX: PAT-00123"
                  type="text" 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 uppercase font-bold"
                  value={formData.patrimony}
                  onChange={(e) => setFormData({...formData, patrimony: e.target.value.toUpperCase()})}
                />
              </div>

              <PhotoUpload 
                photos={formData.photos}
                onChange={(photos) => setFormData({...formData, photos})}
              />

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
                  INVENTARIAR
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
