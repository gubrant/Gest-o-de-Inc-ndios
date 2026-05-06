import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  deleteDoc, doc, updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { AppUser } from '../../types';
import { 
  UserPlus, User, Shield, Key, 
  Trash2, Search, Edit2, AlertCircle, Check
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function UsersView() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    role: 'operator' as 'admin' | 'operator'
  });

  const path = 'users';

  useEffect(() => {
    const q = query(collection(db, path));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, path);
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, path), {
        ...formData,
        login: formData.login.toLowerCase(),
        createdAt: Date.now()
      });
      setShowAddModal(false);
      setFormData({ login: '', password: '', role: 'operator' });
    } catch (error) {
      handleFirestoreError(error, 'create' as any, path);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Remover este usuário? O acesso será revogado imediatamente.")) return;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, 'delete' as any, path);
    }
  };

  const filteredUsers = users.filter(u => 
    u.login.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between mb-8 bg-[#121212] p-6 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-600"></div>
        <div className="flex items-center gap-4">
          <div className="bg-orange-600/20 p-2.5 rounded-xl">
             <Shield className="text-orange-500" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Controle de Acessos</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Gestão de Identidades e Permissões</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="BUSCAR USUÁRIO..."
              className="bg-[#1A1A1A] border-white/5 border rounded-xl text-[10px] py-2.5 pl-10 pr-4 outline-none text-white font-bold transition-all focus:border-orange-600 w-64 uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(234,88,12,0.3)]"
          >
            <UserPlus size={16} />
            Novo Operador
          </button>
        </div>
      </header>

      <div className="flex-1 bg-[#121212] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Identificação</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Nível de Acesso</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Senha Atual</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-mono text-[10px] uppercase tracking-widest">Carregando base de dados...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-mono text-[10px] uppercase tracking-widest italic">Nenhum operador cadastrado</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 border border-white/10 group-hover:bg-orange-600/10 group-hover:text-orange-500 transition-colors">
                          <User size={16} />
                        </div>
                        <span className="text-sm font-bold text-white uppercase tracking-tighter">{u.login}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                        u.role === 'admin' ? "bg-orange-600/10 border-orange-600/30 text-orange-500" : "bg-slate-800 border-white/5 text-slate-400"
                      )}>
                        {u.role === 'admin' ? 'Administrador' : 'Operador Padrão'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-slate-600">
                      ••••••••
                    </td>
                    <td className="p-4 text-right">
                      <button 
                         onClick={() => deleteUser(u.id!)}
                         className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl shadow-orange-900/10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-orange-600/5">
                <h3 className="text-white font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <UserPlus size={18} className="text-orange-600" />
                  Cadastrar Operador
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors uppercase text-[9px] font-black tracking-widest">Fechar</button>
              </div>
              
              <form onSubmit={handleAddUser} className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">LOGIN DE ACESSO</label>
                  <input 
                    required
                    type="text" 
                    placeholder="EX: JOAO.SILVA"
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-xl text-sm p-4 outline-none text-white font-bold uppercase transition-all focus:border-orange-600"
                    value={formData.login}
                    onChange={(e) => setFormData({...formData, login: e.target.value.toLowerCase()})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">SENHA INICIAL</label>
                  <input 
                    required
                    type="text" 
                    placeholder="MÍNIMO 4 CARACTERES"
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-xl text-sm p-4 outline-none text-white font-bold transition-all focus:border-orange-600"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-[0.2em]">NÍVEL DE PRIVILÉGIO</label>
                  <select 
                    className="w-full bg-[#1A1A1A] border-white/5 border rounded-xl text-sm p-4 outline-none text-white font-bold uppercase transition-all focus:border-orange-600"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                  >
                    <option value="operator">Operador (Apenas Leitura/Escrita)</option>
                    <option value="admin">Administrador (Total)</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] flex items-center justify-center gap-3"
                  >
                    Ativar Usuário
                    <Check size={16} />
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
