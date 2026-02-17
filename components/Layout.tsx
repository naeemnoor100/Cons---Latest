import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Package, 
  Receipt, 
  BarChart3, 
  Settings as SettingsIcon, 
  Menu,
  X,
  ChevronRight,
  Sparkles,
  ArrowUpCircle,
  Cloud,
  RefreshCw,
  WifiOff,
  Undo2,
  Redo2,
  Check,
  Bot,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../AppContext';
import { SyncCenter } from './SyncCenter';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  isSpecial?: boolean;
}> = ({ icon, label, isActive, onClick, isSpecial }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 ${
      isActive 
        ? 'bg-[#003366] text-white shadow-md' 
        : isSpecial 
          ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    <span className={isActive ? 'text-white' : ''}>{icon}</span>
    <span className="font-semibold text-sm">{label}</span>
    {isActive && <ChevronRight className="ml-auto w-4 h-4 opacity-50" />}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, syncId, isSyncing, syncError, undo, redo, canUndo, canRedo, lastActionName, theme } = useApp();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showSyncCenter, setShowSyncCenter] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'projects', label: 'Projects', icon: <Briefcase size={18} /> },
    { id: 'invoices', label: 'Client Invoices', icon: <FileText size={18} /> },
    { id: 'income', label: 'Incomes', icon: <ArrowUpCircle size={18} /> },
    { id: 'vendors', label: 'Suppliers', icon: <Users size={18} /> },
    { id: 'materials', label: 'Inventory', icon: <Package size={18} /> },
    { id: 'expenses', label: 'Financials', icon: <Receipt size={18} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
  ];

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-slate-900 overflow-hidden`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#FF5A00] p-1.5 rounded text-white"><Briefcase size={20} /></div>
              <h1 className="text-lg font-black text-[#003366] dark:text-white tracking-tighter">BUILDTRACK<span className="text-[#FF5A00]">PRO</span></h1>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => (
              <SidebarItem key={item.id} {...item} isActive={activeTab === item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} />
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8 shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500 dark:text-slate-400" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
              {menuItems.find(m => m.id === activeTab)?.label || 'Settings'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button onClick={undo} disabled={!canUndo} title="Undo Action" className="p-1.5 hover:bg-white dark:hover:bg-slate-600 disabled:opacity-20 rounded transition-all text-slate-500"><Undo2 size={16} /></button>
              <button onClick={redo} disabled={!canRedo} title="Redo Action" className="p-1.5 hover:bg-white dark:hover:bg-slate-600 disabled:opacity-20 rounded transition-all text-slate-500"><Redo2 size={16} /></button>
            </div>
            
            {/* Database Sync Status Indicator */}
            <button 
              onClick={() => setShowSyncCenter(true)} 
              className={`p-2 rounded-lg border transition-all relative flex items-center justify-center group ${
                syncError 
                  ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' 
                  : isSyncing 
                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                    : syncId 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {isSyncing ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : syncError ? (
                <div className="relative">
                  {syncId ? <Cloud size={18} /> : <WifiOff size={18} />}
                  <AlertCircle size={10} className="absolute -top-1.5 -right-1.5 text-red-600 fill-white" />
                </div>
              ) : syncId ? (
                <Cloud size={18} />
              ) : (
                <WifiOff size={18} />
              )}
              
              {/* Tooltip for Error */}
              {syncError && (
                <div className="absolute top-full mt-2 right-0 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                  DATABASE SYNC FAILED
                </div>
              )}
            </button>

            <button onClick={() => setActiveTab('settings')} className="p-2 text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-50 transition-all"><SettingsIcon size={18} /></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F4F6F8] dark:bg-slate-900 p-4 lg:p-8 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {showSyncCenter && <SyncCenter onClose={() => setShowSyncCenter(false)} />}
    </div>
  );
};
