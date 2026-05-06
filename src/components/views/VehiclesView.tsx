import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  updateDoc, doc, serverTimestamp, orderBy, where 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { Vehicle, VehicleStatus } from '../../types';
import { Truck, Plus, Search, MoreVertical, Wrench, XCircle, CheckCircle2, Edit2, Tag, Book } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import PhotoUpload from '../PhotoUpload';

interface VehiclesViewProps {
  incidentId: string;
}

export default function VehiclesView({ incidentId }: VehiclesViewProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    plate: '',
    type: '',
    organization: '',
    description: '',
    status: 'active' as VehicleStatus,
    patrimony: '',
    photos: [] as string[]
  });

  const path = 'vehicles';

  useEffect(() => {
    const q = query(
      collection(db, path),
      where('incidentId', '==', incidentId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, path);
    });
    return unsubscribe;
  }, [incidentId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), {
          ...formData,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, path), {
          ...formData,
          incidentId,
          createdAt: Date.now()
        });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? 'update' : ('create' as any), path);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setFormData({ plate: '', type: '', organization: '', description: '', status: 'active', patrimony: '', photos: [] });
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingId(vehicle.id!);
    setFormData({
      plate: vehicle.plate,
      type: vehicle.type,
      organization: vehicle.organization,
      description: vehicle.description || '',
      status: vehicle.status,
      patrimony: vehicle.patrimony || '',
      photos: vehicle.photos || []
    });
    setShowAddModal(true);
  };

  const updateStatus = async (vehicle: Vehicle, newStatus: VehicleStatus) => {
    try {
      await updateDoc(doc(db, path, vehicle.id!), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, 'update' as any, path);
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(search.toLowerCase()) || 
    v.type.toLowerCase().includes(search.toLowerCase()) ||
    v.organization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">Controle de Frota</h2>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1 italic">Gestão de VTRs e Equipamentos Pesados</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 text-[10px]"
        >
          <Plus size={16} />
          Cadastrar Veículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total Veículos</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tighter">{vehicles.length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl border-l-4 border-l-green-600 shadow-sm">
          <p className="text-green-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Em Operação</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tighter">{vehicles.filter(v => v.status === 'active').length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl border-l-4 border-l-yellow-600 shadow-sm">
          <p className="text-yellow-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Manutenção</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tighter">{vehicles.filter(v => v.status === 'maintenance').length}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">Placa/ID</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">Patrimônio</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">Tipo / Modelo</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">Fotos</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map(vehicle => (
                <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 text-sm font-mono font-bold text-slate-900 uppercase tracking-tighter">{vehicle.plate}</td>
                  <td className="p-4">
                    {vehicle.patrimony ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-600 font-black uppercase italic">
                        <Tag size={10} />
                        {vehicle.patrimony}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 uppercase font-black tracking-widest italic">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-600 font-medium uppercase tracking-tight italic leading-none mb-1">{vehicle.type}</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 italic">
                        {vehicle.organization}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    {vehicle.photos && vehicle.photos.length > 0 ? (
                      <div className="flex -space-x-2">
                        {vehicle.photos.map((p, i) => (
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
                    <div className="flex justify-end gap-2 text-slate-400">
                       <button 
                         onClick={() => openEditModal(vehicle)}
                         className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded transition-all"
                         title="Editar Veículo"
                       >
                         <Edit2 size={16} />
                       </button>
                       <button onClick={() => updateStatus(vehicle, 'active')} className="p-1.5 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded transition-all"><CheckCircle2 size={16} /></button>
                       <button onClick={() => updateStatus(vehicle, 'maintenance')} className="p-1.5 hover:bg-yellow-50 text-slate-400 hover:text-yellow-600 rounded transition-all"><Wrench size={16} /></button>
                       <button onClick={() => updateStatus(vehicle, 'left')} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-all"><XCircle size={16} /></button>
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
               <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><Truck size={20}/></div>
               <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter italic">{editingId ? 'Editar Veículo' : 'Novo Veículo'}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{editingId ? 'Alteração de Registro de Frota' : 'Inclusão em Registro de Frota'}</p>
               </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">PREFIXO / PLACA</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 uppercase font-bold"
                    value={formData.plate}
                    onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">MODELO / TIPO</label>
                  <input 
                    required
                    placeholder="EX: ABSL-04"
                    type="text" 
                    className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 uppercase font-bold"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">INSTITUIÇÃO</label>
                <input 
                  required
                  placeholder="EX: CBMMG, IEF, PARTICULAR"
                  type="text" 
                  className="w-full bg-slate-50 border-slate-200 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-slate-900 uppercase font-bold"
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value.toUpperCase()})}
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

              <div className="flex gap-4 pt-6">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-black transition-all text-[10px] uppercase tracking-widest"
                >
                  ABORTAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-900 text-white hover:bg-black font-black transition-all shadow-xl shadow-slate-200 text-[10px] uppercase tracking-widest"
                >
                  {editingId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
