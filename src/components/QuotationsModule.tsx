import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle, 
  Trash, 
  ArrowRightLeft, 
  Calendar, 
  FileCheck,
  Percent,
  X,
  User,
  ShoppingBag,
  Paperclip,
  Check,
  Edit3
} from 'lucide-react';
import { Quotation, Client, Product, QuotationItem } from '../types';
import Pagination from './Pagination';

interface QuotationsModuleProps {
  quotations: Quotation[];
  clients: Client[];
  products: Product[];
  onCreateQuotation: (q: Partial<Quotation>) => Promise<void>;
  onUpdateQuotation?: (id: string, q: Partial<Quotation>) => Promise<void>;
  onDeleteQuotation?: (id: string) => Promise<void>;
  onConvertQuotation: (id: string) => Promise<void>;
  businessSettings: any;
  canWrite?: boolean;
  canDelete?: boolean;
}

export default function QuotationsModule({
  quotations,
  clients,
  products,
  onCreateQuotation,
  onUpdateQuotation,
  onDeleteQuotation,
  onConvertQuotation,
  businessSettings,
  canWrite = true,
  canDelete = true
}: QuotationsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // States to keep track of quotation edits
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  // New quotation wizard states
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('This quotation remains valid for 30 calendar days from issue. Terms: 50% advance, balance on deliverable signoff.');
  const [discount, setDiscount] = useState('0');

  // Multi item addition fields
  const [addedItems, setAddedItems] = useState<Array<{
    productId: string;
    qty: number;
    price: number;
  }>>([]);

  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQty, setCurrentQty] = useState('1');
  const [currentPrice, setCurrentPrice] = useState('');

  const filteredQuotations = quotations.filter(q => 
    q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const selectedClientDetails = clients.find(c => c.id === clientId);

  // Dynamic dropdown trigger
  const handleProductSelect = (pId: string) => {
    setCurrentProductId(pId);
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setCurrentPrice(String(prod.price));
    }
  };

  const handleAddItemToWizard = () => {
    if (!currentProductId || Number(currentQty) <= 0 || Number(currentPrice) < 0) {
      alert("Please select a product, and ensure quantity is positive.");
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

  const handleRemoveItemFromWizard = (idx: number) => {
    const list = [...addedItems];
    list.splice(idx, 1);
    setAddedItems(list);
  };

  // Compute overall quote details
  const draftSubtotal = addedItems.reduce((sum, item) => {
    return sum + (item.qty * item.price);
  }, 0);

  const draftTax = businessSettings.gstOption === 'zero_tax' ? 0 : addedItems.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId);
    const rate = prod?.gstPercent || 18;
    const base = item.qty * item.price;
    return sum + (base * (rate / 100));
  }, 0);

  const draftDiscountNum = Number(discount || 0);
  const draftTotal = Math.max(0, draftSubtotal + draftTax - draftDiscountNum);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert("A client selection is required.");
      return;
    }
    if (addedItems.length === 0) {
      alert("Please include at least one catalogue item in the proposal.");
      return;
    }

    const clientObj = clients.find(c => c.id === clientId)!;
    const isZeroTax = businessSettings.gstOption === 'zero_tax';
    
    // Build full items payloads
    const finalItems: QuotationItem[] = addedItems.map(item => {
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

    const payload: Partial<Quotation> = {
      clientId,
      clientName: clientObj.name,
      date,
      expiryDate,
      items: finalItems,
      subtotal: draftSubtotal,
      discount: draftDiscountNum,
      taxAmount: draftTax,
      total: draftTotal,
      status: isEditing ? undefined : 'sent',
      notes
    };

    if (isEditing && onUpdateQuotation) {
      await onUpdateQuotation(editingQuotationId!, payload);
    } else {
      await onCreateQuotation(payload);
    }
    
    setIsCreateOpen(false);
    setIsEditing(false);
    setEditingQuotationId(null);
    setClientId('');
    setAddedItems([]);
    setDiscount('0');
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'draft': return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'sent': return 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse';
      case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'declined': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'converted': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="quotations-ui">
      {selectedQuotation ? (
        // SHOW COMPREHENSIVE ESTIMATE PREVIEW CARD
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="quotation-detail-view">
          {/* Top Actions bar */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
            <button 
              onClick={() => setSelectedQuotation(null)}
              className="text-slate-400 hover:text-white transition text-xs font-semibold flex items-center gap-1"
            >
              &larr; Back to Estimates list
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 class-print-hide"
              >
                <Printer className="w-4 h-4" />
                <span>Print Quotation</span>
              </button>

              {canWrite && (
                <button 
                  onClick={() => {
                    const q = selectedQuotation;
                    setIsEditing(true);
                    setEditingQuotationId(q.id);
                    setClientId(q.clientId);
                    setDate(q.date);
                    setExpiryDate(q.expiryDate);
                    setNotes(q.notes || '');
                    setDiscount(String(q.discount || 0));
                    setAddedItems(q.items.map(item => ({
                      productId: item.productId,
                      qty: item.qty,
                      price: item.price
                    })));
                    setIsCreateOpen(true);
                    setSelectedQuotation(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-705 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 class-print-hide"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}

              {canDelete && onDeleteQuotation && (
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete quotation ${selectedQuotation.quotationNumber}?`)) {
                      await onDeleteQuotation(selectedQuotation.id);
                      setSelectedQuotation(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-medium flex items-center gap-1.5 class-print-hide"
                >
                  <Trash className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
              
              {canWrite && selectedQuotation.status !== 'converted' && selectedQuotation.status !== 'declined' && (
                <button 
                  onClick={async () => {
                    if (confirm("Confirm converting this Estimate into a formal taxable Invoice? This updates ledger records automatically.")) {
                      await onConvertQuotation(selectedQuotation.id);
                      setSelectedQuotation(null);
                    }
                  }}
                  className="px-4 py-1.5 gradient-btn rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Convert to Invoice</span>
                </button>
              )}
            </div>
          </div>

          {/* PRINTABLE AREA */}
          <div className="p-8 space-y-8" id="quotation-print-container">
            {/* Header Layout */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-[#E5E7EB] pb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white font-bold text-lg font-display shadow-sm">
                    A
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 font-display tracking-tight leading-none">{businessSettings.companyName}</h2>
                    <span className="text-[11px] font-semibold text-indigo-600 tracking-wider block mt-1 uppercase font-mono">GSTIN: {businessSettings.gstIn}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 max-w-xs">{businessSettings.address}</p>
                <p className="text-xs text-slate-500">Email: {businessSettings.email} | Tel: {businessSettings.phone}</p>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">estimation proposal</span>
                <h1 className="text-2xl font-mono font-bold text-slate-800 mt-1">{selectedQuotation.quotationNumber}</h1>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(selectedQuotation.status)} uppercase`}>
                  {selectedQuotation.status}
                </span>
                <div className="text-xs text-slate-500 font-mono pt-3 space-y-0.5">
                  <p>Issue Date: <b>{selectedQuotation.date}</b></p>
                  <p>Expiry Date: <b className="text-rose-600">{selectedQuotation.expiryDate}</b></p>
                </div>
              </div>
            </div>

            {/* Client address and description details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 border border-[#E5E7EB] p-5 rounded-2xl">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prepared Client Details</span>
                <h3 className="font-bold text-slate-800 text-sm mt-1">{selectedQuotation.clientName}</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-xs">Represented corporate customer for technical consultancy proposals.</p>
              </div>
              <div className="md:text-right space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Banking Terms Info</span>
                <p className="text-xs text-slate-600 font-semibold">{businessSettings.bankName}</p>
                <p className="text-xs text-slate-500 font-mono">A/C Number: {businessSettings.accountNum}</p>
                <p className="text-xs text-slate-500 font-mono">IFSC: {businessSettings.ifscCode}</p>
                <p className="text-xs text-slate-500 font-mono">G-Pay Address: {businessSettings.upiId}</p>
              </div>
            </div>

            {/* Table billing details */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-[#E5E7EB] rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Line Description / Scope</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Unit Rate (INR)</th>
                    {businessSettings.gstOption !== 'zero_tax' && (
                      <th className="py-3 px-3 text-center">GST Rate</th>
                    )}
                    <th className="py-3 px-4 text-right">Extended Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {selectedQuotation.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="py-4 px-3 text-center font-mono font-bold text-slate-600">{item.qty}</td>
                      <td className="py-4 px-3 text-right font-mono text-slate-600">{formatCurrency(item.price)}</td>
                      {businessSettings.gstOption !== 'zero_tax' && (
                        <td className="py-4 px-3 text-center font-semibold text-indigo-600">{item.gstPercent}%</td>
                      )}
                      <td className="py-4 px-4 text-right font-semibold font-mono text-slate-900">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Math totals tally */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-t border-[#E5E7EB] pt-6">
              <div className="max-w-md space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Authorizer / Executive Signoff</span>
                <p className="text-xs text-slate-500 leading-relaxed italic">"{selectedQuotation.notes}"</p>
                <div className="pt-4 flex items-center gap-3">
                  <img src={businessSettings.signatureUrl} className="h-10 opacity-75 border-b border-dashed border-slate-300" alt="Authorized sign" />
                  <span className="text-xs text-slate-400 block mt-2 font-mono">Electronic Proposal Stamp</span>
                </div>
              </div>

              <div className="w-full md:w-80 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Draft Subtotal:</span>
                  <span className="font-mono">{formatCurrency(selectedQuotation.subtotal)}</span>
                </div>
                {businessSettings.gstOption !== 'zero_tax' && (
                  <div className="flex justify-between">
                    <span>Aggregate GST Taxes:</span>
                    <span className="font-mono text-indigo-600">+{formatCurrency(selectedQuotation.taxAmount)}</span>
                  </div>
                )}
                {selectedQuotation.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Branding Promotion Discount:</span>
                    <span className="font-mono">-{formatCurrency(selectedQuotation.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-[#E5E7EB] pt-2.5">
                  <span className="font-display">Grand Total (INR):</span>
                  <span className="font-mono text-[#5B21FF]">{formatCurrency(selectedQuotation.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // LIST QUOTATIONS INTERFACE
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E7EB] pb-4 shadow-sm">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                placeholder="Search estimate number or client..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                id="quote-search-bar"
              />
            </div>
            {canWrite && (
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="gradient-btn px-4 py-2 rounded-lg text-xs font-semibold shadow-sm w-full md:w-auto flex items-center justify-center gap-1.5"
                id="raise-new-proposal-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Draft New Estimate</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden" id="quotations-table-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB]">
                    <th className="py-3 px-5">Estimate Number</th>
                    <th className="py-3 px-5">Client Prospect</th>
                    <th className="py-3 px-5">Issue Date</th>
                    <th className="py-3 px-5">Validity End</th>
                    <th className="py-3 px-5 text-right">Price Total</th>
                    <th className="py-3 px-5 text-center">Status</th>
                    <th className="py-3 px-5 text-center">Receipt Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredQuotations.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-5 font-mono font-bold text-slate-900">{q.quotationNumber}</td>
                      <td className="py-4 px-5 font-semibold text-slate-700">{q.clientName}</td>
                      <td className="py-4 px-5 text-slate-500">{q.date}</td>
                      <td className="py-4 px-5 text-slate-400 font-mono">{q.expiryDate}</td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-800">{formatCurrency(q.total)}</td>
                      <td className="py-4 px-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(q.status)} uppercase`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => setSelectedQuotation(q)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#5B21FF] bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100/50 transition whitespace-nowrap"
                          >
                            Review &amp; Sign
                          </button>
                          {canWrite && q.status !== 'converted' && q.status !== 'declined' && (
                            <button
                              onClick={() => {
                                setIsEditing(true);
                                setEditingQuotationId(q.id);
                                setClientId(q.clientId);
                                setDate(q.date);
                                setExpiryDate(q.expiryDate);
                                setNotes(q.notes || '');
                                setDiscount(String(q.discount || 0));
                                setAddedItems(q.items.map(item => ({
                                  productId: item.productId,
                                  qty: item.qty,
                                  price: item.price
                                })));
                                setIsCreateOpen(true);
                              }}
                              className="p-1 px-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded border border-slate-100 transition"
                              title="Edit Estimate"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && onDeleteQuotation && (
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete quotation ${q.quotationNumber}?`)) {
                                  await onDeleteQuotation(q.id);
                                }
                              }}
                              className="p-1 px-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-50 rounded border border-slate-100 transition"
                              title="Delete Estimate"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredQuotations.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* CREATE ESTIMATE SLIDE-OVER WIZARD */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl border border-[#E5E7EB] flex flex-col max-h-[90vh]">
            {/* Wizard Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base font-display">{isEditing ? "Edit Proposal Estimate" : "Create Smart Proposal Estimate"}</h3>
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

            {/* Wizard Body Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Client Dropdown */}
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Select Target Client *</label>
                  <select 
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50"
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Issue Date *</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Expiry Valid Date *</label>
                  <input 
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* DYNAMIC ITEM SCOPE SECTION */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider block">Add Line Items to Scope</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  {/* Item selector */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Select Service / Item</label>
                    <select 
                      value={currentProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="">-- Available Catalogue --</option>
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
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToWizard}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Include</span>
                  </button>
                </div>

                {/* Scope line list table */}
                {addedItems.length > 0 ? (
                  <div className="bg-white rounded-lg border border-slate-100 overflow-hidden mt-3">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100/70 text-slate-400 font-bold uppercase truncate border-b border-slate-100">
                        <tr>
                          <th className="p-2 pl-3">Item / Service Details</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Extended Base</th>
                          <th className="p-2 text-center">Taxes</th>
                          <th className="p-2 text-center">Bin</th>
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
                              <td className="p-2 text-center font-semibold text-indigo-600">
                                {businessSettings.gstOption === 'zero_tax' ? '0% Exempt' : `${prod.gstPercent}%`}
                              </td>
                              <td className="p-2 text-center">
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveItemFromWizard(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic block py-2 text-center">No deliverables mapped to proposal scope yet.</span>
                )}
              </div>

              {/* DISCOUNT & STATEMENTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Apply Promotion Discount (INR)</label>
                    <input 
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Terms &amp; Deliverables Clause</label>
                    <textarea 
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Running sums */}
                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl flex flex-col justify-between font-mono text-xs">
                  <span className="font-sans text-[11px] font-bold uppercase text-indigo-400 mb-2">Estimate Totalizer Tally</span>
                  <div className="space-y-2 border-b border-slate-800 pb-3">
                    <div className="flex justify-between">
                      <span>Total Net Base:</span>
                      <span>{formatCurrency(draftSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-300">
                      <span>Calculated CGST/SGST/IGST:</span>
                      <span>+{formatCurrency(draftTax)}</span>
                    </div>
                    {draftDiscountNum > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Waver Promo discount:</span>
                        <span>-{formatCurrency(draftDiscountNum)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-3 font-sans">
                    <span className="text-white">Estimate Total (INR):</span>
                    <span className="text-xl text-[#8B5CF6] font-mono font-extrabold">{formatCurrency(draftTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsCreateOpen(false);
                    setAddedItems([]);
                  }}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="gradient-btn px-5 py-2 text-xs font-semibold rounded-xl shadow-md"
                >
                  {isEditing ? "Save Proposal Changes" : "Dispatch Proposal Estimate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
