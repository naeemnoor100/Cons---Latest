import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, 
  DollarSign, 
  ArrowRight, 
  Landmark, 
  CheckCircle2,
  Plus,
  Search,
  Pencil,
  Trash2
} from 'lucide-react';
import { useApp } from '../AppContext';
import { PaymentMethod, Payment } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const SupplierPayments: React.FC = () => {
  const { payments, vendors, projects, addPayment, updatePayment, deletePayment, currentUser } = useApp();
  
  const canCreatePayments = currentUser.permissions?.['payments']?.includes('create');
  const canEditPayments = currentUser.permissions?.['payments']?.includes('edit');
  const canDeletePayments = currentUser.permissions?.['payments']?.includes('delete');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
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
  
  // Modal state
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [paymentFormData, setPaymentFormData] = useState({
    projectId: '',
    amount: '',
    method: 'Bank' as PaymentMethod,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    materialBatchId: ''
  });

  const filteredPayments = useMemo(() => {
    return payments
      .filter(p => !p.isAllocation && (
        vendors.find(v => v.id === p.vendorId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      ))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, vendors, searchTerm]);

  const selectedVendorBalance = useMemo(() => {
    if (!selectedVendorId) return 0;
    const vendor = vendors.find(v => v.id === selectedVendorId);
    return vendor ? vendor.balance : 0;
  }, [selectedVendorId, vendors]);

  const maxAllowedAmount = useMemo(() => {
    if (!selectedVendorId) return 0;
    return editingPayment ? selectedVendorBalance + editingPayment.amount : selectedVendorBalance;
  }, [selectedVendorId, selectedVendorBalance, editingPayment]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingPayment(null);
    setSelectedVendorId('');
    setPaymentFormData({
      projectId: '', amount: '', method: 'Bank', date: new Date().toISOString().split('T')[0], reference: '', materialBatchId: ''
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;
    
    const amount = parseFloat(paymentFormData.amount) || 0;
    if (amount > maxAllowedAmount) {
      return; // Prevent submission if amount exceeds max
    }
    
    const paymentData: Payment = {
      id: editingPayment ? editingPayment.id : 'pay' + Date.now().toString(),
      date: paymentFormData.date,
      vendorId: selectedVendorId,
      projectId: paymentFormData.projectId || projects[0]?.id || '',
      amount: amount,
      method: paymentFormData.method,
      reference: paymentFormData.reference
    };
    
    if (editingPayment) {
      await updatePayment(paymentData);
    } else {
      await addPayment(paymentData);
    }
    
    handleCloseModal();
  }, [selectedVendorId, editingPayment, paymentFormData, projects, updatePayment, addPayment, handleCloseModal, maxAllowedAmount]);

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setSelectedVendorId(payment.vendorId || '');
    setPaymentFormData({
      projectId: payment.projectId || '',
      amount: (payment.amount || 0).toString(),
      method: payment.method || 'Bank',
      date: payment.date || new Date().toISOString().split('T')[0],
      reference: payment.reference || '',
      materialBatchId: payment.materialBatchId || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment? This will also revert the vendor balance.',
      onConfirm: async () => {
        await deletePayment(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Supplier Payments</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage and record settlements with vendors.</p>
        </div>
        {canCreatePayments && (
          <button 
            onClick={() => { handleCloseModal(); setShowModal(true); }}
            className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <Plus size={20} /> Record Payment
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by vendor name or reference..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-bold" 
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Vendor</th>
                <th className="px-8 py-5">Amount</th>
                <th className="px-8 py-5">Method</th>
                <th className="px-8 py-5">Reference</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredPayments.map((payment) => {
                const vendor = vendors.find(v => v.id === payment.vendorId);
                return (
                  <tr key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-8 py-5 text-sm font-bold text-slate-900 dark:text-white">
                      {new Date(payment.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-900 dark:text-white">
                      {vendor?.name || 'Unknown'}
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-emerald-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">
                      {payment.method}
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-500">
                      {payment.reference || '-'}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        {canEditPayments && (
                          <button 
                            onClick={() => handleEdit(payment)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit Payment"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {canDeletePayments && (
                          <button 
                            onClick={() => handleDelete(payment.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Payment"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-center text-slate-400 text-sm font-bold uppercase">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom duration-500 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/20 dark:bg-emerald-900/10 shrink-0">
               <div className="flex gap-4 items-center">
                 <div className="p-3 sm:p-4 bg-emerald-600 text-white rounded-[1.5rem] shadow-xl shadow-emerald-200 dark:shadow-none">
                    <DollarSign size={28} />
                 </div>
                 <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      {editingPayment ? 'Modify Settlement' : 'New Settlement'}
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                      {editingPayment ? 'Update existing payment details' : 'Record a payment to a supplier'}
                    </p>
                 </div>
               </div>
               <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Vendor</label>
                  <select 
                    required
                    disabled={!!editingPayment}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none disabled:opacity-50"
                    value={selectedVendorId}
                    onChange={e => setSelectedVendorId(e.target.value)}
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name} (Bal: {formatCurrency(v.balance)})</option>)}
                  </select>
               </div>

               {selectedVendorId && (
                 <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-2xl">
                    <div>
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">
                        {editingPayment ? 'Outstanding (Before Edit)' : 'Total Outstanding'}
                      </p>
                      <p className="text-xl font-black">
                        {formatCurrency(editingPayment ? selectedVendorBalance + editingPayment.amount : selectedVendorBalance)}
                      </p>
                    </div>
                    <ArrowRight className="text-white/20" size={24} />
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Projected Balance</p>
                      <p className="text-xl font-black text-emerald-500">
                        {formatCurrency((editingPayment ? selectedVendorBalance + editingPayment.amount : selectedVendorBalance) - (parseFloat(paymentFormData.amount) || 0))}
                      </p>
                    </div>
                 </div>
               )}

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement Amount</label>
                    </div>
                    <input 
                      type="number" 
                      step="0.01" 
                      max={maxAllowedAmount}
                      min="0"
                      required 
                      placeholder="0.00" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                      value={paymentFormData.amount} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          if (val > maxAllowedAmount) {
                            setPaymentFormData(p => ({ ...p, amount: maxAllowedAmount.toString() }));
                            return;
                          } else if (val < 0) {
                            setPaymentFormData(p => ({ ...p, amount: '0' }));
                            return;
                          }
                        }
                        setPaymentFormData(p => ({ ...p, amount: e.target.value }));
                      }} 
                    />
                    {maxAllowedAmount >= 0 && (
                      <p className="text-[10px] text-slate-500 font-bold px-1">
                        Max allowed: {formatCurrency(maxAllowedAmount)}
                      </p>
                    )}
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
                         className={`py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${paymentFormData.method === m ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-500'}`}
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
                className="w-full py-5 rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none"
               >
                 <CheckCircle2 size={24} />
                 {editingPayment ? 'Update Settlement' : 'Record Settlement'}
               </button>
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
