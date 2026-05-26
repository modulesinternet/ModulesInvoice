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
  const response = await fetch(url, config);
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
    return request<{ success: boolean; categories: string[] }>('/api/categories', 'DELETE', { name });
  },

  // 5. Invoices CRUD
  getInvoices: () => {
    return request<Invoice[]>('/api/invoices');
  },

  createInvoice: (invoice: Partial<Invoice>) => {
    return request<Invoice>('/api/invoices', 'POST', invoice);
  },

  markInvoiceRead: (id: string) => {
    return request<Invoice>(`/api/invoices/${id}/read`, 'POST');
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

  // 7. Payments Collections
  getPayments: () => {
    return request<Payment[]>('/api/payments');
  },

  createPayment: (payment: Partial<Payment>) => {
    return request<Payment>('/api/payments', 'POST', payment);
  },

  // 8. General Ledgers
  getLedgers: () => {
    return request<LedgerEntry[]>('/api/ledger');
  },

  getLedgerByClient: (clientId: string) => {
    return request<LedgerEntry[]>(`/api/ledger/client/${clientId}`);
  },

  // 9. Cashbook Registers
  getCashbook: () => {
    return request<CashbookEntry[]>('/api/cashbook');
  },

  createCashbookEntry: (entry: Partial<CashbookEntry>) => {
    return request<CashbookEntry>('/api/cashbook', 'POST', entry);
  },

  // 10. Business & Banking settings
  getSettings: () => {
    return request<BusinessSettings>('/api/settings');
  },

  saveSettings: (settings: Partial<BusinessSettings>) => {
    return request<BusinessSettings>('/api/settings', 'POST', settings);
  },

  // 11. Team User Management
  getUsers: () => {
    return request<UserProfile[]>('/api/users');
  },

  createUser: (user: Partial<UserProfile>) => {
    return request<UserProfile>('/api/users', 'POST', user);
  },

  // 12. Security Audit Logs & Notifications
  getLogs: () => {
    return request<ActivityLog[]>('/api/logs');
  },

  getNotifications: () => {
    return request<Notification[]>('/api/notifications');
  },

  markNotificationRead: (id: string) => {
    return request<Notification>(`/api/notifications/${id}/read`, 'PUT');
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
      // Fallback with try-catch in case some logs are restricted via permissions
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
  }
};
