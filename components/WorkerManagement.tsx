import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  Pencil, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Phone, 
  HardHat, 
  DollarSign, 
  Briefcase,
  MoreVertical,
  ClipboardCheck,
  History,
  TrendingUp,
  LayoutList,
  Zap,
  Filter,
  Calculator,
  CalendarRange,
  Printer,
  ChevronRight,
  ArrowRight,
  Wallet,
  Receipt
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Worker, Attendance, Project } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const WorkerManagement: React.FC = () => {
  const { workers, attendance, projects, addWorker, updateWorker, deleteWorker, markAttendance, bulkMarkAttendance, deleteAttendance } = useApp();
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPayrollSummary, setShowPayrollSummary] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects.find(p => !p.isGodown)?.id || '');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Payroll Range State
  const defaultStart = new Date();
  defaultStart.setDate(1); // Start of month
  const [payrollStartDate, setPayrollStartDate] = useState(defaultStart.toISOString().split('T')[0]);
  const [payrollEndDate, setPayrollEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Bulk State
  const [bulkProjectId, setBulkProjectId] = useState<string>(projects.find(p => !p.isGodown)?.id || '');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkRecords, setBulkRecords] = useState<Record<string, 'Present' | 'Absent' | 'Half-Day'>>({});

  const [workerFormData, setWorkerFormData] = useState({
    name: '', phone: '', trade: '', dailyWage: '', activeProjectId: ''
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddWorker(false);
        setShowBulkModal(false);
        setShowPayrollSummary(false);
        setEditingWorker(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.trade.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, searchTerm]);

  const activeProjectWorkers = useMemo(() => {
    return workers.filter(w => w.activeProjectId === selectedProjectId);
  }, [workers, selectedProjectId]);

  const bulkProjectWorkers = useMemo(() => {
    return workers.filter(w => w.activeProjectId === bulkProjectId);
  }, [workers, bulkProjectId]);

  // Payroll Calculation Logic
  const payrollData = useMemo(() => {
    const start = new Date(payrollStartDate).getTime();
    const end = new Date(payrollEndDate).getTime();
    
    const periodAttendance = attendance.filter(a => {
      const d = new Date(a.date).getTime();
      return d >= start && d <= end;
    });

    const workerSummary: Record<string, { name: string; trade: string; earned: number; present: number; half: number; absent: number }> = {};
    const projectSummary: Record<string, { name: string; totalLabor: number }> = {};

    periodAttendance.forEach(att => {
      // Worker aggregate
      if (!workerSummary[att.workerId]) {
        const w = workers.find(x => x.id === att.workerId);
        workerSummary[att.workerId] = { 
          name: w?.name || 'Unknown', 
          trade: w?.trade || 'Labor', 
          earned: 0, present: 0, half: 0, absent: 0 
        };
      }
      workerSummary[att.workerId].earned += att.wageEarned;
      if (att.status === 'Present') workerSummary[att.workerId].present++;
      else if (att.status === 'Half-Day') workerSummary[att.workerId].half++;
      else workerSummary[att.workerId].absent++;

      // Project aggregate
      if (!projectSummary[att.projectId]) {
        const p = projects.find(x => x.id === att.projectId);
        projectSummary[att.projectId] = { name: p?.name || 'Direct', totalLabor: 0 };
      }
      projectSummary[att.projectId].totalLabor += att.wageEarned;
    });

    const totalWages = periodAttendance.reduce((sum, a) => sum + a.wageEarned, 0);

    return {
      totalWages,
      workerItems: Object.values(workerSummary).sort((a, b) => b.earned - a.earned),
      projectItems: Object.values(projectSummary).sort((a, b) => b.totalLabor - a.totalLabor)
    };
  }, [attendance, workers, projects, payrollStartDate, payrollEndDate]);

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wData: Worker = {
      id: editingWorker ? editingWorker.id : 'w' + Date.now(),
      name: workerFormData.name,
      phone: workerFormData.phone,
      trade: workerFormData.trade,
      dailyWage: parseFloat(workerFormData.dailyWage) || 0,
      activeProjectId: workerFormData.activeProjectId || undefined
    };

    if (editingWorker) await updateWorker(wData);
    else await addWorker(wData);

    setShowAddWorker(false);
    setEditingWorker(null);
    setWorkerFormData({ name: '', phone: '', trade: '', dailyWage: '', activeProjectId: '' });
  };

  const handleMarkAttendance = async (worker: Worker, status: 'Present' | 'Absent' | 'Half-Day') => {
    const existing = attendance.find(a => a.workerId === worker.id && a.date === attendanceDate);
    if (existing) {
       alert("Attendance already recorded for this worker on this date.");
       return;
    }

    let wage = worker.dailyWage;
    if (status === 'Absent') wage = 0;
    if (status === 'Half-Day') wage = worker.dailyWage / 2;

    const aData: Attendance = {
      id: 'att' + Date.now(),
      workerId: worker.id,
      projectId: selectedProjectId,
      date: attendanceDate,
      status,
      wageEarned: wage,
      isPaid: false
    };

    await markAttendance(aData);
  };

  const handleBulkSubmit = async () => {
    const newRecords: Attendance[] = [];
    Object.entries(bulkRecords).forEach(([workerId, status]) => {
      const worker = workers.find(w => w.id === workerId);
      if (!worker) return;

      let wage = worker.dailyWage;
      if (status === 'Absent') wage = 0;
      if (status === 'Half-Day') wage = worker.dailyWage / 2;

      newRecords.push({
        id: 'att-b-' + Math.random().toString(36).substr(2, 9),
        workerId,
        projectId: bulkProjectId,
        date: bulkDate,
        status,
        wageEarned: wage,
        isPaid: false
      });
    });

    if (newRecords.length > 0) {
      await bulkMarkAttendance(newRecords);
      setShowBulkModal(false);
    }
  };

  const getWorkerStats = (workerId: string) => {
    const workerAtt = attendance.filter(a => a.workerId === workerId);
    const totalEarned = workerAtt.reduce((sum, a) => sum + a.wageEarned, 0);
    const daysPresent = workerAtt.filter(a => a.status === 'Present').length + (workerAtt.filter(a => a.status === 'Half-Day').length * 0.5);
    return { totalEarned, daysPresent };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Labor Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Track site workers, attendance, and daily wages.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowPayrollSummary(true)}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <Calculator size={20} /> Payroll Summary
          </button>
          <button 
            onClick={() => setShowBulkModal(true)}
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <Zap size={20} /> Bulk Mark
          </button>
          <button 
            onClick={() => { setEditingWorker(null); setShowAddWorker(true); }}
            className="flex-1 sm:flex-none bg-[#003366] text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <Plus size={20} /> Register Worker
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Marking Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <ClipboardCheck size={18} className="text-blue-600" /> Daily Attendance Log
              </h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <input 
                  type="date" 
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                />
                <select 
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none"
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                >
                  {projects.filter(p => !p.isGodown).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="py-4 px-2">Worker</th>
                    <th className="py-4 px-2">Trade</th>
                    <th className="py-4 px-2 text-right">Daily Wage</th>
                    <th className="py-4 px-2 text-center">Mark Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {activeProjectWorkers.length > 0 ? activeProjectWorkers.map(worker => {
                    const todayEntry = attendance.find(a => a.workerId === worker.id && a.date === attendanceDate);
                    return (
                      <tr key={worker.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-2">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400"><Users size={14} /></div>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">{worker.name}</span>
                           </div>
                        </td>
                        <td className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase">{worker.trade}</td>
                        <td className="py-4 px-2 text-right font-black text-slate-900 dark:text-white">{formatCurrency(worker.dailyWage)}</td>
                        <td className="py-4 px-2">
                           {todayEntry ? (
                             <div className="flex justify-center items-center gap-2">
                               <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                 todayEntry.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                 todayEntry.status === 'Absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                 'bg-amber-50 text-amber-600 border-amber-100'
                               }`}>
                                 {todayEntry.status}
                               </span>
                               <button onClick={() => deleteAttendance(todayEntry.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                             </div>
                           ) : (
                             <div className="flex justify-center gap-1">
                                <button onClick={() => handleMarkAttendance(worker, 'Present')} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all">P</button>
                                <button onClick={() => handleMarkAttendance(worker, 'Half-Day')} className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase hover:bg-amber-600 hover:text-white transition-all">H</button>
                                <button onClick={() => handleMarkAttendance(worker, 'Absent')} className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all">A</button>
                             </div>
                           )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={4} className="py-10 text-center text-slate-300 font-bold uppercase text-[10px]">No workers assigned to this site</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Workers List Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full max-h-[600px]">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Master Roster</h3>
               <span className="text-[10px] font-black text-slate-400">{workers.length} Workers</span>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Find worker..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
              {filteredWorkers.map(w => {
                const stats = getWorkerStats(w.id);
                return (
                  <div key={w.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 group hover:border-blue-500 transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{w.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{w.trade} • {formatCurrency(w.dailyWage)}/Day</p>
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingWorker(w); setWorkerFormData({ name: w.name, phone: w.phone, trade: w.trade, dailyWage: w.dailyWage.toString(), activeProjectId: w.activeProjectId || '' }); setShowAddWorker(true); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                          <button onClick={() => { if(confirm(`Delete worker ${w.name}?`)) deleteWorker(w.id); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                       </div>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                       <div className="flex gap-3">
                          <div className="text-[9px] font-bold text-slate-400">Days: <span className="text-slate-900 dark:text-white">{stats.daysPresent}</span></div>
                          <div className="text-[9px] font-bold text-slate-400">Earned: <span className="text-emerald-600">{formatCurrency(stats.totalEarned)}</span></div>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${w.activeProjectId ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {projects.find(p => p.id === w.activeProjectId)?.name || 'Unassigned'}
                       </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Summary Modal */}
      {showPayrollSummary && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden flex flex-col mobile-sheet animate-in zoom-in-95 duration-300">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-900/10 shrink-0">
                <div className="flex gap-4 items-center">
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg"><Calculator size={28} /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Payroll Analysis Hub</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Financial summary for chosen period</p>
                  </div>
                </div>
                <button onClick={() => setShowPayrollSummary(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
             </div>

             <div className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-6 items-end shrink-0">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase px-1">Period Start</label>
                   <div className="relative">
                      <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input type="date" className="pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none text-xs" value={payrollStartDate} onChange={e => setPayrollStartDate(e.target.value)} />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase px-1">Period End</label>
                   <div className="relative">
                      <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input type="date" className="pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none text-xs" value={payrollEndDate} onChange={e => setPayrollEndDate(e.target.value)} />
                   </div>
                </div>
                <div className="flex-1 flex justify-end">
                   <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl flex items-center gap-4">
                      <div>
                        <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Period Total</p>
                        <p className="text-xl font-black leading-none">{formatCurrency(payrollData.totalWages)}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><TrendingUp size={20} /></div>
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-white dark:bg-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Worker Breakdown */}
                <div className="space-y-6">
                   <div className="flex justify-between items-center px-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Users size={16} className="text-blue-500" /> Worker Disbursements
                      </h3>
                      <button className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 hover:text-indigo-600"><Printer size={12} /> Print Roster</button>
                   </div>
                   <div className="space-y-3">
                      {payrollData.workerItems.length > 0 ? payrollData.workerItems.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-indigo-500 transition-all">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-400">{item.name.charAt(0)}</div>
                              <div>
                                 <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{item.name}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.trade} • {item.present}P / {item.half}H</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(item.earned)}</p>
                              <p className="text-[8px] font-black text-emerald-500 uppercase">Authorized</p>
                           </div>
                        </div>
                      )) : (
                        <div className="py-20 text-center text-slate-300 uppercase font-black tracking-widest text-[10px]">No logs for this period</div>
                      )}
                   </div>
                </div>

                {/* Project Allocation */}
                <div className="space-y-6">
                   <div className="flex justify-between items-center px-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Briefcase size={16} className="text-emerald-500" /> Project Labor Costs
                      </h3>
                   </div>
                   <div className="space-y-3">
                      {payrollData.projectItems.length > 0 ? payrollData.projectItems.map((item, idx) => (
                        <div key={idx} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><HardHat size={16} /></div>
                                 <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</h4>
                              </div>
                              <p className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(item.totalLabor)}</p>
                           </div>
                           <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(item.totalLabor / (payrollData.totalWages || 1)) * 100}%` }}></div>
                           </div>
                           <p className="text-[8px] font-black text-slate-400 uppercase mt-2">{Math.round((item.totalLabor / (payrollData.totalWages || 1)) * 100)}% of total labor budget</p>
                        </div>
                      )) : (
                        <div className="py-20 text-center text-slate-300 uppercase font-black tracking-widest text-[10px]">No site logs for this period</div>
                      )}
                   </div>
                </div>
             </div>
             
             <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 text-indigo-600">
                   <Receipt size={20} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Internal Ledger Sync Active</span>
                </div>
                <button onClick={() => setShowPayrollSummary(false)} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close Analysis</button>
             </div>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-4xl h-[90vh] shadow-2xl overflow-hidden flex flex-col mobile-sheet animate-in slide-in-from-bottom-8 duration-300">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/10 shrink-0">
                <div className="flex gap-4 items-center">
                  <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg"><Zap size={28} /></div>
                  <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Bulk Site Attendance</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Multi-worker rapid log</p></div>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
             </div>
             
             <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-6 shrink-0">
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                   <label className="text-[9px] font-black text-slate-400 uppercase px-1">Log Date</label>
                   <input type="date" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
                </div>
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                   <label className="text-[9px] font-black text-slate-400 uppercase px-1">Project Site Hub</label>
                   <select className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none" value={bulkProjectId} onChange={e => {
                     setBulkProjectId(e.target.value);
                     // Clear records when project changes to avoid ghost markings
                     setBulkRecords({});
                   }}>
                     {projects.filter(p => !p.isGodown).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-white dark:bg-slate-800">
                <div className="space-y-4">
                  {bulkProjectWorkers.length > 0 ? bulkProjectWorkers.map(w => {
                    const isAlreadyMarked = attendance.some(a => a.workerId === w.id && a.date === bulkDate);
                    return (
                      <div key={w.id} className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-4 rounded-2xl border transition-all ${isAlreadyMarked ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                         <div className="md:col-span-4">
                           <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{w.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">{w.trade}</p>
                         </div>
                         <div className="md:col-span-4 flex justify-center">
                            {isAlreadyMarked ? (
                              <span className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12}/> Logged for this date</span>
                            ) : (
                              <div className="flex gap-2">
                                {(['Present', 'Half-Day', 'Absent'] as const).map(status => (
                                  <button
                                    key={status}
                                    onClick={() => setBulkRecords(prev => ({ ...prev, [w.id]: status }))}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                      bulkRecords[w.id] === status 
                                        ? (status === 'Present' ? 'bg-emerald-600 text-white shadow-lg' : status === 'Absent' ? 'bg-rose-600 text-white shadow-lg' : 'bg-amber-500 text-white shadow-lg') 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {status.charAt(0)}
                                  </button>
                                ))}
                              </div>
                            )}
                         </div>
                         <div className="md:col-span-4 text-right">
                           <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{formatCurrency(w.dailyWage)}/Day</p>
                         </div>
                      </div>
                    );
                  }) : (
                    <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px]">No workers assigned to this site</div>
                  )}
                </div>
             </div>

             <div className="p-8 border-t border-slate-100 dark:border-slate-700 shrink-0 flex gap-4">
               <button onClick={() => setShowBulkModal(false)} className="flex-1 px-10 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest">Discard</button>
               <button onClick={handleBulkSubmit} className="flex-1 px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Authorize Bulk Entry</button>
             </div>
          </div>
        </div>
      )}

      {showAddWorker && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{editingWorker ? 'Edit Worker Profile' : 'Register New Worker'}</h2>
                <button onClick={() => setShowAddWorker(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={32} /></button>
             </div>
             <form onSubmit={handleWorkerSubmit} className="p-8 space-y-5">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                   <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={workerFormData.name} onChange={e => setWorkerFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Trade / Skill</label>
                     <input type="text" placeholder="e.g. Mason, Welder..." required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={workerFormData.trade} onChange={e => setWorkerFormData(p => ({ ...p, trade: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Daily Wage (Rs.)</label>
                     <input type="number" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={workerFormData.dailyWage} onChange={e => setWorkerFormData(p => ({ ...p, dailyWage: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Phone</label>
                   <input type="tel" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={workerFormData.phone} onChange={e => setWorkerFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assigned Project Site</label>
                   <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={workerFormData.activeProjectId} onChange={e => setWorkerFormData(p => ({ ...p, activeProjectId: e.target.value }))}>
                      <option value="">No Active Assignment</option>
                      {projects.filter(p => !p.isGodown).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowAddWorker(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-slate-500">Cancel</button>
                   <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-[1.5rem] font-black shadow-xl transition-all active:scale-95 text-[10px] uppercase tracking-widest">{editingWorker ? 'Update Profile' : 'Confirm Registration'}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
