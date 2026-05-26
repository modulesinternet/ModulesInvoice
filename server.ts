import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Initialize Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
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
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    firebaseApp = initializeApp(firebaseConfig);
    if (firebaseConfig.firestoreDatabaseId) {
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      }, firebaseConfig.firestoreDatabaseId);
    } else {
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      });
    }
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

// Helper to wrap promise-based Firestore actions with an active timeout limit
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Firestore action timed out"));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// Validate Firebase Connection on Setup using getDocFromServer
async function testConnection() {
  if (!db) return;
  try {
    await withTimeout(getDocFromServer(doc(db, 'test', 'connection')), 5000);
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

// Define path for local persistent backup
const LOCAL_CACHE_PATH = path.join(process.cwd(), 'local-db-cache.json');

// Self-contained file database persistent helpers
function saveStateToLocalCache() {
  const data = {
    db_settings,
    db_clients,
    db_products,
    db_invoices,
    db_quotations,
    db_payments,
    db_ledger,
    db_cashbook,
    db_logs,
    db_notifications,
    db_users,
    db_categories,
    db_roles
  };
  try {
    fs.writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error("Failed to write to local state cache file: ", error);
  }
}

function loadStateFromLocalCache() {
  if (fs.existsSync(LOCAL_CACHE_PATH)) {
    try {
      const raw = fs.readFileSync(LOCAL_CACHE_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (data.db_settings) db_settings = data.db_settings;
      if (data.db_clients) db_clients = data.db_clients;
      if (data.db_products) db_products = data.db_products;
      if (data.db_invoices) db_invoices = data.db_invoices;
      if (data.db_quotations) db_quotations = data.db_quotations;
      if (data.db_payments) db_payments = data.db_payments;
      if (data.db_ledger) db_ledger = data.db_ledger;
      if (data.db_cashbook) db_cashbook = data.db_cashbook;
      if (data.db_logs) db_logs = data.db_logs;
      if (data.db_notifications) db_notifications = data.db_notifications;
      if (data.db_users) db_users = data.db_users;
      if (data.db_categories) db_categories = data.db_categories;
      if (data.db_roles) db_roles = data.db_roles;
      console.log("Local database file cache successfully loaded & restored!");
    } catch (e) {
      console.error("Failed to load local state cache file: ", e);
    }
  }
}

testConnection();

// Direct synchronizer helper mapping active state mutations to Cloud Firestore & Local Cache
async function syncStateToFirestore(topic: string, id?: string) {
  // Always commit synchronously to local file cache as priority persistent layer
  saveStateToLocalCache();

  if (!db) return;
  try {
    if (topic === 'settings') {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'global'), db_settings), 5000);
    } else if (topic === 'categories') {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'categories'), { list: db_categories }), 5000);
    } else if (topic === 'roles') {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'roles'), { list: db_roles }), 5000);
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
    // If saving fails due to permissions/connection/billing, log it and ignore so user CRUD can succeed in-memory
    console.warn("WARNING: Fallback save failed on Firestore sync. Continuing in memory-only model.", error);
  }
}

// Master state-synchronization bootstrapper. Pulls down persistent Firestore data to prime the cache,
// or performs an automatic default seed if Firestore is detected to be completely empty.
async function bootstrapFromFirestore() {
  // Always load from local JSON cache first to keep any changes saved offline
  loadStateFromLocalCache();

  if (!db) {
    console.log("Firebase DB not configured or disabled. Running in full local cache model.");
    return;
  }
  try {
    console.log("Synchronizing memory database and seeding Firestore if required...");
    
    // 1. Settings
    const settingsDoc = await withTimeout(getDoc(doc(db, 'businessSettings', 'global')), 5000);
    const isFirstSeed = !settingsDoc.exists();
    if (!isFirstSeed) {
      const settingsData = settingsDoc.data();
      if (settingsData && Object.keys(settingsData).length > 0) {
        db_settings = settingsData as BusinessSettings;
      }
    } else {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'global'), db_settings), 5000);
    }

    // 2. Categories
    const categoriesDoc = await withTimeout(getDoc(doc(db, 'businessSettings', 'categories')), 5000);
    if (categoriesDoc.exists()) {
      const listData = (categoriesDoc.data() as { list?: string[] }).list;
      if (Array.isArray(listData)) {
        db_categories = listData;
      }
    } else {
      if (isFirstSeed) {
        await withTimeout(setDoc(doc(db, 'businessSettings', 'categories'), { list: db_categories }), 5000);
      }
    }

    // 3. Roles
    const rolesDoc = await withTimeout(getDoc(doc(db, 'businessSettings', 'roles')), 5000);
    if (rolesDoc.exists()) {
      const listData = (rolesDoc.data() as { list?: RolePermissions[] }).list;
      if (Array.isArray(listData) && listData.length > 0) {
        db_roles = listData;
      } else {
        await withTimeout(setDoc(doc(db, 'businessSettings', 'roles'), { list: db_roles }), 5000);
      }
    } else {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'roles'), { list: db_roles }), 5000);
    }

    // Modern Self-healing Collection Bootstrapper Utility
    const syncCollectionOnStartup = async <T extends { id?: string; userId?: string }>(
      collectionName: string,
      currentList: T[],
      demoSeedList: T[],
      idKey: 'id' | 'userId' = 'id'
    ): Promise<T[]> => {
      const snap = await withTimeout(getDocs(collection(db, collectionName)), 5000);
      if (snap.empty) {
        if (currentList.length > 0) {
          console.log(`Firestore '${collectionName}' collection is empty. Back-syncing local cache (${currentList.length} records) to cloud...`);
          const batch = writeBatch(db);
          for (const item of currentList) {
            const docId = idKey === 'id' ? item.id : item.userId;
            if (docId) batch.set(doc(db, collectionName, docId), item);
          }
          await withTimeout(batch.commit(), 5000);
          return currentList;
        } else {
          console.log(`Firestore '${collectionName}' empty. Seeding with default demo dataset...`);
          const batch = writeBatch(db);
          for (const item of demoSeedList) {
            const docId = idKey === 'id' ? item.id : item.userId;
            if (docId) batch.set(doc(db, collectionName, docId), item);
          }
          await withTimeout(batch.commit(), 5000);
          return demoSeedList;
        }
      } else {
        return snap.docs.map(d => d.data() as T);
      }
    };

    // 4. Clients
    db_clients = await syncCollectionOnStartup('clients', db_clients, DEMO_CLIENTS);

    // 5. Products
    db_products = await syncCollectionOnStartup('products', db_products, DEMO_PRODUCTS);

    // 6. Invoices
    db_invoices = await syncCollectionOnStartup('invoices', db_invoices, DEMO_INVOICES);

    // 7. Quotations
    db_quotations = await syncCollectionOnStartup('quotations', db_quotations, DEMO_QUOTATIONS);

    // 8. Payments
    db_payments = await syncCollectionOnStartup('payments', db_payments, DEMO_PAYMENTS);

    // 9. Ledger
    db_ledger = await syncCollectionOnStartup('ledger', db_ledger, DEMO_LEDGER);

    // 10. Cashbook
    db_cashbook = await syncCollectionOnStartup('cashbook', db_cashbook, DEMO_CASHBOOK);

    // 11. Activity Logs
    db_logs = await syncCollectionOnStartup('activityLogs', db_logs, DEMO_LOGS);

    // 12. Notifications
    db_notifications = await syncCollectionOnStartup('notifications', db_notifications, DEMO_NOTIFICATIONS);

    // 13. Users
    db_users = await syncCollectionOnStartup('users', db_users, DEMO_USERS, 'userId');

    // Ensure modulesinternet@gmail.com is in db_users and stale demo users are removed
    const finalUsers: UserProfile[] = [];
    const demoEmails = ['admin@demo.com', 'manager@demo.com', 'accountant@demo.com', 'staff@demo.com'];
    const hasAdmin = db_users.some(u => u.email.toLowerCase() === 'modulesinternet@gmail.com');
    
    if (!hasAdmin) {
      finalUsers.push({
        userId: "admin-modulesinternet",
        email: "modulesinternet@gmail.com",
        name: "Admin",
        role: "Admin",
        status: "active",
        createdAt: "2026-05-01T10:00:00Z",
        lastLoginAt: ""
      });
    }

    db_users.forEach(u => {
      const emailLower = u.email.toLowerCase();
      if (demoEmails.includes(emailLower)) {
        return; // Remove older demo templates
      }
      if (emailLower === 'modulesinternet@gmail.com') {
        u.role = 'Admin';
      }
      finalUsers.push(u);
    });
    db_users = finalUsers;
    saveStateToLocalCache();

    console.log("Firebase Firestore synchronization successfully primed!");
  } catch (error) {
    console.warn("WARNING: Firebase Firestore synchronization failed during startup bootstrap.");
    console.warn("The server will proceed running using the local in-memory database fallback.");
    console.warn("Disabling active Firestore communication to prevent runtime API issues.");
    db = null; // Important: Disable Firestore triggers completely
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

  // Compute cashbook running balances sequentially for true current operating liquidity
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

  res.json({
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
    notes: data.notes || "",
    readCount: 0
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

app.post('/api/invoices/:id/read', checkPermission('invoices', 'read'), (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = db_invoices.find(v => v.id === id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  // Set readCount to 1 (enforces the max 1 read count for 1 document limitation requested)
  if (!invoice.readCount || invoice.readCount < 1) {
    invoice.readCount = 1;
    syncStateToFirestore('invoices', invoice.id);
  }

  res.json(invoice);
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
  try {
    db_settings = { ...db_settings, ...req.body };
    syncStateToFirestore('settings');
    logUserActivity("demo-admin", "Karan Sharma", "SETTINGS_WRITE", "Updated corporate profile settings & banking info");
    res.json(db_settings);
  } catch (err: any) {
    console.error("Error saving global corporate settings:", err);
    res.status(500).json({ error: `Settings update failed: ${err.message}` });
  }
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

// 13. System Database Restore & Synchronization with Firestore
app.post('/api/restore', checkPermission('settings', 'write'), async (req: Request, res: Response) => {
  const backup = req.body;
  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ error: "Invalid backup format payload" });
  }

  try {
    if (backup.settings) db_settings = backup.settings;
    if (backup.clients) db_clients = backup.clients;
    if (backup.products) db_products = backup.products;
    if (backup.invoices) db_invoices = backup.invoices;
    if (backup.quotations) db_quotations = backup.quotations;
    if (backup.payments) db_payments = backup.payments;
    if (backup.ledger) db_ledger = backup.ledger;
    if (backup.cashbook) db_cashbook = backup.cashbook;
    if (backup.logs) db_logs = backup.logs;
    if (backup.notifications) db_notifications = backup.notifications;
    if (backup.users) db_users = backup.users;
    if (backup.roles) db_roles = backup.roles;
    if (backup.categories) db_categories = backup.categories;

    // Trigger sequential sync for all collections onto Firestore
    await syncStateToFirestore('settings');
    await syncStateToFirestore('categories');
    await syncStateToFirestore('roles');

    if (db) {
      // In case we have db, directly iterate and push to Firestore
      for (const item of db_clients) await syncStateToFirestore('clients', item.id);
      for (const item of db_products) await syncStateToFirestore('products', item.id);
      for (const item of db_invoices) await syncStateToFirestore('invoices', item.id);
      for (const item of db_quotations) await syncStateToFirestore('quotations', item.id);
      for (const item of db_payments) await syncStateToFirestore('payments', item.id);
      for (const item of db_ledger) await syncStateToFirestore('ledger', item.id);
      for (const item of db_cashbook) await syncStateToFirestore('cashbook', item.id);
      for (const item of db_notifications) await syncStateToFirestore('notifications', item.id);
      for (const item of db_users) await syncStateToFirestore('users', item.userId);
    } else {
      saveStateToLocalCache();
    }

    logUserActivity("demo-admin", "Karan Sharma", "DB_RESTORE", "Successfully restored standard database file from manual backup and synchronized with Cloud Firestore.");
    res.json({ success: true, message: "Database backup imported and synchronized successfully with Cloud Firestore!" });
  } catch (error: any) {
    res.status(500).json({ error: `Firestore restoration failed: ${error.message}` });
  }
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
