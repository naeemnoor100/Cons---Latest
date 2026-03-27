import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Receipt, X, Briefcase, Pencil, Trash2, Package, ShoppingCart, Search, Filter, LayoutGrid, ArrowUpRight, ToggleLeft, ToggleRight, FileText, Trash, ClipboardPaste
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Expense, PaymentMethod } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const ExpenseTracker: React.FC = () => {
  const { expenses, projects, vendors, materials, tradeCategories, addExpense, addExpenses, updateExpense, deleteExpense, allowDecimalStock, isProjectLocked, currentUser, addTradeCategory } = useApp();
  
  const canCreateExpenses = currentUser.permissions?.['expenses']?.includes('create');
  const canEditExpenses = currentUser.permissions?.['expenses']?.includes('edit');
  const canDeleteExpenses = currentUser.permissions?.['expenses']?.includes('delete');
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [trackStock, setTrackStock] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  const [formData, setFormData] = useState({
    projectId: projects.find(p => !p.isDeleted)?.id || '', 
    vendorId: '', 
    date: new Date().toISOString().split('T')[0], 
    amount: '', 
    notes: '', 
    category: 'Material', 
    paymentMethod: 'Bank' as PaymentMethod,
    materialId: '',
    materialQuantity: ''
  });

  // Bulk Entry State
  const [bulkRows, setBulkRows] = useState<{ id: number; date: string; projectId: string; vendorId: string; category: string; amount: string; notes: string; paymentMethod: string }[]>([]);
  const [bulkDefaults] = useState({
    date: new Date().toISOString().split('T')[0],
    projectId: projects.find(p => !p.isDeleted)?.id || '',
    vendorId: '',
    category: 'Material',
    paymentMethod: 'Bank' as PaymentMethod
  });

  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const processPasteData = () => {
    if (!pasteText.trim()) return;
    
    const lines = pasteText.trim().split('\n');
    const newRows = lines.map((line, index) => {
      const cols = line.split('\t');
      
      // Expected format: Date, Project, Vendor, Amount, Notes
      const dateStr = cols[0]?.trim() || bulkDefaults.date;
      const projectName = cols[1]?.trim() || '';
      const vendorName = cols[2]?.trim() || '';
      const amount = cols[3]?.trim() || '';
      const notes = cols[4]?.trim() || '';
      
      // Match project by name or ID
      const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase() || p.id === projectName);
      const projectId = project ? project.id : bulkDefaults.projectId;
      
      // Match vendor by name or ID
      const vendor = vendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase() || v.id === vendorName);
      const vendorId = vendor ? vendor.id : bulkDefaults.vendorId;
      
      return {
        id: Date.now() + index,
        date: dateStr,
        projectId,
        vendorId,
        category: bulkDefaults.category,
        amount,
        notes,
        paymentMethod: bulkDefaults.paymentMethod
      };
    });
    
    setBulkRows(prev => {
      const existing = prev.filter(r => r.amount !== '');
      return [...existing, ...newRows];
    });
    setPasteText('');
    setShowPasteArea(false);
  };

  useEffect(() => {
    if (bulkRows.length === 0) {
      const initialRow = { 
        id: Date.now(), 
        date: bulkDefaults.date, 
        projectId: bulkDefaults.projectId, 
        vendorId: bulkDefaults.vendorId,
        category: bulkDefaults.category, 
        amount: '', 
        notes: '', 
        paymentMethod: bulkDefaults.paymentMethod 
      };
      const timer = setTimeout(() => {
        setBulkRows([initialRow]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [projects, bulkRows.length, bulkDefaults]);

  const addBulkRow = () => {
    setBulkRows(prev => [...prev, { 
      id: Date.now(), 
      date: bulkDefaults.date, 
      projectId: bulkDefaults.projectId, 
      vendorId: bulkDefaults.vendorId,
      category: bulkDefaults.category, 
      amount: '', 
      notes: '', 
      paymentMethod: bulkDefaults.paymentMethod 
    }]);
  };

  const removeBulkRow = (id: number) => {
    if (bulkRows.length > 1) {
      setBulkRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateBulkRow = (id: number, field: string, value: string) => {
    setBulkRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const clearAllBulkRows = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear All Rows',
      message: 'Are you sure you want to remove all entered rows? This action cannot be undone.',
      onConfirm: () => {
        setBulkRows([]);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const invalidRows = bulkRows.filter(r => parseFloat(r.amount) <= 0);
    if (invalidRows.length > 0) {
      alert("All expense amounts must be greater than zero. Please check your entries.");
      return;
    }

    const newExpenses: Expense[] = bulkRows.map(row => ({
      id: 'e' + Math.random().toString(36).substring(2, 9),
      date: row.date,
      projectId: row.projectId,
      vendorId: row.vendorId || undefined,
      amount: parseFloat(row.amount) || 0,
      paymentMethod: row.paymentMethod as PaymentMethod,
      notes: row.notes || 'Bulk Entry',
      category: row.category,
      inventoryAction: 'Purchase'
    }));
    
    if (newExpenses.length === 0) return;
    
    try {
      await addExpenses(newExpenses);
      setShowBulkModal(false);
      setBulkRows([{ 
        id: Date.now(), 
        date: bulkDefaults.date, 
        projectId: bulkDefaults.projectId, 
        vendorId: bulkDefaults.vendorId,
        category: bulkDefaults.category, 
        amount: '', 
        notes: '', 
        paymentMethod: bulkDefaults.paymentMethod 
      }]);
    } catch (err) {
      console.error('Bulk entry failed:', err);
    }
  };

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
  const handleQuantityChange = (qtyStr: string) => {
    setFormData(prev => {
      const newState = { ...prev, materialQuantity: qtyStr };
      if (trackStock && prev.materialId) {
        const [matId, batchId] = prev.materialId.split('|');
        const selection = siteSpecificInventory.find(s => s.id === matId && s.batchId === batchId);
        if (selection) {
          const qty = parseFloat(qtyStr) || 0;
          const unitPrice = selection.price || 0;
          const newAmount = qty * unitPrice;
          newState.amount = newAmount.toFixed(2);
        } else {
          // Fallback to general material price if not found in inventory
          const mat = materials.find(m => m.id === matId);
          if (mat) {
             const qty = parseFloat(qtyStr) || 0;
             const unitPrice = mat.costPerUnit || 0;
             const newAmount = qty * unitPrice;
             newState.amount = newAmount.toFixed(2);
          }
        }
      }
      return newState;
    });
  };

  const handleMaterialChange = (materialId: string) => {
    setFormData(prev => {
      const newState = { ...prev, materialId };
      if (trackStock && materialId) {
        const [matId, batchId] = materialId.split('|');
        const selection = siteSpecificInventory.find(s => s.id === matId && s.batchId === batchId);
        if (selection) {
          const qty = parseFloat(prev.materialQuantity) || 0;
          const unitPrice = selection.price || 0;
          const newAmount = qty * unitPrice;
          newState.amount = newAmount.toFixed(2);
        } else {
          // Fallback to general material price if not found in inventory
          const mat = materials.find(m => m.id === matId);
          if (mat) {
             const qty = parseFloat(prev.materialQuantity) || 0;
             const unitPrice = mat.costPerUnit || 0;
             const newAmount = qty * unitPrice;
             newState.amount = newAmount.toFixed(2);
          }
        }
      }
      return newState;
    });
  };

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

  interface InventorySelectionItem {
    id: string;
    name: string;
    unit: string;
    display: string;
    batchId?: string;
    vendorId?: string;
    isLocal?: boolean;
    price: number;
  }

  const siteSpecificInventory = (() => {
    if (!formData.projectId) return [];
    const results: InventorySelectionItem[] = [];

    materials.forEach(m => {
      const history = m.history || [];
      const purchaseEntries = history.filter(h => h.type === 'Purchase');
      
      if (isPurchase) {
        results.push({ id: m.id, name: m.name, unit: m.unit, display: m.name, price: m.costPerUnit });
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
            price: price,
            display: `${m.name} / ${vName} / ${formatCurrency(price)} / ${availableInBatch.toLocaleString()} ${m.unit}`
          });
        }
      });
    });

    const finalResults = isPurchase 
      ? [...results].sort((a, b) => a.name.localeCompare(b.name))
      : [...results].sort((a, b) => (a.isLocal === b.isLocal ? 0 : a.isLocal ? -1 : 1));
    return finalResults;
  })();

  const resetForm = useCallback(() => {
    setFormData({ 
      projectId: projects.find(p => !p.isDeleted)?.id || '', 
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
    setIsAddingCategory(false);
    setNewCategoryName('');
  }, [projects]);

  const handleCreateOrUpdateExpense = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    let parentId = editingExpense?.parentPurchaseId;
    let unitPrice = editingExpense?.unitPrice;
    if (trackStock && formData.category === 'Material' && formData.materialId && formData.materialQuantity && !isPurchase) {
       const selection = siteSpecificInventory.find(s => 
         (s.id + '|' + s.batchId) === formData.materialId || s.id === formData.materialId
       );
       if (selection && selection.batchId) {
         parentId = selection.batchId;
         unitPrice = selection.unitPrice;
       }
    }

    const finalMaterialId = trackStock ? formData.materialId.split('|')[0] : undefined;
    const finalQuantity = trackStock ? (formData.materialId ? parseFloat(formData.materialQuantity) || undefined : undefined) : undefined;
    const amountVal = parseFloat(formData.amount) || 0;

    const inventoryAction = editingExpense?.inventoryAction || (trackStock ? (isPurchase ? 'Purchase' : 'Usage') : undefined);
    
    if (amountVal <= 0 && inventoryAction !== 'Transfer') {
      alert("Expense amount must be greater than zero.");
      return;
    }

    const expData: Expense = {
      id: editingExpense ? editingExpense.id : 'e' + Date.now().toString(),
      date: formData.date,
      projectId: formData.projectId,
      vendorId: formData.vendorId || undefined,
      amount: inventoryAction === 'Transfer' ? 0 : amountVal,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || 'General Expense',
      category: formData.category,
      materialId: finalMaterialId,
      materialQuantity: finalQuantity,
      unitPrice: unitPrice,
      inventoryAction: inventoryAction,
      parentPurchaseId: trackStock ? parentId : undefined
    };

    if (expData.inventoryAction === 'Usage') {
      const project = projects.find(p => p.id === expData.projectId);
      if (project?.isGodown) {
        alert("Error: Material cannot be consumed from a Godown Hub. Please use the 'Transfer' feature in Inventory to move material to an active site first.");
        return;
      }
    }

    if (editingExpense) {
      await updateExpense(expData);
    } else {
      await addExpense(expData);
    }

    setShowModal(false);
    setEditingExpense(null);
    resetForm();
  }, [editingExpense, trackStock, formData, isPurchase, siteSpecificInventory, updateExpense, addExpense, resetForm, projects]);

  const openEdit = (e: Expense) => {
    setEditingExpense(e);
    setTrackStock(!!e.materialId);
    setFormData({
      projectId: e.projectId || '', 
      vendorId: e.vendorId || '', 
      date: e.date || new Date().toISOString().split('T')[0], 
      amount: (e.amount || 0).toString(), 
      notes: e.notes || '', 
      category: e.category || 'Material', 
      paymentMethod: e.paymentMethod || 'Bank',
      materialId: e.parentPurchaseId ? `${e.materialId}|${e.parentPurchaseId}` : e.materialId || '',
      materialQuantity: e.materialQuantity ? Math.abs(e.materialQuantity).toString() : ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense record? Associated vendor balance and material stock levels will be restored.',
      onConfirm: () => {
        deleteExpense(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Financial Ledger</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Record expenditures and trigger stock arrivals.</p>
        </div>
        {canCreateExpenses && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowBulkModal(true)}
              className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              <FileText size={20} /> Bulk Entry
            </button>
            <button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Plus size={20} /> Record Expense
            </button>
          </div>
        )}
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
                  {projects.filter(p => !p.isDeleted).map(p => <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name}{isProjectLocked(p.id) ? ' (Locked)' : ''}</option>)}
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
                return (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 even:bg-slate-50/30 dark:even:bg-slate-800/20 transition-colors group">
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
                         <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${(exp.inventoryAction === 'Purchase' || (!exp.inventoryAction && !!exp.materialId)) ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
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
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        {canEditExpenses && (
                          <button 
                            onClick={() => openEdit(exp)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit Expense"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {canDeleteExpenses && (
                          <button 
                            onClick={() => handleDelete(exp.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                   <td colSpan={5} className="px-8 py-20 text-center">
                      <LayoutGrid size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No entries match your deep search</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Entry Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
              <div className="flex gap-4 items-center">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Bulk Expense Entry</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Batch record multiple expenditures • Paste from Excel supported</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={clearAllBulkRows}
                  className="flex items-center gap-2 px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                >
                  <Trash size={16} />
                  Clear All
                </button>
                <button 
                  type="button"
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <ClipboardPaste size={16} />
                  Paste from Excel
                </button>
                <button onClick={() => setShowBulkModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <X size={32} />
                </button>
              </div>
            </div>

            {showPasteArea && (
              <div className="p-8 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-top duration-300">
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-sm font-black text-blue-600 uppercase tracking-tight">Excel Paste Helper</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Format: Date | Project | Vendor | Amount | Notes</p>
                    </div>
                    <button 
                      onClick={processPasteData}
                      disabled={!pasteText.trim()}
                      className="px-8 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all"
                    >
                      Process & Add Rows
                    </button>
                  </div>
                  <textarea 
                    className="w-full h-32 p-4 bg-white dark:bg-slate-900 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-mono outline-none focus:border-blue-400 transition-colors"
                    placeholder="Paste your Excel columns here...&#10;2023-10-01	Site A	Vendor X	5000	Cement Purchase"
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <form onSubmit={handleBulkSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Project</th>
                      <th className="px-4 py-2">Vendor</th>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Method</th>
                      <th className="px-4 py-2">Notes</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row) => (
                      <tr key={row.id} className="group">
                        <td className="px-1">
                          <input type="date" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none" value={row.date} onChange={e => updateBulkRow(row.id, 'date', e.target.value)} required />
                        </td>
                        <td className="px-1">
                          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none" value={row.projectId} onChange={e => updateBulkRow(row.id, 'projectId', e.target.value)} required>
                            <option value="" disabled>Select Project...</option>
                            {projects.filter(p => !p.isDeleted).map(p => <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-1">
                          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none" value={row.vendorId} onChange={e => updateBulkRow(row.id, 'vendorId', e.target.value)}>
                            <option value="">Self / Direct</option>
                            {vendors.filter(v => v.isActive !== false).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </td>
                        <td className="px-1">
                          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none" value={row.category} onChange={e => updateBulkRow(row.id, 'category', e.target.value)}>
                            <option value="" disabled>Select Category...</option>
                            {tradeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </td>
                        <td className="px-1">
                          <input type="number" step="0.01" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black dark:text-white outline-none" placeholder="0.00" value={row.amount} onChange={e => updateBulkRow(row.id, 'amount', e.target.value)} required />
                        </td>
                        <td className="px-1">
                          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none" value={row.paymentMethod} onChange={e => updateBulkRow(row.id, 'paymentMethod', e.target.value)}>
                            <option value="" disabled>Select Method...</option>
                            <option value="Bank">Bank</option>
                            <option value="Cash">Cash</option>
                            <option value="Online">Online</option>
                          </select>
                        </td>
                        <td className="px-1">
                          <input type="text" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none" placeholder="Notes..." value={row.notes} onChange={e => updateBulkRow(row.id, 'notes', e.target.value)} />
                        </td>
                        <td className="px-1">
                          <button type="button" onClick={() => removeBulkRow(row.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <button 
                  type="button" 
                  onClick={addBulkRow}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-xs font-bold transition-all"
                >
                  <Plus size={16} /> Add Another Row
                </button>
              </div>
              
              <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="text-slate-500">
                  <p className="text-[10px] font-black uppercase tracking-widest">Total Batch Value</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(bulkRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0))}
                  </p>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowBulkModal(false)} className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Authorize Batch Entry</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom duration-500">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 shrink-0">
              <div className="flex gap-4 items-center">
                 <div className="p-3 sm:p-4 bg-red-600 text-white rounded-2xl shadow-lg">
                    <Receipt size={24} />
                 </div>
                 <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{editingExpense ? 'Modify Entry' : 'Record Expenditure'}</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{isPurchase ? 'Adding to stock inventory' : 'Deducting from purchased stock'}</p>
                 </div>
              </div>
              <button onClick={() => { setShowModal(false); setEditingExpense(null); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleCreateOrUpdateExpense} className="p-6 sm:p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
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
                    {projects.filter(p => !p.isDeleted).map(p => <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name}{isProjectLocked(p.id) ? ' (Locked)' : ''}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cost Category</label>
                   {!isAddingCategory ? (
                     <div className="flex gap-2">
                       <select 
                        disabled={!!editingExpense?.materialId}
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none disabled:opacity-50" 
                        value={formData.category} 
                        onChange={(e) => setFormData(p => ({ ...p, category: e.target.value, materialId: '' }))}
                      >
                        <option value="" disabled>Select Category...</option>
                        {tradeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="p-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                        title="Add New Category"
                      >
                        <Plus size={20} />
                      </button>
                     </div>
                   ) : (
                     <div className="flex gap-2">
                       <input 
                        type="text" 
                        placeholder="New category name..." 
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        autoFocus
                       />
                       <button 
                        type="button"
                        onClick={() => {
                          if (newCategoryName.trim()) {
                            addTradeCategory(newCategoryName.trim());
                            setFormData(p => ({ ...p, category: newCategoryName.trim() }));
                            setNewCategoryName('');
                            setIsAddingCategory(false);
                          }
                        }}
                        className="px-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
                       >
                         Save
                       </button>
                       <button 
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                       >
                         Cancel
                       </button>
                     </div>
                   )}
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
                          onChange={e => handleMaterialChange(e.target.value)}
                          required={trackStock}
                        >
                           <option value="">Choose asset / batch...</option>
                           {siteSpecificInventory.map((m, idx: number) => (
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
                                onChange={e => handleQuantityChange(e.target.value)}
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
                    {vendors.filter(v => v.isActive !== false || v.id === formData.vendorId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
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
      <ConfirmationDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
