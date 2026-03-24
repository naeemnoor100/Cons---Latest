
import React from 'react';
import { X, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../AppContext';

interface ExportPopupProps {
  onClose: () => void;
}

export const ExportPopup: React.FC<ExportPopupProps> = ({ onClose }) => {
  const { exportData, exportExcel } = useApp();

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
          <div className="flex gap-4 items-center">
            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg">
              <Download size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Data Export</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Backup your project data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            It's been 24 hours since your last backup. Please export your data to ensure you have a local copy of all your records.
          </p>
          
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => {
                exportData();
                // We don't close here so user can download both
              }}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all group"
            >
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <FileJson size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Export as JSON</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Full Application State</p>
              </div>
            </button>

            <button
              onClick={() => {
                exportExcel();
              }}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all group"
            >
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileSpreadsheet size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Export as Excel</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Structured Data Sheets</p>
              </div>
            </button>
          </div>
        </div>
        
        <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            I'll do it later
          </button>
        </div>
      </div>
    </div>
  );
};
