import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  X,
  Activity,
  ArrowUpCircle,
  Package,
  Wallet,
  Warehouse,
  LayoutGrid,
  HardHat,
  Target
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useApp } from '../AppContext';
import { Project } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;
const formatNumber = (val: number) => val.toLocaleString('en-IN');

const DashboardCard: React.FC<{ 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  trend?: string;
  isPositive?: boolean;
  colorClass: string;
  subText?: string;
  gradientClass?: string;
  isCurrency?: boolean;
}> = ({ title, value, icon, trend, isPositive, colorClass, subText, gradientClass, isCurrency }) => (
  <div className={`relative overflow-hidden bg-white dark:bg-slate-800 p-4 sm:p-5 lg:p-7 rounded-3xl sm:rounded-[2rem] border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group h-full flex flex-col`}>
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl transition-all group-hover:scale-150 ${colorClass}`} />
    <div className="flex justify-between items-start relative z-10 flex-1">
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 sm:mb-2 font-display">
          {title}
          {isCurrency && <span className="text-[8px] font-semibold text-slate-300 dark:text-slate-600 normal-case tracking-normal ml-1.5">Rs.</span>}
        </p>
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-display break-words">{value}</h3>
        {subText && <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 sm:mt-2">{subText}</p>}
      </div>
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${gradientClass || colorClass} text-white shrink-0 shadow-lg vibrant-shadow transition-transform group-hover:rotate-12`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4 sm:w-5 sm:h-5", strokeWidth: 2.5 })}
      </div>
    </div>
    {trend && (
      <div className={`mt-auto pt-4 sm:pt-5 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black font-display ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        <div className={`p-1 rounded-full ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
          {isPositive ? <ArrowUpRight size={12} className="sm:w-3.5 sm:h-3.5" /> : <ArrowDownRight size={12} className="sm:w-3.5 sm:h-3.5" />}
        </div>
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
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const remainingBudget = totalBudget - totalExpenses;
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const netRemainingBudget = totalBudget - totalIncome;
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalReceivables = Math.max(0, totalInvoiced - totalIncome);
  
  const activeProjectsCount = projects.filter(p => p.status === 'Active' && !p.isGodown && !p.isDeleted).length;

  const godownValue = useMemo(() => {
    let value = 0;
    materials.forEach(m => {
      m.history?.forEach(h => {
        const p = projects.find(proj => proj.id === h.projectId);
        if (p?.isGodown && !p.isDeleted) {
          value += (h.quantity * (h.unitPrice || m.costPerUnit));
        }
      });
    });
    return value;
  }, [materials, projects]);

  const inventoryValue = materials.reduce((acc, m) => acc + ((m.totalPurchased - m.totalUsed) * m.costPerUnit), 0);

  const projectStats = useMemo(() => {
    return projects.filter(p => !p.isGodown && !p.isDeleted && p.status === 'Active').map(p => {
      const spent = expenses.filter(e => e.projectId === p.id).reduce((sum, e) => sum + e.amount, 0);
      const remaining = Math.max(0, p.budget - spent);
      const utilization = p.budget > 0 ? Math.round((spent / p.budget) * 100) : 0;
      return { name: p.name, spent, remaining, utilization, budget: p.budget, id: p.id };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [projects, expenses]);

  const allMaterials = useMemo(() => {
    return [...materials]
      .map(m => ({ ...m, value: (m.totalPurchased - m.totalUsed) * m.costPerUnit }))
      .sort((a, b) => b.value - a.value);
  }, [materials]);

  const [assetPage, setAssetPage] = useState(1);
  const assetsPerPage = 10;
  const totalAssetPages = Math.ceil(allMaterials.length / assetsPerPage);
  const paginatedAssets = useMemo(() => {
    const startIndex = (assetPage - 1) * assetsPerPage;
    return allMaterials.slice(startIndex, startIndex + assetsPerPage);
  }, [allMaterials, assetPage]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(projectStats.length / itemsPerPage);
  const paginatedProjectStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return projectStats.slice(startIndex, startIndex + itemsPerPage);
  }, [projectStats, currentPage]);

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
    <div className="space-y-8 sm:space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase font-display">
            Operational <span className="text-brand-primary">Hub</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium mt-1">Real-time construction pulse and godown telemetry.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-vibrant-gradient text-white px-8 py-4 rounded-[2rem] font-black text-sm shadow-xl vibrant-shadow transition-all hover:scale-105 active:scale-95 uppercase tracking-widest font-display"
        >
          <Plus size={20} strokeWidth={3} /> New Hub Entry
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <DashboardCard title="Active Sites" value={activeProjectsCount.toString()} icon={<Briefcase size={20} />} colorClass="bg-brand-primary" gradientClass="bg-gradient-to-br from-indigo-500 to-blue-600" />
        <DashboardCard title="Godown Stock" value={formatNumber(godownValue)} isCurrency icon={<Warehouse size={20} />} colorClass="bg-slate-900" gradientClass="bg-gradient-to-br from-slate-700 to-slate-900" />
        <DashboardCard title="Labor Costs" value={formatNumber(totalLaborCosts)} isCurrency icon={<HardHat size={20} />} colorClass="bg-brand-accent" gradientClass="bg-gradient-to-br from-amber-400 to-orange-600" />
        <DashboardCard title="Revenue" value={formatNumber(totalIncome)} isCurrency icon={<ArrowUpCircle size={20} />} colorClass="bg-brand-success" gradientClass="bg-gradient-to-br from-emerald-400 to-teal-600" />
        <DashboardCard title="Total Costs" value={formatNumber(totalExpenses)} isCurrency icon={<TrendingDown size={20} />} colorClass="bg-brand-danger" gradientClass="bg-gradient-to-br from-rose-400 to-red-600" />
        <DashboardCard title="Receivables" value={formatNumber(totalReceivables)} isCurrency icon={<Wallet size={20} />} colorClass="bg-purple-600" gradientClass="bg-gradient-to-br from-purple-400 to-indigo-600" />
        <DashboardCard title="Remaining Budget" value={formatNumber(remainingBudget)} isCurrency icon={<Target size={20} />} colorClass="bg-brand-info" gradientClass="bg-gradient-to-br from-blue-400 to-indigo-600" subText={`Total Budget: Rs. ${formatNumber(totalBudget)}`} />
        <DashboardCard title="Net Remaining Budget" value={formatNumber(netRemainingBudget)} isCurrency icon={<Activity size={20} />} colorClass="bg-brand-secondary" gradientClass="bg-gradient-to-br from-pink-400 to-rose-600" subText={`Total Budget - Received`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3 font-display">
              <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary"><Activity size={18} strokeWidth={2.5} /></div>
              Budget Utilization
            </h3>
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-400 hover:text-brand-primary disabled:opacity-30 transition-colors"
                ><ChevronRight size={20} className="rotate-180" /></button>
                <span className="text-xs font-black font-display">{currentPage} / {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-400 hover:text-brand-primary disabled:opacity-30 transition-colors"
                ><ChevronRight size={20} /></button>
              </div>
            )}
          </div>
          <div className="p-4 sm:p-6 lg:p-10 h-[350px] sm:h-[450px]">
            {paginatedProjectStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paginatedProjectStats} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} width={80} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                    formatter={(value: number) => formatCurrency(value)} 
                  />
                  <Bar dataKey="spent" stackId="a" fill="url(#colorSpent)" radius={[0, 0, 0, 0]} barSize={20}>
                    <defs>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </Bar>
                  <Bar dataKey="remaining" stackId="a" fill="#f1f5f9" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <LayoutGrid size={48} className="opacity-10 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest font-display">No site telemetry</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3 font-display">
              <div className="p-2 bg-brand-info/10 rounded-xl text-brand-info"><Package size={18} strokeWidth={2.5} /></div>
              High-Value Assets
            </h3>
            {totalAssetPages > 1 && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAssetPage(prev => Math.max(prev - 1, 1))}
                  disabled={assetPage === 1}
                  className="p-2 text-slate-400 hover:text-brand-primary disabled:opacity-30 transition-colors"
                ><ChevronRight size={20} className="rotate-180" /></button>
                <span className="text-xs font-black font-display">{assetPage} / {totalAssetPages}</span>
                <button 
                  onClick={() => setAssetPage(prev => Math.min(prev + 1, totalAssetPages))}
                  disabled={assetPage === totalAssetPages}
                  className="p-2 text-slate-400 hover:text-brand-primary disabled:opacity-30 transition-colors"
                ><ChevronRight size={20} /></button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-3 sm:space-y-4">
            {paginatedAssets.length > 0 ? paginatedAssets.map(m => (
              <div key={m.id} className="p-4 sm:p-5 border border-slate-100 dark:border-slate-700 rounded-3xl bg-slate-50/30 dark:bg-slate-900/10 transition-all hover:border-brand-primary/30 group">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase truncate font-display group-hover:text-brand-primary transition-colors">{m.name}</h4>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase mt-0.5">{m.totalPurchased - m.totalUsed} {m.unit} in hand</p>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white shrink-0 font-display">{formatCurrency(m.value)}</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div className="h-full bg-vibrant-gradient rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (m.value / (inventoryValue || 1)) * 100 * 3)}%` }}></div>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <Package size={48} className="opacity-10 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest font-display">Inventory empty</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg shadow-2xl overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] animate-in slide-in-from-bottom duration-500 border border-white/20 max-h-[90vh] flex flex-col">
            <div className={`p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0 ${formData.isGodown ? 'bg-slate-900' : 'bg-brand-primary'} text-white`}>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-none font-display">New Entry Point</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={24} sm:size={28} /></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 sm:p-10 space-y-6 sm:space-y-8 pb-safe overflow-y-auto no-scrollbar">
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl w-fit mx-auto sm:mx-0">
                <button type="button" onClick={() => setFormData(p => ({ ...p, isGodown: false }))} className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${!formData.isGodown ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}>Project Site</button>
                <button type="button" onClick={() => setFormData(p => ({ ...p, isGodown: true }))} className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${formData.isGodown ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}>Storage Hub</button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase mb-2 block tracking-widest font-display">Title</label>
                  <input type="text" className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-900 dark:text-white font-bold transition-all" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase mb-2 block tracking-widest font-display">{formData.isGodown ? 'Manager' : 'Client'}</label>
                    <input type="text" className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-900 dark:text-white font-bold transition-all" value={formData.client} onChange={e => setFormData(p => ({ ...p, client: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase mb-2 block tracking-widest font-display">Location</label>
                    <input type="text" className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-900 dark:text-white font-bold transition-all" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} required />
                  </div>
                </div>
                {!formData.isGodown && (
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase mb-2 block tracking-widest font-display">Project Budget (Rs.)</label>
                    <input type="number" className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary font-black text-slate-900 dark:text-white text-lg transition-all" value={formData.budget} onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))} required />
                  </div>
                )}
              </div>
              <button type="submit" className={`w-full ${formData.isGodown ? 'bg-slate-900' : 'bg-brand-primary'} text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-sm mt-6 vibrant-shadow font-display`}>
                Authorize Deployment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};