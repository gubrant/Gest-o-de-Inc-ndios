import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  updateDoc, doc, serverTimestamp, orderBy, where 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { Person, PersonStatus, Vehicle } from '../../types';
import { Plus, Search, UserPlus, MoreVertical, CheckCircle2, XCircle, Phone, Hash, Shield, Truck, Edit2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface PeopleViewProps {
  incidentId: string;
}

export default function PeopleView({ incidentId }: PeopleViewProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    role: '',
    contact: '',
    registrationNumber: '',
    unit: '',
    vehiclePlate: '',
    status: 'active' as PersonStatus
  });

  const path = 'people';
  const vehiclesPath = 'vehicles';

  useEffect(() => {
    const q = query(
      collection(db, path), 
      where('incidentId', '==', incidentId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
      setPeople(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, path);
    });

    // Also fetch vehicles for the dropdown
    const vq = query(
      collection(db, vehiclesPath), 
      where('incidentId', '==', incidentId),
      orderBy('plate', 'asc')
    );
    const vUnsubscribe = onSnapshot(vq, (snapshot) => {
      const vDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vDocs);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, vehiclesPath);
    });

    return () => {
      unsubscribe();
      vUnsubscribe();
    };
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
    setFormData({ 
      name: '', 
      organization: '', 
      role: '', 
      contact: '', 
      registrationNumber: '',
      unit: '',
      vehiclePlate: '',
      status: 'active' 
    });
  };

  const openEditModal = (person: Person) => {
    setEditingId(person.id!);
    setFormData({
      name: person.name,
      organization: person.organization,
      role: person.role,
      contact: person.contact,
      registrationNumber: person.registrationNumber || '',
      unit: person.unit || '',
      vehiclePlate: person.vehiclePlate || '',
      status: person.status
    });
    setShowAddModal(true);
  };

  const toggleStatus = async (person: Person) => {
    try {
      const newStatus: PersonStatus = person.status === 'active' ? 'left' : 'active';
      await updateDoc(doc(db, path, person.id!), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, 'update' as any, path);
    }
  };

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.organization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Cadastro de Efetivo</h2>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1 italic">Registro Geral de Pessoal na Operação</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 text-[10px]"
        >
          <UserPlus size={16} />
          Cadastrar Pessoa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] border border-white/5 p-5 rounded-xl">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total Geral</p>
          <p className="text-3xl font-bold text-white tracking-tighter">{people.length}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-white/5 p-5 rounded-xl border-l-4 border-l-green-500/50">
          <p className="text-green-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Em Atividade</p>
          <p className="text-3xl font-bold text-white tracking-tighter">{people.filter(p => p.status === 'active').length}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-white/5 p-5 rounded-xl">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Desmobilizados</p>
          <p className="text-3xl font-bold text-slate-400 tracking-tighter">{people.filter(p => p.status === 'left').length}</p>
        </div>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-[#1A1A1A]/50">
          <Search className="text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR POR NOME OU INSTITUIÇÃO..." 
            className="bg-transparent border-none focus:ring-0 text-[10px] font-bold uppercase tracking-widest w-full text-slate-200 placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Identificação</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Órgão / Instituição</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Funcional</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Status</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPeople.map(person => (
                <tr key={person.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    <div className="text-sm font-bold text-white tracking-tight">{person.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                          <Hash size={10} className="text-orange-500/50" />
                          {person.registrationNumber || 'S/M'}
                       </div>
                       <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1 border-l border-white/10 pl-2">
                          <Phone size={10} className="text-orange-500/50" />
                          {person.contact || 'S/C'}
                       </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                       <span className="text-[10px] font-black uppercase tracking-wider bg-white/5 px-2 py-1 rounded text-slate-300 border border-white/5 group-hover:border-orange-500/20 transition-all italic inline-block w-fit">
                          {person.organization}
                       </span>
                       {person.unit && (
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest pl-1">
                             {person.unit}
                          </span>
                       )}
                    </div>
                  </td>
                  <td className="p-4">
                     <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest">{person.role}</div>
                        {person.vehiclePlate && (
                           <div className="flex items-center gap-1 text-[8px] text-orange-500 font-black uppercase tracking-tighter">
                              <Truck size={10}/> {person.vehiclePlate}
                           </div>
                        )}
                     </div>
                  </td>
                  <td className="p-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      person.status === 'active' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-slate-800 text-slate-500 border border-white/5"
                    )}>
                      <span className={cn("w-1 h-1 rounded-full", person.status === 'active' ? "bg-green-500 animate-pulse" : "bg-slate-600")} />
                      {person.status === 'active' ? 'Ativo' : 'Saiu'}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 text-zinc-500">
                      <button 
                        onClick={() => openEditModal(person)}
                        className="p-2 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                        title="Editar Registro"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => toggleStatus(person)}
                        className={cn(
                          "p-2 rounded hover:bg-white/5 transition-colors border border-transparent",
                          person.status === 'active' ? "text-orange-600 hover:border-orange-900/30" : "text-green-500 hover:border-green-900/30"
                        )}
                        title={person.status === 'active' ? 'Registrar Saída' : 'Registrar Retorno'}
                      >
                        {person.status === 'active' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPeople.length === 0 && !loading && (
            <div className="p-20 text-center text-slate-600 italic font-serif text-sm tracking-widest opacity-50">
              NENHUM OPERACIONAL REGISTRADO NOS PARÂMETROS ATUAIS.
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#141414] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
               <div className="p-2 bg-orange-600/10 rounded-lg text-orange-600"><UserPlus size={20}/></div>
               <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">{editingId ? 'Editar Operador' : 'Novo Operador'}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{editingId ? 'Alteração de Registro Operacional' : 'Inclusão em Registro Operacional'}</p>
               </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">NOME NOMINAL</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all focus:ring-1 focus:ring-orange-600/20 text-white uppercase font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">INSTITUIÇÃO</label>
                  <input 
                    required
                    placeholder="EX: CBMMG"
                    type="text" 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold text-center"
                    value={formData.organization}
                    onChange={(e) => setFormData({...formData, organization: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">POSTO/GRAD</label>
                  <input 
                    placeholder="EX: CB"
                    type="text" 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold text-center"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">MATRÍCULA / REGISTRO</label>
                  <input 
                    placeholder="EX: 123.456-7"
                    type="text" 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold text-center"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({...formData, registrationNumber: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">UNIDADE / CIA</label>
                  <input 
                    placeholder="EX: 2º BBM"
                    type="text" 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white uppercase font-bold text-center"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">TELEFONE / WHATSAPP</label>
                  <input 
                    type="text" 
                    placeholder="(00) 00000-0000"
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm font-mono p-3 focus:border-orange-600 outline-none transition-all text-orange-500 text-center"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">VIATURA DE CHEGADA</label>
                  <select 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-lg text-sm p-3 focus:border-orange-600 outline-none transition-all text-white font-bold uppercase"
                    value={formData.vehiclePlate}
                    onChange={(e) => setFormData({...formData, vehiclePlate: e.target.value})}
                  >
                    <option value="">NÃO INFORMADA</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate}>{v.plate} ({v.type})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 font-black transition-all text-[10px] uppercase tracking-widest"
                >
                  ABORTAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-700 text-white hover:bg-orange-600 font-black transition-all shadow-xl shadow-orange-950/20 text-[10px] uppercase tracking-widest"
                >
                  {editingId ? 'SALVAR ALTERAÇÕES' : 'AUTORIZAR REGISTRO'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
