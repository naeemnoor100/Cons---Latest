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
      <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col mobile-sheet animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/10 shrink-0">
           <div className="flex gap-4 items-center">
             <div className="p-4 bg-emerald-600 text-white rounded-[1.5rem] shadow-xl">
                <Layers size={28} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Bulk Hub Stocking</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Multi-hub reception and multi-vendor log</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={36} /></button>
        </div>

        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-6 shrink-0">
           <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Value Date</label>
              <input type="date" className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
           </div>
           <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Primary Vendor (Auto-Fill)</label>
              <select className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white" value={bulkGlobalVendor} onChange={e => setBulkGlobalVendor(e.target.value)}>
                <option value="">Manual Selection</option>
                {vendors.filter(v => v.isActive !== false || v.id === bulkGlobalVendor).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
           </div>
           <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Primary Godown (Auto-Fill)</label>
              <select className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white" value={bulkGlobalProject} onChange={e => setBulkGlobalProject(e.target.value)}>
                <option value="">Manual Selection</option>
                {projects.map(p => <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name} {p.isGodown ? '(Godown)' : '(Site)'}{isProjectLocked(p.id) ? ' (Locked)' : ''}</option>)}
              </select>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-white dark:bg-slate-800">
           <div className="space-y-4">
              {bulkRows.map((row, index) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 animate-in slide-in-from-left-2 transition-all">
                   <div className="md:col-span-1 flex items-center justify-center h-10">
                      <span className="text-xs font-black text-slate-300">#{index + 1}</span>
                   </div>
                   <div className="md:col-span-3 space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase px-1">Material Asset</label>
                      <select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-xs font-bold dark:text-white" value={row.materialId} onChange={e => updateBulkRow(row.id, 'materialId', e.target.value)}>
                         <option value="">Choose asset...</option>
                         {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                      </select>
                   </div>
                   <div className="md:col-span-2 space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase px-1">Quantity</label>
                      <input type="number" step={allowDecimalStock ? "0.01" : "1"} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-xs font-bold dark:text-white" value={row.quantity} onChange={e => updateBulkRow(row.id, 'quantity', e.target.value)} placeholder="0.00" />
                   </div>
                   <div className="md:col-span-2 space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase px-1">Unit Price</label>
                      <input type="number" step="0.01" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-xs font-bold dark:text-white" value={row.unitPrice} onChange={e => updateBulkRow(row.id, 'unitPrice', e.target.value)} placeholder="0.00" />
                   </div>
                   {!bulkGlobalVendor && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase px-1">Vendor</label>
                        <select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-xs font-bold dark:text-white" value={row.vendorId} onChange={e => updateBulkRow(row.id, 'vendorId', e.target.value)}>
                           <option value="">Select Vendor...</option>
                           {vendors.filter(v => v.isActive !== false || v.id === row.vendorId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                   )}
                   {!bulkGlobalProject && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase px-1">Target Hub</label>
                        <select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-xs font-bold dark:text-white" value={row.projectId} onChange={e => updateBulkRow(row.id, 'projectId', e.target.value)}>
                           <option value="">Select Hub...</option>
                           {projects.map(p => <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name} {p.isGodown ? '(G)' : '(S)'}{isProjectLocked(p.id) ? ' (L)' : ''}</option>)}
                        </select>
                      </div>
                   )}
                   <div className="md:col-span-1 flex items-center justify-end">
                      <button onClick={() => removeBulkRow(row.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                   </div>
                </div>
              ))}
           </div>
           <button onClick={addBulkRow} className="mt-6 flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all border-2 border-dashed border-slate-200 dark:border-slate-600 w-full justify-center"><Plus size={16} /> Add New Hub Entry</button>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
           <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Hub Reception</p>
              <p className="text-xl font-black text-emerald-600">
                {formatCurrency(bulkRows.reduce((sum, r) => sum + ((parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0)), 0))}
              </p>
           </div>
           <div className="flex gap-4 w-full sm:w-auto">
              <button onClick={onClose} className="px-10 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={onSubmit} className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95 transition-all">Process Hub Reception</button>
           </div>
        </div>
      </div>
    </div>
  );
};
