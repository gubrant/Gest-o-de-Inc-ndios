import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError } from '../../firebase';
import { Person, Vehicle, Team, Material, MealDemand, LogAction } from '../../types';
import { FileText, Download, Printer, Filter, ChevronRight, BarChart3, ListChecks, History, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface ReportsViewProps {
  incidentId: string;
}

export default function ReportsView({ incidentId }: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<'efetivo' | 'compras' | 'acoes' | 'almoxarifado'>('efetivo');
  const [logs, setLogs] = useState<LogAction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeReport === 'acoes') {
      setLoading(true);
      const q = query(
        collection(db, 'actions'),
        where('incidentId', '==', incidentId),
        orderBy('timestamp', 'asc')
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
    }
  }, [activeReport, incidentId]);

  const ReportButton = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => setActiveReport(id)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border",
        activeReport === id 
          ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  const renderActionsReport = () => {
    if (loading) return <div className="animate-pulse text-zinc-500 font-mono">CARREGANDO DADOS...</div>;
    
    if (logs.length === 0) return (
      <div className="text-zinc-600 italic">Nenhuma ação registrada para este incidente.</div>
    );

    return (
      <div className="w-full text-left space-y-8 print:space-y-4">
        <div className="border-b border-zinc-800 pb-4 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Relatório de Histórico Operacional</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">SGF-FLORESTAL - Controle de Operações</p>
        </div>

        <div className="space-y-6">
          {logs.map((log, index) => (
            <div key={log.id} className="flex gap-6 border-b border-white/5 pb-4 last:border-0">
              <div className="w-24 flex-shrink-0">
                <div className="text-[10px] font-black text-white/40 uppercase mb-1">{format(new Date(log.timestamp), 'dd/MM/yy')}</div>
                <div className="text-lg font-black text-orange-500 tabular-nums">{format(new Date(log.timestamp), 'HH:mm')}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[8px] font-black uppercase tracking-widest rounded border border-white/5">
                      {log.category}
                   </span>
                </div>
                <p className="text-sm text-zinc-300 font-medium uppercase italic leading-relaxed">
                   {log.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic font-serif uppercase opacity-80">Central de Relatórios</h2>
          <p className="text-zinc-500 text-sm">Gere e visualize dados consolidados da operação.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => window.print()}
             className="p-2 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
           >
             <Printer size={20} />
           </button>
           <button className="p-2 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><Download size={20} /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <ReportButton id="efetivo" label="Efetivo" icon={BarChart3} />
        <ReportButton id="compras" label="Logística" icon={ListChecks} />
        <ReportButton id="almoxarifado" label="Inventário" icon={FileText} />
        <ReportButton id="acoes" label="Linha do Tempo (Ações)" icon={History} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 min-h-[500px] flex flex-col items-center">
         {activeReport === 'acoes' ? (
           renderActionsReport()
         ) : (
           <div className="flex flex-col items-center justify-center h-full py-12 text-center">
             <div className="bg-zinc-800 p-6 rounded-full mb-6">
                <FileText size={48} className="text-zinc-600" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Pré-visualização do Relatório</h3>
             <p className="text-zinc-500 max-w-sm mb-8 italic">
               Selecione um dos relatórios acima para visualizar os dados consolidados da operação de incêndio.
             </p>
             <div className="w-full max-w-2xl bg-zinc-950/50 border border-zinc-800 p-8 rounded-xl border-dashed">
                <p className="text-zinc-600 text-sm font-mono uppercase tracking-widest">[ ÁREA DE VISUALIZAÇÃO DE DADOS ]</p>
             </div>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
         <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-4 border-l-orange-500">
            <h4 className="font-bold text-white mb-2 italic">Ações Recentes</h4>
            <p className="text-sm text-zinc-500 italic mb-4">Relatórios automáticos gerados com base nos logs do sistema.</p>
            <div className="space-y-4">
               {logs.slice(0, 5).map(log => (
                 <div key={log.id} className="flex gap-4 group cursor-pointer hover:bg-zinc-800/30 p-2 rounded-lg transition-colors">
                    <div className="text-[10px] font-mono text-zinc-600 uppercase mt-1">{format(new Date(log.timestamp), 'HH:mm')}</div>
                    <div>
                       <p className="text-sm font-bold text-zinc-300 transition-colors group-hover:text-orange-400 italic truncate w-48">{log.description}</p>
                       <p className="text-xs text-zinc-600 font-black uppercase tracking-widest">{log.category}</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>
         <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-4 border-l-blue-500">
            <h4 className="font-bold text-white mb-2 italic">Exportações Disponíveis</h4>
            <div className="space-y-2">
               {['Consolidado_Efetivo.pdf', 'Inventario_Final.xlsx', 'Logistica_Alimentacao.pdf'].map(file => (
                 <div key={file} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 group hover:border-zinc-700 transition-all">
                    <span className="text-sm font-mono text-zinc-400 group-hover:text-zinc-200">{file}</span>
                    <button className="text-zinc-500 hover:text-white"><Download size={16} /></button>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}

