/**
 * Proffesional notification audio elements synthesizer and TTS announcer
 * Powered entirely by standard Web Audio API and Speech Synthesis API
 */

export interface SoundTone {
  id: string;
  name: string;
  description: string;
}

export const SOUND_TONES: SoundTone[] = [
  { id: 'crystal', name: '🔮 Crystal Cascade', description: 'Light, sparkling high-pitched glass notes phrase' },
  { id: 'pulse', name: '📱 Digital Pulse', description: 'Clean modern electronic ping and resonance' },
  { id: 'chime', name: '🔔 Ethereal Chime', description: 'A pleasant warm chime wash fading gently' },
  { id: 'classic_ring', name: '☎️ Classic Bell', description: 'Simulated telephone analog bell ringing pattern' },
  { id: 'epic_alert', name: '🎬 Epic Swell', description: 'Cinematic major chord swelling resonance' },
  { id: 'minimal_pop', name: '⚡ Minimal Blip', description: 'Fast, unobtrusive digital notification blip' },
  { id: 'zen_harp', name: '🧘 Arpeggio Harp', description: 'Tranquil rising acoustic harp arpeggio' },
  { id: 'vintage_synth', name: '👾 80s Electro', description: 'Retro-futuristic analog wave melodic line' }
];

export function playSoundTone(soundId: string) {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    
    // Master gain node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime;

    const playHarmonicNote = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(start);
      osc.stop(start + duration);
    };

    switch (soundId) {
      case 'crystal': {
        // Sequenced cascading chimes
        const notes = [1046.50, 1318.51, 1567.98, 2093.00]; // C6, E6, G6, C7
        notes.forEach((freq, idx) => {
          playHarmonicNote(freq, now + idx * 0.12, 0.8, 'sine');
          // Add a minor high triangle-wave harmonic for metallic sparkle
          playHarmonicNote(freq * 1.5, now + idx * 0.12 + 0.02, 0.4, 'triangle');
        });
        break;
      }

      case 'pulse': {
        // Modern tech doublet
        // Low ping then high, fast frequency sweep
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(293.66, now); // D4
        osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.08); // D5
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.2);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
        osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.22); // A6
        gain2.gain.setValueAtTime(0, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.4, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.5);
        break;
      }

      case 'chime': {
        // Rich warm ambient chime
        const fund = 523.25; // C5
        const partials = [1, 1.5, 2, 2.5, 3];
        partials.forEach((part, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(fund * part, now);
          gain.gain.setValueAtTime(0.25 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0 - (idx * 0.2));
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 2.0);
        });
        break;
      }

      case 'classic_ring': {
        // Combined double ring analog telephone
        const ringDuration = 0.4;
        const playRing = (delay: number) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = 'square';
          osc2.type = 'sine';
          
          osc1.frequency.setValueAtTime(853, now + delay);
          osc2.frequency.setValueAtTime(960, now + delay);
          
          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.05);
          // Modulate the volume to create "warble"
          for (let i = 0.05; i < ringDuration; i += 0.05) {
            gain.gain.setValueAtTime((i % 0.1 === 0) ? 0.2 : 0.05, now + delay + i);
          }
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + ringDuration);
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);
          
          osc1.start(now + delay);
          osc2.start(now + delay);
          
          osc1.stop(now + delay + ringDuration);
          osc2.stop(now + delay + ringDuration);
        };
        
        playRing(0);
        playRing(0.6);
        playRing(1.2);
        break;
      }

      case 'epic_alert': {
        // Orchestral swell major chord
        const freqs = [130.81, 196.00, 261.63, 329.63, 392.00, 523.25]; // C3, G3, C4, E4, G4, C5
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx < 2 ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(freq, now);
          
          // Slow swell (Attack)
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 2.5);
        });
        break;
      }

      case 'minimal_pop': {
        // Fast digital double blip
        playHarmonicNote(880.00, now, 0.08, 'triangle');
        playHarmonicNote(1200.00, now + 0.06, 0.12, 'sine');
        break;
      }

      case 'zen_harp': {
        // Beautiful tranquil rising harp phrase
        const notes = [329.63, 392.00, 493.88, 587.33, 659.25, 783.99]; // E4, G4, B4, D5, E5, G5
        notes.forEach((freq, idx) => {
          playHarmonicNote(freq, now + idx * 0.15, 1.8, 'sine');
          // triangle overlay to simulate guitar string strike pluck
          playHarmonicNote(freq, now + idx * 0.15, 0.15, 'triangle');
        });
        break;
      }

      case 'vintage_synth': {
        // Retro poly synth melodic line
        const melody = [
          { f: 440.00, d: 0.2 }, // A4
          { f: 523.25, d: 0.2 }, // C5
          { f: 659.25, d: 0.2 }, // E5
          { f: 587.33, d: 0.2 }, // D5
          { f: 659.25, d: 0.4 }, // E5
        ];
        let runningTime = 0;
        melody.forEach((note) => {
          playHarmonicNote(note.f, now + runningTime, note.d + 0.1, 'sawtooth');
          runningTime += note.d;
        });
        break;
      }

      default: {
        // Ultimate fallback default beep
        playHarmonicNote(880.00, now, 0.3, 'sine');
        break;
      }
    }
  } catch (err) {
    console.error("Web Audio synthesis failed, falling back safely:", err);
  }
}

export function playVoiceAnnouncement(template: string, vars: { amount: string, hotelName: string, paymentMode: string, date: string }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  let msg = template
    .replace(/{amount}/g, vars.amount)
    .replace(/{hotelName}/g, vars.hotelName)
    .replace(/{paymentMode}/g, vars.paymentMode)
    .replace(/{date}/g, vars.date);

  // Clean brackets and extra spaces
  msg = msg.replace(/{|}/g, '').trim();

  try {
    // Cancel currently queued announcements
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(msg);
    const voices = window.speechSynthesis.getVoices();
    // Prefer high quality english vocal synth
    const targetVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
    );
    if (targetVoice) {
      utterance.voice = targetVoice;
    }
    utterance.volume = 1.0;
    utterance.rate = 0.95; // professional paced flow

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Speech announcement synthesis failed:", err);
  }
}
