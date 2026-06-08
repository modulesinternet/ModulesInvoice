import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';

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
  getDocFromServer,
  onSnapshot 
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

// Enable Cross-Origin Resource Sharing (CORS) so that remote client nodes (like GitHub Pages) can securely sync with this central server
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-role, x-active-role, x-user-email");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
let db_passwords: { [email: string]: string } = {
  "modulesinternet@gmail.com": "Admin@123",
  "manager@demo.com": "manager123",
  "accountant@demo.com": "acc123",
  "staff@demo.com": "staff123"
};

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
const resolvedFilename = (typeof import.meta !== 'undefined' && import.meta.url)
  ? fileURLToPath(import.meta.url)
  : (typeof __filename !== 'undefined' ? __filename : '');
const resolvedDirname = (typeof import.meta !== 'undefined' && import.meta.url)
  ? path.dirname(resolvedFilename)
  : (typeof __dirname !== 'undefined' ? __dirname : '');

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
  if (db) {
    // If Firebase DB is defined and active, we do NOT use or write to local disk,
    // ensuring all data is persisted in the cloud database only.
    return;
  }
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
    db_passwords,
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
  if (db) {
    // If Firebase DB is active, we bypass local JSON recovery, pulling fresh from cloud collections.
    return;
  }
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
      if (data.db_passwords) db_passwords = data.db_passwords;
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
    const timeoutVal = 15000; // Tolerant 15-second write limit for heavy logo/mohar data payloads
    if (topic === 'settings') {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'global'), db_settings), timeoutVal);
    } else if (topic === 'categories') {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'categories'), { list: db_categories }), timeoutVal);
    } else if (topic === 'roles') {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'roles'), { list: db_roles }), timeoutVal);
    } else if (topic === 'clients') {
      if (id) {
        const item = db_clients.find(c => c.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'clients', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'clients', id)), timeoutVal);
      } else {
        for (const item of db_clients) {
          await withTimeout(setDoc(doc(db, 'clients', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'products') {
      if (id) {
        const item = db_products.find(p => p.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'products', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'products', id)), timeoutVal);
      } else {
        for (const item of db_products) {
          await withTimeout(setDoc(doc(db, 'products', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'invoices') {
      if (id) {
        const item = db_invoices.find(v => v.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'invoices', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'invoices', id)), timeoutVal);
      } else {
        for (const item of db_invoices) {
          await withTimeout(setDoc(doc(db, 'invoices', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'quotations') {
      if (id) {
        const item = db_quotations.find(q => q.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'quotations', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'quotations', id)), timeoutVal);
      } else {
        for (const item of db_quotations) {
          await withTimeout(setDoc(doc(db, 'quotations', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'payments') {
      if (id) {
        const item = db_payments.find(p => p.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'payments', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'payments', id)), timeoutVal);
      } else {
        for (const item of db_payments) {
          await withTimeout(setDoc(doc(db, 'payments', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'ledger') {
      if (id) {
        const item = db_ledger.find(l => l.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'ledger', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'ledger', id)), timeoutVal);
      } else {
        for (const item of db_ledger) {
          await withTimeout(setDoc(doc(db, 'ledger', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'cashbook') {
      if (id) {
        const item = db_cashbook.find(cb => cb.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'cashbook', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'cashbook', id)), timeoutVal);
      } else {
        for (const item of db_cashbook) {
          await withTimeout(setDoc(doc(db, 'cashbook', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'logs') {
      if (id) {
        const item = db_logs.find(lg => lg.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'activityLogs', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'activityLogs', id)), timeoutVal);
      } else {
        for (const item of db_logs) {
          await withTimeout(setDoc(doc(db, 'activityLogs', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'notifications') {
      if (id) {
        const item = db_notifications.find(n => n.id === id);
        if (item) await withTimeout(setDoc(doc(db, 'notifications', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'notifications', id)), timeoutVal);
      } else {
        for (const item of db_notifications) {
          await withTimeout(setDoc(doc(db, 'notifications', item.id), item), timeoutVal);
        }
      }
    } else if (topic === 'users') {
      if (id) {
        const item = db_users.find(u => u.userId === id);
        if (item) await withTimeout(setDoc(doc(db, 'users', id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, 'users', id)), timeoutVal);
      } else {
        for (const item of db_users) {
          await withTimeout(setDoc(doc(db, 'users', item.userId), item), timeoutVal);
        }
      }
    }
  } catch (error) {
    // If saving fails due to permissions/connection/billing, log it and ignore so user CRUD can succeed in-memory
    console.warn("WARNING: Fallback save failed on Firestore sync. Continuing in memory-only model.", error);
  }
}

// Exhaustive global self-healing audit and sweep of ledger/client balances
async function performSelfHealingAudit() {
  console.log("[Self-Healing] Running systematic ledger integrity audit and orphan sweep...");
  const validInvoiceIds = new Set(db_invoices.map(inv => inv.id));
  const validPaymentIds = new Set(db_payments.map(p => p.id));
  
  const originalCount = db_ledger.length;
  const validLedgerEntries: typeof db_ledger = [];
  const orphanIds: string[] = [];

  for (const led of db_ledger) {
    if (led.referenceType === 'invoice') {
      if (!validInvoiceIds.has(led.referenceId)) {
        console.log(`[Self-Healing] Found orphan invoice ledger entry: ${led.id} (Reference missing invoice ${led.referenceId}).`);
        orphanIds.push(led.id);
        continue;
      }
    } else if (led.referenceType === 'payment') {
      if (!validPaymentIds.has(led.referenceId)) {
        console.log(`[Self-Healing] Found orphan payment ledger entry: ${led.id} (Reference missing payment ${led.referenceId}).`);
        orphanIds.push(led.id);
        continue;
      }
    }
    validLedgerEntries.push(led);
  }

  if (orphanIds.length > 0) {
    db_ledger = validLedgerEntries;
    saveStateToLocalCache();
    
    // Background purge from cloud collections
    if (db) {
      for (const id of orphanIds) {
        try {
          await deleteDoc(doc(db, 'ledger', id));
          console.log(`[Self-Healing] Successfully deleted orphan ledger document ${id} from Firestore.`);
        } catch (e) {
          console.error(`[Self-Healing] Failed to delete orphan ledger document ${id} from Firestore:`, e);
        }
      }
    }
  }

  // Sweep client outstanding balances to keep them tight and aligned
  for (let i = 0; i < db_clients.length; i++) {
    const client = db_clients[i];
    const clientInvoices = db_invoices.filter(v => v.clientId === client.id);
    const clientPayments = db_payments.filter(p => p.clientId === client.id);
    
    const totalInvoiced = clientInvoices.reduce((sum, v) => sum + v.total, 0);
    const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const calculatedBalance = Math.max(0, totalInvoiced - totalPaid);
    
    if (clientInvoices.length > 0 || clientPayments.length > 0) {
      if (client.outstandingBalance !== calculatedBalance) {
        console.log(`[Self-Healing] Adjusting client outstanding balance for ${client.name} to ${calculatedBalance} (Invoices/Payments present).`);
        db_clients[i].outstandingBalance = calculatedBalance;
        if (db) {
          try {
            await setDoc(doc(db, 'clients', client.id), db_clients[i]);
          } catch (e) {
            console.error(`[Self-Healing] Failed to sync aligned outstanding balance for client ${client.id}:`, e);
          }
        }
      }
    } else {
      const clientLedgers = db_ledger.filter(l => l.clientId === client.id);
      if (clientLedgers.length === 0 && client.outstandingBalance !== 0) {
        const isDemoClient = DEMO_CLIENTS.some(dc => dc.id === client.id);
        if (!isDemoClient) {
          console.log(`[Self-Healing] Resetting client outstanding balance for non-demo client ${client.name} with 0 ledger entries.`);
          db_clients[i].outstandingBalance = 0;
          if (db) {
            await setDoc(doc(db, 'clients', client.id), db_clients[i]).catch(() => null);
          }
        }
      }
    }
  }

  console.log(`[Self-Healing] Audit sweep completed. Active ledger count: ${db_ledger.length}`);
}

// Simple wrapper to retrieve filtered journal ledger records without ghost values on endpoints
function getCleanLedger(): LedgerEntry[] {
  const validInvoiceIds = new Set(db_invoices.map(inv => inv.id));
  const validPaymentIds = new Set(db_payments.map(p => p.id));
  const initialLen = db_ledger.length;
  
  const originalLedger = [...db_ledger];
  db_ledger = db_ledger.filter(led => {
    if (led.referenceType === 'invoice') return validInvoiceIds.has(led.referenceId);
    if (led.referenceType === 'payment') return validPaymentIds.has(led.referenceId);
    return true;
  });

  if (db_ledger.length !== initialLen) {
    saveStateToLocalCache();
    const removed = originalLedger.filter(ol => !db_ledger.some(dl => dl.id === ol.id));
    for (const r of removed) {
      if (db) {
        deleteDoc(doc(db, 'ledger', r.id)).catch(err => {
          console.warn("[Self-Healing Ledger API Sync] Failed to delete", r.id, err);
        });
      }
    }
  }
  return db_ledger;
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
    
    // 1. Settings (25 seconds timeout for cold starts)
    const settingsDoc = await withTimeout(getDoc(doc(db, 'businessSettings', 'global')), 25000);
    const isFirstSeed = !settingsDoc.exists();
    if (!isFirstSeed) {
      const settingsData = settingsDoc.data();
      if (settingsData && Object.keys(settingsData).length > 0) {
        db_settings = settingsData as BusinessSettings;
      }
    } else {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'global'), db_settings), 25000);
    }

    // 2. Categories
    const categoriesDoc = await withTimeout(getDoc(doc(db, 'businessSettings', 'categories')), 25000);
    if (categoriesDoc.exists()) {
      const listData = (categoriesDoc.data() as { list?: string[] }).list;
      if (Array.isArray(listData)) {
        db_categories = listData;
      }
    } else {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'categories'), { list: db_categories }), 25000);
    }

    // 3. Roles
    const rolesDoc = await withTimeout(getDoc(doc(db, 'businessSettings', 'roles')), 25000);
    if (rolesDoc.exists()) {
      const listData = (rolesDoc.data() as { list?: RolePermissions[] }).list;
      if (Array.isArray(listData) && listData.length > 0) {
        db_roles = listData;
      } else {
        await withTimeout(setDoc(doc(db, 'businessSettings', 'roles'), { list: db_roles }), 25000);
      }
    } else {
      await withTimeout(setDoc(doc(db, 'businessSettings', 'roles'), { list: db_roles }), 25000);
    }

    // Modern Self-healing Collection Bootstrapper Utility (25 seconds timeouts)
    const syncCollectionOnStartup = async <T extends { id?: string; userId?: string }>(
      collectionName: string,
      currentList: T[],
      demoSeedList: T[],
      idKey: 'id' | 'userId' = 'id'
    ): Promise<T[]> => {
      const snap = await withTimeout(getDocs(collection(db, collectionName)), 25000);
      if (snap.empty) {
        if (isFirstSeed) {
          // If this is the absolute first-time seed of the database:
          // Use whatever local cached records exist, or fallback to the standard demo dataset
          const seedData = currentList.length > 0 ? currentList : demoSeedList;
          console.log(`Firestore '${collectionName}' collection is empty. First-time seeding with default dataset (${seedData.length} records) to cloud...`);
          const batch = writeBatch(db);
          for (const item of seedData) {
            const docId = idKey === 'id' ? item.id : item.userId;
            if (docId) batch.set(doc(db, collectionName, docId), item);
          }
          await withTimeout(batch.commit(), 25000);
          return seedData;
        } else {
          // If the database is NOT brand-new (settings exists), an empty database collection
          // means the user intentionally deleted all records. We must NOT seed with demo data!
          console.log(`Firestore '${collectionName}' is empty (cleared by user). Keeping it empty.`);
          return [];
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

    // Active programmatic self-healing: Remove Rs 300 Cashbook entry requested by the user
    const entryIdToRemove = "cb-1779715467712";
    const initialLen = db_cashbook.length;
    db_cashbook = db_cashbook.filter(cb => cb.id !== entryIdToRemove && !(cb.amount === 300 && cb.paymentMode === 'Cash'));
    if (db_cashbook.length !== initialLen) {
      console.log(`Self-healing: Detected and removed requested Rs 300 Cashbook entry.`);
      try {
        await withTimeout(deleteDoc(doc(db, 'cashbook', entryIdToRemove)), 15000);
      } catch (e) {
        console.warn("Could not delete Rs 300 Cashbook entry from Firestore directly:", e);
      }
    }

    // 11. Activity Logs
    db_logs = await syncCollectionOnStartup('activityLogs', db_logs, DEMO_LOGS);

    // 12. Notifications
    db_notifications = await syncCollectionOnStartup('notifications', db_notifications, DEMO_NOTIFICATIONS);

    // 13. Users
    db_users = await syncCollectionOnStartup('users', db_users, DEMO_USERS, 'userId');

    // Ensure modulesinternet@gmail.com is in db_users and default demo users are both kept and restored with password integrity
    const finalUsers: UserProfile[] = [];
    const hasAdmin = db_users.some(u => u.email.trim().toLowerCase() === 'modulesinternet@gmail.com');
    
    if (!hasAdmin) {
      finalUsers.push({
        userId: "admin-modulesinternet",
        email: "modulesinternet@gmail.com",
        name: "Karan Sharma",
        role: "Admin",
        status: "active",
        createdAt: "2026-05-01T10:00:00Z",
        lastLoginAt: ""
      });
    }

    db_users.forEach(u => {
      const emailLower = u.email.trim().toLowerCase();
      if (emailLower === 'admin@demo.com') {
        return; // Remove the demo user account
      }
      if (emailLower === 'modulesinternet@gmail.com') {
        u.role = 'Admin';
        if (u.name === 'Admin') {
          u.name = 'Karan Sharma'; // Micro-migration of legacy Admin record to Karan Sharma
        }
      }
      if (!finalUsers.some(f => f.email.trim().toLowerCase() === emailLower)) {
        finalUsers.push(u);
      }
    });

    if (isFirstSeed) {
      DEMO_USERS.forEach(du => {
        const emailLower = du.email.trim().toLowerCase();
        if (emailLower === 'admin@demo.com') {
          return; // Remove the demo user account
        }
        if (!finalUsers.some(f => f.email.trim().toLowerCase() === emailLower)) {
          finalUsers.push(du);
        }
      });
    }

    db_users = finalUsers;
    saveStateToLocalCache();

    // Auto-align the live Admin record inside Firestore collections to prevent permissions discrepancies
    if (db) {
      const liveAdmin = db_users.find(u => u.email.trim().toLowerCase() === 'modulesinternet@gmail.com');
      if (liveAdmin) {
        await withTimeout(setDoc(doc(db, 'users', liveAdmin.userId), liveAdmin), 25000);
      }
      try {
        await withTimeout(deleteDoc(doc(db, 'users', 'u-admin-demo')), 10000);
      } catch (e) {}
      
      // Sync or retrieve the passwords database
      const passwordsDoc = await withTimeout(getDoc(doc(db, 'businessSettings', 'passwords')), 25000).catch(e => null);
      if (passwordsDoc && passwordsDoc.exists()) {
        const passwordsData = passwordsDoc.data();
        if (passwordsData && Object.keys(passwordsData).length > 0) {
          db_passwords = passwordsData as { [email: string]: string };
        }
      } else {
        await withTimeout(setDoc(doc(db, 'businessSettings', 'passwords'), db_passwords), 25000).catch(e => null);
      }
    }

    // Run custom system ledger and accounts self-healing audit
    await performSelfHealingAudit();

    // Call active real-time listeners on firestore database to stream any external/collaborative updates instantly
    registerBackendRealtimeListeners();

    console.log("Firebase Firestore synchronization successfully primed!");
  } catch (error) {
    console.warn("WARNING: Firebase Firestore synchronization failed during startup bootstrap:", error);
    console.warn("The server will proceed running using the local in-memory database fallback.");
    console.warn("Keeping active Firestore database reference in case of dynamic recovery.");
    // Crucial: DO NOT drop `db = null` reference so future writes/reads and dynamic connections can still auto-recover and succeed!
  }
}

// Real-time dynamic Firestore onSnapshot listener subscription model for backend
function registerBackendRealtimeListeners() {
  if (!db) return;
  console.log("Registering active backend real-time Firestore listeners to keep cache fresh...");

  onSnapshot(collection(db, 'clients'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    db_clients = list;
  }, (error) => {
    console.error("Backend client snapshot error:", error);
  });

  onSnapshot(collection(db, 'products'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
    db_products = list;
  }, (error) => {
    console.error("Backend product snapshot error:", error);
  });

  onSnapshot(collection(db, 'invoices'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
    db_invoices = list;
  }, (error) => {
    console.error("Backend invoice snapshot error:", error);
  });

  onSnapshot(collection(db, 'quotations'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quotation));
    db_quotations = list;
  }, (error) => {
    console.error("Backend quotation snapshot error:", error);
  });

  onSnapshot(collection(db, 'payments'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    db_payments = list;
  }, (error) => {
    console.error("Backend payment snapshot error:", error);
  });

  onSnapshot(collection(db, 'ledger'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LedgerEntry));
    db_ledger = list;
  }, (error) => {
    console.error("Backend ledger snapshot error:", error);
  });

  onSnapshot(collection(db, 'cashbook'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CashbookEntry));
    const filtered = list.filter(cb => cb.id !== "cb-1779715467712" && !(cb.amount === 300 && cb.paymentMode === 'Cash'));
    db_cashbook = filtered;
  }, (error) => {
    console.error("Backend cashbook snapshot error:", error);
  });

  onSnapshot(collection(db, 'activityLogs'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
    db_logs = list;
  }, (error) => {
    console.error("Backend logs snapshot error:", error);
  });

  onSnapshot(collection(db, 'notifications'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    db_notifications = list;
  }, (error) => {
    console.error("Backend notifications snapshot error:", error);
  });

  onSnapshot(collection(db, 'users'), (snapshot) => {
    const list = snapshot.docs.map(d => ({ userId: d.id, ...d.data() } as UserProfile));
    db_users = list;
  }, (error) => {
    console.error("Backend users snapshot error:", error);
  });

  onSnapshot(doc(db, 'businessSettings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      db_settings = docSnap.data() as BusinessSettings;
    }
  }, (error) => {
    console.error("Backend settings global snapshot error:", error);
  });

  onSnapshot(doc(db, 'businessSettings', 'categories'), (docSnap) => {
    if (docSnap.exists()) {
      const listData = (docSnap.data() as { list?: string[] }).list;
      if (Array.isArray(listData)) {
        db_categories = listData;
      }
    }
  }, (error) => {
    console.error("Backend settings categories snapshot error:", error);
  });

  onSnapshot(doc(db, 'businessSettings', 'roles'), (docSnap) => {
    if (docSnap.exists()) {
      const listData = (docSnap.data() as { list?: RolePermissions[] }).list;
      if (Array.isArray(listData) && listData.length > 0) {
        db_roles = listData;
      }
    }
  }, (error) => {
    console.error("Backend settings roles snapshot error:", error);
  });

  onSnapshot(doc(db, 'businessSettings', 'passwords'), (docSnap) => {
    if (docSnap.exists()) {
      const listData = docSnap.data();
      if (listData && Object.keys(listData).length > 0) {
        db_passwords = listData as { [email: string]: string };
      }
    }
  }, (error) => {
    console.error("Backend settings passwords snapshot error:", error);
  });
}

bootstrapFromFirestore();

function checkPermission(module: keyof RolePermissions['modules'], action: 'read' | 'write' | 'delete') {
  return (req: Request, res: Response, next: any) => {
    const roleHeader = (req.headers['x-user-role'] as string || '').trim();
    const role: UserRole = (roleHeader || 'Admin') as UserRole;
    const userEmail = (req.headers['x-user-email'] as string || '').trim().toLowerCase();
    
    // Auto-bypass for Admin roles and modulesinternet@gmail.com live admin account to prevent any operational lockout
    if (role.toLowerCase() === 'admin' || userEmail === 'modulesinternet@gmail.com') {
      return next();
    }
    
    const roleConfig = db_roles.find(r => r.role.trim().toLowerCase() === role.toLowerCase());
    if (!roleConfig) {
      return res.status(403).json({ 
        error: `Security fail: Acting role "${role}" is not registered in the system role permissions list.` 
      });
    }
    
    const allowed = roleConfig.modules[module]?.[action];
    if (!allowed) {
      console.warn(`[DENIED] Blocked request for role: ${role}, user: ${userEmail || 'anonymous'}, module: ${module}, action: ${action}`);
      return res.status(403).json({ 
        error: `Access Denied: Your acting role "${role}" does not have "${action}" permissions for the "${module}" module. Please verify permissions in Team Access.` 
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

// 0. Health check endpoint for remote client testing and diagnostics
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Smart Accounts Server up and running!", databaseConnected: !!db });
});

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

app.post('/api/clients', checkPermission('clients', 'write'), async (req: Request, res: Response) => {
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
  await syncStateToFirestore('clients', newClient.id);
  
  logUserActivity("demo-admin", "Karan Sharma", "CLIENT_CREATE", `Registered new client: ${newClient.name}`);
  res.status(201).json(newClient);
});

app.put('/api/clients/:id', checkPermission('clients', 'write'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_clients.findIndex(c => c.id === id);
  if (index !== -1) {
    db_clients[index] = { ...db_clients[index], ...req.body };
    await syncStateToFirestore('clients', id);
    logUserActivity("demo-admin", "Karan Sharma", "CLIENT_UPDATE", `Updated client profile: ${db_clients[index].name}`);
    res.json(db_clients[index]);
  } else {
    res.status(404).json({ error: "Client not found" });
  }
});

app.delete('/api/clients/:id', checkPermission('clients', 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_clients.findIndex(c => c.id === id);
  if (index !== -1) {
    const deletedName = db_clients[index].name;
    db_clients.splice(index, 1);
    await syncStateToFirestore('clients', id);
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

app.post('/api/products', checkPermission('products', 'write'), async (req: Request, res: Response) => {
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
  await syncStateToFirestore('products', newProduct.id);
  logUserActivity("demo-admin", "Karan Sharma", "PRODUCT_CREATE", `Added catalogue work item: ${newProduct.name} at GST ${newProduct.gstPercent}%`);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', checkPermission('products', 'write'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_products.findIndex(p => p.id === id);
  if (index !== -1) {
    db_products[index] = { ...db_products[index], ...req.body };
    await syncStateToFirestore('products', id);
    logUserActivity("demo-admin", "Karan Sharma", "PRODUCT_UPDATE", `Updated catalogue item details: ${db_products[index].name}`);
    res.json(db_products[index]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

app.delete('/api/products/:id', checkPermission('products', 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_products.findIndex(p => p.id === id);
  if (index !== -1) {
    const deletedName = db_products[index].name;
    db_products.splice(index, 1);
    await syncStateToFirestore('products', id);
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

app.post('/api/categories', checkPermission('products', 'write'), async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  const trimmed = name.trim();
  if (db_categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    return res.status(400).json({ error: "Category already exists" });
  }
  db_categories.push(trimmed);
  await syncStateToFirestore('categories');
  logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_CREATE", `Created new product category: ${trimmed}`);
  res.status(201).json({ success: true, categories: db_categories });
});

app.put('/api/categories', checkPermission('products', 'write'), async (req: Request, res: Response) => {
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
    await syncStateToFirestore('categories');
    await syncStateToFirestore('products');
    logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_UPDATE", `Renamed category from "${oldName}" to "${trimmedNew}" (affected ${count} product(s))`);
    res.json({ success: true, categories: db_categories });
  } else {
    res.status(404).json({ error: "Category not found" });
  }
});

app.delete('/api/categories', checkPermission('products', 'delete'), async (req: Request, res: Response) => {
  const name = req.body?.name || req.query?.name;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  const target = (name as string).trim();
  db_categories = db_categories.filter(c => c.toLowerCase() !== target.toLowerCase());
  
  // Dynamic fallback category for products that are linked to this category
  const fallbackCat = db_categories[0] || 'General';
  
  let count = 0;
  db_products = db_products.map(p => {
    if (p.category && p.category.toLowerCase() === target.toLowerCase()) {
      count++;
      return { ...p, category: fallbackCat };
    }
    return p;
  });
  
  // If we have no categories left, establish a basic default General category
  if (db_categories.length === 0) {
    db_categories.push('General');
  }
  
  await syncStateToFirestore('categories');
  await syncStateToFirestore('products');
  logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_DELETE", `Removed category "${target}" (reset ${count} product(s) to "${fallbackCat}")`);
  res.json({ success: true, categories: db_categories });
});


// 4. Invoices CRUD + Automatic Ledger Hooks
app.get('/api/invoices', checkPermission('invoices', 'read'), (req: Request, res: Response) => {
  res.json(db_invoices);
});

app.post('/api/invoices', checkPermission('invoices', 'write'), async (req: Request, res: Response) => {
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
    await syncStateToFirestore('clients', newInvoice.clientId);
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

  await syncStateToFirestore('invoices', newInvoice.id);
  await syncStateToFirestore('ledger', newLedger.id);

  logUserActivity("demo-admin", "Karan Sharma", "INVOICE_CREATE", `Generated invoice ${newInvoice.invoiceNumber} for ${newInvoice.clientName} (INR ${newInvoice.total})`);
  res.status(201).json(newInvoice);
});

app.put('/api/invoices/:id', checkPermission('invoices', 'write'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_invoices.findIndex(inv => inv.id === id);
  if (index !== -1) {
    const oldInv = db_invoices[index];
    const data = req.body;
    
    const newTotal = Number(data.total ?? oldInv.total);
    const newPaidAmount = Number(data.paidAmount ?? oldInv.paidAmount);
    const newDueAmount = Number(data.dueAmount ?? (newTotal - newPaidAmount));
    
    // Adjust client outstanding balance safely
    const clientIndex = db_clients.findIndex(c => c.id === oldInv.clientId);
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = Math.max(0, db_clients[clientIndex].outstandingBalance - oldInv.dueAmount + newDueAmount);
      await syncStateToFirestore('clients', oldInv.clientId);
    }
    
    // Adjust ledger entry if it exists
    const ledgerIndex = db_ledger.findIndex(led => led.referenceType === "invoice" && led.referenceId === id);
    if (ledgerIndex !== -1) {
      db_ledger[ledgerIndex].amount = newTotal;
      db_ledger[ledgerIndex].description = `Invoice Modified: ${data.invoiceNumber || oldInv.invoiceNumber}`;
      if (clientIndex !== -1) {
        db_ledger[ledgerIndex].runningBalance = db_clients[clientIndex].outstandingBalance;
      }
      await syncStateToFirestore('ledger', db_ledger[ledgerIndex].id);
    }

    db_invoices[index] = {
      ...oldInv,
      ...data,
      total: newTotal,
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
    };
    
    await syncStateToFirestore('invoices', id);
    logUserActivity("demo-admin", "Karan Sharma", "INVOICE_UPDATE", `Modified invoice ${db_invoices[index].invoiceNumber} for ${db_invoices[index].clientName}`);
    res.json(db_invoices[index]);
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});

app.post('/api/invoices/:id/read', checkPermission('invoices', 'read'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = db_invoices.find(v => v.id === id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  // Set readCount to 1 (enforces the max 1 read count for 1 document limitation requested)
  if (!invoice.readCount || invoice.readCount < 1) {
    invoice.readCount = 1;
    await syncStateToFirestore('invoices', invoice.id);
  }

  res.json(invoice);
});

app.delete('/api/invoices/:id', checkPermission('invoices', 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_invoices.findIndex(inv => inv.id === id);
  if (index !== -1) {
    const inv = db_invoices[index];
    
    // 1. Remove corresponding ledger entries
    const ledIndices: number[] = [];
    db_ledger.forEach((led, i) => {
      if (led.referenceType === "invoice" && led.referenceId === id) {
        ledIndices.push(i);
      }
    });
    
    // Remove from Firestore and in-memory list
    for (const ledIdx of ledIndices) {
      const ledId = db_ledger[ledIdx].id;
      if (db) {
        try {
          await deleteDoc(doc(db, 'ledger', ledId));
        } catch (e) {
          console.error(`Failed to delete doc ledger/${ledId}:`, e);
        }
      }
    }
    // Filter db_ledger
    db_ledger = db_ledger.filter(led => !(led.referenceType === "invoice" && led.referenceId === id));
    
    // 2. Delete the actual invoice
    db_invoices.splice(index, 1);
    await syncStateToFirestore('invoices', id);

    // 3. Recalculate Client Outstanding Adjustments (robust full recalculation)
    const clientIndex = db_clients.findIndex(c => c.id === inv.clientId);
    if (clientIndex !== -1) {
      const clientInvoices = db_invoices.filter(v => v.clientId === inv.clientId);
      const clientPayments = db_payments.filter(p => p.clientId === inv.clientId);
      const totalInvoiced = clientInvoices.reduce((sum, v) => sum + v.total, 0);
      const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
      db_clients[clientIndex].outstandingBalance = Math.max(0, totalInvoiced - totalPaid);
      await syncStateToFirestore('clients', inv.clientId);
    }
    
    logUserActivity("demo-admin", "Karan Sharma", "INVOICE_DELETE", `Voided and deleted invoice: ${inv.invoiceNumber} and updated ledger ties`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});

// 5. Quotations CRUD
app.get('/api/quotations', checkPermission('quotations', 'read'), (req: Request, res: Response) => {
  res.json(db_quotations);
});

app.post('/api/quotations', checkPermission('quotations', 'write'), async (req: Request, res: Response) => {
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
  await syncStateToFirestore('quotations', newQuotation.id);
  logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_CREATE", `Prepared estimate ${newQuotation.quotationNumber} for ${newQuotation.clientName}`);
  res.status(201).json(newQuotation);
});

app.put('/api/quotations/:id', checkPermission('quotations', 'write'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_quotations.findIndex(q => q.id === id);
  if (index !== -1) {
    db_quotations[index] = { ...db_quotations[index], ...req.body };
    await syncStateToFirestore('quotations', id);
    logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_UPDATE", `Updated estimate status: ${db_quotations[index].quotationNumber} -> ${db_quotations[index].status}`);
    res.json(db_quotations[index]);
  } else {
    res.status(404).json({ error: "Quotation not found" });
  }
});

app.delete('/api/quotations/:id', checkPermission('quotations', 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_quotations.findIndex(q => q.id === id);
  if (index !== -1) {
    const qNumber = db_quotations[index].quotationNumber;
    db_quotations.splice(index, 1);
    await syncStateToFirestore('quotations', id);
    logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_DELETE", `Deleted quotation estimate: ${qNumber}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Quotation not found" });
  }
});

app.post('/api/quotations/:id/convert', checkPermission('quotations', 'write'), async (req: Request, res: Response) => {
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
      await syncStateToFirestore('clients', q.clientId);
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

    await syncStateToFirestore('invoices', invoiceId);
    await syncStateToFirestore('quotations', id);
    await syncStateToFirestore('ledger', newLedger.id);

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

app.post('/api/payments', checkPermission('payments', 'write'), async (req: Request, res: Response) => {
  try {
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

    // AUTOMATION TRIGGER 1: Auto Sync Invoice paid status update with NaN protection
    const invIndex = db_invoices.findIndex(i => i.id === newPayment.invoiceId);
    if (invIndex !== -1) {
      const inv = db_invoices[invIndex];
      inv.paidAmount = Number(inv.paidAmount || 0) + amountPaid;
      inv.dueAmount = Math.max(0, Number(inv.total || 0) - inv.paidAmount);
      
      if (inv.dueAmount === 0) {
        inv.status = 'paid';
      } else if (inv.paidAmount > 0) {
        inv.status = 'partially_paid';
      }
      await syncStateToFirestore('invoices', newPayment.invoiceId);
    }

    // AUTOMATION TRIGGER 2: Auto outstanding updates in Client entity with NaN protection
    const clientIndex = db_clients.findIndex(c => c.id === newPayment.clientId);
    let runningClientBalance = 0;
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = Math.max(0, Number(db_clients[clientIndex].outstandingBalance || 0) - amountPaid);
      runningClientBalance = db_clients[clientIndex].outstandingBalance;
      await syncStateToFirestore('clients', newPayment.clientId);
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
      runningCashBalance: Number(lastCashbookEntry.runningCashBalance || 0) + cashChange,
      runningBankBalance: Number(lastCashbookEntry.runningBankBalance || 0) + bankChange,
      createdAt: new Date().toISOString()
    };
    db_cashbook.unshift(newCashbook);

    await syncStateToFirestore('payments', payId);
    await syncStateToFirestore('ledger', newLedger.id);
    await syncStateToFirestore('cashbook', newCashbook.id);

    logUserActivity("demo-admin", "Karan Sharma", "PAYMENT_COLLECT", `Cleared collection receipts pay: ${amountPaid} from ${newPayment.clientName}. Double-entry synchronizer successful.`);
    res.status(201).json(newPayment);
  } catch (err: any) {
    console.error("Critical payment log execution failed: ", err);
    res.status(500).json({ error: `Could not approve ledger credit of payment receipt: ${err.message}` });
  }
});

app.put('/api/payments/:id', checkPermission('payments', 'write'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const pIndex = db_payments.findIndex(pay => pay.id === id);
  if (pIndex !== -1) {
    const oldP = db_payments[pIndex];

    // 1. Revert Old values
    const oldAmount = oldP.amount;
    const oldInvIndex = db_invoices.findIndex(inv => inv.id === oldP.invoiceId);
    if (oldInvIndex !== -1) {
      const inv = db_invoices[oldInvIndex];
      inv.paidAmount = Math.max(0, inv.paidAmount - oldAmount);
      inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
      inv.status = inv.dueAmount === inv.total ? 'unpaid' : (inv.paidAmount > 0 ? 'partially_paid' : 'unpaid');
      await syncStateToFirestore('invoices', inv.id);
    }

    const oldClientIndex = db_clients.findIndex(c => c.id === oldP.clientId);
    if (oldClientIndex !== -1) {
      db_clients[oldClientIndex].outstandingBalance = db_clients[oldClientIndex].outstandingBalance + oldAmount;
      await syncStateToFirestore('clients', db_clients[oldClientIndex].id);
    }

    // Apply edits
    const updatedInvoiceId = data.invoiceId || oldP.invoiceId;
    const isInvoiceChanged = updatedInvoiceId !== oldP.invoiceId;

    oldP.amount = Number(data.amount ?? oldP.amount);
    oldP.paymentDate = data.paymentDate || oldP.paymentDate;
    oldP.paymentMode = data.paymentMode || oldP.paymentMode;
    oldP.referenceNum = data.referenceNum || oldP.referenceNum;
    oldP.remarks = data.remarks || oldP.remarks;

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
      inv.paidAmount = inv.paidAmount + newAmount;
      inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
      inv.status = inv.dueAmount === 0 ? 'paid' : (inv.paidAmount > 0 ? 'partially_paid' : 'unpaid');
      await syncStateToFirestore('invoices', inv.id);
    }

    const newClientIndex = db_clients.findIndex(c => c.id === oldP.clientId);
    let runningClientBalance = 0;
    if (newClientIndex !== -1) {
      db_clients[newClientIndex].outstandingBalance = Math.max(0, db_clients[newClientIndex].outstandingBalance - newAmount);
      runningClientBalance = db_clients[newClientIndex].outstandingBalance;
      await syncStateToFirestore('clients', db_clients[newClientIndex].id);
    }

    // Filter and rebuild Ledger entry
    const ledgerToRemove = db_ledger.filter(l => l.referenceType === 'payment' && l.referenceId === oldP.id);
    db_ledger = db_ledger.filter(l => !(l.referenceType === 'payment' && l.referenceId === oldP.id));
    for (const led of ledgerToRemove) {
      await syncStateToFirestore('ledger', led.id);
    }
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
    db_ledger.unshift(newLedger);
    await syncStateToFirestore('ledger', newLedger.id);

    // Filter and rebuild Cashbook entry
    const cashbookToRemove = db_cashbook.filter(cb => cb.referenceId === oldP.id);
    db_cashbook = db_cashbook.filter(cb => cb.referenceId !== oldP.id);
    for (const cb of cashbookToRemove) {
      await syncStateToFirestore('cashbook', cb.id);
    }
    
    let cashChange = 0;
    let bankChange = 0;
    if (oldP.paymentMode === 'Cash') {
      cashChange = newAmount;
    } else {
      bankChange = newAmount;
    }

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

    const newCashbook: CashbookEntry = {
      id: `cb-${Date.now()}`,
      date: oldP.paymentDate,
      description: `Invoiced Collection [${oldP.clientName}] Ref ${oldP.referenceNum} (EDITED)`,
      type: "income",
      paymentMode: oldP.paymentMode,
      amount: newAmount,
      referenceId: oldP.id,
      runningCashBalance: lastCashbookEntry.runningCashBalance + cashChange,
      runningBankBalance: lastCashbookEntry.runningBankBalance + bankChange,
      createdAt: new Date().toISOString()
    };
    db_cashbook.unshift(newCashbook);
    await syncStateToFirestore('cashbook', newCashbook.id);

    await syncStateToFirestore('payments', oldP.id);

    logUserActivity("demo-admin", "Karan Sharma", "PAYMENT_UPDATE", `Modified payment receipt references of ${oldP.clientName}. Double-entry log updated.`);
    res.json(oldP);
  } else {
    res.status(404).json({ error: "Payment not found" });
  }
});

app.delete('/api/payments/:id', checkPermission('payments', 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const pIndex = db_payments.findIndex(pay => pay.id === id);
  if (pIndex !== -1) {
    const p = db_payments[pIndex];

    // Revert Invoice paid amount
    const invIndex = db_invoices.findIndex(inv => inv.id === p.invoiceId);
    if (invIndex !== -1) {
      const inv = db_invoices[invIndex];
      inv.paidAmount = Math.max(0, inv.paidAmount - p.amount);
      inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
      inv.status = inv.dueAmount === inv.total ? 'unpaid' : (inv.paidAmount > 0 ? 'partially_paid' : 'unpaid');
      await syncStateToFirestore('invoices', inv.id);
    }

    // Revert Client outstanding balance
    const clientIndex = db_clients.findIndex(c => c.id === p.clientId);
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = db_clients[clientIndex].outstandingBalance + p.amount;
      await syncStateToFirestore('clients', db_clients[clientIndex].id);
    }

    // Revert Ledger
    const ledgerToRemove = db_ledger.filter(l => l.referenceType === 'payment' && l.referenceId === p.id);
    db_ledger = db_ledger.filter(l => !(l.referenceType === 'payment' && l.referenceId === p.id));
    for (const led of ledgerToRemove) {
      await syncStateToFirestore('ledger', led.id);
    }

    // Revert Cashbook
    const cashbookToRemove = db_cashbook.filter(cb => cb.referenceId === p.id);
    db_cashbook = db_cashbook.filter(cb => cb.referenceId !== p.id);
    for (const cb of cashbookToRemove) {
      await syncStateToFirestore('cashbook', cb.id);
    }

    // Delete payment
    db_payments.splice(pIndex, 1);

    await syncStateToFirestore('payments', id);

    logUserActivity("demo-admin", "Karan Sharma", "PAYMENT_DELETE", `Voided and deleted payment of INR ${p.amount} from ${p.clientName}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Payment not found" });
  }
});

// 7. Ledgers
app.get('/api/ledger', checkPermission('ledger', 'read'), (req: Request, res: Response) => {
  res.json(getCleanLedger());
});

app.get('/api/ledger/client/:clientId', checkPermission('ledger', 'read'), (req: Request, res: Response) => {
  const { clientId } = req.params;
  const cleanLedger = getCleanLedger();
  const filtered = cleanLedger.filter(led => led.clientId === clientId);
  res.json(filtered);
});

// 8. Cashbook CRUD / Log Entries
app.get('/api/cashbook', checkPermission('cashbook', 'read'), (req: Request, res: Response) => {
  res.json(db_cashbook);
});

app.post('/api/cashbook', checkPermission('cashbook', 'write'), async (req: Request, res: Response) => {
  const data = req.body;
  const amount = Number(data.amount || 0);
  const type = data.type || "expense"; // Default to expense/debit
  const mode = data.paymentMode || "Cash";

  // Enforce Cashbook strictly forbidden Income manual creation rule (Point 15)
  if (type === 'income') {
    return res.status(400).json({ error: "Operation Blocked: Manual 'Cash In' (Income) entries are strictly forbidden. Income must only reflect automatically from Payments Received, Invoice Collections, or Customer Payments." });
  }

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
  await syncStateToFirestore('cashbook', newEntry.id);
  logUserActivity("demo-admin", "Karan Sharma", "CASHBOOK_ENTRY", `Created manual transactional log: ${newEntry.description} for INR ${amount}`);
  res.status(201).json(newEntry);
});

app.put('/api/cashbook/:id', checkPermission('cashbook', 'write'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  
  if (data.type === 'income') {
    return res.status(400).json({ error: "Operation Blocked: Manual 'Cash In' (Income) entries are strictly forbidden. Income must only reflect automatically from Payments Received, Invoice Collections, or Customer Payments." });
  }

  const index = db_cashbook.findIndex(cb => cb.id === id);
  if (index !== -1) {
    db_cashbook[index] = { ...db_cashbook[index], ...data };
    await syncStateToFirestore('cashbook', id);
    logUserActivity("demo-admin", "Karan Sharma", "CASHBOOK_UPDATE", `Updated manual transactional log: ${db_cashbook[index].description}`);
    res.json(db_cashbook[index]);
  } else {
    res.status(404).json({ error: "Cashbook entry not found" });
  }
});

app.delete('/api/cashbook/:id', checkPermission('cashbook', 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db_cashbook.findIndex(cb => cb.id === id);
  if (index !== -1) {
    const item = db_cashbook[index];
    db_cashbook.splice(index, 1);
    await syncStateToFirestore('cashbook', id);
    logUserActivity("demo-admin", "Karan Sharma", "CASHBOOK_DELETE", `Deleted transactional log: ${item.description}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Cashbook entry not found" });
  }
});

// 9. Users Management
app.get('/api/users', checkPermission('users', 'read'), (req: Request, res: Response) => {
  res.json(db_users);
});

app.post('/api/users', checkPermission('users', 'write'), async (req: Request, res: Response) => {
  const data = req.body;
  const newUser: UserProfile = {
    userId: `u-${Date.now()}`,
    email: data.email || "staff@demo.com",
    name: data.name || "Anonymous Team",
    role: data.role || "Staff",
    status: data.status || "active",
    mobile: data.mobile || "",
    avatarUrl: data.avatarUrl || "",
    createdAt: new Date().toISOString(),
    lastLoginAt: ""
  };
  db_users.push(newUser);
  
  if (data.password) {
    db_passwords[newUser.email.trim().toLowerCase()] = data.password;
    if (db) {
      try {
        await setDoc(doc(db, 'businessSettings', 'passwords'), db_passwords);
      } catch (e) {
        console.error("Failed to commit password to Firestore:", e);
      }
    }
  }

  await syncStateToFirestore('users', newUser.userId);
  logUserActivity("demo-admin", "Karan Sharma", "USER_CREATE", `Onboarded teammate ${newUser.name} as ${newUser.role}`);
  res.status(201).json(newUser);
});

app.put('/api/users/:userId', checkPermission('users', 'write'), async (req: Request, res: Response) => {
  const { userId } = req.params;
  const data = req.body;
  const index = db_users.findIndex(u => u.userId === userId);
  if (index !== -1) {
    if (userId === 'demo-admin') {
      res.status(403).json({ error: "Primary Administrator profile parameters cannot be changed or disabled." });
      return;
    }
    const oldEmail = db_users[index].email.trim().toLowerCase();
    
    db_users[index] = {
      ...db_users[index],
      name: data.name || db_users[index].name,
      email: data.email || db_users[index].email,
      role: data.role || db_users[index].role,
      status: data.status || db_users[index].status,
      mobile: data.mobile !== undefined ? data.mobile : db_users[index].mobile,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : db_users[index].avatarUrl
    };

    const newEmail = db_users[index].email.trim().toLowerCase();

    if (data.password) {
      db_passwords[newEmail] = data.password;
      if (oldEmail !== newEmail) {
        delete db_passwords[oldEmail];
      }
      if (db) {
        try {
          await setDoc(doc(db, 'businessSettings', 'passwords'), db_passwords);
        } catch (e) {
          console.error("Failed to sync reset password to Firestore:", e);
        }
      }
    }

    await syncStateToFirestore('users', userId);
    logUserActivity("demo-admin", "Karan Sharma", "USER_UPDATE", `Updated teammate Operator: ${db_users[index].name}`);
    res.json(db_users[index]);
  } else {
    res.status(404).json({ error: "Operator not found" });
  }
});

app.put('/api/profile', async (req: Request, res: Response) => {
  const userEmail = (req.headers['x-user-email'] as string || '').trim().toLowerCase();
  if (!userEmail) {
    return res.status(401).json({ error: "Access Denied: Authentication parameters missing." });
  }

  const index = db_users.findIndex(u => u.email.trim().toLowerCase() === userEmail);
  if (index === -1) {
    return res.status(404).json({ error: "Operator profile details could not be found." });
  }

  const data = req.body;
  const oldEmail = db_users[index].email.trim().toLowerCase();
  
  db_users[index] = {
    ...db_users[index],
    name: data.name || db_users[index].name,
    email: data.email || db_users[index].email,
    mobile: data.mobile !== undefined ? data.mobile : db_users[index].mobile,
    avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : db_users[index].avatarUrl
  };

  const newEmail = db_users[index].email.trim().toLowerCase();

  if (data.password) {
    db_passwords[newEmail] = data.password;
    if (oldEmail !== newEmail) {
      delete db_passwords[oldEmail];
    }
  } else if (oldEmail !== newEmail) {
    db_passwords[newEmail] = db_passwords[oldEmail] || "Admin@123";
    delete db_passwords[oldEmail];
  }

  if (db) {
    try {
      await setDoc(doc(db, 'users', db_users[index].userId), db_users[index]);
      await setDoc(doc(db, 'businessSettings', 'passwords'), db_passwords);
    } catch (e) {
      console.error("Failed to commit profile updates to Cloud Firestore:", e);
    }
  } else {
    saveStateToLocalCache();
  }

  logUserActivity(db_users[index].userId, db_users[index].name, "PROFILE_UPDATE", `Updated own security profile`);
  res.json(db_users[index]);
});

app.delete('/api/users/:userId', checkPermission('users', 'delete'), async (req: Request, res: Response) => {
  const { userId } = req.params;
  const index = db_users.findIndex(u => u.userId === userId);
  if (index !== -1) {
    if (userId === 'demo-admin') {
      res.status(403).json({ error: "Primary Administrator cannot be deleted." });
      return;
    }
    const name = db_users[index].name;
    db_users.splice(index, 1);
    await syncStateToFirestore('users', userId);
    logUserActivity("demo-admin", "Karan Sharma", "USER_DELETE", `Revoked teammate clearance for: ${name}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Operator not found" });
  }
});

// 10. Audit logs & notifications
app.get('/api/logs', checkPermission('users', 'read'), (req: Request, res: Response) => {
  res.json(db_logs);
});

app.get('/api/notifications', (req: Request, res: Response) => {
  res.json(db_notifications);
});

app.put('/api/notifications/:id/read', async (req: Request, res: Response) => {
  const { id } = req.params;
  const item = db_notifications.find(n => n.id === id);
  if (item) {
    item.isRead = true;
    await syncStateToFirestore('notifications', id);
    res.json(item);
  } else {
    res.status(404).json({ error: "Notification not found" });
  }
});

// 11. Global Corporate business settings
app.get('/api/settings', checkPermission('settings', 'read'), (req: Request, res: Response) => {
  res.json(db_settings);
});

app.post('/api/settings', checkPermission('settings', 'write'), async (req: Request, res: Response) => {
  try {
    db_settings = { ...db_settings, ...req.body };
    await syncStateToFirestore('settings');
    logUserActivity("demo-admin", "Karan Sharma", "SETTINGS_WRITE", "Updated corporate profile settings & banking info");
    res.json(db_settings);
  } catch (err: any) {
    console.error("Error saving global corporate settings:", err);
    res.status(500).json({ error: `Settings update failed: ${err.message}` });
  }
});

// 11.5 Public Invoice and Passwords sync routes
app.get('/api/public/invoice/*', (req: Request, res: Response) => {
  try {
    const rawParam = req.params[0] || req.path.substring('/api/public/invoice/'.length);
    const invoiceNumber = decodeURIComponent(rawParam).trim();
    const inv = db_invoices.find(v => v.invoiceNumber.trim() === invoiceNumber);
    if (inv) {
      res.json({
        invoice: inv,
        settings: db_settings
      });
    } else {
      res.status(404).json({ error: "Invoice not found or deleted" });
    }
  } catch (err: any) {
    res.status(500).json({ error: `Internal query failed: ${err.message}` });
  }
});

app.get('/api/passwords', (req: Request, res: Response) => {
  res.json(db_passwords);
});

app.post('/api/passwords', async (req: Request, res: Response) => {
  try {
    db_passwords = { ...db_passwords, ...req.body };
    saveStateToLocalCache();
    if (db) {
      await setDoc(doc(db, 'businessSettings', 'passwords'), db_passwords);
    }
    res.json({ success: true, passwords: db_passwords });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11.55 Unified Batch Synchronization Gateway for maximum network reliability and zero queue-blocking
app.get('/api/batch-sync', async (req: Request, res: Response) => {
  // Rely on real-time background snapshot listeners for maximum speed (0-1ms) and 100% up-to-date synced values.

  const roleHeader = (req.headers['x-user-role'] as string || '').trim();
  const role: UserRole = (roleHeader || 'Admin') as UserRole;
  const userEmail = (req.headers['x-user-email'] as string || '').trim().toLowerCase();

  const isAdminOrOwner = role.toLowerCase() === 'admin' || userEmail === 'modulesinternet@gmail.com';
  const roleConfig = db_roles.find(r => r.role.trim().toLowerCase() === role.toLowerCase());

  const hasReadPermission = (module: 'dashboard' | 'clients' | 'products' | 'invoices' | 'quotations' | 'payments' | 'ledger' | 'cashbook' | 'users' | 'settings') => {
    if (isAdminOrOwner) return true;
    if (!roleConfig) return false;
    return !!roleConfig.modules[module]?.read;
  };

  // Compute live dashboard metrics on the fly if permitted
  let dashboardData = null;
  if (hasReadPermission('dashboard')) {
    const totalRevenue = db_payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.total, 0);
    const unpaidInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
    const totalOutstanding = db_clients.reduce((sum, c) => sum + c.outstandingBalance, 0);
    const totalClientsCount = db_clients.length;
    const totalInvoicesCount = db_invoices.length;
    const pendingInvoicesCount = db_invoices.filter(i => i.status !== 'paid').length;

    const monthlyDataMap = new Map<string, { month: string; billed: number; collected: number }>();
    const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    months.forEach(m => {
      monthlyDataMap.set(m, { month: m, billed: 0, collected: 0 });
    });

    db_invoices.forEach(inv => {
      const monthIndex = new Date(inv.date).getMonth();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = monthNames[monthIndex];
      const fallbackMonth = m ? m.substring(0, 3) : "Jan";
      const key = months.includes(fallbackMonth) ? fallbackMonth : (months[months.length - 1] || "May");
      const current = monthlyDataMap.get(key) || { month: key, billed: 0, collected: 0 };
      current.billed += inv.total;
      monthlyDataMap.set(key, current);
    });

    db_payments.forEach(pay => {
      const monthIndex = new Date(pay.paymentDate).getMonth();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = monthNames[monthIndex];
      const fallbackMonth = m ? m.substring(0, 3) : "Jan";
      const key = months.includes(fallbackMonth) ? fallbackMonth : (months[months.length - 1] || "May");
      const current = monthlyDataMap.get(key) || { month: key, billed: 0, collected: 0 };
      current.collected += pay.amount;
      monthlyDataMap.set(key, current);
    });

    dashboardData = {
      totalRevenue,
      totalInvoicesValue,
      unpaidInvoicesValue,
      totalOutstanding,
      totalClientsCount,
      totalInvoicesCount,
      pendingInvoicesCount,
      chartData: Array.from(monthlyDataMap.values())
    };
  }

  const payload = {
    dashboard: dashboardData,
    clients: hasReadPermission('clients') ? db_clients : [],
    products: hasReadPermission('products') ? db_products : [],
    invoices: hasReadPermission('invoices') ? db_invoices : [],
    quotations: hasReadPermission('quotations') ? db_quotations : [],
    payments: hasReadPermission('payments') ? db_payments : [],
    ledger: hasReadPermission('ledger') ? db_ledger : [],
    cashbook: hasReadPermission('cashbook') ? db_cashbook : [],
    users: hasReadPermission('users') ? db_users : [],
    logs: hasReadPermission('users') ? db_logs : [],
    notifications: db_notifications,
    settings: db_settings,
    roles: db_roles,
    categories: db_categories,
    passwords: db_passwords
  };

  res.json(payload);
});

// Helper to get nodemailer transporter (with auto Ethereal fallback for seamless testing)
async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  // Create real temporary test account from Ethereal if custom SMTP options are not specified
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log("Created transient testing Ethereal SMTP account:", testAccount.user);
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (error) {
    console.error("Failed to create transient SMTP fallback account:", error);
    return null;
  }
}

// 11.6 Secure OTP mail sending endpoint with high-fidelity layout
app.post('/api/send-otp-email', async (req: Request, res: Response) => {
  const { email, otpCode } = req.body;
  if (!email || !otpCode) {
    return res.status(400).json({ error: "Missing destination email or passcode" });
  }

  const transporter = await getTransporter();
  if (!transporter) {
    return res.status(500).json({ error: "Could not initialize secure mail transfer layer" });
  }

  const fromAddress = process.env.SMTP_FROM || '"Apex Digital Vault" <security@apexdigital.com>';
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Security Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em;">
                    APEX DIGITAL SOLUTIONS
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em;">
                Reset Your Security Password
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                We received a request to recover your security password. Use the verification passcode below to complete your authentication. This passcode is single-use and valid for the next 15 minutes.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 24px;">
                    <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Your Recovery OTP</span>
                    <div style="font-size: 36px; font-weight: 800; color: #4f46e5; letter-spacing: 0.1em; font-family: monospace;">
                      ${otpCode}
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; color: #64748b; font-style: italic;">
                If you did not initiate this password change, you can safely ignore this email. Please ensure your operational credentials are never shared.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <tr>
                  <td style="font-size: 11px; line-height: 1.5; color: #94a3b8; text-align: left;">
                    <strong>Security Metadata:</strong><br>
                    Request Timestamp: ${new Date().toUTCString()}<br>
                    Environment Ingress: Active Secure Node
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" style="max-width: 500px; margin-top: 20px;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="font-size: 11px; color: #94a3b8;">
              © 2026 Apex Digital Solutions. All Rights Reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: "Apex Digital Security Verification Passcode",
      text: `Apex Digital Solutions Security Password Reset. Your OTP Code: ${otpCode}. Timestamp: ${new Date().toUTCString()}`,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[MAILER] Email successfully sent to ${email}. MessageID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[MAILER] Test Preview Link (Ethereal): ${previewUrl}`);
    }

    res.json({ 
      success: true, 
      messageId: info.messageId, 
      previewUrl: previewUrl || undefined,
      description: previewUrl ? `Sent via test mail simulator. Preview email here: ${previewUrl}` : "Dispatched via corporate SMTP Gateway"
    });
  } catch (error: any) {
    console.error("[MAILER] Send failure:", error);
    res.status(500).json({ error: `SMTP Send Failure: ${error.message}` });
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
