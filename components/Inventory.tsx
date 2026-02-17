import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Package, 
  ShoppingCart, 
  History, 
  Search, 
  X, 
  TrendingDown, 
  Trash2,
  Briefcase,
  Users,
  Filter,
  Pencil,
  AlertCircle,
  Save,
  Plus,
  Receipt,
  CheckCircle2,
  ArrowRight,
  ArrowRightLeft,
  TrendingUp,
  Landmark,
  Calendar,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  ArrowUpNarrowWide,
  DollarSign,
  ChevronRight,
  ClipboardList,
  BarChart4,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Lock,
  Info,
  Link,
  Layers,
  Copy,
  LayoutGrid,
  Warehouse,
  Truck
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Material, MaterialUnit, StockHistoryEntry, Expense, Project, Vendor } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

type InventorySortOption = 'name' | 'stock-low' | 'stock-high' | 'cost';
type HistorySortOption = 'date-desc' | 'date-asc' | 'qty-high' | 'qty-low';
type HistoryTab = 'all' | 'purchases' | 'usage' | 'transfers';

interface BulkRow {
  id: string;
  materialId: string;
  quantity: string;
  unitPrice: string;
  vendorId: string;
  projectId: string;
}

export const Inventory: React.FC = () => {
  const { materials, projects, vendors, stockingUnits, payments, expenses, updateMaterial, addMaterial, deleteMaterial, addExpense, deleteExpense, updateExpense, updateVendor, allowDecimalStock } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [inventorySort, setInventorySort] = useState<InventorySortOption>('name');
  
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historySort, setHistorySort] = useState<HistorySortOption>('date-desc');
  const [activeHistoryTab, setActiveHistoryTab] = useState<HistoryTab>('all');
  
  const [showProcureModal, setShowProcureModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  const [editingHistoryEntry, setEditingHistoryEntry] = useState<{material: Material, entry: StockHistoryEntry} | null>(null);
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);
  const [historyEditFormData, setHistoryEditFormData] = useState({
    quantity: '', unitPrice: '', projectId: '', vendorId: '', date: '', note: ''
  });

  // Bulk Inward State
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    { id: '1', materialId: '', quantity: '', unitPrice: '', vendorId: '', projectId: '' }
  ]);
  const [bulkGlobalVendor, setBulkGlobalVendor] = useState('');
  const [bulkGlobalProject, setBulkGlobalProject] = useState('');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (historyMaterial) {
      const latest = materials.find(m => m.id === historyMaterial.id);
      if (latest) {
        setHistoryMaterial(latest);
      } else {
        setHistoryMaterial(null);
      }
    }
  }, [materials, historyMaterial]);

  const isHistoryEntryLocked = useMemo(() => {
    if (!editingHistoryEntry) return false;
    return payments.some(p => p.materialBatchId === editingHistoryEntry.entry.id);
  }, [editingHistoryEntry, payments]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProcureModal(false);
        setShowBulkModal(false);
        setShowUsageModal(false);
        setShowEditModal(false);
        setShowEditHistoryModal(false);
        setHistoryMaterial(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const [procureData, setProcureData] = useState({
    materialId: '', newName: '', vendorId: vendors[0]?.id || '', projectId: projects.find(p => p.isGodown)?.id || projects[0]?.id || '', quantity: '', unit: stockingUnits[0] || 'Bag', costPerUnit: '', date: new Date().toISOString().split('T')[0], note: ''
  });

  const [usageData, setUsageData] = useState({
    materialId: '', 
    vendorId: '', 
    batchId: '', 
    projectId: projects.find(p => !p.isGodown)?.id || projects[0]?.id || '', 
    quantity: '', 
    date: new Date().toISOString().split('T')[0], 
    notes: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '', unit: stockingUnits[0] || 'Bag'
  });

  const relevantMaterialsForSite = useMemo(() => {
    if (!usageData.projectId) return [];
    const batches: any[] = [];
    
    materials.forEach(mat => {
      const history = mat.history || [];
      const inwardEntries = history.filter(h => (h.type === 'Purchase' || h.type === 'Transfer') && h.quantity > 0);
      
      inwardEntries.forEach(inward => {
        const batchId = inward.id.replace('sh-exp-', '');
        const deductionsAgainstThisBatch = history.filter(h => 
          h.parentPurchaseId === batchId && h.quantity < 0
        );
        const totalDeductedFromBatch = Math.abs(deductionsAgainstThisBatch.reduce((sum, d) => sum + d.quantity, 0));
        const availableInBatch = inward.quantity - totalDeductedFromBatch;

        if (availableInBatch > 0) {
          const vendor = vendors.find(v => v.id === inward.vendorId);
          const vName = vendor?.name || (inward.type === 'Transfer' ? 'Inbound Transfer' : 'Standard Supplier');
          batches.push({
            id: mat.id,
            name: mat.name,
            unit: mat.unit,
            batchId: batchId,
            vendorName: vName,
            vendorId: inward.vendorId,
            unitPrice: inward.unitPrice || mat.costPerUnit,
            available: availableInBatch,
            isLocal: inward.projectId === usageData.projectId
          });
        }
      });
    });

    return batches.sort((a, b) => (a.isLocal === b.isLocal ? 0 : a.isLocal ? -1 : 1));
  }, [materials, usageData.projectId, vendors]);

  const selectedBatchForTotal = useMemo(() => {
    return relevantMaterialsForSite.find(b => 
      b.id === usageData.materialId && b.batchId === usageData.batchId
    );
  }, [relevantMaterialsForSite, usageData.materialId, usageData.batchId]);

  const currentTotalValue = (selectedBatchForTotal?.unitPrice || 0) * (parseFloat(usageData.quantity) || 0);

  const handleOpenUsageModal = (materialId?: string, projectId?: string) => {
    setUsageData({ materialId: materialId || '', vendorId: '', batchId: '', projectId: projectId || projects.find(p => !p.isGodown)?.id || projects[0]?.id || '', quantity: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowUsageModal(true);
  };

  const handleOpenEditModal = (mat: Material) => {
    setEditingMaterial(mat);
    setEditFormData({ name: mat.name, unit: mat.unit });
    setShowEditModal(true);
  };

  const handleEditMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    updateMaterial({ ...editingMaterial, name: editFormData.name, unit: editFormData.unit as MaterialUnit });
    setShowEditModal(false);
    setEditingMaterial(null);
  };

  const filteredMaterials = useMemo(() => {
    let result = materials.map(mat => {
      let siteBalance = mat.totalPurchased - mat.totalUsed;
      let stockValue = 0;
      let hasProjectLink = true;

      const history = mat.history || [];
      if (projectFilter === 'All') {
        stockValue = history.reduce((sum, h) => sum + (h.quantity * (h.unitPrice || mat.costPerUnit)), 0);
      } else {
        const siteEntries = history.filter(h => h.projectId === projectFilter);
        siteBalance = siteEntries.reduce((sum, h) => sum + h.quantity, 0);
        stockValue = siteEntries.reduce((sum, h) => sum + (h.quantity * (h.unitPrice || mat.costPerUnit)), 0);
        hasProjectLink = siteEntries.some(h => h.quantity > 0);
      }

      return { ...mat, siteBalance, stockValue, hasProjectLink };
    });

    result = result.filter(mat => {
      const matchesSearch = mat.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProject = projectFilter === 'All' || mat.hasProjectLink;
      const matchesVendor = vendorFilter === 'All' || mat.history?.some(h => h.vendorId === vendorFilter);
      return matchesSearch && matchesProject && matchesVendor;
    });

    return result.sort((a, b) => {
      if (inventorySort === 'name') return a.name.localeCompare(b.name);
      if (inventorySort === 'stock-low') return a.siteBalance - b.siteBalance;
      if (inventorySort === 'stock-high') return b.siteBalance - a.siteBalance;
      if (inventorySort === 'cost') return b.costPerUnit - a.costPerUnit;
      return 0;
    });
  }, [materials, searchTerm, projectFilter, vendorFilter, inventorySort]);

  const filteredHistory = useMemo(() => {
    if (!historyMaterial || !historyMaterial.history) return [];
    let result = historyMaterial.history.filter(entry => {
      if (activeHistoryTab === 'all' && entry.type === 'Transfer') return false;
      if (activeHistoryTab === 'purchases' && entry.type !== 'Purchase') return false;
      if (activeHistoryTab === 'usage' && entry.type !== 'Usage') return false;
      if (activeHistoryTab === 'transfers' && entry.type !== 'Transfer') return false;
      
      const projectName = projects.find(p => p.id === entry.projectId)?.name || '';
      const vendorName = vendors.find(v => v.id === entry.vendorId)?.name || '';
      const search = historySearch.toLowerCase();
      return (entry.note?.toLowerCase().includes(search) || entry.type.toLowerCase().includes(search) || projectName.toLowerCase().includes(search) || vendorName.toLowerCase().includes(search) || entry.date.includes(search));
    });
    return result.sort((a, b) => {
      const timeB = new Date(b.date).getTime();
      const timeA = new Date(a.date).getTime();
      if (historySort === 'date-desc') return timeB - timeA;
      if (historySort === 'date-asc') return timeA - timeB;
      if (historySort === 'qty-high') return b.quantity - a.quantity;
      if (historySort === 'qty-low') return a.quantity - b.quantity;
      return 0;
    });
  }, [historyMaterial, historySearch, historySort, projects, vendors, activeHistoryTab]);

  const handleProcureStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(procureData.quantity) || 0;
    const unitPrice = parseFloat(procureData.costPerUnit) || 0;
    const totalAmount = qty * unitPrice;
    const expenseId = 'e-pro-' + Date.now();
    if (procureData.materialId === 'new') {
      const newId = 'm' + Date.now();
      await addMaterial({ id: newId, name: procureData.newName, unit: procureData.unit, costPerUnit: unitPrice, totalPurchased: 0, totalUsed: 0, history: [] });
      await addExpense({ id: expenseId, date: procureData.date, projectId: procureData.projectId, vendorId: procureData.vendorId, amount: totalAmount, paymentMethod: 'Bank', category: 'Material', notes: procureData.note || `Procured ${qty} ${procureData.unit} of ${procureData.newName}`, materialId: newId, materialQuantity: qty, inventoryAction: 'Purchase' });
    } else {
      await addExpense({ id: expenseId, date: procureData.date, projectId: procureData.projectId, vendorId: procureData.vendorId, amount: totalAmount, paymentMethod: 'Bank', category: 'Material', notes: procureData.note || `Restock Procurement: ${qty} units`, materialId: procureData.materialId, materialQuantity: qty, inventoryAction: 'Purchase' });
    }
    setShowProcureModal(false);
    setProcureData({ materialId: '', newName: '', vendorId: vendors[0]?.id || '', projectId: projects.find(p => p.isGodown)?.id || projects[0]?.id || '', quantity: '', unit: stockingUnits[0] || 'Bag', costPerUnit: '', date: new Date().toISOString().split('T')[0], note: '' });
  };

  const addBulkRow = () => setBulkRows([...bulkRows, { id: Date.now().toString(), materialId: '', quantity: '', unitPrice: '', vendorId: bulkGlobalVendor, projectId: bulkGlobalProject }]);
  const removeBulkRow = (id: string) => setBulkRows(bulkRows.filter(r => r.id !== id));
  const updateBulkRow = (id: string, field: keyof BulkRow, value: string) => {
    setBulkRows(bulkRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleBulkProcureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = bulkRows.filter(r => r.materialId && r.quantity && r.unitPrice);
    if (validRows.length === 0) {
      alert("No valid rows to process. Ensure Material, Quantity, and Price are filled.");
      return;
    }

    for (const row of validRows) {
      const qty = parseFloat(row.quantity);
      const price = parseFloat(row.unitPrice);
      const vendorId = row.vendorId || bulkGlobalVendor;
      const projectId = row.projectId || bulkGlobalProject;
      const mat = materials.find(m => m.id === row.materialId);
      
      if (!vendorId || !projectId) continue;

      await addExpense({
        id: 'e-bulk-' + Math.random().toString(36).substr(2, 9),
        date: bulkDate,
        projectId: projectId,
        vendorId: vendorId,
        amount: qty * price,
        paymentMethod: 'Bank',
        category: 'Material',
        materialId: row.materialId,
        materialQuantity: qty,
        inventoryAction: 'Purchase',
        notes: `Bulk Entry: ${qty} ${mat?.unit} inward`
      });
    }

    setShowBulkModal(false);
    setBulkRows([{ id: '1', materialId: '', quantity: '', unitPrice: '', vendorId: '', projectId: '' }]);
  };

  const handleRecordUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(usageData.quantity) || 0;
    
    const selectedBatch = relevantMaterialsForSite.find(b => 
      b.id === usageData.materialId && b.batchId === usageData.batchId
    );

    if (selectedBatch) {
      if (selectedBatch.available < qty) {
        alert(`Error: Insufficient stock in this batch. (Available: ${selectedBatch.available} ${selectedBatch.unit})`);
        return;
      }
      
      const consumptionValue = qty * selectedBatch.unitPrice;

      await addExpense({ 
        id: 'e-usage-' + Date.now(), 
        date: usageData.date, 
        projectId: usageData.projectId, 
        amount: consumptionValue, 
        paymentMethod: 'Bank', 
        category: 'Material', 
        materialId: selectedBatch.id, 
        vendorId: selectedBatch.vendorId, 
        materialQuantity: -qty, 
        inventoryAction: 'Usage', 
        parentPurchaseId: selectedBatch.batchId,
        notes: usageData.notes || `Usage: ${qty} ${selectedBatch.unit} of ${selectedBatch.name}` 
      });
      setShowUsageModal(false);
    } else {
      alert("Error: Please select a valid material batch.");
    }
  };

  const handleDeleteHistoryEntry = async (material: Material, entryId: string) => {
    if (payments.some(p => p.materialBatchId === entryId)) { alert("Lock Violation: This entry is linked to payments in the Supplier Ledger."); return; }
    const expenseId = entryId.startsWith('sh-exp-') ? entryId.replace('sh-exp-', '') : null;
    if (!confirm("Confirm Sync: This will delete the financial expense and revert material stock. Continue?")) return;
    if (expenseId) { 
      await deleteExpense(expenseId); 
    } else { 
      const newHistory = material.history?.filter(h => h.id !== entryId) || []; 
      const totalPurchased = newHistory.filter(h => h.type === 'Purchase' && h.quantity > 0).reduce((sum, h) => sum + h.quantity, 0); 
      const totalUsed = Math.abs(newHistory.filter(h => h.type === 'Usage' && h.quantity < 0).reduce((sum, h) => sum + h.quantity, 0)); 
      updateMaterial({ ...material, totalPurchased, totalUsed, history: newHistory }); 
    }
  };

  const handleEditHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHistoryEntry) return;
    const { material, entry: oldEntry } = editingHistoryEntry;
    const newQty = parseFloat(historyEditFormData.quantity) || 0;
    const newPrice = parseFloat(historyEditFormData.unitPrice) || 0;
    const expenseId = oldEntry.id.startsWith('sh-exp-') ? oldEntry.id.replace('sh-exp-', '') : null;
    
    if (expenseId) {
      const oldExp = expenses.find(x => x.id === expenseId);
      if (oldExp) {
        await updateExpense({ 
          ...oldExp, 
          date: historyEditFormData.date, 
          projectId: historyEditFormData.projectId || oldExp.projectId, 
          vendorId: historyEditFormData.vendorId || oldExp.vendorId, 
          amount: Math.abs(newQty) * (oldExp.inventoryAction === 'Usage' ? (newPrice || material.costPerUnit) : newPrice), 
          materialId: material.id, 
          materialQuantity: newQty, 
          notes: historyEditFormData.note,
          unitPrice: newPrice 
        });
      }
    } else {
      const newHistory = material.history?.map(h => {
        if (h.id === oldEntry.id) { return { ...h, quantity: newQty, unitPrice: newPrice, projectId: historyEditFormData.projectId || undefined, vendorId: historyEditFormData.vendorId || undefined, date: historyEditFormData.date, note: historyEditFormData.note }; }
        return h;
      }) || [];
      const totalPurchased = newHistory.filter(h => h.type === 'Purchase' && h.quantity > 0).reduce((sum, h) => sum + h.quantity, 0);
      const totalUsed = Math.abs(newHistory.filter(h => h.type === 'Usage' && h.quantity < 0).reduce((sum, h) => sum + h.quantity, 0));
      updateMaterial({ ...material, totalPurchased, totalUsed, history: newHistory });
    }
    setShowEditHistoryModal(false);
    setEditingHistoryEntry(null);
  };

  const triggerHistoryEdit = (entry: StockHistoryEntry) => {
    if (!historyMaterial) return;
    const activeUnitPrice = entry.unitPrice || historyMaterial.costPerUnit;
    setEditingHistoryEntry({ material: historyMaterial, entry }); 
    setHistoryEditFormData({ 
      quantity: entry.quantity.toString(), 
      unitPrice: activeUnitPrice.toString(), 
      projectId: entry.projectId || '', 
      vendorId: entry.vendorId || '', 
      date: entry.date, 
      note: entry.note || '' 
    }); 
    setShowEditHistoryModal(true);
  };

  const handleUsageSelection = (val: string) => {
    const [mId, bId] = val.split('|'); 
    setUsageData(p => ({ ...p, materialId: mId, batchId: bId }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Inventory Ledger</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage godown stock and project site assets.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button onClick={() => setShowBulkModal(true)} className="flex-1 sm:flex-none bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"><Layers size={18} /> Bulk Hub Inward</button>
          <button onClick={() => setShowProcureModal(true)} className="flex-1 sm:flex-none bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"><Plus size={18} /> Hub Procure</button>
          <button onClick={() => handleOpenUsageModal()} className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><TrendingDown size={18} /> Record Use</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search by asset name..." className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
             <Warehouse className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <select className="pl-10 pr-8 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none dark:text-white" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                <option value="All">Hub Filter: All</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} {p.isGodown ? '(Godown)' : ''}</option>)}
             </select>
          </div>
          <div className="relative">
             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <select className="pl-10 pr-8 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none dark:text-white" value={inventorySort} onChange={(e) => setInventorySort(e.target.value as InventorySortOption)}>
                <option value="name">Sort: A-Z</option>
                <option value="stock-low">Sort: Stock Low</option>
                <option value="stock-high">Sort: Stock High</option>
                <option value="cost">Sort: High Cost</option>
             </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-8 py-5">Material Asset</th>
                <th className="px-8 py-5">Value {projectFilter !== 'All' ? '(At Hub)' : '(Total Pool)'}</th>
                <th className="px-8 py-5">Availability Status</th>
                <th className="px-8 py-5 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredMaterials.map((mat) => {
                const remaining = mat.siteBalance;
                const isProjectFiltered = projectFilter !== 'All';
                const filterProj = projects.find(p => p.id === projectFilter);
                
                return (
                  <tr key={mat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform ${isProjectFiltered && filterProj?.isGodown ? 'bg-slate-900 text-white' : 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-300'}`}>
                           {mat.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight">{mat.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Unit: {mat.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-black text-slate-600 dark:text-slate-400">{formatCurrency(mat.stockValue)}</td>
                    <td className="px-8 py-5">
                       <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${remaining < 10 ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/10 dark:border-red-900/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
                          {remaining.toLocaleString()} {mat.unit}s {isProjectFiltered ? (filterProj?.isGodown ? 'in Godown' : 'on Site') : ''}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-2 items-center">
                         <button onClick={() => handleOpenUsageModal(mat.id, isProjectFiltered ? projectFilter : undefined)} className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm flex items-center gap-2 ${isProjectFiltered && !filterProj?.isGodown ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 hover:bg-blue-600 hover:text-white'}`} title="Dispatch / Use">
                           {isProjectFiltered && filterProj?.isGodown ? <><Truck size={14} /> Dispatch Hub</> : <><TrendingDown size={14} /> Record Use</>}
                         </button>
                         <button onClick={() => { setHistoryMaterial(mat); setHistorySearch(''); setHistorySort('date-desc'); setActiveHistoryTab('all'); }} className="p-3 text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-2xl hover:text-slate-900 dark:hover:text-white transition-all shadow-sm" title="Hub History"><History size={20} /></button>
                         <button onClick={() => handleOpenEditModal(mat)} className="p-3 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={18} /></button>
                         <button onClick={() => { if(confirm(`Permanent Action: Are you sure you want to delete ${mat.name}?`)) deleteMaterial(mat.id); }} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Stock Inward Modal */}
      {showBulkModal && (
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
               <button onClick={() => setShowBulkModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={36} /></button>
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-6 shrink-0">
               <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Value Date</label>
                  <input type="date" className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
               </div>
               <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Primary Vendor (Auto-Fill)</label>
                  <select className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white" value={bulkGlobalVendor} onChange={e => { setBulkGlobalVendor(e.target.value); setBulkRows(bulkRows.map(r => ({ ...r, vendorId: e.target.value }))); }}>
                    <option value="">Manual Selection</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
               </div>
               <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Primary Godown (Auto-Fill)</label>
                  <select className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white" value={bulkGlobalProject} onChange={e => { setBulkGlobalProject(e.target.value); setBulkRows(bulkRows.map(r => ({ ...r, projectId: e.target.value }))); }}>
                    <option value="">Manual Selection</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name} {p.isGodown ? '(Godown)' : '(Site)'}</option>)}
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
                               {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          </div>
                       )}
                       {!bulkGlobalProject && (
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase px-1">Target Hub</label>
                            <select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-xs font-bold dark:text-white" value={row.projectId} onChange={e => {
                               updateBulkRow(row.id, 'projectId', e.target.value);
                            }}>
                               <option value="">Select Hub...</option>
                               {projects.map(p => <option key={p.id} value={p.id}>{p.name} {p.isGodown ? '(G)' : '(S)'}</option>)}
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
                  <button onClick={() => setShowBulkModal(false)} className="px-10 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest">Cancel</button>
                  <button onClick={handleBulkProcureSubmit} className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95 transition-all">Process Hub Reception</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Procure Modal */}
      {showProcureModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
                 <div className="flex gap-4 items-center">
                   <div className="p-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl shadow-lg">
                      <Warehouse size={24} />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Hub Stock Procure</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Record material arrival at godown or site hub</p>
                   </div>
                 </div>
                 <button onClick={() => setShowProcureModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
              </div>
              <form onSubmit={handleProcureStock} className="p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Material Asset / Category</label>
                   <select 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none transition-all focus:ring-2 focus:ring-blue-500" 
                    value={procureData.materialId} 
                    onChange={e => setProcureData(p => ({ ...p, materialId: e.target.value }))}
                    required
                  >
                    <option value="">Choose material...</option>
                    <option value="new">+ Hub New Asset Category</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                  </select>
                </div>

                {procureData.materialId === 'new' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Material Name</label>
                       <input type="text" required className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={procureData.newName} onChange={e => setProcureData(p => ({ ...p, newName: e.target.value }))} placeholder="e.g. 10mm Steel" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Stocking Unit</label>
                       <select className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={procureData.unit} onChange={e => setProcureData(p => ({ ...p, unit: e.target.value }))}>
                          {stockingUnits.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Target Hub (Godown or Site)</label>
                     <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={procureData.projectId} onChange={e => setProcureData(p => ({ ...p, projectId: e.target.value }))} required>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name} {p.isGodown ? '(Godown Hub)' : ''}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Billing Supplier</label>
                     <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={procureData.vendorId} onChange={e => setProcureData(p => ({ ...p, vendorId: e.target.value }))} required>
                        <option value="">Select Vendor...</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                     </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Qty Received</label>
                      <input type="number" required step={allowDecimalStock ? "0.01" : "1"} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black dark:text-white outline-none" value={procureData.quantity} onChange={e => setProcureData(p => ({ ...p, quantity: e.target.value }))} placeholder="0.00" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Base Price (Rs.)</label>
                      <input type="number" required step="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black dark:text-white outline-none" value={procureData.costPerUnit} onChange={e => setProcureData(p => ({ ...p, costPerUnit: e.target.value }))} placeholder="0.00" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Arrival Date</label>
                      <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={procureData.date} onChange={e => setProcureData(p => ({ ...p, date: e.target.value }))} />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Hub Entry Note</label>
                   <textarea rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={procureData.note} onChange={e => setProcureData(p => ({ ...p, note: e.target.value }))} placeholder="Hub storage details..." />
                </div>

                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowProcureModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Discard</button>
                   <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl transition-all active:scale-95 text-sm uppercase tracking-widest">Authorize Hub Stocking</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* History Modal */}
      {historyMaterial && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
               <div className="flex gap-4 items-center">
                 <div className="w-14 h-14 bg-slate-900 dark:bg-slate-700 text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl">{historyMaterial.name.charAt(0)}</div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Asset Hub Log</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{historyMaterial.name} Ledger • Pool Availability: {(historyMaterial.totalPurchased - historyMaterial.totalUsed).toLocaleString()} {historyMaterial.unit}s</p>
                 </div>
               </div>
               <button onClick={() => setHistoryMaterial(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={36} /></button>
            </div>

            <div className="flex bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-700 px-8 shrink-0">
               <button onClick={() => setActiveHistoryTab('all')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 ${activeHistoryTab === 'all' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ClipboardList size={14} /> Full Hub Log</button>
               <button onClick={() => setActiveHistoryTab('purchases')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 ${activeHistoryTab === 'purchases' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ShoppingCart size={14} /> Reception</button>
               <button onClick={() => setActiveHistoryTab('usage')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 ${activeHistoryTab === 'usage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><TrendingDown size={14} /> Consumption</button>
               <button onClick={() => setActiveHistoryTab('transfers')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 ${activeHistoryTab === 'transfers' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ArrowRightLeft size={14} /> Dispatch/Transfers</button>
            </div>

            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-center shrink-0">
               <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Filter by Date, Hub, Site, Driver or Note..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/20 dark:bg-slate-900/10 no-scrollbar">
               <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                 <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[850px]">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="px-8 py-5">Log Date</th>
                          <th className="px-8 py-5">Hub Activity Details</th>
                          <th className="px-8 py-5">Stock Flux</th>
                          <th className="px-8 py-5 text-right">Hub Value Date</th>
                          <th className="px-8 py-5 text-right">Est. Hub Value</th>
                          <th className="px-8 py-5">Entity Allocation</th>
                          <th className="px-8 py-5 text-right">Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredHistory.map((entry) => {
                          const project = projects.find(p => p.id === entry.projectId);
                          const vendor = vendors.find(v => v.id === entry.vendorId);
                          const isLinkedExpense = entry.id.startsWith('sh-exp-');
                          const activeUnitPrice = entry.unitPrice || historyMaterial!.costPerUnit;
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                              <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-2">
                                  {entry.type === 'Purchase' ? (<div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600"><ShoppingCart size={12} /></div>) : entry.type === 'Transfer' ? (<div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600"><ArrowRightLeft size={12} /></div>) : (<div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600"><TrendingDown size={12} /></div>)}
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${entry.type === 'Purchase' ? 'text-emerald-600' : entry.type === 'Transfer' ? 'text-amber-600' : 'text-blue-600'}`}>{entry.type === 'Transfer' ? (entry.quantity < 0 ? 'Dispatch Out' : 'Hub Transfer In') : entry.type}</span>
                                  {isLinkedExpense && <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter text-slate-400 border border-slate-200 dark:border-slate-600 flex items-center gap-1"><Link size={8} /> Hub Sync</span>}
                                </div>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-1">{entry.note}</p>
                              </td>
                              <td className="px-8 py-5"><span className={`text-sm font-black ${entry.quantity > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{entry.quantity > 0 ? '+' : ''}{entry.quantity.toLocaleString()} {historyMaterial!.unit}</span></td>
                              <td className="px-8 py-5 text-right font-bold text-slate-600 dark:text-slate-400">
                                <div className="flex flex-col items-end">
                                  <span className="text-xs">{formatCurrency(activeUnitPrice)}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right font-black text-slate-800 dark:text-slate-200">
                                {formatCurrency(Math.abs(entry.quantity) * activeUnitPrice)}
                              </td>
                              <td className="px-8 py-5"><div className="flex flex-col gap-1">{project && <span className={`text-[11px] font-bold uppercase tracking-tight flex items-center gap-1 ${project.isGodown ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{project.isGodown ? <Warehouse size={12} className="text-emerald-500"/> : <Briefcase size={12} className="text-blue-500"/>} {project.name}</span>}{vendor && <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter flex items-center gap-1"><Users size={12} className="text-emerald-500"/> {vendor.name}</span>}</div></td>
                              <td className="px-8 py-5 text-right"><div className="flex justify-end gap-1"><button onClick={() => triggerHistoryEdit(entry)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Pencil size={16} /></button><button onClick={() => handleDeleteHistoryEntry(historyMaterial!, entry.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit History Item Modal */}
      {showEditHistoryModal && editingHistoryEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-lg shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-blue-50/30 dark:bg-blue-900/10 flex justify-between items-center shrink-0">
                 <div className="flex gap-4 items-center">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg"><Pencil size={24} /></div>
                    <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Edit Hub Entry</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Modify material log details</p></div>
                 </div>
                 <button onClick={() => setShowEditHistoryModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
              </div>
              <form onSubmit={handleEditHistorySubmit} className="p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
                 {isHistoryEntryLocked && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                       <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                       <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200 leading-relaxed uppercase tracking-tight">
                         <strong>Bill Locked:</strong> This entry is linked to payments in the Supplier Ledger. Modification might desync financial totals.
                       </p>
                    </div>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Quantity</label><input type="number" step={allowDecimalStock ? "0.01" : "1"} required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black dark:text-white outline-none" value={historyEditFormData.quantity} onChange={e => setHistoryEditFormData(p => ({ ...p, quantity: e.target.value }))} /></div>
                   <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Unit Price</label><input type="number" step="0.01" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black dark:text-white outline-none" value={historyEditFormData.unitPrice} onChange={e => setHistoryEditFormData(p => ({ ...p, unitPrice: e.target.value }))} /></div>
                 </div>
                 <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Date</label><input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={historyEditFormData.date} onChange={e => setHistoryEditFormData(p => ({ ...p, date: e.target.value }))} /></div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Allocation Hub</label><select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={historyEditFormData.projectId} onChange={e => setHistoryEditFormData(p => ({ ...p, projectId: e.target.value }))}><option value="">None</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                   <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Vendor</label><select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={historyEditFormData.vendorId} onChange={e => setHistoryEditFormData(p => ({ ...p, vendorId: e.target.value }))}><option value="">None</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                 </div>
                 <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Note</label><textarea rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={historyEditFormData.note} onChange={e => setHistoryEditFormData(p => ({ ...p, note: e.target.value }))} /></div>
                 <div className="flex gap-4 pt-6"><button type="button" onClick={() => setShowEditHistoryModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Discard</button><button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 text-sm uppercase tracking-widest">Update Log</button></div>
              </form>
           </div>
        </div>
      )}

      {/* Consumption / Dispatch Modal */}
      {showUsageModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-blue-50/30 dark:bg-blue-900/20 flex justify-between items-center shrink-0">
                 <div className="flex gap-4 items-center">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg"><TrendingDown size={24} /></div>
                    <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Asset Dispatch / Record Use</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Updates pool levels and localized cost logs</p></div>
                 </div>
                 <button onClick={() => setShowUsageModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
              </div>
              <form onSubmit={handleRecordUsage} className="p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
                 <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Operational Allocation (Hub/Site)</label><select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={usageData.projectId} onChange={e => setUsageData(p => ({ ...p, projectId: e.target.value, materialId: '', batchId: '' }))} required><option value="">Select Project Site or Godown Hub...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name} {p.isGodown ? '(Warehouse)' : '(Active Site)'}</option>)}</select></div>
                 
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Material Pool (Category / Hub / Price / Remaining)</label>
                   <select 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none disabled:opacity-50 text-xs" 
                    value={`${usageData.materialId}|${usageData.batchId}`} 
                    onChange={e => handleUsageSelection(e.target.value)} 
                    disabled={!usageData.projectId} 
                    required
                  >
                    <option value="|">{usageData.projectId ? (relevantMaterialsForSite.length > 0 ? 'Choose stock pool...' : 'No availability in pool') : 'Select hub first...'}</option>
                    {relevantMaterialsForSite.map((batch, idx) => (
                        <option 
                          key={`${batch.id}-${batch.batchId}-${idx}`} 
                          value={`${batch.id}|${batch.batchId}`}
                          className={batch.isLocal ? 'text-emerald-600 font-black' : 'text-blue-500 font-medium'}
                        >
                          {batch.name} / {batch.vendorName} / {formatCurrency(batch.unitPrice)} / {batch.available.toLocaleString()} {batch.unit}
                        </option>
                    ))}
                  </select>
                  <div className="flex gap-4 px-1 mt-1">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-black uppercase text-emerald-600">At Selected Hub</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[9px] font-black uppercase text-blue-500">Global Storage Hubs</span></div>
                  </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Quantity Flux</label>
                     <input type="number" required step={allowDecimalStock ? "0.01" : "1"} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black dark:text-white outline-none" value={usageData.quantity} onChange={e => setUsageData(p => ({ ...p, quantity: e.target.value }))} placeholder="0.00" />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Entry Date</label>
                     <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={usageData.date} onChange={e => setUsageData(p => ({ ...p, date: e.target.value }))} />
                   </div>
                 </div>

                 {usageData.materialId && usageData.quantity && (
                    <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-[1.8rem] border-2 border-blue-100 dark:border-blue-800 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                       <div>
                          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Estimated Asset Impact</p>
                          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{formatCurrency(currentTotalValue)}</p>
                       </div>
                       <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-700 text-blue-600">
                          <Scale size={24} />
                       </div>
                    </div>
                 )}

                 <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Operational Detail / Gate Pass / Driver</label><textarea rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={usageData.notes} onChange={e => setUsageData(p => ({ ...p, notes: e.target.value }))} placeholder="Hub operation details..." /></div>
                 <div className="flex gap-4 pt-6"><button type="button" onClick={() => setShowUsageModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Discard</button><button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 text-sm uppercase tracking-widest">Authorize Flux</button></div>
              </form>
           </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {showEditModal && editingMaterial && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-lg shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
                 <div className="flex gap-4 items-center">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg"><Pencil size={24} /></div>
                    <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Edit Asset</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Update asset meta data</p></div>
                 </div>
                 <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
              </div>
              <form onSubmit={handleEditMaterialSubmit} className="p-8 space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Material Name</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={editFormData.name} onChange={e => setEditFormData(p => ({ ...p, name: e.target.value }))} />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Stocking Unit</label>
                    <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={editFormData.unit} onChange={e => setEditFormData(p => ({ ...p, unit: e.target.value }))}>
                       {stockingUnits.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                 </div>
                 <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Discard</button>
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 text-sm uppercase tracking-widest">Authorize Update</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};