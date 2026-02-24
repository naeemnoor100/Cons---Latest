import React, { useState, useRef } from 'react';
import { 
  User, 
  Globe, 
  Save, 
  Plus, 
  X, 
  List, 
  Package, 
  Layers, 
  Activity, 
  Database, 
  Scale, 
  DownloadCloud,
  UploadCloud,
  Server,
  History,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../AppContext';
import { AppState } from '../types';
import { INITIAL_STATE } from '../constants';

export const Settings: React.FC = () => {
  const { 
    currentUser, updateUser, theme, setTheme, 
    tradeCategories, addTradeCategory, removeTradeCategory,
    stockingUnits, addStockingUnit, removeStockingUnit,
    siteStatuses, addSiteStatus, removeSiteStatus,
    allowDecimalStock, setAllowDecimalStock,
    projects, vendors, materials, expenses, incomes, invoices, payments,
    employees, laborLogs, laborPayments,
    importState, forceSync
  } = useApp();
  
  const [activeSection, setActiveSection] = useState<'profile' | 'system' | 'master-lists' | 'database' | 'backup'>('profile');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dbInitStatus, setDbInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  
  // To avoid unused var errors
  console.log(saveStatus, dbInitStatus, testStatus, importStatus);
  
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const [newTradeCat, setNewTradeCat] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const [profileData, setProfileData] = useState({
    name: currentUser.name,
    email: currentUser.email
  });

  const handleExportData = () => {
    const fullState: AppState = {
      projects, vendors, materials, expenses, payments, incomes, invoices,
      employees, laborLogs, laborPayments,
      tradeCategories, stockingUnits, siteStatuses, allowDecimalStock,
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
        
        if (!newState.projects || !newState.vendors) {
          throw new Error("Invalid backup file format.");
        }

        await importState(newState);
        setImportStatus('success');
        alert("Import Successful!");
      } catch (err) {
        console.error(err);
        alert("Import Failed.");
      } finally {
        setImportStatus('idle');
        if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleResetApp = async () => {
    if (confirm("CRITICAL WARNING: This will delete all data forever. Proceed?")) {
      await importState(INITIAL_STATE);
      window.location.reload();
    }
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const addSheet = (data: unknown[], name: string) => {
      if (data && data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
      }
    };

    addSheet(projects, 'Projects');
    addSheet(vendors, 'Vendors');
    addSheet(materials, 'Materials');
    addSheet(expenses, 'Expenses');
    addSheet(incomes, 'Incomes');
    addSheet(invoices, 'Invoices');
    addSheet(payments, 'Payments');
    addSheet(employees, 'Employees');
    addSheet(laborLogs, 'LaborLogs');
    addSheet(laborPayments, 'LaborPayments');

    if (wb.SheetNames.length === 0) {
      const ws = XLSX.utils.json_to_sheet([{ Message: "No data available" }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Empty');
    }

    XLSX.writeFile(wb, `buildtrack_pro_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleTestConnection = async () => {
    setTestStatus('loading');
    try {
      const response = await fetch('/api.php?action=test_connection');
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (data.success) {
        setTestStatus('success');
        alert("Success: Bridge Reachable.");
      } else {
        throw new Error(data.error || "Connection failed");
      }
    } catch (e) {
      console.error(e);
      setTestStatus('error');
      alert("Error: Link failed.");
    } finally {
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const handleInitializeDb = async () => {
    setDbInitStatus('loading');
    try {
      const response = await fetch('/api.php?action=initialize_db');
      const data = await response.json();
      if (data.success) {
        setDbInitStatus('success');
        alert("Success! Tables created.");
        forceSync();
      } else {
        throw new Error(data.error || "Initialization failed");
      }
    } catch (e) {
      console.error(e);
      setDbInitStatus('error');
      alert("Error: Schema Init Failed.");
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
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure database persistence and master data.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
        <aside className="w-full md:w-64 flex md:flex-col gap-1 overflow-x-auto no-scrollbar shrink-0 pb-2 md:pb-0 border-b md:border-b-0 border-slate-100 dark:border-slate-800">
          <button onClick={() => setActiveSection('profile')} className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${activeSection === 'profile' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <User size={18} /> <span className="text-xs sm:text-sm font-bold">Profile</span>
          </button>
          <button onClick={() => setActiveSection('database')} className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${activeSection === 'database' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <Server size={18} /> <span className="text-xs sm:text-sm font-bold">Database</span>
          </button>
          <button onClick={() => setActiveSection('master-lists')} className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${activeSection === 'master-lists' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <List size={18} /> <span className="text-xs sm:text-sm font-bold">Master Lists</span>
          </button>
          <button onClick={() => setActiveSection('backup')} className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${activeSection === 'backup' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <History size={18} /> <span className="text-xs sm:text-sm font-bold">Backup</span>
          </button>
          <button onClick={() => setActiveSection('system')} className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${activeSection === 'system' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
            <Globe size={18} /> <span className="text-xs sm:text-sm font-bold">Theme</span>
          </button>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px]">
            
            {activeSection === 'master-lists' && (
              <div className="p-8 space-y-12 animate-in fade-in duration-300">
                <div className="space-y-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/20">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#003366] text-white rounded-2xl"><Scale size={20} /></div>
                        <div>
                           <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">Precision Stock</h3>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Decimal Support</p>
                        </div>
                     </div>
                     <button 
                      onClick={() => setAllowDecimalStock(!allowDecimalStock)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${allowDecimalStock ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                     >
                       <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${allowDecimalStock ? 'translate-x-6' : 'translate-x-1'}`} />
                     </button>
                   </div>
                </div>

                <div className="space-y-10">
                  {/* Trade Categories */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest">
                      <Layers size={18} className="text-blue-500" /> Expense Categories
                    </h3>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Add Category..." className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-xs font-bold dark:text-white outline-none" value={newTradeCat} onChange={e => setNewTradeCat(e.target.value)} onKeyPress={e => e.key === 'Enter' && newTradeCat && (addTradeCategory(newTradeCat), setNewTradeCat(''))} />
                      <button onClick={() => { if(newTradeCat) { addTradeCategory(newTradeCat); setNewTradeCat(''); } }} className="p-3 bg-[#003366] text-white rounded-xl active:scale-90 transition-transform"><Plus size={20} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                      {tradeCategories.map(cat => (
                        <span key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest dark:text-slate-300 shadow-sm transition-all hover:border-blue-500 group">
                          {cat} <X size={10} className="cursor-pointer text-slate-400 group-hover:text-red-500" onClick={() => removeTradeCategory(cat)} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stocking Units */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest">
                      <Package size={18} className="text-emerald-500" /> Stocking Units
                    </h3>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Add Unit (e.g. Ton)..." className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-xs font-bold dark:text-white outline-none" value={newUnit} onChange={e => setNewUnit(e.target.value)} onKeyPress={e => e.key === 'Enter' && newUnit && (addStockingUnit(newUnit), setNewUnit(''))} />
                      <button onClick={() => { if(newUnit) { addStockingUnit(newUnit); setNewUnit(''); } }} className="p-3 bg-emerald-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={20} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                      {stockingUnits.map(unit => (
                        <span key={unit} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest dark:text-slate-300 shadow-sm transition-all hover:border-emerald-500 group">
                          {unit} <X size={10} className="cursor-pointer text-slate-400 group-hover:text-red-500" onClick={() => removeStockingUnit(unit)} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Site Statuses */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest">
                      <Activity size={18} className="text-amber-500" /> Project Statuses
                    </h3>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Add Status (e.g. Planning)..." className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-xs font-bold dark:text-white outline-none" value={newStatus} onChange={e => setNewStatus(e.target.value)} onKeyPress={e => e.key === 'Enter' && newStatus && (addSiteStatus(newStatus), setNewStatus(''))} />
                      <button onClick={() => { if(newStatus) { addSiteStatus(newStatus); setNewStatus(''); } }} className="p-3 bg-amber-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={20} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                      {siteStatuses.map(status => (
                        <span key={status} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest dark:text-slate-300 shadow-sm transition-all hover:border-amber-500 group">
                          {status} <X size={10} className="cursor-pointer text-slate-400 group-hover:text-red-500" onClick={() => removeSiteStatus(status)} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'profile' && (
              <div className="p-8 animate-in fade-in duration-300">
                <div className="flex items-center gap-6 mb-8">
                  <img src={currentUser.avatar} alt="Profile" className="w-20 h-20 rounded-[2rem] object-cover border-4 border-slate-100 dark:border-slate-700 shadow-sm" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{currentUser.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{currentUser.role}</p>
                  </div>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 px-1">Name</label>
                      <input type="text" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={profileData.name} onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 px-1">Email</label>
                      <input type="email" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={profileData.email} onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <button type="submit" className="w-full flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold bg-[#003366] text-white shadow-lg active:scale-95 transition-all">
                    <Save size={18} /> Update Profile
                  </button>
                </form>
              </div>
            )}

            {activeSection === 'database' && (
              <div className="p-8 space-y-8 animate-in fade-in duration-300">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
                  <div className="flex gap-4 items-center">
                    <div className="p-4 bg-white/10 rounded-2xl"><Database size={24} /></div>
                    <div>
                      <h3 className="text-lg font-bold uppercase tracking-tighter leading-none">MySQL Bridge</h3>
                      <p className="text-[10px] font-bold text-white/60 mt-1 uppercase tracking-widest">Automatic Sync</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleTestConnection} className="px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all">Test Connection</button>
                    <button onClick={handleInitializeDb} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 bg-white text-slate-900 hover:bg-white/90 transition-all">Initialize DB</button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'backup' && (
              <div className="p-8 space-y-8 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <button onClick={handleExportData} className="group p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-[2rem] flex flex-col items-center gap-4 hover:border-blue-500 transition-all">
                       <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><DownloadCloud size={32} /></div>
                       <div className="text-center">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Export .JSON</h4>
                       </div>
                    </button>
                    <button onClick={handleExportExcel} className="group p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-[2rem] flex flex-col items-center gap-4 hover:border-emerald-500 transition-all">
                       <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><FileSpreadsheet size={32} /></div>
                       <div className="text-center">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Export .XLSX</h4>
                       </div>
                    </button>
                    <button onClick={handleImportClick} className="group p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-[2rem] flex flex-col items-center gap-4 hover:border-amber-500 transition-all">
                       <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><UploadCloud size={32} /></div>
                       <div className="text-center">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Import .JSON</h4>
                       </div>
                       <input type="file" ref={jsonFileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
                    </button>
                 </div>
                 <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 rounded-[2rem] space-y-4">
                    <h4 className="text-xs font-black uppercase text-rose-600">Danger Zone</h4>
                    <button onClick={handleResetApp} className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all">Wipe All Data</button>
                 </div>
              </div>
            )}

            {activeSection === 'system' && (
               <div className="p-8 space-y-6 animate-in fade-in duration-300">
                 <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-200">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Theme</h4>
                    </div>
                    <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100">
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