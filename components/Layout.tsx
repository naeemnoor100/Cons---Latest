
import React, { useState } from 'react';
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
  ChevronLeft,
  ArrowUpCircle,
  Cloud,
  RefreshCw,
  WifiOff,
  Undo2,
  Redo2,
  FileText,
  AlertCircle,
  MoreHorizontal,
  HardHat,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  isCollapsed?: boolean;
}> = ({ icon, label, isActive, onClick, isSpecial, isCollapsed }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
      isActive 
        ? 'bg-[#003366] text-white shadow-lg' 
        : isSpecial 
          ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    } ${isCollapsed ? 'justify-center px-2' : ''}`}
    title={isCollapsed ? label : ''}
  >
    <span className={`shrink-0 ${isActive ? 'text-white' : ''}`}>{icon}</span>
    {!isCollapsed && <span className="font-bold text-sm whitespace-nowrap overflow-hidden">{label}</span>}
    {isActive && !isCollapsed && <ChevronRight className="ml-auto w-4 h-4 opacity-50 shrink-0" />}
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
    className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${
      isActive ? 'text-[#003366] dark:text-white' : 'text-slate-400'
    }`}
  >
    <div className={`p-1 rounded-xl transition-all ${isActive ? 'scale-110' : ''}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    </div>
    <span className={`text-[8px] font-black uppercase mt-0.5 tracking-tighter ${isActive ? 'opacity-100' : 'opacity-70'}`}>
      {label}
    </span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { syncId, isSyncing, syncError, undo, redo, canUndo, canRedo, theme } = useApp();
  const [showSyncCenter, setShowSyncCenter] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    { id: 'payments', label: 'Payments', icon: <DollarSign size={18} /> },
    { id: 'reports', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  const allowedTabs = primaryMenuItems.map(m => m.id).concat(secondaryMenuItems.map(m => m.id));
  
  const filteredPrimaryMenuItems = primaryMenuItems.filter(item => allowedTabs.includes(item.id));
  const filteredSecondaryMenuItems = secondaryMenuItems.filter(item => allowedTabs.includes(item.id));

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-slate-950 overflow-hidden`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 relative`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#FF5A00] p-1.5 rounded-lg text-white shadow-lg shadow-orange-200 dark:shadow-none shrink-0"><Briefcase size={20} strokeWidth={3} /></div>
            {!isCollapsed && <h1 className="text-lg font-black text-[#003366] dark:text-white tracking-tighter whitespace-nowrap">BUILDTRACK<span className="text-[#FF5A00]">PRO</span></h1>}
          </div>
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-sm z-10 transition-all"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {[...filteredPrimaryMenuItems, ...filteredSecondaryMenuItems].map((item) => (
            <SidebarItem 
              key={item.id} 
              {...item} 
              isActive={activeTab === item.id} 
              onClick={() => setActiveTab(item.id)} 
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Universal App Header */}
        <header className="h-16 lg:h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-10 shrink-0 z-40 pt-safe">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-3">
               <button 
                 onClick={() => setShowMobileSidebar(true)}
                 className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
               >
                 <Menu size={20} strokeWidth={2.5} />
               </button>
               <div className="flex items-center gap-2">
                 <div className="bg-[#FF5A00] p-1.5 rounded-lg text-white"><Briefcase size={16} strokeWidth={3} /></div>
                 <h1 className="text-sm font-black text-[#003366] dark:text-white tracking-tighter uppercase">BT<span className="text-[#FF5A00]">PRO</span></h1>
               </div>
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

            {allowedTabs.includes('settings') && (
              <button onClick={() => setActiveTab('settings')} className="p-2.5 text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-all">
                <SettingsIcon size={18} />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 lg:p-10 pb-32 lg:pb-10 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-800/50 px-2 flex items-center justify-around h-[72px] pb-safe z-50">
          {filteredPrimaryMenuItems.map(item => (
            <MobileTabItem 
              key={item.id} 
              {...item} 
              isActive={activeTab === item.id} 
              onClick={() => { setActiveTab(item.id); setShowMoreMenu(false); }} 
            />
          ))}
          {filteredSecondaryMenuItems.length > 0 && (
            <MobileTabItem 
              icon={<MoreHorizontal size={18} strokeWidth={2.5} />} 
              label="More" 
              isActive={showMoreMenu || filteredSecondaryMenuItems.some(m => m.id === activeTab)} 
              onClick={() => setShowMoreMenu(true)} 
            />
          )}
        </nav>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {showMobileSidebar && (
            <div className="lg:hidden fixed inset-0 z-[150]">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                onClick={() => setShowMobileSidebar(false)}
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
              >
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-[#FF5A00] p-1.5 rounded-lg text-white"><Briefcase size={18} strokeWidth={3} /></div>
                    <h1 className="text-base font-black text-[#003366] dark:text-white tracking-tighter">BT<span className="text-[#FF5A00]">PRO</span></h1>
                  </div>
                  <button 
                    onClick={() => setShowMobileSidebar(false)}
                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
                  {[...filteredPrimaryMenuItems, ...filteredSecondaryMenuItems].map((item) => (
                    <SidebarItem 
                      key={item.id} 
                      {...item} 
                      isActive={activeTab === item.id} 
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMobileSidebar(false);
                      }} 
                    />
                  ))}
                </nav>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mobile "More" Menu Overlay */}
        <AnimatePresence>
          {showMoreMenu && (
            <div className="lg:hidden fixed inset-0 z-[100]">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                onClick={() => setShowMoreMenu(false)}
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl p-6 pb-12"
              >
                 <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                 <div className="flex justify-between items-center mb-6 px-2">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Business Tools</h3>
                   <button onClick={() => setShowMoreMenu(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={18} /></button>
                 </div>
                 <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                    {filteredSecondaryMenuItems.map(item => (
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {showSyncCenter && <SyncCenter onClose={() => setShowSyncCenter(false)} />}
    </div>
  );
};
