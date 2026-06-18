import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Check,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { Payment, Client, Invoice, formatDisplayDate } from '../types';
import Pagination from './Pagination';

interface PaymentsModuleProps {
  payments: Payment[];
  clients: Client[];
  invoices: Invoice[];
  onAddPayment: (p: Partial<Payment>) => Promise<void>;
  onUpdatePayment?: (id: string, p: Partial<Payment>) => Promise<void>;
  onDeletePayment?: (id: string) => Promise<void>;
  canWrite?: boolean;
  businessSettings?: any;
}

export default function PaymentsModule({
  payments,
  clients,
  invoices,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  canWrite = true,
  businessSettings
}: PaymentsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = new Date(a.paymentDate).getTime();
    const dateB = new Date(b.paymentDate).getTime();
    if (dateA !== dateB) return dateB - dateA;
    // Break ties with id/createdAt
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.id.localeCompare(a.id);
  });

  const filteredPayments = sortedPayments.filter(p => 
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.referenceNum && p.referenceNum.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // New payment form fields
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'UPI/Bank Transfer' | 'Cash'>('UPI/Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('Payment matched and credited instantly.');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(businessSettings?.currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: businessSettings?.currency || 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Find valid unpaid invoices for selected client to populate invoice dropdown
  // Wait, when editing, we want to ALSO include the currently selected invoice, even if it is fully paid/settled by this payment!
  const filteredInvoices = invoices.filter(inv => 
    inv.clientId === clientId && 
    (inv.status === 'unpaid' || inv.status === 'partially_paid' || (editingPayment && inv.id === editingPayment.invoiceId))
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
      // If editing this payment, set amount defaults based on current edit balance
      if (editingPayment && chosen.id === editingPayment.invoiceId) {
        setAmount(String(chosen.dueAmount + editingPayment.amount));
      } else {
        setAmount(String(chosen.dueAmount));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
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

    setIsSaving(true);
    try {
      const payload: Partial<Payment> = {
        clientId,
        clientName: clientObj.name,
        invoiceId,
        invoiceNumber: invoiceObj.invoiceNumber,
        amount: Number(amount),
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMode: mode,
        referenceNum: referenceNumber,
        remarks: notes
      };

      await onAddPayment(payload);
      setIsModalOpen(false);
      setCurrentPage(1);

      // Reset values
      setClientId('');
      setInvoiceId('');
      setAmount('');
      setReferenceNumber('');
      setNotes('Payment matched and credited instantly.');
      setPaymentDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while creating the payment receipt.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!editingPayment) return;

    if (!clientId || !invoiceId || Number(amount) <= 0 || !referenceNumber) {
      alert("Please ensure client, invoice, valid positive amount, and reference code or UPI ref is specified.");
      return;
    }

    const clientObj = clients.find(c => c.id === clientId)!;
    const invoiceObj = invoices.find(inv => inv.id === invoiceId)!;

    // Check balance limit
    const allowableBalance = invoiceObj.dueAmount + (invoiceObj.id === editingPayment.invoiceId ? editingPayment.amount : 0);
    if (Number(amount) > allowableBalance) {
      alert(`Warning: The specified payment amount ${formatCurrency(Number(amount))} exceeds this invoice's maximum available remaining balance of ${formatCurrency(allowableBalance)}.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Payment> = {
        clientId,
        clientName: clientObj.name,
        invoiceId,
        invoiceNumber: invoiceObj.invoiceNumber,
        amount: Number(amount),
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMode: mode,
        referenceNum: referenceNumber,
        remarks: notes
      };

      if (onUpdatePayment) {
        await onUpdatePayment(editingPayment.id, payload);
      }
      setEditingPayment(null);

      // Reset values
      setClientId('');
      setInvoiceId('');
      setAmount('');
      setReferenceNumber('');
      setNotes('Payment matched and credited instantly.');
      setPaymentDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while updating the payment details.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditPayment = (p: Payment) => {
    setEditingPayment(p);
    setClientId(p.clientId);
    setInvoiceId(p.invoiceId);
    setAmount(String(p.amount));
    setMode(p.paymentMode as any);
    setReferenceNumber(p.referenceNum);
    setNotes(p.remarks || '');
    setPaymentDate(p.paymentDate ? p.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
  };

  const handleDeletePayment = async (p: Payment) => {
    if (window.confirm(`Are you sure you want to void and delete the payment of INR ${p.amount} from ${p.clientName}?`)) {
      if (onDeletePayment) {
        await onDeletePayment(p.id);
      }
    }
  };

  const getModeBadge = (m: string) => {
    switch (m) {
      case 'UPI/Bank Transfer':
      case 'UPI':
      case 'Bank Transfer': 
        return 'bg-purple-100 text-purple-705 border-purple-200';
      case 'Cash': 
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: 
        return 'bg-slate-100 text-slate-705 border-slate-200';
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="payments-metric-strip">
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">UPI &amp; Bank Transfer Receipts</span>
            <h3 className="text-xl font-bold text-emerald-950 font-mono">
              {formatCurrency(payments.filter(p => p.paymentMode === 'UPI/Bank Transfer' || p.paymentMode === 'UPI' || p.paymentMode === 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0))}
            </h3>
          </div>
          <div className="p-2 rounded-xl bg-white text-emerald-600 border border-emerald-200/50">
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
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
              <th className="py-3 px-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/5 transition">
                <td className="py-4 px-5 text-slate-500 font-mono">{formatDisplayDate(p.paymentDate)}</td>
                <td className="py-4 px-5 font-mono font-bold text-slate-900">{p.referenceNum}</td>
                <td className="py-4 px-5 font-semibold text-slate-700">{p.clientName}</td>
                <td className="py-4 px-5 text-indigo-700 font-semibold">{p.invoiceNumber}</td>
                <td className="py-4 px-5">
                  <span className={`px-2 py-0.5 rounded border text-[10.5px] font-bold uppercase ${getModeBadge(p.paymentMode)}`}>
                    {p.paymentMode}
                  </span>
                </td>
                <td className="py-4 px-5 text-right font-mono font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                <td className="py-4 px-5 text-slate-400 italic font-medium">
                  <div>{p.remarks}</div>
                  {((p as any).createdBy || (p as any).updatedBy) && (
                    <div className="text-[9px] text-slate-500 not-italic mt-1 font-sans font-semibold tracking-tight">
                      {(p as any).createdBy && <span>Recorded by: {(p as any).createdBy}</span>}
                      {(p as any).updatedBy && <span className="ml-1 text-slate-400">({(p as any).updatedBy} edited)</span>}
                    </div>
                  )}
                </td>
                <td className="py-4 px-5 text-center">
                  {canWrite ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => startEditPayment(p)}
                        className="p-1 px-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Modify Payment"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePayment(p)}
                        className="p-1 px-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Delete Payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-350">-</span>
                  )}
                </td>
              </tr>
            ))}

            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">No transaction logs recorded under database pipeline.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredPayments.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
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
                    <option value="UPI/Bank Transfer">UPI / Bank Transfer</option>
                    <option value="Cash">Cash Registry</option>
                  </select>
                </div>
              </div>

              {/* Payment Date and Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Payment Date *</label>
                  <input 
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 bg-white"
                  />
                </div>
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
                  disabled={isSaving}
                  className="gradient-btn px-5 py-2 text-xs font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    'Approve Ledger Credit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-[#E5E7EB] shadow-xl">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Modify Client Receipt</h3>
              </div>
              <button onClick={() => setEditingPayment(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white transition" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Select client (read-only for security & accounting consistency) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Target Client</label>
                <div className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700">
                  {editingPayment.clientName}
                </div>
              </div>

              {/* Select Invoice (read-only for credit-matching log logic) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Settled Bill Invoice</label>
                <div className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700">
                  {editingPayment.invoiceNumber}
                </div>
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
                    <option value="UPI/Bank Transfer">UPI / Bank Transfer</option>
                    <option value="Cash">Cash Registry</option>
                  </select>
                </div>
              </div>

              {/* Payment Date and Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Payment Date *</label>
                  <input 
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 bg-white"
                  />
                </div>
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
                    {formatCurrency(Math.max(0, (selectedInvoiceObj.dueAmount + editingPayment.amount) - Number(amount || 0)))}
                  </b>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="gradient-btn px-5 py-2 text-xs font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Credit Edits'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
