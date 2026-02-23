import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  MapPin, 
  DollarSign, 
  ChevronRight,
  X,
  Briefcase,
  TrendingUp,
  ArrowUpCircle,
  Pencil,
  Trash2,
  Calendar,
  CreditCard,
  Hash,
  AlertCircle,
  Receipt,
  ArrowDownCircle,
  Wallet,
  Save,
  PieChart,
  Tag,
  Users,
  Package,
  CheckCircle2,
  Phone,
  Activity,
  ArrowRightLeft,
  Landmark,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardCheck,
  Scale,
  RefreshCw,
  ArrowRight,
  Link,
  FileText,
  Clock,
  Target,
  Info,
  TrendingDown,
  Search,
  Warehouse,
  Truck,
  History,
  ClipboardList,
  Download
} from 'lucide-react';
import { useApp } from '../AppContext';
import { ProjectStatus, Project, Expense, Income, PaymentMethod, Material, Payment, StockHistoryEntry, Invoice } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const ProjectList: React.FC = () => {
  const { 
    projects, expenses, vendors, materials, incomes, invoices, siteStatuses, tradeCategories, stockingUnits,
    addProject, updateProject, deleteProject, 
    addExpense, updateExpense, deleteExpense,
    addIncome, updateIncome, deleteIncome,
    addInvoice, updateInvoice, deleteInvoice,
    addMaterial, updateMaterial, allowDecimalStock
  } = useApp();
  
  const [filter, setFilter] = useState<string>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'expenses' | 'income' | 'arrivals' | 'invoices' | 'budget'>('expenses');
  
  const [showQuickIncome, setShowQuickIncome] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showInventoryUsageModal, setShowInventoryUsageModal] = useState(false);
  const [showRecordArrivalModal, setShowRecordArrivalModal] = useState(false);

  // Edit states for nested items
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Material Log State within Project Insights
  const [logMaterial, setLogMaterial] = useState<Material | null>(null);

  const [formData, setFormData] = useState({
    name: '', client: '', location: '', contactNumber: '', budget: '', startDate: new Date().toISOString().split('T')[0], endDate: '', description: '', status: 'Active', isGodown: false
  });

  const [incomeFormData, setIncomeFormData] = useState({
    amount: '', date: new Date().toISOString().split('T')[0], description: '', method: 'Bank' as PaymentMethod, invoiceId: ''
  });

  const [invoiceFormData, setInvoiceFormData] = useState({
    amount: '', date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], description: ''
  });

  const [inventoryUsageForm, setInventoryUsageForm] = useState({
    materialId: '', batchId: '', vendorId: '', quantity: '', date: new Date().toISOString().split('T')[0], notes: ''
  });

  const [arrivalFormData, setArrivalFormData] = useState({
    materialId: '', newMaterialName: '', vendorId: '', quantity: '', unit: stockingUnits[0] || 'Bag', costPerUnit: '', date: new Date().toISOString().split('T')[0], note: ''
  });

  const [usageMaterialSearch, setUsageMaterialSearch] = useState('');

  const getInvoiceMetrics = useCallback((inv: Invoice) => {
    const collected = incomes
      .filter(i => i.invoiceId === inv.id && (editingIncome ? i.id !== editingIncome.id : true))
      .reduce((sum, i) => sum + i.amount, 0);
    const remaining = Math.max(0, inv.amount - collected);
    const isPaid = remaining <= 0.01;
    return { collected, remaining, isPaid };
  }, [incomes, editingIncome]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setViewingProject(null);
        setShowQuickIncome(false);
        setShowInvoiceModal(false);
        setShowInventoryUsageModal(false);
        setShowRecordArrivalModal(false);
        setLogMaterial(null);
        setEditingIncome(null);
        setEditingInvoice(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormData({ 
      name: '', client: '', location: '', contactNumber: '', budget: '', startDate: new Date().toISOString().split('T')[0], endDate: '', description: '', status: siteStatuses[0] || 'Active', isGodown: false
    });
    setShowModal(true);
  };

  const handleOpenEditProject = (p: Project) => {
    setEditingProject(p);
    setFormData({ 
      name: p.name, client: p.client, location: p.location, contactNumber: p.contactNumber || '', budget: p.budget.toString(), startDate: p.startDate, endDate: p.endDate || p.startDate, description: p.description || '', status: p.status, isGodown: !!p.isGodown
    });
    setShowModal(true);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const projectData: Project = {
      id: editingProject ? editingProject.id : 'p' + Date.now(),
      name: formData.name,
      client: formData.client,
      location: formData.location,
      contactNumber: formData.contactNumber,
      budget: parseFloat(formData.budget) || 0,
      startDate: formData.startDate,
      endDate: formData.endDate || formData.startDate,
      description: formData.description,
      status: formData.status,
      isGodown: formData.isGodown
    };

    if (editingProject) await updateProject(projectData);
    else await addProject(projectData);
    
    setShowModal(false);
    setEditingProject(null);
  };

  const constructionSites = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return projects
      .filter(p => {
        const isSite = !p.isGodown;
        const matchesStatus = filter === 'All' || p.status === filter;
        const matchesSearch = p.name.toLowerCase().includes(query) || 
                             p.location.toLowerCase().includes(query) ||
                             p.client.toLowerCase().includes(query);
        return isSite && matchesStatus && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, filter, searchQuery]);

  const godownProjects = useMemo(() => {
    return projects.filter(p => p.isGodown).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const sortedStatuses = useMemo(() => [...siteStatuses].sort(), [siteStatuses]);

  const calculateProjectMetrics = useCallback((projectId: string, budget: number) => {
    const projectExpenses = expenses.filter(e => e.projectId === projectId);
    const projectIncomes = incomes.filter(i => i.projectId === projectId);
    const projectInvoices = invoices.filter(inv => inv.projectId === projectId);
    const actualSiteExpenses = projectExpenses.filter(e => e.inventoryAction !== 'Purchase' && e.inventoryAction !== 'Transfer');
    const totalSpent = actualSiteExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCollected = projectIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalLabor = actualSiteExpenses.filter(e => e.category === 'Labor').reduce((sum, e) => sum + e.amount, 0);
    const progress = Math.min(100, Math.round((totalSpent / (budget || 1)) * 100)) || 0;
    const categories: Record<string, number> = {};
    actualSiteExpenses.forEach(e => { categories[e.category] = (categories[e.category] || 0) + e.amount; });
    return { totalSpent, totalCollected, totalInvoiced, totalLabor, receivable: totalInvoiced - totalCollected, progress, categoryBreakdown: categories, allExpenses: projectExpenses, invoices: projectInvoices };
  }, [expenses, incomes, invoices]);

  const projectArrivals = useMemo(() => {
    if (!viewingProject) return [];
    const arrivals: { material: Material, entry: StockHistoryEntry, arrived: number, consumed: number, transferred: number, remaining: number }[] = [];
    materials.forEach(m => {
      const hist = m.history || [];
      hist.forEach(h => {
        if ((h.type === 'Purchase' || h.type === 'Transfer') && h.projectId === viewingProject.id && h.quantity > 0) { 
          const batchId = h.id.replace('sh-exp-', '');
          const deductions = hist.filter(d => 
            d.parentPurchaseId === batchId && d.projectId === viewingProject.id && d.quantity < 0
          );
          
          const qtyUsed = Math.abs(deductions.filter(d => d.type === 'Usage').reduce((sum, d) => sum + d.quantity, 0));
          const qtyMoved = Math.abs(deductions.filter(d => d.type === 'Transfer').reduce((sum, d) => sum + d.quantity, 0));
          
          const arrived = h.quantity;
          const remaining = arrived - (qtyUsed + qtyMoved);
          
          arrivals.push({ material: m, entry: h, arrived, consumed: qtyUsed, transferred: qtyMoved, remaining }); 
        }
      });
    });
    return arrivals.sort((a, b) => new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime());
  }, [viewingProject, materials]);

  const siteRelevantMaterials = useMemo(() => {
    if (!viewingProject) return [];
    const batches: any[] = [];
    materials.forEach(mat => {
      const history = mat.history || [];
      const inwardEntries = history.filter(h => (h.type === 'Purchase' || h.type === 'Transfer') && h.quantity > 0);
      inwardEntries.forEach(inward => {
        const batchId = inward.id.replace('sh-exp-', '');
        const deductionsAgainstThisBatch = history.filter(h => h.parentPurchaseId === batchId && h.quantity < 0);
        const totalDeductedFromBatch = Math.abs(deductionsAgainstThisBatch.reduce((sum, d) => sum + d.quantity, 0));
        const availableInBatch = inward.quantity - totalDeductedFromBatch;
        if (availableInBatch > 0) {
          const vendor = vendors.find(v => v.id === inward.vendorId);
          const vName = vendor?.name || (inward.type === 'Transfer' ? 'Inbound Stock' : 'Standard Supplier');
          batches.push({
            id: mat.id,
            name: mat.name,
            unit: mat.unit,
            batchId: batchId,
            vendorName: vName,
            vendorId: inward.vendorId,
            unitPrice: inward.unitPrice || mat.costPerUnit,
            available: availableInBatch,
            isLocal: inward.projectId === viewingProject.id
          });
        }
      });
    });
    return batches.filter(b => {
      const term = usageMaterialSearch.toLowerCase();
      return b.name.toLowerCase().includes(term) || b.vendorName.toLowerCase().includes(term);
    }).sort((a, b) => {
      if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [materials, viewingProject, vendors, usageMaterialSearch]);

  const handleRecordArrivalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProject) return;
    const qty = parseFloat(arrivalFormData.quantity) || 0;
    const unitPrice = parseFloat(arrivalFormData.costPerUnit) || 0;
    const totalAmount = qty * unitPrice;
    
    let targetMaterialId = arrivalFormData.materialId;
    if (targetMaterialId === 'new') {
      const normalizedNewName = arrivalFormData.newMaterialName.replace(/[\s.]/g, '').toLowerCase();
      const duplicate = materials.find(m => m.name.replace(/[\s.]/g, '').toLowerCase() === normalizedNewName);
      if (duplicate) {
        alert(`This material already exists as "${duplicate.name}". Please select it from the dropdown instead of creating a new one.`);
        return;
      }
      const newId = 'm' + Date.now();
      await addMaterial({ id: newId, name: arrivalFormData.newMaterialName, unit: arrivalFormData.unit, costPerUnit: unitPrice, totalPurchased: 0, totalUsed: 0, history: [] });
      targetMaterialId = newId;
    }

    await addExpense({
      id: 'e-arr-' + Date.now(),
      date: arrivalFormData.date,
      projectId: viewingProject.id,
      vendorId: arrivalFormData.vendorId || undefined,
      amount: totalAmount,
      paymentMethod: 'Bank',
      category: 'Material',
      notes: arrivalFormData.note || `Inbound arrival: ${qty} units received at ${viewingProject.name}`,
      materialId: targetMaterialId,
      materialQuantity: qty,
      inventoryAction: 'Purchase'
    });

    setShowRecordArrivalModal(false);
    setArrivalFormData({ materialId: '', newMaterialName: '', vendorId: '', quantity: '', unit: stockingUnits[0] || 'Bag', costPerUnit: '', date: new Date().toISOString().split('T')[0], note: '' });
  };

  const handleInventoryUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProject || !inventoryUsageForm.materialId || !inventoryUsageForm.batchId) return;
    const selectedBatch = siteRelevantMaterials.find(b => b.id === inventoryUsageForm.materialId && b.batchId === inventoryUsageForm.batchId);
    if (!selectedBatch) return;
    const qty = parseFloat(inventoryUsageForm.quantity) || 0;
    if (selectedBatch.available < qty) { alert(`Error: Insufficient stock in this batch. (Available: ${selectedBatch.available} ${selectedBatch.unit})`); return; }
    const totalCost = qty * selectedBatch.unitPrice;
    await addExpense({ 
      id: 'e-inv-' + Date.now(), 
      date: inventoryUsageForm.date, 
      projectId: viewingProject.id, 
      amount: totalCost, 
      paymentMethod: 'Bank', 
      category: 'Material', 
      materialId: selectedBatch.id, 
      vendorId: selectedBatch.vendorId, 
      inventoryAction: 'Usage', 
      materialQuantity: -qty, 
      parentPurchaseId: selectedBatch.batchId, 
      notes: inventoryUsageForm.notes || `Consumption: ${qty} ${selectedBatch.unit} of ${selectedBatch.name}` 
    });
    setShowInventoryUsageModal(false);
    setInventoryUsageForm({ materialId: '', batchId: '', vendorId: '', quantity: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const handleQuickIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProject) return;

    const amountNum = parseFloat(incomeFormData.amount) || 0;

    if (incomeFormData.invoiceId) {
      const inv = invoices.find(v => v.id === incomeFormData.invoiceId);
      if (inv) {
        const { remaining } = getInvoiceMetrics(inv);
        const limit = remaining + (editingIncome?.amount || 0);
        if (amountNum > limit + 0.01) {
          alert(`Validation Error: Collection amount of ${formatCurrency(amountNum)} exceeds the remaining balance of ${formatCurrency(limit)} for the selected invoice.`);
          return;
        }
      }
    } else {
        alert("Action Required: You must link this collection to a project invoice.");
        return;
    }

    const incData: Income = {
      id: editingIncome ? editingIncome.id : 'inc-' + Date.now(),
      projectId: viewingProject.id,
      amount: amountNum,
      description: incomeFormData.description,
      date: incomeFormData.date,
      method: incomeFormData.method,
      invoiceId: incomeFormData.invoiceId
    };

    if (editingIncome) await updateIncome(incData);
    else await addIncome(incData);

    setShowQuickIncome(false);
    setEditingIncome(null);
    setIncomeFormData({ amount: '', date: new Date().toISOString().split('T')[0], description: '', method: 'Bank', invoiceId: '' });
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProject) return;
    const invData: Invoice = {
      id: editingInvoice ? editingInvoice.id : 'inv-' + Date.now(),
      projectId: viewingProject.id,
      amount: parseFloat(invoiceFormData.amount) || 0,
      date: invoiceFormData.date,
      dueDate: invoiceFormData.dueDate,
      description: invoiceFormData.description,
      status: editingInvoice ? editingInvoice.status : 'Sent'
    };

    if (editingInvoice) await updateInvoice(invData);
    else await addInvoice(invData);

    setShowInvoiceModal(false);
    setEditingInvoice(null);
    setInvoiceFormData({ amount: '', date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], description: '' });
  };

  const handleOpenEditIncome = (inc: Income) => {
    setEditingIncome(inc);
    setIncomeFormData({
      amount: inc.amount.toString(),
      date: inc.date,
      description: inc.description,
      method: inc.method,
      invoiceId: inc.invoiceId || ''
    });
    setShowQuickIncome(true);
  };

  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvoiceFormData({
      amount: inv.amount.toString(),
      date: inv.date,
      dueDate: inv.dueDate,
      description: inv.description
    });
    setShowInvoiceModal(true);
  };

  const logMaterialHistory = useMemo(() => {
    if (!logMaterial || !viewingProject) return [];
    return (logMaterial.history || [])
      .filter(h => h.projectId === viewingProject.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logMaterial, viewingProject]);

  const triggerCollectPayment = (inv: Invoice, remaining: number) => {
    setEditingIncome(null);
    setIncomeFormData({
      amount: remaining.toString(),
      date: new Date().toISOString().split('T')[0],
      description: `Collection for Invoice #${inv.id.slice(-6).toUpperCase()}`,
      method: 'Bank',
      invoiceId: inv.id
    });
    setShowQuickIncome(true);
  };

  // Helper variables for Project Insights Rendering to avoid IIFE syntax error
  const viewingProjectMetrics = viewingProject ? calculateProjectMetrics(viewingProject.id, viewingProject.budget) : null;
  const projectInvoicesForIncomeLink = viewingProject ? invoices.filter(inv => inv.projectId === viewingProject.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Portfolio & Godowns</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage project sites and central storage hubs.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Plus size={20} /> Add Site / Godown
        </button>
      </div>

      {godownProjects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <Warehouse size={16} /> Central Godowns (Stock Hubs)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {godownProjects.map(godown => (
              <div key={godown.id} className="bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] border border-slate-800 overflow-hidden hover:border-emerald-500 transition-all group flex flex-col shadow-xl">
                <div className="p-6 flex-1">
                  <div className="flex justify-between mb-4">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Active Hub</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEditProject(godown); }} className="p-1.5 text-slate-500 hover:text-white transition-colors"><Pencil size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); if(confirm(`Delete Godown ${godown.name}?`)) deleteProject(godown.id); }} className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{godown.name}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase flex items-center gap-1.5 mt-1"><MapPin size={12} /> {godown.location}</p>
                </div>
                <div className="grid grid-cols-2 border-t border-white/5">
                  <button onClick={() => { setViewingProject(godown); setActiveDetailTab('arrivals'); }} className="py-5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all border-r border-white/5"><Package size={14} /> View Stock</button>
                  <button onClick={() => { setViewingProject(godown); setActiveDetailTab('arrivals'); setShowRecordArrivalModal(true); }} className="py-5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all">Record Inward</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <Briefcase size={16} /> Construction Project Sites
          </h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search by name, location or client..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-72 pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-bold uppercase tracking-wider outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 overflow-x-auto no-scrollbar">
              <button onClick={() => setFilter('All')} className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${filter === 'All' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>All</button>
              {sortedStatuses.map(tab => (
                <button key={tab} onClick={() => setFilter(tab)} className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${filter === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>{tab}</button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {constructionSites.map((project) => {
            const metrics = calculateProjectMetrics(project.id, project.budget);
            return (
              <div key={project.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-all group flex flex-col shadow-sm">
                <div className="p-6 flex-1">
                  <div className="flex justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${project.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30'}`}>{project.status}</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEditProject(project); }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); if(confirm(`Delete ${project.name}?`)) deleteProject(project.id); }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{project.name}</h3>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1.5 mt-0.5 sm:mt-1"><MapPin size={12} /> {project.location}</p>
                  
                  <div className="mt-4 sm:mt-6 flex gap-3 sm:gap-4">
                     <button onClick={() => { setViewingProject(project); setActiveDetailTab('arrivals'); }} className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl sm:rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Material Arrivals">
                        <Package size={18} />
                     </button>
                     <div className="flex-1">
                        <div className="flex justify-between text-[9px] sm:text-[10px] font-black text-slate-400 mb-1 sm:mb-1.5 uppercase tracking-widest"><span>Realized Costs</span><span className="text-blue-600">{metrics.progress}%</span></div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 sm:h-2 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${metrics.progress}%` }}></div></div>
                     </div>
                  </div>
                </div>
                <button onClick={() => { setViewingProject(project); setActiveDetailTab('expenses'); }} className="w-full py-5 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center justify-between px-6 hover:bg-blue-600 hover:text-white transition-all">Project Insights <ChevronRight size={18} /></button>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/20">
                <div className="flex gap-4 items-center">
                  <div className={`p-4 ${formData.isGodown ? 'bg-slate-900' : 'bg-blue-600'} text-white rounded-2xl shadow-lg`}>
                    {formData.isGodown ? <Warehouse size={24} /> : <Briefcase size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingProject ? 'Modify Entity' : `Launch New ${formData.isGodown ? 'Godown' : 'Site'}`}</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Database Registration Entry</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
             </div>
             <form onSubmit={handleProjectSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto no-scrollbar pb-safe">
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-fit mb-4">
                  <button type="button" onClick={() => setFormData(p => ({ ...p, isGodown: false }))} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isGodown ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Construction Site</button>
                  <button type="button" onClick={() => setFormData(p => ({ ...p, isGodown: true }))} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.isGodown ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}>Godown / Warehouse</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{formData.isGodown ? 'Godown Name' : 'Project Site Name'}</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder={formData.isGodown ? "e.g. Main Central Hub" : "e.g. Oakwood Residency"} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{formData.isGodown ? 'Supervisor' : 'Client / Owner'}</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.client} onChange={e => setFormData(p => ({ ...p, client: e.target.value }))} placeholder="Incharge name..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Location Address</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="Street, City..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Number</label>
                    <input type="tel" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.contactNumber} onChange={e => setFormData(p => ({ ...p, contactNumber: e.target.value }))} placeholder="+00 000 0000" />
                  </div>
                </div>
                {!formData.isGodown && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Budget (Rs.)</label>
                      <input type="number" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none" value={formData.budget} onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                      <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Site Status</label>
                      <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                        {sortedStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Brief Description</label>
                  <textarea rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Brief project scope..."></textarea>
                </div>
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
                   <button type="submit" className={`flex-1 ${formData.isGodown ? 'bg-slate-900' : 'bg-blue-600'} text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest`}>Register {formData.isGodown ? 'Godown' : 'Project'}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Insights Modal */}
      {viewingProject && viewingProjectMetrics && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className={`bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-6xl h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border-t-8 ${viewingProject.isGodown ? 'border-slate-900' : 'border-blue-600'}`}>
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
                <div className="flex gap-4 items-center">
                  <div className={`p-4 ${viewingProject.isGodown ? 'bg-slate-900' : 'bg-blue-600'} text-white rounded-[1.5rem] shadow-xl`}>
                    {viewingProject.isGodown ? <Warehouse size={32} /> : <Briefcase size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{viewingProject.name}</h2>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{viewingProject.isGodown ? `Supervisor: ${viewingProject.client}` : `Client: ${viewingProject.client}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenEditProject(viewingProject)} className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Edit Project Details"><Pencil size={18} /></button>
                  <button onClick={() => setViewingProject(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/20 dark:bg-slate-900/10 no-scrollbar">
                {!viewingProject.isGodown && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1.5">Master Budget</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(viewingProject.budget)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Spent Budget</p>
                      <p className="text-xl font-black text-red-600">{formatCurrency(viewingProjectMetrics.totalSpent)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5">Labor Costs</p>
                      <p className="text-xl font-black text-orange-600">{formatCurrency(viewingProjectMetrics.totalLabor)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">Total Billed</p>
                      <p className="text-xl font-black text-blue-600">{formatCurrency(viewingProjectMetrics.totalInvoiced)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">Total Received</p>
                      <p className="text-xl font-black text-emerald-600">{formatCurrency(viewingProjectMetrics.totalCollected)}</p>
                    </div>
                    <div className="bg-blue-600 p-5 rounded-3xl shadow-xl text-white flex flex-col justify-between">
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Receivable Balance</p>
                      <p className="text-xl font-black mt-2">{formatCurrency(viewingProjectMetrics.receivable)}</p>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col">
                  <div className="flex flex-col sm:flex-row border-b border-slate-100 dark:border-slate-700 justify-between items-start sm:items-center pr-6 bg-slate-50/30 dark:bg-slate-900/20">
                    <div className="flex w-full sm:w-auto overflow-x-auto no-scrollbar">
                      {!viewingProject.isGodown && <button onClick={() => setActiveDetailTab('expenses')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeDetailTab === 'expenses' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-4 border-blue-600' : 'text-slate-400'}`}>Site Costs</button>}
                      {!viewingProject.isGodown && <button onClick={() => setActiveDetailTab('invoices')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeDetailTab === 'invoices' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-4 border-indigo-600' : 'text-slate-400'}`}>Client Invoices</button>}
                      {!viewingProject.isGodown && <button onClick={() => setActiveDetailTab('income')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeDetailTab === 'income' ? 'bg-white dark:bg-slate-800 text-emerald-600 border-b-4 border-emerald-600' : 'text-slate-400'}`}>Project Income</button>}
                      <button onClick={() => setActiveDetailTab('arrivals')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeDetailTab === 'arrivals' ? 'bg-white dark:bg-slate-800 text-amber-600 border-b-4 border-amber-600' : 'text-slate-400'}`}>{viewingProject.isGodown ? 'Current Hub Stock' : 'Material Arrivals'}</button>
                    </div>
                    <div className="p-4 sm:p-0 flex gap-2 w-full sm:w-auto">
                      {activeDetailTab === 'arrivals' && (
                        <button onClick={() => setShowRecordArrivalModal(true)} className="flex-1 sm:flex-none bg-amber-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={16} /> Record Inbound Arrival</button>
                      )}
                      {!viewingProject.isGodown && activeDetailTab === 'income' && (
                        <button onClick={() => { setEditingIncome(null); setIncomeFormData({ amount: '', date: new Date().toISOString().split('T')[0], description: '', method: 'Bank', invoiceId: '' }); setShowQuickIncome(true); }} className="flex-1 sm:flex-none bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={16} /> Record Income</button>
                      )}
                      {!viewingProject.isGodown && activeDetailTab === 'invoices' && (
                        <button onClick={() => { setEditingInvoice(null); setInvoiceFormData({ amount: '', date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], description: '' }); setShowInvoiceModal(true); }} className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><FileText size={16} /> Generate Invoice</button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto no-scrollbar">
                     <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                          {activeDetailTab === 'arrivals' ? (
                            <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Material Asset</th><th className="px-8 py-5 text-center">Arrived</th><th className="px-8 py-5 text-center">In Hand</th><th className="px-8 py-5 text-right">Operations</th></tr>
                          ) : activeDetailTab === 'expenses' ? (
                            <tr><th className="px-8 py-5">Value Date</th><th className="px-8 py-5">Details</th><th className="px-8 py-5 text-center">Quantity</th><th className="px-8 py-5 text-right">Amount</th><th className="px-8 py-5 text-right">Control</th></tr>
                          ) : activeDetailTab === 'income' ? (
                            <tr><th className="px-8 py-5">Value Date</th><th className="px-8 py-5">Description</th><th className="px-8 py-5">Method</th><th className="px-8 py-5 text-right">Amount</th><th className="px-8 py-5 text-right">Control</th></tr>
                          ) : activeDetailTab === 'invoices' ? (
                            <tr><th className="px-8 py-5">Inv #</th><th className="px-8 py-5">Date</th><th className="px-8 py-5">Description</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Bill Value</th><th className="px-8 py-5 text-right">Control</th></tr>
                          ) : null}
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                           {activeDetailTab === 'arrivals' && projectArrivals.map((arrival, idx) => (
                             <tr key={`${arrival.material.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                               <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(arrival.entry.date).toLocaleDateString()}</td>
                               <td className="px-8 py-5">
                                  <button onClick={() => setLogMaterial(arrival.material)} className="text-left group/mat">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase group-hover/mat:text-blue-600 transition-colors">{arrival.material.name} <span className="text-[10px] font-bold text-slate-400">({arrival.material.unit})</span></p>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{arrival.entry.type === 'Transfer' ? 'Transfer' : 'Purchase'}</span>
                                  </button>
                               </td>
                               <td className="px-8 py-5 text-center"><span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">{arrival.arrived.toLocaleString()}</span></td>
                               <td className="px-8 py-5 text-center"><span className={`text-xs font-black px-3 py-1 rounded-lg border ${arrival.remaining > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>{arrival.remaining.toLocaleString()}</span></td>
                               <td className="px-8 py-5 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      disabled={arrival.remaining <= 0} 
                                      onClick={() => { 
                                        setUsageMaterialSearch(''); 
                                        setInventoryUsageForm({ 
                                          materialId: arrival.material.id, 
                                          batchId: arrival.entry.id.replace('sh-exp-', ''), 
                                          vendorId: arrival.entry.vendorId || '', 
                                          quantity: arrival.remaining.toString(), 
                                          date: new Date().toISOString().split('T')[0], 
                                          notes: `Consuming arrival from ${new Date(arrival.entry.date).toLocaleDateString()}` 
                                        }); 
                                        setShowInventoryUsageModal(true); 
                                      }} 
                                      className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${arrival.remaining > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                    >
                                      Consume
                                    </button>
                                  </div>
                               </td>
                             </tr>
                           ))}
                           {activeDetailTab === 'expenses' && viewingProjectMetrics.allExpenses.filter(e => e.inventoryAction !== 'Purchase' && e.inventoryAction !== 'Transfer').slice().reverse().map(e => (
                             <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group/row">
                               <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                               <td className="px-8 py-5">
                                 <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{e.materialId ? materials.find(m => m.id === e.materialId)?.name : e.category}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">Vendor: {vendors.find(v => v.id === e.vendorId)?.name || 'Direct'}</p>
                               </td>
                               <td className="px-8 py-5 text-center">{e.materialQuantity ? <span className="text-xs font-black bg-slate-100 px-3 py-1 rounded-lg">{Math.abs(e.materialQuantity).toLocaleString()}</span> : '--'}</td>
                               <td className="px-8 py-5 text-sm font-black text-red-600 text-right">{formatCurrency(e.amount)}</td>
                               <td className="px-8 py-5 text-right"><button onClick={() => deleteExpense(e.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button></td>
                             </tr>
                           ))}
                           {activeDetailTab === 'income' && incomes.filter(i => i.projectId === viewingProject.id).slice().reverse().map(inc => (
                             <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(inc.date).toLocaleDateString()}</td>
                                <td className="px-8 py-5">
                                   <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">{inc.description}</p>
                                   <span className="text-[8px] font-black text-indigo-500 uppercase flex items-center gap-1 mt-0.5"><Receipt size={10} /> Link: #{inc.invoiceId?.slice(-6).toUpperCase()}</span>
                                </td>
                                <td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">{inc.method}</td>
                                <td className="px-8 py-5 text-right font-black text-emerald-600">{formatCurrency(inc.amount)}</td>
                                <td className="px-8 py-5 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button onClick={() => handleOpenEditIncome(inc)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={16} /></button>
                                    <button onClick={() => deleteIncome(inc.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                  </div>
                                </td>
                             </tr>
                           ))}
                           {activeDetailTab === 'invoices' && viewingProjectMetrics.invoices.slice().reverse().map(inv => {
                             const { remaining, isPaid } = getInvoiceMetrics(inv);
                             return (
                               <tr key={inv.id} className={`transition-colors group ${isPaid ? 'bg-emerald-50/40 dark:bg-emerald-900/5 hover:bg-emerald-50/60' : 'hover:bg-slate-50/50'}`}>
                                 <td className="px-8 py-5 text-[10px] font-bold text-slate-400">#{inv.id.slice(-6).toUpperCase()}</td>
                                 <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                                 <td className="px-8 py-5">
                                   <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">{inv.description}</p>
                                   <p className={`text-[9px] font-black uppercase ${!isPaid ? 'text-red-500' : 'text-emerald-500'}`}>Balance: {formatCurrency(remaining)}</p>
                                 </td>
                                 <td className="px-8 py-5">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                       {isPaid ? 'Paid' : 'Unpaid'}
                                    </span>
                                 </td>
                                 <td className="px-8 py-5 text-sm font-black text-indigo-600 text-right">{formatCurrency(inv.amount)}</td>
                                 <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-1">
                                       {!isPaid && <button onClick={() => triggerCollectPayment(inv, remaining)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Record Receipt"><ArrowDownCircle size={18} /></button>}
                                       <button onClick={() => handleOpenEditInvoice(inv)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Pencil size={18} /></button>
                                       <button onClick={() => deleteInvoice(inv.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                                    </div>
                                 </td>
                               </tr>
                             );
                           })}
                        </tbody>
                     </table>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end shrink-0 bg-white dark:bg-slate-800"><button onClick={() => setViewingProject(null)} className="bg-slate-900 text-white px-10 py-4 rounded-3xl font-black uppercase tracking-widest active:scale-95 transition-all text-xs">Close Details</button></div>
            </div>
          </div>
      )}

      {/* Record Arrival Modal */}
      {showRecordArrivalModal && viewingProject && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-amber-50/30 dark:bg-amber-900/10 flex justify-between items-center">
                 <div className="flex gap-4 items-center">
                    <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-lg"><ShoppingCart size={24} /></div>
                    <div>
                       <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Record Inward Arrival</h2>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Arrival at: {viewingProject.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowRecordArrivalModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={28} /></button>
              </div>
              <form onSubmit={handleRecordArrivalSubmit} className="p-8 space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Material Asset Category</label>
                    <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={arrivalFormData.materialId} onChange={e => setArrivalFormData(p => ({ ...p, materialId: e.target.value }))}>
                       <option value="">Choose material...</option>
                       <option value="new">+ Register New Asset Category</option>
                       {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                 </div>
                 {arrivalFormData.materialId === 'new' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                       <input type="text" placeholder="Material Name" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white" value={arrivalFormData.newMaterialName} onChange={e => setArrivalFormData(p => ({ ...p, newMaterialName: e.target.value }))} required />
                       <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white" value={arrivalFormData.unit} onChange={e => setArrivalFormData(p => ({ ...p, unit: e.target.value }))}>
                          {stockingUnits.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                 )}
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supplier / Vendor</label>
                    <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={arrivalFormData.vendorId} onChange={e => setArrivalFormData(p => ({ ...p, vendorId: e.target.value }))}>
                       <option value="">Select Vendor...</option>
                       {vendors.filter(v => v.isActive !== false || v.id === arrivalFormData.vendorId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Qty Arrived</label><input type="number" step={allowDecimalStock ? "0.01" : "1"} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white" value={arrivalFormData.quantity} onChange={e => setArrivalFormData(p => ({ ...p, quantity: e.target.value }))} required /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unit Price (Rs.)</label><input type="number" step="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white" value={arrivalFormData.costPerUnit} onChange={e => setArrivalFormData(p => ({ ...p, costPerUnit: e.target.value }))} required /></div>
                 </div>
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Arrival Date</label><input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white mb-2" value={arrivalFormData.date} onChange={e => setArrivalFormData(p => ({ ...p, date: e.target.value }))} required /><textarea className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white" rows={2} placeholder="Gate pass, vehicle details..." value={arrivalFormData.note} onChange={e => setArrivalFormData(p => ({ ...p, note: e.target.value }))} /></div>
                 <button type="submit" className="w-full bg-amber-600 text-white py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-amber-100 dark:shadow-none active:scale-95 transition-all text-sm mt-4">Confirm Stock Reception</button>
              </form>
           </div>
        </div>
      )}

      {/* Quick Income Modal */}
      {showQuickIncome && viewingProject && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
             <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/20">
                   <div className="flex gap-4 items-center">
                      <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><DollarSign size={24} /></div>
                      <div>
                         <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingIncome ? 'Modify Receipt' : 'Record Collection'}</h2>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Project: {viewingProject.name}</p>
                      </div>
                   </div>
                   <button onClick={() => { setShowQuickIncome(false); setEditingIncome(null); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={28} /></button>
                </div>
                <form onSubmit={handleQuickIncomeSubmit} className="p-8 space-y-5">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Link to Receivable Invoice</label>
                      <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none transition-all focus:ring-2 focus:ring-emerald-500" value={incomeFormData.invoiceId} onChange={e => {
                        const invId = e.target.value;
                        const inv = projectInvoicesForIncomeLink.find(i => i.id === invId);
                        if (inv) {
                          const { remaining } = getInvoiceMetrics(inv);
                          const limit = remaining + (editingIncome?.amount || 0);
                          setIncomeFormData(p => ({ ...p, invoiceId: invId, amount: limit.toString(), description: `Collection for Invoice #${inv.id.slice(-6).toUpperCase()}` }));
                        } else {
                          setIncomeFormData(p => ({ ...p, invoiceId: '' }));
                        }
                      }}>
                        <option value="">Choose target invoice...</option>
                        {projectInvoicesForIncomeLink.map(inv => {
                          const { remaining } = getInvoiceMetrics(inv);
                          const limit = remaining + (editingIncome?.amount || 0);
                          return <option key={inv.id} value={inv.id}>{inv.description} | Balance: {formatCurrency(limit)} | #{inv.id.slice(-6).toUpperCase()}</option>;
                        })}
                      </select>
                   </div>
                   <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Milestone Description</label><textarea required rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" placeholder="e.g. 1st Floor Slab casting complete..." value={incomeFormData.description} onChange={e => setIncomeFormData(p => ({ ...p, description: e.target.value }))} /></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount (Rs.)</label><input type="number" required step="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white" value={incomeFormData.amount} onChange={e => setIncomeFormData(p => ({ ...p, amount: e.target.value }))} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Value Date</label><input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white" value={incomeFormData.date} onChange={e => setIncomeFormData(p => ({ ...p, date: e.target.value }))} /></div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Settlement Channel</label>
                      <div className="grid grid-cols-3 gap-2">
                         {(['Bank', 'Cash', 'Online'] as PaymentMethod[]).map(m => (
                           <button key={m} type="button" onClick={() => setIncomeFormData(p => ({ ...p, method: m }))} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${incomeFormData.method === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-500'}`}>{m}</button>
                         ))}
                      </div>
                   </div>
                   <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95 transition-all text-sm mt-4">
                     {editingIncome ? 'Authorize Update' : 'Confirm Collection'}
                   </button>
                </form>
             </div>
          </div>
      )}

      {/* Quick Invoice Modal */}
      {showInvoiceModal && viewingProject && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/30 dark:bg-indigo-900/20">
                 <div className="flex gap-4 items-center">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><FileText size={24} /></div>
                    <div>
                       <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingInvoice ? 'Edit Invoice' : 'Generate Invoice'}</h2>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Client: {viewingProject.client}</p>
                    </div>
                 </div>
                 <button onClick={() => { setShowInvoiceModal(false); setEditingInvoice(null); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={28} /></button>
              </div>
              <form onSubmit={handleInvoiceSubmit} className="p-8 space-y-5">
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Billable Description</label><textarea required rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" placeholder="e.g. Structure Completion Milestone..." value={invoiceFormData.description} onChange={e => setInvoiceFormData(p => ({ ...p, description: e.target.value }))} /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount (Rs.)</label><input type="number" required step="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white" value={invoiceFormData.amount} onChange={e => setInvoiceFormData(p => ({ ...p, amount: e.target.value }))} /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Invoice Date</label><input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white" value={invoiceFormData.date} onChange={e => setInvoiceFormData(p => ({ ...p, date: e.target.value }))} /></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Due Date</label><input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white" value={invoiceFormData.dueDate} onChange={e => setInvoiceFormData(p => ({ ...p, dueDate: e.target.value }))} /></div>
                 </div>
                 <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95 transition-all text-sm mt-4">
                   {editingInvoice ? 'Update Client Invoice' : 'Generate & Register Invoice'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Consumption Modal */}
      {showInventoryUsageModal && viewingProject && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
             <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/20">
                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Package size={24} /></div>
                  <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Record Consumption</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Stock Deduction for {viewingProject.name}</p></div>
                </div>
                <button onClick={() => { setShowInventoryUsageModal(false); setUsageMaterialSearch(''); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={28} /></button>
             </div>
             <form onSubmit={handleInventoryUsageSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Select Material Pool</label>
                   <div className="relative mb-2">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                     <input 
                       type="text" 
                       placeholder="Search batch..."
                       className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                       value={usageMaterialSearch}
                       onChange={(e) => setUsageMaterialSearch(e.target.value)}
                     />
                   </div>
                   <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none text-xs focus:ring-2 focus:ring-blue-500" value={`${inventoryUsageForm.materialId}|${inventoryUsageForm.batchId}`} onChange={e => { const [mId, bId] = e.target.value.split('|'); setInventoryUsageForm(p => ({ ...p, materialId: mId, batchId: bId })); }}>
                     <option value="|">Choose stock batch...</option>
                     {siteRelevantMaterials.map((batch, idx) => (<option key={idx} value={`${batch.id}|${batch.batchId}`}>{batch.name} / {batch.vendorName} / {formatCurrency(batch.unitPrice)} / {batch.available.toLocaleString()} {batch.unit}</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Quantity</label><input type="number" step={allowDecimalStock ? "0.01" : "1"} required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white" value={inventoryUsageForm.quantity} onChange={e => setInventoryUsageForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0.00" /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Date</label><input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white" value={inventoryUsageForm.date} onChange={e => setInventoryUsageForm(p => ({ ...p, date: e.target.value }))} /></div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Remarks / Note</label>
                   <textarea rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={inventoryUsageForm.notes} onChange={e => setInventoryUsageForm(p => ({ ...p, notes: e.target.value }))} placeholder="Hub operation details..."></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest">Confirm Consumption</button>
             </form>
          </div>
        </div>
      )}

      {/* Material Log Sub-Modal */}
      {logMaterial && viewingProject && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-4xl h-[80vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><History size={24} /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{logMaterial.name} Ledger</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Site Activity Log for {viewingProject.name}</p>
                  </div>
                </div>
                <button onClick={() => setLogMaterial(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={28} /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-0 no-scrollbar">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-8 py-4">Date</th>
                        <th className="px-8 py-4">Activity</th>
                        <th className="px-8 py-4">Reference / Note</th>
                        <th className="px-8 py-4 text-right">Qty ({logMaterial.unit})</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {logMaterialHistory.length > 0 ? logMaterialHistory.map((h, i) => (
                        <tr key={`${h.id}-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                           <td className="px-8 py-4 text-xs font-bold text-slate-500">{new Date(h.date).toLocaleDateString()}</td>
                           <td className="px-8 py-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                h.type === 'Purchase' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                h.type === 'Usage' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-indigo-50 text-indigo-600 border-indigo-100'
                              }`}>
                                {h.type}
                              </span>
                           </td>
                           <td className="px-8 py-4 text-xs font-medium text-slate-600 dark:text-slate-400 italic truncate max-w-[200px]">{h.note || 'No note provided'}</td>
                           <td className={`px-8 py-4 text-right text-sm font-black ${h.quantity > 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                              {h.quantity > 0 ? '+' : ''}{h.quantity.toLocaleString()}
                           </td>
                        </tr>
                      )) : (
                        <tr>
                           <td colSpan={4} className="px-8 py-20 text-center text-slate-300 uppercase font-black tracking-widest text-[10px]">No site activity recorded for this material</td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
             
             <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end shrink-0">
                <button onClick={() => setLogMaterial(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close Log</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};