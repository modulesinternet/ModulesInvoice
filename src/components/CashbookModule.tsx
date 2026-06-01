import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  X,
  Building2,
  Wallet,
  Edit2,
  Trash2
} from 'lucide-react';
import { CashbookEntry, formatDisplayDate } from '../types';
import Pagination from './Pagination';

interface CashbookModuleProps {
  cashbook: CashbookEntry[];
  onCreateCashbookEntry: (entry: Partial<CashbookEntry>) => Promise<void>;
  onUpdateCashbookEntry?: (id: string, entry: Partial<CashbookEntry>) => Promise<void>;
  onDeleteCashbookEntry?: (id: string) => Promise<void>;
  canWrite?: boolean;
  categories: string[];
  onAddCategory?: (category: string) => Promise<void>;
  businessSettings?: any;
}

export default function CashbookModule({
  cashbook,
  onCreateCashbookEntry,
  onUpdateCashbookEntry,
  onDeleteCashbookEntry,
  canWrite = true,
  categories = [],
  onAddCategory,
  businessSettings
}: CashbookModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashbookEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  // Categories states
  const [category, setCategory] = useState('General');
  const [newCatName, setNewCatName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);

  const filteredCashbook = [...cashbook]
    .filter(c => 
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.referenceId && c.referenceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.category && c.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [entryType, setEntryType] = useState<'income' | 'expense' | 'bank_deposit' | 'withdrawal'>('expense');
  const [account, setAccount] = useState('bank');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(businessSettings?.currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: businessSettings?.currency || 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!description || Number(amount) <= 0 || !reference) {
      alert("Please check that description, reference, and numeric amount fields are completed.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<CashbookEntry> = {
        date,
        description,
        type: entryType,
        amount: Number(amount),
        paymentMode: account === 'bank' ? 'UPI/Bank Transfer' : 'Cash',
        referenceId: reference,
        category: entryType === 'expense' ? (category || 'General') : 'General'
      };

      await onCreateCashbookEntry(payload);
      setIsModalOpen(false);

      // reset Form
      setDescription('');
      setAmount('');
      setReference('');
      setCategory('General');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while posting this cashbook entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!editingEntry) return;

    if (!description || Number(amount) <= 0 || !reference) {
      alert("Please check that description, reference, and numeric amount fields are completed.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<CashbookEntry> = {
        date,
        description,
        type: entryType,
        amount: Number(amount),
        paymentMode: account === 'bank' ? 'UPI/Bank Transfer' : 'Cash',
        referenceId: reference,
        category: entryType === 'expense' ? (category || 'General') : 'General'
      };

      if (onUpdateCashbookEntry) {
        await onUpdateCashbookEntry(editingEntry.id, payload);
      }
      setEditingEntry(null);

      // reset Form
      setDescription('');
      setAmount('');
      setReference('');
      setCategory('General');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while modifying this cashbook entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (entry: CashbookEntry) => {
    setEditingEntry(entry);
    setDate(entry.date);
    setDescription(entry.description);
    setAccount(entry.paymentMode === 'UPI/Bank Transfer' || entry.paymentMode === 'Bank Transfer' ? 'bank' : 'cash');
    setAmount(String(entry.amount));
    setReference(entry.referenceId || '');
    setCategory(entry.category || 'General');
    setEntryType(entry.type as any);
  };

  const handleDelete = async (id: string, desc: string) => {
    if (window.confirm(`Are you sure you want to permanently delete Cashbook entry: "${desc}"?`)) {
      if (onDeleteCashbookEntry) {
        await onDeleteCashbookEntry(id);
      }
    }
  };

  // Compute stats on-the-fly with robust chronological sorting and adjustment tracking
  const sortedCashbook = [...cashbook].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  let bankBalance = 0;
  let cashBalance = 0;
  let bankReceipts = 0;
  let bankPayments = 0;
  let cashReceipts = 0;
  let cashPayments = 0;

  sortedCashbook.forEach(c => {
    const amount = c.amount || 0;
    if (c.type === 'income') {
      if (c.paymentMode === 'Cash') {
        cashReceipts += amount;
        cashBalance += amount;
      } else {
        bankReceipts += amount;
        bankBalance += amount;
      }
    } else if (c.type === 'expense') {
      if (c.paymentMode === 'Cash') {
        cashPayments += amount;
        cashBalance -= amount;
      } else {
        bankPayments += amount;
        bankBalance -= amount;
      }
    } else if (c.type === 'bank_deposit') {
      cashBalance -= amount;
      bankBalance += amount;
      cashPayments += amount;
      bankReceipts += amount;
    } else if (c.type === 'withdrawal') {
      cashBalance += amount;
      bankBalance -= amount;
      cashReceipts += amount;
      bankPayments += amount;
    }
  });

  return (
    <div className="space-y-6" id="cashbook-container">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Cashbook</h1>
          <p className="text-sm text-slate-500">Record on-hand operating payments, debits, credits, and cash registry logs.</p>
        </div>
        {canWrite && (
          <button 
            onClick={() => {
              setEditingEntry(null);
              setEntryType('expense');
              setDate(new Date().toISOString().split('T')[0]);
              setDescription('');
              setAmount('');
              setReference('');
              setCategory('General');
              setIsModalOpen(true);
            }}
            className="gradient-btn px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 animate-none animate-none"
            id="add-cashbook-entry-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Post Cash Voucher</span>
          </button>
        )}
      </div>

      {/* METRIC CARD ALIGNMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="cashbook-metrics">
        {/* Bank ledger pool */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">HDFC Bank Ledger</span>
              <h3 className="text-2xl font-mono font-bold text-slate-900">{formatCurrency(bankBalance)}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] text-xs font-sans">
            <div>
              <span className="text-slate-400 block font-medium">Billed Receipts (+)</span>
              <span className="font-mono font-bold text-emerald-600">+{formatCurrency(bankReceipts)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Operational Payouts (-)</span>
              <span className="font-mono font-bold text-rose-500">-{formatCurrency(bankPayments)}</span>
            </div>
          </div>
        </div>

        {/* Cash in hand pool */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">On-Hand Cash Registry</span>
              <h3 className="text-2xl font-mono font-bold text-[#5B21FF]">{formatCurrency(cashBalance)}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] text-xs font-sans">
            <div>
              <span className="text-slate-400 block font-medium">Cash Collected (+)</span>
              <span className="font-mono font-bold text-emerald-600">+{formatCurrency(cashReceipts)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Registry Audited Payouts (-)</span>
              <span className="font-mono font-bold text-rose-500">-{formatCurrency(cashPayments)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE OPERATIONS LOG TABLE */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden" id="cashbook-table-container">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text"
              placeholder="Search details or reference codes..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              id="cashbook-table-filter"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB]">
                <th className="py-3.5 px-5">Voucher Date</th>
                <th className="py-3.5 px-5">Ref Code / Bank ID</th>
                <th className="py-3.5 px-5">Ledger Clause Description</th>
                <th className="py-3.5 px-4 text-center">Reconciled Pool</th>
                <th className="py-3.5 px-5 text-right text-emerald-600">Credits / Receipts (+)</th>
                <th className="py-3.5 px-5 text-right text-rose-600">Debits / Payouts (-)</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredCashbook.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/20">
                  <td className="py-3.5 px-5 font-mono text-slate-550">{formatDisplayDate(row.date)}</td>
                  <td className="py-3.5 px-5 font-mono text-slate-900 font-bold uppercase">{row.referenceId || "N/A"}</td>
                  <td className="py-3.5 px-5 text-slate-650">
                    <div className="flex flex-col">
                      <span>{row.description}</span>
                      {row.type === 'expense' && (
                        <span className="text-[10px] text-indigo-500 font-bold font-mono bg-indigo-50/75 py-0.5 px-1.5 rounded w-max mt-1 border border-indigo-100/40">
                          {row.category || 'General'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold uppercase ${row.paymentMode !== 'Cash' ? 'bg-blue-50 border border-blue-100 text-blue-700' : 'bg-purple-50 border border-purple-100 text-purple-700'}`}>
                      {row.paymentMode === 'Bank Transfer' ? 'UPI/Bank Transfer' : row.paymentMode}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-600">
                    {row.type === 'income' || row.type === 'bank_deposit' ? `+ ${formatCurrency(row.amount)}` : '-'}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-rose-600">
                    {row.type === 'expense' || row.type === 'withdrawal' ? `- ${formatCurrency(row.amount)}` : '-'}
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(row)}
                        className="p-1 px-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Edit Cashbook Entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {(row.type === 'expense' || row.type === 'withdrawal') && (
                        <button
                          onClick={() => handleDelete(row.id, row.description)}
                          className="p-1 px-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Delete Cashbook Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCashbook.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">No transaction logs recorded under database pipeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredCashbook.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* FORM MODAL POPOVER FOR CREATE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border border-[#E5E7EB] shadow-xl">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Post Cash Voucher</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white transition" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Voucher Date *</label>
                <input 
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Clause Description *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. AWS Production Cloud Bill"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {entryType === 'expense' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Expense Category *</label>
                    {!isAddingNewCat ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(true)}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        + Create Category
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(false)}
                        className="text-[10px] text-slate-500 font-bold hover:underline"
                      >
                        Use Dropdown
                      </button>
                    )}
                  </div>
                  
                  {!isAddingNewCat ? (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none"
                      required
                    >
                      <option value="General">General</option>
                      {categories.filter(c => c !== 'General').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. AWS Cloud, Rent, Wages"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const trimmed = newCatName.trim();
                          if (trimmed && onAddCategory) {
                            await onAddCategory(trimmed);
                            setCategory(trimmed);
                            setIsAddingNewCat(false);
                            setNewCatName('');
                          } else {
                            alert('Please specify a valid category name.');
                          }
                        }}
                        className="px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Type *</label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none font-bold"
                  >
                    <option value="expense" className="text-rose-600 font-bold">Debit / Payout (-)</option>
                    <option value="bank_deposit" className="text-blue-600 font-bold">Bank Deposit (+ bank)</option>
                    <option value="withdrawal" className="text-amber-600 font-bold">Bank Withdrawal (+ cash)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Account Pool *</label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none font-medium"
                  >
                    <option value="bank">HDFC Current Bank A/C</option>
                    <option value="cash">Daily Physical Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Numeric Amount (INR) *</label>
                  <input 
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-sans">Reference / Receipt ID *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. RF99120"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Drawer actions */}
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
                    'Approve Entry Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL POPOVER FOR EDIT */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border border-[#E5E7EB] shadow-xl">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Cashbook Entry</h3>
              <button onClick={() => setEditingEntry(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white transition" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Voucher Date *</label>
                <input 
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Clause Description *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. AWS Production Cloud Bill"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {entryType === 'expense' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Expense Category *</label>
                    {!isAddingNewCat ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(true)}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        + Create Category
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(false)}
                        className="text-[10px] text-slate-500 font-bold hover:underline"
                      >
                        Use Dropdown
                      </button>
                    )}
                  </div>
                  
                  {!isAddingNewCat ? (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none"
                      required
                    >
                      <option value="General">General</option>
                      {categories.filter(c => c !== 'General').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. AWS Cloud, Rent, Wages"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const trimmed = newCatName.trim();
                          if (trimmed && onAddCategory) {
                            await onAddCategory(trimmed);
                            setCategory(trimmed);
                            setIsAddingNewCat(false);
                            setNewCatName('');
                          } else {
                            alert('Please specify a valid category name.');
                          }
                        }}
                        className="px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Type *</label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none font-bold"
                  >
                    <option value="expense" className="text-rose-600 font-bold">Debit / Payout (-)</option>
                    <option value="bank_deposit" className="text-blue-600 font-bold">Bank Deposit (+ bank)</option>
                    <option value="withdrawal" className="text-amber-600 font-bold">Bank Withdrawal (+ cash)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Account Pool *</label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    <option value="bank">HDFC Current Bank A/C</option>
                    <option value="cash">Daily Physical Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Numeric Amount (INR) *</label>
                  <input 
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-sans">Reference / Receipt ID *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. RF99120"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Drawer actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEditingEntry(null)}
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
                    'Save Entry Edits'
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
