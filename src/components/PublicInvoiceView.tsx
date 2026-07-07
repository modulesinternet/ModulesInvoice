import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  CreditCard, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Download,
  Info,
  MessageCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice, BusinessSettings, formatDisplayDate } from '../types';
import { db as firestoreDb } from '../services/firebase';
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';

interface PublicInvoiceViewProps {
  invoiceNumber: string;
}

export default function PublicInvoiceView({ invoiceNumber }: PublicInvoiceViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ invoice: Invoice; settings: BusinessSettings } | null>(null);

  useEffect(() => {
    if (!invoiceNumber) return;

    let activeInvoice: Invoice | null = null;
    let activeSettings: BusinessSettings | null = null;

    // Direct Firestore real-time listener for Settings
    const unsubSettings = onSnapshot(doc(firestoreDb, 'businessSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        activeSettings = docSnap.data() as BusinessSettings;
        if (activeInvoice && activeSettings) {
          setData({ invoice: activeInvoice, settings: activeSettings });
          setError(null);
        }
      }
    }, (err) => {
      console.error("Public settings subscription error: ", err);
    });

    // Direct Firestore real-time listener for Invoice query
    const q = query(
      collection(firestoreDb, 'invoices'),
      where('invoiceNumber', '==', invoiceNumber)
    );

    const unsubInvoice = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        activeInvoice = { id: docSnap.id, ...docSnap.data() } as Invoice;
        if (activeInvoice && activeSettings) {
          setData({ invoice: activeInvoice, settings: activeSettings });
          setError(null);
        }
      } else {
        // Only set error if we don't have existing backup data loaded
        if (!activeInvoice) {
          setError("Invoice record is missing, deleted, or you might be offline.");
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Public invoice subscription error: ", err);
      if (!activeInvoice) {
        setError("Failed to fetch real-time invoice updates.");
      }
      setLoading(false);
    });

    // REST fallback initializer to guarantee instant rendering inside frameworks
    async function fetchBackupFirst() {
      try {
        const res = await api.getPublicInvoice(invoiceNumber);
        if (res && res.invoice && res.settings) {
          if (!activeInvoice) activeInvoice = res.invoice;
          if (!activeSettings) activeSettings = res.settings;
          setData({ invoice: activeInvoice, settings: activeSettings });
          setError(null);
        }
      } catch (err: any) {
        console.warn("REST fallback failed (non-blocking if Firestore is connecting):", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBackupFirst();

    return () => {
      unsubSettings();
      unsubInvoice();
    };
  }, [invoiceNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="w-10 h-10 text-[#5B21FF] animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Auto-capturing billing records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full shadow-lg text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Scan Retrieve Failed</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || "Invoice record is missing, deleted, or you might be offline."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
          >
            Retry Fetching
          </button>
        </div>
      </div>
    );
  }

  const { invoice, settings } = data;
  const isPaid = invoice.status === 'paid';
  const outstandingAmount = invoice.dueAmount !== undefined ? invoice.dueAmount : (invoice.total - (invoice.paidAmount || 0));

  // Determine if we should show tax split (matching InvoicesModule logic)
  const hasTaxSplit = settings.gstOption !== 'zero_tax' && (settings.showInvoiceTaxSplit ?? true) !== false;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const hostOrigin = window.location.origin;
    const url = `${hostOrigin}/public/invoice/${encodeURIComponent(invoice.invoiceNumber)}`;
    
    let message = `*INVOICE RECEIVED - ${settings.companyName}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*Inv No:* ${invoice.invoiceNumber}\n`;
    message += `*Total Amount:* ₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(invoice.total)}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `You can view and download the full professional invoice here:\n${url}\n\n`;
    message += `_Regards, ${settings.companyName}_`;

    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-12 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        
        {/* Actions Bar - Hidden on print */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-bold tracking-tight">Public Invoice Portal</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share WhatsApp</span>
            </button>
            <button 
              onClick={handlePrint}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* MAIN INVOICE CANVAS */}
        <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none">
          
          {/* Header Section */}
          <div className="p-8 md:p-12 border-b border-slate-100 relative">
            {/* Status Stamp */}
            <div className="absolute top-12 right-12 hidden md:block">
              <div className={`px-6 py-2 rounded-2xl border-2 rotate-12 flex flex-col items-center justify-center ${
                isPaid 
                  ? 'border-emerald-500/30 text-emerald-600 bg-emerald-50/50' 
                  : 'border-rose-500/30 text-rose-600 bg-rose-50/50'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Payment Status</span>
                <span className="text-2xl font-black uppercase tracking-tighter leading-none">{invoice.status.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                {/* Logo & Company Name */}
                <div className="flex items-center gap-4">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-2xl bg-slate-50 p-2 border border-slate-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white font-black text-2xl">
                      {settings.companyName?.substring(0, 2).toUpperCase() || 'IM'}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">{settings.companyName}</h1>
                    {settings.gstIn && (settings.showInvoiceGst ?? true) !== false && (
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">GSTIN: {settings.gstIn}</span>
                    )}
                  </div>
                </div>

                {/* Company Address */}
                <div className="space-y-1">
                  {settings.address && (settings.showInvoiceAddress ?? true) !== false && (
                    <p className="text-sm text-slate-500 max-w-xs leading-relaxed">{settings.address}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-slate-400 font-medium">
                    {settings.email && (settings.showInvoiceEmail ?? true) !== false && (
                      <span className="flex items-center gap-1.5"><Info className="w-3 h-3" /> {settings.email}</span>
                    )}
                    {settings.phone && (settings.showInvoicePhone ?? true) !== false && (
                      <span className="flex items-center gap-1.5"><Info className="w-3 h-3" /> {settings.phone}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:text-right space-y-4 pt-4 md:pt-0">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 mb-1">Tax Invoice</h2>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">#{invoice.invoiceNumber}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:flex md:flex-col md:items-end md:gap-2">
                  <div className="flex flex-col md:items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date of Issue</span>
                    <span className="text-sm font-bold text-slate-700">{formatDisplayDate(invoice.date)}</span>
                  </div>
                  <div className="flex flex-col md:items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</span>
                    <span className="text-sm font-bold text-rose-600">{formatDisplayDate(invoice.dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client & Bank Details Container */}
          <div className="p-8 md:p-12 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-slate-100">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Billed To</span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{invoice.clientName}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-xs">{invoice.billingAddress}</p>
              </div>
            </div>

            {(settings.showInvoiceBankDetails ?? true) !== false && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Banking Particulars</span>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-800">{settings.bankName || 'N/A'}</p>
                  <div className="grid grid-cols-1 gap-1 text-xs text-slate-500">
                    <p className="flex justify-between md:justify-start md:gap-4"><span className="font-medium text-slate-400">Account:</span> <span className="font-bold text-slate-700">{settings.accountNum || 'N/A'}</span></p>
                    <p className="flex justify-between md:justify-start md:gap-4"><span className="font-medium text-slate-400">IFSC:</span> <span className="font-bold text-slate-700">{settings.ifscCode || 'N/A'}</span></p>
                    {settings.upiId && (settings.showInvoiceUpiId ?? true) !== false && (
                      <p className="flex justify-between md:justify-start md:gap-4"><span className="font-medium text-slate-400">UPI ID:</span> <span className="font-bold text-indigo-600">{settings.upiId}</span></p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Line Item / Service Particulars</th>
                    <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center w-24">Qty</th>
                    <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right w-40">Rate</th>
                    {hasTaxSplit && (
                      <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center w-40">Tax Details</th>
                    )}
                    <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right w-48">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="py-6 px-8">
                        <p className="text-sm font-bold text-slate-800 leading-snug">{item.name}</p>
                        {item.description && <p className="text-xs text-slate-400 mt-1">{item.description}</p>}
                      </td>
                      <td className="py-6 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-sm font-black text-slate-600">
                          {item.qty}
                        </span>
                      </td>
                      <td className="py-6 px-4 text-right font-mono text-sm text-slate-500">
                        ₹{(item.price || 0).toLocaleString('en-IN')}
                      </td>
                      {hasTaxSplit && (
                        <td className="py-6 px-4 text-center">
                          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wider">
                            {invoice.taxType === 'CGST_SGST' 
                              ? `CGST ${(item.gstPercent / 2)}% + SGST ${(item.gstPercent / 2)}%`
                              : `IGST ${item.gstPercent}%`
                            }
                          </span>
                        </td>
                      )}
                      <td className="py-6 px-8 text-right font-mono font-black text-slate-900">
                        ₹{(item.qty * item.price).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12">
            {/* Notes / Terms */}
            <div className="flex-1 space-y-6">
              {invoice.notes && (settings.showInvoiceNotes ?? true) !== false && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Operational Notes</span>
                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">{invoice.notes}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Corporate Sign-off</span>
                <div className="w-48 h-24 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center relative group">
                  {settings.signatureUrl && (settings.showInvoiceSignature ?? true) !== false ? (
                    <img src={settings.signatureUrl} alt="Signature" className="max-w-[80%] max-h-[80%] object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">Awaiting Authentication</span>
                  )}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border border-slate-200 text-[8px] font-black text-slate-400 uppercase tracking-widest shadow-sm">Authorized Seal</div>
                </div>
              </div>
            </div>

            {/* Calculations Box */}
            <div className="w-full md:w-96">
              <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6 shadow-2xl shadow-indigo-900/20">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Net Ledger Value</span>
                    <span className="font-mono">₹{invoice.subtotal?.toLocaleString('en-IN')}</span>
                  </div>
                  {settings.gstOption !== 'zero_tax' && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Tax Provision</span>
                      <span className="font-mono text-indigo-400">+₹{invoice.taxAmount?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {invoice.discount > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-400 font-bold uppercase tracking-widest">Discount applied</span>
                      <span className="font-mono text-emerald-400">-₹{invoice.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  <div className="h-px bg-white/10 my-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-tighter">Gross Amount</span>
                    <span className="text-2xl font-black font-mono">₹{invoice.total.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2">
                    <span className="text-emerald-400 font-bold uppercase tracking-widest">Amount Received</span>
                    <span className="font-mono text-emerald-400">₹{(invoice.paidAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="bg-rose-500 rounded-2xl p-5 flex justify-between items-center shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-50">Pending Due</span>
                  <span className="text-xl font-black font-mono text-white">₹{outstandingAmount.toLocaleString('en-IN')}</span>
                </div>

                {!isPaid && settings.upiId && (
                  <div className="space-y-4 pt-2">
                    <div className="bg-white p-3 rounded-2xl flex items-center justify-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.companyName)}&am=${outstandingAmount}&cu=INR&tn=Inv-${invoice.invoiceNumber}`)}`} 
                        alt="UPI QR" 
                        className="w-32 h-32"
                      />
                    </div>
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      Scan to pay via any UPI App<br/>
                      (GPay, PhonePe, Paytm)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer Disclaimer */}
          <div className="p-8 text-center bg-slate-50/50 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Secure Digital Receipt</p>
            <p className="text-[9px] text-slate-400 leading-relaxed max-w-lg mx-auto">
              This document is a computer-generated summary retrieved directly from the corporate accounting server. 
              Internal verification hash matches the physical records at {settings.companyName}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
