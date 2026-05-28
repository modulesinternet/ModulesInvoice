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

const DEFAULT_ROLES: RolePermissions[] = [
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
      users: { read: false, write: false, delete: false },
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

const DEFAULT_CATEGORIES = ['Software Services', 'Cloud Infrastructure', 'Licensing', 'Creative Services', 'Security Services', 'Hardware Assets', 'Support Retainers'];

// Connected database design: Force isLocalOnly to false to ensure all nodes connect to Central Firestore Database via REST proxy
const isLocalOnly = false;

function initLocalStorageDb() {
  if (!localStorage.getItem('db_settings')) {
    localStorage.setItem('db_settings', JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem('db_clients')) {
    localStorage.setItem('db_clients', JSON.stringify(DEMO_CLIENTS));
  }
  if (!localStorage.getItem('db_products')) {
    localStorage.setItem('db_products', JSON.stringify(DEMO_PRODUCTS));
  }
  if (!localStorage.getItem('db_invoices')) {
    localStorage.setItem('db_invoices', JSON.stringify(DEMO_INVOICES));
  }
  if (!localStorage.getItem('db_quotations')) {
    localStorage.setItem('db_quotations', JSON.stringify(DEMO_QUOTATIONS));
  }
  if (!localStorage.getItem('db_payments')) {
    localStorage.setItem('db_payments', JSON.stringify(DEMO_PAYMENTS));
  }
  if (!localStorage.getItem('db_ledger')) {
    localStorage.setItem('db_ledger', JSON.stringify(DEMO_LEDGER));
  }
  if (!localStorage.getItem('db_cashbook')) {
    localStorage.setItem('db_cashbook', JSON.stringify(DEMO_CASHBOOK));
  }
  if (!localStorage.getItem('db_logs')) {
    localStorage.setItem('db_logs', JSON.stringify(DEMO_LOGS));
  }
  if (!localStorage.getItem('db_notifications')) {
    localStorage.setItem('db_notifications', JSON.stringify(DEMO_NOTIFICATIONS));
  }
  if (!localStorage.getItem('db_users')) {
    localStorage.setItem('db_users', JSON.stringify(DEMO_USERS));
  }
  if (!localStorage.getItem('db_categories')) {
    const list = Array.from(new Set(DEMO_PRODUCTS.map(p => p.category || "General")));
    localStorage.setItem('db_categories', JSON.stringify(list.length > 0 ? list : DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem('db_roles')) {
    localStorage.setItem('db_roles', JSON.stringify(DEFAULT_ROLES));
  }
}

function getLocalItem<T>(key: string, fallback: T): T {
  initLocalStorageDb();
  const val = localStorage.getItem(key);
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function logLocalActivity(actionType: string, description: string) {
  const savedUser = localStorage.getItem('current_user');
  let name = 'Admin';
  let userId = 'admin-modulesinternet';
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      name = u.name || name;
      userId = u.userId || userId;
    } catch (_) {}
  }
  
  const logs = getLocalItem<ActivityLog[]>('db_logs', []);
  const newLog: ActivityLog = {
    id: `log-${Date.now()}`,
    userId,
    userName: name,
    action: actionType,
    details: description,
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog);
  setLocalItem('db_logs', logs);

  const notifs = getLocalItem<Notification[]>('db_notifications', []);
  const newNotif: Notification = {
    id: `notif-${Date.now()}`,
    title: actionType.replace(/_/g, ' '),
    message: description,
    type: 'info',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  notifs.unshift(newNotif);
  setLocalItem('db_notifications', notifs);
}

function getHeaders(): HeadersInit {
  const activeRole = localStorage.getItem('active_role') || 'Admin';
  const savedUser = localStorage.getItem('current_user');
  let email = '';
  if (savedUser) {
    try {
      email = JSON.parse(savedUser).email || '';
    } catch (_) {}
  }
  return {
    'Content-Type': 'application/json',
    'x-user-role': activeRole,
    'x-user-email': email.trim().toLowerCase()
  };
}

function getApiUrl(url: string) {
  const isCloudRun = window.location.hostname.includes('run.app');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // If the app is loaded from GitHub Pages (or any custom domain / third-party server remotely),
  // we proxy all operations to our main live backend for complete, synchronous Firebase database parity.
  const base = (!isCloudRun && !isLocalhost)
    ? 'https://ais-pre-xzpyeswg45bbcghpog5vdx-598615866613.asia-southeast1.run.app'
    : '';
  return `${base}${url}`;
}

// REST fetch request helper
async function request<T>(url: string, method: string = 'GET', body?: any): Promise<T> {
  const headers = getHeaders();
  const config: RequestInit = {
    method,
    headers,
  };
  if (body) {
    config.body = JSON.stringify(body);
  }
  const response = await fetch(getApiUrl(url), config);
  if (!response.ok) {
    let errMsg = `Request failed: ${response.statusText}`;
    try {
      const errJson = await response.json();
      errMsg = errJson.error || errJson.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // 1. Dashboard Metrics
  getDashboard: () => {
    if (isLocalOnly) {
      const db_payments = getLocalItem<Payment[]>('db_payments', []);
      const db_invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const db_clients = getLocalItem<Client[]>('db_clients', []);
      const db_cashbook = getLocalItem<CashbookEntry[]>('db_cashbook', []);

      const totalRevenue = db_payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalInvoicesValue = db_invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
      const unpaidInvoicesValue = db_invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
      const totalOutstanding = db_clients.reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0);
      const totalClientsCount = db_clients.length;
      const totalInvoicesCount = db_invoices.length;
      const pendingInvoicesCount = db_invoices.filter(i => i.status !== 'paid').length;

      const monthlyDataMap = new Map<string, { month: string; billed: number; collected: number }>();
      const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
      months.forEach(m => {
        monthlyDataMap.set(m, { month: m, billed: 0, collected: 0 });
      });

      db_invoices.forEach(inv => {
        const dateVal = inv.date || new Date().toISOString();
        const monthIndex = new Date(dateVal).getMonth();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const name = monthNames[monthIndex];
        if (monthlyDataMap.has(name)) {
          monthlyDataMap.get(name)!.billed += Number(inv.total || 0);
        }
      });

      db_payments.forEach(pay => {
        const dateVal = pay.paymentDate || new Date().toISOString();
        const monthIndex = new Date(dateVal).getMonth();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const name = monthNames[monthIndex];
        if (monthlyDataMap.has(name)) {
          monthlyDataMap.get(name)!.collected += Number(pay.amount || 0);
        }
      });

      const chartData = Array.from(monthlyDataMap.values());

      const recentInvoices = db_invoices.slice(0, 5).map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        total: inv.total,
        status: inv.status,
        date: inv.date
      }));

      const clientBilled: { [key: string]: { name: string; amount: number } } = {};
      db_invoices.forEach(inv => {
        if (!clientBilled[inv.clientId]) {
          clientBilled[inv.clientId] = { name: inv.clientName, amount: 0 };
        }
        clientBilled[inv.clientId].amount += Number(inv.total || 0);
      });
      const topClients = Object.values(clientBilled)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const upiCollected = db_payments.filter(p => p.paymentMode === 'UPI').reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const bankCollected = db_payments.filter(p => p.paymentMode === 'Bank Transfer').reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const cashCollected = db_payments.filter(p => p.paymentMode === 'Cash').reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const otherCollected = db_payments.filter(p => p.paymentMode !== 'Cash' && p.paymentMode !== 'UPI' && p.paymentMode !== 'Bank Transfer').reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const sortedCashbook = [...db_cashbook].sort((a, b) => {
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
          const amount = Number(c.amount || 0);
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

      return Promise.resolve({
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
          { name: 'UPI Collections', value: upiCollected, color: '#8B5CF6' },
          { name: 'Bank Wire / EFT', value: bankCollected, color: '#3B82F6' },
          { name: 'Over Counter Cash', value: cashCollected, color: '#10B981' },
          { name: 'Paper Cheque/Card', value: otherCollected, color: '#F59E0B' }
        ],
        chartData,
        recentInvoices,
        topClients
      });
    }
    return request<any>('/api/dashboard');
  },

  // 2. Clients
  getClients: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<Client[]>('db_clients', []));
    }
    return request<Client[]>('/api/clients');
  },

  createClient: (client: Partial<Client>) => {
    if (isLocalOnly) {
      const list = getLocalItem<Client[]>('db_clients', []);
      const newClient: Client = {
        id: `cli-${Date.now()}`,
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        gstIn: client.gstIn || "",
        pan: client.pan || "",
        billingAddress: client.billingAddress || (client as any).address || "",
        shippingAddress: client.shippingAddress || (client as any).address || "",
        outstandingBalance: 0,
        createdAt: new Date().toISOString()
      };
      list.unshift(newClient);
      setLocalItem('db_clients', list);
      logLocalActivity("CLIENT_CREATE", `Registered new corporate client "${newClient.name}"`);
      return Promise.resolve(newClient);
    }
    return request<Client>('/api/clients', 'POST', client);
  },

  updateClient: (id: string, client: Partial<Client>) => {
    if (isLocalOnly) {
      const list = getLocalItem<Client[]>('db_clients', []);
      const index = list.findIndex(c => c.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...client };
        setLocalItem('db_clients', list);
        logLocalActivity("CLIENT_UPDATE", `Updated details for client "${list[index].name}"`);
        return Promise.resolve(list[index]);
      }
      return Promise.reject(new Error("Client not found"));
    }
    return request<Client>(`/api/clients/${id}`, 'PUT', client);
  },

  deleteClient: (id: string) => {
    if (isLocalOnly) {
      const list = getLocalItem<Client[]>('db_clients', []);
      const client = list.find(c => c.id === id);
      const filtered = list.filter(c => c.id !== id);
      setLocalItem('db_clients', filtered);
      if (client) {
        logLocalActivity("CLIENT_DELETE", `Removed client "${client.name}"`);
      }
      return Promise.resolve({ success: true });
    }
    return request<{ success: boolean }>(`/api/clients/${id}`, 'DELETE');
  },

  // 3. Products / Services Catalogue
  getProducts: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<Product[]>('db_products', []));
    }
    return request<Product[]>('/api/products');
  },

  createProduct: (product: Partial<Product>) => {
    if (isLocalOnly) {
      const list = getLocalItem<Product[]>('db_products', []);
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: product.name || "",
        sku: product.sku || `SKU-${Date.now()}`,
        price: Number(product.price || 0),
        unit: product.unit || "Services",
        category: product.category || "General",
        gstPercent: product.gstPercent || 18,
        hsnSac: product.hsnSac || "",
        stockQty: product.stockQty || 0
      };
      list.unshift(newProduct);
      setLocalItem('db_products', list);
      logLocalActivity("PRODUCT_CREATE", `Listed catalogue item "${newProduct.name}"`);
      return Promise.resolve(newProduct);
    }
    return request<Product>('/api/products', 'POST', product);
  },

  updateProduct: (id: string, product: Partial<Product>) => {
    if (isLocalOnly) {
      const list = getLocalItem<Product[]>('db_products', []);
      const index = list.findIndex(p => p.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...product, price: Number(product.price ?? list[index].price) };
        setLocalItem('db_products', list);
        logLocalActivity("PRODUCT_UPDATE", `Updated product "${list[index].name}" settings`);
        return Promise.resolve(list[index]);
      }
      return Promise.reject(new Error("Product not found"));
    }
    return request<Product>(`/api/products/${id}`, 'PUT', product);
  },

  deleteProduct: (id: string) => {
    if (isLocalOnly) {
      const list = getLocalItem<Product[]>('db_products', []);
      const product = list.find(p => p.id === id);
      const filtered = list.filter(p => p.id !== id);
      setLocalItem('db_products', filtered);
      if (product) {
        logLocalActivity("PRODUCT_DELETE", `Removed item "${product.name}" from catalogue`);
      }
      return Promise.resolve({ success: true });
    }
    return request<{ success: boolean }>(`/api/products/${id}`, 'DELETE');
  },

  // 4. Categories Management
  getCategories: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<string[]>('db_categories', []));
    }
    return request<string[]>('/api/categories');
  },

  createCategory: (name: string) => {
    if (isLocalOnly) {
      const list = getLocalItem<string[]>('db_categories', []);
      const trimmed = name.trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
        setLocalItem('db_categories', list);
        logLocalActivity("CATEGORY_CREATE", `Created product category "${trimmed}"`);
      }
      return Promise.resolve({ success: true, categories: list });
    }
    return request<{ success: boolean; categories: string[] }>('/api/categories', 'POST', { name });
  },

  updateCategory: (oldName: string, newName: string) => {
    if (isLocalOnly) {
      let list = getLocalItem<string[]>('db_categories', []);
      const oTrim = oldName.trim();
      const nTrim = newName.trim();
      list = list.map(c => c === oTrim ? nTrim : c);
      setLocalItem('db_categories', list);

      const products = getLocalItem<Product[]>('db_products', []);
      products.forEach(p => {
        if (p.category === oTrim) p.category = nTrim;
      });
      setLocalItem('db_products', products);

      logLocalActivity("CATEGORY_UPDATE", `Renamed category from "${oTrim}" to "${nTrim}"`);
      return Promise.resolve({ success: true, categories: list });
    }
    return request<{ success: boolean; categories: string[] }>('/api/categories', 'PUT', { oldName, newName });
  },

  deleteCategory: (name: string) => {
    if (isLocalOnly) {
      const list = getLocalItem<string[]>('db_categories', []);
      const trimmed = name.trim();
      const filtered = list.filter(c => c !== trimmed);
      setLocalItem('db_categories', filtered);

      const products = getLocalItem<Product[]>('db_products', []);
      products.forEach(p => {
        if (p.category === trimmed) p.category = "General";
      });
      setLocalItem('db_products', products);

      logLocalActivity("CATEGORY_DELETE", `Removed product category "${trimmed}"`);
      return Promise.resolve({ success: true, categories: filtered });
    }
    return request<{ success: boolean; categories: string[] }>('/api/categories', 'DELETE', { name });
  },

  // 5. Invoices CRUD
  getInvoices: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<Invoice[]>('db_invoices', []));
    }
    return request<Invoice[]>('/api/invoices');
  },

  createInvoice: (invoice: Partial<Invoice>) => {
    if (isLocalOnly) {
      const db_invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const db_settings = getLocalItem<BusinessSettings>('db_settings', DEFAULT_SETTINGS);
      const db_clients = getLocalItem<Client[]>('db_clients', []);
      const db_ledger = getLocalItem<LedgerEntry[]>('db_ledger', []);

      const id = `inv-${Date.now()}`;
      const total = Number(invoice.total || 0);

      const newInvoice: Invoice = {
        id,
        invoiceNumber: invoice.invoiceNumber || `${db_settings.invoicePrefix || 'INV-'}${String(db_invoices.length + 1).padStart(3, '0')}`,
        clientId: invoice.clientId || "cli-123",
        clientName: invoice.clientName || "Unknown Client",
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
        notes: invoice.notes || "",
        readCount: 0
      };

      db_invoices.unshift(newInvoice);
      setLocalItem('db_invoices', db_invoices);

      const clientIndex = db_clients.findIndex(c => c.id === newInvoice.clientId);
      let startingBalance = 0;
      if (clientIndex !== -1) {
        startingBalance = Number(db_clients[clientIndex].outstandingBalance || 0);
        db_clients[clientIndex].outstandingBalance = startingBalance + newInvoice.dueAmount;
        setLocalItem('db_clients', db_clients);
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
      setLocalItem('db_ledger', db_ledger);

      logLocalActivity("INVOICE_CREATE", `Generated invoice ${newInvoice.invoiceNumber} for ${newInvoice.clientName} (INR ${newInvoice.total})`);
      return Promise.resolve(newInvoice);
    }
    return request<Invoice>('/api/invoices', 'POST', invoice);
  },

  updateInvoice: (id: string, invoice: Partial<Invoice>) => {
    if (isLocalOnly) {
      const db_invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const db_clients = getLocalItem<Client[]>('db_clients', []);
      const db_ledger = getLocalItem<LedgerEntry[]>('db_ledger', []);

      const index = db_invoices.findIndex(inv => inv.id === id);
      if (index !== -1) {
        const oldInv = db_invoices[index];
        const newTotal = Number(invoice.total ?? oldInv.total);
        const newPaidAmount = Number(invoice.paidAmount ?? oldInv.paidAmount);
        const newDueAmount = Number(invoice.dueAmount ?? (newTotal - newPaidAmount));

        // Adjust client outstanding balance safely
        const clientIndex = db_clients.findIndex(c => c.id === oldInv.clientId);
        if (clientIndex !== -1) {
          db_clients[clientIndex].outstandingBalance = Math.max(0, (db_clients[clientIndex].outstandingBalance || 0) - oldInv.dueAmount + newDueAmount);
          setLocalItem('db_clients', db_clients);
        }

        // Adjust ledger entry if it exists
        const ledgerIndex = db_ledger.findIndex(led => led.referenceType === "invoice" && led.referenceId === id);
        if (ledgerIndex !== -1) {
          db_ledger[ledgerIndex].amount = newTotal;
          db_ledger[ledgerIndex].description = `Invoice Modified: ${invoice.invoiceNumber || oldInv.invoiceNumber}`;
          if (clientIndex !== -1) {
            db_ledger[ledgerIndex].runningBalance = db_clients[clientIndex].outstandingBalance;
          }
          setLocalItem('db_ledger', db_ledger);
        }

        db_invoices[index] = {
          ...oldInv,
          ...invoice,
          total: newTotal,
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount
        };
        setLocalItem('db_invoices', db_invoices);
        logLocalActivity("INVOICE_UPDATE", `Modified invoice ${db_invoices[index].invoiceNumber}`);
        return Promise.resolve(db_invoices[index]);
      }
      return Promise.reject(new Error("Invoice not found"));
    }
    return request<Invoice>(`/api/invoices/${id}`, 'PUT', invoice);
  },

  markInvoiceRead: (id: string) => {
    if (isLocalOnly) {
      const invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const index = invoices.findIndex(i => i.id === id);
      if (index !== -1) {
        invoices[index].readCount = (invoices[index].readCount || 0) + 1;
        setLocalItem('db_invoices', invoices);
        return Promise.resolve(invoices[index]);
      }
      return Promise.reject(new Error("Invoice not found"));
    }
    return request<Invoice>(`/api/invoices/${id}/read`, 'POST');
  },

  deleteInvoice: (id: string) => {
    if (isLocalOnly) {
      const db_invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const db_clients = getLocalItem<Client[]>('db_clients', []);
      
      const index = db_invoices.findIndex(inv => inv.id === id);
      if (index !== -1) {
        const inv = db_invoices[index];
        const clientIndex = db_clients.findIndex(c => c.id === inv.clientId);
        if (clientIndex !== -1) {
          db_clients[clientIndex].outstandingBalance = Math.max(0, Number(db_clients[clientIndex].outstandingBalance || 0) - inv.dueAmount);
          setLocalItem('db_clients', db_clients);
        }
        
        db_invoices.splice(index, 1);
        setLocalItem('db_invoices', db_invoices);
        logLocalActivity("INVOICE_DELETE", `Voided and deleted invoice: ${inv.invoiceNumber}`);
        return Promise.resolve({ success: true });
      }
      return Promise.reject(new Error("Invoice not found"));
    }
    return request<{ success: boolean }>(`/api/invoices/${id}`, 'DELETE');
  },

  // 6. Quotations / Estimates
  getQuotations: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<Quotation[]>('db_quotations', []));
    }
    return request<Quotation[]>('/api/quotations');
  },

  createQuotation: (quotation: Partial<Quotation>) => {
    if (isLocalOnly) {
      const list = getLocalItem<Quotation[]>('db_quotations', []);
      const settings = getLocalItem<BusinessSettings>('db_settings', DEFAULT_SETTINGS);
      const newQuotation: Quotation = {
        id: `q-${Date.now()}`,
        quotationNumber: quotation.quotationNumber || `${settings.quotationPrefix || 'EST-'}${String(list.length + 1).padStart(3, '0')}`,
        clientId: quotation.clientId || "cli-123",
        clientName: quotation.clientName || "Unknown Client",
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
      list.unshift(newQuotation);
      setLocalItem('db_quotations', list);
      logLocalActivity("QUOTATION_CREATE", `Created proposal draft ${newQuotation.quotationNumber} for ${newQuotation.clientName}`);
      return Promise.resolve(newQuotation);
    }
    return request<Quotation>('/api/quotations', 'POST', quotation);
  },

  updateQuotation: (id: string, q: Partial<Quotation>) => {
    if (isLocalOnly) {
      const list = getLocalItem<Quotation[]>('db_quotations', []);
      const index = list.findIndex(item => item.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...q };
        setLocalItem('db_quotations', list);
        logLocalActivity("QUOTATION_UPDATE", `Modified proposal draft ${list[index].quotationNumber}`);
        return Promise.resolve(list[index]);
      }
      return Promise.reject(new Error("Quotation not found"));
    }
    return request<Quotation>(`/api/quotations/${id}`, 'PUT', q);
  },

  convertQuotation: (id: string) => {
    if (isLocalOnly) {
      const db_quotations = getLocalItem<Quotation[]>('db_quotations', []);
      const db_invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const db_clients = getLocalItem<Client[]>('db_clients', []);
      const db_settings = getLocalItem<BusinessSettings>('db_settings', DEFAULT_SETTINGS);
      const db_ledger = getLocalItem<LedgerEntry[]>('db_ledger', []);

      const qIndex = db_quotations.findIndex(i => i.id === id);
      if (qIndex !== -1) {
        const q = db_quotations[qIndex];
        const invoiceId = `inv-${Date.now()}`;
        const invoiceNum = `${db_settings.invoicePrefix || 'INV-'}${String(db_invoices.length + 1).padStart(3, '0')}`;
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
          taxType: clientDetails && !clientDetails.gstIn.startsWith((db_settings.gstIn || '').substring(0,2)) ? "IGST" : "CGST_SGST",
          taxAmount: q.taxAmount,
          total: q.total,
          paidAmount: 0,
          dueAmount: q.total,
          status: "unpaid",
          createdAt: new Date().toISOString(),
          notes: `Converted from Estimate Ref: ${q.quotationNumber}`
        };

        db_invoices.unshift(convertedInvoice);
        setLocalItem('db_invoices', db_invoices);

        q.status = "converted";
        q.convertedInvoiceId = invoiceId;
        setLocalItem('db_quotations', db_quotations);

        let outstanding = 0;
        if (clientDetails) {
          clientDetails.outstandingBalance = Number(clientDetails.outstandingBalance || 0) + q.total;
          outstanding = clientDetails.outstandingBalance;
          setLocalItem('db_clients', db_clients);
        }

        const newLedger: LedgerEntry = {
          id: `led-${Date.now()}`,
          clientId: q.clientId,
          clientName: q.clientName,
          date: convertedInvoice.date,
          description: `Invoice Raised from Proposal: ${invoiceNum}`,
          type: "debit",
          amount: convertedInvoice.total,
          runningBalance: outstanding,
          referenceType: "invoice",
          referenceId: invoiceId,
          createdAt: new Date().toISOString()
        };
        db_ledger.unshift(newLedger);
        setLocalItem('db_ledger', db_ledger);

        logLocalActivity("QUOTATION_CONVERT", `Authorized proposal ${q.quotationNumber} conversion into invoice ${invoiceNum}`);
        return Promise.resolve({ success: true, invoice: convertedInvoice });
      }
      return Promise.reject(new Error("Quotation not found"));
    }
    return request<{ success: boolean; invoice: Invoice }>(`/api/quotations/${id}/convert`, 'POST');
  },

  deleteQuotation: (id: string) => {
    if (isLocalOnly) {
      const list = getLocalItem<Quotation[]>('db_quotations', []);
      const index = list.findIndex(item => item.id === id);
      if (index !== -1) {
        const qNum = list[index].quotationNumber;
        list.splice(index, 1);
        setLocalItem('db_quotations', list);
        logLocalActivity("QUOTATION_DELETE", `Purged template proposal draft ${qNum}`);
        return Promise.resolve({ success: true });
      }
      return Promise.reject(new Error("Quotation not found"));
    }
    return request<{ success: boolean }>(`/api/quotations/${id}`, 'DELETE');
  },

  // 7. Payments Collections
  getPayments: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<Payment[]>('db_payments', []));
    }
    return request<Payment[]>('/api/payments');
  },

  createPayment: (payment: Partial<Payment>) => {
    if (isLocalOnly) {
      const db_payments = getLocalItem<Payment[]>('db_payments', []);
      const db_invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const db_clients = getLocalItem<Client[]>('db_clients', []);
      const db_ledger = getLocalItem<LedgerEntry[]>('db_ledger', []);
      const db_cashbook = getLocalItem<CashbookEntry[]>('db_cashbook', []);

      const payId = `pay-${Date.now()}`;
      const amountPaid = Number(payment.amount || 0);

      const newPayment: Payment = {
        id: payId,
        invoiceId: payment.invoiceId || "",
        invoiceNumber: payment.invoiceNumber || "",
        clientId: payment.clientId || "",
        clientName: payment.clientName || "",
        amount: amountPaid,
        paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
        paymentMode: payment.paymentMode || "UPI",
        referenceNum: payment.referenceNum || `REF-${Date.now()}`,
        remarks: payment.remarks || "No comments",
        createdAt: new Date().toISOString()
      };

      db_payments.unshift(newPayment);
      setLocalItem('db_payments', db_payments);

      const invIndex = db_invoices.findIndex(i => i.id === newPayment.invoiceId);
      if (invIndex !== -1) {
        const inv = db_invoices[invIndex];
        inv.paidAmount = Number(inv.paidAmount || 0) + amountPaid;
        inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
        if (inv.dueAmount === 0) {
          inv.status = 'paid';
        } else if (inv.paidAmount > 0) {
          inv.status = 'partially_paid';
        }
        setLocalItem('db_invoices', db_invoices);
      }

      const clientIndex = db_clients.findIndex(c => c.id === newPayment.clientId);
      let runningClientBalance = 0;
      if (clientIndex !== -1) {
        db_clients[clientIndex].outstandingBalance = Math.max(0, Number(db_clients[clientIndex].outstandingBalance || 0) - amountPaid);
        runningClientBalance = db_clients[clientIndex].outstandingBalance;
        setLocalItem('db_clients', db_clients);
      }

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
      setLocalItem('db_ledger', db_ledger);

      const sortedCashForPayment = [...db_cashbook].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });
      const lastCashbookEntry = sortedCashForPayment[sortedCashForPayment.length - 1] || { runningCashBalance: 0, runningBankBalance: 0 };
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
        runningCashBalance: (lastCashbookEntry.runningCashBalance || 0) + cashChange,
        runningBankBalance: (lastCashbookEntry.runningBankBalance || 0) + bankChange,
        createdAt: new Date().toISOString()
      };
      db_cashbook.unshift(newCashbook);
      setLocalItem('db_cashbook', db_cashbook);

      logLocalActivity("PAYMENT_COLLECT", `Cleared collection receipts: ${amountPaid} from ${newPayment.clientName}. double-entry synchronized.`);
      return Promise.resolve(newPayment);
    }
    return request<Payment>('/api/payments', 'POST', payment);
  },

  updatePayment: (id: string, updated: Partial<Payment>) => {
    if (isLocalOnly) {
      const db_payments = getLocalItem<Payment[]>('db_payments', []);
      const db_invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const db_clients = getLocalItem<Client[]>('db_clients', []);
      const db_ledger = getLocalItem<LedgerEntry[]>('db_ledger', []);
      const db_cashbook = getLocalItem<CashbookEntry[]>('db_cashbook', []);

      const pIndex = db_payments.findIndex(pay => pay.id === id);
      if (pIndex !== -1) {
        const oldP = db_payments[pIndex];

        // 1. Revert Old values
        const oldAmount = oldP.amount;
        const oldInvIndex = db_invoices.findIndex(inv => inv.id === oldP.invoiceId);
        if (oldInvIndex !== -1) {
          const inv = db_invoices[oldInvIndex];
          inv.paidAmount = Math.max(0, Number(inv.paidAmount || 0) - oldAmount);
          inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
          inv.status = inv.dueAmount === inv.total ? 'unpaid' : (inv.paidAmount > 0 ? 'partially_paid' : 'unpaid');
        }

        const oldClientIndex = db_clients.findIndex(c => c.id === oldP.clientId);
        if (oldClientIndex !== -1) {
          db_clients[oldClientIndex].outstandingBalance = Number(db_clients[oldClientIndex].outstandingBalance || 0) + oldAmount;
        }

        // Apply edits to oldP
        const updatedInvoiceId = updated.invoiceId || oldP.invoiceId;
        const isInvoiceChanged = updatedInvoiceId !== oldP.invoiceId;

        oldP.amount = Number(updated.amount ?? oldP.amount);
        oldP.paymentDate = updated.paymentDate || oldP.paymentDate;
        oldP.paymentMode = updated.paymentMode || oldP.paymentMode;
        oldP.referenceNum = updated.referenceNum || oldP.referenceNum;
        oldP.remarks = updated.remarks || oldP.remarks;

        if (isInvoiceChanged) {
          oldP.invoiceId = updatedInvoiceId;
          const targetInv = db_invoices.find(inv => inv.id === updatedInvoiceId);
          oldP.invoiceNumber = targetInv ? targetInv.invoiceNumber : oldP.invoiceNumber;
        }

        // 2. Apply New values
        const newAmount = oldP.amount;
        const newInvIndex = db_invoices.findIndex(inv => inv.id === oldP.invoiceId);
        if (newInvIndex !== -1) {
          const inv = db_invoices[newInvIndex];
          inv.paidAmount = Number(inv.paidAmount || 0) + newAmount;
          inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
          inv.status = inv.dueAmount === 0 ? 'paid' : (inv.paidAmount > 0 ? 'partially_paid' : 'unpaid');
        }

        const newClientIndex = db_clients.findIndex(c => c.id === oldP.clientId);
        let runningClientBalance = 0;
        if (newClientIndex !== -1) {
          db_clients[newClientIndex].outstandingBalance = Math.max(0, Number(db_clients[newClientIndex].outstandingBalance || 0) - newAmount);
          runningClientBalance = db_clients[newClientIndex].outstandingBalance;
        }

        // Filter and rebuild Ledger entry
        const otherLedgers = db_ledger.filter(l => !(l.referenceType === 'payment' && l.referenceId === oldP.id));
        const newLedger: LedgerEntry = {
          id: `led-${Date.now()}`,
          clientId: oldP.clientId,
          clientName: oldP.clientName,
          date: oldP.paymentDate,
          description: `Payment Receipt (EDITED): ${oldP.id} against ${oldP.invoiceNumber} via ${oldP.paymentMode}`,
          type: "credit",
          amount: newAmount,
          runningBalance: runningClientBalance,
          referenceType: "payment",
          referenceId: oldP.id,
          createdAt: new Date().toISOString()
        };
        otherLedgers.unshift(newLedger);

        // Filter and rebuild Cashbook entry
        const otherCashbook = db_cashbook.filter(cb => cb.referenceId !== oldP.id);
        
        let cashChange = 0;
        let bankChange = 0;
        if (oldP.paymentMode === 'Cash') {
          cashChange = newAmount;
        } else {
          bankChange = newAmount;
        }

        const sortedCashForPayment = [...otherCashbook].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return a.id.localeCompare(b.id);
        });
        const lastCashbookEntry = sortedCashForPayment[sortedCashForPayment.length - 1] || { runningCashBalance: 0, runningBankBalance: 0 };

        const newCashbook: CashbookEntry = {
          id: `cb-${Date.now()}`,
          date: oldP.paymentDate,
          description: `Invoiced Collection [${oldP.clientName}] Ref ${oldP.referenceNum} (EDITED)`,
          type: "income",
          paymentMode: oldP.paymentMode,
          amount: newAmount,
          referenceId: oldP.id,
          runningCashBalance: (lastCashbookEntry.runningCashBalance || 0) + cashChange,
          runningBankBalance: (lastCashbookEntry.runningBankBalance || 0) + bankChange,
          createdAt: new Date().toISOString()
        };
        otherCashbook.unshift(newCashbook);

        // Save everything
        setLocalItem('db_payments', db_payments);
        setLocalItem('db_invoices', db_invoices);
        setLocalItem('db_clients', db_clients);
        setLocalItem('db_ledger', otherLedgers);
        setLocalItem('db_cashbook', otherCashbook);

        logLocalActivity("PAYMENT_UPDATE", `Modified payment receipt references of ${oldP.clientName}. Double-entry log updated.`);
        return Promise.resolve(oldP);
      }
      return Promise.reject(new Error("Payment not found"));
    }
    return request<Payment>(`/api/payments/${id}`, 'PUT', updated);
  },

  deletePayment: (id: string) => {
    if (isLocalOnly) {
      const db_payments = getLocalItem<Payment[]>('db_payments', []);
      const db_invoices = getLocalItem<Invoice[]>('db_invoices', []);
      const db_clients = getLocalItem<Client[]>('db_clients', []);
      const db_ledger = getLocalItem<LedgerEntry[]>('db_ledger', []);
      const db_cashbook = getLocalItem<CashbookEntry[]>('db_cashbook', []);

      const pIndex = db_payments.findIndex(pay => pay.id === id);
      if (pIndex !== -1) {
        const p = db_payments[pIndex];

        // Revert Invoice paid amount
        const invIndex = db_invoices.findIndex(inv => inv.id === p.invoiceId);
        if (invIndex !== -1) {
          const inv = db_invoices[invIndex];
          inv.paidAmount = Math.max(0, Number(inv.paidAmount || 0) - p.amount);
          inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
          inv.status = inv.dueAmount === inv.total ? 'unpaid' : (inv.paidAmount > 0 ? 'partially_paid' : 'unpaid');
          setLocalItem('db_invoices', db_invoices);
        }

        // Revert Client outstanding balance
        const clientIndex = db_clients.findIndex(c => c.id === p.clientId);
        if (clientIndex !== -1) {
          db_clients[clientIndex].outstandingBalance = Number(db_clients[clientIndex].outstandingBalance || 0) + p.amount;
          setLocalItem('db_clients', db_clients);
        }

        // Revert Ledger
        const filteredLedger = db_ledger.filter(l => !(l.referenceType === 'payment' && l.referenceId === p.id));
        setLocalItem('db_ledger', filteredLedger);

        // Revert Cashbook
        const filteredCashbook = db_cashbook.filter(cb => cb.referenceId !== p.id);
        setLocalItem('db_cashbook', filteredCashbook);

        // Delete payment
        db_payments.splice(pIndex, 1);
        setLocalItem('db_payments', db_payments);

        logLocalActivity("PAYMENT_DELETE", `Voided and deleted payment of INR ${p.amount} from ${p.clientName}`);
        return Promise.resolve({ success: true });
      }
      return Promise.reject(new Error("Payment not found"));
    }
    return request<{ success: boolean }>(`/api/payments/${id}`, 'DELETE');
  },

  // 8. General Ledgers
  getLedgers: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<LedgerEntry[]>('db_ledger', []));
    }
    return request<LedgerEntry[]>('/api/ledger');
  },

  getLedgerByClient: (clientId: string) => {
    if (isLocalOnly) {
      const records = getLocalItem<LedgerEntry[]>('db_ledger', []);
      return Promise.resolve(records.filter(r => r.clientId === clientId));
    }
    return request<LedgerEntry[]>(`/api/ledger/client/${clientId}`);
  },

  // 9. Cashbook Registers
  getCashbook: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<CashbookEntry[]>('db_cashbook', []));
    }
    return request<CashbookEntry[]>('/api/cashbook');
  },

  createCashbookEntry: (entry: Partial<CashbookEntry>) => {
    if (isLocalOnly) {
      const db_cashbook = getLocalItem<CashbookEntry[]>('db_cashbook', []);
      const amount = Number(entry.amount || 0);
      const type = entry.type || "income";
      const mode = entry.paymentMode || "Cash";

      const sortedCashForEntry = [...db_cashbook].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });
      const lastEntry = sortedCashForEntry[sortedCashForEntry.length - 1] || { runningCashBalance: 0, runningBankBalance: 0 };
      
      let newCash = Number(lastEntry.runningCashBalance || 0);
      let newBank = Number(lastEntry.runningBankBalance || 0);

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
      setLocalItem('db_cashbook', db_cashbook);
      logLocalActivity("CASHBOOK_ENTRY", `Created manual transaction description: ${newEntry.description} for INR ${amount}`);
      return Promise.resolve(newEntry);
    }
    return request<CashbookEntry>('/api/cashbook', 'POST', entry);
  },

  deleteCashbookEntry: (id: string) => {
    if (isLocalOnly) {
      const db_cashbook = getLocalItem<CashbookEntry[]>('db_cashbook', []);
      const index = db_cashbook.findIndex(cb => cb.id === id);
      if (index !== -1) {
        const item = db_cashbook[index];
        db_cashbook.splice(index, 1);
        setLocalItem('db_cashbook', db_cashbook);
        logLocalActivity("CASHBOOK_DELETE", `Deleted cashbook entry: ${item.description}`);
        return Promise.resolve({ success: true });
      }
      return Promise.reject(new Error("Cashbook entry not found"));
    }
    return request<{ success: boolean }>(`/api/cashbook/${id}`, 'DELETE');
  },

  updateCashbookEntry: (id: string, updated: Partial<CashbookEntry>) => {
    if (isLocalOnly) {
      const db_cashbook = getLocalItem<CashbookEntry[]>('db_cashbook', []);
      const index = db_cashbook.findIndex(cb => cb.id === id);
      if (index !== -1) {
        db_cashbook[index] = { ...db_cashbook[index], ...updated };
        setLocalItem('db_cashbook', db_cashbook);
        logLocalActivity("CASHBOOK_UPDATE", `Updated cashbook entry: ${db_cashbook[index].description}`);
        return Promise.resolve(db_cashbook[index]);
      }
      return Promise.reject(new Error("Cashbook entry not found"));
    }
    return request<CashbookEntry>(`/api/cashbook/${id}`, 'PUT', updated);
  },

  // 10. Business & Banking settings
  getSettings: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<BusinessSettings>('db_settings', DEFAULT_SETTINGS));
    }
    return request<BusinessSettings>('/api/settings');
  },

  saveSettings: (settings: Partial<BusinessSettings>) => {
    if (isLocalOnly) {
      const current = getLocalItem<BusinessSettings>('db_settings', DEFAULT_SETTINGS);
      const updated = { ...current, ...settings };
      setLocalItem('db_settings', updated);
      logLocalActivity("SETTINGS_WRITE", "Updated corporate profile settings & banking info");
      return Promise.resolve(updated);
    }
    return request<BusinessSettings>('/api/settings', 'POST', settings);
  },

  getPublicInvoice: (invoiceNumber: string) => {
    return fetch(`/api/public/invoice/${encodeURIComponent(invoiceNumber)}`).then(res => {
      if (!res.ok) throw new Error("Could not find invoice details");
      return res.json() as Promise<{ invoice: Invoice; settings: BusinessSettings }>;
    });
  },

  getPasswords: () => {
    if (isLocalOnly) {
      const saved = localStorage.getItem('user_passwords_store');
      if (saved) {
        try { return Promise.resolve(JSON.parse(saved)); } catch (_) {}
      }
      return Promise.resolve({});
    }
    return request<Record<string, string>>('/api/passwords');
  },

  savePasswords: (passwords: Record<string, string>) => {
    if (isLocalOnly) {
      localStorage.setItem('user_passwords_store', JSON.stringify(passwords));
      return Promise.resolve(passwords);
    }
    return request<Record<string, string>>('/api/passwords', 'POST', passwords);
  },

  sendOtpEmail: (email: string, otpCode: string) => {
    if (isLocalOnly) {
      console.log(`[LOCAL] Simulating OTP ${otpCode} email dispatch to ${email}`);
      return Promise.resolve({ success: true, previewUrl: `https://ethereal.email/simulated?otp=${otpCode}` });
    }
    return request<{ success: boolean; messageId?: string; previewUrl?: string; description?: string }>('/api/send-otp-email', 'POST', { email, otpCode });
  },

  // 11. Team User Management
  getUsers: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<UserProfile[]>('db_users', []));
    }
    return request<UserProfile[]>('/api/users');
  },

  createUser: (user: Partial<UserProfile>) => {
    if (isLocalOnly) {
      const list = getLocalItem<UserProfile[]>('db_users', []);
      const newUser: UserProfile = {
        userId: `u-${Date.now()}`,
        email: user.email || "staff@demo.com",
        name: user.name || "Anonymous Team",
        role: user.role || "Staff",
        status: user.status || "active",
        createdAt: new Date().toISOString(),
        lastLoginAt: ""
      };
      list.push(newUser);
      setLocalItem('db_users', list);
      logLocalActivity("USER_CREATE", `Onboarded teammate ${newUser.name} as ${newUser.role}`);
      return Promise.resolve(newUser);
    }
    return request<UserProfile>('/api/users', 'POST', user);
  },

  // 12. Security Audit Logs & Notifications
  getLogs: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<ActivityLog[]>('db_logs', []));
    }
    return request<ActivityLog[]>('/api/logs');
  },

  getNotifications: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<Notification[]>('db_notifications', []));
    }
    return request<Notification[]>('/api/notifications');
  },

  markNotificationRead: (id: string) => {
    if (isLocalOnly) {
      const list = getLocalItem<Notification[]>('db_notifications', []);
      const item = list.find(n => n.id === id);
      if (item) {
        item.isRead = true;
        setLocalItem('db_notifications', list);
        return Promise.resolve(item);
      }
      return Promise.reject(new Error("Notification not found"));
    }
    return request<Notification>(`/api/notifications/${id}/read`, 'PUT');
  },

  // 13. RBAC Control Matrix
  getRoles: () => {
    if (isLocalOnly) {
      return Promise.resolve(getLocalItem<RolePermissions[]>('db_roles', []));
    }
    return request<RolePermissions[]>('/api/roles');
  },

  updateRole: (role: UserRole, payload: Partial<RolePermissions>) => {
    if (isLocalOnly) {
      const list = getLocalItem<RolePermissions[]>('db_roles', []);
      const targetRole = list.find(r => r.role.toLowerCase() === role.toLowerCase());
      if (!targetRole) {
        return Promise.reject(new Error(`Role ${role} not found`));
      }
      if (payload.modules) {
        targetRole.modules = payload.modules;
      }
      setLocalItem('db_roles', list);
      logLocalActivity("ROLE_PERMISSIONS_UPDATE", `Reconfigured permission matrices for Role: ${role}`);
      return Promise.resolve(targetRole);
    }
    return request<RolePermissions>(`/api/roles/${role}`, 'PUT', { modules: payload.modules });
  },

  // 14. Integrated DB Backups and Portability
  exportDatabase: async () => {
    if (isLocalOnly) {
      return {
        settings: getLocalItem<BusinessSettings>('db_settings', DEFAULT_SETTINGS),
        clients: getLocalItem<Client[]>('db_clients', []),
        products: getLocalItem<Product[]>('db_products', []),
        invoices: getLocalItem<Invoice[]>('db_invoices', []),
        quotations: getLocalItem<Quotation[]>('db_quotations', []),
        payments: getLocalItem<Payment[]>('db_payments', []),
        ledger: getLocalItem<LedgerEntry[]>('db_ledger', []),
        cashbook: getLocalItem<CashbookEntry[]>('db_cashbook', []),
        logs: getLocalItem<ActivityLog[]>('db_logs', []),
        notifications: getLocalItem<Notification[]>('db_notifications', []),
        users: getLocalItem<UserProfile[]>('db_users', []),
        roles: getLocalItem<RolePermissions[]>('db_roles', []),
        categories: getLocalItem<string[]>('db_categories', [])
      };
    }

    const promises = [
      request<BusinessSettings>('/api/settings'),
      request<Client[]>('/api/clients'),
      request<Product[]>('/api/products'),
      request<Invoice[]>('/api/invoices'),
      request<Quotation[]>('/api/quotations'),
      request<Payment[]>('/api/payments'),
      request<LedgerEntry[]>('/api/ledger'),
      request<CashbookEntry[]>('/api/cashbook'),
      request<ActivityLog[]>('/api/logs').catch(() => []),
      request<Notification[]>('/api/notifications'),
      request<UserProfile[]>('/api/users'),
      request<RolePermissions[]>('/api/roles'),
      request<string[]>('/api/categories')
    ];
    
    const [
      settings,
      clients,
      products,
      invoices,
      quotations,
      payments,
      ledger,
      cashbook,
      logs,
      notifications,
      users,
      roles,
      categories
    ] = await Promise.all(promises);

    return {
      settings,
      clients,
      products,
      invoices,
      quotations,
      payments,
      ledger,
      cashbook,
      logs,
      notifications,
      users,
      roles,
      categories
    };
  },

  importDatabase: async (backup: any) => {
    if (isLocalOnly) {
      if (!backup || typeof backup !== 'object') {
        throw new Error("Invalid backup format payload");
      }
      if (backup.settings) setLocalItem('db_settings', backup.settings);
      if (backup.clients) setLocalItem('db_clients', backup.clients);
      if (backup.products) setLocalItem('db_products', backup.products);
      if (backup.invoices) setLocalItem('db_invoices', backup.invoices);
      if (backup.quotations) setLocalItem('db_quotations', backup.quotations);
      if (backup.payments) setLocalItem('db_payments', backup.payments);
      if (backup.ledger) setLocalItem('db_ledger', backup.ledger);
      if (backup.cashbook) setLocalItem('db_cashbook', backup.cashbook);
      if (backup.logs) setLocalItem('db_logs', backup.logs);
      if (backup.notifications) setLocalItem('db_notifications', backup.notifications);
      if (backup.users) setLocalItem('db_users', backup.users);
      if (backup.roles) setLocalItem('db_roles', backup.roles);
      if (backup.categories) setLocalItem('db_categories', backup.categories);
      logLocalActivity("DB_RESTORE", "Successfully restored standard database file from backup in-browser.");
      return Promise.resolve({ success: true, message: "Database backup imported and synchronized successfully in-browser!" });
    }
    return request<{ success: boolean; message: string }>('/api/restore', 'POST', backup);
  }
};
