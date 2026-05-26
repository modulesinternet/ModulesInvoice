import { Client, Product, Invoice, Quotation, Payment, LedgerEntry, CashbookEntry, BusinessSettings, ActivityLog, Notification, UserProfile } from '../types';

// Global configurations defaults
export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: "Apex Digital Solutions Pvt Ltd",
  gstIn: "27AAZCA4312R1ZX",
  pan: "AAZCA4312R",
  address: "Suite 405, Dynasty Business Park, Andheri-Kurla Road, Andheri East, Mumbai, Maharashtra 400059",
  email: "billing@apexdigital.in",
  phone: "+91 22 4912 3000",
  website: "www.apexdigital.in",
  bankName: "HDFC Bank Ltd",
  accountNum: "50200049182312",
  ifscCode: "HDFC0000060",
  upiId: "apexcorp@hdfcbank",
  invoicePrefix: "APX/26-27/",
  quotationPrefix: "EST/26-27/",
  currency: "INR",
  logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80",
  signatureUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=150&h=50&q=80",
  timezone: "Asia/Kolkata",
  gstOption: "standard",
  titleBarText: "Apex Digital Solutions"
};

export const DEMO_USERS: UserProfile[] = [
  {
    userId: "admin-modulesinternet",
    email: "modulesinternet@gmail.com",
    name: "Admin",
    role: "Admin",
    status: "active",
    createdAt: "2026-05-01T10:00:00Z",
    lastLoginAt: "2026-05-23T07:00:00Z"
  },
  {
    userId: "u-admin-demo",
    email: "admin@demo.com",
    name: "Karan Sharma",
    role: "Admin",
    status: "active",
    createdAt: "2026-05-01T10:00:00Z",
    lastLoginAt: ""
  },
  {
    userId: "u-manager-demo",
    email: "manager@demo.com",
    name: "Meera Nair",
    role: "Manager",
    status: "active",
    createdAt: "2026-05-01T10:00:00Z",
    lastLoginAt: ""
  },
  {
    userId: "u-accountant-demo",
    email: "accountant@demo.com",
    name: "Rajesh Patel",
    role: "Accountant",
    status: "active",
    createdAt: "2026-05-01T10:00:00Z",
    lastLoginAt: ""
  },
  {
    userId: "u-staff-demo",
    email: "staff@demo.com",
    name: "Amit Sen",
    role: "Staff",
    status: "active",
    createdAt: "2026-05-01T10:00:00Z",
    lastLoginAt: ""
  }
];

export const DEMO_CLIENTS: Client[] = [
  { id: "c1", name: "Tata Consultancy Services Ltd", email: "finance@tcs.com", phone: "+91 22 6778 9999", gstIn: "27AAATT1234F1Z1", pan: "AAATT1234F", billingAddress: "TCS House, Raveline Street, Fort, Mumbai 400001", shippingAddress: "TCS House, Raveline Street, Fort, Mumbai 400001", outstandingBalance: 45000, createdAt: "2026-05-01T10:00:00Z" },
  { id: "c2", name: "Reliance Retail Ltd", email: "vendor.billing@reliance.com", phone: "+91 22 4477 0000", gstIn: "27AAACR1039K1ZM", pan: "AAACR1039K", billingAddress: "Court House, Lokmanya Tilak Marg, Dhobi Talao, Mumbai 400002", shippingAddress: "Reliance Corporate Park, Ghansoli, Navi Mumbai 400701", outstandingBalance: 128000, createdAt: "2026-05-01T11:00:00Z" },
  { id: "c3", name: "Infosys Limited", email: "accounts.payable@infosys.com", phone: "+91 80 2852 0261", gstIn: "29AAACI4321A1ZB", pan: "AAACI4321A", billingAddress: "Electronics City, Hosur Road, Bengaluru, Karnataka 560100", shippingAddress: "Electronics City, Hosur Road, Bengaluru, Karnataka 560100", outstandingBalance: 0, createdAt: "2026-05-02T09:00:00Z" },
  { id: "c4", name: "Wipro Limited", email: "billing.services@wipro.com", phone: "+91 80 2844 0011", gstIn: "29AAACW5678C1Z0", pan: "AAACW5678C", billingAddress: "Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035", shippingAddress: "Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035", outstandingBalance: 15400, createdAt: "2026-05-02T10:30:00Z" },
  { id: "c5", name: "Mahindra & Mahindra Ltd", email: "accounts@mahindra.co.in", phone: "+91 22 2490 1441", gstIn: "27AAACM2345K1ZK", pan: "AAACM2345K", billingAddress: "Gateway Building, Apollo Bunder, Colaba, Mumbai 400001", shippingAddress: "M&M Automotive Plant, Kandivali East, Mumbai 400101", outstandingBalance: 89000, createdAt: "2026-05-03T12:00:00Z" },
  { id: "c6", name: "HDFC Life Insurance Co Ltd", email: "vendorpayments@hdfclife.com", phone: "+91 22 6751 6666", gstIn: "27AABCH1209D1ZH", pan: "AABCH1209D", billingAddress: "13th Floor, Lodha Excelus, Apollo Mills Compound, Mahalaxmi, Mumbai 400011", shippingAddress: "13th Floor, Lodha Excelus, Mahalaxmi, Mumbai 400011", outstandingBalance: 0, createdAt: "2026-05-04T14:00:00Z" },
  { id: "c7", name: "Adani Enterprises Ltd", email: "finance.corporate@adani.com", phone: "+91 79 2656 5555", gstIn: "24AAACA1290B1ZZ", pan: "AAACA1290B", billingAddress: "Adani Corporate House, Shantigram, SG Highway, Ahmedabad, Gujarat 382421", shippingAddress: "Adani Corporate House, Ahmedabad 382421", outstandingBalance: 245000, createdAt: "2026-05-05T10:00:00Z" },
  { id: "c8", name: "Larsen & Toubro Ltd", email: "billdesk@lntecc.com", phone: "+91 22 6752 5656", gstIn: "27AAACL3409E1ZT", pan: "AAACL3409E", billingAddress: "L&T House, Ballard Estate, Mumbai 400001", shippingAddress: "L&T Gate No 1, Powai, Saki Vihar Road, Mumbai 400072", outstandingBalance: 75000, createdAt: "2026-05-06T15:00:00Z" },
  { id: "c9", name: "Airtel Business Solutions", email: "partner.payables@airtel.com", phone: "+91 11 4666 1000", gstIn: "07AAACA2304K1ZC", pan: "ACA2304K", billingAddress: "Bharti Crescent, 1 Nelson Mandela Road, Vasant Kunj, New Delhi 110070", shippingAddress: "Bharti Crescent, Vasant Kunj, New Delhi 110070", outstandingBalance: 12000, createdAt: "2026-05-07T11:00:00Z" },
  { id: "c10", name: "Hindustan Unilever Ltd", email: "finance.hul@unilever.com", phone: "+91 22 3983 0000", gstIn: "27AAACH8091A1ZR", pan: "AAACH8091A", billingAddress: "HUL House, B.D. Sawant Marg, Chakala, Andheri East, Mumbai 400099", shippingAddress: "HUL Warehousing Hub, Bhiwandi, Thane 421302", outstandingBalance: 0, createdAt: "2026-05-08T09:30:00Z" }
];

export const DEMO_PRODUCTS: Product[] = [
  { id: "p1", name: "Enterprise SaaS Suite Development", sku: "SRV-SaaS-ENT", category: "Software Services", price: 150000, gstPercent: 18, hsnSac: "998313", stockQty: 999, unit: "HRS" },
  { id: "p2", name: "Cloud Server Architecting & Deployment", sku: "SRV-CLD-ARC", category: "Cloud Infrastructure", price: 75000, gstPercent: 18, hsnSac: "998311", stockQty: 999, unit: "HRS" },
  { id: "p3", name: "Interactive React Native Mobile License", sku: "LIC-MOB-APP", category: "Licensing", price: 95000, gstPercent: 12, hsnSac: "997331", stockQty: 100, unit: "PCS" },
  { id: "p4", name: "Corporate UI/UX Design System Asset", sku: "DSG-SYS-CRP", category: "Creative Services", price: 50000, gstPercent: 18, hsnSac: "998314", stockQty: 999, unit: "HRS" },
  { id: "p5", name: "DevOps Security Audit & Pentesting", sku: "SRV-SEC-AUD", category: "Security Services", price: 120000, gstPercent: 18, hsnSac: "998315", stockQty: 999, unit: "HRS" },
  { id: "p6", name: "Smart AI Chatbot Integration", sku: "SRV-AI-CHAT", category: "Software Services", price: 85000, gstPercent: 18, hsnSac: "998313", stockQty: 999, unit: "UNITS" },
  { id: "p7", name: "Premium Network Router (Enterprise)", sku: "HW-RTR-MX20", category: "Hardware Assets", price: 45000, gstPercent: 18, hsnSac: "847130", stockQty: 24, unit: "BOX" },
  { id: "p8", name: "Dedicated Fiber-Optic Transceiver", sku: "HW-TRX-FIB", category: "Hardware Assets", price: 12500, gstPercent: 18, hsnSac: "847141", stockQty: 150, unit: "PCS" },
  { id: "p9", name: "Annual Maintenance Server Retainer", sku: "RET-MNT-SRV", category: "Support Retainers", price: 20000, gstPercent: 18, hsnSac: "998713", stockQty: 999, unit: "MONTH" },
  { id: "p10", name: "Database Performance Tuning", sku: "SRV-DBA-OPT", category: "Software Services", price: 35000, gstPercent: 18, hsnSac: "998313", stockQty: 999, unit: "HRS" },
  { id: "p11", name: "Digital Marketing Campaign Dashboard", sku: "SRV-MKT-DSH", category: "Creative Services", price: 40000, gstPercent: 18, hsnSac: "998314", stockQty: 999, unit: "UNITS" },
  { id: "p12", name: "Employee ERP Integration Pipeline", sku: "SRV-ERP-PIP", category: "Software Services", price: 180000, gstPercent: 18, hsnSac: "998313", stockQty: 999, unit: "HRS" },
  { id: "p13", name: "Technical Documentation Translation", sku: "SRV-DOC-TRN", category: "Support Retainers", price: 15000, gstPercent: 12, hsnSac: "998316", stockQty: 999, unit: "DOCS" },
  { id: "p14", name: "PCI-DSS Compliance Assessment", sku: "SRV-SEC-PCI", category: "Security Services", price: 220000, gstPercent: 18, hsnSac: "998315", stockQty: 999, unit: "HRS" },
  { id: "p15", name: "Backup Recovery Cloud Storage Space", sku: "SRV-STG-BK", category: "Cloud Infrastructure", price: 8000, gstPercent: 18, hsnSac: "998311", stockQty: 500, unit: "TB" }
];

export const DEMO_QUOTATIONS: Quotation[] = [
  {
    id: "q1",
    quotationNumber: "EST/26-27/001",
    clientId: "c3",
    clientName: "Infosys Limited",
    date: "2026-05-09",
    expiryDate: "2026-06-09",
    items: [
      { productId: "p1", name: "Enterprise SaaS Suite Development", hsnSac: "998313", qty: 2, price: 150000, gstPercent: 18, gstAmount: 54000, totalAmount: 354000 }
    ],
    subtotal: 300000,
    discount: 10000,
    taxAmount: 54000,
    total: 344000,
    status: "converted",
    convertedInvoiceId: "inv2",
    createdAt: "2026-05-09T10:00:00Z"
  },
  {
    id: "q2",
    quotationNumber: "EST/26-27/002",
    clientId: "c6",
    clientName: "HDFC Life Insurance Co Ltd",
    date: "2026-05-10",
    expiryDate: "2026-06-10",
    items: [
      { productId: "p5", name: "DevOps Security Audit & Pentesting", hsnSac: "998315", qty: 1, price: 120000, gstPercent: 18, gstAmount: 21600, totalAmount: 141600 }
    ],
    subtotal: 120000,
    discount: 5000,
    taxAmount: 21600,
    total: 136600,
    status: "accepted",
    createdAt: "2026-05-10T11:00:00Z"
  },
  {
    id: "q3",
    quotationNumber: "EST/26-27/003",
    clientId: "c1",
    clientName: "Tata Consultancy Services Ltd",
    date: "2026-05-11",
    expiryDate: "2026-05-25",
    items: [
      { productId: "p4", name: "Corporate UI/UX Design System Asset", hsnSac: "998314", qty: 1, price: 50000, gstPercent: 18, gstAmount: 9000, totalAmount: 59000 },
      { productId: "p15", name: "Backup Recovery Cloud Storage Space", hsnSac: "998311", qty: 5, price: 8000, gstPercent: 18, gstAmount: 7200, totalAmount: 47200 }
    ],
    subtotal: 90000,
    discount: 0,
    taxAmount: 16200,
    total: 106200,
    status: "sent",
    createdAt: "2026-05-11T14:30:00Z"
  },
  {
    id: "q4",
    quotationNumber: "EST/26-27/004",
    clientId: "c10",
    clientName: "Hindustan Unilever Ltd",
    date: "2026-05-12",
    expiryDate: "2026-06-12",
    items: [
      { productId: "p10", name: "Database Performance Tuning", hsnSac: "998313", qty: 3, price: 35000, gstPercent: 18, gstAmount: 18900, totalAmount: 123900 }
    ],
    subtotal: 105000,
    discount: 15000,
    taxAmount: 18900,
    total: 108900,
    status: "accepted",
    createdAt: "2026-05-12T09:00:00Z"
  },
  {
    id: "q5",
    quotationNumber: "EST/26-27/005",
    clientId: "c9",
    clientName: "Airtel Business Solutions",
    date: "2026-05-13",
    expiryDate: "2026-06-13",
    items: [
      { productId: "p7", name: "Premium Network Router (Enterprise)", hsnSac: "847130", qty: 1, price: 45000, gstPercent: 18, gstAmount: 8100, totalAmount: 53100 }
    ],
    subtotal: 45000,
    discount: 0,
    taxAmount: 8100,
    total: 53100,
    status: "sent",
    createdAt: "2026-05-13T10:15:00Z"
  },
  {
    id: "q6",
    quotationNumber: "EST/26-27/006",
    clientId: "c7",
    clientName: "Adani Enterprises Ltd",
    date: "2026-05-14",
    expiryDate: "2026-05-28",
    items: [
      { productId: "p12", name: "Employee ERP Integration Pipeline", hsnSac: "998313", qty: 1, price: 180000, gstPercent: 18, gstAmount: 32400, totalAmount: 212400 }
    ],
    subtotal: 180000,
    discount: 20000,
    taxAmount: 32400,
    total: 192400,
    status: "declined",
    createdAt: "2026-05-14T11:00:00Z",
    notes: "Client decided to table the ERP pipeline until Q3."
  },
  {
    id: "q7",
    quotationNumber: "EST/26-27/007",
    clientId: "c4",
    clientName: "Wipro Limited",
    date: "2026-05-15",
    expiryDate: "2026-06-15",
    items: [
      { productId: "p6", name: "Smart AI Chatbot Integration", hsnSac: "998313", qty: 1, price: 85000, gstPercent: 18, gstAmount: 15300, totalAmount: 100300 }
    ],
    subtotal: 85000,
    discount: 5000,
    taxAmount: 15300,
    total: 95300,
    status: "draft",
    createdAt: "2026-05-15T15:00:00Z"
  },
  {
    id: "q8",
    quotationNumber: "EST/26-27/008",
    clientId: "c5",
    clientName: "Mahindra & Mahindra Ltd",
    date: "2026-05-16",
    expiryDate: "2026-06-16",
    items: [
      { productId: "p14", name: "PCI-DSS Compliance Assessment", hsnSac: "998315", qty: 1, price: 220000, gstPercent: 18, gstAmount: 39600, totalAmount: 259600 }
    ],
    subtotal: 220000,
    discount: 10000,
    taxAmount: 39600,
    total: 249600,
    status: "sent",
    createdAt: "2026-05-16T16:20:00Z"
  },
  {
    id: "q9",
    quotationNumber: "EST/26-27/009",
    clientId: "c2",
    clientName: "Reliance Retail Ltd",
    date: "2026-05-17",
    expiryDate: "2026-06-17",
    items: [
      { productId: "p3", name: "Interactive React Native Mobile License", hsnSac: "997331", qty: 2, price: 95000, gstPercent: 12, gstAmount: 22800, totalAmount: 212800 }
    ],
    subtotal: 190000,
    discount: 15000,
    taxAmount: 22800,
    total: 197800,
    status: "accepted",
    createdAt: "2026-05-17T10:00:00Z"
  },
  {
    id: "q10",
    quotationNumber: "EST/26-27/010",
    clientId: "c8",
    clientName: "Larsen & Toubro Ltd",
    date: "2026-05-18",
    expiryDate: "2026-06-18",
    items: [
      { productId: "p2", name: "Cloud Server Architecting & Deployment", hsnSac: "998311", qty: 1, price: 75000, gstPercent: 18, gstAmount: 13500, totalAmount: 88500 }
    ],
    subtotal: 75000,
    discount: 0,
    taxAmount: 13500,
    total: 88500,
    status: "sent",
    createdAt: "2026-05-18T11:45:00Z"
  }
];

export const DEMO_INVOICES: Invoice[] = [
  {
    id: "inv1",
    invoiceNumber: "APX/26-27/001",
    clientId: "c1",
    clientName: "Tata Consultancy Services Ltd",
    clientGst: "27AAATT1234F1Z1",
    date: "2026-05-02",
    dueDate: "2026-05-17",
    items: [
      { productId: "p2", name: "Cloud Server Architecting & Deployment", hsnSac: "998311", qty: 1, price: 75000, gstPercent: 18, gstAmount: 13500, totalAmount: 88500 }
    ],
    subtotal: 75000,
    discount: 0,
    taxType: "CGST_SGST",
    taxAmount: 13500,
    total: 88500,
    paidAmount: 88500,
    dueAmount: 0,
    status: "paid",
    createdAt: "2026-05-02T11:30:00Z"
  },
  {
    id: "inv2",
    invoiceNumber: "APX/26-27/002",
    clientId: "c3",
    clientName: "Infosys Limited",
    clientGst: "29AAACI4321A1ZB",
    date: "2026-05-09",
    dueDate: "2026-05-24",
    items: [
      { productId: "p1", name: "Enterprise SaaS Suite Development", hsnSac: "998313", qty: 2, price: 150000, gstPercent: 18, gstAmount: 54000, totalAmount: 354000 }
    ],
    subtotal: 300000,
    discount: 10000,
    taxType: "IGST", // Out of Maharashtra (Karnataka is IGST)
    taxAmount: 54000,
    total: 344000,
    paidAmount: 344000,
    dueAmount: 0,
    status: "paid",
    createdAt: "2026-05-09T10:15:00Z"
  },
  {
    id: "inv3",
    invoiceNumber: "APX/26-27/003",
    clientId: "c2",
    clientName: "Reliance Retail Ltd",
    clientGst: "27AAACR1039K1ZM",
    date: "2026-05-11",
    dueDate: "2026-05-26",
    items: [
      { productId: "p3", name: "Interactive React Native Mobile License", hsnSac: "997331", qty: 2, price: 95000, gstPercent: 12, gstAmount: 22800, totalAmount: 212800 },
      { productId: "p8", name: "Dedicated Fiber-Optic Transceiver", hsnSac: "847141", qty: 4, price: 12500, gstPercent: 18, gstAmount: 9000, totalAmount: 59000 }
    ],
    subtotal: 240000,
    discount: 12000,
    taxType: "CGST_SGST",
    taxAmount: 31800,
    total: 259800,
    paidAmount: 131800,
    dueAmount: 128000,
    status: "partially_paid",
    createdAt: "2026-05-11T16:00:00Z"
  },
  {
    id: "inv4",
    invoiceNumber: "APX/26-27/004",
    clientId: "c5",
    clientName: "Mahindra & Mahindra Ltd",
    clientGst: "27AAACM2345K1ZK",
    date: "2026-05-12",
    dueDate: "2026-05-27",
    items: [
      { productId: "p4", name: "Corporate UI/UX Design System Asset", hsnSac: "998314", qty: 1, price: 50000, gstPercent: 18, gstAmount: 9000, totalAmount: 59000 },
      { productId: "p10", name: "Database Performance Tuning", hsnSac: "998313", qty: 1, price: 35000, gstPercent: 18, gstAmount: 6300, totalAmount: 41300 }
    ],
    subtotal: 85000,
    discount: 5000,
    taxType: "CGST_SGST",
    taxAmount: 15300,
    total: 95300,
    paidAmount: 6300,
    dueAmount: 89000,
    status: "partially_paid",
    createdAt: "2026-05-12T11:45:00Z"
  },
  {
    id: "inv5",
    invoiceNumber: "APX/26-27/005",
    clientId: "c7",
    clientName: "Adani Enterprises Ltd",
    clientGst: "24AAACA1290B1ZZ",
    date: "2026-05-13",
    dueDate: "2026-05-28",
    items: [
      { productId: "p14", name: "PCI-DSS Compliance Assessment", hsnSac: "998315", qty: 1, price: 220000, gstPercent: 18, gstAmount: 39600, totalAmount: 259600 }
    ],
    subtotal: 220000,
    discount: 15000,
    taxType: "IGST", // Gujarat
    taxAmount: 36900,
    total: 241900,
    paidAmount: 0,
    dueAmount: 245000, // Includes previous balance
    status: "unpaid",
    createdAt: "2026-05-13T10:00:00Z"
  },
  {
    id: "inv6",
    invoiceNumber: "APX/26-27/006",
    clientId: "c8",
    clientName: "Larsen & Toubro Ltd",
    clientGst: "27AAACL3409E1ZT",
    date: "2026-05-14",
    dueDate: "2026-05-29",
    items: [
      { productId: "p9", name: "Annual Maintenance Server Retainer", hsnSac: "998713", qty: 3, price: 20000, gstPercent: 18, gstAmount: 10800, totalAmount: 70800 }
    ],
    subtotal: 60000,
    discount: 0,
    taxType: "CGST_SGST",
    taxAmount: 10800,
    total: 70800,
    paidAmount: 0,
    dueAmount: 75000, // Preload adjustment
    status: "unpaid",
    createdAt: "2026-05-14T09:30:00Z"
  },
  {
    id: "inv7",
    invoiceNumber: "APX/26-27/007",
    clientId: "c9",
    clientName: "Airtel Business Solutions",
    clientGst: "07AAACA2304K1ZC",
    date: "2026-05-15",
    dueDate: "2026-05-30",
    items: [
      { productId: "p11", name: "Digital Marketing Campaign Dashboard", hsnSac: "998314", qty: 1, price: 40000, gstPercent: 18, gstAmount: 7200, totalAmount: 47200 }
    ],
    subtotal: 40000,
    discount: 8000,
    taxType: "IGST", // New Delhi
    taxAmount: 57600, // IGST
    total: 44800,
    paidAmount: 32800,
    dueAmount: 12000,
    status: "partially_paid",
    createdAt: "2026-05-15T15:15:00Z"
  },
  {
    id: "inv8",
    invoiceNumber: "APX/26-27/008",
    clientId: "c4",
    clientName: "Wipro Limited",
    clientGst: "29AAACW5678C1Z0",
    date: "2026-05-16",
    dueDate: "2026-05-31",
    items: [
      { productId: "p15", name: "Backup Recovery Cloud Storage Space", hsnSac: "998311", qty: 2, price: 8000, gstPercent: 18, gstAmount: 2880, totalAmount: 18880 }
    ],
    subtotal: 16000,
    discount: 1000,
    taxType: "IGST",
    taxAmount: 2700,
    total: 17700,
    paidAmount: 2300,
    dueAmount: 15400,
    status: "partially_paid",
    createdAt: "2026-05-16T11:00:00Z"
  },
  {
    id: "inv9",
    invoiceNumber: "APX/26-27/009",
    clientId: "c1",
    clientName: "Tata Consultancy Services Ltd",
    clientGst: "27AAATT1234F1Z1",
    date: "2026-05-17",
    dueDate: "2026-06-01",
    items: [
      { productId: "p8", name: "Dedicated Fiber-Optic Transceiver", hsnSac: "847141", qty: 3, price: 12500, gstPercent: 18, gstAmount: 6750, totalAmount: 44250 }
    ],
    subtotal: 37500,
    discount: 1000,
    taxType: "CGST_SGST",
    taxAmount: 6570,
    total: 43070,
    paidAmount: 0,
    dueAmount: 43070,
    status: "unpaid",
    createdAt: "2026-05-17T14:00:00Z"
  },
  {
    id: "inv10",
    invoiceNumber: "APX/26-27/010",
    clientId: "c6",
    clientName: "HDFC Life Insurance Co Ltd",
    clientGst: "27AABCH1209D1ZH",
    date: "2026-05-01",
    dueDate: "2026-05-16",
    items: [
      { productId: "p13", name: "Technical Documentation Translation", hsnSac: "998316", qty: 1, price: 15000, gstPercent: 12, gstAmount: 1800, totalAmount: 16800 }
    ],
    subtotal: 15000,
    discount: 0,
    taxType: "CGST_SGST",
    taxAmount: 1800,
    total: 16800,
    paidAmount: 16800,
    dueAmount: 0,
    status: "paid",
    createdAt: "2026-05-01T09:30:00Z"
  }
];

export const DEMO_PAYMENTS: Payment[] = [
  { id: "pay1", invoiceId: "inv1", invoiceNumber: "APX/26-27/001", clientId: "c1", clientName: "Tata Consultancy Services Ltd", amount: 88500, paymentDate: "2026-05-05", paymentMode: "Bank Transfer", referenceNum: "NEFTHDFC908234", remarks: "Full settlement for Server deployment", createdAt: "2026-05-05T12:00:00Z" },
  { id: "pay2", invoiceId: "inv2", invoiceNumber: "APX/26-27/002", clientId: "c3", clientName: "Infosys Limited", amount: 344000, paymentDate: "2026-05-10", paymentMode: "Bank Transfer", referenceNum: "NEFTHDFC123049", remarks: "SaaS platform final delivery milestone approval", createdAt: "2026-05-10T14:00:00Z" },
  { id: "pay3", invoiceId: "inv3", invoiceNumber: "APX/26-27/003", clientId: "c2", clientName: "Reliance Retail Ltd", amount: 131800, paymentDate: "2026-05-15", paymentMode: "UPI", referenceNum: "UPI263728349247", remarks: "Part-payment mobile licenses bundle", createdAt: "2026-05-15T10:30:00Z" },
  { id: "pay4", invoiceId: "inv4", invoiceNumber: "APX/26-27/004", clientId: "c5", clientName: "Mahindra & Mahindra Ltd", amount: 6300, paymentDate: "2026-05-16", paymentMode: "Cash", referenceNum: "CSH-0294", remarks: "Advance for design workshop materials", createdAt: "2026-05-16T11:00:00Z" },
  { id: "pay5", invoiceId: "inv7", invoiceNumber: "APX/26-27/007", clientId: "c9", clientName: "Airtel Business Solutions", amount: 32800, paymentDate: "2026-05-18", paymentMode: "UPI", referenceNum: "UPI90231201948", remarks: "Payment for marketing digital panels setup", createdAt: "2026-05-18T16:30:00Z" },
  { id: "pay6", invoiceId: "inv10", invoiceNumber: "APX/26-27/010", clientId: "c6", clientName: "HDFC Life Insurance Co Ltd", amount: 16800, paymentDate: "2026-05-02", paymentMode: "Cheque", referenceNum: "CHQ560129", remarks: "Cheque clear for translation services invoice 010", createdAt: "2026-05-02T16:45:00Z" },
  { id: "pay7", invoiceId: "inv8", invoiceNumber: "APX/26-27/008", clientId: "c4", clientName: "Wipro Limited", amount: 2300, paymentDate: "2026-05-19", paymentMode: "UPI", referenceNum: "UPI8723902341", remarks: "Micro payment retainer backing setup", createdAt: "2026-05-19T09:00:00Z" },
  { id: "pay8", invoiceId: "inv3", invoiceNumber: "APX/26-27/003", clientId: "c2", clientName: "Reliance Retail Ltd", amount: 100000, paymentDate: "2026-05-20", paymentMode: "Bank Transfer", referenceNum: "RTGSHDFC901238", remarks: "Second part payment for transceiver boards", createdAt: "2026-05-20T14:15:00Z" },
  { id: "pay9", invoiceId: "inv1", invoiceNumber: "APX/26-27/001", clientId: "c1", clientName: "Tata Consultancy Services Ltd", amount: 10000, paymentDate: "2026-05-20", paymentMode: "Cash", referenceNum: "CSH-0299", remarks: "Direct refund ledger balancing key", createdAt: "2026-05-20T17:00:00Z" },
  { id: "pay10", invoiceId: "inv10", invoiceNumber: "APX/26-27/010", clientId: "c6", clientName: "HDFC Life Insurance Co Ltd", amount: 0, paymentDate: "2026-05-21", paymentMode: "Cash", referenceNum: "CSH-MOCK", remarks: "Adjustment verification entry", createdAt: "2026-05-21T09:00:00Z" }
];

export const DEMO_LEDGER: LedgerEntry[] = [
  { id: "led1", clientId: "c1", clientName: "Tata Consultancy Services Ltd", date: "2026-05-02", description: "Invoice raised: APX/26-27/001", type: "debit", amount: 88500, runningBalance: 88500, referenceType: "invoice", referenceId: "inv1", createdAt: "2026-05-02T11:30:00Z" },
  { id: "led2", clientId: "c1", clientName: "Tata Consultancy Services Ltd", date: "2026-05-05", description: "Payment receipt: pay1 (E-Transfer)", type: "credit", amount: 88500, runningBalance: 0, referenceType: "payment", referenceId: "pay1", createdAt: "2026-05-05T12:00:00Z" },
  { id: "led3", clientId: "c3", clientName: "Infosys Limited", date: "2026-05-09", description: "Invoice raised: APX/26-27/002", type: "debit", amount: 344000, runningBalance: 344000, referenceType: "invoice", referenceId: "inv2", createdAt: "2026-05-09T10:15:00Z" },
  { id: "led4", clientId: "c3", clientName: "Infosys Limited", date: "2026-05-10", description: "Payment receipt: pay2 (E-Transfer)", type: "credit", amount: 344000, runningBalance: 0, referenceType: "payment", referenceId: "pay2", createdAt: "2026-05-10T14:00:00Z" },
  { id: "led5", clientId: "c2", clientName: "Reliance Retail Ltd", date: "2026-05-11", description: "Invoice raised: APX/26-27/003", type: "debit", amount: 259800, runningBalance: 259800, referenceType: "invoice", referenceId: "inv3", createdAt: "2026-05-11T16:00:00Z" },
  { id: "led6", clientId: "c2", clientName: "Reliance Retail Ltd", date: "2026-05-15", description: "Payment receipt: pay3 (UPI)", type: "credit", amount: 131800, runningBalance: 128000, referenceType: "payment", referenceId: "pay3", createdAt: "2026-05-15T10:30:00Z" },
  { id: "led7", clientId: "c5", clientName: "Mahindra & Mahindra Ltd", date: "2026-05-12", description: "Invoice raised: APX/26-27/004", type: "debit", amount: 95300, runningBalance: 95300, referenceType: "invoice", referenceId: "inv4", createdAt: "2026-05-12T11:45:00Z" },
  { id: "led8", clientId: "c5", clientName: "Mahindra & Mahindra Ltd", date: "2026-05-16", description: "Payment receipt: pay4 (Cash Flow)", type: "credit", amount: 6300, runningBalance: 89000, referenceType: "payment", referenceId: "pay4", createdAt: "2026-05-16T11:00:00Z" },
  { id: "led9", clientId: "c9", clientName: "Airtel Business Solutions", date: "2026-05-15", description: "Invoice raised: APX/26-27/007", type: "debit", amount: 44800, runningBalance: 44800, referenceType: "invoice", referenceId: "inv7", createdAt: "2026-05-15T15:15:00Z" },
  { id: "led10", clientId: "c9", clientName: "Airtel Business Solutions", date: "2026-05-18", description: "Payment receipt: pay5 (GPay)", type: "credit", amount: 32800, runningBalance: 12000, referenceType: "payment", referenceId: "pay5", createdAt: "2026-05-18T16:30:00Z" }
];

export const DEMO_CASHBOOK: CashbookEntry[] = [
  { id: "cb2", date: "2026-05-02", description: "Receipt for HDFC translation Cheque clear", type: "income", paymentMode: "Bank Transfer", amount: 16800, runningCashBalance: 250000, runningBankBalance: 1311800, referenceId: "pay6", createdAt: "2026-05-02T16:45:00Z" },
  { id: "cb3", date: "2026-05-05", description: "Server Deploy payoff from Tata (NEFT)", type: "income", paymentMode: "Bank Transfer", amount: 88500, runningCashBalance: 250000, runningBankBalance: 1400300, referenceId: "pay1", createdAt: "2026-05-05T12:00:00Z" },
  { id: "cb4", date: "2026-05-10", description: "SaaS Phase 1 signoff Infosys Bank Net", type: "income", paymentMode: "Bank Transfer", amount: 344000, runningCashBalance: 250000, runningBankBalance: 1744300, referenceId: "pay2", createdAt: "2026-05-10T14:00:00Z" },
  { id: "cb5", date: "2026-05-12", description: "Expense: Office high speed broadband recharge", type: "expense", paymentMode: "UPI", amount: 3500, runningCashBalance: 250000, runningBankBalance: 1740800, createdAt: "2026-05-12T15:00:00Z" },
  { id: "cb6", date: "2026-05-15", description: "Part settlement Reliance app (UPI)", type: "income", paymentMode: "UPI", amount: 131800, runningCashBalance: 250000, runningBankBalance: 1872600, referenceId: "pay3", createdAt: "2026-05-15T10:30:00Z" },
  { id: "cb7", date: "2026-05-16", description: "Mahindra workshop advance cash collection", type: "income", paymentMode: "Cash", amount: 6300, runningCashBalance: 256300, runningBankBalance: 1872600, referenceId: "pay4", createdAt: "2026-05-16T11:00:00Z" },
  { id: "cb8", date: "2026-05-18", description: "Airtel dashboards receipt checkout (UPI)", type: "income", paymentMode: "UPI", amount: 32800, runningCashBalance: 256300, runningBankBalance: 1905400, referenceId: "pay5", createdAt: "2026-05-18T16:30:00Z" },
  { id: "cb9", date: "2026-05-19", description: "Expense: Technical team catering lunch bill", type: "expense", paymentMode: "Cash", amount: 4200, runningCashBalance: 252100, runningBankBalance: 1905400, createdAt: "2026-05-19T13:00:00Z" },
  { id: "cb10", date: "2026-05-20", description: "Reliance transceivers milestones wire", type: "income", paymentMode: "Bank Transfer", amount: 100000, runningCashBalance: 252100, runningBankBalance: 2005400, referenceId: "pay8", createdAt: "2026-05-20T14:15:00Z" }
];

export const DEMO_LOGS: ActivityLog[] = [
  { id: "log1", userId: "demo-admin", userName: "Karan Sharma", action: "SYSTEM_START", details: "Seeded the smart ERP platform with realistic Indian enterprise demo records.", timestamp: "2026-05-21T08:00:00Z" },
  { id: "log2", userId: "demo-admin", userName: "Karan Sharma", action: "INVOICE_CREATE", details: "Created draft invoice APX/26-27/005 for Adani Enterprises Ltd of INR 2,41,900.", timestamp: "2026-05-21T08:30:00Z" },
  { id: "log3", userId: "demo-acc", userName: "Ramanathan Iyer", action: "PAYMENT_POST", details: "Posted reference pay5 of INR 32,800 received from Airtel UPI wallet link.", timestamp: "2026-05-21T09:00:00Z" },
  { id: "log4", userId: "demo-manager", userName: "Sonia Rao", action: "QUOTATION_EXPIRED", details: "Quotation EST/26-27/003 shifted to active transmission state.", timestamp: "2026-05-21T09:12:00Z" }
];

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Enterprise Overdue Alert", message: "Invoice APX/26-27/010 from HDFC Life is pending final validation signoff check.", type: "warning", isRead: false, createdAt: "2026-05-23T07:15:00Z" },
  { id: "n2", title: "Configuration Update", message: "System metadata and business registration settings fully synchronized with G-Ledger.", type: "info", isRead: false, createdAt: "2026-05-23T05:30:00Z" },
  { id: "n3", title: "Successful Payment Sync", message: "Infosys Ltd settled APX/26-27/002 fully (INR 3,44,000 auto synced with G-Ledger and Cashbook).", type: "success", isRead: true, createdAt: "2026-05-22T14:02:00Z" },
  { id: "n4", title: "Quotation Accepted", message: "Hindustan Unilever officially approved quotation EST/26-27/004.", type: "success", isRead: true, createdAt: "2026-05-22T09:05:00Z" },
  { id: "n5", title: "Client Created", message: "Tata Consultancy Services Ltd registered in client index successfully.", type: "info", isRead: false, createdAt: "2026-05-21T11:00:00Z" },
  { id: "n6", title: "Invoice Draft Saved", message: "Invoice for Reliance Retail has been securely cached in local storage.", type: "info", isRead: false, createdAt: "2026-05-21T10:15:00Z" },
  { id: "n7", title: "Security Policy Hardened", message: "All API communication limits checked and restricted to Authorized Roles.", type: "success", isRead: false, createdAt: "2026-05-20T16:00:00Z" },
  { id: "n8", title: "Weekly Ledger Reconciled", message: "Cashbook entries fully balance with verified bank accounts ledger.", type: "success", isRead: true, createdAt: "2026-05-19T18:30:00Z" },
  { id: "n9", title: "System Compliance Reconciled", message: "Compliance and taxation validation routines automated for new quotes & billings.", type: "info", isRead: true, createdAt: "2026-05-19T11:45:00Z" },
  { id: "n10", title: "Team Privileges Aligned", message: "Manager write and delete scopes restricted based on updated security directives.", type: "warning", isRead: false, createdAt: "2026-05-18T14:20:00Z" }
];
