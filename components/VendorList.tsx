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
import { VendorLedgerModal } from './VendorLedgerModal';
import { SupplierPayments } from './SupplierPayments';

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
    name: '', phone: '', email: '', category: tradeCategories[0] || 'Material', address: '', balance: ''
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
    setFormData({ name: '', phone: '', email: '', category: tradeCategories[0] || 'Material', address: '', balance: '' });
    setShowModal(true);
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendorData: Vendor = {
      id: editingVendor ? editingVendor.id : 'v' + Date.now(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
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
                                  setFormData({ 
                                    name: vendor.name, 
                                    phone: vendor.phone, 
                                    email: vendor.email || '',
                                    category: vendor.category, 
                                    address: vendor.address, 
                                    balance: vendor.balance.toString() 
                                  });
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
                       <label className="text-[10px] font-black uppercase text-slate-400 px-1">Email Address</label>
                       <input type="email" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="supplier@example.com" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Category</label>
                    <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                       {tradeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
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
        <SupplierPayments 
          selectedVendorForPayment={selectedVendorForPayment}
          editingPaymentRecord={editingPaymentRecord}
          paymentFormData={paymentFormData}
          setPaymentFormData={setPaymentFormData}
          outstandingBills={outstandingBills}
          showManualAllocations={showManualAllocations}
          setShowManualAllocations={setShowManualAllocations}
          manualAllocations={manualAllocations}
          setManualAllocations={setManualAllocations}
          totalAllocatedSum={totalAllocatedSum}
          contextualMaxLimit={contextualMaxLimit}
          projects={projects}
          onClose={() => { setShowPaymentModal(false); setSelectedVendorForPayment(null); setEditingPaymentRecord(null); setContextualMaxLimit(null); }}
          onSubmit={handleRecordPayment}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Vendor Full Ledger Modal */}
      {viewingVendorId && activeVendor && (
        <VendorLedgerModal 
          activeVendor={activeVendor}
          activeVendorStats={activeVendorStats}
          ledgerSearchTerm={ledgerSearchTerm}
          setLedgerSearchTerm={setLedgerSearchTerm}
          filteredCombinedLedger={filteredCombinedLedger}
          projects={projects}
          onClose={() => setViewingVendorId(null)}
          formatCurrency={formatCurrency}
          onPayBalance={handleOpenPaymentModal}
        />
      )}
    </div>
  );
};
