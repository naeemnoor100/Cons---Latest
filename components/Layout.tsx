
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
  AlertCircle,
  MoreHorizontal,
  HardHat
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
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
      isActive 
        ? 'bg-[#003366] text-white shadow-lg' 
        : isSpecial 
          ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    <span className={isActive ? 'text-white' : ''}>{icon}</span>
    <span className="font-bold text-sm">{label}</span>
    {isActive && <ChevronRight className="ml-auto w-4 h-4 opacity-50" />}
  </button>
);

const MobileTabItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
      isActive ? 'text-[#003366] dark:text-white' : 'text-slate-400'
    }`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'scale-110' : ''}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase mt-0.5 tracking-tighter ${isActive ? 'opacity-100' : 'opacity-70'}`}>
      {label}
    </span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, syncId, isSyncing, syncError, undo, redo, canUndo, canRedo, theme } = useApp();
  const [showSyncCenter, setShowSyncCenter] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryMenuItems = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={18} strokeWidth={2.5} /> },
    { id: 'projects', label: 'Sites', icon: <Briefcase size={18} strokeWidth={2.5} /> },
    { id: 'labor', label: 'Labor', icon: <HardHat size={18} strokeWidth={2.5} /> },
    { id: 'materials', label: 'Stock', icon: <Package size={18} strokeWidth={2.5} /> },
    { id: 'expenses', label: 'Finance', icon: <Receipt size={18} strokeWidth={2.5} /> },
  ];

  const secondaryMenuItems = [
    { id: 'invoices', label: 'Invoices', icon: <FileText size={18} /> },
    { id: 'income', label: 'Revenue', icon: <ArrowUpCircle size={18} /> },
    { id: 'vendors', label: 'Suppliers', icon: <Users size={18} /> },
    { id: 'reports', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-slate-950 overflow-hidden`}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
        <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#FF5A00] p-1.5 rounded-lg text-white shadow-lg shadow-orange-200 dark:shadow-none"><Briefcase size={20} strokeWidth={3} /></div>
            <h1 className="text-lg font-black text-[#003366] dark:text-white tracking-tighter">BUILDTRACK<span className="text-[#FF5A00]">PRO</span></h1>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {[...primaryMenuItems, ...secondaryMenuItems].map((item) => (
            <SidebarItem key={item.id} {...item} isActive={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-xl object-cover border-2 border-slate-50 dark:border-slate-700" />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Universal App Header */}
        <header className="h-16 lg:h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-10 shrink-0 z-40 pt-safe">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
               <div className="bg-[#FF5A00] p-1.5 rounded-lg text-white"><Briefcase size={16} strokeWidth={3} /></div>
               <h1 className="text-sm font-black text-[#003366] dark:text-white tracking-tighter uppercase">BT<span className="text-[#FF5A00]">PRO</span></h1>
            </div>
            <div className="hidden lg:block">
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{primaryMenuItems.find(m => m.id === activeTab)?.label || secondaryMenuItems.find(m => m.id === activeTab)?.label || 'Console'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button onClick={undo} disabled={!canUndo} className="p-2 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-20 rounded-lg transition-all text-slate-500"><Undo2 size={16} /></button>
              <button onClick={redo} disabled={!canRedo} className="p-2 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-20 rounded-lg transition-all text-slate-500"><Redo2 size={16} /></button>
            </div>
            
            <button 
              onClick={() => setShowSyncCenter(true)} 
              className={`p-2 rounded-xl border transition-all relative flex items-center justify-center group ${
                syncError ? 'bg-rose-50 border-rose-200 text-rose-600' : isSyncing ? 'bg-blue-50 border-blue-200 text-blue-600' : syncId ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : syncError ? <AlertCircle size={18} /> : syncId ? <Cloud size={18} /> : <WifiOff size={18} />}
            </button>

            <button onClick={() => setActiveTab('settings')} className="hidden lg:flex p-2.5 text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-all">
              <SettingsIcon size={18} />
            </button>
            
            <button className="lg:hidden w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
               <img src={currentUser.avatar} className="w-full h-full object-cover" alt="User" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 lg:p-10 no-scrollbar pb-32 lg:pb-10">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-800/50 px-2 flex items-center justify-around h-[72px] pb-safe z-50">
          {primaryMenuItems.map(item => (
            <MobileTabItem 
              key={item.id} 
              {...item} 
              isActive={activeTab === item.id} 
              onClick={() => { setActiveTab(item.id); setShowMoreMenu(false); }} 
            />
          ))}
          <MobileTabItem 
            icon={<MoreHorizontal size={18} strokeWidth={2.5} />} 
            label="More" 
            isActive={showMoreMenu || secondaryMenuItems.some(m => m.id === activeTab)} 
            onClick={() => setShowMoreMenu(true)} 
          />
        </nav>

        {/* Mobile "More" Menu Overlay */}
        {showMoreMenu && (
          <div className="lg:hidden fixed inset-0 z-[100] animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowMoreMenu(false)}></div>
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl p-6 pb-12 animate-in slide-in-from-bottom duration-300">
               <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
               <div className="flex justify-between items-center mb-6 px-2">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Business Tools</h3>
                 <button onClick={() => setShowMoreMenu(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={18} /></button>
               </div>
               <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                  {secondaryMenuItems.map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => { setActiveTab(item.id); setShowMoreMenu(false); }}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={`p-4 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-[#003366] text-white shadow-xl' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                         {item.icon}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-tight text-center ${activeTab === item.id ? 'text-[#003366] dark:text-white' : 'text-slate-500'}`}>{item.label}</span>
                    </button>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>

      {showSyncCenter && <SyncCenter onClose={() => setShowSyncCenter(false)} />}
    </div>
  );
};
