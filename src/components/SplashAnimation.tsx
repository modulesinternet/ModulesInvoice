import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Shield } from 'lucide-react';

interface SplashAnimationProps {
  companyName: string;
  logoUrl: string;
  onComplete?: () => void;
}

export default function SplashAnimation({ companyName, logoUrl, onComplete }: SplashAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Starting');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Elegant, smooth milestones that mimic a real system boot
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Smooth deceleration curve
        const remaining = 100 - p;
        const speed = Math.max(2, Math.floor(remaining * 0.1));
        return Math.min(p + speed, 100);
      });
    }, 120);

    // Timed professional status messages matching milestones exactly as requested
    const t1 = setTimeout(() => setStatusText('Verifying'), 600);
    const t2 = setTimeout(() => setStatusText('Synchronizing'), 1300);
    const t3 = setTimeout(() => setStatusText('Opening'), 1900);

    // Initiate beautiful scale-and-fade exit after exactly 2.6s, completing the 3.0s load sequence
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      const completeTimer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 550); // Match Tailwind duration ease-out fade
      return () => clearTimeout(completeTimer);
    }, 2550);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  const fallbackLogo = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80';
  const cleanLogo = logoUrl ? logoUrl.trim() : fallbackLogo;

  return (
    <div 
      className={`fixed inset-0 bg-slate-950 flex flex-col items-center justify-between pt-4 pb-16 px-8 select-none z-[10000] overflow-hidden transition-all duration-600 ease-in-out ${
        isExiting ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      id="app-splash-screen"
    >
      {/* Premium Cinematic Ambient Backglow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Header Label - Understated & Minimal */}
      <div className="flex items-center gap-2 opacity-45 mt-2 self-center">
        <Shield className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-slate-400">Secure Node authorization</span>
      </div>

      {/* Centerpiece: Logo and Title (separated with mt-24 for look professional spacing) */}
      <div className="flex flex-col items-center max-w-sm text-center mt-24 sm:mt-32">
        {/* Logo Container with continuous professional breath glow */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 opacity-70 blur-md animate-pulse duration-[4000ms]"></div>
          <div className="absolute -inset-px rounded-3xl bg-slate-800/50 border border-slate-700/30"></div>
          
          <div className="relative w-24 h-24 rounded-3xl bg-slate-900 border border-slate-850 p-2.5 flex items-center justify-center shadow-2xl overflow-hidden z-10">
            <img 
              src={cleanLogo}
              alt="Corporate Logo"
              className="w-full h-full object-contain rounded-2xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = fallbackLogo;
              }}
            />
          </div>
        </div>

        {/* Dynamic App Brand Block */}
        <div className="space-y-3 z-10 pb-8">
          <h1 className="text-3xl font-bold text-slate-100 font-display tracking-tight leading-tight">
            {companyName || 'iModules'}
          </h1>
          <p className="text-[10px] text-indigo-400 font-bold tracking-[0.3em] uppercase leading-none pl-[0.3em]">
            Global ERP Register
          </p>
        </div>
      </div>

      {/* Understated bottom loader and clean status feedback with defensive margin to avoid collision */}
      <div className="w-full max-w-[210px] flex flex-col items-center space-y-6 mt-12 mb-6 z-10">
        <div className="w-full">
          {/* Extremely thin, elegant sleek status tracks */}
          <div className="w-full h-[3px] bg-slate-900/90 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Status Line with a spinning indicator */}
        <div className="flex items-center gap-2 justify-center text-[10px] text-slate-500 font-mono tracking-wider min-h-[16px]">
          <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
          <span className="uppercase text-[9px] font-bold text-slate-400">{statusText}</span>
        </div>
      </div>
    </div>
  );
}
