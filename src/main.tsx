import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully intercept and suppress benign internal Firestore gRPC idle stream disconnection messages
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  const isBenignFirestoreMessage = (msg: string) => {
    return (
      msg.includes('Disconnecting idle stream') ||
      (msg.includes('stream') && msg.includes('CANCELLED') && msg.includes('targets')) ||
      msg.includes('GrpcConnection RPC') ||
      (msg.includes('@firebase/firestore') && msg.includes('Code: 1'))
    );
  };

  console.error = function (...args) {
    const message = args.map(arg => typeof arg === 'string' ? arg : (arg instanceof Error ? arg.message : String(arg))).join(' ');
    if (isBenignFirestoreMessage(message)) {
      console.log("[Firestore Silent Connection Recovery]: Swallowed benign stream idle timeout error.");
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = function (...args) {
    const message = args.map(arg => typeof arg === 'string' ? arg : (arg instanceof Error ? arg.message : String(arg))).join(' ');
    if (isBenignFirestoreMessage(message)) {
      console.log("[Firestore Silent Connection Recovery]: Swallowed benign stream idle timeout warning.");
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
