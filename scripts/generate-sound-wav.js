import fs from 'fs';
import path from 'path';

function generateWav() {
  const rawDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res', 'raw');
  
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
    console.log("Created directory:", rawDir);
  }

  const sampleRate = 8000;
  const duration = 0.6; // 0.6 seconds
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples; // 8-bit mono = 1 byte per sample
  const chunkSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1size
  buffer.writeUInt16LE(1, 20);  // audioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22);  // numChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // sampleRate
  buffer.writeUInt32LE(sampleRate, 28); // byteRate (sampleRate * numChannels * bitsPerSample/8)
  buffer.writeUInt16LE(1, 32);  // blockAlign
  buffer.writeUInt16LE(8, 34);  // bitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate a beautiful alternating chime beep (sinusoidal frequency envelope)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Frequency sweeps from high 1200hz down to 800hz over duration (like a sleek alert chime)
    const freq = 1200 - (400 * (t / duration));
    const angle = 2 * Math.PI * freq * t;
    
    // Decay envelope to make it sound smooth (prevents pops or clicking)
    const envelope = Math.max(0, 1 - (t / duration));
    const val = Math.floor(128 + 127 * Math.sin(angle) * envelope * 0.8);
    
    buffer.writeUInt8(Math.max(0, Math.min(255, val)), 44 + i);
  }

  const destPath = path.join(rawDir, 'custom_sound.wav');
  fs.writeFileSync(destPath, buffer);
  console.log(`Successfully generated premium custom alert sound at: ${destPath} (Size: ${buffer.length} bytes)`);
}

generateWav();
