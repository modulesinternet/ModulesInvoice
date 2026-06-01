import React from 'react';
import { formatDisplayDate } from '../types';
import { 
  IndianRupee, 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle, 
  Briefcase, 
  ShieldAlert,
  Wallet,
  Building2,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardProps {
  metrics: {
    totalRevenue: number;
    totalInvoicesValue: number;
    unpaidInvoicesValue: number;
    totalOutstanding: number;
    totalClientsCount: number;
    totalInvoicesCount: number;
    pendingInvoicesCount: number;
    cashBalance: number;
    bankBalance: number;
  };
  paymentMethods: Array<{ name: string; value: number; color: string }>;
  chartData: Array<{ month: string; billed: number; collected: number }>;
  recentInvoices: Array<{ id: string; invoiceNumber: string; clientName: string; total: number; status: string; date: string }>;
  topClients: Array<{ name: string; amount: number }>;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
  businessSettings?: any;
}

export default function Dashboard({
  metrics,
  paymentMethods,
  chartData,
  recentInvoices,
  topClients,
  onRefresh,
  onNavigate,
  businessSettings
}: DashboardProps) {
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(businessSettings?.currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: businessSettings?.currency || 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'partially_paid': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'unpaid': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Welcome & Quick actions bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time workspace monitoring cashbook ledger status and billing analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('invoices')}
            className="gradient-btn px-4 py-2 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2"
            id="quick-raise-invoice-btn"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Invoice</span>
          </button>
        </div>
      </div>

      {/* Grid STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        {/* Total Billed Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-start justify-between relative overflow-hidden" id="stat-revenue">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-[#5B21FF]">
            <TrendingUp className="w-24 h-24 stroke-[1]" />
          </div>
          <div className="space-y-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Collections Received</span>
            <h3 className="text-2xl font-bold text-slate-900 font-display">{formatCurrency(metrics.totalRevenue)}</h3>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>100% matched to cashbook</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Total Outstanding receivables */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-start justify-between relative overflow-hidden" id="stat-outstanding">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-rose-600">
            <AlertCircle className="w-24 h-24 stroke-[1]" />
          </div>
          <div className="space-y-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Outstanding</span>
            <h3 className="text-2xl font-bold text-slate-900 font-display">{formatCurrency(metrics.totalOutstanding)}</h3>
            <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{metrics.pendingInvoicesCount} invoices pending</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Corporate Clients */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-start justify-between relative overflow-hidden" id="stat-clients">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-indigo-600">
            <Users className="w-24 h-24 stroke-[1]" />
          </div>
          <div className="space-y-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Clients</span>
            <h3 className="text-2xl font-bold text-slate-900 font-display">{metrics.totalClientsCount}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>{metrics.totalClientsCount} registered client accounts</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Total Accounts Value Billed */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-start justify-between relative overflow-hidden" id="stat-invoices">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-purple-600">
            <FileText className="w-24 h-24 stroke-[1]" />
          </div>
          <div className="space-y-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Invoice Bookings</span>
            <h3 className="text-2xl font-bold text-slate-900 font-display">{formatCurrency(metrics.totalInvoicesValue)}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{metrics.totalInvoicesCount} total raised</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Cashbook operating liquidity overview banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden" id="liquidity-banner">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded text-[10px] bg-indigo-500 text-white font-bold uppercase tracking-wider">operating ledger</div>
            <span className="text-xs text-slate-400 font-mono">System ID: APX-LIQ-POOL</span>
          </div>
          <h2 className="text-lg font-bold font-display text-slate-100">Liquidity Distribution Accounts</h2>
          <p className="text-xs text-slate-300 max-w-xl">This monitor tallies cash on-hand with bank-reconciled digital settlements computed from verified receipts.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto shrink-0 justify-between md:justify-end">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 w-36 md:w-44 text-center">
            <div className="flex items-center gap-1 justify-center text-slate-400 text-xs mb-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cash Register</span>
            </div>
            <p className="text-lg font-bold font-mono text-slate-50">{formatCurrency(metrics.cashBalance)}</p>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 w-36 md:w-44 text-center">
            <div className="flex items-center gap-1 justify-center text-slate-400 text-xs mb-1">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>HDFC Current A/C</span>
            </div>
            <p className="text-lg font-bold font-mono text-slate-50">{formatCurrency(metrics.bankBalance)}</p>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-grid-container">
        {/* Main Billed vs Collected Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm lg:col-span-2 space-y-4" id="main-revenue-chart">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold font-display text-slate-900 text-lg">Billing & Reconciliations</h3>
              <p className="text-xs text-slate-400">Comparing raised invoice value with cleared payments by calendar month</p>
            </div>
            <span className="text-[11px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded">INR Lakhs</span>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                />
                <Legend verticalAlign="top" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingBottom: 15 }} />
                <Bar name="Total Billed" dataKey="billed" fill="#5B21FF" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar name="Co-Reconciled Receipts" dataKey="collected" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Channels Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col justify-between space-y-4" id="pie-channels-chart">
          <div>
            <h3 className="font-semibold font-display text-slate-900 text-lg">Acquisition Channels</h3>
            <p className="text-xs text-slate-400">Cumulative collection split by physical and digital settlement gateways</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Total</span>
              <p className="text-sm font-bold font-mono text-slate-800">{formatCurrency(metrics.totalRevenue)}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-50">
            {paymentMethods.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-slate-600 font-medium">{m.name}</span>
                </div>
                <span className="font-mono text-slate-800 font-semibold">{formatCurrency(m.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT INVOICES & TOP CLIENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-lists">
        {/* Recent Invoices Raised */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm lg:col-span-2 space-y-4" id="recent-invoices-list">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold font-display text-slate-900 text-lg">Audit Ledger Feed</h3>
              <p className="text-xs text-slate-400">Newly dispatched corporate invoice requests</p>
            </div>
            <button 
              onClick={() => onNavigate('invoices')}
              className="text-xs text-[#5B21FF] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage Invoices</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Value</th>
                  <th className="py-2.5 px-3 text-center">Receipt Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 group transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{inv.clientName}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDisplayDate(inv.date)}</td>
                    <td className="py-3 px-3 text-right font-semibold font-mono text-slate-800">{formatCurrency(inv.total)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(inv.status)} uppercase`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Paying Corporate Clients */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4" id="top-clients-list">
          <div>
            <h3 className="font-semibold font-display text-slate-900 text-lg">Enterprise Accounts</h3>
            <p className="text-xs text-slate-400">Ranked by aggregate billed scope bookings</p>
          </div>

          <div className="space-y-3">
            {topClients.map((client, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                    #{index + 1}
                  </div>
                  <div className="max-w-[150px] md:max-w-none">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{client.name}</h4>
                    <span className="text-[10px] text-slate-400">Billed Accounts</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#5B21FF]">{formatCurrency(client.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
