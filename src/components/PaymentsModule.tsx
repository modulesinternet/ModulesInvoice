import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Check,
  X
} from 'lucide-react';
import { Payment, Client, Invoice } from '../types';

interface PaymentsModuleProps {
  payments: Payment[];
  clients: Client[];
  invoices: Invoice[];
  onAddPayment: (p: Partial<Payment>) => Promise<void>;
  canWrite?: boolean;
}

export default function PaymentsModule({
  payments,
  clients,
  invoices,
  onAddPayment,
  canWrite = true
}: PaymentsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New payment form fields
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('Payment matched and credited instantly.');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Find valid unpaid invoices for selected client to populate invoice dropdown
  const filteredInvoices = invoices.filter(inv => 
    inv.clientId === clientId && (inv.status === 'unpaid' || inv.status === 'partially_paid')
  );

  const selectedInvoiceObj = invoices.find(inv => inv.id === invoiceId);

  const handleClientChange = (cId: string) => {
    setClientId(cId);
    setInvoiceId('');
    setAmount('');
  };

  const handleInvoiceChange = (invId: string) => {
    setInvoiceId(invId);
    const chosen = invoices.find(inv => inv.id === invId);
    if (chosen) {
      setAmount(String(chosen.dueAmount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !invoiceId || Number(amount) <= 0 || !referenceNumber) {
      alert("Please ensure client, invoice, valid positive amount, and reference code or UPI ref is specified.");
      return;
    }

    const clientObj = clients.find(c => c.id === clientId)!;
    const invoiceObj = invoices.find(inv => inv.id === invoiceId)!;

    if (Number(amount) > invoiceObj.dueAmount) {
      alert(`Warning: The specified payment amount ${formatCurrency(Number(amount))} exceeds this invoice's remaining due balance ${formatCurrency(invoiceObj.dueAmount)}.`);
      return;
    }

    const payload: Partial<Payment> = {
      clientId,
      clientName: clientObj.name,
      invoiceId,
      invoiceNumber: invoiceObj.invoiceNumber,
      amount: Number(amount),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: mode,
      referenceNum: referenceNumber,
      remarks: notes
    };

    await onAddPayment(payload);
    setIsModalOpen(false);

    // Reset values
    setClientId('');
    setInvoiceId('');
    setAmount('');
    setReferenceNumber('');
    setNotes('Payment matched and credited instantly.');
  };

  const getModeBadge = (m: string) => {
    switch (m) {
      case 'UPI': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Bank Transfer': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Cash': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6" id="payments-module-container">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Payments</h1>
          <p className="text-sm text-slate-500">Record cash / bank deposits and settle client outstandings instantly.</p>
        </div>
        {canWrite && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="gradient-btn px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
            id="record-receipt-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Record Client Payment</span>
          </button>
        )}
      </div>

      {/* QUICK TOTALS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="payments-metric-strip">
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">UPI &amp; Digital Settle</span>
            <h3 className="text-xl font-bold text-emerald-950 font-mono">
              {formatCurrency(payments.filter(p => p.paymentMode === 'UPI').reduce((sum, p) => sum + p.amount, 0))}
            </h3>
          </div>
          <div className="p-2 rounded-xl bg-white text-emerald-600 border border-emerald-200/50">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">NEFT / RTGS Transfers</span>
            <h3 className="text-xl font-bold text-indigo-950 font-mono">
              {formatCurrency(payments.filter(p => p.paymentMode === 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0))}
            </h3>
          </div>
          <div className="p-2 rounded-xl bg-white text-indigo-600 border border-indigo-200/50">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Physical Cash Registry</span>
            <h3 className="text-xl font-bold text-slate-900 font-mono">
              {formatCurrency(payments.filter(p => p.paymentMode === 'Cash').reduce((sum, p) => sum + p.amount, 0))}
            </h3>
          </div>
          <div className="p-2 rounded-xl bg-white text-slate-600 border border-slate-200">
            <Check className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SEARCH AND TRANSACTION LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text"
              placeholder="Search reference or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              id="payment-search"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">Reconciled lines: <b className="text-slate-800">{payments.length}</b></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB]">
                <th className="py-3 px-5">Reconciliation Date</th>
                <th className="py-3 px-5">UPI / bank Reference ID</th>
                <th className="py-3 px-5">Corporate Partner</th>
                <th className="py-3 px-5"> Settled Invoice</th>
                <th className="py-3 px-5">Channel Mode</th>
                <th className="py-3 px-5 text-right">Receipt Value</th>
                <th className="py-3 px-5">Notes / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {payments.filter(p => p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || (p.referenceNum && p.referenceNum.toLowerCase().includes(searchTerm.toLowerCase()))).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/5 transition">
                  <td className="py-4 px-5 text-slate-500 font-mono">{p.paymentDate}</td>
                  <td className="py-4 px-5 font-mono font-bold text-slate-900">{p.referenceNum}</td>
                  <td className="py-4 px-5 font-semibold text-slate-700">{p.clientName}</td>
                  <td className="py-4 px-5 text-indigo-700 font-semibold">{p.invoiceNumber}</td>
                  <td className="py-4 px-5">
                    <span className={`px-2 py-0.5 rounded border text-[10.5px] font-bold uppercase ${getModeBadge(p.paymentMode)}`}>
                      {p.paymentMode}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right font-mono font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                  <td className="py-4 px-5 text-slate-400 italic font-medium">{p.remarks}</td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">No transaction logs recorded under database pipeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-[#E5E7EB] shadow-xl">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Log Client Receipt</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white transition" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Select client */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Target Client *</label>
                <select 
                  required
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="">-- Choose Corporate Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Outstanding: ₹{(c.outstandingBalance/1000).toFixed(1)}k)</option>
                  ))}
                </select>
              </div>

              {/* Select Invoice */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Linked Pending Invoice *</label>
                <select 
                  required
                  disabled={!clientId}
                  value={invoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 disabled:opacity-55"
                >
                  <option value="">-- Choose Invoice Code --</option>
                  {filteredInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} (Pending Bill: ₹{(inv.dueAmount/1000).toFixed(1)}k)</option>
                  ))}
                </select>
              </div>

              {/* Amount and Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Deposit Amount (INR) *</label>
                  <input 
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Settlement Channel *</label>
                  <select 
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="UPI">BHIM UPI</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                    <option value="Cash">Cash Registry</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Reference Code / Bank ID *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. TXN991209120 or UPI RRN code..."
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Ledger Remarks</label>
                <input 
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              {selectedInvoiceObj && (
                <div className="p-3 bg-indigo-50 text-[11px] text-indigo-800 rounded-xl italic">
                  Remaining unpaid balance after this receipt: 
                  <b className="font-mono ml-1 text-slate-800">
                    {formatCurrency(Math.max(0, selectedInvoiceObj.dueAmount - Number(amount || 0)))}
                  </b>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="gradient-btn px-5 py-2 text-xs font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Approve Ledger Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
