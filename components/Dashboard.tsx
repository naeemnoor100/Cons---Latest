import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  TrendingDown, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  X,
  Activity,
  ArrowUpCircle,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Package,
  ArrowRight,
  Wallet,
  Warehouse,
  LayoutGrid,
  HardHat
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { useApp } from '../AppContext';
import { Project } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

const DashboardCard: React.FC<{ 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  trend?: string;
  isPositive?: boolean;
  colorClass: string;
}> = ({ title, value, icon, trend, isPositive, colorClass }) => (
  <div className="bg-white dark:bg-slate-800 p-3 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">{title}</p>
        <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">{value}</h3>
      </div>
      <div className={`p-2 sm:p-3 rounded-xl ${colorClass} text-white shrink-0 ml-1.5 sm:ml-2`}>
        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      </div>
    </div>
    {trend && (
      <div className={`mt-3 sm:mt-4 flex items-center gap-1 text-[10px] font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {trend}
      </div>
    )}
  </div>
);

export const Dashboard: React.FC = () => {
  const { projects, expenses, materials, incomes, invoices, addProject } = useApp();
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '', client: '', location: '', budget: '', startDate: new Date().toISOString().split('T')[0], status: 'Active', isGodown: false
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLaborCosts = expenses.filter(e => e.category === 'Labor').reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalReceivables = Math.max(0, totalInvoiced - totalIncome);
  
  const activeProjectsCount = projects.filter(p => p.status === 'Active' && !p.isGodown).length;

  const godownValue = useMemo(() => {
    let value = 0;
    materials.forEach(m => {
      m.history?.forEach(h => {
        const p = projects.find(proj => proj.id === h.projectId);
        if (p?.isGodown) {
          value += (h.quantity * (h.unitPrice || m.costPerUnit));
        }
      });
    });
    return value;
  }, [materials, projects]);

  const inventoryValue = materials.reduce((acc, m) => acc + ((m.totalPurchased - m.totalUsed) * m.costPerUnit), 0);

  const projectStats = useMemo(() => {
    return projects.filter(p => !p.isGodown).map(p => {
      const spent = expenses.filter(e => e.projectId === p.id).reduce((sum, e) => sum + e.amount, 0);
      const utilization = p.budget > 0 ? Math.round((spent / p.budget) * 100) : 0;
      return { name: p.name, spent, utilization, budget: p.budget, id: p.id };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [projects, expenses]);

  const topMaterials = useMemo(() => {
    return [...materials]
      .map(m => ({ ...m, value: (m.totalPurchased - m.totalUsed) * m.costPerUnit }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [materials]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: 'p' + Date.now(),
      name: formData.name,
      client: formData.client,
      location: formData.location,
      budget: parseFloat(formData.budget) || 0,
      startDate: formData.startDate,
      endDate: formData.startDate,
      status: formData.status,
      isGodown: formData.isGodown
    };
    addProject(newProject);
    setShowModal(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Operational Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Real-time construction pulse and godown telemetry.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-[#003366] hover:bg-[#002244] text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg transition-all active:scale-95"
        >
          <Plus size={18} /> New Hub Entry
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-4">
        <DashboardCard title="Active Sites" value={activeProjectsCount.toString()} icon={<Briefcase size={20} />} colorClass="bg-blue-600" />
        <DashboardCard title="Godown Stock" value={formatCurrency(godownValue)} icon={<Warehouse size={20} />} colorClass="bg-slate-900" />
        <DashboardCard title="Labor Costs" value={formatCurrency(totalLaborCosts)} icon={<HardHat size={20} />} colorClass="bg-orange-600" />
        <DashboardCard title="Revenue" value={formatCurrency(totalIncome)} icon={<ArrowUpCircle size={20} />} colorClass="bg-emerald-600" />
        <DashboardCard title="Total Costs" value={formatCurrency(totalExpenses)} icon={<TrendingDown size={20} />} colorClass="bg-rose-600" />
        <div className="col-span-2 xl:col-span-1">
          <DashboardCard title="Receivables" value={formatCurrency(totalReceivables)} icon={<Wallet size={20} />} colorClass="bg-indigo-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-[#FF5A00]" /> Budget Utilization
            </h3>
          </div>
          <div className="p-4 sm:p-6 h-[300px] sm:h-[350px]">
            {projectStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectStats.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} width={80} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                  <Bar dataKey="utilization" radius={[0, 4, 4, 0]} barSize={16}>
                    {projectStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.utilization > 90 ? '#e11d48' : '#003366'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <LayoutGrid size={32} className="opacity-20 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No site telemetry</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Package size={16} className="text-blue-500" /> High-Value Assets
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4 space-y-3">
            {topMaterials.length > 0 ? topMaterials.map(m => (
              <div key={m.id} className="p-4 border border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{m.name}</h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">{m.totalPurchased - m.totalUsed} {m.unit} in hand</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white shrink-0">{formatCurrency(m.value)}</span>
                </div>
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, (m.value / (inventoryValue || 1)) * 100 * 3)}%` }}></div>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <Package size={32} className="opacity-20 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Inventory empty</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg shadow-2xl overflow-hidden mobile-sheet animate-in slide-in-from-bottom duration-500">
            <div className={`p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center ${formData.isGodown ? 'bg-slate-900' : 'bg-[#003366]'} text-white`}>
              <h2 className="text-lg font-black uppercase tracking-tight leading-none">New Entry Point</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 sm:p-8 space-y-5 pb-safe overflow-y-auto no-scrollbar">
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
                <button type="button" onClick={() => setFormData(p => ({ ...p, isGodown: false }))} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isGodown ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Project Site</button>
                <button type="button" onClick={() => setFormData(p => ({ ...p, isGodown: true }))} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.isGodown ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}>Storage Hub</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Title</label>
                  <input type="text" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-bold" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">{formData.isGodown ? 'Manager' : 'Client'}</label>
                    <input type="text" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" value={formData.client} onChange={e => setFormData(p => ({ ...p, client: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Location</label>
                    <input type="text" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} required />
                  </div>
                </div>
                {!formData.isGodown && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Project Budget (Rs.)</label>
                    <input type="number" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-900 dark:text-white" value={formData.budget} onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))} required />
                  </div>
                )}
              </div>
              <button type="submit" className={`w-full ${formData.isGodown ? 'bg-slate-900' : 'bg-blue-600'} text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-sm mt-4`}>
                Authorize Deployment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};