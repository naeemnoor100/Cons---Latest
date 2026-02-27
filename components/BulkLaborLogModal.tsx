import React, { useState, useEffect, useMemo } from 'react';
import { X, ClipboardList } from 'lucide-react';
import { Employee, Project, LaborLog } from '../types';

interface BulkLaborLogModalProps {
  employees: Employee[];
  projects: Project[];
  isProjectLocked: (id: string) => boolean;
  addLaborLog: (log: LaborLog) => Promise<void>;
  onClose: () => void;
}

interface BulkRow {
  employeeId: string;
  status: 'Present' | 'Half-day' | 'Absent';
  hoursWorked: string;
  notes: string;
}

export const BulkLaborLogModal: React.FC<BulkLaborLogModalProps> = ({
  employees,
  projects,
  isProjectLocked,
  addLaborLog,
  onClose
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectId, setProjectId] = useState('');
  const [rows, setRows] = useState<Record<string, BulkRow>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'Active' && (!projectId || e.currentSiteId === projectId));
  }, [employees, projectId]);

  useEffect(() => {
    const initialRows: Record<string, BulkRow> = {};
    activeEmployees.forEach(emp => {
      initialRows[emp.id] = {
        employeeId: emp.id,
        status: 'Present',
        hoursWorked: '8',
        notes: ''
      };
    });
    setRows(initialRows);
  }, [activeEmployees]);

  const updateRow = (empId: string, field: keyof BulkRow, value: string) => {
    setRows(prev => {
      const row = { ...prev[empId], [field]: value };
      if (field === 'status') {
        if (value === 'Present') row.hoursWorked = '8';
        else if (value === 'Half-day') row.hoursWorked = '4';
        else if (value === 'Absent') row.hoursWorked = '0';
      }
      return { ...prev, [empId]: row };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return alert('Please select a project site');
    
    setIsSubmitting(true);
    try {
      const logsToSubmit = Object.values(rows).filter(r => r.status !== 'Absent' || r.notes.trim() !== '');
      
      for (const row of logsToSubmit) {
        const emp = employees.find(e => e.id === row.employeeId);
        if (!emp) continue;

        const wageAmount = (emp.dailyWage / 8) * (parseFloat(row.hoursWorked) || 0);
        
        const data: LaborLog = {
          id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          date,
          employeeId: row.employeeId,
          projectId,
          hoursWorked: parseFloat(row.hoursWorked) || 0,
          wageAmount: row.status === 'Absent' ? 0 : wageAmount,
          status: row.status as 'Present' | 'Half-day' | 'Absent',
          notes: row.notes
        };

        await addLaborLog(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to submit bulk logs', error);
      alert('Failed to submit logs. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 my-8">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/20">
          <div className="flex gap-4 items-center">
            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Bulk Labor Log</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Record attendance for multiple employees</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
              <input type="date" required className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Project Site</label>
              <select required className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none appearance-none" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Select Site...</option>
                {projects.filter(p => !p.isGodown).map(p => (
                  <option key={p.id} value={p.id} disabled={isProjectLocked(p.id)}>{p.name}{isProjectLocked(p.id) ? ' Completed (Locked)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours</th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeEmployees.map(emp => {
                  const row = rows[emp.id];
                  if (!row) return null;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-sm dark:text-white">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{emp.role}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <select 
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs dark:text-white outline-none"
                          value={row.status}
                          onChange={e => updateRow(emp.id, 'status', e.target.value)}
                        >
                          <option value="Present">Present</option>
                          <option value="Half-day">Half-day</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4 w-24">
                        <input 
                          type="number" 
                          step="0.5" 
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs dark:text-white outline-none"
                          value={row.hoursWorked}
                          onChange={e => updateRow(emp.id, 'hoursWorked', e.target.value)}
                          disabled={row.status === 'Absent'}
                        />
                      </td>
                      <td className="py-3">
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs dark:text-white outline-none"
                          value={row.notes}
                          onChange={e => updateRow(emp.id, 'notes', e.target.value)}
                          placeholder="Remarks..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-700 py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest text-slate-500">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white py-4 rounded-[1.5rem] font-black shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save All Logs'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
