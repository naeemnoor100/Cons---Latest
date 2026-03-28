
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowUpCircle, 
  Plus, 
  X, 
  Search, 
  Pencil, 
  Trash2,
  Receipt,
  Users,
  BookOpen,
  Download,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Income, PaymentMethod, Invoice } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const ProjectIncome: React.FC = () => {
  const { projects, incomes, invoices, addIncome, updateIncome, deleteIncome, isProjectLocked, currentUser } = useApp();
  
  const canCreateIncome = currentUser.permissions?.['incomes']?.includes('create');
  const canEditIncome = currentUser.permissions?.['incomes']?.includes('edit');
  const canDeleteIncome = currentUser.permissions?.['incomes']?.includes('delete');
  const [showModal, setShowModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedLedgerSite, setSelectedLedgerSite] = useState<string>('');
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  type SortField = 'date' | 'description' | 'method' | 'amount';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
  
  const [formData, setFormData] = useState({
    projectId: '', 
    amount: '', 
    description: '', 
    date: new Date().toISOString().split('T')[0], 
    method: 'Bank' as PaymentMethod,
    invoiceId: ''
  });

  const siteLedgerEntries = useMemo(() => {
    if (!selectedLedgerSite) return [];
    
    const projectInvoices = invoices.filter(inv => inv.projectId === selectedLedgerSite);
    const projectIncomes = incomes.filter(inc => inc.projectId === selectedLedgerSite);
    
    const combined = [
      ...projectInvoices.map(inv => ({ 
        id: inv.id,
        date: inv.date, 
        description: `Invoice #${inv.id.slice(-6).toUpperCase()} - ${inv.description}`, 
        type: 'Invoice' as const, 
        amount: inv.amount 
      })),
      ...projectIncomes.map(inc => ({ 
        id: inc.id,
        date: inc.date, 
        description: `Receipt - ${inc.description}`, 
        type: 'Income' as const, 
        amount: inc.amount 
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let balance = 0;
    return combined.map(entry => {
      if (entry.type === 'Invoice') {
        balance += entry.amount;
      } else {
        balance -= entry.amount;
      }
      return { ...entry, balance };
    });
  }, [selectedLedgerSite, invoices, incomes]);

  const ledgerSummary = useMemo(() => {
    let totalReceivable = 0;
    let totalReceived = 0;
    siteLedgerEntries.forEach(entry => {
      if (entry.type === 'Invoice') totalReceivable += entry.amount;
      if (entry.type === 'Income') totalReceived += entry.amount;
    });
    return {
      totalReceivable,
      totalReceived,
      balance: totalReceivable - totalReceived
    };
  }, [siteLedgerEntries]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setEditingIncome(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getInvoiceMetrics = useCallback((inv: Invoice) => {
    // Exclude current if editing to find true remaining
    const collected = incomes
      .filter(i => i.invoiceId === inv.id && (editingIncome ? i.id !== editingIncome.id : true))
      .reduce((sum, i) => sum + i.amount, 0);
    const remaining = Math.max(0, inv.amount - collected);
    return { collected, remaining };
  }, [incomes, editingIncome]);

  const downloadLedgerPDF = () => {
    if (!selectedLedgerSite) return;
    const project = projects.find(p => p.id === selectedLedgerSite);
    if (!project) return;

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Customer Ledger', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Project: ${project.name}`, 14, 32);
    doc.text(`Client: ${project.client || 'N/A'}`, 14, 38);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 44);

    doc.setFontSize(11);
    doc.text(`Total Receivable: ${formatCurrency(ledgerSummary.totalReceivable)}`, 14, 54);
    doc.text(`Total Received: ${formatCurrency(ledgerSummary.totalReceived)}`, 14, 60);
    doc.text(`Balance Due: ${formatCurrency(ledgerSummary.balance)}`, 14, 66);

    const tableData = siteLedgerEntries.map(entry => [
      new Date(entry.date).toLocaleDateString(),
      entry.description,
      entry.type === 'Invoice' ? formatCurrency(entry.amount) : '-',
      entry.type === 'Income' ? formatCurrency(entry.amount) : '-',
      formatCurrency(entry.balance)
    ]);

    autoTable(doc, {
      startY: 74,
      head: [['Date', 'Description', 'Receivable (Invoiced)', 'Received (Payment)', 'Balance Due']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      }
    });

    doc.save(`Ledger_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleCreateOrUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount) || 0;

    // VALIDATION: Collected amount can not be higher than invoice selected
    if (formData.invoiceId) {
      const inv = invoices.find(v => v.id === formData.invoiceId);
      if (inv) {
        const { remaining } = getInvoiceMetrics(inv);
        // Add back current amount if editing to get the headroom
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
      id: editingIncome ? editingIncome.id : 'inc' + Date.now(),
      projectId: formData.projectId,
      amount: amountNum,
      description: formData.description,
      date: formData.date,
      method: formData.method,
      invoiceId: formData.invoiceId
    };

    if (editingIncome) await updateIncome(incData);
    else await addIncome(incData);

    setShowModal(false);
    setEditingIncome(null);
    setFormData({ 
      projectId: '', 
      amount: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0], 
      method: 'Bank',
      invoiceId: ''
    });
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Income Record',
      message: "Are you sure you want to delete this income record? Associated invoice status (if any) will revert to 'Sent'.",
      onConfirm: () => {
        deleteIncome(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const projectIncomesGrouped = useMemo(() => {
    const grouped: Record<string, { project: Project; items: Income[]; total: number; remaining: number }> = {};
    
    incomes.forEach(inc => {
      const project = projects.find(p => p.id === inc.projectId);
      if (!project) return;
      
      const matchesSearch = 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inc.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch && searchTerm) return;

      if (!grouped[inc.projectId]) {
        const projectCollected = incomes
          .filter(i => i.projectId === project.id)
          .reduce((sum, i) => sum + i.amount, 0);

        grouped[inc.projectId] = { 
          project, 
          items: [], 
          total: 0,
          remaining: project.budget - projectCollected
        };
      }
      grouped[inc.projectId].items.push(inc);
      grouped[inc.projectId].total += inc.amount;
    });

    Object.values(grouped).forEach(group => {
      group.items.sort((a, b) => {
        let comparison = 0;
        if (sortField === 'date') {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'description') {
          comparison = a.description.localeCompare(b.description);
        } else if (sortField === 'method') {
          comparison = a.method.localeCompare(b.method);
        } else if (sortField === 'amount') {
          comparison = a.amount - b.amount;
        }
        
        if (comparison === 0) {
           return a.id.localeCompare(b.id);
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [projects, incomes, searchTerm, sortField, sortDirection]);

  const filteredTotalCollected = useMemo(() => {
    return projectIncomesGrouped.reduce((sum, group) => sum + group.total, 0);
  }, [projectIncomesGrouped]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Revenue Ledger</h2><p className="text-slate-500 dark:text-slate-400 text-sm">Track milestones and project receipts.</p></div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowLedgerModal(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <BookOpen size={20} /> Open Ledger
          </button>
          {canCreateIncome && (
            <button 
              onClick={() => { setEditingIncome(null); setFormData({ projectId: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', method: 'Bank', invoiceId: '' }); setShowModal(true); }}
              className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Plus size={20} /> Record Income
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <ArrowUpCircle size={32} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtered Collected</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
              {formatCurrency(filteredTotalCollected)}
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Deep Search Revenue..." 
          className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="space-y-8 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 no-scrollbar pb-10">
        {projectIncomesGrouped.map((group) => (
          <div key={group.project.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-black uppercase tracking-tighter">{group.project.name}</h3>
              <p className="text-emerald-600 font-black">Collected: {formatCurrency(group.total)}</p>
            </div>
            <div className="overflow-y-auto max-h-[600px] no-scrollbar">
              <table className="w-full text-left relative">
                <thead className="bg-white dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1">Date {sortField === 'date' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                    </th>
                    <th className="px-8 py-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={() => handleSort('description')}>
                      <div className="flex items-center gap-1">Milestone {sortField === 'description' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                    </th>
                    <th className="px-8 py-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={() => handleSort('method')}>
                      <div className="flex items-center gap-1">Method {sortField === 'method' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                    </th>
                    <th className="px-8 py-4 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-end gap-1">Amount {sortField === 'amount' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                    </th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {group.items.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 even:bg-slate-50/30 dark:even:bg-slate-800/20 transition-colors group">
                      <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(inc.date).toLocaleDateString()}</td>
                      <td className="px-8 py-5">
                         <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{inc.description}</p>
                         <span className="text-[8px] font-black text-indigo-500 uppercase flex items-center gap-1 mt-0.5"><Receipt size={10} /> Link: #{inc.invoiceId?.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-400">{inc.method}</td>
                      <td className="px-8 py-5 text-right font-black text-emerald-600">{formatCurrency(inc.amount)}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          {canEditIncome && (
                            <button 
                              onClick={() => { setEditingIncome(inc); setFormData({ projectId: inc.projectId, amount: inc.amount.toString(), date: inc.date, description: inc.description, method: inc.method, invoiceId: inc.invoiceId || '' }); setShowModal(true); }}
                              className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Edit Income"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          {canDeleteIncome && (
                            <button 
                              onClick={() => handleDelete(inc.id)}
                              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete Income"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom duration-500">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-emerald-600 text-white rounded-2xl"><ArrowUpCircle size={24} /></div>
                 <h2 className="text-lg sm:text-xl font-black uppercase">{editingIncome ? 'Edit Entry' : 'Record Receipt'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); setEditingIncome(null); }} className="p-2 text-slate-400 hover:text-slate-900"><X size={32} /></button>
            </div>
            <form onSubmit={handleCreateOrUpdateIncome} className="p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400">Project Site</label>
                   <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={formData.projectId} onChange={e => setFormData(p => ({ ...p, projectId: e.target.value, invoiceId: '' }))} required>
                     <option value="" disabled>Select site</option>
                     {projects.filter(p => !p.isGodown).map(p => <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name}{isProjectLocked(p.id) ? ' (Locked)' : ''}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400">Received Date</label>
                   <input type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
                 </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Link to Receivable Invoice (Mandatory)</label>
                <select required className="w-full px-5 py-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-indigo-100 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={formData.invoiceId} onChange={e => {
                  const invId = e.target.value;
                  const inv = invoices.find(i => i.id === invId);
                  if (inv) {
                    const { remaining } = getInvoiceMetrics(inv);
                    const limit = remaining + (editingIncome?.amount || 0);
                    setFormData(p => ({ ...p, invoiceId: invId, amount: limit.toString(), description: `Collection for Invoice #${invId.slice(-6).toUpperCase()}` }));
                  } else {
                    setFormData(p => ({ ...p, invoiceId: '' }));
                  }
                }}>
                  <option value="" disabled>Choose target invoice...</option>
                  {invoices.filter(inv => {
                    const { remaining } = getInvoiceMetrics(inv);
                    return inv.projectId === formData.projectId && remaining > 0;
                  }).map(inv => {
                    const { remaining } = getInvoiceMetrics(inv);
                    const limit = remaining + (editingIncome?.amount || 0);
                    return <option key={inv.id} value={inv.id}>{inv.description} | Balance: {formatCurrency(limit)} | #{inv.id.slice(-6).toUpperCase()}</option>;
                  })}
                </select>
              </div>

              <textarea placeholder="Milestone Description" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} required />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Amount (Rs.)</label>
                  <input type="number" step="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-black text-lg dark:text-white outline-none" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400">Payment Channel</label>
                   <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={formData.method} onChange={e => setFormData(p => ({ ...p, method: e.target.value as PaymentMethod }))}>
                      <option value="" disabled>Select Method...</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="Cash">Cash Settlement</option>
                      <option value="Online">Online / Card</option>
                   </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-[1.5rem] font-black uppercase active:scale-95 transition-all shadow-xl shadow-emerald-100">Authorize Ledger Update</button>
            </form>
          </div>
        </div>
      )}

      {showLedgerModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl shadow-2xl overflow-hidden rounded-[2.5rem] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-blue-600 text-white rounded-2xl"><Users size={24} /></div>
                 <div>
                   <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight dark:text-white">Customer Ledger</h2>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Receivables & Collections</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedLedgerSite && (
                  <button 
                    onClick={downloadLedgerPDF}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-full shadow-sm border border-blue-100 dark:border-blue-800/30 transition-colors"
                    title="Download PDF"
                  >
                    <Download size={24} />
                  </button>
                )}
                <button onClick={() => { setShowLedgerModal(false); setSelectedLedgerSite(''); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"><X size={24} /></button>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Select Active Site</label>
              <select 
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none"
                value={selectedLedgerSite}
                onChange={(e) => setSelectedLedgerSite(e.target.value)}
              >
                <option value="" disabled>Select site...</option>
                {projects.filter(p => !p.isGodown).map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.client ? `(${p.client})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 no-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-4">
                {!selectedLedgerSite ? (
                  <div className="text-center py-12">
                    <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select a Site</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Choose a project site above to view its detailed ledger.</p>
                  </div>
                ) : siteLedgerEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Ledger Entries</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">There are no invoices or receipts for this site yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Receivable</p>
                        <p className="text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(ledgerSummary.totalReceivable)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Received</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(ledgerSummary.totalReceived)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Due</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(ledgerSummary.balance)}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4 text-right text-blue-600 dark:text-blue-400">Receivable (In)</th>
                            <th className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">Received (Out)</th>
                            <th className="px-6 py-4 text-right">Balance Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {siteLedgerEntries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {new Date(entry.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                {entry.description}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400 text-right whitespace-nowrap">
                                {entry.type === 'Invoice' ? formatCurrency(entry.amount) : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                                {entry.type === 'Income' ? formatCurrency(entry.amount) : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white text-right whitespace-nowrap">
                                {formatCurrency(Math.max(0, entry.balance))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
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
