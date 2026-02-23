import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Receipt, CreditCard, Calendar, X, Briefcase, Users, DollarSign, Tag, ChevronDown, Pencil, Trash2, Package, AlertCircle, RefreshCw, ShoppingCart, ArrowRightLeft, CheckCircle2, Landmark, Scale, Info, Search, Filter, LayoutGrid, ArrowUpRight, ToggleLeft, ToggleRight, Lock
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Expense, PaymentMethod, Material, Payment } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const ExpenseTracker: React.FC = () => {
  const { expenses, projects, vendors, materials, tradeCategories, addExpense, updateExpense, deleteExpense, allowDecimalStock } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [trackStock, setTrackStock] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  const [formData, setFormData] = useState({
    projectId: projects[0]?.id || '', 
    vendorId: '', 
    date: new Date().toISOString().split('T')[0], 
    amount: '', 
    notes: '', 
    category: 'Material', 
    paymentMethod: 'Bank' as PaymentMethod,
    materialId: '',
    materialQuantity: ''
  });

  // Filtered Expenses Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const mat = exp.materialId ? materials.find(m => m.id === exp.materialId) : null;
      const vendor = exp.vendorId ? vendors.find(v => v.id === exp.vendorId) : null;
      const project = projects.find(p => p.id === exp.projectId);
      
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        exp.notes.toLowerCase().includes(search) ||
        (mat?.name || '').toLowerCase().includes(search) ||
        (vendor?.name || '').toLowerCase().includes(search) ||
        (project?.name || '').toLowerCase().includes(search) ||
        exp.category.toLowerCase().includes(search);
      
      const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
      const matchesProject = projectFilter === 'All' || exp.projectId === projectFilter;

      return matchesSearch && matchesCategory && matchesProject;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, categoryFilter, projectFilter, materials, vendors, projects]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Auto-sync amount if material quantity changes during edit for inventory entries
  useEffect(() => {
    if (editingExpense?.materialId && formData.materialQuantity && trackStock) {
      const mat = materials.find(m => m.id === (formData.materialId.split('|')[0]));
      if (mat) {
        const qty = parseFloat(formData.materialQuantity) || 0;
        const newAmount = qty * (editingExpense.unitPrice || mat.costPerUnit);
        setFormData(prev => ({ ...prev, amount: newAmount.toFixed(2) }));
      }
    }
  }, [formData.materialQuantity, editingExpense, materials, formData.materialId, trackStock]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setEditingExpense(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const selectedMaterial = useMemo(() => 
    materials.find(m => m.id === formData.materialId.split('|')[0]), [materials, formData.materialId]
  );

  const isPurchase = useMemo(() => !!formData.vendorId, [formData.vendorId]);

  const siteSpecificInventory = useMemo(() => {
    if (!formData.projectId) return [];
    const results: any[] = [];

    materials.forEach(m => {
      const history = m.history || [];
      const purchaseEntries = history.filter(h => h.type === 'Purchase');
      
      if (isPurchase) {
        results.push({ id: m.id, name: m.name, unit: m.unit, display: m.name });
        return;
      }

      purchaseEntries.forEach(purchase => {
        const batchId = purchase.id.replace('sh-exp-', '');
        const usagesAgainstThisBatch = history.filter(h => h.type === 'Usage' && h.parentPurchaseId === batchId);
        const totalUsedFromBatch = usagesAgainstThisBatch.reduce((sum, u) => sum + Math.abs(u.quantity), 0);
        const availableInBatch = purchase.quantity - totalUsedFromBatch;

        if (availableInBatch > 0) {
          const vendor = vendors.find(v => v.id === purchase.vendorId);
          const vName = vendor?.name || 'Standard Supplier';
          const price = purchase.unitPrice || m.costPerUnit;
          
          results.push({
            id: m.id,
            name: m.name,
            unit: m.unit,
            batchId: batchId,
            vendorId: purchase.vendorId,
            isLocal: purchase.projectId === formData.projectId,
            display: `${m.name} / ${vName} / ${formatCurrency(price)} / ${availableInBatch.toLocaleString()} ${m.unit}`
          });
        }
      });
    });

    if (isPurchase) return results.sort((a, b) => a.name.localeCompare(b.name));
    return results.sort((a, b) => (a.isLocal === b.isLocal ? 0 : a.isLocal ? -1 : 1));
  }, [materials, formData.projectId, isPurchase, vendors]);

  const handleCreateOrUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let parentId = editingExpense?.parentPurchaseId;
    if (trackStock && formData.category === 'Material' && formData.materialId && formData.materialQuantity && !isPurchase) {
       const selection = (siteSpecificInventory as any[]).find(s => 
         (s.id + '|' + s.batchId) === formData.materialId || s.id === formData.materialId
       );
       if (selection && selection.batchId) {
         parentId = selection.batchId;
       }
    }

    const finalMaterialId = trackStock ? formData.materialId.split('|')[0] : undefined;
    const finalQuantity = trackStock ? (formData.materialId ? parseFloat(formData.materialQuantity) || undefined : undefined) : undefined;

    const expData: Expense = {
      id: editingExpense ? editingExpense.id : 'e' + Date.now(),
      date: formData.date,
      projectId: formData.projectId,
      vendorId: formData.vendorId || undefined,
      amount: parseFloat(formData.amount) || 0,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || 'General Expense',
      category: formData.category,
      materialId: finalMaterialId,
      materialQuantity: finalQuantity,
      inventoryAction: editingExpense?.inventoryAction || (trackStock ? (isPurchase ? 'Purchase' : 'Usage') : undefined),
      parentPurchaseId: trackStock ? parentId : undefined
    };

    if (editingExpense) {
      await updateExpense(expData);
    } else {
      await addExpense(expData);
    }

    setShowModal(false);
    setEditingExpense(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      projectId: projects[0]?.id || '', 
      vendorId: '', 
      date: new Date().toISOString().split('T')[0], 
      amount: '', 
      notes: '', 
      category: 'Material', 
      paymentMethod: 'Bank',
      materialId: '',
      materialQuantity: ''
    });
    setTrackStock(false);
  };

  const openEdit = (e: Expense) => {
    setEditingExpense(e);
    setTrackStock(!!e.materialId);
    setFormData({
      projectId: e.projectId, 
      vendorId: e.vendorId || '', 
      date: e.date, 
      amount: e.amount.toString(), 
      notes: e.notes, 
      category: e.category, 
      paymentMethod: e.paymentMethod,
      materialId: e.parentPurchaseId ? `${e.materialId}|${e.parentPurchaseId}` : e.materialId || '',
      materialQuantity: e.materialQuantity ? Math.abs(e.materialQuantity).toString() : ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this expense record? Associated vendor balance and material stock levels will be restored.")) {
      deleteExpense(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Financial Ledger</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Record expenditures and trigger stock arrivals.</p>
        </div>
        <button 
          onClick={() => { setEditingExpense(null); resetForm(); setShowModal(true); }} 
          className="w-full sm:w-auto bg-[#003366] text-white px-6 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest"
        >
          <Plus size={20} />
          Record Expense
        </button>
      </div>

      {/* Deep Search & Filters Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
         <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Deep Search in Ledger..." 
              className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-[1.5rem] text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2">
            <div className="relative flex-1">
               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <select className="w-full pl-9 pr-4 py-3.5 sm:py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-[1.2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest outline-none appearance-none dark:text-white" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="All">All Categories</option>
                  {tradeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
               </select>
            </div>
            <div className="relative flex-1">
               <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <select className="w-full pl-9 pr-4 py-3.5 sm:py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-[1.2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest outline-none appearance-none dark:text-white" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
                  <option value="All">All Sites</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
            </div>
         </div>
         <div className="bg-slate-900 dark:bg-slate-800 p-3 sm:p-4 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-between text-white shadow-lg">
            <div>
               <p className="text-[7px] sm:text-[8px] font-black text-white/50 uppercase tracking-widest">Filtered Total</p>
               <p className="text-base sm:text-lg font-black">{formatCurrency(filteredTotal)}</p>
            </div>
            <div className="p-2 bg-white/10 rounded-xl"><ArrowUpRight size={18} /></div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-8 py-5">Value Date</th>
                <th className="px-8 py-5">Ledger Entry Details</th>
                <th className="px-8 py-5 text-center">Quantity</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5 text-right">Amount</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredExpenses.length > 0 ? filteredExpenses.map((exp) => {
                const mat = exp.materialId ? materials.find(m => m.id === exp.materialId) : null;
                const vendor = exp.vendorId ? vendors.find(v => v.id === exp.vendorId) : null;
                const isMaterialPurchase = exp.category === 'Material' && exp.vendorId;
                const isCompleted = projects.find(p => p.id === exp.projectId)?.status === 'Completed';
                return (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          {mat ? `${mat.name} (${mat.unit})` : exp.notes || exp.category}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          Supplier: {vendor?.name || 'Self / Direct Site Cost'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter truncate max-w-[120px] flex items-center gap-1">
                            <Briefcase size={10} className="text-blue-500" />
                            {projects.find(p => p.id === exp.projectId)?.name || 'General'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                       {exp.materialQuantity ? (
                         <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${exp.inventoryAction === 'Purchase' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                           {Math.abs(exp.materialQuantity).toLocaleString()} {mat?.unit || ''}
                         </span>
                       ) : <span className="text-slate-300">--</span>}
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className="text-sm font-black text-red-600">{formatCurrency(exp.amount)}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1 items-center">
                        {!isCompleted ? (
                          <>
                            <button onClick={() => openEdit(exp)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all shadow-sm" title="Edit Record"><Pencil size={18} /></button>
                            <button onClick={() => handleDelete(exp.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all shadow-sm"><Trash2 size={18} /></button>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg" title="Project Completed - Locked"><Lock size={12} /> Locked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                   <td colSpan={6} className="px-8 py-20 text-center">
                      <LayoutGrid size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No entries match your deep search</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 shrink-0">
              <div className="flex gap-4 items-center">
                 <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg">
                    <Receipt size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{editingExpense ? 'Modify Entry' : 'Record Expenditure'}</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{isPurchase ? 'Adding to stock inventory' : 'Deducting from purchased stock'}</p>
                 </div>
              </div>
              <button onClick={() => { setShowModal(false); setEditingExpense(null); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleCreateOrUpdateExpense} className="p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Project Site</label>
                   <select 
                    disabled={!!editingExpense?.materialId}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none disabled:opacity-50" 
                    value={formData.projectId} 
                    onChange={(e) => setFormData(p => ({ ...p, projectId: e.target.value, materialId: '' }))}
                    required
                  >
                    <option value="" disabled>Select site...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cost Category</label>
                   <select 
                    disabled={!!editingExpense?.materialId}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none disabled:opacity-50" 
                    value={formData.category} 
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value, materialId: '' }))}
                  >
                    {tradeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              {formData.category === 'Material' && (
                <div className={`p-6 rounded-[2rem] border space-y-4 transition-colors ${trackStock ? (isPurchase ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200') : 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-200'}`}>
                   <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isPurchase ? <ShoppingCart size={16} className="text-emerald-600" /> : <Package size={16} className="text-blue-600" />}
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Stock Stream Detail</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase text-slate-400">Inventory Tracking</span>
                        <button 
                          type="button"
                          onClick={() => setTrackStock(!trackStock)}
                          className={`p-1 transition-all rounded-lg ${trackStock ? 'text-blue-600' : 'text-slate-300'}`}
                        >
                          {trackStock ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                      </div>
                   </div>
                   
                   {trackStock && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 block">Material Source (Batch Wise)</label>
                        <select 
                          disabled={!!editingExpense?.materialId}
                          className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs dark:text-white outline-none disabled:opacity-50"
                          value={formData.materialId}
                          onChange={e => setFormData(p => ({ ...p, materialId: e.target.value }))}
                          required={trackStock}
                        >
                           <option value="">Choose asset / batch...</option>
                           {siteSpecificInventory.map((m: any, idx: number) => (
                             <option key={idx} value={m.batchId ? `${m.id}|${m.batchId}` : m.id} className={m.isLocal ? 'text-emerald-600 font-bold' : ''}>
                               {m.display}
                             </option>
                           ))}
                        </select>
                        {formData.materialId && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="space-y-1">
                               <label className="text-[9px] font-black text-slate-400 uppercase px-1">Update Quantity ({selectedMaterial?.unit})</label>
                               <input 
                                type="number" 
                                step={allowDecimalStock ? "0.01" : "1"} 
                                className="w-full px-5 py-3 bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-400 rounded-xl font-black outline-none focus:ring-4 focus:ring-blue-500/10" 
                                placeholder="0.00"
                                value={formData.materialQuantity}
                                onChange={e => setFormData(p => ({ ...p, materialQuantity: e.target.value }))}
                                required={trackStock}
                               />
                             </div>
                             <div className="flex flex-col justify-center bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 px-1">Current Sync Impact</p>
                                <p className="text-base font-black text-slate-900 dark:text-white truncate">
                                  {formatCurrency(parseFloat(formData.amount) || 0)}
                                </p>
                             </div>
                          </div>
                        )}
                     </div>
                   )}
                   {!trackStock && (
                      <p className="text-[9px] text-slate-400 font-medium italic">Inventory tracking is disabled for this record. Use the toggle above to enable automated stock adjustment.</p>
                   )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Billing Vendor</label>
                   <select disabled={!!editingExpense?.materialId} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none disabled:opacity-50" value={formData.vendorId} onChange={(e) => setFormData(p => ({ ...p, vendorId: e.target.value }))}>
                    <option value="">Self / Direct Site Cost</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Settlement Method</label>
                   <div className="grid grid-cols-3 gap-2">
                     {(['Bank', 'Cash', 'Online'] as PaymentMethod[]).map(m => (
                       <button
                         key={m} type="button"
                         disabled={!!editingExpense?.materialId}
                         onClick={() => setFormData(p => ({ ...p, paymentMethod: m }))}
                         className={`py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${formData.paymentMethod === m ? 'bg-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 disabled:opacity-50'}`}
                       >{m}</button>
                     ))}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Expense Date</label>
                  <input type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Bill Amount (Rs.)</label>
                  <input 
                    type="number" 
                    readOnly={!!editingExpense?.materialId && trackStock}
                    step="0.01" 
                    placeholder="0.00" 
                    className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none ${editingExpense?.materialId && trackStock ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    value={formData.amount} 
                    onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description / Memo</label>
                <textarea rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Detail about this expense..."></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingExpense(null); }} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 py-4 rounded-[1.5rem] font-black shadow-2xl transition-all active:scale-95 text-sm uppercase tracking-widest bg-red-600 text-white shadow-red-100 dark:shadow-none">Authorize Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
