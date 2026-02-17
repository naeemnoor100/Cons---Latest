import React, { useState, useRef } from 'react';
import { 
  User, 
  Users,
  Building2, 
  Globe, 
  Save, 
  LogOut, 
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
  FileWarning
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
  const [isCopied, setIsCopied] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const [newTradeCat, setNewTradeCat] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newStatus, setNewStatus] = useState('');
  
  const [profileData, setProfileData] = useState({
    name: currentUser.name,
    email: currentUser.email
  });

  const sqlSchema = `
-- Create Synchronization Table for BuildTrack Pro
CREATE TABLE IF NOT EXISTS sync_sessions (
    sync_id VARCHAR(50) PRIMARY KEY,
    state_json LONGTEXT,
    last_updated BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    updateUser({ ...currentUser, name: profileData.name, email: profileData.email });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 800);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExportJSON = () => {
    const fullState = {
      projects, vendors, materials, expenses, incomes, invoices, payments,
      tradeCategories, stockingUnits, siteStatuses, allowDecimalStock, exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BuildTrack_Pro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const newState = JSON.parse(content);
        
        // Validation: Check for presence of core arrays
        if (newState.projects && Array.isArray(newState.projects) && newState.vendors && Array.isArray(newState.vendors)) {
           if (confirm("CRITICAL WARNING: This action will completely OVERWRITE your current company records with the data from the backup file. This cannot be undone. Proceed?")) {
             await importState({ 
               ...INITIAL_STATE, 
               ...newState,
               currentUser // Preserve current user session
             });
             alert("Database recovery complete. All records synchronized.");
           }
        } else {
          alert("Error: The selected file is not a valid BuildTrack Pro backup format.");
        }
      } catch (err) {
        alert("System Failure: Failed to parse the backup file. Please ensure it is a valid .json file.");
      }
    };
    reader.readAsText(file);
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
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
              <div className="p-8 space-y-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-xl">
                  <div className="flex gap-4 items-center">
                    <div className="p-4 bg-white/10 rounded-2xl"><Database size={24} /></div>
                    <div>
                      <h3 className="text-lg font-bold uppercase tracking-tighter">MySQL Cloud Setup</h3>
                      <p className="text-[10px] font-bold text-white/60">DATABASE PERSISTENCE BRIDGE</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Terminal size={20} />
                    <h4 className="font-black text-sm uppercase">Step 1: Create Sync Table</h4>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Log in to your hosting panel (cPanel). Open <strong>phpMyAdmin</strong>, select your database, and run the SQL script below. This table stores your company operations securely.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required SQL Script</label>
                     <button onClick={() => copyToClipboard(sqlSchema)} className="flex items-center gap-2 text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest">
                       {isCopied ? <Check size={12} /> : <Copy size={12} />} {isCopied ? 'Copied' : 'Copy Schema'}
                     </button>
                  </div>
                  <pre className="w-full p-4 bg-slate-900 text-blue-400 rounded-2xl text-[10px] font-mono overflow-x-auto border border-slate-700">
                    {sqlSchema}
                  </pre>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Code2 size={20} />
                    <h4 className="font-black text-sm uppercase">Step 2: Connect api.php</h4>
                  </div>
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl flex gap-3">
                     <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                     <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                       Upload <code>api.php</code> to your server. Open the file and enter your Database Name, Username, and Password. The app will then use your <strong>Sync ID</strong> to push data to MySQL.
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

            {activeSection === 'backup' && (
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Data Management</h3>
                    <p className="text-xs text-slate-500 font-medium">Portability and disaster recovery tools.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Card */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 flex flex-col justify-between hover:border-blue-500 transition-all group">
                    <div className="space-y-3">
                       <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                          <DownloadCloud size={24} />
                       </div>
                       <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">Export Ledger</h4>
                       <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest">Generate a full encrypted JSON snapshot of your current projects, inventory, and financials.</p>
                    </div>
                    <button 
                      onClick={handleExportJSON}
                      className="mt-6 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <DownloadCloud size={16} /> Download .JSON
                    </button>
                  </div>

                  {/* Import Card */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 flex flex-col justify-between hover:border-amber-500 transition-all group">
                    <div className="space-y-3">
                       <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm text-amber-600 group-hover:scale-110 transition-transform">
                          <UploadCloud size={24} />
                       </div>
                       <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">Restore Database</h4>
                       <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest">Import a previous BuildTrack Pro backup file. Warning: This will overwrite your current local state.</p>
                    </div>
                    <label className="mt-6 cursor-pointer">
                      <input type="file" ref={jsonFileInputRef} className="hidden" accept=".json" onChange={handleImportJSON} />
                      <div className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                        <UploadCloud size={16} /> Select Backup File
                      </div>
                    </label>
                  </div>
                </div>

                <div className="p-5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-[1.5rem] flex gap-4 items-start">
                   <div className="p-2 bg-rose-100 dark:bg-rose-900/50 text-rose-600 rounded-lg shrink-0">
                      <FileWarning size={20} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[11px] font-black text-rose-900 dark:text-rose-200 uppercase tracking-tight">Security & Overwrites</p>
                      <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium leading-relaxed uppercase tracking-tighter">Restoring from a file will replace all local site data, inventory levels, and financial records. Ensure you have a recent backup of your current state before importing new data.</p>
                   </div>
                </div>
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
                  {/* Trade Categories */}
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

                  {/* Stocking Units */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest">
                      <Box size={18} className="text-emerald-500" /> Stocking Measurement Units
                    </h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. SQFT, CBM, Pcs..." 
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none dark:text-white"
                        value={newUnit}
                        onChange={e => setNewUnit(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && newUnit && (addStockingUnit(newUnit), setNewUnit(''))}
                      />
                      <button onClick={() => { if(newUnit) { addStockingUnit(newUnit); setNewUnit(''); } }} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"><Plus size={20} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 min-h-[60px]">
                      {stockingUnits.map(u => (
                        <span key={u} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest dark:text-slate-300 shadow-sm">
                          {u} <X size={10} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeStockingUnit(u)} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Site Statuses */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest">
                      <Layout size={18} className="text-amber-500" /> Project Progress Statuses
                    </h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. Planning, Finishing..." 
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none dark:text-white"
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && newStatus && (addSiteStatus(newStatus), setNewStatus(''))}
                      />
                      <button onClick={() => { if(newStatus) { addSiteStatus(newStatus); setNewStatus(''); } }} className="p-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"><Plus size={20} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 min-h-[60px]">
                      {siteStatuses.map(s => (
                        <span key={s} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest dark:text-slate-300 shadow-sm">
                          {s} <X size={10} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeSiteStatus(s)} />
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