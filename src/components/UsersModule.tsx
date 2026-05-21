import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Activity, 
  Clock,
  X,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Check,
  Eye,
  Edit2,
  Trash2,
  Lock,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { UserProfile, ActivityLog, RolePermissions, UserRole, RoleModulePermission } from '../types';
import { api } from '../services/api';

interface UsersModuleProps {
  users: UserProfile[];
  logs: ActivityLog[];
  onCreateUser: (u: Partial<UserProfile>) => Promise<void>;
  canWrite?: boolean;
  canDelete?: boolean;
}

const MODULE_LABELS: Record<string, { label: string; desc: string }> = {
  dashboard: { label: "Financial Dashboard", desc: "Overview analytics, monthly charts, and key performance counters" },
  products: { label: "Product & Service Catalog", desc: "Align tax codes, manage units, HSN alignments, and price levels" },
  quotations: { label: "Client Estimates & Quotes", desc: "Draft proposals, set validity timelines, and generate templates" },
  invoices: { label: "Official Tax Invoices", desc: "Reconcile corporate invoices, calculate dual GST codes, and dispatch" },
  payments: { label: "Settle Collection Vouchers", desc: "Track invoice receipt clearings and bank settlement logs" },
  ledger: { label: "Double-Entry General Ledger", desc: "Audit detailed corporate ledger books by individual partner" },
  cashbook: { label: "Daily Operating Cashbook", desc: "Log manual vouchers, business cash in-hand, and banking cash flows" },
  clients: { label: "Client Accounts Registry", desc: "Add PAN/GST parameters and verify client directory balances" },
  users: { label: "Teammates Clearance & Roles", desc: "Manage operator access profiles and audit-trail logs" },
  settings: { label: "Firm Legal Profiles & settings", desc: "Modify brand details, letterheads, signoffs, and GST structures" }
};

export default function UsersModule({
  users,
  logs,
  onCreateUser,
  canWrite = true,
  canDelete = true
}: UsersModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'rbac'>('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for adding member
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleInput, setRoleInput] = useState('Staff');

  // RBAC Roles configuration state
  const [serverRoles, setServerRoles] = useState<RolePermissions[]>([]);
  const [selectedRbacRole, setSelectedRbacRole] = useState<UserRole>('Manager');
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolesFeedback, setRolesFeedback] = useState<string | null>(null);

  // Fetch roles from database on mount
  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const data = await api.getRoles();
      setServerRoles(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const formatRole = (r: string) => {
    switch(r.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'accountant': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'staff': return 'bg-slate-100 text-slate-700 border-slate-205';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      alert("Name and email are mandatory fields.");
      return;
    }

    const payload: Partial<UserProfile> = {
      name,
      email,
      role: roleInput as UserRole,
      status: 'active'
    };

    await onCreateUser(payload);
    setIsModalOpen(false);

    // reset keys
    setName('');
    setEmail('');
    setRoleInput('Staff');
  };

  // Checkbox toggle handler for permissions matrix (RBAC)
  const handlePermissionToggle = (moduleKey: string, flag: 'read' | 'write' | 'delete') => {
    if (selectedRbacRole === 'Admin') {
      alert("Admin security rules are locked. Direct access protocols active.");
      return; // Admins cannot be locked out
    }

    setServerRoles(prev => prev.map(item => {
      if (item.role === selectedRbacRole) {
        const currentModuleConfig = item.modules[moduleKey as keyof RolePermissions['modules']] || { read: false, write: false, delete: false };
        const updatedConfig = {
          ...currentModuleConfig,
          [flag]: !currentModuleConfig[flag]
        };
        return {
          ...item,
          modules: {
            ...item.modules,
            [moduleKey]: updatedConfig
          }
        };
      }
      return item;
    }));
  };

  // Commit changes to the backend db_roles map
  const handleSaveRbac = async () => {
    const config = serverRoles.find(r => r.role === selectedRbacRole);
    if (!config) return;

    try {
      setLoadingRoles(true);
      await api.updateRole(selectedRbacRole, config);
      setRolesFeedback(`CLEARANCE SAVED: Updated modular permissions for profile "${selectedRbacRole}".`);
      setTimeout(() => setRolesFeedback(null), 4000);
      
      // Force sync with the parent to reflect updated permissions instantly
      window.dispatchEvent(new CustomEvent('re-sync-data'));
    } catch (err: any) {
      alert(err.message || "Failed to commit security levels.");
    } finally {
      setLoadingRoles(false);
    }
  };

  const currentRoleConfig = serverRoles.find(r => r.role === selectedRbacRole);

  return (
    <div className="space-y-6" id="users-module-container">
      {/* Upper header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Team Access</h1>
          <p className="text-sm text-slate-500">Monitor active ERP sessions, authorize team member access, and configure granular role permission indexes.</p>
        </div>
        
        <div className="flex gap-2">
          {activeSubTab === 'members' && canWrite && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="gradient-btn px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
              id="invite-member-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs toggle bar */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('members')}
          className={`px-5 py-3 text-xs font-bold font-display uppercase tracking-wider relative ${
            activeSubTab === 'members' ? 'text-indigo-600' : 'text-slate-450 hover:text-slate-700'
          }`}
        >
          Teammates &amp; Audit Trail
          {activeSubTab === 'members' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('rbac')}
          className={`px-5 py-3 text-xs font-bold font-display uppercase tracking-wider relative flex items-center gap-2 ${
            activeSubTab === 'rbac' ? 'text-indigo-600' : 'text-slate-450 hover:text-slate-700'
          }`}
          id="rbac-config-tab"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Access Clearance Matrix</span>
          {activeSubTab === 'rbac' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {activeSubTab === 'members' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TEAM MEMBERS SHEET */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-4" id="team-members-list">
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-display">Authorized Operators</h3>
              <p className="text-[11.5px] text-slate-400 font-sans">Registered teammate accounts holding system clearance</p>
            </div>

            <div className="space-y-3">
              {users.map((usr) => (
                <div 
                  key={usr.userId} 
                  className="p-3.5 bg-slate-50 border border-[#E5E7EB] rounded-xl flex items-center justify-between hover:border-indigo-100 transition"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{usr.name}</span>
                      <span className="text-[9.5px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.2 rounded font-sans uppercase">Online</span>
                    </h4>
                    <p className="text-[10.5px] text-slate-450 font-mono">{usr.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border uppercase ${formatRole(usr.role)}`}>
                    {usr.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* COMPREHENSIVE COMPLIANCE SECURITY AUDIT LOG */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-4" id="accounting-audit-trail">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-[#E5E7EB]">
              <div className="flex items-center gap-2 text-indigo-700">
                <Activity className="w-4.5 h-4.5 animate-pulse" />
                <h3 className="font-bold text-xs uppercase tracking-wider font-display">Compliance Security Audit Log</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Status: Secure TLS Logs</span>
            </div>

            <div className="overflow-y-auto max-h-[480px] pr-2 divide-y divide-slate-100 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="py-4 flex gap-3 items-start hover:bg-slate-50/20 transition px-2 rounded-xl">
                  <div className="shrink-0 p-1.5 bg-slate-100 rounded-lg text-slate-500 mt-1">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-[10.5px] font-mono text-slate-400">{log.timestamp.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    <p className="text-slate-650 text-xs mt-1">{log.details}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-450 border-t border-dashed border-slate-100 pt-1 mt-1 font-sans">
                      <span>Operator: <b className="text-slate-650">{log.userName}</b></span>
                      <span className="h-2 w-px bg-slate-200" />
                      <span>ID: <b className="text-indigo-600 font-mono">{log.userId}</b></span>
                    </div>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">No operational logs recorded in the last 24h.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* RBAC ACCESS DETAILED CONTROLLER */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6" id="access-clearance-matrix-container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Granular Permission Assignor</span>
              </h3>
              <p className="text-xs text-slate-500">Configure real-time server permissions. Changes immediately lock access credentials across client devices &amp; API requests.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Select Role Profile:</span>
              <div className="flex bg-slate-200 p-1 rounded-xl">
                {(['Admin', 'Manager', 'Accountant', 'Staff'] as UserRole[]).map((roleOpt) => (
                  <button
                    key={roleOpt}
                    onClick={() => setSelectedRbacRole(roleOpt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                      selectedRbacRole === roleOpt
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {roleOpt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {rolesFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-bold leading-none select-none">
              <Sparkles className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              <span>{rolesFeedback}</span>
            </div>
          )}

          {/* Clearance Matrix List */}
          <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-150">
                <tr>
                  <th className="py-3 px-5">System Module / Resource</th>
                  <th className="py-3 px-4 text-center w-32">Read Clearance</th>
                  <th className="py-3 px-4 text-center w-32">Write / Create</th>
                  <th className="py-3 px-4 text-center w-32">Delete / Purge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRoleConfig ? (
                  Object.entries(currentRoleConfig.modules).map(([modKey, permVal]) => {
                    const perm = permVal as RoleModulePermission;
                    const info = MODULE_LABELS[modKey] || { label: modKey, desc: "System resource module" };
                    const isLocked = selectedRbacRole === 'Admin';
                    return (
                      <tr key={modKey} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-5 space-y-0.5">
                          <h4 className="font-bold text-slate-800 text-xs font-display">{info.label}</h4>
                          <p className="text-[10.5px] text-slate-450">{info.desc}</p>
                        </td>
                        
                        {/* Read Permission Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={perm.read}
                              disabled={isLocked || !canWrite}
                              onChange={() => handlePermissionToggle(modKey, 'read')}
                              className="sr-only peer"
                            />
                            <div className={`w-9 h-5 rounded-full relative transition border duration-250 ${
                              perm.read 
                                ? 'bg-indigo-600 border-indigo-700' 
                                : 'bg-slate-200 border-slate-300'
                            }`}>
                              <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-250 ${
                                perm.read ? 'left-4.5' : 'left-0.5'
                              }`} />
                            </div>
                          </label>
                        </td>

                        {/* Write Permission Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={perm.write}
                              disabled={isLocked || !canWrite}
                              onChange={() => handlePermissionToggle(modKey, 'write')}
                              className="sr-only peer"
                            />
                            <div className={`w-9 h-5 rounded-full relative transition border duration-250 ${
                              perm.write 
                                ? 'bg-indigo-600 border-indigo-700' 
                                : 'bg-slate-200 border-slate-300'
                            }`}>
                              <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-250 ${
                                perm.write ? 'left-4.5' : 'left-0.5'
                              }`} />
                            </div>
                          </label>
                        </td>

                        {/* Delete Permission Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={perm.delete}
                              disabled={isLocked || !canWrite}
                              onChange={() => handlePermissionToggle(modKey, 'delete')}
                              className="sr-only peer"
                            />
                            <div className={`w-9 h-5 rounded-full relative transition border duration-250 ${
                              perm.delete 
                                ? 'bg-indigo-600 border-indigo-700' 
                                : 'bg-slate-200 border-slate-300'
                            }`}>
                              <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-250 ${
                                perm.delete ? 'left-4.5' : 'left-0.5'
                              }`} />
                            </div>
                          </label>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic font-mono flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Syncing access matrices from cloud node...</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex md:items-center justify-between flex-col md:flex-row gap-4 p-4 rounded-xl bg-slate-900 text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 text-yellow-405 border border-yellow-500/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="space-y-0.5 max-w-lg">
                <span className="text-[9px] uppercase font-bold text-yellow-400 tracking-widest font-mono">system re-assignment rule</span>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">Updating the permission indexes will immediately re-index all user clearance tokens, forcing server updates and restricting active client connections.</p>
              </div>
            </div>

            <button
              onClick={handleSaveRbac}
              disabled={loadingRoles || selectedRbacRole === 'Admin' || !canWrite}
              className={`py-2 px-5 font-bold font-display text-xs text-slate-900 rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
                selectedRbacRole === 'Admin' || !canWrite
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 cursor-pointer'
              }`}
            >
              {loadingRoles ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-indigo-700" />
              )}
              <span>Commit Clearance parameters</span>
            </button>
          </div>
        </div>
      )}

      {/* RE-AUTH/INVITE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border border-[#E5E7EB] shadow-xl">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Add New Member</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white transition" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Operator full Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Satish K. Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Email Address *</label>
                <input 
                  type="email"
                  required
                  placeholder="e.g. satish@firm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">System Security Role *</label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                >
                  <option value="Admin">Administrator / Principal Director</option>
                  <option value="Manager">Manager / Senior Partner</option>
                  <option value="Accountant">Certified Accountant / Auditor</option>
                  <option value="Staff">Associate ERP Staff</option>
                </select>
              </div>

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
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
