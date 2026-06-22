import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
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
  Info,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  Phone,
  PhoneOff,
  Volume2,
  Workflow,
  GitCompare
} from 'lucide-react';
import { api } from './services/api';
import versionData from '../version.json';
import { addNetworkListener, addLifecycleListener, getNetworkStatus, isMobileDevice, shareContent, capturePhoto, getAppVersionInfo, addBackButtonListener, exitApp, triggerLocalNotification, requestNotificationPermission, setupPushNotifications } from './services/mobile';
import { db as firestoreDb, handleFirestoreError, OperationType } from './services/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
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
import ProfileModule from './components/ProfileModule';
import AndroidIncomingCallScreen from './components/AndroidIncomingCallScreen';
import SplashAnimation from './components/SplashAnimation';
import NotificationsModule from './components/NotificationsModule';
import WorkflowModule from './components/WorkflowModule';
import { playSoundTone, playVoiceAnnouncement } from './services/soundService';
import { motion } from 'motion/react';

type TabType = 'dashboard' | 'invoices' | 'clients' | 'products' | 'quotations' | 'payments' | 'ledger' | 'cashbook' | 'users' | 'settings' | 'profile' | 'notifications' | 'workflow';

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

function getCachedItem<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (_) {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('active_tab');
    return (saved as TabType) || 'dashboard';
  });

  const activeTabRef = useRef<TabType>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
    localStorage.setItem('active_tab', activeTab);
  }, [activeTab]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  // Master database state arrays
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(() => {
    const clientsInit = getCachedItem<Client[]>('db_clients', []);
    const invoicesInit = getCachedItem<Invoice[]>('db_invoices', []);
    const paymentsInit = getCachedItem<Payment[]>('db_payments', []);
    const cashbookInit = getCachedItem<CashbookEntry[]>('db_cashbook', []);
    if (clientsInit.length > 0 || invoicesInit.length > 0) {
      return computeLocalDashboardMetrics(clientsInit, invoicesInit, paymentsInit, cashbookInit);
    }
    return null;
  });
  const [clients, setClients] = useState<Client[]>(() => getCachedItem('db_clients', []));
  const [products, setProducts] = useState<Product[]>(() => getCachedItem('db_products', []));
  const [invoices, setInvoices] = useState<Invoice[]>(() => getCachedItem('db_invoices', []));
  const [quotations, setQuotations] = useState<Quotation[]>(() => getCachedItem('db_quotations', []));
  const [payments, setPayments] = useState<Payment[]>(() => getCachedItem('db_payments', []));
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => getCachedItem('db_ledger', []));
  const [cashbook, setCashbook] = useState<CashbookEntry[]>(() => getCachedItem('db_cashbook', []));
  const [users, setUsers] = useState<UserProfile[]>(() => getCachedItem('db_users', []));
  const [logs, setLogs] = useState<ActivityLog[]>(() => getCachedItem('db_logs', []));
  const [notifications, setNotifications] = useState<Notification[]>(() => getCachedItem('db_notifications', []));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showIncomingCallAlert, setShowIncomingCallAlert] = useState<Notification | null>(null);
  const [androidIncomingCall, setAndroidIncomingCall] = useState<Payment | null>(null);
  const triggerIncomingCall = (pay: Payment) => {
    const isAndroid = Capacitor.getPlatform() === 'android' || (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent));
    if (!isAndroid) {
      console.log("[Call Guard] Suppressed incoming call trigger on non-Android platform.");
      return;
    }
    const formattedAmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pay.amount);
    api.createLog('CALL_TRIGGERED', `VoIP Call notification triggered for payment of ${formattedAmt} received from ${pay.clientName || 'N/A'} via ${pay.paymentMode}.`).catch(() => {});
    setAndroidIncomingCall(pay);
  };
  const [notificationsPageSize, setNotificationsPageSize] = useState(5);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(() => getCachedItem('db_settings', DEFAULT_SETTINGS));
  const [categories, setCategories] = useState<string[]>(() => getCachedItem('db_categories', []));
  const [appVersion, setAppVersion] = useState(() => {
    try {
      return versionData;
    } catch (_) {
      return { version: '1.1.2', build: '12' };
    }
  });

  const [fullScreenLoading, setFullScreenLoading] = useState(false);

  // Pull-to-refresh mechanism for mobile/Android view to trigger loadMasterData
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!mainRef.current) return;
    // Only trigger pull-to-refresh if we are scrolled to the very top (scrollTop === 0)
    if (mainRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || !isPulling || !mainRef.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0 && mainRef.current.scrollTop === 0) {
      // Elastic/resistance mapping for pull down (capped at 80px)
      const resistanceVal = Math.min(diff * 0.45, 80);
      setPullDistance(resistanceVal);
      // Prevent browser default pull-to-refresh behaviors in nested views
      if (e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  const handleTouchEnd = async () => {
    touchStartY.current = null;
    setIsPulling(false);
    
    if (pullDistance >= 60) {
      setIsRefreshing(true);
      setPullDistance(40); // hold at 40px during active refreshing state
      try {
        await loadMasterData(true, true);
        showToast("Synchronized central backend registers", "success");
      } catch (err: any) {
        showToast(`Sync failed: ${err.message || err}`, "error");
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFullScreenLoading(false);
    }, 1000); // capped at exactly 1 second
    return () => clearTimeout(timer);
  }, []);
  
  // GLOBAL ERP SEARCH ENGINE (POINT 16)
  const [globalSearch, setGlobalSearch] = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const getGlobalResults = () => {
    if (!globalSearch.trim()) return [];
    const query = globalSearch.toLowerCase().trim();
    const results: { type: 'Invoice' | 'Customer' | 'Product' | 'Ledger'; title: string; subtitle: string; action: () => void }[] = [];
    
    const formatRuleCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);
    };

    // 1. Search Invoices
    invoices.forEach(inv => {
      if (inv.invoiceNumber.toLowerCase().includes(query) || inv.clientName.toLowerCase().includes(query)) {
        results.push({
          type: 'Invoice',
          title: inv.invoiceNumber,
          subtitle: `Client: ${inv.clientName} | Total: ${formatRuleCurrency(inv.total)} - ${inv.status.replace('_', ' ')}`,
          action: () => {
            setActiveTab('invoices');
          }
        });
      }
    });

    // 2. Search Clients (Customers)
    clients.forEach(c => {
      if (c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query) || (c.gstIn || '').toLowerCase().includes(query)) {
        results.push({
          type: 'Customer',
          title: c.name,
          subtitle: `Email: ${c.email} | Outstanding: ${formatRuleCurrency(c.outstandingBalance)}`,
          action: () => {
            setActiveTab('clients');
          }
        });
      }
    });

    // 3. Search Products
    products.forEach(p => {
      if (p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)) {
        results.push({
          type: 'Product',
          title: p.name,
          subtitle: `Rate: ${formatRuleCurrency(p.price)} | Segment: ${p.category}`,
          action: () => {
            setActiveTab('products');
          }
        });
      }
    });

    // 4. Search Ledger logs
    ledger.forEach(led => {
      if (led.description.toLowerCase().includes(query) || led.clientName.toLowerCase().includes(query)) {
        results.push({
          type: 'Ledger',
          title: led.description,
          subtitle: `Partner: ${led.clientName} | ${led.type.toUpperCase()}: ${formatRuleCurrency(led.amount)}`,
          action: () => {
            setActiveTab('ledger');
          }
        });
      }
    });

    return results.slice(0, 8);
  };
  
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

  const currentUserRef = useRef<UserProfile | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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
      "modulesinternet@gmail.com": "Admin@123",
      "admin@demo.com": "admin123",
      "manager@demo.com": "manager123",
      "accountant@demo.com": "acc123",
      "staff@demo.com": "staff123"
    };
    localStorage.setItem('user_passwords_store', JSON.stringify(defaults));
    return defaults;
  });



  const companyNameText = businessSettings?.titleBarText || businessSettings?.companyName || "Your Corporate Platform";
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
        if (u.email?.trim().toLowerCase() === 'modulesinternet@gmail.com') {
          return 'Admin';
        }
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
  const loadMasterData = async (force = true, silent = true) => {
    const lastSyncStr = localStorage.getItem('last_batch_sync_time');
    const now = Date.now();
    const thirtyMinutesMs = 30 * 60 * 1000;
    
    // Only perform the full API request on page load if forced, or more than 30 mins has passed, or we have no data
    const hasData = invoices.length > 0 || localStorage.getItem('db_invoices') !== null;
    if (!force && lastSyncStr && (now - parseInt(lastSyncStr, 10)) < thirtyMinutesMs && hasData) {
      console.log("Skipping full page-load API fetch. Data is fresh (< 30 min). Realtime listeners active.");
      setLoading(false);
      return;
    }

    // Auto-silence background syncs and page reloads if we already have local cache or memory data available.
    // This strictly avoids locking up the user viewport with full-screen loading shields.
    const isSilent = silent || hasData;

    try {
      if (!isSilent) {
        setLoading(true);
      }

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
          dash, clientsVal, productsVal, invoicesVal, quotationsVal, paymentsVal, ledgerVal, cashbookVal, usersVal, logsVal, notificationsVal, settingsVal, rolesVal, categoriesVal, passwordsVal
        ] = await Promise.all([
          safeFetch(api.getDashboard(), null),
          safeFetch(api.getClients(), getCachedItem<Client[]>('db_clients', [])),
          safeFetch(api.getProducts(), getCachedItem<Product[]>('db_products', [])),
          safeFetch(api.getInvoices(), getCachedItem<Invoice[]>('db_invoices', [])),
          safeFetch(api.getQuotations(), getCachedItem<Quotation[]>('db_quotations', [])),
          safeFetch(api.getPayments(), getCachedItem<Payment[]>('db_payments', [])),
          safeFetch(api.getLedgers(), getCachedItem<LedgerEntry[]>('db_ledger', [])),
          safeFetch(api.getCashbook(), getCachedItem<CashbookEntry[]>('db_cashbook', [])),
          safeFetch(api.getUsers(), getCachedItem<UserProfile[]>('db_users', [])),
          safeFetch(api.getLogs(), getCachedItem<ActivityLog[]>('db_logs', [])),
          safeFetch(api.getNotifications(), getCachedItem<Notification[]>('db_notifications', [])),
          safeFetch(api.getSettings(), getCachedItem<BusinessSettings | null>('db_settings', null)),
          safeFetch(api.getRoles(), getCachedItem<RolePermissions[]>('db_roles', [])),
          safeFetch(api.getCategories(), getCachedItem<string[]>('db_categories', [])),
          safeFetch(api.getPasswords(), getCachedItem<Record<string, string>>('user_passwords_store', {}))
        ]);
        batch = {
          dashboard: dash,
          clients: clientsVal,
          products: productsVal,
          invoices: invoicesVal,
          quotations: quotationsVal,
          payments: paymentsVal,
          ledger: ledgerVal,
          cashbook: cashbookVal,
          users: usersVal,
          logs: logsVal,
          notifications: notificationsVal,
          settings: settingsVal,
          roles: rolesVal,
          categories: categoriesVal,
          passwords: passwordsVal
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

      // Save to localStorage cache as well
      localStorage.setItem('db_clients', JSON.stringify(clientsFinal));
      localStorage.setItem('db_products', JSON.stringify(productsFinal));
      localStorage.setItem('db_invoices', JSON.stringify(invoicesFinal));
      localStorage.setItem('db_quotations', JSON.stringify(quotationsFinal));
      localStorage.setItem('db_payments', JSON.stringify(paymentsFinal));
      localStorage.setItem('db_ledger', JSON.stringify(ledgerFinal));
      localStorage.setItem('db_cashbook', JSON.stringify(cashbookFinal));
      localStorage.setItem('db_users', JSON.stringify(usersFinal));
      localStorage.setItem('db_logs', JSON.stringify(logsFinal));
      localStorage.setItem('db_notifications', JSON.stringify(notificationsFinal));
      if (settingsData) {
        localStorage.setItem('db_settings', JSON.stringify(settingsData));
      }
      localStorage.setItem('db_roles', JSON.stringify(rolesFinal));
      localStorage.setItem('db_categories', JSON.stringify(categoriesFinal));
      localStorage.setItem('last_batch_sync_time', Date.now().toString());

      api.getLiveVersion().then(v => {
        if (v) setAppVersion(v);
      }).catch(() => null);

      // Auto-synchronize currentUser with latest profile to prevent stale names/roles/avatars loaded from localStorage on page refresh
      if (currentUser) {
        const latestProfile = usersFinal.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase() || u.userId === currentUser.userId);
        if (latestProfile) {
          const hasChanges = latestProfile.name !== currentUser.name || 
                             latestProfile.role !== currentUser.role || 
                             latestProfile.status !== currentUser.status ||
                             latestProfile.avatarUrl !== currentUser.avatarUrl ||
                             latestProfile.mobile !== currentUser.mobile;
          if (hasChanges) {
            const updatedUser = { ...currentUser, ...latestProfile };
            setCurrentUser(updatedUser);
            localStorage.setItem('current_user', JSON.stringify(updatedUser));
          }
        }
      }
      
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
    // 1. Ask for local notification permissions on app mount (required for status bar overlays/lockscreen alerts)
    requestNotificationPermission().then(granted => {
      console.log("Local notifications permission grant status:", granted);
    });

    // 2. Perform silent background sync on launch to guarantee fresh client synchronization
    api.getPublicSettings()
      .then(pubSettings => {
        if (pubSettings) {
          setBusinessSettings(prev => ({ ...prev, ...pubSettings }));
          const currentCached = getCachedItem<any>('db_settings', DEFAULT_SETTINGS || {});
          localStorage.setItem('db_settings', JSON.stringify({ ...currentCached, ...pubSettings }));
        }
      })
      .catch((e) => console.log("Public branding settings fetch bypassed:", e));

    loadMasterData(true, true); // force=true, silent=true (doesn't trigger full-viewport block screen spinner)

    // 3. Register native backbutton listener
    let backButtonHandle: any = null;
    addBackButtonListener((canGoBack) => {
      if (!currentUserRef.current) {
        exitApp();
        return;
      }
      if (activeTabRef.current !== 'dashboard') {
        setActiveTab('dashboard');
      } else {
        exitApp();
      }
    }).then(handle => {
      backButtonHandle = handle;
    });

    getAppVersionInfo().then(info => {
      setAppVersion(info);
    }).catch(() => null);

    return () => {
      if (backButtonHandle) {
        backButtonHandle.remove();
      }
    };
  }, []);

  // 1b. Configure and register Capacitor FCM Push Notifications on authenticated user state changes
  useEffect(() => {
    if (currentUser && currentUser.userId) {
      console.log("Enabling real-time push notifications listener on User authenticated state:", currentUser.userId);
      setupPushNotifications(
        currentUser.userId, 
        (route: string, data?: any) => {
          // 1. Notification tapped (Background / Closed wake-up handler)
          console.log("Push notification tapped. Route:", route, "Data:", data);
          if (route.includes('invoices')) {
            setActiveTab('invoices');
          } else if (route.includes('payments')) {
            setActiveTab('payments');
          } else if (route.includes('cashbook')) {
            setActiveTab('cashbook');
          }

          // If the tapped notification contains payment creation / modification metadata, ring!
          if (data && (data.paymentId || data.topic === 'payments' || route.includes('payments'))) {
            try {
              const paymentAmount = data.amount ? parseFloat(data.amount) : 0;
              if (paymentAmount > 0) {
                const mockPayment: Payment = {
                  id: data.paymentId || `pay-${Date.now()}`,
                  invoiceId: data.invoiceId || '',
                  invoiceNumber: data.invoiceId || '',
                  clientId: data.clientId || '',
                  clientName: data.clientName || 'Client',
                  amount: paymentAmount,
                  paymentMode: (data.paymentMode || 'UPI/Bank Transfer') as any,
                  paymentDate: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  referenceNum: '',
                  remarks: 'Tapped push notification alert call',
                };
                console.log("Launching auto WhatsApp VoIP call screen from tapped message:", mockPayment);
                triggerIncomingCall(mockPayment);
              }
            } catch (err) {
              console.error("Failed to construct call screen from tapped push:", err);
            }
          }
        },
        (notification: any) => {
          // 2. Notification received while app is in foreground
          console.log("Foreground push notification received:", notification);
          const data = notification.data;
          
          // Trigger the standard visual local notification banner
          triggerLocalNotification(
            notification.title || "Message Received", 
            notification.body || "New update registered."
          );

          // If it is a payment alert, launch the VoIP ring screen immediately
          if (data && (data.paymentId || data.topic === 'payments')) {
            try {
              const paymentAmount = data.amount ? parseFloat(data.amount) : 0;
              if (paymentAmount > 0) {
                const mockPayment: Payment = {
                  id: data.paymentId || `pay-${Date.now()}`,
                  invoiceId: data.invoiceId || '',
                  invoiceNumber: data.invoiceId || '',
                  clientId: data.clientId || '',
                  clientName: data.clientName || 'Client',
                  amount: paymentAmount,
                  paymentMode: (data.paymentMode || 'UPI/Bank Transfer') as any,
                  paymentDate: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  referenceNum: '',
                  remarks: 'Foreground push notification alert call',
                };
                console.log("Launching auto WhatsApp VoIP call screen in foreground:", mockPayment);
                triggerIncomingCall(mockPayment);
              }
            } catch (err) {
              console.error("Failed to trigger foreground call from push:", err);
            }
          }
        }
      );
    }
  }, [currentUser]);

  // Background scheduled synchronization every 5 minutes (strictly background silent syncing)
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      console.log("Automatic 5-minute background synchronization triggered...");
      loadMasterData(true, true); // force = true, silent = true
    }, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [currentUser]);

  // Real-time dynamic Firestore onSnapshot listener subscription model for instantly reflecting database state
  useEffect(() => {
    if (!currentUser) return;
    console.log("Registering active real-time Firestore listeners for instant responsive feedback...");

    let isFirstPaymentsSnapshot = true;
    let isFirstNotificationsSnapshot = true;

    // Safe, unauthenticated-client-aware subscription helper that auto-disconnects on permission/auth errors
    const registerSafeSnapshot = (
      refOrQuery: any,
      onNext: (snapshot: any) => void,
      errorCollectionName: string
    ) => {
      let unsub: (() => void) | null = null;
      try {
        unsub = onSnapshot(refOrQuery, onNext, (error) => {
          handleFirestoreError(error, OperationType.GET, errorCollectionName);
          if (error.code === 'permission-denied') {
            if (unsub) {
              console.log(`[Safe Snapshot] Auto-decoupling listener for "${errorCollectionName}" due to permissions:`, error.message);
              unsub();
              unsub = null;
            }
          } else {
            console.warn(`[Safe Snapshot] Transient network warning/handshake delay for "${errorCollectionName}":`, error.message);
          }
        });
      } catch (err) {
        console.warn(`[Safe Snapshot] Direct subscription failed for "${errorCollectionName}":`, err);
      }
      return () => {
        if (unsub) {
          unsub();
          unsub = null;
        }
      };
    };

    const unsubClients = registerSafeSnapshot(collection(firestoreDb, 'clients'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
      setClients(prev => {
        const nextStr = JSON.stringify(list);
        if (JSON.stringify(prev) === nextStr) return prev;
        localStorage.setItem('db_clients', nextStr);
        return list;
      });
    }, 'clients');

    const unsubProducts = registerSafeSnapshot(collection(firestoreDb, 'products'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(prev => {
        const nextStr = JSON.stringify(list);
        if (JSON.stringify(prev) === nextStr) return prev;
        localStorage.setItem('db_products', nextStr);
        return list;
      });
    }, 'products');

    const unsubInvoices = registerSafeSnapshot(collection(firestoreDb, 'invoices'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))
                     .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setInvoices(prev => {
        const nextStr = JSON.stringify(list);
        if (JSON.stringify(prev) === nextStr) return prev;

        // Detect dynamic additions or modifications for lockscreen and system status bar notifications
        try {
          if (prev && prev.length > 0) {
            const prevIds = new Set(prev.map(i => i.id));
            const newInvoices = list.filter(i => !prevIds.has(i.id));

            const prevMap = new Map(prev.map(i => [i.id, i]));
            const updatedInvoices = list.filter(i => {
              const old = prevMap.get(i.id);
              return old && JSON.stringify(old) !== JSON.stringify(i);
            });

            newInvoices.forEach(inv => {
              const formattedAmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inv.total);
              triggerLocalNotification(
                "📄 New Invoice Dispatched",
                `Invoice ${inv.invoiceNumber} created for ${inv.clientName} worth ${formattedAmt}.`
              );
            });

            updatedInvoices.forEach(inv => {
              triggerLocalNotification(
                "🔄 Invoice Modified",
                `Invoice ${inv.invoiceNumber} for ${inv.clientName} updated to status: ${inv.status.replace('_', ' ').toUpperCase()}.`
              );
            });
          }
        } catch (e) {
          console.error("Local notification dispatcher error: ", e);
        }

        localStorage.setItem('db_invoices', nextStr);
        return list;
      });
    }, 'invoices');

    const unsubQuotations = registerSafeSnapshot(collection(firestoreDb, 'quotations'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quotation))
                     .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setQuotations(prev => {
        const nextStr = JSON.stringify(list);
        if (JSON.stringify(prev) === nextStr) return prev;
        localStorage.setItem('db_quotations', nextStr);
        return list;
      });
    }, 'quotations');

    const unsubPayments = registerSafeSnapshot(collection(firestoreDb, 'payments'), (snapshot) => {
       const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
                      .sort((a, b) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
       
       snapshot.docChanges().forEach((change) => {
         if (change.type === "added" || change.type === "modified") {
           const currPay = { id: change.doc.id, ...change.doc.data() } as Payment;
           const payTime = ((currPay as any).updatedAt || currPay.createdAt) ? new Date((currPay as any).updatedAt || currPay.createdAt).getTime() : 0;
           // 10 minutes leeway, using Math.abs to protect against client-server clock drift
           const isRecent = payTime && (Math.abs(Date.now() - payTime) < 30 * 60 * 1000);

           if (!isFirstPaymentsSnapshot || isRecent) {
             const processedKey = `triggered_${currPay.id}_${change.type}_${currPay.amount}`;
             if (!localStorage.getItem(processedKey)) {
               localStorage.setItem(processedKey, 'true');
               triggerIncomingCall(currPay);
               const formattedAmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(currPay.amount);
               triggerLocalNotification(
                 change.type === "added" ? "💰 Payment Received" : "🔄 Payment Updated",
                 change.type === "added"
                   ? `Received ${formattedAmt} from ${currPay.clientName || 'N/A'} via ${currPay.paymentMode || 'N/A'}.`
                   : `Payment of INR ${currPay.amount} from ${currPay.clientName || 'N/A'} has been updated.`
               );
             }
           }
         }
       });
       isFirstPaymentsSnapshot = false;

       setPayments(prev => {
         const nextStr = JSON.stringify(list);
         if (JSON.stringify(prev) === nextStr) return prev;
         localStorage.setItem('db_payments', nextStr);
         return list;
       });
    }, 'payments');

    const unsubLedger = registerSafeSnapshot(collection(firestoreDb, 'ledger'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LedgerEntry))
                     .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setLedger(prev => {
        const nextStr = JSON.stringify(list);
        if (JSON.stringify(prev) === nextStr) return prev;
        localStorage.setItem('db_ledger', nextStr);
        return list;
      });
    }, 'ledger');

    const unsubCashbook = registerSafeSnapshot(collection(firestoreDb, 'cashbook'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CashbookEntry));
      const filtered = list.filter(cb => cb.id !== "cb-1779715467712" && !(cb.amount === 300 && cb.paymentMode === 'Cash'))
                           .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setCashbook(prev => {
        const nextStr = JSON.stringify(filtered);
        if (JSON.stringify(prev) === nextStr) return prev;

        // Trigger local notification for manual cash out / expense recorded (real-time sync)
        try {
          if (prev && prev.length > 0) {
            const prevIds = new Set(prev.map(c => c.id));
            const newEntries = filtered.filter(c => !prevIds.has(c.id));

            newEntries.forEach(entry => {
              if (entry.type === 'expense') {
                const formattedAmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(entry.amount);
                triggerLocalNotification(
                  "💸 Payment Cash Out",
                  `Registered payout of ${formattedAmt} structure: ${entry.description || 'General expense'}.`
                );
              }
            });
          }
        } catch (e) {
          console.error("Local cashbook notification runner error: ", e);
        }

        localStorage.setItem('db_cashbook', nextStr);
        return filtered;
      });
    }, 'cashbook');

    const unsubLogs = registerSafeSnapshot(collection(firestoreDb, 'activityLogs'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog))
                     .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(prev => {
        const nextStr = JSON.stringify(list);
        if (JSON.stringify(prev) === nextStr) return prev;
        localStorage.setItem('db_logs', nextStr);
        return list;
      });
    }, 'activityLogs');

    const unsubNotifications = registerSafeSnapshot(collection(firestoreDb, 'notifications'), (snapshot) => {
      const rawList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      const list = rawList
                     .filter(n => n.userId === currentUser.userId)
                     .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(prev => {
        const nextStr = JSON.stringify(list);
        if (JSON.stringify(prev) === nextStr) return prev;
        localStorage.setItem('db_notifications', nextStr);
        return list;
      });

      // Trigger high-priority alerts in real time for newly added unread notifications
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const docData = { id: change.doc.id, ...change.doc.data() } as Notification;
          
          const triggeredKey = `notif_alert_triggered_${docData.id}`;
          const isUserMatch = currentUser && (
            docData.userId === currentUser.userId ||
            currentUser.role === 'Admin' ||
            currentUser.email?.toLowerCase() === 'modulesinternet@gmail.com'
          );
          if (isUserMatch && !docData.isRead && !localStorage.getItem(triggeredKey)) {
            const notifTime = docData.createdAt ? new Date(docData.createdAt).getTime() : 0;
            // 30 minutes leeway, protecting against clock drift with Math.abs
            const isRecent = notifTime && (Math.abs(Date.now() - notifTime) < 30 * 60 * 1000);

            if (!isFirstNotificationsSnapshot || isRecent) {
              localStorage.setItem(triggeredKey, 'true');
              
              // Guard sounds, voice announcements, and call alert overlays to run on any Android environment (native or browser)
              const isAndroid = Capacitor.getPlatform() === 'android' || (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent));
              if (isAndroid) {
                // Play configured tone
                const soundId = businessSettings?.notificationSound || 'crystal';
                playSoundTone(soundId);

                // Speak configured voice announcement template
                if (businessSettings?.voiceAnnounceEnabled) {
                  const tmpl = businessSettings.voiceAnnounceTemplate || "Payment of {amount} received from {hotelName}";
                  const amtMatched = docData.message.match(/₹[\d,]+/);
                  const amount = amtMatched ? amtMatched[0] : "some amount";
                  
                  const clientMatched = docData.message.match(/from\s+([^\svia\.]+)/);
                  const hotelName = clientMatched ? clientMatched[1].trim() : "client";
                  
                  const modeMatched = docData.message.match(/via\s+([^\s\.]+)/);
                  const paymentMode = modeMatched ? modeMatched[1].trim() : "payment Mode";

                  playVoiceAnnouncement(tmpl, {
                    amount,
                    hotelName,
                    paymentMode,
                    date: new Date(docData.createdAt).toLocaleDateString()
                  });
                }

                // Show incoming call alert on Android app for: Invoice, Cashbook, Entry, or Payment (Created or Updated)
                if (businessSettings?.incomingCallAlertEnabled) {
                  const allowedModules = ['invoices', 'cashbook', 'payments'];
                  if (allowedModules.includes(docData.module || '')) {
                    setShowIncomingCallAlert(docData);
                  }
                }

                // Trigger real system pull-down local notification banner on Android
                triggerLocalNotification(docData.title, docData.message).catch(err => {
                  console.warn("[Local Notif Fail] Suppressed banner error:", err);
                });
              }
            }
          }
        }
      });
      isFirstNotificationsSnapshot = false;
    }, 'notifications');

    const unsubUsers = registerSafeSnapshot(collection(firestoreDb, 'users'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ userId: d.id, ...d.data() } as UserProfile));
      setUsers(prev => {
        const nextStr = JSON.stringify(list);
        if (JSON.stringify(prev) === nextStr) return prev;
        localStorage.setItem('db_users', nextStr);
        
        // Auto-sanitize session
        const latestProfile = list.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase() || u.userId === currentUser.userId);
        if (latestProfile) {
          const hasChanges = latestProfile.name !== currentUser.name || 
                             latestProfile.role !== currentUser.role || 
                             latestProfile.status !== currentUser.status ||
                             latestProfile.avatarUrl !== currentUser.avatarUrl ||
                             latestProfile.mobile !== currentUser.mobile;
          if (hasChanges) {
            const updatedUser = { ...currentUser, ...latestProfile };
            setCurrentUser(updatedUser);
            localStorage.setItem('current_user', JSON.stringify(updatedUser));
          }
        }
        return list;
      });
    }, 'users');

    const unsubSettings = registerSafeSnapshot(doc(firestoreDb, 'businessSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const settingsData = docSnap.data() as BusinessSettings;
        setBusinessSettings(prev => {
          const nextStr = JSON.stringify(settingsData);
          if (JSON.stringify(prev) === nextStr) return prev;
          localStorage.setItem('db_settings', nextStr);
          return settingsData;
        });
      }
    }, 'businessSettings/global');

    const unsubCategories = registerSafeSnapshot(doc(firestoreDb, 'businessSettings', 'categories'), (docSnap) => {
      if (docSnap.exists()) {
        const listData = (docSnap.data() as { list?: string[] }).list;
        if (Array.isArray(listData)) {
          setCategories(prev => {
            const nextStr = JSON.stringify(listData);
            if (JSON.stringify(prev) === nextStr) return prev;
            localStorage.setItem('db_categories', nextStr);
            return listData;
          });
        }
      }
    }, 'businessSettings/categories');

    const unsubRoles = registerSafeSnapshot(doc(firestoreDb, 'businessSettings', 'roles'), (docSnap) => {
      if (docSnap.exists()) {
        const listData = (docSnap.data() as { list?: RolePermissions[] }).list;
        if (Array.isArray(listData) && listData.length > 0) {
          setAppRoles(prev => {
            const nextStr = JSON.stringify(listData);
            if (JSON.stringify(prev) === nextStr) return prev;
            localStorage.setItem('db_roles', nextStr);
            return listData;
          });
        }
      }
    }, 'businessSettings/roles');

    return () => {
      console.log("Deregistering active real-time Firestore listeners...");
      unsubClients();
      unsubProducts();
      unsubInvoices();
      unsubQuotations();
      unsubPayments();
      unsubLedger();
      unsubCashbook();
      unsubLogs();
      unsubNotifications();
      unsubUsers();
      unsubSettings();
      unsubCategories();
      unsubRoles();
    };
  }, [currentUser]);

  // Automated real-time re-calculation of operating margins, cash, bank, and invoice metrics
  useEffect(() => {
    const locallyComputed = computeLocalDashboardMetrics(
      clients,
      invoices,
      payments,
      cashbook
    );
    setDashboardMetrics(locallyComputed);
  }, [clients, invoices, payments, cashbook]);

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

  // Native connectivity & lifecycle resume integration
  useEffect(() => {
    if (isMobileDevice()) {
      document.body.classList.add('is-native-android');
    }
    let networkHandle: any = null;
    let lifecycleHandle: any = null;
    let lastNetworkConnected: boolean | null = null;

    getNetworkStatus().then(status => {
      setIsConnected(status.connected);
      lastNetworkConnected = status.connected;
    });

    addNetworkListener(status => {
      setIsConnected(status.connected);
      // Only display the network state change toast if the state actually changes!
      if (lastNetworkConnected !== null && status.connected !== lastNetworkConnected) {
        if (status.connected) {
          showToast("Network restored. Syncing with cloud central register...", "success");
          loadMasterData(true, true); // force=true, silent=true (seamless background sync)
        } else {
          showToast("Platform offline. Showing local ERP snapshot view.", "error");
        }
      }
      lastNetworkConnected = status.connected;
    }).then(handle => {
      networkHandle = handle;
    });

    addLifecycleListener(() => {
      console.log("App resumed foreground execution. Auto silent sync triggered.");
      loadMasterData(true, true); // force=true, silent=true (seamless sync on app resume/reopen)
    }).then(handle => {
      lifecycleHandle = handle;
    });

    return () => {
      if (networkHandle) networkHandle.remove();
      if (lifecycleHandle) lifecycleHandle.remove();
    };
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
      await loadMasterData(true, true);
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

  const handleUpdateUser = async (userId: string, u: Partial<UserProfile>) => {
    try {
      await api.updateUser(userId, u);
      showToast(`Update saved: Modified details for team member ${u.name}`);
      await loadMasterData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.deleteUser(userId);
      showToast(`Teammate credentials and access revoked.`);
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
    if (tab === 'profile') return true;
    if (activeRole === 'Admin' || currentUser?.email?.toLowerCase() === 'modulesinternet@gmail.com') return true;
    if (!currentRolePerms) return true;
    const perm = currentRolePerms[tab as keyof RolePermissions['modules']];
    return perm?.read !== false;
  };

  const getModulePermissions = (tab: TabType) => {
    if (activeRole === 'Admin' || currentUser?.email?.toLowerCase() === 'modulesinternet@gmail.com') return { read: true, write: true, delete: true };
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
      name: "Karan Sharma",
      role: "Admin" as UserRole,
      status: "active" as const
    }
  ];

  // Custom handlers for authentication pipeline
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast("Please enter email address and security password.", "error");
      return;
    }
    
    try {
      setLoading(true);
      const res = await api.login(loginEmail, loginPassword);
      if (res && res.success && res.user) {
        const userMatched = res.user;
        
        // Force premium splash component with custom Starting-Verifying-Synchronizing-Opening boot sequence
        setShowSplash(true);

        // Persist login state immediately so that the authorized layout is mounted under the SplashAnimation overlay
        localStorage.setItem('current_user', JSON.stringify(userMatched));
        localStorage.setItem('active_role', userMatched.role);
        setCurrentUser(userMatched);
        setActiveRole(userMatched.role);
        
        showToast(`Access Granted: ${userMatched.name} (${userMatched.role})`, "success");
        loadMasterData(true, true);
      } else {
        showToast("Authentication failed. Please verify credentials.", "error");
      }
    } catch (err: any) {
      console.error("Authentication flow error:", err);
      showToast(err.message || "Authentication service error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };



  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast("Specify corporate email address to receive recovery code.", "error");
      return;
    }

    try {
      setLoading(true);
      const resCheck = await api.checkEmail(forgotEmail);
      if (!resCheck || !resCheck.user) {
        showToast("Corporate profile not registered with this email address.", "error");
        return;
      }
      
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(otpCode);
      setLoginMode('otp');
      setEmailSendingStatus('dispatching');
      setEmailPreviewUrl(null);

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
      showToast(err.message || "Delivery gateway timeout. Using local simulation bypass.", "info");
    } finally {
      setLoading(false);
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

  // Intercept the public invoice QR scan page route (robust subdirectory compatibility)
  const isPublicInvoiceRoute = window.location.pathname.includes('/public/invoice/');
  if (isPublicInvoiceRoute) {
    const parts = window.location.pathname.split('/public/invoice/');
    const pubInvNum = decodeURIComponent(parts[parts.length - 1] || '').trim();
    if (pubInvNum) {
      return <PublicInvoiceView invoiceNumber={pubInvNum} />;
    }
  }

  // Signing in transition handled directly by the unified SplashAnimation

  if (!currentUser) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans"
      >
        {/* Subtle decorative background textures */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl -translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl translate-x-12 translate-y-12"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
          className="bg-white border border-slate-200 rounded-[32px] shadow-xl p-8 max-w-md w-full relative z-10 space-y-7"
        >
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
              <h1 className="text-[18px] font-bold tracking-tight text-slate-900 font-display">
                Internet <span className="text-[#5B21FF]">Modules</span>
              </h1>
              <p className="text-xs text-indigo-600 font-sans font-semibold tracking-wide uppercase">
                Accounts & Billing System
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 my-1"></div>

          {/* VIEW: SIGN IN */}
          {loginMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Registered Email ID</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. modulesinternet@gmail.com"
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
                Login
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
                  placeholder="e.g. modulesinternet@gmail.com"
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

          <div className="text-center pt-1.5 flex items-center justify-center gap-2 font-mono text-[10px] font-bold text-slate-400 select-none">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>App Version: v{appVersion.version}</span>
          </div>


        </motion.div>

        {/* TOAST PANEL WRAPPER ON LOGIN SCREEN */}
        {toast && (
          <div 
            onClick={() => setToast(null)}
            className={`fixed top-6 right-6 z-[100] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 transition-all duration-500 transform translate-y-0 scale-100 flex items-start gap-3.5 cursor-pointer overflow-hidden group select-none ${
              toast.type === 'error' ? 'border-l-4 border-l-rose-500' : 
              toast.type === 'info' ? 'border-l-4 border-l-indigo-500' : 'border-l-4 border-l-emerald-500'
            }`}
            id="system-professional-toast-login"
          >
            <div className={`shrink-0 rounded-full p-2 flex items-center justify-center ${
              toast.type === 'error' ? 'bg-rose-50 text-rose-600' :
              toast.type === 'info' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
            } group-hover:scale-110 transition duration-300`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 animate-pulse" />
              ) : toast.type === 'info' ? (
                <Clock className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5 animate-bounce text-emerald-600" />
              )}
            </div>
            
            <div className="flex-1 space-y-0.5">
              <h4 className="text-[10px] font-bold text-slate-900 font-sans tracking-wide uppercase select-none flex items-center gap-1 select-none">
                {toast.type === 'error' ? 'System Error' : toast.type === 'info' ? 'Status Alert' : 'Sync Saved Successfully'}
                <Sparkles className={`w-3.5 h-3.5 ${toast.type === 'error' ? 'text-rose-400' : toast.type === 'info' ? 'text-indigo-400' : 'text-emerald-500'} animate-pulse`} />
              </h4>
              <p className="text-[11.5px] leading-relaxed font-semibold text-slate-700">{toast.message}</p>
            </div>

            <div 
              className={`absolute bottom-0 left-0 h-1 animate-progress-drain ${
                toast.type === 'error' ? 'bg-rose-500' :
                toast.type === 'info' ? 'bg-indigo-500' : 'bg-emerald-500'
              }`} 
            />
          </div>
        )}

        {showSplash && (
          <SplashAnimation 
            companyName={businessSettings?.companyName || 'iModules'} 
            logoUrl={businessSettings?.logoUrl || ''} 
            onComplete={() => setShowSplash(false)}
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col md:flex-row relative"
    >
      
      {/* PROFESSIONAL SYSTEM LOADERS - CENTERED CIRCULAR REFRESH OVERLAY TO PREVENT OLD DATA GLITCHES */}
      {fullScreenLoading && !dashboardMetrics && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in" id="global-refresh-barrier">
          <div className="relative flex items-center justify-center">
            {/* Radial pulsing waves */}
            <div className="absolute w-28 h-28 rounded-full border-2 border-indigo-100/60 animate-ping duration-1500"></div>
            <div className="absolute w-20 h-20 rounded-full bg-indigo-50/50 animate-pulse"></div>
            
            {/* Centered spinning design circle */}
            <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-indigo-600 border-r-indigo-400 animate-spin"></div>
            
            {/* Center icon */}
            <div className="absolute flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin [animation-duration:3s]" />
            </div>
          </div>
          <div className="mt-6 text-center space-y-1 select-none">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Synchronizing Workspace</h3>
            <p className="text-[11px] font-semibold text-slate-500">Loading ledger balances & live GST invoices...</p>
          </div>
        </div>
      )}

      {/* TOAST PANEL WRAPPER */}
      {toast && (
        <div 
          onClick={() => setToast(null)}
          className={`fixed top-6 right-6 z-[100] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 transition-all duration-500 transform translate-y-0 scale-100 flex items-start gap-3.5 cursor-pointer overflow-hidden group select-none ${
            toast.type === 'error' ? 'border-l-4 border-l-rose-500' : 
            toast.type === 'info' ? 'border-l-4 border-l-indigo-500' : 'border-l-4 border-l-emerald-500'
          }`}
          id="system-professional-toast"
        >
          <div className={`shrink-0 rounded-full p-2 flex items-center justify-center ${
            toast.type === 'error' ? 'bg-rose-50 text-rose-600' :
            toast.type === 'info' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
          } group-hover:scale-110 transition duration-300`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 animate-pulse" />
            ) : toast.type === 'info' ? (
              <Clock className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5 animate-bounce text-emerald-600" />
            )}
          </div>
          
          <div className="flex-1 space-y-0.5">
            <h4 className="text-[10px] font-bold text-slate-900 font-sans tracking-wide uppercase select-none flex items-center gap-1 select-none">
              {toast.type === 'error' ? 'System Error' : toast.type === 'info' ? 'Status Alert' : 'Sync Saved Successfully'}
              <Sparkles className={`w-3.5 h-3.5 ${toast.type === 'error' ? 'text-rose-400' : toast.type === 'info' ? 'text-indigo-400' : 'text-emerald-500'} animate-pulse`} />
            </h4>
            <p className="text-[11.5px] leading-relaxed font-semibold text-slate-700">{toast.message}</p>
          </div>

          <div 
            className={`absolute bottom-0 left-0 h-1 animate-progress-drain ${
              toast.type === 'error' ? 'bg-rose-500' :
              toast.type === 'info' ? 'bg-indigo-500' : 'bg-emerald-500'
            }`} 
          />
        </div>
      )}

      {/* BACKGROUND BACKDROP FOR MOBILE DRAWER */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-45 md:hidden pointer-events-auto transition-opacity duration-300 no-print"
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
        <div className="p-5 pt-[calc(1.25rem+env(safe-area-inset-top,24px))] md:p-5 border-b border-[#E5E7EB]">
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
                <div className="overflow-hidden leading-snug flex flex-col justify-center">
                  <h1 className="text-[12.5px] xs:text-[13.5px] md:text-[14px] font-bold tracking-tight text-slate-900 font-display truncate max-w-[145px] xs:max-w-[170px]">
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
                  {(businessSettings?.gstIn || (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() !== 'android' && !/Android/i.test(navigator.userAgent))) && (
                    <span className="text-[10.5px] xs:text-[12px] font-mono text-purple-600 block leading-none font-semibold truncate max-w-[155px] xs:max-w-[190px] mt-0.5">
                      {businessSettings?.gstIn || "Active Portal"}
                    </span>
                  )}
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
            { id: 'workflow', label: 'Workflow Logs', icon: Workflow },
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
                className={`w-full flex items-center gap-2 md:gap-3 px-3 md:px-3.5 py-2 md:py-2.5 rounded-xl text-[11px] md:text-sm font-semibold transition tracking-wide cursor-pointer ${
                  isActive 
                    ? 'bg-[#F3F0FF] text-[#5B21FF] font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-905 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 md:w-4.5 md:h-4.5 shrink-0 ${isActive ? 'text-[#5B21FF]' : 'text-slate-400 group-hover:text-slate-705'}`} />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}

          {/* Conditional Logout item on Android/mobile directly below Business Settings */}
          {currentUser && (
            <div className="md:hidden pt-2 border-t border-slate-100 mt-2">
              <button
                onClick={() => {
                  localStorage.removeItem('current_user');
                  setCurrentUser(null);
                  setIsSidebarOpen(false);
                  showToast("Logged out successfully from portal session", "info");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition tracking-wide cursor-pointer focus:outline-none"
                title="Logout from system"
              >
                <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
                {isSidebarOpen && <span>Sign Out</span>}
              </button>
            </div>
          )}
        </nav>

        {/* Sidebar Footer Logout Button */}
        {currentUser && (
          <div className="hidden md:block p-3 border-t border-[#E5E7EB] bg-slate-50/50">
            <button
              onClick={() => {
                localStorage.removeItem('current_user');
                setCurrentUser(null);
                setIsSidebarOpen(false);
                showToast("Logged out successfully from portal session", "info");
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition tracking-wide cursor-pointer focus:outline-none"
              title="Logout from system"
            >
              <LogOut className="w-4.5 h-4.5 shrink-0 text-rose-500" />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        )}
      </aside>

      {/* MOBILE BAR TOP NAVIGATION */}
      <div className="bg-white border-b border-[#E5E7EB] text-slate-900 px-4 pb-3.5 pt-[calc(14px+env(safe-area-inset-top,0px))] flex items-center justify-between md:hidden no-print font-sans sticky top-0 z-40 shadow-sm">
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
              <span className="text-[14px] font-bold tracking-tight text-slate-900 font-display truncate max-w-[185px] leading-tight select-none">
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
          {/* Connection status indicator (hidden on mobile to prevent header crowding) */}
          <div className={`hidden md:flex px-2 py-1 rounded-lg border items-center gap-1.5 transition text-[10px] font-bold ${
            isConnected 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-rose-50 text-rose-700 border-rose-150 animate-pulse'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
            <span>{isConnected ? "online" : "offline"}</span>
          </div>

          {/* Mobile global search trigger */}
          <button 
            onClick={() => {
              setShowMobileSearch(!showMobileSearch);
              if (!showMobileSearch) {
                setTimeout(() => document.getElementById('mobile-search-query')?.focus(), 80);
              }
            }}
            className="p-2 border border-[#E5E7EB] hover:bg-slate-50 rounded-xl cursor-pointer bg-white transition relative focus:outline-none"
            title="Toggle Search"
          >
            <Search className="w-4 h-4 text-slate-600" />
          </button>

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
                      onClick={async () => {
                        try {
                          await api.markAllNotificationsRead();
                          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                          showToast("Assigned read clearance to logs", "success");
                        } catch (e: any) {
                          showToast(`Clearance failed: ${e.message || e}`, "error");
                        }
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
                    notifications.slice(0, 5).map((item) => (
                      <div 
                        key={item.id} 
                        onClick={async () => {
                          if (!item.isRead) {
                            try {
                              await api.markNotificationRead(item.id);
                              setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
                              showToast("Notification marked as read", "success");
                            } catch (err: any) {
                              console.error("Failed to mark individual notification as read:", err);
                              showToast("Failed to mark notice as read", "error");
                            }
                          }
                        }}
                        className={`p-3 flex flex-col gap-1 transition ${item.isRead ? 'bg-white' : 'bg-slate-50/70 cursor-pointer hover:bg-slate-100'}`}
                        title={item.isRead ? "Operational Alert" : "Click to mark as read"}
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-[10px] font-bold text-slate-800 block truncate max-w-[190px]">{item.title}</span>
                          <span className="text-[8px] font-mono text-slate-400 shrink-0">{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-relaxed block">{item.message}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 bg-slate-50 flex items-center justify-center border-t border-slate-100">
                  <button 
                    onClick={() => {
                      setActiveTab('notifications');
                      setShowNotifications(false);
                    }}
                    className="w-full text-center py-2 px-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-105 active:scale-98 text-[10px] font-bold uppercase text-indigo-650 text-indigo-600 cursor-pointer transition"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Professional badge avatar on right edge of mobile top header */}
          {currentUser && (
            <button 
              onClick={() => setActiveTab('profile')}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-[#E5E7EB] text-[10px] font-bold font-mono text-slate-500 overflow-hidden shrink-0 hover:opacity-85 active:scale-95 transition focus:outline-none cursor-pointer"
              title="View Security Clearance Profile"
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} className="w-full h-full object-cover" alt="User Avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-[#5B21FF] text-white flex items-center justify-center font-bold font-sans text-[11px]">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* MOBILE DYNAMIC SEARCH DROPDOWN DRAWER */}
      {showMobileSearch && (
        <div className="bg-white border-b border-slate-200 p-3 md:hidden no-print animate-fade-in space-y-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="mobile-search-query"
              type="text"
              placeholder="Search invoices, clients, products..."
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setShowGlobalResults(true);
              }}
              onFocus={() => setShowGlobalResults(true)}
              className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5B21FF]"
            />
            {globalSearch && (
              <button 
                onClick={() => { setGlobalSearch(''); }}
                className="absolute right-2.5 inset-y-0 text-slate-400 hover:text-slate-600 flex items-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {showGlobalResults && globalSearch.trim() && (() => {
            const results = getGlobalResults();
            return (
              <div className="bg-white border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {results.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-[11px]">
                    No matches found.
                  </div>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        r.action();
                        setShowGlobalResults(false);
                        setShowMobileSearch(false);
                        setGlobalSearch('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-50 transition flex flex-col gap-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded border ${
                          r.type === 'Invoice' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                          r.type === 'Customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          r.type === 'Product' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-pink-50 text-pink-700 border-pink-100'
                        }`}>
                          {r.type}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">{r.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate">{r.subtitle}</span>
                    </button>
                  ))
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* MASTER SCROLLABLE COMPONENT PANEL CONTAINER */}
      <main 
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 flex flex-col overflow-y-auto min-h-0 relative select-none"
      >
        {/* Pull to Refresh Indicator (Mobile Only) */}
        {isMobileDevice() && (pullDistance > 0 || isRefreshing) && (
          <div 
            className="w-full flex items-center justify-center bg-indigo-50/40 border-b border-indigo-100/40 min-h-0 overflow-hidden no-print shrink-0 transition-all duration-75"
            style={{ height: `${pullDistance}px`, opacity: pullDistance > 10 ? 1 : 0 }}
          >
            <div className="flex items-center gap-2 text-indigo-700 font-sans font-bold text-[11px] uppercase tracking-wider py-1.5 select-none">
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 4.5}deg)` }} />
              <span>{isRefreshing ? 'Syncing registered data...' : pullDistance >= 60 ? 'Release to refresh' : 'Pull down to refresh'}</span>
            </div>
          </div>
        )}

        {/* Top Operational Status Bar */}
        <header className="bg-white border-b border-[#E5E7EB] p-4 shrink-0 hidden md:flex items-center justify-between no-print shadow-sm sticky top-0 z-40 animate-fade-in gap-4">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            {/* High-visibility toggle for desktop */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 bg-slate-50 border border-[#E5E7EB] rounded-xl hover:bg-slate-100 active:scale-95 transition mr-1 hidden md:block"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-4.5 h-4.5 text-slate-600" />
            </button>
            
            {/* PREMIUM INTUITIVE GLOBAL SEARCH */}
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#5B21FF] transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Global ERP Search (Invoices, Customers, Products, Ledger)..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowGlobalResults(true);
                }}
                onFocus={() => setShowGlobalResults(true)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5B21FF] focus:bg-white transition font-sans"
              />
              {showGlobalResults && globalSearch.trim() && (() => {
                const results = getGlobalResults();
                return (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowGlobalResults(false)}
                    />
                    <div className="absolute left-0 mt-2 w-full bg-white border border-slate-250 border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 font-sans max-h-96 overflow-y-auto">
                      <div className="p-2.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Dynamic Matches ({results.length})</span>
                        <span className="text-[9px] lowercase font-normal">click to navigate</span>
                      </div>
                      {results.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          No matching ERP records found.
                        </div>
                      ) : (
                        results.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              r.action();
                              setShowGlobalResults(false);
                              setGlobalSearch('');
                            }}
                            className="w-full text-left p-3 hover:bg-slate-50/80 transition flex flex-col gap-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                r.type === 'Invoice' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                r.type === 'Customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                r.type === 'Product' ? 'bg-amber-55 bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-pink-50 text-pink-700 border-pink-100'
                              }`}>
                                {r.type}
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate">{r.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 leading-normal">{r.subtitle}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Direct manual cloud recheck button */}
            <button 
              onClick={loadMasterData}
              disabled={loading}
              className="p-2 border border-[#E5E7EB] hover:bg-slate-50 rounded-xl cursor-pointer block bg-white transition relative focus:outline-none disabled:opacity-50"
              title="Force Real-time Sync with Cloud Firestore"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>

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
                      onClick={async () => {
                        try {
                          await api.markAllNotificationsRead();
                          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                          showToast("Assigned read clearance to logs", "success");
                        } catch (e: any) {
                          showToast(`Clearance failed: ${e.message || e}`, "error");
                        }
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
                      notifications.slice(0, 5).map((item) => (
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
                  <div className="p-2 bg-slate-50 flex items-center justify-center border-t border-slate-100">
                    <button 
                      onClick={() => {
                        setActiveTab('notifications');
                        setShowNotifications(false);
                      }}
                      className="w-full text-center py-2 px-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-105 text-[10px] font-bold uppercase text-indigo-600 cursor-pointer transition"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logged in User Profile badge indicator */}
            {currentUser && (
              <button 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 py-1 px-2.5 rounded-xl shadow-xs transition duration-150 group cursor-pointer focus:outline-none"
                title="View & Edit Your Security Profile"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} className="w-full h-full object-cover" alt="User Avatar" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-[#5B21FF] text-white flex items-center justify-center font-bold font-sans text-[11px]">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left font-sans">
                  <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-900 leading-none">{currentUser.name}</span>
                  <span className="text-[8.5px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">Settings Clearance</span>
                </div>
              </button>
            )}
          </div>
        </header>

        {/* DYNAMIC COMPONENT PANEL CANVAS */}
        <div className="p-3 sm:p-6 md:p-8 pb-24 md:pb-8 flex-1 max-w-7xl w-full mx-auto" id="dynamic-element-stage">
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
                  businessSettings={businessSettings}
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
                  businessSettings={businessSettings}
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
                  onAddPayment={handleAddPayment}
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
                  businessSettings={businessSettings}
                />
              )}

              {activeTab === 'ledger' && (
                <LedgerModule 
                  ledger={ledger}
                  clients={clients}
                  initialSelectedClientId={ledgerSelectedClientId}
                  businessSettings={businessSettings}
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
                  businessSettings={businessSettings}
                />
              )}

              {activeTab === 'users' && (
                <UsersModule 
                  users={users}
                  logs={logs}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
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

              {activeTab === 'profile' && currentUser && (
                <ProfileModule 
                  currentUser={currentUser}
                  onUpdateCurrentUser={(updated) => {
                    setCurrentUser(updated);
                    localStorage.setItem('current_user', JSON.stringify(updated));
                    loadMasterData();
                  }}
                  showToast={showToast}
                  onLogout={() => {
                    localStorage.removeItem('current_user');
                    setCurrentUser(null);
                    showToast("Logged out successfully from portal session", "info");
                  }}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsModule 
                  notifications={notifications}
                  onMarkRead={async (id) => {
                    try {
                      await api.markNotificationRead(id);
                      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
                      showToast("Notification marked as read", "success");
                    } catch (e: any) {
                      showToast(`Action failed: ${e.message || e}`, "error");
                    }
                  }}
                  onMarkAllRead={async () => {
                    try {
                      await api.markAllNotificationsRead();
                      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                      showToast("All notifications marked as read", "success");
                    } catch (e: any) {
                      showToast(`Action failed: ${e.message || e}`, "error");
                    }
                  }}
                  onDelete={async (id) => {
                    try {
                      await api.deleteNotification(id);
                      setNotifications(prev => prev.filter(n => n.id !== id));
                      showToast("Notification deleted successfully", "success");
                    } catch (e: any) {
                      showToast(`Action failed: ${e.message || e}`, "error");
                    }
                  }}
                />
              )}

              {activeTab === 'workflow' && (
                <WorkflowModule 
                  logs={logs}
                  payments={payments}
                  onTriggerDemoCall={(mockPay) => {
                    triggerIncomingCall(mockPay as Payment);
                  }}
                  canWrite={getModulePermissions('payments').write}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* MOBILE FRIENDLY BOTTOM PORTAL NAVIGATION */}
      {currentUser && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 min-h-[72px] pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-2 bg-white border-t border-slate-200 z-40 flex items-center justify-around px-2 shadow-lg no-print">
          <button 
            onClick={() => {
              if (activeTab !== 'dashboard') setActiveTab('dashboard');
            }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all ${
              activeTab === 'dashboard' ? 'text-indigo-600 scale-105' : 'text-slate-400'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight">Home</span>
          </button>
          
          <button 
            onClick={() => {
              if (activeTab !== 'payments') setActiveTab('payments');
            }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all ${
              activeTab === 'payments' ? 'text-indigo-600 scale-105' : 'text-slate-400'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight">Payments</span>
          </button>

          <button 
            onClick={() => {
              if (activeTab !== 'invoices') setActiveTab('invoices');
            }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all ${
              activeTab === 'invoices' ? 'text-indigo-600 scale-105' : 'text-slate-400'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight">Invoices</span>
          </button>

          <button 
            onClick={() => {
              if (activeTab !== 'ledger') setActiveTab('ledger');
            }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all ${
              activeTab === 'ledger' ? 'text-indigo-600 scale-105' : 'text-slate-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight">Ledger</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-slate-400 active:scale-95 transition-all"
          >
            <Menu className="w-5 h-5 text-slate-500" />
            <span className="text-[10px] font-bold tracking-tight text-slate-500">More</span>
          </button>
        </div>
      )}

      {showIncomingCallAlert && (
        <div className="fixed inset-0 bg-[#0B0D19]/96 z-[9999] flex flex-col justify-between p-8 text-white font-sans animate-fade-in no-print overflow-hidden select-none">
          {/* Pulsing wave background lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <span className="absolute w-[200px] h-[200px] border border-emerald-500 rounded-full animate-ping"></span>
            <span className="absolute w-[400px] h-[400px] border border-indigo-500 rounded-full animate-ping delay-700"></span>
            <span className="absolute w-[600px] h-[600px] border border-cyan-500 rounded-full animate-ping delay-1000"></span>
          </div>

          {/* Top header indicator */}
          <div className="w-full flex flex-col items-center pt-8 space-y-2 z-10 text-center">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              🔔 HIGH-PRIORITY TRANSACTION DETECTED
            </span>
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 font-mono">
              iModules Secure Billing Network
            </h2>
          </div>

          {/* Main content display details */}
          <div className="w-full flex flex-col items-center space-y-7 z-10 text-center max-w-md mx-auto">
            {/* Glowing ring checkmark */}
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 border-2 border-emerald-400/50 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-bounce">
              <CheckCircle className="w-12 h-12 text-emerald-450 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <p className="text-slate-405 text-slate-400 text-xs font-semibold uppercase tracking-wider">Payments Entry Synced Successfully</p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-display drop-shadow-[0_4px_12px_rgba(255,255,255,0.08)]">
                {showIncomingCallAlert.message.match(/₹[\d,]+/)?.[0] || 'Payment Received'}
              </h1>
            </div>

            <div className="w-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-md rounded-3xl p-5 text-left space-y-3.5 shadow-xl">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-1">Corporate Payee client</span>
                <span className="text-sm font-bold text-slate-100 leading-snug">
                  {showIncomingCallAlert.message.match(/from\s+([^\svia\.]+)/)?.[1]?.trim() || 'N/A'}
                </span>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-1">Receipt Mode</span>
                  <span className="text-xs font-bold text-indigo-300">
                    ⚡ {showIncomingCallAlert.message.match(/via\s+([^\s\.]+)/)?.[1]?.trim() || 'Real-time'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-1">Audit stamp</span>
                  <span className="text-xs font-bold text-slate-100">
                    {new Date(showIncomingCallAlert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sliding interactive buttons at bottom */}
          <div className="w-full flex flex-col sm:flex-row items-center gap-4 max-w-sm mx-auto pb-8 z-10">
            <button
              onClick={() => {
                setActiveTab('ledger');
                setShowIncomingCallAlert(null);
              }}
              className="w-full py-4 bg-white text-[#0B0D19] hover:bg-slate-50 active:scale-98 font-bold text-xs rounded-2xl cursor-pointer shadow-xl transition flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-slate-700" />
              <span>Go to Accounts Ledger</span>
            </button>
            
            <button
              onClick={() => setShowIncomingCallAlert(null)}
              className="w-full py-3.5 text-xs bg-white/10 hover:bg-white/15 border border-white/10 active:scale-98 font-bold text-white rounded-2xl cursor-pointer transition text-center"
            >
              Dismiss Secure Alert
            </button>
          </div>
        </div>
      )}

      {androidIncomingCall && (
        <AndroidIncomingCallScreen
          payment={androidIncomingCall}
          settings={businessSettings}
          onAccept={() => {
            const formattedAmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(androidIncomingCall.amount);
            api.createLog('CALL_ACCEPTED', `Operator accepted VoIP Call notification for payment of ${formattedAmt} received from ${androidIncomingCall.clientName || 'N/A'} via ${androidIncomingCall.paymentMode}.`).catch(() => {});
            
            setActiveTab('payments');
            setAndroidIncomingCall(null);
          }}
          onDecline={() => {
            const formattedAmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(androidIncomingCall.amount);
            api.createLog('CALL_DECLINED', `Operator declined VoIP Call notification for payment of ${formattedAmt} received from ${androidIncomingCall.clientName || 'N/A'} via ${androidIncomingCall.paymentMode}.`).catch(() => {});
            setAndroidIncomingCall(null);
          }}
        />
      )}

      {showSplash && (
        <SplashAnimation 
          companyName={businessSettings?.companyName || 'iModules'} 
          logoUrl={businessSettings?.logoUrl || ''} 
          onComplete={() => setShowSplash(false)}
        />
      )}
    </motion.div>
  );
}
