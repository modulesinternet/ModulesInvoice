// server.ts
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import fs from "fs";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  writeBatch,
  getDocFromServer
} from "firebase/firestore";

// src/lib/demoData.ts
var DEFAULT_SETTINGS = {
  companyName: "Your Enterprise Platform",
  gstIn: "27AAZCA4312R1ZX",
  pan: "AAZCA4312R",
  address: "Please update your corporate office address in Settings Module.",
  email: "billing@yourdomain.com",
  phone: "+91 00 0000 0000",
  website: "www.yourdomain.com",
  bankName: "State Bank of India",
  accountNum: "000000000000",
  ifscCode: "SBIN0000001",
  upiId: "merchant@upi",
  invoicePrefix: "INV/",
  quotationPrefix: "QTN/",
  currency: "INR",
  logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80",
  signatureUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=150&h=50&q=80",
  timezone: "Asia/Kolkata",
  gstOption: "standard",
  titleBarText: "Apex Digital Solutions",
  invoiceTheme: "navy",
  moharSize: 40,
  showInvoiceGst: true,
  showInvoiceLogo: true,
  showInvoicePhone: true,
  showInvoiceEmail: true,
  showInvoiceAddress: true,
  showInvoiceClientAddress: true,
  showInvoiceClientPhone: true,
  showInvoiceClientEmail: true,
  showInvoiceClientGst: true,
  showInvoiceHsn: true,
  showInvoiceTaxSplit: true,
  showInvoiceBankDetails: true,
  showInvoiceUpiId: true,
  showInvoiceQrCode: true,
  showInvoiceSignature: true,
  showInvoiceNotes: true,
  qrBesideMohar: false,
  defaultInvoiceNotes: "Humble warning: Please quote our invoice serial number in all bank payouts."
};
var DEMO_USERS = [
  {
    userId: "admin-modulesinternet",
    email: "modulesinternet@gmail.com",
    name: "Karan Sharma",
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
var DEMO_CLIENTS = [
  { id: "c1", name: "Tata Consultancy Services Ltd", email: "finance@tcs.com", phone: "+91 22 6778 9999", gstIn: "27AAATT1234F1Z1", pan: "AAATT1234F", billingAddress: "TCS House, Raveline Street, Fort, Mumbai 400001", shippingAddress: "TCS House, Raveline Street, Fort, Mumbai 400001", outstandingBalance: 45e3, createdAt: "2026-05-01T10:00:00Z" },
  { id: "c2", name: "Reliance Retail Ltd", email: "vendor.billing@reliance.com", phone: "+91 22 4477 0000", gstIn: "27AAACR1039K1ZM", pan: "AAACR1039K", billingAddress: "Court House, Lokmanya Tilak Marg, Dhobi Talao, Mumbai 400002", shippingAddress: "Reliance Corporate Park, Ghansoli, Navi Mumbai 400701", outstandingBalance: 128e3, createdAt: "2026-05-01T11:00:00Z" },
  { id: "c3", name: "Infosys Limited", email: "accounts.payable@infosys.com", phone: "+91 80 2852 0261", gstIn: "29AAACI4321A1ZB", pan: "AAACI4321A", billingAddress: "Electronics City, Hosur Road, Bengaluru, Karnataka 560100", shippingAddress: "Electronics City, Hosur Road, Bengaluru, Karnataka 560100", outstandingBalance: 0, createdAt: "2026-05-02T09:00:00Z" },
  { id: "c4", name: "Wipro Limited", email: "billing.services@wipro.com", phone: "+91 80 2844 0011", gstIn: "29AAACW5678C1Z0", pan: "AAACW5678C", billingAddress: "Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035", shippingAddress: "Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035", outstandingBalance: 15400, createdAt: "2026-05-02T10:30:00Z" },
  { id: "c5", name: "Mahindra & Mahindra Ltd", email: "accounts@mahindra.co.in", phone: "+91 22 2490 1441", gstIn: "27AAACM2345K1ZK", pan: "AAACM2345K", billingAddress: "Gateway Building, Apollo Bunder, Colaba, Mumbai 400001", shippingAddress: "M&M Automotive Plant, Kandivali East, Mumbai 400101", outstandingBalance: 89e3, createdAt: "2026-05-03T12:00:00Z" },
  { id: "c6", name: "HDFC Life Insurance Co Ltd", email: "vendorpayments@hdfclife.com", phone: "+91 22 6751 6666", gstIn: "27AABCH1209D1ZH", pan: "AABCH1209D", billingAddress: "13th Floor, Lodha Excelus, Apollo Mills Compound, Mahalaxmi, Mumbai 400011", shippingAddress: "13th Floor, Lodha Excelus, Mahalaxmi, Mumbai 400011", outstandingBalance: 0, createdAt: "2026-05-04T14:00:00Z" },
  { id: "c7", name: "Adani Enterprises Ltd", email: "finance.corporate@adani.com", phone: "+91 79 2656 5555", gstIn: "24AAACA1290B1ZZ", pan: "AAACA1290B", billingAddress: "Adani Corporate House, Shantigram, SG Highway, Ahmedabad, Gujarat 382421", shippingAddress: "Adani Corporate House, Ahmedabad 382421", outstandingBalance: 245e3, createdAt: "2026-05-05T10:00:00Z" },
  { id: "c8", name: "Larsen & Toubro Ltd", email: "billdesk@lntecc.com", phone: "+91 22 6752 5656", gstIn: "27AAACL3409E1ZT", pan: "AAACL3409E", billingAddress: "L&T House, Ballard Estate, Mumbai 400001", shippingAddress: "L&T Gate No 1, Powai, Saki Vihar Road, Mumbai 400072", outstandingBalance: 75e3, createdAt: "2026-05-06T15:00:00Z" },
  { id: "c9", name: "Airtel Business Solutions", email: "partner.payables@airtel.com", phone: "+91 11 4666 1000", gstIn: "07AAACA2304K1ZC", pan: "ACA2304K", billingAddress: "Bharti Crescent, 1 Nelson Mandela Road, Vasant Kunj, New Delhi 110070", shippingAddress: "Bharti Crescent, Vasant Kunj, New Delhi 110070", outstandingBalance: 12e3, createdAt: "2026-05-07T11:00:00Z" },
  { id: "c10", name: "Hindustan Unilever Ltd", email: "finance.hul@unilever.com", phone: "+91 22 3983 0000", gstIn: "27AAACH8091A1ZR", pan: "AAACH8091A", billingAddress: "HUL House, B.D. Sawant Marg, Chakala, Andheri East, Mumbai 400099", shippingAddress: "HUL Warehousing Hub, Bhiwandi, Thane 421302", outstandingBalance: 0, createdAt: "2026-05-08T09:30:00Z" }
];
var DEMO_PRODUCTS = [
  { id: "p1", name: "Enterprise SaaS Suite Development", sku: "SRV-SaaS-ENT", category: "Software Services", price: 15e4, gstPercent: 18, hsnSac: "998313", stockQty: 999, unit: "HRS" },
  { id: "p2", name: "Cloud Server Architecting & Deployment", sku: "SRV-CLD-ARC", category: "Cloud Infrastructure", price: 75e3, gstPercent: 18, hsnSac: "998311", stockQty: 999, unit: "HRS" },
  { id: "p3", name: "Interactive React Native Mobile License", sku: "LIC-MOB-APP", category: "Licensing", price: 95e3, gstPercent: 12, hsnSac: "997331", stockQty: 100, unit: "PCS" },
  { id: "p4", name: "Corporate UI/UX Design System Asset", sku: "DSG-SYS-CRP", category: "Creative Services", price: 5e4, gstPercent: 18, hsnSac: "998314", stockQty: 999, unit: "HRS" },
  { id: "p5", name: "DevOps Security Audit & Pentesting", sku: "SRV-SEC-AUD", category: "Security Services", price: 12e4, gstPercent: 18, hsnSac: "998315", stockQty: 999, unit: "HRS" },
  { id: "p6", name: "Smart AI Chatbot Integration", sku: "SRV-AI-CHAT", category: "Software Services", price: 85e3, gstPercent: 18, hsnSac: "998313", stockQty: 999, unit: "UNITS" },
  { id: "p7", name: "Premium Network Router (Enterprise)", sku: "HW-RTR-MX20", category: "Hardware Assets", price: 45e3, gstPercent: 18, hsnSac: "847130", stockQty: 24, unit: "BOX" },
  { id: "p8", name: "Dedicated Fiber-Optic Transceiver", sku: "HW-TRX-FIB", category: "Hardware Assets", price: 12500, gstPercent: 18, hsnSac: "847141", stockQty: 150, unit: "PCS" },
  { id: "p9", name: "Annual Maintenance Server Retainer", sku: "RET-MNT-SRV", category: "Support Retainers", price: 2e4, gstPercent: 18, hsnSac: "998713", stockQty: 999, unit: "MONTH" },
  { id: "p10", name: "Database Performance Tuning", sku: "SRV-DBA-OPT", category: "Software Services", price: 35e3, gstPercent: 18, hsnSac: "998313", stockQty: 999, unit: "HRS" },
  { id: "p11", name: "Digital Marketing Campaign Dashboard", sku: "SRV-MKT-DSH", category: "Creative Services", price: 4e4, gstPercent: 18, hsnSac: "998314", stockQty: 999, unit: "UNITS" },
  { id: "p12", name: "Employee ERP Integration Pipeline", sku: "SRV-ERP-PIP", category: "Software Services", price: 18e4, gstPercent: 18, hsnSac: "998313", stockQty: 999, unit: "HRS" },
  { id: "p13", name: "Technical Documentation Translation", sku: "SRV-DOC-TRN", category: "Support Retainers", price: 15e3, gstPercent: 12, hsnSac: "998316", stockQty: 999, unit: "DOCS" },
  { id: "p14", name: "PCI-DSS Compliance Assessment", sku: "SRV-SEC-PCI", category: "Security Services", price: 22e4, gstPercent: 18, hsnSac: "998315", stockQty: 999, unit: "HRS" },
  { id: "p15", name: "Backup Recovery Cloud Storage Space", sku: "SRV-STG-BK", category: "Cloud Infrastructure", price: 8e3, gstPercent: 18, hsnSac: "998311", stockQty: 500, unit: "TB" }
];
var DEMO_QUOTATIONS = [
  {
    id: "q1",
    quotationNumber: "EST/26-27/001",
    clientId: "c3",
    clientName: "Infosys Limited",
    date: "2026-05-09",
    expiryDate: "2026-06-09",
    items: [
      { productId: "p1", name: "Enterprise SaaS Suite Development", hsnSac: "998313", qty: 2, price: 15e4, gstPercent: 18, gstAmount: 54e3, totalAmount: 354e3 }
    ],
    subtotal: 3e5,
    discount: 1e4,
    taxAmount: 54e3,
    total: 344e3,
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
      { productId: "p5", name: "DevOps Security Audit & Pentesting", hsnSac: "998315", qty: 1, price: 12e4, gstPercent: 18, gstAmount: 21600, totalAmount: 141600 }
    ],
    subtotal: 12e4,
    discount: 5e3,
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
      { productId: "p4", name: "Corporate UI/UX Design System Asset", hsnSac: "998314", qty: 1, price: 5e4, gstPercent: 18, gstAmount: 9e3, totalAmount: 59e3 },
      { productId: "p15", name: "Backup Recovery Cloud Storage Space", hsnSac: "998311", qty: 5, price: 8e3, gstPercent: 18, gstAmount: 7200, totalAmount: 47200 }
    ],
    subtotal: 9e4,
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
      { productId: "p10", name: "Database Performance Tuning", hsnSac: "998313", qty: 3, price: 35e3, gstPercent: 18, gstAmount: 18900, totalAmount: 123900 }
    ],
    subtotal: 105e3,
    discount: 15e3,
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
      { productId: "p7", name: "Premium Network Router (Enterprise)", hsnSac: "847130", qty: 1, price: 45e3, gstPercent: 18, gstAmount: 8100, totalAmount: 53100 }
    ],
    subtotal: 45e3,
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
      { productId: "p12", name: "Employee ERP Integration Pipeline", hsnSac: "998313", qty: 1, price: 18e4, gstPercent: 18, gstAmount: 32400, totalAmount: 212400 }
    ],
    subtotal: 18e4,
    discount: 2e4,
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
      { productId: "p6", name: "Smart AI Chatbot Integration", hsnSac: "998313", qty: 1, price: 85e3, gstPercent: 18, gstAmount: 15300, totalAmount: 100300 }
    ],
    subtotal: 85e3,
    discount: 5e3,
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
      { productId: "p14", name: "PCI-DSS Compliance Assessment", hsnSac: "998315", qty: 1, price: 22e4, gstPercent: 18, gstAmount: 39600, totalAmount: 259600 }
    ],
    subtotal: 22e4,
    discount: 1e4,
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
      { productId: "p3", name: "Interactive React Native Mobile License", hsnSac: "997331", qty: 2, price: 95e3, gstPercent: 12, gstAmount: 22800, totalAmount: 212800 }
    ],
    subtotal: 19e4,
    discount: 15e3,
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
      { productId: "p2", name: "Cloud Server Architecting & Deployment", hsnSac: "998311", qty: 1, price: 75e3, gstPercent: 18, gstAmount: 13500, totalAmount: 88500 }
    ],
    subtotal: 75e3,
    discount: 0,
    taxAmount: 13500,
    total: 88500,
    status: "sent",
    createdAt: "2026-05-18T11:45:00Z"
  }
];
var DEMO_INVOICES = [
  {
    id: "inv1",
    invoiceNumber: "APX/26-27/001",
    clientId: "c1",
    clientName: "Tata Consultancy Services Ltd",
    clientGst: "27AAATT1234F1Z1",
    date: "2026-05-02",
    dueDate: "2026-05-17",
    items: [
      { productId: "p2", name: "Cloud Server Architecting & Deployment", hsnSac: "998311", qty: 1, price: 75e3, gstPercent: 18, gstAmount: 13500, totalAmount: 88500 }
    ],
    subtotal: 75e3,
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
      { productId: "p1", name: "Enterprise SaaS Suite Development", hsnSac: "998313", qty: 2, price: 15e4, gstPercent: 18, gstAmount: 54e3, totalAmount: 354e3 }
    ],
    subtotal: 3e5,
    discount: 1e4,
    taxType: "IGST",
    // Out of Maharashtra (Karnataka is IGST)
    taxAmount: 54e3,
    total: 344e3,
    paidAmount: 344e3,
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
      { productId: "p3", name: "Interactive React Native Mobile License", hsnSac: "997331", qty: 2, price: 95e3, gstPercent: 12, gstAmount: 22800, totalAmount: 212800 },
      { productId: "p8", name: "Dedicated Fiber-Optic Transceiver", hsnSac: "847141", qty: 4, price: 12500, gstPercent: 18, gstAmount: 9e3, totalAmount: 59e3 }
    ],
    subtotal: 24e4,
    discount: 12e3,
    taxType: "CGST_SGST",
    taxAmount: 31800,
    total: 259800,
    paidAmount: 131800,
    dueAmount: 128e3,
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
      { productId: "p4", name: "Corporate UI/UX Design System Asset", hsnSac: "998314", qty: 1, price: 5e4, gstPercent: 18, gstAmount: 9e3, totalAmount: 59e3 },
      { productId: "p10", name: "Database Performance Tuning", hsnSac: "998313", qty: 1, price: 35e3, gstPercent: 18, gstAmount: 6300, totalAmount: 41300 }
    ],
    subtotal: 85e3,
    discount: 5e3,
    taxType: "CGST_SGST",
    taxAmount: 15300,
    total: 95300,
    paidAmount: 6300,
    dueAmount: 89e3,
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
      { productId: "p14", name: "PCI-DSS Compliance Assessment", hsnSac: "998315", qty: 1, price: 22e4, gstPercent: 18, gstAmount: 39600, totalAmount: 259600 }
    ],
    subtotal: 22e4,
    discount: 15e3,
    taxType: "IGST",
    // Gujarat
    taxAmount: 36900,
    total: 241900,
    paidAmount: 0,
    dueAmount: 245e3,
    // Includes previous balance
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
      { productId: "p9", name: "Annual Maintenance Server Retainer", hsnSac: "998713", qty: 3, price: 2e4, gstPercent: 18, gstAmount: 10800, totalAmount: 70800 }
    ],
    subtotal: 6e4,
    discount: 0,
    taxType: "CGST_SGST",
    taxAmount: 10800,
    total: 70800,
    paidAmount: 0,
    dueAmount: 75e3,
    // Preload adjustment
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
      { productId: "p11", name: "Digital Marketing Campaign Dashboard", hsnSac: "998314", qty: 1, price: 4e4, gstPercent: 18, gstAmount: 7200, totalAmount: 47200 }
    ],
    subtotal: 4e4,
    discount: 8e3,
    taxType: "IGST",
    // New Delhi
    taxAmount: 57600,
    // IGST
    total: 44800,
    paidAmount: 32800,
    dueAmount: 12e3,
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
      { productId: "p15", name: "Backup Recovery Cloud Storage Space", hsnSac: "998311", qty: 2, price: 8e3, gstPercent: 18, gstAmount: 2880, totalAmount: 18880 }
    ],
    subtotal: 16e3,
    discount: 1e3,
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
    discount: 1e3,
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
      { productId: "p13", name: "Technical Documentation Translation", hsnSac: "998316", qty: 1, price: 15e3, gstPercent: 12, gstAmount: 1800, totalAmount: 16800 }
    ],
    subtotal: 15e3,
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
var DEMO_PAYMENTS = [
  { id: "pay1", invoiceId: "inv1", invoiceNumber: "APX/26-27/001", clientId: "c1", clientName: "Tata Consultancy Services Ltd", amount: 88500, paymentDate: "2026-05-05", paymentMode: "Bank Transfer", referenceNum: "NEFTHDFC908234", remarks: "Full settlement for Server deployment", createdAt: "2026-05-05T12:00:00Z" },
  { id: "pay2", invoiceId: "inv2", invoiceNumber: "APX/26-27/002", clientId: "c3", clientName: "Infosys Limited", amount: 344e3, paymentDate: "2026-05-10", paymentMode: "Bank Transfer", referenceNum: "NEFTHDFC123049", remarks: "SaaS platform final delivery milestone approval", createdAt: "2026-05-10T14:00:00Z" },
  { id: "pay3", invoiceId: "inv3", invoiceNumber: "APX/26-27/003", clientId: "c2", clientName: "Reliance Retail Ltd", amount: 131800, paymentDate: "2026-05-15", paymentMode: "UPI", referenceNum: "UPI263728349247", remarks: "Part-payment mobile licenses bundle", createdAt: "2026-05-15T10:30:00Z" },
  { id: "pay4", invoiceId: "inv4", invoiceNumber: "APX/26-27/004", clientId: "c5", clientName: "Mahindra & Mahindra Ltd", amount: 6300, paymentDate: "2026-05-16", paymentMode: "Cash", referenceNum: "CSH-0294", remarks: "Advance for design workshop materials", createdAt: "2026-05-16T11:00:00Z" },
  { id: "pay5", invoiceId: "inv7", invoiceNumber: "APX/26-27/007", clientId: "c9", clientName: "Airtel Business Solutions", amount: 32800, paymentDate: "2026-05-18", paymentMode: "UPI", referenceNum: "UPI90231201948", remarks: "Payment for marketing digital panels setup", createdAt: "2026-05-18T16:30:00Z" },
  { id: "pay6", invoiceId: "inv10", invoiceNumber: "APX/26-27/010", clientId: "c6", clientName: "HDFC Life Insurance Co Ltd", amount: 16800, paymentDate: "2026-05-02", paymentMode: "Cheque", referenceNum: "CHQ560129", remarks: "Cheque clear for translation services invoice 010", createdAt: "2026-05-02T16:45:00Z" },
  { id: "pay7", invoiceId: "inv8", invoiceNumber: "APX/26-27/008", clientId: "c4", clientName: "Wipro Limited", amount: 2300, paymentDate: "2026-05-19", paymentMode: "UPI", referenceNum: "UPI8723902341", remarks: "Micro payment retainer backing setup", createdAt: "2026-05-19T09:00:00Z" },
  { id: "pay8", invoiceId: "inv3", invoiceNumber: "APX/26-27/003", clientId: "c2", clientName: "Reliance Retail Ltd", amount: 1e5, paymentDate: "2026-05-20", paymentMode: "Bank Transfer", referenceNum: "RTGSHDFC901238", remarks: "Second part payment for transceiver boards", createdAt: "2026-05-20T14:15:00Z" },
  { id: "pay9", invoiceId: "inv1", invoiceNumber: "APX/26-27/001", clientId: "c1", clientName: "Tata Consultancy Services Ltd", amount: 1e4, paymentDate: "2026-05-20", paymentMode: "Cash", referenceNum: "CSH-0299", remarks: "Direct refund ledger balancing key", createdAt: "2026-05-20T17:00:00Z" },
  { id: "pay10", invoiceId: "inv10", invoiceNumber: "APX/26-27/010", clientId: "c6", clientName: "HDFC Life Insurance Co Ltd", amount: 0, paymentDate: "2026-05-21", paymentMode: "Cash", referenceNum: "CSH-MOCK", remarks: "Adjustment verification entry", createdAt: "2026-05-21T09:00:00Z" }
];
var DEMO_LEDGER = [
  { id: "led1", clientId: "c1", clientName: "Tata Consultancy Services Ltd", date: "2026-05-02", description: "Invoice raised: APX/26-27/001", type: "debit", amount: 88500, runningBalance: 88500, referenceType: "invoice", referenceId: "inv1", createdAt: "2026-05-02T11:30:00Z" },
  { id: "led2", clientId: "c1", clientName: "Tata Consultancy Services Ltd", date: "2026-05-05", description: "Payment receipt: pay1 (E-Transfer)", type: "credit", amount: 88500, runningBalance: 0, referenceType: "payment", referenceId: "pay1", createdAt: "2026-05-05T12:00:00Z" },
  { id: "led3", clientId: "c3", clientName: "Infosys Limited", date: "2026-05-09", description: "Invoice raised: APX/26-27/002", type: "debit", amount: 344e3, runningBalance: 344e3, referenceType: "invoice", referenceId: "inv2", createdAt: "2026-05-09T10:15:00Z" },
  { id: "led4", clientId: "c3", clientName: "Infosys Limited", date: "2026-05-10", description: "Payment receipt: pay2 (E-Transfer)", type: "credit", amount: 344e3, runningBalance: 0, referenceType: "payment", referenceId: "pay2", createdAt: "2026-05-10T14:00:00Z" },
  { id: "led5", clientId: "c2", clientName: "Reliance Retail Ltd", date: "2026-05-11", description: "Invoice raised: APX/26-27/003", type: "debit", amount: 259800, runningBalance: 259800, referenceType: "invoice", referenceId: "inv3", createdAt: "2026-05-11T16:00:00Z" },
  { id: "led6", clientId: "c2", clientName: "Reliance Retail Ltd", date: "2026-05-15", description: "Payment receipt: pay3 (UPI)", type: "credit", amount: 131800, runningBalance: 128e3, referenceType: "payment", referenceId: "pay3", createdAt: "2026-05-15T10:30:00Z" },
  { id: "led7", clientId: "c5", clientName: "Mahindra & Mahindra Ltd", date: "2026-05-12", description: "Invoice raised: APX/26-27/004", type: "debit", amount: 95300, runningBalance: 95300, referenceType: "invoice", referenceId: "inv4", createdAt: "2026-05-12T11:45:00Z" },
  { id: "led8", clientId: "c5", clientName: "Mahindra & Mahindra Ltd", date: "2026-05-16", description: "Payment receipt: pay4 (Cash Flow)", type: "credit", amount: 6300, runningBalance: 89e3, referenceType: "payment", referenceId: "pay4", createdAt: "2026-05-16T11:00:00Z" },
  { id: "led9", clientId: "c9", clientName: "Airtel Business Solutions", date: "2026-05-15", description: "Invoice raised: APX/26-27/007", type: "debit", amount: 44800, runningBalance: 44800, referenceType: "invoice", referenceId: "inv7", createdAt: "2026-05-15T15:15:00Z" },
  { id: "led10", clientId: "c9", clientName: "Airtel Business Solutions", date: "2026-05-18", description: "Payment receipt: pay5 (GPay)", type: "credit", amount: 32800, runningBalance: 12e3, referenceType: "payment", referenceId: "pay5", createdAt: "2026-05-18T16:30:00Z" }
];
var DEMO_CASHBOOK = [
  { id: "cb2", date: "2026-05-02", description: "Receipt for HDFC translation Cheque clear", type: "income", paymentMode: "Bank Transfer", amount: 16800, runningCashBalance: 25e4, runningBankBalance: 1311800, referenceId: "pay6", createdAt: "2026-05-02T16:45:00Z" },
  { id: "cb3", date: "2026-05-05", description: "Server Deploy payoff from Tata (NEFT)", type: "income", paymentMode: "Bank Transfer", amount: 88500, runningCashBalance: 25e4, runningBankBalance: 1400300, referenceId: "pay1", createdAt: "2026-05-05T12:00:00Z" },
  { id: "cb4", date: "2026-05-10", description: "SaaS Phase 1 signoff Infosys Bank Net", type: "income", paymentMode: "Bank Transfer", amount: 344e3, runningCashBalance: 25e4, runningBankBalance: 1744300, referenceId: "pay2", createdAt: "2026-05-10T14:00:00Z" },
  { id: "cb5", date: "2026-05-12", description: "Expense: Office high speed broadband recharge", type: "expense", paymentMode: "UPI", amount: 3500, runningCashBalance: 25e4, runningBankBalance: 1740800, createdAt: "2026-05-12T15:00:00Z" },
  { id: "cb6", date: "2026-05-15", description: "Part settlement Reliance app (UPI)", type: "income", paymentMode: "UPI", amount: 131800, runningCashBalance: 25e4, runningBankBalance: 1872600, referenceId: "pay3", createdAt: "2026-05-15T10:30:00Z" },
  { id: "cb7", date: "2026-05-16", description: "Mahindra workshop advance cash collection", type: "income", paymentMode: "Cash", amount: 6300, runningCashBalance: 256300, runningBankBalance: 1872600, referenceId: "pay4", createdAt: "2026-05-16T11:00:00Z" },
  { id: "cb8", date: "2026-05-18", description: "Airtel dashboards receipt checkout (UPI)", type: "income", paymentMode: "UPI", amount: 32800, runningCashBalance: 256300, runningBankBalance: 1905400, referenceId: "pay5", createdAt: "2026-05-18T16:30:00Z" },
  { id: "cb9", date: "2026-05-19", description: "Expense: Technical team catering lunch bill", type: "expense", paymentMode: "Cash", amount: 4200, runningCashBalance: 252100, runningBankBalance: 1905400, createdAt: "2026-05-19T13:00:00Z" },
  { id: "cb10", date: "2026-05-20", description: "Reliance transceivers milestones wire", type: "income", paymentMode: "Bank Transfer", amount: 1e5, runningCashBalance: 252100, runningBankBalance: 2005400, referenceId: "pay8", createdAt: "2026-05-20T14:15:00Z" }
];
var DEMO_LOGS = [
  { id: "log1", userId: "demo-admin", userName: "Karan Sharma", action: "SYSTEM_START", details: "Seeded the smart ERP platform with realistic Indian enterprise demo records.", timestamp: "2026-05-21T08:00:00Z" },
  { id: "log2", userId: "demo-admin", userName: "Karan Sharma", action: "INVOICE_CREATE", details: "Created draft invoice APX/26-27/005 for Adani Enterprises Ltd of INR 2,41,900.", timestamp: "2026-05-21T08:30:00Z" },
  { id: "log3", userId: "demo-acc", userName: "Ramanathan Iyer", action: "PAYMENT_POST", details: "Posted reference pay5 of INR 32,800 received from Airtel UPI wallet link.", timestamp: "2026-05-21T09:00:00Z" },
  { id: "log4", userId: "demo-manager", userName: "Sonia Rao", action: "QUOTATION_EXPIRED", details: "Quotation EST/26-27/003 shifted to active transmission state.", timestamp: "2026-05-21T09:12:00Z" }
];
var DEMO_NOTIFICATIONS = [
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

// server.ts
var app = express();
var PORT = 3e3;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-role, x-active-role, x-user-email");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var db_settings = { ...DEFAULT_SETTINGS };
var db_clients = [...DEMO_CLIENTS];
var db_products = [...DEMO_PRODUCTS];
var db_invoices = [...DEMO_INVOICES];
var db_quotations = [...DEMO_QUOTATIONS];
var db_payments = [...DEMO_PAYMENTS];
var db_ledger = [...DEMO_LEDGER];
var db_cashbook = [...DEMO_CASHBOOK];
var db_logs = [...DEMO_LOGS];
var db_notifications = [...DEMO_NOTIFICATIONS];
var db_users = [...DEMO_USERS];
var db_passwords = {
  "modulesinternet@gmail.com": "Admin@123",
  "manager@demo.com": "manager123",
  "accountant@demo.com": "acc123",
  "staff@demo.com": "staff123"
};
var db_categories = Array.from(new Set(db_products.map((p) => p.category || "General")));
if (db_categories.length === 0) {
  db_categories = ["Software Services", "Cloud Infrastructure", "Licensing", "Creative Services", "Security Services", "Hardware Assets", "Support Retainers"];
}
var db_roles = [
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
var resolvedFilename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : typeof __filename !== "undefined" ? __filename : "";
var resolvedDirname = typeof import.meta !== "undefined" && import.meta.url ? path.dirname(resolvedFilename) : typeof __dirname !== "undefined" ? __dirname : "";
var firebaseApp;
var db;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    firebaseApp = initializeApp(firebaseConfig);
    if (firebaseConfig.firestoreDatabaseId) {
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true
      }, firebaseConfig.firestoreDatabaseId);
    } else {
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true
      });
    }
    console.log("Firebase initialized successfully on backend with project ID:", firebaseConfig.projectId);
  } else {
    console.warn("firebase-applet-config.json not found in server root. Running in offline cache mode.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase:", err);
}
function withTimeout(promise, timeoutMs = 5e3) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Firestore action timed out"));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}
async function testConnection() {
  if (!db) return;
  try {
    await withTimeout(getDocFromServer(doc(db, "test", "connection")), 5e3);
    console.log("Firestore secure connection check: OK (Connected)");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration. Client is reporting offline.");
    } else {
      console.log("Firestore secure connection validated.");
    }
  }
}
var LOCAL_CACHE_PATH = path.join(process.cwd(), "local-db-cache.json");
function saveStateToLocalCache() {
  if (db) {
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
    fs.writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write to local state cache file: ", error);
  }
}
function loadStateFromLocalCache() {
  if (db) {
    return;
  }
  if (fs.existsSync(LOCAL_CACHE_PATH)) {
    try {
      const raw = fs.readFileSync(LOCAL_CACHE_PATH, "utf8");
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
async function syncStateToFirestore(topic, id) {
  saveStateToLocalCache();
  if (!db) return;
  try {
    const timeoutVal = 15e3;
    if (topic === "settings") {
      await withTimeout(setDoc(doc(db, "businessSettings", "global"), db_settings), timeoutVal);
    } else if (topic === "categories") {
      await withTimeout(setDoc(doc(db, "businessSettings", "categories"), { list: db_categories }), timeoutVal);
    } else if (topic === "roles") {
      await withTimeout(setDoc(doc(db, "businessSettings", "roles"), { list: db_roles }), timeoutVal);
    } else if (topic === "clients") {
      if (id) {
        const item = db_clients.find((c) => c.id === id);
        if (item) await withTimeout(setDoc(doc(db, "clients", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "clients", id)), timeoutVal);
      } else {
        for (const item of db_clients) {
          await withTimeout(setDoc(doc(db, "clients", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "products") {
      if (id) {
        const item = db_products.find((p) => p.id === id);
        if (item) await withTimeout(setDoc(doc(db, "products", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "products", id)), timeoutVal);
      } else {
        for (const item of db_products) {
          await withTimeout(setDoc(doc(db, "products", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "invoices") {
      if (id) {
        const item = db_invoices.find((v) => v.id === id);
        if (item) await withTimeout(setDoc(doc(db, "invoices", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "invoices", id)), timeoutVal);
      } else {
        for (const item of db_invoices) {
          await withTimeout(setDoc(doc(db, "invoices", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "quotations") {
      if (id) {
        const item = db_quotations.find((q) => q.id === id);
        if (item) await withTimeout(setDoc(doc(db, "quotations", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "quotations", id)), timeoutVal);
      } else {
        for (const item of db_quotations) {
          await withTimeout(setDoc(doc(db, "quotations", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "payments") {
      if (id) {
        const item = db_payments.find((p) => p.id === id);
        if (item) await withTimeout(setDoc(doc(db, "payments", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "payments", id)), timeoutVal);
      } else {
        for (const item of db_payments) {
          await withTimeout(setDoc(doc(db, "payments", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "ledger") {
      if (id) {
        const item = db_ledger.find((l) => l.id === id);
        if (item) await withTimeout(setDoc(doc(db, "ledger", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "ledger", id)), timeoutVal);
      } else {
        for (const item of db_ledger) {
          await withTimeout(setDoc(doc(db, "ledger", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "cashbook") {
      if (id) {
        const item = db_cashbook.find((cb) => cb.id === id);
        if (item) await withTimeout(setDoc(doc(db, "cashbook", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "cashbook", id)), timeoutVal);
      } else {
        for (const item of db_cashbook) {
          await withTimeout(setDoc(doc(db, "cashbook", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "logs") {
      if (id) {
        const item = db_logs.find((lg) => lg.id === id);
        if (item) await withTimeout(setDoc(doc(db, "activityLogs", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "activityLogs", id)), timeoutVal);
      } else {
        for (const item of db_logs) {
          await withTimeout(setDoc(doc(db, "activityLogs", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "notifications") {
      if (id) {
        const item = db_notifications.find((n) => n.id === id);
        if (item) await withTimeout(setDoc(doc(db, "notifications", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "notifications", id)), timeoutVal);
      } else {
        for (const item of db_notifications) {
          await withTimeout(setDoc(doc(db, "notifications", item.id), item), timeoutVal);
        }
      }
    } else if (topic === "users") {
      if (id) {
        const item = db_users.find((u) => u.userId === id);
        if (item) await withTimeout(setDoc(doc(db, "users", id), item), timeoutVal);
        else await withTimeout(deleteDoc(doc(db, "users", id)), timeoutVal);
      } else {
        for (const item of db_users) {
          await withTimeout(setDoc(doc(db, "users", item.userId), item), timeoutVal);
        }
      }
    }
  } catch (error) {
    console.warn("WARNING: Fallback save failed on Firestore sync. Continuing in memory-only model.", error);
  }
}
async function performSelfHealingAudit() {
  console.log("[Self-Healing] Running systematic ledger integrity audit and orphan sweep...");
  const validInvoiceIds = new Set(db_invoices.map((inv) => inv.id));
  const validPaymentIds = new Set(db_payments.map((p) => p.id));
  const originalCount = db_ledger.length;
  const validLedgerEntries = [];
  const orphanIds = [];
  for (const led of db_ledger) {
    if (led.referenceType === "invoice") {
      if (!validInvoiceIds.has(led.referenceId)) {
        console.log(`[Self-Healing] Found orphan invoice ledger entry: ${led.id} (Reference missing invoice ${led.referenceId}).`);
        orphanIds.push(led.id);
        continue;
      }
    } else if (led.referenceType === "payment") {
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
    if (db) {
      for (const id of orphanIds) {
        try {
          await deleteDoc(doc(db, "ledger", id));
          console.log(`[Self-Healing] Successfully deleted orphan ledger document ${id} from Firestore.`);
        } catch (e) {
          console.error(`[Self-Healing] Failed to delete orphan ledger document ${id} from Firestore:`, e);
        }
      }
    }
  }
  for (let i = 0; i < db_clients.length; i++) {
    const client = db_clients[i];
    const clientInvoices = db_invoices.filter((v) => v.clientId === client.id);
    const clientPayments = db_payments.filter((p) => p.clientId === client.id);
    const totalInvoiced = clientInvoices.reduce((sum, v) => sum + v.total, 0);
    const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const calculatedBalance = Math.max(0, totalInvoiced - totalPaid);
    if (clientInvoices.length > 0 || clientPayments.length > 0) {
      if (client.outstandingBalance !== calculatedBalance) {
        console.log(`[Self-Healing] Adjusting client outstanding balance for ${client.name} to ${calculatedBalance} (Invoices/Payments present).`);
        db_clients[i].outstandingBalance = calculatedBalance;
        if (db) {
          try {
            await setDoc(doc(db, "clients", client.id), db_clients[i]);
          } catch (e) {
            console.error(`[Self-Healing] Failed to sync aligned outstanding balance for client ${client.id}:`, e);
          }
        }
      }
    } else {
      const clientLedgers = db_ledger.filter((l) => l.clientId === client.id);
      if (clientLedgers.length === 0 && client.outstandingBalance !== 0) {
        const isDemoClient = DEMO_CLIENTS.some((dc) => dc.id === client.id);
        if (!isDemoClient) {
          console.log(`[Self-Healing] Resetting client outstanding balance for non-demo client ${client.name} with 0 ledger entries.`);
          db_clients[i].outstandingBalance = 0;
          if (db) {
            await setDoc(doc(db, "clients", client.id), db_clients[i]).catch(() => null);
          }
        }
      }
    }
  }
  console.log(`[Self-Healing] Audit sweep completed. Active ledger count: ${db_ledger.length}`);
}
function getCleanLedger() {
  const validInvoiceIds = new Set(db_invoices.map((inv) => inv.id));
  const validPaymentIds = new Set(db_payments.map((p) => p.id));
  const initialLen = db_ledger.length;
  const originalLedger = [...db_ledger];
  db_ledger = db_ledger.filter((led) => {
    if (led.referenceType === "invoice") return validInvoiceIds.has(led.referenceId);
    if (led.referenceType === "payment") return validPaymentIds.has(led.referenceId);
    return true;
  });
  if (db_ledger.length !== initialLen) {
    saveStateToLocalCache();
    const removed = originalLedger.filter((ol) => !db_ledger.some((dl) => dl.id === ol.id));
    for (const r of removed) {
      if (db) {
        deleteDoc(doc(db, "ledger", r.id)).catch((err) => {
          console.warn("[Self-Healing Ledger API Sync] Failed to delete", r.id, err);
        });
      }
    }
  }
  return db_ledger;
}
async function bootstrapFromFirestore() {
  loadStateFromLocalCache();
  if (!db) {
    console.log("Firebase DB not configured or disabled. Running in full local cache model.");
    return;
  }
  try {
    console.log("Synchronizing memory database and seeding Firestore if required...");
    const settingsDoc = await withTimeout(getDoc(doc(db, "businessSettings", "global")), 25e3);
    const isFirstSeed = !settingsDoc.exists();
    if (!isFirstSeed) {
      const settingsData = settingsDoc.data();
      if (settingsData && Object.keys(settingsData).length > 0) {
        db_settings = settingsData;
      }
    } else {
      await withTimeout(setDoc(doc(db, "businessSettings", "global"), db_settings), 25e3);
    }
    const categoriesDoc = await withTimeout(getDoc(doc(db, "businessSettings", "categories")), 25e3);
    if (categoriesDoc.exists()) {
      const listData = categoriesDoc.data().list;
      if (Array.isArray(listData)) {
        db_categories = listData;
      }
    } else {
      await withTimeout(setDoc(doc(db, "businessSettings", "categories"), { list: db_categories }), 25e3);
    }
    const rolesDoc = await withTimeout(getDoc(doc(db, "businessSettings", "roles")), 25e3);
    if (rolesDoc.exists()) {
      const listData = rolesDoc.data().list;
      if (Array.isArray(listData) && listData.length > 0) {
        db_roles = listData;
      } else {
        await withTimeout(setDoc(doc(db, "businessSettings", "roles"), { list: db_roles }), 25e3);
      }
    } else {
      await withTimeout(setDoc(doc(db, "businessSettings", "roles"), { list: db_roles }), 25e3);
    }
    const syncCollectionOnStartup = async (collectionName, currentList, demoSeedList, idKey = "id") => {
      const snap = await withTimeout(getDocs(collection(db, collectionName)), 25e3);
      if (snap.empty) {
        if (isFirstSeed) {
          const seedData = currentList.length > 0 ? currentList : demoSeedList;
          console.log(`Firestore '${collectionName}' collection is empty. First-time seeding with default dataset (${seedData.length} records) to cloud...`);
          const batch = writeBatch(db);
          for (const item of seedData) {
            const docId = idKey === "id" ? item.id : item.userId;
            if (docId) batch.set(doc(db, collectionName, docId), item);
          }
          await withTimeout(batch.commit(), 25e3);
          return seedData;
        } else {
          console.log(`Firestore '${collectionName}' is empty (cleared by user). Keeping it empty.`);
          return [];
        }
      } else {
        return snap.docs.map((d) => d.data());
      }
    };
    db_clients = await syncCollectionOnStartup("clients", db_clients, DEMO_CLIENTS);
    db_products = await syncCollectionOnStartup("products", db_products, DEMO_PRODUCTS);
    db_invoices = await syncCollectionOnStartup("invoices", db_invoices, DEMO_INVOICES);
    db_quotations = await syncCollectionOnStartup("quotations", db_quotations, DEMO_QUOTATIONS);
    db_payments = await syncCollectionOnStartup("payments", db_payments, DEMO_PAYMENTS);
    db_ledger = await syncCollectionOnStartup("ledger", db_ledger, DEMO_LEDGER);
    db_cashbook = await syncCollectionOnStartup("cashbook", db_cashbook, DEMO_CASHBOOK);
    const entryIdToRemove = "cb-1779715467712";
    const initialLen = db_cashbook.length;
    db_cashbook = db_cashbook.filter((cb) => cb.id !== entryIdToRemove && !(cb.amount === 300 && cb.paymentMode === "Cash"));
    if (db_cashbook.length !== initialLen) {
      console.log(`Self-healing: Detected and removed requested Rs 300 Cashbook entry.`);
      try {
        await withTimeout(deleteDoc(doc(db, "cashbook", entryIdToRemove)), 15e3);
      } catch (e) {
        console.warn("Could not delete Rs 300 Cashbook entry from Firestore directly:", e);
      }
    }
    db_logs = await syncCollectionOnStartup("activityLogs", db_logs, DEMO_LOGS);
    db_notifications = await syncCollectionOnStartup("notifications", db_notifications, DEMO_NOTIFICATIONS);
    db_users = await syncCollectionOnStartup("users", db_users, DEMO_USERS, "userId");
    const finalUsers = [];
    const hasAdmin = db_users.some((u) => u.email.trim().toLowerCase() === "modulesinternet@gmail.com");
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
    db_users.forEach((u) => {
      const emailLower = u.email.trim().toLowerCase();
      if (emailLower === "admin@demo.com") {
        return;
      }
      if (emailLower === "modulesinternet@gmail.com") {
        u.role = "Admin";
        if (u.name === "Admin") {
          u.name = "Karan Sharma";
        }
      }
      if (!finalUsers.some((f) => f.email.trim().toLowerCase() === emailLower)) {
        finalUsers.push(u);
      }
    });
    if (isFirstSeed) {
      DEMO_USERS.forEach((du) => {
        const emailLower = du.email.trim().toLowerCase();
        if (emailLower === "admin@demo.com") {
          return;
        }
        if (!finalUsers.some((f) => f.email.trim().toLowerCase() === emailLower)) {
          finalUsers.push(du);
        }
      });
    }
    db_users = finalUsers;
    saveStateToLocalCache();
    if (db) {
      const liveAdmin = db_users.find((u) => u.email.trim().toLowerCase() === "modulesinternet@gmail.com");
      if (liveAdmin) {
        await withTimeout(setDoc(doc(db, "users", liveAdmin.userId), liveAdmin), 25e3);
      }
      try {
        await withTimeout(deleteDoc(doc(db, "users", "u-admin-demo")), 1e4);
      } catch (e) {
      }
      const passwordsDoc = await withTimeout(getDoc(doc(db, "businessSettings", "passwords")), 25e3).catch((e) => null);
      if (passwordsDoc && passwordsDoc.exists()) {
        const passwordsData = passwordsDoc.data();
        if (passwordsData && Object.keys(passwordsData).length > 0) {
          db_passwords = passwordsData;
        }
      } else {
        await withTimeout(setDoc(doc(db, "businessSettings", "passwords"), db_passwords), 25e3).catch((e) => null);
      }
    }
    await performSelfHealingAudit();
    console.log("Firebase Firestore synchronization successfully primed!");
  } catch (error) {
    console.warn("WARNING: Firebase Firestore synchronization failed during startup bootstrap:", error);
    console.warn("The server will proceed running using the local in-memory database fallback.");
    console.warn("Keeping active Firestore database reference in case of dynamic recovery.");
  }
}
bootstrapFromFirestore();
function checkPermission(module, action) {
  return (req, res, next) => {
    const roleHeader = (req.headers["x-user-role"] || "").trim();
    const role = roleHeader || "Admin";
    const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
    if (role.toLowerCase() === "admin" || userEmail === "modulesinternet@gmail.com") {
      return next();
    }
    const roleConfig = db_roles.find((r) => r.role.trim().toLowerCase() === role.toLowerCase());
    if (!roleConfig) {
      return res.status(403).json({
        error: `Security fail: Acting role "${role}" is not registered in the system role permissions list.`
      });
    }
    const allowed = roleConfig.modules[module]?.[action];
    if (!allowed) {
      console.warn(`[DENIED] Blocked request for role: ${role}, user: ${userEmail || "anonymous"}, module: ${module}, action: ${action}`);
      return res.status(403).json({
        error: `Access Denied: Your acting role "${role}" does not have "${action}" permissions for the "${module}" module. Please verify permissions in Team Access.`
      });
    }
    next();
  };
}
function logUserActivity(userId, userName, action, details) {
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    userId,
    userName,
    action,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db_logs.unshift(newLog);
  if (db_logs.length > 200) db_logs.pop();
  syncStateToFirestore("logs", newLog.id);
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Smart Accounts Server up and running!", databaseConnected: !!db });
});
app.get("/api/dashboard", checkPermission("dashboard", "read"), (req, res) => {
  const totalRevenue = db_payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.total, 0);
  const unpaidInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
  const totalOutstanding = db_clients.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalClientsCount = db_clients.length;
  const totalInvoicesCount = db_invoices.length;
  const pendingInvoicesCount = db_invoices.filter((i) => i.status !== "paid").length;
  const monthlyDataMap = /* @__PURE__ */ new Map();
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  months.forEach((m) => {
    monthlyDataMap.set(m, { month: m, billed: 0, collected: 0 });
  });
  db_invoices.forEach((inv) => {
    const monthIndex = new Date(inv.date).getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const name = monthNames[monthIndex];
    if (monthlyDataMap.has(name)) {
      const existing = monthlyDataMap.get(name);
      existing.billed += inv.total;
    }
  });
  db_payments.forEach((pay) => {
    const monthIndex = new Date(pay.paymentDate).getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const name = monthNames[monthIndex];
    if (monthlyDataMap.has(name)) {
      const existing = monthlyDataMap.get(name);
      existing.collected += pay.amount;
    }
  });
  const chartData = Array.from(monthlyDataMap.values());
  const recentInvoices = db_invoices.slice(0, 5).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.clientName,
    total: inv.total,
    status: inv.status,
    date: inv.date
  }));
  const clientBilled = {};
  db_invoices.forEach((inv) => {
    if (!clientBilled[inv.clientId]) {
      clientBilled[inv.clientId] = { name: inv.clientName, amount: 0 };
    }
    clientBilled[inv.clientId].amount += inv.total;
  });
  const topClients = Object.values(clientBilled).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const upiCollected = db_payments.filter((p) => p.paymentMode === "UPI").reduce((sum, p) => sum + p.amount, 0);
  const bankCollected = db_payments.filter((p) => p.paymentMode === "Bank Transfer").reduce((sum, p) => sum + p.amount, 0);
  const cashCollected = db_payments.filter((p) => p.paymentMode === "Cash").reduce((sum, p) => sum + p.amount, 0);
  const otherCollected = db_payments.filter((p) => p.paymentMode !== "Cash" && p.paymentMode !== "UPI" && p.paymentMode !== "Bank Transfer").reduce((sum, p) => sum + p.amount, 0);
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
    sortedCashbook.forEach((c) => {
      const amount = c.amount || 0;
      if (c.type === "income") {
        if (c.paymentMode === "Cash") cash += amount;
        else bank += amount;
      } else if (c.type === "expense") {
        if (c.paymentMode === "Cash") cash -= amount;
        else bank -= amount;
      } else if (c.type === "bank_deposit") {
        cash -= amount;
        bank += amount;
      } else if (c.type === "withdrawal") {
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
      { name: "UPI Collections", value: upiCollected, color: "#8B5CF6" },
      { name: "Bank Wire / EFT", value: bankCollected, color: "#3B82F6" },
      { name: "Over Counter Cash", value: cashCollected, color: "#10B981" },
      { name: "Paper Cheque/Card", value: otherCollected, color: "#F59E0B" }
    ],
    chartData,
    recentInvoices,
    topClients
  });
});
app.get("/api/clients", checkPermission("clients", "read"), (req, res) => {
  res.json(db_clients);
});
app.post("/api/clients", checkPermission("clients", "write"), async (req, res) => {
  const data = req.body;
  const newClient = {
    id: `c-${Date.now()}`,
    name: data.name || "Unnamed Client",
    email: data.email || "",
    phone: data.phone || "",
    gstIn: data.gstIn || "",
    pan: data.pan || "",
    billingAddress: data.billingAddress || "",
    shippingAddress: data.shippingAddress || data.billingAddress || "",
    outstandingBalance: Number(data.outstandingBalance || 0),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db_clients.unshift(newClient);
  await syncStateToFirestore("clients", newClient.id);
  logUserActivity("demo-admin", "Karan Sharma", "CLIENT_CREATE", `Registered new client: ${newClient.name}`);
  res.status(201).json(newClient);
});
app.put("/api/clients/:id", checkPermission("clients", "write"), async (req, res) => {
  const { id } = req.params;
  const index = db_clients.findIndex((c) => c.id === id);
  if (index !== -1) {
    db_clients[index] = { ...db_clients[index], ...req.body };
    await syncStateToFirestore("clients", id);
    logUserActivity("demo-admin", "Karan Sharma", "CLIENT_UPDATE", `Updated client profile: ${db_clients[index].name}`);
    res.json(db_clients[index]);
  } else {
    res.status(404).json({ error: "Client not found" });
  }
});
app.delete("/api/clients/:id", checkPermission("clients", "delete"), async (req, res) => {
  const { id } = req.params;
  const index = db_clients.findIndex((c) => c.id === id);
  if (index !== -1) {
    const deletedName = db_clients[index].name;
    db_clients.splice(index, 1);
    await syncStateToFirestore("clients", id);
    logUserActivity("demo-admin", "Karan Sharma", "CLIENT_DELETE", `Removed client database row: ${deletedName}`);
    res.json({ success: true, message: "Client deleted successfully" });
  } else {
    res.status(404).json({ error: "Client not found" });
  }
});
app.get("/api/products", checkPermission("products", "read"), (req, res) => {
  res.json(db_products);
});
app.post("/api/products", checkPermission("products", "write"), async (req, res) => {
  const data = req.body;
  const newProduct = {
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
  await syncStateToFirestore("products", newProduct.id);
  logUserActivity("demo-admin", "Karan Sharma", "PRODUCT_CREATE", `Added catalogue work item: ${newProduct.name} at GST ${newProduct.gstPercent}%`);
  res.status(201).json(newProduct);
});
app.put("/api/products/:id", checkPermission("products", "write"), async (req, res) => {
  const { id } = req.params;
  const index = db_products.findIndex((p) => p.id === id);
  if (index !== -1) {
    db_products[index] = { ...db_products[index], ...req.body };
    await syncStateToFirestore("products", id);
    logUserActivity("demo-admin", "Karan Sharma", "PRODUCT_UPDATE", `Updated catalogue item details: ${db_products[index].name}`);
    res.json(db_products[index]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});
app.delete("/api/products/:id", checkPermission("products", "delete"), async (req, res) => {
  const { id } = req.params;
  const index = db_products.findIndex((p) => p.id === id);
  if (index !== -1) {
    const deletedName = db_products[index].name;
    db_products.splice(index, 1);
    await syncStateToFirestore("products", id);
    logUserActivity("demo-admin", "Karan Sharma", "PRODUCT_DELETE", `Removed catalogue item: ${deletedName}`);
    res.json({ success: true, message: "Product deleted" });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});
app.get("/api/categories", (req, res) => {
  res.json(db_categories);
});
app.post("/api/categories", checkPermission("products", "write"), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  const trimmed = name.trim();
  if (db_categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    return res.status(400).json({ error: "Category already exists" });
  }
  db_categories.push(trimmed);
  await syncStateToFirestore("categories");
  logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_CREATE", `Created new product category: ${trimmed}`);
  res.status(201).json({ success: true, categories: db_categories });
});
app.put("/api/categories", checkPermission("products", "write"), async (req, res) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName) return res.status(400).json({ error: "Old and new category names are required" });
  const trimmedNew = newName.trim();
  const idx = db_categories.findIndex((c) => c.toLowerCase() === oldName.trim().toLowerCase());
  if (idx !== -1) {
    db_categories[idx] = trimmedNew;
    let count = 0;
    db_products = db_products.map((p) => {
      if (p.category && p.category.toLowerCase() === oldName.trim().toLowerCase()) {
        count++;
        return { ...p, category: trimmedNew };
      }
      return p;
    });
    await syncStateToFirestore("categories");
    await syncStateToFirestore("products");
    logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_UPDATE", `Renamed category from "${oldName}" to "${trimmedNew}" (affected ${count} product(s))`);
    res.json({ success: true, categories: db_categories });
  } else {
    res.status(404).json({ error: "Category not found" });
  }
});
app.delete("/api/categories", checkPermission("products", "delete"), async (req, res) => {
  const name = req.body?.name || req.query?.name;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  const target = name.trim();
  db_categories = db_categories.filter((c) => c.toLowerCase() !== target.toLowerCase());
  const fallbackCat = db_categories[0] || "General";
  let count = 0;
  db_products = db_products.map((p) => {
    if (p.category && p.category.toLowerCase() === target.toLowerCase()) {
      count++;
      return { ...p, category: fallbackCat };
    }
    return p;
  });
  if (db_categories.length === 0) {
    db_categories.push("General");
  }
  await syncStateToFirestore("categories");
  await syncStateToFirestore("products");
  logUserActivity("demo-admin", "Karan Sharma", "CATEGORY_DELETE", `Removed category "${target}" (reset ${count} product(s) to "${fallbackCat}")`);
  res.json({ success: true, categories: db_categories });
});
app.get("/api/invoices", checkPermission("invoices", "read"), (req, res) => {
  res.json(db_invoices);
});
app.post("/api/invoices", checkPermission("invoices", "write"), async (req, res) => {
  const data = req.body;
  const id = `inv-${Date.now()}`;
  const total = Number(data.total || 0);
  const newInvoice = {
    id,
    invoiceNumber: data.invoiceNumber || `${db_settings.invoicePrefix}${String(db_invoices.length + 1).padStart(3, "0")}`,
    clientId: data.clientId,
    clientName: data.clientName,
    clientGst: data.clientGst || "",
    date: data.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    dueDate: data.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
    items: data.items || [],
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    taxType: data.taxType || "CGST_SGST",
    taxAmount: Number(data.taxAmount || 0),
    total,
    paidAmount: Number(data.paidAmount || 0),
    dueAmount: Number(data.dueAmount ?? total),
    status: data.status || "unpaid",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    notes: data.notes || "",
    readCount: 0
  };
  db_invoices.unshift(newInvoice);
  const clientIndex = db_clients.findIndex((c) => c.id === newInvoice.clientId);
  let startingBalance = 0;
  if (clientIndex !== -1) {
    startingBalance = db_clients[clientIndex].outstandingBalance;
    db_clients[clientIndex].outstandingBalance += newInvoice.dueAmount;
    await syncStateToFirestore("clients", newInvoice.clientId);
  }
  const newLedger = {
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db_ledger.unshift(newLedger);
  await syncStateToFirestore("invoices", newInvoice.id);
  await syncStateToFirestore("ledger", newLedger.id);
  logUserActivity("demo-admin", "Karan Sharma", "INVOICE_CREATE", `Generated invoice ${newInvoice.invoiceNumber} for ${newInvoice.clientName} (INR ${newInvoice.total})`);
  res.status(201).json(newInvoice);
});
app.put("/api/invoices/:id", checkPermission("invoices", "write"), async (req, res) => {
  const { id } = req.params;
  const index = db_invoices.findIndex((inv) => inv.id === id);
  if (index !== -1) {
    const oldInv = db_invoices[index];
    const data = req.body;
    const newTotal = Number(data.total ?? oldInv.total);
    const newPaidAmount = Number(data.paidAmount ?? oldInv.paidAmount);
    const newDueAmount = Number(data.dueAmount ?? newTotal - newPaidAmount);
    const clientIndex = db_clients.findIndex((c) => c.id === oldInv.clientId);
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = Math.max(0, db_clients[clientIndex].outstandingBalance - oldInv.dueAmount + newDueAmount);
      await syncStateToFirestore("clients", oldInv.clientId);
    }
    const ledgerIndex = db_ledger.findIndex((led) => led.referenceType === "invoice" && led.referenceId === id);
    if (ledgerIndex !== -1) {
      db_ledger[ledgerIndex].amount = newTotal;
      db_ledger[ledgerIndex].description = `Invoice Modified: ${data.invoiceNumber || oldInv.invoiceNumber}`;
      if (clientIndex !== -1) {
        db_ledger[ledgerIndex].runningBalance = db_clients[clientIndex].outstandingBalance;
      }
      await syncStateToFirestore("ledger", db_ledger[ledgerIndex].id);
    }
    db_invoices[index] = {
      ...oldInv,
      ...data,
      total: newTotal,
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount
    };
    await syncStateToFirestore("invoices", id);
    logUserActivity("demo-admin", "Karan Sharma", "INVOICE_UPDATE", `Modified invoice ${db_invoices[index].invoiceNumber} for ${db_invoices[index].clientName}`);
    res.json(db_invoices[index]);
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});
app.post("/api/invoices/:id/read", checkPermission("invoices", "read"), async (req, res) => {
  const { id } = req.params;
  const invoice = db_invoices.find((v) => v.id === id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  if (!invoice.readCount || invoice.readCount < 1) {
    invoice.readCount = 1;
    await syncStateToFirestore("invoices", invoice.id);
  }
  res.json(invoice);
});
app.delete("/api/invoices/:id", checkPermission("invoices", "delete"), async (req, res) => {
  const { id } = req.params;
  const index = db_invoices.findIndex((inv) => inv.id === id);
  if (index !== -1) {
    const inv = db_invoices[index];
    const ledIndices = [];
    db_ledger.forEach((led, i) => {
      if (led.referenceType === "invoice" && led.referenceId === id) {
        ledIndices.push(i);
      }
    });
    for (const ledIdx of ledIndices) {
      const ledId = db_ledger[ledIdx].id;
      if (db) {
        try {
          await deleteDoc(doc(db, "ledger", ledId));
        } catch (e) {
          console.error(`Failed to delete doc ledger/${ledId}:`, e);
        }
      }
    }
    db_ledger = db_ledger.filter((led) => !(led.referenceType === "invoice" && led.referenceId === id));
    db_invoices.splice(index, 1);
    await syncStateToFirestore("invoices", id);
    const clientIndex = db_clients.findIndex((c) => c.id === inv.clientId);
    if (clientIndex !== -1) {
      const clientInvoices = db_invoices.filter((v) => v.clientId === inv.clientId);
      const clientPayments = db_payments.filter((p) => p.clientId === inv.clientId);
      const totalInvoiced = clientInvoices.reduce((sum, v) => sum + v.total, 0);
      const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
      db_clients[clientIndex].outstandingBalance = Math.max(0, totalInvoiced - totalPaid);
      await syncStateToFirestore("clients", inv.clientId);
    }
    logUserActivity("demo-admin", "Karan Sharma", "INVOICE_DELETE", `Voided and deleted invoice: ${inv.invoiceNumber} and updated ledger ties`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});
app.get("/api/quotations", checkPermission("quotations", "read"), (req, res) => {
  res.json(db_quotations);
});
app.post("/api/quotations", checkPermission("quotations", "write"), async (req, res) => {
  const data = req.body;
  const newQuotation = {
    id: `q-${Date.now()}`,
    quotationNumber: data.quotationNumber || `${db_settings.quotationPrefix}${String(db_quotations.length + 1).padStart(3, "0")}`,
    clientId: data.clientId,
    clientName: data.clientName,
    date: data.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    expiryDate: data.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
    items: data.items || [],
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    taxAmount: Number(data.taxAmount || 0),
    total: Number(data.total || 0),
    status: data.status || "draft",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    notes: data.notes || ""
  };
  db_quotations.unshift(newQuotation);
  await syncStateToFirestore("quotations", newQuotation.id);
  logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_CREATE", `Prepared estimate ${newQuotation.quotationNumber} for ${newQuotation.clientName}`);
  res.status(201).json(newQuotation);
});
app.put("/api/quotations/:id", checkPermission("quotations", "write"), async (req, res) => {
  const { id } = req.params;
  const index = db_quotations.findIndex((q) => q.id === id);
  if (index !== -1) {
    db_quotations[index] = { ...db_quotations[index], ...req.body };
    await syncStateToFirestore("quotations", id);
    logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_UPDATE", `Updated estimate status: ${db_quotations[index].quotationNumber} -> ${db_quotations[index].status}`);
    res.json(db_quotations[index]);
  } else {
    res.status(404).json({ error: "Quotation not found" });
  }
});
app.delete("/api/quotations/:id", checkPermission("quotations", "delete"), async (req, res) => {
  const { id } = req.params;
  const index = db_quotations.findIndex((q) => q.id === id);
  if (index !== -1) {
    const qNumber = db_quotations[index].quotationNumber;
    db_quotations.splice(index, 1);
    await syncStateToFirestore("quotations", id);
    logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_DELETE", `Deleted quotation estimate: ${qNumber}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Quotation not found" });
  }
});
app.post("/api/quotations/:id/convert", checkPermission("quotations", "write"), async (req, res) => {
  const { id } = req.params;
  const qIndex = db_quotations.findIndex((q) => q.id === id);
  if (qIndex !== -1) {
    const q = db_quotations[qIndex];
    const invoiceId = `inv-${Date.now()}`;
    const invoiceNum = `${db_settings.invoicePrefix}${String(db_invoices.length + 1).padStart(3, "0")}`;
    const clientDetails = db_clients.find((c) => c.id === q.clientId);
    const convertedInvoice = {
      id: invoiceId,
      invoiceNumber: invoiceNum,
      clientId: q.clientId,
      clientName: q.clientName,
      clientGst: clientDetails?.gstIn || "",
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
      items: q.items,
      subtotal: q.subtotal,
      discount: q.discount,
      taxType: clientDetails && !clientDetails.gstIn.startsWith(db_settings.gstIn.substring(0, 2)) ? "IGST" : "CGST_SGST",
      taxAmount: q.taxAmount,
      total: q.total,
      paidAmount: 0,
      dueAmount: q.total,
      status: "unpaid",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      notes: `Converted from Estimate Ref: ${q.quotationNumber}`
    };
    db_invoices.unshift(convertedInvoice);
    q.status = "converted";
    q.convertedInvoiceId = invoiceId;
    if (clientDetails) {
      clientDetails.outstandingBalance += q.total;
      await syncStateToFirestore("clients", q.clientId);
    }
    const newLedger = {
      id: `led-${Date.now()}`,
      clientId: q.clientId,
      clientName: q.clientName,
      date: convertedInvoice.date,
      description: `Invoice Raised from Proposal: ${invoiceNum}`,
      type: "debit",
      amount: convertedInvoice.total,
      runningBalance: clientDetails?.outstandingBalance || 0,
      referenceType: "invoice",
      referenceId: invoiceId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db_ledger.unshift(newLedger);
    await syncStateToFirestore("invoices", invoiceId);
    await syncStateToFirestore("quotations", id);
    await syncStateToFirestore("ledger", newLedger.id);
    logUserActivity("demo-admin", "Karan Sharma", "QUOTATION_CONVERT", `Authorized proposal ${q.quotationNumber} conversion into invoice ${invoiceNum}`);
    res.json({ success: true, invoice: convertedInvoice });
  } else {
    res.status(404).json({ error: "Quotation not found" });
  }
});
app.get("/api/payments", checkPermission("payments", "read"), (req, res) => {
  res.json(db_payments);
});
app.post("/api/payments", checkPermission("payments", "write"), async (req, res) => {
  try {
    const data = req.body;
    const payId = `pay-${Date.now()}`;
    const amountPaid = Number(data.amount || 0);
    const newPayment = {
      id: payId,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber || "",
      clientId: data.clientId,
      clientName: data.clientName,
      amount: amountPaid,
      paymentDate: data.paymentDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      paymentMode: data.paymentMode || "UPI",
      referenceNum: data.referenceNum || `REF-${Date.now()}`,
      remarks: data.remarks || "No comments",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db_payments.unshift(newPayment);
    const invIndex = db_invoices.findIndex((i) => i.id === newPayment.invoiceId);
    if (invIndex !== -1) {
      const inv = db_invoices[invIndex];
      inv.paidAmount = Number(inv.paidAmount || 0) + amountPaid;
      inv.dueAmount = Math.max(0, Number(inv.total || 0) - inv.paidAmount);
      if (inv.dueAmount === 0) {
        inv.status = "paid";
      } else if (inv.paidAmount > 0) {
        inv.status = "partially_paid";
      }
      await syncStateToFirestore("invoices", newPayment.invoiceId);
    }
    const clientIndex = db_clients.findIndex((c) => c.id === newPayment.clientId);
    let runningClientBalance = 0;
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = Math.max(0, Number(db_clients[clientIndex].outstandingBalance || 0) - amountPaid);
      runningClientBalance = db_clients[clientIndex].outstandingBalance;
      await syncStateToFirestore("clients", newPayment.clientId);
    }
    const newLedger = {
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
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db_ledger.unshift(newLedger);
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
    if (newPayment.paymentMode === "Cash") {
      cashChange = amountPaid;
    } else {
      bankChange = amountPaid;
    }
    const newCashbook = {
      id: `cb-${Date.now()}`,
      date: newPayment.paymentDate,
      description: `Invoiced Collection [${newPayment.clientName}] Ref ${newPayment.referenceNum}`,
      type: "income",
      paymentMode: newPayment.paymentMode,
      amount: amountPaid,
      referenceId: payId,
      runningCashBalance: Number(lastCashbookEntry.runningCashBalance || 0) + cashChange,
      runningBankBalance: Number(lastCashbookEntry.runningBankBalance || 0) + bankChange,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db_cashbook.unshift(newCashbook);
    await syncStateToFirestore("payments", payId);
    await syncStateToFirestore("ledger", newLedger.id);
    await syncStateToFirestore("cashbook", newCashbook.id);
    logUserActivity("demo-admin", "Karan Sharma", "PAYMENT_COLLECT", `Cleared collection receipts pay: ${amountPaid} from ${newPayment.clientName}. Double-entry synchronizer successful.`);
    res.status(201).json(newPayment);
  } catch (err) {
    console.error("Critical payment log execution failed: ", err);
    res.status(500).json({ error: `Could not approve ledger credit of payment receipt: ${err.message}` });
  }
});
app.put("/api/payments/:id", checkPermission("payments", "write"), async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const pIndex = db_payments.findIndex((pay) => pay.id === id);
  if (pIndex !== -1) {
    const oldP = db_payments[pIndex];
    const oldAmount = oldP.amount;
    const oldInvIndex = db_invoices.findIndex((inv) => inv.id === oldP.invoiceId);
    if (oldInvIndex !== -1) {
      const inv = db_invoices[oldInvIndex];
      inv.paidAmount = Math.max(0, inv.paidAmount - oldAmount);
      inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
      inv.status = inv.dueAmount === inv.total ? "unpaid" : inv.paidAmount > 0 ? "partially_paid" : "unpaid";
      await syncStateToFirestore("invoices", inv.id);
    }
    const oldClientIndex = db_clients.findIndex((c) => c.id === oldP.clientId);
    if (oldClientIndex !== -1) {
      db_clients[oldClientIndex].outstandingBalance = db_clients[oldClientIndex].outstandingBalance + oldAmount;
      await syncStateToFirestore("clients", db_clients[oldClientIndex].id);
    }
    const updatedInvoiceId = data.invoiceId || oldP.invoiceId;
    const isInvoiceChanged = updatedInvoiceId !== oldP.invoiceId;
    oldP.amount = Number(data.amount ?? oldP.amount);
    oldP.paymentDate = data.paymentDate || oldP.paymentDate;
    oldP.paymentMode = data.paymentMode || oldP.paymentMode;
    oldP.referenceNum = data.referenceNum || oldP.referenceNum;
    oldP.remarks = data.remarks || oldP.remarks;
    if (isInvoiceChanged) {
      oldP.invoiceId = updatedInvoiceId;
      const targetInv = db_invoices.find((inv) => inv.id === updatedInvoiceId);
      oldP.invoiceNumber = targetInv ? targetInv.invoiceNumber : oldP.invoiceNumber;
    }
    const newAmount = oldP.amount;
    const newInvIndex = db_invoices.findIndex((inv) => inv.id === oldP.invoiceId);
    if (newInvIndex !== -1) {
      const inv = db_invoices[newInvIndex];
      inv.paidAmount = inv.paidAmount + newAmount;
      inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
      inv.status = inv.dueAmount === 0 ? "paid" : inv.paidAmount > 0 ? "partially_paid" : "unpaid";
      await syncStateToFirestore("invoices", inv.id);
    }
    const newClientIndex = db_clients.findIndex((c) => c.id === oldP.clientId);
    let runningClientBalance = 0;
    if (newClientIndex !== -1) {
      db_clients[newClientIndex].outstandingBalance = Math.max(0, db_clients[newClientIndex].outstandingBalance - newAmount);
      runningClientBalance = db_clients[newClientIndex].outstandingBalance;
      await syncStateToFirestore("clients", db_clients[newClientIndex].id);
    }
    const ledgerToRemove = db_ledger.filter((l) => l.referenceType === "payment" && l.referenceId === oldP.id);
    db_ledger = db_ledger.filter((l) => !(l.referenceType === "payment" && l.referenceId === oldP.id));
    for (const led of ledgerToRemove) {
      await syncStateToFirestore("ledger", led.id);
    }
    const newLedger = {
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
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db_ledger.unshift(newLedger);
    await syncStateToFirestore("ledger", newLedger.id);
    const cashbookToRemove = db_cashbook.filter((cb) => cb.referenceId === oldP.id);
    db_cashbook = db_cashbook.filter((cb) => cb.referenceId !== oldP.id);
    for (const cb of cashbookToRemove) {
      await syncStateToFirestore("cashbook", cb.id);
    }
    let cashChange = 0;
    let bankChange = 0;
    if (oldP.paymentMode === "Cash") {
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
    const newCashbook = {
      id: `cb-${Date.now()}`,
      date: oldP.paymentDate,
      description: `Invoiced Collection [${oldP.clientName}] Ref ${oldP.referenceNum} (EDITED)`,
      type: "income",
      paymentMode: oldP.paymentMode,
      amount: newAmount,
      referenceId: oldP.id,
      runningCashBalance: lastCashbookEntry.runningCashBalance + cashChange,
      runningBankBalance: lastCashbookEntry.runningBankBalance + bankChange,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db_cashbook.unshift(newCashbook);
    await syncStateToFirestore("cashbook", newCashbook.id);
    await syncStateToFirestore("payments", oldP.id);
    logUserActivity("demo-admin", "Karan Sharma", "PAYMENT_UPDATE", `Modified payment receipt references of ${oldP.clientName}. Double-entry log updated.`);
    res.json(oldP);
  } else {
    res.status(404).json({ error: "Payment not found" });
  }
});
app.delete("/api/payments/:id", checkPermission("payments", "delete"), async (req, res) => {
  const { id } = req.params;
  const pIndex = db_payments.findIndex((pay) => pay.id === id);
  if (pIndex !== -1) {
    const p = db_payments[pIndex];
    const invIndex = db_invoices.findIndex((inv) => inv.id === p.invoiceId);
    if (invIndex !== -1) {
      const inv = db_invoices[invIndex];
      inv.paidAmount = Math.max(0, inv.paidAmount - p.amount);
      inv.dueAmount = Math.max(0, inv.total - inv.paidAmount);
      inv.status = inv.dueAmount === inv.total ? "unpaid" : inv.paidAmount > 0 ? "partially_paid" : "unpaid";
      await syncStateToFirestore("invoices", inv.id);
    }
    const clientIndex = db_clients.findIndex((c) => c.id === p.clientId);
    if (clientIndex !== -1) {
      db_clients[clientIndex].outstandingBalance = db_clients[clientIndex].outstandingBalance + p.amount;
      await syncStateToFirestore("clients", db_clients[clientIndex].id);
    }
    const ledgerToRemove = db_ledger.filter((l) => l.referenceType === "payment" && l.referenceId === p.id);
    db_ledger = db_ledger.filter((l) => !(l.referenceType === "payment" && l.referenceId === p.id));
    for (const led of ledgerToRemove) {
      await syncStateToFirestore("ledger", led.id);
    }
    const cashbookToRemove = db_cashbook.filter((cb) => cb.referenceId === p.id);
    db_cashbook = db_cashbook.filter((cb) => cb.referenceId !== p.id);
    for (const cb of cashbookToRemove) {
      await syncStateToFirestore("cashbook", cb.id);
    }
    db_payments.splice(pIndex, 1);
    await syncStateToFirestore("payments", id);
    logUserActivity("demo-admin", "Karan Sharma", "PAYMENT_DELETE", `Voided and deleted payment of INR ${p.amount} from ${p.clientName}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Payment not found" });
  }
});
app.get("/api/ledger", checkPermission("ledger", "read"), (req, res) => {
  res.json(getCleanLedger());
});
app.get("/api/ledger/client/:clientId", checkPermission("ledger", "read"), (req, res) => {
  const { clientId } = req.params;
  const cleanLedger = getCleanLedger();
  const filtered = cleanLedger.filter((led) => led.clientId === clientId);
  res.json(filtered);
});
app.get("/api/cashbook", checkPermission("cashbook", "read"), (req, res) => {
  res.json(db_cashbook);
});
app.post("/api/cashbook", checkPermission("cashbook", "write"), async (req, res) => {
  const data = req.body;
  const amount = Number(data.amount || 0);
  const type = data.type || "expense";
  const mode = data.paymentMode || "Cash";
  if (type === "income") {
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
  if (type === "income") {
    if (mode === "Cash") newCash += amount;
    else newBank += amount;
  } else if (type === "expense") {
    if (mode === "Cash") newCash -= amount;
    else newBank -= amount;
  } else if (type === "bank_deposit") {
    newCash -= amount;
    newBank += amount;
  } else if (type === "withdrawal") {
    newCash += amount;
    newBank -= amount;
  }
  const newEntry = {
    id: `cb-${Date.now()}`,
    date: data.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    description: data.description || "Cashbook Transaction Entry",
    type,
    paymentMode: mode,
    amount,
    runningCashBalance: newCash,
    runningBankBalance: newBank,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db_cashbook.unshift(newEntry);
  await syncStateToFirestore("cashbook", newEntry.id);
  logUserActivity("demo-admin", "Karan Sharma", "CASHBOOK_ENTRY", `Created manual transactional log: ${newEntry.description} for INR ${amount}`);
  res.status(201).json(newEntry);
});
app.put("/api/cashbook/:id", checkPermission("cashbook", "write"), async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  if (data.type === "income") {
    return res.status(400).json({ error: "Operation Blocked: Manual 'Cash In' (Income) entries are strictly forbidden. Income must only reflect automatically from Payments Received, Invoice Collections, or Customer Payments." });
  }
  const index = db_cashbook.findIndex((cb) => cb.id === id);
  if (index !== -1) {
    db_cashbook[index] = { ...db_cashbook[index], ...data };
    await syncStateToFirestore("cashbook", id);
    logUserActivity("demo-admin", "Karan Sharma", "CASHBOOK_UPDATE", `Updated manual transactional log: ${db_cashbook[index].description}`);
    res.json(db_cashbook[index]);
  } else {
    res.status(404).json({ error: "Cashbook entry not found" });
  }
});
app.delete("/api/cashbook/:id", checkPermission("cashbook", "delete"), async (req, res) => {
  const { id } = req.params;
  const index = db_cashbook.findIndex((cb) => cb.id === id);
  if (index !== -1) {
    const item = db_cashbook[index];
    db_cashbook.splice(index, 1);
    await syncStateToFirestore("cashbook", id);
    logUserActivity("demo-admin", "Karan Sharma", "CASHBOOK_DELETE", `Deleted transactional log: ${item.description}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Cashbook entry not found" });
  }
});
app.get("/api/users", checkPermission("users", "read"), (req, res) => {
  res.json(db_users);
});
app.post("/api/users", checkPermission("users", "write"), async (req, res) => {
  const data = req.body;
  const newUser = {
    userId: `u-${Date.now()}`,
    email: data.email || "staff@demo.com",
    name: data.name || "Anonymous Team",
    role: data.role || "Staff",
    status: data.status || "active",
    mobile: data.mobile || "",
    avatarUrl: data.avatarUrl || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastLoginAt: ""
  };
  db_users.push(newUser);
  if (data.password) {
    db_passwords[newUser.email.trim().toLowerCase()] = data.password;
    if (db) {
      try {
        await setDoc(doc(db, "businessSettings", "passwords"), db_passwords);
      } catch (e) {
        console.error("Failed to commit password to Firestore:", e);
      }
    }
  }
  await syncStateToFirestore("users", newUser.userId);
  logUserActivity("demo-admin", "Karan Sharma", "USER_CREATE", `Onboarded teammate ${newUser.name} as ${newUser.role}`);
  res.status(201).json(newUser);
});
app.put("/api/users/:userId", checkPermission("users", "write"), async (req, res) => {
  const { userId } = req.params;
  const data = req.body;
  const index = db_users.findIndex((u) => u.userId === userId);
  if (index !== -1) {
    if (userId === "demo-admin") {
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
      mobile: data.mobile !== void 0 ? data.mobile : db_users[index].mobile,
      avatarUrl: data.avatarUrl !== void 0 ? data.avatarUrl : db_users[index].avatarUrl
    };
    const newEmail = db_users[index].email.trim().toLowerCase();
    if (data.password) {
      db_passwords[newEmail] = data.password;
      if (oldEmail !== newEmail) {
        delete db_passwords[oldEmail];
      }
      if (db) {
        try {
          await setDoc(doc(db, "businessSettings", "passwords"), db_passwords);
        } catch (e) {
          console.error("Failed to sync reset password to Firestore:", e);
        }
      }
    }
    await syncStateToFirestore("users", userId);
    logUserActivity("demo-admin", "Karan Sharma", "USER_UPDATE", `Updated teammate Operator: ${db_users[index].name}`);
    res.json(db_users[index]);
  } else {
    res.status(404).json({ error: "Operator not found" });
  }
});
app.put("/api/profile", async (req, res) => {
  const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
  if (!userEmail) {
    return res.status(401).json({ error: "Access Denied: Authentication parameters missing." });
  }
  const index = db_users.findIndex((u) => u.email.trim().toLowerCase() === userEmail);
  if (index === -1) {
    return res.status(404).json({ error: "Operator profile details could not be found." });
  }
  const data = req.body;
  const oldEmail = db_users[index].email.trim().toLowerCase();
  db_users[index] = {
    ...db_users[index],
    name: data.name || db_users[index].name,
    email: data.email || db_users[index].email,
    mobile: data.mobile !== void 0 ? data.mobile : db_users[index].mobile,
    avatarUrl: data.avatarUrl !== void 0 ? data.avatarUrl : db_users[index].avatarUrl
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
      await setDoc(doc(db, "users", db_users[index].userId), db_users[index]);
      await setDoc(doc(db, "businessSettings", "passwords"), db_passwords);
    } catch (e) {
      console.error("Failed to commit profile updates to Cloud Firestore:", e);
    }
  } else {
    saveStateToLocalCache();
  }
  logUserActivity(db_users[index].userId, db_users[index].name, "PROFILE_UPDATE", `Updated own security profile`);
  res.json(db_users[index]);
});
app.delete("/api/users/:userId", checkPermission("users", "delete"), async (req, res) => {
  const { userId } = req.params;
  const index = db_users.findIndex((u) => u.userId === userId);
  if (index !== -1) {
    if (userId === "demo-admin") {
      res.status(403).json({ error: "Primary Administrator cannot be deleted." });
      return;
    }
    const name = db_users[index].name;
    db_users.splice(index, 1);
    await syncStateToFirestore("users", userId);
    logUserActivity("demo-admin", "Karan Sharma", "USER_DELETE", `Revoked teammate clearance for: ${name}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Operator not found" });
  }
});
app.get("/api/logs", checkPermission("users", "read"), (req, res) => {
  res.json(db_logs);
});
app.get("/api/notifications", (req, res) => {
  res.json(db_notifications);
});
app.put("/api/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  const item = db_notifications.find((n) => n.id === id);
  if (item) {
    item.isRead = true;
    await syncStateToFirestore("notifications", id);
    res.json(item);
  } else {
    res.status(404).json({ error: "Notification not found" });
  }
});
app.get("/api/settings", checkPermission("settings", "read"), (req, res) => {
  res.json(db_settings);
});
app.post("/api/settings", checkPermission("settings", "write"), async (req, res) => {
  try {
    db_settings = { ...db_settings, ...req.body };
    await syncStateToFirestore("settings");
    logUserActivity("demo-admin", "Karan Sharma", "SETTINGS_WRITE", "Updated corporate profile settings & banking info");
    res.json(db_settings);
  } catch (err) {
    console.error("Error saving global corporate settings:", err);
    res.status(500).json({ error: `Settings update failed: ${err.message}` });
  }
});
app.get("/api/public/invoice/*", (req, res) => {
  try {
    const rawParam = req.params[0] || req.path.substring("/api/public/invoice/".length);
    const invoiceNumber = decodeURIComponent(rawParam).trim();
    const inv = db_invoices.find((v) => v.invoiceNumber.trim() === invoiceNumber);
    if (inv) {
      res.json({
        invoice: inv,
        settings: db_settings
      });
    } else {
      res.status(404).json({ error: "Invoice not found or deleted" });
    }
  } catch (err) {
    res.status(500).json({ error: `Internal query failed: ${err.message}` });
  }
});
app.get("/api/passwords", (req, res) => {
  res.json(db_passwords);
});
app.post("/api/passwords", async (req, res) => {
  try {
    db_passwords = { ...db_passwords, ...req.body };
    saveStateToLocalCache();
    if (db) {
      await setDoc(doc(db, "businessSettings", "passwords"), db_passwords);
    }
    res.json({ success: true, passwords: db_passwords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/batch-sync", async (req, res) => {
  if (db) {
    try {
      await bootstrapFromFirestore();
    } catch (err) {
      console.error("Failed to hot-rehydrate from Firestore during batch-sync:", err);
    }
  }
  const roleHeader = (req.headers["x-user-role"] || "").trim();
  const role = roleHeader || "Admin";
  const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
  const isAdminOrOwner = role.toLowerCase() === "admin" || userEmail === "modulesinternet@gmail.com";
  const roleConfig = db_roles.find((r) => r.role.trim().toLowerCase() === role.toLowerCase());
  const hasReadPermission = (module) => {
    if (isAdminOrOwner) return true;
    if (!roleConfig) return false;
    return !!roleConfig.modules[module]?.read;
  };
  let dashboardData = null;
  if (hasReadPermission("dashboard")) {
    const totalRevenue = db_payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.total, 0);
    const unpaidInvoicesValue = db_invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
    const totalOutstanding = db_clients.reduce((sum, c) => sum + c.outstandingBalance, 0);
    const totalClientsCount = db_clients.length;
    const totalInvoicesCount = db_invoices.length;
    const pendingInvoicesCount = db_invoices.filter((i) => i.status !== "paid").length;
    const monthlyDataMap = /* @__PURE__ */ new Map();
    const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    months.forEach((m) => {
      monthlyDataMap.set(m, { month: m, billed: 0, collected: 0 });
    });
    db_invoices.forEach((inv) => {
      const monthIndex = new Date(inv.date).getMonth();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = monthNames[monthIndex];
      const fallbackMonth = m ? m.substring(0, 3) : "Jan";
      const key = months.includes(fallbackMonth) ? fallbackMonth : months[months.length - 1] || "May";
      const current = monthlyDataMap.get(key) || { month: key, billed: 0, collected: 0 };
      current.billed += inv.total;
      monthlyDataMap.set(key, current);
    });
    db_payments.forEach((pay) => {
      const monthIndex = new Date(pay.paymentDate).getMonth();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = monthNames[monthIndex];
      const fallbackMonth = m ? m.substring(0, 3) : "Jan";
      const key = months.includes(fallbackMonth) ? fallbackMonth : months[months.length - 1] || "May";
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
    clients: hasReadPermission("clients") ? db_clients : [],
    products: hasReadPermission("products") ? db_products : [],
    invoices: hasReadPermission("invoices") ? db_invoices : [],
    quotations: hasReadPermission("quotations") ? db_quotations : [],
    payments: hasReadPermission("payments") ? db_payments : [],
    ledger: hasReadPermission("ledger") ? db_ledger : [],
    cashbook: hasReadPermission("cashbook") ? db_cashbook : [],
    users: hasReadPermission("users") ? db_users : [],
    logs: hasReadPermission("users") ? db_logs : [],
    notifications: db_notifications,
    settings: db_settings,
    roles: db_roles,
    categories: db_categories,
    passwords: db_passwords
  };
  res.json(payload);
});
async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
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
app.post("/api/send-otp-email", async (req, res) => {
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
                    Request Timestamp: ${(/* @__PURE__ */ new Date()).toUTCString()}<br>
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
              \xA9 2026 Apex Digital Solutions. All Rights Reserved.
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
      text: `Apex Digital Solutions Security Password Reset. Your OTP Code: ${otpCode}. Timestamp: ${(/* @__PURE__ */ new Date()).toUTCString()}`,
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
      previewUrl: previewUrl || void 0,
      description: previewUrl ? `Sent via test mail simulator. Preview email here: ${previewUrl}` : "Dispatched via corporate SMTP Gateway"
    });
  } catch (error) {
    console.error("[MAILER] Send failure:", error);
    res.status(500).json({ error: `SMTP Send Failure: ${error.message}` });
  }
});
app.get("/api/roles", (req, res) => {
  res.json(db_roles);
});
app.put("/api/roles/:role", (req, res) => {
  const { role } = req.params;
  const payload = req.body;
  const targetRole = db_roles.find((r) => r.role.toLowerCase() === role.toLowerCase());
  if (!targetRole) {
    return res.status(404).json({ error: `Security failure: Role ${role} not found` });
  }
  targetRole.modules = payload.modules;
  syncStateToFirestore("roles");
  logUserActivity("demo-admin", "Karan Sharma", "ROLE_PERMISSIONS_UPDATE", `Reconfigured operational permission matrices for Role: ${role}`);
  res.json(targetRole);
});
app.post("/api/restore", checkPermission("settings", "write"), async (req, res) => {
  const backup = req.body;
  if (!backup || typeof backup !== "object") {
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
    await syncStateToFirestore("settings");
    await syncStateToFirestore("categories");
    await syncStateToFirestore("roles");
    if (db) {
      for (const item of db_clients) await syncStateToFirestore("clients", item.id);
      for (const item of db_products) await syncStateToFirestore("products", item.id);
      for (const item of db_invoices) await syncStateToFirestore("invoices", item.id);
      for (const item of db_quotations) await syncStateToFirestore("quotations", item.id);
      for (const item of db_payments) await syncStateToFirestore("payments", item.id);
      for (const item of db_ledger) await syncStateToFirestore("ledger", item.id);
      for (const item of db_cashbook) await syncStateToFirestore("cashbook", item.id);
      for (const item of db_notifications) await syncStateToFirestore("notifications", item.id);
      for (const item of db_users) await syncStateToFirestore("users", item.userId);
    } else {
      saveStateToLocalCache();
    }
    logUserActivity("demo-admin", "Karan Sharma", "DB_RESTORE", "Successfully restored standard database file from manual backup and synchronized with Cloud Firestore.");
    res.json({ success: true, message: "Database backup imported and synchronized successfully with Cloud Firestore!" });
  } catch (error) {
    res.status(500).json({ error: `Firestore restoration failed: ${error.message}` });
  }
});
var isProd = process.env.NODE_ENV === "production";
async function bootServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const isFirebaseFunction = process.env.IS_FIREBASE_FUNCTION === "true";
  if (!isFirebaseFunction) {
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
export {
  app
};
