import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface SplashAnimationProps {
  companyName: string;
  logoUrl: string;
  onComplete?: () => void;
}

export default function SplashAnimation({ companyName, logoUrl, onComplete }: SplashAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Booting system');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Beautiful smooth simulated loader
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        const remaining = 100 - p;
        const speed = Math.max(3, Math.floor(remaining * 0.12));
        return Math.min(p + speed, 100);
      });
    }, 100);

    const t1 = setTimeout(() => setStatusText('Verifying credentials'), 500);
    const t2 = setTimeout(() => setStatusText('Connecting to cloud database'), 1100);
    const t3 = setTimeout(() => setStatusText('Synchronizing workspace'), 1700);

    // Fade out and close after 2.6 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      const completeTimer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 500);
      return () => clearTimeout(completeTimer);
    }, 2500);

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
      className={`fixed inset-0 bg-[#EFF2F9] flex flex-col items-center justify-center p-8 select-none z-[10000] overflow-hidden transition-all duration-500 ease-in-out ${
        isExiting ? 'opacity-0 scale-[1.04] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      id="app-splash-screen"
    >
      {/* Soft elegant ambient lighting backglow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/40 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Animated Wrapper */}
      <div className="flex flex-col items-center justify-between h-full w-full max-w-md py-12 relative z-10">
        {/* Placeholder spacer at the top */}
        <div className="h-6"></div>

        {/* Centerpiece: Replicating the clean launch screen card */}
        <div className="flex flex-col items-center justify-center flex-1">
          {/* White highly-rounded Card container exactly as in screenshot */}
          <motion.div 
            initial={{ scale: 0.75, opacity: 0, y: 30 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: [0, -10, 0] 
            }}
            transition={{
              scale: { type: "spring", stiffness: 120, damping: 14, delay: 0.05 },
              opacity: { duration: 0.5, ease: "easeOut" },
              y: {
                repeat: Infinity,
                duration: 4,
                ease: "easeInOut",
                delay: 0.5
              }
            }}
            className="w-56 h-56 sm:w-64 sm:h-64 rounded-[48px] sm:rounded-[56px] bg-white flex items-center justify-center p-8 sm:p-10 shadow-[0_25px_60px_-15px_rgba(91,33,255,0.08),0_15px_30px_-10px_rgba(0,0,0,0.04)] border border-white/80"
          >
            {/* Logo Image inside card container */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
              className="w-full h-full flex items-center justify-center overflow-hidden rounded-[28px]"
            >
              <img 
                src={cleanLogo}
                alt="Corporate Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = fallbackLogo;
                }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Loading and Progress indicator - Elegant, ultra-clean */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full max-w-[220px] flex flex-col items-center space-y-5"
        >
          {/* Sleek, thin elegant progress tracking */}
          <div className="w-full">
            <div className="w-full h-[3px] bg-slate-200/80 rounded-full overflow-hidden relative">
              <motion.div 
                className="h-full bg-[#5B21FF] rounded-full shadow-[0_0_8px_rgba(91,33,255,0.4)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Dynamic Status and Spinner */}
          <div className="flex items-center gap-2 justify-center min-h-[16px]">
            <Loader2 className="w-3.5 h-3.5 text-[#5B21FF] animate-spin" />
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono">{statusText}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
