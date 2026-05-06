import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where, doc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { Person, Vehicle, Team, Material, MealDemand, LogAction } from '../../types';
import { FileText, Download, Printer, Filter, ChevronRight, BarChart3, ListChecks, History, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface ReportsViewProps {
  incidentId: string;
}

export default function ReportsView({ incidentId }: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<'efetivo' | 'compras' | 'acoes' | 'almoxarifado' | 'completo'>('efetivo');
  const [logs, setLogs] = useState<LogAction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [layers, setLayers] = useState<any[]>([]);
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFullData = activeReport === 'completo' || activeReport === 'acoes';
    
    if (fetchFullData) {
      setLoading(true);

      // Fetch Incident Info
      const unsubIncident = onSnapshot(doc(db, 'incidents', incidentId), (doc) => {
        if (doc.exists()) setIncident(doc.data());
      });

      // Fetch Actions
      const qLogs = query(
        collection(db, 'actions'),
        where('incidentId', '==', incidentId),
        orderBy('timestamp', 'asc')
      );
      const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LogAction[]);
      });

      if (activeReport === 'completo') {
        const unsubPeople = onSnapshot(query(collection(db, 'people'), where('incidentId', '==', incidentId)), (s) => {
          setPeople(s.docs.map(d => ({ id: d.id, ...d.data() })) as Person[]);
        });

        const unsubVehicles = onSnapshot(query(collection(db, 'vehicles'), where('incidentId', '==', incidentId)), (s) => {
          setVehicles(s.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[]);
        });

        const unsubTeams = onSnapshot(query(collection(db, 'teams'), where('incidentId', '==', incidentId)), (s) => {
          setTeams(s.docs.map(d => ({ id: d.id, ...d.data() })) as Team[]);
        });

        const unsubMaterials = onSnapshot(query(collection(db, 'materials'), where('incidentId', '==', incidentId)), (s) => {
          setMaterials(s.docs.map(d => ({ id: d.id, ...d.data() })) as Material[]);
        });

        const unsubMeals = onSnapshot(query(collection(db, 'meals'), where('incidentId', '==', incidentId)), (s) => {
          setMeals(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubLayers = onSnapshot(query(collection(db, 'kml_layers'), where('incidentId', '==', incidentId)), (s) => {
          setLayers(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoading(false);
        return () => {
          unsubIncident();
          unsubLogs();
          unsubPeople();
          unsubVehicles();
          unsubTeams();
          unsubMaterials();
          unsubMeals();
          unsubLayers();
        };
      }

      setLoading(false);
      return () => {
        unsubIncident();
        unsubLogs();
      };
    }
  }, [activeReport, incidentId]);

  const ReportButton = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => setActiveReport(id)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border shadow-sm",
        activeReport === id 
          ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200" 
          : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  const renderFullReport = () => {
    if (loading) return <div className="animate-pulse text-slate-400 font-mono text-xs font-black uppercase tracking-widest">PROCESSANDO RELATÓRIO COMPLETO...</div>;

    return (
      <div className="w-full text-left space-y-12 print:space-y-8">
        {/* Header Consolidado */}
        <div className="border-b-4 border-slate-900 pb-6 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-2 italic">Relatório Geral de Operações</h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] font-mono">Evento: {incident?.name || 'NÃO IDENTIFICADO'}</p>
          <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Data de Geração: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            <span>Local: {incident?.location || 'COORDENADAS NÃO DISPONÍVEIS'}</span>
          </div>
        </div>

        {/* Seção 1: Resumo do Efetivo */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 uppercase italic border-l-4 border-orange-600 pl-4 bg-slate-50 py-2">
            Efetivo e Recursos Humanos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Total Geral</span>
                <span className="text-2xl font-black text-slate-900 tabular-nums">{people.length}</span>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Ativos em Campo</span>
                <span className="text-2xl font-black text-slate-900 tabular-nums">{people.filter(p => !p.onLeave).length}</span>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Guarnições</span>
                <span className="text-2xl font-black text-slate-900 tabular-nums">{teams.length}</span>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Especialistas</span>
                <span className="text-2xl font-black text-slate-900 tabular-nums">{people.filter(p => p.role === 'SPECIALIST').length}</span>
             </div>
          </div>
          <table className="w-full text-[10px] uppercase font-bold text-slate-600">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr>
                <th className="py-2 px-4 text-left">Nome</th>
                <th className="py-2 px-4 text-left">Cargo</th>
                <th className="py-2 px-4 text-left">Equipe</th>
                <th className="py-2 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {people.slice(0, 15).map(p => (
                <tr key={p.id}>
                  <td className="py-2 px-4 italic">{p.name}</td>
                  <td className="py-2 px-4 text-slate-400">{p.role}</td>
                  <td className="py-2 px-4">{teams.find(t => t.id === p.teamId)?.name || 'AVULSO'}</td>
                  <td className="py-2 px-4 text-right">{p.onLeave ? 'FOLGA' : 'ATIVA'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {people.length > 15 && <p className="text-[8px] text-slate-400 italic text-right">+ {people.length - 15} outros listados no banco de dados</p>}
        </section>

        {/* Seção 2: Frota e Logística */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 uppercase italic border-l-4 border-orange-600 pl-4 bg-slate-50 py-2">
            Recursos Materiais e Frota
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Veículos em Operação</h3>
              {vehicles.length === 0 ? (
                <p className="p-3 text-[10px] text-slate-400 italic">Nenhum veículo mobilizado.</p>
              ) : vehicles.map(v => (
                <div key={v.id} className="flex justify-between p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-900">{v.plate} - {v.type}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-black">{v.status}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Status do Almoxarifado</h3>
              {materials.length === 0 ? (
                <p className="p-3 text-[10px] text-slate-400 italic">Inventário não preenchido.</p>
              ) : (
                <>
                  {materials.filter(m => m.quantity < 10).map(m => (
                    <div key={m.id} className="flex justify-between p-2 bg-red-50 rounded border border-red-100 italic">
                      <span className="text-[10px] font-bold text-red-900">{m.name}</span>
                      <span className="text-[9px] text-red-600 font-black">CRÍTICO: {m.quantity} UN</span>
                    </div>
                  ))}
                  {materials.filter(m => m.quantity >= 10).map(m => (
                    <div key={m.id} className="flex justify-between p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-900">{m.name}</span>
                      <span className="text-[9px] text-slate-500 font-black">{m.quantity} UN</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Seção 3: Suprimentos e SIG */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900 uppercase italic border-l-4 border-orange-600 pl-4 bg-slate-50 py-2">
                Logística de Suprimentos
              </h2>
              <div className="space-y-2">
                {meals.length === 0 ? (
                  <p className="p-3 text-[10px] text-slate-400 italic">Planejamento de alimentação não sincronizado.</p>
                ) : meals.map(meal => (
                  <div key={meal.id} className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm flex items-center justify-between">
                     <div>
                        <span className="block text-[8px] font-black text-slate-400 uppercase">{meal.date}</span>
                        <span className="text-[10px] font-bold text-slate-900 uppercase italic">{meal.type}</span>
                     </div>
                     <span className="text-sm font-black text-slate-900">{meal.quantity} <span className="text-[8px] text-slate-400">UN</span></span>
                  </div>
                ))}
              </div>
           </div>
           <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900 uppercase italic border-l-4 border-orange-600 pl-4 bg-slate-50 py-2">
                Cartografia e Geoprocessamento
              </h2>
              <div className="space-y-2">
                <div className="p-3 bg-slate-900 text-white rounded-xl mb-3">
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">ID Geográfico Principal</span>
                   <p className="text-xs font-mono font-bold truncate">{incident?.coordinates || 'COORDENADAS NÃO DEFINIDAS'}</p>
                </div>
                {layers.length === 0 ? (
                  <p className="p-3 text-[10px] text-slate-400 italic">Sem camadas SIG vinculadas ao incidente.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {layers.map(layer => (
                      <div key={layer.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                         <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                        <span className="text-[9px] font-bold text-slate-600 uppercase italic">{layer.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
           </div>
        </section>

        {/* Seção 4: Histórico de Ações (Timeline) */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 uppercase italic border-l-4 border-orange-600 pl-4 bg-slate-50 py-2">
            Histórico Completo da Operação
          </h2>
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-all">
                <div className="w-20 shrink-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase">{format(new Date(log.timestamp), 'dd/MM/yy')}</div>
                  <div className="text-sm font-black text-slate-900">{format(new Date(log.timestamp), 'HH:mm')}</div>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-slate-700 uppercase italic tracking-tight">{log.description}</p>
                  <span className="text-[8px] font-black text-orange-500 uppercase">{log.category}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer de Assinatura */}
        <div className="pt-20 grid grid-cols-2 gap-20 text-center">
          <div className="border-t border-slate-900 pt-2">
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Comandante do Incidente</span>
            <span className="text-[10px] font-bold underline">Assinatura / Carimbo</span>
          </div>
          <div className="border-t border-slate-900 pt-2">
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Responsável pelo SCCI</span>
            <span className="text-[10px] font-bold underline">Assinatura / Carimbo</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight italic uppercase opacity-80">Central de Relatórios</h2>
          <p className="text-slate-500 text-sm">Gere e visualize dados consolidados da operação.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => window.print()}
             className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all bg-white shadow-sm"
           >
             <Printer size={20} />
           </button>
           <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all bg-white shadow-sm"><Download size={20} /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <ReportButton id="efetivo" label="Efetivo" icon={BarChart3} />
        <ReportButton id="compras" label="Logística" icon={ListChecks} />
        <ReportButton id="almoxarifado" label="Inventário" icon={FileText} />
        <ReportButton id="acoes" label="Histórico de Ações" icon={History} />
        <ReportButton id="completo" label="Relatório Geral" icon={Printer} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 min-h-[500px] flex flex-col items-center shadow-lg">
         {activeReport === 'acoes' ? (
           <div className="w-full text-left space-y-6">
              <div className="border-b border-slate-200 pb-4 text-center">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Histórico de Ações</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 italic">SCCI - Registro Cronológico de Eventos</p>
              </div>
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="flex gap-4 border-b border-slate-100 pb-3">
                    <div className="w-20 shrink-0 font-black text-slate-900">
                       <div className="text-[8px] text-slate-400">{format(new Date(log.timestamp), 'dd/MM/yy')}</div>
                       <div className="text-sm">{format(new Date(log.timestamp), 'HH:mm')}</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase text-slate-600 italic leading-tight">{log.description}</p>
                      <span className="text-[8px] font-black text-orange-500 uppercase">{log.category}</span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
         ) : activeReport === 'completo' ? (
           renderFullReport()
         ) : (
           <div className="flex flex-col items-center justify-center h-full py-12 text-center">
             <div className="bg-slate-50 p-6 rounded-full mb-6 border border-slate-100">
                <FileText size={48} className="text-slate-300" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-wide">Pré-visualização do Relatório</h3>
             <p className="text-slate-500 max-w-sm mb-8 italic">
               Selecione um dos relatórios acima para visualizar os dados consolidados da operação de incêndio.
             </p>
             <div className="w-full max-w-2xl bg-slate-50/50 border border-slate-200 p-8 rounded-xl border-dashed">
                <p className="text-slate-400 text-sm font-mono uppercase tracking-widest font-black">[ ÁREA DE VISUALIZAÇÃO DE DADOS ]</p>
             </div>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
         <div className="bg-white border border-slate-200 p-6 rounded-2xl border-l-4 border-l-orange-500 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-2 italic uppercase tracking-tighter">Ações Recentes</h4>
            <p className="text-xs text-slate-500 italic mb-4 font-medium">Relatórios automáticos gerados com base nos logs do sistema.</p>
            <div className="space-y-4">
               {logs.slice(0, 5).map(log => (
                 <div key={log.id} className="flex gap-4 group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                    <div className="text-[10px] font-mono text-slate-400 uppercase mt-1">{format(new Date(log.timestamp), 'HH:mm')}</div>
                    <div>
                       <p className="text-sm font-bold text-slate-600 transition-colors group-hover:text-orange-600 italic truncate w-48">{log.description}</p>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{log.category}</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>
         <div className="bg-white border border-slate-200 p-6 rounded-2xl border-l-4 border-l-slate-900 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-2 italic uppercase tracking-tighter">Exportações Disponíveis</h4>
            <div className="space-y-2 mt-4">
               {['Consolidado_Efetivo.pdf', 'Inventario_Final.xlsx', 'Logistica_Alimentacao.pdf'].map(file => (
                 <div key={file} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-slate-300 transition-all">
                    <span className="text-sm font-mono text-slate-500 group-hover:text-slate-900">{file}</span>
                    <button className="text-slate-400 hover:text-slate-900 transition-all"><Download size={16} /></button>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}

