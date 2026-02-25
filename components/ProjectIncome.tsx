
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowUpCircle, 
  Plus, 
  X, 
  Search, 
  Pencil, 
  Trash2,
  Receipt
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Income, PaymentMethod } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const ProjectIncome: React.FC = () => {
  const { projects, incomes, addIncome, updateIncome, deleteIncome, isProjectLocked } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    projectId: projects[0]?.id || '', 
    amount: '', 
    description: '', 
    date: new Date().toISOString().split('T')[0], 
    method: 'Bank' as PaymentMethod,
    invoiceId: ''
  });

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
      projectId: projects[0]?.id || '', 
      amount: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0], 
      method: 'Bank',
      invoiceId: ''
    });
  };

  const openEdit = (i: Income) => {
    setEditingIncome(i);
    setFormData({
      projectId: i.projectId, 
      amount: i.amount.toString(), 
      description: i.description, 
      date: i.date, 
      method: i.method,
      invoiceId: i.invoiceId || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this income record? Associated invoice status (if any) will revert to 'Sent'.")) {
      deleteIncome(id);
    }
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
      group.items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [projects, incomes, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Revenue Ledger</h2><p className="text-slate-500 dark:text-slate-400 text-sm">Track milestones and project receipts.</p></div>
        <button onClick={() => { setEditingIncome(null); setFormData({ projectId: projects.find(p => !p.isGodown)?.id || '', amount: '', description: '', date: new Date().toISOString().split('T')[0], method: 'Bank', invoiceId: '' }); setShowModal(true); }} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"><Plus size={20} /> Record Collection</button>
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

      <div className="space-y-8">
        {projectIncomesGrouped.map((group) => (
          <div key={group.project.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-tighter">{group.project.name}</h3>
              <p className="text-emerald-600 font-black">Collected: {formatCurrency(group.total)}</p>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-700">
                <tr><th className="px-8 py-4">Date</th><th className="px-8 py-4">Milestone</th><th className="px-8 py-4">Method</th><th className="px-8 py-4 text-right">Amount</th><th className="px-8 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {group.items.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(inc.date).toLocaleDateString()}</td>
                    <td className="px-8 py-5">
                       <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{inc.description}</p>
                       <span className="text-[8px] font-black text-indigo-500 uppercase flex items-center gap-1 mt-0.5"><Receipt size={10} /> Link: #{inc.invoiceId?.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-400">{inc.method}</td>
                    <td className="px-8 py-5 text-right font-black text-emerald-600">{formatCurrency(inc.amount)}</td>
                    <td className="px-8 py-5 text-right">
                       {!isProjectLocked(inc.projectId) && (
                         <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(inc)} className="p-2 text-slate-400 hover:text-blue-600"><Pencil size={18} /></button>
                            <button onClick={() => handleDelete(inc.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                         </div>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-emerald-600 text-white rounded-2xl"><ArrowUpCircle size={24} /></div>
                 <h2 className="text-xl font-black uppercase">{editingIncome ? 'Edit Entry' : 'Record Receipt'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); setEditingIncome(null); }} className="p-2 text-slate-400 hover:text-slate-900"><X size={32} /></button>
            </div>
            <form onSubmit={handleCreateOrUpdateIncome} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400">Project Site</label>
                   <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold dark:text-white outline-none" value={formData.projectId} onChange={e => setFormData(p => ({ ...p, projectId: e.target.value, invoiceId: '' }))} required>
                     <option value="">Select site...</option>
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
                  <option value="">Choose target invoice...</option>
                  {invoices.filter(inv => inv.projectId === formData.projectId).map(inv => {
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
    </div>
  );
};
