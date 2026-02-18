import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus,
  X,
  History,
  DollarSign,
  Pencil,
  Trash2,
  Package,
  Briefcase,
  Calendar,
  CreditCard,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Wallet,
  ArrowRight,
  TrendingUp,
  Landmark,
  MoreVertical,
  Phone,
  MapPin,
  Lock,
  ArrowDownCircle,
  Clock,
  ShoppingCart,
  Link,
  ChevronRight,
  FileText,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Building2,
  ChevronDown,
  ChevronUp,
  Map,
  Split,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Vendor, VendorCategory, Payment, PaymentMethod, Project } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const VendorList: React.FC = () => {
  const { vendors, payments, expenses, projects, materials, tradeCategories, addVendor, updateVendor, deleteVendor, addPayment, updatePayment, deletePayment } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [viewingVendorId, setViewingVendorId] = useState<string | null>(null);
  const activeVendor = useMemo(() => vendors.find(v => v.id === viewingVendorId), [vendors, viewingVendorId]);
  
  const [activeDetailTab, setActiveDetailTab] = useState<'statement' | 'payments' | 'supplies'>('statement');
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState<Vendor | null>(null);
  const [editingPaymentRecord, setEditingPaymentRecord] = useState<Payment | null>(null);
  
  const [expandedSettlements, setExpandedSettlements] = useState<Record<string, boolean>>({});
  const [showManualAllocations, setShowManualAllocations] = useState(false);
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});

  const toggleSettlement = (id: string) => {
    setExpandedSettlements(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [contextualMaxLimit, setContextualMaxLimit] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', category: tradeCategories[0] || 'Material', address: '', balance: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    projectId: '', 
    amount: '', 
    method: 'Bank' as PaymentMethod, 
    date: new Date().toISOString().split('T')[0], 
    reference: '',
    materialBatchId: ''
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPaymentModal(false);
        setViewingVendorId(null);
        setEditingPaymentRecord(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    setLedgerSearchTerm('');
  }, [viewingVendorId]);

  const totalOutstanding = useMemo(() => vendors.reduce((sum, v) => sum + v.balance, 0), [vendors]);
  const highBalanceCount = useMemo(() => vendors.filter(v => v.balance > 50000).length, [vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  const getSuppliesForVendor = (vendorId: string) => {
    const supplyList: any[] = [];
    materials.forEach(mat => {
      if (mat.history) {
        mat.history.forEach(h => {
          if (h.type === 'Purchase' && h.vendorId === vendorId) {
            const totalPaidForBatch = payments.filter(p => p.materialBatchId === h.id).reduce((sum, p) => sum + p.amount, 0);
            const value = h.quantity * (h.unitPrice || mat.costPerUnit);
            supplyList.push({ 
              ...h, 
              materialName: mat.name, 
              unit: mat.unit,
              unitPrice: h.unitPrice || mat.costPerUnit,
              estimatedValue: value,
              remainingBalance: Math.max(0, value - totalPaidForBatch)
            });
          }
        });
      }
    });
    return supplyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const vendorSupplies = useMemo(() => {
    if (!activeVendor) return [];
    return getSuppliesForVendor(activeVendor.id);
  }, [activeVendor, materials, payments]);

  const activeVendorStats = useMemo(() => {
    if (!activeVendor) return { totalPaid: 0, totalPurchases: 0, activeProjectsCount: 0 };
    
    const vendorPayments = payments.filter(p => p.vendorId === activeVendor.id && !p.isAllocation);
    const totalPaid = vendorPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPurchases = vendorSupplies.reduce((sum, s) => sum + s.estimatedValue, 0);

    const associatedProjectIds = new Set([
      ...vendorSupplies.map(s => s.projectId),
      ...vendorPayments.map(p => p.projectId)
    ]);
    
    const activeProjectsCount = projects.filter(p => 
      associatedProjectIds.has(p.id) && p.status === 'Active'
    ).length;

    return { totalPaid, totalPurchases, activeProjectsCount };
  }, [activeVendor, payments, vendorSupplies, projects]);

  const combinedLedger = useMemo(() => {
    if (!activeVendor) return [];
    
    const purchases = vendorSupplies.map(s => {
      const isFullyPaid = s.remainingBalance <= 0.01;
      return {
        id: s.id,
        date: s.date,
        type: 'PURCHASE' as const,
        description: `${s.materialName} (${s.quantity} ${s.unit})`,
        unitPrice: s.unitPrice,
        amount: s.estimatedValue,
        projectId: s.projectId,
        reference: `Batch #${s.id.slice(-6).toUpperCase()}`,
        isFullyPaid,
        remainingBalance: s.remainingBalance
      };
    });

    const vendorPayments = payments
      .filter(p => p.vendorId === activeVendor.id && !p.isAllocation)
      .map(p => {
        const materialName = materials.find(m => 
          m.history?.some(h => h.id === p.materialBatchId)
        )?.name;

        const allocations = payments.filter(a => a.masterPaymentId === p.id);
        const uniqueProjectIds = Array.from(new Set(allocations.map(a => a.projectId)));
        const projectNames = uniqueProjectIds
          .map(pid => projects.find(proj => proj.id === pid)?.name)
          .filter(Boolean);

        return {
          id: p.id,
          date: p.date,
          type: 'PAYMENT' as const,
          description: materialName ? `${materialName} - Settlement via ${p.method}` : `Settlement via ${p.method}`,
          unitPrice: undefined,
          amount: p.amount,
          projectId: p.projectId,
          reference: p.reference || 'N/A',
          isFullyPaid: true,
          remainingBalance: 0,
          materialName,
          siteDisplay: projectNames.length > 0 ? projectNames.join(', ') : (projects.find(proj => proj.id === p.projectId)?.name || 'General Office')
        };
      });

    return [...purchases, ...vendorPayments].sort((a, b) => {
      const timeB = new Date(b.date).getTime();
      const timeA = new Date(a.date).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });
  }, [activeVendor, vendorSupplies, payments, materials, projects]);

  const filteredCombinedLedger = useMemo(() => {
    if (!ledgerSearchTerm) return combinedLedger;
    const search = ledgerSearchTerm.toLowerCase();
    return combinedLedger.filter(item => 
      item.description.toLowerCase().includes(search) ||
      item.reference.toLowerCase().includes(search) ||
      (item as any).siteDisplay?.toLowerCase().includes(search) ||
      (projects.find(p => p.id === item.projectId)?.name || '').toLowerCase().includes(search)
    );
  }, [combinedLedger, ledgerSearchTerm, projects]);

  const outstandingBills = useMemo(() => {
    if (!selectedVendorForPayment) return [];
    return getSuppliesForVendor(selectedVendorForPayment.id).filter(s => s.remainingBalance > 0.01);
  }, [selectedVendorForPayment, materials, payments]);

  const handleOpenPaymentModal = (vendor: Vendor, prefillProjectId?: string, prefillAmount?: number, materialBatchId?: string) => {
    setSelectedVendorForPayment(vendor);
    setEditingPaymentRecord(null);
    setContextualMaxLimit(prefillAmount || null);
    setShowManualAllocations(false);
    setManualAllocations({});
    
    setPaymentFormData({
      projectId: prefillProjectId || projects[0]?.id || '',
      amount: prefillAmount ? prefillAmount.toString() : '',
      method: 'Bank',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      materialBatchId: materialBatchId || ''
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorForPayment) return;
    
    const amountNum = parseFloat(paymentFormData.amount) || 0;
    const totalVendorHeadroom = editingPaymentRecord 
      ? selectedVendorForPayment.balance + editingPaymentRecord.amount 
      : selectedVendorForPayment.balance;

    if (amountNum > totalVendorHeadroom + 0.01) {
      alert(`Payment Forbidden: Amount (${formatCurrency(amountNum)}) exceeds total outstanding vendor balance.`);
      return;
    }

    if (contextualMaxLimit !== null && amountNum > contextualMaxLimit + 0.01) {
      alert(`Ledger Validation Error: This specific bill only has a remaining balance of ${formatCurrency(contextualMaxLimit)}.`);
      return;
    }

    const totalAllocated = Object.values(manualAllocations).reduce((sum, v) => sum + (parseFloat(v as string) || 0), 0);
    if (showManualAllocations && totalAllocated > amountNum + 0.01) {
       alert(`Validation Error: Total allocations (${formatCurrency(totalAllocated)}) exceed payment amount (${formatCurrency(amountNum)}).`);
       return;
    }
    
    const masterId = editingPaymentRecord ? editingPaymentRecord.id : 'pay' + Date.now();
    
    if (!showManualAllocations) {
       const paymentData: Payment = {
         id: masterId,
         date: paymentFormData.date,
         vendorId: selectedVendorForPayment.id,
         projectId: paymentFormData.projectId || projects[0]?.id || 'godown-001',
         amount: amountNum,
         method: paymentFormData.method,
         reference: paymentFormData.reference,
         materialBatchId: paymentFormData.materialBatchId || undefined,
         isAllocation: false
       };

       if (editingPaymentRecord) await updatePayment(paymentData);
       else await addPayment(paymentData);
    } else {
       const unallocated = Math.max(0, amountNum - totalAllocated);
       const txnDate = paymentFormData.date;
       const txnRef = paymentFormData.reference;
       const txnMethod = paymentFormData.method;

       if (editingPaymentRecord) await deletePayment(editingPaymentRecord.id);

       for (const [billId, allocAmount] of Object.entries(manualAllocations)) {
          const val = parseFloat(allocAmount as string) || 0;
          if (val > 0) {
             const bill = outstandingBills.find(b => b.id === billId);
             await addPayment({
                id: 'pay-' + Math.random().toString(36).substr(2, 9),
                date: txnDate,
                vendorId: selectedVendorForPayment.id,
                projectId: bill?.projectId || projects[0]?.id,
                amount: val,
                method: txnMethod,
                reference: txnRef ? `${txnRef} (Alloc: ${bill?.materialName})` : `Alloc: ${bill?.materialName}`,
                materialBatchId: billId,
                isAllocation: false
             });
          }
       }

       if (unallocated > 0.01) {
          await addPayment({
             id: 'pay-' + Math.random().toString(36).substr(2, 9),
             date: txnDate,
             vendorId: selectedVendorForPayment.id,
             projectId: projects[0]?.id,
             amount: unallocated,
             method: txnMethod,
             reference: txnRef ? `${txnRef} (Unallocated)` : `General / Advance`,
             materialBatchId: undefined,
             isAllocation: false
          });
       }
    }
    
    setShowPaymentModal(false);
    setSelectedVendorForPayment(null);
    setEditingPaymentRecord(null);
    setContextualMaxLimit(null);
    setManualAllocations({});
  };

  const handleDeleteVendor = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteVendor(id);
    }
  };

  const handleOpenAddVendor = () => {
    setEditingVendor(null);
    setFormData({ name: '', phone: '', category: tradeCategories[0] || 'Material', address: '', balance: '' });
    setShowModal(true);
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendorData: Vendor = {
      id: editingVendor ? editingVendor.id : 'v' + Date.now(),
      name: formData.name,
      phone: formData.phone,
      category: formData.category,
      address: formData.address,
      balance: editingVendor ? editingVendor.balance : (parseFloat(formData.balance) || 0)
    };
    if (editingVendor) await updateVendor(vendorData);
    else await addVendor(vendorData);
    setShowModal(false);
  };

  const totalAllocatedSum = useMemo(() => 
    Object.values(manualAllocations).reduce((sum, v) => sum + (parseFloat(v as string) || 0), 0)
  , [manualAllocations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Supplier Registry</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor outstanding balances and site engagements.</p>
        </div>
        <button 
          onClick={handleOpenAddVendor}
          className="w-full sm:w-auto bg-[#003366] text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Plus size={20} /> Register Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-[2rem] text-white shadow-lg">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">High Balance</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{highBalanceCount} <span className="text-xs font-medium text-slate-400">Suppliers</span></p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 md:col-span-2">
           <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-bold" 
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-8 py-5">Supplier Profile</th>
                <th className="px-8 py-5">Active Sites</th>
                <th className="px-8 py-5">Outstanding Bal.</th>
                <th className="px-8 py-5">Last Settlement</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredVendors.map((vendor) => {
                const vendorPayments = payments.filter(p => p.vendorId === vendor.id && !p.isAllocation);
                const lastPay = vendorPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const vendorSupplies_local = getSuppliesForVendor(vendor.id);
                const associatedProjectIds = new Set([...vendorSupplies_local.map(s => s.projectId), ...vendorPayments.map(p => p.projectId)]);
                const activeSitesCount = projects.filter(p => associatedProjectIds.has(p.id) && p.status === 'Active').length;

                return (
                  <tr key={vendor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                           {vendor.name.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{vendor.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[8px] font-black uppercase rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                {vendor.category}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{vendor.phone}</span>
                            </div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 ${activeSitesCount > 0 ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-slate-50 text-slate-400'}`}>
                             <Building2 size={12} />
                             {activeSitesCount} Active {activeSitesCount === 1 ? 'Site' : 'Sites'}
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <p className={`text-base font-black ${vendor.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(vendor.balance)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           {vendor.balance > 50000 ? (
                             <span className="text-[9px] font-bold text-red-500 uppercase flex items-center gap-1">
                               <AlertCircle size={10} /> Critical
                             </span>
                           ) : vendor.balance > 0 ? (
                             <span className="text-[9px] text-slate-400 font-bold uppercase">Pending</span>
                           ) : (
                             <span className="text-[9px] text-emerald-600 font-bold uppercase flex items-center gap-1">
                               <CheckCircle2 size={10} /> Clear
                             </span>
                           )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       {lastPay ? (
                         <div className="flex items-center gap-3">
                           <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                              <ArrowDownCircle size={16} />
                           </div>
                           <div>
                              <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">{formatCurrency(lastPay.amount)}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                <Clock size={10} /> {new Date(lastPay.date).toLocaleDateString('en-IN')}
                              </p>
                           </div>
                         </div>
                       ) : (
                         <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">No Payments</span>
                       )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 items-center">
                         <button 
                          onClick={() => handleOpenPaymentModal(vendor)}
                          disabled={vendor.balance <= 0}
                          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl active:scale-95 ${vendor.balance > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100 dark:shadow-none' : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'}`}
                         >
                           <DollarSign size={14} /> Pay
                         </button>
                         <button 
                          onClick={() => setViewingVendorId(vendor.id)} 
                          className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all shadow-sm"
                          title="View Full Ledger"
                         >
                           <History size={20} />
                         </button>
                         <div className="relative group/actions">
                            <button className="p-3 text-slate-300 hover:text-slate-600 transition-colors">
                               <MoreVertical size={18} />
                            </button>
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover/actions:flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-20 w-32 animate-in fade-in slide-in-from-bottom-2">
                               <button 
                                onClick={() => {
                                  setEditingVendor(vendor);
                                  setFormData({ name: vendor.name, phone: vendor.phone, category: vendor.category, address: vendor.address, balance: vendor.balance.toString() });
                                  setShowModal(true);
                                }}
                                className="px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                               >
                                  <Pencil size={14} /> Edit
                               </button>
                               <button 
                                onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                                className="px-4 py-3 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700"
                               >
                                  <Trash2 size={14} /> Delete
                               </button>
                            </div>
                         </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30">
                 <h2 className="text-xl font-black uppercase">{editingVendor ? 'Modify Supplier' : 'Register Supplier'}</h2>
                 <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900"><X size={32} /></button>
              </div>
              <form onSubmit={handleVendorSubmit} className="p-8 space-y-5">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Supplier Name</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400 px-1">Phone</label>
                       <input type="tel" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400 px-1">Category</label>
                       <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                          {tradeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                 </div>
                 {!editingVendor && (
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 px-1">Opening Balance (Rs.)</label>
                      <input type="number" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-black text-lg text-red-600" value={formData.balance} onChange={e => setFormData(p => ({ ...p, balance: e.target.value }))} placeholder="0.00" />
                   </div>
                 )}
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Address / Notes</label>
                    <textarea className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white" rows={2} value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
                 </div>
                 <button type="submit" className="w-full bg-[#003366] text-white py-4 rounded-3xl font-black uppercase tracking-widest active:scale-95 transition-all mt-4">Confirm Registration</button>
              </form>
           </div>
        </div>
      )}

      {/* Modern Payment Modal */}
      {showPaymentModal && selectedVendorForPayment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
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
               <button onClick={() => { setShowPaymentModal(false); setSelectedVendorForPayment(null); setEditingPaymentRecord(null); setContextualMaxLimit(null); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="p-8 space-y-6 pb-safe overflow-y-auto no-scrollbar max-h-[80vh]">
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
                                             setPaymentFormData(prev => ({ ...prev, amount: newAllocTotal.toString() }));
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
                      onChange={(e) => setPaymentFormData(p => ({ ...p, amount: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Value Date</label>
                    <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={paymentFormData.date} onChange={(e) => setPaymentFormData(p => ({ ...p, date: e.target.value }))} />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                     {(['Bank', 'Cash', 'Online'] as PaymentMethod[]).map(m => (
                       <button
                         key={m} type="button"
                         onClick={() => setPaymentFormData(p => ({ ...p, method: m }))}
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
                    <input type="text" placeholder="Optional txn ID..." className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={paymentFormData.reference} onChange={(e) => setPaymentFormData(p => ({ ...p, reference: e.target.value }))} />
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
      )}

      {/* Vendor Full Ledger Modal */}
      {viewingVendorId && activeVendor && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-6xl h-[92vh] shadow-2xl overflow-hidden flex flex-col mobile-sheet animate-in zoom-in-95 duration-300">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 bg-slate-900 dark:bg-slate-700 text-white rounded-[1.8rem] flex items-center justify-center font-black text-2xl shadow-xl">{activeVendor.name.charAt(0)}</div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{activeVendor.name} Ledger</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{activeVendor.category} • {activeVendor.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <button className="p-3 bg-slate-50 dark:bg-slate-700 rounded-2xl text-slate-400 hover:text-blue-600 shadow-sm transition-all"><Printer size={20} /></button>
                   <button onClick={() => setViewingVendorId(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={36} /></button>
                </div>
             </div>

             {/* Ledger Summary Bar */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 py-6 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Purchased</p>
                   <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(activeVendorStats.totalPurchases)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Paid</p>
                   <p className="text-lg font-black text-emerald-600">{formatCurrency(activeVendorStats.totalPaid)}</p>
                </div>
                <div className="bg-[#003366] p-4 rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none">
                   <p className="text-[9px] font-black text-white/50 uppercase mb-1">Current Payables</p>
                   <p className="text-lg font-black text-white">{formatCurrency(activeVendor.balance)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Engagement</p>
                   <p className="text-lg font-black text-blue-600">{activeVendorStats.activeProjectsCount} Hubs/Sites</p>
                </div>
             </div>

             <div className="px-8 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shrink-0">
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <input 
                    type="text" 
                    placeholder="Search ledger by date, site, material or reference..." 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                    value={ledgerSearchTerm}
                    onChange={(e) => setLedgerSearchTerm(e.target.value)}
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto no-scrollbar p-0 sm:p-8 bg-slate-50/20 dark:bg-slate-950/20">
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                   <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                         <tr>
                            <th className="px-8 py-5">Value Date</th>
                            <th className="px-8 py-5">Activity Details</th>
                            <th className="px-8 py-5">Hub / Project</th>
                            <th className="px-8 py-5 text-right">Debit (Purchase)</th>
                            <th className="px-8 py-5 text-right">Credit (Payment)</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                         {filteredCombinedLedger.length > 0 ? filteredCombinedLedger.map((item, idx) => (
                           <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${item.type === 'PURCHASE' ? 'bg-red-50 text-red-600 dark:bg-red-900/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10'}`}>
                                       {item.type === 'PURCHASE' ? <ShoppingCart size={14} /> : <ArrowDownCircle size={14} />}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase leading-none mb-1">{item.description}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ref: {item.reference}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-2">
                                    <Briefcase size={12} className="text-blue-500" />
                                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">{item.type === 'PAYMENT' ? (item as any).siteDisplay : projects.find(p => p.id === item.projectId)?.name || 'General'}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 {item.type === 'PURCHASE' ? <span className="text-sm font-black text-red-600">{formatCurrency(item.amount)}</span> : <span className="text-slate-300">--</span>}
                              </td>
                              <td className="px-8 py-5 text-right">
                                 {item.type === 'PAYMENT' ? <span className="text-sm font-black text-emerald-600">{formatCurrency(item.amount)}</span> : <span className="text-slate-300">--</span>}
                              </td>
                           </tr>
                         )) : (
                            <tr>
                               <td colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase text-xs tracking-widest italic">No matching entries found in this ledger</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>

             <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ledger Auto-Synced</span>
                </div>
                <button onClick={() => setViewingVendorId(null)} className="px-10 py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close Statement</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
