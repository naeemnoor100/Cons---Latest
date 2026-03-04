import React, { useMemo, useState } from 'react';
import { X, Calendar, DollarSign, Clock, MapPin, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { Employee, LaborLog, LaborPayment, Project } from '../types';

interface EmployeeInsightsModalProps {
  employee: Employee;
  logs: LaborLog[];
  payments: LaborPayment[];
  projects: Project[];
  onClose: () => void;
}

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const EmployeeInsightsModal: React.FC<EmployeeInsightsModalProps> = ({
  employee,
  logs,
  payments,
  projects,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'payments'>('attendance');

  const stats = useMemo(() => {
    const totalEarned = logs.reduce((sum, log) => sum + log.wageAmount, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const balance = totalEarned - totalPaid;
    const totalHours = logs.reduce((sum, log) => sum + log.hoursWorked, 0);
    const daysPresent = logs.filter(l => l.status === 'Present').length;
    const daysHalf = logs.filter(l => l.status === 'Half-day').length;
    const daysAbsent = logs.filter(l => l.status === 'Absent').length;

    return { totalEarned, totalPaid, balance, totalHours, daysPresent, daysHalf, daysAbsent };
  }, [logs, payments]);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs]);

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex gap-6 items-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{employee.name}</h2>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} /> {employee.role}
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign size={12} /> {formatCurrency(employee.dailyWage)} / day
                </span>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${employee.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {employee.status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white dark:bg-slate-800 shrink-0 border-b border-slate-100 dark:border-slate-700">
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Earned</p>
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{formatCurrency(stats.totalEarned)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Paid</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(stats.totalPaid)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Balance Due</p>
            <p className="text-xl font-black text-rose-700 dark:text-rose-300">{formatCurrency(stats.balance)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Work Summary</p>
            <div className="flex gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <span className="text-emerald-600">{stats.daysPresent} P</span>
              <span className="text-amber-600">{stats.daysHalf} HD</span>
              <span className="text-rose-600">{stats.daysAbsent} A</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-6 pb-2 flex gap-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'attendance' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Attendance History
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'payments' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Payment History
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-0 bg-slate-50/50 dark:bg-slate-900/50">
          {activeTab === 'attendance' ? (
            <div className="p-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Site</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Hours</th>
                      <th className="px-6 py-4 text-right">Wage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {sortedLogs.length > 0 ? (
                      sortedLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(log.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {projects.find(p => p.id === log.projectId)?.name || 'Unknown Site'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              log.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 
                              log.status === 'Half-day' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">{log.hoursWorked}h</td>
                          <td className="px-6 py-4 text-right text-xs font-black text-slate-900 dark:text-white">{formatCurrency(log.wageAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">No attendance records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Reference</th>
                      <th className="px-6 py-4">Notes</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {sortedPayments.length > 0 ? (
                      sortedPayments.map(pay => (
                        <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(pay.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">{pay.method}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400 font-mono">{pay.reference || '-'}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{pay.notes || '-'}</td>
                          <td className="px-6 py-4 text-right text-xs font-black text-emerald-600">{formatCurrency(pay.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">No payment records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
