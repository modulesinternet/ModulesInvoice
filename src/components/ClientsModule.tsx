import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Edit, 
  Trash2, 
  Building, 
  TrendingUp,
  X,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { Client } from '../types';
import Pagination from './Pagination';

interface ClientsModuleProps {
  clients: Client[];
  onAddClient: (client: Partial<Client>) => Promise<void>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onSelectClientLedger: (clientId: string) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export default function ClientsModule({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onSelectClientLedger,
  canWrite = true,
  canDelete = true
}: ClientsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstIn, setGstIn] = useState('');
  const [pan, setPan] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('0');

  const handleOpenAdd = () => {
    setEditingClient(null);
    setName('');
    setEmail('');
    setPhone('');
    setGstIn('');
    setPan('');
    setBillingAddress('');
    setShippingAddress('');
    setOutstandingBalance('0');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone);
    setGstIn(c.gstIn);
    setPan(c.pan);
    setBillingAddress(c.billingAddress);
    setShippingAddress(c.shippingAddress);
    setOutstandingBalance(String(c.outstandingBalance));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !billingAddress) {
      alert("Name and Billing Address are mandatory fields.");
      return;
    }

    const upperGst = (gstIn || '').toUpperCase().trim();
    const payload: Partial<Client> = {
      name,
      email,
      phone,
      gstIn: upperGst,
      pan: pan.toUpperCase().trim() || (upperGst.length >= 12 ? upperGst.substring(2, 12) : ''),
      billingAddress,
      shippingAddress: shippingAddress || billingAddress,
      outstandingBalance: Number(outstandingBalance || 0)
    };

    if (editingClient) {
      await onUpdateClient(editingClient.id, payload);
    } else {
      await onAddClient(payload);
    }
    setIsModalOpen(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.gstIn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6" id="clients-module-container">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Client Registry</h1>
          <p className="text-sm text-slate-500">Maintain full double-entry accounts ledger profiles and PAN/GST registration tax credentials.</p>
        </div>
        {canWrite && (
          <button 
            onClick={handleOpenAdd}
            className="gradient-btn px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
            id="add-client-toolbar-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Partner</span>
          </button>
        )}
      </div>

      {/* SEARCH AND COUNTS HEADER */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Search by name, GSTIN, email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            id="client-search-field"
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 shrink-0">
          <span>Active Accounts: <b className="text-slate-800">{clients.length}</b></span>
          <span className="h-4 w-px bg-slate-200" />
          <span>Total Receivables: <b className="text-rose-600 font-mono">{formatCurrency(clients.reduce((sum, c) => sum + c.outstandingBalance, 0))}</b></span>
        </div>
      </div>

      {/* CLIENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="client-cards-grid">
        {filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((c) => (
          <div 
            key={c.id} 
            className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between"
          >
            {/* Upper Section */}
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 font-display" title={c.name}>{c.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10.5px] font-mono font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none">{c.gstIn || 'URP (Unregistered)'}</span>
                      {c.pan && <span className="text-[10.5px] font-mono text-slate-400">PAN: {c.pan}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct metrics */}
              <div className="p-3 bg-slate-50/50 rounded-xl flex items-center justify-between border border-[#E5E7EB]/50">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending Ledger Balance</span>
                  <div className={`text-sm font-bold font-mono ${c.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {formatCurrency(c.outstandingBalance)}
                  </div>
                </div>
                <button 
                  onClick={() => onSelectClientLedger(c.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100/80 transition flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>Ledger Statement</span>
                </button>
              </div>

              {/* Meta Parameters */}
              <div className="space-y-2 text-xs text-slate-600 border-t border-[#E5E7EB] pt-3">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{c.email || 'No email registered'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{c.phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-[11.5px] text-slate-500" title={c.billingAddress}>{c.billingAddress}</span>
                </div>
              </div>
            </div>

            {/* Downward Actions bar */}
            <div className="bg-slate-50/50 px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3 shrink-0">
              {canWrite && (
                <button 
                  onClick={() => handleOpenEdit(c)}
                  className="p-1 px-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg flex items-center gap-1 transition"
                >
                  <Edit className="w-3 h-3" />
                  <span>Modify</span>
                </button>
              )}
              {canDelete && (
                <button 
                  onClick={() => {
                    if(confirm(`Are you sure you want to delete ${c.name}? All unpaid invoice tracking records must be closed before deletion.`)) {
                      onDeleteClient(c.id);
                    }
                  }}
                  className="p-1 px-2 text-[11px] font-semibold text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 bg-white rounded-lg flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 col-span-full">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-semibold text-slate-700 text-sm">No client matches found</h4>
            <p className="text-xs text-slate-400 mt-1">Review your search filters or record a new client organization.</p>
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredClients.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* SLIDE-OVER FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-xl border border-[#E5E7EB]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base font-display">{editingClient ? 'Edit Corporate Partner Profile' : 'Register Corporate Client'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Organization Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Tata Steel Limited"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">GSTIN Registration (Optional)</label>
                  <input 
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27AAATT1234F1Z1"
                    value={gstIn}
                    onChange={(e) => setGstIn(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">PAN Identification Number</label>
                  <input 
                    type="text"
                    maxLength={10}
                    placeholder="e.g. AAATT1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Accounts Email</label>
                  <input 
                    type="email"
                    placeholder="accounts@firm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Contact Business Phone</label>
                  <input 
                    type="text"
                    placeholder="+91 22 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Registered Billing Address *</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Primary headquarters location address details for invoicing CGST/SGST..."
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Registered Shipping Address (Defaults to Billing)</label>
                <textarea 
                  rows={2}
                  placeholder="Specify secondary logistics destination details if different from corporate billing address..."
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {!editingClient && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Opening Balance Receivables (INR)</label>
                  <input 
                    type="number"
                    value={outstandingBalance}
                    onChange={(e) => setOutstandingBalance(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              )}

              {/* Form Actions */}
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
                  className="gradient-btn px-5 py-2 text-xs font-semibold rounded-xl shadow-md"
                >
                  {editingClient ? 'Save Changes' : 'Register Corporate Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
