import React, { useEffect } from 'react';
import { Phone, PhoneOff, Volume2, Shield, AlertTriangle } from 'lucide-react';
import { Payment, BusinessSettings } from '../types';

interface AndroidIncomingCallScreenProps {
  payment: Payment;
  settings: BusinessSettings;
  onAccept: () => void;
  onDecline: () => void;
}

export default function AndroidIncomingCallScreen({
  payment,
  settings,
  onAccept,
  onDecline
}: AndroidIncomingCallScreenProps) {
  
  const callerName = settings?.ttsCallerName || 'Karan Sharma';

  useEffect(() => {
    let ringInterval: any;
    let speakInterval: any;
    let vibrateInterval: any;
    
    // 1. Vibration loop - mimics WhatsApp's long heavy vibrations
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([1200, 1000]);
      vibrateInterval = setInterval(() => {
        navigator.vibrate([1200, 1000]);
      }, 2200);
    }

    // 2. Synthesized VoIP Call Ringtone Loop
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    let audioCtx: AudioContext | null = null;
    
    const playWhatsappCallRing = () => {
      try {
        if (!audioCtx) {
          audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        
        const now = audioCtx.currentTime;
        const playTone = (freq1: number, freq2: number, start: number, duration: number) => {
          if (!audioCtx) return;
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(freq1, start);
          osc2.frequency.setValueAtTime(freq2, start);
          
          gainNode.gain.setValueAtTime(0, start);
          gainNode.gain.linearRampToValueAtTime(0.2, start + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
          
          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc1.start(start);
          osc2.start(start);
          osc1.stop(start + duration);
          osc2.stop(start + duration);
        };

        // Standard WhatsApp/VoIP double chirp ring tone
        playTone(453, 398, now, 0.45);
        playTone(453, 398, now + 0.6, 0.45);
      } catch (err) {
        console.warn("Ringtone play error:", err);
      }
    };

    playWhatsappCallRing();
    ringInterval = setInterval(playWhatsappCallRing, 2800);

    // 3. TTS Announcement Playback while ringing
    const speakAnnouncement = () => {
      if (!window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        
        const tmpl = settings?.voiceAnnounceTemplate || "Payment of ₹{amount} has been received from {hotelName} via {paymentMode}.";
        const formattedAmt = new Intl.NumberFormat('en-IN').format(payment.amount);
        let textToSpeak = tmpl
          .replace(/{amount}/g, formattedAmt)
          .replace(/{hotelName}/g, payment.clientName || '')
          .replace(/{paymentMode}/g, payment.paymentMode || '')
          .replace(/{date}/g, new Date(payment.paymentDate || Date.now()).toLocaleDateString());
        
        textToSpeak = textToSpeak.replace(/{|}/g, '').trim();

        const message = `${callerName} is calling: ${textToSpeak}`;
        const utterance = new SpeechSynthesisUtterance(message);
        
        // Find a natural English speaking voice if available
        const voices = window.speechSynthesis.getVoices();
        const targetVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
        );
        if (targetVoice) utterance.voice = targetVoice;
        
        utterance.volume = 1.0;
        utterance.rate = 0.95;
        
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error("TTS call screen synthesis failed:", e);
      }
    };

    speakAnnouncement();
    // Speak on a slower interval to allow user to experience the VoIP ringtone as well
    speakInterval = setInterval(speakAnnouncement, 9000);

    return () => {
      clearInterval(ringInterval);
      clearInterval(speakInterval);
      clearInterval(vibrateInterval);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(0);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioCtx) {
        audioCtx.close().catch(() => null);
      }
    };
  }, [payment, settings, callerName]);

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(payment.amount);

  return (
    <div 
      id="whatsapp-call-screen"
      className="fixed inset-0 bg-[#071A24] text-white z-[99999] flex flex-col justify-between py-16 px-6 font-sans no-print select-none overflow-hidden"
    >
      {/* Background pulsed circular waves (WhatsApp Ringing visual) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <span className="absolute w-[240px] h-[240px] border border-[#128C7E] rounded-full animate-ping"></span>
        <span className="absolute w-[450px] h-[450px] border border-[#128C7E] rounded-full animate-ping delay-700"></span>
        <span className="absolute w-[650px] h-[650px] border border-[#128C7E]/45 rounded-full animate-ping delay-1000"></span>
      </div>

      {/* Top Header Section */}
      <div className="w-full flex flex-col items-center pt-4 text-center z-10">
        {/* Secure APK Status */}
        <div className="flex items-center gap-1.5 bg-black/25 text-[#128C7E] px-3.5 py-1.5 rounded-full border border-[#128C7E]/30 mb-8 animate-pulse text-[10px] font-bold tracking-widest uppercase">
          <Shield className="w-3.5 h-3.5" />
          <span>Secure Enterprise Video & Voice</span>
        </div>
        
        <p className="text-xs tracking-widest text-slate-400 uppercase font-bold mb-1">
          VoIP Real-time Call
        </p>
        
        {/* Caller Name Formatted Elegantly */}
        <h1 className="text-3xl font-black tracking-tight text-white font-display mb-1">
          {callerName}
        </h1>
        
        {/* Call Ringing status */}
        <p className="text-emerald-400 text-sm font-semibold tracking-wide flex items-center gap-1 animate-pulse">
          <Volume2 className="w-4 h-4 animate-bounce" /> Ringing...
        </p>
      </div>

      {/* Center Profile Avatar Section */}
      <div className="flex flex-col items-center justify-center z-10 my-auto">
        <div className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center shadow-[0_0_60px_rgba(18,140,126,0.35)] mb-6 p-1">
          <div className="w-full h-full rounded-full bg-[#071A24] flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-[#25D366] font-display">
              {callerName.substring(0, 1).toUpperCase()}
            </span>
          </div>
          {/* Pulsing micro indicator */}
          <span className="absolute bottom-1 right-2 w-5 h-5 bg-[#25D366] rounded-full border-2 border-[#071A24] flex items-center justify-center shadow-lg">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
          </span>
        </div>

        {/* Dynamic Payment Card Detail */}
        <div className="w-full max-w-sm bg-black/20 border border-white/5 rounded-3xl p-5 text-center shadow-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Incoming Payment Entry Detected
          </span>
          <h2 className="text-3xl font-extrabold text-[#25D366] font-sans tracking-tight mb-2">
            {formattedAmount}
          </h2>
          <div className="text-xs text-slate-300 font-sans space-y-1">
            <p>From: <strong className="text-white font-bold">{payment.clientName || 'Internet Client'}</strong></p>
            <p>Mode: <span className="bg-emerald-500/10 text-[#25D366] px-1.5 py-0.5 rounded font-mono font-bold uppercase">{payment.paymentMode || 'Real-time'}</span></p>
          </div>
        </div>
      </div>

      {/* Bottom Option and Call Action Buttons Section */}
      <div className="w-full max-w-xs mx-auto flex flex-col space-y-8 z-10 pb-4">
        {/* Circular Accept / Decline Buttons */}
        <div className="flex items-center justify-between px-6">
          {/* Decline Button (Red) */}
          <div className="flex flex-col items-center space-y-2">
            <button
              id="whatsapp-call-decline-button"
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-red-650 bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center text-white shadow-[0_10px_25px_rgba(220,38,38,0.4)] cursor-pointer"
              title="Decline Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-semibold text-slate-400 tracking-wider">Decline</span>
          </div>

          {/* Accept Button (Green) */}
          <div className="flex flex-col items-center space-y-2">
            <button
              id="whatsapp-call-accept-button"
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-[#25D366] active:scale-95 transition-all flex items-center justify-center text-white shadow-[0_10px_25px_rgba(37,211,102,0.4)] cursor-pointer animate-pulse"
              title="Accept Call"
            >
              <Phone className="w-7 h-7 animate-bounce" />
            </button>
            <span className="text-xs font-semibold text-slate-450 text-[#25D366] tracking-wider font-bold">Accept</span>
          </div>
        </div>

        {/* Security Warning Credit */}
        <p className="text-[9px] text-center text-slate-500 tracking-wide font-sans">
          Powered by apex ERP Secure Synchronization Services
        </p>
      </div>
    </div>
  );
}
