import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Mail, 
  Trash2, 
  Eye, 
  Calendar, 
  CreditCard,
  Building2,
  Phone,
  QrCode,
  Download,
  AlertTriangle,
  X,
  User,
  CheckCircle,
  PlusCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  Globe
} from 'lucide-react';
import { Invoice, Client, Product, InvoiceItem } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Pagination from './Pagination';

interface InvoicesModuleProps {
  invoices: Invoice[];
  clients: Client[];
  products: Product[];
  onAddInvoice: (inv: Partial<Invoice>) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onMarkInvoiceRead?: (id: string) => Promise<void>;
  businessSettings: any;
  canWrite?: boolean;
  canDelete?: boolean;
}

type InvoiceLayoutTemplate = 'navy' | 'minimal' | 'emerald';

export default function InvoicesModule({
  invoices,
  clients,
  products,
  onAddInvoice,
  onDeleteInvoice,
  onMarkInvoiceRead,
  businessSettings,
  canWrite = true,
  canDelete = true
}: InvoicesModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const handleSelectInvoice = async (inv: Invoice) => {
    setSelectedInvoice({ ...inv, readCount: 1 });
    if (onMarkInvoiceRead) {
      try {
        await onMarkInvoiceRead(inv.id);
      } catch (err) {
        console.error("Failed to mark invoice as read", err);
      }
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceLayoutTemplate>((businessSettings?.invoiceTheme as any) || 'navy');

  React.useEffect(() => {
    if (businessSettings?.invoiceTheme) {
      setInvoiceTemplate(businessSettings.invoiceTheme);
    }
  }, [businessSettings]);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  // Form states inside new invoice wizard
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Humble warning: Please quote our invoice serial number in all bank payouts.');
  const [discount, setDiscount] = useState('0');

  // Multi item table adding states for invoice wizard
  const [addedItems, setAddedItems] = useState<Array<{
    productId: string;
    qty: number;
    price: number;
  }>>([]);

  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQty, setCurrentQty] = useState('1');
  const [currentPrice, setCurrentPrice] = useState('');

  const printableRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const selectedClientDetails = clients.find(c => c.id === clientId);

  // Home State mapping. We are based in Maharashtra (starts with "27")
  const homeStateCode = "27";
  const isInterstate = selectedClientDetails && !(selectedClientDetails.gstIn || '').startsWith(homeStateCode);

  const handleProductSelect = (pId: string) => {
    setCurrentProductId(pId);
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setCurrentPrice(String(prod.price));
    }
  };

  const handleAddItemToWizard = () => {
    if (!currentProductId || Number(currentQty) <= 0 || Number(currentPrice) < 0) {
      alert("Please select a target catalog item and positive quantities.");
      return;
    }
    setAddedItems([
      ...addedItems, 
      { productId: currentProductId, qty: Number(currentQty), price: Number(currentPrice) }
    ]);
    setCurrentProductId('');
    setCurrentQty('1');
    setCurrentPrice('');
  };

  const handleRemoveItemFromWizard = (index: number) => {
    const list = [...addedItems];
    list.splice(index, 1);
    setAddedItems(list);
  };

  // Math totals for invoice wizard
  const draftSubtotal = addedItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  
  // Tax distribution
  const draftTax = businessSettings.gstOption === 'zero_tax' ? 0 : addedItems.reduce((sum, item) => {
    const p = products.find(prod => prod.id === item.productId);
    const rate = p?.gstPercent || 18;
    const base = item.qty * item.price;
    return sum + (base * (rate / 100));
  }, 0);

  const draftDiscountNum = Number(discount || 0);
  const draftTotal = Math.max(0, draftSubtotal + draftTax - draftDiscountNum);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert("Please designate a corporate client first.");
      return;
    }
    if (addedItems.length === 0) {
      alert("Specify at least one billing item description.");
      return;
    }

    const clientObj = clients.find(c => c.id === clientId)!;
    const isZeroTax = businessSettings.gstOption === 'zero_tax';

    const finalItems: InvoiceItem[] = addedItems.map(item => {
      const prod = products.find(p => p.id === item.productId)!;
      const base = item.qty * item.price;
      const rate = isZeroTax ? 0 : prod.gstPercent;
      const tax = base * (rate / 100);
      return {
        productId: item.productId,
        name: prod.name,
        hsnSac: prod.hsnSac || '',
        qty: item.qty,
        price: item.price,
        gstPercent: rate,
        gstAmount: tax,
        totalAmount: base + tax
      };
    });

    const payload: Partial<Invoice> = {
      clientId,
      clientName: clientObj.name,
      clientGst: clientObj.gstIn || 'URP',
      date,
      dueDate,
      items: finalItems,
      subtotal: draftSubtotal,
      discount: draftDiscountNum,
      taxType: (clientObj.gstIn || '').startsWith(homeStateCode) ? "CGST_SGST" : "IGST",
      taxAmount: draftTax,
      total: draftTotal,
      paidAmount: 0,
      dueAmount: draftTotal,
      status: 'unpaid',
      notes
    };

    await onAddInvoice(payload);
    setIsCreateOpen(false);
    setAddedItems([]);
    setDiscount('0');
  };

  // PDF Export Engine via html2canvas plus jsPDF
  const handleDownloadPDF = async () => {
    if (!printableRef.current) return;
    
    // Temporarily intercept console logging to suppress verbose "oklch" parsing warnings from html2canvas
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    const shouldFilter = (msg: any) => {
      if (typeof msg === 'string' && (msg.includes('oklch') || msg.includes('unsupported color function'))) {
        return true;
      }
      return false;
    };

    console.error = (...args: any[]) => {
      if (args[0] && shouldFilter(args[0])) return;
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      if (args[0] && shouldFilter(args[0])) return;
      originalConsoleWarn.apply(console, args);
    };

    console.log = (...args: any[]) => {
      if (args[0] && shouldFilter(args[0])) return;
      originalConsoleLog.apply(console, args);
    };

    try {
      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 standard width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice_${selectedInvoice?.invoiceNumber.replace('/', '_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error building download stream, standard systems printed.");
    } finally {
      // Restore standard console logs
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
    }
  };

  const handleOpenEmail = (inv: Invoice) => {
    const cl = clients.find(c => c.id === inv.clientId);
    setEmailTo(cl?.email || 'accounts@clientcorp.com');
    setEmailSubject(`Smart ERP: Digital Tax Invoice Dispatched ${inv.invoiceNumber} from ${businessSettings.companyName}`);
    setIsEmailModalOpen(true);
  };

  const handleSendEmailSimulation = () => {
    alert(`Success: Interactive dispatch complete. Copies generated and forwarded to ${emailTo}`);
    setIsEmailModalOpen(false);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'partially_paid': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'unpaid': return 'bg-rose-50 text-rose-700 border-rose-100 hover:scale-105 transition';
      case 'overdue': return 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getTemplateTheme = (theme: InvoiceLayoutTemplate) => {
    switch(theme) {
      case 'navy': return {
        headerBg: 'bg-slate-900 text-white',
        accentText: 'text-[#5B21FF]',
        borderTheme: 'border-slate-200',
        tableHeadBg: 'bg-slate-100',
        cardBg: 'bg-white',
        subText: 'text-slate-500'
      };
      case 'minimal': return {
        headerBg: 'bg-white text-slate-900 border-b-2 border-slate-900',
        accentText: 'text-slate-900 font-extrabold',
        borderTheme: 'border-slate-200',
        tableHeadBg: 'bg-slate-50',
        cardBg: 'bg-white',
        subText: 'text-slate-600'
      };
      case 'emerald': return {
        headerBg: 'bg-teal-950 text-slate-100',
        accentText: 'text-teal-600 font-bold',
        borderTheme: 'border-teal-100',
        tableHeadBg: 'bg-teal-50',
        cardBg: 'bg-white',
        subText: 'text-slate-500'
      };
    }
  };

  const activeTheme = getTemplateTheme(invoiceTemplate);

  return (
    <div className="space-y-6" id="invoices-module">
      {selectedInvoice ? (
        // DETAIL VIEWER FOR SINGLE INVOICE
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print" id="invoice-actions-panel">
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              &larr; Back to Invoices ledger
            </button>
            
            {/* Template Swappers */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase font-extrabold text-slate-400">Design Theme:</span>
              <button 
                onClick={() => setInvoiceTemplate('navy')}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition ${invoiceTemplate === 'navy' ? 'bg-[#5B21FF] text-white border-[#5B21FF]' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
              >
                Navy Slate (ERP)
              </button>
              <button 
                onClick={() => setInvoiceTemplate('minimal')}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition ${invoiceTemplate === 'minimal' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
              >
                Swiss Minimal
              </button>
              <button 
                onClick={() => setInvoiceTemplate('emerald')}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition ${invoiceTemplate === 'emerald' ? 'bg-teal-700 text-white border-teal-700' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
              >
                Executive Teal
              </button>
            </div>

            {/* Print/Download triggers */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleOpenEmail(selectedInvoice)}
                className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
              >
                <Mail className="w-4 h-4" />
                <span>Email Cop</span>
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Save PDF</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="gradient-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
            </div>
          </div>

          {/* MASTER VISUAL DRAW TARGET */}
          <div 
            ref={printableRef}
            className={`bg-white rounded-3xl border ${activeTheme?.borderTheme || 'border-slate-200'} shadow-xl overflow-hidden p-8 space-y-8 max-w-4xl mx-auto`}
            id="print-invoice-layout"
          >
            {/* Header section based on branding template chosen */}
            <div className={`flex flex-col sm:flex-row justify-between items-start gap-6 border-b ${activeTheme?.borderTheme || 'border-slate-200'} pb-8`}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {((businessSettings?.showInvoiceLogo ?? true) !== false && businessSettings?.logoUrl) ? (
                    <img 
                      src={businessSettings.logoUrl} 
                      className="w-12 h-12 rounded-xl object-contain shadow-sm" 
                      alt="Logo" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg font-display shadow-sm bg-indigo-600">
                      {businessSettings?.companyName ? businessSettings.companyName.charAt(0) : 'A'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 font-display tracking-tight leading-none">{businessSettings?.companyName}</h2>
                    {(businessSettings?.gstIn && (businessSettings?.showInvoiceGst ?? true) !== false) && (
                      <span className={`text-[11px] font-semibold ${activeTheme?.accentText || 'text-indigo-600'} tracking-wider block mt-1 uppercase font-mono`}>
                        GSTIN: {businessSettings.gstIn}
                      </span>
                    )}
                  </div>
                </div>
                {((businessSettings?.showInvoiceAddress ?? true) !== false && businessSettings?.address) && (
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{businessSettings.address}</p>
                )}
                {(businessSettings?.showInvoicePhone ?? true) !== false || (businessSettings?.showInvoiceEmail ?? true) !== false ? (
                  <p className="text-xs text-slate-400">
                    {((businessSettings?.showInvoiceEmail ?? true) !== false && businessSettings?.email) && `Email: ${businessSettings.email}`}
                    {((businessSettings?.showInvoiceEmail ?? true) !== false && businessSettings?.email && (businessSettings?.showInvoicePhone ?? true) !== false && businessSettings?.phone) && ' | '}
                    {((businessSettings?.showInvoicePhone ?? true) !== false && businessSettings?.phone) && `Tel: ${businessSettings.phone}`}
                  </p>
                ) : null}
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">tax invoice</span>
                <h1 className="text-2xl font-mono font-bold text-slate-800 mt-1">{selectedInvoice.invoiceNumber}</h1>
                <div className="flex items-center justify-end gap-1.5 mt-1 relative">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(selectedInvoice.status)} uppercase`}>
                    {selectedInvoice.status.replace('_', ' ')}
                  </span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border no-print ${(selectedInvoice.readCount || 0) > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'} uppercase font-sans`}>
                    Read: {selectedInvoice.readCount || 0}/1
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono pt-3 space-y-0.5">
                  <p>Invoiced Date: <b>{selectedInvoice.date}</b></p>
                  <p>Due By: <b className="text-rose-600">{selectedInvoice.dueDate}</b></p>
                </div>
              </div>
            </div>

            {/* Billed To Address card */}
            {(() => {
              const invoiceClient = clients.find(c => c.id === selectedInvoice.clientId);
              return (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 border ${activeTheme?.borderTheme || 'border-slate-200'} p-5 rounded-2xl`}>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Client Bill-To Particulars</span>
                    <h3 className="font-bold text-slate-800 text-sm mt-1">{selectedInvoice.clientName}</h3>
                    
                    {((businessSettings?.showInvoiceClientAddress ?? true) !== false && invoiceClient?.billingAddress) && (
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{invoiceClient.billingAddress}</p>
                    )}
                    
                    {invoiceClient?.email && (businessSettings?.showInvoiceClientEmail ?? true) !== false && (
                      <p className="text-xs text-slate-500">Email: {invoiceClient.email}</p>
                    )}
                    {invoiceClient?.phone && (businessSettings?.showInvoiceClientPhone ?? true) !== false && (
                      <p className="text-xs text-slate-500">Tel: {invoiceClient.phone}</p>
                    )}

                    {((businessSettings?.showInvoiceClientGst ?? true) !== false && (selectedInvoice.clientGst || invoiceClient?.gstIn)) && (
                      <span className="text-[10.5px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block uppercase">
                        GSTIN: {selectedInvoice.clientGst || invoiceClient?.gstIn || 'URP (Unregistered)'}
                      </span>
                    )}
                    
                    {((businessSettings?.showInvoiceNotes ?? true) !== false && selectedInvoice.notes) && (
                      <p className="text-[11px] text-indigo-600/80 bg-indigo-50/40 p-2 rounded-lg italic mt-2 max-w-xs leading-normal">
                        Note: {selectedInvoice.notes}
                      </p>
                    )}
                  </div>

                  <div className="md:text-right space-y-1">
                    {((businessSettings?.showInvoiceBankDetails ?? true) !== false) && (
                      <>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Banking Payout Details</span>
                        <p className="text-xs text-slate-700 font-bold">{businessSettings?.bankName || 'N/A'}</p>
                        <p className="text-xs text-slate-500 font-mono">A/C: {businessSettings?.accountNum || 'N/A'}</p>
                        <p className="text-xs text-slate-500 font-mono">IFSC: {businessSettings?.ifscCode || 'N/A'}</p>
                      </>
                    )}
                    {((businessSettings?.showInvoiceUpiId ?? true) !== false && businessSettings?.upiId) && (
                      <p className="text-xs text-slate-500 font-mono">UPI ID: {businessSettings.upiId}</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Dynamic Line items table */}
            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse border ${activeTheme?.borderTheme || 'border-slate-200'} rounded-xl overflow-hidden`}>
                <thead>
                  <tr className={`${activeTheme?.tableHeadBg || 'bg-slate-100'} text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b ${activeTheme?.borderTheme || 'border-slate-200'}`}>
                    <th className="py-3 px-4">Standard Deliverables Line Item</th>
                    <th className="py-3 px-3 text-center col-span-1">Qty</th>
                    <th className="py-3 px-3 text-right">Unit Rate (INR)</th>
                    {businessSettings?.gstOption !== 'zero_tax' && (businessSettings?.showInvoiceTaxSplit ?? true) !== false && (
                      <th className="py-3 px-3 text-center">Tax Split</th>
                    )}
                    <th className="py-3 px-4 text-right">Amount (Gross)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {selectedInvoice.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        <div>{item.name}</div>
                        {((businessSettings?.showInvoiceHsn ?? true) !== false && item.hsnSac) && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">HSN: {item.hsnSac}</div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center font-mono font-bold text-slate-600">{item.qty}</td>
                      <td className="py-4 px-3 text-right font-mono text-slate-600">{formatCurrency(item.price)}</td>
                      {businessSettings?.gstOption !== 'zero_tax' && (businessSettings?.showInvoiceTaxSplit ?? true) !== false && (
                        <td className="py-4 px-3 text-center">
                          {selectedInvoice.taxType === 'CGST_SGST' ? (
                            <span className="text-[10px] text-slate-500">
                              CGST {(item.gstPercent/2)}% + SGST {(item.gstPercent/2)}%
                            </span>
                          ) : (
                            <span className={`text-[10px] ${activeTheme?.accentText || 'text-indigo-600'} font-bold`}>
                              IGST {item.gstPercent}%
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-4 px-4 text-right font-semibold font-mono text-slate-900">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals math section, signatures, plus QR code */}
            <div className={`flex flex-col md:flex-row justify-between items-start gap-8 border-t ${activeTheme?.borderTheme || 'border-slate-200'} pt-6`}>
              {/* Left QR Code and Notes */}
              <div className="flex flex-wrap gap-6 items-center">
                {((businessSettings?.showInvoiceQrCode ?? true) !== false && businessSettings?.upiId) && (
                  <div className={`p-2 border ${activeTheme?.borderTheme || 'border-slate-200'} rounded-xl bg-slate-50/50`}>
                    {/* Generate QR image representing standard BHIM UPI protocol deep-link */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${businessSettings.upiId}%26pn=${encodeURIComponent(businessSettings.companyName || '')}%26am=${selectedInvoice.dueAmount || selectedInvoice.total}%26cu=INR`} 
                      className="w-24 h-24" 
                      alt="BHIM UPI QRCode" 
                      id="upi-instant-qr"
                    />
                    <span className={`text-[9px] ${activeTheme?.accentText || 'text-[#5B21FF]'} font-semibold tracking-wide text-center mt-1 block`}>Scan BHIM UPI</span>
                  </div>
                )}
                {((businessSettings?.showInvoiceSignature ?? true) !== false && businessSettings?.signatureUrl) && (
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase font-sans">Authorized Signoff</span>
                    <div className="py-1">
                      <img 
                        src={businessSettings.signatureUrl} 
                        style={{ height: `${businessSettings.moharSize || 40}px` }} 
                        className="w-auto max-w-[200px] border-b border-dashed border-slate-200" 
                        alt="Stamp signature" 
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block font-semibold">{businessSettings?.companyName} Director</span>
                  </div>
                )}
              </div>

              {/* Right mathematical sums */}
              <div className="w-full md:w-80 space-y-2.5 text-xs text-slate-600 font-mono">
                <div className="flex justify-between font-sans">
                  <span>Net Ledger Value:</span>
                  <span className="font-mono text-slate-800">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {businessSettings.gstOption !== 'zero_tax' && (
                  <div className="flex justify-between font-sans">
                    <span>CGST/SGST/IGST Taxes:</span>
                    <span className="font-mono text-slate-800">+{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                )}
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between font-sans text-emerald-600 font-bold">
                    <span>Discount applied:</span>
                    <span>-{formatCurrency(selectedInvoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-sans text-slate-900 border-t border-[#E5E7EB] pt-2.5">
                  <span className="font-semibold">Cumulative Total:</span>
                  <span className="font-mono font-extrabold">{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between font-sans text-emerald-600 bg-emerald-50 p-2 rounded-lg font-bold">
                  <span>Amount Cleared:</span>
                  <span>{formatCurrency(selectedInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-sans text-rose-600 bg-rose-50 p-2 rounded-lg font-bold">
                  <span>Pending Outstanding:</span>
                  <span>{formatCurrency(selectedInvoice.dueAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // INVOICES REGISTRY DIRECTORY
        <div className="space-y-6">
          {/* Header toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                placeholder="Search serial code or client name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                id="search-invoices-input"
              />
            </div>

            {/* Quick Status Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'paid', 'partially_paid', 'unpaid', 'overdue'].map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition ${statusFilter === st ? 'bg-[#5B21FF] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {canWrite && (
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="gradient-btn px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm w-full md:w-auto flex items-center justify-center gap-1.5"
                id="toolbar-invoice-raise-btn"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Raise Invoice</span>
              </button>
            )}
          </div>

          {/* Invoices grid representation */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden" id="invoices-table-shell">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB]">
                    <th className="py-3 px-5">Invoice Reference</th>
                    <th className="py-3 px-5">Company Target</th>
                    <th className="py-3 px-5">raised date</th>
                    <th className="py-3 px-5">maturity due</th>
                    <th className="py-3 px-5 text-right">Invoice value</th>
                    <th className="py-3 px-5 text-right">Outstanding</th>
                    <th className="py-3 px-5 text-center">reconciliation status</th>
                    <th className="py-3 px-5 text-center">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-5">
                        <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-sans font-semibold tracking-wide uppercase select-none">
                          <span className={`w-1.5 h-1.5 rounded-full ${inv.readCount && inv.readCount >= 1 ? 'bg-emerald-500' : 'bg-slate-350 bg-slate-400 animate-pulse'}`} />
                          <span className={inv.readCount && inv.readCount >= 1 ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                            {inv.readCount && inv.readCount >= 1 ? 'READ 1/1' : 'UNREAD 0/1'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-700">{inv.clientName}</td>
                      <td className="py-4 px-5 text-slate-500">{inv.date}</td>
                      <td className="py-4 px-5 text-rose-500 font-mono select-none">{inv.dueDate}</td>
                      <td className="py-4 px-5 text-right font-mono text-slate-800">{formatCurrency(inv.total)}</td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-800">
                        {inv.dueAmount > 0 ? (
                          <span className="text-rose-600">{formatCurrency(inv.dueAmount)}</span>
                        ) : (
                          <span className="text-emerald-600 font-normal">Settle</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(inv.status)} uppercase`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center flex items-center justify-center gap-1.5 pt-3">
                        <button 
                          onClick={() => handleSelectInvoice(inv)}
                          className="px-2 py-1 border border-slate-200 hover:border-[#5B21FF] rounded-lg text-slate-600 hover:text-[#5B21FF] font-semibold hover:bg-purple-50 transition"
                        >
                          Review Bill
                        </button>
                        {canDelete && (
                          <button 
                            onClick={async () => {
                              if (confirm(`Confirm removing invoice ${inv.invoiceNumber}? Associated ledger and outstandings will reverse.`)) {
                                await onDeleteInvoice(inv.id);
                              }
                            }}
                            className="p-1 px-1.5 border border-rose-100 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 italic">No invoices recorded under active selection.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredInvoices.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* CREATE INVOICE SLIDE-OVER WIZARD */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-[#E5E7EB] flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base font-display">Generate Professional Tax Invoice</h3>
              </div>
              <button 
                onClick={() => {
                  setIsCreateOpen(false);
                  setAddedItems([]);
                }} 
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Form details top row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Corporate Client *</label>
                  <select 
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-slate-50"
                  >
                    <option value="">-- Choose Partner --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Billing Date *</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Payment Due By *</label>
                  <input 
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Taxation details helper alerts */}
              {selectedClientDetails && (
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-800">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    <span>Selected client resides in: <b>{isInterstate ? 'Domestic Out-of-State (IGST 18% mapping)' : 'Domestic Home-State (Maharashtra CGST 9% + SGST 9%)'}</b></span>
                  </div>
                  <span className="font-mono text-[10.5px] font-bold uppercase underline">verified: {selectedClientDetails.gstIn || 'URP (Unregistered)'}</span>
                </div>
              )}

              {/* Items selector */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                <span className="text-[11px] font-extrabold text-[#5B21FF] uppercase tracking-wider block">Include Deliverable Line Items</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Select Catalog Item</label>
                    <select 
                      value={currentProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="">-- Choose Deliverable --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {businessSettings.gstOption === 'zero_tax' ? '' : `(GST ${p.gstPercent}%)`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Qty</label>
                    <input 
                      type="number"
                      min={1}
                      value={currentQty}
                      onChange={(e) => setCurrentQty(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleAddItemToWizard}
                    className="px-4 py-2.5 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Include Line</span>
                  </button>
                </div>

                {/* Scope line list table */}
                {addedItems.length > 0 ? (
                  <div className="bg-white rounded-lg border border-slate-100 overflow-hidden mt-3">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100/70 text-slate-400 font-bold uppercase truncate border-b border-slate-100">
                        <tr>
                          <th className="p-2 pl-3">Item details</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Net billing</th>
                          <th className="p-2 text-center">Tax Split</th>
                          <th className="p-2 text-center">Tally</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {addedItems.map((item, idx) => {
                          const prod = products.find(p => p.id === item.productId)!;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="p-2 pl-3 font-semibold text-slate-700">{prod.name}</td>
                              <td className="p-2 text-center font-mono font-semibold">{item.qty} {prod.unit}</td>
                              <td className="p-2 text-right font-mono">{formatCurrency(item.qty * item.price)}</td>
                              <td className="p-2 text-center text-indigo-700 font-bold">
                                {businessSettings.gstOption === 'zero_tax' ? 'Tax-Exempt (0%)' : (isInterstate ? `IGST ${prod.gstPercent}%` : `CGST/SGST ${(prod.gstPercent/2)}%`)}
                              </td>
                              <td className="p-2 text-center">
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveItemFromWizard(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic block py-2 text-center">No active deliverables have been appended yet.</span>
                )}
              </div>

              {/* Subtotal blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Apply Promotion Discount (INR)</label>
                    <input 
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Invoice Terms &amp; Instructions</label>
                    <textarea 
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl flex flex-col justify-between font-mono text-xs">
                  <span className="font-sans text-[11px] font-bold text-indigo-400 mb-2 block uppercase">Invoice Totalizer Tally</span>
                  <div className="space-y-2 border-b border-slate-800 pb-3">
                    <div className="flex justify-between">
                      <span>Subtotal net base:</span>
                      <span>{formatCurrency(draftSubtotal)}</span>
                    </div>
                    {businessSettings.gstOption !== 'zero_tax' && (
                      <div className="flex justify-between">
                        <span>Calculated GST Taxes:</span>
                        <span className="text-indigo-300">+{formatCurrency(draftTax)}</span>
                      </div>
                    )}
                    {draftDiscountNum > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount Promo applied:</span>
                        <span>-{formatCurrency(draftDiscountNum)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-3 font-sans">
                    <span className="text-white">Amount Due (INR):</span>
                    <span className="text-xl text-[#8B5CF6] font-mono font-extrabold">{formatCurrency(draftTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Form actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsCreateOpen(false);
                    setAddedItems([]);
                  }}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition animate-hover"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="gradient-btn px-5 py-2.5 text-xs font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Authorize &amp; Post Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL FORWARD DIALOG */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-[#E5E7EB]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Dispatched Copy Transmission</h3>
              <button onClick={() => setIsEmailModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Recipient Email Address</label>
                <input 
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Subject Line</label>
                <input 
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-100 rounded-xl"
                />
              </div>
              <p className="text-[11px] text-slate-400 italic">This dispatch bundles a print optimized version of Invoice {selectedInvoice?.invoiceNumber} along with payment instructions.</p>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button 
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendEmailSimulation}
                  className="gradient-btn px-5 py-2 text-xs font-bold rounded-xl"
                >
                  Send Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
