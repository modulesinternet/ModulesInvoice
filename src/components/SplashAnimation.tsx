import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Server, ShieldCheck } from 'lucide-react';

interface SplashAnimationProps {
  companyName: string;
  logoUrl: string;
  onComplete?: () => void;
}

export default function SplashAnimation({ companyName, logoUrl, onComplete }: SplashAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing secure sandbox environment...');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setStatusText('Establishing handshake with secure Google Cloud Run node...'), 200);
    const timer2 = setTimeout(() => setStatusText('Mirroring real-time Firestore relational snapshot...'), 500);
    const timer3 = setTimeout(() => setStatusText('Sanitizing transactional double-entry books...'), 800);

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
              if (onComplete) {
                onComplete();
              }
            }, 500); // Wait for exit animation to complete
          }, 350); // Pause briefly at 100% stable
          return 100;
        }
        return p + Math.floor(Math.random() * 12) + 8;
      });
    }, 45);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  const cleanLogo = logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80';

  return (
    <div 
      className={`fixed inset-0 bg-slate-950 flex flex-col items-center justify-between p-8 select-none z-[10000] overflow-hidden transition-all duration-500 ease-in-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      id="app-splash-screen"
    >
      {/* Dynamic ambient starfield / blur blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>

      {/* Top micro elements */}
      <div className="flex items-center gap-2 pt-6 opacity-30 select-none">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">Enterprise Secure Sync v3.x</span>
      </div>

      {/* Centerpiece: Logo and Title */}
      <div className="flex flex-col items-center space-y-6 max-w-sm text-center">
        {/* Pulsing ring around the corporate Logo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 w-28 h-28 bg-indigo-500/20 rounded-full blur-md animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-0 w-24 h-24 border border-indigo-500/30 rounded-full animate-pulse" style={{ animationDuration: '2s' }}></div>
          
          <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 p-2 overflow-hidden flex items-center justify-center shadow-2xl relative z-10">
            <img 
              src={cleanLogo}
              alt="Corporate Logo"
              className="w-full h-full object-contain rounded-2xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback icon inside error
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80';
              }}
            />
          </div>
        </div>

        {/* Dynamic App Typography */}
        <div className="space-y-1.5 z-10">
          <h1 className="text-3xl font-extrabold text-slate-100 font-display tracking-tight leading-none">
            {companyName || 'Internet Modules'}
          </h1>
          <p className="text-xs text-indigo-400 font-medium tracking-wider uppercase font-sans">
            Global ERP Register
          </p>
        </div>
      </div>

      {/* Bottom status tracker & animated progress metrics */}
      <div className="w-full max-w-xs space-y-4 pb-12 z-10">
        <div className="flex flex-col space-y-2">
          {/* Animated Track */}
          <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden border border-slate-900/40 relative">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-0.5">
            <span className="animate-pulse">ONLINE SYNCING</span>
            <span>{Math.min(progress, 100)}%</span>
          </div>
        </div>

        {/* Status Text with horizontal slide alignment */}
        <div className="flex items-center gap-2 justify-center text-[10px] text-slate-400 font-mono text-center">
          <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-bounce" />
          <span className="truncate max-w-[240px] uppercase tracking-wide">{statusText}</span>
        </div>
      </div>
    </div>
  );
}
