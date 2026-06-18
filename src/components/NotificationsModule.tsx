import React, { useState } from 'react';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Calendar,
  Clock,
  Inbox
} from 'lucide-react';
import { Notification } from '../types';

interface NotificationsModuleProps {
  notifications: Notification[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function NotificationsModule({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete
}: NotificationsModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'success' | 'warning' | 'info'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-indigo-650 text-indigo-505 text-indigo-600 shrink-0" />;
    }
  };

  const getBadgeClass = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-800 border-emerald-150';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-150';
      case 'info':
      default:
        return 'bg-indigo-50 text-indigo-800 border-indigo-150';
    }
  };

  // Filter & Search logic
  const filtered = notifications.filter(n => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'unread' && !n.isRead) ||
      (statusFilter === 'read' && n.isRead);

    return matchesSearch && matchesType && matchesStatus;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 font-sans animate-fade-in" id="notifications-history-module">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600 animate-swing" />
            <span>Operational Notification History</span>
          </h1>
          <p className="text-sm text-slate-500">
            Audit high-priority billing alerts, bank transactions, and ledger activity entries.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-indigo-100/50 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total System Alerts</span>
          <span className="text-2xl font-black text-slate-900 font-mono leading-none">{notifications.length}</span>
        </div>
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Unread Alerts</span>
          <span className="text-2xl font-black text-rose-600 font-mono leading-none">{unreadCount}</span>
        </div>
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Read / Audited</span>
          <span className="text-2xl font-black text-emerald-600 font-mono leading-none">{notifications.length - unreadCount}</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 border border-[#E5E7EB] rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 group">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-450 text-slate-400 group-focus-within:text-indigo-600 transition" />
          </span>
          <input
            type="search"
            placeholder="Search within notifications, titles, messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition leading-normal font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer font-semibold text-slate-650"
            >
              <option value="all">All Notification Types</option>
              <option value="success">Success / Payments</option>
              <option value="warning">Warnings/Alerts</option>
              <option value="info">System Info</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer font-semibold text-slate-650"
          >
            <option value="all">All Read Statuses</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
        </div>
      </div>

      {/* Primary list */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <Inbox className="w-8 h-8 text-slate-300" strokeWidth={1} />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="font-bold text-slate-700 text-sm font-display">No registered notifications</h3>
              <p className="text-xs text-slate-400 leading-normal">
                No system operational notices met the current search parameters or filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const dt = new Date(item.createdAt);
              return (
                <div 
                  key={item.id} 
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${
                    item.isRead ? 'bg-white hover:bg-slate-50/30' : 'bg-[#F9FAFB]/90 hover:bg-[#F3F4F6]/50 border-l-4 border-indigo-600 pl-4'
                  }`}
                >
                  <div className="flex items-start gap-3.5 max-w-3xl">
                    <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${getBadgeClass(item.type)}`}>
                      {getIcon(item.type)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-800 leading-none">{item.title}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border font-sans select-none ${getBadgeClass(item.type)}`}>
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-505 text-slate-500 leading-relaxed">{item.message}</p>
                      
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-350" />
                          {dt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-350" />
                          {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    {!item.isRead && (
                      <button
                        onClick={() => onMarkRead(item.id)}
                        className="px-3 py-1.5 text-indigo-700 bg-indigo-50 border border-indigo-100/50 hover:bg-indigo-100 rounded-xl text-[10px] font-bold cursor-pointer transition select-none leading-none"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 border border-slate-200 text-slate-450 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl cursor-pointer transition"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
