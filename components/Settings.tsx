import React, { useState, useRef } from 'react';
import { 
  User, 
  Users,
  Building2, 
  Globe, 
  Save, 
  Plus, 
  X, 
  List, 
  Package, 
  Layers, 
  Activity, 
  Database, 
  Code2, 
  Terminal, 
  Scale, 
  Copy,
  DownloadCloud,
  UploadCloud,
  FileJson,
  FileSpreadsheet,
  ShieldCheck,
  Archive,
  AlertTriangle,
  FileUp,
  Server,
  RefreshCw,
  Check,
  Box,
  Layout,
  History,
  FileWarning,
  Zap
} from 'lucide-react';
import { useApp } from '../AppContext';
import { AppState, Vendor, Material } from '../types';
import { INITIAL_STATE } from '../constants';

export const Settings: React.FC = () => {
  const { 
    currentUser, updateUser, theme, setTheme, 
    tradeCategories, addTradeCategory, removeTradeCategory,
    stockingUnits, addStockingUnit, removeStockingUnit,
    siteStatuses, addSiteStatus, removeSiteStatus,
    allowDecimalStock, setAllowDecimalStock,
    projects, vendors, materials, expenses, incomes, invoices, payments,
    importState
  } = useApp();
  
  const [activeSection, setActiveSection] = useState<'profile' | 'system' | 'master-lists' | 'database' | 'backup'>('profile');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dbInitStatus, setDbInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isCopied, setIsCopied] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const [newTradeCat, setNewTradeCat] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newStatus, setNewStatus] = useState('');
  
  const [profileData, setProfileData] = useState({
    name: currentUser.name,
    email: currentUser.email
  });

  const handleInitializeDb = async () => {
    setDbInitStatus('loading');
    try {
      const response = await fetch('api.php?action=initialize_db');
      const data = await response.json();
      if (data.success) {
        setDbInitStatus('success');
        alert("Success! All tables have been created in your MySQL database.");
      } else {
        throw new Error(data.error || "Initialization failed");
      }
    } catch (e) {
      console.error(e);
      setDbInitStatus('error');
      alert("Error: Connection failed. Please check your api.php database credentials.");
    } finally {
      setTimeout(() => setDbInitStatus('idle'), 5000);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    updateUser({ ...currentUser, name: profileData.name, email: profileData.email });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Settings & Environment</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure your MySQL database persistence and company profile.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 space-y-1">
          <button onClick={() => setActiveSection('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'profile' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <User size={18} /> <span className="text-sm font-bold">Personal Profile</span>
          </button>
          <button onClick={() => setActiveSection('database')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'database' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <Server size={18} /> <span className="text-sm font-bold">MySQL Database</span>
          </button>
          <button onClick={() => setActiveSection('master-lists')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'master-lists' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <List size={18} /> <span className="text-sm font-bold">Master Lists</span>
          </button>
          <button onClick={() => setActiveSection('backup')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'backup' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <History size={18} /> <span className="text-sm font-bold">Backup & Recovery</span>
          </button>
          <button onClick={() => setActiveSection('system')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'system' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <Globe size={18} /> <span className="text-sm font-bold">Theme & UI</span>
          </button>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
            
            {activeSection === 'database' && (
              <div className="p-8 space-y-8">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
                  <div className="flex gap-4 items-center">
                    <div className="p-4 bg-white/10 rounded-2xl"><Database size={24} /></div>
                    <div>
                      <h3 className="text-lg font-bold uppercase tracking-tighter leading-none">MySQL Multi-Table Setup</h3>
                      <p className="text-[10px] font-bold text-white/60 mt-1 uppercase tracking-widest">Automatic Schema Deployment</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleInitializeDb}
                    disabled={dbInitStatus === 'loading'}
                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${
                      dbInitStatus === 'loading' ? 'bg-slate-700 text-slate-400' :
                      dbInitStatus === 'success' ? 'bg-emerald-500 text-white' :
                      'bg-white text-slate-900 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {dbInitStatus === 'loading' ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                    {dbInitStatus === 'loading' ? 'Processing...' : dbInitStatus === 'success' ? 'Setup Complete!' : 'Initialize Database'}
                  </button>
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex gap-4">
                   <div className="p-3 bg-blue-100 dark:bg-blue-800 text-blue-600 rounded-xl shrink-0">
                      <Terminal size={24} />
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">One-Click Setup</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        پہلے <code>api.php</code> فائل میں اپنے ڈیٹا بیس کا نام، یوزر نیم اور پاس ورڈ لکھیں، پھر اوپر موجود <strong>Initialize Database</strong> بٹن کو دبائیں۔ یہ ایپ خودکار طریقے سے تمام ٹیبلز بنا دے گی۔
                      </p>
                   </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Code2 size={20} />
                    <h4 className="font-black text-sm uppercase">Automatic Syncing</h4>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex gap-3">
                     <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                     <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                       Once initialized, all projects, expenses, vendors, and workers will be automatically saved into their respective SQL tables.
                     </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'profile' && (
              <div className="p-8">
                <div className="flex items-center gap-6 mb-8">
                  <img src={currentUser.avatar} alt="Profile" className="w-20 h-20 rounded-[2rem] object-cover border-4 border-slate-100 dark:border-slate-700 shadow-sm" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{currentUser.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{currentUser.role} Account</p>
                  </div>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 px-1">Display Name</label>
                      <input type="text" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl font-bold dark:text-white outline-none" value={profileData.name} onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 px-1">Email Address</label>
                      <input type="email" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl font-bold dark:text-white outline-none" value={profileData.email} onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <button type="submit" className={`w-full flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold transition-all bg-[#003366] text-white hover:bg-slate-900 shadow-lg`}>
                    <Save size={18} /> Update Profile
                  </button>
                </form>
              </div>
            )}

            {activeSection === 'master-lists' && (
              <div className="p-8 space-y-12">
                <div className="space-y-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/20">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#003366] text-white rounded-2xl">
                           <Scale size={20} />
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight leading-none">High Precision</h3>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">ENABLE DECIMAL QUANTITY SUPPORT</p>
                        </div>
                     </div>
                     <button 
                      onClick={() => setAllowDecimalStock(!allowDecimalStock)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${allowDecimalStock ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                     >
                       <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${allowDecimalStock ? 'translate-x-6' : 'translate-x-1'}`} />
                     </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest">
                      <Layers size={18} className="text-blue-500" /> Expense / Trade Categories
                    </h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. Electrical, Plumbing..." 
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none dark:text-white"
                        value={newTradeCat}
                        onChange={e => setNewTradeCat(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && newTradeCat && (addTradeCategory(newTradeCat), setNewTradeCat(''))}
                      />
                      <button onClick={() => { if(newTradeCat) { addTradeCategory(newTradeCat); setNewTradeCat(''); } }} className="p-3 bg-[#003366] text-white rounded-xl hover:bg-slate-900 transition-colors"><Plus size={20} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 min-h-[60px]">
                      {tradeCategories.map(cat => (
                        <span key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest dark:text-slate-300 shadow-sm">
                          {cat} <X size={10} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeTradeCategory(cat)} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'system' && (
               <div className="p-8 space-y-6">
                 <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Visual Theme</h4>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">APP-WIDE APPEARANCE PREFERENCE</p>
                    </div>
                    <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                       <button onClick={() => setTheme('light')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${theme === 'light' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-400'}`}>Light</button>
                       <button onClick={() => setTheme('dark')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${theme === 'dark' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-400'}`}>Dark</button>
                    </div>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};