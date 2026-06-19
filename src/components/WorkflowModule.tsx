import React, { useState } from 'react';
import { 
  PhoneCall, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Zap, 
  GitMerge, 
  TrendingUp, 
  History, 
  User, 
  DollarSign, 
  Phone,
  BarChart2
} from 'lucide-react';
import { ActivityLog, Payment } from '../types';

interface WorkflowModuleProps {
  logs: ActivityLog[];
  payments: Payment[];
  onTriggerDemoCall: (payment: Partial<Payment>) => void;
  canWrite: boolean;
}

export default function WorkflowModule({
  logs,
  payments,
  onTriggerDemoCall,
  canWrite
}: WorkflowModuleProps) {
  const [demoAmount, setDemoAmount] = useState('18400');
  const [demoClient, setDemoClient] = useState('Gateway Inn & Suites');
  const [demoMode, setDemoMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('UPI');

  // Filter call workflow events from the general logs
  const workflowLogs = logs.filter(log => 
    log.action === 'CALL_TRIGGERED' || 
    log.action === 'CALL_ACCEPTED' || 
    log.action === 'CALL_DECLINED' ||
    log.action.includes('CALL_')
  );

  // Compute calling statistics
  const totalCalls = workflowLogs.filter(l => l.action === 'CALL_TRIGGERED').length;
  const acceptedCalls = workflowLogs.filter(l => l.action === 'CALL_ACCEPTED').length;
  const declinedCalls = workflowLogs.filter(l => l.action === 'CALL_DECLINED').length;
  const missedCalls = Math.max(0, totalCalls - (acceptedCalls + declinedCalls));

  const acceptRate = totalCalls > 0 ? Math.round((acceptedCalls / totalCalls) * 100) : 100;
  const declineRate = totalCalls > 0 ? Math.round((declinedCalls / totalCalls) * 100) : 0;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoAmount || !demoClient) return;
    
    const mockPayment: Partial<Payment> = {
      id: `p-demo-${Date.now()}`,
      amount: parseFloat(demoAmount) || 12500,
      clientName: demoClient.trim(),
      paymentMode: demoMode,
      paymentDate: new Date().toISOString(),
      referenceNum: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      remarks: 'Simulated trial test trigger via Central App Workflow Studio'
    };

    onTriggerDemoCall(mockPayment);
  };

  return (
    <div id="workflow-module-root" className="space-y-6">
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#5B21FF] to-[#8C62FF] text-white p-6 rounded-3xl shadow-lg">
        <div>
          <span className="text-xs bg-white/20 text-white font-bold tracking-widest px-3 py-1 rounded-full uppercase">
            iModules Realtime Pipeline
          </span>
          <h1 className="text-2xl font-black font-display tracking-tight mt-2.5">
            Real-time VoIP & Enterprise Calling Workflow
          </h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-xl">
            Automatically triggers full-screen VoIP ringing call overlay and TTS announcements inside the Android APK whenever a client payment registers.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 p-3.5 rounded-2xl border border-white/10 shrink-0">
          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          <p className="text-xs font-mono font-bold">API Synchronization Node Online</p>
        </div>
      </div>

      {/* Grid of Calling Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#5B21FF]">
            <PhoneCall className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Calls</p>
            <h3 className="text-xl font-black text-slate-800">{totalCalls}</h3>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Accepted</p>
            <h3 className="text-xl font-black text-emerald-600">{acceptedCalls} <span className="text-xs font-medium text-slate-400 font-mono">({acceptRate}%)</span></h3>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Declined</p>
            <h3 className="text-xl font-black text-rose-600">{declinedCalls} <span className="text-xs font-medium text-slate-400 font-mono">({declineRate}%)</span></h3>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Missed / Ignored</p>
            <h3 className="text-xl font-black text-amber-600">{missedCalls}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Trigger Simulation Panel (Dashboard call trigger!) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 text-sm tracking-tight">Manual Call Trigger Simulator</h2>
            </div>
            
            <p className="text-xs text-slate-450 leading-relaxed text-slate-500 mb-5">
              Force an instant VoIP incoming call screen broadcast with specialized text-to-speech reading on your connected Android APK immediately.
            </p>

            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                  Client / Hotel Name
                </label>
                <input
                  type="text"
                  required
                  value={demoClient}
                  onChange={(e) => setDemoClient(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5B21FF] focus:bg-white text-slate-800"
                  placeholder="e.g. Gateway Inn & Suites"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={demoAmount}
                  onChange={(e) => setDemoAmount(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5B21FF] focus:bg-white text-slate-800 font-mono"
                  placeholder="e.g. 15000"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                  Payment Gateway/Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Cash', 'Bank Transfer'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDemoMode(m)}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition ${
                        demoMode === m
                          ? 'border-[#5B21FF] bg-[#F3F0FF] text-[#5B21FF]'
                          : 'border-[#E5E7EB] bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canWrite}
                className="w-full py-3 bg-[#5B21FF] hover:bg-[#4a16e0] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>Trigger Ringing VoIP Call Screen</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2.5 text-[10px] text-slate-400">
            <AlertCircle className="w-3.5 h-3.5 text-[#5B21FF]" />
            <span>Updates local-db-cache automatically</span>
          </div>
        </div>

        {/* Accept/Decline History List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 text-sm tracking-tight">Accept & Decline History</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {workflowLogs.length} activity row(s)
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            History log tracing the operator's call interaction choices. Real-time updates push live from Android APK responses.
          </p>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {workflowLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-350 mb-3">
                  <GitMerge className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-400">No calls registered yet</p>
                <p className="text-[10px] text-slate-350 max-w-xs mt-1">
                  Create a payment value or use the simulator panel to view real-time log results.
                </p>
              </div>
            ) : (
              workflowLogs.map((log) => {
                let badgeClass = 'bg-slate-100 text-slate-650';
                let Icon = PhoneCall;
                let borderCol = 'border-slate-150';

                if (log.action === 'CALL_ACCEPTED') {
                  badgeClass = 'bg-emerald-50 text-emerald-650 font-bold border border-emerald-100';
                  Icon = CheckCircle;
                  borderCol = 'border-emerald-100';
                } else if (log.action === 'CALL_DECLINED') {
                  badgeClass = 'bg-rose-50 text-rose-620 font-bold border border-rose-100';
                  Icon = XCircle;
                  borderCol = 'border-rose-100';
                } else if (log.action === 'CALL_TRIGGERED') {
                  badgeClass = 'bg-indigo-50 text-[#5B21FF] font-bold border border-indigo-100';
                  Icon = PhoneCall;
                  borderCol = 'border-indigo-100';
                }

                return (
                  <div 
                    key={log.id} 
                    className={`p-4 rounded-xl border ${borderCol} bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <Icon className={`w-4 h-4 ${
                          log.action === 'CALL_ACCEPTED' ? 'text-emerald-500' : 
                          log.action === 'CALL_DECLINED' ? 'text-rose-500' : 'text-[#5B21FF]'
                        }`} />
                      </div>
                      <div>
                        <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {log.action.replace('CALL_', '')}
                        </span>
                        <p className="text-xs font-semibold text-slate-700 mt-2">
                          {log.details}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2 font-mono">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {log.userName}
                          </span>
                          <span>|</span>
                          <span>
                            {new Date(log.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
