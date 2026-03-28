import React from 'react';
import { 
  X, 
  Layers, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { Material, Vendor, Project } from '../types';

interface BulkRow {
  id: string;
  materialId: string;
  quantity: string;
  unitPrice: string;
  vendorId: string;
  projectId: string;
}

interface BulkStockInwardModalProps {
  bulkRows: BulkRow[];
  bulkDate: string;
  setBulkDate: (val: string) => void;
  bulkGlobalVendor: string;
  setBulkGlobalVendor: (val: string) => void;
  bulkGlobalProject: string;
  setBulkGlobalProject: (val: string) => void;
  materials: Material[];
  vendors: Vendor[];
  projects: Project[];
  isProjectLocked: (id: string) => boolean;
  addBulkRow: () => void;
  removeBulkRow: (id: string) => void;
  updateBulkRow: (id: string, field: keyof BulkRow, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  formatCurrency: (val: number) => string;
  allowDecimalStock: boolean;
}

export const BulkStockInwardModal: React.FC<BulkStockInwardModalProps> = ({
  bulkRows,
  bulkDate,
  setBulkDate,
  bulkGlobalVendor,
  setBulkGlobalVendor,
  bulkGlobalProject,
  setBulkGlobalProject,
  materials,
  vendors,
  projects,
  isProjectLocked,
  addBulkRow,
  removeBulkRow,
  updateBulkRow,
  onSubmit,
  onClose,
  formatCurrency,
  allowDecimalStock
}) => {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col mobile-sheet animate-in zoom-in-95 duration-300 ring-1 ring-white/20">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-950 shrink-0 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
             <div className="absolute -top-24 -left-24 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
             <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-400 rounded-full blur-3xl animate-pulse delay-700"></div>
           </div>
           <div className="flex gap-6 items-center relative z-10">
             <div className="p-5 bg-white/20 backdrop-blur-xl text-white rounded-[2rem] shadow-2xl border border-white/30 animate-bounce">
                <Layers size={32} />
             </div>
             <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none font-display">Bulk Hub Stocking</h2>
                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-[0.2em] mt-2 opacity-80">Multi-hub reception and multi-vendor log intelligence</p>
             </div>
           </div>
           <button onClick={onClose} className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-300 relative z-10"><X size={40} /></button>
        </div>

        <div className="p-8 bg-slate-50/80 dark:bg-slate-900/40 backdrop-blur-xl border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-8 shrink-0 shadow-inner">
           <div className="space-y-2 flex-1 min-w-[200px] group">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 group-focus-within:text-emerald-500 transition-colors">Value Date</label>
              <input type="date" className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
           </div>
           <div className="space-y-2 flex-1 min-w-[200px] group">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 group-focus-within:text-emerald-500 transition-colors">Primary Vendor (Auto-Fill)</label>
              <select className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm appearance-none cursor-pointer" value={bulkGlobalVendor} onChange={e => setBulkGlobalVendor(e.target.value)}>
                <option value="">Select Vendor...</option>
                {vendors.filter(v => v.isActive !== false || v.id === bulkGlobalVendor).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
           </div>
           <div className="space-y-2 flex-1 min-w-[200px] group">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 group-focus-within:text-emerald-500 transition-colors">Primary Godown (Auto-Fill)</label>
              <select className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm appearance-none cursor-pointer" value={bulkGlobalProject} onChange={e => setBulkGlobalProject(e.target.value)}>
                <option value="" disabled>Select Hub...</option>
                {projects.filter(p => !p.isDeleted && p.status === 'Active').map(p => <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name} {p.isGodown ? '(Godown)' : '(Site)'}{isProjectLocked(p.id) ? ' (Locked)' : ''}</option>)}
              </select>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar bg-slate-50/30 dark:bg-slate-900/20">
           <div className="space-y-6">
              {bulkRows.map((row, index) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end p-8 rounded-[2.5rem] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl hover:shadow-2xl hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-all duration-500 group/row animate-in slide-in-from-left-4">
                   <div className="md:col-span-1 flex items-center justify-center h-12">
                      <span className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs font-black text-slate-400 group-hover/row:bg-emerald-500 group-hover/row:text-white transition-all duration-500">{index + 1}</span>
                   </div>
                   <div className="md:col-span-3 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Material Asset</label>
                      <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-black dark:text-white outline-none focus:border-emerald-500 transition-all" value={row.materialId} onChange={e => updateBulkRow(row.id, 'materialId', e.target.value)}>
                        <option value="" disabled>Select Asset...</option>
                         {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                      </select>
                   </div>
                   <div className="md:col-span-2 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Quantity</label>
                      <input type="number" step={allowDecimalStock ? "0.01" : "1"} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-black dark:text-white outline-none focus:border-emerald-500 transition-all" value={row.quantity} onChange={e => updateBulkRow(row.id, 'quantity', e.target.value)} placeholder="0.00" />
                   </div>
                   <div className="md:col-span-2 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Unit Price</label>
                      <input type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-black dark:text-white outline-none focus:border-emerald-500 transition-all" value={row.unitPrice} onChange={e => updateBulkRow(row.id, 'unitPrice', e.target.value)} placeholder="0.00" />
                   </div>
                   {!bulkGlobalVendor && (
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Vendor</label>
                        <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-black dark:text-white outline-none focus:border-emerald-500 transition-all" value={row.vendorId} onChange={e => updateBulkRow(row.id, 'vendorId', e.target.value)}>
                           <option value="" disabled>Select Vendor...</option>
                           {vendors.filter(v => v.isActive !== false || v.id === row.vendorId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                   )}
                   {!bulkGlobalProject && (
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Target Hub</label>
                        <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-black dark:text-white outline-none focus:border-emerald-500 transition-all" value={row.projectId} onChange={e => updateBulkRow(row.id, 'projectId', e.target.value)}>
                           <option value="" disabled>Select Hub...</option>
                           {projects.filter(p => !p.isDeleted && p.status === 'Active').map(p => <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name} {p.isGodown ? '(G)' : '(S)'}{isProjectLocked(p.id) ? ' (L)' : ''}</option>)}
                        </select>
                      </div>
                   )}
                   <div className="md:col-span-1 flex items-center justify-end">
                      <button onClick={() => removeBulkRow(row.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all duration-300 hover:scale-125 hover:rotate-12"><Trash2 size={20} /></button>
                   </div>
                </div>
              ))}
           </div>
           <button onClick={addBulkRow} className="mt-10 flex items-center gap-4 px-10 py-6 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-600 transition-all border-4 border-dashed border-slate-100 dark:border-slate-800 w-full justify-center group shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800">
             <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" /> 
             Add New Hub Entry
           </button>
        </div>

        <div className="p-10 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row justify-between items-center gap-8 shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
           <div className="text-left bg-emerald-50/50 dark:bg-emerald-900/20 px-10 py-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/50 min-w-[300px]">
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.25em] mb-1">Total Hub Reception Value</p>
              <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                {formatCurrency(bulkRows.reduce((sum, r) => sum + ((parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0)), 0))}
              </p>
           </div>
           <div className="flex gap-5 w-full sm:w-auto">
              <button onClick={onClose} className="px-12 py-5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-black rounded-[1.8rem] text-[11px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95">Discard</button>
              <button onClick={onSubmit} className="px-12 py-5 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 text-white font-black rounded-[1.8rem] text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 active:scale-95 transition-all hover:brightness-110 hover:-translate-y-1">Process Hub Reception</button>
           </div>
        </div>
      </div>
    </div>
  );
};
