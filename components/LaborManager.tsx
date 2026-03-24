
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Pencil, 
  Trash2, 
  Plus,
  HardHat, 
  DollarSign, 
  ClipboardList,
  UserPlus,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Employee, LaborLog, PaymentMethod, LaborPayment } from '../types';
import { BulkLaborLogModal } from './BulkLaborLogModal';
import { EmployeeInsightsModal } from './EmployeeInsightsModal';
import { ConfirmationDialog } from './ConfirmationDialog';

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
    deleteLaborPayment,
    isProjectLocked,
    currentUser
  } = useApp();

  const canCreateLabor = currentUser.permissions?.['labor']?.includes('create');
  const canEditLabor = currentUser.permissions?.['labor']?.includes('edit');
  const canDeleteLabor = currentUser.permissions?.['labor']?.includes('delete');

  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'logs' | 'payments'>('logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showBulkLogModal, setShowBulkLogModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeForInsights, setSelectedEmployeeForInsights] = useState<Employee | null>(null);
  const [editingLog, setEditingLog] = useState<LaborLog | null>(null);
  const [editingPayment, setEditingPayment] = useState<LaborPayment | null>(null);

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

  const [employeeFormData, setEmployeeFormData] = useState({
    name: '', role: '', phone: '', dailyWage: '', status: 'Active' as 'Active' | 'Inactive', joiningDate: new Date().toISOString().split('T')[0], currentSiteId: ''
  });

  const [logFormData, setLogFormData] = useState({
    date: new Date().toISOString().split('T')[0], employeeId: '', projectId: '', hoursWorked: '8', status: 'Present' as 'Present' | 'Half-day' | 'Absent', notes: '', wageAmount: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    employeeId: '', projectId: '', date: new Date().toISOString().split('T')[0], amount: '', method: 'Cash' as PaymentMethod, reference: '', notes: ''
  });
  const [paymentError, setPaymentError] = useState('');

  const calculateWage = (empId: string, hours: string, status: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return '';
    if (status === 'Absent') return '0';
    const h = parseFloat(hours) || 0;
    const wage = (emp.dailyWage / 8) * h;
    return Math.round(wage).toString();
  };

  const employeeSummaries = useMemo(() => {
    return employees.map(emp => {
      const empLogs = laborLogs.filter(l => l.employeeId === emp.id);
      const empPayments = laborPayments.filter(p => p.employeeId === emp.id);
      
      const earned = empLogs.reduce((sum, l) => sum + l.wageAmount, 0);
      const paid = empPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const projectIds = Array.from(new Set([
        ...empLogs.map(l => l.projectId),
        ...empPayments.map(p => p.projectId)
      ]));
      
      const siteBalances = projectIds.map(pid => {
        const project = projects.find(p => p.id === pid);
        const pEarned = empLogs.filter(l => l.projectId === pid).reduce((sum, l) => sum + l.wageAmount, 0);
        const pPaid = empPayments.filter(p => p.projectId === pid).reduce((sum, p) => sum + p.amount, 0);
        return {
          projectId: pid,
          projectName: project?.name || 'Unknown',
          balance: pEarned - pPaid
        };
      }).filter(pb => pb.balance !== 0);

      return {
        ...emp,
        earned,
        paid,
        remaining: earned - paid,
        siteBalances
      };
    });
  }, [employees, laborLogs, laborPayments, projects]);

  const selectedEmployeeBalance = useMemo(() => {
    if (!paymentFormData.employeeId) return 0;
    const empSummary = employeeSummaries.find(e => e.id === paymentFormData.employeeId);
    if (!empSummary) return 0;
    
    let balance = empSummary.remaining;
    if (editingPayment && editingPayment.employeeId === paymentFormData.employeeId) {
      balance += editingPayment.amount;
    }
    return balance;
  }, [paymentFormData.employeeId, employeeSummaries, editingPayment]);

  const selectedEmployeeProjectBalances = useMemo(() => {
    if (!paymentFormData.employeeId) return [];
    
    const employeeLogs = laborLogs.filter(l => l.employeeId === paymentFormData.employeeId);
    const employeePayments = laborPayments.filter(p => p.employeeId === paymentFormData.employeeId);
    
    const projectIds = Array.from(new Set([
      ...employeeLogs.map(l => l.projectId),
      ...employeePayments.map(p => p.projectId)
    ]));
    
    return projectIds.map(pid => {
      const project = projects.find(p => p.id === pid);
      const earned = employeeLogs.filter(l => l.projectId === pid).reduce((sum, l) => sum + l.wageAmount, 0);
      const paid = employeePayments.filter(p => p.projectId === pid).reduce((sum, p) => sum + p.amount, 0);
      let balance = earned - paid;
      
      if (editingPayment && editingPayment.employeeId === paymentFormData.employeeId && editingPayment.projectId === pid) {
        balance += editingPayment.amount;
      }
      
      return {
        projectId: pid,
        projectName: project?.name || 'Unknown Project',
        balance
      };
    }).filter(pb => pb.balance !== 0);
  }, [paymentFormData.employeeId, laborLogs, laborPayments, projects, editingPayment]);

  const selectedProjectBalance = useMemo(() => {
    if (!paymentFormData.employeeId || !paymentFormData.projectId) return 0;
    const projectBalance = selectedEmployeeProjectBalances.find(pb => pb.projectId === paymentFormData.projectId);
    return projectBalance ? projectBalance.balance : 0;
  }, [paymentFormData.employeeId, paymentFormData.projectId, selectedEmployeeProjectBalances]);

  const filteredEmployees = useMemo(() => {
    return employeeSummaries.filter(e => {
      const siteName = projects.find(p => p.id === e.currentSiteId)?.name || '';
      const matchesSearch = (
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        siteName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesProject = projectFilter === 'All' || e.currentSiteId === projectFilter;
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
      const matchesRole = roleFilter === 'All' || e.role === roleFilter;
      return matchesSearch && matchesProject && matchesStatus && matchesRole;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [employeeSummaries, searchTerm, projects, projectFilter, statusFilter, roleFilter]);

  const filteredLogs = useMemo(() => {
    return laborLogs.filter(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      const proj = projects.find(p => p.id === l.projectId);
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        emp?.name.toLowerCase().includes(search) || 
        proj?.name.toLowerCase().includes(search) ||
        l.date.includes(search)
      );
      const matchesProject = projectFilter === 'All' || l.projectId === projectFilter;
      const matchesEmployee = employeeFilter === 'All' || l.employeeId === employeeFilter;
      const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
      
      const logDate = new Date(l.date);
      const matchesStart = !startDate || logDate >= new Date(startDate);
      const matchesEnd = !endDate || logDate <= new Date(endDate);
      
      return matchesSearch && matchesProject && matchesEmployee && matchesStatus && matchesStart && matchesEnd;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [laborLogs, employees, projects, searchTerm, projectFilter, employeeFilter, statusFilter, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    return laborPayments.filter(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      const proj = projects.find(proj => proj.id === p.projectId);
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        emp?.name.toLowerCase().includes(search) || 
        proj?.name.toLowerCase().includes(search) ||
        p.date.includes(search) ||
        p.reference?.toLowerCase().includes(search)
      );
      const matchesProject = projectFilter === 'All' || p.projectId === projectFilter;
      const matchesEmployee = employeeFilter === 'All' || p.employeeId === employeeFilter;
      const matchesMethod = methodFilter === 'All' || p.method === methodFilter;
      
      const payDate = new Date(p.date);
      const matchesStart = !startDate || payDate >= new Date(startDate);
      const matchesEnd = !endDate || payDate <= new Date(endDate);
      
      return matchesSearch && matchesProject && matchesEmployee && matchesMethod && matchesStart && matchesEnd;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [laborPayments, employees, projects, searchTerm, projectFilter, employeeFilter, methodFilter, startDate, endDate]);

  const summaryStats = useMemo(() => {
    const earned = filteredLogs.reduce((sum, l) => sum + l.wageAmount, 0);
    const paid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      earned,
      paid,
      balance: earned - paid
    };
  }, [filteredLogs, filteredPayments]);

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Employee = {
      id: editingEmployee ? editingEmployee.id : 'emp-' + Date.now(),
      name: employeeFormData.name,
      role: employeeFormData.role,
      phone: employeeFormData.phone,
      dailyWage: parseFloat(employeeFormData.dailyWage) || 0,
      status: employeeFormData.status,
      joiningDate: employeeFormData.joiningDate,
      currentSiteId: employeeFormData.currentSiteId
    };

    if (editingEmployee) await updateEmployee(data);
    else await addEmployee(data);

    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmployeeFormData({ name: '', role: '', phone: '', dailyWage: '', status: 'Active', joiningDate: new Date().toISOString().split('T')[0], currentSiteId: '' });
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(emp => emp.id === logFormData.employeeId);
    if (!emp) return;

    let wageAmount = parseFloat(logFormData.wageAmount);
    if (isNaN(wageAmount)) {
       wageAmount = (emp.dailyWage / 8) * parseFloat(logFormData.hoursWorked);
    }
    
    const data: LaborLog = {
      id: editingLog ? editingLog.id : 'log-' + Date.now(),
      date: logFormData.date,
      employeeId: logFormData.employeeId,
      projectId: logFormData.projectId,
      hoursWorked: parseFloat(logFormData.hoursWorked) || 0,
      wageAmount: logFormData.status === 'Absent' ? 0 : wageAmount,
      status: logFormData.status,
      notes: logFormData.notes
    };

    if (editingLog) await updateLaborLog(data);
    else await addLaborLog(data);

    setShowLogModal(false);
    setEditingLog(null);
    setLogFormData({ date: new Date().toISOString().split('T')[0], employeeId: '', projectId: '', hoursWorked: '8', status: 'Present', notes: '', wageAmount: '' });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentFormData.amount) || 0;
    
    if (!paymentFormData.projectId) {
      setPaymentError('Please select a project site.');
      return;
    }

    if (amount > selectedProjectBalance) {
      const proj = projects.find(p => p.id === paymentFormData.projectId);
      setPaymentError(`Payment amount (${formatCurrency(amount)}) cannot exceed the balance for ${proj?.name || 'this project'} (${formatCurrency(selectedProjectBalance)}).`);
      return;
    }
    
    setPaymentError('');

    const data: LaborPayment = {
      id: editingPayment ? editingPayment.id : 'lpay-' + Date.now(),
      employeeId: paymentFormData.employeeId,
      projectId: paymentFormData.projectId,
      date: paymentFormData.date,
      amount: amount,
      method: paymentFormData.method,
      reference: paymentFormData.reference,
      notes: paymentFormData.notes
    };

    if (editingPayment) await updateLaborPayment(data);
    else await addLaborPayment(data);

    setShowPaymentModal(false);
    setEditingPayment(null);
    setPaymentFormData({ employeeId: '', projectId: '', date: new Date().toISOString().split('T')[0], amount: '', method: 'Cash', reference: '', notes: '' });
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      name: emp.name || '',
      role: emp.role || '',
      phone: emp.phone || '',
      dailyWage: (emp.dailyWage || 0).toString(),
      status: emp.status || 'Active',
      joiningDate: emp.joiningDate || new Date().toISOString().split('T')[0],
      currentSiteId: emp.currentSiteId || ''
    });
    setShowEmployeeModal(true);
  };

  const openEditLog = (log: LaborLog) => {
    setEditingLog(log);
    setLogFormData({
      date: log.date || new Date().toISOString().split('T')[0],
      employeeId: log.employeeId || '',
      projectId: log.projectId || '',
      hoursWorked: (log.hoursWorked || 0).toString(),
      status: log.status || 'Present',
      notes: log.notes || '',
      wageAmount: (log.wageAmount || 0).toString()
    });
    setShowLogModal(true);
  };

  const openEditPayment = (pay: LaborPayment) => {
    setEditingPayment(pay);
    setPaymentFormData({
      employeeId: pay.employeeId || '',
      projectId: pay.projectId || '',
      date: pay.date || new Date().toISOString().split('T')[0],
      amount: (pay.amount || 0).toString(),
      method: pay.method || 'Cash',
      reference: pay.reference || '',
      notes: pay.notes || ''
    });
    setShowPaymentModal(true);
  };

  const handleDeleteEmployee = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Employee',
      message: 'Are you sure you want to delete this employee? This will hide them from future logs.',
      onConfirm: () => {
        deleteEmployee(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteLog = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Attendance Log',
      message: 'Are you sure you want to delete this attendance log?',
      onConfirm: () => {
        deleteLaborLog(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeletePayment = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Payment Record',
      message: 'Are you sure you want to delete this payment record?',
      onConfirm: () => {
        deleteLaborPayment(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const triggerPayEmployee = (empId: string, amount: number) => {
    setEditingPayment(null);
    setPaymentFormData({
      employeeId: empId,
      projectId: '',
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
          {canCreateLabor && (
            <>
              <button 
                onClick={() => { setEditingEmployee(null); setEmployeeFormData({ name: '', role: '', phone: '', dailyWage: '', status: 'Active', joiningDate: new Date().toISOString().split('T')[0], currentSiteId: '' }); setShowEmployeeModal(true); }}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Add Employee
              </button>
              <button 
                onClick={() => { setEditingLog(null); setLogFormData({ date: new Date().toISOString().split('T')[0], employeeId: '', projectId: '', hoursWorked: '8', status: 'Present', notes: '', wageAmount: '' }); setShowLogModal(true); }}
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Log Attendance
              </button>
              <button 
                onClick={() => setShowBulkLogModal(true)}
                className="bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <ClipboardList size={16} /> Bulk Attendance
              </button>
              <button 
                onClick={() => { setEditingPayment(null); setPaymentFormData({ employeeId: '', projectId: '', date: new Date().toISOString().split('T')[0], amount: '', method: 'Cash', reference: '', notes: '' }); setShowPaymentModal(true); }}
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Record Payment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Labor Cost</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(summaryStats.earned)}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Based on filtered logs</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(summaryStats.paid)}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Based on filtered payments</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining Balance</p>
          <p className={`text-2xl font-black ${summaryStats.balance > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
            {formatCurrency(summaryStats.balance)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Net outstanding</p>
          </div>
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
        <div className="flex flex-wrap gap-4 mt-4">
          <select className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold dark:text-white outline-none" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="All">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {(activeSubTab === 'logs' || activeSubTab === 'payments') && (
            <select className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold dark:text-white outline-none" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
              <option value="All">All Employees</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          )}

          {(activeSubTab === 'logs' || activeSubTab === 'employees') && (
            <select className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold dark:text-white outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">{activeSubTab === 'employees' ? 'All Statuses' : 'All Attendance'}</option>
              {activeSubTab === 'employees' ? (
                <>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </>
              ) : (
                <>
                  <option value="Present">Present</option>
                  <option value="Half-day">Half-day</option>
                  <option value="Absent">Absent</option>
                </>
              )}
            </select>
          )}

          {activeSubTab === 'employees' && (
            <select className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold dark:text-white outline-none" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="All">All Roles</option>
              {Array.from(new Set(employees.map(e => e.role))).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          )}

          {activeSubTab === 'payments' && (
            <select className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold dark:text-white outline-none" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Online">Online / Wallet</option>
            </select>
          )}

          <div className="flex items-center gap-2">
            <input type="date" className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold dark:text-white outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">to</span>
            <input type="date" className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold dark:text-white outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          {(startDate || endDate || projectFilter !== 'All' || employeeFilter !== 'All' || statusFilter !== 'All' || methodFilter !== 'All' || roleFilter !== 'All') && (
            <button 
              onClick={() => {
                setProjectFilter('All');
                setEmployeeFilter('All');
                setStatusFilter('All');
                setMethodFilter('All');
                setRoleFilter('All');
                setStartDate('');
                setEndDate('');
              }} 
              className="text-xs font-bold text-red-500 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'employees' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(emp => (
            <div 
              key={emp.id} 
              onClick={() => setSelectedEmployeeForInsights(emp)}
              className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-blue-400 transition-all group flex flex-col shadow-sm cursor-pointer hover:shadow-md"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {emp.status}
                  </span>
                  <div className="flex gap-2 transition-opacity">
                    {canEditLabor && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditEmployee(emp); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit Employee"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {canDeleteLabor && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Employee"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{emp.name}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase flex items-center gap-1.5 mt-1"><HardHat size={12} /> {emp.role}</p>
                {emp.currentSiteId && (
                  <p className="text-blue-500 text-[10px] font-black uppercase flex items-center gap-1.5 mt-1">
                    <MapPin size={12} /> {projects.find(p => p.id === emp.currentSiteId)?.name || 'Unknown Site'}
                  </p>
                )}

                {emp.siteBalances && emp.siteBalances.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {emp.siteBalances.map((sb, idx) => (
                      <span key={idx} className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase tracking-tighter">
                        {sb.projectName}: {formatCurrency(sb.balance)}
                      </span>
                    ))}
                  </div>
                )}
                
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
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] sm:text-[11px] font-black text-rose-600">{formatCurrency(emp.remaining)}</p>
                      {emp.remaining > 0 && canCreateLabor && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerPayEmployee(emp.id, emp.remaining); }}
                          className="p-1 bg-emerald-100 text-emerald-700 rounded-md hover:scale-110 transition-all"
                          title="Pay Balance"
                        >
                          <DollarSign size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Joined: {new Date(emp.joiningDate).toLocaleDateString()}</span>

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
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredLogs.map(log => {
                  const emp = employees.find(e => e.id === log.employeeId);
                  const proj = projects.find(p => p.id === log.projectId);
                  const isCompleted = isProjectLocked(log.projectId);
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
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          {canEditLabor && !isCompleted && (
                            <button 
                              onClick={() => openEditLog(log)}
                              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit Log"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          {canDeleteLabor && !isCompleted && (
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete Log"
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
                  <th className="px-8 py-5 text-right">Actions</th>
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
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          {canEditLabor && (
                            <button 
                              onClick={() => openEditPayment(pay)}
                              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit Payment"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          {canDeleteLabor && (
                            <button 
                              onClick={() => handleDeletePayment(pay.id)}
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom duration-500">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/20">
              <div className="flex gap-4 items-center">
                <div className="p-3 sm:p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Workforce Registration</p>
                </div>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleEmployeeSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
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
                  <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={employeeFormData.status} onChange={e => setEmployeeFormData(p => ({ ...p, status: e.target.value as 'Active' | 'Inactive' }))}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assigned Site</label>
                <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={employeeFormData.currentSiteId} onChange={e => setEmployeeFormData(p => ({ ...p, currentSiteId: e.target.value }))}>
                  <option value="">Select a site</option>
                  {projects.filter(p => !p.isGodown && !p.isDeleted).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkLogModal && (
        <BulkLaborLogModal
          employees={employees}
          projects={projects}
          isProjectLocked={isProjectLocked}
          addLaborLog={addLaborLog}
          onClose={() => setShowBulkLogModal(false)}
        />
      )}

      {selectedEmployeeForInsights && (
        <EmployeeInsightsModal
          employee={selectedEmployeeForInsights}
          logs={laborLogs.filter(l => l.employeeId === selectedEmployeeForInsights.id)}
          payments={laborPayments.filter(p => p.employeeId === selectedEmployeeForInsights.id)}
          projects={projects}
          onClose={() => setSelectedEmployeeForInsights(null)}
          onEditPayment={openEditPayment}
          onDeletePayment={handleDeletePayment}
          canEditLabor={canEditLabor}
          canDeleteLabor={canDeleteLabor}
        />
      )}

      {/* Daily Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom duration-500">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/20">
              <div className="flex gap-4 items-center">
                <div className="p-3 sm:p-4 bg-blue-600 text-white rounded-2xl shadow-lg">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingLog ? 'Edit Labor Log' : 'Record Daily Attendance'}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Daily Workforce Tracking</p>
                </div>
              </div>
              <button onClick={() => setShowLogModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleLogSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={logFormData.date} onChange={e => setLogFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Project Site</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={logFormData.projectId} onChange={e => setLogFormData(p => ({ ...p, projectId: e.target.value, employeeId: '', wageAmount: '' }))}>
                    <option value="">Select Site...</option>
                    {projects.filter(p => !p.isGodown && !p.isDeleted).map(p => (
                      <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name}{isProjectLocked(p.id) ? ' Completed (Locked)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Employee</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={logFormData.employeeId} onChange={e => {
                    const empId = e.target.value;
                    const wage = calculateWage(empId, logFormData.hoursWorked, logFormData.status);
                    setLogFormData(p => ({ ...p, employeeId: empId, wageAmount: wage }));
                  }}>
                    <option value="">Select Employee...</option>
                    {employees.filter(e => e.status === 'Active' && (!logFormData.projectId || e.currentSiteId === logFormData.projectId)).map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Attendance Status</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={logFormData.status} onChange={e => {
                    const status = e.target.value as 'Present' | 'Half-day' | 'Absent';
                    const hours = status === 'Present' ? '8' : (status === 'Half-day' ? '4' : '0');
                    const wage = calculateWage(logFormData.employeeId, hours, status);
                    setLogFormData(p => ({ 
                      ...p, 
                      status,
                      hoursWorked: hours,
                      wageAmount: wage
                    }));
                  }}>
                    <option value="Present">Present (Full Day)</option>
                    <option value="Half-day">Half-day</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hours Worked</label>
                  <input type="number" step="0.5" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={logFormData.hoursWorked} onChange={e => {
                    const hours = e.target.value;
                    const wage = calculateWage(logFormData.employeeId, hours, logFormData.status);
                    setLogFormData(p => ({ ...p, hoursWorked: hours, wageAmount: wage }));
                  }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Calculated Wage (Rs.)</label>
                  <input type="number" step="1" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none" value={logFormData.wageAmount} onChange={e => setLogFormData(p => ({ ...p, wageAmount: e.target.value }))} />
                </div>
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
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom duration-500">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/20">
              <div className="flex gap-4 items-center">
                <div className="p-3 sm:p-4 bg-emerald-600 text-white rounded-2xl shadow-lg">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingPayment ? 'Edit Payment' : 'Pay Employee'}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Workforce Wage Disbursement</p>
                </div>
              </div>
              <button onClick={() => { setShowPaymentModal(false); setPaymentError(''); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto no-scrollbar max-h-[75vh] pb-safe">
              {paymentError && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} />
                  {paymentError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <input type="date" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={paymentFormData.date} onChange={e => { setPaymentFormData(p => ({ ...p, date: e.target.value })); setPaymentError(''); }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Project</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={paymentFormData.projectId} onChange={e => { setPaymentFormData(p => ({ ...p, projectId: e.target.value })); setPaymentError(''); }}>
                    <option value="">Select Project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {paymentFormData.projectId && paymentFormData.employeeId && (
                    <p className="text-[10px] font-bold text-slate-500 px-1 pt-1">
                      Site Balance: <span className={selectedProjectBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{formatCurrency(selectedProjectBalance)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Employee</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={paymentFormData.employeeId} onChange={e => { setPaymentFormData(p => ({ ...p, employeeId: e.target.value })); setPaymentError(''); }}>
                    <option value="">Select Employee...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                  {paymentFormData.employeeId && (
                    <div className="space-y-1 px-1 pt-1">
                      <p className="text-xs font-bold text-slate-500">
                        Total Balance: <span className={selectedEmployeeBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{formatCurrency(selectedEmployeeBalance)}</span>
                      </p>
                      {selectedEmployeeProjectBalances.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800 mt-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Site-wise Balances:</p>
                          <div className="space-y-1">
                            {selectedEmployeeProjectBalances.map(pb => (
                              <div key={pb.projectId} className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-500 truncate mr-2">{pb.projectName}</span>
                                <span className={`font-black ${pb.balance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatCurrency(pb.balance)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount (Rs.)</label>
                  <input type="number" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none" value={paymentFormData.amount} onChange={e => { setPaymentFormData(p => ({ ...p, amount: e.target.value })); setPaymentError(''); }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Method</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={paymentFormData.method} onChange={e => setPaymentFormData(p => ({ ...p, method: e.target.value as PaymentMethod }))}>
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
                <button type="button" onClick={() => { setShowPaymentModal(false); setPaymentError(''); }} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showBulkLogModal && (
        <BulkLaborLogModal 
          employees={employees}
          projects={projects}
          isProjectLocked={isProjectLocked}
          addLaborLog={addLaborLog}
          onClose={() => setShowBulkLogModal(false)}
        />
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
