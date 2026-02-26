import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Search, SlidersHorizontal, Package } from 'lucide-react';
import { Material, Vendor, Expense, Project } from '../types';

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

interface MaterialSummary extends Material {
  inHandValue: number;
}

interface VendorSummary extends Vendor {
  totalSpent: number;
}

interface ProjectSummaryData extends Project {
  spent: number;
  remaining: number;
}

export const ProjectSummary: React.FC = () => {
  const { projects, materials, vendors, expenses } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('material');

  const filteredData = useMemo(() => {
    if (filter === 'material') {
      return materials
        .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map((m): MaterialSummary => ({
          ...m,
          inHandValue: (m.totalPurchased - m.totalUsed) * m.costPerUnit,
        }));
    } else if (filter === 'supplier') {
      return vendors
        .filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map((v): VendorSummary => ({
          ...v,
          totalSpent: expenses.filter(e => e.vendorId === v.id).reduce((sum, e) => sum + e.amount, 0)
        }));
    } else if (filter === 'stock') {
      return materials
        .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (b.totalPurchased - b.totalUsed) - (a.totalPurchased - a.totalUsed));
    } else if (filter === 'labor') {
      return expenses
        .filter(e => e.category === 'Labor' && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a,b) => b.amount - a.amount);
    } else if (filter === 'budget') {
      return projects
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(p => ({
          ...p,
          spent: expenses.filter(e => e.projectId === p.id).reduce((sum, e) => sum + e.amount, 0)
        }))
        .map((p): ProjectSummaryData => ({
          ...p,
          remaining: p.budget - p.spent
        }));
    }
    return [];
  }, [searchTerm, filter, materials, vendors, expenses, projects]);

  const renderContent = () => {
    if (filteredData.length === 0) {
      return <p className="text-sm text-center py-10 text-slate-500 dark:text-slate-400">No data available for the current selection.</p>;
    }

    switch (filter) {
      case 'material':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map((item: MaterialSummary) => (
              <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-lg">
                    <Package size={16} />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">{item.name}</h4>
                </div>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700/30 rounded-lg">
                    <span className="font-bold text-slate-500">In Hand:</span>
                    <span className="font-black text-slate-900 dark:text-white">{item.totalPurchased - item.totalUsed} {item.unit}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700/30 rounded-lg">
                    <span className="font-bold text-slate-500">Value:</span>
                    <span className="font-black text-emerald-600">{formatCurrency(item.inHandValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'supplier':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map((item: VendorSummary) => (
              <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate mb-2">{item.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{item.contactPerson}</p>
                <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700/30 rounded-lg">
                  <span className="font-bold text-slate-500 text-xs">Total Spent:</span>
                  <span className="font-black text-red-600">{formatCurrency(item.totalSpent)}</span>
                </div>
              </div>
            ))}
          </div>
        );
      case 'stock':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-2">Material</th>
                  <th className="px-4 py-2">In Hand</th>
                  <th className="px-4 py-2">Used</th>
                  <th className="px-4 py-2">Purchased</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item: Material) => (
                  <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-sm font-black text-blue-600">{item.totalPurchased - item.totalUsed} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{item.totalUsed} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{item.totalPurchased} {item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'labor':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item: Expense) => (
                  <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">{item.notes}</td>
                    <td className="px-4 py-3 text-sm font-black text-red-600 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'budget':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredData.map((item: ProjectSummaryData) => (
              <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate mb-2">{item.name}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700/30 rounded-lg">
                    <span className="font-bold text-slate-500">Budget:</span>
                    <span className="font-black text-slate-900 dark:text-white">{formatCurrency(item.budget)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700/30 rounded-lg">
                    <span className="font-bold text-slate-500">Spent:</span>
                    <span className="font-black text-red-600">{formatCurrency(item.spent)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700/30 rounded-lg">
                    <span className="font-bold text-slate-500">Remaining:</span>
                    <span className={`font-black ${item.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(item.remaining)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return <p className="text-sm text-slate-500 dark:text-slate-400">Select a filter to see summary data.</p>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Search by keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl h-14 pl-12 pr-4 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003366] transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="h-14 px-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 focus:outline-none appearance-none"
            >
              <option value="material">By Material</option>
              <option value="supplier">By Suppliers</option>
              <option value="stock">By Stock</option>
              <option value="labor">By Labor</option>
              <option value="budget">By Budget</option>
            </select>
            <button className="h-14 w-14 flex items-center justify-center bg-[#003366] text-white rounded-2xl shadow-lg hover:opacity-90 transition-opacity">
              <SlidersHorizontal size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Results will be displayed here */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
};
