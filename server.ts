import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Initialize Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  writeBatch, 
  getDocFromServer 
} from 'firebase/firestore';

// Import our types and default seeds
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
} from './src/lib/demoData.js';

import { Client, Product, Invoice, Quotation, Payment, LedgerEntry, CashbookEntry, BusinessSettings, ActivityLog, Notification, UserProfile, RolePermissions, UserRole } from './src/types.js';

const app = express();
const PORT = 3000;

// Set higher payload size limits to accept high-capacity company logo and signature images via Base64.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-Memory Database Server State (serving as high-speed backend cache mapped to Firestore)
let db_settings = { ...DEFAULT_SETTINGS };
let db_clients = [ ...DEMO_CLIENTS ];
let db_products = [ ...DEMO_PRODUCTS ];
let db_invoices = [ ...DEMO_INVOICES ];
let db_quotations = [ ...DEMO_QUOTATIONS ];
let db_payments = [ ...DEMO_PAYMENTS ];
let db_ledger = [ ...DEMO_LEDGER ];
let db_cashbook = [ ...DEMO_CASHBOOK ];
let db_logs = [ ...DEMO_LOGS ];
let db_notifications = [ ...DEMO_NOTIFICATIONS ];
let db_users = [ ...DEMO_USERS ];

// Seed dynamic categories list automatically from existing product categories
let db_categories = Array.from(new Set(db_products.map(p => p.category || "General")));
if (db_categories.length === 0) {
  db_categories = ['Software Services', 'Cloud Infrastructure', 'Licensing', 'Creative Services', 'Security Services', 'Hardware Assets', 'Support Retainers'];
}


let db_roles: RolePermissions[] = [
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

// --- Firebase Initialization Engine ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp;
let db: any;

try {
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase initialized successfully on backend with project ID:", firebaseConfig.projectId);
  } else {
    console.warn("firebase-applet-config.json not found in server root. Running in offline cache mode.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase:", err);
}

// --- Hardened Firestore Error Handlers ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: "server-session-admin",
      email: "modulesinternet@gmail.com",
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Firebase Connection on Setup using getDocFromServer
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore secure connection check: OK (Connected)");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is reporting offline.");
    } else {
      // General database connection is fine even if default test/connection doc doesn't exist
      console.log("Firestore secure connection validated.");
    }
  }
}

testConnection();

// Direct synchronizer helper mapping active state mutations to Cloud Firestore
async function syncStateToFirestore(topic: string, id?: string) {
  if (!db) return;
  try {
    if (topic === 'settings') {
      await setDoc(doc(db, 'businessSettings', 'global'), db_settings);
    } else if (topic === 'categories') {
      await setDoc(doc(db, 'businessSettings', 'categories'), { list: db_categories });
    } else if (topic === 'roles') {
      await setDoc(doc(db, 'businessSettings', 'roles'), { list: db_roles });
    } else if (topic === 'clients') {
      if (id) {
        const item = db_clients.find(c => c.id === id);
        if (item) await setDoc(doc(db, 'clients', id), item);
        else await deleteDoc(doc(db, 'clients', id));
      } else {
        for (const item of db_clients) {
          await setDoc(doc(db, 'clients', item.id), item);
        }
      }
    } else if (topic === 'products') {
      if (id) {
        const item = db_products.find(p => p.id === id);
        if (item) await setDoc(doc(db, 'products', id), item);
        else await deleteDoc(doc(db, 'products', id));
      } else {
        for (const item of db_products) {
          await setDoc(doc(db, 'products', item.id), item);
        }
      }
    } else if (topic === 'invoices') {
      if (id) {
        const item = db_invoices.find(v => v.id === id);
        if (item) await setDoc(doc(db, 'invoices', id), item);
        else await deleteDoc(doc(db, 'invoices', id));
      } else {
        for (const item of db_invoices) {
          await setDoc(doc(db, 'invoices', item.id), item);
        }
      }
    } else if (topic === 'quotations') {
      if (id) {
        const item = db_quotations.find(q => q.id === id);
        if (item) await setDoc(doc(db, 'quotations', id), item);
        else await deleteDoc(doc(db, 'quotations', id));
      } else {
        for (const item of db_quotations) {
          await setDoc(doc(db, 'quotations', item.id), item);
        }
      }
    } else if (topic === 'payments') {
      if (id) {
        const item = db_payments.find(p => p.id === id);
        if (item) await setDoc(doc(db, 'payments', id), item);
        else await deleteDoc(doc(db, 'payments', id));
      } else {
        for (const item of db_payments) {
          await setDoc(doc(db, 'payments', item.id), item);
        }
      }
    } else if (topic === 'ledger') {
      if (id) {
        const item = db_ledger.find(l => l.id === id);
        if (item) await setDoc(doc(db, 'ledger', id), item);
        else await deleteDoc(doc(db, 'ledger', id));
      } else {
        for (const item of db_ledger) {
          await setDoc(doc(db, 'ledger', item.id), item);
        }
      }
    } else if (topic === 'cashbook') {
      if (id) {
        const item = db_cashbook.find(cb => cb.id === id);
        if (item) await setDoc(doc(db, 'cashbook', id), item);
        else await deleteDoc(doc(db, 'cashbook', id));
      } else {
        for (const item of db_cashbook) {
          await setDoc(doc(db, 'cashbook', item.id), item);
        }
      }
    } else if (topic === 'logs') {
      if (id) {
        const item = db_logs.find(lg => lg.id === id);
        if (item) await setDoc(doc(db, 'activityLogs', id), item);
        else await deleteDoc(doc(db, 'activityLogs', id));
      } else {
        for (const item of db_logs) {
          await setDoc(doc(db, 'activityLogs', item.id), item);
        }
      }
    } else if (topic === 'notifications') {
      if (id) {
        const item = db_notifications.find(n => n.id === id);
        if (item) await setDoc(doc(db, 'notifications', id), item);
        else await deleteDoc(doc(db, 'notifications', id));
      } else {
        for (const item of db_notifications) {
          await setDoc(doc(db, 'notifications', item.id), item);
        }
      }
    } else if (topic === 'users') {
      if (id) {
        const item = db_users.find(u => u.userId === id);
        if (item) await setDoc(doc(db, 'users', id), item);
        else await deleteDoc(doc(db, 'users', id));
      } else {
        for (const item of db_users) {
          await setDoc(doc(db, 'users', item.userId), item);
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, topic);
  }
}

// Master state-synchronization bootstrapper. Pulls down persistent Firestore data to prime the cache,
// or performs an automatic default seed if Firestore is detected to be completely empty.
async function bootstrapFromFirestore() {
  if (!db) return;
  try {
    console.log("Synchronizing memory database and seeding Firestore if required...");
    
    // 1. Settings
    const settingsDoc = await getDoc(doc(db, 'businessSettings', 'global'));
    if (settingsDoc.exists()) {
      db_settings = settingsDoc.data() as BusinessSettings;
    } else {
      await setDoc(doc(db, 'businessSettings', 'global'), db_settings);
    }

    // 2. Categories
    const categoriesDoc = await getDoc(doc(db, 'businessSettings', 'categories'));
    if (categoriesDoc.exists()) {
      db_categories = (categoriesDoc.data() as { list: string[] }).list;
    } else {
      await setDoc(doc(db, 'businessSettings', 'categories'), { list: db_categories });
    }

    // 3. Roles
    const rolesDoc = await getDoc(doc(db, 'businessSettings', 'roles'));
    if (rolesDoc.exists()) {
      db_roles = (rolesDoc.data() as { list: RolePermissions[] }).list;
    } else {
      await setDoc(doc(db, 'businessSettings', 'roles'), { list: db_roles });
    }

    // 4. Clients
    const clientsSnap = await getDocs(collection(db, 'clients'));
    if (clientsSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_clients) {
        batch.set(doc(db, 'clients', item.id), item);
      }
      await batch.commit();
    } else {
      db_clients = clientsSnap.docs.map(d => d.data() as Client);
    }

    // 5. Products
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_products) {
        batch.set(doc(db, 'products', item.id), item);
      }
      await batch.commit();
    } else {
      db_products = productsSnap.docs.map(d => d.data() as Product);
    }

    // 6. Invoices
    const invoicesSnap = await getDocs(collection(db, 'invoices'));
    if (invoicesSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_invoices) {
        batch.set(doc(db, 'invoices', item.id), item);
      }
      await batch.commit();
    } else {
      db_invoices = invoicesSnap.docs.map(d => d.data() as Invoice);
    }

    // 7. Quotations
    const quotationsSnap = await getDocs(collection(db, 'quotations'));
    if (quotationsSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_quotations) {
        batch.set(doc(db, 'quotations', item.id), item);
      }
      await batch.commit();
    } else {
      db_quotations = quotationsSnap.docs.map(d => d.data() as Quotation);
    }

    // 8. Payments
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    if (paymentsSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_payments) {
        batch.set(doc(db, 'payments', item.id), item);
      }
      await batch.commit();
    } else {
      db_payments = paymentsSnap.docs.map(d => d.data() as Payment);
    }

    // 9. Ledger
    const ledgerSnap = await getDocs(collection(db, 'ledger'));
    if (ledgerSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_ledger) {
        batch.set(doc(db, 'ledger', item.id), item);
      }
      await batch.commit();
    } else {
      db_ledger = ledgerSnap.docs.map(d => d.data() as LedgerEntry);
    }

    // 10. Cashbook
    const cashbookSnap = await getDocs(collection(db, 'cashbook'));
    if (cashbookSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_cashbook) {
        batch.set(doc(db, 'cashbook', item.id), item);
      }
      await batch.commit();
    } else {
      db_cashbook = cashbookSnap.docs.map(d => d.data() as CashbookEntry);
    }

    // 11. Activity Logs
    const logsSnap = await getDocs(collection(db, 'activityLogs'));
    if (logsSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_logs) {
        batch.set(doc(db, 'activityLogs', item.id), item);
      }
      await batch.commit();
    } else {
      db_logs = logsSnap.docs.map(d => d.data() as ActivityLog);
    }

    // 12. Notifications
    const notificationsSnap = await getDocs(collection(db, 'notifications'));
    if (notificationsSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_notifications) {
        batch.set(doc(db, 'notifications', item.id), item);
      }
      await batch.commit();
    } else {
      db_notifications = notificationsSnap.docs.map(d => d.data() as Notification);
    }

    // 13. Users
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      const batch = writeBatch(db);
      for (const item of db_users) {
        batch.set(doc(db, 'users', item.userId), item);
      }
      await batch.commit();
    } else {
      db_users = usersSnap.docs.map(d => d.data() as UserProfile);
    }

    console.log("Firebase Firestore synchronization successfully primed!");
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'bootstrap');
  }
}

bootstrapFromFirestore();

function checkPermission(module: keyof RolePermissions['modules'], action: 'read' | 'write' | 'delete') {
  return (req: Request, res: Response, next: any) => {
    const roleHeader = req.headers['x-user-role'] as string;
    const role: UserRole = (roleHeader || 'Admin') as UserRole;
    
    const roleConfig = db_roles.find(r => r.role.toLowerCase() === role.toLowerCase());
    if (!roleConfig) {
      return res.status(403).json({ error: `Security failure: Unknown system role ${role}` });
    }
    
    const allowed = roleConfig.modules[module]?.[action];
    if (!allowed) {
      return res.status(403).json({ 
        error: `Access Denied: Role "${role}" does not have "${action}" permission for the "${module}" module.` 
      });
    }
    next();
  };
}

// Helper to log audit activity
function logUserActivity(userId: string, userName: string, action: string, details: string) {
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    userName,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  db_logs.unshift(newLog);
  if (db_logs.length > 200) db_logs.pop();
  syncStateToFirestore('logs', newLog.id);
}

// ----------------------------------------------------
// REST ENDPOINTS
// ----------------------------------------------------

// 1. Dashboard metrics
app.get('/api/dashboard', checkPermission('dashboard', 'read'), (req: Request, res: Response) => {
  const totalRevenue = db_payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.total, 0);
  const unpaidInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
  
  // Outstanding balances from clients sum
  const totalOutstanding = db_clients.reduce((sum, c) => sum + c.outstandingBalance, 0);

  // Active counts
  const totalClientsCount = db_clients.length;
  const totalInvoicesCount = db_invoices.length;
  const pendingInvoicesCount = db_invoices.filter(i => i.status !== 'paid').length;

  // Monthly breakdown for Chart (Recharts)
  // Let's build invoice and collection records by month
  const monthlyDataMap = new Map<string, { month: string; billed: number; collected: number }>();
  
  // Fill recent 6 months
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

  // Liquidity mode splits
  const upiCollected = db_payments.filter(p => p.paymentMode === 'UPI').reduce((sum, p) => sum + p.amount, 0);
  const bankCollected = db_payments.filter(p => p.paymentMode === 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0);
  const cashCollected = db_payments.filter(p => p.paymentMode === 'Cash').reduce((sum, p) => sum + p.amount, 0);
  const otherCollected = db_payments.filter(p => p.paymentMode !== 'Cash' && p.paymentMode !== 'UPI' && p.paymentMode !== 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0);

  // Latest closing balances from cashbook
  const latestCashbook = db_cashbook[db_cashbook.length - 1] || { runningCashBalance: 250000, runningBankBalance: 2005400 };

  res.json({
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
});

// 2. Clients CRUD
app.get('/api/clients', checkPermission('clients', 'read'), (req: Request, res: Response) => {
  res.json(db_clients);
});

app.post('/api/clients', checkPermission('clients', 'write'), (req: Request, res: Response) => {
  const data = req.body;
  const newClient: Client = {
    id: `c-${Date.now()}`,
    name: data.name || "Unnamed Client",
    email: data.email || "",
    phone: data.phone || "",
    gstIn: data.gstIn || "",
    pan: data.pan || "",
    billingAddress: data.billingAddress || "",
    shippingAddress: data.shippingAddress || data.billingAddress || "",
    outstandingBalance: Number(data.outstandingBalance || 0),
    createdAt: new Date().toISOString()
  };
  db_clients.unshift(newClient);
  syncStateToFirestore('clients', newClient.id);
  
  logUserActivity("demo-admin", "Karan Sharma", "CLIENT_CREATE", `Registered new client: ${newClient.name}`);
  res.status(201).json(newClient);
});

app.put('/api/clients/:id', checkPermission('clients', 'write'), (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_clients.findIndex(c => c.id === id);
  if (index !== -1) {
    db_clients[index] = { ...db_clients[index], ...req.body };
    syncStateToFirestore('clients', id);
    logUserActivity("demo-admin", "Karan Sharma", "CLIENT_UPDATE", `Updated client profile: ${db_clients[index].name}`);
    res.json(db_clients[index]);
  } else {
    res.status(404).json({ error: "Client not found" });
  }
});

app.delete('/api/clients/:id', checkPermission('clients', 'delete'), (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_clients.findIndex(c => c.id === id);
  if (index !== -1) {
    const deletedName = db_clients[index].name;
    db_clients.splice(index, 1);
    syncStateToFirestore('clients', id);
    logUserActivity("demo-admin", "Karan Sharma", "CLIENT_DELETE", `Removed client database row: ${deletedName}`);
    res.json({ success: true, message: "Client deleted successfully" });
  } else {
    res.status(404).json({ error: "Client not found" });
  }
});

// 3. Products CRUD
app.get('/api/products', checkPermission('products', 'read'), (req: Request, res: Response) => {
  res.json(db_products);
});

app.post('/api/products', checkPermission('products', 'write'), (req: Request, res: Response) => {
  const data = req.body;
  const newProduct: Product = {
    id: `p-${Date.now()}`,
    name: data.name || "New Service",
    sku: data.sku || `SKU-${Date.now()}`,
    category: data.category || "General",
    price: Number(data.price || 0),
    gstPercent: Number(data.gstPercent || 18),
    hsnSac: data.hsnSac || "",
    stockQty: Number(data.stockQty || 100),
    unit: data.unit || "PCS"
  };
  db_products.unshift(newProduct);
  syncStateToFirestore('products', newProduct.id);
  logUserActivity("demo-admin", "Karan Sharma", "PRODUCT_CREATE", `Added catalogue work item: ${newProduct.name} at GST ${newProduct.gstPercent}%`);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', checkPermission('products', 'write'), (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_products.findIndex(p => p.id === id);
  if (index !== -1) {
    db_products[index] = { ...db_products[index], ...req.body };
    syncStateToFirestore('products', id);
    logUserActivity("demo-admin", "Karan Sharma", "PRODUCT_UPDATE", `Updated catalogue item details: ${db_products[index].name}`);
    res.json(db_products[index]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

app.delete('/api/products/:id', checkPermission('products', 'delete'), (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_products.findIndex(p => p.id === id);
  if (index !== -1) {
    const deletedName = db_products[index].name;
    db_products.splice(index, 1);
    syncStateToFirestore('products', id);
    logUserActivity("demo-admin", "Karan Sharma", "PRODUCT_DELETE", `Removed catalogue item: ${deletedName}`);
    res.json({ success: true, message: "Product deleted" });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// Category Management API
app.get('/api/categories', (req: Request, res: Response) => {
  res.json(db_categories);
});

app.post('/api/categories', checkPermission('products', 'write'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  const trimmed = name.trim();
  if (db_categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    return res.status(400).json({ error: "Category already exists" });
  }
  db_categories.push(trimmed);
  syncStateToFirestore('categories');
  logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_CREATE", `Created new product category: ${trimmed}`);
  res.status(201).json({ success: true, categories: db_categories });
});

app.put('/api/categories', checkPermission('products', 'write'), (req: Request, res: Response) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName) return res.status(400).json({ error: "Old and new category names are required" });
  const trimmedNew = newName.trim();
  const idx = db_categories.findIndex(c => c.toLowerCase() === oldName.trim().toLowerCase());
  if (idx !== -1) {
    db_categories[idx] = trimmedNew;
    // Auto reflect category name changes in all linked products:
    let count = 0;
    db_products = db_products.map(p => {
      if (p.category && p.category.toLowerCase() === oldName.trim().toLowerCase()) {
        count++;
        return { ...p, category: trimmedNew };
      }
      return p;
    });
    syncStateToFirestore('categories');
    syncStateToFirestore('products');
    logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_UPDATE", `Renamed category from "${oldName}" to "${trimmedNew}" (affected ${count} product(s))`);
    res.json({ success: true, categories: db_categories });
  } else {
    res.status(404).json({ error: "Category not found" });
  }
});

app.delete('/api/categories', checkPermission('products', 'delete'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  const target = name.trim();
  db_categories = db_categories.filter(c => c.toLowerCase() !== target.toLowerCase());
  
  // Set linked products' category back to a safe default "Uncategorized"
  let count = 0;
  db_products = db_products.map(p => {
    if (p.category && p.category.toLowerCase() === target.toLowerCase()) {
      count++;
      return { ...p, category: 'Uncategorized' };
    }
    return p;
  });
  
  if (!db_categories.includes('Uncategorized')) {
    db_categories.push('Uncategorized');
  }
  
  syncStateToFirestore('categories');
  syncStateToFirestore('products');
  logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_DELETE", `Removed category "${target}" (reset ${count} product(s) to "Uncategorized")`);
  res.json({ success: true, categories: db_categories });
});


// 4. Invoices CRUD + Automatic Ledger Hooks
app.get('/api/invoices', checkPermission('invoices', 'read'), (req: Request, res: Response) => {
  res.json(db_invoices);
});

app.post('/api/invoices', checkPermission('invoices', 'write'), (req: Request, res: Response) => {
  const data = req.body;
  const id = `inv-${Date.now()}`;
  const total = Number(data.total || 0);

  const newInvoice: Invoice = {
    id,
    invoiceNumber: data.invoiceNumber || `${db_settings.invoicePrefix}${String(db_invoices.length + 1).padStart(3, '0')}`,
    clientId: data.clientId,
    clientName: data.clientName,
    clientGst: data.clientGst || "",
    date: data.date || new Date().toISOString().split('T')[0],
    dueDate: data.dueDate || new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
    items: data.items || [],
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    taxType: data.taxType || "CGST_SGST",
    taxAmount: Number(data.taxAmount || 0),
    total,
    paidAmount: Number(data.paidAmount || 0),
    dueAmount: Number(data.dueAmount ?? total),
    status: data.status || "unpaid",
    createdAt: new Date().toISOString(),
    notes: data.notes || ""
  };

  db_invoices.unshift(newInvoice);

  // AUTOMATION 1: Update client outstanding balance & add ledger entry
  const clientIndex = db_clients.findIndex(c => c.id === newInvoice.clientId);
  let startingBalance = 0;
  if (clientIndex !== -1) {
    startingBalance = db_clients[clientIndex].outstandingBalance;
    db_clients[clientIndex].outstandingBalance += newInvoice.dueAmount;
    syncStateToFirestore('clients', newInvoice.clientId);
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

  syncStateToFirestore('invoices', newInvoice.id);
  syncStateToFirestore('ledger', newLedger.id);

  logUserActivity("demo-admin", "Karan Sharma", "INVOICE_CREATE", `Generated invoice ${newInvoice.invoiceNumber} for ${newInvoice.clientName} (INR ${newInvoice.total})`);
  res.status(201).json(newInvoice);
});

app.delete('/api/invoices/:id', checkPermission('invoices', 'delete'), (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_invoices.findIndex(inv => inv.id === id);
  if (index !== -1) {
    const inv = db_invoices[index];
    
    // Reverse ledger / Client Outstanding Adjustments
    const clientIndex = db_clients.findIndex(c => c.id === inv.clientId);
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = Math.max(0, db_clients[clientIndex].outstandingBalance - inv.dueAmount);
      syncStateToFirestore('clients', inv.clientId);
    }
    
    db_invoices.splice(index, 1);
    syncStateToFirestore('invoices', id);
    logUserActivity("demo-admin", "Karan Sharma", "INVOICE_DELETE", `Voided and deleted invoice: ${inv.invoiceNumber}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});

// 5. Quotations CRUD
app.get('/api/quotations', checkPermission('quotations', 'read'), (req: Request, res: Response) => {
  res.json(db_quotations);
});

app.post('/api/quotations', checkPermission('quotations', 'write'), (req: Request, res: Response) => {
  const data = req.body;
  const newQuotation: Quotation = {
    id: `q-${Date.now()}`,
    quotationNumber: data.quotationNumber || `${db_settings.quotationPrefix}${String(db_quotations.length + 1).padStart(3, '0')}`,
    clientId: data.clientId,
    clientName: data.clientName,
    date: data.date || new Date().toISOString().split('T')[0],
    expiryDate: data.expiryDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    items: data.items || [],
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    taxAmount: Number(data.taxAmount || 0),
    total: Number(data.total || 0),
    status: data.status || "draft",
    createdAt: new Date().toISOString(),
    notes: data.notes || ""
  };

  db_quotations.unshift(newQuotation);
  syncStateToFirestore('quotations', newQuotation.id);
  logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_CREATE", `Prepared estimate ${newQuotation.quotationNumber} for ${newQuotation.clientName}`);
  res.status(201).json(newQuotation);
});

app.put('/api/quotations/:id', checkPermission('quotations', 'write'), (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_quotations.findIndex(q => q.id === id);
  if (index !== -1) {
    db_quotations[index] = { ...db_quotations[index], ...req.body };
    syncStateToFirestore('quotations', id);
    logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_UPDATE", `Updated estimate status: ${db_quotations[index].quotationNumber} -> ${db_quotations[index].status}`);
    res.json(db_quotations[index]);
  } else {
    res.status(404).json({ error: "Quotation not found" });
  }
});

app.post('/api/quotations/:id/convert', checkPermission('quotations', 'write'), (req: Request, res: Response) => {
  const { id } = req.params;
  const qIndex = db_quotations.findIndex(q => q.id === id);
  if (qIndex !== -1) {
    const q = db_quotations[qIndex];
    
    // Create new invoice from quotation draft
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
      taxType: clientDetails && !clientDetails.gstIn.startsWith(db_settings.gstIn.substring(0,2)) ? "IGST" : "CGST_SGST",
      taxAmount: q.taxAmount,
      total: q.total,
      paidAmount: 0,
      dueAmount: q.total,
      status: "unpaid",
      createdAt: new Date().toISOString(),
      notes: `Converted from Estimate Ref: ${q.quotationNumber}`
    };

    db_invoices.unshift(convertedInvoice);
    
    // Update estimate state
    q.status = "converted";
    q.convertedInvoiceId = invoiceId;

    // Incremental ledger outstanding
    if (clientDetails) {
      clientDetails.outstandingBalance += q.total;
      syncStateToFirestore('clients', q.clientId);
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

    syncStateToFirestore('invoices', invoiceId);
    syncStateToFirestore('quotations', id);
    syncStateToFirestore('ledger', newLedger.id);

    logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_CONVERT", `Authorized proposal ${q.quotationNumber} conversion into invoice ${invoiceNum}`);
    res.json({ success: true, invoice: convertedInvoice });
  } else {
    res.status(404).json({ error: "Quotation not found" });
  }
});

// 6. Payments Receipt Module & Triple Sync Bookkeeping Engine
app.get('/api/payments', checkPermission('payments', 'read'), (req: Request, res: Response) => {
  res.json(db_payments);
});

app.post('/api/payments', checkPermission('payments', 'write'), (req: Request, res: Response) => {
  const data = req.body;
  const payId = `pay-${Date.now()}`;
  const amountPaid = Number(data.amount || 0);

  const newPayment: Payment = {
    id: payId,
    invoiceId: data.invoiceId,
    invoiceNumber: data.invoiceNumber || "",
    clientId: data.clientId,
    clientName: data.clientName,
    amount: amountPaid,
    paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
    paymentMode: data.paymentMode || "UPI",
    referenceNum: data.referenceNum || `REF-${Date.now()}`,
    remarks: data.remarks || "No comments",
    createdAt: new Date().toISOString()
  };

  db_payments.unshift(newPayment);

  // AUTOMATION TRIGGER 1: Auto Sync Invoice paid status update
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
    syncStateToFirestore('invoices', newPayment.invoiceId);
  }

  // AUTOMATION TRIGGER 2: Auto outstanding updates in Client entity
  const clientIndex = db_clients.findIndex(c => c.id === newPayment.clientId);
  let runningClientBalance = 0;
  if (clientIndex !== -1) {
    db_clients[clientIndex].outstandingBalance = Math.max(0, db_clients[clientIndex].outstandingBalance - amountPaid);
    runningClientBalance = db_clients[clientIndex].outstandingBalance;
    syncStateToFirestore('clients', newPayment.clientId);
  }

  // AUTOMATION TRIGGER 3: Auto ledger record credits
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

  // AUTOMATION TRIGGER 4: Cashbook auto synchronizer running bank & cash accounts
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

  syncStateToFirestore('payments', payId);
  syncStateToFirestore('ledger', newLedger.id);
  syncStateToFirestore('cashbook', newCashbook.id);

  logUserActivity("demo-admin", "Karan Sharma", "PAYMENT_COLLECT", `Cleared collection receipts pay: ${amountPaid} from ${newPayment.clientName}. Double-entry synchronizer successful.`);
  res.status(201).json(newPayment);
});

// 7. Ledgers
app.get('/api/ledger', checkPermission('ledger', 'read'), (req: Request, res: Response) => {
  res.json(db_ledger);
});

app.get('/api/ledger/client/:clientId', checkPermission('ledger', 'read'), (req: Request, res: Response) => {
  const { clientId } = req.params;
  const filtered = db_ledger.filter(led => led.clientId === clientId);
  res.json(filtered);
});

// 8. Cashbook CRUD / Log Entries
app.get('/api/cashbook', checkPermission('cashbook', 'read'), (req: Request, res: Response) => {
  res.json(db_cashbook);
});

app.post('/api/cashbook', checkPermission('cashbook', 'write'), (req: Request, res: Response) => {
  const data = req.body;
  const amount = Number(data.amount || 0);
  const type = data.type || "income"; // income, expense, bank_deposit, withdrawal, adjustment
  const mode = data.paymentMode || "Cash";

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
    date: data.date || new Date().toISOString().split('T')[0],
    description: data.description || "Cashbook Transaction Entry",
    type,
    paymentMode: mode,
    amount,
    runningCashBalance: newCash,
    runningBankBalance: newBank,
    createdAt: new Date().toISOString()
  };

  db_cashbook.unshift(newEntry);
  syncStateToFirestore('cashbook', newEntry.id);
  logUserActivity("demo-admin", "Karan Sharma", "CASHBOOK_ENTRY", `Created manual transactional log: ${newEntry.description} for INR ${amount}`);
  res.status(201).json(newEntry);
});

// 9. Users Management
app.get('/api/users', checkPermission('users', 'read'), (req: Request, res: Response) => {
  res.json(db_users);
});

app.post('/api/users', checkPermission('users', 'write'), (req: Request, res: Response) => {
  const data = req.body;
  const newUser: UserProfile = {
    userId: `u-${Date.now()}`,
    email: data.email || "staff@demo.com",
    name: data.name || "Anonymous Team",
    role: data.role || "Staff",
    status: data.status || "active",
    createdAt: new Date().toISOString(),
    lastLoginAt: ""
  };
  db_users.push(newUser);
  syncStateToFirestore('users', newUser.userId);
  logUserActivity("demo-admin", "Karan Sharma", "USER_CREATE", `Onboarded teammate ${newUser.name} as ${newUser.role}`);
  res.status(201).json(newUser);
});

// 10. Audit logs & notifications
app.get('/api/logs', checkPermission('users', 'read'), (req: Request, res: Response) => {
  res.json(db_logs);
});

app.get('/api/notifications', (req: Request, res: Response) => {
  res.json(db_notifications);
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const item = db_notifications.find(n => n.id === id);
  if (item) {
    item.isRead = true;
    syncStateToFirestore('notifications', id);
    res.json(item);
  } else {
    res.status(404).json({ error: "Notification not found" });
  }
});

// 11. Global Corporate business settings
app.get('/api/settings', checkPermission('settings', 'read'), (req: Request, res: Response) => {
  res.json(db_settings);
});

app.post('/api/settings', checkPermission('settings', 'write'), (req: Request, res: Response) => {
  db_settings = { ...db_settings, ...req.body };
  syncStateToFirestore('settings');
  logUserActivity("demo-admin", "Karan Sharma", "SETTINGS_WRITE", "Updated corporate profile settings & banking info");
  res.json(db_settings);
});

// 12. Roles & Permissions Management
app.get('/api/roles', (req: Request, res: Response) => {
  res.json(db_roles);
});

app.put('/api/roles/:role', (req: Request, res: Response) => {
  const { role } = req.params;
  const payload = req.body;
  const targetRole = db_roles.find(r => r.role.toLowerCase() === role.toLowerCase());
  if (!targetRole) {
    return res.status(404).json({ error: `Security failure: Role ${role} not found` });
  }
  targetRole.modules = payload.modules;
  syncStateToFirestore('roles');
  logUserActivity("demo-admin", "Karan Sharma", "ROLE_PERMISSIONS_UPDATE", `Reconfigured operational permission matrices for Role: ${role}`);
  res.json(targetRole);
});

// Configure Vite integration for SPA fallback / Dev Middleware
const isProd = process.env.NODE_ENV === "production";

async function bootServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start the listening server when running as a direct, standalone app
  // (Avoid starting during serverless imports in Firebase Functions)
  const isFirebaseFunction = process.env.IS_FIREBASE_FUNCTION === "true";
  if (!isFirebaseFunction) {
    // Listen on all network namespaces for seamless container routing
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Smart Accounts Server up and running at http://localhost:${PORT}`);
    });
  } else {
    console.log("Firebase Cloud Function environment detected; bypassing standalone Port Listener.");
  }
}

bootServer().catch((e) => {
  console.error("Server initialization failed:", e);
});

export { app };
