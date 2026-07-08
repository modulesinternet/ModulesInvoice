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

import { Capacitor } from '@capacitor/core';

function getHeaders(): HeadersInit {
  const activeRole = localStorage.getItem('active_role') || 'Admin';
  const savedUser = localStorage.getItem('current_user');
  let email = '';
  let name = '';
  let userId = '';
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      email = parsed.email || '';
      name = parsed.name || '';
      userId = parsed.userId || '';
    } catch (_) {}
  }
  return {
    'Content-Type': 'application/json',
    'x-user-role': activeRole,
    'x-user-email': email.trim().toLowerCase(),
    'x-user-name': name,
    'x-user-id': userId
  };
}

function getApiUrl(url: string) {
  const isWebPlatform = Capacitor.getPlatform() === 'web';
  const isHttpClient = window.location.protocol.startsWith('http') && 
                       !window.location.origin.startsWith('capacitor://') &&
                       window.location.hostname !== 'localhost' &&
                       !navigator.userAgent.includes('Capacitor');

  if (isWebPlatform && isHttpClient) {
    return `${url}`;
  }

  if (window.location.hostname === 'localhost') {
    const port = window.location.port;
    if (port === '3000' || port === '3001' || port === '5173') {
      return `${url}`;
    }
  }

  const isCapacitor = Capacitor.isNativePlatform() || 
                      typeof (window as any).Capacitor !== 'undefined' || 
                      window.location.protocol === 'capacitor:' || 
                      window.location.origin.startsWith('capacitor://') ||
                      navigator.userAgent.includes('Capacitor');
  
  if (isCapacitor) {
    const currentOrigin = window.location.origin;
    if (currentOrigin && currentOrigin.startsWith('https://') && !currentOrigin.includes('localhost')) {
      return `${currentOrigin}${url}`;
    }
    return `https://ais-pre-xzpyeswg45bbcghpog5vdx-598615866613.asia-southeast1.run.app${url}`;
  }

  return `${url}`;
}

async function request<T>(url: string, method: string = 'GET', body?: any): Promise<T> {
  const headers = getHeaders();
  const config: RequestInit = {
    method,
    headers,
  };
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  let targetUrl = url;
  if (method === 'GET') {
    const separator = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${separator}t=${Date.now()}`;
  }

  const finalUrl = getApiUrl(targetUrl);
  
  let response;
  try {
    response = await fetch(finalUrl, config);
  } catch (err: any) {
    console.error(`[API Network Exception] Connection failed when hitting: ${finalUrl}`, err);
    throw new Error(`Device network / server offline. Failed to establish connection with security portal backend: ${finalUrl}. Error: ${err.message || err}`);
  }
  
  if (!response.ok) {
    let errMsg = `Request failed: ${response.statusText} (${response.status}) when hitting ${finalUrl}`;
    try {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error || errJson.message || errMsg;
      } catch (_) {
        if (errText.trim().startsWith('<')) {
          errMsg = `Backend returned system webpage error page. Verify your backend service health. (HTTP ${response.status} at ${finalUrl})`;
        } else if (errText.trim().length > 0) {
          errMsg = `${errText} (${response.status})`;
        }
      }
    } catch (_) {}
    throw new Error(errMsg);
  }
  
  const responseText = await response.text();
  try {
    return JSON.parse(responseText) as T;
  } catch (jsonErr: any) {
    console.error(`[API ERROR] Non-JSON payload received from '${finalUrl}':`, responseText.substring(0, 500));
    if (responseText.trim().startsWith('<')) {
      throw new Error(`The server has responded with an HTML page instead of JSON data. This usually indicates a routing issue or that the endpoint does not exist. (API target: ${finalUrl})`);
    } else {
      throw new Error(`Invalid data format. Expected JSON structure but received: "${responseText.substring(0, 80)}..."`);
    }
  }
}

export const api = {
  // Unified high-speed batch synchronization gate
  getBatchSync: () => {
    return request<{
      dashboard: any;
      clients: any[];
      products: any[];
      invoices: any[];
      quotations: any[];
      payments: any[];
      ledger: any[];
      cashbook: any[];
      users: any[];
      logs: any[];
      notifications: any[];
      settings: any;
      roles: any[];
      categories: string[];
      passwords: Record<string, string>;
    }>('/api/batch-sync');
  },

  // Authentication & Passwords Gateways
  login: (email: string, password: string) => {
    return request<any>('/api/auth/login', 'POST', { email, password });
  },

  checkEmail: (email: string) => {
    return request<any>('/api/auth/check-email', 'POST', { email });
  },

  sendOtpEmail: (email: string, otpCode: string) => {
    return request<any>('/api/send-otp-email', 'POST', { email, otpCode });
  },

  getPasswords: () => {
    return request<Record<string, string>>('/api/passwords');
  },

  savePasswords: (passwords: Record<string, string>) => {
    return request<any>('/api/passwords', 'POST', passwords);
  },

  updateProfile: (profile: any) => {
    return request<any>('/api/profile', 'PUT', profile);
  },

  // 1. Dashboard Metrics
  getDashboard: () => {
    return request<any>('/api/dashboard');
  },

  // 2. Clients
  getClients: () => {
    return request<Client[]>('/api/clients');
  },

  createClient: (client: Partial<Client>) => {
    return request<Client>('/api/clients', 'POST', client);
  },

  updateClient: (id: string, client: Partial<Client>) => {
    return request<Client>(`/api/clients/${id}`, 'PUT', client);
  },

  deleteClient: (id: string) => {
    return request<{ success: boolean }>(`/api/clients/${id}`, 'DELETE');
  },

  // 3. Products / Services Catalogue
  getProducts: () => {
    return request<Product[]>('/api/products');
  },

  createProduct: (product: Partial<Product>) => {
    return request<Product>('/api/products', 'POST', product);
  },

  updateProduct: (id: string, product: Partial<Product>) => {
    return request<Product>(`/api/products/${id}`, 'PUT', product);
  },

  deleteProduct: (id: string) => {
    return request<{ success: boolean }>(`/api/products/${id}`, 'DELETE');
  },

  // 4. Categories Management
  getCategories: () => {
    return request<string[]>('/api/categories');
  },

  createCategory: (name: string) => {
    return request<{ success: boolean; categories: string[] }>('/api/categories', 'POST', { name });
  },

  updateCategory: (oldName: string, newName: string) => {
    return request<{ success: boolean; categories: string[] }>('/api/categories', 'PUT', { oldName, newName });
  },

  deleteCategory: (name: string) => {
    return request<{ success: boolean; categories: string[] }>(`/api/categories?name=${encodeURIComponent(name)}`, 'DELETE', { name });
  },

  // 5. Invoices CRUD
  getInvoices: () => {
    return request<Invoice[]>('/api/invoices');
  },

  createInvoice: (invoice: Partial<Invoice>) => {
    return request<Invoice>('/api/invoices', 'POST', invoice);
  },

  updateInvoice: (id: string, invoice: Partial<Invoice>) => {
    return request<Invoice>(`/api/invoices/${id}`, 'PUT', invoice);
  },

  markInvoiceRead: (id: string) => {
    return request<Invoice>(`/api/invoices/${id}/read`, 'POST');
  },

  getPublicInvoice: (invoiceNumber: string) => {
    return request<any>(`/api/public/invoice/${encodeURIComponent(invoiceNumber)}`);
  },

  deleteInvoice: (id: string) => {
    return request<{ success: boolean }>(`/api/invoices/${id}`, 'DELETE');
  },

  // 6. Quotations / Estimates
  getQuotations: () => {
    return request<Quotation[]>('/api/quotations');
  },

  createQuotation: (quotation: Partial<Quotation>) => {
    return request<Quotation>('/api/quotations', 'POST', quotation);
  },

  updateQuotation: (id: string, q: Partial<Quotation>) => {
    return request<Quotation>(`/api/quotations/${id}`, 'PUT', q);
  },

  convertQuotation: (id: string) => {
    return request<{ success: boolean; invoice: Invoice }>(`/api/quotations/${id}/convert`, 'POST');
  },

  deleteQuotation: (id: string) => {
    return request<{ success: boolean }>(`/api/quotations/${id}`, 'DELETE');
  },

  // 7. Payments Collections
  getPayments: () => {
    return request<Payment[]>('/api/payments');
  },

  createPayment: (payment: Partial<Payment>) => {
    return request<Payment>('/api/payments', 'POST', payment);
  },

  updatePayment: (id: string, updated: Partial<Payment>) => {
    return request<Payment>(`/api/payments/${id}`, 'PUT', updated);
  },

  deletePayment: (id: string) => {
    return request<{ success: boolean }>(`/api/payments/${id}`, 'DELETE');
  },

  // 8. Ledger Entries
  getLedger: () => {
    return request<LedgerEntry[]>('/api/ledger');
  },

  getLedgers: () => {
    return request<LedgerEntry[]>('/api/ledger');
  },

  // 9. Cashbook Management
  getCashbook: () => {
    return request<CashbookEntry[]>('/api/cashbook');
  },

  createCashbookEntry: (entry: Partial<CashbookEntry>) => {
    return request<CashbookEntry>('/api/cashbook', 'POST', entry);
  },

  updateCashbookEntry: (id: string, entry: Partial<CashbookEntry>) => {
    return request<CashbookEntry>(`/api/cashbook/${id}`, 'PUT', entry);
  },

  deleteCashbookEntry: (id: string) => {
    return request<{ success: boolean }>(`/api/cashbook/${id}`, 'DELETE');
  },

  // 10. Business Settings & Configuration
  getSettings: () => {
    return request<BusinessSettings>('/api/settings');
  },

  getPublicSettings: () => {
    return request<any>('/api/public/settings');
  },

  updateSettings: (settings: Partial<BusinessSettings>) => {
    return request<BusinessSettings>('/api/settings', 'PUT', settings);
  },

  saveSettings: (settings: Partial<BusinessSettings>) => {
    return request<BusinessSettings>('/api/settings', 'POST', settings);
  },

  transferCacheToCloud: () => {
    return request<any>('/api/transfer-cache', 'POST');
  },

  // 11. User Management & Teammates Directory
  getUsers: () => {
    return request<UserProfile[]>('/api/users');
  },

  createUser: (user: Partial<UserProfile> & { password?: string }) => {
    return request<UserProfile>('/api/users', 'POST', user);
  },

  updateUser: (userId: string, user: Partial<UserProfile> & { password?: string }) => {
    return request<UserProfile>(`/api/users/${userId}`, 'PUT', user);
  },

  deleteUser: (userId: string) => {
    return request<{ success: boolean }>(`/api/users/${userId}`, 'DELETE');
  },

  // 12. System Audit Logs & Live Broadcasting Feed
  getLogs: () => {
    return request<ActivityLog[]>('/api/logs');
  },

  createLog: (actionType: string, description: string) => {
    return request<{ success: boolean }>('/api/logs', 'POST', { action: actionType, details: description });
  },

  getNotifications: () => {
    return request<Notification[]>('/api/notifications');
  },

  markNotificationRead: (id: string) => {
    return request<Notification>(`/api/notifications/${id}/read`, 'PUT');
  },

  markAllNotificationsRead: () => {
    return request<{ success: boolean; count: number }>('/api/notifications/read-all', 'PUT');
  },

  deleteNotification: (id: string) => {
    return request<{ success: boolean; id: string }>(`/api/notifications/${id}`, 'DELETE');
  },

  // 13. RBAC Control Matrix
  getRoles: () => {
    return request<RolePermissions[]>('/api/roles');
  },

  updateRole: (role: UserRole, payload: Partial<RolePermissions>) => {
    return request<RolePermissions>(`/api/roles/${role}`, 'PUT', { modules: payload.modules });
  },

  // 14. Integrated DB Backups and Portability
  exportDatabase: async () => {
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
    return request<{ success: boolean; message: string }>('/api/restore', 'POST', backup);
  },

  getSavedBackendUrl: () => {
    return '';
  },
  getDefaultBackendUrl: () => {
    return 'https://ais-pre-xzpyeswg45bbcghpog5vdx-598615866613.asia-southeast1.run.app';
  },
  getActiveBackendUrl: () => {
    return getApiUrl('');
  },
  setBackendUrl: (url: string) => {
    // No-op to respect user intent
  },
  testHealth: async (urlOverride?: string) => {
    const backupUrl = localStorage.getItem('backend_api_url');
    if (urlOverride !== undefined) {
      if (urlOverride.trim() === '') {
        localStorage.removeItem('backend_api_url');
      } else {
        let clean = urlOverride.trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = `https://${clean}`;
        }
        localStorage.setItem('backend_api_url', clean);
      }
    }
    try {
      const headers = getHeaders();
      const res = await fetch(getApiUrl('/api/health'), {
        method: 'GET',
        headers
      });
      if (backupUrl) {
        localStorage.setItem('backend_api_url', backupUrl);
      } else {
        localStorage.removeItem('backend_api_url');
      }
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error("Backend returned a non-JSON response. (Expected health status, but received HTML or plaintext).");
      }
      return { success: true, data };
    } catch (err: any) {
      if (backupUrl) {
        localStorage.setItem('backend_api_url', backupUrl);
      } else {
        localStorage.removeItem('backend_api_url');
      }
      return { success: false, error: err.message || String(err) };
    }
  },

  registerFcmToken: async (userId: string, deviceToken: string, platform: string) => {
    try {
      return await request<{ success: boolean; message?: string }>('/api/fcm-token', 'POST', {
        userId,
        deviceToken,
        platform
      });
    } catch (err: any) {
      console.warn("FCM registration request failed:", err);
      return { success: false, message: err.message };
    }
  },

  getApkReleases: async () => {
    try {
      return await request<any[]>('/api/apk/releases');
    } catch (err: any) {
      console.warn("api.getApkReleases backend fetch failed:", err.message || err);
      return [];
    }
  },

  uploadApk: (fileBase64: string, originalName: string, uploadedBy: string, storageUrl?: string) => {
    return request<{ success: boolean; release: any }>('/api/apk/upload', 'POST', { fileBase64, originalName, uploadedBy, storageUrl });
  },

  getLiveVersion: async () => {
    try {
      return await request<{ version: string; build: string }>('/api/version');
    } catch (err) {
      return { version: '1.1.2', build: '18' };
    }
  },

  downloadApkUrl: (id: string) => {
    return getApiUrl(`/api/apk/download/${id}`);
  }
};
