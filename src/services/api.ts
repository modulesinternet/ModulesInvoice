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
} from '../types';

import { 
  DEFAULT_SETTINGS, 
  DEMO_CLIENTS, 
  DEMO_PRODUCTS, 
  DEMO_INVOICES, 
  DEMO_QUOTATIONS, 
  DEMO_PAYMENTS, 
  DEMO_LEDGER, 
  DEMO_CASHBOOK, 
  DEMO_LOGS, 
  DEMO_NOTIFICATIONS,
  DEMO_USERS
} from '../lib/demoData';

// Safe local database fetchers
function getDBItem<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(`apex_${key}`);
  if (!raw) {
    localStorage.setItem(`apex_${key}`, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function setDBItem<T>(key: string, data: T): void {
  localStorage.setItem(`apex_${key}`, JSON.stringify(data));
}

// Simulate latency for professional UX feedback loading states
function delay<T>(value: T, ms: number = 80): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

// Internal RBAC validator mimicking server checks
function checkPermission(module: string, action: 'read' | 'write' | 'delete'): void {
  const activeRole = (localStorage.getItem('active_role') || 'Admin') as string;
  const roles = getDBItem<RolePermissions[]>('roles', INITIAL_ROLES);
  
  const roleConfig = roles.find(r => r.role.toLowerCase() === activeRole.toLowerCase());
  if (!roleConfig) {
    throw new Error(`Security failure: Unknown system role: "${activeRole}"`);
  }
  
  const permission = (roleConfig.modules as any)[module];
  if (!permission || !permission[action]) {
    throw new Error(`Access Denied: Role "${activeRole}" does not have "${action}" permission for the "${module}" module.`);
  }
}

// Helper to log audit activity in local log list
function logUserActivity(action: string, details: string) {
  const logs = getDBItem<ActivityLog[]>('logs', DEMO_LOGS);
  const activeRole = localStorage.getItem('active_role') || 'Admin';
  const users = getDBItem<UserProfile[]>('users', DEMO_USERS);
  const activeUser = users.find(u => u.role.toLowerCase() === activeRole.toLowerCase()) || {
    userId: 'web-user',
    name: `${activeRole} Executive`
  };

  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: activeUser.userId,
    userName: activeUser.name,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  
  logs.unshift(newLog);
  if (logs.length > 200) logs.pop();
  setDBItem('logs', logs);
}

// Initial Roles definitions conforming to original database
const INITIAL_ROLES: RolePermissions[] = [
  {
    role: "Admin",
    modules: {
      dashboard: { read: true, write: true, delete: true },
      products: { read: true, write: true, delete: true },
      quotations: { read: true, write: true, delete: true },
      invoices: { read: true, write: true, delete: true },
      payments: { read: true, write: true, delete: true },
      ledger: { read: true, write: true, delete: true },
      cashbook: { read: true, write: true, delete: true },
      clients: { read: true, write: true, delete: true },
      users: { read: true, write: true, delete: true },
      settings: { read: true, write: true, delete: true }
    }
  },
  {
    role: "Manager",
    modules: {
      dashboard: { read: true, write: true, delete: false },
      products: { read: true, write: true, delete: false },
      quotations: { read: true, write: true, delete: false },
      invoices: { read: true, write: true, delete: false },
      payments: { read: true, write: true, delete: false },
      ledger: { read: true, write: true, delete: false },
      cashbook: { read: true, write: true, delete: false },
      clients: { read: true, write: true, delete: false },
      users: { read: true, write: true, delete: false },
      settings: { read: true, write: true, delete: false }
    }
  },
  {
    role: "Accountant",
    modules: {
      dashboard: { read: true, write: false, delete: false },
      products: { read: true, write: false, delete: false },
      quotations: { read: true, write: false, delete: false },
      invoices: { read: true, write: true, delete: false },
      payments: { read: true, write: true, delete: false },
      ledger: { read: true, write: true, delete: false },
      cashbook: { read: true, write: true, delete: false },
      clients: { read: true, write: true, delete: false },
      users: { read: true, write: false, delete: false },
      settings: { read: false, write: false, delete: false }
    }
  },
  {
    role: "Staff",
    modules: {
      dashboard: { read: true, write: false, delete: false },
      products: { read: true, write: false, delete: false },
      quotations: { read: true, write: true, delete: false },
      invoices: { read: true, write: false, delete: false },
      payments: { read: false, write: false, delete: false },
      ledger: { read: false, write: false, delete: false },
      cashbook: { read: false, write: false, delete: false },
      clients: { read: true, write: false, delete: false },
      users: { read: false, write: false, delete: false },
      settings: { read: false, write: false, delete: false }
    }
  }
];

const INITIAL_CATEGORIES = Array.from(new Set(DEMO_PRODUCTS.map(p => p.category || "General")));
if (INITIAL_CATEGORIES.length === 0) {
  INITIAL_CATEGORIES.push('Software Services', 'Cloud Infrastructure', 'Licensing', 'Creative Services', 'Security Services', 'Hardware Assets', 'Support Retainers');
}

// Run DB bootstrapping on import
const db_initialized = localStorage.getItem('apex_db_initialized');
if (!db_initialized) {
  localStorage.setItem('apex_settings', JSON.stringify(DEFAULT_SETTINGS));
  localStorage.setItem('apex_clients', JSON.stringify(DEMO_CLIENTS));
  localStorage.setItem('apex_products', JSON.stringify(DEMO_PRODUCTS));
  localStorage.setItem('apex_invoices', JSON.stringify(DEMO_INVOICES));
  localStorage.setItem('apex_quotations', JSON.stringify(DEMO_QUOTATIONS));
  localStorage.setItem('apex_payments', JSON.stringify(DEMO_PAYMENTS));
  localStorage.setItem('apex_ledger', JSON.stringify(DEMO_LEDGER));
  localStorage.setItem('apex_cashbook', JSON.stringify(DEMO_CASHBOOK));
  localStorage.setItem('apex_logs', JSON.stringify(DEMO_LOGS));
  localStorage.setItem('apex_notifications', JSON.stringify(DEMO_NOTIFICATIONS));
  localStorage.setItem('apex_users', JSON.stringify(DEMO_USERS));
  localStorage.setItem('apex_roles', JSON.stringify(INITIAL_ROLES));
  localStorage.setItem('apex_categories', JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem('apex_db_initialized', 'true');
}

export const api = {
  // Backups and Restorations (Professional offline-first strategy)
  exportDatabase: () => {
    const backup = {
      settings: getDBItem('settings', DEFAULT_SETTINGS),
      clients: getDBItem('clients', DEMO_CLIENTS),
      products: getDBItem('products', DEMO_PRODUCTS),
      invoices: getDBItem('invoices', DEMO_INVOICES),
      quotations: getDBItem('quotations', DEMO_QUOTATIONS),
      payments: getDBItem('payments', DEMO_PAYMENTS),
      ledger: getDBItem('ledger', DEMO_LEDGER),
      cashbook: getDBItem('cashbook', DEMO_CASHBOOK),
      logs: getDBItem('logs', DEMO_LOGS),
      notifications: getDBItem('notifications', DEMO_NOTIFICATIONS),
      users: getDBItem('users', DEMO_USERS),
      roles: getDBItem('roles', INITIAL_ROLES),
      categories: getDBItem('categories', INITIAL_CATEGORIES)
    };
    return backup;
  },

  importDatabase: (backup: any) => {
    if (!backup || typeof backup !== 'object') throw new Error("Invalid backup format provided.");
    if (backup.settings) setDBItem('settings', backup.settings);
    if (backup.clients) setDBItem('clients', backup.clients);
    if (backup.products) setDBItem('products', backup.products);
    if (backup.invoices) setDBItem('invoices', backup.invoices);
    if (backup.quotations) setDBItem('quotations', backup.quotations);
    if (backup.payments) setDBItem('payments', backup.payments);
    if (backup.ledger) setDBItem('ledger', backup.ledger);
    if (backup.cashbook) setDBItem('cashbook', backup.cashbook);
    if (backup.logs) setDBItem('logs', backup.logs);
    if (backup.notifications) setDBItem('notifications', backup.notifications);
    if (backup.users) setDBItem('users', backup.users);
    if (backup.roles) setDBItem('roles', backup.roles);
    if (backup.categories) setDBItem('categories', backup.categories);
    logUserActivity("DB_RESTORE", "Successfully restored standard database file from manual backup.");
    return true;
  },

  // 1. Dashboard Metrics
  getDashboard: () => {
    checkPermission('dashboard', 'read');
    
    const db_payments = getDBItem<Payment[]>('payments', DEMO_PAYMENTS);
    const db_invoices = getDBItem<Invoice[]>('invoices', DEMO_INVOICES);
    const db_clients = getDBItem<Client[]>('clients', DEMO_CLIENTS);
    const db_cashbook = getDBItem<CashbookEntry[]>('cashbook', DEMO_CASHBOOK);

    const totalRevenue = db_payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.total, 0);
    const unpaidInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
    const totalOutstanding = db_clients.reduce((sum, c) => sum + c.outstandingBalance, 0);

    const totalClientsCount = db_clients.length;
    const totalInvoicesCount = db_invoices.length;
    const pendingInvoicesCount = db_invoices.filter(i => i.status !== 'paid').length;

    // Monthly breakdown for Chart (Recharts)
    const monthlyDataMap = new Map<string, { month: string; billed: number; collected: number }>();
    const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    months.forEach(m => {
      monthlyDataMap.set(m, { month: m, billed: 0, collected: 0 });
    });

    db_invoices.forEach(inv => {
      const monthIndex = new Date(inv.date).getMonth();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const name = monthNames[monthIndex];
      if (monthlyDataMap.has(name)) {
        const existing = monthlyDataMap.get(name)!;
        existing.billed += inv.total;
      }
    });

    db_payments.forEach(pay => {
      const monthIndex = new Date(pay.paymentDate).getMonth();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const name = monthNames[monthIndex];
      if (monthlyDataMap.has(name)) {
        const existing = monthlyDataMap.get(name)!;
        existing.collected += pay.amount;
      }
    });

    const chartData = Array.from(monthlyDataMap.values());

    // Recent 5 invoices
    const recentInvoices = db_invoices.slice(0, 5).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      total: inv.total,
      status: inv.status,
      date: inv.date
    }));

    // Top clients by total billed
    const clientBilled: { [key: string]: { name: string; amount: number } } = {};
    db_invoices.forEach(inv => {
      if (!clientBilled[inv.clientId]) {
        clientBilled[inv.clientId] = { name: inv.clientName, amount: 0 };
      }
      clientBilled[inv.clientId].amount += inv.total;
    });
    const topClients = Object.values(clientBilled)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const upiCollected = db_payments.filter(p => p.paymentMode === 'UPI').reduce((sum, p) => sum + p.amount, 0);
    const bankCollected = db_payments.filter(p => p.paymentMode === 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0);
    const cashCollected = db_payments.filter(p => p.paymentMode === 'Cash').reduce((sum, p) => sum + p.amount, 0);
    const otherCollected = db_payments.filter(p => p.paymentMode !== 'Cash' && p.paymentMode !== 'UPI' && p.paymentMode !== 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0);

    const latestCashbook = db_cashbook[0] || { runningCashBalance: 250000, runningBankBalance: 2005400 };

    return delay({
      metrics: {
        totalRevenue,
        totalInvoicesValue,
        unpaidInvoicesValue,
        totalOutstanding,
        totalClientsCount,
        totalInvoicesCount,
        pendingInvoicesCount,
        cashBalance: latestCashbook.runningCashBalance,
        bankBalance: latestCashbook.runningBankBalance
      },
      paymentMethods: [
        { name: 'UPI Collections', value: upiCollected, color: '#8B5CF6' },
        { name: 'Bank Wire / EFT', value: bankCollected, color: '#3B82F6' },
        { name: 'Over Counter Cash', value: cashCollected, color: '#10B981' },
        { name: 'Paper Cheque/Card', value: otherCollected, color: '#F59E0B' }
      ],
      chartData,
      recentInvoices,
      topClients
    });
  },

  // 2. Clients
  getClients: () => {
    checkPermission('clients', 'read');
    return delay(getDBItem<Client[]>('clients', DEMO_CLIENTS));
  },

  createClient: (client: Partial<Client>) => {
    checkPermission('clients', 'write');
    const db_clients = getDBItem<Client[]>('clients', DEMO_CLIENTS);
    const newClient: Client = {
      id: `c-${Date.now()}`,
      name: client.name || "Unnamed Client",
      email: client.email || "",
      phone: client.phone || "",
      gstIn: client.gstIn || "",
      pan: client.pan || "",
      billingAddress: client.billingAddress || "",
      shippingAddress: client.shippingAddress || "",
      outstandingBalance: 0,
      createdAt: new Date().toISOString()
    };
    db_clients.unshift(newClient);
    setDBItem('clients', db_clients);
    logUserActivity("CLIENT_CREATE", `Registered new client: ${newClient.name} with GSTIN ${newClient.gstIn || "N/A"}`);
    return delay(newClient);
  },

  updateClient: (id: string, client: Partial<Client>) => {
    checkPermission('clients', 'write');
    const db_clients = getDBItem<Client[]>('clients', DEMO_CLIENTS);
    const index = db_clients.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Client not found");
    db_clients[index] = { ...db_clients[index], ...client };
    setDBItem('clients', db_clients);
    logUserActivity("CLIENT_UPDATE", `Updated details for client: ${db_clients[index].name}`);
    return delay(db_clients[index]);
  },

  deleteClient: (id: string) => {
    checkPermission('clients', 'delete');
    let db_clients = getDBItem<Client[]>('clients', DEMO_CLIENTS);
    const target = db_clients.find(c => c.id === id);
    if (!target) throw new Error("Client not found");
    db_clients = db_clients.filter(c => c.id !== id);
    setDBItem('clients', db_clients);
    logUserActivity("CLIENT_DELETE", `Removed client: ${target.name}`);
    return delay({ success: true });
  },

  // 3. Products
  getProducts: () => {
    checkPermission('products', 'read');
    return delay(getDBItem<Product[]>('products', DEMO_PRODUCTS));
  },

  createProduct: (product: Partial<Product>) => {
    checkPermission('products', 'write');
    const db_products = getDBItem<Product[]>('products', DEMO_PRODUCTS);
    const newProduct: Product = {
      id: `p-${Date.now()}`,
      name: product.name || "New Product",
      sku: product.sku || `SKU-${Date.now()}`,
      category: product.category || "General",
      price: Number(product.price || 0),
      gstPercent: Number(product.gstPercent ?? 18),
      hsnSac: product.hsnSac || "998313",
      stockQty: Number(product.stockQty ?? 100),
      unit: product.unit || "HRS"
    };
    db_products.unshift(newProduct);
    setDBItem('products', db_products);
    logUserActivity("PRODUCT_CREATE", `Added product catalog asset: ${newProduct.name} - SKU: ${newProduct.sku}`);
    return delay(newProduct);
  },

  updateProduct: (id: string, product: Partial<Product>) => {
    checkPermission('products', 'write');
    const db_products = getDBItem<Product[]>('products', DEMO_PRODUCTS);
    const index = db_products.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Product asset mapping not found");
    db_products[index] = { ...db_products[index], ...product };
    setDBItem('products', db_products);
    logUserActivity("PRODUCT_UPDATE", `Updated asset data: ${db_products[index].name}`);
    return delay(db_products[index]);
  },

  deleteProduct: (id: string) => {
    checkPermission('products', 'delete');
    let db_products = getDBItem<Product[]>('products', DEMO_PRODUCTS);
    const target = db_products.find(p => p.id === id);
    if (!target) throw new Error("Product asset mapping not found");
    db_products = db_products.filter(p => p.id !== id);
    setDBItem('products', db_products);
    logUserActivity("PRODUCT_DELETE", `Archived asset category code: ${target.name}`);
    return delay({ success: true });
  },

  // 4. Categories
  getCategories: () => {
    checkPermission('products', 'read');
    return delay(getDBItem<string[]>('categories', INITIAL_CATEGORIES));
  },

  createCategory: (name: string) => {
    checkPermission('products', 'write');
    const db_categories = getDBItem<string[]>('categories', INITIAL_CATEGORIES);
    const target = (name || "").trim();
    if (!target) throw new Error("Category name is required");
    if (!db_categories.some(c => c.toLowerCase() === target.toLowerCase())) {
      db_categories.push(target);
      setDBItem('categories', db_categories);
      logUserActivity("CATEGORY_CREATE", `Registered billing business stream: "${target}"`);
    }
    return delay({ success: true, categories: db_categories });
  },

  updateCategory: (oldName: string, newName: string) => {
    checkPermission('products', 'write');
    let db_categories = getDBItem<string[]>('categories', INITIAL_CATEGORIES);
    let db_products = getDBItem<Product[]>('products', DEMO_PRODUCTS);
    
    const trimmedNew = (newName || "").trim();
    if (!trimmedNew) throw new Error("New category name is required");

    const index = db_categories.findIndex(c => c.toLowerCase() === oldName.trim().toLowerCase());
    if (index !== -1) {
      db_categories[index] = trimmedNew;
      setDBItem('categories', db_categories);

      let count = 0;
      db_products = db_products.map(p => {
        if (p.category && p.category.toLowerCase() === oldName.trim().toLowerCase()) {
          count++;
          return { ...p, category: trimmedNew };
        }
        return p;
      });
      setDBItem('products', db_products);
      logUserActivity("CATEGORY_UPDATE", `Renamed master stream from "${oldName}" to "${trimmedNew}" (re-routed ${count} product(s))`);
      return delay({ success: true, categories: db_categories });
    } else {
      throw new Error("Category stream not found");
    }
  },

  deleteCategory: (name: string) => {
    checkPermission('products', 'delete');
    let db_categories = getDBItem<string[]>('categories', INITIAL_CATEGORIES);
    let db_products = getDBItem<Product[]>('products', DEMO_PRODUCTS);

    const target = (name || "").trim();
    db_categories = db_categories.filter(c => c.toLowerCase() !== target.toLowerCase());
    setDBItem('categories', db_categories);

    let count = 0;
    db_products = db_products.map(p => {
      if (p.category && p.category.toLowerCase() === target.toLowerCase()) {
        count++;
        return { ...p, category: 'Uncategorized' };
      }
      return p;
    });
    setDBItem('products', db_products);
    logUserActivity("CATEGORY_DELETE", `De-commissioned billing stream: "${name}" (${count} product assets fallback to Uncategorized)`);
    return delay({ success: true, categories: db_categories });
  },

  // 5. Invoices
  getInvoices: () => {
    checkPermission('invoices', 'read');
    return delay(getDBItem<Invoice[]>('invoices', DEMO_INVOICES));
  },

  createInvoice: (invoice: Partial<Invoice>) => {
    checkPermission('invoices', 'write');
    const db_invoices = getDBItem<Invoice[]>('invoices', DEMO_INVOICES);
    const db_clients = getDBItem<Client[]>('clients', DEMO_CLIENTS);
    const db_ledger = getDBItem<LedgerEntry[]>('ledger', DEMO_LEDGER);
    const db_settings = getDBItem<BusinessSettings>('settings', DEFAULT_SETTINGS);

    const id = `inv-${Date.now()}`;
    const total = Number(invoice.total || 0);

    const newInvoice: Invoice = {
      id,
      invoiceNumber: invoice.invoiceNumber || `${db_settings.invoicePrefix}${String(db_invoices.length + 1).padStart(3, '0')}`,
      clientId: invoice.clientId || "",
      clientName: invoice.clientName || "Unnamed Client",
      clientGst: invoice.clientGst || "",
      date: invoice.date || new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate || new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
      items: invoice.items || [],
      subtotal: Number(invoice.subtotal || 0),
      discount: Number(invoice.discount || 0),
      taxType: invoice.taxType || "CGST_SGST",
      taxAmount: Number(invoice.taxAmount || 0),
      total,
      paidAmount: Number(invoice.paidAmount || 0),
      dueAmount: Number(invoice.dueAmount ?? total),
      status: invoice.status || "unpaid",
      createdAt: new Date().toISOString(),
      notes: invoice.notes || ""
    };

    db_invoices.unshift(newInvoice);
    setDBItem('invoices', db_invoices);

    // Automation outstanding and ledger balances
    const clientIndex = db_clients.findIndex(c => c.id === newInvoice.clientId);
    let startingBalance = 0;
    if (clientIndex !== -1) {
      startingBalance = db_clients[clientIndex].outstandingBalance;
      db_clients[clientIndex].outstandingBalance += newInvoice.dueAmount;
      setDBItem('clients', db_clients);
    }

    const newLedger: LedgerEntry = {
      id: `led-${Date.now()}`,
      clientId: newInvoice.clientId,
      clientName: newInvoice.clientName,
      date: newInvoice.date,
      description: `Invoice Raised: ${newInvoice.invoiceNumber}`,
      type: "debit",
      amount: newInvoice.total,
      runningBalance: startingBalance + newInvoice.total,
      referenceType: "invoice",
      referenceId: id,
      createdAt: new Date().toISOString()
    };
    db_ledger.unshift(newLedger);
    setDBItem('ledger', db_ledger);

    logUserActivity("INVOICE_CREATE", `Generated invoice ${newInvoice.invoiceNumber} for ${newInvoice.clientName} (INR ${newInvoice.total})`);
    return delay(newInvoice);
  },

  deleteInvoice: (id: string) => {
    checkPermission('invoices', 'delete');
    let db_invoices = getDBItem<Invoice[]>('invoices', DEMO_INVOICES);
    const db_clients = getDBItem<Client[]>('clients', DEMO_CLIENTS);
    
    const index = db_invoices.findIndex(inv => inv.id === id);
    if (index === -1) throw new Error("Invoice tracking node not found");
    const inv = db_invoices[index];

    // reverse client balances
    const clientIndex = db_clients.findIndex(c => c.id === inv.clientId);
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = Math.max(0, db_clients[clientIndex].outstandingBalance - inv.dueAmount);
      setDBItem('clients', db_clients);
    }

    db_invoices.splice(index, 1);
    setDBItem('invoices', db_invoices);

    logUserActivity("INVOICE_DELETE", `Voided and deleted matching invoice reference: ${inv.invoiceNumber}`);
    return delay({ success: true });
  },

  // 6. Quotations
  getQuotations: () => {
    checkPermission('quotations', 'read');
    return delay(getDBItem<Quotation[]>('quotations', DEMO_QUOTATIONS));
  },

  createQuotation: (quotation: Partial<Quotation>) => {
    checkPermission('quotations', 'write');
    const db_quotations = getDBItem<Quotation[]>('quotations', DEMO_QUOTATIONS);
    const db_settings = getDBItem<BusinessSettings>('settings', DEFAULT_SETTINGS);

    const newQuotation: Quotation = {
      id: `q-${Date.now()}`,
      quotationNumber: quotation.quotationNumber || `${db_settings.quotationPrefix}${String(db_quotations.length + 1).padStart(3, '0')}`,
      clientId: quotation.clientId || "",
      clientName: quotation.clientName || "Unnamed Client",
      date: quotation.date || new Date().toISOString().split('T')[0],
      expiryDate: quotation.expiryDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      items: quotation.items || [],
      subtotal: Number(quotation.subtotal || 0),
      discount: Number(quotation.discount || 0),
      taxAmount: Number(quotation.taxAmount || 0),
      total: Number(quotation.total || 0),
      status: quotation.status || "draft",
      createdAt: new Date().toISOString(),
      notes: quotation.notes || ""
    };

    db_quotations.unshift(newQuotation);
    setDBItem('quotations', db_quotations);
    logUserActivity("QUOTATION_CREATE", `Prepared estimate ${newQuotation.quotationNumber} for ${newQuotation.clientName}`);
    return delay(newQuotation);
  },

  updateQuotation: (id: string, q: Partial<Quotation>) => {
    checkPermission('quotations', 'write');
    const db_quotations = getDBItem<Quotation[]>('quotations', DEMO_QUOTATIONS);
    const index = db_quotations.findIndex(item => item.id === id);
    if (index === -1) throw new Error("Proposal sheet not found");
    db_quotations[index] = { ...db_quotations[index], ...q };
    setDBItem('quotations', db_quotations);
    logUserActivity("QUOTATION_UPDATE", `Updated estimate status: ${db_quotations[index].quotationNumber} -> ${db_quotations[index].status}`);
    return delay(db_quotations[index]);
  },

  convertQuotation: (id: string) => {
    checkPermission('quotations', 'write');
    const db_quotations = getDBItem<Quotation[]>('quotations', DEMO_QUOTATIONS);
    const db_invoices = getDBItem<Invoice[]>('invoices', DEMO_INVOICES);
    const db_clients = getDBItem<Client[]>('clients', DEMO_CLIENTS);
    const db_ledger = getDBItem<LedgerEntry[]>('ledger', DEMO_LEDGER);
    const db_settings = getDBItem<BusinessSettings>('settings', DEFAULT_SETTINGS);

    const qIndex = db_quotations.findIndex(q => q.id === id);
    if (qIndex === -1) throw new Error("Quotation proposal not found");
    const q = db_quotations[qIndex];

    const invoiceId = `inv-${Date.now()}`;
    const invoiceNum = `${db_settings.invoicePrefix}${String(db_invoices.length + 1).padStart(3, '0')}`;
    const clientDetails = db_clients.find(c => c.id === q.clientId);

    const convertedInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber: invoiceNum,
      clientId: q.clientId,
      clientName: q.clientName,
      clientGst: clientDetails?.gstIn || "",
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
      items: q.items,
      subtotal: q.subtotal,
      discount: q.discount,
      taxType: clientDetails && db_settings.gstIn && !clientDetails.gstIn.startsWith(db_settings.gstIn.substring(0,2)) ? "IGST" : "CGST_SGST",
      taxAmount: q.taxAmount,
      total: q.total,
      paidAmount: 0,
      dueAmount: q.total,
      status: "unpaid",
      createdAt: new Date().toISOString(),
      notes: `Converted from Estimate Ref: ${q.quotationNumber}`
    };

    db_invoices.unshift(convertedInvoice);
    setDBItem('invoices', db_invoices);

    q.status = "converted";
    q.convertedInvoiceId = invoiceId;
    setDBItem('quotations', db_quotations);

    if (clientDetails) {
      clientDetails.outstandingBalance += q.total;
      setDBItem('clients', db_clients);
    }

    const newLedger: LedgerEntry = {
      id: `led-${Date.now()}`,
      clientId: q.clientId,
      clientName: q.clientName,
      date: convertedInvoice.date,
      description: `Invoice Raised from Proposal: ${invoiceNum}`,
      type: "debit",
      amount: convertedInvoice.total,
      runningBalance: (clientDetails?.outstandingBalance || 0),
      referenceType: "invoice",
      referenceId: invoiceId,
      createdAt: new Date().toISOString()
    };
    db_ledger.unshift(newLedger);
    setDBItem('ledger', db_ledger);

    logUserActivity("QUOTATION_CONVERT", `Successfully converted estimate ${q.quotationNumber} into live invoice: ${invoiceNum}`);
    return delay({ success: true, invoice: convertedInvoice });
  },

  // 7. Payments / Receipts
  getPayments: () => {
    checkPermission('payments', 'read');
    return delay(getDBItem<Payment[]>('payments', DEMO_PAYMENTS));
  },

  createPayment: (payment: Partial<Payment>) => {
    checkPermission('payments', 'write');
    const db_payments = getDBItem<Payment[]>('payments', DEMO_PAYMENTS);
    const db_invoices = getDBItem<Invoice[]>('invoices', DEMO_INVOICES);
    const db_clients = getDBItem<Client[]>('clients', DEMO_CLIENTS);
    const db_ledger = getDBItem<LedgerEntry[]>('ledger', DEMO_LEDGER);
    const db_cashbook = getDBItem<CashbookEntry[]>('cashbook', DEMO_CASHBOOK);

    const payId = `pay-${Date.now()}`;
    const amountPaid = Number(payment.amount || 0);

    const newPayment: Payment = {
      id: payId,
      invoiceId: payment.invoiceId || "",
      invoiceNumber: payment.invoiceNumber || "",
      clientId: payment.clientId || "",
      clientName: payment.clientName || "Unnamed Client",
      amount: amountPaid,
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      paymentMode: payment.paymentMode || "UPI",
      referenceNum: payment.referenceNum || `REF-${Date.now()}`,
      remarks: payment.remarks || "No comments",
      createdAt: new Date().toISOString()
    };

    db_payments.unshift(newPayment);
    setDBItem('payments', db_payments);

    // AUTOMATION 1: Update Invoice balance status
    const invIndex = db_invoices.findIndex(i => i.id === newPayment.invoiceId);
    if (invIndex !== -1) {
      const inv = db_invoices[invIndex];
      inv.paidAmount += amountPaid;
      inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
      
      if (inv.dueAmount === 0) {
        inv.status = 'paid';
      } else if (inv.paidAmount > 0) {
        inv.status = 'partially_paid';
      }
      setDBItem('invoices', db_invoices);
    }

    // AUTOMATION 2: Update outstanding balance
    const clientIndex = db_clients.findIndex(c => c.id === newPayment.clientId);
    let runningClientBalance = 0;
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = Math.max(0, db_clients[clientIndex].outstandingBalance - amountPaid);
      runningClientBalance = db_clients[clientIndex].outstandingBalance;
      setDBItem('clients', db_clients);
    }

    // AUTOMATION 3: Credit Client Ledger
    const newLedger: LedgerEntry = {
      id: `led-${Date.now()}`,
      clientId: newPayment.clientId,
      clientName: newPayment.clientName,
      date: newPayment.paymentDate,
      description: `Payment Receipt: ${newPayment.id} against ${newPayment.invoiceNumber} via ${newPayment.paymentMode}`,
      type: "credit",
      amount: amountPaid,
      runningBalance: runningClientBalance,
      referenceType: "payment",
      referenceId: payId,
      createdAt: new Date().toISOString()
    };
    db_ledger.unshift(newLedger);
    setDBItem('ledger', db_ledger);

    // AUTOMATION 4: Cashbook ledger adjustment streams
    const lastCashbookEntry = db_cashbook[0] || { runningCashBalance: 250000, runningBankBalance: 2005400 };
    let cashChange = 0;
    let bankChange = 0;

    if (newPayment.paymentMode === 'Cash') {
      cashChange = amountPaid;
    } else {
      bankChange = amountPaid;
    }

    const newCashbook: CashbookEntry = {
      id: `cb-${Date.now()}`,
      date: newPayment.paymentDate,
      description: `Invoiced Collection [${newPayment.clientName}] Ref ${newPayment.referenceNum}`,
      type: "income",
      paymentMode: newPayment.paymentMode,
      amount: amountPaid,
      referenceId: payId,
      runningCashBalance: lastCashbookEntry.runningCashBalance + cashChange,
      runningBankBalance: lastCashbookEntry.runningBankBalance + bankChange,
      createdAt: new Date().toISOString()
    };
    db_cashbook.unshift(newCashbook);
    setDBItem('cashbook', db_cashbook);

    logUserActivity("PAYMENT_COLLECT", `Collected payments code: ${amountPaid} from client ${newPayment.clientName}. Double-entry cash accounts synced.`);
    return delay(newPayment);
  },

  // 8. Ledgers
  getLedgers: () => {
    checkPermission('ledger', 'read');
    return delay(getDBItem<LedgerEntry[]>('ledger', DEMO_LEDGER));
  },

  getLedgerByClient: (clientId: string) => {
    checkPermission('ledger', 'read');
    const db_ledger = getDBItem<LedgerEntry[]>('ledger', DEMO_LEDGER);
    return delay(db_ledger.filter(entry => entry.clientId === clientId));
  },

  // 9. Cashbook
  getCashbook: () => {
    checkPermission('cashbook', 'read');
    return delay(getDBItem<CashbookEntry[]>('cashbook', DEMO_CASHBOOK));
  },

  createCashbookEntry: (entry: Partial<CashbookEntry>) => {
    checkPermission('cashbook', 'write');
    const db_cashbook = getDBItem<CashbookEntry[]>('cashbook', DEMO_CASHBOOK);

    const amount = Number(entry.amount || 0);
    const type = entry.type || "income";
    const mode = entry.paymentMode || "Cash";

    const lastEntry = db_cashbook[0] || { runningCashBalance: 250000, runningBankBalance: 2000000 };
    
    let newCash = lastEntry.runningCashBalance;
    let newBank = lastEntry.runningBankBalance;

    if (type === 'income') {
      if (mode === 'Cash') newCash += amount;
      else newBank += amount;
    } else if (type === 'expense') {
      if (mode === 'Cash') newCash -= amount;
      else newBank -= amount;
    } else if (type === 'bank_deposit') {
      newCash -= amount;
      newBank += amount;
    } else if (type === 'withdrawal') {
      newCash += amount;
      newBank -= amount;
    }

    const newEntry: CashbookEntry = {
      id: `cb-${Date.now()}`,
      date: entry.date || new Date().toISOString().split('T')[0],
      description: entry.description || "Cashbook Transaction Entry",
      type,
      paymentMode: mode,
      amount,
      runningCashBalance: newCash,
      runningBankBalance: newBank,
      createdAt: new Date().toISOString()
    };

    db_cashbook.unshift(newEntry);
    setDBItem('cashbook', db_cashbook);

    logUserActivity("CASHBOOK_CREATE", `Registered cash transaction: "${newEntry.description}" - amount: ${newEntry.amount} [Mode: ${newEntry.paymentMode}]`);
    return delay(newEntry);
  },

  // 10. Settings
  getSettings: () => {
    checkPermission('settings', 'read');
    return delay(getDBItem<BusinessSettings>('settings', DEFAULT_SETTINGS));
  },

  saveSettings: (settings: Partial<BusinessSettings>) => {
    checkPermission('settings', 'write');
    const db_settings = getDBItem<BusinessSettings>('settings', DEFAULT_SETTINGS);
    const updated = { ...db_settings, ...settings };
    setDBItem('settings', updated);
    logUserActivity("SETTINGS_UPDATE", `Re-configured master business organization metrics: "${updated.companyName}"`);
    return delay(updated);
  },

  // 11. Team Users
  getUsers: () => {
    checkPermission('users', 'read');
    return delay(getDBItem<UserProfile[]>('users', DEMO_USERS));
  },

  createUser: (user: Partial<UserProfile>) => {
    checkPermission('users', 'write');
    const db_users = getDBItem<UserProfile[]>('users', DEMO_USERS);
    const newUser: UserProfile = {
      userId: `u-${Date.now()}`,
      email: user.email || "",
      name: user.name || "New User",
      role: user.role || "Staff",
      status: user.status || "active",
      createdAt: new Date().toISOString(),
      lastLoginAt: ""
    };
    db_users.push(newUser);
    setDBItem('users', db_users);
    logUserActivity("USER_CREATE", `Onboarded teammate workspace profile: ${newUser.name} as role ${newUser.role}`);
    return delay(newUser);
  },

  // 12. Logs & Notifications
  getLogs: () => {
    checkPermission('settings', 'read'); // Safeguard auditing trace to higher tier credentials
    return delay(getDBItem<ActivityLog[]>('logs', DEMO_LOGS));
  },

  getNotifications: () => {
    return delay(getDBItem<Notification[]>('notifications', DEMO_NOTIFICATIONS));
  },

  markNotificationRead: (id: string) => {
    const db_notifications = getDBItem<Notification[]>('notifications', DEMO_NOTIFICATIONS);
    const index = db_notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      db_notifications[index].isRead = true;
      setDBItem('notifications', db_notifications);
    }
    return delay(db_notifications[index]);
  },

  // 13. System Permission Profiles
  getRoles: () => {
    return delay(getDBItem<RolePermissions[]>('roles', INITIAL_ROLES));
  },

  updateRole: (role: UserRole, payload: Partial<RolePermissions>) => {
    checkPermission('settings', 'write'); // Limit roles restructuring strictly to company admins
    const db_roles = getDBItem<RolePermissions[]>('roles', INITIAL_ROLES);
    const index = db_roles.findIndex(r => r.role.toLowerCase() === role.toLowerCase());
    if (index === -1) throw new Error("Role profile not found");
    
    // safe merge module states
    db_roles[index].modules = {
      ...db_roles[index].modules,
      ...payload.modules
    };
    
    setDBItem('roles', db_roles);
    logUserActivity("ROLE_UPDATE", `Restructured RBAC credential schema access permissions for role: ${role}`);
    return delay(db_roles[index]);
  }
};
