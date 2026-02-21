
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  X, 
  Calendar, 
  DollarSign, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Pencil,
  Trash2,
  ChevronRight,
  ArrowDownCircle,
  Filter,
  Download,
  Receipt,
  Hash
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Invoice, Project } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const InvoiceManager: React.FC = () => {
  const { invoices, projects, addInvoice, updateInvoice, deleteInvoice, incomes } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const [formData, setFormData] = useState({
    projectId: '',
    amount: '',
    date: '',
    dueDate: '',
    description: ''
  });

  useEffect(() => {
    if (!showModal) return;
    
    if (editingInvoice) {
      setFormData({
        projectId: editingInvoice.projectId,
        amount: editingInvoice.amount.toString(),
        date: editingInvoice.date,
        dueDate: editingInvoice.dueDate,
        description: editingInvoice.description
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      setFormData({
        projectId: projects.find(p => !p.isGodown)?.id || projects[0]?.id || '',
        amount: '',
        date: today,
        dueDate: nextWeek,
        description: ''
      });
    }
  }, [showModal, editingInvoice, projects]);

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

  const getInvoiceMetrics = (inv: Invoice) => {
    const collected = incomes
      .filter(i => i.invoiceId === inv.id)
      .reduce((sum, i) => sum + i.amount, 0);
    const remaining = Math.max(0, inv.amount - collected);
    const isPaid = remaining <= 0.01;
    return { collected, remaining, isPaid };
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const { isPaid } = getInvoiceMetrics(inv);
      const project = projects.find(p => p.id === inv.projectId);
      const matchesSearch = project?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           inv.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           inv.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === 'Paid') matchesStatus = isPaid;
      else if (filterStatus === 'Unpaid') matchesStatus = !isPaid;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, projects, searchTerm, filterStatus, incomes]);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    return { total, paid, receivable: Math.max(0, total - paid) };
  }, [invoices, incomes]);

  const handleOpenAddModal = () => {
    setEditingInvoice(null);
    setFormData({
      projectId: projects.find(p => !p.isGodown)?.id || projects[0]?.id || '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      description: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormData({
      projectId: inv.projectId,
      amount: inv.amount.toString(),
      date: inv.date,
      dueDate: inv.dueDate,
      description: inv.description
    });
    setShowModal(true);
  };

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
    if (confirm("Permanently delete this invoice?")) {
      await deleteInvoice(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Client Billing Center</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage project milestones and receivables.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Plus size={20} /> Create New Invoice
        </button>
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
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-8 py-5">Invoice #</th>
                <th className="px-8 py-5">Issue Date</th>
                <th className="px-8 py-5">Project / Description</th>
                <th className="px-8 py-5">Due Date</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Bill Value</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredInvoices.map((inv) => {
                const project = projects.find(p => p.id === inv.projectId);
                const { isPaid, remaining } = getInvoiceMetrics(inv);
                return (
                  <tr key={inv.id} className={`transition-colors group ${isPaid ? 'bg-emerald-50/40 dark:bg-emerald-900/5 hover:bg-emerald-50/60' : 'hover:bg-slate-50/50'}`}>
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
                        isPaid ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                      {!isPaid && remaining !== inv.amount && (
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Partially Paid</p>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right font-black text-indigo-600">{formatCurrency(inv.amount)}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleOpenEditModal(inv)} 
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(inv.id)} 
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/30 dark:bg-indigo-900/10 flex justify-between items-center shrink-0">
               <div className="flex gap-4 items-center">
                 <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg">
                    <FileText size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{editingInvoice ? 'Modify Invoice' : 'Generate Invoice'}</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Official Client Billing Entry</p>
                 </div>
               </div>
               <button onClick={() => { setShowModal(false); setEditingInvoice(null); }} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Project Site</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" 
                  value={formData.projectId}
                  onChange={(e) => setFormData(p => ({ ...p, projectId: e.target.value }))}
                  required
                >
                  <option value="" disabled>Choose site...</option>
                  {projects.filter(p => !p.isGodown).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
    </div>
  );
};
