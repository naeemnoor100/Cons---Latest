import React from 'react';
import { 
  X, 
  DollarSign, 
  ArrowRight, 
  Landmark, 
  CheckCircle2 
} from 'lucide-react';
import { Vendor, Project, PaymentMethod } from '../types';

interface SupplierPaymentsProps {
  selectedVendorForPayment: Vendor;
  editingPaymentRecord: any | null;
  paymentFormData: {
    projectId: string;
    amount: string;
    method: PaymentMethod;
    date: string;
    reference: string;
    materialBatchId: string;
  };
  setPaymentFormData: React.Dispatch<React.SetStateAction<any>>;
  outstandingBills: any[];
  showManualAllocations: boolean;
  setShowManualAllocations: (val: boolean) => void;
  manualAllocations: Record<string, string>;
  setManualAllocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  totalAllocatedSum: number;
  contextualMaxLimit: number | null;
  projects: Project[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formatCurrency: (val: number) => string;
}

export const SupplierPayments: React.FC<SupplierPaymentsProps> = ({
  selectedVendorForPayment,
  editingPaymentRecord,
  paymentFormData,
  setPaymentFormData,
  outstandingBills,
  showManualAllocations,
  setShowManualAllocations,
  manualAllocations,
  setManualAllocations,
  totalAllocatedSum,
  contextualMaxLimit,
  projects,
  onClose,
  onSubmit,
  formatCurrency
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/20 dark:bg-emerald-900/10 shrink-0">
           <div className="flex gap-4 items-center">
             <div className="p-4 bg-emerald-600 text-white rounded-[1.5rem] shadow-xl shadow-emerald-200 dark:shadow-none">
                <DollarSign size={28} />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{editingPaymentRecord ? 'Modify Settlement' : 'New Settlement'}</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Vendor: {selectedVendorForPayment.name}</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
        </div>
        
        <form onSubmit={onSubmit} className="p-8 space-y-6 pb-safe overflow-y-auto no-scrollbar max-h-[80vh]">
           <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-2xl">
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">
                  {editingPaymentRecord ? 'Outstanding Prior to Entry' : 'Total Outstanding'}
                </p>
                <p className="text-xl font-black">
                  {formatCurrency(editingPaymentRecord ? selectedVendorForPayment.balance + editingPaymentRecord.amount : selectedVendorForPayment.balance)}
                </p>
              </div>
              <ArrowRight className="text-white/20" size={24} />
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Projected Balance</p>
                <p className="text-xl font-black text-emerald-500">
                  {formatCurrency(Math.max(0, (editingPaymentRecord ? selectedVendorForPayment.balance + editingPaymentRecord.amount : selectedVendorForPayment.balance) - (parseFloat(paymentFormData.amount) || 0)))}
                </p>
              </div>
           </div>

           {!paymentFormData.materialBatchId && !editingPaymentRecord && outstandingBills.length > 0 && (
              <div className="space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Bill Allocation</label>
                    <button 
                      type="button" 
                      onClick={() => setShowManualAllocations(!showManualAllocations)}
                      className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-all ${showManualAllocations ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {showManualAllocations ? 'Disable Manual' : 'Enable Manual'}
                    </button>
                 </div>

                 {showManualAllocations && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
                       <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar pr-1">
                          {outstandingBills.map(bill => (
                             <div key={bill.id} className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex-1 min-w-0">
                                   <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase truncate">{bill.materialName}</p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Site: {projects.find(p => p.id === bill.projectId)?.name}</p>
                                   <p className="text-[9px] text-rose-500 font-black uppercase mt-0.5">Bal: {formatCurrency(bill.remainingBalance)}</p>
                                </div>
                                <div className="w-32">
                                   <input 
                                      type="number" 
                                      step="0.01"
                                      placeholder="0.00"
                                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                      value={manualAllocations[bill.id] || ''}
                                      onChange={e => {
                                         const val = e.target.value;
                                         const updatedAlloc = { ...manualAllocations, [bill.id]: val };
                                         setManualAllocations(updatedAlloc);
                                         const newAllocTotal = Object.entries(updatedAlloc).reduce((sum, [_,v]) => sum + (parseFloat(v as string) || 0), 0);
                                         setPaymentFormData((prev: any) => ({ ...prev, amount: newAllocTotal.toString() }));
                                      }}
                                   />
                                </div>
                             </div>
                          ))}
                       </div>
                       <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-black uppercase px-2">
                          <span className="text-slate-400">Allocated Sum:</span>
                          <span className="text-blue-600">{formatCurrency(totalAllocatedSum)}</span>
                       </div>
                    </div>
                 )}
              </div>
           )}

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {showManualAllocations ? 'Total Settlement Value' : 'Settlement Amount'}
                  </label>
                  {contextualMaxLimit !== null && (
                    <span className="text-[9px] font-black text-amber-500 uppercase">Limit: {formatCurrency(contextualMaxLimit)}</span>
                  )}
                </div>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  placeholder="0.00" 
                  className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all`} 
                  value={paymentFormData.amount} 
                  onChange={(e) => setPaymentFormData((p: any) => ({ ...p, amount: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Value Date</label>
                <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={paymentFormData.date} onChange={(e) => setPaymentFormData((p: any) => ({ ...p, date: e.target.value }))} />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Channel</label>
              <div className="grid grid-cols-3 gap-2">
                 {(['Bank', 'Cash', 'Online'] as PaymentMethod[]).map(m => (
                   <button
                     key={m} type="button"
                     onClick={() => setPaymentFormData((p: any) => ({ ...p, method: m }))}
                     className={`py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${paymentFormData.method === m ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                   >
                     {m}
                   </button>
                 ))}
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ref / UTR Number</label>
              <div className="relative">
                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Optional txn ID..." className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={paymentFormData.reference} onChange={(e) => setPaymentFormData((p: any) => ({ ...p, reference: e.target.value }))} />
              </div>
           </div>

           <button 
            type="submit" 
            className={`w-full py-5 rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none`}
           >
             <CheckCircle2 size={24} />
             {editingPaymentRecord ? 'Finalize Changes' : 'Record Settlement'}
           </button>
        </form>
      </div>
    </div>
  );
};
