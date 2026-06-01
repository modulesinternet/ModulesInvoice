/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Admin" | "Manager" | "Accountant" | "Staff";

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt: string;
  lastLoginAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  gstIn?: string;
  pan?: string;
  billingAddress: string;
  shippingAddress: string;
  outstandingBalance: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category: string;
  price: number;
  gstPercent: number; // e.g. 5, 12, 18, 28
  hsnSac?: string;
  stockQty?: number;
  unit?: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  hsnSac?: string;
  qty: number;
  price: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientGst?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxType: "CGST_SGST" | "IGST";
  taxAmount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: "unpaid" | "partially_paid" | "paid" | "overdue";
  createdAt: string;
  notes?: string;
  readCount?: number;
  pdfUrl?: string;
  attachments?: { name: string; url: string; size?: number; type?: string }[];
  challanUrl?: string;
  challanName?: string;
  challanType?: string;
}

export interface QuotationItem {
  productId: string;
  name: string;
  hsnSac?: string;
  qty: number;
  price: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  clientId: string;
  clientName: string;
  date: string;
  expiryDate: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  status: "draft" | "sent" | "accepted" | "declined" | "converted";
  convertedInvoiceId?: string;
  createdAt: string;
  notes?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentDate: string;
  paymentMode: "Cash" | "UPI" | "Bank Transfer" | "Card" | "Cheque" | "UPI/Bank Transfer";
  referenceNum: string;
  remarks: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  description: string;
  type: "debit" | "credit";
  amount: number;
  runningBalance: number;
  referenceType: "invoice" | "payment" | "opening_balance" | "adjustment";
  referenceId: string;
  createdAt: string;
}

export interface CashbookEntry {
  id: string;
  date: string;
  description: string;
  type: "income" | "expense" | "bank_deposit" | "withdrawal" | "adjustment";
  paymentMode: string; // e.g. 'Cash', 'UPI', 'Bank Transfer', etc.
  amount: number;
  referenceId?: string;
  category?: string;
  runningCashBalance: number;
  runningBankBalance: number;
  createdAt: string;
}

export interface BusinessSettings {
  companyName: string;
  gstIn: string;
  pan: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  bankName: string;
  accountNum: string;
  ifscCode: string;
  upiId: string;
  invoicePrefix: string;
  quotationPrefix: string;
  currency: string;
  logoUrl?: string;
  faviconUrl?: string;
  signatureUrl?: string;
  timezone?: string;
  gstOption?: "standard" | "zero_tax";
  titleBarText?: string;
  invoiceTheme?: "navy" | "minimal" | "emerald";
  moharSize?: number;
  showInvoiceGst?: boolean;
  showInvoiceLogo?: boolean;
  showInvoicePhone?: boolean;
  showInvoiceEmail?: boolean;
  showInvoiceAddress?: boolean;
  showInvoiceClientAddress?: boolean;
  showInvoiceClientPhone?: boolean;
  showInvoiceClientEmail?: boolean;
  showInvoiceClientGst?: boolean;
  showInvoiceHsn?: boolean;
  showInvoiceTaxSplit?: boolean;
  showInvoiceBankDetails?: boolean;
  showInvoiceUpiId?: boolean;
  showInvoiceQrCode?: boolean;
  customQrUrl?: string;
  useCustomQrCode?: boolean;
  showInvoiceSignature?: boolean;
  showInvoiceNotes?: boolean;
  qrBesideMohar?: boolean;
  defaultInvoiceNotes?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  isRead: boolean;
  createdAt: string;
}

export interface RoleModulePermission {
  read: boolean;
  write: boolean;
  delete: boolean;
}

export interface RolePermissions {
  role: UserRole;
  modules: {
    dashboard: RoleModulePermission;
    products: RoleModulePermission;
    quotations: RoleModulePermission;
    invoices: RoleModulePermission;
    payments: RoleModulePermission;
    ledger: RoleModulePermission;
    cashbook: RoleModulePermission;
    clients: RoleModulePermission;
    users: RoleModulePermission;
    settings: RoleModulePermission;
  };
}

export function formatDisplayDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  
  // Extract date portion if it contains T or space
  const cleanStr = dateStr.includes('T') 
    ? dateStr.split('T')[0] 
    : (dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr);
  
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD-MM-YYYY
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // If it's already in DD-MM-YYYY
    return cleanStr;
  }
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
  } catch (e) {}

  return dateStr;
}


