import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Printer, 
  Building2, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { LedgerEntry, Client, formatDisplayDate } from '../types';
import Pagination from './Pagination';

interface LedgerModuleProps {
  ledger: LedgerEntry[];
  clients: Client[];
  initialSelectedClientId?: string;
  businessSettings?: any;
}

export default function LedgerModule({
  ledger,
  clients,
  initialSelectedClientId = '',
  businessSettings
}: LedgerModuleProps) {
  const [selectedClientId, setSelectedClientId] = useState(initialSelectedClientId || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(businessSettings?.currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: businessSettings?.currency || 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const selectedClientObj = clients.find(c => c.id === selectedClientId);

  // Filter entries for selected customer
  const clientLedger = ledger.filter(entry => entry.clientId === selectedClientId)
    .sort((a,b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  // Compute overall columns on the fly
  const totalDebits = clientLedger.filter(l => l.type === 'debit').reduce((s,l) => s + l.amount, 0);
  const totalCredits = clientLedger.filter(l => l.type === 'credit').reduce((s,l) => s + l.amount, 0);
  const closingBalance = selectedClientObj ? selectedClientObj.outstandingBalance : (totalDebits - totalCredits);

  // Group ledger entries by client for company-wise breakdown inside "All" view
  const companyWiseBreakdown = clients.map(client => {
    const clientEntries = ledger.filter(entry => entry.clientId === client.id)
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    const debits = clientEntries.filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0);
    const credits = clientEntries.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
    return {
      client,
      entries: clientEntries,
      totalDebits: debits,
      totalCredits: credits,
      closingBalance: client.outstandingBalance || (debits - credits)
    };
  });

  const aggregateDebitsAll = ledger.filter(l => l.type === 'debit').reduce((s,l) => s + l.amount, 0);
  const aggregateCreditsAll = ledger.filter(l => l.type === 'credit').reduce((s,l) => s + l.amount, 0);
  const aggregateClosingAll = clients.reduce((s, c) => s + (c.outstandingBalance || 0), 0);

  return (
    <div className="space-y-6" id="client-ledger-module">
      {/* Upper toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm no-print">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-base font-display">Accounts Ledger</h2>
        </div>
        
        {/* Dropdown selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-semibold uppercase">Select Customer A/C:</span>
          <select
            value={selectedClientId}
            onChange={(e) => { setSelectedClientId(e.target.value); setCurrentPage(1); }}
            className="text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none"
            id="ledger-client-dropdown"
          >
            <option value="all">-- All Customers (Company-Wise) --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button 
            onClick={() => window.print()}
            className="p-2.5 border border-slate-200 hover:border-[#5B21FF] bg-white text-slate-600 hover:text-[#5B21FF] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {selectedClientId === 'all' ? (
        <div className="space-y-8 animate-fade-in" id="ledger-printable-payload-all">
          {/* Consolidated Overview section */}
          <div className="bg-slate-900 border border-slate-850 p-6 md:p-8 rounded-3xl text-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Consolidated Accounts Registry</span>
                <h3 className="text-lg font-black uppercase tracking-wide font-mono mt-0.5 text-white">All Subsidiary Customers Ledger</h3>
              </div>
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider">
                Enterprise Reconciliation Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Outstanding Receivables</span>
                <h3 className="text-2xl font-black font-mono text-rose-400">{formatCurrency(aggregateClosingAll)}</h3>
                <p className="text-[10px] text-slate-500">Consolidated balance sheet exposure across clients</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Invoice Value</span>
                <h3 className="text-2xl font-black font-mono text-white">{formatCurrency(aggregateDebitsAll)}</h3>
                <p className="text-[10px] text-slate-500">Accumulated billing outlays generated</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Collected Credits</span>
                <h3 className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(aggregateCreditsAll)}</h3>
                <p className="text-[10px] text-slate-500">Reconciled wire and cashbank entries</p>
              </div>
            </div>
          </div>

          {/* Company-Wise Ledger Loops */}
          <div className="space-y-10">
            {companyWiseBreakdown.map(({ client, entries, totalDebits: cDebits, totalCredits: cCredits, closingBalance: cClosing }) => (
              <div key={client.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition page-break-after-avoid">
                {/* Header card info */}
                <div className="p-5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono uppercase tracking-widest inline-block">
                      {client.gstIn || 'Unregistered Partner'}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase font-sans">
                      {client.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">ID: {client.id.slice(0, 8).toUpperCase()} | Contact: {client.phone || 'N/A'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-center">
                      <span className="text-[8px] text-slate-400 uppercase font-bold block">Invoice Value</span>
                      <span className="text-xs font-mono font-bold text-slate-700">{formatCurrency(cDebits)}</span>
                    </div>
                    <div className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-center">
                      <span className="text-[8px] text-slate-400 uppercase font-bold block">Credits</span>
                      <span className="text-xs font-mono font-bold text-emerald-600">{formatCurrency(cCredits)}</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl border text-center ${cClosing > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-150 text-emerald-700'}`}>
                      <span className="text-[8px] uppercase font-bold block opacity-75">Outstanding</span>
                      <span className="text-xs font-mono font-black">{formatCurrency(cClosing)}</span>
                    </div>
                  </div>
                </div>

                {/* Individual ledger lines */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3 px-5">Date</th>
                        <th className="py-3 px-5">Invoice No</th>
                        <th className="py-3 px-5">Ref / ID</th>
                        <th className="py-3 px-5">Description Particulars</th>
                        <th className="py-3 px-5 text-right">Invoice Value (+)</th>
                        <th className="py-3 px-5 text-right">Credit (-)</th>
                        <th className="py-3 px-5 text-right font-mono">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {/* Base Forward Row */}
                      <tr className="bg-slate-50/20">
                        <td className="py-2.5 px-5 text-slate-400 font-mono">2026-04-01</td>
                        <td className="py-2.5 px-5 font-mono text-slate-400">N/A</td>
                        <td className="py-2.5 px-5 font-mono text-slate-400">OPB-01</td>
                        <td className="py-2.5 px-5 italic text-slate-450">Opening balance forward</td>
                        <td className="py-2.5 px-5 text-right font-mono text-slate-500">
                          {formatCurrency(cDebits - cCredits - cClosing > 0 ? (cDebits - cCredits - cClosing) : 0)}
                        </td>
                        <td className="py-2.5 px-5 text-right font-mono text-slate-400">-</td>
                        <td className="py-2.5 px-5 text-right font-mono font-bold text-slate-400">FORWARD</td>
                      </tr>

                      {entries.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/10">
                          <td className="py-2.5 px-5 text-slate-500 font-mono">{formatDisplayDate(row.date)}</td>
                          <td className="py-2.5 px-5 font-mono font-bold text-indigo-600 uppercase">{row.invoiceNumber || 'N/A'}</td>
                          <td className="py-2.5 px-5 font-mono font-bold text-slate-700 uppercase">
                            <div>{row.referenceNum || row.referenceId}</div>
                            {row.bankRef && <div className="text-[10px] text-indigo-600 font-sans font-bold normal-case mt-0.5">Ref ID: {row.bankRef}</div>}
                          </td>
                          <td className="py-2.5 px-5 text-slate-605 text-slate-600 font-medium">{row.description}</td>
                          <td className="py-2.5 px-5 text-right font-mono font-bold text-rose-600">
                            {row.type === 'debit' ? formatCurrency(row.amount) : '-'}
                          </td>
                          <td className="py-2.5 px-5 text-right font-mono font-bold text-emerald-600">
                            {row.type === 'credit' ? formatCurrency(row.amount) : '-'}
                          </td>
                          <td className="py-2.5 px-5 text-right font-mono font-medium">
                            <span className="text-slate-500 font-semibold">{formatCurrency(row.runningBalance || 0)}</span>
                          </td>
                        </tr>
                      ))}

                      {entries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-400 italic font-sans text-xs">No entries recorded in current period.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedClientObj ? (
        <div className="space-y-6" id="ledger-printable-payload">
          {/* Card Meta Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="ledger-stats-row">
            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Client Account Particulars</span>
              <h4 className="font-bold text-slate-800 text-sm mt-1">{selectedClientObj.name}</h4>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 mt-2 rounded max-w-max uppercase">{selectedClientObj.gstIn || 'URP'}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Invoice Value</span>
              <h3 className="text-xl font-bold font-mono text-rose-600 mt-2">{formatCurrency(totalDebits)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Sum of accounts receivable despatches</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Crypt Credits Match</span>
              <h3 className="text-xl font-bold font-mono text-emerald-600 mt-2">{formatCurrency(totalCredits)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Cleared deposits and wire bank orders</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${closingBalance > 0 ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
              <span className="text-[10px] uppercase font-bold block opacity-75">Current Closing Balance Due</span>
              <h3 className="text-xl font-extrabold font-display font-mono mt-2">{formatCurrency(closingBalance)}</h3>
              <p className="text-[10px] opacity-75 mt-1">{closingBalance > 0 ? 'Outstanding amount due' : 'Ledger cleanly reconciled'}</p>
            </div>
          </div>

          {/* Core Table Lines */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-[#E5E7EB] flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 uppercase tracking-wide">Ledger Lines (running chronologically)</span>
              <span className="text-slate-400 text-[11px]">System Status: Certified ABAC Verified</span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB]">
                  <th className="py-3 px-5">Entry Date</th>
                  <th className="py-3 px-5">Invoice No</th>
                  <th className="py-3 px-5">Transactions Code</th>
                  <th className="py-3 px-5">Description Clause</th>
                  <th className="py-3 px-5 text-right">Invoice Value (+)</th>
                  <th className="py-3 px-5 text-right">Credit columns (-)</th>
                  <th className="py-3 px-5 text-right font-mono">Closing Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {/* Seed opening row */}
                <tr className="bg-slate-50/50">
                  <td className="py-3.5 px-5 text-slate-400 font-mono">2026-04-01</td>
                  <td className="py-3.5 px-5 font-mono text-slate-450 uppercase">N/A</td>
                  <td className="py-3.5 px-5 font-mono text-slate-450 uppercase">OPB-001</td>
                  <td className="py-3.5 px-5 font-medium italic text-slate-500">Account Opening Balance Forward</td>
                  <td className="py-3.5 px-5 text-right font-mono font-semibold text-slate-600">
                    {formatCurrency(totalDebits - totalCredits - closingBalance > 0 ? (totalDebits - totalCredits - closingBalance) : 0)}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-emerald-600">-</td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-700">
                    {formatCurrency(totalDebits - totalCredits - closingBalance > 0 ? (totalDebits - totalCredits - closingBalance) : 0)}
                  </td>
                </tr>

                {clientLedger.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/20">
                    <td className="py-3.5 px-5 text-slate-500 font-mono">{formatDisplayDate(row.date)}</td>
                    <td className="py-3.5 px-5 font-mono font-bold text-indigo-600 uppercase">{row.invoiceNumber || 'N/A'}</td>
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-800 uppercase">
                      <div>{row.referenceNum || row.referenceId}</div>
                      {row.bankRef && <div className="text-[10px] text-indigo-600 font-sans font-bold normal-case mt-0.5">Ref ID: {row.bankRef}</div>}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 font-medium">{row.description}</td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-rose-600">
                      {row.type === 'debit' ? formatCurrency(row.amount) : '-'}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-600">
                      {row.type === 'credit' ? formatCurrency(row.amount) : '-'}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-800">
                      <span className="text-slate-800">{formatCurrency(row.runningBalance || 0)}</span>
                    </td>
                  </tr>
                ))}

                {clientLedger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 italic">No additional journal voucher entries recorded for this client.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={clientLedger.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 text-sm">Designate a client account</h4>
          <p className="text-xs text-slate-400 mt-1">Select any corporate partner from the list to preview their audit statement.</p>
        </div>
      )}
    </div>
  );
}
