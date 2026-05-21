import { Client, Product, Invoice, Quotation, Payment, LedgerEntry, CashbookEntry, BusinessSettings, ActivityLog, Notification, UserProfile, RolePermissions, UserRole } from '../types';

// Standardized fetch wrapper
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const activeRole = localStorage.getItem('active_role') || 'Admin';
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': activeRole,
      ...options?.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const obj = JSON.parse(errText);
      if (obj.error) parsedErr = obj.error;
    } catch(e) {}
    throw new Error(parsedErr || 'Network request failed');
  }
  
  return response.json() as Promise<T>;
}

export const api = {
  // Dashboard Metrics
  getDashboard: () => request<{
    metrics: {
      totalRevenue: number;
      totalInvoicesValue: number;
      unpaidInvoicesValue: number;
      totalOutstanding: number;
      totalClientsCount: number;
      totalInvoicesCount: number;
      pendingInvoicesCount: number;
      cashBalance: number;
      bankBalance: number;
    };
    paymentMethods: Array<{ name: string; value: number; color: string }>;
    chartData: Array<{ month: string; billed: number; collected: number }>;
    recentInvoices: Array<{ id: string; invoiceNumber: string; clientName: string; total: number; status: string; date: string }>;
    topClients: Array<{ name: string; amount: number }>;
  }>('/api/dashboard'),

  // Clients
  getClients: () => request<Client[]>('/api/clients'),
  createClient: (client: Partial<Client>) => request<Client>('/api/clients', {
    method: 'POST',
    body: JSON.stringify(client),
  }),
  updateClient: (id: string, client: Partial<Client>) => request<Client>(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(client),
  }),
  deleteClient: (id: string) => request<{ success: boolean }>(`/api/clients/${id}`, {
    method: 'DELETE',
  }),

  // Products
  getProducts: () => request<Product[]>('/api/products'),
  createProduct: (product: Partial<Product>) => request<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateProduct: (id: string, product: Partial<Product>) => request<Product>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  deleteProduct: (id: string) => request<{ success: boolean }>(`/api/products/${id}`, {
    method: 'DELETE',
  }),

  // Invoices
  getInvoices: () => request<Invoice[]>('/api/invoices'),
  createInvoice: (invoice: Partial<Invoice>) => request<Invoice>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(invoice),
  }),
  deleteInvoice: (id: string) => request<{ success: boolean }>(`/api/invoices/${id}`, {
    method: 'DELETE',
  }),

  // Quotations
  getQuotations: () => request<Quotation[]>('/api/quotations'),
  createQuotation: (quotation: Partial<Quotation>) => request<Quotation>('/api/quotations', {
    method: 'POST',
    body: JSON.stringify(quotation),
  }),
  updateQuotation: (id: string, q: Partial<Quotation>) => request<Quotation>(`/api/quotations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(q),
  }),
  convertQuotation: (id: string) => request<{ success: boolean; invoice: Invoice }>(`/api/quotations/${id}/convert`, {
    method: 'POST',
  }),

  // Payments / Receipts
  getPayments: () => request<Payment[]>('/api/payments'),
  createPayment: (payment: Partial<Payment>) => request<Payment>('/api/payments', {
    method: 'POST',
    body: JSON.stringify(payment),
  }),

  // Ledgers
  getLedgers: () => request<LedgerEntry[]>('/api/ledger'),
  getLedgerByClient: (clientId: string) => request<LedgerEntry[]>(`/api/ledger/client/${clientId}`),

  // Cashbook
  getCashbook: () => request<CashbookEntry[]>('/api/cashbook'),
  createCashbookEntry: (entry: Partial<CashbookEntry>) => request<CashbookEntry>('/api/cashbook', {
    method: 'POST',
    body: JSON.stringify(entry),
  }),

  // Settings
  getSettings: () => request<BusinessSettings>('/api/settings'),
  saveSettings: (settings: Partial<BusinessSettings>) => request<BusinessSettings>('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),

  // Team
  getUsers: () => request<UserProfile[]>('/api/users'),
  createUser: (user: Partial<UserProfile>) => request<UserProfile>('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  }),

  // Audit Logs & Notifications
  getLogs: () => request<ActivityLog[]>('/api/logs'),
  getNotifications: () => request<Notification[]>('/api/notifications'),
  markNotificationRead: (id: string) => request<Notification>(`/api/notifications/${id}/read`, {
    method: 'PUT',
  }),

  // Roles & Permissions Module
  getRoles: () => request<RolePermissions[]>('/api/roles'),
  updateRole: (role: UserRole, payload: Partial<RolePermissions>) => request<RolePermissions>(`/api/roles/${role}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
};
