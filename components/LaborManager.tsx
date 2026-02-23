
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  Pencil, 
  Trash2, 
  Calendar, 
  HardHat, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  ClipboardList,
  UserPlus,
  ArrowRight,
  Lock
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Employee, LaborLog, PaymentMethod } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const LaborManager: React.FC = () => {
  const { 
    employees = [], 
    laborLogs = [], 
    projects = [], 
    addEmployee, 
    updateEmployee, 
    deleteEmployee, 
    addLaborLog, 
    updateLaborLog, 
    deleteLaborLog,
    laborPayments = [],
    addLaborPayment,
    updateLaborPayment,
    deleteLaborPayment
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'logs' | 'payments'>('logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingLog, setEditingLog] = useState<LaborLog | null>(null);
  const [editingPayment, setEditingPayment] = useState<LaborPayment | null>(null);

  const [employeeFormData, setEmployeeFormData] = useState({
    name: '', role: '', phone: '', dailyWage: '', status: 'Active' as 'Active' | 'Inactive', joiningDate: new Date().toISOString().split('T')[0]
  });

  const [logFormData, setLogFormData] = useState({
    date: new Date().toISOString().split('T')[0], employeeId: '', projectId: '', hoursWorked: '8', status: 'Present' as any, notes: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    employeeId: '', date: new Date().toISOString().split('T')[0], amount: '', method: 'Cash' as PaymentMethod, reference: '', notes: ''
  });

  const employeeSummaries = useMemo(() => {
    return employees.map(emp => {
      const earned = laborLogs.filter(l => l.employeeId === emp.id).reduce((sum, l) => sum + l.wageAmount, 0);
      const paid = laborPayments.filter(p => p.employeeId === emp.id).reduce((sum, p) => sum + p.amount, 0);
      return {
        ...emp,
        earned,
        paid,
        remaining: earned - paid
      };
    });
  }, [employees, laborLogs, laborPayments]);

  const filteredEmployees = useMemo(() => {
    return employeeSummaries.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.role.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [employeeSummaries, searchTerm]);

  const filteredLogs = useMemo(() => {
    return laborLogs.filter(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      const proj = projects.find(p => p.id === l.projectId);
      const search = searchTerm.toLowerCase();
      return (
        emp?.name.toLowerCase().includes(search) || 
        proj?.name.toLowerCase().includes(search) ||
        l.date.includes(search)
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [laborLogs, employees, projects, searchTerm]);

  const filteredPayments = useMemo(() => {
    return laborPayments.filter(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      const search = searchTerm.toLowerCase();
      return (
        emp?.name.toLowerCase().includes(search) || 
        p.date.includes(search) ||
        p.reference?.toLowerCase().includes(search)
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [laborPayments, employees, searchTerm]);

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Employee = {
      id: editingEmployee ? editingEmployee.id : 'emp-' + Date.now(),
      name: employeeFormData.name,
      role: employeeFormData.role,
      phone: employeeFormData.phone,
      dailyWage: parseFloat(employeeFormData.dailyWage) || 0,
      status: employeeFormData.status,
      joiningDate: employeeFormData.joiningDate
    };

    if (editingEmployee) await updateEmployee(data);
    else await addEmployee(data);

    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmployeeFormData({ name: '', role: '', phone: '', dailyWage: '', status: 'Active', joiningDate: new Date().toISOString().split('T')[0] });
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(emp => emp.id === logFormData.employeeId);
    if (!emp) return;

    const wageAmount = (emp.dailyWage / 8) * parseFloat(logFormData.hoursWorked);
    
    const data: LaborLog = {
      id: editingLog ? editingLog.id : 'log-' + Date.now(),
      date: logFormData.date,
      employeeId: logFormData.employeeId,
      projectId: logFormData.projectId,
      hoursWorked: parseFloat(logFormData.hoursWorked) || 0,
      wageAmount: logFormData.status === 'Present' ? wageAmount : (logFormData.status === 'Half-day' ? wageAmount / 2 : 0),
      status: logFormData.status,
      notes: logFormData.notes
    };

    if (editingLog) await updateLaborLog(data);
    else await addLaborLog(data);

    setShowLogModal(false);
    setEditingLog(null);
    setLogFormData({ date: new Date().toISOString().split('T')[0], employeeId: '', projectId: '', hoursWorked: '8', status: 'Present', notes: '' });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: LaborPayment = {
      id: editingPayment ? editingPayment.id : 'lpay-' + Date.now(),
      employeeId: paymentFormData.employeeId,
      date: paymentFormData.date,
      amount: parseFloat(paymentFormData.amount) || 0,
      method: paymentFormData.method,
      reference: paymentFormData.reference,
      notes: paymentFormData.notes
    };

    if (editingPayment) await updateLaborPayment(data);
    else await addLaborPayment(data);

    setShowPaymentModal(false);
    setEditingPayment(null);
    setPaymentFormData({ employeeId: '', date: new Date().toISOString().split('T')[0], amount: '', method: 'Cash', reference: '', notes: '' });
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      name: emp.name,
      role: emp.role,
      phone: emp.phone,
      dailyWage: emp.dailyWage.toString(),
      status: emp.status,
      joiningDate: emp.joiningDate
    });
    setShowEmployeeModal(true);
  };

  const openEditLog = (log: LaborLog) => {
    setEditingLog(log);
    setLogFormData({
      date: log.date,
      employeeId: log.employeeId,
      projectId: log.projectId,
      hoursWorked: log.hoursWorked.toString(),
      status: log.status,
      notes: log.notes || ''
    });
    setShowLogModal(true);
  };

  const openEditPayment = (pay: LaborPayment) => {
    setEditingPayment(pay);
    setPaymentFormData({
      employeeId: pay.employeeId,
      date: pay.date,
      amount: pay.amount.toString(),
      method: pay.method,
      reference: pay.reference || '',
      notes: pay.notes || ''
    });
    setShowPaymentModal(true);
  };

  const triggerPayEmployee = (empId: string, amount: number) => {
    setEditingPayment(null);
    setPaymentFormData({
      employeeId: empId,
      date: new Date().toISOString().split('T')[0],
      amount: amount.toString(),
      method: 'Cash',
      reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Labor & Workforce</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage employees, attendance, and payments.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button 
            onClick={() => { setEditingEmployee(null); setShowEmployeeModal(true); }}
            className="flex-1 sm:flex-none bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <UserPlus size={18} /> Add Employee
          </button>
          <button 
            onClick={() => { setEditingLog(null); setShowLogModal(true); }}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <ClipboardList size={18} /> Daily Log
          </button>
          <button 
            onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <DollarSign size={18} /> Pay Labor
          </button>
        </div>
      </div>

      <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveSubTab('logs')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'logs' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
        >
          Attendance Logs
        </button>
        <button 
          onClick={() => setActiveSubTab('payments')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'payments' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
        >
          Payment History
        </button>
        <button 
          onClick={() => setActiveSubTab('employees')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'employees' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
        >
          Employee Roster
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={
              activeSubTab === 'employees' ? "Search employees..." : 
              activeSubTab === 'logs' ? "Search logs..." : 
              "Search payments..."
            }
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {activeSubTab === 'employees' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(emp => (
            <div key={emp.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-blue-400 transition-all group flex flex-col shadow-sm">
              <div className="p-6 flex-1">
                <div className="flex justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {emp.status}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => openEditEmployee(emp)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => { if(confirm(`Delete ${emp.name}?`)) deleteEmployee(emp.id); }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{emp.name}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase flex items-center gap-1.5 mt-1"><HardHat size={12} /> {emp.role}</p>
                
                <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-2.5 rounded-xl">
                    <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Earned</p>
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white">{formatCurrency(emp.earned)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-2.5 rounded-xl">
                    <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Paid</p>
                    <p className="text-[10px] sm:text-[11px] font-black text-emerald-600">{formatCurrency(emp.paid)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-2.5 rounded-xl">
                    <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Balance</p>
                    <p className="text-[10px] sm:text-[11px] font-black text-rose-600">{formatCurrency(emp.remaining)}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Joined: {new Date(emp.joiningDate).toLocaleDateString()}</span>
                {emp.remaining > 0 && (
                  <button 
                    onClick={() => triggerPayEmployee(emp.id, emp.remaining)}
                    className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Pay Balance <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : activeSubTab === 'logs' ? (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Employee</th>
                  <th className="px-8 py-5">Project Site</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Hours</th>
                  <th className="px-8 py-5 text-right">Wage</th>
                  <th className="px-8 py-5 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredLogs.map(log => {
                  const emp = employees.find(e => e.id === log.employeeId);
                  const proj = projects.find(p => p.id === log.projectId);
                  const isCompleted = proj?.status === 'Completed';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                      <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{emp?.name || 'Unknown'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{emp?.role}</p>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase">{proj?.name || 'N/A'}</td>
                      <td className="px-8 py-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          log.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 
                          log.status === 'Half-day' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm font-black text-slate-700 dark:text-slate-200">{log.hoursWorked}h</td>
                      <td className="px-8 py-5 text-right text-sm font-black text-blue-600">{formatCurrency(log.wageAmount)}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          {!isCompleted ? (
                            <>
                              <button onClick={() => openEditLog(log)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={18} /></button>
                              <button onClick={() => { if(confirm('Delete this log?')) deleteLaborLog(log.id); }} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg" title="Project Completed - Locked"><Lock size={12} /> Locked</span>
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
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Employee</th>
                  <th className="px-8 py-5">Method</th>
                  <th className="px-8 py-5">Reference</th>
                  <th className="px-8 py-5 text-right">Amount</th>
                  <th className="px-8 py-5 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredPayments.map(pay => {
                  const emp = employees.find(e => e.id === pay.employeeId);
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                      <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(pay.date).toLocaleDateString()}</td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{emp?.name || 'Unknown'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{emp?.role}</p>
                      </td>
                      <td className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase">{pay.method}</td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{pay.reference || '--'}</td>
                      <td className="px-8 py-5 text-right text-sm font-black text-emerald-600">{formatCurrency(pay.amount)}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditPayment(pay)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={18} /></button>
                          <button onClick={() => { if(confirm('Delete this payment?')) deleteLaborPayment(pay.id); }} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/20">
              <div className="flex gap-4 items-center">
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Workforce Registration</p>
                </div>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleEmployeeSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                  <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={employeeFormData.name} onChange={e => setEmployeeFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Role / Trade</label>
                  <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={employeeFormData.role} onChange={e => setEmployeeFormData(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Mason, Electrician" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <input type="tel" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={employeeFormData.phone} onChange={e => setEmployeeFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Daily Wage (Rs.)</label>
                  <input type="number" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none" value={employeeFormData.dailyWage} onChange={e => setEmployeeFormData(p => ({ ...p, dailyWage: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Joining Date</label>
                  <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={employeeFormData.joiningDate} onChange={e => setEmployeeFormData(p => ({ ...p, joiningDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                  <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={employeeFormData.status} onChange={e => setEmployeeFormData(p => ({ ...p, status: e.target.value as any }))}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/20">
              <div className="flex gap-4 items-center">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingLog ? 'Edit Labor Log' : 'Record Daily Attendance'}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Daily Workforce Tracking</p>
                </div>
              </div>
              <button onClick={() => setShowLogModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleLogSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={logFormData.date} onChange={e => setLogFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Employee</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={logFormData.employeeId} onChange={e => setLogFormData(p => ({ ...p, employeeId: e.target.value }))}>
                    <option value="">Select Employee...</option>
                    {employees.filter(e => e.status === 'Active').map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Project Site</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={logFormData.projectId} onChange={e => setLogFormData(p => ({ ...p, projectId: e.target.value }))}>
                    <option value="">Select Site...</option>
                    {projects.filter(p => !p.isGodown).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Attendance Status</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={logFormData.status} onChange={e => setLogFormData(p => ({ ...p, status: e.target.value as any }))}>
                    <option value="Present">Present (Full Day)</option>
                    <option value="Half-day">Half-day</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hours Worked</label>
                <input type="number" step="0.5" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={logFormData.hoursWorked} onChange={e => setLogFormData(p => ({ ...p, hoursWorked: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notes / Remarks</label>
                <textarea rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={logFormData.notes} onChange={e => setLogFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Overtime details, specific tasks..." />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest">Record Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/20">
              <div className="flex gap-4 items-center">
                <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingPayment ? 'Edit Payment' : 'Pay Employee'}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Workforce Wage Disbursement</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={paymentFormData.date} onChange={e => setPaymentFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Employee</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={paymentFormData.employeeId} onChange={e => setPaymentFormData(p => ({ ...p, employeeId: e.target.value }))}>
                    <option value="">Select Employee...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount (Rs.)</label>
                  <input type="number" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none" value={paymentFormData.amount} onChange={e => setPaymentFormData(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Method</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={paymentFormData.method} onChange={e => setPaymentFormData(p => ({ ...p, method: e.target.value as any }))}>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Online">Online / Wallet</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reference #</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={paymentFormData.reference} onChange={e => setPaymentFormData(p => ({ ...p, reference: e.target.value }))} placeholder="Transaction ID, Check #..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notes</label>
                <textarea rows={2} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={paymentFormData.notes} onChange={e => setPaymentFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Payment details..." />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
