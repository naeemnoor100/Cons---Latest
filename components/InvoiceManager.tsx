
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  X, 
  Calendar, 
  Briefcase, 
  Pencil,
  Trash2,
  Check,
  ArrowUp,
  ArrowDown,
  Download
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Invoice } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const InvoiceManager: React.FC = () => {
  const { invoices, projects, addInvoice, updateInvoice, deleteInvoice, incomes, isProjectLocked, currentUser, companyName, companyAddress } = useApp();
  
  const canCreateInvoices = currentUser.permissions?.['invoices']?.includes('create');
  const canEditInvoices = currentUser.permissions?.['invoices']?.includes('edit');
  const canDeleteInvoices = currentUser.permissions?.['invoices']?.includes('delete');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
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

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const [formData, setFormData] = useState({
    projectId: '',
    amount: '',
    date: '',
    dueDate: '',
    description: ''
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setEditingInvoice(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getInvoiceMetrics = useCallback((inv: Invoice) => {
    const collected = incomes
      .filter(i => i.invoiceId === inv.id)
      .reduce((sum, i) => sum + i.amount, 0);
    const remaining = Math.max(0, inv.amount - collected);
    const isPaid = remaining <= 0.01;
    return { collected, remaining, isPaid };
  }, [incomes]);

  const filteredInvoices = useMemo(() => {
    const result = invoices.filter(inv => {
      const { isPaid, remaining } = getInvoiceMetrics(inv);
      const isPartial = !isPaid && remaining < inv.amount && remaining > 0;
      const project = projects.find(p => p.id === inv.projectId);
      const matchesSearch = project?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           inv.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           inv.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === 'Paid') matchesStatus = isPaid;
      else if (filterStatus === 'Partially Paid') matchesStatus = isPartial;
      else if (filterStatus === 'Unpaid') matchesStatus = !isPaid && !isPartial;
      
      return matchesSearch && matchesStatus;
    });

    return result.sort((a, b) => {
      const metricsA = getInvoiceMetrics(a);
      const metricsB = getInvoiceMetrics(b);
      
      let valA: string | number = a[sortConfig.key as keyof Invoice] as string | number;
      let valB: string | number = b[sortConfig.key as keyof Invoice] as string | number;

      if (sortConfig.key === 'remaining') {
        valA = metricsA.remaining;
        valB = metricsB.remaining;
      } else if (sortConfig.key === 'status') {
        // 0: Unpaid, 1: Partial, 2: Paid
        const statusA = metricsA.isPaid ? 2 : (metricsA.remaining < a.amount ? 1 : 0);
        const statusB = metricsB.isPaid ? 2 : (metricsB.remaining < b.amount ? 1 : 0);
        valA = statusA;
        valB = statusB;
      } else if (sortConfig.key === 'project') {
         valA = (projects.find(p => p.id === a.projectId)?.name || '').toLowerCase();
         valB = (projects.find(p => p.id === b.projectId)?.name || '').toLowerCase();
      } else if (sortConfig.key === 'id') {
        valA = a.id.toLowerCase();
        valB = b.id.toLowerCase();
      } else if (sortConfig.key === 'description') {
        valA = a.description.toLowerCase();
        valB = b.description.toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, projects, searchTerm, filterStatus, getInvoiceMetrics, sortConfig]);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    return { total, paid, receivable: Math.max(0, total - paid) };
  }, [invoices, incomes]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invData: Invoice = {
      id: editingInvoice ? editingInvoice.id : 'inv-' + Date.now(),
      projectId: formData.projectId,
      amount: parseFloat(formData.amount) || 0,
      date: formData.date,
      dueDate: formData.dueDate,
      description: formData.description,
      status: editingInvoice ? editingInvoice.status : 'Sent'
    };

    if (editingInvoice) await updateInvoice(invData);
    else await addInvoice(invData);
    
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Invoice',
      message: 'Are you sure you want to permanently delete this invoice?',
      onConfirm: () => {
        deleteInvoice(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const generatePDF = (inv: Invoice) => {
    const project = projects.find(p => p.id === inv.projectId);
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('INVOICE', 14, 20);
    
    if (companyName) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(companyName, 140, 20, { align: 'right' });
    }
    
    if (companyAddress) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      const splitAddress = doc.splitTextToSize(companyAddress, 60);
      doc.text(splitAddress, 140, 26, { align: 'right' });
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice #: ${inv.id.toUpperCase()}`, 14, 30);
    doc.text(`Date: ${new Date(inv.date).toLocaleDateString()}`, 14, 35);
    doc.text(`Due Date: ${new Date(inv.dueDate).toLocaleDateString()}`, 14, 40);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Bill To:', 14, 55);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Project: ${project?.name || 'Unknown Project'}`, 14, 62);
    if (project?.clientName) {
      doc.text(`Client: ${project.clientName}`, 14, 67);
    }
    
    const { isPaid, remaining } = getInvoiceMetrics(inv);
    const status = isPaid ? 'Paid' : (remaining < inv.amount ? 'Partially Paid' : 'Unpaid');
    
    const tableData = [
      ['Description', inv.description],
      ['Status', status],
      ['Total Amount', formatCurrency(inv.amount)],
      ['Amount Paid', formatCurrency(inv.amount - remaining)],
      ['Balance Due', formatCurrency(remaining)]
    ];
    
    autoTable(doc, {
      startY: 80,
      head: [['Item', 'Details']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10, cellPadding: 5 }
    });
    
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for your business!', 14, finalY + 20);
    
    doc.save(`Invoice_${inv.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Client Billing Center</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage project milestones and receivables.</p>
        </div>
        {canCreateInvoices && (
          <button 
            onClick={() => { setEditingInvoice(null); setFormData({ projectId: '', amount: '', date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 15*86400000).toISOString().split('T')[0], description: '' }); setShowModal(true); }}
            className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <Plus size={20} /> Generate Invoice
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-lg">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Total Billed</p>
          <p className="text-2xl font-black">{formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Collected</p>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(stats.paid)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Receivables</p>
          <p className="text-2xl font-black text-amber-600">{formatCurrency(stats.receivable)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Open Invoices</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{invoices.filter(i => getInvoiceMetrics(i).remaining > 0).length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search invoices..." 
            className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-bold" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="flex-1 px-4 py-3 sm:py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest outline-none appearance-none dark:text-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-8 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">
                    Invoice #
                    {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    Issue Date
                    {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('project')}>
                  <div className="flex items-center gap-1">
                    Project / Description
                    {sortConfig.key === 'project' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('dueDate')}>
                  <div className="flex items-center gap-1">
                    Due Date
                    {sortConfig.key === 'dueDate' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">
                    Bill Value
                    {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('remaining')}>
                  <div className="flex items-center justify-end gap-1">
                    Remaining
                    {sortConfig.key === 'remaining' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredInvoices.map((inv) => {
                const project = projects.find(p => p.id === inv.projectId);
                const { isPaid, remaining } = getInvoiceMetrics(inv);
                const isPartial = !isPaid && remaining < inv.amount && remaining > 0;
                return (
                  <tr key={inv.id} className={`transition-colors group even:bg-slate-50/30 dark:even:bg-slate-800/20 ${isPaid ? 'bg-emerald-50/40 dark:bg-emerald-900/5 hover:bg-emerald-50/60' : isPartial ? 'bg-amber-50/40 dark:bg-amber-900/5 hover:bg-amber-50/60' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-8 py-5 font-bold text-slate-400 text-xs">#{inv.id.slice(-6).toUpperCase()}</td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Briefcase size={10} className="text-blue-500" />
                          {project?.name || 'Unknown Project'}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-300" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${
                        isPaid ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                        isPartial ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-indigo-600">{formatCurrency(inv.amount)}</td>
                    <td className="px-8 py-5 text-right font-black text-slate-500">
                      {isPaid ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1"><Check size={12} /> Paid</span>
                      ) : (
                        <span className={isPartial ? 'text-amber-600' : 'text-red-600'}>{formatCurrency(remaining)}</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button 
                          onClick={() => generatePDF(inv)}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        {canEditInvoices && (
                          <button 
                            onClick={() => { setEditingInvoice(inv); setFormData({ projectId: inv.projectId, amount: inv.amount.toString(), date: inv.date, dueDate: inv.dueDate, description: inv.description }); setShowModal(true); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Edit Invoice"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {canDeleteInvoices && (
                          <button 
                            onClick={() => handleDelete(inv.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom duration-500">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/30 dark:bg-indigo-900/10 flex justify-between items-center shrink-0">
               <div className="flex gap-4 items-center">
                 <div className="p-3 sm:p-4 bg-indigo-600 text-white rounded-2xl shadow-lg">
                    <FileText size={24} />
                 </div>
                 <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{editingInvoice ? 'Modify Invoice' : 'Generate Invoice'}</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Official Client Billing Entry</p>
                 </div>
               </div>
               <button onClick={() => { setShowModal(false); setEditingInvoice(null); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Project Site</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" 
                  value={formData.projectId}
                  onChange={(e) => setFormData(p => ({ ...p, projectId: e.target.value }))}
                  required
                >
                  <option value="" disabled>Select site</option>
                  {projects.filter(p => !p.isGodown && !p.isDeleted && p.status !== 'Completed').map(p => (
                    <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Invoice Description</label>
                <textarea 
                  rows={2} 
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" 
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. 5th Floor Completion Milestone..."
                  required
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bill Amount (Rs.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none" 
                  value={formData.amount}
                  onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                  required 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Issue Date</label>
                  <input 
                    type="date" 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" 
                    value={formData.date}
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Due Date</label>
                  <input 
                    type="date" 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" 
                    value={formData.dueDate}
                    onChange={(e) => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                    required 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingInvoice(null); }} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest">
                  {editingInvoice ? 'Update Invoice' : 'Issue Invoice'}
                </button>
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
