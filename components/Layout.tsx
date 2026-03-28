
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
  HelpCircle,
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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
      isActive 
        ? 'bg-vibrant-gradient text-white shadow-lg vibrant-shadow scale-[1.02]' 
        : isSpecial 
          ? 'text-brand-secondary hover:bg-brand-secondary/10'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-primary'
    } ${isCollapsed ? 'justify-center px-2' : ''}`}
    title={isCollapsed ? label : ''}
  >
    <span className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>{icon}</span>
    {!isCollapsed && <span className="font-bold text-sm whitespace-nowrap overflow-hidden font-display">{label}</span>}
    {isActive && !isCollapsed && <motion.div layoutId="active-indicator" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
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
    className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 relative ${
      isActive ? 'text-brand-primary dark:text-brand-secondary' : 'text-slate-400'
    }`}
  >
    {isActive && (
      <motion.div 
        layoutId="mobile-active-bg"
        className="absolute inset-x-2 inset-y-2 bg-brand-primary/10 dark:bg-brand-secondary/10 rounded-2xl -z-10"
      />
    )}
    <div className={`p-1 transition-all duration-300 ${isActive ? 'scale-125 -translate-y-1' : ''}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 22, strokeWidth: isActive ? 2.5 : 2 })}
    </div>
    <span className={`text-[9px] font-black uppercase mt-0.5 tracking-tighter font-display ${isActive ? 'opacity-100' : 'opacity-70'}`}>
      {label}
    </span>
  </button>
);

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isExternal?: boolean;
  url?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { syncId, isSyncing, syncError, undo, redo, canUndo, canRedo, theme } = useApp();
  const [showSyncCenter, setShowSyncCenter] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const primaryMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={18} strokeWidth={2.5} /> },
    { id: 'projects', label: 'Sites', icon: <Briefcase size={18} strokeWidth={2.5} /> },
    { id: 'labor', label: 'Labor', icon: <HardHat size={18} strokeWidth={2.5} /> },
    { id: 'materials', label: 'Stock', icon: <Package size={18} strokeWidth={2.5} /> },
    { id: 'expenses', label: 'Finance', icon: <Receipt size={18} strokeWidth={2.5} /> },
  ];

  const secondaryMenuItems: MenuItem[] = [
    { id: 'invoices', label: 'Invoices', icon: <FileText size={18} /> },
    { id: 'income', label: 'Revenue', icon: <ArrowUpCircle size={18} /> },
    { id: 'vendors', label: 'Suppliers', icon: <Users size={18} /> },
    { id: 'payments', label: 'Payments', icon: <DollarSign size={18} /> },
    { id: 'reports', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'help', label: 'Help Guide', icon: <HelpCircle size={18} />, isExternal: true, url: 'USER_GUIDE.html' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  const allowedTabs = primaryMenuItems.map(m => m.id).concat(secondaryMenuItems.map(m => m.id));
  
  const filteredPrimaryMenuItems = primaryMenuItems.filter(item => allowedTabs.includes(item.id));
  const filteredSecondaryMenuItems = secondaryMenuItems.filter(item => allowedTabs.includes(item.id));

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-slate-950 overflow-hidden font-inter`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col ${isCollapsed ? 'w-20' : 'w-72'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 relative`}>
        <div className="h-24 flex items-center px-8 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="bg-vibrant-gradient p-2 rounded-2xl text-white shadow-lg vibrant-shadow float shrink-0">
              <Briefcase size={24} strokeWidth={3} />
            </div>
            {!isCollapsed && (
              <h1 className="text-xl font-black tracking-tighter whitespace-nowrap font-display">
                <span className="text-brand-primary">BUILD</span>
                <span className="text-brand-secondary">TRACK</span>
                <span className="text-slate-400 ml-1">PRO</span>
              </h1>
            )}
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
              onClick={() => {
                if (item.isExternal) {
                  window.open(item.url, '_blank');
                } else {
                  setActiveTab(item.id);
                }
              }} 
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Universal App Header */}
        <header className="h-16 lg:h-24 glass border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-4 lg:px-12 shrink-0 z-40 pt-safe">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-3">
               <button 
                 onClick={() => setShowMobileSidebar(true)}
                 className="p-2.5 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-brand-primary/10 rounded-2xl transition-colors"
               >
                 <Menu size={22} strokeWidth={2.5} />
               </button>
               <div className="flex items-center gap-2">
                 <div className="bg-vibrant-gradient p-1.5 rounded-xl text-white shadow-md"><Briefcase size={18} strokeWidth={3} /></div>
                 <h1 className="text-base font-black tracking-tighter uppercase font-display">
                   <span className="text-brand-primary">BT</span>
                   <span className="text-brand-secondary">PRO</span>
                 </h1>
               </div>
            </div>
            <div className="hidden lg:block">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] font-display">{primaryMenuItems.find(m => m.id === activeTab)?.label || secondaryMenuItems.find(m => m.id === activeTab)?.label || 'Console'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex items-center bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200/50 dark:border-slate-700/50">
              <button onClick={undo} disabled={!canUndo} className="p-2.5 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-20 rounded-xl transition-all text-slate-500 hover:text-brand-primary"><Undo2 size={18} /></button>
              <button onClick={redo} disabled={!canRedo} className="p-2.5 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-20 rounded-xl transition-all text-slate-500 hover:text-brand-primary"><Redo2 size={18} /></button>
            </div>
            
            <button 
              onClick={() => setShowSyncCenter(true)} 
              className={`p-2.5 rounded-2xl border transition-all relative flex items-center justify-center group shadow-sm ${
                syncError ? 'bg-rose-50 border-rose-200 text-rose-600' : isSyncing ? 'bg-blue-50 border-blue-200 text-blue-600' : syncId ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100/50 border-slate-200/50 text-slate-400'
              }`}
            >
              {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : syncError ? <AlertCircle size={20} /> : syncId ? <Cloud size={20} /> : <WifiOff size={20} />}
            </button>

            {allowedTabs.includes('settings') && (
              <button onClick={() => setActiveTab('settings')} className="p-2.5 sm:p-3 text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md hover:scale-105 transition-all">
                <SettingsIcon size={20} />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-12 pb-32 lg:pb-12 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-4 left-4 right-4 glass rounded-[2.5rem] px-4 flex items-center justify-around h-[76px] shadow-2xl z-50 border border-white/20">
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
                        if (item.isExternal) {
                          window.open(item.url, '_blank');
                        } else {
                          setActiveTab(item.id);
                        }
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
                    {filteredSecondaryMenuItems.map((item) => (
                      <button 
                        key={item.id} 
                        onClick={() => { 
                          if (item.isExternal) {
                            window.open(item.url, '_blank');
                          } else {
                            setActiveTab(item.id);
                          }
                          setShowMoreMenu(false); 
                        }}
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
