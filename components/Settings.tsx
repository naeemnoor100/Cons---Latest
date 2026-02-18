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
  Zap,
  Activity as HeartRate,
  Trash2
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
    projects, vendors, materials, expenses, incomes, invoices, payments, attendance,
    importState, forceSync
  } = useApp();
  
  const [activeSection, setActiveSection] = useState<'profile' | 'system' | 'master-lists' | 'database' | 'backup'>('profile');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dbInitStatus, setDbInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const [newTradeCat, setNewTradeCat] = useState('');
  const [profileData, setProfileData] = useState({
    name: currentUser.name,
    email: currentUser.email
  });

  // --- Backup & Recovery Actions ---
  const handleExportData = () => {
    const fullState: AppState = {
      projects, vendors, materials, expenses, payments, incomes, invoices, workers: [], // Workers added in newer turns
      attendance, tradeCategories, stockingUnits, siteStatuses, allowDecimalStock,
      currentUser, theme, syncId: 'BUILDMASTER_PRO_DATABASE_ACTIVE'
    };
    
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BuildMasterPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    jsonFileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImportStatus('loading');
        const content = event.target?.result as string;
        const newState = JSON.parse(content);
        
        // Basic validation
        if (!newState.projects || !newState.vendors) {
          throw new Error("Invalid backup file format.");
        }

        await importState(newState);
        setImportStatus('success');
        alert("Import Successful! Your project data has been restored and synced to the database.");
      } catch (err) {
        console.error(err);
        alert("Import Failed: Please ensure you are uploading a valid BuildMaster Pro backup file.");
      } finally {
        setImportStatus('idle');
        if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleResetApp = async () => {
    if (confirm("CRITICAL WARNING: This will delete all local and cloud data forever. Proceed?")) {
      await importState(INITIAL_STATE);
      alert("System Reset Complete.");
      window.location.reload();
    }
  };

  // --- Database Actions ---
  const handleTestConnection = async () => {
    setTestStatus('loading');
    try {
      const response = await fetch('api.php?action=test_connection');
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (data.success) {
        setTestStatus('success');
        alert("Success: The api.php file is reachable and running correctly.");
      } else {
        throw new Error(data.error || "Connection failed");
      }
    } catch (e) {
      console.error(e);
      setTestStatus('error');
      alert("Error: Link failed. Ensure api.php is uploaded to your server root and PHP is enabled.");
    } finally {
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const handleInitializeDb = async () => {
    setDbInitStatus('loading');
    try {
      const response = await fetch('api.php?action=initialize_db');
      const data = await response.json();
      if (data.success) {
        setDbInitStatus('success');
        alert("Success! All tables have been created in your MySQL database.");
        forceSync();
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
            
            {activeSection === 'backup' && (
              <div className="p-8 space-y-8">
                 <div className="bg-[#003366] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <History className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12" />
                    <div className="relative z-10">
                      <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Master Archive Management</h3>
                      <p className="text-xs text-white/60 font-bold uppercase tracking-widest leading-relaxed max-w-md">
                        Maintain physical backups of your construction business data. Export your current state as a portable JSON file or restore from a previous save.
                      </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <button 
                      onClick={handleExportData}
                      className="group p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] flex flex-col items-center gap-4 hover:border-blue-500 transition-all shadow-sm"
                    >
                       <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                          <DownloadCloud size={32} />
                       </div>
                       <div className="text-center">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Export Backup</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">SAVE CURRENT DATA AS .JSON</p>
                       </div>
                    </button>

                    <button 
                      onClick={handleImportClick}
                      className="group p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] flex flex-col items-center gap-4 hover:border-emerald-500 transition-all shadow-sm"
                    >
                       <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                          <UploadCloud size={32} />
                       </div>
                       <div className="text-center">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Import Data</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">RESTORE FROM FILE SYSTEM</p>
                       </div>
                       <input type="file" ref={jsonFileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
                    </button>
                 </div>

                 <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-[2rem] space-y-4">
                    <div className="flex items-center gap-3 text-rose-600">
                       <AlertTriangle size={20} />
                       <h4 className="text-xs font-black uppercase tracking-widest">Danger Zone</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                       Resetting BuildMaster Pro will permanently wipe all local cached data and clear the MySQL cloud tables for the current session. This action cannot be undone.
                    </p>
                    <button 
                      onClick={handleResetApp}
                      className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 dark:shadow-none"
                    >
                       <Trash2 size={14} /> Wipe All Hub Data
                    </button>
                 </div>
              </div>
            )}

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
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={handleTestConnection}
                      disabled={testStatus === 'loading'}
                      className="px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all bg-white/10 hover:bg-white/20 text-white"
                    >
                      <HeartRate size={14} className={testStatus === 'loading' ? 'animate-pulse' : ''} />
                      Test Link
                    </button>
                    <button 
                      onClick={handleInitializeDb}
                      disabled={dbInitStatus === 'loading'}
                      className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${
                        dbInitStatus === 'loading' ? 'bg-slate-700 text-slate-400' :
                        dbInitStatus === 'success' ? 'bg-emerald-500 text-white' :
                        'bg-white text-slate-900 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {dbInitStatus === 'loading' ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                      {dbInitStatus === 'loading' ? 'Processing...' : dbInitStatus === 'success' ? 'Setup Complete!' : 'Initialize DB'}
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex gap-4">
                   <div className="p-3 bg-blue-100 dark:bg-blue-800 text-blue-600 rounded-xl shrink-0">
                      <Terminal size={24} />
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Cloud Integration Guide</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        1. Update <code>api.php</code> with your database credentials.<br/>
                        2. Upload <code>api.php</code> to your hosting folder.<br/>
                        3. Click <strong>Test Link</strong> above to verify accessibility.<br/>
                        4. Click <strong>Initialize DB</strong> to create your construction tables.
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
                       Once initialized, all projects, expenses, vendors, and workers will be automatically saved into their respective SQL tables every time you make a change while Cloud Sync is active.
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
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${allowDecimalStock ? 'bg-emerald-50' : 'bg-slate-300 dark:bg-slate-600'}`}
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