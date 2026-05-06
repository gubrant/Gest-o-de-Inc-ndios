import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { 
  Flame, Users, Truck, Package, Shield, 
  UtensilsCrossed, PhoneCall, FileText, 
  LayoutDashboard, LogOut, LogIn, Menu, X, ArrowLeft, MapPin, Crosshair, History, Map as MapIcon,
  UserCog, Camera
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Incident, AppUser } from './types';

import Dashboard from './components/views/Dashboard';
import PeopleView from './components/views/PeopleView';
import VehiclesView from './components/views/VehiclesView';
import MaterialsView from './components/views/MaterialsView';
import TeamsView from './components/views/TeamsView';
import MealsView from './components/views/MealsView';
import ResourcesView from './components/views/ResourcesView';
import ReportsView from './components/views/ReportsView';
import LogsView from './components/views/LogsView';
import MapView from './components/views/MapView';
import OperationPhotosView from './components/views/OperationPhotosView';
import IncidentsView from './components/views/IncidentsView';
import LoginView from './components/views/LoginView';
import UsersView from './components/views/UsersView';

  const SidebarItem = ({ to, icon: Icon, label, active, onClick }: { to: string, icon: any, label: string, active: boolean, onClick?: () => void, key?: string }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-6 py-3 transition-all duration-200 group text-sm font-medium",
      active 
        ? "bg-slate-100 border-r-2 border-orange-600 text-slate-900 shadow-sm" 
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
    )}
  >
    <Icon size={18} className={cn(active ? "text-orange-600" : "text-slate-400 group-hover:text-orange-500/70")} />
    <span className="tracking-tight">{label}</span>
  </Link>
);

function AppContent() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [loading, setLoading] = useState(true);
  const [isViewingUsers, setIsViewingUsers] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('sgf_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Persist selected incident
    const savedIncident = localStorage.getItem('sgf_selected_incident');
    if (savedIncident) {
      try {
        setSelectedIncident(JSON.parse(savedIncident));
      } catch (e) {
        console.error("Failed to load saved incident", e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = async (login: string, pass: string) => {
    // Hardcoded dev bootstrap
    if (login === 'adm' && pass === '12345') {
      const userData: AppUser = { login: 'adm', password: '***', role: 'admin', createdAt: Date.now() };
      setUser(userData);
      localStorage.setItem('sgf_user', JSON.stringify(userData));
      return true;
    }

    try {
      const q = query(
        collection(db, 'users'), 
        where('login', '==', login.toLowerCase()),
        where('password', '==', pass)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const found = snapshot.docs[0].data() as AppUser;
        const userData = { ...found, id: snapshot.docs[0].id, password: '***' };
        setUser(userData);
        localStorage.setItem('sgf_user', JSON.stringify(userData));
        return true;
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
    
    return false;
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedIncident(null);
    setIsViewingUsers(false);
    localStorage.removeItem('sgf_user');
    localStorage.removeItem('sgf_selected_incident');
  };

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    localStorage.setItem('sgf_selected_incident', JSON.stringify(incident));
  };

  const handleClearIncident = () => {
    setSelectedIncident(null);
    localStorage.removeItem('sgf_selected_incident');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (!selectedIncident) {
    if (isViewingUsers && user.role === 'admin') {
      return (
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
          <div className="p-6 lg:p-12 max-w-6xl mx-auto w-full flex justify-between items-center no-print">
            <button 
              onClick={() => setIsViewingUsers(false)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all font-black uppercase text-[10px] tracking-widest shadow-sm"
            >
              <ArrowLeft size={16} />
              Voltar aos Incidentes
            </button>
            <div className="bg-white border border-slate-100 px-4 py-2 rounded-2xl flex items-center gap-4 shadow-sm">
               <Shield size={16} className="text-orange-600" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Gestão de Usuários</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-12">
            <div className="max-w-6xl mx-auto">
               <UsersView />
            </div>
          </div>
        </div>
      );
    }
    return (
      <IncidentsView 
        onSelect={handleSelectIncident} 
        user={user} 
        onLogout={handleLogout} 
        onGoToUsers={() => setIsViewingUsers(true)}
      />
    );
  }

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/people", icon: Users, label: "Efetivo e Equipes" },
    { to: "/vehicles", icon: Truck, label: "Veículos e Equip." },
    { to: "/materials", icon: Package, label: "Logística e Almoxarifado" },
    { to: "/teams", icon: Shield, label: "Equipes de Combate" },
    { to: "/map", icon: MapIcon, label: "Mapa Operacional" },
    { to: "/photos", icon: Camera, label: "Fotos da Operação" },
    { to: "/logs", icon: History, label: "Histórico de Ações" },
    { to: "/meals", icon: UtensilsCrossed, label: "Demanda Logística" },
    { to: "/resources", icon: PhoneCall, label: "Recursos Externos" },
    { to: "/reports", icon: FileText, label: "Relatórios e Estatísticas" },
  ];

  if (user.role === 'admin') {
    menuItems.push({ to: "/users", icon: UserCog, label: "Gestão de Usuários" });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 flex font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 flex flex-col shadow-xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-orange-600">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,88,12,0.4)]"></div>
                <span className="font-bold tracking-[0.2em] text-[10px] uppercase">Operação Ativa</span>
              </div>
              <button 
                onClick={handleClearIncident}
                className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-orange-50 text-slate-500 hover:text-orange-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-slate-200 shadow-sm"
                title="Retornar ao Menu de Incidentes"
              >
                <ArrowLeft size={12} />
                Menu
              </button>
            </div>
            <h2 className="font-black text-lg leading-none uppercase tracking-tighter text-slate-900">Gestão de Incêndios</h2>
            <div className="text-[8px] font-black text-orange-600/70 uppercase tracking-[0.2em] mt-1">Monitoramento Florestal</div>
            {selectedIncident && (
              <div className="mt-3 flex items-center gap-2 text-slate-600 overflow-hidden bg-slate-100 p-2 rounded border border-slate-200">
                <Flame size={12} className="text-orange-600 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest truncate italic opacity-80">
                  {selectedIncident.name}
                </span>
              </div>
            )}
          </div>


          <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <SidebarItem 
                key={item.to} 
                to={item.to} 
                icon={item.icon} 
                label={item.label} 
                active={location.pathname === item.to} 
                onClick={closeSidebarOnMobile}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white border border-white/10 shadow-sm">
                 <Shield size={14}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-slate-900">{user.login}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{user.role === 'admin' ? 'Admin Online' : 'Operador Online'}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-600 rounded-full"></div>
              <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-slate-500">
                {menuItems.find(m => m.to === location.pathname)?.label || "Sistema"}
              </h1>
            </div>
          </div>
          
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="p-8 h-full"
            >
              <Routes>
                <Route path="/" element={<Dashboard incidentId={selectedIncident.id!} user={user} />} />
                <Route path="/people" element={<PeopleView incidentId={selectedIncident.id!} />} />
                <Route path="/vehicles" element={<VehiclesView incidentId={selectedIncident.id!} />} />
                <Route path="/materials" element={<MaterialsView incidentId={selectedIncident.id!} />} />
                <Route path="/teams" element={<TeamsView incidentId={selectedIncident.id!} />} />
                <Route path="/map" element={<MapView incidentId={selectedIncident.id!} />} />
                <Route path="/photos" element={<OperationPhotosView incidentId={selectedIncident.id!} />} />
                <Route path="/logs" element={<LogsView incidentId={selectedIncident.id!} />} />
                <Route path="/meals" element={<MealsView incidentId={selectedIncident.id!} />} />
                <Route path="/resources" element={<ResourcesView incidentId={selectedIncident.id!} />} />
                <Route path="/reports" element={<ReportsView incidentId={selectedIncident.id!} />} />
                {user.role === 'admin' && (
                  <Route path="/users" element={<UsersView />} />
                )}
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
