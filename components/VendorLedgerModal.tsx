import React, { useState } from 'react';
import { 
  X, 
  ShoppingCart, 
  ArrowDownCircle, 
  Briefcase, 
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  DollarSign
} from 'lucide-react';
import { Vendor, Project } from '../types';

interface VendorLedgerModalProps {
  activeVendor: Vendor;
  activeVendorStats: {
    totalPaid: number;
    totalPurchases: number;
    activeProjectsCount: number;
  };
  ledgerSearchTerm: string;
  setLedgerSearchTerm: (val: string) => void;
  filteredCombinedLedger: any[];
  projects: Project[];
  onClose: () => void;
  formatCurrency: (val: number) => string;
}

export const VendorLedgerModal: React.FC<VendorLedgerModalProps> = ({
  activeVendor,
  activeVendorStats,
  ledgerSearchTerm,
  setLedgerSearchTerm,
  filteredCombinedLedger,
  projects,
  onClose,
  formatCurrency
}) => {
  const [activeTab, setActiveTab] = useState<'statement' | 'settlements' | 'stock'>('statement');

  const filteredData = filteredCombinedLedger.filter(item => {
    if (activeTab === 'settlements') return item.type === 'PAYMENT';
    if (activeTab === 'stock') return item.type === 'PURCHASE';
    return true;
  });

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-7xl h-[94vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
         {/* Header */}
         <div className="p-8 flex justify-between items-start shrink-0">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-[#003366] text-white rounded-full flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-100">
                {activeVendor.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-3xl font-black text-[#001F3F] uppercase tracking-tighter leading-none">Supplier Ledger</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  {activeVendor.name} • Material Statement
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex items-center gap-3">
                  <div className="bg-blue-50 px-4 py-3 rounded-2xl flex items-center gap-3 border border-blue-100">
                     <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <Building2 size={14} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-blue-400 uppercase leading-none mb-1">Active Sites</p>
                        <p className="text-xs font-black text-blue-900 uppercase">{activeVendorStats.activeProjectsCount} Projects</p>
                     </div>
                  </div>

                  <div className="bg-emerald-50 px-4 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100">
                     <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                        <CheckCircle2 size={14} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">Total Paid</p>
                        <p className="text-xs font-black text-emerald-900 uppercase">{formatCurrency(activeVendorStats.totalPaid)}</p>
                     </div>
                  </div>

                  <div className="bg-rose-50 px-4 py-3 rounded-2xl flex items-center gap-3 border border-rose-100">
                     <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                        <AlertCircle size={14} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-rose-400 uppercase leading-none mb-1">Dues Pending</p>
                        <p className="text-xs font-black text-rose-900 uppercase">{formatCurrency(activeVendor.balance)}</p>
                     </div>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                  <X size={40} strokeWidth={1.5} />
               </button>
            </div>
         </div>

         {/* Tabs */}
         <div className="px-8 border-b border-slate-100 flex items-center gap-12 shrink-0">
            <button 
              onClick={() => setActiveTab('statement')}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'statement' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
               Full Statement
               {activeTab === 'statement' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
            </button>
            <button 
              onClick={() => setActiveTab('settlements')}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'settlements' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
               Settlements
               {activeTab === 'settlements' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
            </button>
            <button 
              onClick={() => setActiveTab('stock')}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'stock' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
               Stock Inward
               {activeTab === 'stock' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
            </button>
         </div>

         {/* Search Bar */}
         <div className="px-8 py-6 bg-slate-50/50 shrink-0">
            <div className="relative max-w-2xl">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <input 
                type="text" 
                placeholder="Search ledger by date, site, material or reference..." 
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" 
                value={ledgerSearchTerm}
                onChange={(e) => setLedgerSearchTerm(e.target.value)}
               />
            </div>
         </div>

         {/* Table */}
         <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-8">
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
               <table className="w-full text-left min-w-[1000px]">
                  <thead className="bg-white text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                     <tr>
                        <th className="px-8 py-6">Value Date</th>
                        <th className="px-8 py-6">Transaction Details</th>
                        <th className="px-8 py-6">Associated Site</th>
                        <th className="px-8 py-6">Debit (Bill)</th>
                        <th className="px-8 py-6">Credit (Paid)</th>
                        <th className="px-8 py-6 text-right">Ledger Balance</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {filteredData.length > 0 ? filteredData.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/30 transition-colors">
                           <td className="px-8 py-6 text-xs font-black text-slate-900">
                              {new Date(item.date).toLocaleDateString('en-GB')}
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className={`p-2.5 rounded-xl ${item.type === 'PURCHASE' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    {item.type === 'PURCHASE' ? <ArrowUpRight size={16} /> : <ArrowDownCircle size={16} />}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-[#001F3F] uppercase leading-none mb-1.5">{item.description}</p>
                                    <p className={`text-[8px] font-black uppercase tracking-widest ${item.type === 'PURCHASE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                       {item.type === 'PURCHASE' ? 'Stock Arrival' : 'Payment Settlement'}
                                    </p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className="text-[10px] font-black uppercase text-slate-500">
                                 {item.type === 'PAYMENT' ? (item as any).siteDisplay : projects.find(p => p.id === item.projectId)?.name || 'General'}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              {item.type === 'PURCHASE' ? (
                                 <span className="text-sm font-black text-rose-500">{formatCurrency(item.amount)}</span>
                              ) : (
                                 <span className="text-slate-200 font-black">--</span>
                              )}
                           </td>
                           <td className="px-8 py-6">
                              {item.type === 'PAYMENT' ? (
                                 <span className="text-sm font-black text-emerald-500">{formatCurrency(item.amount)}</span>
                              ) : (
                                 <span className="text-slate-200 font-black">--</span>
                              )}
                           </td>
                           <td className="px-8 py-6 text-right">
                              <span className="text-slate-200 font-black">--</span>
                           </td>
                        </tr>
                     )) : (
                        <tr>
                           <td colSpan={6} className="py-24 text-center">
                              <div className="flex flex-col items-center gap-3">
                                 <div className="p-4 bg-slate-50 rounded-full text-slate-200">
                                    <FileText size={40} />
                                 </div>
                                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No matching entries found in this ledger</p>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
};

const FileText = ({ size }: { size: number }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
);
