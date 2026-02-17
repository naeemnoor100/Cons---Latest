
import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  Copy, 
  Check, 
  Smartphone, 
  Monitor, 
  ShieldCheck, 
  X,
  UploadCloud,
  Zap,
  Globe,
  WifiOff,
  Link2,
  Share2,
  Database
} from 'lucide-react';
import { useApp } from '../AppContext';

export const SyncCenter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const state = useApp();
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkShared, setIsLinkShared] = useState(false);
  const [cloudKeyInput, setCloudKeyInput] = useState(state.syncId || '');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const generateNewKey = () => {
    const newKey = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    setCloudKeyInput(newKey);
  };

  const handleToggleSync = async () => {
    if (state.syncId) {
      state.disableCloudSync();
    } else {
      if (!cloudKeyInput) return;
      setIsActivating(true);
      await state.enableCloudSync(cloudKeyInput);
      setIsActivating(false);
    }
  };

  const copyKey = () => {
    if (state.syncId) {
      navigator.clipboard.writeText(state.syncId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const shareSyncLink = () => {
    if (state.syncId) {
      const url = `${window.location.origin}${window.location.pathname}?syncKey=${state.syncId}`;
      navigator.clipboard.writeText(url);
      setIsLinkShared(true);
      setTimeout(() => setIsLinkShared(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-lg transition-all duration-500 ${state.syncId ? 'bg-emerald-600 shadow-emerald-100' : 'bg-blue-600 shadow-blue-100'}`}>
              <Cloud size={24} className={`text-white ${state.isSyncing ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Cloud Sync Pro</h2>
              <p className="text-sm text-slate-500">Real-time cross-device database</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 lg:p-8 overflow-y-auto no-scrollbar space-y-6 bg-slate-50/50">
          {/* Connection Status Card */}
          <div className={`p-5 rounded-2xl border transition-all duration-500 ${state.syncId ? 'bg-emerald-50 border-emerald-100 shadow-inner' : 'bg-blue-50 border-blue-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {state.syncId ? <Globe className="text-emerald-600" size={24} /> : <WifiOff className="text-blue-600" size={24} />}
                  {state.syncId && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tighter">
                    {state.syncId ? 'Cloud Sync: Active' : 'Local Mode: Tab Sync Only'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">
                    {state.syncId ? `Last Synced: ${state.lastSynced.toLocaleTimeString()}` : 'Data stored locally in this browser'}
                  </p>
                </div>
              </div>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm"><Monitor size={14} /></div>
                <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm"><Smartphone size={14} /></div>
              </div>
            </div>
            
            <div className="bg-white/60 p-3 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-600">
               <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> Secure Encryption</span>
               <span className="flex items-center gap-1.5"><Database size={14} className="text-blue-500" /> Auto-Backups</span>
            </div>
          </div>

          {state.syncId && (
            <button 
              onClick={() => state.forceSync()}
              disabled={state.isSyncing}
              className="w-full bg-white border border-slate-200 py-3 rounded-xl flex items-center justify-center gap-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-emerald-300 transition-all shadow-sm active:scale-95 group"
            >
              <RefreshCw size={18} className={`text-emerald-500 group-hover:rotate-180 transition-transform duration-500 ${state.isSyncing ? 'animate-spin' : ''}`} />
              {state.isSyncing ? 'Synchronizing...' : 'Sync Data Now'}
            </button>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Link2 size={18} className="text-blue-600" />
                Company Sync Key
              </h3>
              {!state.syncId && (
                <button onClick={generateNewKey} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest">Generate New</button>
              )}
            </div>

            <div className="relative">
              <input 
                type="text" 
                readOnly={!!state.syncId}
                placeholder="Enter 16-character sync key..."
                className={`w-full px-4 py-3.5 rounded-xl border text-sm font-mono transition-all outline-none ${
                  state.syncId 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-600'
                }`}
                value={cloudKeyInput}
                onChange={(e) => setCloudKeyInput(e.target.value)}
              />
              {state.syncId && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button 
                    onClick={copyKey}
                    title="Copy Key"
                    className="p-1.5 bg-white border border-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-50 shadow-sm"
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button 
                    onClick={shareSyncLink}
                    title="Share Link"
                    className="p-1.5 bg-white border border-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-50 shadow-sm"
                  >
                    {isLinkShared ? <Check size={14} /> : <Share2 size={14} />}
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleToggleSync}
              disabled={isActivating || (!state.syncId && !cloudKeyInput)}
              className={`w-full font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
                state.syncId 
                  ? 'bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800' 
                  : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 disabled:bg-slate-200 disabled:shadow-none'
              }`}
            >
              {isActivating ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : state.syncId ? (
                <>
                  <WifiOff size={20} />
                  Disconnect Cloud
                </>
              ) : (
                <>
                  <UploadCloud size={20} />
                  Go Live (Auto-Sync)
                </>
              )}
            </button>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
            <Zap className="text-amber-600 shrink-0 mt-0.5" size={16} />
            <div className="text-[10px] text-amber-800 leading-relaxed font-medium">
              <strong>Seamless Continuity:</strong> When "Go Live" is active, BuildTrack Pro monitors for changes globally. Switching from your computer to your phone? The data will pull automatically as soon as you open the app.
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
