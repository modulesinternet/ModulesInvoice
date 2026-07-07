import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ShieldCheck, Cpu } from 'lucide-react';

interface SplashAnimationProps {
  companyName: string;
  logoUrl: string;
  isLoaded?: boolean;
  onComplete?: () => void;
}

export default function SplashAnimation({ companyName, logoUrl, isLoaded, onComplete }: SplashAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLoaded === undefined) {
      // Fallback to standard simulated progress if no dynamic isLoaded prop is supplied
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            return 100;
          }
          const remaining = 100 - p;
          const step = Math.max(3, Math.floor(remaining * 0.25));
          return Math.min(p + step, 100);
        });
      }, 60);

      const t1 = setTimeout(() => setStatusText('Verifying'), 250);
      const t2 = setTimeout(() => setStatusText('Syncing'), 650);
      const t3 = setTimeout(() => setStatusText('Loading'), 1100);
      const t4 = setTimeout(() => setStatusText('Ready'), 1450);

      return () => {
        clearInterval(interval);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else {
      // Dynamic progress tied directly to isLoaded state
      interval = setInterval(() => {
        setProgress(p => {
          if (isLoaded) {
            if (p >= 100) {
              clearInterval(interval);
              return 100;
            }
            return Math.min(p + 15, 100);
          } else {
            if (p >= 88) {
              return 88;
            }
            const remaining = 88 - p;
            const step = Math.max(2, Math.floor(remaining * 0.15));
            return Math.min(p + step, 88);
          }
        });
      }, 50);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded !== undefined) {
      if (!isLoaded) {
        if (progress < 30) setStatusText('Initializing');
        else if (progress < 60) setStatusText('Synchronizing');
        else setStatusText('Hydrating Data');
      } else {
        setStatusText('Ready');
      }
    }
  }, [progress, isLoaded]);

  useEffect(() => {
    if (progress === 100) {
      const exitTimer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 350);
      return () => clearTimeout(exitTimer);
    }
  }, [progress, onComplete]);

  const fallbackLogo = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80';
  const cleanLogo = logoUrl ? logoUrl.trim() : fallbackLogo;
  const displayName = companyName || 'iModules';

  // SVG Circular progress configurations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div 
      initial={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ 
        opacity: 0, 
        scale: 1.02, 
        filter: 'blur(8px)',
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } 
      }}
      className="fixed inset-0 bg-gradient-to-tr from-[#F1F5F9] via-[#F8FAFC] to-[#EFF2F8] flex flex-col items-center justify-between p-8 select-none z-[10000] overflow-hidden"
      id="app-splash-screen"
    >
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#0EA5E9]/5 to-[#4F46E5]/4 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-sky-50/30 rounded-full blur-[70px] pointer-events-none" />

      {/* Header element */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center z-10 pt-4"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[9px] font-bold tracking-[0.15em] text-slate-500 uppercase font-mono">Secured Endpoint</span>
        </div>
      </motion.div>

      {/* Main visual node: Logo enclosed in elegant concentric progress rings */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-sm z-10">
        <div className="relative w-[150px] h-[150px] flex items-center justify-center">
          {/* Outer glowing halo ring */}
          <motion.div 
            animate={{ scale: [1, 1.02, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border border-sky-100/20 bg-white/10 blur-xs shadow-[0_0_20px_rgba(14,165,233,0.02)] pointer-events-none"
          />

          {/* Svg dynamic loader outline */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 150 150">
            {/* Background static circle track */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              className="stroke-slate-100/80 fill-none"
              strokeWidth="3.5"
            />
            {/* Dynamic animated stroke path */}
            <motion.circle
              cx="75"
              cy="75"
              r={radius}
              className="stroke-[#0EA5E9] fill-none"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transition={{ ease: 'easeOut', duration: 0.15 }}
              style={{
                filter: 'drop-shadow(0 0 4px rgba(14, 165, 233, 0.25))'
              }}
            />
          </svg>

          {/* Central Logo Panel */}
          <motion.div 
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.15 }}
            className="absolute w-24 h-24 rounded-2xl bg-black flex items-center justify-center p-1.5 shadow-[0_12px_28px_rgba(14,165,233,0.08),0_6px_12px_rgba(0,0,0,0.2)] border border-slate-800/80"
          >
            {/* Subtle premium frame accent inside */}
            <div className="absolute inset-1 rounded-[12px] border border-slate-800/60 pointer-events-none" />

            <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-[8px]">
              <img 
                src={cleanLogo}
                alt={displayName}
                className="w-full h-full object-contain filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.01)]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = fallbackLogo;
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Branded text presentation under logo */}
        <div className="text-center space-y-2 max-w-xs mt-8">
          <motion.h1 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl font-bold font-display tracking-tight text-slate-800"
          >
            {displayName}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.15em] font-sans"
          >
            Universal Ledger Platform
          </motion.p>
        </div>
      </div>

      {/* Bottom functional status & indicators */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[220px] flex flex-col items-center space-y-4 pb-4 z-10"
      >
        {/* Sleek inline loading details */}
        <div className="flex items-center gap-2 justify-center min-h-[18px]">
          <Loader2 className="w-3.5 h-3.5 text-[#0EA5E9] animate-spin" />
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono">{statusText}</span>
        </div>

        {/* Dynamic percentage label */}
        <span className="text-[11px] font-mono font-semibold text-[#0EA5E9]">
          {progress}% Complete
        </span>
      </motion.div>
    </motion.div>
  );
}
