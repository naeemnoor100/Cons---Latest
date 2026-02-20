import React from 'react';
import { 
  Cloud, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  ShieldCheck, 
  X,
  Zap,
  Globe,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../AppContext';

export const SyncCenter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const state = useApp();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-lg transition-all duration-500 bg-emerald-600 shadow-emerald-100 dark:shadow-none`}>
              <Cloud size={24} className={`text-white ${state.isSyncing ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Database Engine</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Enterprise Cloud Sync</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 lg:p-8 overflow-y-auto no-scrollbar space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
          {/* Connection Status Card */}
          <div className={`p-6 rounded-2xl border transition-all duration-500 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Globe className="text-emerald-600 dark:text-emerald-400" size={28} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    {state.syncError ? 'Cloud Link: Interrupted' : 'Cloud Link: Active'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-0.5">
                    {state.syncError ? 'Server unreachable' : `Last Synced: ${state.lastSynced.toLocaleTimeString()}`}
                  </p>
                </div>
              </div>
              <div className="flex -space-x-2">
                <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 shadow-sm"><Monitor size={16} /></div>
                <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 shadow-sm"><Smartphone size={16} /></div>
              </div>
            </div>
            
            <div className="bg-white/60 dark:bg-black/20 p-3.5 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
               <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> Secure SSL</span>
               <span className="flex items-center gap-1.5"><Database size={14} className="text-blue-500" /> Node.js Engine</span>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => state.forceSync()}
              disabled={state.isSyncing}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95 group"
            >
              <RefreshCw size={18} className={`text-emerald-500 group-hover:rotate-180 transition-transform duration-500 ${state.isSyncing ? 'animate-spin' : ''}`} />
              {state.isSyncing ? 'Pushing Data...' : 'Manual Data Sync'}
            </button>
            
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
               {state.syncError ? (
                 <AlertCircle className="text-rose-500 shrink-0" size={20} />
               ) : (
                 <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
               )}
               <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                 {state.syncError ? 'The engine is experiencing connection issues. Please check your internet or server hosting settings.' : 'The system is automatically mirroring your local changes to the cloud repository every 1.5 seconds.'}
               </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/20 flex items-start gap-4">
            <Zap className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
            <div className="text-[10px] text-blue-800 dark:text-blue-300 leading-relaxed font-bold uppercase tracking-tight">
              <strong>Enterprise Transparency:</strong> BuildMaster Pro operates a "Zero-Key" environment. Your identity is automatically verified through your infrastructure deployment.
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-10 py-3 bg-slate-900 dark:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};