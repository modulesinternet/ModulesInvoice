import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  Package, 
  CreditCard, 
  BookOpen, 
  Wallet, 
  Settings, 
  Activity, 
  HelpCircle, 
  Bell, 
  UserCheck, 
  FileCheck2,
  Lock,
  ChevronRight,
  Menu,
  X,
  RefreshCw,
  LogOut,
  Building,
  User as UserIcon,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from './services/api';
import { 
  Client, 
  Product, 
  Invoice, 
  Quotation, 
  Payment, 
  LedgerEntry, 
  CashbookEntry, 
  BusinessSettings, 
  ActivityLog, 
  Notification, 
  UserProfile,
  RolePermissions,
  UserRole
} from './types';

// Importing our highly crafted modular components
import Dashboard from './components/Dashboard';
import ClientsModule from './components/ClientsModule';
import ProductsModule from './components/ProductsModule';
import QuotationsModule from './components/QuotationsModule';
import InvoicesModule from './components/InvoicesModule';
import PaymentsModule from './components/PaymentsModule';
import LedgerModule from './components/LedgerModule';
import CashbookModule from './components/CashbookModule';
import UsersModule from './components/UsersModule';
import SettingsModule from './components/SettingsModule';

type TabType = 'dashboard' | 'invoices' | 'clients' | 'products' | 'quotations' | 'payments' | 'ledger' | 'cashbook' | 'users' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Master database state arrays
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [cashbook, setCashbook] = useState<CashbookEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  // RBAC Access management state
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    return (localStorage.getItem('active_role') as UserRole) || 'Admin';
  });
  const [appRoles, setAppRoles] = useState<RolePermissions[]>([]);

  // Outstanding ledger navigation helper
  const [ledgerSelectedClientId, setLedgerSelectedClientId] = useState<string>('');

  // Toast trigger helper
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Master fetch pipeline connecting React state variables with backend routes
  const loadMasterData = async () => {
    try {
      setLoading(true);
      const [
        dashData,
        clientsData,
        productsData,
        invoicesData,
        quotationsData,
        paymentsData,
        ledgerData,
        cashbookData,
        usersData,
        logsData,
        notificationsData,
        settingsData,
        rolesData,
        categoriesData
      ] = await Promise.all([
        api.getDashboard(),
        api.getClients(),
        api.getProducts(),
        api.getInvoices(),
        api.getQuotations(),
        api.getPayments(),
        api.getLedgers(),
        api.getCashbook(),
        api.getUsers(),
        api.getLogs(),
        api.getNotifications(),
        api.getSettings(),
        api.getRoles(),
        api.getCategories()
      ]);

      setDashboardMetrics(dashData);
      setClients(clientsData);
      setProducts(productsData);
      setInvoices(invoicesData);
      setQuotations(quotationsData);
      setPayments(paymentsData);
      setLedger(ledgerData);
      setCashbook(cashbookData);
      setUsers(usersData);
      setLogs(logsData);
      setNotifications(notificationsData);
      setBusinessSettings(settingsData);
      setAppRoles(rolesData);
      setCategories(categoriesData);
    } catch (e: any) {
      console.error("Fetch pipeline error: ", e);
      // If permission is denied because they shifted tab, keep loading other states graceful
      if (e.message?.includes("Access Denied")) {
        showToast(e.message, "error");
      } else {
        showToast("Sync warning: Double-entry pipeline online.", "info");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    const handleReSync = () => {
      loadMasterData();
    };
    window.addEventListener('re-sync-data', handleReSync);
    return () => window.removeEventListener('re-sync-data', handleReSync);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // API Callbacks inside state handlers (automatically trigger reload to fetch updated totals!)
  const handleAddClient = async (c: Partial<Client>) => {
    try {
      await api.createClient(c);
      showToast(`Corporate partner "${c.name}" registered successfully!`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateClient = async (id: string, c: Partial<Client>) => {
    try {
      await api.updateClient(id, c);
      showToast(`Partner profile updated.`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await api.deleteClient(id);
      showToast(`Successfully removed client.`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddProduct = async (p: Partial<Product>) => {
    try {
      await api.createProduct(p);
      showToast(`Catalogue item "${p.name}" listed successfully!`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateProduct = async (id: string, p: Partial<Product>) => {
    try {
      await api.updateProduct(id, p);
      showToast("Catalogue product description modified.");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      showToast("Catalogue item removed.");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddCategory = async (name: string) => {
    try {
      await api.createCategory(name);
      showToast(`Category "${name}" added successfully.`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateCategory = async (oldName: string, newName: string) => {
    try {
      await api.updateCategory(oldName, newName);
      showToast(`Category renamed to "${newName}" successfully.`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (name: string) => {
    try {
      await api.deleteCategory(name);
      showToast(`Category "${name}" has been deleted.`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddInvoice = async (inv: Partial<Invoice>) => {
    try {
      await api.createInvoice(inv);
      showToast(`Authorized & dispatched invoice!`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await api.deleteInvoice(id);
      showToast("Invoice reversed and outstanding balanced.");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateQuotation = async (q: Partial<Quotation>) => {
    try {
      await api.createQuotation(q);
      showToast(`Proposal estimate dispatched to client!`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleConvertQuotation = async (id: string) => {
    try {
      await api.convertQuotation(id);
      showToast("Approved: Proposal estimate converted to official Tax Invoice successfully!");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddPayment = async (p: Partial<Payment>) => {
    try {
      await api.createPayment(p);
      showToast(`Cleared: Added ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p.amount!)} deposit to client ledger!`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateCashbookEntry = async (entry: Partial<CashbookEntry>) => {
    try {
      await api.createCashbookEntry(entry);
      showToast("Approved: Recorded Cashbook operating voucher.");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveSettings = async (settings: Partial<BusinessSettings>) => {
    try {
      await api.saveSettings(settings);
      showToast("Approved: System firm parameters updated.");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateUser = async (u: Partial<UserProfile>) => {
    try {
      await api.createUser(u);
      showToast(`Access granted: Invited team member ${u.name}`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSelectClientLedgerTab = (clientId: string) => {
    setLedgerSelectedClientId(clientId);
    setActiveTab('ledger');
  };

  const currentRolePerms = appRoles.find(r => r.role === activeRole)?.modules;
  const hasReadPermission = (tab: TabType) => {
    if (activeRole === 'Admin') return true;
    if (!currentRolePerms) return true;
    const perm = currentRolePerms[tab as keyof RolePermissions['modules']];
    return perm?.read !== false;
  };

  const getModulePermissions = (tab: TabType) => {
    if (activeRole === 'Admin') return { read: true, write: true, delete: true };
    if (!currentRolePerms) return { read: true, write: true, delete: true };
    const perm = currentRolePerms[tab as keyof RolePermissions['modules']];
    return {
      read: perm?.read !== false,
      write: perm?.write !== false,
      delete: perm?.delete !== false
    };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col md:flex-row relative">
      
      {/* TOAST PANEL WRAPPER */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce cursor-pointer flex items-center gap-3 p-4 rounded-xl shadow-lg border text-white transition-all duration-300 max-w-sm bg-slate-900 border-slate-800">
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* BACKGROUND BACKDROP FOR MOBILE DRAWER */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden pointer-events-auto transition-opacity duration-300 no-print"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* COMPREHENSIVE SIDEBAR PANEL */}
      <aside 
        className={`bg-white border-r border-[#E5E7EB] text-slate-600 shrink-0 select-none no-print transition-all duration-300 flex flex-col justify-between fixed inset-y-0 left-0 z-50 md:relative ${
          isSidebarOpen 
            ? 'w-64 translate-x-0 shadow-2xl md:shadow-none' 
            : 'w-64 -translate-x-full md:w-20 md:translate-x-0 overflow-hidden'
        }`}
        id="erp-sidebar"
      >
        {/* Upper Brand Info */}
        <div className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B21FF] to-[#7C3AED] flex items-center justify-center font-bold text-white shadow-lg shadow-[#5B21FF]/20 font-display cursor-pointer shrink-0"
                onClick={() => {
                  if (!isSidebarOpen) setIsSidebarOpen(true);
                }}
              >
                AP
              </div>
              {isSidebarOpen && (
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 font-display">Apex<span className="text-[#5B21FF]">Billing</span></h1>
                  <span className="text-[10px] font-mono text-purple-600 block leading-tight font-semibold">Enterprises (India)</span>
                </div>
              )}
            </div>
            
            {/* Close sidebar control (mobile only, hidden on desktop to avoid redundant controls) */}
            {isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'quotations', label: 'Quotations', icon: FileCheck2 },
            { id: 'invoices', label: 'Invoices', icon: FileText },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'ledger', label: 'Accounts Ledger', icon: BookOpen },
            { id: 'cashbook', label: 'Cashbook', icon: Wallet },
            { id: 'clients', label: 'Client Registry', icon: Users },
            { id: 'users', label: 'Team Access', icon: UserCheck },
            { id: 'settings', label: 'Business Settings', icon: Settings },
          ].filter(item => hasReadPermission(item.id as TabType)).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'ledger') {
                    setLedgerSelectedClientId(''); // Reset initial selection on raw click
                  }
                  setActiveTab(item.id as TabType);
                  // Auto-collapse sidebar overlay on mobile actions
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition tracking-wide cursor-pointer ${
                  isActive 
                    ? 'bg-[#F3F0FF] text-[#5B21FF] font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-905 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#5B21FF]' : 'text-slate-400 group-hover:text-slate-705'}`} />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer info bar */}
        {isSidebarOpen && businessSettings && (
          <div className="p-4 mt-auto border-t border-[#E5E7EB]">
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5 border border-[#E5E7EB]">
              <div className="w-9 h-9 rounded-full bg-[#5B21FF] border border-white overflow-hidden shadow-sm flex items-center justify-center text-white font-bold text-xs shrink-0">
                {businessSettings.companyName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden text-left">
                <p className="text-xs font-bold truncate text-slate-850">{businessSettings.companyName}</p>
                <p className="text-[10px] text-slate-400 truncate font-mono">{businessSettings.email || 'admin@demo.com'}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE BAR TOP NAVIGATION */}
      <div className="bg-white border-b border-[#E5E7EB] text-slate-900 p-3.5 flex items-center justify-between md:hidden no-print font-sans">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 bg-slate-50 border border-[#E5E7EB] rounded-xl active:scale-95 transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B21FF] to-[#7C3AED] flex items-center justify-center font-bold text-white text-xs">AP</div>
            <span className="text-xs font-bold text-slate-900 font-display">Apex<span className="text-[#5B21FF]">Billing</span></span>
          </div>
        </div>

        {/* Professional badge avatar on right edge of mobile top header */}
        {businessSettings && (
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-[#E5E7EB] text-[10px] font-bold font-mono text-slate-500">
            {businessSettings.companyName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* MASTER SCROLLABLE COMPONENT PANEL CONTAINER */}
      <main className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        {/* Top Operational Status Bar */}
        <header className="bg-white border-b border-[#E5E7EB] p-4 shrink-0 flex items-center justify-between no-print shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* High-visibility toggle for desktop */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 bg-slate-50 border border-[#E5E7EB] rounded-xl hover:bg-slate-100 active:scale-95 transition mr-1 hidden md:block"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-4.5 h-4.5 text-slate-600" />
            </button>
            <span className="w-2 h-2 rounded-full bg-emerald-500 select-none animate-ping"></span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">live central server online</span>
          </div>

          <div className="flex items-center gap-4">
            {/* System sync button */}
            <button 
              onClick={loadMasterData}
              className="px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-slate-650 hover:bg-slate-50 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer bg-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Force Sync</span>
            </button>

            {/* Notification alert count */}
            <div className="relative">
              <span className="p-2 border border-[#E5E7EB] hover:bg-slate-50 rounded-xl cursor-default block bg-white transition">
                <Bell className="w-4 h-4 text-slate-600" />
              </span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3366] border-2 border-white rounded-full"></span>
            </div>

            {/* Acting Security Role Switcher with dynamic dispatcher */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-1 py-1 px-2 rounded-xl shadow-xs">
              <div className="hidden sm:flex flex-col text-right font-sans">
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">Acting Identity</span>
                <span className="text-[10.5px] font-bold text-indigo-650 leading-relaxed uppercase">{activeRole}</span>
              </div>
              <select
                value={activeRole}
                onChange={async (e) => {
                  const selected = e.target.value as UserRole;
                  localStorage.setItem('active_role', selected);
                  setActiveRole(selected);
                  showToast(`Access context switched to Security level: "${selected}"`, "info");
                  
                  // Re-fetch master state to run server API permission checks
                  await loadMasterData();
                }}
                className="bg-white border border-slate-200 text-[11px] font-bold py-1 px-2.5 rounded-lg text-slate-700 hover:border-indigo-300 focus:outline-none transition cursor-pointer font-sans"
                id="global-role-switcher"
              >
                <option value="Admin">🛡️ Admin Account</option>
                <option value="Manager">📈 Manager Level</option>
                <option value="Accountant">🧾 Accountant Level</option>
                <option value="Staff">👥 Staff Operator</option>
              </select>
            </div>
          </div>
        </header>

        {/* DYNAMIC COMPONENT PANEL CANVAS */}
        <div className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto" id="dynamic-element-stage">
          {loading && !dashboardMetrics ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-400 font-mono tracking-wider">Hydrating secure triple-entry financial database...</p>
            </div>
          ) : !hasReadPermission(activeTab) ? (
            /* SECURE CLEARANCE RESTRICTED VIEW */
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto shadow-sm space-y-6" id="security-barrier-card">
              <div className="w-16 h-16 mx-auto bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-500 text-2xl font-mono leading-none">
                🛡️
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold font-display text-slate-900">Security Clearance Restricted</h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-850 border border-amber-200 uppercase">
                  Acting Identity Level: [{activeRole}]
                </div>
                <p className="text-[12.5px] text-slate-500 leading-relaxed font-sans pt-2">
                  Access denied on module <b className="text-slate-800">"{activeTab.toUpperCase()}"</b>. The system security parameters configured for role <b className="text-indigo-650">"{activeRole}"</b> do not authorize module-read privileges.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const tabsList: TabType[] = ['dashboard', 'products', 'quotations', 'invoices', 'payments', 'ledger', 'cashbook', 'clients', 'users', 'settings'];
                    const firstAllowed = tabsList.find(t => hasReadPermission(t));
                    if (firstAllowed) {
                      setActiveTab(firstAllowed);
                    }
                  }}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Return to Authorized Clearance
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              {activeTab === 'dashboard' && dashboardMetrics && (
                <Dashboard 
                  metrics={dashboardMetrics.metrics}
                  paymentMethods={dashboardMetrics.paymentMethods}
                  chartData={dashboardMetrics.chartData}
                  recentInvoices={dashboardMetrics.recentInvoices}
                  topClients={dashboardMetrics.topClients}
                  onRefresh={loadMasterData}
                  onNavigate={(t) => setActiveTab(t as TabType)}
                />
              )}

              {activeTab === 'clients' && (
                <ClientsModule 
                  clients={clients}
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                  onSelectClientLedger={handleSelectClientLedgerTab}
                  canWrite={getModulePermissions('clients').write}
                  canDelete={getModulePermissions('clients').delete}
                />
              )}

              {activeTab === 'products' && (
                <ProductsModule 
                  products={products}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  canWrite={getModulePermissions('products').write}
                  canDelete={getModulePermissions('products').delete}
                  categories={categories}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              )}

              {activeTab === 'quotations' && businessSettings && (
                <QuotationsModule 
                  quotations={quotations}
                  clients={clients}
                  products={products}
                  onCreateQuotation={handleCreateQuotation}
                  onConvertQuotation={handleConvertQuotation}
                  businessSettings={businessSettings}
                  canWrite={getModulePermissions('quotations').write}
                />
              )}

              {activeTab === 'invoices' && businessSettings && (
                <InvoicesModule 
                  invoices={invoices}
                  clients={clients}
                  products={products}
                  onAddInvoice={handleAddInvoice}
                  onDeleteInvoice={handleDeleteInvoice}
                  businessSettings={businessSettings}
                  canWrite={getModulePermissions('invoices').write}
                  canDelete={getModulePermissions('invoices').delete}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentsModule 
                  payments={payments}
                  clients={clients}
                  invoices={invoices}
                  onAddPayment={handleAddPayment}
                  canWrite={getModulePermissions('payments').write}
                />
              )}

              {activeTab === 'ledger' && (
                <LedgerModule 
                  ledger={ledger}
                  clients={clients}
                  initialSelectedClientId={ledgerSelectedClientId}
                />
              )}

              {activeTab === 'cashbook' && (
                <CashbookModule 
                  cashbook={cashbook}
                  onCreateCashbookEntry={handleCreateCashbookEntry}
                  canWrite={getModulePermissions('cashbook').write}
                />
              )}

              {activeTab === 'users' && (
                <UsersModule 
                  users={users}
                  logs={logs}
                  onCreateUser={handleCreateUser}
                  canWrite={getModulePermissions('users').write}
                  canDelete={getModulePermissions('users').delete}
                />
              )}

              {activeTab === 'settings' && businessSettings && (
                <SettingsModule 
                  settings={businessSettings}
                  onSaveSettings={handleSaveSettings}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
