
import React, { useState, useMemo } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { useApp } from '../AppContext';
import { Worker, Attendance } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const WorkerManagement: React.FC = () => {
  const { workers, attendance, projects, addWorker, updateWorker, deleteWorker, markAttendance, deleteAttendance } = useApp();
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects.find(p => !p.isGodown)?.id || '');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [workerFormData, setWorkerFormData] = useState({
    name: '', phone: '', trade: '', dailyWage: '', activeProjectId: ''
  });

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.trade.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, searchTerm]);

  const activeProjectWorkers = useMemo(() => {
    return workers.filter(w => w.activeProjectId === selectedProjectId);
  }, [workers, selectedProjectId]);

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
        <button 
          onClick={() => { setEditingWorker(null); setShowAddWorker(true); }}
          className="w-full sm:w-auto bg-[#003366] text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Plus size={20} /> Register Worker
        </button>
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
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"
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
                      <tr key={worker.id} className="group">
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
                               <button onClick={() => deleteAttendance(todayEntry.id)} className="p-1 text-slate-300 hover:text-red-500"><X size={14} /></button>
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
                          <button onClick={() => { setEditingWorker(w); setWorkerFormData({ name: w.name, phone: w.phone, trade: w.trade, dailyWage: w.dailyWage.toString(), activeProjectId: w.activeProjectId || '' }); setShowAddWorker(true); }} className="p-1 text-blue-500"><Pencil size={14} /></button>
                          <button onClick={() => { if(confirm(`Delete worker ${w.name}?`)) deleteWorker(w.id); }} className="p-1 text-red-500"><Trash2 size={14} /></button>
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
                   <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={workerFormData.name} onChange={e => setWorkerFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Trade / Skill</label>
                     <input type="text" placeholder="e.g. Mason, Welder..." required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={workerFormData.trade} onChange={e => setWorkerFormData(p => ({ ...p, trade: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Daily Wage (Rs.)</label>
                     <input type="number" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white outline-none" value={workerFormData.dailyWage} onChange={e => setWorkerFormData(p => ({ ...p, dailyWage: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Phone</label>
                   <input type="tel" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={workerFormData.phone} onChange={e => setWorkerFormData(p => ({ ...p, phone: e.target.value }))} />
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
