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
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-primary overflow-hidden"
    >
      {/* Animated background elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-brand-secondary/20 rounded-full blur-[120px]"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1],
          rotate: [0, -120, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-brand-accent/20 rounded-full blur-[120px]"
      />

      <div className="relative z-10 text-center space-y-8 p-8 max-w-md w-full">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-6xl font-display font-black text-white tracking-tighter mb-2">
            Build<span className="text-brand-accent">Master</span>
          </h1>
          <p className="text-white/60 font-medium tracking-[0.2em] uppercase text-sm">Professional Suite</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="relative group">
            <input
              type="password"
              placeholder="Enter Access Key"
              value={inputDate}
              onChange={(e) => {
                setInputDate(e.target.value);
                setError(false);
              }}
              onKeyDown={handleKeyDown}
              className="w-full px-6 py-4 text-center bg-white/10 backdrop-blur-xl text-white rounded-2xl border-2 border-white/10 focus:border-brand-accent outline-none transition-all placeholder:text-white/30 font-display text-xl tracking-widest"
            />
            <div className="absolute inset-0 rounded-2xl bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
          
          {error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-rose-400 text-sm font-medium"
            >
              Access key incorrect. Please verify.
            </motion.p>
          )}

          <button
            onClick={handleContinue}
            className="w-full px-8 py-4 bg-white text-brand-primary font-display font-bold uppercase tracking-widest rounded-2xl hover:bg-brand-accent hover:text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-black/20"
          >
            Initialize System
          </button>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/40 text-xs font-mono"
        >
          v4.0.2 // SECURE_ACCESS_PROTOCOL
        </motion.p>
      </div>
    </motion.div>
  );
};
