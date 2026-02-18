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
  Map
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

  // Clear ledger search when closing or changing vendor
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

  const vendorSupplies = useMemo(() => {
    if (!activeVendor) return [];
    const supplyList: any[] = [];
    materials.forEach(mat => {
      if (mat.history) {
        mat.history.forEach(h => {
          if (h.type === 'Purchase' && h.vendorId === activeVendor.id) {
            supplyList.push({ 
              ...h, 
              materialName: mat.name, 
              unit: mat.unit,
              unitPrice: h.unitPrice || mat.costPerUnit,
              estimatedValue: h.quantity * (h.unitPrice || mat.costPerUnit)
            });
          }
        });
      }
    });
    return supplyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeVendor, materials]);

  const filteredVendorSupplies = useMemo(() => {
    if (!ledgerSearchTerm) return vendorSupplies;
    const search = ledgerSearchTerm.toLowerCase();
    return vendorSupplies.filter(s => 
      s.materialName.toLowerCase().includes(search) ||
      (projects.find(p => p.id === s.projectId)?.name || '').toLowerCase().includes(search)
    );
  }, [vendorSupplies, ledgerSearchTerm, projects]);

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
      const totalPaidForBatch = payments
        .filter(p => p.materialBatchId === s.id)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const isFullyPaid = totalPaidForBatch >= (s.estimatedValue - 0.01);
      const remaining = Math.max(0, s.estimatedValue - totalPaidForBatch);

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
        remainingBalance: remaining
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

  const filteredVendorPayments = useMemo(() => {
    const basePayments = payments.filter(p => p.vendorId === activeVendor?.id && !p.isAllocation);
    if (!ledgerSearchTerm) return basePayments;
    
    const search = ledgerSearchTerm.toLowerCase();
    return basePayments.filter(pay => {
      const expenseId = pay.materialBatchId?.replace('sh-exp-', '');
      const linkedExpense = expenseId ? expenses.find(e => e.id === expenseId) : null;
      const materialName = linkedExpense?.materialId ? materials.find(m => m.id === linkedExpense.materialId)?.name : '';
      const displayLabel = materialName || "Master Settlement";

      return displayLabel.toLowerCase().includes(search) ||
             pay.method.toLowerCase().includes(search) ||
             (pay.reference || '').toLowerCase().includes(search);
    });
  }, [payments, activeVendor, ledgerSearchTerm, expenses, materials]);

  const handleOpenPaymentModal = (vendor: Vendor, prefillProjectId?: string, prefillAmount?: number, materialBatchId?: string) => {
    setSelectedVendorForPayment(vendor);
    setEditingPaymentRecord(null);
    setContextualMaxLimit(prefillAmount || null);
    
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

  const handleOpenEditPaymentModal = (pay: Payment) => {
    const vendor = vendors.find(v => v.id === pay.vendorId);
    if (!vendor) return;
    
    if (pay.materialBatchId) {
      const batch = vendorSupplies.find(s => s.id === pay.materialBatchId);
      if (batch) {
        const otherPaymentsForBatch = payments
          .filter(p => p.materialBatchId === pay.materialBatchId && p.id !== pay.id)
          .reduce((sum, p) => sum + p.amount, 0);
        setContextualMaxLimit(batch.estimatedValue - otherPaymentsForBatch);
      }
    } else {
      setContextualMaxLimit(null);
    }

    setSelectedVendorForPayment(vendor);
    setEditingPaymentRecord(pay);
    setPaymentFormData({
      projectId: pay.projectId,
      amount: pay.amount.toString(),
      method: pay.method,
      date: pay.date,
      reference: pay.reference || '',
      materialBatchId: pay.materialBatchId || ''
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
    
    const paymentId = editingPaymentRecord ? editingPaymentRecord.id : 'pay' + Date.now();
    const paymentData: Payment = {
      id: paymentId,
      date: paymentFormData.date,
      vendorId: selectedVendorForPayment.id,
      projectId: paymentFormData.projectId || projects[0]?.id || 'godown-001',
      amount: amountNum,
      method: paymentFormData.method,
      reference: paymentFormData.reference,
      materialBatchId: paymentFormData.materialBatchId || undefined,
      isAllocation: false
    };

    if (editingPaymentRecord) {
      await updatePayment(paymentData);
    } else {
      await addPayment(paymentData);
    }
    
    setShowPaymentModal(false);
    setSelectedVendorForPayment(null);
    setEditingPaymentRecord(null);
    setContextualMaxLimit(null);
  };

  const handleDeleteVendor = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteVendor(id);
    }
  };

  const handleDeletePaymentRecord = async (id: string) => {
    if (confirm("Delete this payment record? Vendor balance and adjustments will be restored.")) {
      await deletePayment(id);
    }
  };

  const getLastPayment = (vendorId: string) => {
    const vPayments = payments.filter(p => p.vendorId === vendorId && !p.isAllocation);
    if (vPayments.length === 0) return null;
    return [...vPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Supplier Registry</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor outstanding balances and site engagements.</p>
        </div>
        <button 
          onClick={() => { setEditingVendor(null); setShowModal(true); setFormData({ name: '', phone: '', category: tradeCategories[0] || 'Material', address: '', balance: '' }); }}
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
                const lastPay = getLastPayment(vendor.id);
                const vendorPayments = payments.filter(p => p.vendorId === vendor.id && !p.isAllocation);
                const vendorSupplies_local: any[] = [];
                materials.forEach(m => m.history?.forEach(h => {
                  if (h.type === 'Purchase' && h.vendorId === vendor.id) vendorSupplies_local.push(h);
                }));
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
                              <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
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
                          className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all"
                          title="Full Ledger"
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

      {/* Modern Payment Modal */}
      {showPaymentModal && selectedVendorForPayment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/20 dark:bg-emerald-900/10">
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
               {paymentFormData.materialBatchId && (
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-center gap-4 animate-in slide-in-from-top-2">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl">
                       <ShoppingCart size={20} />
                    </div>
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Settling Linked Bill</p>
                       <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                         {materials.find(m => m.history?.some(h => h.id === paymentFormData.materialBatchId))?.name || 'Stock Inward Bill'}
                       </h4>
                    </div>
                    <Link size={16} className="text-blue-300" />
                 </div>
               )}

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

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement Amount</label>
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
                         className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${paymentFormData.method === m ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-500'}`}
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

      {/* Vendor Ledger Modal */}
      {activeVendor && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-6xl h-[92vh] shadow-2xl overflow-hidden flex flex-col mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-800 shrink-0">
               <div className="flex gap-4 items-center">
                 <div className="w-16 h-16 bg-blue-600 text-white rounded-[1.8rem] flex items-center justify-center font-black text-3xl shadow-xl">{activeVendor.name.charAt(0)}</div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Supplier Ledger</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeVendor.name} • {activeVendor.category} Statement</p>
                 </div>
               </div>

               <div className="flex flex-wrap items-center gap-3">
                 <div className="bg-blue-50 dark:bg-blue-900/20 px-5 py-3 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <p className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Active Sites</p>
                    <div className="flex items-center gap-2">
                       <Building2 size={14} className="text-blue-600" />
                       <p className="text-sm font-black text-blue-700 dark:text-blue-300">{activeVendorStats.activeProjectsCount} Projects</p>
                    </div>
                 </div>
                 <div className="bg-emerald-50 dark:bg-emerald-900/20 px-5 py-3 rounded-2xl border border-emerald-100">
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Total Paid</p>
                    <div className="flex items-center gap-2">
                       <CheckCircle2 size={14} className="text-emerald-600" />
                       <p className="text-sm font-black text-emerald-700 dark:text-blue-300">{formatCurrency(activeVendorStats.totalPaid)}</p>
                    </div>
                 </div>
                 <div className="bg-rose-50 dark:bg-rose-900/20 px-5 py-3 rounded-2xl border border-rose-100">
                    <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-0.5">Dues Pending</p>
                    <div className="flex items-center gap-2">
                       <AlertCircle size={14} className="text-rose-600" />
                       <p className="text-sm font-black text-rose-700 dark:text-blue-300">{formatCurrency(activeVendor.balance)}</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingVendorId(null)} className="p-3 text-slate-400 hover:text-slate-900 transition-colors"><X size={36} /></button>
               </div>
            </div>

            <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 px-4">
               <button onClick={() => setActiveDetailTab('statement')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeDetailTab === 'statement' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-4 border-blue-600' : 'text-slate-400'}`}>Full Statement</button>
               <button onClick={() => setActiveDetailTab('payments')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeDetailTab === 'payments' ? 'bg-white dark:bg-slate-800 text-emerald-600 border-b-4 border-emerald-600' : 'text-slate-400'}`}>Settlements (Detail)</button>
               <button onClick={() => setActiveDetailTab('supplies')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeDetailTab === 'supplies' ? 'bg-white dark:bg-slate-800 text-amber-600 border-b-4 border-amber-600' : 'text-slate-400'}`}>Stock Inward</button>
            </div>

            {/* NEW: Deep Search Bar for Ledger */}
            <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-700 shrink-0">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder={`Deep Search in ${activeDetailTab === 'statement' ? 'Statement' : activeDetailTab === 'payments' ? 'Settlements' : 'Stock Inward'}...`}
                    className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={ledgerSearchTerm}
                    onChange={(e) => setLedgerSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/20 dark:bg-slate-900/10 no-scrollbar">
               <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                 <div className="overflow-x-auto no-scrollbar">
                   {activeDetailTab === 'statement' ? (
                      <table className="w-full text-left min-w-[850px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-5">Value Date</th>
                            <th className="px-8 py-5">Transaction Details</th>
                            <th className="px-8 py-5">Associated Site</th>
                            <th className="px-8 py-5 text-right">Debit (Bill)</th>
                            <th className="px-8 py-5 text-right">Credit (Paid)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {filteredCombinedLedger.map((item, idx) => (
                            <tr key={`${item.type}-${item.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                               <td className="px-8 py-5 text-[11px] font-bold text-slate-500 dark:text-slate-400">{new Date(item.date).toLocaleDateString('en-IN')}</td>
                               <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                     <div className={`p-2 rounded-xl ${item.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {item.type === 'PAYMENT' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                     </div>
                                     <div>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{item.description}</p>
                                        {item.type === 'PURCHASE' && item.unitPrice && (
                                          <p className="text-[9px] font-bold text-blue-600 uppercase">Rate: {formatCurrency(item.unitPrice)}</p>
                                        )}
                                        <span className={`text-[8px] font-black uppercase ${item.type === 'PAYMENT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                           {item.type === 'PAYMENT' ? 'Settlement' : 'Stock Arrival'}
                                        </span>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                  {item.type === 'PAYMENT' ? (item as any).siteDisplay : (projects.find(p => p.id === item.projectId)?.name || 'General Office')}
                               </td>
                               <td className="px-8 py-5 text-right font-black text-rose-600 text-sm">{item.type === 'PURCHASE' ? formatCurrency(item.amount) : '--'}</td>
                               <td className="px-8 py-5 text-right font-black text-emerald-600 text-sm">{item.type === 'PAYMENT' ? formatCurrency(item.amount) : '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   ) : activeDetailTab === 'payments' ? (
                      <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-5">Value Date</th>
                            <th className="px-8 py-5">Entry Type</th>
                            <th className="px-8 py-5">Ref / Mode</th>
                            <th className="px-8 py-5 text-right">Amount</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {filteredVendorPayments.map(pay => {
                            const allocations = payments.filter(a => a.masterPaymentId === pay.id);
                            const isExpanded = expandedSettlements[pay.id];
                            const expenseId = pay.materialBatchId?.replace('sh-exp-', '');
                            const linkedExpense = expenseId ? expenses.find(e => e.id === expenseId) : null;
                            const materialName = linkedExpense?.materialId ? materials.find(m => m.id === linkedExpense.materialId)?.name : null;
                            const displayLabel = materialName || "Master Settlement";

                            return (
                              <React.Fragment key={pay.id}>
                                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                  <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(pay.date).toLocaleDateString()}</td>
                                  <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{displayLabel}</p>
                                      {allocations.length > 0 && (
                                        <button 
                                          onClick={() => toggleSettlement(pay.id)}
                                          className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase"
                                        >
                                          {allocations.length} Adjustments {isExpanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">{pay.method}</span>
                                      <span className="text-[9px] font-mono text-slate-400">{pay.reference || '--'}</span>
                                    </div>
                                  </td>
                                  <td className="px-8 py-5 text-sm font-black text-emerald-600 text-right">{formatCurrency(pay.amount)}</td>
                                  <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => handleOpenEditPaymentModal(pay)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={16} /></button>
                                      <button onClick={() => handleDeletePaymentRecord(pay.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && allocations.map(alc => {
                                   const matName = materials.find(m => m.history?.some(h => h.id === alc.materialBatchId))?.name;
                                   return (
                                     <tr key={alc.id} className="bg-slate-50/30 dark:bg-slate-900/30 border-l-4 border-blue-500">
                                       <td className="px-8 py-3 text-[10px] text-slate-400 italic">Adjusted</td>
                                       <td className="px-8 py-3" colSpan={2}>
                                          <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase">
                                             <ArrowRight size={10}/> {matName ? matName : alc.reference}
                                          </div>
                                       </td>
                                       <td className="px-8 py-3 text-xs font-black text-slate-500 text-right">{formatCurrency(alc.amount)}</td>
                                       <td></td>
                                     </tr>
                                   );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                   ) : (
                      <table className="w-full text-left min-w-[950px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-5">Arrival Date</th>
                            <th className="px-8 py-5">Stock Description</th>
                            <th className="px-8 py-5">Target Site</th>
                            <th className="px-8 py-5 text-right">Bill Value</th>
                            <th className="px-8 py-5 text-right">Amount Paid</th>
                            <th className="px-8 py-5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {filteredVendorSupplies.map((supply, idx) => {
                            const totalPaidForBatch = payments.filter(p => p.materialBatchId === supply.id).reduce((sum, p) => sum + p.amount, 0);
                            const isFullyPaid = totalPaidForBatch >= (supply.estimatedValue - 0.01);
                            const remainingOnRow = Math.max(0, supply.estimatedValue - totalPaidForBatch);
                            const targetProject = projects.find(p => p.id === supply.projectId);
                            
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(supply.date).toLocaleDateString()}</td>
                                <td className="px-8 py-5">
                                  <p className="font-black text-[11px] text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                    {supply.materialName} ({supply.quantity.toLocaleString()} {supply.unit})
                                  </p>
                                  <p className="text-[9px] font-bold text-blue-600 uppercase">Rate: {formatCurrency(supply.unitPrice)}</p>
                                </td>
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                      <MapPin size={10} className="text-blue-500" />
                                      {targetProject?.name || 'Central Office'}
                                   </div>
                                </td>
                                <td className="px-8 py-5 text-[12px] font-black text-rose-600 text-right">{formatCurrency(supply.estimatedValue)}</td>
                                <td className="px-8 py-5 text-right font-black text-emerald-600 text-[11px]">{formatCurrency(totalPaidForBatch)}</td>
                                <td className="px-8 py-5 text-right">
                                  <button 
                                    disabled={isFullyPaid} 
                                    onClick={() => handleOpenPaymentModal(activeVendor, supply.projectId, remainingOnRow, supply.id)} 
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ml-auto flex items-center gap-1.5 ${isFullyPaid ? 'bg-emerald-50 text-emerald-600 cursor-not-allowed border border-emerald-100' : 'bg-rose-600 text-white shadow-md active:scale-95'}`}
                                  >
                                    {isFullyPaid ? <><CheckCircle2 size={12}/> Settled</> : `Pay ${formatCurrency(remainingOnRow)}`}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                   )}
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{editingVendor ? 'Edit Supplier Profile' : 'Register New Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const vendorData: Vendor = {
                id: editingVendor ? editingVendor.id : 'v' + Date.now(),
                name: formData.name,
                phone: formData.phone,
                category: formData.category,
                address: formData.address,
                balance: parseFloat(formData.balance) || 0
              };
              if (editingVendor) updateVendor(vendorData); else addVendor(vendorData);
              setShowModal(false);
              setEditingVendor(null);
            }} className="p-8 space-y-6 pb-safe">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Legal Entity Name</label>
                <input type="text" placeholder="e.g. Acme Construction Supplies" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Trade Specialty</label>
                   <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}>
                     {tradeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Opening Dues (Rs.)</label>
                   <input type="number" placeholder="0.00" disabled={editingVendor ? payments.some(p => p.vendorId === editingVendor.id) || expenses.some(e => e.vendorId === editingVendor.id) : false} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.balance} onChange={(e) => setFormData(p => ({ ...p, balance: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Official Contact #</label>
                <input type="tel" placeholder="+91 00000 00000" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Business Registered Address</label>
                <textarea placeholder="Full address details..." className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} rows={2} required />
              </div>
              <div className="flex gap-4 pt-6">
                 <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-slate-500">Discard</button>
                 <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-[1.5rem] font-black shadow-xl transition-all active:scale-95 text-[10px] uppercase tracking-widest">
                    {editingVendor ? 'Save Changes' : 'Confirm Registration'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
