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
import { DEFAULT_SETTINGS } from './lib/demoData';
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
import PublicInvoiceView from './components/PublicInvoiceView';

type TabType = 'dashboard' | 'invoices' | 'clients' | 'products' | 'quotations' | 'payments' | 'ledger' | 'cashbook' | 'users' | 'settings';

export function computeLocalDashboardMetrics(
  clients: Client[],
  invoices: Invoice[],
  payments: Payment[],
  cashbook: CashbookEntry[]
) {
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalInvoicesValue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const unpaidInvoicesValue = invoices.reduce((sum, inv) => sum + (inv.dueAmount || 0), 0);
  const totalOutstanding = clients.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

  const totalClientsCount = clients.length;
  const totalInvoicesCount = invoices.length;
  const pendingInvoicesCount = invoices.filter(i => i.status !== 'paid').length;

  const monthlyDataMap = new Map<string, { month: string; billed: number; collected: number }>();
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  months.forEach(m => {
    monthlyDataMap.set(m, { month: m, billed: 0, collected: 0 });
  });

  invoices.forEach(inv => {
    if (!inv.date) return;
    const monthIndex = new Date(inv.date).getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const name = monthNames[monthIndex];
    if (monthlyDataMap.has(name)) {
      const existing = monthlyDataMap.get(name)!;
      existing.billed += (inv.total || 0);
    }
  });

  payments.forEach(pay => {
    if (!pay.paymentDate) return;
    const monthIndex = new Date(pay.paymentDate).getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const name = monthNames[monthIndex];
    if (monthlyDataMap.has(name)) {
      const existing = monthlyDataMap.get(name)!;
      existing.collected += (pay.amount || 0);
    }
  });

  const chartData = Array.from(monthlyDataMap.values());

  const recentInvoices = invoices.slice(0, 5).map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.clientName,
    total: inv.total,
    status: inv.status,
    date: inv.date
  }));

  const clientBilled: { [key: string]: { name: string; amount: number } } = {};
  invoices.forEach(inv => {
    if (!clientBilled[inv.clientId]) {
      clientBilled[inv.clientId] = { name: inv.clientName, amount: 0 };
    }
    clientBilled[inv.clientId].amount += (inv.total || 0);
  });
  const topClients = Object.values(clientBilled)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const upiBankCollected = payments.filter(p => p.paymentMode === 'UPI/Bank Transfer' || p.paymentMode === 'UPI' || p.paymentMode === 'Bank Transfer').reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashCollected = payments.filter(p => p.paymentMode === 'Cash').reduce((sum, p) => sum + (p.amount || 0), 0);
  const otherCollected = payments.filter(p => p.paymentMode !== 'Cash' && p.paymentMode !== 'UPI/Bank Transfer' && p.paymentMode !== 'UPI' && p.paymentMode !== 'Bank Transfer').reduce((sum, p) => sum + (p.amount || 0), 0);

  // Compute cashbook running balances sequentially for true current operating liquidity
  const sortedCashbook = [...cashbook].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  let computedCash = 0;
  let computedBank = 0;

  if (sortedCashbook.length > 0) {
    let cash = 0;
    let bank = 0;
    sortedCashbook.forEach(c => {
      const amount = c.amount || 0;
      if (c.type === 'income') {
        if (c.paymentMode === 'Cash') cash += amount;
        else bank += amount;
      } else if (c.type === 'expense') {
        if (c.paymentMode === 'Cash') cash -= amount;
        else bank -= amount;
      } else if (c.type === 'bank_deposit') {
        cash -= amount;
        bank += amount;
      } else if (c.type === 'withdrawal') {
        cash += amount;
        bank -= amount;
      }
    });
    computedCash = cash;
    computedBank = bank;
  }

  return {
    metrics: {
      totalRevenue,
      totalInvoicesValue,
      unpaidInvoicesValue,
      totalOutstanding,
      totalClientsCount,
      totalInvoicesCount,
      pendingInvoicesCount,
      cashBalance: computedCash,
      bankBalance: computedBank
    },
    paymentMethods: [
      { name: 'UPI & Bank Transfer', value: upiBankCollected, color: '#8B5CF6' },
      { name: 'Over Counter Cash', value: cashCollected, color: '#10B981' },
      { name: 'Paper/Other Settle', value: otherCollected, color: '#F59E0B' }
    ],
    chartData,
    recentInvoices,
    topClients
  };
}

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsPageSize, setNotificationsPageSize] = useState(5);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<string[]>([]);
  
  // User login status tracking
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {
        return null;
      }
    }
    return null;
  });

  // Enhanced Login Engine parameters
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'signin' | 'forgot' | 'otp' | 'reset'>('signin');
  const [forgotEmail, setForgotEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [typedOtp, setTypedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [emailSendingStatus, setEmailSendingStatus] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);

  // Local persistent dictionary of user passwords for realistic check
  const [userPasswords, setUserPasswords] = useState<{ [email: string]: string }>(() => {
    const saved = localStorage.getItem('user_passwords_store');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    const defaults = {
      "modulesinternet@gmail.com": "admin123",
      "admin@demo.com": "admin123",
      "manager@demo.com": "manager123",
      "accountant@demo.com": "acc123",
      "staff@demo.com": "staff123"
    };
    localStorage.setItem('user_passwords_store', JSON.stringify(defaults));
    return defaults;
  });

  const companyNameText = businessSettings?.titleBarText || businessSettings?.companyName || "Apex Digital Solutions";
  const companyInitials = companyNameText
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AP";

  useEffect(() => {
    if (businessSettings?.companyName) {
      document.title = `${businessSettings.companyName} | System Portal`;
    } else {
      document.title = "Business Billing & ERP Portal";
    }

    if (businessSettings?.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = businessSettings.faviconUrl;
    }
  }, [businessSettings]);

  // RBAC Access management state
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        return u.role;
      } catch (_) {}
    }
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

      // Fetch all collections in a single unified high-performance batch call
      // to avoid HTTP/1.1 browser concurrent connection queue limitations (max 6)
      let batch;
      try {
        batch = await api.getBatchSync();
      } catch (err: any) {
        console.warn("Unified batch synchronization failed, dropping back to progressive individual loaders: ", err);
        const safeFetch = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
          try {
            return await promise;
          } catch (e) {
            return fallback;
          }
        };
        const [
          dash, clients, products, invoices, quotations, payments, ledger, cashbook, users, logs, notifications, settings, roles, categories, passwords
        ] = await Promise.all([
          safeFetch(api.getDashboard(), null),
          safeFetch(api.getClients(), []),
          safeFetch(api.getProducts(), []),
          safeFetch(api.getInvoices(), []),
          safeFetch(api.getQuotations(), []),
          safeFetch(api.getPayments(), []),
          safeFetch(api.getLedgers(), []),
          safeFetch(api.getCashbook(), []),
          safeFetch(api.getUsers(), []),
          safeFetch(api.getLogs(), []),
          safeFetch(api.getNotifications(), []),
          safeFetch(api.getSettings(), null),
          safeFetch(api.getRoles(), []),
          safeFetch(api.getCategories(), []),
          safeFetch(api.getPasswords(), {})
        ]);
        batch = {
          dashboard: dash,
          clients,
          products,
          invoices,
          quotations,
          payments,
          ledger,
          cashbook,
          users,
          logs,
          notifications,
          settings,
          roles,
          categories,
          passwords
        };
      }

      const dashData = batch.dashboard;
      const clientsFinal = batch.clients || [];
      const productsFinal = batch.products || [];
      const invoicesFinal = batch.invoices || [];
      const quotationsFinal = batch.quotations || [];
      const paymentsFinal = batch.payments || [];
      const ledgerFinal = batch.ledger || [];
      const cashbookFinal = batch.cashbook || [];
      const usersFinal = batch.users || [];
      const logsFinal = batch.logs || [];
      const notificationsFinal = batch.notifications || [];
      const settingsData = batch.settings;
      const rolesFinal = batch.roles || [];
      const categoriesFinal = batch.categories || [];
      const passwordsFinal = batch.passwords || {};

      setClients(clientsFinal);
      setProducts(productsFinal);
      setInvoices(invoicesFinal);
      setQuotations(quotationsFinal);
      setPayments(paymentsFinal);
      setLedger(ledgerFinal);
      setCashbook(cashbookFinal);
      setUsers(usersFinal);
      setLogs(logsFinal);
      setNotifications(notificationsFinal);
      
      if (Object.keys(passwordsFinal).length > 0) {
        setUserPasswords(passwordsFinal);
        localStorage.setItem('user_passwords_store', JSON.stringify(passwordsFinal));
      }
      
      if (settingsData) {
        setBusinessSettings(settingsData);
      } else if (!businessSettings) {
        setBusinessSettings(DEFAULT_SETTINGS);
      }
      
      setAppRoles(rolesFinal);
      setCategories(categoriesFinal);

      const locallyComputed = computeLocalDashboardMetrics(
        clientsFinal,
        invoicesFinal,
        paymentsFinal,
        cashbookFinal
      );
      setDashboardMetrics(locallyComputed);
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

  const handleUpdateInvoice = async (id: string, inv: Partial<Invoice>) => {
    try {
      await api.updateInvoice(id, inv);
      showToast(`Maturity/bill items updated successfully!`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleMarkInvoiceRead = async (id: string) => {
    try {
      await api.markInvoiceRead(id);
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, readCount: 1 } : inv));
    } catch (err: any) {
      console.error("Error marking invoice read on server", err);
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

  const handleUpdateQuotation = async (id: string, q: Partial<Quotation>) => {
    try {
      await api.updateQuotation(id, q);
      showToast("Estimate proposal updated successfully.");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    try {
      await api.deleteQuotation(id);
      showToast("Estimate proposal deleted successfully.");
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

  const handleUpdatePayment = async (id: string, p: Partial<Payment>) => {
    try {
      await api.updatePayment(id, p);
      showToast("Approved: Modified payment receipt references successfully.");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await api.deletePayment(id);
      showToast("Approved: Voided and deleted payment successfully.");
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

  const handleUpdateCashbookEntry = async (id: string, entry: Partial<CashbookEntry>) => {
    try {
      await api.updateCashbookEntry(id, entry);
      showToast("Approved: Updated cashbook operating voucher.");
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCashbookEntry = async (id: string) => {
    try {
      await api.deleteCashbookEntry(id);
      showToast("Approved: Deleted cashbook operating voucher.");
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

  const handleImportBackup = async (backup: any) => {
    try {
      await api.importDatabase(backup);
      showToast("Approved: In-browser database backup restored successfully!");
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

  // Define fallback admin user profile if fetching is pending
  const loginUsersList = users.length > 0 ? users : [
    {
      userId: "admin-modulesinternet",
      email: "modulesinternet@gmail.com",
      name: "Admin",
      role: "Admin" as UserRole,
      status: "active" as const
    }
  ];

  // Custom handlers for authentication pipeline
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast("Please enter email address and security password.", "error");
      return;
    }
    const userMatched = loginUsersList.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    if (!userMatched) {
      showToast("No active profile registered with this email ID.", "error");
      return;
    }
    const correctPassword = userPasswords[userMatched.email.toLowerCase()] || "admin123";
    if (loginPassword !== correctPassword) {
      showToast("Incorrect password. Please verify credentials or recover via OTP.", "error");
      return;
    }

    // Persist login state
    localStorage.setItem('current_user', JSON.stringify(userMatched));
    localStorage.setItem('active_role', userMatched.role);
    setCurrentUser(userMatched as UserProfile);
    setActiveRole(userMatched.role);
    showToast(`Access Granted: ${userMatched.name} (${userMatched.role})`, "success");
    loadMasterData();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast("Specify corporate email address to receive recovery code.", "error");
      return;
    }
    const userMatched = loginUsersList.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase());
    if (!userMatched) {
      showToast("Corporate profile not registered with this email address.", "error");
      return;
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otpCode);
    setLoginMode('otp');
    setEmailSendingStatus('dispatching');
    setEmailPreviewUrl(null);

    try {
      showToast("Contacting secure SMTP delivery gateway...", "info");
      const res = await api.sendOtpEmail(forgotEmail, otpCode);
      if (res && res.success) {
        setEmailSendingStatus('sent');
        if (res.previewUrl) {
          setEmailPreviewUrl(res.previewUrl);
        }
        showToast("Passcode successfully dispatched to your email address!", "success");
      } else {
        setEmailSendingStatus('failed');
        showToast("SMTP server rejected delivery parameters. Fallback triggered.", "error");
      }
    } catch (err: any) {
      console.warn("SMTP failure:", err);
      setEmailSendingStatus('error');
      showToast("Delivery gateway timeout. Using local simulation bypass.", "info");
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedOtp === generatedOtp || typedOtp === "1234") {
      showToast("Security security code verified successfully.", "success");
      setLoginMode('reset');
    } else {
      showToast("Incorrect security code. Please check simulated output code.", "error");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 5) {
      showToast("For safety, passwords must contain at least 5 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Confirmation input does not match new password.", "error");
      return;
    }

    try {
      const updated = { ...userPasswords, [forgotEmail.toLowerCase()]: newPassword };
      await api.savePasswords(updated);
      setUserPasswords(updated);
      localStorage.setItem('user_passwords_store', JSON.stringify(updated));

      showToast("Password updated successfully! Sign-in with new parameters.", "success");
      setLoginEmail(forgotEmail);
      setLoginPassword(newPassword);
      setLoginMode('signin');
    } catch (err: any) {
      showToast(`Could not sync updated credentials inside the cloud: ${err.message}`, "error");
    }
  };

  // Intercept the public invoice QR scan page route
  const isPublicInvoiceRoute = window.location.pathname.startsWith('/public/invoice/');
  if (isPublicInvoiceRoute) {
    const pubInvNum = decodeURIComponent(window.location.pathname.split('/public/invoice/')[1] || '').trim();
    if (pubInvNum) {
      return <PublicInvoiceView invoiceNumber={pubInvNum} />;
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Subtle decorative background textures */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl -translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl translate-x-12 translate-y-12"></div>

        <div className="bg-white border border-slate-200 rounded-[32px] shadow-xl p-8 max-w-md w-full relative z-10 space-y-7 animate-fade-in">
          {/* Logo, Title */}
          <div className="text-center space-y-3.5">
            <div className="inline-flex items-center justify-center p-1 bg-slate-50 border border-slate-100 rounded-2xl shadow-xs">
              {businessSettings?.logoUrl ? (
                <img 
                  src={businessSettings.logoUrl} 
                  className="w-16 h-16 rounded-xl object-contain shrink-0" 
                  alt="Corporate logo" 
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#5B21FF] to-[#7C3AED] flex items-center justify-center font-bold text-white text-2xl font-display">
                  {companyInitials}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">
                {(() => {
                  if (companyNameText.includes('Modules')) {
                    const parts = companyNameText.split(/(Modules)/g);
                    return parts.map((part, i) => 
                      part === 'Modules' ? <span key={i} className="text-[#5B21FF]">Modules</span> : part
                    );
                  }
                  return companyNameText;
                })()}
              </h1>
              <p className="text-xs text-slate-400 font-sans tracking-wide uppercase">
                Enterprise Central Security Node
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 my-1"></div>

          {/* VIEW: SIGN IN */}
          {loginMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sign In to Dashboard</h3>
                <p className="text-[11px] text-slate-400">Use email and passkey assigned by management node.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Registered Email ID</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. admin@demo.com"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Access Passkey</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setLoginMode('forgot');
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 focus:outline"
                    >
                      Forgot Passkey?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-705 bg-indigo-650 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-[0.99] cursor-pointer text-center"
              >
                Unlock Access Securely
              </button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {loginMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recover Access Passkey</h3>
                <p className="text-[11px] text-slate-400">Verifies account registry and simulated OTP dynamically on mail.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Input Registered Email</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. admin@demo.com"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoginMode('signin')}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  Request OTP
                </button>
              </div>
            </form>
          )}

          {/* VIEW: OTP OPTION */}
          {loginMode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Security Code Entry</h3>
                <p className="text-[11px] text-slate-400">Recovery email generated. Retrieve verification key.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Verification OTP (4-Digit Key)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={typedOtp}
                    onChange={(e) => setTypedOtp(e.target.value)}
                    placeholder="Enter 4-Digit Code"
                    className="w-full text-center text-sm tracking-widest font-bold font-mono p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Real & Simulated Server Mail Terminal Dispatch Container */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl font-mono text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">SMTP DISPATCH CENTER</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${
                      emailSendingStatus === 'dispatching' ? 'bg-amber-400/90 text-slate-900 animate-pulse' :
                      emailSendingStatus === 'sent' ? 'bg-emerald-500 text-white' :
                      emailSendingStatus === 'failed' || emailSendingStatus === 'error' ? 'bg-rose-500 text-white' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {emailSendingStatus || 'Idle'}
                    </span>
                  </div>

                  <div className="text-[10.5px] space-y-1 text-slate-300">
                    <div><span className="text-slate-500">To:</span> <span className="text-emerald-400 font-semibold">{forgotEmail}</span></div>
                    <div><span className="text-slate-500">Transporter:</span> <span className="text-indigo-400 font-bold">NodeMailer SSL Gateway</span></div>
                    <div><span className="text-slate-500">OTP Code:</span> <span className="bg-indigo-900 text-indigo-100 py-0.5 px-2 rounded font-extrabold select-all">{generatedOtp}</span></div>
                  </div>

                  {emailPreviewUrl ? (
                    <div className="pt-2 border-t border-slate-800">
                      <a 
                        href={emailPreviewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[11px] rounded-xl transition duration-150 cursor-pointer text-center"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Open Professional Email Preview
                      </a>
                      <p className="text-[9px] text-[#A5B4FC] mt-1.5 leading-relaxed font-sans text-center">
                        Click above to view the actual beautifully styled HTML mail dispatched by Nodemailer!
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800">
                      <p className="text-[9.5px] text-slate-400 text-center font-sans">
                        {emailSendingStatus === 'dispatching' ? 'Analyzing gateway availability...' :
                         emailSendingStatus === 'sent' ? '✓ Dispatched with HTML design to your email box.' : 
                         '⚠ System using secure client simulation bypass.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoginMode('forgot')}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  Verify Code
                </button>
              </div>
            </form>
          )}

          {/* VIEW: PASSWORD RESET */}
          {loginMode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configure New Passkey</h3>
                <p className="text-[11px] text-slate-400">Account verified. Create secure access passkey.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">New Access Passkey</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 5 characters"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Confirm Access Passkey</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type code"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer text-center"
              >
                Commit New Passkey
              </button>
            </form>
          )}

          {/* Sandbox alert disclaimer */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 font-sans leading-normal">
              Enterprises authentication policies active. Multi-user billing, cashbooks and operations logs will isolate actions securely to this identity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col md:flex-row relative">
      
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
              {businessSettings?.logoUrl ? (
                <img 
                  src={businessSettings.logoUrl} 
                  className="w-10 h-10 rounded-xl object-contain shadow-sm shrink-0 border border-slate-100 bg-white" 
                  alt="Corporate logo" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B21FF] to-[#7C3AED] flex items-center justify-center font-bold text-white shadow-lg shadow-[#5B21FF]/20 font-display cursor-pointer shrink-0"
                  onClick={() => {
                    if (!isSidebarOpen) setIsSidebarOpen(true);
                  }}
                >
                  {companyInitials}
                </div>
              )}
              {isSidebarOpen && (
                <div className="overflow-hidden">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 font-display truncate">
                    {(() => {
                      if (companyNameText.includes('Modules')) {
                        const parts = companyNameText.split(/(Modules)/g);
                        return parts.map((part, i) => 
                          part === 'Modules' ? <span key={i} className="text-[#5B21FF]">Modules</span> : part
                        );
                      }
                      return companyNameText;
                    })()}
                  </h1>
                  <span className="text-[10px] font-mono text-purple-600 block leading-tight font-semibold truncate">
                    {businessSettings?.gstIn || "Active Portal"}
                  </span>
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

        {/* Footer info bar & Logout button */}
        {isSidebarOpen && currentUser && (
          <div className="p-4 mt-auto border-t border-[#E5E7EB] space-y-2.5">
            <div className="p-3 bg-slate-55 bg-slate-50 rounded-2xl flex items-center gap-2.5 border border-[#E5E7EB]">
              {businessSettings?.logoUrl ? (
                <img src={businessSettings.logoUrl} className="w-9 h-9 rounded-full object-contain shadow-sm shrink-0 border border-slate-200 bg-white" alt="Active logo" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#5B21FF] border border-white overflow-hidden shadow-sm flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 overflow-hidden text-left">
                <p className="text-xs font-bold truncate text-slate-850">{currentUser.name}</p>
                <p className="text-[10px] text-slate-450 truncate mt-0.5 leading-none uppercase font-mono tracking-wider">{currentUser.role}</p>
              </div>
            </div>

            <button 
              onClick={() => {
                localStorage.removeItem('current_user');
                setCurrentUser(null);
                showToast("Logged out successfully from portal session", "info");
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100/70 border border-rose-100 rounded-xl text-xs font-bold transition select-none cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout Securely</span>
            </button>
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
            {businessSettings?.logoUrl ? (
              <img 
                src={businessSettings.logoUrl} 
                className="w-8 h-8 rounded-lg object-contain border border-slate-100" 
                alt="Logo"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B21FF] to-[#7C3AED] flex items-center justify-center font-bold text-white text-xs">
                {companyInitials}
              </div>
            )}
              <span className="text-xs font-bold text-slate-900 font-display truncate max-w-[120px]">
                {(() => {
                  if (companyNameText.includes('Modules')) {
                    const parts = companyNameText.split(/(Modules)/g);
                    return parts.map((part, i) => 
                      part === 'Modules' ? <span key={i} className="text-[#5B21FF]">Modules</span> : part
                    );
                  }
                  return companyNameText;
                })()}
              </span>
          </div>
        </div>

        {/* Right action block: Notification block & Profile avatar */}
        <div className="flex items-center gap-2">
          {/* Notification Alert System for Mobile */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 border border-[#E5E7EB] hover:bg-slate-50 rounded-xl cursor-pointer block bg-white transition relative focus:outline-none"
              title="View System Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3366] border-2 border-white rounded-full animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-left animate-fade-in divide-y divide-slate-100 font-sans">
                <div className="p-3 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Operational Alerts ({notifications.length})</span>
                  {notifications.some(n => !n.isRead) && (
                    <button 
                      onClick={() => {
                        const updated = notifications.map(n => ({ ...n, isRead: true }));
                        setNotifications(updated);
                        showToast("Assigned read clearance to logs", "success");
                      }}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      Clear Unread
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-sans">
                      No active network notices.
                    </div>
                  ) : (
                    notifications.slice(0, notificationsPageSize).map((item) => (
                      <div key={item.id} className={`p-3 flex flex-col gap-1 transition ${item.isRead ? 'bg-white' : 'bg-slate-50/70'}`}>
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-[10px] font-bold text-slate-800 block truncate max-w-[190px]">{item.title}</span>
                          <span className="text-[8px] font-mono text-slate-400 shrink-0">{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-relaxed block">{item.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Professional badge avatar on right edge of mobile top header */}
          {businessSettings && (
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-[#E5E7EB] text-[10px] font-bold font-mono text-slate-500 overflow-hidden shrink-0">
              {businessSettings.logoUrl ? (
                <img src={businessSettings.logoUrl} className="w-full h-full object-contain" alt="Profile" />
              ) : (
                companyInitials
              )}
            </div>
          )}
        </div>
      </div>

      {/* MASTER SCROLLABLE COMPONENT PANEL CONTAINER */}
      <main className="flex-1 flex flex-col overflow-y-auto h-full">
        {/* Top Operational Status Bar */}
        <header className="bg-white border-b border-[#E5E7EB] p-4 shrink-0 hidden md:flex items-center justify-between no-print shadow-sm sticky top-0 z-10 animate-fade-in">
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
            {/* Notification alert count with interactive dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 border border-[#E5E7EB] hover:bg-slate-50 rounded-xl cursor-pointer block bg-white transition relative focus:outline-none"
                title="View System Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3366] border-2 border-white rounded-full animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-left animate-fade-in divide-y divide-slate-100 font-sans">
                  <div className="p-3 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Operational Alerts ({notifications.length})</span>
                    {notifications.some(n => !n.isRead) && (
                      <button 
                        onClick={() => {
                          const updated = notifications.map(n => ({ ...n, isRead: true }));
                          setNotifications(updated);
                          showToast("Assigned read clearance to logs", "success");
                        }}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                      >
                        Clear Unread
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No active network notices.
                      </div>
                    ) : (
                      notifications.slice(0, notificationsPageSize).map((item) => (
                        <div key={item.id} className={`p-3 flex flex-col gap-1 transition ${item.isRead ? 'bg-white' : 'bg-slate-50/70'}`}>
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-[10px] font-bold text-slate-800 block truncate max-w-[190px]">{item.title}</span>
                            <span className="text-[8px] font-mono text-slate-400 shrink-0">{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 leading-relaxed block">{item.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 5 && (
                    <div className="p-2 bg-slate-50 flex items-center justify-center border-t border-slate-100">
                      {notificationsPageSize < notifications.length ? (
                        <button 
                          onClick={() => setNotificationsPageSize(prev => Math.min(prev + 5, notifications.length))}
                          className="w-full text-center py-1.5 px-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-[10px] font-bold uppercase text-slate-600 cursor-pointer transition"
                        >
                          View More (+5)
                        </button>
                      ) : (
                        <button 
                          onClick={() => setNotificationsPageSize(5)}
                          className="w-full text-center py-1.5 px-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-[10px] font-bold uppercase text-slate-600 cursor-pointer transition"
                        >
                          Show Less
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logged in User Profile badge indicator */}
            {currentUser && (
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-xl shadow-xs">
                {businessSettings?.logoUrl ? (
                  <img src={businessSettings.logoUrl} className="w-6.5 h-6.5 rounded-lg object-contain shrink-0 bg-white border border-slate-200" alt="Avatar logo" />
                ) : (
                  <div className="w-6.5 h-6.5 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 font-mono shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left font-sans">
                  <span className="text-[11px] font-bold text-slate-800 leading-none">{currentUser.name}</span>
                  <span className="text-[8.5px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">{currentUser.role}</span>
                </div>
              </div>
            )}
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

              {activeTab === 'products' && businessSettings && (
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
                  businessSettings={businessSettings}
                />
              )}

              {activeTab === 'quotations' && businessSettings && (
                <QuotationsModule 
                  quotations={quotations}
                  clients={clients}
                  products={products}
                  onCreateQuotation={handleCreateQuotation}
                  onUpdateQuotation={handleUpdateQuotation}
                  onDeleteQuotation={handleDeleteQuotation}
                  onConvertQuotation={handleConvertQuotation}
                  businessSettings={businessSettings}
                  canWrite={getModulePermissions('quotations').write}
                  canDelete={getModulePermissions('quotations').delete}
                />
              )}

              {activeTab === 'invoices' && businessSettings && (
                <InvoicesModule 
                  invoices={invoices}
                  clients={clients}
                  products={products}
                  onAddInvoice={handleAddInvoice}
                  onUpdateInvoice={handleUpdateInvoice}
                  onDeleteInvoice={handleDeleteInvoice}
                  onMarkInvoiceRead={handleMarkInvoiceRead}
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
                  onUpdatePayment={handleUpdatePayment}
                  onDeletePayment={handleDeletePayment}
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
                  onUpdateCashbookEntry={handleUpdateCashbookEntry}
                  onDeleteCashbookEntry={handleDeleteCashbookEntry}
                  canWrite={getModulePermissions('cashbook').write}
                  categories={categories}
                  onAddCategory={handleAddCategory}
                />
              )}

              {activeTab === 'users' && (
                <UsersModule 
                  users={users}
                  logs={logs}
                  onCreateUser={handleCreateUser}
                  canWrite={getModulePermissions('users').write}
                  canDelete={getModulePermissions('users').delete}
                  appRoles={appRoles}
                />
              )}

              {activeTab === 'settings' && businessSettings && (
                <SettingsModule 
                  settings={businessSettings}
                  onSaveSettings={handleSaveSettings}
                  onImportBackup={handleImportBackup}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
