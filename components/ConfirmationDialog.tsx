import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-4 text-rose-600">
          <AlertTriangle size={32} />
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
        
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">Cancel</button>
          <button 
            onClick={onConfirm} 
            className="flex-1 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
