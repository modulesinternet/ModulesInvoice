import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Volume2, Shield, Headphones, UserCheck } from 'lucide-react';
import { Payment, BusinessSettings } from '../types';

interface AndroidIncomingCallScreenProps {
  payment: Partial<Payment>;
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
  const [isAccepted, setIsAccepted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [activeSpeechText, setActiveSpeechText] = useState('');

  // active connected call duration incrementer
  useEffect(() => {
    if (!isAccepted) return;
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isAccepted]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let ringInterval: any;
    let speakInterval: any;
    let vibrateInterval: any;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    let audioCtx: AudioContext | null = null;
    
    if (!isAccepted) {
      // 1. Vibration loop - mimics WhatsApp's long heavy vibrations
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([1200, 1000]);
        vibrateInterval = setInterval(() => {
          navigator.vibrate([1200, 1000]);
        }, 2200);
      }

      // 2. Synthesized VoIP Call Ringtone Loop
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

      // 3. Ringing Alert Prompt Speech
      const speakAnnouncement = () => {
        if (!window.speechSynthesis) return;
        try {
          window.speechSynthesis.cancel();
          const message = `Incoming secure payment alert. Tap the green button to answer.`;
          const utterance = new SpeechSynthesisUtterance(message);
          
          const voices = window.speechSynthesis.getVoices();
          const targetVoice = voices.find(v => 
            v.lang.startsWith('en') && 
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
          );
          if (targetVoice) utterance.voice = targetVoice;
          
          utterance.volume = 0.65;
          utterance.rate = 1.0;
          
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.error("TTS call screen synthesis failed:", e);
        }
      };

      speakAnnouncement();
      speakInterval = setInterval(speakAnnouncement, 8000);
    } else {
      // THE CALL HAS BEEN ACCEPTED: SPEAK FULL AGENT SPEECH SET IN SETTINGS MODULE
      const triggerSpeakingAgent = () => {
        if (!window.speechSynthesis) {
          // If no browser speech, fallback after short wait
          setActiveSpeechText("No Speech Synthesis Engine available. Transaction verified.");
          setTimeout(() => {
            onAccept();
          }, 3500);
          return;
        }

        try {
          window.speechSynthesis.cancel();
          
          const tmpl = settings?.voiceAnnounceTemplate || "Payment of ₹{amount} has been received from {hotelName} via {paymentMode}.";
          const formattedAmt = new Intl.NumberFormat('en-IN').format(payment.amount || 0);
          let textToSpeak = tmpl
            .replace(/{amount}/g, formattedAmt)
            .replace(/{hotelName}/g, payment.clientName || '')
            .replace(/{paymentMode}/g, payment.paymentMode || '')
            .replace(/{date}/g, new Date(payment.paymentDate || Date.now()).toLocaleDateString());
          
          textToSpeak = textToSpeak.replace(/{|}/g, '').trim();
          setActiveSpeechText(textToSpeak);

          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          
          const voices = window.speechSynthesis.getVoices();
          const targetVoice = voices.find(v => 
            v.lang.startsWith('en') && 
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
          );
          if (targetVoice) utterance.voice = targetVoice;
          
          utterance.volume = 1.0;
          utterance.rate = 0.95;

          utterance.onend = () => {
            console.log("Agent finished TTS speech presentation.");
            // Auto disconnect and transition to ledger screen after 2.5 seconds
            setTimeout(() => {
              onAccept();
            }, 2500);
          };

          utterance.onerror = (ttsErr) => {
            console.error("Agent speaking encounter issue:", ttsErr);
            setTimeout(() => {
              onAccept();
            }, 1000);
          };
          
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.error("Synthesizing accepted call text failed:", e);
          onAccept();
        }
      };

      // Trigger the accepted speech
      triggerSpeakingAgent();
    }

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
  }, [payment, settings, callerName, isAccepted]);

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(payment.amount || 0);

  // If call is connected, render the Connected Speaking Agent interface
  if (isAccepted) {
    return (
      <div 
        id="whatsapp-call-active-screen"
        className="fixed inset-0 bg-[#071F1D] text-white z-[99999] flex flex-col justify-between py-16 px-6 font-sans no-print select-none overflow-hidden"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes voice-wave-bounce {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
          }
          .animate-wave-1 { animation: voice-wave-bounce 0.8s ease-in-out infinite 0.1s; }
          .animate-wave-2 { animation: voice-wave-bounce 0.8s ease-in-out infinite 0.3s; }
          .animate-wave-3 { animation: voice-wave-bounce 0.8s ease-in-out infinite 0.5s; }
          .animate-wave-4 { animation: voice-wave-bounce 0.8s ease-in-out infinite 0.2s; }
          .animate-wave-5 { animation: voice-wave-bounce 0.8s ease-in-out infinite 0.4s; }
          .animate-wave-6 { animation: voice-wave-bounce 0.8s ease-in-out infinite 0.15s; }
        ` }} />

        {/* Ambient background waves */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <span className="absolute w-[300px] h-[300px] bg-[#128C7E]/10 rounded-full animate-pulse"></span>
          <span className="absolute w-[500px] h-[500px] bg-[#128C7E]/5 rounded-full animate-pulse delay-500"></span>
        </div>

        {/* Top Header */}
        <div className="w-full flex flex-col items-center pt-4 text-center z-10">
          <div className="flex items-center gap-1.5 bg-[#128C7E]/10 text-[#25D366] px-3.5 py-1.5 rounded-full border border-[#128C7E]/25 mb-8 animate-pulse text-[10px] font-bold tracking-widest uppercase">
            <UserCheck className="w-3.5 h-3.5" />
            <span>VoIP REAL-TIME CONNECTED</span>
          </div>
          
          <p className="text-xs tracking-widest text-[#25D366] uppercase font-bold mb-1 font-mono">
            Interactive Voice Response (IVR) Agent
          </p>
          
          <h1 className="text-3xl font-black tracking-tight text-white font-display mb-1">
            {callerName}
          </h1>
          
          {/* Active Call Timer */}
          <p className="text-emerald-400 font-mono text-sm tracking-widest font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-ping"></span>
            {formatDuration(seconds)}
          </p>
        </div>

        {/* Dynamic Voice Waves & Subtitles in the middle */}
        <div className="flex flex-col items-center justify-center z-10 my-auto w-full max-w-md mx-auto px-4">
          
          {/* Custom pulsing waveform lines */}
          <div className="flex items-center justify-center gap-2 h-20 mb-10 w-full">
            <span className="w-2 bg-[#25D366] rounded-full h-8 transform origin-center animate-wave-1"></span>
            <span className="w-2 bg-[#25D366] rounded-full h-16 transform origin-center animate-wave-2"></span>
            <span className="w-2 bg-[#25D366] rounded-full h-20 transform origin-center animate-wave-3"></span>
            <span className="w-2 bg-[#25D366] rounded-full h-12 transform origin-center animate-wave-4"></span>
            <span className="w-2 bg-[#25D366] rounded-full h-18 transform origin-center animate-wave-5"></span>
            <span className="w-2 bg-[#25D366] rounded-full h-10 transform origin-center animate-wave-6"></span>
          </div>

          {/* Subtitles Transcript Panel */}
          <div className="w-full bg-black/35 border border-white/5 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 mb-3">
              <Headphones className="w-4 h-4 text-[#25D366] animate-bounce" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block font-mono">
                TTS AI Speaking Live Broadcast...
              </span>
            </div>
            
            <p className="text-sm md:text-[15px] font-semibold text-slate-100 leading-relaxed font-sans text-left speak-transcript bg-black/10 py-1 rounded">
              "{activeSpeechText || 'Initializing Agent Voice Synthesizer...'}"
            </p>
          </div>
        </div>

        {/* Action Button Section with circular call decline */}
        <div className="w-full max-w-xs mx-auto flex flex-col space-y-4 z-10 pb-4">
          <div className="flex flex-col items-center space-y-2">
            <button
              id="whatsapp-call-disconnect-button"
              onClick={onAccept} // Triggers normal accept/dismiss ledger transition immediately
              className="w-16 h-16 rounded-full bg-red-650 bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center text-white shadow-[0_10px_25px_rgba(220,38,38,0.4)] cursor-pointer"
              title="End Voice Broadcast"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-semibold text-slate-400 tracking-wider">End Announcement</span>
          </div>
        </div>
      </div>
    );
  }

  // Standard Ringing call screen
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
        
        <p className="text-xs tracking-widest text-slate-400 uppercase font-bold mb-1 font-mono">
          VoIP Real-time Call
        </p>
        
        {/* Caller Name Formatted Elegantly */}
        <h1 className="text-3xl font-black tracking-tight text-white font-display mb-1">
          {callerName}
        </h1>
        
        {/* Call Ringing status */}
        <p className="text-[#25D366] text-sm font-semibold tracking-wide flex items-center gap-1.5 animate-pulse">
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
              onClick={() => setIsAccepted(true)}
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
