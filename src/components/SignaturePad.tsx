import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Edit3, Circle } from 'lucide-react';

interface SignaturePadProps {
  value: string;
  onChange: (val: string) => void;
}

export default function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  
  const [lineWidth, setLineWidth] = useState(2.5);
  const [color, setColor] = useState('#1e293b'); // slate-800

  // Standard high-DPI scaling helper
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set style parameters
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;

    // Optional: Draw a subtle baseline for signature reference
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(10, canvas.height - 35);
    ctx.lineTo(canvas.width - 10, canvas.height - 35);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
    
    // Restore primary properties
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
  };

  useEffect(() => {
    initCanvas();
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default scroll behaviors on touch
    if (e.cancelable) {
      e.preventDefault();
    }
    
    const coords = getCoordinates(e);
    if (!coords) return;

    isDrawing.current = true;
    lastX.current = coords.x;
    lastY.current = coords.y;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    
    if (e.cancelable) {
      e.preventDefault();
    }

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastX.current = coords.x;
    lastY.current = coords.y;
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    initCanvas();
    onChange('');
  };

  // Keep drawing parameters in sync with context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
      }
    }
  }, [lineWidth, color]);

  return (
    <div className="space-y-4" id="signature-pad-container">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stroke Width:</span>
          <div className="flex items-center gap-1.5">
            {[1.5, 2.5, 4.0].map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => setLineWidth(width)}
                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                  lineWidth === width
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Circle className="w-3 h-3" style={{ transform: `scale(${width / 2.5})` }} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Color:</span>
          <div className="flex items-center gap-1.5">
            {['#1e293b', '#0f172a', '#1d4ed8', '#047857'].map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setColor(hex)}
                className={`w-5 h-5 rounded-full border transition cursor-pointer flex items-center justify-center ${
                  color === hex ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-200'
                }`}
                style={{ backgroundColor: hex }}
                title={`Brush color ${hex}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative border border-slate-200 bg-slate-50/50 rounded-2xl overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className="w-full h-40 cursor-crosshair touch-none block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        <div className="absolute bottom-3 left-4 text-[9px] font-semibold text-slate-400/80 uppercase tracking-widest pointer-events-none select-none">
          Draw Signature Here
        </div>

        <button
          type="button"
          onClick={clearCanvas}
          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-rose-600 hover:text-rose-700 border border-slate-200 shadow-sm rounded-xl flex items-center justify-center gap-1.5 transition text-[10px] font-bold cursor-pointer"
          title="Clear Signature"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Canvas</span>
        </button>
      </div>
    </div>
  );
}
