import React, { useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [inputDate, setInputDate] = useState('');
  const [error, setError] = useState(false);
  
  // Dynamically get today's date in YYYY-MM-DD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  const handleContinue = () => {
    if (inputDate === today) {
      onComplete();
    } else {
      setError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleContinue();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#003366] text-white"
    >
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-black uppercase tracking-widest">BuildMaster Pro</h1>
        <p className="text-lg opacity-80">Please enter today's date (YYYY-MM-DD) to continue:</p>
        <input
          type="password"
          value={inputDate}
          onChange={(e) => {
            setInputDate(e.target.value);
            setError(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="YYYY-MM-DD"
          className="w-full max-w-xs px-4 py-3 text-center text-slate-900 rounded-xl border-2 border-white/20 focus:border-white outline-none"
        />
        {error && <p className="text-rose-300 text-sm">Incorrect date. Please try again.</p>}
        <button
          onClick={handleContinue}
          className="w-full max-w-xs px-6 py-3 bg-white text-[#003366] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
};
