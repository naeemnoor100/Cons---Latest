
import React, { useMemo, useState } from 'react';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { 
  Download, 
  BarChart3 as LucideBarChart, 
  PieChart as LucidePieChart,
  TrendingUp,
  Briefcase,
  Target,
  ChevronDown,
  DollarSign,
  TrendingDown,
  ClipboardList,
  FileSpreadsheet,
  Search,
  Users,
  Package,
  HardHat,
  Wallet,
  Receipt
} from 'lucide-react';
import { useApp } from '../AppContext';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

export const Reports: React.FC = () => {
  const { projects, expenses, materials, incomes, vendors, laborLogs, employees, invoices, payments, laborPayments } = useApp();
  const [reportActiveTab, setReportActiveTab] = useState<'overview' | 'project-drilldown' | 'project-summary'>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [summaryProjectId, setSummaryProjectId] = useState<string>(projects[0]?.id || '');

  const projectSummaryData = useMemo(() => {
    if (!summaryProjectId) return null;
    const project = projects.find(p => p.id === summaryProjectId);
    if (!project) return null;

    const search = summarySearchTerm.toLowerCase();

    const projectExpenses = expenses.filter(e => e.projectId === summaryProjectId);
    const totalSpent = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget = project.budget - totalSpent;

    const materialSummary = materials.map(mat => {
      const history = mat.history || [];
      const siteEntries = history.filter(h => h.projectId === summaryProjectId);
      const used = Math.abs(siteEntries.filter(h => h.type === 'Usage' && h.quantity < 0).reduce((sum, h) => sum + h.quantity, 0));
      const inward = siteEntries.filter(h => (h.type === 'Purchase' || h.type === 'Transfer') && h.quantity > 0).reduce((sum, h) => sum + h.quantity, 0);
      const remaining = inward - used;
      return {
        id: mat.id,
        name: mat.name,
        unit: mat.unit,
        used,
        remaining,
        inward
      };
    }).filter(m => m.inward > 0 || m.used > 0)
      .filter(m => m.name.toLowerCase().includes(search));

    const supplierSummaryMap: Record<string, { name: string; amount: number }> = {};
    projectExpenses.filter(e => e.vendorId).forEach(e => {
      const vendor = vendors.find(v => v.id === e.vendorId);
      if (vendor) {
        if (!supplierSummaryMap[vendor.id]) {
          supplierSummaryMap[vendor.id] = { name: vendor.name, amount: 0 };
        }
        supplierSummaryMap[vendor.id].amount += e.amount;
      }
    });
    const supplierSummary = Object.values(supplierSummaryMap)
      .filter(s => s.name.toLowerCase().includes(search))
      .sort((a, b) => b.amount - a.amount);

    const laborSummaryMap: Record<string, { name: string; hours: number; amount: number }> = {};
    const projectLaborLogs = laborLogs.filter(l => l.projectId === summaryProjectId);
    projectLaborLogs.forEach(log => {
      const emp = employees.find(e => e.id === log.employeeId);
      if (emp) {
        if (!laborSummaryMap[emp.id]) {
          laborSummaryMap[emp.id] = { name: emp.name, hours: 0, amount: 0 };
        }
        laborSummaryMap[emp.id].hours += log.hoursWorked;
        laborSummaryMap[emp.id].amount += log.wageAmount;
      }
    });
    const laborSummary = Object.values(laborSummaryMap)
      .filter(l => l.name.toLowerCase().includes(search))
      .sort((a, b) => b.amount - a.amount);

    const invoiceSummary = invoices
      .filter(i => i.projectId === summaryProjectId)
      .filter(i => i.description.toLowerCase().includes(search) || i.status.toLowerCase().includes(search))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      project,
      totalSpent,
      remainingBudget,
      materialSummary,
      supplierSummary,
      laborSummary,
      invoiceSummary
    };
  }, [summaryProjectId, projects, expenses, materials, vendors, laborLogs, employees, invoices, summarySearchTerm]);

  // Project Drilldown Calculations
  const selectedProjectReport = useMemo(() => {
    if (!selectedProjectId) return null;
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return null;

    const projectExpenses = expenses.filter(e => e.projectId === selectedProjectId);
    const projectIncomes = incomes.filter(i => i.projectId === selectedProjectId);
    
    const totalSpent = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCollected = projectIncomes.reduce((sum, i) => sum + i.amount, 0);
    const remainingBudget = project.budget - totalSpent;

    // Category-wise summary
    const categorySummaryMap: Record<string, number> = {};
    projectExpenses.forEach(e => {
      categorySummaryMap[e.category] = (categorySummaryMap[e.category] || 0) + e.amount;
    });
    
    const categorySummary = Object.entries(categorySummaryMap)
      .map(([name, amount]) => ({ name, amount, percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    const topExpenses = [...projectExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 50);

    return {
      project,
      totalSpent,
      totalCollected,
      remainingBudget,
      categorySummary,
      topExpenses
    };
  }, [selectedProjectId, projects, expenses, incomes]);

  // Global Logic for Overview
  const financialData = useMemo(() => projects.map(p => {
    const spent = expenses.filter(e => e.projectId === p.id).reduce((sum, e) => sum + e.amount, 0);
    const collected = incomes.filter(i => i.projectId === p.id).reduce((sum, i) => sum + i.amount, 0);
    const paid = payments.filter(pay => pay.projectId === p.id).reduce((sum, pay) => sum + pay.amount, 0);
    return {
      name: p.name,
      budget: p.budget,
      spent: spent,
      income: collected,
      paid: paid,
      profit: collected - spent
    };
  }), [projects, expenses, incomes, payments]);

  const materialData = useMemo(() => materials.map(m => ({
    name: m.name,
    value: (m.totalPurchased - m.totalUsed) * m.costPerUnit
  })).filter(m => m.value > 0), [materials]);

  const timelineData = useMemo(() => {
    const combined: Record<string, { month: string, Income: number, Expense: number, Paid: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    incomes.forEach(inc => {
      const d = new Date(inc.date);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (!combined[key]) combined[key] = { month: key, Income: 0, Expense: 0, Paid: 0 };
      combined[key].Income += inc.amount;
    });

    expenses.forEach(exp => {
      const d = new Date(exp.date);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (!combined[key]) combined[key] = { month: key, Income: 0, Expense: 0, Paid: 0 };
      combined[key].Expense += exp.amount;
    });

    payments.forEach(pay => {
      const d = new Date(pay.date);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (!combined[key]) combined[key] = { month: key, Income: 0, Expense: 0, Paid: 0 };
      combined[key].Paid += pay.amount;
    });

    laborPayments.forEach(pay => {
      const d = new Date(pay.date);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (!combined[key]) combined[key] = { month: key, Income: 0, Expense: 0, Paid: 0 };
      combined[key].Paid += pay.amount;
    });

    return Object.values(combined).sort((a, b) => {
      const [m1, y1] = a.month.split(' ');
      const [m2, y2] = b.month.split(' ');
      return new Date(`${m1} 20${y1}`).getTime() - new Date(`${m2} 20${y2}`).getTime();
    });
  }, [incomes, expenses, payments, laborPayments]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Executive Reports</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Strategic analytics and financial summaries.</p>
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto no-scrollbar">
           <button 
            onClick={() => setReportActiveTab('overview')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${reportActiveTab === 'overview' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Overview
           </button>
           <button 
            onClick={() => setReportActiveTab('project-drilldown')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${reportActiveTab === 'project-drilldown' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Project Drill-Down
           </button>
           <button 
            onClick={() => setReportActiveTab('project-summary')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${reportActiveTab === 'project-summary' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Project Summary
           </button>
        </div>
      </div>

      {reportActiveTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                  <LucideBarChart size={18} className="text-blue-600" />
                  Portfolio Cash Flow
                </h3>
              </div>
              <div className="h-80">
                {financialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={financialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: 20, fontSize: 11, fontWeight: 600}} />
                      <Bar name="Actual Spent" dataKey="spent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar name="Actual Paid" dataKey="paid" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar name="Collected Income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <LucideBarChart size={48} className="opacity-20 mb-2" strokeWidth={1} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No site data available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                  <LucidePieChart size={18} className="text-emerald-600" />
                  Asset Distribution
                </h3>
              </div>
              <div className="h-80">
                {materialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={materialData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {materialData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{fontSize: 10}} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <LucidePieChart size={48} className="opacity-20 mb-2" strokeWidth={1} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No stock detected</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest mb-8">
              <TrendingUp size={20} className="text-blue-600" />
              Portfolio Transaction History
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Area type="monotone" name="Inbound Collections" dataKey="Income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" name="Outbound Expenses" dataKey="Expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                  <Area type="monotone" name="Actual Paid" dataKey="Paid" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorPaid)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {reportActiveTab === 'project-drilldown' && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="p-4 bg-[#003366] text-white rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none">
                 <Briefcase size={24} />
               </div>
               <div className="flex-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Project Site</p>
                 <div className="relative">
                    <select 
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full md:w-72 px-0 bg-transparent text-lg font-black text-slate-900 dark:text-white outline-none appearance-none cursor-pointer pr-10"
                    >
                      {projects.map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                 </div>
               </div>
             </div>

             <div className="flex gap-2 w-full md:w-auto">
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                   <Download size={14} /> Export Report
                </button>
             </div>
          </div>

          {selectedProjectReport ? (
            <div className="space-y-8">
              {/* Financial Pulse Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-6">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl">
                    <TrendingDown size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                    <p className="text-2xl font-black text-red-600">{formatCurrency(selectedProjectReport.totalSpent)}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-6">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Collected</p>
                    <p className="text-2xl font-black text-emerald-600">{formatCurrency(selectedProjectReport.totalCollected)}</p>
                  </div>
                </div>
                <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2rem] text-white shadow-2xl flex items-center gap-6">
                  <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20">
                    <DollarSign size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Remaining Budget</p>
                    <p className={`text-2xl font-black ${selectedProjectReport.remainingBudget < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {formatCurrency(selectedProjectReport.remainingBudget)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Category Spending Table */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm h-full">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <FileSpreadsheet size={18} className="text-blue-600" />
                        Spending by Category
                      </h3>
                    </div>
                    <div className="p-0">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                          <tr>
                            <th className="px-8 py-4">Category</th>
                            <th className="px-8 py-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                          {selectedProjectReport.categorySummary.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-8 py-4">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{cat.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{cat.percentage.toFixed(1)}% of total</p>
                              </td>
                              <td className="px-8 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                                {formatCurrency(cat.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Top 50 Expenses List */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                        <ClipboardList size={20} />
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Top 50 Expenditure Items</h4>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">Audit Trail</span>
                  </div>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-white dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Details</th>
                          <th className="px-8 py-5">Vendor</th>
                          <th className="px-8 py-5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {selectedProjectReport.topExpenses.length > 0 ? selectedProjectReport.topExpenses.map((exp, idx) => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">#{idx + 1}</div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{exp.notes}</p>
                                    <p className="text-[9px] font-black uppercase text-blue-500">{exp.category}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-5">
                               <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight truncate max-w-[120px] inline-block">
                                 {vendors.find(v => v.id === exp.vendorId)?.name || 'Direct'}
                               </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                               <span className="text-sm font-black text-red-600">{formatCurrency(exp.amount)}</span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-8 py-20 text-center text-slate-300">
                               <p className="text-[10px] font-bold uppercase">No records available</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem]">
              <Target size={48} className="opacity-20 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Select a valid project to see analysis</p>
            </div>
          )}
        </div>
      )}

      {reportActiveTab === 'project-summary' && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="p-4 bg-[#003366] text-white rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none">
                 <Briefcase size={24} />
               </div>
               <div className="flex-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Project Site</p>
                 <div className="relative">
                    <select 
                      value={summaryProjectId}
                      onChange={(e) => setSummaryProjectId(e.target.value)}
                      className="w-full md:w-72 px-0 bg-transparent text-lg font-black text-slate-900 dark:text-white outline-none appearance-none cursor-pointer pr-10"
                    >
                      {projects.map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                 </div>
               </div>
             </div>

             <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by material, supplier, labor..." 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" 
                    value={summarySearchTerm} 
                    onChange={(e) => setSummarySearchTerm(e.target.value)} 
                  />
                </div>
             </div>
          </div>

          {projectSummaryData ? (
            <div className="space-y-8">
              {/* Budget Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                    <Wallet size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Budget</p>
                    <p className="text-2xl font-black text-blue-600">{formatCurrency(projectSummaryData.project.budget)}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-6">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl">
                    <TrendingDown size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                    <p className="text-2xl font-black text-red-600">{formatCurrency(projectSummaryData.totalSpent)}</p>
                  </div>
                </div>
                <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2rem] text-white shadow-2xl flex items-center gap-6">
                  <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20">
                    <DollarSign size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Remaining Budget</p>
                    <p className={`text-2xl font-black ${projectSummaryData.remainingBudget < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(projectSummaryData.remainingBudget)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Material Summary */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <Package size={18} className="text-blue-600" />
                      Material (Used & Remaining)
                    </h3>
                  </div>
                  <div className="overflow-x-auto no-scrollbar max-h-96">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 sticky top-0">
                        <tr>
                          <th className="px-8 py-4">Material</th>
                          <th className="px-8 py-4 text-right">Used</th>
                          <th className="px-8 py-4 text-right">In Hand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {projectSummaryData.materialSummary.length > 0 ? projectSummaryData.materialSummary.map((mat, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-8 py-4">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{mat.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold">Unit: {mat.unit}</p>
                            </td>
                            <td className="px-8 py-4 text-right text-xs font-black text-red-600">
                              {mat.used.toLocaleString()}
                            </td>
                            <td className="px-8 py-4 text-right text-xs font-black text-emerald-600">
                              {mat.remaining.toLocaleString()}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="px-8 py-10 text-center text-slate-400 text-xs font-bold uppercase">No materials found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Suppliers Summary */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <Users size={18} className="text-emerald-600" />
                      Suppliers
                    </h3>
                  </div>
                  <div className="overflow-x-auto no-scrollbar max-h-96">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 sticky top-0">
                        <tr>
                          <th className="px-8 py-4">Supplier Name</th>
                          <th className="px-8 py-4 text-right">Total Spent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {projectSummaryData.supplierSummary.length > 0 ? projectSummaryData.supplierSummary.map((sup, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-8 py-4 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                              {sup.name}
                            </td>
                            <td className="px-8 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                              {formatCurrency(sup.amount)}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={2} className="px-8 py-10 text-center text-slate-400 text-xs font-bold uppercase">No suppliers found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Labor Summary */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <HardHat size={18} className="text-amber-600" />
                      Labor
                    </h3>
                  </div>
                  <div className="overflow-x-auto no-scrollbar max-h-96">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 sticky top-0">
                        <tr>
                          <th className="px-8 py-4">Laborer Name</th>
                          <th className="px-8 py-4 text-right">Total Hours</th>
                          <th className="px-8 py-4 text-right">Total Wages</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {projectSummaryData.laborSummary.length > 0 ? projectSummaryData.laborSummary.map((lab, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-8 py-4 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                              {lab.name}
                            </td>
                            <td className="px-8 py-4 text-right text-xs font-black text-slate-600 dark:text-slate-400">
                              {lab.hours} hrs
                            </td>
                            <td className="px-8 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                              {formatCurrency(lab.amount)}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="px-8 py-10 text-center text-slate-400 text-xs font-bold uppercase">No labor records found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoices Summary */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <Receipt size={18} className="text-indigo-600" />
                      Invoices
                    </h3>
                  </div>
                  <div className="overflow-x-auto no-scrollbar max-h-96">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 sticky top-0">
                        <tr>
                          <th className="px-8 py-4">Description</th>
                          <th className="px-8 py-4">Status</th>
                          <th className="px-8 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {projectSummaryData.invoiceSummary.length > 0 ? projectSummaryData.invoiceSummary.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-8 py-4">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase truncate max-w-[150px]">{inv.description}</p>
                              <p className="text-[9px] text-slate-400 font-bold">{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </td>
                            <td className="px-8 py-4">
                              <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 
                                inv.status === 'Sent' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 
                                inv.status === 'Draft' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                                'bg-red-50 text-red-600 dark:bg-red-900/20'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                              {formatCurrency(inv.amount)}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="px-8 py-10 text-center text-slate-400 text-xs font-bold uppercase">No invoices found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem]">
              <Target size={48} className="opacity-20 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Select a valid project to see summary</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
