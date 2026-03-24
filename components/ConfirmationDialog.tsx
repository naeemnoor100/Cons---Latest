import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  passwordRequired?: boolean;
  passwordValue?: string;
  onPasswordChange?: (value: string) => void;
  error?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, 
  passwordRequired, passwordValue, onPasswordChange, error
}) => {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Enter') {
        // If password is required, we only want to submit if they pressed enter in the input
        // which is handled by the input's own onKeyDown.
        // Wait, actually, if password is required, we can just submit with the current passwordValue.
        // But to avoid double submission, we can just let the input handle it if it's focused.
        // Let's just handle it here for when password is NOT required.
        if (!passwordRequired) {
          e.preventDefault();
          onConfirm('');
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onConfirm, passwordRequired]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-4 text-rose-600">
          <AlertTriangle size={32} />
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
        
        {passwordRequired && (
          <div className="mb-6">
            <input
              type="text"
              autoFocus
              value={passwordValue || ''}
              onChange={(e) => onPasswordChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onConfirm(passwordValue || '');
                }
              }}
              placeholder="Enter today's date (YYYY-MM-DD)"
              className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-rose-500'} bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 outline-none`}
            />
            {error && <p className="text-rose-500 text-xs font-bold mt-2 text-left">{error}</p>}
          </div>
        )}
        
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">Cancel</button>
          <button 
            onClick={() => onConfirm(passwordValue || '')} 
            className="flex-1 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
